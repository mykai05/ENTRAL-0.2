import { describe, expect, it } from "vitest";
import {
  buildRevenueLaunchChecklistPlan,
  type RevenueLaunchChecklistPlan
} from "../src/services/revenueLaunchChecklist.js";
import type { PortfolioCommandCenterPlan } from "../src/services/portfolioCommandCenter.js";
import type { RevenueLaunchReadinessPlan } from "../src/services/revenueLaunchReadiness.js";
import type { RevenueAssetPortfolio } from "../src/services/revenueEngine.js";
import type { RevenueOpportunityControlPlan } from "../src/services/revenueOpportunityControl.js";
import type { RevenueSignalConnectorApprovalPlan } from "../src/services/revenueSignalConnectorApprovals.js";
import type { RevenueSignalConnectorManifest } from "../src/services/revenueSignalConnectors.js";
import type { RevenueSignalImportHandoffPlan } from "../src/services/revenueSignalImportHandoff.js";

const manifest: RevenueSignalConnectorManifest = {
  approvalGate: {
    humanApprovalRequired: true,
    requiredConfirmation: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
    status: "Required"
  },
  blockedExternalActions: ["No external connector writes."],
  credentialEnvVars: [],
  endpointTemplates: ["Operator-uploaded CSV or JSON payload reviewed before ingestion"],
  externalExecution: false,
  id: "readonly_signal_connector:commerce:etsy:store_1:product_1",
  lane: "commerce",
  provider: "etsy",
  providerContacted: false,
  providerName: "Etsy",
  readinessScore: 91,
  readOnlyScopes: [{ reason: "Read revenue evidence only.", scope: "transactions:read" }],
  riskLevel: "low",
  samplePayload: {
    commerceSignals: [{
      grossRevenue: 240,
      periodEnd: "2026-06-02T12:00:00.000Z",
      periodStart: "2026-05-26T12:00:00.000Z",
      source: "etsy",
      storeId: "store_1"
    }]
  },
  status: "ready_for_approval",
  summary: "Etsy revenue evidence is ready for internal approval.",
  target: {
    contentBriefId: null,
    productId: "product_1",
    storeId: "store_1",
    storeName: "Signal Forge"
  },
  title: "Etsy revenue signal",
  transformTarget: "revenue_performance_snapshot",
  writeScopes: []
};

const opportunityPlan = {
  blockedExternalActions: ["No provider execution."],
  opportunities: [{
    auditLogId: "audit_factory",
    blockers: [],
    businessName: "Signal Forge",
    controlActions: [],
    createdAt: "2026-06-02T12:00:00.000Z",
    externalExecution: false,
    id: "opportunity_1",
    idea: "Private POD revenue line",
    metrics: {
      approvedProducts: 2,
      estimatedDraftProfit: 420,
      listingReadyProducts: 3,
      netProfit: 0,
      performanceSnapshots: 0,
      productDrafts: 5,
      publishedProducts: 0,
      revenue: 0,
      revisionProducts: 0
    },
    nextInternalActions: [{
      action: "queue_launch_approval",
      externalExecution: false,
      priority: 20,
      status: "ready",
      title: "Queue launch approval"
    }],
    providerContacted: false,
    readinessScore: 76,
    recommendedStatus: "ready_for_handoff",
    riskLevel: "low",
    sourceKey: "signal-forge",
    stage: "launch_preparation",
    status: "active",
    store: {
      approvalStatus: "Designs Approved",
      businessName: "Signal Forge",
      id: "store_1",
      launchStatus: "Building Store",
      storePlatform: "Etsy"
    },
    summary: "Signal Forge is ready for launch approval.",
    updatedAt: "2026-06-02T12:00:00.000Z"
  }],
  totals: {
    opportunities: 1
  }
} as unknown as RevenueOpportunityControlPlan;

const launchReadinessPlan = {
  blockedExternalActions: ["No marketplace publishing."],
  stores: [{
    approvalState: {
      approvedPackets: 1,
      latestProviderApprovalId: "approval_packet_1",
      pendingPackets: 0,
      providerApprovalApproved: true,
      providerApprovalPending: false,
      rejectedPackets: 0,
      totalPackets: 1
    },
    blockers: [],
    externalExecution: false,
    launchPipeline: {
      action: "queue_launch_approval",
      missingProducts: 0,
      readyProducts: 5,
      reason: "Launch package is ready."
    },
    nextInternalAction: "generate_provider_handoff",
    priority: 20,
    providerContacted: false,
    providerPayload: {
      adapterCoverage: ["Printify", "Etsy"],
      payloadCount: 3,
      readinessScore: 82,
      warnings: []
    },
    readinessScore: 82,
    riskLevel: "low",
    stage: "handoff_ready",
    store: {
      approvalStatus: "Designs Approved",
      businessName: "Signal Forge",
      estimatedProfit: 420,
      id: "store_1",
      launchStatus: "Building Store",
      productTypes: ["T-shirt"],
      revenue: 0,
      storePlatform: "Etsy"
    },
    storeSetup: {
      connectorReadinessScore: 82,
      connectorStatus: "Ready",
      queuedAction: "prepare_store_setup",
      readinessScore: 82
    },
    summary: "Signal Forge is handoff ready."
  }]
} as unknown as RevenueLaunchReadinessPlan;

const signalApprovalPlan = {
  approvalQueue: [{
    action: "queue_approval",
    externalExecution: false,
    manifestId: manifest.id,
    priority: 20,
    provider: "etsy",
    providerContacted: false,
    riskLevel: "low",
    sampleSignals: 1,
    summary: "Queue read-only connector approval.",
    targetName: "Signal Forge"
  }],
  approvals: [{
    blockedActions: [],
    contentBriefId: null,
    createdAt: "2026-06-02T12:05:00.000Z",
    credentialEnvVars: [],
    dedupeKey: manifest.id,
    endpointTemplates: manifest.endpointTemplates,
    externalExecution: false,
    id: "approval_1",
    lane: "commerce",
    manifest,
    manifestId: manifest.id,
    productId: "product_1",
    provider: "etsy",
    providerContacted: false,
    providerName: "Etsy",
    readOnlyScopes: manifest.readOnlyScopes,
    readinessScore: 91,
    requestAuditLogId: "audit_request",
    reviewAuditLogId: "audit_review",
    reviewedAt: "2026-06-02T12:06:00.000Z",
    reviewedById: "user_1",
    reviewNote: null,
    riskLevel: "low",
    samplePayload: manifest.samplePayload,
    signalPreview: {} as RevenueSignalConnectorApprovalPlan["approvals"][number]["signalPreview"],
    status: "approved",
    storeId: "store_1",
    storeName: "Signal Forge",
    transformTarget: "revenue_performance_snapshot",
    updatedAt: "2026-06-02T12:06:00.000Z"
  }],
  blockedExternalActions: ["No connector writes."],
  connectorPlan: {
    manifests: [manifest]
  },
  importQueue: [],
  totals: {
    pendingApprovals: 0
  }
} as unknown as RevenueSignalConnectorApprovalPlan;

const signalImportHandoffPlan = {
  blockedExternalActions: ["No live import execution."],
  importJobs: [{
    approvalId: "approval_1",
    auditLogId: "audit_import",
    completedAt: null,
    createdAt: "2026-06-02T12:10:00.000Z",
    externalExecution: false,
    handoffAuditLogId: null,
    id: "signal_import_job_1",
    intakeResult: null,
    lane: "commerce",
    manifestId: manifest.id,
    provider: "etsy",
    providerContacted: false,
    samplePayload: manifest.samplePayload,
    signalPreview: {} as RevenueSignalImportHandoffPlan["importJobs"][number]["signalPreview"],
    status: "queued_review",
    transformTarget: "revenue_performance_snapshot",
    updatedAt: "2026-06-02T12:10:00.000Z"
  }],
  readyHandoffs: [{
    action: "ingest_queued_readonly_signals",
    approvalId: "approval_1",
    externalExecution: false,
    importJobId: "signal_import_job_1",
    lane: "commerce",
    manifestId: manifest.id,
    priority: 20,
    provider: "etsy",
    providerContacted: false,
    sampleSignals: 1,
    summary: "Ready to hand off one stored signal."
  }]
} as unknown as RevenueSignalImportHandoffPlan;

const commandPlan = {
  blockedExternalActions: ["No payout or upload execution."],
  commandActions: [{
    action: "prepare_launch",
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Required"
    },
    blockedExternalActions: [],
    commandHash: "store:store_1:prepare_launch",
    expectedInternalEffect: "Record the growth command for internal queueing and later human approval.",
    externalExecution: false,
    priority: 30,
    providerContacted: false,
    reason: "Launch-ready store has product drafts.",
    recommendedStatus: null,
    riskLevel: "low",
    sourceModule: "revenue_engine",
    targetId: "store_1",
    targetName: "Signal Forge",
    targetType: "store"
  }]
} as unknown as PortfolioCommandCenterPlan;

const assetPortfolio = {
  assets: [{
    assetId: "store_1",
    assetName: "Signal Forge",
    assetScore: {
      economicsScore: 42,
      finalRank: 86,
      readinessScore: 34,
      riskPenalty: 0,
      velocity: 18
    },
    assetType: "store",
    evidence: ["Economics 42/45", "Readiness 34/35", "Velocity 18/day"],
    nextInternalState: null,
    providerContacted: false,
    reason: "Signal Forge has strong launch economics and should scale through the internal launch path.",
    recommendation: "scale",
    score: 86,
    scoreBand: "excellent",
    storeId: "store_1",
    storeName: "Signal Forge"
  }],
  blockedExternalActions: ["No external asset execution."]
} as unknown as RevenueAssetPortfolio;

function checklist(overrides: Partial<Parameters<typeof buildRevenueLaunchChecklistPlan>[0]> = {}): RevenueLaunchChecklistPlan {
  return buildRevenueLaunchChecklistPlan({
    assetPortfolio,
    commandPlan,
    generatedAt: "2026-06-02T12:30:00.000Z",
    launchReadinessPlan,
    opportunityPlan,
    options: {
      includeCompleted: true,
      maxItems: 25,
      minPriorityScore: 0,
      windowDays: 30
    },
    signalApprovalPlan,
    signalImportHandoffPlan,
    ...overrides
  });
}

describe("Revenue Launch Checklist", () => {
  it("ranks the fastest internal handoff path without external execution", () => {
    const plan = checklist();

    expect(plan.mode).toBe("Internal Revenue Launch Checklist");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].nextAction).toBe("ingest_import_handoff");
    expect(plan.items[0].metrics.importHandoffsReady).toBe(1);
    expect(plan.items[0].assetSignal).toMatchObject({
      assetName: "Signal Forge",
      finalRank: 86,
      recommendation: "scale"
    });
    expect(plan.items[0].stages.find((stage) => stage.key === "asset_scoring")).toMatchObject({
      score: 86,
      status: "ready"
    });
    expect(plan.items[0].commandActions).toHaveLength(1);
    expect(plan.totals.scoredAssets).toBe(1);
    expect(plan.totals.scaleAssets).toBe(1);
    expect(plan.totals.estimatedDraftProfit).toBe(420);
    expect(plan.blockedExternalActions.join(" ")).toContain("proxies");
  });

  it("surfaces an unassigned opportunity as a store-shell creation step", () => {
    const plan = checklist({
      commandPlan: {
        blockedExternalActions: [],
        commandActions: []
      } as unknown as PortfolioCommandCenterPlan,
      assetPortfolio: {
        assets: [],
        blockedExternalActions: []
      } as unknown as RevenueAssetPortfolio,
      launchReadinessPlan: {
        blockedExternalActions: [],
        stores: []
      } as unknown as RevenueLaunchReadinessPlan,
      opportunityPlan: {
        blockedExternalActions: [],
        opportunities: [{
          ...opportunityPlan.opportunities[0],
          businessName: "Shadow Ledger",
          id: "opportunity_2",
          metrics: {
            approvedProducts: 0,
            estimatedDraftProfit: 0,
            listingReadyProducts: 0,
            netProfit: 0,
            performanceSnapshots: 0,
            productDrafts: 0,
            publishedProducts: 0,
            revenue: 0,
            revisionProducts: 0
          },
          nextInternalActions: [],
          readinessScore: 12,
          store: null,
          summary: "Needs an internal store shell."
        }]
      } as unknown as RevenueOpportunityControlPlan,
      signalApprovalPlan: {
        approvals: [],
        blockedExternalActions: [],
        connectorPlan: {
          manifests: []
        },
        importQueue: []
      } as unknown as RevenueSignalConnectorApprovalPlan,
      signalImportHandoffPlan: {
        blockedExternalActions: [],
        importJobs: [],
        readyHandoffs: []
      } as unknown as RevenueSignalImportHandoffPlan
    });

    expect(plan.items).toHaveLength(1);
    expect(plan.items[0].storeId).toBeNull();
    expect(plan.items[0].nextAction).toBe("create_store_shell");
    expect(plan.items[0].stages.find((stage) => stage.key === "drafts")?.status).toBe("blocked");
  });

  it("blocks a launch sequence when the current asset score recommends pause", () => {
    const plan = checklist({
      assetPortfolio: {
        assets: [{
          ...assetPortfolio.assets[0],
          assetId: "store_pause",
          assetName: "Pause Forge",
          assetScore: {
            economicsScore: 8,
            finalRank: 22,
            readinessScore: 24,
            riskPenalty: 10,
            velocity: -6
          },
          nextInternalState: "Paused",
          reason: "Performance and economics are weak enough to pause this store before launch work continues.",
          recommendation: "pause",
          score: 22,
          scoreBand: "critical",
          storeId: "store_1",
          storeName: "Signal Forge"
        }],
        blockedExternalActions: ["No external asset execution."]
      } as unknown as RevenueAssetPortfolio
    });

    expect(plan.items[0].nextAction).toBe("apply_portfolio_commands");
    expect(plan.items[0].riskLevel).toBe("medium");
    expect(plan.items[0].blockers.join(" ")).toContain("Revenue Engine recommends pause");
    expect(plan.items[0].stages.find((stage) => stage.key === "asset_scoring")).toMatchObject({
      status: "blocked"
    });
    expect(plan.totals.pauseAssets).toBe(1);
  });
});
