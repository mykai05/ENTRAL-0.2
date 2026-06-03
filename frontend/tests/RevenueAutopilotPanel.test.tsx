import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueAutopilotPanel } from "../components/RevenueAutopilotPanel";
import { apiFetch } from "../lib/api";
import type { RevenueAutopilotExecuteResponse, RevenueAutopilotExecutionStep, RevenueAutopilotPlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const plan: RevenueAutopilotPlan = {
  actions: [
    {
      action: "run_first_business_launch",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Internal command only.",
        status: "Required"
      },
      blockedExternalActions: ["Publishing first-business launch assets"],
      commandHash: "autopilot:first_business_launch:portfolio:store_1:run_first_business_launch",
      expectedInternalEffect: "Dispatch the highest-ranked first-business launch path through existing First Cash Sprint bridge controls.",
      externalExecution: false,
      phase: "first_business_launch",
      priority: -2,
      providerContacted: false,
      reason: "Launch Store is the top first-business launch path.",
      recommendedStatus: "first_business_launch_ready",
      riskLevel: "medium",
      sourceModule: "revenue_first_business_launch + revenue_first_cash_sprint + revenue_launch_checklist_action_bridge",
      status: "ready",
      summary: "Launch Store is the ranked first-business launch target at 94/100 with ready internal status.",
      targetId: "store_1",
      targetName: "Launch Store First Business Launch",
      targetType: "portfolio",
      title: "Run first-business launch path"
    },
    {
      action: "run_first_cash_sprint",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Internal command only.",
        status: "Required"
      },
      blockedExternalActions: ["Publishing first-cash launch assets"],
      commandHash: "autopilot:first_cash_sprint:portfolio:revenue_first_cash_sprint:run_first_cash_sprint",
      expectedInternalEffect: "Dispatch ready first-cash sprint moves through the Launch Checklist Action Bridge.",
      externalExecution: false,
      phase: "first_cash_sprint",
      priority: 0,
      providerContacted: false,
      reason: "1 ready first-cash move is available.",
      recommendedStatus: "first_cash_sprint_ready",
      riskLevel: "medium",
      sourceModule: "revenue_first_cash_sprint + revenue_launch_checklist_action_bridge",
      status: "watch",
      summary: "First-cash sprint is covered by the first-business launch path for this executor run.",
      targetId: "revenue_first_cash_sprint",
      targetName: "Revenue First Cash Sprint",
      targetType: "portfolio",
      title: "Run first-cash sprint"
    },
    {
      action: "seed_launch_products",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Internal command only.",
        status: "Required"
      },
      blockedExternalActions: [
        "Publishing marketplace listings",
        "Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation"
      ],
      commandHash: "autopilot:product_factory:portfolio:revenue_launch_pipeline:seed_launch_products",
      expectedInternalEffect: "Record an internal launch command.",
      externalExecution: false,
      phase: "product_factory",
      priority: 1,
      providerContacted: false,
      reason: "10 internal product drafts are queued.",
      recommendedStatus: "internal_drafts_needed",
      riskLevel: "low",
      sourceModule: "revenue_launch_pipeline",
      status: "ready",
      summary: "10 internal POD product drafts are needed for launch coverage.",
      targetId: "revenue_launch_pipeline",
      targetName: "Revenue Launch Pipeline",
      targetType: "portfolio",
      title: "Seed launch product drafts"
    },
    {
      action: "queue_launch_approval",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Internal command only.",
        status: "Required"
      },
      blockedExternalActions: ["Publishing marketplace listings"],
      commandHash: "autopilot:product_factory:store:launch_approval_queue:queue_launch_approval",
      expectedInternalEffect: "Record a command to prepare internal launch approval packets.",
      externalExecution: false,
      phase: "product_factory",
      priority: 2,
      providerContacted: false,
      reason: "1 store has enough approved products for a locked launch approval packet.",
      recommendedStatus: "launch_approval_review",
      riskLevel: "medium",
      sourceModule: "revenue_launch_pipeline",
      status: "ready",
      summary: "Queue launch approval packets for stores with approved product coverage.",
      targetId: "launch_approval_queue",
      targetName: "Launch Approval Queue",
      targetType: "store",
      title: "Queue launch approval packets"
    },
    {
      action: "apply_listing_optimization",
      approvalGate: {
        externalExecutionLocked: true,
        humanApprovalRequired: true,
        reason: "Internal command only.",
        status: "Required"
      },
      blockedExternalActions: ["Updating marketplace listing copy"],
      commandHash: "autopilot:listing_factory:product:listing_optimization_queue:apply_listing_optimization",
      expectedInternalEffect: "Apply internal listing optimization drafts.",
      externalExecution: false,
      phase: "listing_factory",
      priority: 3,
      providerContacted: false,
      reason: "4 listing experiments are queued.",
      recommendedStatus: "listing_draft_review",
      riskLevel: "low",
      sourceModule: "revenue_listing_optimization",
      status: "ready",
      summary: "4 listing experiments are ready for internal drafting.",
      targetId: "listing_optimization_queue",
      targetName: "Listing Optimization Queue",
      targetType: "product",
      title: "Apply listing optimization drafts"
    }
  ],
  auditEvents: ["Revenue Autopilot generated a cross-module internal command plan."],
  automationProfile: {
    automatedWorkPercent: 90,
    externalExecution: false,
    internalAutopilotWorkItems: 45,
    ownerApprovalPercent: 10,
    ownerApprovalWorkItems: 5,
    providerContacted: false,
    summary: "ENTRAL can handle 90% of the current revenue workload internally; owner attention is reserved for 5 approval gates.",
    targetAutomationPercent: 90
  },
  blockedExternalActions: [
    "Publishing marketplace listings",
    "Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation"
  ],
  chainOfCommand: [{
    actionCount: 1,
    actions: ["Run first-business launch path"],
    blockedActions: 0,
    commander: "First Launch Commander",
    externalExecution: false,
    general: "First Business General",
    marshal: "Money Army Marshal",
    phase: "first_business_launch",
    providerContacted: false,
    readyActions: 1,
    soldier: "Launch Packet Soldier",
    status: "ready",
    summary: "First Launch Commander owns 1 internal autopilot command with 1 ready."
  }, {
    actionCount: 2,
    actions: ["Seed launch product drafts", "Queue launch approval packets"],
    blockedActions: 0,
    commander: "Product Factory Commander",
    externalExecution: false,
    general: "First Business General",
    marshal: "Money Army Marshal",
    phase: "product_factory",
    providerContacted: false,
    readyActions: 2,
    soldier: "Product Draft Soldier",
    status: "ready",
    summary: "Product Factory Commander owns 2 internal autopilot commands with 2 ready."
  }],
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  mode: "Internal Revenue Autopilot",
  options: {
    includeContent: true,
    includeFinance: true,
    includeSignalIntake: true,
    maxActions: 12,
    mode: "balanced",
    windowDays: 30
  },
  ownerApprovalQueue: [{
    actionIds: ["autopilot:first_business_launch:portfolio:store_1:run_first_business_launch"],
    approvalType: "browser_or_marketplace",
    externalExecution: false,
    id: "owner_approval:first_business_launch:browser_or_marketplace:waiting_owner",
    phase: "first_business_launch",
    providerContacted: false,
    rank: "Owner",
    reason: "1 autopilot command needs browser or marketplace review before any external work.",
    riskLevel: "medium",
    status: "waiting_owner",
    title: "First business launch: browser or marketplace approval"
  }, {
    actionIds: ["autopilot:product_factory:portfolio:revenue_launch_pipeline:seed_launch_products", "autopilot:product_factory:store:launch_approval_queue:queue_launch_approval"],
    approvalType: "browser_or_marketplace",
    externalExecution: false,
    id: "owner_approval:product_factory:browser_or_marketplace:waiting_owner",
    phase: "product_factory",
    providerContacted: false,
    rank: "Owner",
    reason: "2 autopilot commands need browser or marketplace review before any external work.",
    riskLevel: "medium",
    status: "waiting_owner",
    title: "POD launch factory: browser or marketplace approval"
  }],
  phases: [
    {
      actionCount: 1,
      metrics: [
        { label: "ready paths", value: 1 },
        { label: "manual gates", value: 0 }
      ],
      name: "first_business_launch",
      priority: 8,
      status: "ready",
      summary: "1 ready internal command in this phase.",
      title: "First business launch"
    },
    {
      actionCount: 1,
      metrics: [
        { label: "ready moves", value: 1 },
        { label: "manual gates", value: 1 }
      ],
      name: "first_cash_sprint",
      priority: 12,
      status: "ready",
      summary: "1 ready internal command in this phase.",
      title: "First cash sprint"
    },
    {
      actionCount: 1,
      metrics: [
        { label: "drafts needed", value: 10 }
      ],
      name: "product_factory",
      priority: 20,
      status: "ready",
      summary: "1 ready internal command in this phase.",
      title: "POD launch factory"
    }
  ],
  providerContacted: false,
  summary: "5 internal autopilot commands prioritized in balanced mode.",
  totals: {
    actions: 5,
    blockedActions: 0,
    commerceSignalsReady: 0,
    contentBriefsQueued: 2,
    contentSignalsReady: 0,
    digitalDraftsQueued: 6,
    estimatedDraftProfit: 530,
    financeLedgerEntries: 1,
    financePayoutIntents: 1,
    firstBusinessLaunchCandidates: 1,
    firstBusinessLaunchManualGates: 0,
    firstBusinessLaunchReady: 1,
    firstCashSprintManualGates: 1,
    firstCashSprintReady: 1,
    listingExperimentsQueued: 4,
    paymentSignalsReady: 0,
    performanceSnapshots: 2,
    portfolioCommands: 3,
    products: 12,
    profitVelocity: -13,
    readyActions: 4,
    revenueVelocity: 20,
    releasePackets: 1,
    rotationChanges: 1,
    storeRunbooksQueued: 2,
    stores: 3,
    trackedAssets: 3,
    watchActions: 0
  }
};

const firstCashStep: RevenueAutopilotExecutionStep = {
  action: "run_first_cash_sprint",
  blockedExternalActions: ["Publishing first-cash launch assets"],
  commandHash: "autopilot:first_cash_sprint:portfolio:revenue_first_cash_sprint:run_first_cash_sprint",
  expectedInternalEffect: "Dispatch ready first-cash sprint moves through the Launch Checklist Action Bridge.",
  externalExecution: false,
  phase: "first_cash_sprint",
  providerContacted: false,
  reason: "1 ready first-cash move is available.",
  requiredOptIn: null,
  result: {
    firstCashSprintActions: 1,
    firstCashSprintActionsDispatched: 1
  },
  riskLevel: "medium",
  selectionReason: "Included in the default safe internal executor set.",
  selectionSource: "default_executor",
  sourceModule: "revenue_first_cash_sprint + revenue_launch_checklist_action_bridge",
  status: "ready",
  targetId: "revenue_first_cash_sprint",
  targetName: "Revenue First Cash Sprint",
  targetType: "portfolio",
  title: "Run first-cash sprint"
};

const firstBusinessStep: RevenueAutopilotExecutionStep = {
  action: "run_first_business_launch",
  blockedExternalActions: ["Publishing first-business launch assets"],
  commandHash: "autopilot:first_business_launch:portfolio:store_1:run_first_business_launch",
  expectedInternalEffect: "Dispatch the highest-ranked first-business launch path through existing First Cash Sprint bridge controls.",
  externalExecution: false,
  phase: "first_business_launch",
  providerContacted: false,
  reason: "Launch Store is the top first-business launch path.",
  requiredOptIn: null,
  result: {
    firstBusinessLaunchActions: 1,
    firstBusinessLaunchActionsDispatched: 1
  },
  riskLevel: "medium",
  selectionReason: "Included in the default safe internal executor set.",
  selectionSource: "default_executor",
  sourceModule: "revenue_first_business_launch + revenue_first_cash_sprint + revenue_launch_checklist_action_bridge",
  status: "ready",
  targetId: "store_1",
  targetName: "Launch Store First Business Launch",
  targetType: "portfolio",
  title: "Run first-business launch path"
};

const skippedSeedStep: RevenueAutopilotExecutionStep = {
  action: "seed_launch_products",
  blockedExternalActions: [
    "Publishing marketplace listings",
    "Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation"
  ],
  commandHash: "autopilot:product_factory:portfolio:revenue_launch_pipeline:seed_launch_products",
  executionStatus: "skipped",
  expectedInternalEffect: "Record an internal launch command.",
  externalExecution: false,
  phase: "product_factory",
  providerContacted: false,
  reason: "Draft creation is duplicate-prone and requires includeDraftCreation=true.",
  requiredOptIn: "draft_creation",
  result: {},
  riskLevel: "low",
  selectionReason: "Draft creation opt-in is off for this executor run.",
  selectionSource: "not_selected",
  sourceModule: "revenue_launch_pipeline",
  status: "skipped",
  targetId: "revenue_launch_pipeline",
  targetName: "Revenue Launch Pipeline",
  targetType: "portfolio",
  title: "Seed launch product drafts"
};

const skippedLaunchPacketStep: RevenueAutopilotExecutionStep = {
  action: "queue_launch_approval",
  blockedExternalActions: ["Publishing marketplace listings"],
  commandHash: "autopilot:product_factory:store:launch_approval_queue:queue_launch_approval",
  executionStatus: "skipped",
  expectedInternalEffect: "Record a command to prepare internal launch approval packets.",
  externalExecution: false,
  phase: "product_factory",
  providerContacted: false,
  reason: "Launch approval packet creation is duplicate-prone and requires includeLaunchApprovalPackets=true.",
  requiredOptIn: "launch_approval_packets",
  result: {},
  riskLevel: "medium",
  selectionReason: "Launch approval packet opt-in is off for this executor run.",
  selectionSource: "not_selected",
  sourceModule: "revenue_launch_pipeline",
  status: "skipped",
  targetId: "launch_approval_queue",
  targetName: "Launch Approval Queue",
  targetType: "store",
  title: "Queue launch approval packets"
};

const listingStep: RevenueAutopilotExecutionStep = {
  action: "apply_listing_optimization",
  blockedExternalActions: ["Updating marketplace listing copy"],
  commandHash: "autopilot:listing_factory:product:listing_optimization_queue:apply_listing_optimization",
  expectedInternalEffect: "Apply internal listing optimization drafts.",
  externalExecution: false,
  phase: "listing_factory",
  providerContacted: false,
  reason: "4 listing experiments are queued.",
  requiredOptIn: null,
  result: {
    productUpdates: 4
  },
  riskLevel: "low",
  selectionReason: "Included in the default safe internal executor set.",
  selectionSource: "default_executor",
  sourceModule: "revenue_listing_optimization",
  status: "ready",
  targetId: "listing_optimization_queue",
  targetName: "Listing Optimization Queue",
  targetType: "product",
  title: "Apply listing optimization drafts"
};

const autopilotAssetControlBatchReview = {
  alignment: {
    dashboardOverrides: 0,
    matchedRecommendations: 2
  },
  executionScope: {
    auditOnly: 1,
    internalStatusChanges: 1
  },
  requiresOperatorReview: true,
  riskTier: "high" as const,
  riskTiers: {
    high: 1,
    low: 1,
    medium: 0
  },
  skipped: 0,
  statusImpact: {
    none: 1,
    productStatusChanges: 1,
    storeStatusChanges: 0
  },
  summary: "2 batch asset actions reviewed: 2 match scoring, 0 dashboard overrides, 1 internal status change, 1 audit-only intent, high review risk. 0 skipped."
};

type ExecutionResponseOptions = {
  includeDraftCreation?: boolean;
  includeLaunchApprovalPackets?: boolean;
};

function executionResponse(dryRun: boolean, options: ExecutionResponseOptions = {}): RevenueAutopilotExecuteResponse {
  const seedStep: RevenueAutopilotExecutionStep = options.includeDraftCreation
    ? {
      ...skippedSeedStep,
      executionStatus: dryRun ? "preview" : "executed",
      reason: "10 internal product drafts are queued.",
      requiredOptIn: "draft_creation",
      result: {
        createdProducts: 10
      },
      selectionReason: "Draft creation opt-in enabled this duplicate-prone internal artifact step.",
      selectionSource: "draft_creation_opt_in",
      status: "ready"
    }
    : skippedSeedStep;
  const launchPacketStep: RevenueAutopilotExecutionStep = options.includeLaunchApprovalPackets
    ? {
      ...skippedLaunchPacketStep,
      executionStatus: dryRun ? "preview" : "executed",
      reason: "1 store has enough approved products for a locked launch approval packet.",
      result: {
        approvalPackets: 1
      },
      selectionReason: "Launch approval packet opt-in enabled this duplicate-prone internal artifact step.",
      selectionSource: "launch_approval_opt_in",
      status: "ready"
    }
    : skippedLaunchPacketStep;
  const activeStep: RevenueAutopilotExecutionStep = {
    ...listingStep,
    executionStatus: dryRun ? "preview" : "executed"
  };
  const activeFirstCashStep: RevenueAutopilotExecutionStep = {
    ...firstCashStep,
    executionStatus: "skipped",
    reason: "A first-business launch path is ready and will handle the top sprint bridge action; this broader sprint remains available as fallback context.",
    status: "skipped"
  };
  const activeFirstBusinessStep: RevenueAutopilotExecutionStep = {
    ...firstBusinessStep,
    executionStatus: dryRun ? "preview" : "executed"
  };
  const readySteps = 2 + (options.includeDraftCreation ? 1 : 0) + (options.includeLaunchApprovalPackets ? 1 : 0);
  const skippedSteps = 1 + (options.includeDraftCreation ? 0 : 1) + (options.includeLaunchApprovalPackets ? 0 : 1);

  return {
    executed: {
      auditLogId: dryRun ? null : "audit_2",
      assetBatchActions: dryRun ? 2 : 1,
      assetBatchSkipped: dryRun ? 0 : 1,
      assetControlBatchReviews: [autopilotAssetControlBatchReview],
      assetControlActionsSkipped: 0,
      assetControlRecordsCreated: dryRun ? 2 : 1,
      briefsCreated: 0,
      budgetReleasePacketsUpserted: 0,
      commandRecordsCreated: 0,
      contentCommands: 0,
      dryRun,
      externalExecution: false,
      financeCommands: 0,
      firstBusinessLaunchActions: 1,
      firstBusinessLaunchActionsBlocked: 0,
      firstBusinessLaunchActionsDispatched: dryRun ? 0 : 1,
      firstBusinessLaunchActionsPreviewed: dryRun ? 1 : 0,
      firstBusinessLaunchActionsSkipped: 0,
      firstBusinessLaunchManualGates: 0,
      firstBusinessLaunchReady: 1,
      firstCashSprintActions: 0,
      firstCashSprintActionsBlocked: 0,
      firstCashSprintActionsDispatched: 0,
      firstCashSprintActionsPreviewed: 0,
      firstCashSprintActionsSkipped: 0,
      firstCashSprintBridgeActions: 1,
      firstCashSprintManualGates: 1,
      firstCashSprintReady: 1,
      ledgerEntriesCreated: 0,
      payoutIntentsCreated: 0,
      portfolioCommands: 0,
      providerContacted: false,
      scalingBudgetPackets: 0,
      signalCommands: 0,
      stepsBlocked: 0,
      stepsExecuted: dryRun ? 0 : readySteps,
      stepsPreviewed: dryRun ? readySteps : 0,
      stepsReady: readySteps,
      stepsSkipped: skippedSteps
    },
    plan,
    selection: {
      blockedExternalActions: plan.blockedExternalActions,
      externalExecution: false,
      providerContacted: false,
      steps: [firstBusinessStep, activeFirstCashStep, seedStep, launchPacketStep, listingStep],
      totals: {
        blocked: 0,
        ready: readySteps,
        skipped: skippedSteps,
        steps: 5
      }
    },
    steps: [activeFirstBusinessStep, activeFirstCashStep, seedStep, launchPacketStep, activeStep]
  };
}

describe("RevenueAutopilotPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads, previews, records, and executes safe autopilot steps", async () => {
    const onApplied = vi.fn().mockResolvedValue(undefined);

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: null,
          commandRecordsCreated: 1,
          contentCommands: 0,
          dryRun: true,
          externalExecution: false,
          financeCommands: 0,
          portfolioCommands: 1,
          providerContacted: false,
          readyActions: 1,
          signalCommands: 0
        },
        plan
      })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: "audit_1",
          commandRecordsCreated: 1,
          contentCommands: 0,
          dryRun: false,
          externalExecution: false,
          financeCommands: 0,
          portfolioCommands: 1,
          providerContacted: false,
          readyActions: 1,
          signalCommands: 0
        },
        plan
      })
      .mockResolvedValueOnce(executionResponse(true, {
        includeDraftCreation: true,
        includeLaunchApprovalPackets: true
      }))
      .mockResolvedValueOnce(executionResponse(false, {
        includeDraftCreation: true,
        includeLaunchApprovalPackets: true
      }));

    render(<RevenueAutopilotPanel onApplied={onApplied} />);

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining("/merch/revenue-engine/autopilot?")));
    expect(await screen.findByText("Internal Revenue Autopilot")).toBeInTheDocument();
    expect(screen.getByText("ENTRAL Work")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("Chain Of Command")).toBeInTheDocument();
    expect(screen.getByText("Owner Approval Queue")).toBeInTheDocument();
    expect(screen.getByText("First Launch Commander")).toBeInTheDocument();
    expect(screen.getByText("Money Army Marshal / First Business General / Launch Packet Soldier")).toBeInTheDocument();
    expect(screen.getByText("First business launch: browser or marketplace approval")).toBeInTheDocument();
    expect(screen.getByText("Run first-business launch path")).toBeInTheDocument();
    expect(screen.getByText("Run first-cash sprint")).toBeInTheDocument();
    expect(screen.getByText("Seed launch product drafts")).toBeInTheDocument();
    expect(screen.getByText("Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview autopilot/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/autopilot/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RUN INTERNAL REVENUE AUTOPILOT",
        dryRun: true,
        mode: "balanced"
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Autopilot preview ready: 1 ready command.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record autopilot commands/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/autopilot/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RUN INTERNAL REVENUE AUTOPILOT",
        dryRun: false
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Autopilot recorded: 1 command record queued.")).toBeInTheDocument();

    const draftCreationToggle = screen.getByLabelText(/draft creation/i);
    const launchPacketsToggle = screen.getByLabelText(/launch packets/i);
    expect(draftCreationToggle).not.toBeChecked();
    expect(launchPacketsToggle).not.toBeChecked();
    await userEvent.click(draftCreationToggle);
    await userEvent.click(launchPacketsToggle);

    await userEvent.click(screen.getByRole("button", { name: /preview steps/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/autopilot/execute", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "EXECUTE INTERNAL REVENUE AUTOPILOT STEPS",
        dryRun: true,
        includeAssetBatchActions: true,
        includeDraftCreation: true,
        includeLaunchApprovalPackets: true,
        maxSteps: 6
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Autopilot step preview ready: 4 executable internal steps. 2 asset batch actions included. 2 control records would be logged. 1 first-business launch action would run.")).toBeInTheDocument();
    expect(screen.getByText("Autopilot Execution Receipt")).toBeInTheDocument();
    expect(screen.getByText("Previewed internal steps only. External execution: false / provider contacted: false")).toBeInTheDocument();
    expect(screen.getByText("Asset-Control Reviews")).toBeInTheDocument();
    expect(screen.getByText("high risk / 2 matched / 0 overrides")).toBeInTheDocument();
    expect(screen.getByText("2 batch asset actions reviewed: 2 match scoring, 0 dashboard overrides, 1 internal status change, 1 audit-only intent, high review risk. 0 skipped.")).toBeInTheDocument();
    expect(screen.getByText("preview / listing factory / low risk")).toBeInTheDocument();
    expect(screen.getByText("preview / first business launch / medium risk")).toBeInTheDocument();
    expect(screen.getByText("skipped / first cash sprint / medium risk")).toBeInTheDocument();
    expect(screen.getByText("preview / product factory / low risk")).toBeInTheDocument();
    expect(screen.getByText("preview / product factory / medium risk")).toBeInTheDocument();
    expect(screen.getByText("Selection: draft creation opt in. Draft creation opt-in enabled this duplicate-prone internal artifact step.")).toBeInTheDocument();
    expect(screen.getByText("Selection: launch approval opt in. Launch approval packet opt-in enabled this duplicate-prone internal artifact step.")).toBeInTheDocument();
    expect(screen.getAllByText("Selection: default executor. Included in the default safe internal executor set.").length).toBeGreaterThanOrEqual(2);

    await userEvent.click(screen.getByRole("button", { name: /execute internal steps/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/autopilot/execute", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "EXECUTE INTERNAL REVENUE AUTOPILOT STEPS",
        dryRun: false,
        includeAssetBatchActions: true,
        includeDraftCreation: true,
        includeLaunchApprovalPackets: true
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Autopilot executed: 4 internal steps. 1 asset batch action included. 1 asset batch action skipped. 1 control record logged. 1 first-business launch action dispatched. No providers contacted.")).toBeInTheDocument();
    expect(screen.getByText("Recorded internal step execution. External execution: false / provider contacted: false")).toBeInTheDocument();
    expect(screen.getByText("executed / listing factory / low risk")).toBeInTheDocument();
    expect(screen.getByText("executed / first business launch / medium risk")).toBeInTheDocument();
    expect(screen.getByText("skipped / first cash sprint / medium risk")).toBeInTheDocument();
    expect(screen.getByText("executed / product factory / low risk")).toBeInTheDocument();
    expect(screen.getByText("executed / product factory / medium risk")).toBeInTheDocument();
    expect(screen.getByText("audit_2")).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalledTimes(2);
  });
});
