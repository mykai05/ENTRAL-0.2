import { describe, expect, it } from "vitest";
import {
  buildRevenueAssetControlPlan,
  buildRevenueAssetBatchControlPlan,
  buildRevenueAssetPortfolio,
  buildRevenueEnginePlan,
  mergeRevenueAssetPortfolioPerformance,
  removeDuplicateRevenueAssetBatchControls,
  type RevenueEngineProductSnapshot,
  type RevenueEngineStoreSnapshot
} from "../src/services/revenueEngine.js";
import { buildDigitalProductPortfolioPlan } from "../src/services/digitalProductPortfolio.js";
import { buildRevenueLaunchPipeline } from "../src/services/revenueLaunchPipeline.js";
import { buildRevenueListingOptimizationPlan } from "../src/services/revenueListingOptimization.js";
import { buildRevenuePerformanceDigest, normalizeRevenuePerformanceSnapshot } from "../src/services/revenuePerformance.js";
import { buildRevenueStoreSetupPlan } from "../src/services/revenueStoreSetup.js";
import { buildFinancialOrchestratorPlan, buildFinancialScalingBudgetReviewPlan } from "../src/services/financialOrchestrator.js";
import { buildFinancialScalingSpendControlPlan } from "../src/services/financialScalingSpendControl.js";
import { buildFinancialScalingExecutionLedgerPlan, normalizeFinancialScalingExecutionEntry } from "../src/services/financialScalingExecutionLedger.js";
import { buildFinancialPayoutReviewPlan } from "../src/services/financialPayoutReview.js";
import { buildFinancialReleaseGovernancePlan } from "../src/services/financialReleaseGovernance.js";
import { buildFacelessContentPipelinePlan } from "../src/services/facelessContentPipeline.js";
import { buildPortfolioCommandCenterPlan } from "../src/services/portfolioCommandCenter.js";
import {
  buildRevenueAssetControlRecoveryPlan,
  buildRevenueAssetControlLedgerPlan,
  revenueAssetControlRecordFromPlan
} from "../src/services/revenueAssetControlLedger.js";
import { buildRevenueAssetReviewQueuePlan } from "../src/services/revenueAssetReviewQueue.js";
import { buildRevenueAssetControlsFromPortfolioCommands } from "../src/services/revenuePortfolioCommandAssetControls.js";
import { buildRevenuePortfolioDashboardPlan } from "../src/services/revenuePortfolioDashboard.js";
import { buildRevenueFirstCashReadinessPlan } from "../src/services/revenueFirstCashReadiness.js";
import type { RevenueLaunchReadinessPlan } from "../src/services/revenueLaunchReadiness.js";
import type { RevenueLiveConnectorReadinessRegistryPlan } from "../src/services/revenueLiveConnectorReadinessRegistry.js";

const scaleStore: RevenueEngineStoreSnapshot = {
  approvalStatus: "Launch Approved",
  audience: "local gym members and online coaching clients",
  brandStyle: "bold black-and-green training aesthetic",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 480,
  id: "store_scale",
  industry: "fitness",
  launchStatus: "Optimizing",
  productTypes: ["T-shirt", "Hoodie"],
  revenue: 1200,
  storePlatform: "Shopify"
};

function product(input: Partial<RevenueEngineProductSnapshot> & { id: string; storeId?: string }): RevenueEngineProductSnapshot {
  return {
    aiDisclosureNeeded: true,
    complianceNotes: "Compliance warnings are operational risk signals only and are not legal advice.",
    designConcept: "Original typography for a brand-owned merch lane.",
    designPrompt: "Create original art with no protected marks or copied work.",
    designTheme: "Original operator series",
    estimatedProfit: 16,
    id: input.id,
    listingDescription: "Original product listing.",
    listingTitle: "Original Product",
    productName: "Original Product",
    productType: "T-shirt",
    productionPartnerDisclosureNeeded: true,
    profitMargin: 42,
    retailPrice: 38,
    status: "Approved",
    storeId: input.storeId ?? scaleStore.id,
    tags: ["original", "fitness"],
    ...input
  };
}

describe("Revenue Engine", () => {
  it("identifies products and stores ready to scale without external execution", () => {
    const plan = buildRevenueEnginePlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      stores: [scaleStore],
      products: [
        product({ id: "product_scale_1", productName: "Core Tee" }),
        product({ id: "product_scale_2", productName: "Operator Hoodie", productType: "Hoodie", status: "Published" }),
        product({ id: "product_watch_1", estimatedProfit: 10, profitMargin: 26, status: "Awaiting Approval" }),
        product({ id: "product_watch_2", estimatedProfit: 9, profitMargin: 24, status: "Designed" }),
        product({ id: "product_watch_3", estimatedProfit: 8, profitMargin: 22, status: "Listing Drafted" })
      ]
    });

    expect(plan.mode).toBe("Internal Revenue Engine");
    expect(plan.externalExecution).toBe(false);
    expect(plan.totals.storesReadyToScale).toBe(1);
    expect(plan.assetScores[0]).toMatchObject({
      assetScore: {
        economicsScore: expect.any(Number),
        finalRank: expect.any(Number),
        readinessScore: expect.any(Number),
        riskPenalty: expect.any(Number),
        velocity: expect.any(Number)
      },
      externalExecution: false,
      providerContacted: false,
      recommendation: "scale"
    });
    expect(plan.storeDecisions[0]).toMatchObject({
      action: "scale",
      storeId: scaleStore.id
    });
    expect(plan.productDecisions.filter((decision) => decision.action === "scale")).toHaveLength(2);
    expect(plan.pipelineActions[0]).toMatchObject({
      action: "scale",
      externalExecution: false,
      targetId: scaleStore.id
    });
    expect(plan.blockedExternalActions).toContain("Publishing marketplace listings");

    const portfolio = buildRevenueAssetPortfolio(plan);
    expect(portfolio).toMatchObject({
      externalExecution: false,
      mode: "Revenue Engine Asset Portfolio",
      providerContacted: false,
      totals: {
        scale: expect.any(Number),
        watch: expect.any(Number)
      }
    });
    expect(portfolio.assets[0]).toHaveProperty("reason");
    expect(portfolio.assets[0]).toHaveProperty("nextInternalState");
  });

  it("ranks first-cash candidates from launch and connector readiness", () => {
    const launchReadinessPlan: RevenueLaunchReadinessPlan = {
      auditEvents: ["Launch readiness generated."],
      blockedExternalActions: ["Publishing listings or products"],
      externalExecution: false,
      generatedAt: "2026-06-02T12:00:00.000Z",
      mode: "Internal Launch Readiness Board",
      options: {
        includeApprovalHistory: true,
        maxStores: 8,
        minLaunchReadiness: 1,
        minProviderReadiness: 1
      },
      providerContacted: false,
      queue: [],
      stageCounts: {
        blocked: 0,
        handoff_ready: 1,
        launch_approval: 0,
        listing_optimization: 0,
        live_monitoring: 0,
        product_drafting: 0,
        provider_payload_review: 0,
        store_setup: 0
      },
      stores: [{
        approvalState: {
          approvedPackets: 1,
          latestProviderApprovalId: "approval-1",
          pendingPackets: 0,
          providerApprovalApproved: true,
          providerApprovalPending: false,
          rejectedPackets: 0,
          totalPackets: 1
        },
        blockers: [],
        externalExecution: false,
        launchPipeline: {
          action: "manual_handoff",
          missingProducts: 0,
          readyProducts: 5,
          reason: "Launch packet is ready for final operator handoff."
        },
        nextInternalAction: "generate_provider_handoff",
        priority: 90,
        providerContacted: false,
        providerPayload: {
          adapterCoverage: ["Printify", "Shopify"],
          payloadCount: 5,
          readinessScore: 92,
          warnings: []
        },
        readinessScore: 94,
        riskLevel: "low",
        stage: "handoff_ready",
        store: {
          approvalStatus: "Launch Approved",
          businessName: "Iron House Gym",
          estimatedProfit: 420,
          id: "store_first_cash",
          launchStatus: "Awaiting Approval",
          productTypes: ["T-shirt"],
          revenue: 0,
          storePlatform: "Shopify"
        },
        storeSetup: {
          connectorReadinessScore: 90,
          connectorStatus: "ready",
          queuedAction: "manual_review",
          readinessScore: 90
        },
        summary: "Iron House Gym is ready for final operator handoff."
      }],
      summary: "One launch path ready.",
      totals: {
        approvedProviderPackets: 1,
        blockedStores: 0,
        handoffReadyStores: 1,
        payloadsPrepared: 5,
        queuedStores: 1,
        storesEvaluated: 1
      }
    };
    const liveConnectorPlan: RevenueLiveConnectorReadinessRegistryPlan = {
      auditEvents: ["Live connector readiness generated."],
      blockedExternalActions: ["Enabling live connector credentials"],
      entries: [{
        action: "record_connector_design_readiness",
        approvalGates: [{
          evidenceRequired: ["Stripe read-only evidence"],
          gate: "payment_readiness",
          status: "ready"
        }],
        blockers: [],
        closure: {
          expectedFirstWeekRevenue: 250,
          performanceSnapshots: 1,
          score: 88,
          status: "ready_for_live_design"
        },
        connectorBoundaries: [{
          approvalGates: ["Operator design approval"],
          blockedExternalActions: ["Payouts or payment changes"],
          credentialEnvVars: ["STRIPE_SECRET_KEY"],
          endpointTemplates: [],
          externalExecution: false,
          futureLiveScopes: [],
          lane: "launch",
          liveMode: "blocked_until_operator_design_approval",
          provider: "stripe",
          providerContacted: false,
          providerName: "Stripe",
          readOnlyScopes: [],
          readiness: "design_review_ready",
          role: "payments",
          rollbackControls: ["Revoke read-only credential"]
        }],
        externalExecution: false,
        operationsPack: {
          artifactSlots: 4,
          auditReady: true,
          credentialScopes: ["read_only"],
          manualSteps: 2,
          providers: ["Stripe"],
          requestManifests: 1,
          status: "ready_for_operator"
        },
        priority: 95,
        providerContacted: false,
        readinessScore: 90,
        readOnlyEvidence: {
          approvedConnectors: 1,
          importJobsQueued: 0,
          manifestIds: ["manifest-1"],
          pendingApprovals: 0,
          readyManifests: 1,
          requiredConnectors: 1
        },
        rollbackControls: ["Disable design dossier"],
        status: "ready_for_design",
        storeId: "store_first_cash",
        storeName: "Iron House Gym",
        summary: "Stripe read-only evidence is design ready."
      }],
      externalExecution: false,
      generatedAt: "2026-06-02T12:00:00.000Z",
      mode: "Internal Revenue Live Connector Readiness Registry",
      options: {
        includeBlocked: true,
        maxEntries: 8,
        minClosureScore: 1,
        minReadOnlyConnectors: 0,
        requireOperationsPackAudit: false,
        requirePerformanceEvidence: false
      },
      providerContacted: false,
      queue: [],
      summary: "One connector path ready.",
      totals: {
        approvedReadOnlyConnectors: 1,
        blockedEntries: 0,
        entries: 1,
        needsOperatorReview: 0,
        needsReadOnlyApproval: 0,
        readyForDesign: 1,
        requiredBoundaries: 1
      }
    };

    const plan = buildRevenueFirstCashReadinessPlan({
      generatedAt: "2026-06-02T12:10:00.000Z",
      launchReadinessPlan,
      liveConnectorPlan,
      options: {
        includeBlocked: true,
        maxCandidates: 8,
        targetDaysToFirstCash: 7
      }
    });

    expect(plan.mode).toBe("Revenue Engine First Cash Readiness");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.topCandidate).toMatchObject({
      automaticCashEtaDays: 3,
      automaticCashReady: true,
      automaticCashStatus: "automatic_cash_ready",
      estimatedFirstSaleDays: 2,
      manualLaunchReady: true,
      paymentReadiness: "live_design_ready",
      storeName: "Iron House Gym"
    });
    expect(plan.totals).toMatchObject({
      automaticCashReady: 1,
      manualLaunchReady: 1,
      targetReady: 1
    });
    expect(plan.blockedExternalActions).toContain("Publishing listings or products");
    expect(plan.blockedExternalActions).toContain("Enabling live connector credentials");
  });

  it("builds one-asset internal controls from normalized recommendations", () => {
    const weakStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      approvalStatus: "Designs Pending",
      businessName: "Slow Lane Studio",
      estimatedProfit: 4,
      id: "store_control",
      launchStatus: "Designing",
      revenue: 0
    };
    const plan = buildRevenueEnginePlan({
      stores: [weakStore],
      products: [
        product({
          estimatedProfit: -2,
          id: "control_product_kill",
          profitMargin: 0,
          status: "Awaiting Approval",
          storeId: weakStore.id
        })
      ]
    });
    const portfolio = buildRevenueAssetPortfolio(plan);
    const control = buildRevenueAssetControlPlan({
      action: "kill",
      assetId: "control_product_kill",
      assetType: "product",
      portfolio
    });

    expect(control).toMatchObject({
      action: "kill",
      auditOnly: false,
      controlReview: {
        alignment: "matches_recommendation",
        executionScope: "internal_status_change",
        requiresOperatorReview: true,
        riskTier: "high",
        statusImpact: "product_status_change"
      },
      externalExecution: false,
      nextInternalState: "Archived",
      providerContacted: false,
      statusChangeRequired: true
    });
    expect(control?.change).toMatchObject({
      action: "kill",
      targetId: "control_product_kill",
      targetType: "product",
      toStatus: "Archived"
    });

    const scaleIntent = buildRevenueAssetControlPlan({
      action: "scale",
      assetId: weakStore.id,
      assetType: "store",
      portfolio
    });

    expect(scaleIntent).toMatchObject({
      action: "scale",
      auditOnly: true,
      change: null,
      controlReview: {
        alignment: "dashboard_override",
        executionScope: "audit_only",
        requiresOperatorReview: true,
        riskTier: "medium",
        statusImpact: "none"
      },
      statusChangeRequired: false
    });
    expect(scaleIntent?.warnings).toContain("Scale is recorded as an internal intent only; provider publishing, ad spend, uploads, payouts, and browser automation remain locked.");
  });

  it("records asset controls into an internal scoring decision ledger", () => {
    const weakStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      approvalStatus: "Designs Pending",
      businessName: "Slow Lane Studio",
      estimatedProfit: 4,
      id: "store_control_ledger",
      launchStatus: "Designing",
      revenue: 0
    };
    const plan = buildRevenueEnginePlan({
      stores: [weakStore],
      products: [
        product({
          estimatedProfit: -2,
          id: "control_ledger_product",
          profitMargin: 0,
          status: "Awaiting Approval",
          storeId: weakStore.id
        })
      ]
    });
    const portfolio = buildRevenueAssetPortfolio(plan);
    const recommendedControl = buildRevenueAssetControlPlan({
      action: "kill",
      assetId: "control_ledger_product",
      assetType: "product",
      portfolio
    });
    const overrideControl = buildRevenueAssetControlPlan({
      action: "watch",
      assetId: "control_ledger_product",
      assetType: "product",
      portfolio
    });

    expect(recommendedControl).not.toBeNull();
    expect(overrideControl).not.toBeNull();

    const ledger = buildRevenueAssetControlLedgerPlan({
      generatedAt: "2026-06-03T00:00:00.000Z",
      records: [
        revenueAssetControlRecordFromPlan({
          auditLogId: "audit-asset-control-1",
          control: recommendedControl!,
          createdAt: "2026-06-03T00:02:00.000Z"
        }),
        revenueAssetControlRecordFromPlan({
          auditLogId: "audit-asset-control-2",
          control: overrideControl!,
          createdAt: "2026-06-03T00:01:00.000Z"
        })
      ]
    });

    expect(ledger.mode).toBe("Revenue Engine Asset Control Ledger");
    expect(ledger.externalExecution).toBe(false);
    expect(ledger.providerContacted).toBe(false);
    expect(ledger.totals).toMatchObject({
      kill: 1,
      overrides: 1,
      records: 2,
      statusChanges: 1,
      watch: 1
    });
    expect(ledger.records[0]).toMatchObject({
      assetScore: {
        economicsScore: expect.any(Number),
        finalRank: expect.any(Number),
        readinessScore: expect.any(Number),
        riskPenalty: expect.any(Number),
        velocity: expect.any(Number)
      },
      auditLogId: "audit-asset-control-1",
      requestedAction: "kill",
      scoringRecommendation: "kill"
    });
    expect(ledger.records[1]).toMatchObject({
      auditOnly: true,
      override: true,
      requestedAction: "watch",
      scoringRecommendation: "kill"
    });
    expect(ledger.blockedExternalActions).toEqual(expect.arrayContaining([
      expect.stringContaining("external write actions"),
      expect.stringContaining("anti-detection")
    ]));
  });

  it("derives an asset-control recovery queue from current scores and latest ledger records", () => {
    const replayProduct = product({
      estimatedProfit: 2,
      id: "replay_product",
      profitMargin: 10,
      status: "Published"
    });
    const staleProductBefore = product({
      estimatedProfit: 2,
      id: "stale_product",
      profitMargin: 10,
      status: "Published"
    });
    const staleProductNow = product({
      estimatedProfit: 24,
      id: "stale_product",
      profitMargin: 48,
      status: "Published"
    });
    const ledgerPortfolio = buildRevenueAssetPortfolio(buildRevenueEnginePlan({
      stores: [scaleStore],
      products: [replayProduct, staleProductBefore]
    }));
    const currentPortfolio = buildRevenueAssetPortfolio(buildRevenueEnginePlan({
      stores: [scaleStore],
      products: [replayProduct, staleProductNow]
    }));
    const replayControl = buildRevenueAssetControlPlan({
      action: "pause",
      assetId: replayProduct.id,
      assetType: "product",
      portfolio: ledgerPortfolio
    });
    const staleControl = buildRevenueAssetControlPlan({
      action: "pause",
      assetId: staleProductBefore.id,
      assetType: "product",
      portfolio: ledgerPortfolio
    });

    expect(replayControl).not.toBeNull();
    expect(staleControl).not.toBeNull();

    const ledger = buildRevenueAssetControlLedgerPlan({
      records: [
        revenueAssetControlRecordFromPlan({
          auditLogId: "audit-replay-ready",
          control: replayControl!,
          createdAt: "2026-06-02T12:00:00.000Z"
        }),
        revenueAssetControlRecordFromPlan({
          auditLogId: "audit-stale-score",
          control: staleControl!,
          createdAt: "2026-06-02T11:00:00.000Z"
        })
      ]
    });
    const recovery = buildRevenueAssetControlRecoveryPlan({
      generatedAt: "2026-06-03T12:00:00.000Z",
      includeResolved: true,
      ledger,
      portfolio: currentPortfolio,
      staleAfterDays: 14
    });

    expect(recovery.mode).toBe("Revenue Engine Asset Control Recovery");
    expect(recovery.externalExecution).toBe(false);
    expect(recovery.providerContacted).toBe(false);
    expect(recovery.totals).toMatchObject({
      items: 2,
      readyToReplay: 1,
      staleScore: 1
    });
    expect(recovery.recoveryQueue).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assetId: replayProduct.id,
        canReplay: true,
        currentRecommendation: "pause",
        requestedAction: "pause",
        state: "ready_to_replay",
        targetState: "Needs Revision"
      }),
      expect.objectContaining({
        assetId: staleProductBefore.id,
        canReplay: false,
        currentRecommendation: "scale",
        requiresOperatorReview: true,
        state: "stale_score"
      })
    ]));
    expect(recovery.blockedExternalActions).toEqual(expect.arrayContaining([
      expect.stringContaining("external write actions")
    ]));
  });

  it("builds a prioritized asset review queue from current scores and control history", () => {
    const weakStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      approvalStatus: "Designs Pending",
      businessName: "Slow Lane Studio",
      estimatedProfit: 4,
      id: "store_review_queue",
      launchStatus: "Designing",
      revenue: 0
    };
    const plan = buildRevenueEnginePlan({
      stores: [weakStore],
      products: [
        product({
          estimatedProfit: -2,
          id: "review_queue_kill",
          profitMargin: 0,
          status: "Awaiting Approval",
          storeId: weakStore.id
        }),
        product({
          estimatedProfit: 22,
          id: "review_queue_scale",
          profitMargin: 48,
          status: "Approved",
          storeId: weakStore.id
        })
      ]
    });
    const portfolio = buildRevenueAssetPortfolio(plan);
    const overrideControl = buildRevenueAssetControlPlan({
      action: "watch",
      assetId: "review_queue_kill",
      assetType: "product",
      portfolio
    });
    const ledger = buildRevenueAssetControlLedgerPlan({
      records: [
        revenueAssetControlRecordFromPlan({
          auditLogId: "audit-review-override",
          control: overrideControl!,
          createdAt: "2026-06-01T00:00:00.000Z"
        })
      ]
    });
    const queue = buildRevenueAssetReviewQueuePlan({
      controlLedger: ledger,
      now: new Date("2026-06-03T00:00:00.000Z"),
      options: {
        includeWatch: false,
        maxItems: 10,
        staleAfterDays: 14
      },
      portfolio
    });

    expect(queue.mode).toBe("Revenue Engine Asset Review Queue");
    expect(queue.externalExecution).toBe(false);
    expect(queue.providerContacted).toBe(false);
    expect(queue.queue[0]).toMatchObject({
      assetId: "review_queue_kill",
      controlHistory: {
        currentRecommendationChanged: false,
        latestActionAgeDays: 2,
        latestOverride: true,
        overrides: 1,
        records: 1,
        statusChanges: 0
      },
      currentRecommendation: "kill",
      latestControl: {
        override: true,
        requestedAction: "watch",
        scoringRecommendation: "kill"
      },
      nextReviewState: "resolve_override_against_current_score",
      trigger: "override_review"
    });
    expect(queue.totals).toMatchObject({
      noHistory: expect.any(Number),
      overrides: 1,
      scaleReady: expect.any(Number)
    });
    expect(queue.blockedExternalActions).toEqual(expect.arrayContaining([
      expect.stringContaining("external write actions")
    ]));
  });

  it("builds a portfolio dashboard snapshot from scoring, command, and control signals", () => {
    const weakStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      approvalStatus: "Designs Pending",
      businessName: "Dashboard Risk Studio",
      estimatedProfit: 4,
      id: "store_dashboard",
      launchStatus: "Designing",
      revenue: 0
    };
    const weakProduct = product({
      estimatedProfit: -2,
      id: "dashboard_product_kill",
      profitMargin: 0,
      status: "Awaiting Approval",
      storeId: weakStore.id
    });
    const revenuePlan = buildRevenueEnginePlan({
      stores: [weakStore],
      products: [weakProduct]
    });
    const portfolio = buildRevenueAssetPortfolio(revenuePlan);
    const controlLedger = buildRevenueAssetControlLedgerPlan({
      records: []
    });
    const reviewQueue = buildRevenueAssetReviewQueuePlan({
      controlLedger,
      now: new Date("2026-06-03T00:00:00.000Z"),
      options: {
        includeWatch: false,
        maxItems: 10,
        staleAfterDays: 14
      },
      portfolio
    });
    const commandPlan = buildPortfolioCommandCenterPlan({
      assetPortfolio: portfolio,
      performanceDigest: buildRevenuePerformanceDigest({
        products: [weakProduct],
        snapshots: [],
        stores: [weakStore]
      }),
      revenuePlan,
      options: {
        includeContent: false,
        includeFinance: false,
        maxActions: 25
      }
    });
    const dashboard = buildRevenuePortfolioDashboardPlan({
      commandPlan,
      controlLedger,
      portfolio,
      reviewQueue
    });

    expect(dashboard.mode).toBe("Revenue Engine Portfolio Dashboard");
    expect(dashboard.externalExecution).toBe(false);
    expect(dashboard.providerContacted).toBe(false);
    expect(dashboard.kpis.assets).toBe(portfolio.totals.assets);
    expect(dashboard.queuePressure.reviewItems).toBe(reviewQueue.totals.items);
    expect(dashboard.queuePressure.commandActions).toBe(commandPlan.totals.commandActions);
    expect(dashboard.risk.riskLevel).toBe("high");
    expect(dashboard.nextActions[0]).toMatchObject({
      actionLabel: "Archive internally",
      assetId: weakProduct.id,
      recommendation: "kill"
    });
    expect(dashboard.blockedExternalActions).toEqual(expect.arrayContaining([
      expect.stringContaining("external write actions")
    ]));
  });

  it("builds selected internal asset batch controls with skipped stale selections", () => {
    const weakStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      approvalStatus: "Designs Pending",
      businessName: "Slow Lane Studio",
      estimatedProfit: 4,
      id: "store_batch",
      launchStatus: "Designing",
      revenue: 0
    };
    const plan = buildRevenueEnginePlan({
      stores: [weakStore],
      products: [
        product({
          estimatedProfit: -2,
          id: "batch_product_kill",
          profitMargin: 0,
          status: "Awaiting Approval",
          storeId: weakStore.id
        })
      ]
    });
    const portfolio = buildRevenueAssetPortfolio(plan);
    const batch = buildRevenueAssetBatchControlPlan({
      portfolio,
      selections: [
        { action: "kill", assetId: "batch_product_kill", assetType: "product" },
        { action: "pause", assetId: weakStore.id, assetType: "store" },
        { action: "kill", assetId: "batch_product_kill", assetType: "product" },
        { action: "watch", assetId: "missing_asset", assetType: "product" }
      ]
    });

    expect(batch.mode).toBe("Revenue Engine Asset Batch Control");
    expect(batch.externalExecution).toBe(false);
    expect(batch.providerContacted).toBe(false);
    expect(batch.controls).toHaveLength(2);
    expect(batch.productUpdates).toHaveLength(1);
    expect(batch.storeUpdates).toHaveLength(1);
    expect(batch.skipped).toEqual(expect.arrayContaining([
      expect.objectContaining({ reason: expect.stringContaining("Duplicate") }),
      expect.objectContaining({ assetId: "missing_asset" })
    ]));
    expect(batch.totals).toMatchObject({
      actions: 2,
      kill: 1,
      pause: 1,
      skipped: 2,
      statusChangeRequired: 2
    });
    expect(batch.controlReview).toMatchObject({
      alignment: {
        dashboardOverrides: 0,
        matchedRecommendations: 2
      },
      executionScope: {
        auditOnly: 0,
        internalStatusChanges: 2
      },
      requiresOperatorReview: true,
      riskTier: "high",
      skipped: 2,
      statusImpact: {
        productStatusChanges: 1,
        storeStatusChanges: 1
      }
    });
    expect(batch.controlReview.summary).toContain("2 batch asset actions reviewed");
  });

  it("removes duplicate autopilot asset batch controls against latest ledger records", () => {
    const plan = buildRevenueEnginePlan({
      stores: [scaleStore],
      products: [
        product({ id: "duplicate_batch_scale", productName: "Duplicate Batch Tee" })
      ]
    });
    const portfolio = buildRevenueAssetPortfolio(plan);
    const batch = buildRevenueAssetBatchControlPlan({
      portfolio,
      selections: [
        { action: "scale", assetId: "duplicate_batch_scale", assetType: "product" }
      ]
    });
    const latest = revenueAssetControlRecordFromPlan({
      auditLogId: "audit-existing-duplicate",
      control: batch.controls[0],
      createdAt: "2026-06-02T12:00:00.000Z"
    });
    const filtered = removeDuplicateRevenueAssetBatchControls({
      batch,
      latestRecords: [{
        assetId: latest.assetId,
        assetType: latest.assetType,
        auditOnly: latest.auditOnly,
        economicsScore: latest.assetScore.economicsScore,
        finalRank: latest.assetScore.finalRank,
        fromStatus: latest.fromStatus,
        nextInternalState: latest.nextInternalState,
        override: latest.override,
        readinessScore: latest.assetScore.readinessScore,
        requestedAction: latest.requestedAction,
        riskPenalty: latest.assetScore.riskPenalty,
        scoringRecommendation: latest.scoringRecommendation,
        statusChangeRequired: latest.statusChangeRequired,
        toStatus: latest.toStatus,
        velocity: latest.assetScore.velocity
      }]
    });

    expect(filtered.controls).toHaveLength(0);
    expect(filtered.totals.actions).toBe(0);
    expect(filtered.totals.skipped).toBe(1);
    expect(filtered.skipped[0]).toMatchObject({
      action: "scale",
      assetId: "duplicate_batch_scale",
      assetType: "product",
      reason: expect.stringContaining("duplicate internal decision skipped")
    });
  });

  it("derives asset-control ledger actions from scored portfolio commands only", () => {
    const weakStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      approvalStatus: "Designs Pending",
      businessName: "Command Control Studio",
      estimatedProfit: 4,
      id: "store_command_control",
      launchStatus: "Designing",
      revenue: 0
    };
    const weakProduct = product({
      estimatedProfit: -3,
      id: "portfolio_command_product",
      profitMargin: 0,
      status: "Awaiting Approval",
      storeId: weakStore.id
    });
    const revenuePlan = buildRevenueEnginePlan({
      stores: [weakStore],
      products: [weakProduct]
    });
    const portfolio = buildRevenueAssetPortfolio(revenuePlan);
    const commandPlan = buildPortfolioCommandCenterPlan({
      assetPortfolio: portfolio,
      performanceDigest: buildRevenuePerformanceDigest({
        products: [weakProduct],
        snapshots: [],
        stores: [weakStore]
      }),
      revenuePlan,
      options: {
        includeContent: false,
        includeFinance: false,
        maxActions: 25
      }
    });
    const assetCommand = commandPlan.commandActions.find((command) => (
      command.sourceModule.split(" + ").includes("revenue_asset_portfolio")
      && command.targetId === weakProduct.id
    ));

    expect(assetCommand).toBeTruthy();

    if (!assetCommand) {
      throw new Error("Expected a product command sourced from revenue_asset_portfolio.");
    }

    const planWithNoise = {
      ...commandPlan,
      commandActions: [
        assetCommand,
        {
          ...assetCommand,
          action: "revise" as const,
          commandHash: "product:portfolio_command_product:revise:needs_revision",
          recommendedStatus: "Needs Revision"
        },
        {
          ...assetCommand,
          commandHash: "product:portfolio_command_product:pause:needs_revision",
          sourceModule: "performance_velocity"
        }
      ]
    };
    const batch = buildRevenueAssetControlsFromPortfolioCommands({
      plan: planWithNoise,
      portfolio
    });

    expect(batch.controls).toHaveLength(1);
    expect(batch.controls[0]).toMatchObject({
      action: "kill",
      asset: {
        assetId: weakProduct.id,
        assetType: "product"
      },
      nextInternalState: "Archived"
    });

    const latest = revenueAssetControlRecordFromPlan({
      auditLogId: "audit-existing-command-control",
      control: batch.controls[0],
      createdAt: "2026-06-02T12:00:00.000Z"
    });
    const duplicateFiltered = buildRevenueAssetControlsFromPortfolioCommands({
      duplicateReason: "Latest command-center asset control already exists.",
      latestRecords: [{
        assetId: latest.assetId,
        assetType: latest.assetType,
        auditOnly: latest.auditOnly,
        economicsScore: latest.assetScore.economicsScore,
        finalRank: latest.assetScore.finalRank,
        fromStatus: latest.fromStatus,
        nextInternalState: latest.nextInternalState,
        override: latest.override,
        readinessScore: latest.assetScore.readinessScore,
        requestedAction: latest.requestedAction,
        riskPenalty: latest.assetScore.riskPenalty,
        scoringRecommendation: latest.scoringRecommendation,
        statusChangeRequired: latest.statusChangeRequired,
        toStatus: latest.toStatus,
        velocity: latest.assetScore.velocity
      }],
      plan: planWithNoise,
      portfolio
    });

    expect(duplicateFiltered.controls).toHaveLength(0);
    expect(duplicateFiltered.skipped[0]).toMatchObject({
      action: "kill",
      assetId: weakProduct.id,
      reason: "Latest command-center asset control already exists."
    });
  });

  it("merges live performance velocity into asset scoring and rotation", () => {
    const liveProduct = product({
      id: "live_product",
      productName: "Live Product",
      status: "Published"
    });
    const plan = buildRevenueEnginePlan({
      stores: [scaleStore],
      products: [liveProduct]
    });
    const digest = buildRevenuePerformanceDigest({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [liveProduct],
      stores: [scaleStore],
      snapshots: [
        normalizeRevenuePerformanceSnapshot({
          grossRevenue: 30,
          netProfit: -12,
          periodEnd: "2026-06-02T00:00:00.000Z",
          periodStart: "2026-06-01T00:00:00.000Z",
          productId: liveProduct.id,
          storeId: scaleStore.id,
          unitsSold: 1,
          visits: 80
        }),
        normalizeRevenuePerformanceSnapshot({
          grossRevenue: 25,
          netProfit: -14,
          periodEnd: "2026-06-01T00:00:00.000Z",
          periodStart: "2026-05-31T00:00:00.000Z",
          productId: liveProduct.id,
          storeId: scaleStore.id,
          unitsSold: 1,
          visits: 75
        })
      ]
    });
    const portfolio = mergeRevenueAssetPortfolioPerformance(buildRevenueAssetPortfolio(plan), digest);
    const scored = portfolio.assets.find((asset) => asset.assetId === liveProduct.id);

    expect(portfolio.totals.performanceSnapshots).toBe(2);
    expect(portfolio.totals.trackedAssets).toBeGreaterThan(0);
    expect(scored).toMatchObject({
      nextInternalState: "Archived",
      recommendation: "kill",
      performance: {
        action: "kill",
        snapshots: 2
      }
    });
    expect(portfolio.rotationChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "kill",
        targetId: liveProduct.id,
        toStatus: "Archived"
      })
    ]));
  });

  it("queues internal rotation changes for weak assets without deleting data", () => {
    const weakStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      approvalStatus: "Designs Pending",
      businessName: "Slow Lane Studio",
      estimatedProfit: 4,
      id: "store_weak",
      launchStatus: "Designing",
      revenue: 0
    };
    const products = Array.from({ length: 5 }, (_, index) => product({
      estimatedProfit: index === 0 ? -2 : 2,
      id: `weak_product_${index}`,
      profitMargin: 8,
      status: index === 4 ? "Rejected" : "Awaiting Approval",
      storeId: weakStore.id
    }));

    const plan = buildRevenueEnginePlan({
      stores: [weakStore],
      products
    });

    expect(plan.storeDecisions[0]).toMatchObject({
      action: "pause",
      recommendedLaunchStatus: "Paused",
      storeId: weakStore.id
    });
    expect(plan.assetScores.map((score) => score.recommendation)).toEqual(expect.arrayContaining(["pause", "kill"]));
    expect(plan.rotationChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetId: weakStore.id,
        targetType: "store",
        toStatus: "Paused"
      }),
      expect.objectContaining({
        targetId: "weak_product_0",
        targetType: "product",
        toStatus: "Archived"
      })
    ]));
    expect(plan.rotationChanges.every((change) => change.targetType === "store" || change.targetType === "product")).toBe(true);
  });

  it("routes high-risk products to revision before launch or scale", () => {
    const risky = product({
      complianceNotes: null,
      designConcept: "Nazi symbol parody shirt",
      id: "risky_product",
      productName: "Risky Shirt"
    });
    const plan = buildRevenueEnginePlan({
      stores: [scaleStore],
      products: [risky]
    });

    expect(plan.totals.highRiskProducts).toBe(1);
    expect(plan.productDecisions[0]).toMatchObject({
      action: "pause",
      productId: "risky_product",
      recommendedInternalStatus: "Needs Revision",
      riskLevel: "high"
    });
    expect(plan.assetScores[0]).toMatchObject({
      nextInternalState: "Needs Revision",
      recommendation: "pause"
    });
    expect(plan.rotationChanges.every((change) => change.action === "pause" || change.action === "kill")).toBe(true);
  });

  it("builds an internal launch pipeline that seeds thin stores without external execution", () => {
    const thinStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      estimatedProfit: 0,
      id: "store_thin",
      launchStatus: "Researching",
      revenue: 0
    };
    const plan = buildRevenueLaunchPipeline({
      generatedAt: "2026-06-02T12:00:00.000Z",
      stores: [thinStore],
      products: [product({ id: "thin_product_1", status: "Awaiting Approval", storeId: thinStore.id })]
    });

    expect(plan.mode).toBe("Internal Launch Pipeline");
    expect(plan.externalExecution).toBe(false);
    expect(plan.totals.draftProductsNeeded).toBe(5);
    expect(plan.storePlans[0]).toMatchObject({
      action: "seed_products",
      storeId: thinStore.id
    });
    expect(plan.queue[0]).toMatchObject({
      action: "seed_products",
      externalExecution: false
    });
    expect(plan.blockedExternalActions).toContain("Creating or publishing marketplace listings");
  });

  it("queues launch approval when enough approved products exist", () => {
    const readyStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      id: "store_ready",
      launchStatus: "Awaiting Approval",
      productTypes: ["T-shirt", "Hoodie", "Sticker"]
    };
    const products = Array.from({ length: 5 }, (_, index) => product({
      id: `ready_product_${index}`,
      status: index < 2 ? "Approved" : "Listing Drafted",
      storeId: readyStore.id
    }));
    const plan = buildRevenueLaunchPipeline({
      options: {
        minApprovedProducts: 2,
        minPortfolioProductsPerStore: 5
      },
      products,
      stores: [readyStore]
    });

    expect(plan.totals.approvalReadyStores).toBe(1);
    expect(plan.totals.draftProductsNeeded).toBe(0);
    expect(plan.storePlans[0]).toMatchObject({
      action: "queue_launch_approval",
      launchPackageReady: true,
      readyProducts: 2,
      storeId: readyStore.id
    });
    expect(plan.queue[0].title).toContain("Queue launch approval");
  });

  it("builds internal digital product lanes with prompts and launch templates", () => {
    const plan = buildDigitalProductPortfolioPlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      options: {
        includeLeadMagnets: false,
        minDigitalProductsPerStore: 3,
        productsPerStore: 5
      },
      products: [
        product({ id: "pod_product_1", productType: "T-shirt", status: "Approved" })
      ],
      stores: [scaleStore]
    });

    expect(plan.mode).toBe("Internal Digital Product Portfolio");
    expect(plan.externalExecution).toBe(false);
    expect(plan.totals.queuedDrafts).toBe(3);
    expect(plan.totals.estimatedDraftProfit).toBeGreaterThan(50);
    expect(plan.draftQueue[0]).toMatchObject({
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Draft only"
      },
      storeId: scaleStore.id
    });
    expect(plan.draftQueue[0].createProductInput.supplierCost).toBe(0);
    expect(plan.draftQueue[0].createProductInput.shippingCost).toBe(0);
    expect(plan.draftQueue[0].assetPrompt).toContain("Use only original copy");
    expect(plan.draftQueue[0].launchChecklist.length).toBeGreaterThan(0);
    expect(plan.blockedExternalActions).toContain("Uploading digital files to a marketplace or file host");
  });

  it("scores performance velocity and queues internal rotation changes", () => {
    const winningProduct = product({
      id: "winning_product",
      productName: "Winning Digital Planner",
      productType: "Printable Planner",
      status: "Published"
    });
    const weakProduct = product({
      id: "weak_product",
      productName: "Weak Tee",
      status: "Published"
    });
    const snapshots = [
      normalizeRevenuePerformanceSnapshot({
        grossRevenue: 420,
        netProfit: 260,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        productId: winningProduct.id,
        storeId: scaleStore.id,
        unitsSold: 18,
        visits: 500
      }),
      normalizeRevenuePerformanceSnapshot({
        adSpend: 48,
        grossRevenue: 20,
        netProfit: -56,
        periodEnd: "2026-05-25T00:00:00.000Z",
        periodStart: "2026-05-18T00:00:00.000Z",
        productId: weakProduct.id,
        storeId: scaleStore.id,
        unitsSold: 1,
        visits: 140
      }),
      normalizeRevenuePerformanceSnapshot({
        adSpend: 44,
        grossRevenue: 10,
        netProfit: -52,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        productId: weakProduct.id,
        storeId: scaleStore.id,
        unitsSold: 0,
        visits: 150
      })
    ];

    const digest = buildRevenuePerformanceDigest({
      generatedAt: "2026-06-02T12:00:00.000Z",
      options: {
        minKillProfitVelocity: -5,
        minScaleConversionRate: 1,
        minScaleProfitVelocity: 10
      },
      products: [winningProduct, weakProduct],
      snapshots,
      stores: [scaleStore]
    });

    expect(digest.mode).toBe("Internal Performance Velocity Ledger");
    expect(digest.externalExecution).toBe(false);
    expect(digest.totals.netProfit).toBe(152);
    expect(digest.productScores.find((score) => score.productId === winningProduct.id)).toMatchObject({
      action: "scale",
      productName: "Winning Digital Planner"
    });
    expect(digest.productScores.find((score) => score.productId === weakProduct.id)).toMatchObject({
      action: "kill",
      recommendedInternalStatus: "Archived"
    });
    expect(digest.rotationChanges).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetId: weakProduct.id,
        targetType: "product",
        toStatus: "Archived"
      })
    ]));
    expect(digest.blockedExternalActions).toContain("Using browser stealth, anti-detection, or platform-evasion automation");
  });

  it("keeps zero-sale performance signals in watch until a real pause or kill threshold is met", () => {
    const watchedProduct = product({
      id: "zero_sale_watch_product",
      productName: "Zero Sale Watch Tee",
      status: "Published"
    });
    const digest = buildRevenuePerformanceDigest({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [watchedProduct],
      snapshots: [
        normalizeRevenuePerformanceSnapshot({
          grossRevenue: 0,
          netProfit: 0,
          periodEnd: "2026-06-02T00:00:00.000Z",
          periodStart: "2026-05-26T00:00:00.000Z",
          productId: watchedProduct.id,
          storeId: scaleStore.id,
          unitsSold: 0,
          visits: 120
        })
      ],
      stores: [scaleStore]
    });
    const scored = digest.productScores.find((score) => score.productId === watchedProduct.id);

    expect(scored).toMatchObject({
      action: "watch"
    });
    expect(scored?.recommendedInternalStatus).toBeUndefined();
    expect(digest.productScores.map((score) => score.action)).not.toContain("revise");
    expect(digest.rotationChanges).toHaveLength(0);
  });

  it("allocates internal income and creates approval-locked payout intents", () => {
    const winningProduct = product({
      id: "finance_product",
      productName: "Finance Tee",
      status: "Published"
    });
    const snapshots = [
      normalizeRevenuePerformanceSnapshot({
        grossRevenue: 500,
        id: "snapshot_profit_1",
        netProfit: 220,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        productId: winningProduct.id,
        storeId: scaleStore.id,
        unitsSold: 10,
        visits: 300
      }),
      normalizeRevenuePerformanceSnapshot({
        grossRevenue: 140,
        id: "snapshot_profit_2",
        netProfit: 80,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        productId: winningProduct.id,
        storeId: scaleStore.id,
        unitsSold: 4,
        visits: 120
      })
    ];
    const revenuePlan = buildRevenueEnginePlan({
      products: [winningProduct],
      stores: [scaleStore]
    });
    const performanceDigest = buildRevenuePerformanceDigest({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [winningProduct],
      snapshots,
      stores: [scaleStore]
    });
    const assetPortfolio = mergeRevenueAssetPortfolioPerformance(
      buildRevenueAssetPortfolio(revenuePlan),
      performanceDigest
    );

    const plan = buildFinancialOrchestratorPlan({
      assetPortfolio,
      generatedAt: "2026-06-02T12:00:00.000Z",
      ownerId: "user_finance",
      products: [winningProduct],
      snapshots,
      stores: [scaleStore]
    });

    expect(plan.mode).toBe("Internal Financial Orchestrator");
    expect(plan.externalExecution).toBe(false);
    expect(plan.splitPolicy).toMatchObject({
      adGrowthPercent: 25,
      bufferPercent: 25,
      entralOperationsPercent: 25,
      ownerPercent: 50,
      personalPercent: 50,
      scalingPercent: 25,
      status: "balanced",
      totalPercent: 100
    });
    expect(plan.totals.distributableProfit).toBe(300);
    expect(plan.totals.scalingAmount).toBe(75);
    expect(plan.totals.adGrowthAmount).toBe(75);
    expect(plan.totals.personalAmount).toBe(150);
    expect(plan.totals.ownerAmount).toBe(150);
    expect(plan.totals.bufferAmount).toBe(75);
    expect(plan.totals.entralOperationsAmount).toBe(75);
    expect(plan.portfolioSignal).toMatchObject({
      recommendation: "scale_reinvestment_review",
      scaleRecommendations: expect.any(Number)
    });
    expect(plan.portfolioSignal.scalePressure).toMatchObject({
      advisoryOnly: true,
      level: expect.any(String),
      source: "revenue_engine_scored_portfolio"
    });
    expect(plan.portfolioSignal.scalePressure.pressureScore).toBeGreaterThan(0);
    expect(plan.portfolioSignal.scalePressure.assets[0]).toMatchObject({
      recommendation: "scale"
    });
    expect(plan.advisoryContext).toMatchObject({
      advisoryOnly: true,
      posture: "scale_review",
      signal: "scale_reinvestment_review",
      source: "revenue_engine_scored_portfolio"
    });
    expect(plan.advisoryContext.scalePressure.pressureScore).toBe(plan.portfolioSignal.scalePressure.pressureScore);
    expect(plan.advisoryContext.killPressure.pressureScore).toBe(plan.portfolioSignal.killPressure.pressureScore);
    expect(plan.advisoryContext.summary).toContain("Revenue Engine scoring is attached as advisory finance context");
    expect(plan.portfolioSignal.killPressure).toMatchObject({
      advisoryOnly: true,
      assets: [],
      level: "none",
      pressureScore: 0,
      source: "revenue_engine_scored_portfolio"
    });
    expect(plan.totals.portfolioProfitVelocity).toBe(performanceDigest.totals.profitVelocity);
    expect(plan.totals.portfolioAssetCommandsReady).toBeGreaterThan(0);
    expect(plan.totals.portfolioScalePressure).toBe(plan.portfolioSignal.scalePressure.pressureScore);
    expect(plan.totals.portfolioKillPressure).toBe(0);
    expect(plan.totals.scalingBudgetAmount).toBe(75);
    expect(plan.totals.scalingBudgetPackets).toBeGreaterThan(0);
    expect(plan.totals.scalingBudgetRetainedAmount).toBe(0);
    expect(plan.adGrowthAllocation).toMatchObject({
      mode: "organic_first",
      organicFirstAmount: 75,
      paidScaleReviewAmount: 0,
      pressureDecision: {
        decision: "organic_first",
        killPressureScore: 0,
        scalePressureScore: plan.portfolioSignal.scalePressure.pressureScore,
        source: "revenue_engine_scored_portfolio"
      }
    });
    expect(plan.scalingBudgetQueue.every((packet) => packet.externalExecution === false && packet.providerContacted === false)).toBe(true);
    expect(plan.scalingBudgetQueue[0]).toMatchObject({
      allocationLane: "organic_growth",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Required"
      },
      organicFirst: true,
      spendPriority: "no_spend",
      status: "approval_required"
    });
    const scalingReviewPlan = buildFinancialScalingBudgetReviewPlan({
      generatedAt: "2026-06-02T12:30:00.000Z",
      packets: plan.scalingBudgetQueue.map((packet) => ({
        ...packet,
        auditLogId: null,
        createdAt: "2026-06-02T12:00:00.000Z",
        metadata: { source: "financial_orchestrator" },
        reviewedAt: null,
        reviewedById: null,
        reviewNote: null,
        splitPolicyId: "policy_1",
        updatedAt: "2026-06-02T12:00:00.000Z"
      }))
    });

    expect(scalingReviewPlan.mode).toBe("Internal Scaling Budget Review");
    expect(scalingReviewPlan.externalExecution).toBe(false);
    expect(scalingReviewPlan.providerContacted).toBe(false);
    expect(scalingReviewPlan.totals.pending).toBe(plan.scalingBudgetQueue.length);
    expect(scalingReviewPlan.totals.pendingAmount).toBe(plan.totals.scalingBudgetAmount);
    expect(scalingReviewPlan.blockedExternalActions).toContain("Increasing ad spend, procurement spend, or product spend without a separate approved scaling budget");
    const approvedScalingReviewPlan = buildFinancialScalingBudgetReviewPlan({
      generatedAt: "2026-06-02T12:35:00.000Z",
      packets: scalingReviewPlan.packets.map((packet) => ({
        ...packet,
        reviewedAt: "2026-06-02T12:34:00.000Z",
        reviewedById: "user_finance",
        reviewNote: "Approved for internal manual handoff only.",
        status: "approved_manual_handoff"
      }))
    });
    const scalingSpendControlPlan = buildFinancialScalingSpendControlPlan({
      generatedAt: "2026-06-02T12:40:00.000Z",
      reviewPlan: approvedScalingReviewPlan
    });

    expect(scalingSpendControlPlan.mode).toBe("Internal Scaling Spend Control");
    expect(scalingSpendControlPlan.externalExecution).toBe(false);
    expect(scalingSpendControlPlan.providerContacted).toBe(false);
    expect(scalingSpendControlPlan.totals.approvedBudgetAmount).toBe(plan.totals.scalingBudgetAmount);
    expect(scalingSpendControlPlan.totals.spendPackets).toBe(plan.scalingBudgetQueue.length * 4);
    expect(scalingSpendControlPlan.spendPackets.every((packet) => packet.externalExecution === false && packet.providerContacted === false)).toBe(true);
    expect(scalingSpendControlPlan.blockedExternalActions).toContain("Increasing ad spend, procurement spend, product spend, software spend, or creative spend automatically");
    const persistedSpendControlPlan = buildFinancialScalingSpendControlPlan({
      generatedAt: "2026-06-02T12:45:00.000Z",
      persistedSpendPackets: scalingSpendControlPlan.spendPackets.map((packet, index) => ({
        ...packet,
        auditLogId: "audit_scaling_spend_control",
        createdAt: "2026-06-02T12:41:00.000Z",
        recordId: `scaling_spend_record_${index + 1}`,
        updatedAt: "2026-06-02T12:41:00.000Z"
      })),
      reviewPlan: approvedScalingReviewPlan
    });
    const firstSpendPacket = persistedSpendControlPlan.persisted.packets[0]!;
    const executionEntry = normalizeFinancialScalingExecutionEntry({
      amountSpent: 20,
      assetId: firstSpendPacket.assetId,
      assetName: firstSpendPacket.assetName,
      assetType: firstSpendPacket.assetType,
      category: firstSpendPacket.category,
      createdAt: "2026-06-02T13:00:00.000Z",
      grossRevenue: 120,
      id: "scale_execution_1",
      netProfit: 58,
      outcome: "validated",
      periodEnd: "2026-06-02T13:00:00.000Z",
      periodStart: "2026-05-26T13:00:00.000Z",
      productId: firstSpendPacket.assetType === "product" ? firstSpendPacket.assetId : null,
      recordId: "scale_execution_record_1",
      scalingSpendPacketId: firstSpendPacket.recordId,
      source: "manual",
      storeId: firstSpendPacket.storeId,
      storeName: firstSpendPacket.storeName,
      unitsSold: 4,
      visits: 180
    });
    const executionLedgerPlan = buildFinancialScalingExecutionLedgerPlan({
      entries: [executionEntry],
      generatedAt: "2026-06-02T13:05:00.000Z",
      spendControlPlan: persistedSpendControlPlan
    });

    expect(executionLedgerPlan.mode).toBe("Internal Scaling Execution Ledger");
    expect(executionLedgerPlan.externalExecution).toBe(false);
    expect(executionLedgerPlan.providerContacted).toBe(false);
    expect(executionLedgerPlan.totals.recordedEntries).toBe(1);
    expect(executionLedgerPlan.totals.scaleNext).toBe(1);
    expect(executionLedgerPlan.packetSummaries[0]).toMatchObject({
      nextInternalState: "queue_next_scaling_budget_review",
      recommendation: "scale_next"
    });
    expect(executionLedgerPlan.blockedExternalActions).toContain("Treating manually recorded outcome evidence as permission to spend, publish, upload, transfer, or scale externally");
    expect(plan.payoutIntents).toHaveLength(3);
    expect(plan.payoutIntents.every((intent) => intent.externalExecution === false)).toBe(true);
    expect(plan.payoutIntents[0].approvalGate).toMatchObject({
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Required"
    });
    expect(plan.blockedExternalActions).toContain("Moving money or issuing payouts");
    expect(plan.blockedExternalActions).toContain("Calling Stripe Treasury, Stripe Connect, bank, card, or payment write APIs");
  });

  it("retains scaling capital when the scored portfolio is in defensive hold", () => {
    const rejectedProduct = product({
      estimatedProfit: -2,
      id: "finance_defensive_product",
      productName: "Rejected Product",
      profitMargin: -5,
      status: "Rejected"
    });
    const revenuePlan = buildRevenueEnginePlan({
      products: [rejectedProduct],
      stores: [scaleStore]
    });
    const assetPortfolio = buildRevenueAssetPortfolio(revenuePlan);
    const plan = buildFinancialOrchestratorPlan({
      assetPortfolio,
      generatedAt: "2026-06-02T12:00:00.000Z",
      ownerId: "user_finance",
      products: [rejectedProduct],
      snapshots: [
        normalizeRevenuePerformanceSnapshot({
          grossRevenue: 150,
          id: "snapshot_defensive_profit",
          netProfit: 120,
          periodEnd: "2026-06-02T00:00:00.000Z",
          periodStart: "2026-05-26T00:00:00.000Z",
          productId: rejectedProduct.id,
          storeId: scaleStore.id,
          unitsSold: 3,
          visits: 90
        })
      ],
      stores: [scaleStore]
    });
    const scalingBucket = plan.allocationBuckets.find((bucket) => bucket.category === "scaling");

    expect(plan.portfolioSignal).toMatchObject({
      killRecommendations: 1,
      recommendation: "defensive_hold"
    });
    expect(plan.portfolioSignal.killPressure).toMatchObject({
      advisoryOnly: true,
      source: "revenue_engine_scored_portfolio"
    });
    expect(plan.portfolioSignal.killPressure.pressureScore).toBeGreaterThan(0);
    expect(plan.portfolioSignal.killPressure.assets[0]).toMatchObject({
      assetId: rejectedProduct.id,
      recommendation: "kill"
    });
    expect(plan.advisoryContext).toMatchObject({
      advisoryOnly: true,
      posture: "defensive_hold",
      signal: "defensive_hold",
      source: "revenue_engine_scored_portfolio"
    });
    expect(plan.advisoryContext.killPressure.pressureScore).toBe(plan.portfolioSignal.killPressure.pressureScore);
    expect(plan.totals.portfolioKillPressure).toBe(plan.portfolioSignal.killPressure.pressureScore);
    expect(scalingBucket).toMatchObject({
      amount: 30,
      guardrailReason: expect.stringContaining("kill"),
      payoutIntentAmount: 0,
      retainedAmount: 30,
      status: "held"
    });
    expect(plan.payoutIntents.map((intent) => intent.category)).toEqual(["personal", "buffer"]);
    expect(plan.scalingBudgetQueue).toHaveLength(0);
    expect(plan.totals.scalingBudgetPackets).toBe(0);
    expect(plan.adGrowthAllocation.pressureDecision).toMatchObject({
      decision: "retain_for_defense",
      killPressureScore: plan.portfolioSignal.killPressure.pressureScore,
      recommendedSpendPriority: "none",
      source: "revenue_engine_scored_portfolio"
    });
    expect(plan.auditEvents).toContain("Portfolio defensive hold retained Ad/Growth capital instead of creating a reinvestment payout intent.");
    expect(plan.summary).toContain("Ad/Growth capital is retained");
  });

  it("builds payout review packets and Stripe readiness without money movement", () => {
    const plan = buildFinancialPayoutReviewPlan({
      generatedAt: "2026-06-02T12:30:00.000Z",
      intents: [
        {
          amount: 150,
          approvalRequired: true,
          auditLogId: null,
          category: "scaling",
          createdAt: "2026-06-02T12:00:00.000Z",
          currency: "USD",
          destinationType: "ad_growth_budget",
          externalExecution: false,
          id: "intent_scaling",
          metadata: {},
          provider: "Stripe Treasury + Connect",
          status: "approval_required",
          updatedAt: "2026-06-02T12:00:00.000Z"
        },
        {
          amount: 75,
          approvalRequired: true,
          auditLogId: "audit_approved",
          category: "personal",
          createdAt: "2026-06-02T12:00:00.000Z",
          currency: "USD",
          destinationType: "owner_distribution",
          externalExecution: false,
          id: "intent_personal",
          metadata: {},
          provider: "Stripe Treasury + Connect",
          status: "approved_manual_handoff",
          updatedAt: "2026-06-02T12:15:00.000Z"
        }
      ]
    });

    expect(plan.mode).toBe("Internal Payout Review Center");
    expect(plan.externalExecution).toBe(false);
    expect(plan.totals).toMatchObject({
      approved: 1,
      pending: 1,
      reviewItems: 2,
      totalAmount: 225
    });
    expect(plan.budgetReleasePackets).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: "scaling",
        intentId: "intent_scaling",
        releaseState: "locked_review"
      }),
      expect.objectContaining({
        intentId: "intent_personal",
        releaseState: "ready_for_manual_handoff"
      })
    ]));
    expect(plan.stripeReadiness).toMatchObject({
      connectorStatus: "not_connected",
      externalExecution: false,
      provider: "Stripe Treasury + Connect",
      status: "readiness_manifest_only"
    });
    expect(plan.stripeReadiness.requiredScopes.map((scope) => scope.scope)).toContain("treasury.outbound_payments.write");
    expect(plan.blockedExternalActions).toContain("Moving money or issuing payouts");
  });

  it("builds release governance with reconciliation, risk tiers, and read-only Stripe probe", () => {
    const reviewPlan = buildFinancialPayoutReviewPlan({
      generatedAt: "2026-06-02T12:30:00.000Z",
      intents: [
        {
          amount: 150,
          approvalRequired: true,
          auditLogId: null,
          category: "scaling",
          createdAt: "2026-06-02T12:00:00.000Z",
          currency: "USD",
          destinationType: "ad_growth_budget",
          externalExecution: false,
          id: "intent_scaling",
          metadata: {},
          provider: "Stripe Treasury + Connect",
          status: "approval_required",
          updatedAt: "2026-06-02T12:00:00.000Z"
        },
        {
          amount: 75,
          approvalRequired: true,
          auditLogId: "audit_approved",
          category: "personal",
          createdAt: "2026-06-02T12:00:00.000Z",
          currency: "USD",
          destinationType: "owner_distribution",
          externalExecution: false,
          id: "intent_personal",
          metadata: {},
          provider: "Stripe Treasury + Connect",
          status: "approved_manual_handoff",
          updatedAt: "2026-06-02T12:15:00.000Z"
        }
      ]
    });
    const plan = buildFinancialReleaseGovernancePlan({
      generatedAt: "2026-06-02T12:45:00.000Z",
      persistedReconciliationReports: [{
        approvedAmount: 75,
        auditLogId: "audit_governance",
        createdAt: "2026-06-02T12:40:00.000Z",
        externalExecution: false,
        id: "recon_1",
        pendingAmount: 150,
        rejectedAmount: 0,
        report: {},
        source: "payout_review",
        status: "balanced",
        totalAmount: 225,
        updatedAt: "2026-06-02T12:40:00.000Z",
        variance: 0
      }],
      persistedReleasePackets: [],
      reviewPlan
    });

    expect(plan.mode).toBe("Internal Release Governance");
    expect(plan.externalExecution).toBe(false);
    expect(plan.reconciliationReport).toMatchObject({
      source: "payout_review",
      status: "balanced",
      totalAmount: 225,
      variance: 0
    });
    expect(plan.riskTiers.find((tier) => tier.label === "high")).toMatchObject({
      amount: 75,
      count: 1,
      intentIds: ["intent_personal"]
    });
    expect(plan.riskTiers.find((tier) => tier.label === "medium")).toMatchObject({
      amount: 150,
      count: 1,
      intentIds: ["intent_scaling"]
    });
    expect(plan.releaseReadiness).toMatchObject({
      lockedReview: 1,
      readyForManualHandoff: 1,
      rejected: 0
    });
    expect(plan.persisted.totals.recordedReconciliationReports).toBe(1);
    expect(plan.stripeReadOnlyProbe).toMatchObject({
      connectorStatus: "not_connected",
      externalExecution: false,
      providerContacted: false
    });
    expect(plan.blockedExternalActions).toContain("Persisting governance records must not move money, call Stripe APIs, or modify external accounts");
  });

  it("builds faceless content briefs, provider manifests, and performance optimization without uploads", () => {
    const contentProduct = product({
      estimatedProfit: 22,
      id: "content_product_1",
      productName: "Operator Tee",
      productType: "T-shirt",
      profitMargin: 48,
      status: "Published"
    });
    const plan = buildFacelessContentPipelinePlan({
      existingBriefSourceKeys: new Set(),
      generatedAt: "2026-06-02T13:00:00.000Z",
      performanceSnapshots: [
        {
          channel: "youtube_shorts",
          clicks: 40,
          comments: 8,
          contentBriefId: "content_brief_1",
          conversions: 4,
          cost: 12,
          externalExecution: false,
          id: "content_snapshot_scale",
          likes: 120,
          notes: null,
          periodEnd: "2026-06-02T00:00:00.000Z",
          periodStart: "2026-05-26T00:00:00.000Z",
          productId: contentProduct.id,
          revenue: 96,
          saves: 20,
          shares: 15,
          source: "manual",
          storeId: scaleStore.id,
          views: 1400,
          watchSeconds: 18_200
        },
        {
          channel: "tiktok",
          clicks: 3,
          comments: 2,
          contentBriefId: "content_brief_2",
          conversions: 0,
          cost: 8,
          externalExecution: false,
          id: "content_snapshot_revise",
          likes: 30,
          notes: null,
          periodEnd: "2026-06-02T00:00:00.000Z",
          periodStart: "2026-05-26T00:00:00.000Z",
          productId: contentProduct.id,
          revenue: 0,
          saves: 4,
          shares: 3,
          source: "manual",
          storeId: scaleStore.id,
          views: 900,
          watchSeconds: 7_200
        }
      ],
      products: [contentProduct],
      stores: [scaleStore]
    });

    expect(plan.mode).toBe("Internal Faceless Content Pipeline");
    expect(plan.externalExecution).toBe(false);
    expect(plan.totals.newBriefs).toBe(1);
    expect(plan.totals.channelPackages).toBe(3);
    expect(plan.briefs[0]).toMatchObject({
      externalExecution: false,
      productId: contentProduct.id,
      recordState: "new",
      videoSpec: {
        providerContacted: false,
        status: "draft_only"
      },
      voiceoverSpec: {
        provider: "ElevenLabs",
        providerContacted: false
      }
    });
    expect(plan.briefs[0].channelPackages.map((pack) => pack.channel)).toEqual(["youtube_shorts", "tiktok", "instagram_reels"]);
    expect(plan.providerReadiness.every((provider) => provider.providerContacted === false)).toBe(true);
    expect(plan.performanceDigest.contentScores.map((score) => score.action)).toEqual(["scale_remix", "revise_hook"]);
    expect(plan.blockedExternalActions).toContain("Uploading, scheduling, publishing, deleting, or editing social content");
    expect(plan.blockedExternalActions).toContain("Using browser stealth, anti-detection, proxy rotation, or platform-evasion automation");
  });

  it("queues internal listing experiments for products missing listing copy", () => {
    const plan = buildRevenueListingOptimizationPlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [
        product({
          id: "listing_missing_copy",
          listingDescription: null,
          listingTitle: null,
          status: "Mockup Created",
          tags: ["fitness"]
        })
      ],
      stores: [scaleStore]
    });

    expect(plan.mode).toBe("Internal Listing Optimization Queue");
    expect(plan.externalExecution).toBe(false);
    expect(plan.totals.experimentsQueued).toBe(1);
    expect(plan.totals.missingCopyProducts).toBe(1);
    expect(plan.totals.variantsGenerated).toBe(3);
    expect(plan.experiments[0]).toMatchObject({
      action: "write_missing_copy",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Internal draft only"
      },
      externalExecution: false,
      productId: "listing_missing_copy",
      recommendedInternalStatus: "Listing Drafted"
    });
    expect(plan.experiments[0].recommendedVariant.title).toContain("Iron House Gym");
    expect(plan.experiments[0].recommendedVariant.tags.length).toBeGreaterThanOrEqual(5);
    expect(plan.blockedExternalActions).toContain("Publishing or editing Etsy listings");
  });

  it("uses performance evidence to queue conversion-focused listing variants", () => {
    const weakPublishedProduct = product({
      estimatedProfit: 4,
      id: "listing_conversion_repair",
      listingDescription: "Plain listing copy.",
      listingTitle: "Plain Tee",
      productName: "Conversion Repair Tee",
      profitMargin: 12,
      retailPrice: 26,
      status: "Published",
      tags: ["fitness", "gym", "training", "tee", "original"]
    });
    const digest = buildRevenuePerformanceDigest({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [weakPublishedProduct],
      snapshots: [
        normalizeRevenuePerformanceSnapshot({
          adSpend: 32,
          grossRevenue: 0,
          netProfit: -44,
          periodEnd: "2026-06-02T00:00:00.000Z",
          periodStart: "2026-05-26T00:00:00.000Z",
          productId: weakPublishedProduct.id,
          storeId: scaleStore.id,
          unitsSold: 0,
          visits: 180
        })
      ],
      stores: [scaleStore]
    });
    const plan = buildRevenueListingOptimizationPlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      options: {
        minVisitsForPerformanceExperiment: 50
      },
      performanceDigest: digest,
      products: [weakPublishedProduct],
      stores: [scaleStore]
    });

    expect(plan.totals.performanceBackedExperiments).toBe(1);
    expect(plan.experiments[0]).toMatchObject({
      action: "improve_conversion",
      evidence: {
        unitsSold: 0,
        visits: 180
      },
      recommendedInternalStatus: "Needs Revision"
    });
    expect(plan.experiments[0].reason).toContain("0 units");
    expect(plan.experiments[0].recommendedVariant.hypothesis).toContain("180 tracked visits");
    expect(plan.auditEvents.join(" ")).toContain("No marketplace listing");
  });

  it("builds internal store setup runbooks with collections and credential gates", () => {
    const readyStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      approvalStatus: "Listings Approved",
      id: "store_setup_ready",
      launchStatus: "Designing",
      storePlatform: "Shopify"
    };
    const readyProducts = [
      product({
        id: "setup_product_1",
        listingDescription: "Approved listing copy.",
        listingTitle: "Setup Core Tee",
        productName: "Setup Core Tee",
        status: "Approved",
        storeId: readyStore.id,
        tags: ["fitness", "gym", "tee", "training"]
      }),
      product({
        id: "setup_product_2",
        listingDescription: "Approved hoodie listing copy.",
        listingTitle: "Setup Core Hoodie",
        productName: "Setup Core Hoodie",
        productType: "Hoodie",
        status: "Approved",
        storeId: readyStore.id,
        tags: ["fitness", "gym", "hoodie", "training"]
      })
    ];
    const plan = buildRevenueStoreSetupPlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: readyProducts,
      stores: [readyStore]
    });

    expect(plan.mode).toBe("Internal Store Setup Runbook");
    expect(plan.externalExecution).toBe(false);
    expect(plan.totals.runbooksQueued).toBe(1);
    expect(plan.totals.collectionBlueprints).toBeGreaterThan(1);
    expect(plan.totals.credentialScopes).toBeGreaterThan(0);
    expect(plan.queue[0]).toMatchObject({
      action: "prepare_store_setup",
      externalExecution: false,
      storeId: readyStore.id
    });
    expect(plan.runbooks[0]).toMatchObject({
      action: "prepare_store_setup",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        status: "Required"
      },
      recommendedLaunchStatus: "Building Store"
    });
    expect(plan.runbooks[0].collectionBlueprints[0].title).toContain("Launch Collection");
    expect(plan.runbooks[0].credentialScopes.map((scope) => scope.provider)).toContain("Shopify");
    expect(plan.blockedExternalActions).toContain("Using browser stealth, anti-detection, or platform-evasion automation");
  });

  it("queues connector readiness when a store is already in setup state", () => {
    const buildingStore: RevenueEngineStoreSnapshot = {
      ...scaleStore,
      id: "store_connector_ready",
      launchStatus: "Building Store",
      storePlatform: "Etsy"
    };
    const readyProducts = [
      product({
        id: "connector_product_1",
        listingDescription: "Approved listing copy.",
        listingTitle: "Connector Tee",
        status: "Approved",
        storeId: buildingStore.id,
        tags: ["fitness", "gym", "tee", "training"]
      }),
      product({
        id: "connector_product_2",
        listingDescription: "Approved listing copy.",
        listingTitle: "Connector Hoodie",
        productType: "Hoodie",
        status: "Approved",
        storeId: buildingStore.id,
        tags: ["fitness", "gym", "hoodie", "training"]
      })
    ];
    const plan = buildRevenueStoreSetupPlan({
      options: {
        minConnectorReadiness: 60
      },
      products: readyProducts,
      stores: [buildingStore]
    });

    expect(plan.totals.readyForConnector).toBe(1);
    expect(plan.runbooks[0]).toMatchObject({
      action: "queue_connector_readiness",
      recommendedLaunchStatus: "Awaiting Approval"
    });
    expect(plan.runbooks[0].manualConnectorReadiness.status).toBe("Ready for manual handoff");
    expect(plan.runbooks[0].credentialScopes.map((scope) => scope.provider)).toContain("Etsy");
  });

  it("builds a cross-asset Portfolio Command Center with locked internal commands", () => {
    const weakProduct = product({
      estimatedProfit: -2,
      id: "portfolio_weak_product",
      productName: "Portfolio Weak Tee",
      profitMargin: -8,
      status: "Published"
    });
    const scaleProduct = product({
      id: "portfolio_scale_product",
      productName: "Portfolio Scale Planner",
      productType: "Digital Planner",
      status: "Published"
    });
    const revenuePlan = buildRevenueEnginePlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [weakProduct, scaleProduct],
      stores: [scaleStore]
    });
    const performanceDigest = buildRevenuePerformanceDigest({
      generatedAt: "2026-06-02T12:00:00.000Z",
      products: [weakProduct, scaleProduct],
      snapshots: [
        normalizeRevenuePerformanceSnapshot({
          adSpend: 52,
          grossRevenue: 0,
          netProfit: -54,
          periodEnd: "2026-06-02T00:00:00.000Z",
          periodStart: "2026-05-26T00:00:00.000Z",
          productId: weakProduct.id,
          storeId: scaleStore.id,
          unitsSold: 0,
          visits: 180
        }),
        normalizeRevenuePerformanceSnapshot({
          grossRevenue: 720,
          netProfit: 410,
          periodEnd: "2026-06-02T00:00:00.000Z",
          periodStart: "2026-05-26T00:00:00.000Z",
          productId: scaleProduct.id,
          storeId: scaleStore.id,
          unitsSold: 16,
          visits: 320
        })
      ],
      stores: [scaleStore]
    });
    const assetPortfolio = mergeRevenueAssetPortfolioPerformance(
      buildRevenueAssetPortfolio(revenuePlan),
      performanceDigest
    );
    const payoutReviewPlan = buildFinancialPayoutReviewPlan({
      intents: [{
        amount: 1250,
        approvalRequired: true,
        auditLogId: null,
        category: "personal",
        createdAt: "2026-06-02T12:00:00.000Z",
        currency: "USD",
        destinationType: "owner_distribution",
        externalExecution: false,
        id: "payout_high_risk",
        metadata: {},
        provider: "Stripe Treasury + Connect",
        status: "approval_required",
        updatedAt: "2026-06-02T12:00:00.000Z"
      }]
    });
    const financialPlan = buildFinancialReleaseGovernancePlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      reviewPlan: payoutReviewPlan
    });
    const financialScalingBudgetPlan = buildFinancialScalingBudgetReviewPlan({
      generatedAt: "2026-06-02T12:05:00.000Z",
      packets: [{
        amount: 80,
        approvalGate: {
          externalExecutionLocked: true,
          humanApprovalRequired: true,
          reason: "Scaling budget packet is an internal allocation only.",
          status: "Required"
        },
        assetId: scaleProduct.id,
        assetName: scaleProduct.productName,
        assetType: "product",
        auditLogId: null,
        blockedExternalActions: ["Increasing ad spend, procurement spend, or product spend without a separate approved scaling budget"],
        budgetCap: {
          maxPerAssetAmount: 80,
          retainedScalingCapital: 20,
          totalScalingCapital: 100
        },
        confidence: 90,
        createdAt: "2026-06-02T12:00:00.000Z",
        dedupeKey: "dedupe_portfolio_scale_budget",
        externalExecution: false,
        id: "scale_budget_portfolio_product",
        metadata: {},
        priority: 10,
        profitVelocity: 58.57,
        providerContacted: false,
        reason: "Validated scale product with usable performance evidence.",
        reviewedAt: null,
        reviewedById: null,
        reviewNote: null,
        score: 82,
        scoreBand: "excellent",
        splitPolicyId: "policy_portfolio",
        status: "approval_required",
        storeId: scaleStore.id,
        storeName: scaleStore.businessName,
        updatedAt: "2026-06-02T12:00:00.000Z"
      }]
    });
    const financialScalingExecutionBudgetPlan = buildFinancialScalingBudgetReviewPlan({
      generatedAt: "2026-06-02T12:08:00.000Z",
      packets: financialScalingBudgetPlan.packets.map((packet) => ({
        ...packet,
        reviewedAt: "2026-06-02T12:06:00.000Z",
        reviewedById: "user_finance",
        reviewNote: "Approved for manual scaling execution evidence.",
        status: "approved_manual_handoff"
      }))
    });
    const scalingSpendPlan = buildFinancialScalingSpendControlPlan({
      generatedAt: "2026-06-02T12:10:00.000Z",
      reviewPlan: financialScalingExecutionBudgetPlan
    });
    const persistedScalingSpendPlan = buildFinancialScalingSpendControlPlan({
      generatedAt: "2026-06-02T12:11:00.000Z",
      persistedSpendPackets: scalingSpendPlan.spendPackets.map((packet, index) => ({
        ...packet,
        auditLogId: "audit_scaling_spend_portfolio",
        createdAt: "2026-06-02T12:10:00.000Z",
        recordId: `portfolio_scaling_spend_${index + 1}`,
        updatedAt: "2026-06-02T12:10:00.000Z"
      })),
      reviewPlan: financialScalingExecutionBudgetPlan
    });
    const firstScalingSpendPacket = persistedScalingSpendPlan.persisted.packets[0]!;
    const financialScalingExecutionPlan = buildFinancialScalingExecutionLedgerPlan({
      entries: [normalizeFinancialScalingExecutionEntry({
        amountSpent: 20,
        assetId: firstScalingSpendPacket.assetId,
        assetName: firstScalingSpendPacket.assetName,
        assetType: firstScalingSpendPacket.assetType,
        category: firstScalingSpendPacket.category,
        createdAt: "2026-06-02T12:20:00.000Z",
        grossRevenue: 100,
        id: "portfolio_scale_execution_entry",
        netProfit: 52,
        outcome: "validated",
        periodEnd: "2026-06-02T12:20:00.000Z",
        periodStart: "2026-05-26T12:20:00.000Z",
        productId: firstScalingSpendPacket.assetType === "product" ? firstScalingSpendPacket.assetId : null,
        recordId: "portfolio_scale_execution_record",
        scalingSpendPacketId: firstScalingSpendPacket.recordId,
        source: "manual",
        storeId: firstScalingSpendPacket.storeId,
        storeName: firstScalingSpendPacket.storeName,
        unitsSold: 4,
        visits: 160
      })],
      generatedAt: "2026-06-02T12:25:00.000Z",
      spendControlPlan: persistedScalingSpendPlan
    });
    const contentPlan = buildFacelessContentPipelinePlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      performanceSnapshots: [{
        channel: "youtube_shorts",
        clicks: 80,
        comments: 12,
        contentBriefId: "brief_scale",
        conversions: 5,
        cost: 40,
        externalExecution: false,
        id: "content_perf_scale",
        likes: 300,
        notes: null,
        periodEnd: "2026-06-02T00:00:00.000Z",
        periodStart: "2026-05-26T00:00:00.000Z",
        productId: scaleProduct.id,
        revenue: 300,
        saves: 44,
        shares: 28,
        source: "manual",
        storeId: scaleStore.id,
        views: 3200,
        watchSeconds: 46000
      }],
      products: [scaleProduct],
      stores: [scaleStore]
    });
    const plan = buildPortfolioCommandCenterPlan({
      assetPortfolio,
      contentPlan,
      financialPlan,
      financialScalingBudgetPlan,
      financialScalingExecutionPlan,
      generatedAt: "2026-06-02T12:00:00.000Z",
      performanceDigest,
      persistedCommands: [{
        action: "watch",
        auditLogId: "audit_existing",
        commandHash: "existing",
        control: { externalExecution: false },
        createdAt: "2026-06-01T12:00:00.000Z",
        externalExecution: false,
        id: "command_existing",
        priority: 70,
        providerContacted: false,
        reason: "Existing watch command.",
        recommendedStatus: null,
        riskLevel: "low",
        sourceModule: "test",
        status: "queued",
        targetId: scaleStore.id,
        targetName: scaleStore.businessName,
        targetType: "store",
        updatedAt: "2026-06-01T12:00:00.000Z"
      }],
      revenuePlan
    });

    expect(plan.mode).toBe("Internal Portfolio Command Center");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.commandActions).toBeGreaterThanOrEqual(4);
    expect(plan.totals.highRiskCommands).toBeGreaterThan(0);
    expect(plan.totals.assetPortfolioActions).toBeGreaterThan(0);
    expect(plan.totals.assetPortfolioProfitVelocity).toBe(performanceDigest.totals.profitVelocity);
    expect(plan.totals.assetPortfolioTrackedAssets).toBeGreaterThan(0);
    expect(plan.totals.pendingPayoutAmount).toBe(1250);
    expect(plan.totals.pendingScalingBudgetAmount).toBe(80);
    expect(plan.totals.pendingScalingBudgetPackets).toBe(1);
    expect(plan.totals.scaleOutcomeEntries).toBe(1);
    expect(plan.totals.scaleOutcomeScaleNext).toBe(1);
    expect(plan.totals.contentViews).toBe(3200);
    expect(plan.commandActions).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "kill",
        externalExecution: false,
        recommendedStatus: "Archived",
        sourceModule: expect.stringContaining("revenue_asset_portfolio"),
        targetId: weakProduct.id
      }),
      expect.objectContaining({
        action: "review_payout",
        providerContacted: false,
        targetId: "payout_high_risk"
      }),
      expect.objectContaining({
        action: "review_scale_budget",
        providerContacted: false,
        sourceModule: "financial_scaling_budget_review",
        targetId: "scale_budget_portfolio_product"
      }),
      expect.objectContaining({
        action: "review_scale_budget",
        providerContacted: false,
        recommendedStatus: "queue_next_scaling_budget_review",
        sourceModule: "financial_scaling_execution_ledger",
        targetId: `scale_execution:${firstScalingSpendPacket.recordId}`
      }),
      expect.objectContaining({
        action: "queue_content",
        targetType: "content"
      })
    ]));
    expect(plan.riskLanes.map((lane) => lane.lane)).toEqual(["revenue", "finance", "content", "operations"]);
    expect(plan.persistedCommands[0]).toMatchObject({
      externalExecution: false,
      id: "command_existing",
      providerContacted: false
    });
    expect(plan.blockedExternalActions).toContain("Browser stealth, anti-detection, proxy rotation, fingerprint spoofing, or platform evasion automation");
  });
});
