import type { DigitalProductPortfolioPlan } from "./digitalProductPortfolio.js";
import type { FacelessContentPipelinePlan } from "./facelessContentPipeline.js";
import type { FinancialOrchestratorPlan } from "./financialOrchestrator.js";
import type { FinancialReleaseGovernancePlan } from "./financialReleaseGovernance.js";
import type { PortfolioCommandCenterPlan } from "./portfolioCommandCenter.js";
import type { RevenueAssetPortfolio, RevenueEnginePlan } from "./revenueEngine.js";
import type { RevenueFirstBusinessLaunchPlan } from "./revenueFirstBusinessLaunch.js";
import type { RevenueFirstCashSprintPlan } from "./revenueFirstCashSprint.js";
import type { RevenueLaunchPipelinePlan } from "./revenueLaunchPipeline.js";
import type { RevenueListingOptimizationPlan } from "./revenueListingOptimization.js";
import type { RevenueStoreSetupPlan } from "./revenueStoreSetup.js";
import type { SignalIntakePlan } from "./signalIntakeCenter.js";

export type RevenueAutopilotMode = "balanced" | "conservative" | "velocity";

export type RevenueAutopilotPhaseName =
  | "signal_intake"
  | "first_business_launch"
  | "first_cash_sprint"
  | "product_factory"
  | "digital_factory"
  | "listing_factory"
  | "store_setup"
  | "content_factory"
  | "finance_governance"
  | "portfolio_command";

export type RevenueAutopilotActionKind =
  | "stage_signal_intake"
  | "run_first_business_launch"
  | "run_first_cash_sprint"
  | "seed_launch_products"
  | "queue_launch_approval"
  | "prepare_launch_package"
  | "queue_digital_products"
  | "apply_listing_optimization"
  | "prepare_store_setup"
  | "queue_content_briefs"
  | "record_finance_split"
  | "record_release_governance"
  | "record_portfolio_commands"
  | "watch";

export const revenueAutopilotExecutableActionKinds = [
  "run_first_business_launch",
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
] as const;

export type RevenueAutopilotExecutableActionKind = (typeof revenueAutopilotExecutableActionKinds)[number];

export type RevenueAutopilotRiskLevel = "low" | "medium" | "high";
export type RevenueAutopilotTargetType = "content" | "finance" | "portfolio" | "product" | "signal" | "store";
export type RevenueAutopilotActionStatus = "ready" | "watch" | "blocked";
export type RevenueAutopilotExecutionStepStatus = "ready" | "skipped" | "blocked";
export type RevenueAutopilotSelectionSource =
  | "default_executor"
  | "draft_creation_opt_in"
  | "explicit_action"
  | "launch_approval_opt_in"
  | "not_selected";

export type RevenueAutopilotOptions = {
  includeContent: boolean;
  includeFinance: boolean;
  includeSignalIntake: boolean;
  maxActions: number;
  mode: RevenueAutopilotMode;
  windowDays: number;
};

export type RevenueAutopilotMetric = {
  label: string;
  value: number | string;
};

export type RevenueAutopilotPhase = {
  actionCount: number;
  metrics: RevenueAutopilotMetric[];
  name: RevenueAutopilotPhaseName;
  priority: number;
  status: RevenueAutopilotActionStatus;
  summary: string;
  title: string;
};

export type RevenueAutopilotAction = {
  action: RevenueAutopilotActionKind;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    reason: string;
    status: "Required";
  };
  blockedExternalActions: string[];
  commandHash: string;
  expectedInternalEffect: string;
  externalExecution: false;
  phase: RevenueAutopilotPhaseName;
  priority: number;
  providerContacted: false;
  reason: string;
  recommendedStatus: string | null;
  riskLevel: RevenueAutopilotRiskLevel;
  sourceModule: string;
  status: RevenueAutopilotActionStatus;
  summary: string;
  targetId: string;
  targetName: string;
  targetType: RevenueAutopilotTargetType;
  title: string;
};

export type RevenueAutopilotPlan = {
  actions: RevenueAutopilotAction[];
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Autopilot";
  options: RevenueAutopilotOptions;
  phases: RevenueAutopilotPhase[];
  providerContacted: false;
  summary: string;
  totals: {
    actions: number;
    blockedActions: number;
    commerceSignalsReady: number;
    contentBriefsQueued: number;
    contentSignalsReady: number;
    digitalDraftsQueued: number;
    estimatedDraftProfit: number;
    financeLedgerEntries: number;
    financePayoutIntents: number;
    firstBusinessLaunchCandidates: number;
    firstBusinessLaunchManualGates: number;
    firstBusinessLaunchReady: number;
    firstCashSprintManualGates: number;
    firstCashSprintReady: number;
    listingExperimentsQueued: number;
    paymentSignalsReady: number;
    performanceSnapshots: number;
    portfolioCommands: number;
    products: number;
    profitVelocity: number;
    readyActions: number;
    revenueVelocity: number;
    releasePackets: number;
    rotationChanges: number;
    storeRunbooksQueued: number;
    stores: number;
    trackedAssets: number;
    watchActions: number;
  };
};

export type RevenueAutopilotExecutionStep = {
  action: RevenueAutopilotActionKind;
  blockedExternalActions: string[];
  commandHash: string;
  externalExecution: false;
  expectedInternalEffect: string;
  phase: RevenueAutopilotPhaseName;
  providerContacted: false;
  reason: string;
  requiredOptIn: "draft_creation" | "launch_approval_packets" | null;
  riskLevel: RevenueAutopilotRiskLevel;
  selectionReason: string;
  selectionSource: RevenueAutopilotSelectionSource;
  sourceModule: string;
  status: RevenueAutopilotExecutionStepStatus;
  targetId: string;
  targetName: string;
  targetType: RevenueAutopilotTargetType;
  title: string;
};

export type RevenueAutopilotExecutionSelection = {
  blockedExternalActions: string[];
  externalExecution: false;
  providerContacted: false;
  steps: RevenueAutopilotExecutionStep[];
  totals: {
    blocked: number;
    ready: number;
    skipped: number;
    steps: number;
  };
};

export const defaultRevenueAutopilotOptions: RevenueAutopilotOptions = {
  includeContent: true,
  includeFinance: true,
  includeSignalIntake: true,
  maxActions: 12,
  mode: "balanced",
  windowDays: 30
};

const executableActionSet = new Set<RevenueAutopilotActionKind>(revenueAutopilotExecutableActionKinds);
const defaultExecutionActions = new Set<RevenueAutopilotActionKind>([
  "run_first_business_launch",
  "run_first_cash_sprint",
  "apply_listing_optimization",
  "prepare_store_setup",
  "queue_content_briefs",
  "record_finance_split",
  "record_release_governance",
  "record_portfolio_commands"
]);
const draftCreationActions = new Set<RevenueAutopilotActionKind>([
  "queue_digital_products",
  "seed_launch_products"
]);
const launchApprovalPacketActions = new Set<RevenueAutopilotActionKind>([
  "prepare_launch_package",
  "queue_launch_approval"
]);

const phaseDefinitions: Record<RevenueAutopilotPhaseName, {
  basePriority: number;
  title: string;
}> = {
  content_factory: {
    basePriority: 55,
    title: "Faceless content factory"
  },
  digital_factory: {
    basePriority: 25,
    title: "Digital product factory"
  },
  finance_governance: {
    basePriority: 65,
    title: "Financial governance"
  },
  first_business_launch: {
    basePriority: 8,
    title: "First business launch"
  },
  first_cash_sprint: {
    basePriority: 12,
    title: "First cash sprint"
  },
  listing_factory: {
    basePriority: 35,
    title: "Listing optimization"
  },
  portfolio_command: {
    basePriority: 75,
    title: "Portfolio command"
  },
  product_factory: {
    basePriority: 20,
    title: "POD launch factory"
  },
  signal_intake: {
    basePriority: 10,
    title: "Signal intake"
  },
  store_setup: {
    basePriority: 45,
    title: "Store setup"
  }
};

const modePriorityBoost: Record<RevenueAutopilotMode, Partial<Record<RevenueAutopilotPhaseName, number>>> = {
  balanced: {},
  conservative: {
    finance_governance: -25,
    portfolio_command: -15,
    signal_intake: -10,
    store_setup: 10
  },
  velocity: {
    content_factory: -10,
    digital_factory: -15,
    first_business_launch: -22,
    first_cash_sprint: -18,
    listing_factory: -10,
    product_factory: -20,
    signal_intake: 5
  }
};

const riskWeight: Record<RevenueAutopilotRiskLevel, number> = {
  high: 0,
  medium: 1,
  low: 2
};

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function isRevenueAutopilotExecutableAction(actionKind: RevenueAutopilotActionKind): actionKind is RevenueAutopilotExecutableActionKind {
  return executableActionSet.has(actionKind);
}

export function selectRevenueAutopilotExecutionSteps(plan: RevenueAutopilotPlan, options: {
  actions?: RevenueAutopilotExecutableActionKind[];
  includeDraftCreation?: boolean;
  includeLaunchApprovalPackets?: boolean;
  maxSteps?: number;
} = {}): RevenueAutopilotExecutionSelection {
  const hasExplicitActions = Boolean(options.actions && options.actions.length > 0);
  const defaultRequestedActions = Array.from(defaultExecutionActions);

  if (!hasExplicitActions) {
    if (options.includeDraftCreation) {
      defaultRequestedActions.push(...draftCreationActions);
    }

    if (options.includeLaunchApprovalPackets) {
      defaultRequestedActions.push(...launchApprovalPacketActions);
    }
  }

  const requested = new Set<RevenueAutopilotActionKind>(options.actions && options.actions.length > 0
    ? options.actions
    : defaultRequestedActions);
  const maxSteps = clamp(Math.round(options.maxSteps ?? 6), 1, 10);
  let selected = 0;

  const steps = plan.actions
    .filter((item) => isRevenueAutopilotExecutableAction(item.action))
    .map((item): RevenueAutopilotExecutionStep => {
      const requiredOptIn = draftCreationActions.has(item.action)
        ? "draft_creation"
        : launchApprovalPacketActions.has(item.action)
          ? "launch_approval_packets"
          : null;
      const requestedForRun = requested.has(item.action);
      const selectionSource: RevenueAutopilotSelectionSource = hasExplicitActions
        ? requestedForRun ? "explicit_action" : "not_selected"
        : requiredOptIn === "draft_creation"
          ? options.includeDraftCreation ? "draft_creation_opt_in" : "not_selected"
          : requiredOptIn === "launch_approval_packets"
            ? options.includeLaunchApprovalPackets ? "launch_approval_opt_in" : "not_selected"
            : defaultExecutionActions.has(item.action) ? "default_executor" : "not_selected";
      const selectionReason = selectionSource === "explicit_action"
        ? "Explicit action list requested this step; required opt-ins are still enforced before execution."
        : selectionSource === "draft_creation_opt_in"
          ? "Draft creation opt-in enabled this duplicate-prone internal artifact step."
          : selectionSource === "launch_approval_opt_in"
            ? "Launch approval packet opt-in enabled this duplicate-prone internal artifact step."
            : selectionSource === "default_executor"
              ? "Included in the default safe internal executor set."
              : requiredOptIn === "draft_creation"
                ? "Draft creation opt-in is off for this executor run."
                : requiredOptIn === "launch_approval_packets"
                  ? "Launch approval packet opt-in is off for this executor run."
                  : "Action is outside this executor run.";
      let status: RevenueAutopilotExecutionStepStatus = item.status === "blocked" ? "blocked" : item.status === "ready" ? "ready" : "skipped";
      let reason = item.reason;

      if (status === "ready" && hasExplicitActions && !requestedForRun) {
        status = "skipped";
        reason = "Action is not selected for this executor run.";
      }

      if (status === "ready" && requiredOptIn === "draft_creation" && !options.includeDraftCreation) {
        status = "skipped";
        reason = "Draft creation is duplicate-prone and requires includeDraftCreation=true.";
      }

      if (status === "ready" && requiredOptIn === "launch_approval_packets" && !options.includeLaunchApprovalPackets) {
        status = "skipped";
        reason = "Launch approval packet creation is duplicate-prone and requires includeLaunchApprovalPackets=true.";
      }

      if (status === "ready" && !requestedForRun) {
        status = "skipped";
        reason = "Action is not selected for this executor run.";
      }

      if (status === "ready" && selected >= maxSteps) {
        status = "skipped";
        reason = `Executor limit reached at ${maxSteps} internal step${maxSteps === 1 ? "" : "s"}.`;
      }

      if (status === "ready") {
        selected += 1;
      }

      return {
        action: item.action,
        blockedExternalActions: item.blockedExternalActions,
        commandHash: item.commandHash,
        expectedInternalEffect: item.expectedInternalEffect,
        externalExecution: false,
        phase: item.phase,
        providerContacted: false,
        reason,
        requiredOptIn,
        riskLevel: item.riskLevel,
        selectionReason,
        selectionSource,
        sourceModule: item.sourceModule,
        status,
        targetId: item.targetId,
        targetName: item.targetName,
        targetType: item.targetType,
        title: item.title
      };
    });

  return {
    blockedExternalActions: plan.blockedExternalActions,
    externalExecution: false,
    providerContacted: false,
    steps,
    totals: {
      blocked: steps.filter((step) => step.status === "blocked").length,
      ready: steps.filter((step) => step.status === "ready").length,
      skipped: steps.filter((step) => step.status === "skipped").length,
      steps: steps.length
    }
  };
}

function commandHash(input: {
  action: RevenueAutopilotActionKind;
  phase: RevenueAutopilotPhaseName;
  targetId: string;
  targetType: RevenueAutopilotTargetType;
}) {
  return [
    "autopilot",
    input.phase,
    input.targetType,
    input.targetId,
    input.action
  ].join(":").toLowerCase().replace(/[^a-z0-9:_-]+/g, "_");
}

function withOptions(options: Partial<RevenueAutopilotOptions> = {}): RevenueAutopilotOptions {
  return {
    includeContent: options.includeContent ?? defaultRevenueAutopilotOptions.includeContent,
    includeFinance: options.includeFinance ?? defaultRevenueAutopilotOptions.includeFinance,
    includeSignalIntake: options.includeSignalIntake ?? defaultRevenueAutopilotOptions.includeSignalIntake,
    maxActions: clamp(Math.round(options.maxActions ?? defaultRevenueAutopilotOptions.maxActions), 1, 50),
    mode: options.mode === "conservative" || options.mode === "velocity" ? options.mode : "balanced",
    windowDays: clamp(Math.round(options.windowDays ?? defaultRevenueAutopilotOptions.windowDays), 1, 365)
  };
}

function priorityFor(options: RevenueAutopilotOptions, phase: RevenueAutopilotPhaseName, offset = 0) {
  return phaseDefinitions[phase].basePriority + (modePriorityBoost[options.mode][phase] ?? 0) + offset;
}

function blockedActions(...groups: Array<string[] | undefined>) {
  return unique([
    ...groups.flatMap((group) => group ?? []),
    "Publishing marketplace listings, changing storefront settings, uploading POD artwork, or creating provider-side products",
    "Uploading social videos, posting content, changing ad campaigns, or starting ad spend",
    "Moving money, creating payouts, changing bank accounts, creating transfers, or authorizing spend",
    "Using browser stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation"
  ]);
}

function action(input: Omit<RevenueAutopilotAction, "approvalGate" | "blockedExternalActions" | "commandHash" | "externalExecution" | "providerContacted"> & {
  blockedExternalActions?: string[];
}): RevenueAutopilotAction {
  return {
    ...input,
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      reason: "Revenue Autopilot records an internal command only. Narrow module apply controls and human approval remain required before any external handoff.",
      status: "Required"
    },
    blockedExternalActions: blockedActions(input.blockedExternalActions),
    commandHash: commandHash(input),
    externalExecution: false,
    providerContacted: false
  };
}

function phaseMetrics(input: {
  assetPortfolio?: RevenueAssetPortfolio;
  commandPlan?: PortfolioCommandCenterPlan;
  contentPlan?: FacelessContentPipelinePlan;
  digitalPlan: DigitalProductPortfolioPlan;
  financialPlan?: FinancialOrchestratorPlan;
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan;
  firstCashSprintPlan?: RevenueFirstCashSprintPlan;
  launchPlan: RevenueLaunchPipelinePlan;
  listingPlan: RevenueListingOptimizationPlan;
  revenuePlan: RevenueEnginePlan;
  signalPlan?: SignalIntakePlan;
  storeSetupPlan: RevenueStoreSetupPlan;
  releasePlan?: FinancialReleaseGovernancePlan;
}): Record<RevenueAutopilotPhaseName, RevenueAutopilotMetric[]> {
  return {
    content_factory: [
      { label: "new briefs", value: input.contentPlan?.totals.newBriefs ?? 0 },
      { label: "tracked views", value: input.contentPlan?.performanceDigest.totals.views ?? 0 }
    ],
    digital_factory: [
      { label: "queued drafts", value: input.digitalPlan.totals.queuedDrafts },
      { label: "stores queued", value: input.digitalPlan.totals.storesQueued }
    ],
    finance_governance: [
      { label: "ledger entries", value: input.financialPlan?.ledgerEntries.filter((entry) => entry.recordState === "new").length ?? 0 },
      { label: "payout intents", value: input.financialPlan?.payoutIntents.length ?? 0 },
      { label: "release packets", value: input.releasePlan?.budgetReleasePackets.length ?? 0 }
    ],
    first_business_launch: [
      { label: "ready paths", value: input.firstBusinessLaunchPlan?.totals.readyInternal ?? 0 },
      { label: "manual gates", value: input.firstBusinessLaunchPlan?.totals.manualGates ?? 0 },
      { label: "top rank", value: input.firstBusinessLaunchPlan?.topCandidate?.finalRank ?? "n/a" }
    ],
    first_cash_sprint: [
      { label: "ready moves", value: input.firstCashSprintPlan?.totals.readyInternal ?? 0 },
      { label: "manual gates", value: input.firstCashSprintPlan?.totals.manualGates ?? 0 },
      { label: "top ETA", value: input.firstCashSprintPlan?.readiness.topFirstSaleEtaDays === null || input.firstCashSprintPlan?.readiness.topFirstSaleEtaDays === undefined ? "n/a" : `${input.firstCashSprintPlan.readiness.topFirstSaleEtaDays}d` }
    ],
    listing_factory: [
      { label: "experiments", value: input.listingPlan.totals.experimentsQueued },
      { label: "variants", value: input.listingPlan.totals.variantsGenerated }
    ],
    portfolio_command: [
      { label: "commands", value: input.commandPlan?.totals.commandActions ?? 0 },
      { label: "high risk", value: input.commandPlan?.totals.highRiskCommands ?? 0 },
      { label: "rotation", value: input.assetPortfolio?.totals.rotationChanges ?? input.revenuePlan.rotationChanges.length },
      { label: "tracked", value: input.assetPortfolio?.totals.trackedAssets ?? 0 },
      { label: "profit velocity", value: `$${money(input.assetPortfolio?.totals.profitVelocity ?? 0)}/day` }
    ],
    product_factory: [
      { label: "drafts needed", value: input.launchPlan.totals.draftProductsNeeded },
      { label: "launch approvals", value: input.launchPlan.totals.approvalReadyStores },
      { label: "profit draft", value: `$${money(input.launchPlan.totals.estimatedDraftProfit)}` }
    ],
    signal_intake: [
      { label: "commerce", value: input.signalPlan?.totals.commerceSignals ?? 0 },
      { label: "content", value: input.signalPlan?.totals.contentSignals ?? 0 },
      { label: "payments", value: input.signalPlan?.totals.paymentSignals ?? 0 }
    ],
    store_setup: [
      { label: "runbooks", value: input.storeSetupPlan.totals.runbooksQueued },
      { label: "connector ready", value: input.storeSetupPlan.totals.readyForConnector }
    ]
  };
}

function phaseSummary(name: RevenueAutopilotPhaseName, actions: RevenueAutopilotAction[], metrics: RevenueAutopilotMetric[]) {
  const ready = actions.filter((item) => item.status === "ready").length;

  if (ready > 0) {
    return `${ready} ready internal command${ready === 1 ? "" : "s"} in this phase.`;
  }

  const metricText = metrics
    .map((metric) => `${metric.value} ${metric.label}`)
    .join(", ");

  if (metricText) {
    return `${phaseDefinitions[name].title} is in watch mode: ${metricText}.`;
  }

  return `${phaseDefinitions[name].title} has no ready internal command right now.`;
}

function buildPhases(actions: RevenueAutopilotAction[], metricsByPhase: Record<RevenueAutopilotPhaseName, RevenueAutopilotMetric[]>): RevenueAutopilotPhase[] {
  return (Object.keys(phaseDefinitions) as RevenueAutopilotPhaseName[])
    .map((name) => {
      const phaseActions = actions.filter((item) => item.phase === name);
      const status: RevenueAutopilotActionStatus = phaseActions.some((item) => item.status === "blocked")
        ? "blocked"
        : phaseActions.some((item) => item.status === "ready")
          ? "ready"
          : "watch";

      return {
        actionCount: phaseActions.length,
        metrics: metricsByPhase[name],
        name,
        priority: phaseDefinitions[name].basePriority,
        status,
        summary: phaseSummary(name, phaseActions, metricsByPhase[name]),
        title: phaseDefinitions[name].title
      };
    })
    .sort((left, right) => left.priority - right.priority);
}

export function buildRevenueAutopilotPlan(input: {
  assetPortfolio?: RevenueAssetPortfolio;
  commandPlan?: PortfolioCommandCenterPlan;
  contentPlan?: FacelessContentPipelinePlan;
  digitalPlan: DigitalProductPortfolioPlan;
  financialPlan?: FinancialOrchestratorPlan;
  firstBusinessLaunchPlan?: RevenueFirstBusinessLaunchPlan;
  firstCashSprintPlan?: RevenueFirstCashSprintPlan;
  generatedAt?: string;
  launchPlan: RevenueLaunchPipelinePlan;
  listingPlan: RevenueListingOptimizationPlan;
  options?: Partial<RevenueAutopilotOptions>;
  revenuePlan: RevenueEnginePlan;
  releasePlan?: FinancialReleaseGovernancePlan;
  signalPlan?: SignalIntakePlan;
  storeSetupPlan: RevenueStoreSetupPlan;
}): RevenueAutopilotPlan {
  const options = withOptions(input.options);
  const actions: RevenueAutopilotAction[] = [];
  const newLedgerEntries = input.financialPlan?.ledgerEntries.filter((entry) => entry.recordState === "new").length ?? 0;
  const payoutIntents = input.financialPlan?.payoutIntents.length ?? 0;
  const releasePackets = input.releasePlan?.budgetReleasePackets.length ?? 0;
  const rotationChanges = input.assetPortfolio?.totals.rotationChanges ?? input.revenuePlan.rotationChanges.length;
  const performanceSnapshots = input.assetPortfolio?.totals.performanceSnapshots ?? 0;
  const trackedAssets = input.assetPortfolio?.totals.trackedAssets ?? 0;
  const profitVelocity = input.assetPortfolio?.totals.profitVelocity ?? 0;
  const revenueVelocity = input.assetPortfolio?.totals.revenueVelocity ?? 0;
  const killRecommendations = input.assetPortfolio?.totals.kill ?? input.revenuePlan.rotationChanges.filter((change) => change.action === "kill").length;
  const firstCashReadyMoves = input.firstCashSprintPlan?.totals.readyInternal ?? 0;
  const firstCashManualGates = input.firstCashSprintPlan?.totals.manualGates ?? 0;
  const firstCashBlockedMoves = input.firstCashSprintPlan?.totals.blocked ?? 0;
  const firstBusinessLaunchReady = input.firstBusinessLaunchPlan?.totals.readyInternal ?? 0;
  const firstBusinessLaunchManualGates = input.firstBusinessLaunchPlan?.totals.manualGates ?? 0;
  const firstBusinessLaunchBlocked = input.firstBusinessLaunchPlan?.totals.blocked ?? 0;
  const firstBusinessLaunchCandidates = input.firstBusinessLaunchPlan?.totals.candidates ?? 0;

  if (input.firstBusinessLaunchPlan && firstBusinessLaunchCandidates > 0) {
    const topCandidate = input.firstBusinessLaunchPlan.topCandidate;
    const status: RevenueAutopilotActionStatus = firstBusinessLaunchReady > 0
      ? "ready"
      : firstBusinessLaunchBlocked > 0 && firstBusinessLaunchManualGates === 0 ? "blocked" : "watch";
    actions.push(action({
      action: "run_first_business_launch",
      expectedInternalEffect: "Dispatch the highest-ranked first-business launch path through existing First Cash Sprint bridge controls while keeping all provider, marketplace, payout, upload, and browser work locked.",
      phase: "first_business_launch",
      priority: priorityFor(options, "first_business_launch", firstBusinessLaunchReady > 0 ? -10 : 8),
      reason: input.firstBusinessLaunchPlan.summary,
      recommendedStatus: firstBusinessLaunchReady > 0 ? "first_business_launch_ready" : firstBusinessLaunchManualGates > 0 ? "first_business_manual_gate" : "first_business_watch",
      riskLevel: firstBusinessLaunchReady > 0 ? "medium" : "low",
      sourceModule: "revenue_first_business_launch + revenue_first_cash_sprint + revenue_launch_checklist_action_bridge",
      status,
      summary: topCandidate
        ? `${topCandidate.storeName} is the ranked first-business launch target at ${topCandidate.finalRank}/100 with ${topCandidate.status.replace(/_/g, " ")} status.`
        : `${firstBusinessLaunchCandidates} first-business launch candidate${firstBusinessLaunchCandidates === 1 ? "" : "s"} ranked for internal review.`,
      targetId: topCandidate?.storeId ?? "revenue_first_business_launch",
      targetName: topCandidate ? `${topCandidate.storeName} First Business Launch` : "Revenue First Business Launch Path",
      targetType: "portfolio",
      title: "Run first-business launch path",
      blockedExternalActions: input.firstBusinessLaunchPlan.blockedExternalActions
    }));
  }

  if (input.firstCashSprintPlan && input.firstCashSprintPlan.totals.steps > 0) {
    const status: RevenueAutopilotActionStatus = firstCashReadyMoves > 0
      ? "ready"
      : firstCashBlockedMoves > 0 && firstCashManualGates === 0 ? "blocked" : "watch";
    actions.push(action({
      action: "run_first_cash_sprint",
      expectedInternalEffect: "Dispatch ready first-cash sprint moves through the Launch Checklist Action Bridge while keeping all provider, marketplace, payout, upload, and browser work locked.",
      phase: "first_cash_sprint",
      priority: priorityFor(options, "first_cash_sprint", firstCashReadyMoves > 0 ? -8 : 8),
      reason: firstBusinessLaunchReady > 0
        ? "A first-business launch path is ready and will handle the top sprint bridge action; this broader sprint remains available as fallback context."
        : input.firstCashSprintPlan.summary,
      recommendedStatus: firstBusinessLaunchReady > 0 ? "covered_by_first_business_launch" : firstCashReadyMoves > 0 ? "first_cash_sprint_ready" : firstCashManualGates > 0 ? "first_cash_manual_gate" : "first_cash_watch",
      riskLevel: firstCashReadyMoves > 0 ? "medium" : "low",
      sourceModule: "revenue_first_cash_sprint + revenue_launch_checklist_action_bridge",
      status: firstBusinessLaunchReady > 0 ? "watch" : status,
      summary: firstBusinessLaunchReady > 0
        ? "First-cash sprint is covered by the first-business launch path for this executor run."
        : `${firstCashReadyMoves} ready first-cash sprint move${firstCashReadyMoves === 1 ? "" : "s"} and ${firstCashManualGates} manual gate${firstCashManualGates === 1 ? "" : "s"} identified for the fastest cash path.`,
      targetId: "revenue_first_cash_sprint",
      targetName: "Revenue First Cash Sprint",
      targetType: "portfolio",
      title: "Run first-cash sprint",
      blockedExternalActions: input.firstCashSprintPlan.blockedExternalActions
    }));
  }

  if (options.includeSignalIntake && input.signalPlan?.samplePayloads && input.signalPlan.readiness.storesAvailable > 0) {
    actions.push(action({
      action: "stage_signal_intake",
      expectedInternalEffect: "Record a command to review and stage approved read-only commerce, content, and payment signals.",
      phase: "signal_intake",
      priority: priorityFor(options, "signal_intake"),
      reason: `${input.signalPlan.readiness.storesAvailable} store${input.signalPlan.readiness.storesAvailable === 1 ? "" : "s"} can accept approved read-only signal evidence.`,
      recommendedStatus: "readiness_review",
      riskLevel: "low",
      sourceModule: "signal_intake_center",
      status: "ready",
      summary: "Stage approved read-only evidence templates without contacting providers.",
      targetId: "signal_intake_center",
      targetName: "Signal Intake Center",
      targetType: "signal",
      title: "Stage read-only signals",
      blockedExternalActions: input.signalPlan.blockedExternalActions
    }));
  }

  if (input.launchPlan.totals.draftProductsNeeded > 0) {
    actions.push(action({
      action: "seed_launch_products",
      expectedInternalEffect: "Record a launch-factory command to create internal POD draft products through the launch pipeline.",
      phase: "product_factory",
      priority: priorityFor(options, "product_factory"),
      reason: input.launchPlan.summary,
      recommendedStatus: "internal_drafts_needed",
      riskLevel: "low",
      sourceModule: "revenue_launch_pipeline",
      status: "ready",
      summary: `${input.launchPlan.totals.draftProductsNeeded} internal POD product drafts are needed for launch coverage.`,
      targetId: "revenue_launch_pipeline",
      targetName: "Revenue Launch Pipeline",
      targetType: "portfolio",
      title: "Seed launch product drafts",
      blockedExternalActions: input.launchPlan.blockedExternalActions
    }));
  }

  if (input.launchPlan.totals.approvalReadyStores > 0) {
    actions.push(action({
      action: "queue_launch_approval",
      expectedInternalEffect: "Record a command to prepare internal launch approval packets.",
      phase: "product_factory",
      priority: priorityFor(options, "product_factory", 4),
      reason: `${input.launchPlan.totals.approvalReadyStores} store${input.launchPlan.totals.approvalReadyStores === 1 ? "" : "s"} have enough approved products for a locked launch approval packet.`,
      recommendedStatus: "launch_approval_review",
      riskLevel: "medium",
      sourceModule: "revenue_launch_pipeline",
      status: "ready",
      summary: "Queue launch approval packets for stores with approved product coverage.",
      targetId: "launch_approval_queue",
      targetName: "Launch Approval Queue",
      targetType: "store",
      title: "Queue launch approval packets",
      blockedExternalActions: input.launchPlan.blockedExternalActions
    }));
  }

  if (input.launchPlan.totals.launchPackageReadyStores > 0) {
    actions.push(action({
      action: "prepare_launch_package",
      expectedInternalEffect: "Record a command to refresh internal store launch packages and handoff notes.",
      phase: "product_factory",
      priority: priorityFor(options, "product_factory", 8),
      reason: `${input.launchPlan.totals.launchPackageReadyStores} store${input.launchPlan.totals.launchPackageReadyStores === 1 ? "" : "s"} have launch-package-ready product coverage.`,
      recommendedStatus: "launch_package_review",
      riskLevel: "low",
      sourceModule: "revenue_launch_pipeline",
      status: "ready",
      summary: "Prepare launch packages while external storefront work stays locked.",
      targetId: "launch_package_queue",
      targetName: "Launch Package Queue",
      targetType: "store",
      title: "Prepare launch packages",
      blockedExternalActions: input.launchPlan.blockedExternalActions
    }));
  }

  if (input.digitalPlan.totals.queuedDrafts > 0) {
    actions.push(action({
      action: "queue_digital_products",
      expectedInternalEffect: "Record a command to create internal digital product drafts and delivery checklists.",
      phase: "digital_factory",
      priority: priorityFor(options, "digital_factory"),
      reason: input.digitalPlan.summary,
      recommendedStatus: "digital_drafts_needed",
      riskLevel: "low",
      sourceModule: "digital_product_portfolio",
      status: "ready",
      summary: `${input.digitalPlan.totals.queuedDrafts} digital product drafts are ready for internal creation.`,
      targetId: "digital_product_portfolio",
      targetName: "Digital Product Portfolio",
      targetType: "product",
      title: "Queue digital product drafts",
      blockedExternalActions: input.digitalPlan.blockedExternalActions
    }));
  }

  if (input.listingPlan.totals.experimentsQueued > 0) {
    actions.push(action({
      action: "apply_listing_optimization",
      expectedInternalEffect: "Record a command to apply internal listing copy, pricing, and variant experiments.",
      phase: "listing_factory",
      priority: priorityFor(options, "listing_factory"),
      reason: input.listingPlan.summary,
      recommendedStatus: "listing_draft_review",
      riskLevel: input.listingPlan.totals.priceExperiments > 0 ? "medium" : "low",
      sourceModule: "revenue_listing_optimization",
      status: "ready",
      summary: `${input.listingPlan.totals.experimentsQueued} listing experiments are ready for internal drafting.`,
      targetId: "listing_optimization_queue",
      targetName: "Listing Optimization Queue",
      targetType: "product",
      title: "Apply listing optimization drafts",
      blockedExternalActions: input.listingPlan.blockedExternalActions
    }));
  }

  if (input.storeSetupPlan.totals.runbooksQueued > 0) {
    actions.push(action({
      action: "prepare_store_setup",
      expectedInternalEffect: "Record a command to prepare internal setup runbooks, storefront settings, and connector readiness notes.",
      phase: "store_setup",
      priority: priorityFor(options, "store_setup"),
      reason: input.storeSetupPlan.summary,
      recommendedStatus: "store_setup_review",
      riskLevel: input.storeSetupPlan.totals.credentialScopes > 0 ? "medium" : "low",
      sourceModule: "revenue_store_setup",
      status: "ready",
      summary: `${input.storeSetupPlan.totals.runbooksQueued} store setup runbooks are ready for internal preparation.`,
      targetId: "store_setup_runbook",
      targetName: "Store Setup Runbook",
      targetType: "store",
      title: "Prepare store setup runbooks",
      blockedExternalActions: input.storeSetupPlan.blockedExternalActions
    }));
  }

  if (options.includeContent && input.contentPlan && input.contentPlan.totals.newBriefs > 0) {
    actions.push(action({
      action: "queue_content_briefs",
      expectedInternalEffect: "Record a command to create internal faceless content briefs, scripts, and provider-readiness manifests.",
      phase: "content_factory",
      priority: priorityFor(options, "content_factory"),
      reason: input.contentPlan.summary,
      recommendedStatus: "content_brief_review",
      riskLevel: "low",
      sourceModule: "faceless_content_pipeline",
      status: "ready",
      summary: `${input.contentPlan.totals.newBriefs} faceless content briefs are ready for internal queueing.`,
      targetId: "faceless_content_pipeline",
      targetName: "Faceless Content Pipeline",
      targetType: "content",
      title: "Queue faceless content briefs",
      blockedExternalActions: input.contentPlan.blockedExternalActions
    }));
  }

  if (options.includeFinance && input.financialPlan && (newLedgerEntries > 0 || payoutIntents > 0)) {
    actions.push(action({
      action: "record_finance_split",
      expectedInternalEffect: "Record a command to apply internal financial split ledger entries and locked payout intents.",
      phase: "finance_governance",
      priority: priorityFor(options, "finance_governance"),
      reason: input.financialPlan.summary,
      recommendedStatus: "finance_split_review",
      riskLevel: payoutIntents > 0 ? "high" : "medium",
      sourceModule: "financial_orchestrator",
      status: "ready",
      summary: `${newLedgerEntries} ledger entr${newLedgerEntries === 1 ? "y" : "ies"} and ${payoutIntents} payout intent${payoutIntents === 1 ? "" : "s"} are ready for locked internal finance records.`,
      targetId: "financial_orchestrator",
      targetName: "Financial Orchestrator",
      targetType: "finance",
      title: "Record finance split records",
      blockedExternalActions: input.financialPlan.blockedExternalActions
    }));
  }

  if (options.includeFinance && input.releasePlan && releasePackets > 0) {
    actions.push(action({
      action: "record_release_governance",
      expectedInternalEffect: "Record a command to persist locked release packets and reconciliation-only governance.",
      phase: "finance_governance",
      priority: priorityFor(options, "finance_governance", 6),
      reason: input.releasePlan.summary,
      recommendedStatus: "release_governance_review",
      riskLevel: input.releasePlan.totals.highRiskIntents > 0 ? "high" : "medium",
      sourceModule: "financial_release_governance",
      status: "ready",
      summary: `${releasePackets} release packet${releasePackets === 1 ? "" : "s"} are ready for governance recording.`,
      targetId: "financial_release_governance",
      targetName: "Financial Release Governance",
      targetType: "finance",
      title: "Record release governance",
      blockedExternalActions: input.releasePlan.blockedExternalActions
    }));
  }

  if ((input.commandPlan && input.commandPlan.totals.commandActions > 0) || rotationChanges > 0) {
    actions.push(action({
      action: "record_portfolio_commands",
      expectedInternalEffect: "Record prioritized internal command actions from the Portfolio Command Center.",
      phase: "portfolio_command",
      priority: priorityFor(options, "portfolio_command", profitVelocity < 0 || killRecommendations > 0 ? -18 : rotationChanges > 0 ? -10 : 0),
      reason: input.assetPortfolio
        ? `${input.assetPortfolio.summary} ${input.commandPlan?.summary ?? ""}`.trim()
        : input.commandPlan?.summary ?? `${rotationChanges} performance-aware rotation changes are ready for internal command review.`,
      recommendedStatus: "command_review",
      riskLevel: killRecommendations > 0 || (input.commandPlan?.totals.highRiskCommands ?? 0) > 0 ? "high" : "medium",
      sourceModule: input.assetPortfolio ? "revenue_asset_portfolio + portfolio_command_center" : "portfolio_command_center",
      status: "ready",
      summary: `${input.commandPlan?.totals.commandActions ?? rotationChanges} portfolio command action${(input.commandPlan?.totals.commandActions ?? rotationChanges) === 1 ? "" : "s"} are ready with ${money(profitVelocity)} daily profit velocity.`,
      targetId: "portfolio_command_center",
      targetName: "Portfolio Command Center",
      targetType: "portfolio",
      title: "Record portfolio command actions",
      blockedExternalActions: blockedActions(input.commandPlan?.blockedExternalActions, input.assetPortfolio?.blockedExternalActions)
    }));
  }

  if (actions.length === 0) {
    actions.push(action({
      action: "watch",
      expectedInternalEffect: "Record a watch command and keep collecting approved read-only evidence.",
      phase: "portfolio_command",
      priority: priorityFor(options, "portfolio_command", 20),
      reason: "All revenue modules are currently in watch mode. Keep collecting approved signals and rerun the autopilot after new evidence lands.",
      recommendedStatus: null,
      riskLevel: "low",
      sourceModule: "revenue_autopilot",
      status: "watch",
      summary: "No internal write commands are ready. Continue signal intake and monitoring.",
      targetId: "revenue_autopilot_watch",
      targetName: "Revenue Autopilot Watch",
      targetType: "portfolio",
      title: "Watch revenue system",
      blockedExternalActions: []
    }));
  }

  const selectedActions = actions
    .sort((left, right) => left.priority - right.priority || riskWeight[left.riskLevel] - riskWeight[right.riskLevel])
    .slice(0, options.maxActions);
  const metricsByPhase = phaseMetrics(input);
  const phases = buildPhases(selectedActions, metricsByPhase);
  const blocked = blockedActions(
    input.revenuePlan.blockedExternalActions,
    input.launchPlan.blockedExternalActions,
    input.digitalPlan.blockedExternalActions,
    input.firstBusinessLaunchPlan?.blockedExternalActions,
    input.firstCashSprintPlan?.blockedExternalActions,
    input.listingPlan.blockedExternalActions,
    input.storeSetupPlan.blockedExternalActions,
    input.contentPlan?.blockedExternalActions,
    input.financialPlan?.blockedExternalActions,
    input.releasePlan?.blockedExternalActions,
    input.commandPlan?.blockedExternalActions,
    input.assetPortfolio?.blockedExternalActions,
    input.signalPlan?.blockedExternalActions
  );

  return {
    actions: selectedActions,
    auditEvents: [
      "Revenue Autopilot generated a cross-module internal command plan.",
      "Apply mode records queued command records and an audit log only; it does not publish, upload, contact providers, move money, or run browser automation.",
      "Narrow module apply controls and human approval gates remain required before any internal record creation beyond autopilot command records."
    ],
    blockedExternalActions: blocked,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Revenue Autopilot",
    options,
    phases,
    providerContacted: false,
    summary: `${selectedActions.length} internal autopilot command${selectedActions.length === 1 ? "" : "s"} prioritized in ${options.mode} mode across ${input.revenuePlan.totals.stores} store${input.revenuePlan.totals.stores === 1 ? "" : "s"}, ${input.revenuePlan.totals.products} product${input.revenuePlan.totals.products === 1 ? "" : "s"}, ${money(input.launchPlan.totals.estimatedDraftProfit + input.digitalPlan.totals.estimatedDraftProfit)} estimated draft profit, ${money(profitVelocity)} daily profit velocity, and ${rotationChanges} performance-aware rotation change${rotationChanges === 1 ? "" : "s"}. External execution remains locked.`,
    totals: {
      actions: selectedActions.length,
      blockedActions: selectedActions.filter((item) => item.status === "blocked").length,
      commerceSignalsReady: input.signalPlan?.totals.commerceSignals ?? 0,
      contentBriefsQueued: input.contentPlan?.totals.newBriefs ?? 0,
      contentSignalsReady: input.signalPlan?.totals.contentSignals ?? 0,
      digitalDraftsQueued: input.digitalPlan.totals.queuedDrafts,
      estimatedDraftProfit: money(input.launchPlan.totals.estimatedDraftProfit + input.digitalPlan.totals.estimatedDraftProfit),
      financeLedgerEntries: newLedgerEntries,
      financePayoutIntents: payoutIntents,
      firstBusinessLaunchCandidates,
      firstBusinessLaunchManualGates,
      firstBusinessLaunchReady,
      firstCashSprintManualGates: firstCashManualGates,
      firstCashSprintReady: firstCashReadyMoves,
      listingExperimentsQueued: input.listingPlan.totals.experimentsQueued,
      paymentSignalsReady: input.signalPlan?.totals.paymentSignals ?? 0,
      performanceSnapshots,
      portfolioCommands: input.commandPlan?.totals.commandActions ?? rotationChanges,
      products: input.revenuePlan.totals.products,
      profitVelocity: money(profitVelocity),
      readyActions: selectedActions.filter((item) => item.status === "ready").length,
      revenueVelocity: money(revenueVelocity),
      releasePackets,
      rotationChanges,
      storeRunbooksQueued: input.storeSetupPlan.totals.runbooksQueued,
      stores: input.revenuePlan.totals.stores,
      trackedAssets,
      watchActions: selectedActions.filter((item) => item.status === "watch").length
    }
  };
}
