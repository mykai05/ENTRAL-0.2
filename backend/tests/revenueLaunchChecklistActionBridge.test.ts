import { describe, expect, it } from "vitest";
import {
  buildRevenueLaunchChecklistActionBridgePlan,
  selectRevenueLaunchChecklistBridgeActions
} from "../src/services/revenueLaunchChecklistActionBridge.js";
import type { PortfolioCommandCenterPlan } from "../src/services/portfolioCommandCenter.js";
import type { RevenueLaunchChecklistItem, RevenueLaunchChecklistPlan } from "../src/services/revenueLaunchChecklist.js";
import type { RevenueSignalConnectorApprovalPlan } from "../src/services/revenueSignalConnectorApprovals.js";
import type { RevenueSignalConnectorManifest } from "../src/services/revenueSignalConnectors.js";
import type { RevenueSignalImportHandoffPlan } from "../src/services/revenueSignalImportHandoff.js";

function checklistItem(overrides: Partial<RevenueLaunchChecklistItem>): RevenueLaunchChecklistItem {
  const nextAction = overrides.nextAction ?? "queue_connector_approval";

  return {
    assetSignal: null,
    blockers: [],
    businessName: overrides.storeName ?? "Signal Forge",
    commandActions: [],
    externalExecution: false,
    id: overrides.id ?? `${overrides.storeId ?? "store_1"}:${nextAction}`,
    incomeVelocityScore: 80,
    metrics: {
      approvedProducts: 0,
      commandActions: 0,
      completedHandoffs: 0,
      connectorApprovalQueue: 0,
      estimatedDraftProfit: 0,
      importHandoffsReady: 0,
      importJobs: 0,
      listingReadyProducts: 0,
      netProfit: 0,
      pendingConnectorApprovals: 0,
      performanceSnapshots: 0,
      scoredAssets: 0,
      productDrafts: 0,
      revenue: 0,
      signalEvidence: 0
    },
    nextAction,
    nextActionLabel: nextAction.replace(/_/g, " "),
    opportunityId: "opportunity_1",
    opportunityStatus: "active",
    priorityScore: overrides.priorityScore ?? 80,
    providerContacted: false,
    readinessScore: 70,
    riskLevel: "low",
    stages: [],
    storeId: overrides.storeId ?? "store_1",
    storeName: overrides.storeName ?? "Signal Forge",
    summary: `${overrides.storeName ?? "Signal Forge"} needs ${nextAction}.`,
    ...overrides
  };
}

const manifest: RevenueSignalConnectorManifest = {
  approvalGate: {
    humanApprovalRequired: true,
    requiredConfirmation: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
    status: "Required"
  },
  blockedExternalActions: [],
  credentialEnvVars: [],
  endpointTemplates: ["Operator-uploaded CSV or JSON payload reviewed before ingestion"],
  externalExecution: false,
  id: "readonly_signal_connector:commerce:etsy:store_1:product_1",
  lane: "commerce",
  provider: "etsy",
  providerContacted: false,
  providerName: "Etsy",
  readinessScore: 91,
  readOnlyScopes: [{ reason: "Read sales evidence only.", scope: "transactions:read" }],
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

const pendingApprovalManifest = {
  ...manifest,
  id: "readonly_signal_connector:commerce:etsy:store_2:product_2",
  target: {
    ...manifest.target,
    productId: "product_2",
    storeId: "store_2",
    storeName: "Review Forge"
  }
};

const signalApprovalPlan = {
  approvalQueue: [{
    externalExecution: false,
    manifestId: manifest.id,
    sampleSignals: 1
  }],
  approvals: [{
    externalExecution: false,
    id: "approval_2",
    manifest: pendingApprovalManifest,
    manifestId: pendingApprovalManifest.id,
    providerContacted: false,
    status: "pending_review",
    storeId: "store_2"
  }, {
    externalExecution: false,
    id: "approval_1",
    manifest,
    manifestId: manifest.id,
    providerContacted: false,
    status: "approved",
    storeId: "store_1"
  }],
  blockedExternalActions: ["No connector writes."],
  connectorPlan: {
    manifests: [manifest, pendingApprovalManifest]
  },
  importQueue: [{
    approvalId: "approval_1",
    sampleSignals: 1
  }]
} as unknown as RevenueSignalConnectorApprovalPlan;

const signalImportHandoffPlan = {
  blockedExternalActions: ["No live imports."],
  readyHandoffs: [{
    approvalId: "approval_1",
    externalExecution: false,
    importJobId: "signal_import_job_1",
    providerContacted: false,
    sampleSignals: 1
  }]
} as unknown as RevenueSignalImportHandoffPlan;

const commandPlan = {
  blockedExternalActions: ["No provider execution."],
  commandActions: []
} as unknown as PortfolioCommandCenterPlan;

function checklistPlan(items: RevenueLaunchChecklistItem[]): RevenueLaunchChecklistPlan {
  return {
    auditEvents: [],
    blockedExternalActions: ["No browser stealth or proxy automation."],
    externalExecution: false,
    generatedAt: "2026-06-02T12:30:00.000Z",
    items,
    mode: "Internal Revenue Launch Checklist",
    options: {
      includeCompleted: true,
      maxItems: 25,
      minPriorityScore: 0,
      windowDays: 30
    },
    providerContacted: false,
    stageCounts: {
      blocked: 0,
      complete: 0,
      missing: 0,
      ready: items.length,
      watch: 0
    },
    summary: `${items.length} checklist items.`,
    totals: {
      approvedProducts: 0,
      blockedItems: 0,
      commandActions: 0,
      completedItems: 0,
      connectorApprovalQueue: 0,
      estimatedDraftProfit: 0,
      importHandoffsReady: 1,
      importJobs: 1,
      items: items.length,
      killAssets: 0,
      listingReadyProducts: 0,
      netProfit: 0,
      opportunities: items.length,
      pendingConnectorApprovals: 1,
      pauseAssets: 0,
      productDrafts: 0,
      readyItems: items.length,
      revenue: 0,
      scaleAssets: 0,
      scoredAssets: 0,
      signalEvidenceItems: 0,
      stores: items.length,
      watchAssets: 0
    }
  };
}

describe("Revenue Launch Checklist Action Bridge", () => {
  it("maps ready checklist work to scoped internal dispatch actions", () => {
    const plan = buildRevenueLaunchChecklistActionBridgePlan({
      checklistPlan: checklistPlan([
        checklistItem({
          nextAction: "queue_connector_approval",
          storeId: "store_1",
          storeName: "Signal Forge"
        }),
        checklistItem({
          nextAction: "ingest_import_handoff",
          priorityScore: 90,
          storeId: "store_1",
          storeName: "Signal Forge"
        })
      ]),
      commandPlan,
      signalApprovalPlan,
      signalImportHandoffPlan
    });

    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.readyActions).toBe(2);
    expect(plan.blockedExternalActions.join(" ")).toContain("fingerprint");

    const handoff = plan.actions.find((action) => action.dispatchKind === "signal_import_handoff");
    expect(handoff?.status).toBe("ready");
    expect(handoff?.payload.importJobIds).toEqual(["signal_import_job_1"]);
    expect(handoff?.endpoint).toBe("/merch/revenue-engine/signal-connectors/import-handoff/apply");

    const connector = plan.actions.find((action) => action.dispatchKind === "signal_connector_approval");
    expect(connector?.payload.manifestIds).toEqual([manifest.id]);
  });

  it("keeps connector review blocked for explicit operator decision", () => {
    const plan = buildRevenueLaunchChecklistActionBridgePlan({
      checklistPlan: checklistPlan([
        checklistItem({
          nextAction: "review_connector_approval",
          storeId: "store_2",
          storeName: "Review Forge"
        })
      ]),
      commandPlan,
      signalApprovalPlan,
      signalImportHandoffPlan
    });
    const [action] = plan.actions;

    expect(action.status).toBe("blocked");
    expect(action.dispatchKind).toBe("manual_review");
    expect(action.payload.pendingApprovalIds).toEqual(["approval_2"]);
    expect(selectRevenueLaunchChecklistBridgeActions(plan)).toEqual([]);
    expect(selectRevenueLaunchChecklistBridgeActions(plan, [action.actionId])).toEqual([action]);
  });

  it("maps product-level asset score pressure to matching portfolio commands", () => {
    const productCommandPlan = {
      blockedExternalActions: ["No provider execution."],
      commandActions: [{
        action: "pause",
        approvalGate: {
          externalExecutionLocked: true,
          humanApprovalRequired: true,
          status: "Required"
        },
        blockedExternalActions: [],
        commandHash: "product:product_1:pause:needs_revision",
        expectedInternalEffect: "Record the command and update the internal product status to Needs Revision.",
        externalExecution: false,
        priority: 12,
        providerContacted: false,
        reason: "Product score recommends pause before launch work continues.",
        recommendedStatus: "Needs Revision",
        riskLevel: "medium",
        sourceModule: "revenue_asset_portfolio",
        targetId: "product_1",
        targetName: "Weak Tee",
        targetType: "product"
      }]
    } as unknown as PortfolioCommandCenterPlan;
    const plan = buildRevenueLaunchChecklistActionBridgePlan({
      checklistPlan: checklistPlan([
        checklistItem({
          assetSignal: {
            assetId: "product_1",
            assetName: "Weak Tee",
            assetType: "product",
            economicsScore: 8,
            finalRank: 24,
            nextInternalState: "Needs Revision",
            readinessScore: 22,
            reason: "Weak product should pause before launch.",
            recommendation: "pause",
            riskPenalty: 10,
            scoreBand: "critical",
            velocity: -3
          },
          nextAction: "apply_portfolio_commands",
          storeId: "store_1",
          storeName: "Signal Forge"
        })
      ]),
      commandPlan: productCommandPlan,
      signalApprovalPlan,
      signalImportHandoffPlan
    });

    const action = plan.actions[0];

    expect(action.status).toBe("ready");
    expect(action.dispatchKind).toBe("portfolio_command");
    expect(action.payload.commandHashes).toEqual(["product:product_1:pause:needs_revision"]);
    expect(action.payload.assetRecommendation).toBe("pause");
  });
});
