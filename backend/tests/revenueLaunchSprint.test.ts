import { describe, expect, it } from "vitest";
import {
  buildRevenueLaunchSprintCycle,
  buildRevenueLaunchSprintPlan,
  selectRevenueLaunchSprintBridgeActions
} from "../src/services/revenueLaunchSprint.js";
import type { RevenueLaunchChecklistActionBridgePlan } from "../src/services/revenueLaunchChecklistActionBridge.js";
import type { RevenueLaunchChecklistPlan } from "../src/services/revenueLaunchChecklist.js";

const checklistPlan = {
  blockedExternalActions: ["No external writes."],
  summary: "One item ready.",
  totals: {
    blockedItems: 0,
    importHandoffsReady: 0,
    items: 1,
    readyItems: 1,
    scoredAssets: 0,
    signalEvidenceItems: 0
  }
} as unknown as RevenueLaunchChecklistPlan;

function bridgePlan(status: "blocked" | "ready"): RevenueLaunchChecklistActionBridgePlan {
  return {
    actions: [{
      actionId: `store_1:${status}`,
      blockedReason: status === "blocked" ? "Connector approval review requires explicit operator approval." : null,
      checklistAction: status === "blocked" ? "review_connector_approval" : "queue_connector_approval",
      checklistItemId: "store_1",
      confirmationRequired: "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS",
      dispatchKind: status === "blocked" ? "manual_review" : "signal_connector_approval",
      endpoint: status === "blocked" ? "/merch/revenue-engine/signal-connectors/approvals" : "/merch/revenue-engine/signal-connectors/approvals/apply",
      externalExecution: false,
      payload: {},
      priorityScore: 90,
      providerContacted: false,
      status,
      storeId: "store_1",
      storeName: "Signal Forge",
      summary: "Bridge action summary."
    }],
    auditEvents: [],
    blockedExternalActions: ["No provider writes."],
    checklist: {
      generatedAt: "2026-06-02T12:00:00.000Z",
      items: 1,
      readyItems: 1,
      summary: "Checklist summary."
    },
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    mode: "Internal Revenue Launch Checklist Action Bridge",
    options: {
      includeCompleted: true,
      maxActions: 5,
      maxItems: 25,
      minPriorityScore: 0,
      windowDays: 30
    },
    providerContacted: false,
    summary: "Bridge summary.",
    totals: {
      actions: 1,
      blockedActions: status === "blocked" ? 1 : 0,
      connectorApprovalActions: status === "ready" ? 1 : 0,
      importHandoffActions: 0,
      importJobActions: 0,
      launchPipelineActions: 0,
      listingOptimizationActions: 0,
      manualReviewActions: status === "blocked" ? 1 : 0,
      portfolioCommandActions: 0,
      readyActions: status === "ready" ? 1 : 0,
      storeSetupActions: 0,
      watchActions: 0
    }
  };
}

const options = {
  includeCompleted: true,
  maxActions: 5,
  maxCycles: 4,
  maxItems: 25,
  minPriorityScore: 0,
  windowDays: 30
};

describe("Revenue Launch Sprint", () => {
  it("summarizes dry-run sprint previews without external execution", () => {
    const bridge = bridgePlan("ready");
    const selectedActions = bridge.actions;
    const cycle = buildRevenueLaunchSprintCycle({
      bridgePlan: bridge,
      cycle: 1,
      dispatched: {
        actionsBlocked: 0,
        actionsDispatched: 0,
        actionsPreviewed: 1,
        actionsSelected: 1,
        actionsSkipped: 0,
        assetControlActionsSkipped: 0,
        assetControlRecordsCreated: 1,
        commandRecordsCreated: 1,
        dryRun: true,
        externalExecution: false,
        internalStatusUpdates: 1,
        providerContacted: false,
        summary: "1 checklist bridge action previewed."
      },
      selectedActions
    });
    const sprint = buildRevenueLaunchSprintPlan({
      bridgePlan: bridge,
      checklistPlan,
      cycles: [cycle],
      dryRun: true,
      options
    });

    expect(sprint.mode).toBe("Internal Revenue Launch Sprint");
    expect(sprint.stopReason).toBe("dry_run");
    expect(sprint.externalExecution).toBe(false);
    expect(sprint.providerContacted).toBe(false);
    expect(sprint.totals.actionsPreviewed).toBe(1);
    expect(sprint.totals.assetControlRecordsCreated).toBe(1);
    expect(sprint.totals.commandRecordsCreated).toBe(1);
    expect(sprint.totals.internalStatusUpdates).toBe(1);
    expect(sprint.blockedExternalActions.join(" ")).toContain("fingerprint");
  });

  it("stops at manual review when no ready bridge actions remain", () => {
    const bridge = bridgePlan("blocked");
    const cycle = buildRevenueLaunchSprintCycle({
      bridgePlan: bridge,
      cycle: 1,
      selectedActions: []
    });
    const sprint = buildRevenueLaunchSprintPlan({
      bridgePlan: bridge,
      checklistPlan,
      cycles: [cycle],
      dryRun: false,
      options
    });

    expect(sprint.stopReason).toBe("manual_review_required");
    expect(sprint.finalManualReviewActions).toHaveLength(1);
    expect(sprint.finalManualReviewActions[0].blockedReason).toContain("explicit operator approval");
  });

  it("selects score-control portfolio commands before connector dispatch", () => {
    const bridge = bridgePlan("ready");
    bridge.options.maxActions = 1;
    bridge.actions = [
      {
        ...bridge.actions[0],
        actionId: "store_1:queue_connector_approval:signal_connector_approval",
        dispatchKind: "signal_connector_approval",
        payload: {},
        priorityScore: 99
      },
      {
        ...bridge.actions[0],
        actionId: "store_1:apply_portfolio_commands:portfolio_command",
        checklistAction: "apply_portfolio_commands",
        dispatchKind: "portfolio_command",
        payload: {
          assetId: "product_1",
          assetRecommendation: "pause",
          assetType: "product",
          commandHashes: ["product:product_1:pause:Needs Revision"]
        },
        priorityScore: 50
      }
    ];
    bridge.totals.readyActions = 2;
    bridge.totals.portfolioCommandActions = 1;
    bridge.totals.connectorApprovalActions = 1;

    const selected = selectRevenueLaunchSprintBridgeActions(bridge);
    const cycle = buildRevenueLaunchSprintCycle({
      bridgePlan: bridge,
      cycle: 1,
      selectedActions: selected
    });

    expect(selected).toHaveLength(1);
    expect(selected[0].dispatchKind).toBe("portfolio_command");
    expect(selected[0].payload.assetRecommendation).toBe("pause");
    expect(cycle.scoreControlActions).toBe(1);
  });
});
