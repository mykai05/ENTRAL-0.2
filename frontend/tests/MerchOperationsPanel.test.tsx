import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MerchOperationsPanel } from "../components/MerchOperationsPanel";
import { apiFetch } from "../lib/api";
import type { ClientMerchStore, DigitalProductApplyResponse, DigitalProductPortfolioPlan, FacelessContentPipelineApplyResponse, FacelessContentPipelinePlan, FacelessContentPerformanceDigest, FinancialOrchestratorApplyResponse, FinancialOrchestratorPlan, FinancialPayoutReviewApplyResponse, FinancialPayoutReviewPlan, FinancialReleaseGovernanceApplyResponse, FinancialReleaseGovernancePlan, FinancialScalingBudgetReviewApplyResponse, FinancialScalingBudgetReviewPlan, FinancialScalingExecutionLedgerApplyResponse, FinancialScalingExecutionLedgerPlan, FinancialScalingSpendControlApplyResponse, FinancialScalingSpendControlPlan, GrowthApprovalRecord, GrowthApprovalResponse, GrowthOrchestrationPreviewResponse, GrowthPlan, PortfolioCommandCenterApplyResponse, PortfolioCommandCenterPlan, ProviderHandoffResponse, ProviderPayloadApprovalResponse, ProviderPayloadPackage, RevenueAssetActionApplyResponse, RevenueAssetBatchActionApplyResponse, RevenueAssetControlLedgerPlan, RevenueAssetControlRecoveryPlan, RevenueAssetPortfolio, RevenueAssetReviewQueuePlan, RevenueAssetRotationDecision, RevenueBusinessFleetLaunchGapAccelerationResponse, RevenueBusinessFleetLaunchGateResponse, RevenueBusinessFleetLiveLaunchPackageResponse, RevenueBusinessFleetLaunchGapPlan, RevenueBusinessFleetLaunchGapSeedApplyResponse, RevenueBusinessFleetPlan, RevenueEnginePlan, RevenueFirstBusinessAutonomousLaunchApplyResponse, RevenueFirstBusinessAutonomousLaunchPlan, RevenueFirstBusinessExecuteApplyResponse, RevenueFirstBusinessExecutionPlan, RevenueFirstBusinessInternalLaunchApplyResponse, RevenueFirstBusinessInternalLaunchPlan, RevenueFirstBusinessLaunchPlan, RevenueFirstBusinessLiveExecutorApplyResponse, RevenueFirstBusinessLiveExecutorPlan, RevenueFirstCashReadinessPlan, RevenueFirstCashSprintPlan, RevenueFirstStorePrepareApplyResponse, RevenueFirstStorePreparationPlan, RevenueHundredStoreAppConnectionPacketsApplyResponse, RevenueHundredStoreAutonomyRunApplyResponse, RevenueHundredStoreConnectorActivationApplyResponse, RevenueHundredStoreDailySupervisorApplyResponse, RevenueHundredStoreDailySupervisorPlan, RevenueHundredStoreLaunchPacketsApplyResponse, RevenueHundredStoreMonitoringCycleApplyResponse, RevenueHundredStoreOperationsApplyResponse, RevenueHundredStoreOperationsPlan, RevenueHundredStoreOperationsResponse, RevenueHundredStoreProductDepthApplyResponse, RevenueHundredStoreWorkLeasesApplyResponse, RevenueLaunchPipelineApplyResponse, RevenueLaunchPipelinePlan, RevenueListingOptimizationApplyResponse, RevenueListingOptimizationPlan, RevenueMoneyArmyBatchPipelineApplyResponse, RevenueMoneyArmyBatchPipelinePlan, RevenueMoneyArmyBatchRun, RevenueMoneyArmyFirstBusinessLaunchPackageApplyResponse, RevenueMoneyArmyFirstBusinessLaunchPackageResponse, RevenueMoneyArmyGenerateScoreBatchApplyResponse, RevenueMoneyArmyGenerateScoreBatchPlan, RevenuePerformanceDigest, RevenuePerformanceIngestResponse, RevenuePerformanceRotationApplyResponse, RevenuePortfolioDashboardPlan, RevenueRotationApplyResponse, RevenueStoreSetupApplyResponse, RevenueStoreSetupPlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const store: ClientMerchStore = {
  approvalStatus: "Listings Approved",
  audience: "independent gym members",
  brandStyle: "bold training aesthetic",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  commandGeneralId: null,
  commandGeneralName: null,
  commandMarshalId: null,
  commandMarshalName: null,
  contactName: "Mara",
  createdAt: "2026-06-01T00:00:00.000Z",
  designCount: 10,
  email: "mara@example.com",
  estimatedProfit: 420,
  id: "store-1",
  industry: "fitness",
  launchStatus: "Awaiting Approval",
  monthlyFee: 199,
  notes: null,
  phone: null,
  podProvider: "Printify",
  productTypes: ["T-shirt"],
  profitShare: 10,
  revenue: 0,
  setupFee: 500,
  storeId: "store-1",
  storePlatform: "Shopify",
  updatedAt: "2026-06-01T00:00:00.000Z",
  userId: "user-1"
};

const plan: GrowthPlan = {
  adCampaignDrafts: [{
    audience: "independent gym members",
    budgetGuardrail: "Draft only. Daily spend stays locked until approval.",
    name: "Launch awareness draft",
    objective: "Prepare awareness campaign brief.",
    status: "Draft - spend locked"
  }],
  analyticsLoop: [{
    cadence: "Weekly",
    guardrail: "Uses read-only or manual data.",
    metric: "Approved product count",
    source: "Approval queue"
  }],
  approvalQueue: ["Approve final social captions before posting."],
  auditEvents: ["No external systems contacted."],
  blockedActions: ["Publishing social posts", "Starting paid ad spend"],
  commercePrep: ["Prepare Shopify collection structure."],
  contentDrafts: [{
    approvalStatus: "Draft - needs approval",
    channel: "Social",
    copy: "Iron House merch is preparing for launch.",
    title: "Social draft 1"
  }],
  mode: "Mock Mode",
  readinessScore: 57,
  summary: "Iron House Gym has one approved product ready for reviewed growth preparation."
};

const approvalRecord: GrowthApprovalRecord = {
  auditLogId: "audit-1",
  createdAt: "2026-06-01T00:00:00.000Z",
  executionState: "No external action executed",
  id: "packet-1",
  mode: "Mock Mode",
  packet: {
    actions: [
      {
        approvalStatus: "Pending human approval",
        channel: "Social",
        executionState: "Locked - no external action",
        id: "action-1",
        requiredControls: ["caption approval", "final user sign-off"],
        scheduledFor: null,
        summary: "Iron House merch is preparing for launch.",
        title: "Social draft 1"
      },
      {
        approvalStatus: "Pending human approval",
        channel: "Ads",
        executionState: "Locked - no external action",
        id: "action-2",
        requiredControls: ["budget approval"],
        scheduledFor: null,
        summary: "Spend remains locked.",
        title: "Launch awareness draft"
      }
    ],
    auditEvents: ["Growth approval packet queued in Mock Mode.", "No external systems contacted."],
    blockedActions: ["Publishing social posts", "Starting paid ad spend"],
    businessName: "Iron House Gym",
    costGuardrail: "External ad spend is $0.",
    createdAt: "2026-06-01T00:00:00.000Z",
    humanApprovalRequired: true,
    id: "packet-1",
    logging: "Stored as an audit event.",
    mode: "Mock Mode",
    note: "Queued from test.",
    scheduledFor: null,
    status: "Pending approval",
    storeId: "store-1",
    summary: "2 growth actions prepared for review. ENTRAL will not publish, change storefronts, start spend, or import analytics without explicit approval."
  },
  requestAuditLogId: "audit-1",
  reviewAuditLogId: null,
  reviewedAt: null,
  reviewedById: null,
  reviewNote: null,
  scheduledFor: null,
  status: "pending",
  statusLabel: "Pending approval",
  updatedAt: "2026-06-01T00:00:00.000Z"
};

const approvalResponse: GrowthApprovalResponse = {
  approval: approvalRecord,
  auditLogId: "audit-1",
  packet: approvalRecord.packet
};

const approvedRecord: GrowthApprovalRecord = {
  ...approvalRecord,
  reviewAuditLogId: "audit-2",
  reviewedAt: "2026-06-01T01:00:00.000Z",
  status: "approved",
  statusLabel: "Approved - execution still locked",
  updatedAt: "2026-06-01T01:00:00.000Z"
};

const orchestrationPreview: GrowthOrchestrationPreviewResponse = {
  auditLogId: "audit-3",
  preview: {
    approvalPacketId: "packet-1",
    auditEvents: [
      "Read-only growth orchestration preview generated.",
      "No social, Shopify, ad, or analytics system was contacted."
    ],
    businessName: "Iron House Gym",
    costGuardrail: "External spend remains $0. Estimated AI/provider cost for this preview is 0 cents.",
    estimatedAiCostCents: 0,
    estimatedExternalSpendCents: 0,
    externalExecution: false,
    mode: "Read-only orchestration preview",
    providerContacted: false,
    scheduledFor: null,
    status: "Approved - execution locked",
    steps: [
      {
        actionId: "action-1",
        channel: "Social",
        checklist: ["Confirm caption approval."],
        executionState: "Locked - no external action",
        guardrail: "No post is published or queued on a platform.",
        scheduledFor: null,
        status: "Ready for manual handoff",
        title: "Social draft 1"
      },
      {
        actionId: "action-2",
        channel: "Shopify",
        checklist: ["Confirm storefront checklist."],
        executionState: "Locked - no external action",
        guardrail: "No Shopify or marketplace listing is created, changed, or launched.",
        scheduledFor: null,
        status: "Ready for manual handoff",
        title: "Storefront prep review"
      }
    ],
    summary: "2 approved growth actions are organized for manual handoff. ENTRAL still will not publish posts, update storefronts, start ad spend, or import analytics data."
  }
};

const revenuePlan: RevenueEnginePlan = {
  assetScores: [
    {
      assetId: "product-1",
      assetName: "Core Tee",
      assetScore: {
        economicsScore: 43,
        finalRank: 78,
        readinessScore: 35,
        riskPenalty: 0,
        velocity: 0
      },
      assetType: "product",
      confidence: 91,
      economics: {
        estimatedProfit: 18,
        profitMargin: 42,
        retailValue: 38,
        revenue: 0
      },
      evidence: ["Economics 43/45", "Readiness 35/35", "Risk penalty 0"],
      externalExecution: false,
      nextInternalState: null,
      priority: 322,
      providerContacted: false,
      readiness: {
        listingReady: true,
        status: "Published"
      },
      reason: "Published product has strong estimated unit economics.",
      recommendation: "scale",
      riskLevel: "low",
      rotationDecision: "scale",
      rotationReason: "Published product has strong estimated unit economics.",
      score: 78,
      scoreBand: "healthy",
      storeId: "store-1",
      storeName: "Iron House Gym"
    },
    {
      assetId: "product-2",
      assetName: "Weak Tee",
      assetScore: {
        economicsScore: 0,
        finalRank: 8,
        readinessScore: 8,
        riskPenalty: 0,
        velocity: 0
      },
      assetType: "product",
      confidence: 88,
      economics: {
        estimatedProfit: -4,
        profitMargin: -12,
        retailValue: 28,
        revenue: 0
      },
      evidence: ["Economics 0/45", "Readiness 8/35", "Risk penalty 0"],
      externalExecution: false,
      nextInternalState: "Archived",
      priority: 92,
      providerContacted: false,
      readiness: {
        listingReady: true,
        status: "Awaiting Approval"
      },
      reason: "Product has non-positive economics and should be archived before it consumes more attention.",
      recommendation: "kill",
      recommendedInternalStatus: "Archived",
      riskLevel: "low",
      rotationDecision: "kill",
      rotationReason: "Product has non-positive economics and should be archived before it consumes more attention.",
      score: 8,
      scoreBand: "critical",
      storeId: "store-1",
      storeName: "Iron House Gym"
    },
    {
      assetId: "store-1",
      assetName: "Iron House Gym",
      assetScore: {
        economicsScore: 45,
        finalRank: 85,
        readinessScore: 35,
        riskPenalty: 0,
        velocity: 40
      },
      assetType: "store",
      confidence: 90,
      economics: {
        estimatedProfit: 420,
        profitMargin: 0,
        retailValue: 380,
        revenue: 1200
      },
      evidence: ["Economics 45/45", "Readiness 35/35", "Velocity 40/day"],
      externalExecution: false,
      nextInternalState: null,
      priority: 315,
      providerContacted: false,
      readiness: {
        approvedProducts: 2,
        portfolioReady: true,
        status: "Optimizing"
      },
      reason: "2 products meet scale economics; prepare variants, launch package, and approval-locked growth work.",
      recommendation: "scale",
      riskLevel: "low",
      rotationDecision: "scale",
      rotationReason: "2 products meet scale economics; prepare variants, launch package, and approval-locked growth work.",
      score: 85,
      scoreBand: "excellent",
      storeId: "store-1",
      storeName: "Iron House Gym"
    },
    {
      assetId: "store-2",
      assetName: "Slow Lane Studio",
      assetScore: {
        economicsScore: 6,
        finalRank: 21,
        readinessScore: 25,
        riskPenalty: 10,
        velocity: 0
      },
      assetType: "store",
      confidence: 84,
      economics: {
        estimatedProfit: 4,
        profitMargin: 0,
        retailValue: 40,
        revenue: 0
      },
      evidence: ["Economics 6/45", "Readiness 25/35", "Risk penalty 10"],
      externalExecution: false,
      nextInternalState: "Paused",
      priority: 179,
      providerContacted: false,
      readiness: {
        approvedProducts: 0,
        portfolioReady: false,
        status: "Designing"
      },
      reason: "Most active products are weak or blocked and no approved products are ready.",
      recommendation: "pause",
      recommendedLaunchStatus: "Paused",
      riskLevel: "medium",
      rotationDecision: "pause",
      rotationReason: "Most active products are weak or blocked and no approved products are ready.",
      score: 21,
      scoreBand: "critical",
      storeId: "store-2",
      storeName: "Slow Lane Studio"
    }
  ],
  auditEvents: [
    "Revenue Engine portfolio evaluated internally.",
    "No external commerce, POD, ad, social, banking, or browser automation system was contacted."
  ],
  blockedExternalActions: [
    "Publishing marketplace listings",
    "Starting ad spend"
  ],
  decisionCounts: {
    generate: 1,
    kill: 1,
    pause: 1,
    prepare_launch: 0,
    revise: 0,
    scale: 2,
    watch: 0
  },
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Revenue Engine",
  pipelineActions: [
    {
      action: "scale",
      externalExecution: false,
      id: "revenue_scale_store-1",
      priority: 4,
      summary: "Create variant and promotion prep internally, then queue a locked growth approval packet.",
      targetId: "store-1",
      targetType: "store",
      title: "Scale Iron House Gym"
    }
  ],
  productDecisions: [
    {
      action: "scale",
      confidence: 91,
      dedupeKey: "product-product-1-scale",
      externalExecution: false,
      priority: 4,
      productId: "product-1",
      productName: "Core Tee",
      reason: "Published product has strong estimated unit economics.",
      riskLevel: "low",
      status: "Published",
      storeId: "store-1"
    },
    {
      action: "kill",
      confidence: 88,
      dedupeKey: "product-product-2-kill",
      externalExecution: false,
      priority: 1,
      productId: "product-2",
      productName: "Weak Tee",
      reason: "Product has non-positive economics and should be archived before it consumes more attention.",
      recommendedInternalStatus: "Archived",
      riskLevel: "low",
      status: "Awaiting Approval",
      storeId: "store-1"
    }
  ],
  rotationChanges: [
    {
      action: "kill",
      fromStatus: "Awaiting Approval",
      reason: "Product has non-positive economics and should be archived before it consumes more attention.",
      targetId: "product-2",
      targetName: "Weak Tee",
      targetType: "product",
      toStatus: "Archived"
    },
    {
      action: "pause",
      fromStatus: "Designing",
      reason: "Most active products are weak or blocked and no approved products are ready.",
      targetId: "store-2",
      targetName: "Slow Lane Studio",
      targetType: "store",
      toStatus: "Paused"
    }
  ],
  storeDecisions: [
    {
      action: "scale",
      confidence: 90,
      externalExecution: false,
      launchStatus: "Optimizing",
      priority: 4,
      reason: "2 products meet scale economics; prepare variants, launch package, and approval-locked growth work.",
      storeId: "store-1",
      storeName: "Iron House Gym"
    },
    {
      action: "pause",
      confidence: 84,
      externalExecution: false,
      launchStatus: "Designing",
      priority: 2,
      reason: "Most active products are weak or blocked and no approved products are ready.",
      recommendedLaunchStatus: "Paused",
      storeId: "store-2",
      storeName: "Slow Lane Studio"
    }
  ],
  summary: "2 stores and 4 products evaluated. 1 stores are ready to scale, 2 products are launch-ready or live, and 2 internal rotation changes are queued.",
  thresholds: {
    maxRotationUpdates: 25,
    minPortfolioProductsPerStore: 5,
    minProductMargin: 20,
    minProductProfit: 6,
    minScaleProducts: 2,
    scaleProductMargin: 35,
    scaleProductProfit: 12
  },
  totals: {
    approvedProducts: 1,
    archivedProducts: 0,
    estimatedProfit: 144,
    estimatedRetailValue: 380,
    highRiskProducts: 0,
    products: 4,
    publishedProducts: 1,
    scaleAssets: 2,
    stores: 2,
    storesReadyToScale: 1,
    watchAssets: 0,
    totalRevenue: 1200
  }
};

const portfolioCommandPlan: PortfolioCommandCenterPlan = {
  auditEvents: [
    "Portfolio Command Center generated from internal planners.",
    "No provider, marketplace, social platform, financial provider, browser, proxy, or stealth automation system was contacted."
  ],
  blockedExternalActions: [
    "Publishing marketplace listings, changing storefronts, uploading content, or starting ad spend",
    "Browser stealth, anti-detection, proxy rotation, fingerprint spoofing, or platform evasion automation"
  ],
  commandActions: [
    {
      action: "kill",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Required"
      },
      blockedExternalActions: ["Publishing marketplace listings"],
      commandHash: "product:product-2:kill:archived",
      expectedInternalEffect: "Record the command and update the internal product status to Archived.",
      externalExecution: false,
      priority: 8,
      providerContacted: false,
      reason: "Weak Tee has negative performance velocity and should leave the active path.",
      recommendedStatus: "Archived",
      riskLevel: "high",
      sourceModule: "revenue_engine + performance_velocity",
      targetId: "product-2",
      targetName: "Weak Tee",
      targetType: "product"
    },
    {
      action: "pause",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Required"
      },
      blockedExternalActions: ["Changing storefronts"],
      commandHash: "store:store-2:pause:paused",
      expectedInternalEffect: "Record the command and update the internal store status to Paused.",
      externalExecution: false,
      priority: 18,
      providerContacted: false,
      reason: "Slow Lane Studio has weak active products and should be paused internally.",
      recommendedStatus: "Paused",
      riskLevel: "medium",
      sourceModule: "revenue_engine",
      targetId: "store-2",
      targetName: "Slow Lane Studio",
      targetType: "store"
    },
    {
      action: "review_payout",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Required"
      },
      blockedExternalActions: ["Moving money or issuing payouts"],
      commandHash: "finance:intent-personal:review_payout:none",
      expectedInternalEffect: "Record a finance review command. Money movement remains locked behind manual governance.",
      externalExecution: false,
      priority: 12,
      providerContacted: false,
      reason: "Owner income payout review requires manual handoff controls.",
      recommendedStatus: null,
      riskLevel: "high",
      sourceModule: "financial_release_governance",
      targetId: "intent-personal",
      targetName: "Owner income payout review",
      targetType: "finance"
    },
    {
      action: "review_scale_budget",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Required"
      },
      blockedExternalActions: ["Increasing ad spend, procurement spend, or product spend without a separate approved scaling budget"],
      commandHash: "finance:scale_budget_product_1:review_scale_budget:none",
      expectedInternalEffect: "Record a scaling budget review command. Spend, provider calls, and ad changes remain locked behind manual governance.",
      externalExecution: false,
      priority: 24,
      providerContacted: false,
      reason: "Core Tee has $30.00 pending Ad/Growth budget review from excellent asset score 88.",
      recommendedStatus: null,
      riskLevel: "low",
      sourceModule: "financial_scaling_budget_review",
      targetId: "scale_budget_product_1",
      targetName: "Core Tee Ad/Growth budget",
      targetType: "finance"
    },
    {
      action: "queue_content",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Required"
      },
      blockedExternalActions: ["Uploading, scheduling, publishing, deleting, or editing social content"],
      commandHash: "content:brief-1:queue_content:draft_queued",
      expectedInternalEffect: "Record a content command for internal creative planning. Uploads and provider calls remain locked.",
      externalExecution: false,
      priority: 45,
      providerContacted: false,
      reason: "Core Tee content has enough clicks for remix planning.",
      recommendedStatus: "draft_queued",
      riskLevel: "low",
      sourceModule: "faceless_content_pipeline",
      targetId: "brief-1",
      targetName: "Core Tee faceless short",
      targetType: "content"
    }
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Portfolio Command Center",
  options: {
    includeCommandHistory: 20,
    includeContent: true,
    includeFinance: true,
    maxActions: 25,
    windowDays: 30
  },
  persistedCommands: [
    {
      action: "watch",
      auditLogId: "audit-old-command",
      commandHash: "store:store-1:watch:none",
      control: { externalExecution: false },
      createdAt: "2026-06-01T00:00:00.000Z",
      externalExecution: false,
      id: "command-old",
      priority: 70,
      providerContacted: false,
      reason: "Prior watch command.",
      recommendedStatus: null,
      riskLevel: "low",
      sourceModule: "performance_velocity",
      status: "queued",
      targetId: "store-1",
      targetName: "Iron House Gym",
      targetType: "store",
      updatedAt: "2026-06-01T00:00:00.000Z"
    }
  ],
  providerContacted: false,
  riskLanes: [
    {
      lane: "revenue",
      riskLevel: "high",
      score: 80,
      signals: ["2 revenue rotation changes", "0 high-risk products", "$58.00 daily profit velocity"],
      summary: "Store and product movement risk from portfolio decisions and performance velocity."
    },
    {
      lane: "finance",
      riskLevel: "high",
      score: 70,
      signals: ["1 high-risk payout intent", "$75.00 pending payout amount", "0 packets ready for manual handoff"],
      summary: "Payout readiness, scaling budget approval, and release governance risk. Provider execution stays locked."
    },
    {
      lane: "content",
      riskLevel: "low",
      score: 18,
      signals: ["1 new content brief", "3200 tracked views", "$260.00 content net revenue"],
      summary: "Creative throughput and content optimization risk. Uploads and provider calls stay locked."
    },
    {
      lane: "operations",
      riskLevel: "medium",
      score: 48,
      signals: ["5 internal command actions", "2 high-risk commands", "0 external executions authorized"],
      summary: "Internal command load and control pressure across the portfolio."
    }
  ],
  summary: "5 internal command actions prioritized across 2 stores, 4 products, $58.00 daily profit velocity, $75.00 pending payout review, $60.00 pending scaling budget, and 3200 content views. External execution remains locked.",
  totals: {
    approvedPayoutAmount: 0,
    approvedScalingBudgetAmount: 0,
    assetPortfolioActions: 2,
    assetPortfolioKill: 1,
    assetPortfolioPause: 1,
    assetPortfolioProfitVelocity: 58,
    assetPortfolioScale: 0,
    assetPortfolioTrackedAssets: 2,
    commandActions: 5,
    commandsByAction: {
      generate: 0,
      kill: 1,
      pause: 1,
      prepare_launch: 0,
      queue_content: 1,
      record_governance: 0,
      review_payout: 1,
      review_scale_budget: 1,
      review_scale_outcome: 0,
      revise: 0,
      scale: 0,
      watch: 0
    },
    commandsByRisk: {
      high: 2,
      low: 2,
      medium: 1
    },
    contentNetRevenue: 260,
    contentViews: 3200,
    estimatedProfit: 144,
    highRiskCommands: 2,
    highRiskProducts: 0,
    openCommandRecords: 1,
    pendingPayoutAmount: 75,
    scaleOutcomeEntries: 0,
    scaleOutcomeScaleNext: 0,
    scaleOutcomeStop: 0,
    pendingScalingBudgetAmount: 60,
    pendingScalingBudgetPackets: 1,
    products: 4,
    profitVelocity: 58,
    revenueRotationChanges: 2,
    stores: 2,
    scalingBudgetPackets: 2,
    totalRevenue: 1200
  }
};

const launchPipelinePlan: RevenueLaunchPipelinePlan = {
  auditEvents: [
    "Revenue launch pipeline evaluated internally.",
    "No marketplace, POD provider, ad platform, social platform, payment system, or browser automation provider was contacted."
  ],
  blockedExternalActions: [
    "Creating or publishing marketplace listings",
    "Uploading product artwork to external providers",
    "Starting ad spend",
    "Moving money or issuing payouts"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Launch Pipeline",
  options: {
    maxStores: 5,
    minApprovedProducts: 2,
    minPortfolioProductsPerStore: 5,
    productCount: 5,
    riskTolerance: "Low"
  },
  queue: [
    {
      action: "seed_products",
      externalExecution: false,
      id: "launch_seed_products_store-1",
      priority: 2,
      storeId: "store-1",
      summary: "Create 5 internal product drafts for review.",
      title: "Seed product drafts for Iron House Gym"
    },
    {
      action: "queue_launch_approval",
      externalExecution: false,
      id: "launch_queue_launch_approval_store-2",
      priority: 1,
      storeId: "store-2",
      summary: "Slow Lane Studio has 2 approved products and should enter a locked launch approval packet.",
      title: "Queue launch approval for Slow Lane Studio"
    }
  ],
  storePlans: [
    {
      action: "seed_products",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Iron House Gym needs 3 more internal product drafts to reach the launch portfolio floor.",
        status: "Not ready"
      },
      batchInput: {
        audience: "independent gym members",
        priceRange: { max: 64, min: 18 },
        productCount: 5,
        productTypes: ["T-shirt", "Hoodie", "Sticker"],
        riskTolerance: "Low",
        storeId: "store-1",
        styleDirection: "bold training aesthetic. Prioritize original, launch-ready products for independent gym members."
      },
      confidence: 86,
      existingProducts: 2,
      externalExecution: false,
      launchPackageReady: false,
      missingProducts: 3,
      priority: 2,
      projectedDraftProfit: 62,
      readyProductIds: ["product-1"],
      readyProducts: 1,
      reason: "Iron House Gym needs 3 more internal product drafts to reach the launch portfolio floor.",
      score: 72,
      storeId: "store-1",
      storeName: "Iron House Gym",
      targetProductTypes: ["T-shirt", "Hoodie", "Sticker"]
    },
    {
      action: "queue_launch_approval",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Slow Lane Studio has 2 approved products and should enter a locked launch approval packet.",
        status: "Required"
      },
      batchInput: {
        audience: "local creators",
        priceRange: { max: 42, min: 18 },
        productCount: 5,
        productTypes: ["Poster", "Sticker", "T-shirt"],
        riskTolerance: "Low",
        storeId: "store-2",
        styleDirection: "clean studio aesthetic. Prioritize original, launch-ready products for local creators."
      },
      confidence: 82,
      existingProducts: 5,
      externalExecution: false,
      launchPackageReady: true,
      missingProducts: 0,
      priority: 1,
      projectedDraftProfit: 0,
      readyProductIds: ["product-3", "product-4"],
      readyProducts: 2,
      reason: "Slow Lane Studio has 2 approved products and should enter a locked launch approval packet.",
      score: 66,
      storeId: "store-2",
      storeName: "Slow Lane Studio",
      targetProductTypes: ["Poster", "Sticker", "T-shirt"]
    }
  ],
  summary: "2 stores evaluated. 5 internal draft products are queued, 1 stores are ready for launch approval packets, and 1 stores have launch-package-ready products.",
  totals: {
    approvalReadyStores: 1,
    draftProductsNeeded: 5,
    estimatedDraftProfit: 62,
    launchPackageReadyStores: 1,
    queuedStores: 2,
    storesEvaluated: 2
  }
};

function portfolioFromPlan(plan: RevenueEnginePlan): RevenueAssetPortfolio {
  const count = (recommendation: RevenueAssetPortfolio["assets"][number]["recommendation"]) => plan.assetScores.filter((asset) => asset.recommendation === recommendation).length;

  return {
    assets: plan.assetScores,
    blockedExternalActions: plan.blockedExternalActions,
    externalExecution: false,
    generatedAt: plan.generatedAt,
    mode: "Revenue Engine Asset Portfolio",
    providerContacted: false,
    rotationChanges: plan.rotationChanges,
    summary: `${plan.assetScores.length} assets scored. ${count("scale")} scale, ${count("watch")} watch, ${count("pause")} pause, and ${count("kill")} kill recommendations are ready for dashboard review.`,
    thresholds: plan.thresholds,
    totals: {
      assets: plan.assetScores.length,
      estimatedProfit: plan.totals.estimatedProfit,
      kill: count("kill"),
      pause: count("pause"),
      performanceSnapshots: 3,
      profitVelocity: 10.86,
      products: plan.totals.products,
      revenueVelocity: 20,
      rotationChanges: plan.rotationChanges.length,
      scale: count("scale"),
      stores: plan.totals.stores,
      totalRevenue: plan.totals.totalRevenue,
      trackedAssets: 2,
      watch: count("watch")
    }
  };
}

const businessFleetPlan: RevenueBusinessFleetPlan = {
  auditEvents: ["Business Fleet Scheduler grouped Revenue Engine scored assets by store/business."],
  blockedExternalActions: [
    "Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate"
  ],
  businesses: [{
    assetCount: 4,
    blockedExternalActions: [
      "Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate"
    ],
    businessId: "store-1",
    businessName: "Iron House Gym",
    externalExecution: false,
    lane: "launch_now",
    nextInternalAction: {
      endpoint: "/merch/revenue-engine/first-business-launch/apply",
      label: "dispatch_first_cash_bridge_action",
      reason: "Iron House Gym is ready for the first launch wave.",
      state: "dispatch_ready_first_cash_bridge_action"
    },
    parallelism: {
      launchSlots: 1,
      maxInternalJobs: 3,
      scaleSlots: 0
    },
    productAssets: 3,
    profitVelocity: 10.86,
    providerContacted: false,
    qualityGate: {
      reasons: ["Quality 88/100 meets the 70/100 floor."],
      status: "pass"
    },
    recommendationCounts: {
      kill: 0,
      pause: 0,
      scale: 2,
      watch: 2
    },
    revenueVelocity: 20,
    scheduleState: "ready_parallel",
    score: {
      economicsScore: 84,
      finalRank: 91,
      killPressure: 0,
      qualityScore: 88,
      readinessScore: 90,
      scalePressure: 82
    },
    shardId: "shard_001",
    topAsset: {
      assetId: "store-1",
      assetName: "Iron House Gym",
      assetType: "store",
      finalRank: 91,
      recommendation: "scale"
    },
    trackedAssets: 2
  }],
  capacity: {
    currentBusinesses: 1,
    launchWaveSize: 10,
    maxParallelLaunches: 10,
    maxParallelScaleActions: 25,
    parallelSlotsConfigured: 35,
    shardCount: 32,
    targetBusinesses: 1000,
    targetGap: 999
  },
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  launchWave: [],
  mode: "Revenue Business Fleet Scheduler",
  options: {
    killPressureThreshold: 70,
    launchWaveSize: 10,
    maxParallelLaunches: 10,
    maxParallelScaleActions: 25,
    qualityFloor: 70,
    shardCount: 32,
    targetBusinesses: 1000
  },
  providerContacted: false,
  shards: [{
    blocked: 0,
    businesses: 1,
    capacity: 3,
    id: "shard_001",
    laneCounts: {
      kill: 0,
      launch_now: 1,
      quality_repair: 0,
      scale: 0,
      throttle: 0,
      watch: 0
    },
    queued: 0,
    readyParallel: 1,
    throttled: 0
  }],
  sourceSignals: {
    assetPortfolioGeneratedAt: "2026-06-02T12:00:00.000Z",
    financialKillPressure: 0,
    financialScalePressure: 86,
    firstBusinessLaunchReady: 1
  },
  summary: "1 business scored across 32 shards. 1 ready for parallel internal work, including 1/10 first-wave launch slots.",
  totals: {
    blocked: 0,
    businesses: 1,
    kill: 0,
    launchNow: 1,
    qualityBlock: 0,
    qualityPass: 1,
    qualityRepair: 0,
    qualityWatch: 0,
    queued: 0,
    readyParallel: 1,
    scale: 0,
    throttled: 0,
    watch: 0
  }
};
businessFleetPlan.launchWave = businessFleetPlan.businesses;

const businessFleetGapPlan: RevenueBusinessFleetLaunchGapPlan = {
  actions: [{
    action: "run_launch_wave",
    businessId: null,
    businessName: "1 ready launch-wave business",
    endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
    expectedInternalEffect: "Dispatch the currently ready first-wave business through internal First Business Launch controls.",
    externalExecution: false,
    priority: 1,
    reason: "1/10 launch-wave lanes are ready now.",
    sourceModule: "revenue_business_fleet_scheduler + revenue_first_business_launch",
    status: "ready"
  }, ...Array.from({ length: 9 }, (_, index): RevenueBusinessFleetLaunchGapPlan["actions"][number] => ({
    action: "create_opportunity_shell",
    businessId: null,
    businessName: `ENTRAL Private Revenue Lane ${index + 1}`,
    endpoint: "/merch/revenue-engine/opportunity-factory",
    expectedInternalEffect: "Create a private store shell with internal product drafts so the business can enter launch pipeline scoring.",
    externalExecution: false,
    priority: 50 + index,
    reason: "Launch wave is short by 9 lanes; this seed creates one new internal opportunity candidate.",
    sourceModule: "revenue_business_fleet_scheduler + revenue_opportunity_factory",
    status: "ready"
  }))],
  auditEvents: ["Business Fleet Launch Gap Planner compared the configured launch-wave target against ready-parallel businesses."],
  blockedExternalActions: businessFleetPlan.blockedExternalActions,
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  mode: "Revenue Business Fleet Launch Gap Planner",
  opportunitySeeds: Array.from({ length: 9 }, (_, index): RevenueBusinessFleetLaunchGapPlan["opportunitySeeds"][number] => ({
    businessName: `ENTRAL Private Revenue Lane ${index + 1}`,
    idea: `Private operator POD and digital product lane ${index + 1} for fast income testing, built around original serious utility designs and launch-ready product drafts.`,
    priceRange: {
      max: 64,
      min: 18
    },
    productCount: 5,
    productTypes: ["T-shirt", "Sticker", "Notebook", "Poster"],
    riskTolerance: "Low",
    sourceKey: `entral-private-revenue-lane-${index + 1}`,
    storePlatform: "Etsy"
  })),
  providerContacted: false,
  summary: "1/10 businesses are ready for the first wave. Gap 9: 0 repair actions and 9 new opportunity seeds queued internally.",
  totals: {
    createOpportunityShells: 9,
    currentBusinesses: 1,
    launchWaveGap: 9,
    readyLaunchWaveBusinesses: 1,
    repairActions: 0,
    runLaunchWaveActions: 1,
    targetLaunchWave: 10
  }
};

const moneyArmyPipelinePlan: RevenueMoneyArmyBatchPipelinePlan = {
  auditEvents: [
    "Money Army batch pipeline assembled Business Fleet scheduling, launch gap seeds, launch package gates, provider approval review, and internal deployment stages.",
    "Every stage is internal and approval-gated."
  ],
  blockedExternalActions: [
    "Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate",
    "Launching browser automation, stealth, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or platform-evasion workflows"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T12:05:00.000Z",
  mode: "Private Money Army Batch Pipeline",
  nextStage: null,
  providerContacted: false,
  selectedSourceKeys: businessFleetGapPlan.opportunitySeeds.slice(0, 2).map((seed) => seed.sourceKey),
  stages: [
    {
      blockedExternalActions: ["Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate"],
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
      expectedInternalEffect: "Create private store shells and product drafts from approved internal opportunity seeds.",
      externalExecution: false,
      name: "batch_creation",
      priority: 1,
      providerContacted: false,
      reason: "9 launch-wave gap seeds are ready for internal batch creation.",
      requiredConfirmation: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
      status: "ready",
      title: "Create internal batch"
    },
    {
      blockedExternalActions: ["Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate"],
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/acceleration/apply",
      expectedInternalEffect: "Queue listing, launch-pipeline, and setup runbooks for selected source keys.",
      externalExecution: false,
      name: "batch_acceleration",
      priority: 2,
      providerContacted: false,
      reason: "2 selected source keys can move through internal acceleration after creation.",
      requiredConfirmation: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION",
      status: "ready",
      title: "Accelerate batch"
    },
    {
      blockedExternalActions: ["Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate"],
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/live-package/apply",
      expectedInternalEffect: "Record live launch packages, provider payload dossiers, and approval packets internally.",
      externalExecution: false,
      name: "launch_package",
      priority: 3,
      providerContacted: false,
      reason: "Selected source keys can be packaged after acceleration.",
      requiredConfirmation: "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE",
      status: "ready",
      title: "Package launch batch"
    },
    {
      blockedExternalActions: ["Publishing, provider creation, marketplace uploads, content posting, ad spend, payouts, bank movement, or external write actions without a separate approval gate"],
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review/apply",
      expectedInternalEffect: "Approve or reject provider approval packets as internal records only.",
      externalExecution: false,
      name: "approval",
      priority: 4,
      providerContacted: false,
      reason: "Provider approval packets wait for explicit internal review.",
      requiredConfirmation: "REVIEW INTERNAL BUSINESS FLEET PROVIDER APPROVALS",
      status: "waiting",
      title: "Review approvals"
    },
    {
      blockedExternalActions: ["Launching browser automation, stealth, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or platform-evasion workflows"],
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
      expectedInternalEffect: "Dispatch ready businesses into internal First Business Launch controls.",
      externalExecution: false,
      name: "deployment",
      priority: 5,
      providerContacted: false,
      reason: "Deployment waits for approved launch gates.",
      requiredConfirmation: "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE",
      status: "waiting",
      title: "Deploy internal launch wave"
    }
  ],
  summary: "3 Money Army batch stages ready. Next: Create internal batch. Current launch-wave gap is 9; 0 deployment lanes ready.",
  totals: {
    approvablePackets: 0,
    approvedPackets: 0,
    blockedStages: 0,
    currentBusinesses: 1,
    launchWaveGap: 9,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 3,
    repairRequired: 0,
    seedCandidates: 9,
    selectedSourceKeys: 2,
    stages: 5,
    targetBusinesses: 1000,
    targetLaunchWave: 10
  }
};
moneyArmyPipelinePlan.nextStage = moneyArmyPipelinePlan.stages[0]!;

const hundredStoreOperationsPlan: RevenueHundredStoreOperationsPlan = {
  applicationReadiness: {
    applications: [{
      approvedReadOnlyConnectors: 1,
      blockedStores: 0,
      externalExecution: false,
      missingStores: 99,
      nextInternalAction: "Record missing read-only connector manifests, approvals, rollback plans, and operations-pack evidence.",
      pendingStores: 0,
      providerContacted: false,
      providerNames: ["Etsy"],
      readyStores: 1,
      readinessStatus: "partial",
      requiredStores: 100,
      role: "storefront",
      title: "Storefront Marketplace"
    }, {
      approvedReadOnlyConnectors: 1,
      blockedStores: 0,
      externalExecution: false,
      missingStores: 99,
      nextInternalAction: "Record missing read-only connector manifests, approvals, rollback plans, and operations-pack evidence.",
      pendingStores: 0,
      providerContacted: false,
      providerNames: ["Printify"],
      readyStores: 1,
      readinessStatus: "partial",
      requiredStores: 100,
      role: "pod_provider",
      title: "POD Supplier"
    }, {
      approvedReadOnlyConnectors: 1,
      blockedStores: 0,
      externalExecution: false,
      missingStores: 99,
      nextInternalAction: "Record missing read-only connector manifests, approvals, rollback plans, and operations-pack evidence.",
      pendingStores: 0,
      providerContacted: false,
      providerNames: ["Stripe"],
      readyStores: 1,
      readinessStatus: "partial",
      requiredStores: 100,
      role: "payments",
      title: "Payments And Payout Signals"
    }, {
      approvedReadOnlyConnectors: 0,
      blockedStores: 0,
      externalExecution: false,
      missingStores: 100,
      nextInternalAction: "Create connector readiness entries from launch closure, operations pack, provider manifest, payment, and content-channel evidence.",
      pendingStores: 0,
      providerContacted: false,
      providerNames: [],
      readyStores: 0,
      readinessStatus: "missing",
      requiredStores: 100,
      role: "content",
      title: "Faceless Content Channels"
    }, {
      approvedReadOnlyConnectors: 0,
      blockedStores: 0,
      externalExecution: false,
      missingStores: 100,
      nextInternalAction: "Create connector readiness entries from launch closure, operations pack, provider manifest, payment, and content-channel evidence.",
      pendingStores: 0,
      providerContacted: false,
      providerNames: [],
      readyStores: 0,
      readinessStatus: "missing",
      requiredStores: 100,
      role: "manual_import",
      title: "Manual Signal Import"
    }],
    summary: "1% application readiness coverage: 1/100 stores mapped, 1 ready for connector design, 0 need read-only approval, 0 need operator review, and 0 blocked. External execution remains locked.",
    totals: {
      approvedReadOnlyConnectors: 3,
      blockedEntries: 0,
      mappedStores: 1,
      missingStores: 99,
      needsOperatorReview: 0,
      needsReadOnlyApproval: 0,
      readinessCoveragePercent: 1,
      readyForDesign: 1,
      requiredBoundaries: 3,
      targetStores: 100
    }
  },
  auditEvents: [
    "100 Store Operations Readiness assembled Business Fleet scheduling, launch gap planning, Money Army batch stages, and provider packet readiness.",
    "The plan is internal and advisory; no provider, marketplace, browser, upload, publishing, ad spend, payment, bank, payout, or external write action was executed."
  ],
  applicationConnectionWorkbench: {
    auditEvents: [
      "100 Store Application Connection Workbench converted missing application roles into internal connection-prep packets and reusable future-store templates."
    ],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    mode: "100 Store Application Connection Workbench",
    packets: [{
      approvalChecklist: ["Confirm storefront owner and store URL/marketplace id."],
      connectionMode: "internal_preparation_only",
      credentialEnvVars: ["ETSY_CONNECTOR_CLIENT_ID", "SHOPIFY_CONNECTOR_ADMIN_TOKEN"],
      externalExecution: false,
      lane: "launch_now",
      providerContacted: false,
      providerOptions: ["Etsy", "Shopify"],
      readOnlyScopes: ["listings:read", "orders:read"],
      requiredArtifacts: ["Storefront connector manifest", "Draft listing field map"],
      role: "storefront",
      rollbackPlan: ["Keep listing writes disabled until a separate launch approval packet exists."],
      setupStatus: "already_mapped",
      shardId: "shard_001",
      storeId: "store-1",
      storeName: "Iron House Gym",
      title: "Storefront Marketplace"
    }, {
      approvalChecklist: ["Confirm POD provider account owner and shop id."],
      connectionMode: "internal_preparation_only",
      credentialEnvVars: ["PRINTIFY_CONNECTOR_TOKEN", "PRINTIFY_SHOP_ID"],
      externalExecution: false,
      lane: "launch_now",
      providerContacted: false,
      providerOptions: ["Printify", "Printful"],
      readOnlyScopes: ["shops:read", "catalog:read"],
      requiredArtifacts: ["POD provider manifest", "Product request manifest"],
      role: "pod_provider",
      rollbackPlan: ["Disable provider write queue for the affected store."],
      setupStatus: "already_mapped",
      shardId: "shard_001",
      storeId: "store-1",
      storeName: "Iron House Gym",
      title: "POD Supplier"
    }, {
      approvalChecklist: ["Confirm payment account owner and payout destination owner."],
      connectionMode: "internal_preparation_only",
      credentialEnvVars: ["STRIPE_CONNECTOR_SECRET_KEY"],
      externalExecution: false,
      lane: "launch_now",
      providerContacted: false,
      providerOptions: ["Stripe"],
      readOnlyScopes: ["balance:read", "orders:read"],
      requiredArtifacts: ["Payment read-only manifest", "Payout freeze control"],
      role: "payments",
      rollbackPlan: ["Keep payout and transfer writes disabled until separate financial approval exists."],
      setupStatus: "already_mapped",
      shardId: "shard_001",
      storeId: "store-1",
      storeName: "Iron House Gym",
      title: "Payments And Payout Signals"
    }, {
      approvalChecklist: ["Confirm channel owner and brand-safe publishing boundaries."],
      connectionMode: "internal_preparation_only",
      credentialEnvVars: ["YOUTUBE_CONNECTOR_CLIENT_ID", "TIKTOK_CONNECTOR_CLIENT_KEY"],
      externalExecution: false,
      lane: "launch_now",
      providerContacted: false,
      providerOptions: ["YouTube Shorts", "TikTok", "Instagram Reels"],
      readOnlyScopes: ["channel:read", "analytics:read"],
      requiredArtifacts: ["Faceless content channel manifest", "Content brief approval"],
      role: "content",
      rollbackPlan: ["Freeze upload queue before any future live content attempt."],
      setupStatus: "ready_for_internal_packet",
      shardId: "shard_001",
      storeId: "store-1",
      storeName: "Iron House Gym",
      title: "Faceless Content Channels"
    }, {
      approvalChecklist: ["Confirm operator-owned source file or manual signal source."],
      connectionMode: "internal_preparation_only",
      credentialEnvVars: [],
      externalExecution: false,
      lane: "launch_now",
      providerContacted: false,
      providerOptions: ["Manual Import"],
      readOnlyScopes: ["manual:reviewed_import"],
      requiredArtifacts: ["Manual import schema", "Sample signal file"],
      role: "manual_import",
      rollbackPlan: ["Archive bad manual import batch and keep original evidence."],
      setupStatus: "ready_for_internal_packet",
      shardId: "shard_001",
      storeId: "store-1",
      storeName: "Iron House Gym",
      title: "Manual Signal Import"
    }],
    providerContacted: false,
    summary: "2 application connection packets ready for internal prep across 1 visible store; 3 already mapped, 0 blocked by store quality, and 99 future store slots have reusable app templates. External execution remains locked.",
    templates: [{
      connectionMode: "internal_preparation_only",
      externalExecution: false,
      providerContacted: false,
      role: "storefront",
      slotCount: 99,
      title: "Storefront Marketplace"
    }, {
      connectionMode: "internal_preparation_only",
      externalExecution: false,
      providerContacted: false,
      role: "pod_provider",
      slotCount: 99,
      title: "POD Supplier"
    }, {
      connectionMode: "internal_preparation_only",
      externalExecution: false,
      providerContacted: false,
      role: "payments",
      slotCount: 99,
      title: "Payments And Payout Signals"
    }, {
      connectionMode: "internal_preparation_only",
      externalExecution: false,
      providerContacted: false,
      role: "content",
      slotCount: 99,
      title: "Faceless Content Channels"
    }, {
      connectionMode: "internal_preparation_only",
      externalExecution: false,
      providerContacted: false,
      role: "manual_import",
      slotCount: 99,
      title: "Manual Signal Import"
    }],
    totals: {
      alreadyMappedPackets: 3,
      blockedPackets: 0,
      credentialEnvVars: 7,
      futureStoreTemplates: 495,
      packets: 5,
      readyPackets: 2,
      requiredArtifacts: 10,
      rollbackPlans: 5,
      storesCovered: 1
    }
  },
  batchPlan: {
    batchRunsRequired: 4,
    currentStores: 1,
    productDraftDeficit: 487,
    recommendedBatchSize: 25,
    storeGap: 99,
    targetStores: 100
  },
  blockedExternalActions: moneyArmyPipelinePlan.blockedExternalActions,
  concurrency: {
    configuredParallelSlots: 75,
    currentShards: 1,
    maxStoresPerShard: 8,
    minimumRecommendedShards: 13,
    overloadedShardIds: [],
    safeInternalJobSlots: 3,
    shardCount: 32
  },
  connectorActivationMatrix: {
    auditEvents: [
      "100 Store Connector Activation Matrix converted application packets and future templates into per-store connector readiness rows."
    ],
    blockedExternalActions: [
      "Using connector activation rows as authorization to contact providers, exchange credentials, create OAuth grants, execute write scopes, upload content, publish listings, run ads, open browsers, move money, or call external APIs",
      "Storing credential values inside ENTRAL instead of env-var references and owner-controlled credential custody"
    ],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    mode: "100 Store Connector Activation Matrix",
    providerContacted: false,
    rows: [{
      approvalChecklist: ["Owner confirms storefront connector design before any OAuth or provider action."],
      credentialCustodyChecklist: ["Credential value remains outside ENTRAL until explicit owner approval."],
      credentialEnvVars: ["ETSY_CONNECTOR_CLIENT_ID", "SHOPIFY_CONNECTOR_ADMIN_TOKEN"],
      dryRunRequestMap: [{
        approvalRequired: true,
        endpointTemplate: "/internal/dry-run/storefront/connectors/{storeId}",
        idempotencyKey: "connector-store-1-storefront",
        method: "POST",
        payloadFields: ["storeId", "provider", "readOnlyScopes", "approvalId"],
        stepId: "connector-store-1-storefront-dry-run",
        title: "Storefront Marketplace dry-run request map"
      }],
      externalExecution: false,
      providerContacted: false,
      providerOptions: ["Etsy", "Shopify"],
      readinessScore: 86,
      readOnlyScopes: ["listings:read", "orders:read"],
      requiredArtifacts: ["Storefront connector manifest", "Draft listing field map"],
      role: "storefront",
      rollbackPlan: ["Disable storefront connector row and keep listing writes blocked."],
      shardId: "shard_001",
      status: "credential_custody_required",
      storeId: "store-1",
      storeName: "Iron House Gym",
      title: "Storefront Marketplace",
      writeScopesBlocked: ["listings:write", "shops:write"]
    }, {
      approvalChecklist: ["Owner confirms manual import schema before any signal is trusted."],
      credentialCustodyChecklist: ["No credential custody required for manual import."],
      credentialEnvVars: [],
      dryRunRequestMap: [{
        approvalRequired: true,
        endpointTemplate: "/internal/dry-run/manual-import/{storeId}",
        idempotencyKey: "connector-store-1-manual-import",
        method: "POST",
        payloadFields: ["storeId", "sourceName", "schemaVersion", "sampleRows"],
        stepId: "connector-store-1-manual-import-dry-run",
        title: "Manual Signal Import dry-run request map"
      }],
      externalExecution: false,
      providerContacted: false,
      providerOptions: ["Manual Import"],
      readinessScore: 76,
      readOnlyScopes: ["manual:reviewed_import"],
      requiredArtifacts: ["Manual import schema", "Sample signal file"],
      role: "manual_import",
      rollbackPlan: ["Archive bad manual import batch and keep original evidence."],
      shardId: "shard_001",
      status: "ready_for_connection_design",
      storeId: "store-1",
      storeName: "Iron House Gym",
      title: "Manual Signal Import",
      writeScopesBlocked: ["manual:auto_apply"]
    }, {
      approvalChecklist: ["Create the store shell before credential or provider readiness can be reviewed."],
      credentialCustodyChecklist: ["Hold credential custody until the future store exists."],
      credentialEnvVars: ["PRINTIFY_CONNECTOR_TOKEN", "PRINTIFY_SHOP_ID"],
      dryRunRequestMap: [{
        approvalRequired: true,
        endpointTemplate: "/internal/dry-run/pod-provider/connectors/{storeId}",
        idempotencyKey: "connector-future-001-pod-provider",
        method: "POST",
        payloadFields: ["storeName", "provider", "readOnlyScopes", "approvalId"],
        stepId: "connector-future-001-pod-provider-dry-run",
        title: "POD Supplier dry-run request map"
      }],
      externalExecution: false,
      providerContacted: false,
      providerOptions: ["Printify", "Printful"],
      readinessScore: 42,
      readOnlyScopes: ["shops:read", "catalog:read"],
      requiredArtifacts: ["POD provider manifest", "Product request manifest"],
      role: "pod_provider",
      rollbackPlan: ["Keep provider write queue disabled for this future store slot."],
      shardId: "shard_future",
      status: "waiting_for_store_shell",
      storeId: null,
      storeName: "Future Store Slot 001",
      title: "POD Supplier",
      writeScopesBlocked: ["products:write", "orders:write"]
    }],
    summary: "500/500 connector activation rows prepared for 100 stores across 5 required application roles: 1 ready for connection design, 3 require credential custody, 496 waiting for store shells, and 0 blocked by quality. External execution remains locked.",
    totals: {
      blockedByQuality: 0,
      credentialCustodyRequired: 3,
      credentialEnvVarRefs: 7,
      currentStoreRows: 5,
      dryRunRequestMaps: 500,
      futureStoreRows: 495,
      maxSelectableRows: 25,
      readyForConnectionDesign: 1,
      requiredRoles: 5,
      rows: 500,
      storesCovered: 1,
      targetStores: 100,
      waitingForStoreShell: 496,
      writeScopesBlocked: 500
    }
  },
  controlGrid: {
    auditEvents: [
      "100 Store Operating Control Grid assigned each visible store to a shard, lane, allowed internal job set, and application-readiness state."
    ],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    mode: "100 Store Operating Control Grid",
    providerContacted: false,
    safeToRunParallelInternalJobs: true,
    shards: [{
      availableStoreSlots: 7,
      capacityUtilizationPercent: 13,
      externalExecution: false,
      id: "shard_001",
      laneCounts: {
        kill: 0,
        launch_now: 1,
        quality_repair: 0,
        scale: 0,
        throttle: 0,
        watch: 0
      },
      maxStores: 8,
      nextInternalFocus: "Prepare launch packages and connector packets for ready stores.",
      overloaded: false,
      providerContacted: false,
      readyInternalJobs: 4,
      stores: 1,
      throttledOrBlockedStores: 0
    }],
    stores: [{
      allowedInternalJobs: ["prepare_connector_packet", "generate_products", "prepare_launch_package", "queue_organic_content", "monitor_performance"],
      applicationReadiness: {
        approvedReadOnlyConnectors: 3,
        missingRoles: ["Faceless Content Channels", "Manual Signal Import"],
        readinessStatus: "partial",
        requiredRoles: 5
      },
      businessId: "store-1",
      businessName: "Iron House Gym",
      externalExecution: false,
      lane: "launch_now",
      nextInternalAction: "dispatch_first_cash_bridge_action",
      productAssets: 2,
      profitVelocity: 58,
      providerContacted: false,
      qualityStatus: "pass",
      queuePosition: 1,
      scheduleState: "ready_parallel",
      score: {
        finalRank: 92,
        killPressure: 0,
        scalePressure: 76
      },
      shardId: "shard_001"
    }],
    summary: "1/100 stores mapped into the 100-store control grid across 1 shard; 1 ready-parallel stores, 4 allowed ready internal jobs, 0 overloaded shards, and 99 empty store slots remain. External execution is locked.",
    totals: {
      applicationBlocked: 0,
      applicationMissing: 0,
      applicationPartial: 1,
      applicationReady: 0,
      configuredShards: 1,
      currentStores: 1,
      killLaneStores: 0,
      launchLaneStores: 1,
      missingStoreSlots: 99,
      overloadedShards: 0,
      readyInternalJobs: 4,
      readyParallelStores: 1,
      repairLaneStores: 0,
      scaleLaneStores: 0,
      targetStores: 100,
      visibleStores: 1,
      watchLaneStores: 0
    }
  },
  monitoringMatrix: {
    auditEvents: [
      "100 Store Monitoring Matrix assigned every visible store to an internal signal cadence, evidence queue, and rotation/scale review path."
    ],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    items: [{
      businessId: "store-1",
      businessName: "Iron House Gym",
      cadence: "twice_daily_until_first_signal",
      externalExecution: false,
      lane: "launch_now",
      nextInternalAction: "queue_readonly_performance_import",
      priority: 90,
      profitVelocity: 58,
      providerContacted: false,
      requiredSignals: ["gross revenue", "net profit", "units sold", "store visits", "conversion rate", "refunds", "ad spend", "organic content views", "read-only connector import timestamp", "source system record id"],
      rotationDecision: "launch_now",
      scheduleState: "ready_parallel",
      shardId: "shard_001",
      signalStatus: "needs_readonly_import",
      trackedAssets: 0,
      triggerReason: "Iron House Gym has approved read-only connector evidence but no tracked performance assets yet."
    }],
    mode: "100 Store Monitoring Matrix",
    providerContacted: false,
    queues: {
      manualSnapshots: [],
      readOnlyImports: [{
        businessId: "store-1",
        businessName: "Iron House Gym",
        cadence: "twice_daily_until_first_signal",
        externalExecution: false,
        lane: "launch_now",
        nextInternalAction: "queue_readonly_performance_import",
        priority: 90,
        profitVelocity: 58,
        providerContacted: false,
        requiredSignals: ["gross revenue", "net profit", "units sold", "store visits", "conversion rate", "refunds", "ad spend", "organic content views", "read-only connector import timestamp", "source system record id"],
        rotationDecision: "launch_now",
        scheduleState: "ready_parallel",
        shardId: "shard_001",
        signalStatus: "needs_readonly_import",
        trackedAssets: 0,
        triggerReason: "Iron House Gym has approved read-only connector evidence but no tracked performance assets yet."
      }],
      rotationReviews: [],
      scaleReviews: []
    },
    summary: "1/100 stores are on a monitoring cadence: 0 manual snapshot queues, 1 read-only import queue, 0 rotation reviews, 0 scale reviews, and 99 future slots still need store creation. External execution is locked.",
    totals: {
      dailyProfitVelocity: 58,
      every3Days: 0,
      immediateRotationReviews: 0,
      manualSnapshots: 0,
      missingStoreSlots: 99,
      readOnlyImports: 1,
      scaleReviews: 0,
      signalReady: 0,
      storesCovered: 1,
      twiceDaily: 1,
      weeklyWatch: 0
    }
  },
  growthAllocationRouter: {
    auditEvents: [
      "100 Store Growth Allocation Router converted scale pressure, kill pressure, monitoring status, and tracked signal depth into advisory Ad/Growth bucket priorities."
    ],
    blockedExternalActions: [
      "Spending from the 25% Ad/Growth bucket without explicit owner approval",
      "Starting paid ads, provider writes, marketplace uploads, content posting, browser automation, payouts, bank movement, or payment actions"
    ],
    candidates: [{
      adGrowthBucketSharePercent: 100,
      allocationLane: "organic_first",
      allocationWeight: 89,
      businessId: "store-1",
      businessName: "Iron House Gym",
      eligibleForPaidScaleReview: false,
      externalExecution: false,
      guardrails: ["Ad/Growth allocation is advisory only and cannot spend money without Financial Orchestrator approval."],
      killPressure: 0,
      lane: "launch_now",
      nextInternalAction: "queue_organic_content_and_signal_capture",
      priority: 90,
      profitVelocity: 58,
      providerContacted: false,
      reason: "Iron House Gym should use organic-first growth and signal capture before paid spend because status is needs readonly import.",
      recommendedSpendPriority: "none",
      requiredApproval: "No paid spend approval is available from this lane.",
      scalePressure: 76,
      shardId: "shard_001",
      signalStatus: "needs_readonly_import",
      trackedAssets: 0
    }],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    mode: "100 Store Growth Allocation Router",
    providerContacted: false,
    summary: "1/100 stores evaluated for advisory Ad/Growth routing: 0 paid-scale review, 1 organic-first, 0 defensive hold, and 0 watch. 0% of the 25% Ad/Growth bucket remains unrouted or defensive. External execution is locked.",
    totals: {
      advisoryOnly: true,
      averageKillPressure: 0,
      averageScalePressure: 76,
      candidates: 1,
      defensiveHold: 0,
      organicFirst: 1,
      paidScaleReview: 0,
      retainedForDefensePercent: 0,
      routedAdGrowthPercent: 100,
      storesCovered: 1,
      totalAllocationWeight: 89,
      watch: 0
    }
  },
  dailyOperatingLoop: {
    auditEvents: [
      "100 Store Daily Operating Loop sequenced safety, application packet prep, monitoring, growth allocation review, product depth repair, autonomy work leasing, store batch creation, and weak-lane cleanup."
    ],
    blockedExternalActions: [
      "Running daily loop steps against external providers, marketplaces, ad accounts, banks, payment systems, browsers, uploads, or publishing systems"
    ],
    cadence: "daily_private_internal_ops",
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    mode: "100 Store Daily Operating Loop",
    providerContacted: false,
    steps: [{
      approvalRequired: false,
      blockers: [],
      confirmation: "REVIEW INTERNAL SAFETY ENVELOPE",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-operations",
      expectedInternalEffect: "Confirm all 100-store operating layers remain private, internal, and external-execution locked.",
      externalExecution: false,
      maxItems: 1,
      phase: "safety_gate_snapshot",
      priority: 1,
      providerContacted: false,
      reason: "Safety envelope is clear enough to continue internal daily sequencing.",
      status: "ready",
      stepId: "daily_safety_gate_snapshot",
      title: "Confirm private safety envelope"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "RECORD INTERNAL 100 STORE APP CONNECTION PACKETS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-application-connections/apply",
      expectedInternalEffect: "Record up to 2 internal app readiness packets for required store applications.",
      externalExecution: false,
      maxItems: 2,
      phase: "application_connection_packets",
      priority: 2,
      providerContacted: false,
      reason: "2 application connection packets can be recorded before launch capacity expands.",
      status: "ready",
      stepId: "daily_application_connection_packets",
      title: "Record app connection packets"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "RECORD INTERNAL 100 STORE CONNECTOR ACTIVATION MATRIX",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-connector-activation/apply",
      expectedInternalEffect: "Record up to 25 connector activation readiness rows with dry-run maps and credential custody gates.",
      externalExecution: false,
      maxItems: 25,
      phase: "connector_activation_matrix",
      priority: 3,
      providerContacted: false,
      reason: "1 rows are ready for connection design and 3 require credential custody approval.",
      status: "ready",
      stepId: "daily_connector_activation_matrix",
      title: "Record connector activation matrix"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "RECORD INTERNAL 100 STORE MONITORING CYCLE",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-monitoring-cycle/apply",
      expectedInternalEffect: "Record up to 1 monitoring item from the 100-store signal queues.",
      externalExecution: false,
      maxItems: 1,
      phase: "monitoring_cycle",
      priority: 4,
      providerContacted: false,
      reason: "0 manual, 1 read-only, 0 scale, and 0 rotation monitoring queues are visible.",
      status: "ready",
      stepId: "daily_monitoring_cycle",
      title: "Run monitoring cycle"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "REVIEW ADVISORY 100 STORE GROWTH ALLOCATION",
      endpoint: "/merch/financial-orchestrator/plan",
      expectedInternalEffect: "Review advisory routing for the Financial Orchestrator 25% Ad/Growth bucket without authorizing spend.",
      externalExecution: false,
      maxItems: 1,
      phase: "growth_allocation_review",
      priority: 5,
      providerContacted: false,
      reason: "1 growth route can inform organic work or paid-scale budget review; all spend remains approval-gated.",
      status: "approval_required",
      stepId: "daily_growth_allocation_review",
      title: "Review Ad/Growth allocation router"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-product-depth/apply",
      expectedInternalEffect: "Record up to 25 internal product-depth draft packets across current stores and future store slots.",
      externalExecution: false,
      maxItems: 25,
      phase: "product_depth_repair",
      priority: 6,
      providerContacted: false,
      reason: "100-store operations require at least 5 products per store; 487 internal draft packets are queued.",
      status: "ready",
      stepId: "daily_product_depth_repair",
      title: "Fill product depth"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "RECORD INTERNAL 100 STORE LAUNCH PACKETS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-launch-packets/apply",
      expectedInternalEffect: "Record up to 25 internal launch packets for ready and planned store lanes.",
      externalExecution: false,
      maxItems: 25,
      phase: "launch_packet_review",
      priority: 7,
      providerContacted: false,
      reason: "1 packets are ready for internal launch review and 99 future packets are waiting for store shells.",
      status: "ready",
      stepId: "daily_launch_packet_review",
      title: "Review launch packets"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "RECORD INTERNAL 100 STORE AUTONOMY RUN",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-autonomy-run/apply",
      expectedInternalEffect: "Record up to 25 bounded internal autonomy jobs across 100-store control lanes.",
      externalExecution: false,
      maxItems: 25,
      phase: "autonomy_run_queue",
      priority: 8,
      providerContacted: false,
      reason: "25 ready internal jobs and 2 approval-routed jobs are queued for the chain of command.",
      status: "ready",
      stepId: "daily_autonomy_run_queue",
      title: "Record autonomy run queue"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "RECORD INTERNAL 100 STORE WORK LEASES",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-work-leases/apply",
      expectedInternalEffect: "Record up to 25 deterministic internal work leases with dedupe and shard caps.",
      externalExecution: false,
      maxItems: 25,
      phase: "work_lease_claims",
      priority: 9,
      providerContacted: false,
      reason: "25 leases are ready to claim and 2 leases remain approval-held.",
      status: "ready",
      stepId: "daily_work_lease_claims",
      title: "Record work leases"
    }, {
      approvalRequired: true,
      blockers: [],
      confirmation: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
      expectedInternalEffect: "Create the next 25 private store shells with internal product drafts.",
      externalExecution: false,
      maxItems: 25,
      phase: "store_batch_creation",
      priority: 10,
      providerContacted: false,
      reason: "99 stores remain before the 100-store operating floor; safe batch size is 25.",
      status: "ready",
      stepId: "daily_store_batch_creation",
      title: "Create next store batch"
    }, {
      approvalRequired: true,
      blockers: ["No weak-lane review action is currently queued."],
      confirmation: "APPLY INTERNAL ASSET ACTION",
      endpoint: "/merch/revenue-engine/review-queue",
      expectedInternalEffect: "Review weak lanes before they consume launch or growth capacity.",
      externalExecution: false,
      maxItems: 0,
      phase: "weak_lane_rotation",
      priority: 11,
      providerContacted: false,
      reason: "0 immediate rotation reviews are visible in monitoring.",
      status: "waiting",
      stepId: "daily_weak_lane_rotation",
      title: "Clear weak lanes"
    }],
    summary: "11 daily operating steps sequenced for 100-store private operations: 9 ready, 1 approval-required, 1 waiting, and 0 blocked. External execution remains locked.",
    totals: {
      approvalRequired: 1,
      blocked: 0,
      executableInternalSteps: 9,
      ready: 9,
      safeBatchSize: 25,
      storeGap: 99,
      storesCovered: 1,
      waiting: 1
    }
  },
  capacityProof: {
    auditEvents: [
      "100 Store Capacity Proof stress-tested shard capacity, application boundary preparation, monitoring throughput, daily supervisor control, work lease claiming, batch/product depth, and growth-routing guardrails."
    ],
    blockedExternalActions: [
      "Using capacity proof as authorization for provider, marketplace, ad, upload, browser, payment, payout, bank, social, or external write execution"
    ],
    checks: [{
      capacity: 8,
      checkId: "shard_capacity",
      evidence: [
        "1 configured shard at 8 stores per shard.",
        "0 overloaded shards detected.",
        "8/100 projected stores fit inside the current shard ceiling."
      ],
      externalExecution: false,
      gap: 92,
      nextInternalAction: "Increase shard count or reduce stores per overloaded shard before expanding parallel work.",
      projectedLoad: 100,
      providerContacted: false,
      status: "block",
      title: "Shard Capacity"
    }, {
      capacity: 500,
      checkId: "application_boundary_preparation",
      evidence: [
        "500/500 current packets plus future templates cover required application boundaries.",
        "2 ready packets, 3 already mapped, and 0 blocked by store quality.",
        "99/99 future store slots have reusable application templates."
      ],
      externalExecution: false,
      gap: 0,
      nextInternalAction: "Record ready app packets and keep reusable templates attached to every new store shell.",
      projectedLoad: 500,
      providerContacted: false,
      status: "pass",
      title: "Application Boundary Preparation"
    }, {
      capacity: 500,
      checkId: "connector_activation_readiness",
      evidence: [
        "500/500 connector activation rows prepared across current and future stores.",
        "1 ready for connection design and 3 waiting on credential custody review.",
        "500 dry-run request maps prepared while 500 write scope references remain blocked."
      ],
      externalExecution: false,
      gap: 0,
      nextInternalAction: "Record connector activation rows and keep credential custody/read-only scopes separated from external execution.",
      projectedLoad: 500,
      providerContacted: false,
      status: "watch",
      title: "Connector Activation Readiness"
    }, {
      capacity: 100,
      checkId: "monitoring_throughput",
      evidence: [
        "4 internal monitoring cycles needed to sweep 100 stores at safe batch size 25.",
        "0 immediate rotation reviews and 0 scale reviews are currently queued.",
        "1/100 current stores are visible in the monitoring matrix."
      ],
      externalExecution: false,
      gap: 0,
      nextInternalAction: "Run supervisor monitoring cycles until every active store has current signal evidence.",
      projectedLoad: 100,
      providerContacted: false,
      status: "pass",
      title: "Monitoring Throughput"
    }, {
      capacity: 11,
      checkId: "daily_supervisor_control",
      evidence: [
        "9 ready steps, 1 approval-required, 1 waiting, and 0 blocked.",
        "Daily supervisor can select from 11 ordered internal steps.",
        "Safety envelope reports external execution locked."
      ],
      externalExecution: false,
      gap: 0,
      nextInternalAction: "Use the daily supervisor as the single private control cycle for 100-store operations.",
      projectedLoad: 11,
      providerContacted: false,
      status: "pass",
      title: "Daily Supervisor Control"
    }, {
      capacity: 25,
      checkId: "work_lease_clean_claiming",
      evidence: [
        "25 ready-to-claim leases and 2 approval-held leases.",
        "25 clean parallel leases fit shard caps at 1 per shard.",
        "0 duplicate dedupe keys detected across 128 leases."
      ],
      externalExecution: false,
      gap: 0,
      nextInternalAction: "Record deduped work leases before workers claim store, product, launch, connector, or monitoring tasks.",
      projectedLoad: 25,
      providerContacted: false,
      status: "pass",
      title: "Work Lease Clean Claiming"
    }, {
      capacity: 100,
      checkId: "batch_and_product_depth",
      evidence: [
        "99 store slots remain before the 100-store floor.",
        "487 product drafts remain before configured product depth is satisfied.",
        "Safe batch size 25 creates up to 100 stores across four internal batch cycles."
      ],
      externalExecution: false,
      gap: 586,
      nextInternalAction: "Run internal batch creation and product-depth repair until all 100 stores have minimum product depth.",
      projectedLoad: 100,
      providerContacted: false,
      status: "watch",
      title: "Batch And Product Depth"
    }, {
      capacity: 1,
      checkId: "profit_routing_guardrails",
      evidence: [
        "1 current store evaluated for advisory growth routing.",
        "0 paid-scale review routes and 1 organic-first route.",
        "100% of advisory Ad/Growth priority is currently routed with spend locked."
      ],
      externalExecution: false,
      gap: 99,
      nextInternalAction: "Use pressure-routed growth priorities for organic work and separate Financial Orchestrator budget review.",
      projectedLoad: 100,
      providerContacted: false,
      status: "pass",
      title: "Profit Routing Guardrails"
    }],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    mode: "100 Store Capacity Proof",
    providerContacted: false,
    status: "block",
    stressProfile: {
      applicationBoundaryCoveragePercent: 100,
      cleanSimultaneousStoreCapacity: 8,
      futureStoreSlotsCovered: 99,
      maximumCleanStoresAtShardLimit: 8,
      monitoringSweepCycles: 4,
      preparedApplicationBoundaries: 500,
      productDraftDeficit: 487,
      projectedDailySupervisorSteps: 11,
      requiredApplicationBoundaries: 500,
      safeBatchSize: 25,
      shardCapacity: 8,
      storeGap: 99,
      targetStores: 100
    },
    summary: "BLOCK capacity proof: private controls can currently model 8/100 clean simultaneous store slots with 5 pass, 2 watch, and 1 block checks. External execution remains locked.",
    totals: {
      block: 1,
      cleanSimultaneousStoreCapacity: 8,
      pass: 5,
      targetStores: 100,
      watch: 2
    }
  },
  productDepthQueue: {
    auditEvents: [
      "100 Store Product Depth Queue prepared deterministic internal product draft packets for current under-depth stores and future store slots."
    ],
    blockedExternalActions: [
      "Generating images, uploading products, choosing suppliers, publishing listings, posting content, running ads, opening browsers, charging cards, moving payouts, or contacting providers from product-depth queue records"
    ],
    drafts: [{
      approvalChecklist: [
        "Confirm product concept fits store audience and brand voice.",
        "Approve design prompt before generating or uploading any asset."
      ],
      contentTieIn: "Faceless launch teaser for Iron House Gym built around the performance tee first-drop angle.",
      currentProducts: 0,
      designPrompt: "Create a reusable POD-ready performance tee concept for Iron House Gym; original text or abstract motif only, no protected brands, no provider upload.",
      draftId: "product-depth:future-slot-1:1",
      externalExecution: false,
      facelessHook: "The first Iron House Gym drop starts with a performance tee people can understand in three seconds.",
      lane: "future_store_slot",
      listingAngle: "Future Iron House Gym launch concept prepared for organic-first validation.",
      missingProducts: 5,
      organicMove: "Prepare launch caption, three organic hooks, and a manual signal row before provider work.",
      priority: 50,
      productType: "performance tee",
      providerContacted: false,
      requiredProducts: 5,
      shardId: "future_shard_001",
      status: "waiting_for_store_shell",
      storeId: null,
      storeName: "Iron House Gym",
      title: "Iron House Gym founder edition performance tee"
    }, {
      approvalChecklist: [
        "Confirm product concept fits store audience and brand voice.",
        "Approve design prompt before generating or uploading any asset."
      ],
      contentTieIn: "Faceless launch teaser for Iron House Gym built around the training hoodie first-drop angle.",
      currentProducts: 0,
      designPrompt: "Create a reusable POD-ready training hoodie concept for Iron House Gym; original text or abstract motif only, no protected brands, no provider upload.",
      draftId: "product-depth:future-slot-1:2",
      externalExecution: false,
      facelessHook: "The first Iron House Gym drop starts with a training hoodie people can understand in three seconds.",
      lane: "future_store_slot",
      listingAngle: "Future Iron House Gym launch concept prepared for organic-first validation.",
      missingProducts: 5,
      organicMove: "Prepare launch caption, three organic hooks, and a manual signal row before provider work.",
      priority: 49,
      productType: "training hoodie",
      providerContacted: false,
      requiredProducts: 5,
      shardId: "future_shard_001",
      status: "waiting_for_store_shell",
      storeId: null,
      storeName: "Iron House Gym",
      title: "Iron House Gym daily discipline training hoodie"
    }],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    mode: "100 Store Product Depth Queue",
    providerContacted: false,
    summary: "487 internal product-depth draft packets prepared for the 100-store floor: 0 ready for current stores, 487 waiting for future store shells, and 0 blocked by quality. External execution remains locked.",
    totals: {
      blockedDrafts: 0,
      currentStoreDrafts: 0,
      drafts: 487,
      futureStoreDrafts: 487,
      maxSelectableDrafts: 25,
      productDraftDeficit: 487,
      readyDrafts: 0,
      storesCovered: 99,
      targetStores: 100,
      waitingDrafts: 487
    }
  },
  launchPacketQueue: {
    auditEvents: [
      "100 Store Launch Packet Queue assembled store readiness, application packets/templates, product-depth drafts, faceless hooks, organic moves, and growth lanes into per-store internal review packets."
    ],
    blockedExternalActions: [
      "Treating launch packets as live marketplace listings, provider uploads, browser automation, ad launches, social posts, payment actions, payouts, bank movement, or external write execution"
    ],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    mode: "100 Store Launch Packet Queue",
    packets: [{
      applicationPacketCount: 5,
      approvalChecklist: [
        "Review store shell, product depth, application packets, faceless hooks, and organic moves.",
        "Approve supplier, pricing, mockup, listing copy, connector setup, and launch timing before external execution can exist."
      ],
      contentIdeas: ["The first Iron House Gym drop starts with a performance tee people can understand in three seconds."],
      currentProducts: 5,
      externalExecution: false,
      growthLane: "organic_first",
      launchPacketId: "launch-packet:store-1",
      missingApplicationRoles: [],
      organicMoves: ["Queue organic content and signal capture before paid spend."],
      priority: 99,
      productDraftCount: 0,
      providerContacted: false,
      readinessScore: 100,
      requiredApplicationRoles: 5,
      requiredProducts: 5,
      shardId: "shard_001",
      status: "ready_for_internal_launch_review",
      storeId: "store-1",
      storeName: "Iron House Gym",
      summary: "Iron House Gym launch packet is ready for internal launch review with 5/5 app packets and 5/5 product depth."
    }, {
      applicationPacketCount: 5,
      approvalChecklist: [
        "Review store shell, product depth, application packets, faceless hooks, and organic moves.",
        "Create or approve the store shell before this future-slot packet can become a live launch candidate."
      ],
      contentIdeas: ["The first Iron House Gym drop starts with a performance tee people can understand in three seconds."],
      currentProducts: 0,
      externalExecution: false,
      growthLane: "unrouted",
      launchPacketId: "launch-packet:future-slot-1",
      missingApplicationRoles: [],
      organicMoves: ["Prepare launch caption, three organic hooks, and a manual signal row before provider work."],
      priority: 90,
      productDraftCount: 5,
      providerContacted: false,
      readinessScore: 90,
      requiredApplicationRoles: 5,
      requiredProducts: 5,
      shardId: "future_shard_001",
      status: "waiting_for_store_shell",
      storeId: null,
      storeName: "Iron House Gym",
      summary: "Iron House Gym future launch packet is waiting for store shell with 5/5 app templates and 5/5 planned product drafts."
    }],
    providerContacted: false,
    summary: "100/100 launch packets assembled: 1 ready for internal launch review, 99 waiting for store shells, 0 need application packets, 0 need product depth, and 0 blocked by quality. External execution remains locked.",
    totals: {
      blockedByQuality: 0,
      currentStorePackets: 1,
      futureStorePackets: 99,
      maxSelectablePackets: 25,
      needsApplicationPackets: 0,
      needsProductDepth: 0,
      packets: 100,
      readyForReview: 1,
      targetStores: 100,
      waitingForStoreShell: 99
    }
  },
  autonomyRunQueue: {
    auditEvents: [
      "100 Store Autonomy Run Queue converted store shells, monitoring evidence, growth routing, product-depth drafts, launch packets, connector packets, and rotation reviews into bounded internal jobs."
    ],
    blockedExternalActions: [
      "Provider account creation, OAuth authorization, credential exchange, API writes, uploads, marketplace publishing, browser automation, social posting, ad spend, payment actions, payout actions, bank movement, or supplier contact"
    ],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    jobs: [{
      approvalGate: "Internal store shell creation only; separate provider and public launch approval required.",
      blockedExternalActions: [
        "Provider account creation, OAuth authorization, credential exchange, API writes, uploads, marketplace publishing, browser automation, social posting, ad spend, payment actions, payout actions, bank movement, or supplier contact"
      ],
      expectedInternalEffect: "Prepare a private store shell record for Iron House Gym with 5 planned product concepts.",
      externalExecution: false,
      jobId: "autonomy:store-shell:entral-private-revenue-lane-1",
      jobType: "prepare_store_shell",
      priority: 95,
      providerContacted: false,
      requiresOwnerApproval: false,
      shardId: "future_shard_001",
      sourceId: "entral-private-revenue-lane-1",
      sourceModule: "Revenue Business Fleet Launch Gap Planner",
      status: "ready_internal",
      storeId: null,
      storeName: "Iron House Gym",
      summary: "Iron House Gym can be prepared as an internal store shell with no provider, marketplace, browser, ad, or payment action."
    }, {
      approvalGate: "Owner must approve the launch packet before manual or semi-automated external execution can be prepared.",
      blockedExternalActions: [
        "Provider account creation, OAuth authorization, credential exchange, API writes, uploads, marketplace publishing, browser automation, social posting, ad spend, payment actions, payout actions, bank movement, or supplier contact"
      ],
      expectedInternalEffect: "Record launch packet review bundle for Iron House Gym.",
      externalExecution: false,
      jobId: "autonomy:launch-packet:launch-packet:store-1",
      jobType: "record_launch_packet",
      priority: 92,
      providerContacted: false,
      requiresOwnerApproval: true,
      shardId: "shard_001",
      sourceId: "launch-packet:store-1",
      sourceModule: "100 Store Launch Packet Queue",
      status: "approval_required",
      storeId: "store-1",
      storeName: "Iron House Gym",
      summary: "Iron House Gym launch packet is ready for internal launch review with 5/5 app packets and 5/5 product depth."
    }, {
      approvalGate: "Internal product concept only; separate design, supplier, pricing, mockup, listing, and provider approval required.",
      blockedExternalActions: [
        "Provider account creation, OAuth authorization, credential exchange, API writes, uploads, marketplace publishing, browser automation, social posting, ad spend, payment actions, payout actions, bank movement, or supplier contact"
      ],
      expectedInternalEffect: "Record product-depth draft Iron House Gym daily discipline performance tee for Iron House Gym.",
      externalExecution: false,
      jobId: "autonomy:product-depth:product-depth:future-slot-1:1",
      jobType: "record_product_depth_draft",
      priority: 70,
      providerContacted: false,
      requiresOwnerApproval: false,
      shardId: "future_shard_001",
      sourceId: "product-depth:future-slot-1:1",
      sourceModule: "100 Store Product Depth Queue",
      status: "waiting",
      storeId: null,
      storeName: "Iron House Gym",
      summary: "Iron House Gym product-depth draft Iron House Gym daily discipline performance tee is waiting for store shell."
    }],
    mode: "100 Store Autonomy Run Queue",
    providerContacted: false,
    summary: "128 internal autonomy jobs queued for the 100-store floor: 25 ready internal, 2 approval-required, 99 waiting, 0 blocked, and 25 clean parallel jobs can run within shard caps. External execution remains locked.",
    totals: {
      approvalRequired: 2,
      blocked: 0,
      cleanParallelJobs: 25,
      jobs: 128,
      maxJobsPerShard: 1,
      maxSelectableJobs: 25,
      readyInternal: 25,
      shardCount: 32,
      storesCovered: 100,
      targetStores: 100,
      waiting: 99
    }
  },
  workLeasePlan: {
    auditEvents: [
      "100 Store Internal Work Lease Plan converted autonomy jobs into deterministic, deduped, shard-capped claim records."
    ],
    blockedExternalActions: [
      "Claiming the same dedupe key more than once in a single internal work cycle",
      "Using a work lease as proof of credential custody, supplier selection, payment authorization, or public launch approval"
    ],
    externalExecution: false,
    generatedAt: "2026-06-02T12:20:00.000Z",
    leases: [{
      approvalGate: "Internal store shell creation only; separate provider and public launch approval required.",
      blockedExternalActions: ["Provider account creation remains blocked."],
      claimWindowMinutes: 45,
      dedupeKey: "Iron House Gym:prepare_store_shell:entral-private-revenue-lane-1",
      dependencyRefs: ["source_opportunity_seed", "store_shell_template"],
      expectedInternalEffect: "Prepare a private store shell record for Iron House Gym with 5 planned product concepts.",
      expiresAt: "2026-06-02T13:05:00.000Z",
      externalExecution: false,
      idempotencyKey: "lease-ready-store-shell",
      jobId: "autonomy:store-shell:entral-private-revenue-lane-1",
      jobType: "prepare_store_shell",
      leaseId: "lease:lease-ready-store-shell",
      priority: 95,
      providerContacted: false,
      retryPolicy: {
        backoffMinutes: 15,
        maxAttempts: 3,
        requiresFreshPlanAfterFailure: false
      },
      shardId: "future_shard_001",
      sourceModule: "Revenue Business Fleet Launch Gap Planner",
      status: "ready_to_claim",
      storeId: null,
      storeName: "Iron House Gym",
      summary: "Iron House Gym prepare store shell lease is ready to claim with idempotency key lease-ready-store-shell."
    }, {
      approvalGate: "Owner must approve the launch packet before manual or semi-automated external execution can be prepared.",
      blockedExternalActions: ["Marketplace publishing remains blocked."],
      claimWindowMinutes: 45,
      dedupeKey: "store-1:record_launch_packet:launch-packet:store-1",
      dependencyRefs: ["store_shell", "connector_activation_matrix", "product_depth_queue", "owner_launch_review"],
      expectedInternalEffect: "Record launch packet review bundle for Iron House Gym.",
      expiresAt: "2026-06-02T13:05:00.000Z",
      externalExecution: false,
      idempotencyKey: "lease-approval-launch",
      jobId: "autonomy:launch-packet:launch-packet:store-1",
      jobType: "record_launch_packet",
      leaseId: "lease:lease-approval-launch",
      priority: 92,
      providerContacted: false,
      retryPolicy: {
        backoffMinutes: 60,
        maxAttempts: 3,
        requiresFreshPlanAfterFailure: true
      },
      shardId: "shard_001",
      sourceModule: "100 Store Launch Packet Queue",
      status: "approval_hold",
      storeId: "store-1",
      storeName: "Iron House Gym",
      summary: "Iron House Gym record launch packet lease is approval hold with idempotency key lease-approval-launch."
    }, {
      approvalGate: "Create or approve the store shell before this lease can be claimed.",
      blockedExternalActions: ["Provider upload remains blocked."],
      claimWindowMinutes: 45,
      dedupeKey: "Iron House Gym:record_product_depth_draft:product-depth:future-slot-1:1",
      dependencyRefs: ["future_store_shell", "product_depth_target"],
      expectedInternalEffect: "Record product-depth draft Iron House Gym daily discipline performance tee for Iron House Gym.",
      expiresAt: "2026-06-02T13:05:00.000Z",
      externalExecution: false,
      idempotencyKey: "lease-waiting-product",
      jobId: "autonomy:product-depth:product-depth:future-slot-1:1",
      jobType: "record_product_depth_draft",
      leaseId: "lease:lease-waiting-product",
      priority: 70,
      providerContacted: false,
      retryPolicy: {
        backoffMinutes: 60,
        maxAttempts: 3,
        requiresFreshPlanAfterFailure: true
      },
      shardId: "future_shard_001",
      sourceModule: "100 Store Product Depth Queue",
      status: "waiting_dependency",
      storeId: null,
      storeName: "Iron House Gym",
      summary: "Iron House Gym record product depth draft lease is waiting dependency with idempotency key lease-waiting-product."
    }],
    mode: "100 Store Internal Work Lease Plan",
    providerContacted: false,
    queues: {
      approvalHold: [],
      blocked: [],
      readyToClaim: [],
      waitingDependency: []
    },
    summary: "128 internal work leases prepared for 100-store operations: 25 ready to claim, 2 approval-hold, 99 waiting on dependencies, 0 blocked, and 25 can run cleanly within shard caps. External execution remains locked.",
    totals: {
      approvalHold: 2,
      blocked: 0,
      claimWindowMinutes: 45,
      cleanParallelLeases: 25,
      duplicateDedupeKeys: 0,
      leases: 128,
      maxLeasesPerShard: 1,
      maxSelectableLeases: 25,
      readyToClaim: 25,
      shardCount: 32,
      storesCovered: 100,
      targetStores: 100,
      waitingDependency: 99
    }
  },
  externalExecution: false,
  gates: [{
    actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
    evidence: [
      "1/100 stores currently tracked.",
      "99 additional store shells needed for the 100-store operating floor.",
      "4 safe batch runs at up to 25 stores each."
    ],
    externalExecution: false,
    providerContacted: false,
    status: "watch",
    title: "Store Inventory"
  }, {
    actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply",
    evidence: [
      "1 stores are ready for parallel internal work.",
      "1/25 launch-wave slots pass quality gates.",
      "75 configured parallel launch/scale slots."
    ],
    externalExecution: false,
    providerContacted: false,
    status: "watch",
    title: "Parallel Launch Capacity"
  }, {
    actionEndpoint: "/merch/revenue-engine/review-queue",
    evidence: [
      "1 pass, 0 watch, 0 blocked quality gates.",
      "0 repair lanes and 0 kill lanes.",
      "Quality floor is 72/100."
    ],
    externalExecution: false,
    providerContacted: false,
    status: "pass",
    title: "Quality And Rotation Health"
  }, {
    actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler",
    evidence: [
      "32 configured shards; 13 recommended minimum for 100 stores at 8 stores/shard.",
      "0 shards exceed the safe store density.",
      "3 current internal job slots across active shards."
    ],
    externalExecution: false,
    providerContacted: false,
    status: "pass",
    title: "Shard Distribution"
  }, {
    actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/provider-approval-review",
    evidence: [
      "0 provider approval packets ready or approved.",
      "0 provider approval packets waiting.",
      "0 deployment lanes currently ready."
    ],
    externalExecution: false,
    providerContacted: false,
    status: "pass",
    title: "Connector And Provider Packets"
  }, {
    actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
    evidence: [
      "3 Money Army stages ready.",
      "Next stage: Create internal batch.",
      "9 seed candidates currently available."
    ],
    externalExecution: false,
    providerContacted: false,
    status: "pass",
    title: "Money Army Batch Pipeline"
  }, {
    actionEndpoint: "/merch/financial-orchestrator/plan",
    evidence: [
      "0 scale lanes and 1 launch-now lane.",
      "$10.86/day current profit velocity.",
      "Financial Orchestrator remains advisory until owner spend approval."
    ],
    externalExecution: false,
    providerContacted: false,
    status: "pass",
    title: "Profit Acceleration"
  }, {
    actionEndpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-operations",
    evidence: [
      "All inspected fleet, gap, and pipeline plans report external execution locked.",
      "Provider writes, browser automation, uploads, publishing, ad spend, card charges, payouts, and bank movement stay blocked.",
      "Every next action routes through an internal endpoint with confirmation text."
    ],
    externalExecution: false,
    providerContacted: false,
    status: "pass",
    title: "Safety Envelope"
  }],
  generatedAt: "2026-06-02T12:20:00.000Z",
  mode: "100 Store Operations Readiness",
  nextActions: [{
    confirmation: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
    endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
    expectedInternalEffect: "Create private store shells and product drafts from approved internal opportunity seeds.",
    externalExecution: false,
    priority: 1,
    providerContacted: false,
    reason: "9 launch-wave gap seeds are ready for internal batch creation.",
    status: "ready",
    title: "Create internal batch"
  }, {
    confirmation: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
    endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
    expectedInternalEffect: "Create the next 25 private store shells with internal product drafts.",
    externalExecution: false,
    priority: 2,
    providerContacted: false,
    reason: "99 stores remain before the 100-store operating floor; safe batch size is 25.",
    status: "ready",
    title: "Create the next 100-store batch"
  }, {
    confirmation: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION",
    endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/acceleration/apply",
    expectedInternalEffect: "Prepare 487 internal product drafts or setup repairs across the fleet.",
    externalExecution: false,
    priority: 3,
    providerContacted: false,
    reason: "100-store operations require at least 5 products per store before live packaging.",
    status: "ready",
    title: "Fill product depth for 100 stores"
  }],
  operatingStatus: "ready_to_build_to_100",
  pipeline: {
    blockedStages: 0,
    nextStage: "batch_creation",
    readyStages: 3,
    seedCandidates: 9,
    stages: 5
  },
  profitAcceleration: {
    dailyProfitVelocity: 10.86,
    dailyRevenueVelocity: 20,
    killLaneStores: 0,
    launchNowStores: 1,
    repairLaneStores: 0,
    scaleLaneStores: 0,
    topScaleCandidates: [{
      businessId: "store-1",
      businessName: "Iron House Gym",
      profitVelocity: 10.86,
      scalePressure: 82,
      shardId: "shard_001"
    }]
  },
  providerContacted: false,
  readinessScore: 82,
  summary: "82/100 readiness for 100-store internal operations. 1/100 stores tracked, 99 store gap, 1 ready-parallel lane, 0 scale lanes, 0 repair lanes, and 3 Money Army stages ready. External execution remains locked.",
  totals: {
    approvalPacketsReady: 0,
    approvalPacketsWaiting: 0,
    currentStores: 1,
    gatesBlocked: 0,
    gatesPass: 6,
    gatesWatch: 2,
    readyParallelStores: 1,
    storeGap: 99,
    targetStores: 100
  }
};

const hundredStoreDailySupervisorPlan: RevenueHundredStoreDailySupervisorPlan = {
  auditEvents: [
    "100 Store Daily Supervisor selected bounded internal loop steps from the daily operating loop."
  ],
  blockedExternalActions: [
    "Turning a supervisor cycle into provider, marketplace, ad, payment, payout, upload, browser, social, bank, or external write execution"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T12:30:00.000Z",
  mode: "100 Store Daily Supervisor",
  operatingMode: "safe_internal_only",
  providerContacted: false,
  selectedSteps: [],
  steps: hundredStoreOperationsPlan.dailyOperatingLoop.steps.map((step) => ({
    action: step.phase === "safety_gate_snapshot"
      ? "confirm_safety"
      : step.phase === "application_connection_packets"
        ? "record_app_connection_packets"
        : step.phase === "connector_activation_matrix"
          ? "record_connector_activation_matrix"
          : step.phase === "monitoring_cycle"
            ? "record_monitoring_cycle"
            : step.phase === "growth_allocation_review"
              ? "review_growth_allocation"
              : step.phase === "product_depth_repair"
                ? "record_product_depth_drafts"
                : step.phase === "launch_packet_review"
                  ? "record_launch_packets"
                  : step.phase === "autonomy_run_queue"
                    ? "record_autonomy_run_queue"
                    : step.phase === "work_lease_claims"
                      ? "record_work_leases"
                      : step.phase === "weak_lane_rotation"
                        ? "manual_review"
                        : "run_money_army_step",
    blockers: step.phase === "store_batch_creation"
      ? ["Batch creation is held until the supervisor is run in include-batch-creation mode."]
      : step.blockers,
    confirmation: step.confirmation,
    endpoint: step.endpoint,
    expectedInternalEffect: step.expectedInternalEffect,
    externalExecution: false,
    maxItems: step.maxItems,
    phase: step.phase,
    priority: step.priority,
    providerContacted: false,
    reason: step.reason,
    requiresOwnerApproval: step.approvalRequired,
    sourceStatus: step.status,
    status: step.phase === "safety_gate_snapshot" || step.phase === "application_connection_packets" || step.phase === "connector_activation_matrix" || step.phase === "monitoring_cycle" || step.phase === "product_depth_repair" || step.phase === "launch_packet_review" || step.phase === "autonomy_run_queue" || step.phase === "work_lease_claims"
      ? "selected"
      : step.phase === "weak_lane_rotation"
        ? "manual_only"
        : step.status === "blocked"
          ? "blocked"
          : step.status === "waiting"
            ? "waiting"
            : "approval_required",
    stepId: step.stepId,
    title: step.title
  })),
  summary: "4/11 daily supervisor steps selected in safe internal only mode for up to 4 private internal actions. External execution remains locked.",
  totals: {
    approvalRequired: 2,
    blocked: 0,
    manualOnly: 1,
    maxSteps: 4,
    selected: 4,
    storesCovered: 1,
    waiting: 0
  }
};
hundredStoreDailySupervisorPlan.selectedSteps = hundredStoreDailySupervisorPlan.steps.filter((step) => step.status === "selected").slice(0, 4);

const hundredStoreOperationsResponse: RevenueHundredStoreOperationsResponse = {
  dailySupervisor: hundredStoreDailySupervisorPlan,
  fleet: businessFleetPlan,
  gapPlan: businessFleetGapPlan,
  pipeline: moneyArmyPipelinePlan,
  plan: hundredStoreOperationsPlan
};

const hundredStoreOperationsCommandPlan: RevenueHundredStoreOperationsApplyResponse["beforeCommandPlan"] = {
  auditEvents: [
    "100 Store Operations Command Queue converted readiness next-actions into bounded internal commands."
  ],
  blockedExternalActions: hundredStoreOperationsPlan.blockedExternalActions,
  commands: [{
    action: "run_money_army_batch_creation",
    commandId: "batch_creation",
    confirmation: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
    endpoint: "/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply",
    expectedInternalEffect: "Create the next 25 private store shells with internal product drafts.",
    externalExecution: false,
    maxItems: 25,
    priority: 1,
    providerContacted: false,
    reason: "99 stores remain before the 100-store operating floor; safe batch size is 25.",
    requiresManualSelection: false,
    sourceActionTitle: "Create the next 100-store batch",
    stage: "batch_creation",
    status: "ready"
  }],
  externalExecution: false,
  generatedAt: "2026-06-02T12:25:00.000Z",
  mode: "100 Store Operations Command Queue",
  providerContacted: false,
  selectedCommand: null,
  summary: "Create the next 100-store batch is selected as the next bounded 100-store command for up to 25 items. External execution remains locked.",
  totals: {
    blocked: 0,
    commands: 1,
    executable: 1,
    manualReview: 0,
    ready: 1,
    waiting: 0
  }
};
hundredStoreOperationsCommandPlan.selectedCommand = hundredStoreOperationsCommandPlan.commands[0]!;

const hundredStoreOperationsAfterPlan: RevenueHundredStoreOperationsPlan = {
  ...hundredStoreOperationsPlan,
  batchPlan: {
    ...hundredStoreOperationsPlan.batchPlan,
    batchRunsRequired: 3,
    currentStores: 26,
    storeGap: 74
  },
  summary: "84/100 readiness for 100-store internal operations. 26/100 stores tracked, 74 store gap, 1 ready-parallel lane, 0 scale lanes, 0 repair lanes, and 3 Money Army stages ready. External execution remains locked.",
  totals: {
    ...hundredStoreOperationsPlan.totals,
    currentStores: 26,
    storeGap: 74
  }
};

const hundredStoreOperationsApplyResponse: RevenueHundredStoreOperationsApplyResponse = {
  after: {
    ...hundredStoreOperationsResponse,
    plan: hundredStoreOperationsAfterPlan
  },
  afterCommandPlan: hundredStoreOperationsCommandPlan,
  applied: {
    auditLogId: null,
    batchRunIds: [],
    cyclesRequested: 1,
    cyclesRun: 1,
    dryRun: true,
    externalExecution: false,
    providerContacted: false,
    selectedCommandId: "batch_creation",
    selectedStage: "batch_creation",
    summary: "100-store operations preview selected Create the next 100-store batch for up to 25 internal items."
  },
  before: hundredStoreOperationsResponse,
  beforeCommandPlan: hundredStoreOperationsCommandPlan,
  cycles: [{
    afterReadinessScore: 84,
    afterStoreGap: 74,
    batchRunId: null,
    beforeReadinessScore: 82,
    beforeStoreGap: 99,
    command: hundredStoreOperationsCommandPlan.commands[0]!,
    cycle: 1,
    resultSummary: "Money Army batch creation preview completed.",
    stage: "batch_creation"
  }],
  recentRuns: []
};

const hundredStoreAppConnectionPacketsResponse: RevenueHundredStoreAppConnectionPacketsApplyResponse = {
  applied: {
    auditLogId: null,
    dryRun: true,
    externalExecution: false,
    packetsRecorded: 0,
    packetsSelected: 2,
    providerContacted: false,
    roleCounts: {
      content: 1,
      manual_import: 1
    },
    storesCovered: 1,
    summary: "2 application connection packets would be recorded as internal 100-store app readiness artifacts."
  },
  packets: hundredStoreOperationsPlan.applicationConnectionWorkbench.packets.filter((packet) => packet.setupStatus === "ready_for_internal_packet"),
  plan: hundredStoreOperationsPlan
};

const hundredStoreConnectorActivationResponse: RevenueHundredStoreConnectorActivationApplyResponse = {
  applied: {
    auditLogId: null,
    credentialEnvVarRefs: 7,
    dryRun: true,
    dryRunRequestMaps: 25,
    externalExecution: false,
    providerContacted: false,
    roleCounts: {
      manual_import: 1,
      storefront: 1
    },
    rowsRecorded: 0,
    rowsSelected: 25,
    statusCounts: {
      credential_custody_required: 3,
      ready_for_connection_design: 1
    },
    storesCovered: 1,
    summary: "25 connector activation rows would be recorded with credential custody and external writes locked.",
    writeScopesBlocked: 25
  },
  plan: hundredStoreOperationsPlan,
  rows: hundredStoreOperationsPlan.connectorActivationMatrix.rows
};

const hundredStoreMonitoringCycleResponse: RevenueHundredStoreMonitoringCycleApplyResponse = {
  applied: {
    auditLogId: null,
    dryRun: true,
    externalExecution: false,
    itemsRecorded: 0,
    itemsSelected: 1,
    providerContacted: false,
    queueCounts: {
      readOnlyImports: 1
    },
    requiredSignals: 10,
    signalStatusCounts: {
      needs_readonly_import: 1
    },
    storesCovered: 1,
    summary: "1 monitoring item would be recorded for the 100-store monitoring cycle."
  },
  items: hundredStoreOperationsPlan.monitoringMatrix.items,
  plan: hundredStoreOperationsPlan
};

const hundredStoreProductDepthResponse: RevenueHundredStoreProductDepthApplyResponse = {
  applied: {
    auditLogId: null,
    currentStoreDrafts: 0,
    draftsRecorded: 0,
    draftsSelected: 25,
    dryRun: true,
    externalExecution: false,
    futureStoreDrafts: 25,
    providerContacted: false,
    statusCounts: {
      waiting_for_store_shell: 25
    },
    storesCovered: 0,
    summary: "25 product-depth draft packets would be recorded for the 100-store queue."
  },
  drafts: hundredStoreOperationsPlan.productDepthQueue.drafts,
  plan: hundredStoreOperationsPlan
};

const hundredStoreLaunchPacketsResponse: RevenueHundredStoreLaunchPacketsApplyResponse = {
  applied: {
    auditLogId: null,
    currentStorePackets: 1,
    dryRun: true,
    externalExecution: false,
    futureStorePackets: 24,
    packetsRecorded: 0,
    packetsSelected: 25,
    providerContacted: false,
    statusCounts: {
      ready_for_internal_launch_review: 1,
      waiting_for_store_shell: 24
    },
    storesCovered: 1,
    summary: "25 launch packets would be recorded for 100-store internal launch review."
  },
  packets: hundredStoreOperationsPlan.launchPacketQueue.packets,
  plan: hundredStoreOperationsPlan
};

const hundredStoreAutonomyRunResponse: RevenueHundredStoreAutonomyRunApplyResponse = {
  applied: {
    approvalRequired: 2,
    auditLogId: null,
    dryRun: true,
    externalExecution: false,
    jobsRecorded: 0,
    jobsSelected: 25,
    providerContacted: false,
    readyInternal: 23,
    statusCounts: {
      approval_required: 2,
      ready_internal: 23
    },
    storesCovered: 24,
    summary: "25 autonomy jobs would be recorded for the 100-store chain of command.",
    typeCounts: {
      prepare_store_shell: 23,
      record_launch_packet: 2
    }
  },
  jobs: hundredStoreOperationsPlan.autonomyRunQueue.jobs,
  plan: hundredStoreOperationsPlan
};

const hundredStoreWorkLeasesResponse: RevenueHundredStoreWorkLeasesApplyResponse = {
  applied: {
    approvalHold: 2,
    auditLogId: null,
    dedupeKeys: 25,
    dryRun: true,
    externalExecution: false,
    leasesRecorded: 0,
    leasesSelected: 25,
    providerContacted: false,
    readyToClaim: 23,
    statusCounts: {
      approval_hold: 2,
      ready_to_claim: 23
    },
    storesCovered: 24,
    summary: "25 internal work leases would be recorded for clean 100-store work claiming.",
    typeCounts: {
      prepare_store_shell: 23,
      record_launch_packet: 2
    }
  },
  leases: hundredStoreOperationsPlan.workLeasePlan.leases,
  plan: hundredStoreOperationsPlan
};

const hundredStoreDailySupervisorPreviewResponse: RevenueHundredStoreDailySupervisorApplyResponse = {
  after: hundredStoreOperationsResponse,
  afterSupervisor: hundredStoreDailySupervisorPlan,
  applied: {
    appPacketsRecorded: 0,
    auditLogId: null,
    autonomyJobsRecorded: 0,
    connectorRowsRecorded: 0,
    dryRun: true,
    externalExecution: false,
    launchPacketsRecorded: 0,
    monitoringItemsRecorded: 0,
    operationCyclesRun: 0,
    productDraftsRecorded: 0,
    providerContacted: false,
    stepsRecorded: 0,
    stepsSelected: 4,
    summary: "100-store daily supervisor preview selected 4 private internal steps.",
    workLeasesRecorded: 0
  },
  before: hundredStoreOperationsResponse,
  beforeSupervisor: hundredStoreDailySupervisorPlan,
  results: [{
    action: "confirm_safety",
    auditLogId: null,
    dryRun: true,
    externalExecution: false,
    providerContacted: false,
    stepId: "daily_safety_gate_snapshot",
    summary: "Supervisor would confirm the 100-store safety envelope before internal work.",
    title: "Confirm private safety envelope"
  }, {
    action: "record_app_connection_packets",
    auditLogId: null,
    dryRun: true,
    externalExecution: false,
    packetsRecorded: 0,
    packetsSelected: 2,
    providerContacted: false,
    stepId: "daily_application_connection_packets",
    summary: "2 application connection packets would be recorded as internal 100-store app readiness artifacts.",
    title: "Record app connection packets"
  }, {
    action: "record_connector_activation_matrix",
    auditLogId: null,
    connectorRowsRecorded: 0,
    connectorRowsSelected: 25,
    dryRun: true,
    externalExecution: false,
    providerContacted: false,
    stepId: "daily_connector_activation_matrix",
    summary: "25 connector activation rows would be recorded with credential custody and external writes locked.",
    title: "Record connector activation matrix"
  }, {
    action: "record_monitoring_cycle",
    auditLogId: null,
    dryRun: true,
    externalExecution: false,
    itemsRecorded: 0,
    itemsSelected: 1,
    providerContacted: false,
    stepId: "daily_monitoring_cycle",
    summary: "1 monitoring item would be recorded for the 100-store monitoring cycle.",
    title: "Run monitoring cycle"
  }, {
    action: "record_product_depth_drafts",
    auditLogId: null,
    dryRun: true,
    externalExecution: false,
    productDraftsRecorded: 0,
    productDraftsSelected: 25,
    providerContacted: false,
    stepId: "daily_product_depth_repair",
    summary: "25 product-depth draft packets would be recorded for the 100-store queue.",
    title: "Fill product depth"
  }]
};

const moneyArmyBatchRun: RevenueMoneyArmyBatchRun = {
  afterTotals: {
    ...moneyArmyPipelinePlan.totals,
    currentBusinesses: 10,
    launchWaveGap: 0,
    readyStages: 2,
    selectedSourceKeys: 9
  },
  auditLogId: "audit-money-army-1",
  batchKey: "money-army-batch-key-1",
  beforeTotals: moneyArmyPipelinePlan.totals,
  createdAt: "2026-06-02T12:10:00.000Z",
  dryRun: false,
  externalExecution: false,
  id: "money-army-run-1",
  providerContacted: false,
  resultSummary: "Money Army batch creation recorded internally.",
  sourceKeys: businessFleetGapPlan.opportunitySeeds.slice(0, 2).map((seed) => seed.sourceKey),
  stage: "batch_creation",
  status: "recorded"
};

const moneyArmyGenerateScoreBatchPlan: RevenueMoneyArmyGenerateScoreBatchPlan = {
  auditEvents: [
    "Money Army Generate & Score Batch created internal-only candidate drafts from existing store and product records.",
    "Every generated candidate was scored by the Revenue Engine and reduced to scale, watch, pause, or kill."
  ],
  blockedExternalActions: [
    "Creating live marketplace listings",
    "Posting faceless content externally",
    "Starting, increasing, or moving ad spend"
  ],
  candidates: [
    {
      assetScore: {
        economicsScore: 40,
        finalRank: 76,
        readinessScore: 30,
        riskPenalty: 0,
        velocity: 0
      },
      auditOnly: true,
      candidateId: "money_army_candidate_store_1_001",
      complianceNotes: "Original internal merch draft. Verify trademarks before publishing.",
      confidence: 84,
      designConcept: "Original operator tee concept.",
      designPrompt: "Create original operator-style gym typography with no protected marks.",
      designTheme: "Original operator series",
      externalExecution: false,
      listingDescription: "Original product listing for internal review.",
      listingTitle: "Iron House Operator Tee",
      nextInternalState: null,
      organicContentTieIn: {
        approvalState: "internal_draft_only",
        channel: "youtube_shorts",
        hook: "Show the Iron House Operator Tee idea through a short organic story.",
        path: "organic_first"
      },
      productName: "Iron House Operator Tee Candidate 1",
      productType: "T-shirt",
      profitMargin: 42,
      providerContacted: false,
      recommendation: "watch",
      retailPrice: 38,
      riskLevel: "low",
      rotationDecision: "watch",
      rotationReason: "Product is in the normal approval or design pipeline and should be watched until the next decision point.",
      score: 76,
      scoreBand: "healthy",
      sourceProductId: "product-1",
      sourceProductName: "Core Tee",
      sourceStoreId: "store-1",
      sourceStoreName: "Iron House Gym",
      status: "Awaiting Approval",
      tags: ["fitness", "money army candidate"]
    }
  ],
  currentPortfolio: {
    generatedAt: "2026-06-02T12:00:00.000Z",
    rotationRecommendations: portfolioFromPlan(revenuePlan).assets.map((asset) => ({
      assetId: asset.assetId,
      assetName: asset.assetName,
      assetType: asset.assetType,
      currentState: String(asset.readiness.status),
      externalExecution: false,
      nextInternalState: asset.nextInternalState,
      providerContacted: false,
      reason: asset.reason,
      recommendation: asset.recommendation,
      riskLevel: asset.riskLevel,
      score: asset.score,
      scoreBand: asset.scoreBand,
      storeId: asset.storeId,
      storeName: asset.storeName
    })),
    summary: portfolioFromPlan(revenuePlan).summary,
    totals: portfolioFromPlan(revenuePlan).totals
  },
  externalExecution: false,
  generatedAt: "2026-06-02T12:30:00.000Z",
  killPressure: {
    assets: [],
    level: "none",
    pressureScore: 0,
    reason: "No generated candidates require kill or pause pressure."
  },
  mode: "Money Army Generate & Score Batch",
  providerContacted: false,
  firstBusinessLaunchPackage: {
    approvalChecklist: [{
      category: "store",
      externalExecutionLocked: true,
      required: true,
      title: "Approve selected store, platform fit, audience, brand positioning, and launch status."
    }, {
      category: "products",
      externalExecutionLocked: true,
      required: true,
      title: "Approve top product concepts, pricing, margin, source lanes, tags, and listing copy."
    }, {
      category: "designs",
      externalExecutionLocked: true,
      required: true,
      title: "Approve each internal design draft, AI-ready prompt, negative prompt, mockup direction, and compliance note before artwork generation."
    }, {
      category: "content",
      externalExecutionLocked: true,
      required: true,
      title: "Approve faceless content hooks, scripts, channel fit, captions, disclosure, and posting order."
    }],
    auditEvents: [
      "First Business Launch Package generated from top scored Money Army candidates.",
      "No provider, marketplace, ad, social, banking, upload, browser, or payment write action was executed."
    ],
    blockedExternalActions: [
      "Publishing marketplace listings or changing storefront settings",
      "Creating provider-side products, uploading artwork, or contacting POD providers"
    ],
    contentIdeas: [{
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Faceless content idea is an internal draft. Script, caption, disclosure, and channel package require approval before posting.",
        status: "Required"
      },
      candidateId: "money_army_candidate_store_1_001",
      channel: "youtube_shorts",
      externalExecution: false,
      hook: "Show the Iron House Operator Tee idea through a short organic story.",
      id: "first_business_content_money_army_candidate_store_1_001_1",
      productName: "Iron House Operator Tee Candidate 1",
      providerContacted: false,
      scriptAngle: "Show the product problem, the visual idea, and a simple store CTA for Iron House Gym; keep it original and no-spend.",
      status: "internal_draft_only"
    }],
    externalExecution: false,
    generatedAt: "2026-06-02T12:30:00.000Z",
    killPressure: {
      assets: [],
      level: "none",
      pressureScore: 0,
      reason: "No generated candidates require kill or pause pressure."
    },
    manualApprovalGates: [
      "Approve store, product candidates, pricing notes, listing copy, tags, and compliance notes before provider or marketplace work.",
      "Approve faceless content scripts, captions, disclosure, and channel packages before any posting.",
      "Approve any Ad/Growth spend separately in Financial Orchestrator. This launch package starts organic-first and no-spend."
    ],
    mode: "First Business Launch Package",
    organicFirstMoves: [{
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Organic move is queued as internal preparation only. Manual approval is required before publication, upload, spend, or provider work.",
        status: "Required"
      },
      channel: "listing",
      expectedInternalEffect: "Prepare listing title, description, tags, pricing notes, and proof checklist for Iron House Operator Tee Candidate 1.",
      externalExecution: false,
      id: "organic_iron_house_gym_listing",
      providerContacted: false,
      title: "Prepare approval-ready listing proof"
    }],
    packageId: "first_business_launch_package_store_1_2026_06_02t12_30_00_000z",
    products: [{
      approvalState: "ready_to_approve",
      candidateId: "money_army_candidate_store_1_001",
      complianceNotes: "Original internal merch draft. Verify trademarks before publishing.",
      designConcept: "Original operator tee concept.",
      designPrompt: "Create original operator-style gym typography with no protected marks.",
      designTheme: "Original operator series",
      internalDesignDraft: {
        aiProviderUsed: false,
        approvalGate: {
          externalExecutionLocked: true,
          humanApprovalRequired: true,
          reason: "Design draft is an internal AI-ready prompt and production brief only. Explicit approval is required before any AI image provider, designer, POD provider, upload, or marketplace action.",
          status: "Required"
        },
        assetChecklist: [
          "Verify all words, symbols, and visual references are original or owned by the store.",
          "Confirm production-safe placement, readable contrast, and product-type fit."
        ],
        externalGeneration: false,
        mockupDirection: "Prepare front-facing T-shirt mockup notes for Iron House Gym; keep artwork centered, readable, and brand-consistent.",
        negativePrompt: "No protected logos, celebrity likenesses, copyrighted characters, trademarked slogans, copied artwork, misleading claims, or marketplace policy risks.",
        palette: ["store brand primary", "high-contrast neutral", "single accent color"],
        placement: "front chest center",
        prompt: "Create original operator-style gym typography with no protected marks. Create an original T-shirt design for Iron House Gym.",
        providerContacted: false,
        typography: "Original operator series"
      },
      listingDescription: "Original product listing for internal review.",
      listingTitle: "Iron House Operator Tee",
      productName: "Iron House Operator Tee Candidate 1",
      productType: "T-shirt",
      profitMargin: 42,
      recommendation: "watch",
      retailPrice: 38,
      rotationReason: "Product is in the normal approval or design pipeline and should be watched until the next decision point.",
      score: 76,
      scoreBand: "healthy",
      sourceProductId: "product-1",
      sourceProductName: "Core Tee",
      tags: ["fitness", "money army candidate"]
    }],
    providerContacted: false,
    scalePressure: {
      assets: [{
        assetId: "money_army_candidate_store_1_001",
        assetName: "Iron House Operator Tee Candidate 1",
        recommendation: "watch",
        score: 76,
        storeId: "store-1",
        storeName: "Iron House Gym"
      }],
      level: "medium",
      pressureScore: 49,
      reason: "1 generated candidate shows internal scale pressure before any external spend is allowed."
    },
    status: "ready_for_approval",
    store: {
      audience: "independent gym members",
      businessName: "Iron House Gym",
      industry: "fitness",
      launchStatus: "Awaiting Approval",
      sourceStoreId: "store-1",
      storePlatform: "Shopify"
    },
    summary: "Iron House Gym launch package is ready for approval with 1 product concept, 1 internal AI-ready design draft, 1 faceless content idea, and 1 organic-first move. Scale pressure medium 49/100; kill pressure none 0/100.",
    totals: {
      contentIdeas: 1,
      manualApprovalGates: 3,
      organicMoves: 1,
      products: 1,
      readyToApproveProducts: 1,
      scaleCandidates: 0,
      watchCandidates: 1
    }
  },
  rotationRecommendations: [{
    assetId: "money_army_candidate_store_1_001",
    assetName: "Iron House Operator Tee Candidate 1",
    assetType: "product",
    currentState: "Awaiting Approval",
    externalExecution: false,
    nextInternalState: null,
    providerContacted: false,
    reason: "Product is in the normal approval or design pipeline and should be watched until the next decision point.",
    recommendation: "watch",
    riskLevel: "low",
    score: 76,
    scoreBand: "healthy",
    storeId: "store-1",
    storeName: "Iron House Gym"
  }],
  rotationSummary: {
    kill: 0,
    pause: 0,
    scale: 0,
    watch: 1
  },
  scalePressure: {
    assets: [{
      assetId: "money_army_candidate_store_1_001",
      assetName: "Iron House Operator Tee Candidate 1",
      recommendation: "watch",
      score: 76,
      storeId: "store-1",
      storeName: "Iron House Gym"
    }],
    level: "medium",
    pressureScore: 49,
    reason: "1 generated candidate shows internal scale pressure before any external spend is allowed."
  },
  summary: "1 Money Army candidate generated and scored from 1 source store: 0 scale, 1 watch, 0 pause, 0 kill. External execution remains locked.",
  totals: {
    generated: 1,
    kill: 0,
    pause: 0,
    requested: 25,
    scale: 0,
    sourceProducts: 1,
    sourceStores: 1,
    watch: 1
  }
};

const moneyArmyGenerateScoreBatchRun: RevenueMoneyArmyBatchRun = {
  afterTotals: {
    ...moneyArmyPipelinePlan.totals,
    readyStages: 1,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 25,
    targetLaunchWave: 25
  },
  auditLogId: "audit-money-army-score-1",
  batchKey: "money-army-score-batch-key-1",
  beforeTotals: {
    ...moneyArmyPipelinePlan.totals,
    readyStages: 0,
    seedCandidates: 0,
    stages: 1,
    targetBusinesses: 25,
    targetLaunchWave: 25
  },
  createdAt: "2026-06-02T12:30:00.000Z",
  dryRun: false,
  externalExecution: false,
  id: "money-army-score-run-1",
  providerContacted: false,
  resultSummary: "Money Army generate-score batch recorded internally for 1 candidate.",
  sourceKeys: ["store-1"],
  stage: "generate_score_batch",
  status: "recorded"
};

const moneyArmyGenerateScoreBatchApplyResponse: RevenueMoneyArmyGenerateScoreBatchApplyResponse = {
  applied: {
    auditLogId: "audit-money-army-score-1",
    batchRunId: moneyArmyGenerateScoreBatchRun.id,
    dryRun: false,
    externalExecution: false,
    providerContacted: false,
    stage: "generate_score_batch",
    summary: "Money Army generate-score batch recorded internally for 1 candidate."
  },
  batchRun: moneyArmyGenerateScoreBatchRun,
  plan: moneyArmyGenerateScoreBatchPlan
};

const firstBusinessPackageRun: RevenueMoneyArmyBatchRun = {
  afterTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 10,
    readyDeploymentBusinesses: 1,
    readyStages: 1,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  auditLogId: "audit-first-package-1",
  batchKey: "first-business-package-key-1",
  beforeTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  createdAt: "2026-06-02T12:45:00.000Z",
  dryRun: false,
  externalExecution: false,
  id: "first-business-package-run-1",
  providerContacted: false,
  resultSummary: "First Business Launch Package recorded internally for Iron House Gym.",
  sourceKeys: ["store-1"],
  stage: "first_business_launch_package",
  status: "recorded"
};

const firstBusinessPackageResponse: RevenueMoneyArmyFirstBusinessLaunchPackageResponse = {
  package: moneyArmyGenerateScoreBatchPlan.firstBusinessLaunchPackage,
  recentRuns: [],
  sourceBatch: moneyArmyGenerateScoreBatchPlan
};

const firstBusinessPackageApplyResponse: RevenueMoneyArmyFirstBusinessLaunchPackageApplyResponse = {
  applied: {
    auditLogId: "audit-first-package-1",
    batchRunId: firstBusinessPackageRun.id,
    dryRun: false,
    externalExecution: false,
    providerContacted: false,
    stage: "first_business_launch_package",
    summary: "First Business Launch Package recorded internally for Iron House Gym."
  },
  batchRun: firstBusinessPackageRun,
  package: moneyArmyGenerateScoreBatchPlan.firstBusinessLaunchPackage,
  sourceBatch: moneyArmyGenerateScoreBatchPlan
};

const firstBusinessPackagePlan = moneyArmyGenerateScoreBatchPlan.firstBusinessLaunchPackage!;

const firstStorePreparationPlan: RevenueFirstStorePreparationPlan = {
  approval: {
    approvedAt: "2026-06-02T12:50:00.000Z",
    approvedBy: "operator",
    auditOnly: true,
    externalExecution: false,
    note: "Approved and prepared from First Business Package dashboard controls.",
    packageId: firstBusinessPackagePlan.packageId,
    providerContacted: false,
    status: "approved_internal"
  },
  auditEvents: [
    "First Business Launch Package approved internally by operator action.",
    "Prepare First Store packet assembled from the approved package.",
    "No provider, marketplace, browser, ad, social, upload, banking, payment, or external AI action was executed."
  ],
  blockedExternalActions: [
    "Creating, changing, or publishing marketplace/storefront records",
    "Creating provider-side products, contacting POD providers, or uploading artwork",
    "Generating live AI artwork through an external provider",
    "Posting, scheduling, or uploading faceless content",
    "Starting, increasing, moving, or reallocating ad spend"
  ],
  contentPlan: firstBusinessPackagePlan.contentIdeas.map((idea) => ({
    ...idea,
    executionState: "approved_internal_ready"
  })),
  externalExecution: false,
  generatedAt: "2026-06-02T12:50:00.000Z",
  guardrails: [
    "Approval only marks the package internally approved; it does not authorize live execution.",
    "Prepared store, product, design, content, and traffic records are internal ready-to-execute instructions.",
    "A separate explicit live-execution approval is required before any external provider, marketplace, upload, browser, ad, bank, or payment action."
  ],
  mode: "Prepare First Store",
  organicTrafficPlan: firstBusinessPackagePlan.organicFirstMoves.map((move) => ({
    ...move,
    executionState: "approved_internal_ready"
  })),
  preparationId: "prepare_first_store_store_1_2026_06_02t12_50_00_000z",
  products: firstBusinessPackagePlan.products.map((product) => ({
    ...product,
    executionState: "approved_internal_ready"
  })),
  providerContacted: false,
  status: "ready_to_execute_internal",
  storeConfig: {
    audience: "independent gym members",
    businessName: "Iron House Gym",
    externalExecution: false,
    industry: "fitness",
    launchStatus: "Awaiting Approval",
    preparationChecklist: [
      "Create internal store config snapshot for Iron House Gym on Shopify.",
      "Map approved product concepts to internal product setup rows with price, margin, tags, listing title, listing copy, and compliance notes.",
      "Attach internal AI-ready design drafts and mockup directions; external artwork generation remains locked.",
      "Queue faceless content ideas as internal drafts only; posting and scheduling remain locked."
    ],
    providerContacted: false,
    sourceStoreId: "store-1",
    storePlatform: "Shopify"
  },
  summary: "Iron House Gym is approved internally and prepared with 1 product concept, 1 faceless content idea, and 1 organic-first move. External execution remains blocked until explicit live approval.",
  totals: {
    approvalChecklist: firstBusinessPackagePlan.approvalChecklist.length,
    blockedExternalActions: 5,
    contentIdeas: 1,
    organicMoves: 1,
    products: 1,
    readyInternalSteps: 6
  }
};

const firstStorePrepareRun: RevenueMoneyArmyBatchRun = {
  afterTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 6,
    readyDeploymentBusinesses: 1,
    readyStages: 1,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  auditLogId: "audit-first-store-prepare-1",
  batchKey: "first-store-prepare-key-1",
  beforeTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  createdAt: "2026-06-02T12:50:00.000Z",
  dryRun: false,
  externalExecution: false,
  id: "first-store-prepare-run-1",
  providerContacted: false,
  resultSummary: "Iron House Gym approved internally and prepared for first-store execution.",
  sourceKeys: ["store-1"],
  stage: "prepare_first_store",
  status: "approved_internal"
};

const firstStorePrepareApplyResponse: RevenueFirstStorePrepareApplyResponse = {
  approval: {
    approved: true,
    auditLogId: "audit-first-store-prepare-1",
    batchRunId: firstStorePrepareRun.id,
    dryRun: false,
    externalExecution: false,
    packageId: firstBusinessPackagePlan.packageId,
    preparationId: firstStorePreparationPlan.preparationId,
    providerContacted: false,
    stage: "prepare_first_store",
    status: "approved_internal",
    summary: "Iron House Gym approved internally and prepared for first-store execution."
  },
  batchRun: firstStorePrepareRun,
  package: firstBusinessPackagePlan,
  preparation: firstStorePreparationPlan,
  sourceBatch: moneyArmyGenerateScoreBatchPlan
};

const firstLaunchProducts = Array.from({ length: 3 }, (_, index) => ({
  ...firstStorePreparationPlan.products[0],
  candidateId: `money_army_candidate_store_1_00${index + 1}`,
  executionLocked: true as const,
  launchState: "queued_internal_product_setup" as const,
  listingTitle: `Iron House Operator Tee ${index + 1}`,
  productName: `Iron House Operator Tee Candidate ${index + 1}`,
  sequence: index + 1,
  sourceProductId: `product-${index + 1}`
}));

const firstLaunchContentDrafts = Array.from({ length: 3 }, (_, index) => ({
  ...firstStorePreparationPlan.contentPlan[0],
  candidateId: `money_army_candidate_store_1_00${index + 1}`,
  executionLocked: true as const,
  id: `first_business_content_money_army_candidate_store_1_00${index + 1}_${index + 1}`,
  launchState: "queued_internal_content_draft" as const,
  productName: `Iron House Operator Tee Candidate ${index + 1}`,
  sequence: index + 1
}));

const firstLaunchOrganicMoves = [
  ...firstStorePreparationPlan.organicTrafficPlan,
  {
    ...firstStorePreparationPlan.organicTrafficPlan[0],
    channel: "youtube_shorts" as const,
    id: "organic_iron_house_gym_youtube_shorts",
    title: "Prepare youtube shorts product story"
  },
  {
    ...firstStorePreparationPlan.organicTrafficPlan[0],
    channel: "storefront_seo" as const,
    id: "organic_iron_house_gym_storefront_seo",
    title: "Prepare storefront SEO map"
  }
].map((move, index) => ({
  ...move,
  executionLocked: true as const,
  launchState: "queued_internal_organic_move" as const,
  sequence: index + 1
}));

const firstLaunchStoreSetup = {
  ...firstStorePreparationPlan.storeConfig,
  launchState: "queued_internal_store_setup" as const,
  setupQueue: [
    "Lock internal launch lane for Iron House Gym.",
    "Prepare Shopify store settings checklist: brand name, audience, navigation, collection plan, policies, SEO title, and manual proof fields.",
    "Prepare internal storefront content rows only; live storefront writes remain blocked."
  ]
};

const firstBusinessInternalLaunchPlan: RevenueFirstBusinessInternalLaunchPlan = {
  auditEvents: [
    "Launch First Business internal packet assembled from the approved Prepare First Store packet.",
    "Store setup, product setup, faceless content, organic moves, and evidence fields were queued internally.",
    "No live provider, marketplace, upload, browser, ad, social, banking, payment, payout, or external AI action was executed."
  ],
  blockedExternalActions: [
    "Publishing a live store, listing, product, collection, SEO page, or marketplace record",
    "Uploading files, mockups, artwork, videos, captions, scripts, or thumbnails to any provider or platform",
    "Calling POD, marketplace, social, email, ad, browser, banking, payment, or external AI providers",
    "Starting paid campaigns, moving Ad/Growth budget, charging cards, transferring money, or changing payout settings",
    "Using browser automation, account warmup, stealth, proxies, CAPTCHA handling, or platform-evasion workflows"
  ],
  contentDraftQueue: firstLaunchContentDrafts,
  evidenceLedgerFields: [
    "manualVisits",
    "manualUnitsSold",
    "manualGrossRevenue",
    "manualNetProfit",
    "manualContentViews",
    "manualSavesOrShares"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T13:00:00.000Z",
  guardrails: [
    "Launch First Business creates an internal ready-to-execute launch packet only.",
    "All store setup, product setup, content, traffic, and evidence steps are private internal instructions until explicit live execution approval is granted.",
    "Separate live approval is required before any provider, marketplace, browser, upload, external AI, ad, social, email, banking, payout, payment, or platform action."
  ],
  launchApproval: {
    approvedAt: "2026-06-02T13:00:00.000Z",
    approvedBy: "operator",
    auditOnly: true,
    externalExecution: false,
    note: "Approved for Launch and final internal execution packet created from dashboard controls.",
    packageId: firstBusinessPackagePlan.packageId,
    preparationId: firstStorePreparationPlan.preparationId,
    providerContacted: false,
    status: "approved_for_launch_internal"
  },
  launchId: "launch_first_business_store_1_2026_06_02t13_00_00_000z",
  launchSequence: [
    {
      externalExecution: false,
      id: "launch_store_1_store_setup",
      order: 1,
      providerContacted: false,
      state: "ready_internal",
      title: "Prepare internal store setup packet"
    },
    {
      externalExecution: false,
      id: "launch_store_1_product_queue",
      order: 2,
      providerContacted: false,
      state: "ready_internal",
      title: "Queue first product setup packets"
    }
  ],
  mode: "Launch First Business",
  organicMoveQueue: firstLaunchOrganicMoves,
  productSetupQueue: firstLaunchProducts,
  providerContacted: false,
  status: "approved_for_launch_internal",
  finalExecutionPacket: {
    approvalState: "approved_for_launch_internal",
    blockedExternalActions: [
      "Publishing a live store, listing, product, collection, SEO page, or marketplace record",
      "Uploading files, mockups, artwork, videos, captions, scripts, or thumbnails to any provider or platform",
      "Calling POD, marketplace, social, email, ad, browser, banking, payment, or external AI providers"
    ],
    evidenceLedgerFields: [
      "manualVisits",
      "manualUnitsSold",
      "manualGrossRevenue",
      "manualNetProfit",
      "manualContentViews",
      "manualSavesOrShares"
    ],
    executionChecklist: [
      "Review final internal store setup packet.",
      "Review 3-5 selected product setup packets.",
      "Review linked faceless content drafts.",
      "Review organic-first traffic move queue."
    ],
    externalExecution: false,
    facelessContentIdeas: firstLaunchContentDrafts,
    organicMoves: firstLaunchOrganicMoves,
    products: firstLaunchProducts,
    providerContacted: false,
    store: firstLaunchStoreSetup
  },
  storeSetup: firstLaunchStoreSetup,
  summary: "Iron House Gym is approved for launch internally with 3 selected product setup packets, 3 linked faceless content drafts, 3 organic-first moves, and 2 internal launch steps. External execution remains locked until explicit live approval.",
  totals: {
    blockedExternalActions: 5,
    contentDrafts: 3,
    evidenceFields: 6,
    launchSequenceSteps: 2,
    organicMoves: 3,
    products: 3,
    readyExecutionItems: 17,
    storeSetupSteps: 3
  }
};

const firstBusinessInternalLaunchRun: RevenueMoneyArmyBatchRun = {
  afterTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 13,
    readyDeploymentBusinesses: 1,
    readyStages: 1,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  auditLogId: "audit-first-business-launch-1",
  batchKey: "first-business-launch-key-1",
  beforeTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  createdAt: "2026-06-02T13:00:00.000Z",
  dryRun: false,
  externalExecution: false,
  id: "first-business-launch-run-1",
  providerContacted: false,
  resultSummary: "Iron House Gym is approved for launch internally. External execution remains locked.",
  sourceKeys: ["store-1"],
  stage: "launch_first_business",
  status: "approved_for_launch_internal"
};

const firstBusinessInternalLaunchApplyResponse: RevenueFirstBusinessInternalLaunchApplyResponse = {
  batchRun: firstBusinessInternalLaunchRun,
  launch: firstBusinessInternalLaunchPlan,
  launched: {
    auditLogId: "audit-first-business-launch-1",
    batchRunId: firstBusinessInternalLaunchRun.id,
    dryRun: false,
    externalExecution: false,
    launched: true,
    launchId: firstBusinessInternalLaunchPlan.launchId,
    packageId: firstBusinessPackagePlan.packageId,
    preparationId: firstStorePreparationPlan.preparationId,
    providerContacted: false,
    stage: "launch_first_business",
    status: "approved_for_launch_internal",
    summary: "Iron House Gym is approved for launch internally. External execution remains locked."
  },
  package: firstBusinessPackagePlan,
  preparation: firstStorePreparationPlan,
  sourceBatch: moneyArmyGenerateScoreBatchPlan
};

const firstBusinessListingProductPack = firstLaunchProducts.map((product) => ({
  approvalChecklist: [
    "Approve final listing title, description, and price.",
    "Approve design prompt, negative prompt, mockup direction, placement, palette, and typography.",
    "Confirm original-work and trademark review before any artwork generation or provider upload."
  ],
  candidateId: product.candidateId,
  designSpec: {
    externalGeneration: false as const,
    mockupDirection: product.internalDesignDraft.mockupDirection,
    negativePrompt: product.internalDesignDraft.negativePrompt,
    palette: product.internalDesignDraft.palette,
    placement: product.internalDesignDraft.placement,
    prompt: product.internalDesignDraft.prompt,
    providerContacted: false as const,
    typography: product.internalDesignDraft.typography
  },
  externalExecution: false as const,
  listingBullets: [
    `${product.productName} is prepared for independent gym members.`,
    `${product.designConcept} with bold typography.`,
    "Provider, upload, marketplace, and paid traffic actions remain locked."
  ],
  listingDescription: product.listingDescription,
  listingTitle: product.listingTitle,
  productName: product.productName,
  productType: product.productType,
  profitMargin: product.profitMargin,
  providerContacted: false as const,
  retailPrice: product.retailPrice,
  seoKeywords: ["fitness", "gym", "operator", "tee", "original merch", "organic launch"],
  status: "ready_internal" as const,
  storefrontCollection: "Iron House Gym First Drop",
  tags: product.tags
}));

const firstBusinessFirstWeekTrackingPlan: RevenueFirstBusinessExecutionPlan["firstWeekTrackingPlan"] = {
  checkIns: [{
    day: 0,
    requiredEvidence: ["storeUrl", "productUrls", "launchTimestamp", "operatorNotes"],
    title: "Launch day proof"
  }, {
    day: 1,
    requiredEvidence: ["manualVisits", "contentViews", "clicks", "unitsSold", "grossRevenue"],
    title: "First 24 hour signal check"
  }, {
    day: 3,
    requiredEvidence: ["trafficSources", "bestContentHook", "productPageNotes", "conversionNotes"],
    title: "First 72 hour optimization check"
  }, {
    day: 7,
    requiredEvidence: ["manualNetProfit", "topProduct", "weakestProduct", "rotationRecommendation"],
    title: "First week Revenue Engine review"
  }],
  externalExecution: false,
  metricFields: [
    { cadence: "twice_daily", id: "manualVisits", label: "Manual visits" },
    { cadence: "twice_daily", id: "manualUnitsSold", label: "Units sold" },
    { cadence: "daily", id: "manualGrossRevenue", label: "Gross revenue" },
    { cadence: "daily", id: "manualNetProfit", label: "Net profit" },
    { cadence: "daily", id: "manualContentViews", label: "Content views" },
    { cadence: "daily", id: "manualClicks", label: "Content or listing clicks" },
    { cadence: "daily", id: "manualConversionNotes", label: "Conversion notes" },
    { cadence: "end_of_week", id: "manualRotationRecommendation", label: "Scale/watch/pause/kill recommendation" }
  ],
  providerContacted: false,
  rotationReview: {
    day: 7,
    inputs: ["manualVisits", "manualUnitsSold", "manualGrossRevenue", "manualNetProfit", "manualContentViews", "manualConversionNotes", "manualRotationRecommendation"],
    output: "feed_revenue_engine_scale_watch_pause_kill"
  }
};

const firstBusinessExecutionPlan: RevenueFirstBusinessExecutionPlan = {
  auditEvents: [
    "Execute First Business packet prepared from the approved final execution packet.",
    "Manual and semi-automated launch preparation queues were assembled internally.",
    "No provider, marketplace, browser, upload, ad, social, banking, payment, payout, or external AI action was executed."
  ],
  blockedExternalActions: [
    "Publishing a live store, listing, product, collection, SEO page, or marketplace record",
    "Manual launch may proceed only after explicit live approval outside this internal packet",
    "Semi-automated preparation may generate internal rows only; no provider, browser, upload, marketplace, social, ad, bank, or payment action is allowed"
  ],
  executionApproval: {
    approvedAt: "2026-06-02T13:15:00.000Z",
    approvedBy: "operator",
    auditOnly: true,
    externalExecution: false,
    launchId: firstBusinessInternalLaunchPlan.launchId,
    note: "Execute First Business manual and semi-automated launch prep created from dashboard controls.",
    providerContacted: false,
    status: "ready_to_launch_first_business"
  },
  executionId: "execute_first_business_store_1_2026_06_02t13_15_00_000z",
  externalExecution: false,
  firstLaunchReadinessGate: {
    externalExecution: false,
    generatedAt: "2026-06-02T13:15:00.000Z",
    items: [{
      category: "store",
      detail: "Iron House Gym store setup packet has 3 internal setup steps.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "Store config ready"
    }, {
      category: "products",
      detail: "3 selected product setup packets are inside the final execution packet.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "3-5 products selected"
    }, {
      category: "listings",
      detail: "3 listing-ready product rows include title, description, bullets, SEO keywords, price, and margin.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "Listing pack complete"
    }, {
      category: "designs",
      detail: "Each product has an internal prompt, negative prompt, mockup direction, placement, palette, and typography spec.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "Design specs ready internally"
    }, {
      category: "content",
      detail: "3 faceless content drafts are linked to the first products.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "Faceless content hooks ready"
    }, {
      category: "traffic",
      detail: "3 organic-first moves are prepared. Paid spend stays locked.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "Organic traffic path ready"
    }, {
      category: "finance",
      detail: "Paid spend, provider charges, cards, banking, payout, and budget movement remain locked behind separate approval.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "Financial guardrail active"
    }, {
      category: "evidence",
      detail: "6 first-week evidence fields are ready for manual tracking.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "Evidence ledger ready"
    }, {
      category: "external_lock",
      detail: "Provider calls, browser work, uploads, ad spend, marketplace publishing, social posting, bank, and payment actions are still blocked.",
      externalExecution: false,
      providerContacted: false,
      required: true,
      status: "ready",
      title: "External action lock verified"
    }],
    label: "First Launch Readiness Gate",
    providerContacted: false,
    status: "ready_for_manual_launch_approval",
    summary: "Iron House Gym passes the First Launch Readiness Gate with 9/9 required checks ready. Live external action still requires explicit approval.",
    totals: {
      blocked: 0,
      ready: 9,
      required: 9
    }
  },
  finalExecutionPacket: firstBusinessInternalLaunchPlan.finalExecutionPacket,
  firstWeekTrackingPlan: firstBusinessFirstWeekTrackingPlan,
  generatedAt: "2026-06-02T13:15:00.000Z",
  guardrails: [
    "Execute First Business prepares manual and semi-automated launch work only.",
    "Manual launch work is ready for the operator, but live external execution remains blocked until explicit approval.",
    "Semi-automated preparation may assemble rows, checklists, and copy packets only; it may not call providers, upload files, run browsers, spend money, or publish content."
  ],
  launchHandoffPacket: {
    blockedExternalActions: firstBusinessInternalLaunchPlan.finalExecutionPacket.blockedExternalActions,
    contentCalendar: firstLaunchContentDrafts.map((draft, index) => ({
      captionDraft: `${draft.hook} ${draft.productName} is ready for the first organic launch wave. Link goes live only after approval.`,
      channel: draft.channel,
      contentIdeaId: draft.id,
      externalExecution: false,
      hook: draft.hook,
      providerContacted: false,
      scriptDraft: `${draft.hook} Show the problem, reveal the product angle, call out ${draft.productName}, and ask viewers to save or comment. ${draft.scriptAngle}`,
      sequence: index + 1,
      status: "ready_internal"
    })),
    explicitLiveApprovalRequired: true,
    externalExecution: false,
    handoffId: "handoff_execute_first_business_store_1_2026_06_02t13_15_00_000z",
    manualExecutionChecklist: [
      "Review and approve the First Launch Readiness Gate.",
      "Review store setup instructions, policies, navigation, collection naming, SEO title, and evidence fields.",
      "Review each listing-ready product row for title, description, bullets, SEO keywords, price, margin, tags, and design spec.",
      "Grant separate explicit live approval outside this packet before any external action."
    ],
    organicLaunchMoves: firstLaunchOrganicMoves.map((move) => ({
      ...move,
      manualExecutionNote: "Execute manually only after explicit live approval; no browser, upload, social, provider, or marketplace action is authorized by this packet.",
      status: "ready_internal"
    })),
    products: firstBusinessListingProductPack,
    providerContacted: false,
    status: "ready_for_operator_review",
    store: {
      ...firstBusinessInternalLaunchPlan.finalExecutionPacket.store,
      manualSetupInstructions: firstBusinessInternalLaunchPlan.finalExecutionPacket.store.setupQueue
    },
    summary: "Iron House Gym handoff packet is ready for operator review with 3 listing-ready products, 3 content drafts, and 3 organic moves. External execution remains locked."
  },
  listingProductPack: firstBusinessListingProductPack,
  manualLaunchRunbook: [{
    externalExecution: false,
    id: "execute_store_1_store",
    order: 1,
    packetSection: "store",
    providerContacted: false,
    status: "ready_manual",
    title: "Manually create or update the store shell from the approved store packet"
  }, {
    externalExecution: false,
    id: "execute_store_1_products",
    order: 2,
    packetSection: "products",
    providerContacted: false,
    status: "ready_manual",
    title: "Manually create 3 approved product listing drafts"
  }, {
    externalExecution: false,
    id: "execute_store_1_evidence",
    order: 3,
    packetSection: "evidence",
    providerContacted: false,
    status: "ready_manual",
    title: "Record first traffic, sales, and content evidence into the manual ledger"
  }],
  mode: "Execute First Business",
  providerContacted: false,
  readyState: {
    externalExecution: false,
    label: "Ready to Launch First Business",
    manualLaunchReady: true,
    providerContacted: false,
    semiAutomatedPreparationReady: true
  },
  revenueStartPlan: {
    first24Hours: [
      "Manually publish approved store and product setup only after live approval.",
      "Manually post or queue the first approved organic content draft only after live approval.",
      "Record visits, units, gross revenue, net profit, and content response manually."
    ],
    first72Hours: [
      "Collect manual evidence twice daily.",
      "Keep paid spend locked until Financial Orchestrator scale packet approval.",
      "Feed first sales and content signals back into Revenue Engine rotation."
    ],
    organicFirst: true,
    paidSpendLocked: true
  },
  semiAutomatedPreparationQueue: [{
    externalExecution: false,
    id: "semi_store_1_copy_packet",
    providerContacted: false,
    status: "ready_internal",
    title: "Prepare copy/paste store setup packet for operator review"
  }, {
    externalExecution: false,
    id: "semi_store_1_product_rows",
    providerContacted: false,
    status: "ready_internal",
    title: "Prepare product setup rows for manual import or copy/paste"
  }],
  sourceLaunchId: firstBusinessInternalLaunchPlan.launchId,
  status: "ready_to_launch_first_business",
  summary: "Iron House Gym is Ready to Launch First Business internally with 3 products, 3 faceless content ideas, and 3 organic moves. Manual and semi-automated launch prep are ready; external execution remains locked until explicit live approval.",
  totals: {
    blockedExternalActions: 3,
    finalProducts: 3,
    firstWeekMetricFields: 8,
    handoffProducts: 3,
    manualSteps: 3,
    organicMoves: 3,
    readyLaunchItems: 11,
    readinessBlocked: 0,
    readinessReady: 9,
    semiAutomatedSteps: 2
  }
};

const firstBusinessExecutionRun: RevenueMoneyArmyBatchRun = {
  afterTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 11,
    readyDeploymentBusinesses: 1,
    readyStages: 1,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  auditLogId: "audit-first-business-execute-1",
  batchKey: "first-business-execute-key-1",
  beforeTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  createdAt: "2026-06-02T13:15:00.000Z",
  dryRun: false,
  externalExecution: false,
  id: "first-business-execute-run-1",
  providerContacted: false,
  resultSummary: "Iron House Gym is Ready to Launch First Business. Manual and semi-automated launch prep are ready; external execution remains locked.",
  sourceKeys: ["store-1"],
  stage: "execute_first_business",
  status: "ready_to_launch_first_business"
};

const firstBusinessExecutionApplyResponse: RevenueFirstBusinessExecuteApplyResponse = {
  batchRun: firstBusinessExecutionRun,
  executed: {
    auditLogId: "audit-first-business-execute-1",
    batchRunId: firstBusinessExecutionRun.id,
    dryRun: false,
    executed: true,
    executionId: firstBusinessExecutionPlan.executionId,
    externalExecution: false,
    launchId: firstBusinessInternalLaunchPlan.launchId,
    providerContacted: false,
    stage: "execute_first_business",
    status: "ready_to_launch_first_business",
    summary: "Iron House Gym is Ready to Launch First Business. Manual and semi-automated launch prep are ready; external execution remains locked."
  },
  execution: firstBusinessExecutionPlan,
  launch: firstBusinessInternalLaunchPlan,
  package: firstBusinessPackagePlan,
  preparation: firstStorePreparationPlan,
  sourceBatch: moneyArmyGenerateScoreBatchPlan
};

const firstBusinessAutonomousLaunchPlan: RevenueFirstBusinessAutonomousLaunchPlan = {
  adCampaignDrafts: [{
    audience: "independent gym members",
    budgetApprovalRequired: true,
    campaignName: "Iron House Gym Organic Proof Amplifier",
    dailyBudgetCap: 5,
    externalExecution: false,
    objective: "organic_amplification",
    paymentExecution: false,
    productNames: ["Iron House Operator Tee 1", "Iron House Operator Tee 2"],
    providerContacted: false,
    spendState: "payment_required",
    status: "draft_locked"
  }, {
    audience: "independent gym members",
    budgetApprovalRequired: true,
    campaignName: "Iron House Gym First Product Validation",
    dailyBudgetCap: 10,
    externalExecution: false,
    objective: "product_validation",
    paymentExecution: false,
    productNames: ["Iron House Operator Tee 1"],
    providerContacted: false,
    spendState: "payment_required",
    status: "draft_locked"
  }],
  auditEvents: [
    "Autonomous First Business Launch Prep assembled store, product, supplier, connector, content, organic, ad, and tracking plans internally.",
    "No provider, marketplace, browser, upload, social, ad, bank, payout, payment, card, or external AI action was executed."
  ],
  autonomousLaunchId: "autonomous_first_business_store_1_2026_06_02t13_30_00_000z",
  autonomousUntilPayment: true,
  autonomyMatrix: [{
    autonomyPercent: 100,
    commander: "Store Setup General",
    externalExecution: false,
    hardStop: null,
    lane: "store_build",
    nextInternalAction: "Prepare storefront payload and copy/paste setup packet.",
    ownerApprovalRequired: false,
    providerContacted: false,
    status: "autonomous_ready"
  }, {
    autonomyPercent: 100,
    commander: "Product Factory Commander",
    externalExecution: false,
    hardStop: null,
    lane: "product_creation",
    nextInternalAction: "Prepare product payload rows, listing copy, and design specs.",
    ownerApprovalRequired: false,
    providerContacted: false,
    status: "autonomous_ready"
  }, {
    autonomyPercent: 85,
    commander: "Supplier Connector Commander",
    externalExecution: false,
    hardStop: "Owner must approve credentials and live provider connection.",
    lane: "supplier_connection",
    nextInternalAction: "Prepare connector manifest and supplier payload draft.",
    ownerApprovalRequired: true,
    providerContacted: false,
    status: "connector_gated"
  }, {
    autonomyPercent: 50,
    commander: "Financial Orchestrator Marshal",
    externalExecution: false,
    hardStop: "Owner approval and payment authorization are required before any ad spend.",
    lane: "ad_spend_activation",
    nextInternalAction: "Hold campaign drafts in payment-gated queue.",
    ownerApprovalRequired: true,
    providerContacted: false,
    status: "payment_gated"
  }],
  blockedExternalActions: [
    "Autonomous live provider calls remain blocked until owner-approved credentials are connected",
    "Autonomous store publishing, listing publishing, product upload, content upload, and browser work remain blocked",
    "Autonomous ad activation, ad spend, card charges, supplier orders, marketplace fees, banking, payouts, and payment processor changes remain blocked"
  ],
  chainOfCommand: [{
    lane: "store_build",
    owns: ["store setup payload", "navigation", "collections", "SEO", "policy drafts"],
    rank: "general",
    status: "ready_internal",
    title: "Store Setup General"
  }, {
    lane: "product_creation",
    owns: ["product rows", "listing copy", "design specs", "mockup directions"],
    rank: "commander",
    status: "ready_internal",
    title: "Product Factory Commander"
  }, {
    lane: "supplier_connection",
    owns: ["connector manifest", "credential scopes", "supplier payload draft"],
    rank: "commander",
    status: "owner_gate_required",
    title: "Supplier Connector Commander"
  }, {
    lane: "ad_spend_activation",
    owns: ["Approve first paid traffic test"],
    rank: "marshal",
    status: "owner_gate_required",
    title: "Financial Orchestrator Marshal"
  }],
  connectionPlan: {
    connectorManifests: [{
      approvalRequired: true,
      credentialScopes: ["products:write", "collections:write"],
      externalExecution: false,
      payloadState: "prepared_not_sent",
      provider: "Shopify",
      providerContacted: false,
      purpose: "Create store shell, product listing drafts, collections, SEO metadata, and launch-day tracking fields."
    }, {
      approvalRequired: true,
      credentialScopes: ["catalog:read", "products:write", "uploads:write"],
      externalExecution: false,
      payloadState: "prepared_not_sent",
      provider: "Printify",
      providerContacted: false,
      purpose: "Prepare POD products, variants, mockup slots, production partner notes, and supplier mapping."
    }],
    externalExecution: false,
    providerContacted: false,
    status: "connector_ready_owner_gated",
    summary: "2 connector manifests are prepared but not sent. Credentials, API calls, uploads, tracking installs, and store writes remain owner-gated."
  },
  executionPacket: firstBusinessExecutionPlan,
  externalExecution: false,
  finalOperatorGate: {
    externalExecution: false,
    paymentExecution: false,
    providerContacted: false,
    requiredApprovals: [
      "Approve live storefront connector credentials",
      "Approve supplier connector credentials and any supplier-side charges",
      "Approve any Ad/Growth spend activation through Financial Orchestrator"
    ],
    status: "owner_payment_and_provider_approval_required",
    summary: "ENTRAL can continue autonomously through internal preparation. Live launch, provider calls, account connections, public publishing, and spend require owner approval."
  },
  generatedAt: "2026-06-02T13:30:00.000Z",
  guardrails: [
    "ENTRAL may prepare internal payloads, checklists, copy, drafts, supplier choices, connector manifests, and evidence fields.",
    "ENTRAL may not call providers, upload files, publish listings, post content, activate ads, spend money, or change payment settings without explicit approval."
  ],
  mode: "Autonomous First Business Launch Prep",
  paymentApprovalQueue: [{
    approvalType: "provider_account",
    estimatedAmount: 0,
    externalExecution: false,
    paymentExecution: false,
    providerContacted: false,
    reason: "Owner must approve and provide any live storefront or supplier credentials before ENTRAL can connect accounts.",
    status: "owner_approval_required",
    title: "Approve provider account connection"
  }, {
    approvalType: "ad_spend",
    estimatedAmount: 15,
    externalExecution: false,
    paymentExecution: false,
    providerContacted: false,
    reason: "Paid campaign drafts are ready, but every Ad/Growth dollar remains locked behind Financial Orchestrator approval.",
    status: "owner_approval_required",
    title: "Approve first paid traffic test"
  }],
  paymentExecution: false,
  productCreationPlan: firstBusinessListingProductPack.map((product) => ({
    ...product,
    connectorPayloadStatus: "prepared_not_sent",
    creationLane: "autonomous_internal_ready",
    supplierCandidateId: "supplier_printify_first_drop"
  })),
  providerContacted: false,
  status: "autonomous_ready_payment_gated",
  storeBuildPlan: {
    businessName: "Iron House Gym",
    collectionPlan: ["Iron House Gym First Drop", "fitness New Arrivals", "Best Sellers"],
    externalExecution: false,
    navigationPlan: ["Home", "Iron House Gym First Drop", "About", "Contact", "Policies"],
    policyDrafts: ["Draft production partner disclosure for POD fulfillment."],
    providerContacted: false,
    seoPlan: {
      description: "Iron House Gym first private launch drop for independent gym members.",
      title: "Iron House Gym | Iron House Gym First Drop"
    },
    setupPayloadState: "prepared_not_sent",
    status: "autonomous_internal_ready",
    storePlatform: "Shopify"
  },
  supplierPlan: {
    candidates: [{
      estimatedBaseCost: 12.5,
      externalExecution: false,
      provider: "Printify",
      providerContacted: false,
      reasons: ["Broad POD catalog coverage for first-store validation."],
      selectionScore: 94,
      status: "candidate_internal",
      supplierCandidateId: "supplier_printify_first_drop"
    }, {
      estimatedBaseCost: 13.25,
      externalExecution: false,
      provider: "Printful",
      providerContacted: false,
      reasons: ["Reliable backup supplier candidate for quality-sensitive products."],
      selectionScore: 84,
      status: "candidate_internal",
      supplierCandidateId: "supplier_printful_backup"
    }],
    externalExecution: false,
    providerContacted: false,
    selectedSupplier: {
      estimatedBaseCost: 12.5,
      externalExecution: false,
      provider: "Printify",
      providerContacted: false,
      selectionScore: 94,
      supplierCandidateId: "supplier_printify_first_drop"
    },
    status: "selected_internal_owner_gated",
    summary: "Printify is selected internally for Iron House Gym with score 94/100. No supplier was contacted; account, upload, and order actions need owner approval."
  },
  summary: "Iron House Gym is autonomous-ready until payment: ENTRAL has prepared the store build, 3 product payloads, supplier selection, connector manifests, faceless content, organic moves, ad drafts, and tracking plan. Owner approval is still required for providers, payments, publishing, uploads, browser actions, and ad spend.",
  totals: {
    adDrafts: 2,
    autonomousReadyLanes: 2,
    blockedExternalActions: 3,
    connectorManifests: 2,
    paymentApprovals: 2,
    productPayloads: 3,
    supplierCandidates: 2
  }
};

const firstBusinessAutonomousLaunchRun: RevenueMoneyArmyBatchRun = {
  afterTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 2,
    readyDeploymentBusinesses: 1,
    readyStages: 1,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  auditLogId: "audit-first-business-autonomous-1",
  batchKey: "first-business-autonomous-key-1",
  beforeTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  createdAt: "2026-06-02T13:30:00.000Z",
  dryRun: false,
  externalExecution: false,
  id: "first-business-autonomous-run-1",
  providerContacted: false,
  resultSummary: "Iron House Gym is autonomous-ready until payment. ENTRAL prepared the launch packet; provider, payment, publishing, upload, browser, and spend actions remain locked.",
  sourceKeys: ["store-1"],
  stage: "autonomous_first_business_launch",
  status: "autonomous_ready_payment_gated"
};

const firstBusinessAutonomousLaunchApplyResponse: RevenueFirstBusinessAutonomousLaunchApplyResponse = {
  autonomous: {
    auditLogId: "audit-first-business-autonomous-1",
    autonomousLaunchId: firstBusinessAutonomousLaunchPlan.autonomousLaunchId,
    autonomousPrepared: true,
    batchRunId: firstBusinessAutonomousLaunchRun.id,
    dryRun: false,
    executionId: firstBusinessExecutionPlan.executionId,
    externalExecution: false,
    paymentExecution: false,
    providerContacted: false,
    stage: "autonomous_first_business_launch",
    status: "autonomous_ready_payment_gated",
    summary: "Iron House Gym is autonomous-ready until payment. ENTRAL prepared the launch packet; provider, payment, publishing, upload, browser, and spend actions remain locked."
  },
  autonomousLaunch: firstBusinessAutonomousLaunchPlan,
  batchRun: firstBusinessAutonomousLaunchRun,
  execution: firstBusinessExecutionPlan,
  launch: firstBusinessInternalLaunchPlan,
  package: firstBusinessPackagePlan,
  preparation: firstStorePreparationPlan,
  sourceBatch: moneyArmyGenerateScoreBatchPlan
};

const firstBusinessLiveExecutorPlan: RevenueFirstBusinessLiveExecutorPlan = {
  actualExternalActionsExecuted: false,
  auditEvents: [
    "Controlled Live First Business Executor packet prepared from the autonomous first-business launch plan.",
    "Owner unlock gates are incomplete; live provider, storefront, public launch, and ad draft actions remain blocked.",
    "Payment, ad spend activation, supplier charges, banking, payout, card, and marketplace-fee actions remain locked."
  ],
  blockedExternalActions: [
    "Live external calls are not executed by this packet; approved connectors must be invoked by the controlled executor runtime only after owner unlock",
    "Payment processor setup, supplier charges, ad spend activation, card charges, marketplace fees, banking, payouts, and transfers remain payment locked"
  ],
  credentialReadiness: [{
    approvalStatus: "owner_required",
    credentialRefs: ["SHOPIFY_ADMIN_TOKEN", "SHOPIFY_STORE_DOMAIN"],
    externalExecution: false,
    provider: "Shopify",
    providerContacted: false,
    status: "missing_owner_unlock"
  }, {
    approvalStatus: "owner_required",
    credentialRefs: ["PRINTIFY_API_TOKEN", "PRINTIFY_SHOP_ID"],
    externalExecution: false,
    provider: "Printify",
    providerContacted: false,
    status: "missing_owner_unlock"
  }, {
    approvalStatus: "owner_required",
    credentialRefs: ["META_AD_ACCOUNT_ID", "META_ACCESS_TOKEN"],
    externalExecution: false,
    provider: "Meta",
    providerContacted: false,
    status: "missing_owner_unlock"
  }],
  externalExecution: false,
  generatedAt: "2026-06-02T13:45:00.000Z",
  guardrails: [
    "This executor produces a controlled live-run packet and does not call any provider directly.",
    "Non-payment live actions require the exact owner unlock phrase plus connector and public launch approval.",
    "Payment-bearing actions never become executable from this packet; they remain routed to Financial Orchestrator and owner payment approval."
  ],
  liveExecutorId: "live_executor_store_1_2026_06_02t13_45_00_000z",
  liveRunbook: [{
    approvalRequired: true,
    executionState: "blocked_owner_unlock",
    externalExecution: false,
    id: "live-runbook-storefront-draft",
    kind: "connect_storefront",
    lane: "store_build",
    paymentRequired: false,
    provider: "Shopify",
    providerContacted: false,
    rollback: "Revert storefront draft and unpublished product payloads.",
    sequence: 1,
    title: "Create storefront shell draft"
  }, {
    approvalRequired: true,
    executionState: "blocked_owner_unlock",
    externalExecution: false,
    id: "live-runbook-supplier-products",
    kind: "create_supplier_product",
    lane: "product_creation",
    paymentRequired: false,
    provider: "Printify",
    providerContacted: false,
    rollback: "Archive supplier product drafts and detach unpublished variants.",
    sequence: 2,
    title: "Create supplier product drafts"
  }, {
    approvalRequired: true,
    executionState: "payment_locked",
    externalExecution: false,
    id: "live-runbook-ad-spend",
    kind: "activate_ad_spend",
    lane: "ad_spend_activation",
    paymentRequired: true,
    provider: "Meta",
    providerContacted: false,
    rollback: "Keep campaign paused and leave spend disabled.",
    sequence: 3,
    title: "Hold first paid traffic activation"
  }],
  mode: "Controlled Live First Business Executor",
  ownerUnlock: {
    adDraftApproval: false,
    connectorApproval: false,
    externalExecution: false,
    paymentExecution: false,
    phraseAccepted: false,
    providerContacted: false,
    publicLaunchApproval: false,
    status: "waiting_owner"
  },
  paymentExecution: false,
  paymentLockedQueue: [{
    amount: 15,
    externalExecution: false,
    paymentExecution: false,
    provider: "Meta",
    providerContacted: false,
    reason: "First paid traffic test remains locked behind Financial Orchestrator approval.",
    title: "Approve first paid traffic test"
  }],
  providerActionManifests: [{
    approvalRequired: true,
    externalExecution: false,
    idempotencyKey: "store-1-shopify-storefront-draft",
    method: "POST",
    pathTemplate: "/admin/api/2026-01/products.json",
    paymentRequired: false,
    payloadState: "prepared_not_sent",
    provider: "Shopify",
    providerContacted: false,
    purpose: "Create storefront and product listing drafts.",
    rollbackKey: "rollback-shopify-storefront-draft"
  }, {
    approvalRequired: true,
    externalExecution: false,
    idempotencyKey: "store-1-printify-products",
    method: "POST",
    pathTemplate: "/v1/shops/{shopId}/products.json",
    paymentRequired: false,
    payloadState: "prepared_not_sent",
    provider: "Printify",
    providerContacted: false,
    purpose: "Create supplier product drafts.",
    rollbackKey: "rollback-printify-product-drafts"
  }, {
    approvalRequired: true,
    externalExecution: false,
    idempotencyKey: "store-1-meta-ad-spend",
    method: "POST",
    pathTemplate: "/act_{adAccountId}/campaigns",
    paymentRequired: true,
    payloadState: "prepared_not_sent",
    provider: "Meta",
    providerContacted: false,
    purpose: "Keep first paid traffic campaign drafted and paused.",
    rollbackKey: "rollback-meta-campaign-paused"
  }],
  providerContacted: false,
  rollbackPlan: [{
    externalExecution: false,
    providerContacted: false,
    step: "Revert storefront draft and unpublished product payloads."
  }, {
    externalExecution: false,
    providerContacted: false,
    step: "Archive supplier product drafts and detach unpublished variants."
  }, {
    externalExecution: false,
    providerContacted: false,
    step: "Keep campaign paused and leave spend disabled."
  }],
  sourceAutonomousLaunchId: firstBusinessAutonomousLaunchPlan.autonomousLaunchId,
  status: "ready_for_owner_unlock",
  summary: "Iron House Gym has a controlled live executor packet ready, but owner unlock gates are incomplete. Provider calls, public publishing, ad drafts, and payment actions remain locked.",
  totals: {
    armedNonPaymentSteps: 0,
    blockedSteps: 2,
    credentialChecks: 3,
    paymentLockedSteps: 2,
    providerManifests: 3,
    rollbackSteps: 3
  }
};

const firstBusinessLiveExecutorRun: RevenueMoneyArmyBatchRun = {
  afterTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 2,
    readyDeploymentBusinesses: 1,
    readyStages: 1,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  auditLogId: "audit-first-business-live-executor-1",
  batchKey: "first-business-live-executor-key-1",
  beforeTotals: {
    ...moneyArmyPipelinePlan.totals,
    pendingApprovalPackets: 0,
    readyDeploymentBusinesses: 0,
    readyStages: 0,
    seedCandidates: 1,
    stages: 1,
    targetBusinesses: 1,
    targetLaunchWave: 1
  },
  createdAt: "2026-06-02T13:45:00.000Z",
  dryRun: false,
  externalExecution: false,
  id: "first-business-live-executor-run-1",
  providerContacted: false,
  resultSummary: "Iron House Gym controlled live executor prepared. Owner unlock, connector approval, public launch approval, or ad draft approval is still incomplete.",
  sourceKeys: ["store-1"],
  stage: "controlled_live_executor",
  status: "ready_for_owner_unlock"
};

const firstBusinessLiveExecutorApplyResponse: RevenueFirstBusinessLiveExecutorApplyResponse = {
  autonomousLaunch: firstBusinessAutonomousLaunchPlan,
  batchRun: firstBusinessLiveExecutorRun,
  execution: firstBusinessExecutionPlan,
  launch: firstBusinessInternalLaunchPlan,
  live: {
    actualExternalActionsExecuted: false,
    auditLogId: "audit-first-business-live-executor-1",
    batchRunId: firstBusinessLiveExecutorRun.id,
    dryRun: false,
    externalExecution: false,
    liveExecutorId: firstBusinessLiveExecutorPlan.liveExecutorId,
    paymentExecution: false,
    providerContacted: false,
    stage: "controlled_live_executor",
    status: "ready_for_owner_unlock",
    summary: "Iron House Gym controlled live executor prepared. Owner unlock, connector approval, public launch approval, or ad draft approval is still incomplete.",
    unlockAccepted: false
  },
  liveExecutor: firstBusinessLiveExecutorPlan,
  package: firstBusinessPackagePlan,
  preparation: firstStorePreparationPlan,
  sourceBatch: moneyArmyGenerateScoreBatchPlan
};

function moneyArmyPipelineApplyResponse(dryRun: boolean): RevenueMoneyArmyBatchPipelineApplyResponse {
  return {
    after: moneyArmyPipelinePlan,
    applied: {
      auditLogId: dryRun ? null : "audit-money-army-1",
      batchRunId: dryRun ? null : moneyArmyBatchRun.id,
      dryRun,
      externalExecution: false,
      providerContacted: false,
      stage: "batch_creation",
      summary: dryRun
        ? "Money Army batch creation preview completed."
        : "Money Army batch creation recorded internally."
    },
    batchRun: dryRun ? null : moneyArmyBatchRun,
    before: moneyArmyPipelinePlan,
    result: businessFleetGapSeedResponse(dryRun)
  };
}

function businessFleetGapSeedResponse(dryRun: boolean): RevenueBusinessFleetLaunchGapSeedApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-gap-seeds-1",
      dryRun,
      externalExecution: false,
      launchWaveGapAfter: 9,
      launchWaveGapBefore: 9,
      productDraftsCreated: 45,
      providerContacted: false,
      seedsApplied: dryRun ? 0 : 9,
      seedsPreviewed: dryRun ? 9 : 0,
      seedsSelected: 9,
      skippedExistingProducts: 0,
      storeShellsCreated: 9,
      summary: dryRun
        ? "9 internal opportunity seeds previewed from the business-fleet launch gap."
        : "9 internal opportunity seeds created from the business-fleet launch gap."
    },
    fleet: businessFleetPlan,
    gapPlan: businessFleetGapPlan,
    refreshedGapPlan: businessFleetGapPlan,
    results: businessFleetGapPlan.opportunitySeeds.map((seed) => ({
      applied: {
        auditLogId: dryRun ? null : `audit-${seed.sourceKey}`,
        dryRun,
        externalExecution: false,
        opportunityId: dryRun ? null : `opp-${seed.sourceKey}`,
        productDraftsCreated: 5,
        providerContacted: false,
        skippedExistingProducts: 0,
        storeCreated: true,
        storeId: dryRun ? null : `store-${seed.sourceKey}`
      },
      businessName: seed.businessName,
      plan: {
        nextInternalActions: [{
          action: "create_store",
          externalExecution: false,
          status: "ready",
          title: "Create private store shell"
        }, {
          action: "seed_product_drafts",
          externalExecution: false,
          status: "ready",
          title: "Seed internal product drafts"
        }, {
          action: "run_listing_optimization",
          externalExecution: false,
          status: "queued_after_apply",
          title: "Run listing optimization queue"
        }],
        summary: `New private opportunity shell for ${seed.businessName}: 5 internal product drafts ready.`,
        totals: {
          estimatedDraftProfit: 125,
          existingProductDrafts: 0,
          productDrafts: 5,
          skippedProductDrafts: 0,
          storeShells: 1
        }
      },
      sourceKey: seed.sourceKey,
      store: null
    }))
  };
}

function businessFleetGapAccelerationResponse(dryRun: boolean): RevenueBusinessFleetLaunchGapAccelerationResponse {
  return {
    applied: {
      approvalPacketsQueued: 0,
      auditLogId: dryRun ? null : "audit-gap-acceleration-1",
      dryRun,
      externalExecution: false,
      launchProductsCreated: 0,
      launchQueueItems: 9,
      listingExperimentsQueued: 45,
      listingProductsUpdated: dryRun ? 45 : 45,
      providerContacted: false,
      sourceKeysTargeted: 9,
      storeSetupRunbooks: 9,
      storeSetupUpdates: dryRun ? 0 : 9,
      storesTargeted: 9,
      summary: dryRun
        ? "9 gap-seeded stores previewed for internal launch/listing/setup acceleration."
        : "9 gap-seeded stores accelerated through internal launch/listing/setup queues."
    },
    fleet: businessFleetPlan,
    plans: {
      launchPipeline: launchPipelinePlan,
      listingOptimization: listingOptimizationPlan,
      storeSetup: storeSetupPlan
    },
    results: {
      launchPipeline: {
        approvalPackets: [],
        createdProducts: [],
        storeUpdates: []
      },
      listingOptimization: {
        productUpdates: businessFleetGapPlan.opportunitySeeds.flatMap((seed) => Array.from({ length: 5 }, (_, index) => ({
          productId: `${seed.sourceKey}-product-${index + 1}`,
          storeId: `store-${seed.sourceKey}`
        })))
      },
      storeSetup: {
        storeUpdates: dryRun ? [] : businessFleetGapPlan.opportunitySeeds.map((seed) => ({
          storeId: `store-${seed.sourceKey}`
        }))
      }
    },
    targetedStores: businessFleetGapPlan.opportunitySeeds.map((seed) => ({
      businessName: seed.businessName,
      id: `store-${seed.sourceKey}`,
      launchStatus: "Designing",
      products: 5,
      sourceKey: seed.sourceKey
    }))
  };
}

function businessFleetLiveLaunchPackageResponse(dryRun: boolean) {
  const targetedStores = businessFleetGapPlan.opportunitySeeds.map((seed) => ({
    businessName: seed.businessName,
    id: `store-${seed.sourceKey}`,
    launchStatus: "Designing",
    products: 5,
    sourceKey: seed.sourceKey
  }));

  return {
    applied: {
      auditLogId: dryRun ? null : "audit-live-package-1",
      dryRun,
      externalExecution: false,
      handoffRecords: dryRun ? 0 : 9,
      handoffRecordsPreviewed: dryRun ? 9 : 0,
      operationsPacksRecorded: dryRun ? 0 : 9,
      operationsPacksSelected: 9,
      providerApprovalPacketsPreviewed: dryRun ? 9 : 0,
      providerApprovalPacketsQueued: dryRun ? 0 : 9,
      providerContacted: false,
      providerPayloadsPrepared: 9,
      readyOperationsPacks: 0,
      sourceKeysTargeted: 9,
      storesTargeted: 9,
      summary: dryRun
        ? "9 gap-seeded stores previewed for internal live launch packaging."
        : "9 gap-seeded stores recorded into internal live launch package artifacts."
    },
    fleet: businessFleetPlan,
    plans: {
      handoffPlan: null,
      launchPipeline: launchPipelinePlan,
      operationsPackPlan: null,
      readinessPlan: {
        auditEvents: ["Live launch readiness preview generated."],
        blockedExternalActions: businessFleetPlan.blockedExternalActions,
        externalExecution: false,
        generatedAt: "2026-06-02T12:00:00.000Z",
        mode: "Internal Launch Readiness Board",
        options: {
          includeApprovalHistory: true,
          maxStores: 10,
          minLaunchReadiness: 70,
          minProviderReadiness: 70
        },
        providerContacted: false,
        queue: [],
        stageCounts: {
          blocked: 0,
          handoff_ready: 0,
          launch_approval: 0,
          listing_optimization: 0,
          live_monitoring: 0,
          product_drafting: 9,
          provider_payload_review: 0,
          store_setup: 0
        },
        stores: targetedStores.map((target) => ({
          approvalState: {
            approvedPackets: 0,
            latestProviderApprovalId: null,
            pendingPackets: 1,
            providerApprovalApproved: false,
            providerApprovalPending: true,
            rejectedPackets: 0,
            totalPackets: 1
          },
          blockers: [],
          externalExecution: false,
          launchPipeline: null,
          nextInternalAction: "request_provider_payload_approval",
          priority: 1,
          providerContacted: false,
          providerPayload: {
            adapterCoverage: ["Printify", "Etsy"],
            payloadCount: 5,
            readinessScore: 70,
            warnings: []
          },
          readinessScore: 70,
          riskLevel: "low",
          stage: "provider_payload_review",
          store: {
            approvalStatus: "Designs Pending",
            businessName: target.businessName,
            estimatedProfit: 125,
            id: target.id,
            launchStatus: target.launchStatus,
            productTypes: ["T-shirt"],
            revenue: 0,
            storePlatform: "Etsy"
          },
          storeSetup: null,
          summary: `${target.businessName} has a targeted live launch package preview.`
        })),
        summary: "9 targeted stores evaluated for live launch package readiness.",
        totals: {
          approvedProviderPackets: 0,
          blockedStores: 0,
          handoffReadyStores: 0,
          payloadsPrepared: 9,
          queuedStores: 9,
          storesEvaluated: 9
        }
      },
      storeSetup: storeSetupPlan
    },
    providerApprovalSnapshots: [],
    providerPayloads: targetedStores.map(() => providerPayloadPackage),
    results: {
      handoff: null,
      operationsPack: null
    },
    targetedStores
  } as RevenueBusinessFleetLiveLaunchPackageResponse;
}

function businessFleetLaunchGateResponse(): RevenueBusinessFleetLaunchGateResponse {
  const items = businessFleetGapPlan.opportunitySeeds.map((seed, index) => ({
    approvalState: {
      approvedPackets: 0,
      latestProviderApprovalId: null,
      pendingPackets: 1,
      providerApprovalApproved: false,
      providerApprovalPending: true,
      rejectedPackets: 0,
      totalPackets: 1
    },
    blockers: [],
    businessName: seed.businessName,
    externalExecution: false,
    gateStatus: index === 0 ? "approval_needed" : "repair_required",
    launchReadinessScore: index === 0 ? 72 : 54,
    launchStatus: "Designing",
    nextInternalAction: {
      endpoint: index === 0 ? "/merch/stores/:storeId/growth-approvals" : "/merch/revenue-engine/launch-readiness",
      label: index === 0 ? "Review provider approval" : "Repair launch package",
      state: index === 0 ? "provider_approval_pending" : "repair_required"
    },
    operationsPackStatus: index === 0 ? "needs_review" : "blocked",
    productCount: 5,
    providerContacted: false,
    providerPayloadCount: index === 0 ? 5 : 0,
    providerReadinessScore: index === 0 ? 70 : 35,
    reason: index === 0
      ? "Provider payload approval is pending before handoff can become launch-ready."
      : "Launch package needs repair before manual launch.",
    readinessStage: index === 0 ? "provider_payload_review" : "product_drafting",
    sourceKey: seed.sourceKey,
    storeId: `store-${seed.sourceKey}`
  })) satisfies RevenueBusinessFleetLaunchGateResponse["plan"]["items"];

  return {
    plan: {
      auditEvents: ["Business fleet launch gate evaluated packaged seed lanes."],
      blockedExternalActions: businessFleetPlan.blockedExternalActions,
      externalExecution: false,
      generatedAt: "2026-06-02T12:00:00.000Z",
      items,
      mode: "Revenue Business Fleet Launch Gate",
      plans: {
        handoffTotals: null,
        operationsPackTotals: null,
        readinessTotals: {
          approvedProviderPackets: 0,
          blockedStores: 0,
          handoffReadyStores: 0,
          payloadsPrepared: 9,
          queuedStores: 9,
          storesEvaluated: 9
        }
      },
      providerContacted: false,
      statusCounts: {
        approvalNeeded: 1,
        blocked: 0,
        readyForManualLaunch: 0,
        repairRequired: 8
      },
      summary: "9 packaged business lanes evaluated: 0 ready for manual launch, 1 need approval, 8 need repair, 0 blocked.",
      targetedSourceKeys: businessFleetGapPlan.opportunitySeeds.map((seed) => seed.sourceKey),
      totals: {
        approvalNeeded: 1,
        blocked: 0,
        handoffRecordsOpen: 0,
        operationsPacks: 9,
        operationsReady: 0,
        payloadsPrepared: 9,
        providerPacketsApproved: 0,
        providerPacketsPending: 1,
        readyForManualLaunch: 0,
        repairRequired: 8,
        storesEvaluated: 9
      }
    }
  };
}

function businessFleetLaunchWaveResponse() {
  return {
  dispatched: {
    actionsBlocked: 0,
    actionsDispatched: 0,
    actionsPreviewed: 1,
    actionsSelected: 1,
    actionsSkipped: 0,
    dryRun: true,
    externalExecution: false,
    providerContacted: false,
    results: [],
    summary: "1 first-business launch action previewed from the fleet wave."
  },
  firstBusinessLaunch: firstBusinessLaunchPlan,
  fleet: businessFleetPlan,
  selectedSprintActionIds: ["first_cash:store-1:optimize_listings"],
  selection: {
    auditEvents: ["Business Fleet Launch Wave selected ready parallel businesses."],
    blockedExternalActions: businessFleetPlan.blockedExternalActions,
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    mode: "Revenue Business Fleet Launch Wave",
    providerContacted: false,
    selectedBusinesses: [{
      businessId: "store-1",
      businessName: "Iron House Gym",
      finalRank: 91,
      nextInternalAction: "dispatch_first_cash_bridge_action",
      qualityStatus: "pass",
      scheduleState: "ready_parallel",
      shardId: "shard_001",
      sprintActionId: "first_cash:store-1:optimize_listings"
    }],
    skipped: [],
    sprintActionIds: ["first_cash:store-1:optimize_listings"],
    summary: "1 business selected for the internal launch wave from 1 eligible ready-parallel lane.",
    totals: {
      eligible: 1,
      readyParallel: 1,
      requested: 0,
      selected: 1,
      skipped: 0
    }
  },
  sprint: firstCashSprintPlan
};
}

function rotationResponse(plan: RevenueEnginePlan, dryRun: boolean): RevenueRotationApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-revenue-1",
      dryRun,
      externalExecution: false,
      productUpdates: plan.rotationChanges.filter((change) => change.targetType === "product"),
      storeUpdates: plan.rotationChanges.filter((change) => change.targetType === "store")
    },
    plan,
    portfolio: portfolioFromPlan(plan)
  };
}

function assetControlReview(
  asset: RevenueEnginePlan["assetScores"][number],
  action: RevenueAssetRotationDecision,
  change: RevenueEnginePlan["rotationChanges"][number] | null
): RevenueAssetActionApplyResponse["control"]["controlReview"] {
  const alignment = action === asset.recommendation ? "matches_recommendation" : "dashboard_override";
  const executionScope = change === null ? "audit_only" : "internal_status_change";
  const statusImpact = change === null
    ? "none"
    : change.targetType === "product" ? "product_status_change" : "store_status_change";
  const requiresOperatorReview = alignment === "dashboard_override" || action === "kill" || action === "pause" || asset.riskLevel === "high";
  const riskTier = action === "kill" || asset.riskLevel === "high" ? "high" : requiresOperatorReview ? "medium" : "low";

  return {
    alignment,
    executionScope,
    requiresOperatorReview,
    riskTier,
    statusImpact,
    summary: `${action} is ${alignment === "matches_recommendation" ? "matches scoring" : "dashboard override"}, ${executionScope === "audit_only" ? "audit-only" : "internal status change"}, ${statusImpact === "none" ? "no state change" : statusImpact.replace(/_/g, " ")}, ${riskTier} review risk.`
  };
}

function assetBatchControlReview(
  controls: RevenueAssetBatchActionApplyResponse["batch"]["controls"],
  skipped: RevenueAssetBatchActionApplyResponse["batch"]["skipped"] = []
): RevenueAssetBatchActionApplyResponse["batch"]["controlReview"] {
  const matchedRecommendations = controls.filter((control) => control.controlReview.alignment === "matches_recommendation").length;
  const dashboardOverrides = controls.filter((control) => control.controlReview.alignment === "dashboard_override").length;
  const auditOnly = controls.filter((control) => control.controlReview.executionScope === "audit_only").length;
  const internalStatusChanges = controls.filter((control) => control.controlReview.executionScope === "internal_status_change").length;
  const high = controls.filter((control) => control.controlReview.riskTier === "high").length;
  const medium = controls.filter((control) => control.controlReview.riskTier === "medium").length;
  const low = controls.filter((control) => control.controlReview.riskTier === "low").length;
  const productStatusChanges = controls.filter((control) => control.controlReview.statusImpact === "product_status_change").length;
  const storeStatusChanges = controls.filter((control) => control.controlReview.statusImpact === "store_status_change").length;
  const riskTier = high > 0 ? "high" : medium > 0 || skipped.length > 0 ? "medium" : "low";

  return {
    alignment: {
      dashboardOverrides,
      matchedRecommendations
    },
    executionScope: {
      auditOnly,
      internalStatusChanges
    },
    requiresOperatorReview: controls.some((control) => control.controlReview.requiresOperatorReview) || skipped.length > 0,
    riskTier,
    riskTiers: {
      high,
      low,
      medium
    },
    skipped: skipped.length,
    statusImpact: {
      none: controls.filter((control) => control.controlReview.statusImpact === "none").length,
      productStatusChanges,
      storeStatusChanges
    },
    summary: `${controls.length} batch asset actions reviewed: ${matchedRecommendations} match scoring, ${dashboardOverrides} dashboard overrides, ${internalStatusChanges} internal status changes, ${auditOnly} audit-only intents, ${riskTier} review risk. ${skipped.length} skipped.`
  };
}

function assetActionResponse(plan: RevenueEnginePlan, assetId: string, action: RevenueAssetRotationDecision, dryRun: boolean): RevenueAssetActionApplyResponse {
  const asset = plan.assetScores.find((score) => score.assetId === assetId);
  const change = plan.rotationChanges.find((item) => item.targetId === assetId) ?? null;

  if (!asset) {
    throw new Error(`Missing asset fixture ${assetId}`);
  }

  return {
    applied: {
      action,
      auditLogId: dryRun ? null : "audit-asset-1",
      auditOnly: change === null,
      dryRun,
      externalExecution: false,
      productUpdates: change?.targetType === "product" ? [change] : [],
      providerContacted: false,
      statusChangeRequired: change !== null,
      storeUpdates: change?.targetType === "store" ? [change] : []
    },
    control: {
      action,
      asset,
      auditOnly: change === null,
      blockedExternalActions: plan.blockedExternalActions,
      change,
      controlReview: assetControlReview(asset, action, change),
      externalExecution: false,
      generatedAt: plan.generatedAt,
      mode: "Revenue Engine Asset Control",
      nextInternalState: asset.nextInternalState,
      providerContacted: false,
      reason: asset.reason,
      requestedAction: action,
      statusChangeRequired: change !== null,
      summary: change
        ? `${action} will move ${asset.assetName} from ${change.fromStatus} to ${change.toStatus} inside ENTRAL records only.`
        : `${action} will be recorded for ${asset.assetName}; no internal status change is required.`,
      warnings: []
    },
    portfolio: portfolioFromPlan(plan)
  };
}

function assetBatchActionResponse(plan: RevenueEnginePlan, dryRun: boolean): RevenueAssetBatchActionApplyResponse {
  const portfolio = portfolioFromPlan(plan);
  const controls = portfolio.assets.map((asset) => {
    const change = plan.rotationChanges.find((item) => item.targetId === asset.assetId) ?? null;

    return {
      action: asset.recommendation,
      asset,
      auditOnly: change === null,
      blockedExternalActions: plan.blockedExternalActions,
      change,
      controlReview: assetControlReview(asset, asset.recommendation, change),
      externalExecution: false as const,
      generatedAt: plan.generatedAt,
      mode: "Revenue Engine Asset Control" as const,
      nextInternalState: asset.nextInternalState,
      providerContacted: false as const,
      reason: asset.reason,
      requestedAction: asset.recommendation,
      statusChangeRequired: change !== null,
      summary: change
        ? `${asset.recommendation} will move ${asset.assetName} from ${change.fromStatus} to ${change.toStatus} inside ENTRAL records only.`
        : `${asset.recommendation} will be recorded for ${asset.assetName}; no internal status change is required.`,
      warnings: []
    };
  });
  const productUpdates = plan.rotationChanges.filter((change) => change.targetType === "product");
  const storeUpdates = plan.rotationChanges.filter((change) => change.targetType === "store");

  return {
    applied: {
      actions: controls.length,
      auditLogId: dryRun ? null : "audit-asset-batch-1",
      auditOnly: false,
      dryRun,
      externalExecution: false,
      productUpdates,
      providerContacted: false,
      skipped: [],
      statusChangeRequired: true,
      storeUpdates
    },
    batch: {
      auditOnly: false,
      blockedExternalActions: plan.blockedExternalActions,
      controlReview: assetBatchControlReview(controls),
      controls,
      externalExecution: false,
      generatedAt: plan.generatedAt,
      mode: "Revenue Engine Asset Batch Control",
      productUpdates,
      providerContacted: false,
      skipped: [],
      statusChangeRequired: true,
      storeUpdates,
      summary: "4 selected asset actions prepared: 2 internal state changes and 2 audit-only intents. 0 skipped.",
      totals: {
        actions: controls.length,
        auditOnly: 2,
        kill: 1,
        pause: 1,
        productUpdates: 1,
        scale: 2,
        skipped: 0,
        statusChangeRequired: 2,
        storeUpdates: 1,
        watch: 0
      },
      warnings: []
    },
    portfolio
  };
}

function reviewQueueBatchActionResponse(plan: RevenueEnginePlan, dryRun: boolean): RevenueAssetBatchActionApplyResponse {
  const portfolio = portfolioFromPlan(plan);
  const asset = portfolio.assets.find((score) => score.assetId === "product-2");
  const change = plan.rotationChanges.find((item) => item.targetId === "product-2") ?? null;

  if (!asset) {
    throw new Error("Missing review queue batch asset fixture.");
  }

  const productUpdates = change?.targetType === "product" ? [change] : [];
  const storeUpdates = change?.targetType === "store" ? [change] : [];

  return {
    applied: {
      actions: 1,
      auditLogId: dryRun ? null : "audit-review-queue-batch-1",
      auditOnly: change === null,
      dryRun,
      externalExecution: false,
      productUpdates,
      providerContacted: false,
      skipped: [],
      statusChangeRequired: change !== null,
      storeUpdates
    },
    batch: {
      auditOnly: change === null,
      blockedExternalActions: plan.blockedExternalActions,
      controlReview: assetBatchControlReview([{
        action: "kill",
        asset,
        auditOnly: change === null,
        blockedExternalActions: plan.blockedExternalActions,
        change,
        controlReview: assetControlReview(asset, "kill", change),
        externalExecution: false,
        generatedAt: plan.generatedAt,
        mode: "Revenue Engine Asset Control",
        nextInternalState: asset.nextInternalState,
        providerContacted: false,
        reason: asset.reason,
        requestedAction: "kill",
        statusChangeRequired: change !== null,
        summary: change
          ? `kill will move ${asset.assetName} from ${change.fromStatus} to ${change.toStatus} inside ENTRAL records only.`
          : `kill will be recorded for ${asset.assetName}; no internal status change is required.`,
        warnings: []
      }]),
      controls: [{
        action: "kill",
        asset,
        auditOnly: change === null,
        blockedExternalActions: plan.blockedExternalActions,
        change,
        controlReview: assetControlReview(asset, "kill", change),
        externalExecution: false,
        generatedAt: plan.generatedAt,
        mode: "Revenue Engine Asset Control",
        nextInternalState: asset.nextInternalState,
        providerContacted: false,
        reason: asset.reason,
        requestedAction: "kill",
        statusChangeRequired: change !== null,
        summary: change
          ? `kill will move ${asset.assetName} from ${change.fromStatus} to ${change.toStatus} inside ENTRAL records only.`
          : `kill will be recorded for ${asset.assetName}; no internal status change is required.`,
        warnings: []
      }],
      externalExecution: false,
      generatedAt: plan.generatedAt,
      mode: "Revenue Engine Asset Batch Control",
      productUpdates,
      providerContacted: false,
      skipped: [],
      statusChangeRequired: change !== null,
      storeUpdates,
      summary: "1 selected review queue asset action prepared.",
      totals: {
        actions: 1,
        auditOnly: change === null ? 1 : 0,
        kill: 1,
        pause: 0,
        productUpdates: productUpdates.length,
        scale: 0,
        skipped: 0,
        statusChangeRequired: change === null ? 0 : 1,
        storeUpdates: storeUpdates.length,
        watch: 0
      },
      warnings: []
    },
    portfolio
  };
}

const revenueAssetControlLedgerPlan: RevenueAssetControlLedgerPlan = {
  auditEvents: [
    "Revenue asset control ledger generated from persisted internal scale/watch/pause/kill decisions.",
    "Records are internal decision evidence only."
  ],
  blockedExternalActions: [
    "Executing provider, marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or external write actions",
    "Treating an internal scale/watch/pause/kill record as authorization to spend money, publish listings, upload content, or move funds"
  ],
  externalExecution: false,
  generatedAt: "2026-06-03T00:00:00.000Z",
  mode: "Revenue Engine Asset Control Ledger",
  providerContacted: false,
  records: [{
    assetId: "product-2",
    assetName: "Weak Tee",
    assetScore: {
      economicsScore: 0,
      finalRank: 18,
      readinessScore: 24,
      riskPenalty: 8,
      velocity: 2
    },
    assetType: "product",
    auditLogId: "audit-asset-control-1",
    auditOnly: true,
    control: {},
    createdAt: "2026-06-03T00:00:00.000Z",
    externalExecution: false,
    fromStatus: "Awaiting Approval",
    id: "asset-control-record-1",
    nextInternalState: null,
    override: true,
    providerContacted: false,
    reason: "Dashboard override requested watch while the scoring engine recommended kill.",
    requestedAction: "watch",
    riskLevel: "high",
    scoreBand: "critical",
    scoringRecommendation: "kill",
    statusChangeRequired: false,
    storeId: "store-2",
    storeName: "Slow Lane Studio",
    toStatus: null,
    updatedAt: "2026-06-03T00:00:00.000Z",
    warnings: ["Requested action differs from the scoring recommendation; retain manual review context."]
  }],
  summary: "1 asset control decision recorded. 0 scale, 1 watch, 0 pause, 0 kill, 0 status changes, and 1 override are in the internal ledger.",
  totals: {
    auditOnly: 1,
    kill: 0,
    overrides: 1,
    pause: 0,
    records: 1,
    scale: 0,
    statusChanges: 0,
    watch: 1
  }
};

const revenueAssetControlRecoveryPlan: RevenueAssetControlRecoveryPlan = {
  auditEvents: [
    "Revenue asset control recovery generated from current scoring and the latest internal asset-control ledger record per asset.",
    "Recovery items are replay intelligence only; operator approval is still required before internal status changes."
  ],
  blockedExternalActions: [
    "Executing provider, marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or external write actions"
  ],
  externalExecution: false,
  generatedAt: "2026-06-03T00:15:00.000Z",
  mode: "Revenue Engine Asset Control Recovery",
  providerContacted: false,
  recoveryQueue: [{
    ageDays: 1,
    assetId: "product-2",
    assetName: "Weak Tee",
    assetType: "product",
    auditLogId: "audit-asset-control-1",
    canReplay: true,
    createdAt: "2026-06-02T00:15:00.000Z",
    currentFinalRank: 34,
    currentRecommendation: "pause",
    currentState: "Published",
    latestFinalRank: 34,
    nextInternalState: "Needs Revision",
    reason: "The latest score still matches the ledger decision and the internal status change can be replayed after operator approval.",
    recordId: "asset-control-record-2",
    requestedAction: "pause",
    requiresOperatorReview: false,
    riskTier: "low",
    scoreDelta: 0,
    scoringRecommendation: "pause",
    state: "ready_to_replay",
    targetState: "Needs Revision",
    warnings: []
  }],
  summary: "1 asset-control recovery item evaluated: 1 ready to replay, 0 manual review, 0 stale score, 0 already current, 0 missing assets.",
  totals: {
    alreadyCurrent: 0,
    auditOnly: 0,
    items: 1,
    manualReview: 0,
    missingAssets: 0,
    readyToReplay: 1,
    staleScore: 0
  }
};

const revenueAssetReviewQueuePlan: RevenueAssetReviewQueuePlan = {
  auditEvents: [
    "Revenue asset review queue generated from current asset scoring and the internal asset-control ledger.",
    "Queue items are operator review prompts only."
  ],
  blockedExternalActions: [
    "Executing provider, marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or external write actions",
    "Treating a review queue item as authorization to spend money, publish listings, upload content, or move funds"
  ],
  externalExecution: false,
  generatedAt: "2026-06-03T00:10:00.000Z",
  mode: "Revenue Engine Asset Review Queue",
  providerContacted: false,
  queue: [{
    assetId: "product-2",
    assetName: "Weak Tee",
    assetScore: {
      economicsScore: 0,
      finalRank: 18,
      readinessScore: 24,
      riskPenalty: 8,
      velocity: 2
    },
    assetType: "product",
    controlHistory: {
      currentRecommendationChanged: false,
      latestActionAgeDays: 2,
      latestOverride: true,
      latestRequestedAction: "watch",
      latestScoringRecommendation: "kill",
      latestStatusChangeRequired: false,
      overrides: 1,
      records: 1,
      statusChanges: 0
    },
    currentRecommendation: "kill",
    evidence: [
      "Score 18: economics 0, readiness 24, risk penalty 8, velocity 2.",
      "Latest control watch recorded 2 days ago as an override."
    ],
    externalExecution: false,
    latestControl: {
      createdAt: "2026-06-01T00:00:00.000Z",
      override: true,
      requestedAction: "watch",
      scoringRecommendation: "kill",
      statusChangeRequired: false,
      toStatus: null
    },
    nextReviewState: "resolve_override_against_current_score",
    priority: 100,
    providerContacted: false,
    reason: "Latest control overrode kill with watch; review against the current kill score before the next internal action.",
    riskLevel: "high",
    scoreBand: "critical",
    storeId: "store-1",
    storeName: "Iron House Gym",
    trigger: "override_review"
  }],
  summary: "1 asset review item queued from current scores and control history: 0 scale-ready, 1 pause/kill, 1 override review, 0 stale, and 0 without prior control history.",
  totals: {
    items: 1,
    killOrPause: 1,
    noHistory: 0,
    overrides: 1,
    scaleReady: 0,
    stale: 0,
    watch: 0
  }
};

const emptyRevenueAssetReviewQueuePlan: RevenueAssetReviewQueuePlan = {
  ...revenueAssetReviewQueuePlan,
  queue: [],
  summary: "0 asset review items queued from current scores and control history.",
  totals: {
    items: 0,
    killOrPause: 0,
    noHistory: 0,
    overrides: 0,
    scaleReady: 0,
    stale: 0,
    watch: 0
  }
};

const revenuePortfolioDashboard: RevenuePortfolioDashboardPlan = {
  blockedExternalActions: [
    "Publishing marketplace listings",
    "Executing provider, marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or external write actions"
  ],
  controlLedger: {
    auditOnly: 1,
    overrides: 1,
    records: 1,
    statusChanges: 0
  },
  externalExecution: false,
  generatedAt: "2026-06-03T00:20:00.000Z",
  kpis: {
    assets: 4,
    estimatedMargin: 42,
    estimatedProfit: 436,
    performanceSnapshots: 3,
    products: 2,
    profitVelocity: 10.86,
    revenueVelocity: 20,
    stores: 2,
    totalRevenue: 1200,
    trackedAssets: 2
  },
  mode: "Revenue Engine Portfolio Dashboard",
  nextActions: [{
    actionLabel: "Archive internally",
    assetId: "product-2",
    assetName: "Weak Tee",
    assetType: "product",
    nextInternalState: "Archived",
    priority: 392,
    reason: "Product has non-positive economics and should be archived before it consumes more attention.",
    recommendation: "kill",
    score: 8,
    scoreBand: "critical",
    storeId: "store-1",
    storeName: "Iron House Gym"
  }, {
    actionLabel: "Queue scale review",
    assetId: "store-1",
    assetName: "Iron House Gym",
    assetType: "store",
    nextInternalState: null,
    priority: 285,
    reason: "2 products meet scale economics; prepare variants, launch package, and approval-locked growth work.",
    recommendation: "scale",
    score: 85,
    scoreBand: "excellent",
    storeId: "store-1",
    storeName: "Iron House Gym"
  }],
  providerContacted: false,
  queuePressure: {
    commandActions: 5,
    highRiskCommands: 1,
    killOrPause: 1,
    noHistory: 0,
    openCommandRecords: 2,
    overrides: 1,
    reviewItems: 1,
    rotationChanges: 2,
    scaleReady: 0,
    stale: 0
  },
  recommendations: {
    kill: 1,
    pause: 1,
    scale: 2,
    watch: 0
  },
  risk: {
    highRiskAssets: 1,
    killOrPauseAssets: 2,
    mediumRiskAssets: 1,
    riskLevel: "high",
    untrackedAssets: 2
  },
  summary: "4 scored assets with $10.86/day profit velocity, 1 review item, 5 command actions, and high operating risk."
};

const firstCashReadinessPlan: RevenueFirstCashReadinessPlan = {
  auditEvents: [
    "First Cash Readiness aggregated launch readiness and live connector readiness into ranked cash-path candidates.",
    "No provider, marketplace, payment, bank, browser, social, upload, payout, or ad system was contacted."
  ],
  blockedExternalActions: [
    "Publishing listings, products, storefront changes, uploads, posts, ads, payouts, transfers, or payment actions",
    "Opening provider dashboards, browser sessions, proxy pools, fingerprint profiles, or automation contexts"
  ],
  candidates: [{
    automaticCashEtaDays: 3,
    automaticCashReady: true,
    automaticCashStatus: "automatic_cash_ready",
    blockers: [],
    cashReadinessScore: 90,
    estimatedFirstSaleDays: 2,
    evidence: {
      approvedProducts: 5,
      launchReadinessScore: 94,
      liveConnectorReadinessScore: 90,
      payloadsPrepared: 5,
      providerApprovalApproved: true,
      providerApprovalPending: false,
      revenue: 0
    },
    externalExecution: false,
    launchStage: "handoff_ready",
    manualLaunchReady: true,
    nextAction: {
      action: "final_operator_launch_review",
      reason: "The revenue path is close enough for final operator launch review.",
      title: "Final operator launch review"
    },
    paymentReadiness: "live_design_ready",
    providerContacted: false,
    status: "ready_for_manual_launch",
    storeId: "store-1",
    storeName: "Iron House Gym",
    summary: "Iron House Gym: ready for manual launch. First sale ETA 2 days; automatic cash ETA 3 days."
  }, {
    automaticCashEtaDays: 24,
    automaticCashReady: false,
    automaticCashStatus: "launch_work_needed",
    blockers: [{
      code: "product_floor_gap",
      severity: "medium",
      title: "More internal product drafts needed before launch."
    }],
    cashReadinessScore: 42,
    estimatedFirstSaleDays: 14,
    evidence: {
      approvedProducts: 1,
      launchReadinessScore: 58,
      liveConnectorReadinessScore: 44,
      payloadsPrepared: 1,
      providerApprovalApproved: false,
      providerApprovalPending: true,
      revenue: 0
    },
    externalExecution: false,
    launchStage: "listing_optimization",
    manualLaunchReady: false,
    nextAction: {
      action: "optimize_listings",
      reason: "Listing copy and payloads need improvement before launch review.",
      title: "Optimize listings"
    },
    paymentReadiness: "needs_approval",
    providerContacted: false,
    status: "needs_products",
    storeId: "store-2",
    storeName: "Slow Lane Studio",
    summary: "Slow Lane Studio: needs products. First sale ETA 14 days; automatic cash ETA 24 days."
  }],
  externalExecution: false,
  generatedAt: "2026-06-03T00:30:00.000Z",
  mode: "Revenue Engine First Cash Readiness",
  options: {
    includeBlocked: true,
    maxCandidates: 8,
    targetDaysToFirstCash: 7
  },
  providerContacted: false,
  summary: "2 first-cash candidates ranked. Top path: Iron House Gym, first sale ETA 2 days, automatic cash ETA 3 days.",
  topCandidate: null,
  totals: {
    automaticCashReady: 1,
    blocked: 0,
    candidates: 2,
    manualLaunchReady: 1,
    targetReady: 1
  }
};
firstCashReadinessPlan.topCandidate = firstCashReadinessPlan.candidates[0] ?? null;

const firstCashSprintPlan: RevenueFirstCashSprintPlan = {
  auditEvents: [
    "First Cash Sprint converted ranked first-cash candidates into the next internal sprint moves.",
    "No provider, marketplace, payment, browser, social, upload, payout, ad, proxy, fingerprint, or platform-evasion system was contacted."
  ],
  blockedExternalActions: [
    "Publishing listings, products, storefront changes, uploads, posts, ads, payouts, transfers, or payment actions",
    "Opening provider dashboards, browser sessions, proxy pools, fingerprint profiles, or automation contexts"
  ],
  bridge: {
    actions: 3,
    readyActions: 1,
    summary: "1 bridge action ready."
  },
  externalExecution: false,
  generatedAt: "2026-06-03T00:35:00.000Z",
  mode: "Revenue Engine First Cash Sprint",
  options: {
    includeBlocked: true,
    maxCandidates: 8,
    maxSprintActions: 5,
    targetDaysToFirstCash: 7
  },
  providerContacted: false,
  readiness: {
    summary: firstCashReadinessPlan.summary,
    topAutomaticCashEtaDays: 3,
    topFirstSaleEtaDays: 2,
    topStoreId: "store-1",
    topStoreName: "Iron House Gym"
  },
  steps: [{
    action: "optimize_listings",
    automaticCashEtaDays: 3,
    bridgeActionId: "store-1:run_listing_optimization:listing_optimization",
    blockers: [],
    candidateRank: 1,
    cashReadinessScore: 90,
    dispatchKind: "listing_optimization",
    endpoint: "/merch/revenue-engine/listing-optimization/apply",
    estimatedFirstSaleDays: 2,
    expectedInternalEffect: "Listing optimization can update internal product listing drafts for Iron House Gym.",
    externalExecution: false,
    manualLaunchReady: true,
    nextActionTitle: "Optimize listings",
    priorityScore: 120,
    providerContacted: false,
    reason: "Listing improvements are the fastest internal path to launch review.",
    sprintActionId: "first_cash:store-1:optimize_listings",
    status: "ready_internal",
    storeId: "store-1",
    storeName: "Iron House Gym"
  }, {
    action: "final_operator_launch_review",
    automaticCashEtaDays: 4,
    bridgeActionId: null,
    blockers: [],
    candidateRank: 2,
    cashReadinessScore: 81,
    dispatchKind: "none",
    endpoint: "/merch/revenue-engine/launch-readiness",
    estimatedFirstSaleDays: 3,
    expectedInternalEffect: "Final operator launch review requires direct operator approval before the cash path can advance.",
    externalExecution: false,
    manualLaunchReady: true,
    nextActionTitle: "Final operator launch review",
    priorityScore: 104,
    providerContacted: false,
    reason: "The revenue path is close enough for final operator launch review.",
    sprintActionId: "first_cash:store-2:final_operator_launch_review",
    status: "manual_gate",
    storeId: "store-2",
    storeName: "Slow Lane Studio"
  }],
  summary: "2 first-cash sprint moves prioritized: 1 ready internal, 1 manual-gated, 0 blocked. Top path: Iron House Gym.",
  totals: {
    blocked: 0,
    candidates: 2,
    eligibleBridgeActions: 1,
    manualGates: 1,
    readyInternal: 1,
    steps: 2,
    targetReady: 2,
    watch: 0
  }
};

const firstBusinessLaunchPlan: RevenueFirstBusinessLaunchPlan = {
  auditEvents: [
    "First Business Launch Path joined Revenue Launch Checklist and First Cash Sprint evidence into one ranked launch target list.",
    "No provider, marketplace, payment, social, ad, browser, upload, payout, bank, card, or external write action was executed."
  ],
  blockedExternalActions: [
    "Publishing marketplace listings, creating provider-side products, uploading artwork or files, changing storefront settings, posting content, starting ads, or moving money",
    "Opening provider dashboards, launching browser automation, using stealth, proxy rotation, fingerprint spoofing, account warmup, CAPTCHA bypass, or platform-evasion automation"
  ],
  candidates: [{
    blockers: [],
    cashReadinessScore: 90,
    checklistItemId: "launch-checklist-store-1",
    expectedInternalEffect: "Listing optimization can update internal product listing drafts for Iron House Gym.",
    externalExecution: false,
    finalRank: 96,
    incomeVelocityScore: 88,
    launchReadinessScore: 82,
    nextInternalAction: "Optimize listings",
    nextInternalState: "dispatch_ready_first_cash_bridge_action",
    priorityScore: 120,
    providerContacted: false,
    reason: "Listing improvements are the fastest internal path to launch review.",
    recommendedEndpoint: "/merch/revenue-engine/listing-optimization/apply",
    riskLevel: "low",
    sprintActionId: "first_cash:store-1:optimize_listings",
    status: "ready_internal",
    storeId: "store-1",
    storeName: "Iron House Gym",
    summary: "Iron House Gym: ready internal path ranked 96/100. Next: Optimize listings."
  }, {
    blockers: ["Operator launch review required."],
    cashReadinessScore: 81,
    checklistItemId: "launch-checklist-store-2",
    expectedInternalEffect: "Final operator launch review requires direct operator approval before the cash path can advance.",
    externalExecution: false,
    finalRank: 72,
    incomeVelocityScore: 70,
    launchReadinessScore: 65,
    nextInternalAction: "Final operator launch review",
    nextInternalState: "Final operator launch review",
    priorityScore: 104,
    providerContacted: false,
    reason: "The revenue path is close enough for final operator launch review.",
    recommendedEndpoint: "/merch/revenue-engine/launch-readiness",
    riskLevel: "medium",
    sprintActionId: "first_cash:store-2:final_operator_launch_review",
    status: "manual_gate",
    storeId: "store-2",
    storeName: "Slow Lane Studio",
    summary: "Slow Lane Studio: manual gate path ranked 72/100. Next: Final operator launch review."
  }],
  externalExecution: false,
  generatedAt: "2026-06-03T00:40:00.000Z",
  launchPackage: {
    batchStage: {
      endpoint: "/merch/revenue-engine/money-army/batches/apply",
      expectedInternalEffect: "Deploy the selected first-business lane through internal First Business Launch and First Cash Sprint bridge controls.",
      name: "deployment",
      requiredConfirmation: "RUN INTERNAL MONEY ARMY BATCH PIPELINE"
    },
    blockedExternalActions: [
      "Publishing marketplace listings, creating provider-side products, uploading artwork or files, changing storefront settings, posting content, starting ads, or moving money"
    ],
    contentTieIns: [{
      briefId: "faceless-store-1-product-1",
      channelPackages: 3,
      hook: "Nobody sees the system behind Core Tee.",
      objective: "product_discovery",
      productId: "product-1",
      status: "draft_queued",
      title: "Iron House Gym Core Tee faceless short"
    }],
    externalExecution: false,
    manualApprovalGates: [
      "Approve the selected store/product package before any provider or marketplace write action.",
      "Approve faceless content script, caption, disclosure, and channel package before any posting.",
      "Approve any Ad/Growth spend separately; this launch package starts with no-spend organic traffic.",
      "Attach read-only performance evidence before scale rotation or budget release."
    ],
    organicTrafficPlan: {
      channels: ["youtube_shorts", "tiktok", "instagram_reels"],
      firstMoves: [
        "Prepare Core Tee listing and proof assets for manual launch review.",
        "Record and review Iron House Gym Core Tee faceless short for organic short-form distribution.",
        "Use organic channels first: product story short, marketplace listing polish, owned social post, and manual signal tracking.",
        "Queue read-only performance signal intake only after approved manual publication creates real metrics."
      ],
      noSpend: true,
      paidSpendLocked: true,
      summary: "4 organic-first moves prepared. Paid traffic stays locked until performance evidence and budget approval exist."
    },
    products: [{
      estimatedProfit: 42,
      listingTitle: "Core Tee",
      productId: "product-1",
      productName: "Core Tee",
      productType: "T-Shirt",
      profitMargin: 58,
      status: "Approved"
    }],
    providerContacted: false,
    store: {
      audience: "Strength athletes",
      businessName: "Iron House Gym",
      industry: "Fitness",
      launchStatus: "Building Store",
      storeId: "store-1",
      storePlatform: "Shopify"
    },
    summary: "Iron House Gym is packaged as the first practical revenue asset with 1 product candidate and 1 organic content tie-in."
  },
  mode: "Revenue Engine First Business Launch Path",
  providerContacted: false,
  sprint: {
    readyInternal: 1,
    summary: firstCashSprintPlan.summary
  },
  summary: "Iron House Gym is the top first-business launch path: ready internal, rank 96/100, next Optimize listings.",
  topCandidate: null,
  totals: {
    blocked: 0,
    candidates: 2,
    contentTieIns: 1,
    manualGates: 1,
    organicTrafficMoves: 4,
    productsPrepared: 1,
    readyInternal: 1,
    watch: 0
  }
};
firstBusinessLaunchPlan.topCandidate = firstBusinessLaunchPlan.candidates[0] ?? null;

function portfolioCommandResponse(plan: PortfolioCommandCenterPlan, dryRun: boolean): PortfolioCommandCenterApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-portfolio-command-1",
      assetControlActionsSkipped: 0,
      assetControlAuditLogId: dryRun ? null : "audit-portfolio-command-1",
      assetControlBatchReview: assetBatchActionResponse(revenuePlan, dryRun).batch.controlReview,
      assetControlRecordsCreated: 2,
      commandRecordsCreated: plan.commandActions.length,
      contentCommands: plan.commandActions.filter((command) => command.targetType === "content").length,
      dryRun,
      externalExecution: false,
      financeCommands: plan.commandActions.filter((command) => command.targetType === "finance").length,
      productUpdates: [{
        action: "kill",
        fromStatus: dryRun ? null : "Awaiting Approval",
        productId: "product-2",
        productName: "Weak Tee",
        toStatus: "Archived"
      }],
      providerContacted: false,
      storeUpdates: [{
        action: "pause",
        fromStatus: dryRun ? null : "Designing",
        storeId: "store-2",
        storeName: "Slow Lane Studio",
        toStatus: "Paused"
      }]
    },
    plan
  };
}

function launchPipelineResponse(plan: RevenueLaunchPipelinePlan, dryRun: boolean): RevenueLaunchPipelineApplyResponse {
  return {
    applied: {
      approvalPackets: dryRun
        ? [{ id: null, storeId: "store-2" }]
        : [{ auditLogId: "audit-launch-packet-1", id: "packet-launch-1", storeId: "store-2" }],
      auditLogId: dryRun ? null : "audit-launch-1",
      createdProducts: dryRun
        ? plan.totals.draftProductsNeeded
        : [
          { id: "created-product-1", productName: "Iron House Gym Founders Club T-shirt", storeId: "store-1" },
          { id: "created-product-2", productName: "Iron House Gym Local Legend Hoodie", storeId: "store-1" }
        ],
      dryRun,
      externalExecution: false,
      storeUpdates: [
        {
          action: "seed_products",
          storeId: "store-1",
          storeName: "Iron House Gym"
        },
        {
          action: "queue_launch_approval",
          storeId: "store-2",
          storeName: "Slow Lane Studio"
        }
      ]
    },
    plan
  };
}

const digitalProductPlan: DigitalProductPortfolioPlan = {
  auditEvents: [
    "Digital Product Portfolio evaluated internally.",
    "No digital marketplace, file host, email platform, payment system, or browser automation system was contacted."
  ],
  blockedExternalActions: [
    "Uploading digital files to a marketplace or file host",
    "Creating or publishing digital listings",
    "Starting email, funnel, social, or ad automation",
    "Moving money or issuing payouts"
  ],
  draftQueue: [
    {
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Draft only"
      },
      assetChecklist: ["Cover mockup", "Printable PDF pages", "Usage instructions"],
      assetPrompt: "Create an original Printable Planner digital product for Iron House Gym. Use only original copy, layouts, and visual concepts.",
      createProductInput: {
        aiDisclosureNeeded: true,
        colorDirection: "bold training aesthetic",
        complianceNotes: "Digital product draft.",
        designConcept: "Printable execution planner for independent gym members.",
        designPrompt: "Create an original printable planner.",
        designTheme: "Printable Planner / fitness",
        estimatedPlatformFees: 1.36,
        estimatedProfit: 15.64,
        listingDescription: "Printable planner for independent gym members.",
        listingTitle: "Iron House Gym Printable execution planner",
        mockupNotes: "Prepare digital preview images.",
        productName: "Iron House Gym Printable execution planner",
        productType: "Printable Planner",
        productionPartnerDisclosureNeeded: false,
        profitMargin: 92,
        retailPrice: 17,
        shippingCost: 0,
        status: "Prompt Ready",
        storeId: "store-1",
        supplierCost: 0,
        tags: ["Iron House Gym", "fitness", "Printable Planner"],
        targetAudience: "independent gym members",
        typographyDirection: "Readable headings"
      },
      deliveryChecklist: ["ZIP file with PDF and preview images"],
      estimatedProfit: 15.64,
      id: "digital-store-1-printable-planner",
      lane: {
        assetChecklist: ["Cover mockup", "Printable PDF pages", "Usage instructions"],
        category: "planner",
        deliveryChecklist: ["ZIP file with PDF and preview images"],
        format: "PDF + PNG preview pack",
        id: "printable_planner",
        launchChecklist: ["Confirm page count, print size, and bleed settings."],
        productType: "Printable Planner",
        recommendedPrice: 17,
        templateTitle: "Printable execution planner"
      },
      launchChecklist: ["Confirm page count, print size, and bleed settings."],
      listingDescription: "Printable planner for independent gym members.",
      listingTitle: "Iron House Gym Printable execution planner",
      productName: "Iron House Gym Printable execution planner",
      profitMargin: 92,
      retailPrice: 17,
      storeId: "store-1",
      storeName: "Iron House Gym"
    },
    {
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Draft only"
      },
      assetChecklist: ["Template workspace outline", "Setup instructions"],
      assetPrompt: "Create an original Notion Template digital product for Iron House Gym. Use only original copy, layouts, and visual concepts.",
      createProductInput: {
        aiDisclosureNeeded: true,
        colorDirection: "bold training aesthetic",
        complianceNotes: "Digital product draft.",
        designConcept: "Operating system template for independent gym members.",
        designPrompt: "Create an original Notion template.",
        designTheme: "Notion Template / fitness",
        estimatedPlatformFees: 2.32,
        estimatedProfit: 26.68,
        listingDescription: "Notion template for independent gym members.",
        listingTitle: "Iron House Gym Operating system template",
        mockupNotes: null,
        productName: "Iron House Gym Operating system template",
        productType: "Notion Template",
        productionPartnerDisclosureNeeded: false,
        profitMargin: 92,
        retailPrice: 29,
        shippingCost: 0,
        status: "Prompt Ready",
        storeId: "store-1",
        supplierCost: 0,
        tags: ["Iron House Gym", "fitness", "Notion Template"],
        targetAudience: "independent gym members",
        typographyDirection: "Readable headings"
      },
      deliveryChecklist: ["Template access instructions"],
      estimatedProfit: 26.68,
      id: "digital-store-1-notion-template",
      lane: {
        assetChecklist: ["Template workspace outline", "Setup instructions"],
        category: "template",
        deliveryChecklist: ["Template access instructions"],
        format: "Template link + PDF guide",
        id: "notion_template",
        launchChecklist: ["Confirm template fields are generic, original, and reusable."],
        productType: "Notion Template",
        recommendedPrice: 29,
        templateTitle: "Operating system template"
      },
      launchChecklist: ["Confirm template fields are generic, original, and reusable."],
      listingDescription: "Notion template for independent gym members.",
      listingTitle: "Iron House Gym Operating system template",
      productName: "Iron House Gym Operating system template",
      profitMargin: 92,
      retailPrice: 29,
      storeId: "store-1",
      storeName: "Iron House Gym"
    }
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Digital Product Portfolio",
  options: {
    includeLeadMagnets: true,
    maxStores: 5,
    minDigitalProductsPerStore: 3,
    productsPerStore: 5,
    riskTolerance: "Low"
  },
  storePlans: [
    {
      action: "seed_digital_products",
      digitalLanes: [],
      existingDigitalProducts: 0,
      externalExecution: false,
      missingDigitalProducts: 3,
      priority: 1,
      queuedDrafts: [],
      reason: "Iron House Gym can add 2 high-margin digital product drafts without supplier or shipping cost.",
      readinessScore: 88,
      storeId: "store-1",
      storeName: "Iron House Gym"
    }
  ],
  summary: "1 stores evaluated. 2 digital product drafts queued with estimated draft profit 42.32.",
  totals: {
    digitalProductsExisting: 0,
    estimatedDraftProfit: 42.32,
    queuedDrafts: 2,
    storesEvaluated: 1,
    storesQueued: 1,
    templateCount: 2
  }
};

function digitalProductResponse(plan: DigitalProductPortfolioPlan, dryRun: boolean): DigitalProductApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-digital-1",
      createdProducts: dryRun
        ? plan.totals.queuedDrafts
        : [
          { id: "digital-product-1", productName: "Iron House Gym Printable execution planner", storeId: "store-1" },
          { id: "digital-product-2", productName: "Iron House Gym Operating system template", storeId: "store-1" }
        ],
      dryRun,
      externalExecution: false,
      storeUpdates: [
        {
          addedProductTypes: ["Printable Planner", "Notion Template"],
          approvalStatus: "Designs Pending",
          launchStatus: "Designing",
          storeId: "store-1",
          storeName: "Iron House Gym"
        }
      ]
    },
    plan
  };
}

const facelessContentDigest: FacelessContentPerformanceDigest = {
  contentScores: [
    {
      action: "scale_remix",
      channel: "youtube_shorts",
      clickRate: 4.2,
      contentBriefId: "content-brief-1",
      conversionRate: 10,
      netRevenue: 84,
      reason: "Content has enough clicks and positive net revenue for remix planning.",
      retentionSeconds: 13,
      views: 1400
    }
  ],
  summary: "1 content performance snapshot evaluated. 1 scale remix candidate and 0 hook revision candidates found.",
  totals: {
    clicks: 40,
    conversions: 4,
    cost: 12,
    netRevenue: 84,
    snapshots: 1,
    views: 1400,
    watchSeconds: 18200
  }
};

const facelessContentPlan: FacelessContentPipelinePlan = {
  auditEvents: [
    "Faceless Content Pipeline generated internal content briefs and provider manifests.",
    "No AI video, voiceover, social, analytics, browser, or upload provider was contacted."
  ],
  blockedExternalActions: [
    "Calling Runway, Kling, Luma, ElevenLabs, YouTube, TikTok, Instagram, Meta, Google, or analytics APIs",
    "Uploading, scheduling, publishing, deleting, or editing social content",
    "Using browser stealth, anti-detection, proxy rotation, or platform-evasion automation"
  ],
  briefs: [
    {
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Required"
      },
      blockedActions: [
        "Calling Runway, Kling, Luma, ElevenLabs, YouTube, TikTok, Instagram, Meta, Google, or analytics APIs"
      ],
      channelPackages: [
        {
          aspectRatio: "9:16",
          caption: "Nobody sees the system behind Core Tee. #ironhousegym #originalmerch",
          channel: "youtube_shorts",
          description: "Internal upload package only.",
          durationSeconds: 28,
          externalExecution: false,
          hashtags: ["#ironhousegym", "#originalmerch"],
          providerContacted: false,
          title: "Iron House Gym Core Tee faceless short | YouTube Shorts",
          uploadState: "approval_required"
        }
      ],
      concept: {
        angle: "Show the hidden operating system behind the T-shirt instead of a person talking to camera.",
        hook: "Nobody sees the system behind Core Tee.",
        objective: "scale_remix",
        targetAudience: "independent gym members"
      },
      dedupeKey: "faceless:store-1:product-1:youtube_shorts:v1",
      estimatedRevenueImpact: 24,
      externalExecution: false,
      id: "faceless-store-1-product-1",
      priority: 5,
      productId: "product-1",
      productName: "Core Tee",
      providerReadiness: [
        {
          blockedReason: "Video generation provider calls require explicit connector approval, budget limits, and asset review.",
          provider: "Runway",
          providerContacted: false,
          requiredApproval: "Approve read/write video-generation connector scope and per-job cost ceiling.",
          status: "not_connected"
        }
      ],
      recordState: "new",
      script: {
        caption: "Nobody sees the system behind Core Tee.",
        hookLine: "Nobody sees the system behind Core Tee.",
        narration: ["Nobody sees the system behind Core Tee."],
        onScreenText: ["Original product lane"]
      },
      status: "draft_queued",
      storeId: "store-1",
      storeName: "Iron House Gym",
      storyboard: [
        {
          beat: "Open with product proof",
          durationSeconds: 4,
          visualDirection: "Close-up product mockup"
        }
      ],
      targetChannels: ["youtube_shorts"],
      title: "Iron House Gym Core Tee faceless short",
      videoSpec: {
        assetRequirements: ["Approved product mockup"],
        motionDirection: "Crisp faceless edits.",
        primaryProviders: ["Runway", "Kling", "Luma"],
        prompt: "Create a 9:16 faceless short for Iron House Gym.",
        providerContacted: false,
        status: "draft_only"
      },
      voiceoverSpec: {
        delivery: "calm, premium, direct, under 30 seconds",
        provider: "ElevenLabs",
        providerContacted: false,
        scriptWordCount: 8,
        status: "draft_only",
        voiceDirection: "low-hype operator narration"
      }
    }
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Faceless Content Pipeline",
  options: {
    briefsPerStore: 3,
    includeChannelPackages: true,
    includeVideoSpecs: true,
    includeVoiceoverSpecs: true,
    maxStores: 5,
    minClicksForScale: 25,
    minViewsForRemix: 500,
    targetChannels: ["youtube_shorts"],
    windowDays: 30
  },
  performanceDigest: facelessContentDigest,
  providerReadiness: [
    {
      blockedReason: "Video generation provider calls require explicit connector approval, budget limits, and asset review.",
      provider: "Runway",
      providerContacted: false,
      requiredApproval: "Approve read/write video-generation connector scope and per-job cost ceiling.",
      status: "not_connected"
    },
    {
      blockedReason: "Voiceover generation requires explicit connector approval and voice/style review.",
      provider: "ElevenLabs",
      providerContacted: false,
      requiredApproval: "Approve voiceover connector scope, cost ceiling, and voice identity policy.",
      status: "not_connected"
    }
  ],
  summary: "1 faceless content brief prepared across 1 store. 1 new brief can be recorded internally. Provider calls and uploads remain locked.",
  totals: {
    channelPackages: 1,
    existingBriefs: 0,
    newBriefs: 1,
    providerManifests: 2,
    storesEvaluated: 1,
    videoSpecs: 1,
    voiceoverSpecs: 1
  }
};

function facelessContentResponse(plan: FacelessContentPipelinePlan, dryRun: boolean): FacelessContentPipelineApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-content-1",
      briefsCreated: plan.totals.newBriefs,
      dryRun,
      externalExecution: false,
      providerContacted: false
    },
    plan
  };
}

const listingOptimizationPlan: RevenueListingOptimizationPlan = {
  auditEvents: [
    "Listing optimization queue generated inside ENTRAL.",
    "No marketplace listing, Shopify product, POD provider product, ad, social, payment, or browser automation system was contacted."
  ],
  blockedExternalActions: [
    "Publishing or editing Etsy listings",
    "Publishing or editing Shopify products",
    "Changing Printify or Printful product data",
    "Using browser stealth, anti-detection, or platform-evasion automation"
  ],
  experiments: [
    {
      action: "write_missing_copy",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Internal listing fields can be updated only after this confirmation. Marketplace publishing remains locked.",
        status: "Internal draft only"
      },
      currentListing: {
        description: null,
        retailPrice: 32,
        tags: ["fitness"],
        title: null
      },
      evidence: {
        conversionRate: 0,
        evidenceGrade: "none",
        profitVelocity: 0,
        snapshots: 0,
        unitsSold: 0,
        visits: 0
      },
      externalExecution: false,
      id: "listing_experiment_product-1_write_missing_copy",
      priority: 4,
      productId: "product-1",
      productName: "Core Tee",
      productType: "T-shirt",
      reason: "Product is missing complete listing copy, enough tags, or both.",
      recommendedInternalStatus: "Listing Drafted",
      recommendedVariant: {
        description: "Core Tee is an original T-shirt concept for independent gym members.",
        estimatedPlatformFees: 3.63,
        estimatedProfit: 13.37,
        hypothesis: "Search-ready copy should close listing-copy gaps before approval.",
        id: "listing_variant_product-1_search-ready-copy_1",
        label: "Search-ready copy",
        mockupNotes: "Prepare listing preview images for Core Tee; verify readability at thumbnail size.",
        priceChangePercent: 0,
        profitMargin: 41.8,
        retailPrice: 32,
        score: 89,
        tags: ["iron house gym", "fitness", "t-shirt", "core tee", "search-ready copy"],
        title: "Iron House Gym Original operator series T-shirt"
      },
      storeId: "store-1",
      storeName: "Iron House Gym",
      variants: [
        {
          description: "Core Tee is an original T-shirt concept for independent gym members.",
          estimatedPlatformFees: 3.63,
          estimatedProfit: 13.37,
          hypothesis: "Search-ready copy should close listing-copy gaps before approval.",
          id: "listing_variant_product-1_search-ready-copy_1",
          label: "Search-ready copy",
          mockupNotes: "Prepare listing preview images for Core Tee; verify readability at thumbnail size.",
          priceChangePercent: 0,
          profitMargin: 41.8,
          retailPrice: 32,
          score: 89,
          tags: ["iron house gym", "fitness", "t-shirt", "core tee", "search-ready copy"],
          title: "Iron House Gym Original operator series T-shirt"
        },
        {
          description: "Core Tee is an original T-shirt concept for independent gym members.",
          estimatedPlatformFees: 3.72,
          estimatedProfit: 14.32,
          hypothesis: "Audience-fit copy should close listing-copy gaps before approval.",
          id: "listing_variant_product-1_audience-fit-copy_2",
          label: "Audience-fit copy",
          mockupNotes: "Prepare listing preview images for Core Tee; emphasize audience fit.",
          priceChangePercent: 3,
          profitMargin: 43.4,
          retailPrice: 32.96,
          score: 86,
          tags: ["iron house gym", "independent gym members", "t-shirt"],
          title: "T-shirt for independent gym members - Iron House Gym"
        }
      ]
    }
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Listing Optimization Queue",
  options: {
    includePricingExperiments: true,
    maxPriceIncreasePercent: 20,
    maxProducts: 10,
    minProfitMargin: 25,
    minVisitsForPerformanceExperiment: 50,
    variantsPerProduct: 3,
    windowDays: 30
  },
  summary: "4 products evaluated. 1 listing experiment queued, 0 backed by performance data, and 0 include price changes.",
  totals: {
    estimatedProfitLift: 6.97,
    experimentsQueued: 1,
    missingCopyProducts: 1,
    performanceBackedExperiments: 0,
    priceExperiments: 0,
    productsEvaluated: 4,
    variantsGenerated: 2
  }
};

function listingOptimizationResponse(plan: RevenueListingOptimizationPlan, dryRun: boolean): RevenueListingOptimizationApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-listing-1",
      dryRun,
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
  };
}

const storeSetupPlan: RevenueStoreSetupPlan = {
  auditEvents: [
    "Store setup runbook generated inside ENTRAL.",
    "No marketplace, POD provider, payment provider, analytics provider, browser, or storefront admin was contacted."
  ],
  blockedExternalActions: [
    "Creating or editing Shopify stores, collections, products, pages, themes, or navigation",
    "Creating or editing Etsy shops or listings",
    "Connecting payment, banking, payout, analytics, ad, email, or social accounts",
    "Using browser stealth, anti-detection, or platform-evasion automation"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Store Setup Runbook",
  options: {
    includeCredentialScopes: true,
    maxStores: 10,
    minApprovedProducts: 2,
    minConnectorReadiness: 75,
    minListingReadyProducts: 2
  },
  queue: [
    {
      action: "prepare_store_setup",
      externalExecution: false,
      id: "store_setup_prepare_store_setup_store-1",
      priority: 2,
      storeId: "store-1",
      summary: "Iron House Gym has 2 approved products and 2 listing-ready products; prepare the internal storefront setup runbook.",
      title: "Prepare store setup runbook for Iron House Gym"
    }
  ],
  runbooks: [
    {
      action: "prepare_store_setup",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Iron House Gym has 2 approved products and 2 listing-ready products; prepare the internal storefront setup runbook.",
        status: "Required"
      },
      collectionBlueprints: [
        {
          handle: "iron-house-gym-launch",
          id: "collection-store-1-launch",
          manualSteps: ["Create collection in draft/unpublished state only."],
          productTypes: ["T-shirt", "Hoodie"],
          rule: "Include all approved, listing-ready launch products for the storefront opening collection.",
          title: "Iron House Gym Launch Collection"
        },
        {
          handle: "iron-house-gym-t-shirt",
          id: "collection-store-1-t-shirt",
          manualSteps: ["Create a draft T-shirt collection only after final approval."],
          productTypes: ["T-shirt"],
          rule: "Include approved products where product type contains T-shirt.",
          title: "Iron House Gym T-shirt"
        }
      ],
      credentialScopes: [
        {
          provider: "Shopify",
          reason: "Future draft product and collection handoff requires explicit write scope approval.",
          scope: "write_products",
          status: "Approval required"
        },
        {
          provider: "Printify",
          reason: "POD product payloads require shop and product scope review before provider connector use.",
          scope: "shops:read products:write",
          status: "Approval required"
        }
      ],
      externalExecution: false,
      id: "store_setup_runbook_store-1",
      launchReadiness: {
        readyListingProducts: 2,
        readyProducts: 2,
        requiredListingProducts: 2,
        status: "Ready for internal setup"
      },
      manualConnectorReadiness: {
        requiredBeforeConnector: [
          "Approve every storefront setting and collection blueprint.",
          "Approve credential owner, least-privilege scopes, rollback owner, and audit owner."
        ],
        score: 78,
        status: "Needs review"
      },
      priority: 2,
      productLaneTargets: [
        {
          listingReadyProductIds: ["product-1"],
          missingProducts: 0,
          priority: 1,
          productType: "T-shirt",
          readyProducts: 1,
          requiredProducts: 1
        }
      ],
      reason: "Iron House Gym has 2 approved products and 2 listing-ready products; prepare the internal storefront setup runbook.",
      readinessScore: 78,
      recommendedLaunchStatus: "Building Store",
      setupSteps: [
        {
          category: "identity",
          checklist: ["Confirm store name, support identity, and brand positioning."],
          evidenceRequired: ["Store name approval"],
          externalExecution: false,
          id: "setup-store-1-identity",
          status: "ready",
          title: "Store identity review"
        }
      ],
      storeId: "store-1",
      storeName: "Iron House Gym",
      storePlatform: "Shopify",
      storefrontSettings: [
        {
          approvalRequired: true,
          evidence: "Uses the internal Client Merch Store business name.",
          key: "store_name",
          label: "Store Name",
          recommendedValue: "Iron House Gym"
        },
        {
          approvalRequired: true,
          evidence: "Derived from brand style and audience fields.",
          key: "brand_positioning",
          label: "Brand Positioning",
          recommendedValue: "bold training aesthetic. Built for independent gym members."
        }
      ]
    }
  ],
  summary: "1 stores evaluated. 1 store setup runbook queued, 0 ready for connector review, and 1 can move to internal Building Store status.",
  totals: {
    collectionBlueprints: 2,
    credentialScopes: 2,
    readyForConnector: 0,
    runbooksQueued: 1,
    storefrontSettings: 2,
    storesEvaluated: 1,
    storesMovingToBuild: 1
  }
};

function storeSetupResponse(plan: RevenueStoreSetupPlan, dryRun: boolean): RevenueStoreSetupApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-store-setup-1",
      dryRun,
      externalExecution: false,
      storeUpdates: plan.runbooks
        .filter((runbook) => runbook.action !== "hold")
        .map((runbook) => ({
          action: runbook.action,
          fromStatus: "Designing",
          readinessScore: runbook.readinessScore,
          storeId: runbook.storeId,
          storeName: runbook.storeName,
          toStatus: runbook.recommendedLaunchStatus
        }))
    },
    plan
  };
}

const financialPlan: FinancialOrchestratorPlan = {
  allocationBuckets: [
    {
      amount: 75,
      category: "scaling",
      destinationType: "ad_growth_budget",
      label: "Ad/Growth bucket",
      payoutIntentAmount: 75,
      percent: 25,
      purpose: "Fund advisory-only ad, growth, content distribution, creative testing, and validated scaling loops.",
      retainedAmount: 0,
      role: "ad_growth",
      status: "intent_ready"
    },
    {
      amount: 150,
      category: "personal",
      destinationType: "owner_distribution",
      label: "Owner income",
      payoutIntentAmount: 150,
      percent: 50,
      purpose: "Reserve owner-income distribution until explicit payout approval exists.",
      retainedAmount: 0,
      role: "owner_income",
      status: "intent_ready"
    },
    {
      amount: 75,
      category: "buffer",
      destinationType: "entral_tech_operations",
      label: "Entral operations",
      payoutIntentAmount: 75,
      percent: 25,
      purpose: "Fund Entral technology, operations, infrastructure, tooling, and internal execution overhead.",
      retainedAmount: 0,
      role: "entral_operations",
      status: "intent_ready"
    }
  ],
  auditEvents: [
    "Financial Orchestrator plan generated from internal revenue performance snapshots.",
    "Payout intents are approval-required records only; no provider or bank was contacted."
  ],
  blockedExternalActions: [
    "Moving money or issuing payouts",
    "Calling Stripe Treasury, Stripe Connect, bank, card, or payment write APIs",
    "Creating, changing, or verifying bank accounts, cards, balances, or payout schedules"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  ledgerEntries: [
    {
      allocatableProfit: 300,
      allocation: {
        buffer: 75,
        personal: 150,
        scaling: 75
      },
      currency: "USD",
      externalExecution: false,
      grossRevenue: 500,
      id: "ledger_snapshot_profit_1",
      netProfit: 300,
      periodEnd: "2026-06-02T00:00:00.000Z",
      periodStart: "2026-05-26T00:00:00.000Z",
      productId: "product-1",
      productName: "Core Tee",
      recordState: "new",
      revenuePerformanceSnapshotId: "snapshot-profit-1",
      source: "manual",
      status: "allocatable",
      storeId: "store-1",
      storeName: "Iron House Gym"
    }
  ],
  mode: "Internal Financial Orchestrator",
  options: {
    bufferPercent: 25,
    currency: "USD",
    includePayoutIntents: true,
    minPayoutIntentAmount: 25,
    personalPercent: 50,
    reserveFloorAmount: 0,
    scalingPercent: 25,
    windowDays: 30
  },
  payoutIntents: [
    {
      amount: 75,
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Financial Orchestrator records payout intent only. Stripe Treasury, Connect, and bank movement require a future explicit approval path.",
        status: "Required"
      },
      category: "scaling",
      currency: "USD",
      dedupeKey: "dedupe-scaling",
      destinationType: "ad_growth_budget",
      externalExecution: false,
      id: "payout_scaling_75",
      provider: "Stripe Treasury + Connect",
      sourceLedgerEntryIds: ["ledger_snapshot_profit_1"],
      status: "approval_required",
      title: "Ad/Growth bucket payout intent"
    },
    {
      amount: 150,
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Financial Orchestrator records payout intent only. Stripe Treasury, Connect, and bank movement require a future explicit approval path.",
        status: "Required"
      },
      category: "personal",
      currency: "USD",
      dedupeKey: "dedupe-personal",
      destinationType: "owner_distribution",
      externalExecution: false,
      id: "payout_personal_150",
      provider: "Stripe Treasury + Connect",
      sourceLedgerEntryIds: ["ledger_snapshot_profit_1"],
      status: "approval_required",
      title: "Owner income payout intent"
    },
    {
      amount: 75,
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Financial Orchestrator records payout intent only. Stripe Treasury, Connect, and bank movement require a future explicit approval path.",
        status: "Required"
      },
      category: "buffer",
      currency: "USD",
      dedupeKey: "dedupe-buffer",
      destinationType: "entral_tech_operations",
      externalExecution: false,
      id: "payout_buffer_75",
      provider: "Stripe Treasury + Connect",
      sourceLedgerEntryIds: ["ledger_snapshot_profit_1"],
      status: "approval_required",
      title: "Entral operations payout intent"
    }
  ],
  policyChecks: [
    {
      message: "Owner income, Entral operations, and Ad/Growth percentages add to exactly 100%.",
      status: "pass",
      title: "25/25/50 split balance"
    },
    {
      message: "Payout intents require at least $25.00 in a bucket.",
      status: "pass",
      title: "Payout threshold"
    }
  ],
  portfolioSignal: {
    assetCommandsReady: 2,
    killRecommendations: 0,
    killPressure: {
      advisoryOnly: true,
      assets: [],
      level: "none",
      pressureScore: 0,
      reason: "No scored assets currently create kill pressure for finance allocation.",
      source: "revenue_engine_scored_portfolio"
    },
    pauseRecommendations: 0,
    profitVelocity: 42.86,
    recommendation: "scale_reinvestment_review",
    reason: "2 scored assets can use scaling capital review with $42.86 daily profit velocity. Scale pressure is high at 86/100.",
    revenueVelocity: 71.43,
    scalePressure: {
      advisoryOnly: true,
      assets: [
        {
          assetId: "product-1",
          assetName: "Core Tee",
          assetType: "product",
          finalRank: 88,
          profitVelocity: 28.57,
          reason: "Validated scale asset with excellent rank 88 and 28.57 daily profit velocity.",
          recommendation: "scale",
          riskLevel: "low",
          scoreBand: "excellent"
        },
        {
          assetId: "store-1",
          assetName: "Iron House Gym",
          assetType: "store",
          finalRank: 76,
          profitVelocity: 14.29,
          reason: "Validated scale asset with healthy rank 76 and 14.29 daily profit velocity.",
          recommendation: "scale",
          riskLevel: "low",
          scoreBand: "healthy"
        }
      ],
      level: "high",
      pressureScore: 86,
      reason: "2 scored assets are pressing for scaling review; top asset Core Tee ranks 88/100 with $28.57/day profit velocity.",
      source: "revenue_engine_scored_portfolio"
    },
    scaleRecommendations: 2,
    trackedAssets: 2
  },
  advisoryContext: {
    advisoryOnly: true,
    killPressure: {
      advisoryOnly: true,
      assets: [],
      level: "none",
      pressureScore: 0,
      reason: "No scored assets currently create kill pressure for finance allocation.",
      source: "revenue_engine_scored_portfolio"
    },
    posture: "scale_review",
    scalePressure: {
      advisoryOnly: true,
      assets: [
        {
          assetId: "product-1",
          assetName: "Core Tee",
          assetType: "product",
          finalRank: 88,
          profitVelocity: 28.57,
          reason: "Validated scale asset with excellent rank 88 and 28.57 daily profit velocity.",
          recommendation: "scale",
          riskLevel: "low",
          scoreBand: "excellent"
        },
        {
          assetId: "store-1",
          assetName: "Iron House Gym",
          assetType: "store",
          finalRank: 76,
          profitVelocity: 14.29,
          reason: "Validated scale asset with healthy rank 76 and 14.29 daily profit velocity.",
          recommendation: "scale",
          riskLevel: "low",
          scoreBand: "healthy"
        }
      ],
      level: "high",
      pressureScore: 86,
      reason: "2 scored assets are pressing for scaling review; top asset Core Tee ranks 88/100 with $28.57/day profit velocity.",
      source: "revenue_engine_scored_portfolio"
    },
    signal: "scale_reinvestment_review",
    source: "revenue_engine_scored_portfolio",
    summary: "Revenue Engine scoring is attached as advisory finance context: high scale pressure at 86/100 and none kill pressure at 0/100. 2 scored assets can use scaling capital review with $42.86 daily profit velocity. Scale pressure is high at 86/100."
  },
  adGrowthAllocation: {
    advisoryOnly: true,
    bucketAmount: 75,
    guardrails: [
      "Organic content, listing, and marketplace optimization are prioritized before paid spend while capital is limited.",
      "Every Ad/Growth packet is advisory-only until separate manual approval, spend cap, creative review, and outcome tracking exist."
    ],
    killPressure: {
      advisoryOnly: true,
      assets: [],
      level: "none",
      pressureScore: 0,
      reason: "No scored assets currently create kill pressure for finance allocation.",
      source: "revenue_engine_scored_portfolio"
    },
    mode: "organic_first",
    organicFirstAmount: 60,
    paidScaleReviewAmount: 0,
    pressureDecision: {
      advisoryOnly: true,
      decision: "organic_first",
      guardrail: "The 25% Ad/Growth bucket is advisory-only; pressure signals can queue internal packets, retain capital, or require review, but cannot spend or call providers.",
      killPressureScore: 0,
      reason: "Scale pressure 86/100 supports organic-first growth packets. Kill pressure 0/100 does not block, but paid spend remains locked.",
      recommendedSpendPriority: "no_spend",
      scalePressureScore: 86,
      source: "revenue_engine_scored_portfolio"
    },
    retainedAmount: 15,
    scalePressure: {
      advisoryOnly: true,
      assets: [
        {
          assetId: "product-1",
          assetName: "Core Tee",
          assetType: "product",
          finalRank: 88,
          profitVelocity: 28.57,
          reason: "Validated scale asset with excellent rank 88 and 28.57 daily profit velocity.",
          recommendation: "scale",
          riskLevel: "low",
          scoreBand: "excellent"
        }
      ],
      level: "high",
      pressureScore: 86,
      reason: "2 scored assets are pressing for scaling review; top asset Core Tee ranks 88/100 with $28.57/day profit velocity.",
      source: "revenue_engine_scored_portfolio"
    },
    summary: "60.00 is queued for organic-first growth prep from the fixed 25% Ad/Growth bucket; paid spend remains locked."
  },
  riskFlags: [],
  scalingBudgetQueue: [
    {
      allocationLane: "organic_growth",
      amount: 30,
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Ad/Growth budget packet is an internal allocation only. Spend, payouts, provider calls, uploads, ads, and browser automation require separate approval.",
        status: "Required"
      },
      assetId: "product-1",
      assetName: "Core Tee",
      assetType: "product",
      blockedExternalActions: ["Moving money or issuing payouts"],
      budgetCap: {
        maxPerAssetAmount: 30,
        retainedScalingCapital: 15,
        totalScalingCapital: 75
      },
      confidence: 94,
      dedupeKey: "dedupe-scale-product-1",
      externalExecution: false,
      id: "scale_budget_product_1",
      organicFirst: true,
      performanceBasis: {
        evidenceGrade: "strong",
        killPressureScore: 0,
        scalePressureScore: 86,
        snapshots: 4
      },
      priority: 10,
      profitVelocity: 28.57,
      providerContacted: false,
      reason: "Validated scale asset with excellent rank 88 and 28.57 daily profit velocity.",
      recommendedChannel: "organic_content",
      score: 88,
      scoreBand: "excellent",
      spendPriority: "no_spend",
      status: "approval_required",
      storeId: "store-1",
      storeName: "Iron House Gym"
    },
    {
      allocationLane: "organic_growth",
      amount: 30,
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Ad/Growth budget packet is an internal allocation only. Spend, payouts, provider calls, uploads, ads, and browser automation require separate approval.",
        status: "Required"
      },
      assetId: "store-1",
      assetName: "Iron House Gym",
      assetType: "store",
      blockedExternalActions: ["Moving money or issuing payouts"],
      budgetCap: {
        maxPerAssetAmount: 30,
        retainedScalingCapital: 15,
        totalScalingCapital: 75
      },
      confidence: 90,
      dedupeKey: "dedupe-scale-store-1",
      externalExecution: false,
      id: "scale_budget_store_1",
      organicFirst: true,
      performanceBasis: {
        evidenceGrade: "usable",
        killPressureScore: 0,
        scalePressureScore: 86,
        snapshots: 3
      },
      priority: 12,
      profitVelocity: 14.29,
      providerContacted: false,
      reason: "Validated scale asset with healthy rank 76 and 14.29 daily profit velocity.",
      recommendedChannel: "organic_content",
      score: 76,
      scoreBand: "healthy",
      spendPriority: "no_spend",
      status: "approval_required",
      storeId: "store-1",
      storeName: "Iron House Gym"
    }
  ],
  splitPolicy: {
    adGrowthPercent: 25,
    bufferPercent: 25,
    currency: "USD",
    entralOperationsPercent: 25,
    minPayoutIntentAmount: 25,
    ownerPercent: 50,
    personalPercent: 50,
    reserveFloorAmount: 0,
    scalingPercent: 25,
    status: "balanced",
    totalPercent: 100
  },
  summary: "1 income snapshot evaluated. 3 payout intents prepared from exact 25/25/50 split: 25% Ad/Growth, 25% Entral operations, 50% owner income with USD 300.00 distributable profit.",
  totals: {
    allocatableProfit: 300,
    alreadyRecordedLedgerEntries: 0,
    adGrowthAmount: 75,
    bufferAmount: 75,
    distributableProfit: 300,
    entralOperationsAmount: 75,
    grossRevenue: 500,
    ledgerEntries: 1,
    netProfit: 300,
    ownerAmount: 150,
    payoutIntentAmount: 300,
    payoutIntents: 3,
    personalAmount: 150,
    portfolioAssetCommandsReady: 2,
    portfolioKillPressure: 0,
    portfolioProfitVelocity: 42.86,
    portfolioScalePressure: 86,
    portfolioScaleRecommendations: 2,
    reserveHeld: 0,
    scalingBudgetAmount: 60,
    scalingBudgetPackets: 2,
    scalingBudgetRetainedAmount: 15,
    scalingAmount: 75,
    snapshots: 1,
    storesTracked: 1
  }
};

function financialResponse(plan: FinancialOrchestratorPlan, dryRun: boolean): FinancialOrchestratorApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-finance-1",
      dryRun,
      externalExecution: false,
      ledgerEntriesCreated: plan.ledgerEntries.filter((entry) => entry.recordState === "new").length,
      payoutIntentsCreated: plan.payoutIntents.length,
      policyId: dryRun ? null : "fin-policy-1",
      scalingBudgetPackets: plan.scalingBudgetQueue.length
    },
    plan
  };
}

const financialReviewPlan: FinancialPayoutReviewPlan = {
  auditEvents: [
    "Financial payout review center generated from internal payout intent records.",
    "Budget release packets are internal review artifacts only."
  ],
  blockedExternalActions: [
    "Moving money or issuing payouts",
    "Calling Stripe Treasury, Stripe Connect, bank, card, payment, payout, transfer, or balance APIs",
    "Creating, changing, verifying, or deleting external financial accounts"
  ],
  budgetReleasePackets: [
    {
      amount: 75,
      approvalState: "approval_required",
      blockedActions: ["Moving money or issuing payouts"],
      category: "scaling",
      controls: ["Verify the payout intent traces back to recorded internal ledger entries.", "Attach an approved Ad/Growth budget before spending this amount."],
      currency: "USD",
      destinationType: "ad_growth_budget",
      externalExecution: false,
      id: "release-intent-scaling",
      intentId: "intent-scaling",
      maxReleaseAmount: 75,
      purpose: "Release Ad/Growth bucket capital for approved creative testing, distribution experiments, and validated growth loops only.",
      releaseState: "locked_review",
      title: "Ad/Growth bucket release packet"
    },
    {
      amount: 150,
      approvalState: "approval_required",
      blockedActions: ["Moving money or issuing payouts"],
      category: "personal",
      controls: ["Verify the payout intent traces back to recorded internal ledger entries."],
      currency: "USD",
      destinationType: "owner_distribution",
      externalExecution: false,
      id: "release-intent-personal",
      intentId: "intent-personal",
      maxReleaseAmount: 150,
      purpose: "Prepare owner-income distribution evidence for manual review without initiating a transfer.",
      releaseState: "locked_review",
      title: "Owner income release packet"
    }
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Payout Review Center",
  reconciliation: {
    approvedAmount: 0,
    pendingAmount: 300,
    rejectedAmount: 0,
    totalAmount: 300,
    variance: 0
  },
  reviewQueue: [
    {
      amount: 75,
      approvalRequired: true,
      category: "scaling",
      createdAt: "2026-06-02T00:00:00.000Z",
      currency: "USD",
      destinationType: "ad_growth_budget",
      externalExecution: false,
      id: "intent-scaling",
      provider: "Stripe Treasury + Connect",
      recommendedAction: "review",
      riskLevel: "medium",
      status: "approval_required",
      title: "Ad/Growth bucket payout review",
      updatedAt: "2026-06-02T00:00:00.000Z"
    },
    {
      amount: 150,
      approvalRequired: true,
      category: "personal",
      createdAt: "2026-06-02T00:00:00.000Z",
      currency: "USD",
      destinationType: "owner_distribution",
      externalExecution: false,
      id: "intent-personal",
      provider: "Stripe Treasury + Connect",
      recommendedAction: "review",
      riskLevel: "high",
      status: "approval_required",
      title: "Owner income payout review",
      updatedAt: "2026-06-02T00:00:00.000Z"
    },
    {
      amount: 75,
      approvalRequired: true,
      category: "buffer",
      createdAt: "2026-06-02T00:00:00.000Z",
      currency: "USD",
      destinationType: "entral_tech_operations",
      externalExecution: false,
      id: "intent-buffer",
      provider: "Stripe Treasury + Connect",
      recommendedAction: "review",
      riskLevel: "low",
      status: "approval_required",
      title: "Entral operations payout review",
      updatedAt: "2026-06-02T00:00:00.000Z"
    }
  ],
  stripeReadiness: {
    connectorStatus: "not_connected",
    externalExecution: false,
    provider: "Stripe Treasury + Connect",
    requiredApprovals: ["Approve least-privilege credential owner."],
    requiredScopes: [
      {
        mode: "readiness_only",
        reason: "Needed for future read-only balance and reconciliation checks.",
        scope: "balance.read",
        status: "blocked"
      },
      {
        mode: "readiness_only",
        reason: "Needed only after payout execution policy exists; currently blocked.",
        scope: "treasury.outbound_payments.write",
        status: "blocked"
      }
    ],
    status: "readiness_manifest_only"
  },
  summary: "3 payout intents reviewed. 3 pending, 0 approved for manual handoff, and 0 rejected or voided. External financial execution remains locked.",
  totals: {
    approved: 0,
    approvedAmount: 0,
    pending: 3,
    pendingAmount: 300,
    rejected: 0,
    rejectedAmount: 0,
    reviewItems: 3,
    totalAmount: 300
  }
};

const approvedFinancialReviewPlan: FinancialPayoutReviewPlan = {
  ...financialReviewPlan,
  reconciliation: {
    approvedAmount: 75,
    pendingAmount: 225,
    rejectedAmount: 0,
    totalAmount: 300,
    variance: 0
  },
  reviewQueue: financialReviewPlan.reviewQueue.map((item) => item.id === "intent-scaling"
    ? {
      ...item,
      recommendedAction: "manual_handoff",
      status: "approved_manual_handoff"
    }
    : item),
  summary: "3 payout intents reviewed. 2 pending, 1 approved for manual handoff, and 0 rejected or voided. External financial execution remains locked.",
  totals: {
    approved: 1,
    approvedAmount: 75,
    pending: 2,
    pendingAmount: 225,
    rejected: 0,
    rejectedAmount: 0,
    reviewItems: 3,
    totalAmount: 300
  }
};

const financialReviewApplyResponse: FinancialPayoutReviewApplyResponse = {
  auditLogId: "audit-finance-review-1",
  externalExecution: false,
  intent: {
    amount: 75,
    approvalRequired: true,
    auditLogId: "audit-finance-review-1",
    category: "scaling",
    createdAt: "2026-06-02T00:00:00.000Z",
    currency: "USD",
    destinationType: "ad_growth_budget",
    externalExecution: false,
    id: "intent-scaling",
    metadata: {},
    provider: "Stripe Treasury + Connect",
    status: "approved_manual_handoff",
    updatedAt: "2026-06-02T00:30:00.000Z"
  },
  plan: approvedFinancialReviewPlan,
  review: {
    action: "approve",
    fromStatus: "approval_required",
    note: "Approved for manual handoff only. No financial provider execution is authorized.",
    toStatus: "approved_manual_handoff"
  }
};

const financialScalingBudgetReviewPlan: FinancialScalingBudgetReviewPlan = {
  auditEvents: [
    "Scaling budget review generated from persisted internal Financial Orchestrator packets.",
    "Approvals are manual handoff states only; no spend, payout, ad, provider, or browser execution is authorized."
  ],
  blockedExternalActions: [
    "Moving money or issuing payouts",
    "Calling Stripe Treasury, Stripe Connect, bank, card, or payment write APIs",
    "Increasing ad spend, procurement spend, or product spend without a separate approved scaling budget"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:20:00.000Z",
  mode: "Internal Scaling Budget Review",
  packets: financialPlan.scalingBudgetQueue.map((packet) => ({
    ...packet,
    auditLogId: null,
    createdAt: "2026-06-02T00:00:00.000Z",
    metadata: { source: "financial_orchestrator" },
    reviewedAt: null,
    reviewedById: null,
    reviewNote: null,
    splitPolicyId: "fin-policy-1",
    updatedAt: "2026-06-02T00:00:00.000Z"
  })),
  providerContacted: false,
  summary: "2 Ad/Growth budget packets reviewed. 2 pending, 0 approved for manual handoff, and 0 rejected or voided. External execution remains locked.",
  totals: {
    approved: 0,
    approvedAmount: 0,
    pending: 2,
    pendingAmount: 60,
    rejected: 0,
    rejectedAmount: 0,
    retainedAmount: 15,
    reviewItems: 2,
    totalAmount: 60
  }
};

const approvedFinancialScalingBudgetReviewPlan: FinancialScalingBudgetReviewPlan = {
  ...financialScalingBudgetReviewPlan,
  packets: financialScalingBudgetReviewPlan.packets.map((packet) => packet.id === "scale_budget_product_1"
    ? {
      ...packet,
      auditLogId: "audit-scale-budget-review-1",
      reviewedAt: "2026-06-02T00:30:00.000Z",
      reviewedById: "user-1",
      reviewNote: "Approved for internal manual scaling budget handoff only. No provider execution is authorized.",
      status: "approved_manual_handoff",
      updatedAt: "2026-06-02T00:30:00.000Z"
    }
    : packet),
  summary: "2 Ad/Growth budget packets reviewed. 1 pending, 1 approved for manual handoff, and 0 rejected or voided. External execution remains locked.",
  totals: {
    approved: 1,
    approvedAmount: 30,
    pending: 1,
    pendingAmount: 30,
    rejected: 0,
    rejectedAmount: 0,
    retainedAmount: 15,
    reviewItems: 2,
    totalAmount: 60
  }
};

const financialScalingBudgetReviewApplyResponse: FinancialScalingBudgetReviewApplyResponse = {
  auditLogId: "audit-scale-budget-review-1",
  externalExecution: false,
  packet: approvedFinancialScalingBudgetReviewPlan.packets[0]!,
  plan: approvedFinancialScalingBudgetReviewPlan,
  providerContacted: false,
  review: {
    action: "approve",
    fromStatus: "approval_required",
    note: "Approved for internal manual scaling budget handoff only. No provider execution is authorized.",
    toStatus: "approved_manual_handoff"
  }
};

const financialScalingSpendControlPlan: FinancialScalingSpendControlPlan = {
  auditEvents: [
    "Scaling spend control generated from approved internal scaling budget packets.",
    "Spend packets are manual control records only."
  ],
  blockedExternalActions: [
    "Increasing ad spend, procurement spend, product spend, software spend, or creative spend automatically",
    "Calling marketplace, POD, ad, social, payment, bank, card, payout, transfer, upload, browser, proxy, or provider write APIs"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:40:00.000Z",
  mode: "Internal Scaling Spend Control",
  persisted: {
    packets: [],
    totals: {
      recordedPackets: 0,
      stalePackets: 0
    }
  },
  providerContacted: false,
  reviewPlan: approvedFinancialScalingBudgetReviewPlan,
  spendPackets: [
    {
      amount: 21,
      approvalState: "approval_required",
      assetId: "product-1",
      assetName: "Core Tee",
      assetType: "product",
      blockedActions: ["Increasing ad spend, procurement spend, product spend, software spend, or creative spend automatically"],
      budgetPacketId: "scale_budget_product_1",
      category: "listing_optimization",
      controls: ["Use only for listing copy, pricing tests, mockup improvements, and internal conversion experiments."],
      currency: "USD",
      dedupeKey: "dedupe-scale-product-1:listing_optimization",
      externalExecution: false,
      id: "scale_spend_product_listing",
      maxSpendAmount: 21,
      priority: 10,
      providerContacted: false,
      purpose: "Fund manual listing optimization and conversion repair work for Core Tee.",
      releaseState: "locked_review",
      score: 88,
      storeId: "store-1",
      storeName: "Iron House Gym"
    },
    {
      amount: 18,
      approvalState: "approval_required",
      assetId: "product-1",
      assetName: "Core Tee",
      assetType: "product",
      blockedActions: ["Increasing ad spend, procurement spend, product spend, software spend, or creative spend automatically"],
      budgetPacketId: "scale_budget_product_1",
      category: "content_production",
      controls: ["Use only for internal content briefs, scripts, voice/video draft preparation, and creative assets."],
      currency: "USD",
      dedupeKey: "dedupe-scale-product-1:content_production",
      externalExecution: false,
      id: "scale_spend_product_content",
      maxSpendAmount: 18,
      priority: 11,
      providerContacted: false,
      purpose: "Fund manual content production preparation for Core Tee.",
      releaseState: "locked_review",
      score: 88,
      storeId: "store-1",
      storeName: "Iron House Gym"
    }
  ],
  summary: "1 approved scaling budget packet converted into 2 manual spend control packets worth 39. External spend execution remains locked.",
  totals: {
    approvedBudgetAmount: 60,
    approvedBudgetPackets: 1,
    contentProductionAmount: 18,
    listingOptimizationAmount: 21,
    operationsBufferAmount: 0,
    pendingSpendAmount: 39,
    productGenerationAmount: 0,
    readyForManualHandoff: 0,
    rejectedSpendAmount: 0,
    spendPackets: 2
  }
};

const recordedFinancialScalingSpendControlPlan: FinancialScalingSpendControlPlan = {
  ...financialScalingSpendControlPlan,
  persisted: {
    packets: financialScalingSpendControlPlan.spendPackets.map((packet, index) => ({
      ...packet,
      auditLogId: "audit-scale-spend-control-1",
      createdAt: "2026-06-02T00:45:00.000Z",
      recordId: `scale-spend-record-${index + 1}`,
      updatedAt: "2026-06-02T00:45:00.000Z"
    })),
    totals: {
      recordedPackets: 2,
      stalePackets: 0
    }
  }
};

function financialScalingSpendControlResponse(plan: FinancialScalingSpendControlPlan, dryRun: boolean): FinancialScalingSpendControlApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-scale-spend-control-1",
      dryRun,
      externalExecution: false,
      providerContacted: false,
      scalingSpendPacketsUpserted: plan.spendPackets.length
    },
    plan
  };
}

const financialScalingExecutionLedgerPlan: FinancialScalingExecutionLedgerPlan = {
  auditEvents: [
    "Scaling execution ledger generated from persisted manual spend controls and recorded outcome evidence.",
    "Outcome entries are evidence records only."
  ],
  blockedExternalActions: [
    "Executing ad spend, procurement spend, creative spend, product orders, software purchases, payouts, transfers, or card charges",
    "Calling marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or provider write APIs"
  ],
  entries: [],
  externalExecution: false,
  generatedAt: "2026-06-02T00:55:00.000Z",
  mode: "Internal Scaling Execution Ledger",
  packetSummaries: recordedFinancialScalingSpendControlPlan.persisted.packets.map((packet) => ({
    allocatedAmount: packet.amount,
    amountSpent: 0,
    assetId: packet.assetId,
    assetName: packet.assetName,
    assetType: packet.assetType,
    category: packet.category,
    entries: 0,
    externalExecution: false,
    grossRevenue: 0,
    hasOutcomeEvidence: false,
    maxSpendAmount: packet.maxSpendAmount,
    netProfit: 0,
    nextInternalState: "record_manual_outcome",
    providerContacted: false,
    reason: "No outcome evidence is recorded yet; keep this spend lane in manual validation.",
    recommendation: "validate",
    roi: 0,
    scalingSpendPacketId: packet.recordId,
    storeId: packet.storeId,
    storeName: packet.storeName,
    unitsSold: 0,
    visits: 0
  })),
  providerContacted: false,
  spendControlPlan: recordedFinancialScalingSpendControlPlan,
  summary: "0 scaling outcome entries recorded against 2 spend control packets. 0 ready for next budget review, 2 validated, 0 watch, and 0 stop recommendations.",
  totals: {
    allocatedAmount: 39,
    amountSpent: 0,
    grossRevenue: 0,
    netProfit: 0,
    pendingOutcomeControls: 2,
    recordedEntries: 0,
    roi: 0,
    scaleNext: 0,
    spendControls: 2,
    stopped: 0,
    validated: 2,
    watched: 0
  }
};

const recordedFinancialScalingExecutionLedgerPlan: FinancialScalingExecutionLedgerPlan = {
  ...financialScalingExecutionLedgerPlan,
  entries: [{
    amountSpent: 21,
    assetId: "product-1",
    assetName: "Core Tee",
    assetType: "product",
    auditLogId: "audit-scale-execution-1",
    category: "listing_optimization",
    createdAt: "2026-06-02T01:00:00.000Z",
    externalExecution: false,
    grossRevenue: 84,
    id: "scale_execution_recorded_1",
    netProfit: 50.4,
    notes: "Recorded internal scaling outcome evidence from manual operator review. No spend, provider call, upload, or payout was executed.",
    outcome: "validated",
    periodEnd: "2026-06-02T01:00:00.000Z",
    periodStart: "2026-05-26T01:00:00.000Z",
    productId: "product-1",
    providerContacted: false,
    recommendation: "scale_next",
    reason: "Outcome evidence returned 2.4x spend with recorded sales; queue the next internal scaling budget review.",
    recordId: "scale-execution-record-1",
    roi: 2.4,
    scalingSpendPacketId: "scale-spend-record-1",
    source: "manual",
    storeId: "store-1",
    storeName: "Iron House Gym",
    unitsSold: 3,
    updatedAt: "2026-06-02T01:00:00.000Z",
    visits: 120
  }],
  packetSummaries: financialScalingExecutionLedgerPlan.packetSummaries.map((summary, index) => index === 0
    ? {
      ...summary,
      amountSpent: 21,
      entries: 1,
      grossRevenue: 84,
      hasOutcomeEvidence: true,
      netProfit: 50.4,
      nextInternalState: "queue_next_scaling_budget_review",
      reason: "Outcome evidence returned 2.4x spend with recorded sales; queue the next internal scaling budget review.",
      recommendation: "scale_next",
      roi: 2.4,
      unitsSold: 3,
      visits: 120
    }
    : summary),
  summary: "1 scaling outcome entry recorded against 2 spend control packets. 1 ready for next budget review, 1 validated, 0 watch, and 0 stop recommendations.",
  totals: {
    allocatedAmount: 39,
    amountSpent: 21,
    grossRevenue: 84,
    netProfit: 50.4,
    pendingOutcomeControls: 1,
    recordedEntries: 1,
    roi: 2.4,
    scaleNext: 1,
    spendControls: 2,
    stopped: 0,
    validated: 1,
    watched: 0
  }
};

function financialScalingExecutionLedgerResponse(plan: FinancialScalingExecutionLedgerPlan, dryRun: boolean): FinancialScalingExecutionLedgerApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-scale-execution-1",
      dryRun,
      entriesRecorded: 1,
      externalExecution: false,
      providerContacted: false
    },
    plan
  };
}

const financialGovernancePlan: FinancialReleaseGovernancePlan = {
  auditEvents: [
    "Release governance plan generated from the internal payout review center.",
    "Stripe readiness probe is manifest-only and does not contact Stripe or any financial provider."
  ],
  blockedExternalActions: [
    "Moving money or issuing payouts",
    "Calling Stripe Treasury, Stripe Connect, bank, card, payment, payout, transfer, or balance APIs",
    "Persisting governance records must not move money, call Stripe APIs, or modify external accounts"
  ],
  budgetReleasePackets: financialReviewPlan.budgetReleasePackets,
  externalExecution: false,
  generatedAt: "2026-06-02T00:15:00.000Z",
  mode: "Internal Release Governance",
  persisted: {
    latestReconciliationReport: null,
    reconciliationReports: [],
    releasePackets: [],
    totals: {
      recordedReconciliationReports: 0,
      recordedReleasePackets: 0,
      staleReleasePackets: 0
    }
  },
  reconciliationReport: {
    approvedAmount: 0,
    pendingAmount: 300,
    rejectedAmount: 0,
    source: "payout_review",
    status: "balanced",
    totalAmount: 300,
    variance: 0
  },
  releaseReadiness: {
    lockedReview: 2,
    readyForManualHandoff: 0,
    rejected: 0
  },
  reviewPlan: financialReviewPlan,
  riskTiers: [
    {
      amount: 75,
      count: 1,
      intentIds: ["intent-personal"],
      label: "high",
      recommendedControl: "Require owner review, accounting evidence, and manual handoff approval before any future release."
    },
    {
      amount: 150,
      count: 1,
      intentIds: ["intent-scaling"],
      label: "medium",
      recommendedControl: "Require budget owner review and ledger trace before marking ready for manual handoff."
    },
    {
      amount: 75,
      count: 1,
      intentIds: ["intent-buffer"],
      label: "low",
      recommendedControl: "Keep locked unless ledger evidence and packet controls remain current."
    }
  ],
  stripeReadOnlyProbe: {
    checks: [
      {
        evidence: "No Stripe credential connector is enabled in this internal system.",
        status: "blocked",
        title: "Credential presence"
      },
      {
        evidence: "balance.read remains readiness-only until a read-only reconciliation connector is approved.",
        status: "blocked",
        title: "Read-only reconciliation"
      }
    ],
    connectorStatus: "not_connected",
    externalExecution: false,
    mode: "Read-only Stripe readiness probe",
    provider: "Stripe Treasury + Connect",
    providerContacted: false
  },
  summary: "2 budget release packets prepared with 1 high-risk intent. 0 packet records and 0 reconciliation reports are already stored. External execution remains locked.",
  totals: {
    approvedAmount: 0,
    budgetReleasePackets: 2,
    highRiskAmount: 75,
    highRiskIntents: 1,
    pendingAmount: 300,
    reconciliationReportsRecorded: 0,
    releasePacketsRecorded: 0,
    totalAmount: 300
  }
};

const recordedFinancialGovernancePlan: FinancialReleaseGovernancePlan = {
  ...financialGovernancePlan,
  persisted: {
    latestReconciliationReport: {
      approvedAmount: 0,
      auditLogId: "audit-governance-1",
      createdAt: "2026-06-02T00:20:00.000Z",
      externalExecution: false,
      id: "fin-recon-1",
      pendingAmount: 300,
      rejectedAmount: 0,
      report: {},
      source: "payout_review",
      status: "balanced",
      totalAmount: 300,
      updatedAt: "2026-06-02T00:20:00.000Z",
      variance: 0
    },
    reconciliationReports: [
      {
        approvedAmount: 0,
        auditLogId: "audit-governance-1",
        createdAt: "2026-06-02T00:20:00.000Z",
        externalExecution: false,
        id: "fin-recon-1",
        pendingAmount: 300,
        rejectedAmount: 0,
        report: {},
        source: "payout_review",
        status: "balanced",
        totalAmount: 300,
        updatedAt: "2026-06-02T00:20:00.000Z",
        variance: 0
      }
    ],
    releasePackets: financialReviewPlan.budgetReleasePackets.map((packet, index) => ({
      ...packet,
      auditLogId: "audit-governance-1",
      createdAt: "2026-06-02T00:20:00.000Z",
      recordId: `fin-release-${index + 1}`,
      updatedAt: "2026-06-02T00:20:00.000Z"
    })),
    totals: {
      recordedReconciliationReports: 1,
      recordedReleasePackets: 2,
      staleReleasePackets: 0
    }
  },
  summary: "2 budget release packets prepared with 1 high-risk intent. 2 packet records and 1 reconciliation report are already stored. External execution remains locked.",
  totals: {
    ...financialGovernancePlan.totals,
    reconciliationReportsRecorded: 1,
    releasePacketsRecorded: 2
  }
};

function financialGovernanceResponse(plan: FinancialReleaseGovernancePlan, dryRun: boolean): FinancialReleaseGovernanceApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-governance-1",
      budgetReleasePacketsUpserted: plan.budgetReleasePackets.length,
      dryRun,
      externalExecution: false,
      reconciliationReportId: dryRun ? null : "fin-recon-1",
      reconciliationStatus: plan.reconciliationReport.status,
      stripeProviderContacted: false
    },
    plan
  };
}

const performanceDigest: RevenuePerformanceDigest = {
  auditEvents: [
    "Revenue performance snapshots evaluated inside ENTRAL.",
    "No marketplace, payment, ad, or browser automation source was contacted."
  ],
  blockedExternalActions: [
    "Importing marketplace analytics without an approved read-only connector",
    "Changing Shopify, Etsy, Printify, Printful, Stripe, ad, or social records",
    "Publishing or unpublishing listings",
    "Using browser stealth, anti-detection, or platform-evasion automation"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Internal Performance Velocity Ledger",
  options: {
    maxAdSpendRatio: 70,
    maxRecommendations: 25,
    maxRefundRate: 25,
    minKillProfitVelocity: -5,
    minPauseProfitVelocity: -1,
    minScaleConversionRate: 1.5,
    minScaleProfitVelocity: 10,
    minSnapshotsForKill: 2,
    minWatchVisits: 50,
    windowDays: 30
  },
  productScores: [
    {
      action: "scale",
      adSpendRatio: 8,
      confidence: 91,
      conversionRate: 3.8,
      costs: 38,
      discounts: 0,
      evidenceGrade: "strong",
      grossRevenue: 420,
      impressions: 1800,
      netProfit: 260,
      netRevenue: 420,
      periodDays: 7,
      productId: "product-1",
      productName: "Core Tee",
      productType: "T-shirt",
      profitMargin: 61.9,
      profitVelocity: 37.14,
      reason: "Profit velocity 37.14 per day, conversion 3.8%, and margin 61.9% meet scale thresholds.",
      refunds: 0,
      refundRate: 0,
      revenueVelocity: 60,
      snapshots: 2,
      storeId: "store-1",
      unitsSold: 16,
      visits: 420
    },
    {
      action: "kill",
      adSpendRatio: 300,
      confidence: 84,
      conversionRate: 0.3,
      costs: 120,
      discounts: 0,
      evidenceGrade: "usable",
      grossRevenue: 30,
      impressions: 900,
      netProfit: -108,
      netRevenue: 30,
      periodDays: 14,
      productId: "product-2",
      productName: "Weak Tee",
      productType: "T-shirt",
      profitMargin: -360,
      profitVelocity: -7.71,
      reason: "Profit velocity is -7.71 per day across 2 snapshots; archive this asset internally before more effort is spent.",
      recommendedInternalStatus: "Archived",
      refunds: 0,
      refundRate: 0,
      revenueVelocity: 2.14,
      snapshots: 2,
      storeId: "store-1",
      unitsSold: 1,
      visits: 290
    }
  ],
  rotationChanges: [
    {
      action: "kill",
      fromStatus: "Published",
      reason: "Profit velocity is -7.71 per day across 2 snapshots; archive this asset internally before more effort is spent.",
      targetId: "product-2",
      targetName: "Weak Tee",
      targetType: "product",
      toStatus: "Archived"
    }
  ],
  snapshots: [
    {
      grossRevenue: 420,
      id: "performance-1",
      netProfit: 260,
      periodEnd: "2026-06-02T00:00:00.000Z",
      periodStart: "2026-05-26T00:00:00.000Z",
      productId: "product-1",
      source: "manual",
      storeId: "store-1",
      unitsSold: 16,
      visits: 420
    }
  ],
  storeScores: [
    {
      action: "scale",
      adSpendRatio: 18,
      confidence: 86,
      conversionRate: 2.7,
      costs: 158,
      discounts: 0,
      evidenceGrade: "strong",
      grossRevenue: 450,
      impressions: 2700,
      netProfit: 152,
      netRevenue: 450,
      periodDays: 14,
      profitMargin: 33.8,
      profitVelocity: 10.86,
      reason: "2 products show scale signals and store profit velocity is 10.86 per day.",
      refunds: 0,
      refundRate: 0,
      revenueVelocity: 32.14,
      scaleProducts: 1,
      snapshots: 3,
      storeId: "store-1",
      storeName: "Iron House Gym",
      unitsSold: 17,
      visits: 710
    }
  ],
  summary: "3 performance snapshots scored across 1 stores and 2 products. Net profit is 152 with 10.86 daily profit velocity; 2 scale signals and 1 internal rotation changes are queued.",
  totals: {
    grossRevenue: 450,
    netProfit: 152,
    netRevenue: 450,
    productsTracked: 2,
    profitVelocity: 10.86,
    revenueVelocity: 32.14,
    rotationChanges: 1,
    scaleRecommendations: 2,
    snapshots: 3,
    storesTracked: 1
  }
};

function performanceIngestResponse(digest: RevenuePerformanceDigest): RevenuePerformanceIngestResponse {
  return {
    digest,
    ingested: {
      auditLogId: "audit-performance-ingest-1",
      dryRun: false,
      externalExecution: false,
      snapshots: 1,
      storeRollups: [{ storeId: "store-1" }]
    }
  };
}

function performanceRotationResponse(digest: RevenuePerformanceDigest, dryRun: boolean): RevenuePerformanceRotationApplyResponse {
  return {
    applied: {
      auditLogId: dryRun ? null : "audit-performance-rotation-1",
      dryRun,
      externalExecution: false,
      productUpdates: digest.rotationChanges.filter((change) => change.targetType === "product"),
      storeUpdates: digest.rotationChanges.filter((change) => change.targetType === "store")
    },
    digest
  };
}

const providerPayloadPackage: ProviderPayloadPackage = {
  adapterCoverage: ["Printify", "Shopify"],
  auditEvents: [
    "Provider payload package generated in locked mock mode.",
    "No provider API request was sent."
  ],
  blockedActions: [
    "Sending provider API requests",
    "Uploading artwork or mockups",
    "Creating marketplace listings",
    "Publishing products or collections"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T00:00:00.000Z",
  mode: "Locked Provider Payload Package",
  options: {
    includeUnapproved: false,
    maxProducts: 5
  },
  payloadCount: 3,
  productPayloads: [
    {
      estimatedProfit: 14,
      listingTitle: "Iron House Core Tee",
      payloads: [
        {
          action: "create_pod_product",
          body: { title: "Iron House Core Tee" },
          credentialScope: ["products:write"],
          externalExecution: false,
          headers: { authorization: "Bearer <PRINTIFY_TOKEN>" },
          id: "printify_iron-house-core-tee",
          idempotencyKey: "entral:store-1:iron-house-core-tee:printify",
          method: "POST",
          pathTemplate: "/v1/shops/{shop_id}/products.json",
          provider: "Printify",
          requiredApprovals: ["Printify credential scope approval"],
          status: "Draft - not sent",
          validationChecklist: ["Confirm product remains approved in ENTRAL."]
        },
        {
          action: "create_shopify_product",
          body: { product: { title: "Iron House Core Tee" } },
          credentialScope: ["write_products"],
          externalExecution: false,
          headers: { authorization: "Bearer <SHOPIFY_TOKEN>" },
          id: "shopify_iron-house-core-tee",
          idempotencyKey: "entral:store-1:iron-house-core-tee:shopify",
          method: "POST",
          pathTemplate: "/admin/api/{version}/products.json",
          provider: "Shopify",
          requiredApprovals: ["Shopify credential scope approval"],
          status: "Draft - not sent",
          validationChecklist: ["Confirm Shopify collection settings."]
        }
      ],
      productName: "Iron House Core Tee",
      productType: "T-shirt",
      retailPrice: 34,
      status: "Approved"
    },
    {
      estimatedProfit: 0,
      listingTitle: "Iron House Gym Launch Collection",
      payloads: [
        {
          action: "create_store_collection",
          body: { custom_collection: { title: "Iron House Gym Launch Collection" } },
          credentialScope: ["write_products"],
          externalExecution: false,
          headers: { authorization: "Bearer <SHOPIFY_TOKEN>" },
          id: "shopify_collection_iron-house-gym",
          idempotencyKey: "entral:store-1:iron-house-gym:shopify_collection",
          method: "POST",
          pathTemplate: "/admin/api/{version}/custom_collections.json",
          provider: "Shopify",
          requiredApprovals: ["collection copy approval"],
          status: "Draft - not sent",
          validationChecklist: ["Confirm collection remains unpublished until final approval."]
        }
      ],
      productName: "Iron House Gym Launch Collection",
      productType: "Store collection",
      retailPrice: 0,
      status: "Draft"
    }
  ],
  providerContacted: false,
  readinessScore: 74,
  store: {
    businessName: "Iron House Gym",
    podProvider: "Printify",
    storeId: "store-1",
    storePlatform: "Shopify"
  },
  summary: "3 locked provider payload drafts prepared for 1 product across Printify, Shopify. Nothing was sent externally.",
  warnings: ["Provider payloads are request drafts only."]
};

const providerApprovalRecord: GrowthApprovalRecord = {
  ...approvalRecord,
  auditLogId: "audit-provider-1",
  createdAt: "2026-06-02T00:00:00.000Z",
  id: "packet-provider-1",
  packet: {
    actions: [
      {
        approvalStatus: "Pending human approval",
        channel: "Provider",
        executionState: "Locked - no external action",
        id: "provider-action-1",
        requiredControls: [
          "Printify credential scope approval",
          "credential owner approval",
          "provider API version review",
          "rollback checklist approval",
          "final user launch approval"
        ],
        scheduledFor: null,
        summary: "Printify create pod product draft for Iron House Core Tee. Path /v1/shops/{shop_id}/products.json.",
        title: "Printify payload review: Iron House Core Tee"
      }
    ],
    auditEvents: [
      "Provider payload approval packet queued in Mock Mode.",
      "No provider API request was sent."
    ],
    blockedActions: providerPayloadPackage.blockedActions,
    businessName: "Iron House Gym",
    costGuardrail: "External provider spend and listing changes remain $0.",
    createdAt: "2026-06-02T00:00:00.000Z",
    humanApprovalRequired: true,
    id: "packet-provider-1",
    logging: "Stores provider payload review evidence.",
    mode: "Mock Mode",
    note: "Queued from locked provider payload package for human review.",
    providerPayloadPackage: {
      adapterCoverage: providerPayloadPackage.adapterCoverage,
      generatedAt: providerPayloadPackage.generatedAt,
      payloadCount: providerPayloadPackage.payloadCount,
      readinessScore: providerPayloadPackage.readinessScore,
      summary: providerPayloadPackage.summary
    },
    rollbackChecklist: [
      "Keep all provider-created resources in draft or unpublished state during any future connector test."
    ],
    scheduledFor: null,
    status: "Pending approval",
    storeId: "store-1",
    summary: "3 provider payload review actions queued for Iron House Gym. ENTRAL will not contact Printify, Shopify without explicit approval."
  },
  requestAuditLogId: "audit-provider-1",
  scheduledFor: null,
  status: "pending",
  statusLabel: "Pending approval",
  updatedAt: "2026-06-02T00:00:00.000Z"
};

const providerPayloadApprovalResponse: ProviderPayloadApprovalResponse = {
  approval: providerApprovalRecord,
  auditLogId: "audit-provider-1",
  packet: providerApprovalRecord.packet,
  providerPackage: providerPayloadPackage
};

const approvedProviderRecord: GrowthApprovalRecord = {
  ...providerApprovalRecord,
  reviewAuditLogId: "audit-provider-review-1",
  reviewedAt: "2026-06-02T00:30:00.000Z",
  status: "approved",
  statusLabel: "Approved - execution still locked",
  updatedAt: "2026-06-02T00:30:00.000Z"
};

const providerHandoffResponse: ProviderHandoffResponse = {
  auditLogId: "audit-provider-handoff-1",
  bundle: {
    approvedAt: "2026-06-02T00:30:00.000Z",
    approvedPacketId: "packet-provider-1",
    auditEvents: [
      "Provider handoff bundle generated from an approved provider payload packet.",
      "No provider API request was sent and no provider admin session was opened."
    ],
    blockedActions: providerPayloadPackage.blockedActions,
    businessName: "Iron House Gym",
    connectorReadiness: {
      requiredBeforeConnector: ["Confirm every manifest placeholder has an approved value."],
      score: 89,
      status: "Ready for manual handoff"
    },
    drift: {
      adapterCoverageMatches: true,
      payloadCountMatches: true,
      readinessScoreDelta: 0,
      warnings: []
    },
    externalExecution: false,
    generatedAt: "2026-06-02T00:40:00.000Z",
    manualLaunchChecklist: ["Review the approved packet summary and audit log before touching provider systems."],
    mode: "Provider Handoff Bundle",
    providerContacted: false,
    requestManifest: [
      {
        action: "create_pod_product",
        artifactSlots: [
          {
            acceptedFormats: ["png", "svg"],
            label: "Approved design asset",
            notes: "Final printable artwork with compliance review complete.",
            required: true,
            slotId: "printify_iron-house-core-tee_design-asset"
          }
        ],
        bodyJson: "{\n  \"blueprint_id\": \"<approved_printify_blueprint_id>\"\n}",
        credentialScope: ["shops:read", "products:write"],
        executionState: "Locked - manual handoff only",
        headers: { authorization: "Bearer <PRINTIFY_TOKEN>" },
        id: "printify_iron-house-core-tee",
        idempotencyKey: "entral:store-1:iron-house-core-tee:printify",
        manualSteps: ["Confirm Iron House Core Tee is still approved in ENTRAL."],
        method: "POST",
        pathTemplate: "/v1/shops/{shop_id}/products.json",
        productName: "Iron House Core Tee",
        provider: "Printify",
        requiredApprovals: ["Printify credential scope approval"],
        validationChecklist: ["Confirm product remains approved in ENTRAL."]
      }
    ],
    reviewAuditLogId: "audit-provider-review-1",
    rollbackChecklist: ["Prepare delete/archive calls for products, listings, images, and collections before future execution."],
    summary: "1 locked request manifest prepared for Iron House Gym. Connector readiness is ready for manual handoff at 89/100."
  }
};

describe("MerchOperationsPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads first-cash readiness for the fastest income path", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ plan: firstCashReadinessPlan });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load first cash/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/first-cash-readiness?maxCandidates=8&targetDaysToFirstCash=7");
    const region = await screen.findByRole("region", { name: /revenue engine first cash readiness/i });
    expect(within(region).getByText("Revenue Engine First Cash Readiness")).toBeInTheDocument();
    expect(within(region).getByText("2 first-cash candidates ranked. Top path: Iron House Gym, first sale ETA 2 days, automatic cash ETA 3 days.")).toBeInTheDocument();
    expect(within(region).getByText("Target Ready")).toBeInTheDocument();
    expect(within(region).getByText("first sale 2 days")).toBeInTheDocument();
    expect(within(region).getByText("automatic 3 days")).toBeInTheDocument();
    expect(within(region).getByText("automatic cash ready")).toBeInTheDocument();
    expect(within(region).getByText("Final operator launch review")).toBeInTheDocument();
    expect(within(region).getByText("External execution remains locked")).toBeInTheDocument();
  });

  it("builds and previews the first-cash sprint through ready internal bridge actions", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        bridge: {},
        checklist: {},
        firstCash: firstCashReadinessPlan,
        sprint: firstCashSprintPlan
      })
      .mockResolvedValueOnce({
        dispatched: {
          actionsBlocked: 0,
          actionsDispatched: 0,
          actionsPreviewed: 1,
          actionsSelected: 1,
          actionsSkipped: 0,
          dryRun: true,
          externalExecution: false,
          providerContacted: false,
          results: [],
          summary: "1 checklist bridge action previewed."
        },
        selectedBridgeActionIds: ["store-1:run_listing_optimization:listing_optimization"],
        sprint: firstCashSprintPlan
      });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build first-cash sprint/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/first-cash-sprint?maxCandidates=8&maxSprintActions=5&targetDaysToFirstCash=7");
    const region = await screen.findByRole("region", { name: /revenue engine first cash sprint/i });
    expect(within(region).getByText("Revenue Engine First Cash Sprint")).toBeInTheDocument();
    expect(within(region).getByText("2 first-cash sprint moves prioritized: 1 ready internal, 1 manual-gated, 0 blocked. Top path: Iron House Gym.")).toBeInTheDocument();
    expect(within(region).getByText("ready internal")).toBeInTheDocument();
    expect(within(region).getByText("Listing optimization can update internal product listing drafts for Iron House Gym.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview first-cash sprint/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/first-cash-sprint/apply", {
      json: {
        confirm: "RUN INTERNAL FIRST CASH SPRINT",
        dryRun: true,
        maxCandidates: 8,
        maxSprintActions: 5,
        note: "Previewed from First Cash Sprint dashboard controls.",
        targetDaysToFirstCash: 7
      },
      method: "POST"
    });
    expect(await screen.findByText("First Cash Sprint preview ready: 1 internal action previewed.")).toBeInTheDocument();
    expect(within(region).getByText("Sprint Receipt")).toBeInTheDocument();
    expect(within(region).getByText("1 checklist bridge action previewed.")).toBeInTheDocument();
  });

  it("builds and previews the first-business launch path from first-cash scoring", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({
        checklist: {},
        plan: firstBusinessLaunchPlan,
        sprint: firstCashSprintPlan
      })
      .mockResolvedValueOnce({
        dispatched: {
          actionsBlocked: 0,
          actionsDispatched: 0,
          actionsPreviewed: 1,
          actionsSelected: 1,
          actionsSkipped: 0,
          dryRun: true,
          externalExecution: false,
          providerContacted: false,
          results: [],
          summary: "1 checklist bridge action previewed."
        },
        plan: firstBusinessLaunchPlan,
        selectedSprintActionIds: ["first_cash:store-1:optimize_listings"],
        sprint: firstCashSprintPlan
      });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build first business/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/first-business-launch?maxCandidates=8");
    const region = await screen.findByRole("region", { name: /revenue engine first business launch path/i });
    expect(within(region).getByText("Revenue Engine First Business Launch Path")).toBeInTheDocument();
    expect(within(region).getByText("Iron House Gym is the top first-business launch path: ready internal, rank 96/100, next Optimize listings.")).toBeInTheDocument();
    expect(within(region).getByRole("region", { name: /first business launch candidates/i })).toBeInTheDocument();
    expect(within(region).getAllByText("Iron House Gym").length).toBeGreaterThan(0);
    expect(within(region).getByText("ready internal")).toBeInTheDocument();
    expect(within(region).getByText("First Practical Launch Package")).toBeInTheDocument();
    expect(within(region).getAllByText("Core Tee").length).toBeGreaterThan(0);
    expect(within(region).getByText("Iron House Gym Core Tee faceless short")).toBeInTheDocument();
    expect(within(region).getByText("RUN INTERNAL MONEY ARMY BATCH PIPELINE")).toBeInTheDocument();
    expect(within(region).getByText("dispatch ready first cash bridge action")).toBeInTheDocument();
    expect(within(region).getByText("/merch/revenue-engine/listing-optimization/apply")).toBeInTheDocument();
    expect(within(region).getByText("First-business launch path remains internal")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview first business/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/first-business-launch/apply", {
      json: {
        confirm: "RUN INTERNAL FIRST BUSINESS LAUNCH PATH",
        dryRun: true,
        maxCandidates: 8,
        note: "Previewed from First Business Launch Path dashboard controls."
      },
      method: "POST"
    });
    expect(await screen.findByText("First Business Launch preview ready: 1 internal action previewed.")).toBeInTheDocument();
    expect(within(region).getByText("Launch Path Receipt")).toBeInTheDocument();
    expect(within(region).getByText("1 checklist bridge action previewed.")).toBeInTheDocument();
  });

  it("loads the 100-store operations readiness layer", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(hundredStoreOperationsResponse)
      .mockResolvedValueOnce(hundredStoreDailySupervisorPreviewResponse)
      .mockResolvedValueOnce(hundredStoreAppConnectionPacketsResponse)
      .mockResolvedValueOnce(hundredStoreConnectorActivationResponse)
      .mockResolvedValueOnce(hundredStoreMonitoringCycleResponse)
      .mockResolvedValueOnce(hundredStoreProductDepthResponse)
      .mockResolvedValueOnce(hundredStoreLaunchPacketsResponse)
      .mockResolvedValueOnce(hundredStoreAutonomyRunResponse)
      .mockResolvedValueOnce(hundredStoreWorkLeasesResponse)
      .mockResolvedValueOnce(hundredStoreOperationsApplyResponse);

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load 100-store ops/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-operations");
    const region = await screen.findByRole("region", { name: /100 store operations readiness/i });

    expect(within(region).getByText("100 Store Operations Readiness")).toBeInTheDocument();
    expect(within(region).getByText("82/100 readiness for 100-store internal operations. 1/100 stores tracked, 99 store gap, 1 ready-parallel lane, 0 scale lanes, 0 repair lanes, and 3 Money Army stages ready. External execution remains locked.")).toBeInTheDocument();
    expect(within(region).getByText("100-Store Gates")).toBeInTheDocument();
    expect(within(region).getByText("Store Inventory")).toBeInTheDocument();
    expect(within(region).getByText("Safety Envelope")).toBeInTheDocument();
    expect(within(region).getByText("Next Internal Actions")).toBeInTheDocument();
    expect(within(region).getByText("Create the next 100-store batch")).toBeInTheDocument();
    expect(within(region).getByText("Fill product depth for 100 stores")).toBeInTheDocument();
    expect(within(region).getByText("Application Readiness")).toBeInTheDocument();
    expect(within(region).getByText("Required apps and connector boundaries")).toBeInTheDocument();
    expect(within(region).getByText("Storefront Marketplace")).toBeInTheDocument();
    expect(within(region).getByText("Faceless Content Channels")).toBeInTheDocument();
    expect(within(region).getByText("Application Connection Workbench")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Application Connection Workbench")).toBeInTheDocument();
    expect(within(region).getByText("Connection prep evidence")).toBeInTheDocument();
    expect(within(region).getByText("Manual Signal Import template")).toBeInTheDocument();
    expect(within(region).getByText("Connector Activation Matrix")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Connector Activation Matrix")).toBeInTheDocument();
    expect(within(region).getByText("Connector safety posture")).toBeInTheDocument();
    expect(within(region).getByText("500/500 connector activation rows prepared for 100 stores across 5 required application roles: 1 ready for connection design, 3 require credential custody, 496 waiting for store shells, and 0 blocked by quality. External execution remains locked.")).toBeInTheDocument();
    expect(within(region).getByText("Monitoring Matrix")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Monitoring Matrix")).toBeInTheDocument();
    expect(within(region).getByText("Signal queues")).toBeInTheDocument();
    expect(within(region).getByText("Iron House Gym has approved read-only connector evidence but no tracked performance assets yet.")).toBeInTheDocument();
    expect(within(region).getByText("Growth Allocation Router")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Growth Allocation Router")).toBeInTheDocument();
    expect(within(region).getByText("25% Ad/Growth advisory routing")).toBeInTheDocument();
    expect(within(region).getByText("Iron House Gym should use organic-first growth and signal capture before paid spend because status is needs readonly import.")).toBeInTheDocument();
    expect(within(region).getByText("Daily Operating Loop")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Daily Operating Loop")).toBeInTheDocument();
    expect(within(region).getAllByText("Confirm private safety envelope").length).toBeGreaterThan(0);
    expect(within(region).getAllByText("Run monitoring cycle").length).toBeGreaterThan(0);
    expect(within(region).getAllByText("Review Ad/Growth allocation router").length).toBeGreaterThan(0);
    expect(within(region).getByText("Daily Supervisor")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Daily Supervisor")).toBeInTheDocument();
    expect(within(region).getByText("4/11 daily supervisor steps selected in safe internal only mode for up to 4 private internal actions. External execution remains locked.")).toBeInTheDocument();
    expect(within(region).getByText("Product Depth Queue")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Product Depth Queue")).toBeInTheDocument();
    expect(within(region).getByText("487 internal product-depth draft packets prepared for the 100-store floor: 0 ready for current stores, 487 waiting for future store shells, and 0 blocked by quality. External execution remains locked.")).toBeInTheDocument();
    expect(within(region).getByText("Iron House Gym founder edition performance tee")).toBeInTheDocument();
    expect(within(region).getByText("Launch Packet Queue")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Launch Packet Queue")).toBeInTheDocument();
    expect(within(region).getByText("100/100 launch packets assembled: 1 ready for internal launch review, 99 waiting for store shells, 0 need application packets, 0 need product depth, and 0 blocked by quality. External execution remains locked.")).toBeInTheDocument();
    expect(within(region).getAllByText("Iron House Gym")[0]).toBeInTheDocument();
    expect(within(region).getByText("Autonomy Run Queue")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Autonomy Run Queue")).toBeInTheDocument();
    expect(within(region).getByText("128 internal autonomy jobs queued for the 100-store floor: 25 ready internal, 2 approval-required, 99 waiting, 0 blocked, and 25 clean parallel jobs can run within shard caps. External execution remains locked.")).toBeInTheDocument();
    expect(within(region).getByText("Iron House Gym can be prepared as an internal store shell with no provider, marketplace, browser, ad, or payment action.")).toBeInTheDocument();
    expect(within(region).getByText("Internal Work Lease Plan")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Internal Work Lease Plan")).toBeInTheDocument();
    expect(within(region).getByText("Lease safety posture")).toBeInTheDocument();
    expect(within(region).getByText("128 internal work leases prepared for 100-store operations: 25 ready to claim, 2 approval-hold, 99 waiting on dependencies, 0 blocked, and 25 can run cleanly within shard caps. External execution remains locked.")).toBeInTheDocument();
    expect(within(region).getByText("Capacity Proof")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Capacity Proof")).toBeInTheDocument();
    expect(within(region).getByText("BLOCK capacity proof: private controls can currently model 8/100 clean simultaneous store slots with 5 pass, 2 watch, and 1 block checks. External execution remains locked.")).toBeInTheDocument();
    expect(within(region).getByText("100-store stress profile")).toBeInTheDocument();
    expect(within(region).getByText("Shard Capacity")).toBeInTheDocument();
    expect(within(region).getByText("Application Boundary Preparation")).toBeInTheDocument();
    expect(within(region).getByText("Connector Activation Readiness")).toBeInTheDocument();
    expect(within(region).getByText("Operating Control Grid")).toBeInTheDocument();
    expect(within(region).getByText("100 Store Operating Control Grid")).toBeInTheDocument();
    expect(within(region).getByText("Lane load")).toBeInTheDocument();
    expect(within(region).getAllByText("shard_001").length).toBeGreaterThan(0);
    expect(within(region).getByText("Concurrency And Shards")).toBeInTheDocument();
    expect(within(region).getByText("Batch buildout plan")).toBeInTheDocument();
    expect(within(region).getAllByText("Profit Acceleration").length).toBeGreaterThan(0);
    expect(within(region).getByText("100-store operations stay private")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview supervisor/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-daily-supervisor/apply", {
      json: {
        confirm: "RUN INTERNAL 100 STORE DAILY SUPERVISOR",
        dryRun: true,
        maxSteps: 4,
        mode: "safe_internal_only",
        note: "Previewed from the 100-store daily supervisor dashboard control.",
        podProvider: "Printify"
      },
      method: "POST"
    });
    expect(await within(region).findByText("Supervisor cycle receipt")).toBeInTheDocument();
    expect(within(region).getByText("100-store daily supervisor preview selected 4 private internal steps.")).toBeInTheDocument();
    expect(within(region).getByText("Supervisor would confirm the 100-store safety envelope before internal work.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview app packets/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-application-connections/apply", {
      json: {
        confirm: "RECORD INTERNAL 100 STORE APP CONNECTION PACKETS",
        dryRun: true,
        maxPackets: 100,
        note: "Previewed from the 100-store application connection workbench.",
        setupStatuses: ["ready_for_internal_packet"]
      },
      method: "POST"
    });
    expect(await within(region).findByText("Application packet receipt")).toBeInTheDocument();
    expect(within(region).getByText("2 application connection packets would be recorded as internal 100-store app readiness artifacts.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview connector matrix/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-connector-activation/apply", {
      json: {
        confirm: "RECORD INTERNAL 100 STORE CONNECTOR ACTIVATION MATRIX",
        dryRun: true,
        maxRows: 25,
        note: "Previewed from the 100-store connector activation matrix.",
        rowStatuses: ["ready_for_connection_design", "credential_custody_required"]
      },
      method: "POST"
    });
    expect(await within(region).findByText("Connector activation receipt")).toBeInTheDocument();
    expect(within(region).getByText("25 connector activation rows would be recorded with credential custody and external writes locked.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview monitor cycle/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-monitoring-cycle/apply", {
      json: {
        confirm: "RECORD INTERNAL 100 STORE MONITORING CYCLE",
        dryRun: true,
        maxItems: 25,
        note: "Previewed from the 100-store monitoring matrix.",
        queues: ["all"]
      },
      method: "POST"
    });
    expect(await within(region).findByText("Monitoring cycle receipt")).toBeInTheDocument();
    expect(within(region).getByText("1 monitoring item would be recorded for the 100-store monitoring cycle.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview product depth/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-product-depth/apply", {
      json: {
        confirm: "RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS",
        draftStatuses: ["ready_for_internal_draft", "waiting_for_store_shell"],
        dryRun: true,
        maxDrafts: 25,
        note: "Previewed from the 100-store product depth queue."
      },
      method: "POST"
    });
    expect(await within(region).findByText("Product depth receipt")).toBeInTheDocument();
    expect(within(region).getByText("25 product-depth draft packets would be recorded for the 100-store queue.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview launch packets/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-launch-packets/apply", {
      json: {
        confirm: "RECORD INTERNAL 100 STORE LAUNCH PACKETS",
        dryRun: true,
        maxPackets: 25,
        note: "Previewed from the 100-store launch packet queue.",
        packetStatuses: ["ready_for_internal_launch_review", "waiting_for_store_shell"]
      },
      method: "POST"
    });
    expect(await within(region).findByText("Launch packet receipt")).toBeInTheDocument();
    expect(within(region).getByText("25 launch packets would be recorded for 100-store internal launch review.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview autonomy run/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-autonomy-run/apply", {
      json: {
        confirm: "RECORD INTERNAL 100 STORE AUTONOMY RUN",
        dryRun: true,
        jobStatuses: ["ready_internal", "approval_required"],
        maxJobs: 25,
        note: "Previewed from the 100-store autonomy run queue."
      },
      method: "POST"
    });
    expect(await within(region).findByText("Autonomy run receipt")).toBeInTheDocument();
    expect(within(region).getByText("25 autonomy jobs would be recorded for the 100-store chain of command.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview work leases/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-work-leases/apply", {
      json: {
        confirm: "RECORD INTERNAL 100 STORE WORK LEASES",
        dryRun: true,
        leaseStatuses: ["ready_to_claim", "approval_hold"],
        maxLeases: 25,
        note: "Previewed from the 100-store internal work lease plan."
      },
      method: "POST"
    });
    expect(await within(region).findByText("Work lease receipt")).toBeInTheDocument();
    expect(within(region).getByText("25 internal work leases would be recorded for clean 100-store work claiming.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview 100-store step/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/100-store-operations/apply", {
      json: {
        confirm: "RUN INTERNAL 100 STORE OPERATIONS STEP",
        dryRun: true,
        maxCycles: 1,
        note: "Previewed from the 100-store dashboard control.",
        podProvider: "Printify"
      },
      method: "POST"
    });
    expect(await within(region).findByText("100-Store Command Queue")).toBeInTheDocument();
    expect(within(region).getByText("100-store operations preview selected Create the next 100-store batch for up to 25 internal items.")).toBeInTheDocument();
    expect(within(region).getByText("Store gap 99 to 74; readiness 82/100 to 84/100.")).toBeInTheDocument();
  }, 10000);

  it("loads the business fleet scheduler for a 10-lane launch wave", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: businessFleetPlan })
      .mockResolvedValueOnce({ plan: businessFleetGapPlan })
      .mockResolvedValueOnce(businessFleetGapSeedResponse(true))
      .mockResolvedValueOnce(businessFleetGapSeedResponse(false))
      .mockResolvedValueOnce({ portfolio: portfolioFromPlan(revenuePlan) })
      .mockResolvedValueOnce(businessFleetGapAccelerationResponse(true))
      .mockResolvedValueOnce(businessFleetGapAccelerationResponse(false))
      .mockResolvedValueOnce({ portfolio: portfolioFromPlan(revenuePlan) })
      .mockResolvedValueOnce(businessFleetLiveLaunchPackageResponse(true))
      .mockResolvedValueOnce(businessFleetLaunchGateResponse())
      .mockResolvedValueOnce(businessFleetLaunchWaveResponse());

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load fleet scheduler/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/business-fleet-scheduler");
    const region = await screen.findByRole("region", { name: /revenue business fleet scheduler/i });

    expect(within(region).getByText("Revenue Business Fleet Scheduler")).toBeInTheDocument();
    expect(within(region).getByText("1 business scored across 32 shards. 1 ready for parallel internal work, including 1/10 first-wave launch slots.")).toBeInTheDocument();
    expect(within(region).getAllByText("First Wave").length).toBeGreaterThan(0);
    expect(within(region).getAllByText("Iron House Gym").length).toBeGreaterThan(0);
    expect(within(region).getByText("ready parallel / pass / score 91")).toBeInTheDocument();
    expect(within(region).getByLabelText("Business fleet scheduling table")).toBeInTheDocument();
    expect(within(region).getByText("dispatch ready first cash bridge action")).toBeInTheDocument();
    expect(within(region).getByText("Fleet execution remains internal")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /load launch gap/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/launch-gap");
    const gapRegion = await screen.findByRole("region", { name: /business fleet launch gap planner/i });

    expect(within(gapRegion).getByText("Revenue Business Fleet Launch Gap Planner")).toBeInTheDocument();
    expect(within(gapRegion).getByText("1/10 businesses are ready for the first wave. Gap 9: 0 repair actions and 9 new opportunity seeds queued internally.")).toBeInTheDocument();
    expect(within(gapRegion).getByRole("region", { name: /business fleet launch gap actions/i })).toBeInTheDocument();
    expect(within(gapRegion).getAllByText("ENTRAL Private Revenue Lane 1").length).toBeGreaterThan(0);
    expect(within(gapRegion).getAllByText("create opportunity shell / ready").length).toBeGreaterThan(0);
    expect(within(gapRegion).getByText("Launch gap remains internal")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview gap seeds/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply", {
      json: {
        confirm: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
        dryRun: true,
        maxSeeds: 10,
        note: "Previewed from Business Fleet launch gap dashboard controls.",
        sourceKeys: businessFleetGapPlan.opportunitySeeds.map((seed) => seed.sourceKey)
      },
      method: "POST"
    });
    expect(await screen.findByText("Fleet gap seed preview ready: 9 seeds selected, 45 drafts planned.")).toBeInTheDocument();
    expect(within(gapRegion).getByText("Gap Seed Receipt")).toBeInTheDocument();
    expect(within(gapRegion).getByText("9 store shells / 45 drafts")).toBeInTheDocument();
    expect(within(gapRegion).getByText("9 internal opportunity seeds previewed from the business-fleet launch gap.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /create gap seeds/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/business-fleet-scheduler/launch-gap/seeds/apply", {
      json: {
        confirm: "CREATE INTERNAL BUSINESS FLEET GAP SEEDS",
        dryRun: false,
        maxSeeds: 10,
        note: "Created from Business Fleet launch gap dashboard controls.",
        sourceKeys: businessFleetGapPlan.opportunitySeeds.map((seed) => seed.sourceKey)
      },
      method: "POST"
    });
    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/portfolio");
    expect(await screen.findByText("Fleet gap seeds created: 9 seeds, 9 store shells, 45 drafts.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview seed acceleration/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/launch-gap/acceleration/apply", {
      json: {
        confirm: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION",
        dryRun: true,
        maxStores: 10,
        note: "Previewed from Business Fleet launch gap acceleration dashboard controls.",
        sourceKeys: businessFleetGapPlan.opportunitySeeds.map((seed) => seed.sourceKey)
      },
      method: "POST"
    });
    expect(await screen.findByText("Fleet gap acceleration preview ready: 9 stores, 45 listing experiments, 9 setup runbooks.")).toBeInTheDocument();
    expect(within(gapRegion).getByText("Gap Acceleration Receipt")).toBeInTheDocument();
    expect(within(gapRegion).getByText("9 launch items / 45 listing experiments / 9 setup runbooks")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /run seed acceleration/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/business-fleet-scheduler/launch-gap/acceleration/apply", {
      json: {
        confirm: "RUN INTERNAL BUSINESS FLEET GAP ACCELERATION",
        dryRun: false,
        maxStores: 10,
        note: "Ran from Business Fleet launch gap acceleration dashboard controls.",
        sourceKeys: businessFleetGapPlan.opportunitySeeds.map((seed) => seed.sourceKey)
      },
      method: "POST"
    });
    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/portfolio");
    expect(await screen.findByText("Fleet gap acceleration ran: 9 stores, 45 listing updates, 9 setup updates.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview live package/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/launch-gap/live-package/apply", {
      json: {
        confirm: "RECORD INTERNAL BUSINESS FLEET LIVE LAUNCH PACKAGE",
        dryRun: true,
        maxStores: 10,
        note: "Previewed from Business Fleet live launch package dashboard controls.",
        sourceKeys: businessFleetGapPlan.opportunitySeeds.map((seed) => seed.sourceKey)
      },
      method: "POST"
    });
    expect(await screen.findByText("Fleet live package preview ready: 9 stores, 9 provider approval packets, 9 operations packs.")).toBeInTheDocument();
    expect(within(gapRegion).getByText("Live Launch Package")).toBeInTheDocument();
    expect(within(gapRegion).getByText("9 payload packages / 9 provider approval packets")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /load launch gate/i }));

    const launchGateParams = new URLSearchParams();
    launchGateParams.set("maxStores", "10");
    for (const seed of businessFleetGapPlan.opportunitySeeds) {
      launchGateParams.append("sourceKeys", seed.sourceKey);
    }

    expect(apiFetch).toHaveBeenLastCalledWith(`/merch/revenue-engine/business-fleet-scheduler/launch-gap/launch-gate?${launchGateParams.toString()}`);
    expect(await screen.findByText("Fleet launch gate checked: 0 ready, 1 need approval, 8 need repair, 0 blocked.")).toBeInTheDocument();
    expect(within(gapRegion).getByText("Launch Gate")).toBeInTheDocument();
    expect(within(gapRegion).getByText("9 packaged business lanes evaluated: 0 ready for manual launch, 1 need approval, 8 need repair, 0 blocked.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview launch wave/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/business-fleet-scheduler/launch-wave/apply", {
      json: {
        confirm: "RUN INTERNAL BUSINESS FLEET LAUNCH WAVE",
        dryRun: true,
        launchWaveSize: 10,
        note: "Previewed from Business Fleet Scheduler dashboard controls."
      },
      method: "POST"
    });
    expect(await screen.findByText("Fleet launch wave preview ready: 1 business selected, 1 internal action previewed.")).toBeInTheDocument();
    expect(within(region).getByText("Launch Wave Selection")).toBeInTheDocument();
    expect(within(region).getByText("1 business selected for the internal launch wave from 1 eligible ready-parallel lane.")).toBeInTheDocument();
    expect(within(region).getByText("Launch Wave Receipt")).toBeInTheDocument();
    expect(within(region).getByText("1 first-business launch action previewed from the fleet wave.")).toBeInTheDocument();
  }, 10_000);

  it("loads and applies the private Money Army batch pipeline through the dashboard", async () => {
    const onRefreshStores = vi.fn();
    const moneyArmyParams = new URLSearchParams();

    moneyArmyParams.set("launchWaveSize", "10");
    moneyArmyParams.set("maxPackets", "25");
    moneyArmyParams.set("maxSeeds", "10");
    moneyArmyParams.set("maxStores", "10");
    for (const seed of businessFleetGapPlan.opportunitySeeds) {
      moneyArmyParams.append("sourceKeys", seed.sourceKey);
    }

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: businessFleetGapPlan })
      .mockResolvedValueOnce({ plan: moneyArmyPipelinePlan, recentRuns: [] })
      .mockResolvedValueOnce(moneyArmyPipelineApplyResponse(true))
      .mockResolvedValueOnce(moneyArmyPipelineApplyResponse(false))
      .mockResolvedValueOnce({ portfolio: portfolioFromPlan(revenuePlan) });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load launch gap/i }));
    await screen.findByRole("region", { name: /business fleet launch gap planner/i });

    await userEvent.click(screen.getByRole("button", { name: /load money army/i }));

    expect(apiFetch).toHaveBeenLastCalledWith(`/merch/revenue-engine/money-army/batches?${moneyArmyParams.toString()}`);
    const region = await screen.findByRole("region", { name: /private money army batch pipeline/i });
    expect(within(region).getByText("Private Money Army Batch Pipeline")).toBeInTheDocument();
    expect(within(region).getByText("Batch Stages")).toBeInTheDocument();
    expect(within(region).getAllByText("Create internal batch").length).toBeGreaterThan(0);
    expect(within(region).getByText("Money Army stays private")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview batch stage/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/batches/apply", {
      json: {
        confirm: "RUN INTERNAL MONEY ARMY BATCH PIPELINE",
        dryRun: true,
        launchWaveSize: 10,
        maxPackets: 25,
        maxSeeds: 10,
        maxStores: 10,
        note: "Previewed from Money Army batch pipeline dashboard controls.",
        sourceKeys: businessFleetGapPlan.opportunitySeeds.map((seed) => seed.sourceKey),
        stage: "batch_creation"
      },
      method: "POST"
    });
    expect(await screen.findByText("Money Army batch creation preview completed.")).toBeInTheDocument();
    expect(within(region).getByText("Batch Receipt")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /run batch stage/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/money-army/batches/apply", {
      json: {
        confirm: "RUN INTERNAL MONEY ARMY BATCH PIPELINE",
        dryRun: false,
        launchWaveSize: 10,
        maxPackets: 25,
        maxSeeds: 10,
        maxStores: 10,
        note: "Ran from Money Army batch pipeline dashboard controls.",
        sourceKeys: businessFleetGapPlan.opportunitySeeds.map((seed) => seed.sourceKey),
        stage: "batch_creation"
      },
      method: "POST"
    });
    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/portfolio");
    expect(await screen.findAllByText("Money Army batch creation recorded internally.")).toHaveLength(2);
    expect(within(region).getByText("Batch Run Ledger")).toBeInTheDocument();
    expect(within(region).getAllByText(/audit audit-money-army-1/)).toHaveLength(2);
    expect(onRefreshStores).toHaveBeenCalledTimes(1);
  });

  it("generates, scores, and records a Money Army candidate batch through the dashboard", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: moneyArmyGenerateScoreBatchPlan, recentRuns: [] })
      .mockResolvedValueOnce(moneyArmyGenerateScoreBatchApplyResponse);

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /generate score batch/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/generate-score-batch?candidateCount=25");
    const region = await screen.findByRole("region", { name: /money army generate and score batch/i });
    expect(within(region).getByText("Money Army Generate & Score Batch")).toBeInTheDocument();
    expect(within(region).getByText("Current Portfolio Scoring")).toBeInTheDocument();
    expect(within(region).getByText("First Business Launch Package")).toBeInTheDocument();
    expect(within(region).getByText("Iron House Gym launch package is ready for approval with 1 product concept, 1 internal AI-ready design draft, 1 faceless content idea, and 1 organic-first move. Scale pressure medium 49/100; kill pressure none 0/100.")).toBeInTheDocument();
    expect(within(region).getByText("AI-ready design draft / provider locked")).toBeInTheDocument();
    expect(within(region).getByText("Prepare approval-ready listing proof")).toBeInTheDocument();
    expect(within(region).getByText("Approval-gated package")).toBeInTheDocument();
    expect(within(region).getByText("Recommended Next Actions")).toBeInTheDocument();
    expect(within(region).getByText("Scale/Kill Pressure Signals")).toBeInTheDocument();
    expect(within(region).getAllByText("Iron House Operator Tee Candidate 1").length).toBeGreaterThan(0);
    expect(within(region).getByText("Generate-score stays internal")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record score batch/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/generate-score-batch/apply", {
      json: {
        candidateCount: 25,
        confirm: "RECORD INTERNAL MONEY ARMY GENERATE SCORE BATCH",
        dryRun: false,
        note: "Recorded from Money Army generate-score dashboard controls.",
        riskTolerance: "Low"
      },
      method: "POST"
    });
    expect(await screen.findAllByText("Money Army generate-score batch recorded internally for 1 candidate.")).toHaveLength(2);
    expect(within(region).getByText("Generate Score Receipt")).toBeInTheDocument();
    expect(within(region).getByText("Batch Run History")).toBeInTheDocument();
    expect(within(region).getAllByText(/audit audit-money-army-score-1/)).toHaveLength(2);
  });

  it("generates and records a First Business Package through the dashboard", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(firstBusinessPackageResponse)
      .mockResolvedValueOnce(firstBusinessPackageApplyResponse)
      .mockResolvedValueOnce(firstStorePrepareApplyResponse)
      .mockResolvedValueOnce(firstBusinessInternalLaunchApplyResponse)
      .mockResolvedValueOnce(firstBusinessExecutionApplyResponse)
      .mockResolvedValueOnce(firstBusinessAutonomousLaunchApplyResponse)
      .mockResolvedValueOnce(firstBusinessLiveExecutorApplyResponse);

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /generate first package/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/first-business-package?candidateCount=25&maxProducts=10");
    const region = await screen.findByRole("region", { name: /money army generate and score batch/i });
    expect(within(region).getByText("First Business Launch Package")).toBeInTheDocument();
    expect(within(region).getByText("Iron House Gym launch package is ready for approval with 1 product concept, 1 internal AI-ready design draft, 1 faceless content idea, and 1 organic-first move. Scale pressure medium 49/100; kill pressure none 0/100.")).toBeInTheDocument();
    expect(within(region).getByText("AI-ready design draft / provider locked")).toBeInTheDocument();
    expect(within(region).getByText((text) => text.includes("Approve each internal design draft, AI-ready prompt, negative prompt, mockup direction, and compliance note before artwork generation."))).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record first package/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/first-business-package/apply", {
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
    expect(await screen.findAllByText("First Business Launch Package recorded internally for Iron House Gym.")).toHaveLength(2);
    expect(within(region).getAllByText(/audit audit-first-package-1/)).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: /approve & prepare/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/first-business-package/approve-prepare", {
      json: {
        candidateCount: 25,
        confirm: "APPROVE AND PREPARE FIRST STORE",
        dryRun: false,
        maxProducts: 10,
        note: "Approved and prepared from First Business Package dashboard controls.",
        riskTolerance: "Low"
      },
      method: "POST"
    });
    expect(await screen.findAllByText("Iron House Gym approved internally and prepared for first-store execution.")).toHaveLength(2);
    expect(within(region).getByText("Prepare First Store")).toBeInTheDocument();
    expect(within(region).getByText("Store config ready internally")).toBeInTheDocument();
    expect(within(region).getByText("Organic-first traffic ready internally")).toBeInTheDocument();
    expect(within(region).getByText("Live execution remains locked")).toBeInTheDocument();
    expect(within(region).getAllByText(/audit audit-first-store-prepare-1/)).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: /approve for launch/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/first-business/launch", {
      json: {
        candidateCount: 25,
        confirm: "LAUNCH FIRST BUSINESS INTERNALLY",
        dryRun: false,
        maxProducts: 5,
        note: "Approved for Launch and final internal execution packet created from dashboard controls.",
        riskTolerance: "Low"
      },
      method: "POST"
    });
    expect(await screen.findAllByText("Iron House Gym is approved for launch internally. External execution remains locked.")).toHaveLength(2);
    expect(within(region).getByText("Launch First Business")).toBeInTheDocument();
    expect(within(region).getByText("Final execution packet ready")).toBeInTheDocument();
    expect(within(region).getByText(/3 product setup packets \/ 3 faceless content ideas \/ 3 organic moves/)).toBeInTheDocument();
    expect(within(region).getByText("Store setup queued internally")).toBeInTheDocument();
    expect(within(region).getByText("Organic-first launch moves queued")).toBeInTheDocument();
    expect(within(region).getByText("Execution sequence ready internally")).toBeInTheDocument();
    expect(within(region).getByText("External launch remains locked")).toBeInTheDocument();
    expect(within(region).getAllByText(/audit audit-first-business-launch-1/)).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: /execute first business/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/first-business/execute", {
      json: {
        candidateCount: 25,
        confirm: "EXECUTE FIRST BUSINESS INTERNALLY",
        dryRun: false,
        maxProducts: 5,
        note: "Execute First Business manual and semi-automated launch prep created from dashboard controls.",
        riskTolerance: "Low"
      },
      method: "POST"
    });
    expect(await screen.findAllByText("Iron House Gym is Ready to Launch First Business. Manual and semi-automated launch prep are ready; external execution remains locked.")).toHaveLength(2);
    expect(within(region).getByText("Execute First Business")).toBeInTheDocument();
    expect(within(region).getByText("Ready to Launch First Business")).toBeInTheDocument();
    expect(within(region).getByText("First Launch Readiness Gate")).toBeInTheDocument();
    expect(within(region).getByText("Iron House Operator Tee 1")).toBeInTheDocument();
    expect(within(region).getAllByText(/Iron House Gym First Drop/).length).toBeGreaterThan(0);
    expect(within(region).getByText("Launch handoff packet")).toBeInTheDocument();
    expect(within(region).getByText("Full execution packet visible")).toBeInTheDocument();
    expect(within(region).getByText("Semi-automated preparation queue")).toBeInTheDocument();
    expect(within(region).getByText("First revenue start plan")).toBeInTheDocument();
    expect(within(region).getByText("First-week tracking plan")).toBeInTheDocument();
    expect(within(region).getByText("Execution stays private")).toBeInTheDocument();
    expect(within(region).getAllByText(/audit audit-first-business-execute-1/)).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: /autonomous launch prep/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/first-business/autonomous-launch", {
      json: {
        candidateCount: 25,
        confirm: "RUN AUTONOMOUS FIRST BUSINESS LAUNCH PREP",
        dryRun: false,
        maxProducts: 5,
        note: "Autonomous first-business launch prep created from dashboard controls.",
        riskTolerance: "Low"
      },
      method: "POST"
    });
    expect(await screen.findAllByText("Iron House Gym is autonomous-ready until payment. ENTRAL prepared the launch packet; provider, payment, publishing, upload, browser, and spend actions remain locked.")).toHaveLength(2);
    expect(within(region).getByText("Autonomous First Business Launch")).toBeInTheDocument();
    expect(within(region).getByText("Autonomous First Business Launch Prep")).toBeInTheDocument();
    expect(within(region).getByText("Autonomous until payment")).toBeInTheDocument();
    expect(within(region).getByText("Store build plan")).toBeInTheDocument();
    expect(within(region).getByText("Supplier selection")).toBeInTheDocument();
    expect(within(region).getByText("Connector plan")).toBeInTheDocument();
    expect(within(region).getByText("Chain Of Command")).toBeInTheDocument();
    expect(within(region).getByText("Ad Campaign Drafts")).toBeInTheDocument();
    expect(within(region).getByText("Payment Approval Queue")).toBeInTheDocument();
    expect(within(region).getByText("Final owner gate")).toBeInTheDocument();
    expect(within(region).getByText("Autonomous launch remains private")).toBeInTheDocument();
    expect(within(region).getAllByText(/audit audit-first-business-autonomous-1/)).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: /build live executor/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/money-army/first-business/live-executor", {
      json: {
        adDraftApproval: false,
        candidateCount: 25,
        confirm: "PREPARE CONTROLLED LIVE FIRST BUSINESS EXECUTOR",
        connectorApproval: false,
        dryRun: false,
        maxProducts: 5,
        note: "Controlled live executor prepared from dashboard controls.",
        publicLaunchApproval: false,
        riskTolerance: "Low"
      },
      method: "POST"
    });
    expect(await screen.findAllByText("Iron House Gym controlled live executor prepared. Owner unlock, connector approval, public launch approval, or ad draft approval is still incomplete.")).toHaveLength(2);
    expect(within(region).getAllByText("Controlled Live First Business Executor").length).toBeGreaterThan(0);
    expect(within(region).getAllByText(/ready for owner unlock/i).length).toBeGreaterThan(0);
    expect(within(region).getByText("Credential Readiness")).toBeInTheDocument();
    expect(within(region).getByText("Provider Action Manifests")).toBeInTheDocument();
    expect(within(region).getByText("Live Runbook")).toBeInTheDocument();
    expect(within(region).getByText("Payment Locked Queue")).toBeInTheDocument();
    expect(within(region).getByText("Rollback Plan")).toBeInTheDocument();
    expect(within(region).getByText("Live executor remains controlled")).toBeInTheDocument();
    expect(within(region).getAllByText(/audit audit-first-business-live-executor-1/)).toHaveLength(2);
  });

  it("runs the Revenue Engine and applies internal rotation only after preview", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ dashboard: revenuePortfolioDashboard })
      .mockResolvedValueOnce(assetActionResponse(revenuePlan, "product-2", "kill", true))
      .mockResolvedValueOnce(assetActionResponse(revenuePlan, "product-2", "kill", false))
      .mockResolvedValueOnce({ dashboard: revenuePortfolioDashboard })
      .mockResolvedValueOnce({ portfolio: portfolioFromPlan(revenuePlan) })
      .mockResolvedValueOnce(assetBatchActionResponse(revenuePlan, true))
      .mockResolvedValueOnce(assetBatchActionResponse(revenuePlan, false))
      .mockResolvedValueOnce(assetActionResponse(revenuePlan, "product-2", "kill", false))
      .mockResolvedValueOnce({ ledger: revenueAssetControlLedgerPlan })
      .mockResolvedValueOnce(rotationResponse(revenuePlan, true))
      .mockResolvedValueOnce(rotationResponse(revenuePlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    expect(screen.getByText("Revenue Engine")).toBeInTheDocument();
    expect(screen.getByText("Internal Portfolio Mode")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /load dashboard/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/dashboard");
    expect(await screen.findByText("Revenue Engine Portfolio Dashboard")).toBeInTheDocument();
    expect(screen.getByText("4 scored assets with $10.86/day profit velocity, 1 review item, 5 command actions, and high operating risk.")).toBeInTheDocument();
    expect(screen.getByText("Risk")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("Next Scored Moves")).toBeInTheDocument();
    expect(screen.getByText("Archive internally / Iron House Gym")).toBeInTheDocument();

    const dashboardNextMoves = screen.getByLabelText("Revenue portfolio dashboard next actions");
    await userEvent.click(within(dashboardNextMoves).getByRole("button", { name: /preview kill for weak tee/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/portfolio/action", {
      json: {
        action: "kill",
        assetId: "product-2",
        assetType: "product",
        confirm: "APPLY INTERNAL ASSET ACTION",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText(/kill preview ready for Weak Tee/i)).toBeInTheDocument();
    expect(screen.getByText("Latest Asset Control Review")).toBeInTheDocument();
    expect(screen.getByText("high risk / matches recommendation / internal status change")).toBeInTheDocument();
    expect(screen.getByText("kill is matches scoring, internal status change, product status change, high review risk.")).toBeInTheDocument();
    expect(screen.getByText("product status change / review required")).toBeInTheDocument();

    await userEvent.click(within(dashboardNextMoves).getByRole("button", { name: /record kill for weak tee/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/portfolio/action", {
      json: {
        action: "kill",
        assetId: "product-2",
        assetType: "product",
        confirm: "APPLY INTERNAL ASSET ACTION",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText(/kill recorded for Weak Tee/i)).toBeInTheDocument();
    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/dashboard"));

    await userEvent.click(screen.getByRole("button", { name: /run engine/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/portfolio");
    expect(await screen.findByText("Revenue Engine Asset Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Asset")).toBeInTheDocument();
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
    expect(screen.getByText("Reason")).toBeInTheDocument();
    expect(screen.getByText("Next State")).toBeInTheDocument();
    expect(screen.getAllByText("Iron House Gym").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Weak Tee").length).toBeGreaterThan(0);
    expect(screen.getAllByText("scale: 2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("pause: 1").length).toBeGreaterThan(0);
    expect(screen.getByText("Profit Velocity")).toBeInTheDocument();
    expect(screen.getAllByText("$10.86/day").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Signals").length).toBeGreaterThan(0);
    expect(screen.getByText("2/3")).toBeInTheDocument();
    expect(screen.getByText("Rotation")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /select command-ready/i }));
    expect(screen.getByText("4 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview selected/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/portfolio/actions", {
      json: {
        actions: expect.arrayContaining([
          expect.objectContaining({ action: "scale", assetId: "product-1", assetType: "product" }),
          expect.objectContaining({ action: "kill", assetId: "product-2", assetType: "product" }),
          expect.objectContaining({ action: "scale", assetId: "store-1", assetType: "store" }),
          expect.objectContaining({ action: "pause", assetId: "store-2", assetType: "store" })
        ]),
        confirm: "APPLY INTERNAL ASSET BATCH",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Batch preview ready: 4 selected asset actions, 2 internal state changes, 0 skipped.")).toBeInTheDocument();
    expect(screen.getByText("Latest Batch Control Review")).toBeInTheDocument();
    expect(screen.getByText("high risk / 4 matched / 0 overrides")).toBeInTheDocument();
    expect(screen.getByText("4 batch asset actions reviewed: 4 match scoring, 0 dashboard overrides, 2 internal status changes, 2 audit-only intents, high review risk. 0 skipped.")).toBeInTheDocument();
    expect(screen.getByText("2 internal status changes / 2 audit-only / review required")).toBeInTheDocument();
    expect(screen.getByText("1 product changes / 1 store changes / 0 skipped")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply selected/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/portfolio/actions", {
      json: {
        actions: expect.arrayContaining([
          expect.objectContaining({ action: "kill", assetId: "product-2", assetType: "product" }),
          expect.objectContaining({ action: "pause", assetId: "store-2", assetType: "store" })
        ]),
        confirm: "APPLY INTERNAL ASSET BATCH",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Batch actions recorded: 4 asset actions and 2 internal state changes. Audit log audit-asset-batch-1.")).toBeInTheDocument();

    const weakRow = screen.getByRole("row", { name: /Weak Tee/i });
    expect(within(weakRow).getAllByRole("button")).toHaveLength(5);
    await userEvent.click(within(weakRow).getByRole("button", { name: /^kill$/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/portfolio/action", {
      json: {
        action: "kill",
        assetId: "product-2",
        assetType: "product",
        confirm: "APPLY INTERNAL ASSET ACTION",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText(/kill recorded for Weak Tee/i)).toBeInTheDocument();

    const weakRowAfterAction = screen.getByRole("row", { name: /Weak Tee/i });
    await userEvent.click(within(weakRowAfterAction).getByRole("button", { name: /history/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/asset-controls?assetId=product-2&assetType=product&limit=25&storeId=store-1");
    expect(await screen.findByText("Revenue Engine Asset Control Ledger")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview rotation/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/rotation/apply", {
      json: {
        confirm: "APPLY INTERNAL ROTATION",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Dry run ready: 2 internal rotation changes identified.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply internal rotation/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/rotation/apply", {
      json: {
        confirm: "APPLY INTERNAL ROTATION",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Internal rotation applied: 2 changes recorded. Audit log audit-revenue-1.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(4);
  }, 15000);

  it("loads the Revenue Engine asset control ledger", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ ledger: revenueAssetControlLedgerPlan });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.selectOptions(screen.getByLabelText(/ledger action/i), "watch");
    await userEvent.selectOptions(screen.getByLabelText(/ledger asset type/i), "product");
    await userEvent.type(screen.getByLabelText(/ledger asset id/i), "product-2");
    await userEvent.type(screen.getByLabelText(/ledger from date/i), "2026-06-01");
    await userEvent.type(screen.getByLabelText(/ledger to date/i), "2026-06-03");
    await userEvent.click(screen.getByLabelText(/overrides only/i));
    await userEvent.click(screen.getByRole("button", { name: /load action ledger/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/asset-controls?action=watch&assetId=product-2&assetType=product&fromDate=2026-06-01&includeOverridesOnly=true&limit=25&toDate=2026-06-03");
    expect(await screen.findByText("Revenue Engine Asset Control Ledger")).toBeInTheDocument();
    expect(screen.getByText("Records")).toBeInTheDocument();
    expect(screen.getByText("Overrides")).toBeInTheDocument();
    expect(screen.getByText("Weak Tee")).toBeInTheDocument();
    expect(screen.getByText("Dashboard override requested watch while the scoring engine recommended kill.")).toBeInTheDocument();
    expect(screen.getByText("override")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("Executing provider, marketplace, POD, ad, social, payment, bank, payout, upload, browser, proxy, or external write actions")).toBeInTheDocument();
  });

  it("loads the Revenue Engine asset control recovery queue", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ recovery: revenueAssetControlRecoveryPlan });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.clear(screen.getByLabelText(/ledger limit/i));
    await userEvent.type(screen.getByLabelText(/ledger limit/i), "10");
    await userEvent.clear(screen.getByLabelText(/queue stale days/i));
    await userEvent.type(screen.getByLabelText(/queue stale days/i), "21");
    await userEvent.click(screen.getByRole("button", { name: /load recovery/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/asset-controls/recovery?limit=10&staleAfterDays=21");
    expect(await screen.findByText("Revenue Engine Asset Control Recovery")).toBeInTheDocument();
    expect(screen.getByText("Ready Replay")).toBeInTheDocument();
    expect(screen.getByText("ready to replay")).toBeInTheDocument();
    expect(screen.getByText("Weak Tee")).toBeInTheDocument();
    expect(screen.getByText("The latest score still matches the ledger decision and the internal status change can be replayed after operator approval.")).toBeInTheDocument();
    expect(screen.getByText("Needs Revision")).toBeInTheDocument();
  });

  it("loads the Revenue Engine asset review queue", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: revenueAssetReviewQueuePlan })
      .mockResolvedValueOnce(assetActionResponse(revenuePlan, "product-2", "kill", false))
      .mockResolvedValueOnce({ plan: emptyRevenueAssetReviewQueuePlan });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.clear(screen.getByLabelText(/queue max items/i));
    await userEvent.type(screen.getByLabelText(/queue max items/i), "8");
    await userEvent.clear(screen.getByLabelText(/queue stale days/i));
    await userEvent.type(screen.getByLabelText(/queue stale days/i), "21");
    await userEvent.click(screen.getByLabelText(/include watch/i));
    await userEvent.click(screen.getByRole("button", { name: /load asset review queue/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/review-queue?includeWatch=true&maxItems=8&staleAfterDays=21");
    expect(await screen.findByText("Revenue Engine Asset Review Queue")).toBeInTheDocument();
    expect(screen.getByText("Scale Ready")).toBeInTheDocument();
    expect(screen.getByText("Pause/Kill")).toBeInTheDocument();
    expect(screen.getByText("override review")).toBeInTheDocument();
    expect(screen.getByText("1 record")).toBeInTheDocument();
    expect(screen.getByText("2d old")).toBeInTheDocument();
    expect(screen.getByText("1 override")).toBeInTheDocument();
    expect(screen.getByText("resolve override against current score")).toBeInTheDocument();
    expect(screen.getByText("Latest control overrode kill with watch; review against the current kill score before the next internal action.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record kill/i }));

    expect(apiFetch).toHaveBeenNthCalledWith(2, "/merch/revenue-engine/portfolio/action", {
      json: {
        action: "kill",
        assetId: "product-2",
        assetType: "product",
        confirm: "APPLY INTERNAL ASSET ACTION",
        dryRun: false
      },
      method: "POST"
    });
    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/review-queue?includeWatch=true&maxItems=8&staleAfterDays=21");
    expect(await screen.findByText("kill recorded for Weak Tee from review queue: 1 internal state change. Audit log audit-asset-1.")).toBeInTheDocument();
    expect(screen.getByText("No asset review items are queued under the current options.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(1);
  });

  it("records selected Revenue Engine asset review queue items", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: revenueAssetReviewQueuePlan })
      .mockResolvedValueOnce(reviewQueueBatchActionResponse(revenuePlan, false))
      .mockResolvedValueOnce({ plan: emptyRevenueAssetReviewQueuePlan });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load asset review queue/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/review-queue?maxItems=12&staleAfterDays=14");
    expect(await screen.findByText("Revenue Engine Asset Review Queue")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /select queue/i }));

    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record selected queue/i }));

    expect(apiFetch).toHaveBeenNthCalledWith(2, "/merch/revenue-engine/portfolio/actions", {
      json: {
        actions: [{
          action: "kill",
          assetId: "product-2",
          assetType: "product"
        }],
        confirm: "APPLY INTERNAL ASSET BATCH",
        dryRun: false
      },
      method: "POST"
    });
    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/review-queue?maxItems=12&staleAfterDays=14");
    expect(await screen.findByText("Review queue batch recorded: 1 asset action and 1 internal state change. Audit log audit-review-queue-batch-1.")).toBeInTheDocument();
    expect(screen.getByText("No asset review items are queued under the current options.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(1);
  });

  it("builds and records the Portfolio Command Center", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: portfolioCommandPlan })
      .mockResolvedValueOnce(portfolioCommandResponse(portfolioCommandPlan, true))
      .mockResolvedValueOnce(portfolioCommandResponse(portfolioCommandPlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build command center/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/portfolio-command-center");
    expect(await screen.findByText("Internal Portfolio Command Center")).toBeInTheDocument();
    expect(screen.getByText("Risk Lanes")).toBeInTheDocument();
    expect(screen.getByText("Command Actions")).toBeInTheDocument();
    expect(screen.getByText("Asset Commands")).toBeInTheDocument();
    expect(screen.getByText(/revenue_engine \+ performance_velocity/i)).toBeInTheDocument();
    expect(screen.getAllByText("Weak Tee").length).toBeGreaterThan(0);
    expect(screen.getByText("Owner income payout review")).toBeInTheDocument();
    expect(screen.getByText("Core Tee Ad/Growth budget")).toBeInTheDocument();
    expect(screen.getByText("Scale Budget")).toBeInTheDocument();
    expect(screen.getByText("Scale Outcomes")).toBeInTheDocument();
    expect(screen.getByText("0 next / 0 stop")).toBeInTheDocument();
    expect(screen.getByText("review scale budget: 1")).toBeInTheDocument();
    expect(screen.getByText("Browser stealth, anti-detection, proxy rotation, fingerprint spoofing, or platform evasion automation")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview commands/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/portfolio-command-center/actions/apply", {
      json: {
        confirm: "APPLY INTERNAL PORTFOLIO COMMAND ACTIONS",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Command preview ready: 5 records and 2 internal status updates identified. 2 asset-control ledger records identified.")).toBeInTheDocument();
    expect(screen.getByText("Command Asset-Control Review")).toBeInTheDocument();
    expect(screen.getByText("high risk / 4 matched / 0 overrides")).toBeInTheDocument();
    expect(screen.getByText("4 batch asset actions reviewed: 4 match scoring, 0 dashboard overrides, 2 internal status changes, 2 audit-only intents, high review risk. 0 skipped.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record commands/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/portfolio-command-center/actions/apply", {
      json: {
        confirm: "APPLY INTERNAL PORTFOLIO COMMAND ACTIONS",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Portfolio commands recorded: 5 command records and 2 internal status updates applied. 2 asset-control ledger records created. Audit log audit-portfolio-command-1.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(1);
  });

  it("builds and applies the internal Revenue Launch Pipeline queue", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: launchPipelinePlan })
      .mockResolvedValueOnce(launchPipelineResponse(launchPipelinePlan, true))
      .mockResolvedValueOnce(launchPipelineResponse(launchPipelinePlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build launch queue/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/launch-pipeline");
    expect(await screen.findByText("Internal Launch Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Seed product drafts for Iron House Gym")).toBeInTheDocument();
    expect(screen.getByText("Queue launch approval for Slow Lane Studio")).toBeInTheDocument();
    expect(screen.getByText("Draft Profit")).toBeInTheDocument();
    expect(screen.getByText("Creating or publishing marketplace listings")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview launch apply/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-pipeline/apply", {
      json: {
        confirm: "CREATE INTERNAL LAUNCH QUEUE",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Launch preview ready: 5 draft products and 1 approval packet would be queued.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply launch queue/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-pipeline/apply", {
      json: {
        confirm: "CREATE INTERNAL LAUNCH QUEUE",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Internal launch queue applied: 2 product drafts and 1 approval packet recorded. Audit log audit-launch-1.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(1);
  });

  it("builds and applies the internal Digital Product Portfolio queue", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: digitalProductPlan })
      .mockResolvedValueOnce(digitalProductResponse(digitalProductPlan, true))
      .mockResolvedValueOnce(digitalProductResponse(digitalProductPlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build digital queue/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/digital-products");
    expect(await screen.findByText("Internal Digital Product Portfolio")).toBeInTheDocument();
    expect(screen.getByText("Iron House Gym Printable execution planner")).toBeInTheDocument();
    expect(screen.getByText("Printable Planner / $17.00 / 92.0% margin")).toBeInTheDocument();
    expect(screen.getByText("Digital execution remains blocked")).toBeInTheDocument();
    expect(screen.getByText("Uploading digital files to a marketplace or file host")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview digital apply/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/digital-products/apply", {
      json: {
        confirm: "CREATE INTERNAL DIGITAL PRODUCT QUEUE",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Digital preview ready: 2 internal digital product drafts would be queued.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply digital queue/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/digital-products/apply", {
      json: {
        confirm: "CREATE INTERNAL DIGITAL PRODUCT QUEUE",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Internal digital queue applied: 2 digital product drafts recorded. Audit log audit-digital-1.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(1);
  });

  it("builds and applies the internal Faceless Content Pipeline queue", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: facelessContentPlan })
      .mockResolvedValueOnce(facelessContentResponse(facelessContentPlan, true))
      .mockResolvedValueOnce(facelessContentResponse(facelessContentPlan, false))
      .mockResolvedValueOnce({ digest: facelessContentDigest });

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build content queue/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/faceless-content/pipeline");
    expect(await screen.findByText("Internal Faceless Content Pipeline")).toBeInTheDocument();
    expect(screen.getByText("Iron House Gym Core Tee faceless short")).toBeInTheDocument();
    expect(screen.getByText("Provider Readiness")).toBeInTheDocument();
    expect(screen.getByText("Content execution remains blocked")).toBeInTheDocument();
    expect(screen.getByText("Uploading, scheduling, publishing, deleting, or editing social content")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview content apply/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/faceless-content/pipeline/apply", {
      json: {
        confirm: "CREATE INTERNAL FACELESS CONTENT PIPELINE",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Content preview ready: 1 internal brief would be recorded.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply content queue/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/faceless-content/pipeline/apply", {
      json: {
        confirm: "CREATE INTERNAL FACELESS CONTENT PIPELINE",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Faceless content queue recorded: 1 brief stored. Audit log audit-content-1.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /load content metrics/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/faceless-content/performance");
    expect(await screen.findByText("Faceless Content Performance")).toBeInTheDocument();
    expect(screen.getByText("Content has enough clicks and positive net revenue for remix planning.")).toBeInTheDocument();
  });

  it("builds and applies the internal Listing Optimization queue", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: listingOptimizationPlan })
      .mockResolvedValueOnce(listingOptimizationResponse(listingOptimizationPlan, true))
      .mockResolvedValueOnce(listingOptimizationResponse(listingOptimizationPlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build listing tests/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/listing-optimization");
    expect(await screen.findByText("Internal Listing Optimization Queue")).toBeInTheDocument();
    expect(screen.getByText("Iron House Gym Original operator series T-shirt")).toBeInTheDocument();
    expect(screen.getByText("Listing execution remains blocked")).toBeInTheDocument();
    expect(screen.getByText("Publishing or editing Etsy listings")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview listing apply/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/listing-optimization/apply", {
      json: {
        confirm: "APPLY INTERNAL LISTING OPTIMIZATION",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Listing preview ready: 1 internal listing draft would be updated.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply listing tests/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/listing-optimization/apply", {
      json: {
        confirm: "APPLY INTERNAL LISTING OPTIMIZATION",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Internal listing optimization applied: 1 draft updated. Audit log audit-listing-1.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(1);
  });

  it("builds and applies the internal Store Setup Runbook", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: storeSetupPlan })
      .mockResolvedValueOnce(storeSetupResponse(storeSetupPlan, true))
      .mockResolvedValueOnce(storeSetupResponse(storeSetupPlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build setup runbook/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/store-setup");
    expect(await screen.findByText("Internal Store Setup Runbook")).toBeInTheDocument();
    expect(screen.getByText("Prepare store setup runbook for Iron House Gym")).toBeInTheDocument();
    expect(screen.getByText("Iron House Gym Launch Collection")).toBeInTheDocument();
    expect(screen.getByText("write_products")).toBeInTheDocument();
    expect(screen.getByText("Store setup execution remains blocked")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview setup apply/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/store-setup/apply", {
      json: {
        confirm: "APPLY INTERNAL STORE SETUP RUNBOOK",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Store setup preview ready: 1 internal store status update identified.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply setup runbook/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/store-setup/apply", {
      json: {
        confirm: "APPLY INTERNAL STORE SETUP RUNBOOK",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Internal store setup applied: 1 store status update recorded. Audit log audit-store-setup-1.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(1);
  });

  it("builds and applies the internal Financial Orchestrator records", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: financialPlan })
      .mockResolvedValueOnce(financialResponse(financialPlan, true))
      .mockResolvedValueOnce(financialResponse(financialPlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build finance split/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/financial-orchestrator/plan");
    expect(await screen.findByText("Internal Financial Orchestrator")).toBeInTheDocument();
    expect(screen.getByText("Ad/Growth bucket: $75.00")).toBeInTheDocument();
    expect(screen.getByText("Ad/Growth Budgets")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Core Tee") && content.includes("$30.00"))).toBeInTheDocument();
    expect(screen.getAllByText("Portfolio Signal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("scale reinvestment review").length).toBeGreaterThan(0);
    expect(screen.getByText("Advisory Context")).toBeInTheDocument();
    expect(screen.getByText("Revenue Engine scoring context")).toBeInTheDocument();
    expect(screen.getByText(/Revenue Engine scoring is attached as advisory finance context/)).toBeInTheDocument();
    expect(screen.getByText("Portfolio Pressure")).toBeInTheDocument();
    expect(screen.getByText("Ad/Growth pressure")).toBeInTheDocument();
    expect(screen.getByText("Kill pressure")).toBeInTheDocument();
    expect(screen.getByText("Pressure decision")).toBeInTheDocument();
    expect(screen.getByText("Scale pressure 86/100 supports organic-first growth packets. Kill pressure 0/100 does not block, but paid spend remains locked.")).toBeInTheDocument();
    expect(screen.getByText("2 scored assets are pressing for scaling review; top asset Core Tee ranks 88/100 with $28.57/day profit velocity.")).toBeInTheDocument();
    expect(screen.getByText("No scored assets currently create kill pressure for finance allocation.")).toBeInTheDocument();
    expect(screen.getByText("Core Tee 88/100 $28.57/day | Iron House Gym 76/100 $14.29/day")).toBeInTheDocument();
    expect(screen.getByText("Owner income payout intent: $150.00")).toBeInTheDocument();
    expect(screen.getByText("25/25/50 split balance")).toBeInTheDocument();
    expect(screen.getByText("Financial execution remains blocked")).toBeInTheDocument();
    expect(screen.getByText("Calling Stripe Treasury, Stripe Connect, bank, card, or payment write APIs")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview finance apply/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/apply", {
      json: {
        confirm: "APPLY INTERNAL FINANCIAL ORCHESTRATOR",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Financial preview ready: 1 ledger entry, 3 payout intents and 2 Ad/Growth budget packets identified.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply finance records/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/apply", {
      json: {
        confirm: "APPLY INTERNAL FINANCIAL ORCHESTRATOR",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Financial Orchestrator applied: 1 ledger entry, 3 payout intents and 2 Ad/Growth budget packets recorded. Audit log audit-finance-1.")).toBeInTheDocument();
  });

  it("loads and reviews Financial Orchestrator payout intents", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: financialReviewPlan })
      .mockResolvedValueOnce(financialReviewApplyResponse);

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load payout review/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/financial-orchestrator/payout-intents/review");
    expect(await screen.findByText("Internal Payout Review Center")).toBeInTheDocument();
    expect(screen.getByText("Ad/Growth bucket payout review: $75.00")).toBeInTheDocument();
    expect(screen.getByText("Ad/Growth bucket release packet")).toBeInTheDocument();
    expect(screen.getByText("treasury.outbound_payments.write")).toBeInTheDocument();
    expect(screen.getByText("Payout execution remains blocked")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /approve manual handoff/i })[0]);

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/payout-intents/intent-scaling/review", {
      json: {
        action: "approve",
        confirm: "APPROVE FINANCIAL PAYOUT INTENT",
        note: "Approved for manual handoff only. No financial provider execution is authorized."
      },
      method: "POST"
    });
    expect(await screen.findByText("Payout intent approved for manual handoff. Audit log audit-finance-review-1. No money moved.")).toBeInTheDocument();
    expect(screen.getByText(/approved manual handoff/)).toBeInTheDocument();
  });

  it("loads and reviews Financial Orchestrator scaling budget packets", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: financialScalingBudgetReviewPlan })
      .mockResolvedValueOnce(financialScalingBudgetReviewApplyResponse);

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load scale budgets/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/financial-orchestrator/scaling-budgets/review");
    expect(await screen.findByText("Internal Scaling Budget Review")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Core Tee") && content.includes("$30.00"))).toBeInTheDocument();
    expect(screen.getByText("Scaling execution remains blocked")).toBeInTheDocument();
    expect(screen.getByText("Increasing ad spend, procurement spend, or product spend without a separate approved scaling budget")).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: /approve manual handoff/i })[0]);

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/scaling-budgets/scale_budget_product_1/review", {
      json: {
        action: "approve",
        confirm: "APPROVE FINANCIAL SCALING BUDGET",
        note: "Approved for internal manual scaling budget handoff only. No provider execution is authorized."
      },
      method: "POST"
    });
    expect(await screen.findByText("Scaling budget approved for manual handoff. Audit log audit-scale-budget-review-1. No provider was contacted.")).toBeInTheDocument();
    expect(screen.getByText(/approved manual handoff/)).toBeInTheDocument();
  });

  it("builds and records Financial Scaling Spend Control packets", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: financialScalingSpendControlPlan })
      .mockResolvedValueOnce(financialScalingSpendControlResponse(financialScalingSpendControlPlan, true))
      .mockResolvedValueOnce(financialScalingSpendControlResponse(recordedFinancialScalingSpendControlPlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build spend controls/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/financial-orchestrator/scaling-spend-control");
    expect(await screen.findByText("Internal Scaling Spend Control")).toBeInTheDocument();
    expect(screen.getByText("Spend Controls")).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes("Core Tee") && content.includes("$21.00"))).toBeInTheDocument();
    expect(screen.getByText("Scaling spend execution remains blocked")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview spend controls/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/scaling-spend-control/apply", {
      json: {
        confirm: "RECORD FINANCIAL SCALING SPEND CONTROLS",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Scaling spend preview ready: 2 spend control packets identified.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record spend controls/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/scaling-spend-control/apply", {
      json: {
        confirm: "RECORD FINANCIAL SCALING SPEND CONTROLS",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Scaling spend controls recorded: 2 packets. Audit log audit-scale-spend-control-1. No spend executed.")).toBeInTheDocument();
    expect(screen.getByText("Recorded Spend Controls")).toBeInTheDocument();
  });

  it("loads and records Financial Scaling Execution Ledger outcomes", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: financialScalingExecutionLedgerPlan })
      .mockResolvedValueOnce(financialScalingExecutionLedgerResponse(recordedFinancialScalingExecutionLedgerPlan, true))
      .mockResolvedValueOnce(financialScalingExecutionLedgerResponse(recordedFinancialScalingExecutionLedgerPlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load scale outcomes/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/financial-orchestrator/scaling-execution-ledger");
    expect(await screen.findByText("Internal Scaling Execution Ledger")).toBeInTheDocument();
    expect(screen.getByText("Scaling outcome records do not execute spend")).toBeInTheDocument();
    expect(screen.getAllByText("record manual outcome").length).toBeGreaterThan(0);

    await userEvent.clear(screen.getByLabelText(/scale amount spent/i));
    await userEvent.type(screen.getByLabelText(/scale amount spent/i), "12.5");
    await userEvent.clear(screen.getByLabelText(/scale gross revenue/i));
    await userEvent.type(screen.getByLabelText(/scale gross revenue/i), "75");
    await userEvent.clear(screen.getByLabelText(/scale net profit/i));
    await userEvent.type(screen.getByLabelText(/scale net profit/i), "31.25");
    await userEvent.clear(screen.getByLabelText(/scale units/i));
    await userEvent.type(screen.getByLabelText(/scale units/i), "2");
    await userEvent.clear(screen.getByLabelText(/scale visits/i));
    await userEvent.type(screen.getByLabelText(/scale visits/i), "44");
    await userEvent.selectOptions(screen.getByLabelText(/scale source/i), "operator_reconciliation");
    await userEvent.clear(screen.getByLabelText(/scale notes/i));
    await userEvent.type(screen.getByLabelText(/scale notes/i), "Operator verified first paid test.");

    await userEvent.click(screen.getByRole("button", { name: /preview outcome/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/scaling-execution-ledger/entries", {
      json: expect.objectContaining({
        confirm: "INGEST INTERNAL SCALING EXECUTION OUTCOMES",
        dryRun: true,
        entries: [expect.objectContaining({
          amountSpent: 12.5,
          grossRevenue: 75,
          netProfit: 31.25,
          notes: "Operator verified first paid test.",
          outcome: "validated",
          scalingSpendPacketId: "scale-spend-record-1",
          source: "operator_reconciliation",
          unitsSold: 2,
          visits: 44
        })]
      }),
      method: "POST"
    });
    expect(await screen.findByText("Scaling outcome preview ready: 1 entry scored.")).toBeInTheDocument();
    expect(screen.getByText("queue next scaling budget review")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record outcome/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/scaling-execution-ledger/entries", {
      json: expect.objectContaining({
        confirm: "INGEST INTERNAL SCALING EXECUTION OUTCOMES",
        dryRun: false,
        entries: [expect.objectContaining({
          amountSpent: 12.5,
          scalingSpendPacketId: "scale-spend-record-1",
          source: "operator_reconciliation"
        })]
      }),
      method: "POST"
    });
    expect(await screen.findByText("Scaling outcome recorded: 1 entry. Audit log audit-scale-execution-1. No external action executed.")).toBeInTheDocument();
    expect(screen.getByText("Recent Outcome Evidence")).toBeInTheDocument();
    expect(screen.getByText("Executing ad spend, procurement spend, creative spend, product orders, software purchases, payouts, transfers, or card charges")).toBeInTheDocument();
  }, 15000);

  it("builds and records Financial Release Governance", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: financialGovernancePlan })
      .mockResolvedValueOnce(financialGovernanceResponse(financialGovernancePlan, true))
      .mockResolvedValueOnce(financialGovernanceResponse(recordedFinancialGovernancePlan, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /build release governance/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/financial-orchestrator/release-governance");
    expect(await screen.findByText("Internal Release Governance")).toBeInTheDocument();
    expect(screen.getByText("Release Records")).toBeInTheDocument();
    expect(screen.getByText("Stripe Probe")).toBeInTheDocument();
    expect(screen.getByText("Credential presence")).toBeInTheDocument();
    expect(screen.getByText("Release execution remains blocked")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview governance record/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/release-governance/apply", {
      json: {
        confirm: "RECORD FINANCIAL RELEASE GOVERNANCE",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Release governance preview ready: 2 packets and 1 reconciliation report identified.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record governance/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/financial-orchestrator/release-governance/apply", {
      json: {
        confirm: "RECORD FINANCIAL RELEASE GOVERNANCE",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Release governance recorded: 2 packets and reconciliation report fin-recon-1. Audit log audit-governance-1.")).toBeInTheDocument();
    expect(screen.getByText("fin-recon-1")).toBeInTheDocument();
  });

  it("loads performance velocity, ingests a manual snapshot, and applies performance rotation", async () => {
    const onRefreshStores = vi.fn();

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ digest: performanceDigest })
      .mockResolvedValueOnce(performanceIngestResponse(performanceDigest))
      .mockResolvedValueOnce(performanceRotationResponse(performanceDigest, true))
      .mockResolvedValueOnce(performanceRotationResponse(performanceDigest, false));

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={onRefreshStores} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /load velocity/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/performance");
    expect(await screen.findByText("Internal Performance Velocity Ledger")).toBeInTheDocument();
    expect(screen.getByText("Core Tee")).toBeInTheDocument();
    expect(screen.getByText("Performance Rotation")).toBeInTheDocument();
    expect(screen.getByText("Using browser stealth, anti-detection, or platform-evasion automation")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /ingest snapshot/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/performance/snapshots", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "INGEST INTERNAL PERFORMANCE SNAPSHOTS",
        dryRun: false,
        snapshots: [expect.objectContaining({
          grossRevenue: 180,
          netProfit: 92,
          source: "manual",
          storeId: "store-1",
          unitsSold: 6,
          visits: 210
        })]
      }),
      method: "POST"
    }));
    expect(await screen.findByText("Performance snapshot ingested: 1 record stored. Audit log audit-performance-ingest-1.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview performance/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/performance/rotation/apply", {
      json: {
        confirm: "APPLY PERFORMANCE ROTATION",
        dryRun: true
      },
      method: "POST"
    });
    expect(await screen.findByText("Performance preview ready: 1 internal rotation change identified.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply performance rotation/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/performance/rotation/apply", {
      json: {
        confirm: "APPLY PERFORMANCE ROTATION",
        dryRun: false
      },
      method: "POST"
    });
    expect(await screen.findByText("Performance rotation applied: 1 change recorded. Audit log audit-performance-rotation-1.")).toBeInTheDocument();
    expect(onRefreshStores).toHaveBeenCalledTimes(2);
  });

  it("builds locked provider payloads without contacting providers", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ package: providerPayloadPackage })
      .mockResolvedValueOnce(providerPayloadApprovalResponse)
      .mockResolvedValueOnce({
        approval: approvedProviderRecord,
        auditLogId: "audit-provider-review-1",
        message: "Growth packet approved for preparation only. No external action executed."
      })
      .mockResolvedValueOnce(providerHandoffResponse);

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    await userEvent.click(screen.getByRole("button", { name: /provider payloads/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/stores/store-1/provider-payloads");
    expect(await screen.findByText("Locked Provider Payload Package")).toBeInTheDocument();
    expect(screen.getByText("3 payload drafts / 74% ready")).toBeInTheDocument();
    expect(screen.getByText("Iron House Core Tee")).toBeInTheDocument();
    expect(screen.getByText("Printify, Shopify")).toBeInTheDocument();
    expect(screen.getByText("Provider execution remains blocked")).toBeInTheDocument();
    expect(screen.getByText("Sending provider API requests")).toBeInTheDocument();
    expect(screen.getByText("Provider payloads are request drafts only.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /queue provider approval/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/provider-payloads/approval-request", {
      json: {
        includeUnapproved: false,
        maxProducts: 5,
        note: "Queued from locked provider payload package for human review."
      },
      method: "POST"
    });
    expect(await screen.findByText("Provider approval packet queued")).toBeInTheDocument();
    expect(screen.getByText("Audit log: audit-provider-1")).toBeInTheDocument();
    expect(screen.getByText("Provider / Pending human approval")).toBeInTheDocument();
    expect(screen.getByText("Provider payload approval packet queued. Provider execution remains locked.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /approve preparation/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/growth-approvals/packet-provider-1/approve", {
      json: {
        note: "Approved for preparation only. External execution remains locked."
      },
      method: "POST"
    });
    expect(await screen.findByText(/Approved - execution still locked/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /build provider handoff/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/growth-approvals/packet-provider-1/provider-handoff");
    expect(await screen.findByRole("region", { name: /provider handoff bundle/i })).toBeInTheDocument();
    expect(screen.getByText("Provider Handoff Bundle / Ready for manual handoff")).toBeInTheDocument();
    expect(screen.getByText("Printify / POST / Locked - manual handoff only")).toBeInTheDocument();
    expect(screen.getByText(/Provider contacted: false/i)).toBeInTheDocument();
  });

  it("builds a guarded mock growth plan without external execution", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan })
      .mockResolvedValueOnce(approvalResponse)
      .mockResolvedValueOnce({
        approval: approvedRecord,
        auditLogId: "audit-2",
        message: "Growth packet approved for preparation only. No external action executed."
      })
      .mockResolvedValueOnce(orchestrationPreview);

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    expect(screen.getByText("Growth & Scale Plan")).toBeInTheDocument();
    expect(screen.getByText("Mock Mode / Approval Required")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /build growth plan/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/stores/store-1/growth-plan");
    expect(await screen.findByText("57/100")).toBeInTheDocument();
    expect(screen.getByText("Publishing social posts")).toBeInTheDocument();
    expect(screen.getByText(/Daily spend stays locked until approval/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /queue approval packet/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/growth-plan/approval-request", {
      json: {
        note: "Queued from the Growth & Scale Plan panel for human review.",
        scheduledFor: undefined
      },
      method: "POST"
    });
    expect(await screen.findByText("Approval packet queued")).toBeInTheDocument();
    expect(screen.getByText("Audit log: audit-1")).toBeInTheDocument();
    expect(screen.getAllByText("Locked - no external action")).toHaveLength(2);
    expect(screen.getByText("Growth approval queue")).toBeInTheDocument();
    expect(screen.getByText("Real review records / external execution locked")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /approve preparation/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/growth-approvals/packet-1/approve", {
      json: {
        note: "Approved for preparation only. External execution remains locked."
      },
      method: "POST"
    });
    expect(await screen.findByText(/Approved - execution still locked/)).toBeInTheDocument();
    expect(screen.getByText("Growth packet approved for preparation only. No external action executed.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview locked schedule/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/growth-approvals/packet-1/orchestration-preview");
    expect(await screen.findByText("Locked orchestration preview")).toBeInTheDocument();
    expect(screen.getByText(/External spend: 0 cents \/ AI cost: 0 cents/i)).toBeInTheDocument();
    expect(screen.getByText(/No social, Shopify, ad, or analytics system was contacted/i)).toBeInTheDocument();
  });
});
