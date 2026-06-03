import { describe, expect, it } from "vitest";
import {
  buildRevenueSignalImportHandoffPlan,
  mergeRevenueSignalImportJobPayloads,
  revenueSignalImportHandoffConfirmation,
  selectRevenueSignalImportJobsForHandoff
} from "../src/services/revenueSignalImportHandoff.js";
import type { RevenueSignalImportJobSnapshot } from "../src/services/revenueSignalConnectorApprovals.js";

const readyJob: RevenueSignalImportJobSnapshot = {
  approvalId: "approval_1",
  auditLogId: "audit_import_queue",
  completedAt: null,
  createdAt: "2026-06-02T12:00:00.000Z",
  externalExecution: false,
  handoffAuditLogId: null,
  id: "signal_import_job_1",
  intakeResult: null,
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
      storeId: "store_1",
      unitsSold: 8,
      visits: 320
    }]
  },
  signalPreview: {} as RevenueSignalImportJobSnapshot["signalPreview"],
  status: "queued_review",
  transformTarget: "revenue_performance_snapshot",
  updatedAt: "2026-06-02T12:00:00.000Z"
};

const completedJob: RevenueSignalImportJobSnapshot = {
  ...readyJob,
  completedAt: "2026-06-02T12:15:00.000Z",
  handoffAuditLogId: "audit_handoff",
  id: "signal_import_job_2",
  intakeResult: {
    revenueSnapshotsCreated: 1,
    signalIntakeAuditLogId: "audit_signal_intake"
  },
  status: "completed"
};

describe("Revenue Signal Import Handoff", () => {
  it("prepares queued read-only import jobs for internal Signal Intake handoff", () => {
    const plan = buildRevenueSignalImportHandoffPlan({
      generatedAt: "2026-06-02T12:30:00.000Z",
      importJobs: [readyJob, completedJob],
      options: {
        includeArchived: false,
        maxJobs: 25,
        maxSignals: 100,
        windowDays: 30
      }
    });

    expect(revenueSignalImportHandoffConfirmation).toBe("INGEST QUEUED READONLY SIGNAL IMPORT JOBS");
    expect(plan.mode).toBe("Internal Read-Only Signal Import Handoff");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.readyHandoffs).toHaveLength(1);
    expect(plan.blockedHandoffs).toHaveLength(1);
    expect(plan.blockedHandoffs[0].blocker).toContain("already completed");
    expect(plan.signalIntakePreview.totals.commerceSignals).toBe(1);
    expect(plan.totals.completedJobs).toBe(1);
    expect(selectRevenueSignalImportJobsForHandoff(plan)).toEqual([readyJob]);
    expect(selectRevenueSignalImportJobsForHandoff(plan, [completedJob.id])).toEqual([]);
  });

  it("caps merged staged payloads by maxSignals", () => {
    const payload = mergeRevenueSignalImportJobPayloads([readyJob, {
      ...readyJob,
      id: "signal_import_job_3"
    }], 1);

    expect(payload.commerceSignals).toHaveLength(1);
  });
});
