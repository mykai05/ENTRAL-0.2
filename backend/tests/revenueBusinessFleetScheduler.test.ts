import { describe, expect, it } from "vitest";
import {
  buildRevenueBusinessFleetLaunchGapPlan,
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
});
