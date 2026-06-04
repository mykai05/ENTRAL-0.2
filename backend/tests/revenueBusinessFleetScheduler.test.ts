import { describe, expect, it } from "vitest";
import {
  buildRevenueBusinessFleetLaunchGapPlan,
  buildRevenueHundredStoreDailySupervisorPlan,
  buildRevenueHundredStoreOperationsCommandPlan,
  buildRevenueHundredStoreOperationsPlan,
  buildRevenueBusinessFleetSchedulerPlan,
  buildRevenueMoneyArmyBatchPipelinePlan,
  selectRevenueBusinessFleetLaunchWave,
  type RevenueBusinessFleetPlan
} from "../src/services/revenueBusinessFleetScheduler.js";
import {
  defaultRevenueEngineThresholds,
  type RevenueAssetPortfolio,
  type RevenueAssetRotationDecision,
  type RevenueAssetScore
} from "../src/services/revenueEngine.js";
import type {
  RevenueFirstBusinessLaunchCandidate,
  RevenueFirstBusinessLaunchPlan
} from "../src/services/revenueFirstBusinessLaunch.js";

function asset(input: {
  assetId: string;
  assetName: string;
  finalRank?: number;
  recommendation?: RevenueAssetRotationDecision;
  riskLevel?: RevenueAssetScore["riskLevel"];
  storeId?: string;
  storeName?: string;
}): RevenueAssetScore {
  const finalRank = input.finalRank ?? 95;
  const recommendation = input.recommendation ?? "watch";
  const riskLevel = input.riskLevel ?? "low";

  return {
    assetId: input.assetId,
    assetName: input.assetName,
    assetScore: {
      economicsScore: finalRank >= 70 ? 38 : 10,
      finalRank,
      readinessScore: finalRank >= 70 ? 32 : 8,
      riskPenalty: riskLevel === "high" ? 25 : riskLevel === "medium" ? 10 : 0,
      velocity: 0
    },
    assetType: "store",
    confidence: 90,
    economics: {
      estimatedProfit: finalRank * 5,
      profitMargin: 40,
      retailValue: 0,
      revenue: 0
    },
    evidence: ["test asset"],
    externalExecution: false,
    nextInternalState: recommendation === "kill" ? "Archived" : null,
    priority: 100 - finalRank,
    providerContacted: false,
    readiness: {
      approvedProducts: finalRank >= 70 ? 5 : 0,
      portfolioReady: finalRank >= 70,
      status: "Optimizing"
    },
    reason: `${input.assetName} test recommendation ${recommendation}.`,
    recommendation,
    riskLevel,
    rotationDecision: recommendation,
    rotationReason: `${input.assetName} test recommendation ${recommendation}.`,
    score: finalRank,
    scoreBand: finalRank >= 85 ? "excellent" : finalRank >= 70 ? "healthy" : finalRank >= 50 ? "watch" : finalRank >= 30 ? "weak" : "critical",
    storeId: input.storeId ?? input.assetId,
    storeName: input.storeName ?? input.assetName
  };
}

function portfolio(assets: RevenueAssetScore[]): RevenueAssetPortfolio {
  return {
    assets,
    blockedExternalActions: ["Publishing marketplace listings"],
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    mode: "Revenue Engine Asset Portfolio",
    providerContacted: false,
    rotationChanges: [],
    summary: `${assets.length} test assets.`,
    thresholds: defaultRevenueEngineThresholds,
    totals: {
      assets: assets.length,
      estimatedProfit: assets.reduce((sum, item) => sum + item.economics.estimatedProfit, 0),
      kill: assets.filter((item) => item.recommendation === "kill").length,
      pause: assets.filter((item) => item.recommendation === "pause").length,
      performanceSnapshots: 0,
      products: 0,
      profitVelocity: 0,
      revenueVelocity: 0,
      rotationChanges: 0,
      scale: assets.filter((item) => item.recommendation === "scale").length,
      stores: assets.length,
      totalRevenue: 0,
      trackedAssets: 0,
      watch: assets.filter((item) => item.recommendation === "watch").length
    }
  };
}

function launchCandidate(storeId: string, index: number): RevenueFirstBusinessLaunchCandidate {
  return {
    blockers: [],
    cashReadinessScore: 90,
    checklistItemId: `checklist-${index}`,
    expectedInternalEffect: "Move the first-cash bridge action into internal launch execution.",
    externalExecution: false,
    finalRank: 92 - index,
    incomeVelocityScore: 88,
    launchReadinessScore: 90,
    nextInternalAction: "dispatch_first_cash_bridge_action",
    nextInternalState: "dispatch_ready_first_cash_bridge_action",
    priorityScore: 90,
    providerContacted: false,
    reason: `Store ${index} is ready for the first launch wave.`,
    recommendedEndpoint: "/merch/revenue-engine/first-business-launch/apply",
    riskLevel: "low",
    sprintActionId: `sprint-${index}`,
    status: "ready_internal",
    storeId,
    storeName: `Store ${index}`,
    summary: `Store ${index} ready.`
  };
}

function firstBusinessPlan(candidates: RevenueFirstBusinessLaunchCandidate[]): RevenueFirstBusinessLaunchPlan {
  return {
    auditEvents: ["test first-business launch plan"],
    blockedExternalActions: ["Publishing first-business launch assets"],
    candidates,
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    mode: "Revenue Engine First Business Launch Path",
    providerContacted: false,
    sprint: {
      readyInternal: candidates.length,
      summary: "test sprint"
    },
    summary: "test first-business launch plan",
    topCandidate: candidates[0] ?? null,
    totals: {
      blocked: 0,
      candidates: candidates.length,
      manualGates: 0,
      readyInternal: candidates.length,
      watch: 0
    }
  };
}

describe("Revenue Business Fleet Scheduler", () => {
  it("selects a 10-business first wave while queuing overflow candidates", () => {
    const assets = Array.from({ length: 12 }, (_, index) => asset({
      assetId: `store-${index + 1}`,
      assetName: `Store ${index + 1}`
    }));
    const candidates = assets.map((item, index) => launchCandidate(item.storeId, index + 1));
    const plan: RevenueBusinessFleetPlan = buildRevenueBusinessFleetSchedulerPlan({
      assetPortfolio: portfolio(assets),
      firstBusinessLaunchPlan: firstBusinessPlan(candidates),
      options: {
        launchWaveSize: 10,
        maxParallelLaunches: 10,
        shardCount: 4,
        targetBusinesses: 1_000
      }
    });

    expect(plan.mode).toBe("Revenue Business Fleet Scheduler");
    expect(plan.externalExecution).toBe(false);
    expect(plan.capacity).toMatchObject({
      currentBusinesses: 12,
      launchWaveSize: 10,
      targetBusinesses: 1_000,
      targetGap: 988
    });
    expect(plan.totals.launchNow).toBe(12);
    expect(plan.launchWave).toHaveLength(10);
    expect(plan.launchWave.every((business) => business.scheduleState === "ready_parallel")).toBe(true);
    expect(plan.businesses.filter((business) => business.scheduleState === "queued")).toHaveLength(2);
    expect(plan.blockedExternalActions).toContain("Launching browser automation, stealth, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or platform-evasion workflows");

    const selection = selectRevenueBusinessFleetLaunchWave({
      firstBusinessLaunchPlan: firstBusinessPlan(candidates),
      plan
    });

    expect(selection).toMatchObject({
      externalExecution: false,
      mode: "Revenue Business Fleet Launch Wave",
      providerContacted: false,
      totals: {
        eligible: 10,
        selected: 10,
        skipped: 0
      }
    });
    expect(selection.sprintActionIds).toHaveLength(10);
    expect(selection.selectedBusinesses[0]).toMatchObject({
      qualityStatus: "pass",
      scheduleState: "ready_parallel",
      sprintActionId: "sprint-1"
    });
  });

  it("blocks kill-lane businesses from parallel execution", () => {
    const plan = buildRevenueBusinessFleetSchedulerPlan({
      assetPortfolio: portfolio([
        asset({
          assetId: "store-kill",
          assetName: "Weak Store",
          finalRank: 18,
          recommendation: "kill",
          riskLevel: "high"
        })
      ]),
      options: {
        launchWaveSize: 10,
        maxParallelLaunches: 10,
        qualityFloor: 70
      }
    });
    const business = plan.businesses[0];

    expect(business).toMatchObject({
      lane: "kill",
      parallelism: {
        launchSlots: 0,
        maxInternalJobs: 0,
        scaleSlots: 0
      },
      scheduleState: "blocked"
    });
    expect(plan.totals.blocked).toBe(1);
    expect(plan.totals.qualityBlock).toBe(1);
  });

  it("fills a short first wave with repair actions and new opportunity seeds", () => {
    const readyAsset = asset({
      assetId: "store-ready",
      assetName: "Ready Store"
    });
    const repairAsset = asset({
      assetId: "store-repair",
      assetName: "Repair Store",
      finalRank: 62,
      recommendation: "watch"
    });
    const plan = buildRevenueBusinessFleetSchedulerPlan({
      assetPortfolio: portfolio([readyAsset, repairAsset]),
      firstBusinessLaunchPlan: firstBusinessPlan([launchCandidate(readyAsset.storeId, 1)]),
      options: {
        launchWaveSize: 10,
        maxParallelLaunches: 10,
        qualityFloor: 70,
        shardCount: 4,
        targetBusinesses: 1_000
      }
    });
    const gapPlan = buildRevenueBusinessFleetLaunchGapPlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      plan
    });

    expect(gapPlan).toMatchObject({
      externalExecution: false,
      mode: "Revenue Business Fleet Launch Gap Planner",
      providerContacted: false,
      totals: {
        createOpportunityShells: 8,
        launchWaveGap: 9,
        readyLaunchWaveBusinesses: 1,
        repairActions: 1,
        runLaunchWaveActions: 1,
        targetLaunchWave: 10
      }
    });
    expect(gapPlan.actions.map((action) => action.action)).toEqual([
      "run_launch_wave",
      "repair_quality_gate",
      "create_opportunity_shell",
      "create_opportunity_shell",
      "create_opportunity_shell",
      "create_opportunity_shell",
      "create_opportunity_shell",
      "create_opportunity_shell",
      "create_opportunity_shell",
      "create_opportunity_shell"
    ]);
    expect(gapPlan.actions.every((action) => action.externalExecution === false)).toBe(true);
    expect(gapPlan.opportunitySeeds).toHaveLength(8);
    expect(gapPlan.summary).toBe("1/10 businesses are ready for the first wave. Gap 9: 1 repair action and 8 new opportunity seeds queued internally.");
  });

  it("assembles a private Money Army batch pipeline with approval-gated internal stages", () => {
    const readyAsset = asset({
      assetId: "store-ready",
      assetName: "Ready Store"
    });
    const plan = buildRevenueBusinessFleetSchedulerPlan({
      assetPortfolio: portfolio([readyAsset]),
      firstBusinessLaunchPlan: firstBusinessPlan([launchCandidate(readyAsset.storeId, 1)]),
      options: {
        launchWaveSize: 10,
        maxParallelLaunches: 10,
        shardCount: 4,
        targetBusinesses: 1_000
      }
    });
    const gapPlan = buildRevenueBusinessFleetLaunchGapPlan({
      generatedAt: "2026-06-02T12:00:00.000Z",
      plan
    });
    const pipeline = buildRevenueMoneyArmyBatchPipelinePlan({
      approvableApprovalPackets: 2,
      approvedApprovalPackets: 0,
      gapPlan,
      generatedAt: "2026-06-02T12:05:00.000Z",
      pendingApprovalPackets: 2,
      plan,
      selectedSourceKeys: gapPlan.opportunitySeeds.slice(0, 2).map((seed) => seed.sourceKey)
    });

    expect(pipeline).toMatchObject({
      externalExecution: false,
      mode: "Private Money Army Batch Pipeline",
      providerContacted: false,
      totals: {
        approvablePackets: 2,
        currentBusinesses: 1,
        seedCandidates: 9,
        selectedSourceKeys: 2,
        stages: 5,
        targetBusinesses: 1_000
      }
    });
    expect(pipeline.stages.map((stage) => stage.name)).toEqual([
      "batch_creation",
      "batch_acceleration",
      "launch_package",
      "approval",
      "deployment"
    ]);
    expect(pipeline.stages.every((stage) => stage.externalExecution === false && stage.providerContacted === false)).toBe(true);
    expect(pipeline.nextStage?.name).toBe("batch_creation");
    expect(pipeline.blockedExternalActions).toContain("Launching browser automation, stealth, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or platform-evasion workflows");
    expect(pipeline.auditEvents.join(" ")).toContain("Every stage is internal and approval-gated");
  });

  it("builds a 100-store operations readiness plan from fleet and Money Army signals", () => {
    const assets = [
      ...Array.from({ length: 14 }, (_, index) => asset({
        assetId: `store-ready-${index + 1}`,
        assetName: `Ready Store ${index + 1}`,
        finalRank: 100 - index,
        recommendation: index < 3 ? "scale" : "watch"
      })),
      asset({
        assetId: "store-repair",
        assetName: "Repair Store",
        finalRank: 55,
        recommendation: "pause",
        riskLevel: "medium"
      })
    ];
    const candidates = assets.slice(0, 12).map((item, index) => launchCandidate(item.storeId, index + 1));
    const plan = buildRevenueBusinessFleetSchedulerPlan({
      assetPortfolio: portfolio(assets),
      firstBusinessLaunchPlan: firstBusinessPlan(candidates),
      options: {
        launchWaveSize: 25,
        maxParallelLaunches: 25,
        maxParallelScaleActions: 50,
        qualityFloor: 72,
        shardCount: 32,
        targetBusinesses: 100
      }
    });
    const gapPlan = buildRevenueBusinessFleetLaunchGapPlan({
      generatedAt: "2026-06-02T12:10:00.000Z",
      plan
    });
    const pipeline = buildRevenueMoneyArmyBatchPipelinePlan({
      gapPlan,
      generatedAt: "2026-06-02T12:15:00.000Z",
      plan
    });
    const operations = buildRevenueHundredStoreOperationsPlan({
      gapPlan,
      generatedAt: "2026-06-02T12:20:00.000Z",
      options: {
        maxStoresPerShard: 8,
        minProductsPerStore: 5,
        safeBatchSize: 25,
        targetStores: 100
      },
      pipeline,
      plan
    });

    expect(operations).toMatchObject({
      externalExecution: false,
      mode: "100 Store Operations Readiness",
      operatingStatus: "needs_quality_repair",
      providerContacted: false,
      totals: {
        currentStores: 15,
        storeGap: 85,
        targetStores: 100
      }
    });
    expect(operations.batchPlan).toMatchObject({
      batchRunsRequired: 4,
      recommendedBatchSize: 25,
      storeGap: 85
    });
    expect(operations.batchPlan.productDraftDeficit).toBeGreaterThanOrEqual(425);
    expect(operations.concurrency.minimumRecommendedShards).toBe(13);
    expect(operations.controlGrid).toMatchObject({
      externalExecution: false,
      mode: "100 Store Operating Control Grid",
      providerContacted: false,
      safeToRunParallelInternalJobs: true,
      totals: {
        configuredShards: 32,
        currentStores: 15,
        missingStoreSlots: 85,
        visibleStores: 15
      }
    });
    expect(operations.controlGrid.shards).toHaveLength(32);
    expect(operations.controlGrid.stores).toHaveLength(15);
    expect(operations.controlGrid.stores[0]?.applicationReadiness.readinessStatus).toBe("missing");
    expect(operations.controlGrid.stores[0]?.allowedInternalJobs).toContain("prepare_connector_packet");
    expect(operations.applicationConnectionWorkbench).toMatchObject({
      externalExecution: false,
      mode: "100 Store Application Connection Workbench",
      providerContacted: false,
      totals: {
        blockedPackets: 5,
        packets: 75,
        readyPackets: 70,
        storesCovered: 15
      }
    });
    expect(operations.applicationConnectionWorkbench.packets[0]?.connectionMode).toBe("internal_preparation_only");
    expect(operations.applicationConnectionWorkbench.packets[0]?.providerOptions.length).toBeGreaterThan(0);
    expect(operations.applicationConnectionWorkbench.templates).toHaveLength(5);
    expect(operations.connectorActivationMatrix).toMatchObject({
      externalExecution: false,
      mode: "100 Store Connector Activation Matrix",
      providerContacted: false,
      totals: {
        currentStoreRows: 75,
        futureStoreRows: 425,
        maxSelectableRows: 25,
        rows: 500,
        targetStores: 100
      }
    });
    expect(operations.connectorActivationMatrix.rows.every((row) => row.externalExecution === false && row.providerContacted === false)).toBe(true);
    expect(operations.connectorActivationMatrix.rows.some((row) => row.status === "credential_custody_required")).toBe(true);
    expect(operations.connectorActivationMatrix.rows.some((row) => row.status === "waiting_for_store_shell")).toBe(true);
    expect(operations.connectorActivationMatrix.rows.some((row) => row.writeScopesBlocked.length > 0)).toBe(true);
    expect(operations.connectorActivationMatrix.blockedExternalActions.join(" ")).toContain("credential values");
    expect(operations.monitoringMatrix).toMatchObject({
      externalExecution: false,
      mode: "100 Store Monitoring Matrix",
      providerContacted: false,
      totals: {
        missingStoreSlots: 85,
        storesCovered: 15
      }
    });
    expect(operations.monitoringMatrix.items).toHaveLength(15);
    expect(operations.monitoringMatrix.items[0]?.externalExecution).toBe(false);
    expect(operations.monitoringMatrix.items[0]?.providerContacted).toBe(false);
    expect(
      operations.monitoringMatrix.queues.manualSnapshots.length
      + operations.monitoringMatrix.queues.readOnlyImports.length
      + operations.monitoringMatrix.queues.rotationReviews.length
      + operations.monitoringMatrix.queues.scaleReviews.length
    ).toBeGreaterThan(0);
    expect(operations.growthAllocationRouter).toMatchObject({
      externalExecution: false,
      mode: "100 Store Growth Allocation Router",
      providerContacted: false,
      totals: {
        advisoryOnly: true,
        storesCovered: 15
      }
    });
    expect(operations.growthAllocationRouter.candidates).toHaveLength(15);
    expect(operations.growthAllocationRouter.candidates[0]?.providerContacted).toBe(false);
    expect(operations.growthAllocationRouter.candidates[0]?.requiredApproval).toMatch(/approval/i);
    expect(operations.dailyOperatingLoop).toMatchObject({
      cadence: "daily_private_internal_ops",
      externalExecution: false,
      mode: "100 Store Daily Operating Loop",
      providerContacted: false,
      totals: {
        storeGap: 85,
        storesCovered: 15
      }
    });
    expect(operations.dailyOperatingLoop.steps.map((step) => step.phase)).toEqual([
      "safety_gate_snapshot",
      "application_connection_packets",
      "connector_activation_matrix",
      "monitoring_cycle",
      "growth_allocation_review",
      "product_depth_repair",
      "launch_packet_review",
      "autonomy_run_queue",
      "work_lease_claims",
      "worker_assignment_claims",
      "store_batch_creation",
      "weak_lane_rotation"
    ]);
    expect(operations.dailyOperatingLoop.steps.every((step) => step.externalExecution === false && step.providerContacted === false)).toBe(true);
    expect(operations.dailyOperatingLoop.steps.find((step) => step.phase === "product_depth_repair")).toMatchObject({
      confirmation: "RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-product-depth/apply",
      maxItems: 25,
      status: "ready"
    });
    expect(operations.productDepthQueue).toMatchObject({
      externalExecution: false,
      mode: "100 Store Product Depth Queue",
      providerContacted: false,
      totals: {
        blockedDrafts: 5,
        currentStoreDrafts: 75,
        drafts: operations.batchPlan.productDraftDeficit,
        futureStoreDrafts: 425,
        maxSelectableDrafts: 25,
        productDraftDeficit: operations.batchPlan.productDraftDeficit,
        readyDrafts: 70,
        targetStores: 100,
        waitingDrafts: 425
      }
    });
    expect(operations.productDepthQueue.drafts.every((draft) => draft.externalExecution === false && draft.providerContacted === false)).toBe(true);
    expect(operations.productDepthQueue.drafts.some((draft) => draft.status === "ready_for_internal_draft")).toBe(true);
    expect(operations.productDepthQueue.drafts.some((draft) => draft.status === "waiting_for_store_shell")).toBe(true);
    expect(operations.productDepthQueue.drafts.some((draft) => draft.status === "blocked_by_quality")).toBe(true);
    expect(operations.productDepthQueue.drafts[0]?.approvalChecklist.join(" ")).toContain("Approve design prompt");
    expect(operations.productDepthQueue.blockedExternalActions.join(" ")).toContain("Generating images");
    expect(operations.launchPacketQueue).toMatchObject({
      externalExecution: false,
      mode: "100 Store Launch Packet Queue",
      providerContacted: false,
      totals: {
        currentStorePackets: 15,
        futureStorePackets: 85,
        maxSelectablePackets: 25,
        packets: 100,
        targetStores: 100
      }
    });
    expect(operations.launchPacketQueue.packets.every((packet) => packet.externalExecution === false && packet.providerContacted === false)).toBe(true);
    expect(operations.launchPacketQueue.packets.some((packet) => packet.status === "ready_for_internal_launch_review")).toBe(true);
    expect(operations.launchPacketQueue.packets.some((packet) => packet.status === "waiting_for_store_shell")).toBe(true);
    expect(operations.launchPacketQueue.blockedExternalActions.join(" ")).toContain("live marketplace listings");
    expect(operations.autonomyRunQueue).toMatchObject({
      externalExecution: false,
      mode: "100 Store Autonomy Run Queue",
      providerContacted: false,
      totals: {
        maxSelectableJobs: 25,
        targetStores: 100
      }
    });
    expect(operations.autonomyRunQueue.jobs).toHaveLength(operations.autonomyRunQueue.totals.jobs);
    expect(operations.autonomyRunQueue.jobs.every((job) => job.externalExecution === false && job.providerContacted === false)).toBe(true);
    expect(operations.autonomyRunQueue.totals.readyInternal).toBeGreaterThan(0);
    expect(operations.autonomyRunQueue.totals.approvalRequired).toBeGreaterThan(0);
    expect(operations.autonomyRunQueue.totals.cleanParallelJobs).toBeGreaterThan(0);
    expect(operations.autonomyRunQueue.jobs.some((job) => job.jobType === "prepare_store_shell")).toBe(true);
    expect(operations.autonomyRunQueue.jobs.some((job) => job.jobType === "record_product_depth_draft")).toBe(true);
    expect(operations.autonomyRunQueue.jobs.some((job) => job.jobType === "record_launch_packet")).toBe(true);
    expect(operations.autonomyRunQueue.blockedExternalActions.join(" ")).toContain("Provider account creation");
    expect(operations.workLeasePlan).toMatchObject({
      externalExecution: false,
      mode: "100 Store Internal Work Lease Plan",
      providerContacted: false,
      totals: {
        duplicateDedupeKeys: 0,
        maxSelectableLeases: 25,
        targetStores: 100
      }
    });
    expect(operations.workLeasePlan.leases).toHaveLength(operations.workLeasePlan.totals.leases);
    expect(operations.workLeasePlan.leases.every((lease) => lease.externalExecution === false && lease.providerContacted === false)).toBe(true);
    expect(operations.workLeasePlan.totals.readyToClaim).toBeGreaterThan(0);
    expect(operations.workLeasePlan.totals.cleanParallelLeases).toBeGreaterThan(0);
    expect(operations.workLeasePlan.leases.some((lease) => lease.status === "ready_to_claim")).toBe(true);
    expect(operations.workLeasePlan.leases.some((lease) => lease.status === "approval_hold")).toBe(true);
    expect(operations.workLeasePlan.blockedExternalActions.join(" ")).toContain("same dedupe key");
    expect(operations.capacityProof).toMatchObject({
      externalExecution: false,
      mode: "100 Store Capacity Proof",
      providerContacted: false,
      status: "watch",
      stressProfile: {
        applicationBoundaryCoveragePercent: 100,
        cleanSimultaneousStoreCapacity: 100,
        monitoringSweepCycles: 4,
        preparedApplicationBoundaries: 500,
        requiredApplicationBoundaries: 500,
        shardCapacity: 256,
        targetStores: 100
      },
      totals: {
        block: 0,
        cleanSimultaneousStoreCapacity: 100,
        targetStores: 100
      }
    });
    expect(operations.capacityProof.totals.watch).toBeGreaterThan(0);
    expect(operations.capacityProof.checks.map((check) => check.title)).toEqual([
      "Shard Capacity",
      "Application Boundary Preparation",
      "Connector Activation Readiness",
      "Monitoring Throughput",
      "Daily Supervisor Control",
      "Work Lease Clean Claiming",
      "Chain Of Command Assignment",
      "Batch And Product Depth",
      "Profit Routing Guardrails"
    ]);
    expect(operations.capacityProof.checks.some((check) => check.status === "block")).toBe(false);
    expect(operations.capacityProof.checks.every((check) => check.externalExecution === false && check.providerContacted === false)).toBe(true);
    expect(operations.capacityProof.checks.find((check) => check.checkId === "connector_activation_readiness")?.status).toBe("watch");
    expect(operations.capacityProof.checks.find((check) => check.checkId === "batch_and_product_depth")?.status).toBe("watch");
    expect(operations.capacityProof.summary).toContain("100/100 clean simultaneous store slots");
    expect(operations.gates.map((gate) => gate.title)).toContain("Safety Envelope");
    expect(operations.gates.map((gate) => gate.title)).toContain("Application Connection Readiness");
    expect(operations.gates.map((gate) => gate.title)).toContain("Connector Activation Matrix");
    expect(operations.gates.map((gate) => gate.title)).toContain("Monitoring Cadence");
    expect(operations.gates.map((gate) => gate.title)).toContain("Autonomy Run Queue");
    expect(operations.gates.map((gate) => gate.title)).toContain("Internal Work Leases");
    expect(operations.gates.find((gate) => gate.title === "Profit Acceleration")?.evidence.join(" ")).toContain("paid-scale review");
    expect(operations.gates.find((gate) => gate.title === "Safety Envelope")?.status).toBe("pass");
    expect(operations.applicationReadiness.totals).toMatchObject({
      mappedStores: 0,
      missingStores: 100,
      readinessCoveragePercent: 0,
      targetStores: 100
    });
    expect(operations.applicationReadiness.applications.map((application) => application.title)).toEqual([
      "Storefront Marketplace",
      "POD Supplier",
      "Payments And Payout Signals",
      "Faceless Content Channels",
      "Manual Signal Import"
    ]);
    expect(operations.nextActions.map((action) => action.title)).toContain("Create the next 100-store batch");
    expect(operations.nextActions.find((action) => action.title === "Fill product depth for 100 stores")).toMatchObject({
      confirmation: "RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-product-depth/apply",
      status: "ready"
    });
    expect(operations.nextActions.find((action) => action.title === "Record connector activation matrix")).toMatchObject({
      confirmation: "RECORD INTERNAL 100 STORE CONNECTOR ACTIVATION MATRIX",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-connector-activation/apply",
      status: "ready"
    });
    expect(operations.nextActions.find((action) => action.title === "Record 100-store launch packets")).toMatchObject({
      confirmation: "RECORD INTERNAL 100 STORE LAUNCH PACKETS",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-launch-packets/apply",
      status: "ready"
    });
    expect(operations.nextActions.find((action) => action.title === "Record 100-store autonomy run")).toMatchObject({
      confirmation: "RECORD INTERNAL 100 STORE AUTONOMY RUN",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-autonomy-run/apply",
      status: "ready"
    });
    expect(operations.nextActions.find((action) => action.title === "Record 100-store work leases")).toMatchObject({
      confirmation: "RECORD INTERNAL 100 STORE WORK LEASES",
      endpoint: "/merch/revenue-engine/business-fleet-scheduler/100-store-work-leases/apply",
      status: "ready"
    });
    expect(operations.nextActions.map((action) => action.title)).toContain("Clear weak store lanes");
    expect(operations.profitAcceleration.topScaleCandidates.length).toBeGreaterThan(0);
    expect(operations.blockedExternalActions).toContain("Launching browser automation, stealth, proxy rotation, fingerprint spoofing, CAPTCHA bypass, account warmup, or platform-evasion workflows");
    expect(operations.summary).toContain("100-store internal operations");

    const commandPlan = buildRevenueHundredStoreOperationsCommandPlan({
      generatedAt: "2026-06-02T12:25:00.000Z",
      operations
    });

    expect(commandPlan).toMatchObject({
      externalExecution: false,
      mode: "100 Store Operations Command Queue",
      providerContacted: false,
      selectedCommand: {
        action: "run_money_army_batch_creation",
        maxItems: 25,
        providerContacted: false,
        stage: "batch_creation"
      },
      totals: {
        executable: 1,
        manualReview: 1
      }
    });
    expect(commandPlan.selectedCommand?.confirmation).toBe("CREATE INTERNAL BUSINESS FLEET GAP SEEDS");
    expect(commandPlan.summary).toContain("bounded 100-store command");

    const safeSupervisor = buildRevenueHundredStoreDailySupervisorPlan({
      generatedAt: "2026-06-02T12:30:00.000Z",
      maxSteps: 7,
      operations
    });

    expect(safeSupervisor).toMatchObject({
      externalExecution: false,
      mode: "100 Store Daily Supervisor",
      operatingMode: "safe_internal_only",
      providerContacted: false,
      totals: {
        selected: 7
      }
    });
    expect(safeSupervisor.selectedSteps.map((step) => step.action)).toEqual([
      "confirm_safety",
      "record_app_connection_packets",
      "record_connector_activation_matrix",
      "record_monitoring_cycle",
      "record_product_depth_drafts",
      "record_launch_packets",
      "record_autonomy_run_queue"
    ]);
    expect(safeSupervisor.selectedSteps.find((step) => step.phase === "connector_activation_matrix")?.confirmation).toBe("RECORD INTERNAL 100 STORE CONNECTOR ACTIVATION MATRIX");
    expect(safeSupervisor.selectedSteps.find((step) => step.phase === "product_depth_repair")?.confirmation).toBe("RECORD INTERNAL 100 STORE PRODUCT DEPTH DRAFTS");
    expect(safeSupervisor.selectedSteps.find((step) => step.phase === "launch_packet_review")?.confirmation).toBe("RECORD INTERNAL 100 STORE LAUNCH PACKETS");
    expect(safeSupervisor.selectedSteps.find((step) => step.phase === "autonomy_run_queue")?.confirmation).toBe("RECORD INTERNAL 100 STORE AUTONOMY RUN");
    expect(safeSupervisor.steps.find((step) => step.phase === "work_lease_claims")?.confirmation).toBe("RECORD INTERNAL 100 STORE WORK LEASES");
    expect(safeSupervisor.steps.find((step) => step.phase === "store_batch_creation")?.status).toBe("approval_required");
    expect(safeSupervisor.summary).toContain("safe internal only");
    expect(safeSupervisor.blockedExternalActions.join(" ")).toContain("external write execution");

    const batchSupervisor = buildRevenueHundredStoreDailySupervisorPlan({
      maxSteps: 10,
      mode: "include_batch_creation",
      operations
    });

    expect(batchSupervisor.selectedSteps.map((step) => step.phase)).toContain("worker_assignment_claims");
    expect(batchSupervisor.selectedSteps.map((step) => step.phase)).toContain("store_batch_creation");
    expect(batchSupervisor.steps.every((step) => step.externalExecution === false && step.providerContacted === false)).toBe(true);
  });
});
