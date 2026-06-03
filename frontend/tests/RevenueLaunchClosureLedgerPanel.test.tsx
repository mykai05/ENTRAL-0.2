import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLaunchClosureLedgerPanel } from "../components/RevenueLaunchClosureLedgerPanel";
import { apiFetch } from "../lib/api";
import type { RevenueLaunchClosureLedgerPlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const plan: RevenueLaunchClosureLedgerPlan = {
  auditEvents: ["Launch closure ledger prepared internally."],
  blockedExternalActions: ["Provider writes remain locked.", "No browser or payment execution is authorized."],
  entries: [{
    blockers: [],
    closureScore: 88,
    expectedFirstWeekRevenue: {
      assumptions: [
        "1 locked request manifest staged for manual launch review.",
        "89/100 overall readiness score applied as launch confidence."
      ],
      conservative: 176,
      currency: "USD",
      target: 320,
      upside: 528
    },
    externalExecution: false,
    launchPack: {
      artifactSlots: 2,
      auditReady: true,
      manualSteps: 2,
      packStatus: "ready_for_manual_launch",
      requestManifests: 1,
      reviewGate: "Operator manual launch review"
    },
    manualReview: {
      approvedPacketId: "packet_1",
      handoffPacketAuditLogId: "audit_handoff",
      handoffPacketId: "handoff_1",
      required: true,
      state: "ready"
    },
    monitoringTriggers: [{
      blockedExternalActions: ["No provider, marketplace, social, payment, or browser write is authorized."],
      cadence: "24 hours after manual launch review",
      evidenceRequired: ["Manual revenue snapshot", "Units sold"],
      externalExecution: false,
      providerContacted: false,
      status: "queued_internal",
      trigger: "revenue_snapshot"
    }, {
      blockedExternalActions: ["No provider, marketplace, social, payment, or browser write is authorized."],
      cadence: "48 hours after manual launch review",
      evidenceRequired: ["Channel views", "Clicks"],
      externalExecution: false,
      providerContacted: false,
      status: "queued_internal",
      trigger: "content_signal"
    }, {
      blockedExternalActions: ["No provider, marketplace, social, payment, or browser write is authorized."],
      cadence: "Every 3 days inside the first 7-day window",
      evidenceRequired: ["Refunds", "Support notes"],
      externalExecution: false,
      providerContacted: false,
      status: "queued_internal",
      trigger: "refund_watch"
    }, {
      blockedExternalActions: ["No provider, marketplace, social, payment, or browser write is authorized."],
      cadence: "After first revenue evidence is entered",
      evidenceRequired: ["Net profit", "Available balance"],
      externalExecution: false,
      providerContacted: false,
      status: "queued_internal",
      trigger: "payout_governance"
    }, {
      blockedExternalActions: ["No provider, marketplace, social, payment, or browser write is authorized."],
      cadence: "End of first 7-day window",
      evidenceRequired: ["Revenue velocity", "Profit velocity"],
      externalExecution: false,
      providerContacted: false,
      status: "queued_internal",
      trigger: "scale_or_rotate_review"
    }],
    nextAction: "schedule_monitoring",
    performanceEvidence: {
      evidenceGrade: "usable",
      grossRevenue: 320,
      netProfit: 180,
      profitVelocity: 25.71,
      revenueVelocity: 45.71,
      snapshots: 2
    },
    priority: 108,
    providerContacted: false,
    readiness: {
      connectorReadinessScore: 86,
      launchReadinessScore: 90,
      overallScore: 89,
      providerReadinessScore: 88
    },
    riskLevel: "low",
    status: "monitoring_ready",
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "Signal Forge closure score 88/100 with $320.00 target first-week revenue."
  }],
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  mode: "Internal Launch Revenue Closure Ledger",
  options: {
    expectedOrderValue: 32,
    includeBlocked: true,
    maxEntries: 10,
    minClosureScore: 72,
    monitoringWindowDays: 7,
    targetFirstWeekRevenue: 250
  },
  providerContacted: false,
  queue: [{
    action: "schedule_monitoring",
    closureScore: 88,
    externalExecution: false,
    priority: 108,
    providerContacted: false,
    status: "monitoring_ready",
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "Signal Forge closure score 88/100 with $320.00 target first-week revenue."
  }],
  summary: "1 launch closure entry prepared; 1 ready for launch/monitoring, 0 need review, 0 blocked.",
  totals: {
    blockedEntries: 0,
    entries: 1,
    expectedFirstWeekRevenue: 320,
    monitoringReady: 1,
    needsReview: 0,
    readyForManualLaunch: 0,
    triggersQueued: 5
  }
};

describe("RevenueLaunchClosureLedgerPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads, previews, and records internal launch closure ledger entries", async () => {
    const onApplied = vi.fn();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: null,
          dryRun: true,
          entriesRecorded: 0,
          entriesSelected: 1,
          externalExecution: false,
          providerContacted: false,
          summary: "1 launch closure ledger entry would be recorded as an internal audit artifact.",
          triggersQueued: 5
        },
        plan
      })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: "audit_closure",
          dryRun: false,
          entriesRecorded: 1,
          entriesSelected: 1,
          externalExecution: false,
          providerContacted: false,
          summary: "1 launch closure ledger entry recorded as an internal audit artifact.",
          triggersQueued: 5
        },
        plan
      });

    render(<RevenueLaunchClosureLedgerPanel onApplied={onApplied} />);

    await userEvent.click(screen.getByRole("button", { name: /load ledger/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-closure-ledger"));
    expect(await screen.findByText("Internal Launch Revenue Closure Ledger")).toBeInTheDocument();
    expect(screen.getAllByText("Signal Forge").length).toBeGreaterThan(0);
    expect(screen.getByText(/\$320\.00 target \/ 5 triggers \/ 1 manifests/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview record/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-closure-ledger/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RECORD INTERNAL LAUNCH CLOSURE LEDGER",
        dryRun: true,
        storeIds: ["store_1"]
      }),
      method: "POST"
    })));
    expect(await screen.findByText("1 launch closure ledger entry would be recorded as an internal audit artifact.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record ledger/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-closure-ledger/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RECORD INTERNAL LAUNCH CLOSURE LEDGER",
        dryRun: false,
        storeIds: ["store_1"]
      }),
      method: "POST"
    })));
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("1 launch closure ledger entry recorded as an internal audit artifact.")).toBeInTheDocument();
  });
});
