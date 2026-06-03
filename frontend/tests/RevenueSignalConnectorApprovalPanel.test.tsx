import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueSignalConnectorApprovalPanel } from "../components/RevenueSignalConnectorApprovalPanel";
import { apiFetch } from "../lib/api";
import type {
  RevenueSignalConnectorApprovalPlan,
  RevenueSignalConnectorApprovalRecord,
  RevenueSignalConnectorManifest,
  SignalIntakePlan
} from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const signalPreview: SignalIntakePlan = {
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

const manifest: RevenueSignalConnectorManifest = {
  approvalGate: {
    humanApprovalRequired: true,
    requiredConfirmation: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
    status: "Required"
  },
  blockedExternalActions: ["Calling marketplace APIs"],
  credentialEnvVars: ["ETSY_READONLY_CLIENT_ID"],
  endpointTemplates: ["GET /v3/application/shops/{shop_id}/receipts"],
  externalExecution: false,
  id: "readonly_signal_connector:commerce:etsy:store_1:product_1",
  lane: "commerce",
  provider: "etsy",
  providerContacted: false,
  providerName: "Etsy",
  readinessScore: 82,
  readOnlyScopes: [{
    reason: "Read order totals.",
    scope: "orders:read"
  }],
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
  summary: "Etsy read-only order, listing, and traffic metrics can feed the Performance Velocity Ledger for Signal Forge.",
  target: {
    contentBriefId: null,
    productId: "product_1",
    storeId: "store_1",
    storeName: "Signal Forge"
  },
  title: "Signal Forge commerce metrics",
  transformTarget: "revenue_performance_snapshot",
  writeScopes: []
};

const connectorPlan: RevenueSignalConnectorApprovalPlan["connectorPlan"] = {
  auditEvents: ["Read-only signal connector manifests were prepared."],
  blockedExternalActions: ["No provider, browser, proxy, upload, payout, or write-scope execution."],
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  manifests: [manifest],
  mode: "Internal Read-Only Signal Connector Center",
  options: {
    includeCommerce: true,
    includeContent: true,
    includePayments: true,
    includeSamplePayloads: true,
    maxConnectors: 18,
    onlyReady: false,
    windowDays: 30
  },
  providerContacted: false,
  sampleSignalBatch: manifest.samplePayload,
  signalIntakePreview: signalPreview,
  statusCounts: {
    disabled: 0,
    missing_inputs: 0,
    ready_for_approval: 1
  },
  summary: "1 read-only signal connector manifest prepared.",
  totals: {
    commerceConnectors: 1,
    connectors: 1,
    contentConnectors: 0,
    disabledConnectors: 0,
    missingInputConnectors: 0,
    paymentConnectors: 0,
    readyConnectors: 1,
    sampleCommerceSignals: 1,
    sampleContentSignals: 0,
    samplePaymentSignals: 0
  }
};

function approval(status: string): RevenueSignalConnectorApprovalRecord {
  return {
    blockedActions: manifest.blockedExternalActions,
    contentBriefId: null,
    createdAt: "2026-06-02T12:01:00.000Z",
    credentialEnvVars: manifest.credentialEnvVars,
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
    readinessScore: 82,
    requestAuditLogId: "audit_queue",
    reviewAuditLogId: status === "approved" ? "audit_review" : null,
    reviewedAt: status === "approved" ? "2026-06-02T12:05:00.000Z" : null,
    reviewedById: status === "approved" ? "user_1" : null,
    reviewNote: null,
    riskLevel: "low",
    samplePayload: manifest.samplePayload,
    signalPreview,
    status,
    storeId: "store_1",
    storeName: "Signal Forge",
    transformTarget: "revenue_performance_snapshot",
    updatedAt: "2026-06-02T12:05:00.000Z"
  };
}

function planFor(stage: "approved" | "empty" | "imported" | "pending"): RevenueSignalConnectorApprovalPlan {
  const approvals = stage === "empty" ? [] : [approval(stage === "imported" ? "import_queued" : stage === "approved" ? "approved" : "pending_review")];
  const importQueue = stage === "approved" ? [{
    action: "queue_readonly_import_job" as const,
    approvalId: "approval_1",
    externalExecution: false as const,
    manifestId: manifest.id,
    priority: 20,
    provider: "etsy" as const,
    providerContacted: false as const,
    sampleSignals: 1,
    summary: "Etsy manifest can create a queued read-only import job."
  }] : [];
  const importJobs = stage === "imported" ? [{
    approvalId: "approval_1",
    auditLogId: "audit_import",
    completedAt: null,
    createdAt: "2026-06-02T12:10:00.000Z",
    externalExecution: false as const,
    handoffAuditLogId: null,
    id: "signal_import_job_1",
    intakeResult: null,
    lane: "commerce" as const,
    manifestId: manifest.id,
    provider: "etsy" as const,
    providerContacted: false as const,
    samplePayload: manifest.samplePayload,
    signalPreview,
    status: "queued_review",
    transformTarget: "revenue_performance_snapshot" as const,
    updatedAt: "2026-06-02T12:10:00.000Z"
  }] : [];

  return {
    approvalQueue: stage === "empty" ? [{
      action: "queue_approval",
      externalExecution: false,
      manifestId: manifest.id,
      priority: 20,
      provider: "etsy",
      providerContacted: false,
      riskLevel: "low",
      sampleSignals: 1,
      summary: "Signal Forge commerce metrics is ready for internal read-only connector approval.",
      targetName: "Signal Forge"
    }] : [],
    approvals,
    auditEvents: ["Read-only connector manifests were compared against durable approval records."],
    blockedExternalActions: ["No provider, browser, proxy, upload, payout, or write-scope execution."],
    connectorPlan,
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    importJobs,
    importQueue,
    mode: "Internal Read-Only Signal Connector Approval Center",
    providerContacted: false,
    statusCounts: {
      approvals: {
        approved: stage === "approved" ? 1 : 0,
        archived: 0,
        import_queued: stage === "imported" ? 1 : 0,
        pending_review: stage === "pending" ? 1 : 0,
        rejected: 0
      },
      importJobs: {
        archived: 0,
        blocked_review: 0,
        completed: 0,
        queued_review: importJobs.length,
        ready_for_signal_intake: 0
      }
    },
    summary: "Signal connector approval center ready.",
    totals: {
      approvedApprovals: stage === "approved" ? 1 : 0,
      approvalQueue: stage === "empty" ? 1 : 0,
      importJobs: importJobs.length,
      importQueue: importQueue.length,
      manifests: 1,
      pendingApprovals: stage === "pending" ? 1 : 0,
      readyManifests: 1,
      rejectedApprovals: 0,
      sampleSignalsQueued: importQueue.length
    }
  };
}

describe("RevenueSignalConnectorApprovalPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("queues approval records, approves the next record, and queues import jobs", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: planFor("empty") })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: "audit_queue",
          blockedManifestIds: [],
          dryRun: false,
          externalExecution: false,
          manifestIds: [manifest.id],
          providerContacted: false,
          queuedApprovalIds: ["approval_1"],
          queuedApprovals: 1,
          readyManifests: 1,
          skippedExistingManifestIds: [],
          summary: "1 approval queued."
        },
        plan: planFor("pending")
      })
      .mockResolvedValueOnce({
        applied: {
          approvalId: "approval_1",
          auditLogId: "audit_review",
          dryRun: false,
          externalExecution: false,
          fromStatus: "pending_review",
          manifestId: manifest.id,
          providerContacted: false,
          reviewAction: "approve",
          toStatus: "approved"
        },
        plan: planFor("approved")
      })
      .mockResolvedValueOnce({
        applied: {
          approvalIds: ["approval_1"],
          auditLogId: "audit_import",
          dryRun: false,
          externalExecution: false,
          importJobIds: ["signal_import_job_1"],
          importJobsQueued: 1,
          providerContacted: false,
          sampleSignalsQueued: 1,
          summary: "1 import job queued."
        },
        plan: planFor("imported")
      });

    render(<RevenueSignalConnectorApprovalPanel />);

    await userEvent.click(screen.getByRole("button", { name: /load approvals/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors/approvals"));
    expect(await screen.findByText("0 pending approvals and 0 import jobs ready.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /queue approvals/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors/approvals/apply", {
      json: {
        confirm: "QUEUE READONLY SIGNAL CONNECTOR APPROVALS",
        dryRun: false,
        manifestIds: [manifest.id],
        note: "Dashboard queued read-only connector approval records."
      },
      method: "POST"
    }));
    expect(await screen.findByText("1 approval record queued. No providers contacted.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /approve next/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors/approvals/approval_1/review", {
      json: {
        action: "approve",
        confirm: "APPROVE READONLY SIGNAL CONNECTOR",
        note: "Dashboard approved read-only connector record for import-job queueing."
      },
      method: "POST"
    }));
    expect(await screen.findByText("approved connector approval approval_1.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /queue imports/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors/import-jobs/apply", {
      json: {
        approvalIds: ["approval_1"],
        confirm: "QUEUE READONLY SIGNAL IMPORT JOBS",
        dryRun: false,
        note: "Dashboard queued approved read-only connector payloads as import jobs."
      },
      method: "POST"
    }));
    expect(await screen.findByText("1 import job queued with 1 staged signal.")).toBeInTheDocument();
    expect(screen.getByText(/Approval and import records only/)).toBeInTheDocument();
  });
});
