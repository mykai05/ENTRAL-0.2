"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, DatabaseZap, PlayCircle, RefreshCcw } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  type RevenueSignalImportHandoffApplyResponse,
  type RevenueSignalImportHandoffPlan,
  type RevenueSignalImportHandoffResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueSignalImportHandoffPanelProps = {
  autoLoad?: boolean;
  onApplied?: () => Promise<void> | void;
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function RevenueSignalImportHandoffPanel({ autoLoad = false, onApplied }: RevenueSignalImportHandoffPanelProps) {
  const [plan, setPlan] = useState<RevenueSignalImportHandoffPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<"apply" | "load" | "preview" | null>(null);

  const readyJobIds = useMemo(() => plan?.readyHandoffs.map((item) => item.importJobId) ?? [], [plan]);

  const loadPlan = useCallback(async () => {
    setBusyAction("load");
    setError("");

    try {
      const response = await apiFetch<RevenueSignalImportHandoffResponse>("/merch/revenue-engine/signal-connectors/import-handoff");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.readyJobs} import job${response.plan.totals.readyJobs === 1 ? "" : "s"} ready with ${response.plan.totals.handoffSignals} stored signal${response.plan.totals.handoffSignals === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal import handoff check failed.");
    } finally {
      setBusyAction(null);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void loadPlan();
    }
  }, [autoLoad, loadPlan]);

  async function runHandoff(dryRun: boolean) {
    setBusyAction(dryRun ? "preview" : "apply");
    setError("");

    try {
      const response = await apiFetch<RevenueSignalImportHandoffApplyResponse>("/merch/revenue-engine/signal-connectors/import-handoff/apply", {
        json: {
          confirm: "INGEST QUEUED READONLY SIGNAL IMPORT JOBS",
          dryRun,
          importJobIds: readyJobIds,
          note: dryRun
            ? "Dashboard previewed queued read-only signal import handoff."
            : "Dashboard ingested queued read-only signal import jobs into internal Signal Intake."
        },
        method: "POST"
      });
      setPlan(response.plan);
      setMessage(dryRun
        ? `Preview ready: ${response.handoff.sampleSignalsIngested} stored signal${response.handoff.sampleSignalsIngested === 1 ? "" : "s"} staged.`
        : `Handoff complete: ${response.handoff.jobsCompleted} job${response.handoff.jobsCompleted === 1 ? "" : "s"}, ${response.handoff.revenueSnapshotsCreated} revenue, ${response.handoff.contentSnapshotsCreated} content, and ${response.handoff.paymentSignalsRecorded} payment signal${response.handoff.paymentSignalsRecorded === 1 ? "" : "s"} recorded.`);

      if (!dryRun) {
        await onApplied?.();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal import handoff failed.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="automation-list" aria-label="Signal Import Handoff">
      <header>
        <div>
          <h2>Import Handoff</h2>
          <p>Ingest approved queued connector payloads into internal Signal Intake.</p>
        </div>
        <ClipboardCheck aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={busyAction === "load"}>
          <RefreshCcw aria-hidden="true" size={18} className={busyAction === "load" ? "spin" : ""} />
          {busyAction === "load" ? "Loading..." : "Load handoff"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void runHandoff(true)} disabled={!plan || readyJobIds.length === 0 || busyAction === "preview"}>
          <PlayCircle aria-hidden="true" size={18} />
          {busyAction === "preview" ? "Previewing..." : "Preview handoff"}
        </Button>
        <Button type="button" onClick={() => void runHandoff(false)} disabled={!plan || readyJobIds.length === 0 || busyAction === "apply"}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {busyAction === "apply" ? "Ingesting..." : "Ingest queued"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Signal import handoff result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Jobs</dt>
              <dd>{plan.totals.importJobs}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{plan.totals.readyJobs}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{plan.totals.blockedJobs}</dd>
            </div>
            <div>
              <dt>Completed</dt>
              <dd>{plan.totals.completedJobs}</dd>
            </div>
            <div>
              <dt>Signals</dt>
              <dd>{plan.totals.handoffSignals}</dd>
            </div>
            <div>
              <dt>Payments</dt>
              <dd>{plan.totals.paymentSignals}</dd>
            </div>
          </dl>

          <section className="revenue-engine-list" aria-label="Ready signal import handoffs">
            <h3>Ready Handoffs</h3>
            {plan.readyHandoffs.length > 0 ? plan.readyHandoffs.slice(0, 6).map((handoff) => (
              <article key={handoff.importJobId}>
                <span>{label(handoff.lane)} / {handoff.provider} / {handoff.sampleSignals} signal{handoff.sampleSignals === 1 ? "" : "s"}</span>
                <strong>{handoff.manifestId}</strong>
                <p>{handoff.summary}</p>
              </article>
            )) : <p className="revenue-engine-clear">No import jobs are ready for Signal Intake handoff.</p>}
          </section>

          <section className="revenue-engine-list" aria-label="Blocked signal import handoffs">
            <h3>Blocked Jobs</h3>
            {plan.blockedHandoffs.length > 0 ? plan.blockedHandoffs.slice(0, 4).map((blocked) => (
              <article key={blocked.importJobId}>
                <span>{label(blocked.status)} / {blocked.sampleSignals} signal{blocked.sampleSignals === 1 ? "" : "s"}</span>
                <strong>{blocked.importJobId}</strong>
                <p>{blocked.blocker}</p>
              </article>
            )) : <p className="revenue-engine-clear">No blocked import jobs in the current handoff window.</p>}
          </section>

          <div className="revenue-engine-blocked" aria-label="Signal import handoff locked actions">
            <DatabaseZap aria-hidden="true" size={18} />
            <span>Stored sample payloads only. No provider, browser, proxy, upload, payout, credential, live import, or write-scope execution.</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
