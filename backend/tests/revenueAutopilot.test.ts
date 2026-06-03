import { describe, expect, it } from "vitest";
import {
  buildRevenueAutopilotPlan,
  selectRevenueAutopilotExecutionSteps
} from "../src/services/revenueAutopilot.js";
import type { DigitalProductPortfolioPlan } from "../src/services/digitalProductPortfolio.js";
import type { FacelessContentPipelinePlan } from "../src/services/facelessContentPipeline.js";
import type { FinancialOrchestratorPlan } from "../src/services/financialOrchestrator.js";
import type { FinancialReleaseGovernancePlan } from "../src/services/financialReleaseGovernance.js";
import type { PortfolioCommandCenterPlan } from "../src/services/portfolioCommandCenter.js";
import type { RevenueAssetPortfolio, RevenueEnginePlan } from "../src/services/revenueEngine.js";
import type { RevenueFirstBusinessLaunchPlan } from "../src/services/revenueFirstBusinessLaunch.js";
import type { RevenueFirstCashSprintPlan } from "../src/services/revenueFirstCashSprint.js";
import type { RevenueLaunchPipelinePlan } from "../src/services/revenueLaunchPipeline.js";
import type { RevenueListingOptimizationPlan } from "../src/services/revenueListingOptimization.js";
import type { RevenueStoreSetupPlan } from "../src/services/revenueStoreSetup.js";
import type { SignalIntakePlan } from "../src/services/signalIntakeCenter.js";

const revenuePlan = {
  blockedExternalActions: ["Changing live revenue assets"],
  rotationChanges: [],
  totals: {
    products: 12,
    stores: 3
  }
} as RevenueEnginePlan;

const assetPortfolio = {
  blockedExternalActions: ["Changing internal revenue assets"],
  summary: "5 assets scored with 2 live performance snapshots. 1 kill recommendation ready.",
  totals: {
    kill: 1,
    performanceSnapshots: 2,
    profitVelocity: -13,
    revenueVelocity: 20,
    rotationChanges: 1,
    trackedAssets: 3
  }
} as RevenueAssetPortfolio;

const launchPlan = {
  blockedExternalActions: ["Publishing marketplace listings"],
  summary: "3 stores evaluated. 10 internal draft products are queued.",
  totals: {
    approvalReadyStores: 1,
    draftProductsNeeded: 10,
    estimatedDraftProfit: 320,
    launchPackageReadyStores: 1
  }
} as RevenueLaunchPipelinePlan;

const digitalPlan = {
  blockedExternalActions: ["Uploading digital product files"],
  summary: "6 digital product drafts queued.",
  totals: {
    estimatedDraftProfit: 210,
    queuedDrafts: 6,
    storesQueued: 2
  }
} as DigitalProductPortfolioPlan;

const listingPlan = {
  blockedExternalActions: ["Updating marketplace listing copy"],
  summary: "4 listing experiments queued.",
  totals: {
    experimentsQueued: 4,
    priceExperiments: 1,
    variantsGenerated: 12
  }
} as RevenueListingOptimizationPlan;

const storeSetupPlan = {
  blockedExternalActions: ["Changing Shopify or Etsy store settings"],
  summary: "2 store setup runbooks queued.",
  totals: {
    credentialScopes: 3,
    readyForConnector: 1,
    runbooksQueued: 2
  }
} as RevenueStoreSetupPlan;

const contentPlan = {
  blockedExternalActions: ["Uploading social videos"],
  performanceDigest: {
    totals: {
      views: 4200
    }
  },
  summary: "5 faceless content briefs queued.",
  totals: {
    newBriefs: 5
  }
} as FacelessContentPipelinePlan;

const financialPlan = {
  blockedExternalActions: ["Moving money or creating payouts"],
  ledgerEntries: [
    { recordState: "new" },
    { recordState: "already_recorded" }
  ],
  payoutIntents: [
    { id: "intent_1" }
  ],
  summary: "1 ledger entry and 1 payout intent ready."
} as FinancialOrchestratorPlan;

const releasePlan = {
  blockedExternalActions: ["Releasing budget without review"],
  budgetReleasePackets: [
    { id: "packet_1" }
  ],
  summary: "1 release packet ready.",
  totals: {
    highRiskIntents: 1
  }
} as FinancialReleaseGovernancePlan;

const commandPlan = {
  blockedExternalActions: ["Applying live portfolio commands"],
  summary: "3 command actions prioritized.",
  totals: {
    commandActions: 3,
    highRiskCommands: 1
  }
} as PortfolioCommandCenterPlan;

const signalPlan = {
  blockedExternalActions: ["Contacting payment providers for writes"],
  readiness: {
    storesAvailable: 3
  },
  samplePayloads: {
    commerceSignals: []
  },
  totals: {
    commerceSignals: 0,
    contentSignals: 0,
    paymentSignals: 0
  }
} as SignalIntakePlan;

const firstCashSprintPlan = {
  blockedExternalActions: ["Publishing first-cash launch assets"],
  options: {
    includeBlocked: true,
    maxCandidates: 8,
    maxSprintActions: 5,
    targetDaysToFirstCash: 7
  },
  readiness: {
    topFirstSaleEtaDays: 4
  },
  steps: [
    {
      bridgeActionId: "bridge_1",
      status: "ready_internal"
    },
    {
      bridgeActionId: null,
      status: "manual_gate"
    }
  ],
  summary: "2 first-cash sprint moves prioritized: 1 ready internal, 1 manual-gated, 0 blocked. Top path: Launch Store.",
  totals: {
    blocked: 0,
    manualGates: 1,
    readyInternal: 1,
    steps: 2
  }
} as RevenueFirstCashSprintPlan;

const firstBusinessLaunchPlan = {
  blockedExternalActions: ["Publishing first-business launch assets"],
  candidates: [
    {
      finalRank: 94,
      sprintActionId: "first_cash:store_1:optimize_listings",
      status: "ready_internal",
      storeId: "store_1",
      storeName: "Launch Store"
    }
  ],
  summary: "Launch Store is the top first-business launch path: ready internal, rank 94/100, next Optimize listings.",
  topCandidate: {
    finalRank: 94,
    sprintActionId: "first_cash:store_1:optimize_listings",
    status: "ready_internal",
    storeId: "store_1",
    storeName: "Launch Store"
  },
  totals: {
    blocked: 0,
    candidates: 1,
    manualGates: 0,
    readyInternal: 1,
    watch: 0
  }
} as RevenueFirstBusinessLaunchPlan;

describe("Revenue Autopilot", () => {
  it("builds a locked cross-module command plan", () => {
    const plan = buildRevenueAutopilotPlan({
      commandPlan,
      contentPlan,
      digitalPlan,
      financialPlan,
      firstBusinessLaunchPlan,
      firstCashSprintPlan,
      generatedAt: "2026-06-02T12:00:00.000Z",
      launchPlan,
      listingPlan,
      options: {
        maxActions: 14,
        mode: "velocity"
      },
      releasePlan,
      assetPortfolio,
      revenuePlan,
      signalPlan,
      storeSetupPlan
    });

    expect(plan.mode).toBe("Internal Revenue Autopilot");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.actions.map((item) => item.action)).toContain("seed_launch_products");
    expect(plan.actions.map((item) => item.action)).toContain("run_first_business_launch");
    expect(plan.actions.map((item) => item.action)).toContain("run_first_cash_sprint");
    expect(plan.actions.map((item) => item.action)).toContain("record_finance_split");
    expect(plan.actions.every((item) => item.externalExecution === false)).toBe(true);
    expect(plan.actions.every((item) => item.providerContacted === false)).toBe(true);
    expect(plan.totals.readyActions).toBeGreaterThan(0);
    expect(plan.totals.estimatedDraftProfit).toBe(530);
    expect(plan.totals.performanceSnapshots).toBe(2);
    expect(plan.totals.profitVelocity).toBe(-13);
    expect(plan.totals.firstBusinessLaunchCandidates).toBe(1);
    expect(plan.totals.firstBusinessLaunchReady).toBe(1);
    expect(plan.totals.firstBusinessLaunchManualGates).toBe(0);
    expect(plan.totals.firstCashSprintReady).toBe(1);
    expect(plan.totals.firstCashSprintManualGates).toBe(1);
    expect(plan.totals.rotationChanges).toBe(1);
    expect(plan.totals.trackedAssets).toBe(3);
    expect(plan.automationProfile).toMatchObject({
      externalExecution: false,
      providerContacted: false,
      targetAutomationPercent: 90
    });
    expect(plan.automationProfile.automatedWorkPercent).toBeGreaterThanOrEqual(85);
    expect(plan.automationProfile.ownerApprovalWorkItems).toBeGreaterThan(0);
    expect(plan.chainOfCommand.map((lane) => lane.commander)).toContain("First Launch Commander");
    expect(plan.chainOfCommand.map((lane) => lane.commander)).toContain("Financial Orchestrator Commander");
    expect(plan.ownerApprovalQueue.length).toBeGreaterThan(0);
    expect(plan.ownerApprovalQueue.every((item) => item.externalExecution === false && item.providerContacted === false)).toBe(true);
    expect(plan.ownerApprovalQueue.map((item) => item.approvalType)).toContain("finance_release");
    expect(plan.summary).toContain("daily profit velocity");
    expect(plan.summary).toContain("ENTRAL can handle");
    expect(plan.actions.find((item) => item.action === "run_first_business_launch")).toMatchObject({
      phase: "first_business_launch",
      recommendedStatus: "first_business_launch_ready",
      status: "ready",
      targetName: "Launch Store First Business Launch"
    });
    expect(plan.actions.find((item) => item.action === "run_first_cash_sprint")).toMatchObject({
      recommendedStatus: "covered_by_first_business_launch",
      status: "watch"
    });
    expect(plan.actions.find((item) => item.action === "record_portfolio_commands")?.sourceModule).toBe("revenue_asset_portfolio + portfolio_command_center");
    expect(plan.blockedExternalActions).toContain("Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation");
  });

  it("honors action caps and falls back to watch mode when nothing is ready", () => {
    const capped = buildRevenueAutopilotPlan({
      commandPlan,
      contentPlan,
      digitalPlan,
      financialPlan,
      firstBusinessLaunchPlan,
      firstCashSprintPlan,
      launchPlan,
      listingPlan,
      options: {
        maxActions: 2,
        mode: "balanced"
      },
      releasePlan,
      revenuePlan,
      signalPlan,
      storeSetupPlan
    });

    expect(capped.actions).toHaveLength(2);

    const watch = buildRevenueAutopilotPlan({
      digitalPlan: {
        ...digitalPlan,
        totals: {
          ...digitalPlan.totals,
          queuedDrafts: 0,
          storesQueued: 0
        }
      },
      launchPlan: {
        ...launchPlan,
        totals: {
          ...launchPlan.totals,
          approvalReadyStores: 0,
          draftProductsNeeded: 0,
          launchPackageReadyStores: 0
        }
      },
      listingPlan: {
        ...listingPlan,
        totals: {
          ...listingPlan.totals,
          experimentsQueued: 0,
          priceExperiments: 0,
          variantsGenerated: 0
        }
      },
      options: {
        includeContent: false,
        includeFinance: false,
        includeSignalIntake: false
      },
      revenuePlan,
      storeSetupPlan: {
        ...storeSetupPlan,
        totals: {
          ...storeSetupPlan.totals,
          credentialScopes: 0,
          readyForConnector: 0,
          runbooksQueued: 0
        }
      }
    });

    expect(watch.actions).toHaveLength(1);
    expect(watch.actions[0].action).toBe("watch");
    expect(watch.totals.watchActions).toBe(1);
  });

  it("selects safe executor steps and requires opt-ins for duplicate-prone internal artifacts", () => {
    const plan = buildRevenueAutopilotPlan({
      commandPlan,
      contentPlan,
      digitalPlan,
      financialPlan,
      firstBusinessLaunchPlan,
      firstCashSprintPlan,
      launchPlan,
      listingPlan,
      options: {
        maxActions: 14,
        mode: "velocity"
      },
      releasePlan,
      revenuePlan,
      signalPlan,
      storeSetupPlan
    });
    const safeSelection = selectRevenueAutopilotExecutionSteps(plan, { maxSteps: 2 });
    const seedStep = safeSelection.steps.find((step) => step.action === "seed_launch_products");

    expect(seedStep?.status).toBe("skipped");
    expect(seedStep?.requiredOptIn).toBe("draft_creation");
    expect(seedStep?.selectionSource).toBe("not_selected");
    expect(seedStep?.selectionReason).toContain("Draft creation opt-in is off");
    expect(safeSelection.totals.ready).toBe(2);
    expect(safeSelection.steps.find((step) => step.action === "run_first_business_launch")?.status).toBe("ready");
    expect(safeSelection.steps.find((step) => step.action === "run_first_business_launch")?.selectionSource).toBe("default_executor");
    expect(safeSelection.steps.find((step) => step.action === "run_first_cash_sprint")?.status).toBe("skipped");
    expect(safeSelection.steps.find((step) => step.action === "run_first_cash_sprint")?.reason).toContain("first-business launch path is ready");
    expect(safeSelection.steps.filter((step) => step.status === "ready").map((step) => step.action)).not.toContain("seed_launch_products");
    expect(safeSelection.steps.filter((step) => step.status === "ready").map((step) => step.action)).not.toContain("queue_launch_approval");

    const draftSelection = selectRevenueAutopilotExecutionSteps(plan, {
      actions: ["seed_launch_products"],
      includeDraftCreation: true,
      maxSteps: 1
    });

    expect(draftSelection.steps.find((step) => step.action === "seed_launch_products")?.status).toBe("ready");
    expect(draftSelection.steps.find((step) => step.action === "seed_launch_products")?.selectionSource).toBe("explicit_action");
    expect(draftSelection.totals.ready).toBe(1);

    const launchPacketSelection = selectRevenueAutopilotExecutionSteps(plan, {
      actions: ["queue_launch_approval"],
      maxSteps: 1
    });
    const skippedLaunchPacket = launchPacketSelection.steps.find((step) => step.action === "queue_launch_approval");

    expect(skippedLaunchPacket?.status).toBe("skipped");
    expect(skippedLaunchPacket?.requiredOptIn).toBe("launch_approval_packets");
    expect(skippedLaunchPacket?.reason).toContain("includeLaunchApprovalPackets=true");
    expect(skippedLaunchPacket?.selectionSource).toBe("explicit_action");
    expect(skippedLaunchPacket?.selectionReason).toContain("Explicit action list requested");

    const approvedLaunchPacketSelection = selectRevenueAutopilotExecutionSteps(plan, {
      actions: ["queue_launch_approval"],
      includeLaunchApprovalPackets: true,
      maxSteps: 1
    });
    const readyLaunchPacket = approvedLaunchPacketSelection.steps.find((step) => step.action === "queue_launch_approval");

    expect(readyLaunchPacket?.status).toBe("ready");
    expect(readyLaunchPacket?.externalExecution).toBe(false);
    expect(readyLaunchPacket?.providerContacted).toBe(false);
    expect(readyLaunchPacket?.selectionSource).toBe("explicit_action");
    expect(approvedLaunchPacketSelection.totals.ready).toBe(1);

    const defaultOptInSelection = selectRevenueAutopilotExecutionSteps(plan, {
      includeDraftCreation: true,
      includeLaunchApprovalPackets: true,
      maxSteps: 10
    });

    expect(defaultOptInSelection.steps.find((step) => step.action === "seed_launch_products")?.status).toBe("ready");
    expect(defaultOptInSelection.steps.find((step) => step.action === "seed_launch_products")?.selectionSource).toBe("draft_creation_opt_in");
    expect(defaultOptInSelection.steps.find((step) => step.action === "queue_launch_approval")?.status).toBe("ready");
    expect(defaultOptInSelection.steps.find((step) => step.action === "queue_launch_approval")?.selectionSource).toBe("launch_approval_opt_in");
    expect(defaultOptInSelection.steps.find((step) => step.action === "apply_listing_optimization")?.selectionSource).toBe("default_executor");
  });
});
