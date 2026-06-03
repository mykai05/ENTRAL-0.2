"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, DatabaseZap, RefreshCcw, ShieldX, UploadCloud } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  type RevenueSignalConnectorApprovalApplyResponse,
  type RevenueSignalConnectorApprovalPlan,
  type RevenueSignalConnectorApprovalRecord,
  type RevenueSignalConnectorApprovalResponse,
  type RevenueSignalConnectorApprovalReviewResponse,
  type RevenueSignalImportJobApplyResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueSignalConnectorApprovalPanelProps = {
  autoLoad?: boolean;
  onApplied?: () => Promise<void> | void;
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

function signalCount(approval: RevenueSignalConnectorApprovalRecord) {
  return (approval.samplePayload?.commerceSignals?.length ?? 0)
    + (approval.samplePayload?.contentSignals?.length ?? 0)
    + (approval.samplePayload?.paymentSignals?.length ?? 0);
}

export function RevenueSignalConnectorApprovalPanel({ autoLoad = false, onApplied }: RevenueSignalConnectorApprovalPanelProps) {
  const [plan, setPlan] = useState<RevenueSignalConnectorApprovalPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<"approve" | "import" | "load" | "queue" | "reject" | null>(null);

  const pendingApproval = useMemo(() => plan?.approvals.find((approval) => approval.status === "pending_review") ?? null, [plan]);
  const importApprovalIds = useMemo(() => plan?.importQueue.map((item) => item.approvalId) ?? [], [plan]);

  const loadPlan = useCallback(async () => {
    setBusyAction("load");
    setError("");

    try {
      const response = await apiFetch<RevenueSignalConnectorApprovalResponse>("/merch/revenue-engine/signal-connectors/approvals");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.pendingApprovals} pending approval${response.plan.totals.pendingApprovals === 1 ? "" : "s"} and ${response.plan.totals.importQueue} import job${response.plan.totals.importQueue === 1 ? "" : "s"} ready.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal connector approval check failed.");
    } finally {
      setBusyAction(null);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void loadPlan();
    }
  }, [autoLoad, loadPlan]);

  async function queueApprovals() {
    setBusyAction("queue");
    setError("");

    try {
      const response = await apiFetch<RevenueSignalConnectorApprovalApplyResponse>("/merch/revenue-engine/signal-connectors/approvals/apply", {
        json: {
          confirm: "QUEUE READONLY SIGNAL CONNECTOR APPROVALS",
          dryRun: false,
          manifestIds: plan?.approvalQueue.map((item) => item.manifestId) ?? [],
          note: "Dashboard queued read-only connector approval records."
        },
        method: "POST"
      });
      setPlan(response.plan);
      setMessage(`${response.applied.queuedApprovals} approval record${response.applied.queuedApprovals === 1 ? "" : "s"} queued. No providers contacted.`);
      await onApplied?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal connector approval queue failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function reviewPending(action: "approve" | "reject") {
    if (!pendingApproval) return;

    setBusyAction(action);
    setError("");

    try {
      const response = await apiFetch<RevenueSignalConnectorApprovalReviewResponse>(`/merch/revenue-engine/signal-connectors/approvals/${pendingApproval.id}/review`, {
        json: {
          action,
          confirm: action === "approve" ? "APPROVE READONLY SIGNAL CONNECTOR" : "REJECT READONLY SIGNAL CONNECTOR",
          note: action === "approve"
            ? "Dashboard approved read-only connector record for import-job queueing."
            : "Dashboard rejected read-only connector record."
        },
        method: "POST"
      });
      setPlan(response.plan);
      setMessage(`${label(response.applied.reviewAction)}d connector approval ${response.applied.approvalId}.`);
      await onApplied?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal connector approval review failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function queueImportJobs() {
    setBusyAction("import");
    setError("");

    try {
      const response = await apiFetch<RevenueSignalImportJobApplyResponse>("/merch/revenue-engine/signal-connectors/import-jobs/apply", {
        json: {
          approvalIds: importApprovalIds,
          confirm: "QUEUE READONLY SIGNAL IMPORT JOBS",
          dryRun: false,
          note: "Dashboard queued approved read-only connector payloads as import jobs."
        },
        method: "POST"
      });
      setPlan(response.plan);
      setMessage(`${response.applied.importJobsQueued} import job${response.applied.importJobsQueued === 1 ? "" : "s"} queued with ${response.applied.sampleSignalsQueued} staged signal${response.applied.sampleSignalsQueued === 1 ? "" : "s"}.`);
      await onApplied?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal connector import-job queue failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="automation-list" aria-label="Signal Connector Approval Center">
      <header>
        <div>
          <h2>Connector Approvals</h2>
          <p>Durable review gates and import jobs for read-only signal connectors.</p>
        </div>
        <ClipboardList aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={busyAction === "load"}>
          <RefreshCcw aria-hidden="true" size={18} className={busyAction === "load" ? "spin" : ""} />
          {busyAction === "load" ? "Loading..." : "Load approvals"}
        </Button>
        <Button type="button" onClick={() => void queueApprovals()} disabled={!plan || plan.approvalQueue.length === 0 || busyAction === "queue"}>
          <ClipboardList aria-hidden="true" size={18} />
          {busyAction === "queue" ? "Queuing..." : "Queue approvals"}
        </Button>
        <Button type="button" onClick={() => void reviewPending("approve")} disabled={!pendingApproval || busyAction === "approve"}>
          <CheckCircle2 aria-hidden="true" size={18} />
          {busyAction === "approve" ? "Approving..." : "Approve next"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void reviewPending("reject")} disabled={!pendingApproval || busyAction === "reject"}>
          <ShieldX aria-hidden="true" size={18} />
          {busyAction === "reject" ? "Rejecting..." : "Reject next"}
        </Button>
        <Button type="button" onClick={() => void queueImportJobs()} disabled={!plan || importApprovalIds.length === 0 || busyAction === "import"}>
          <UploadCloud aria-hidden="true" size={18} />
          {busyAction === "import" ? "Queuing..." : "Queue imports"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Signal connector approval result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Approval Queue</dt>
              <dd>{plan.totals.approvalQueue}</dd>
            </div>
            <div>
              <dt>Pending</dt>
              <dd>{plan.totals.pendingApprovals}</dd>
            </div>
            <div>
              <dt>Approved</dt>
              <dd>{plan.totals.approvedApprovals}</dd>
            </div>
            <div>
              <dt>Import Queue</dt>
              <dd>{plan.totals.importQueue}</dd>
            </div>
            <div>
              <dt>Import Jobs</dt>
              <dd>{plan.totals.importJobs}</dd>
            </div>
            <div>
              <dt>Signals</dt>
              <dd>{plan.totals.sampleSignalsQueued}</dd>
            </div>
          </dl>

          <section className="revenue-engine-list" aria-label="Connector approval records">
            <h3>Approval Records</h3>
            {plan.approvals.length > 0 ? plan.approvals.slice(0, 6).map((approval) => (
              <article key={approval.id}>
                <span>{label(approval.status)} / {approval.providerName} / {approval.readinessScore}/100</span>
                <strong>{approval.manifest.title}</strong>
                <p>{approval.manifest.summary}</p>
                <small>{label(approval.lane)} / {signalCount(approval)} staged signal{signalCount(approval) === 1 ? "" : "s"} / audit {approval.reviewAuditLogId ?? approval.requestAuditLogId ?? "pending"}</small>
              </article>
            )) : <p className="revenue-engine-clear">No connector approval records have been queued.</p>}
          </section>

          <section className="revenue-engine-list" aria-label="Read-only import jobs">
            <h3>Import Jobs</h3>
            {plan.importJobs.length > 0 ? plan.importJobs.slice(0, 4).map((job) => (
              <article key={job.id}>
                <span>{label(job.status)} / {label(job.lane)} / {job.provider}</span>
                <strong>{job.manifestId}</strong>
                <p>{job.signalPreview.summary}</p>
              </article>
            )) : <p className="revenue-engine-clear">No read-only import jobs are queued.</p>}
          </section>

          <div className="revenue-engine-blocked" aria-label="Signal connector approval scope boundary">
            <DatabaseZap aria-hidden="true" size={18} />
            <span>Approval and import records only. No provider, browser, payment, upload, proxy, or write-scope execution.</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
