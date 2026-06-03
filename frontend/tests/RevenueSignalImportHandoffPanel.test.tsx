import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueSignalImportHandoffPanel } from "../components/RevenueSignalImportHandoffPanel";
import { apiFetch } from "../lib/api";
import type { RevenueSignalImportHandoffPlan, SignalIntakePlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const signalIntakePreview: SignalIntakePlan = {
  auditEvents: ["Signal Intake Center normalized approved read-only signals."],
  blockedExternalActions: ["No provider, browser, proxy, upload, payout, or write-scope execution."],
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  lanes: [{
    count: 1,
    externalExecution: false,
    lane: "commerce",
    providerContacted: false,
    riskLevel: "low",
    summary: "Commerce signals normalize into revenue performance snapshots."
  }],
  mode: "Internal Signal Intake Center",
  normalized: {
    commerceSnapshots: [{
      grossRevenue: 240,
      id: "signal_commerce_store_1_1780401600000_0",
      netProfit: 240,
      notes: null,
      periodEnd: "2026-06-02T12:00:00.000Z",
      periodStart: "2026-05-26T12:00:00.000Z",
      productId: null,
      source: "etsy",
      storeId: "store_1"
    }],
    contentSnapshots: [],
    paymentReconciliationDrafts: []
  },
  options: {
    includeSamplePayloads: false,
    maxSignals: 100,
    windowDays: 30
  },
  providerContacted: false,
  readiness: {
    contentBriefsAvailable: 0,
    productsAvailable: 1,
    storesAvailable: 1
  },
  samplePayloads: null,
  summary: "1 approved read-only signal staged.",
  totals: {
    commerceSignals: 1,
    contentSignals: 0,
    estimatedNetProfit: 240,
    paymentSignals: 0,
    projectedAvailableBalance: 0,
    projectedContentRevenue: 0,
    projectedGrossRevenue: 240,
    signals: 1
  }
};

function plan(stage: "completed" | "ready"): RevenueSignalImportHandoffPlan {
  return {
    auditEvents: ["Queued read-only signal import jobs were evaluated."],
    blockedExternalActions: ["No provider, browser, proxy, upload, payout, or write-scope execution."],
    blockedHandoffs: stage === "completed" ? [{
      approvalId: "approval_1",
      blocker: "Import job has already completed Signal Intake handoff.",
      externalExecution: false,
      importJobId: "signal_import_job_1",
      providerContacted: false,
      sampleSignals: 1,
      status: "completed"
    }] : [],
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    importJobs: [{
      approvalId: "approval_1",
      auditLogId: "audit_import",
      completedAt: stage === "completed" ? "2026-06-02T12:15:00.000Z" : null,
      createdAt: "2026-06-02T12:05:00.000Z",
      externalExecution: false,
      handoffAuditLogId: stage === "completed" ? "audit_handoff" : null,
      id: "signal_import_job_1",
      intakeResult: stage === "completed" ? { revenueSnapshotsCreated: 1 } : null,
      lane: "commerce",
      manifestId: "readonly_signal_connector:commerce:etsy:store_1:product_1",
      provider: "etsy",
      providerContacted: false,
      samplePayload: {
        commerceSignals: [{
          grossRevenue: 240,
          periodEnd: "2026-06-02T12:00:00.000Z",
          periodStart: "2026-05-26T12:00:00.000Z",
          source: "etsy",
          storeId: "store_1"
        }]
      },
      signalPreview: signalIntakePreview,
      status: stage === "completed" ? "completed" : "queued_review",
      transformTarget: "revenue_performance_snapshot",
      updatedAt: "2026-06-02T12:05:00.000Z"
    }],
    mode: "Internal Read-Only Signal Import Handoff",
    options: {
      includeArchived: false,
      maxJobs: 25,
      maxSignals: 100,
      windowDays: 30
    },
    providerContacted: false,
    readyHandoffs: stage === "ready" ? [{
      action: "ingest_queued_readonly_signals",
      approvalId: "approval_1",
      externalExecution: false,
      importJobId: "signal_import_job_1",
      lane: "commerce",
      manifestId: "readonly_signal_connector:commerce:etsy:store_1:product_1",
      priority: 20,
      provider: "etsy",
      providerContacted: false,
      sampleSignals: 1,
      summary: "etsy commerce import job signal_import_job_1 can hand off 1 stored signal into Signal Intake."
    }] : [],
    signalIntakePreview,
    stagedPayload: {
      commerceSignals: signalIntakePreview.normalized.commerceSnapshots
    },
    summary: stage === "ready"
      ? "1 import job can hand off 1 stored signal into Signal Intake; 0 jobs remain blocked or completed."
      : "0 import jobs can hand off 0 stored signals into Signal Intake; 1 job remains blocked or completed.",
    totals: {
      blockedJobs: stage === "completed" ? 1 : 0,
      completedJobs: stage === "completed" ? 1 : 0,
      contentSignals: 0,
      handoffSignals: stage === "ready" ? 1 : 0,
      importJobs: 1,
      paymentSignals: 0,
      readyJobs: stage === "ready" ? 1 : 0,
      revenueSignals: stage === "ready" ? 1 : 0
    }
  };
}

describe("RevenueSignalImportHandoffPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads, previews, and ingests queued read-only import jobs", async () => {
    const onApplied = vi.fn().mockResolvedValue(undefined);

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: plan("ready") })
      .mockResolvedValueOnce({
        handoff: {
          auditLogId: null,
          contentSnapshotsCreated: 0,
          dryRun: true,
          externalExecution: false,
          importJobIds: ["signal_import_job_1"],
          jobsCompleted: 0,
          paymentReconciliationReportId: null,
          paymentSignalsRecorded: 0,
          providerContacted: false,
          revenueSnapshotsCreated: 1,
          sampleSignalsIngested: 1,
          signalIntakeAuditLogId: null,
          summary: "1 read-only import job would hand off 1 stored signal into Signal Intake."
        },
        plan: plan("ready"),
        signalIntakePlan: signalIntakePreview
      })
      .mockResolvedValueOnce({
        handoff: {
          auditLogId: "audit_handoff",
          contentSnapshotsCreated: 0,
          dryRun: false,
          externalExecution: false,
          importJobIds: ["signal_import_job_1"],
          jobsCompleted: 1,
          paymentReconciliationReportId: null,
          paymentSignalsRecorded: 0,
          providerContacted: false,
          revenueSnapshotsCreated: 1,
          sampleSignalsIngested: 1,
          signalIntakeAuditLogId: "audit_signal_intake",
          summary: "1 read-only signal import job completed internal Signal Intake handoff."
        },
        plan: plan("completed"),
        signalIntakePlan: signalIntakePreview
      });

    render(<RevenueSignalImportHandoffPanel onApplied={onApplied} />);

    await userEvent.click(screen.getByRole("button", { name: /load handoff/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors/import-handoff"));
    expect(await screen.findByText("1 import job ready with 1 stored signal.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview handoff/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors/import-handoff/apply", {
      json: {
        confirm: "INGEST QUEUED READONLY SIGNAL IMPORT JOBS",
        dryRun: true,
        importJobIds: ["signal_import_job_1"],
        note: "Dashboard previewed queued read-only signal import handoff."
      },
      method: "POST"
    }));
    expect(await screen.findByText("Preview ready: 1 stored signal staged.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /ingest queued/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors/import-handoff/apply", {
      json: {
        confirm: "INGEST QUEUED READONLY SIGNAL IMPORT JOBS",
        dryRun: false,
        importJobIds: ["signal_import_job_1"],
        note: "Dashboard ingested queued read-only signal import jobs into internal Signal Intake."
      },
      method: "POST"
    }));
    expect(await screen.findByText("Handoff complete: 1 job, 1 revenue, 0 content, and 0 payment signals recorded.")).toBeInTheDocument();
    expect(screen.getByText(/Stored sample payloads only/)).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalledTimes(1);
  });
});
