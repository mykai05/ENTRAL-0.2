import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLaunchChecklistPanel } from "../components/RevenueLaunchChecklistPanel";
import { apiFetch } from "../lib/api";
import type { RevenueLaunchChecklistActionBridgePlan, RevenueLaunchChecklistPlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const plan: RevenueLaunchChecklistPlan = {
  auditEvents: ["Checklist joined internal revenue plans."],
  blockedExternalActions: ["No provider, payout, upload, browser, proxy, stealth, fingerprint, or external write execution."],
  externalExecution: false,
  generatedAt: "2026-06-02T12:30:00.000Z",
  items: [{
    assetSignal: {
      assetId: "store_1",
      assetName: "Signal Forge",
      assetType: "store",
      economicsScore: 42,
      finalRank: 86,
      nextInternalState: null,
      readinessScore: 34,
      reason: "Signal Forge has strong launch economics and should scale through the internal launch path.",
      recommendation: "scale",
      riskPenalty: 0,
      scoreBand: "excellent",
      velocity: 18
    },
    blockers: [],
    businessName: "Signal Forge",
    commandActions: [{
      action: "prepare_launch",
      commandHash: "store:store_1:prepare_launch",
      expectedInternalEffect: "Record the growth command for internal queueing and later human approval.",
      priority: 30,
      riskLevel: "low",
      sourceModule: "revenue_engine"
    }],
    externalExecution: false,
    id: "store_1",
    incomeVelocityScore: 78,
    metrics: {
      approvedProducts: 2,
      commandActions: 1,
      completedHandoffs: 0,
      connectorApprovalQueue: 1,
      estimatedDraftProfit: 420,
      importHandoffsReady: 1,
      importJobs: 1,
      listingReadyProducts: 3,
      netProfit: 0,
      pendingConnectorApprovals: 0,
      performanceSnapshots: 0,
      scoredAssets: 1,
      productDrafts: 5,
      revenue: 0,
      signalEvidence: 0
    },
    nextAction: "ingest_import_handoff",
    nextActionLabel: "Ingest import handoff",
    opportunityId: "opportunity_1",
    opportunityStatus: "active",
    priorityScore: 91,
    providerContacted: false,
    readinessScore: 82,
    riskLevel: "low",
    stages: [{
      action: "seed_product_drafts",
      key: "drafts",
      score: 100,
      status: "complete",
      summary: "5 drafts, 3 listing-ready products."
    }, {
      action: "ingest_import_handoff",
      key: "import_handoff",
      score: 50,
      status: "ready",
      summary: "1 handoff ready."
    }, {
      action: "apply_portfolio_commands",
      key: "asset_scoring",
      score: 86,
      status: "ready",
      summary: "Revenue Engine recommends scale for Signal Forge at rank 86."
    }],
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "Signal Forge: Ingest import handoff. Priority 91, readiness 82, velocity 78."
  }],
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
    ready: 1,
    watch: 0
  },
  summary: "1 checklist item is ready for internal execution.",
  totals: {
    approvedProducts: 2,
    blockedItems: 0,
    commandActions: 1,
    completedItems: 0,
    connectorApprovalQueue: 1,
    estimatedDraftProfit: 420,
    importHandoffsReady: 1,
    importJobs: 1,
    items: 1,
    killAssets: 0,
    listingReadyProducts: 3,
    netProfit: 0,
    opportunities: 1,
    pendingConnectorApprovals: 0,
    pauseAssets: 0,
    productDrafts: 5,
    readyItems: 1,
    revenue: 0,
    scaleAssets: 1,
    scoredAssets: 1,
    signalEvidenceItems: 0,
    stores: 1,
    watchAssets: 0
  }
};

const bridgePlan: RevenueLaunchChecklistActionBridgePlan = {
  actions: [{
    actionId: "store_1:ingest_import_handoff:signal_import_handoff",
    blockedReason: null,
    checklistAction: "ingest_import_handoff",
    checklistItemId: "store_1",
    confirmationRequired: "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS",
    dispatchKind: "signal_import_handoff",
    endpoint: "/merch/revenue-engine/signal-connectors/import-handoff/apply",
    externalExecution: false,
    payload: {
      importJobIds: ["job_1"],
      sampleSignals: 3,
      storeId: "store_1"
    },
    priorityScore: 91,
    providerContacted: false,
    status: "ready",
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "1 queued read-only import job can hand off stored signals for Signal Forge."
  }, {
    actionId: "store_2:review_connector_approval:manual_review",
    blockedReason: "Connector approval review requires an explicit approve or reject decision in the approval center.",
    checklistAction: "review_connector_approval",
    checklistItemId: "store_2",
    confirmationRequired: "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS",
    dispatchKind: "manual_review",
    endpoint: "/merch/revenue-engine/signal-connectors/approvals",
    externalExecution: false,
    payload: {
      pendingApprovalIds: ["approval_1"],
      storeId: "store_2"
    },
    priorityScore: 73,
    providerContacted: false,
    status: "blocked",
    storeId: "store_2",
    storeName: "Review Forge",
    summary: "1 connector approval requires direct review for Review Forge."
  }],
  auditEvents: ["Ready bridge actions include only internal dispatch payloads."],
  blockedExternalActions: ["No provider writes."],
  checklist: {
    generatedAt: plan.generatedAt,
    items: 1,
    readyItems: 1,
    summary: plan.summary
  },
  externalExecution: false,
  generatedAt: "2026-06-02T12:31:00.000Z",
  mode: "Internal Revenue Launch Checklist Action Bridge",
  options: {
    includeCompleted: true,
    maxActions: 5,
    maxItems: 25,
    minPriorityScore: 0,
    windowDays: 30
  },
  providerContacted: false,
  summary: "1 checklist bridge action is ready for internal dispatch; 1 require direct review.",
  totals: {
    actions: 2,
    blockedActions: 1,
    connectorApprovalActions: 0,
    importHandoffActions: 1,
    importJobActions: 0,
    launchPipelineActions: 0,
    listingOptimizationActions: 0,
    manualReviewActions: 1,
    portfolioCommandActions: 0,
    readyActions: 1,
    storeSetupActions: 0,
    watchActions: 0
  }
};

describe("RevenueLaunchChecklistPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads and renders ranked internal launch work", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ plan });

    render(<RevenueLaunchChecklistPanel />);

    await userEvent.click(screen.getByRole("button", { name: /load checklist/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/launch-checklist"));
    expect(await screen.findByText("1 checklist item ready; 1 import handoff can move into Signal Intake.")).toBeInTheDocument();
    expect(screen.getByText("Internal Revenue Launch Checklist")).toBeInTheDocument();
    expect(screen.getAllByText("Signal Forge")).toHaveLength(2);
    expect(screen.getAllByText(/Ingest import handoff/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Asset score: scale \/ rank 86 \/ excellent \/ next no change/)).toBeInTheDocument();
    expect(screen.getByText(/Record the growth command/)).toBeInTheDocument();
    expect(screen.getByText(/No marketplace, provider, payout/)).toBeInTheDocument();
  });

  it("loads and previews the checklist action bridge", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan })
      .mockResolvedValueOnce({ checklist: plan, plan: bridgePlan })
      .mockResolvedValueOnce({
        bridge: bridgePlan,
        checklist: null,
        dispatched: {
          actionsBlocked: 0,
          actionsDispatched: 0,
          actionsPreviewed: 1,
          actionsSelected: 1,
          actionsSkipped: 0,
          dryRun: true,
          externalExecution: false,
          providerContacted: false,
          results: [{
            actionId: bridgePlan.actions[0].actionId,
            dispatchKind: "signal_import_handoff",
            externalExecution: false,
            providerContacted: false,
            result: {
              dryRun: true,
              externalExecution: false
            },
            status: "previewed"
          }],
          summary: "1 checklist bridge action previewed."
        }
      });

    render(<RevenueLaunchChecklistPanel />);

    await userEvent.click(screen.getByRole("button", { name: /load checklist/i }));
    await screen.findByText("Internal Revenue Launch Checklist");

    await userEvent.click(screen.getByRole("button", { name: /load bridge/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/launch-checklist/action-bridge"));
    expect(await screen.findByText("1 bridge action ready; 1 require direct review.")).toBeInTheDocument();
    expect(screen.getByText("Action Bridge")).toBeInTheDocument();
    expect(screen.getByText(/queued read-only import job/)).toBeInTheDocument();
    expect(screen.getByText(/requires an explicit approve or reject decision/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview dispatch/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-checklist/action-bridge/apply", {
      json: {
        confirm: "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS",
        dryRun: true
      },
      method: "POST"
    }));
    expect(await screen.findByText("1 checklist bridge action previewed.")).toBeInTheDocument();
  });
});
