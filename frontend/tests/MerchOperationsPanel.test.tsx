import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MerchOperationsPanel } from "../components/MerchOperationsPanel";
import { apiFetch } from "../lib/api";
import type { ClientMerchStore, DigitalProductApplyResponse, DigitalProductPortfolioPlan, FacelessContentPipelineApplyResponse, FacelessContentPipelinePlan, FacelessContentPerformanceDigest, FinancialOrchestratorApplyResponse, FinancialOrchestratorPlan, FinancialPayoutReviewApplyResponse, FinancialPayoutReviewPlan, FinancialReleaseGovernanceApplyResponse, FinancialReleaseGovernancePlan, FinancialScalingBudgetReviewApplyResponse, FinancialScalingBudgetReviewPlan, FinancialScalingExecutionLedgerApplyResponse, FinancialScalingExecutionLedgerPlan, FinancialScalingSpendControlApplyResponse, FinancialScalingSpendControlPlan, GrowthApprovalRecord, GrowthApprovalResponse, GrowthOrchestrationPreviewResponse, GrowthPlan, PortfolioCommandCenterApplyResponse, PortfolioCommandCenterPlan, ProviderHandoffResponse, ProviderPayloadApprovalResponse, ProviderPayloadPackage, RevenueAssetActionApplyResponse, RevenueAssetBatchActionApplyResponse, RevenueAssetControlLedgerPlan, RevenueAssetControlRecoveryPlan, RevenueAssetPortfolio, RevenueAssetReviewQueuePlan, RevenueAssetRotationDecision, RevenueBusinessFleetLaunchGapAccelerationResponse, RevenueBusinessFleetLaunchGateResponse, RevenueBusinessFleetLiveLaunchPackageResponse, RevenueBusinessFleetLaunchGapPlan, RevenueBusinessFleetLaunchGapSeedApplyResponse, RevenueBusinessFleetPlan, RevenueEnginePlan, RevenueFirstBusinessLaunchPlan, RevenueFirstCashReadinessPlan, RevenueFirstCashSprintPlan, RevenueLaunchPipelineApplyResponse, RevenueLaunchPipelinePlan, RevenueListingOptimizationApplyResponse, RevenueListingOptimizationPlan, RevenueMoneyArmyBatchPipelineApplyResponse, RevenueMoneyArmyBatchPipelinePlan, RevenueMoneyArmyBatchRun, RevenuePerformanceDigest, RevenuePerformanceIngestResponse, RevenuePerformanceRotationApplyResponse, RevenuePortfolioDashboardPlan, RevenueRotationApplyResponse, RevenueStoreSetupApplyResponse, RevenueStoreSetupPlan } from "../lib/merch-store";

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
    manualGates: 1,
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
  riskFlags: [],
  scalingBudgetQueue: [
    {
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
      priority: 10,
      profitVelocity: 28.57,
      providerContacted: false,
      reason: "Validated scale asset with excellent rank 88 and 28.57 daily profit velocity.",
      score: 88,
      scoreBand: "excellent",
      status: "approval_required",
      storeId: "store-1",
      storeName: "Iron House Gym"
    },
    {
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
      priority: 12,
      profitVelocity: 14.29,
      providerContacted: false,
      reason: "Validated scale asset with healthy rank 76 and 14.29 daily profit velocity.",
      score: 76,
      scoreBand: "healthy",
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
    expect(within(region).getByText("Iron House Gym")).toBeInTheDocument();
    expect(within(region).getByText("ready internal")).toBeInTheDocument();
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
  });

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
  });

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
  });

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
