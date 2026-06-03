import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLaunchSprintPanel } from "../components/RevenueLaunchSprintPanel";
import { apiFetch } from "../lib/api";
import type { RevenueLaunchChecklistActionBridgePlan, RevenueLaunchChecklistPlan, RevenueLaunchSprintPlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const sprint: RevenueLaunchSprintPlan = {
  auditEvents: ["Sprint previewed ready bridge actions."],
  blockedExternalActions: ["No provider writes."],
  cycles: [{
    blockedActions: 0,
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
    manualReviewActions: [],
    readyActions: 1,
    scoreControlActions: 1,
    selectedActionIds: ["store_1:apply_portfolio_commands:portfolio_command"],
    selectedDispatchKinds: ["portfolio_command"],
    watchActions: 0
  }],
  externalExecution: false,
  factory: {
    auditLogId: null,
    businessName: "Sprint Forge",
    dryRun: true,
    externalExecution: false,
    opportunityId: null,
    productDraftsCreated: 5,
    providerContacted: false,
    skippedExistingProducts: 0,
    storeCreated: true,
    storeId: null
  },
  finalChecklist: {
    blockedItems: 0,
    importHandoffsReady: 0,
    items: 1,
    readyItems: 1,
    scoredAssets: 1,
    signalEvidenceItems: 0,
    summary: "One checklist item ready."
  },
  finalManualReviewActions: [],
  finalReadyActions: 1,
  generatedAt: "2026-06-02T12:00:00.000Z",
  mode: "Internal Revenue Launch Sprint",
  options: {
    includeCompleted: true,
    maxActions: 5,
    maxCycles: 4,
    maxItems: 25,
    minPriorityScore: 0,
    windowDays: 30
  },
  providerContacted: false,
  stopReason: "dry_run",
  summary: "Launch Sprint previewed 1 internal bridge action across 1 cycle.",
  totals: {
    actionsBlocked: 0,
    actionsDispatched: 0,
    actionsPreviewed: 1,
    actionsSelected: 1,
    actionsSkipped: 0,
    assetControlActionsSkipped: 0,
    assetControlRecordsCreated: 1,
    commandRecordsCreated: 1,
    cyclesRun: 1,
    factoryProductDraftsCreated: 5,
    factoryStoreCreated: 1,
    internalStatusUpdates: 1,
    manualReviewActions: 0,
    scoreControlActions: 1
  }
};

const bridge = {
  actions: [],
  totals: {
    readyActions: 0
  }
} as unknown as RevenueLaunchChecklistActionBridgePlan;

const checklist = {
  totals: {
    readyItems: 1
  }
} as unknown as RevenueLaunchChecklistPlan;

describe("RevenueLaunchSprintPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("previews and runs the internal launch sprint", async () => {
    const onApplied = vi.fn();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ bridge, checklist, sprint })
      .mockResolvedValueOnce({
        bridge,
        checklist,
        sprint: {
          ...sprint,
          cycles: [{
            ...sprint.cycles[0],
            dispatched: {
              ...sprint.cycles[0].dispatched!,
              actionsDispatched: 1,
              actionsPreviewed: 0,
              assetControlRecordsCreated: 1,
              commandRecordsCreated: 1,
              dryRun: false,
              internalStatusUpdates: 1,
              summary: "1 checklist bridge action dispatched internally."
            }
          }],
          stopReason: "manual_review_required",
          summary: "Launch Sprint dispatched 1 internal bridge action across 1 cycle; stop reason: manual review required.",
          totals: {
            ...sprint.totals,
            actionsDispatched: 1,
            actionsPreviewed: 0
          }
        }
      });

    render(<RevenueLaunchSprintPanel onApplied={onApplied} />);

    await userEvent.click(screen.getByRole("button", { name: /preview sprint/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-sprint", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RUN INTERNAL REVENUE LAUNCH SPRINT",
        dryRun: true,
        maxCycles: 4
      }),
      method: "POST"
    })));
    expect((await screen.findAllByText("Launch Sprint previewed 1 internal bridge action across 1 cycle.")).length).toBeGreaterThan(0);
    expect(screen.getByText(/portfolio command/)).toBeInTheDocument();
    expect(screen.getByText("Commands")).toBeInTheDocument();
    expect(screen.getByText("Ledger")).toBeInTheDocument();
    expect(screen.getByText(/commands 1 \/ ledger 1/)).toBeInTheDocument();
    expect(screen.getByText(/1 internal status update/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /run internal sprint/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-sprint", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RUN INTERNAL REVENUE LAUNCH SPRINT",
        dryRun: false
      }),
      method: "POST"
    })));
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect((await screen.findAllByText(/Launch Sprint dispatched 1 internal bridge action/)).length).toBeGreaterThan(0);
  });
});
