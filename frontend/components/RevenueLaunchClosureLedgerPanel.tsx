"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Gauge, LineChart, RefreshCcw, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type RevenueLaunchClosureLedgerApplyResponse,
  type RevenueLaunchClosureLedgerPlan,
  type RevenueLaunchClosureLedgerResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLaunchClosureLedgerPanelProps = {
  autoLoad?: boolean;
  onApplied?: () => Promise<void> | void;
};

const confirmation = "RECORD INTERNAL LAUNCH CLOSURE LEDGER";

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function RevenueLaunchClosureLedgerPanel({ autoLoad = false, onApplied }: RevenueLaunchClosureLedgerPanelProps) {
  const [plan, setPlan] = useState<RevenueLaunchClosureLedgerPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<"load" | "preview" | "record" | null>(null);
  const selectedStoreIds = useMemo(() => plan?.entries.map((entry) => entry.storeId) ?? [], [plan]);

  async function loadPlan() {
    setBusyAction("load");
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchClosureLedgerResponse>("/merch/revenue-engine/launch-closure-ledger");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.entries} launch closure entr${response.plan.totals.entries === 1 ? "y" : "ies"} prepared internally.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch closure ledger failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function recordLedger(dryRun: boolean) {
    setBusyAction(dryRun ? "preview" : "record");
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchClosureLedgerApplyResponse>("/merch/revenue-engine/launch-closure-ledger/apply", {
        json: {
          confirm: confirmation,
          dryRun,
          note: dryRun
            ? "Dashboard previewed launch closure ledger audit recording."
            : "Dashboard recorded launch closure ledger scorecards.",
          storeIds: selectedStoreIds
        },
        method: "POST"
      });
      setPlan(response.plan);
      setMessage(response.applied.summary);

      if (!dryRun) {
        await onApplied?.();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch closure ledger recording failed.");
    } finally {
      setBusyAction(null);
    }
  }

  useEffect(() => {
    if (autoLoad) {
      void loadPlan();
    }
  }, [autoLoad]);

  return (
    <section className="automation-list" aria-label="Launch Revenue Closure Ledger">
      <header>
        <div>
          <h2>Closure Ledger</h2>
          <p>Score launch packs, first-week revenue targets, blockers, and monitoring triggers.</p>
        </div>
        <Gauge aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={busyAction === "load"}>
          <RefreshCcw aria-hidden="true" size={18} className={busyAction === "load" ? "spin" : ""} />
          {busyAction === "load" ? "Loading..." : "Load ledger"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void recordLedger(true)} disabled={!plan || plan.entries.length === 0 || busyAction === "preview"}>
          <LineChart aria-hidden="true" size={18} />
          {busyAction === "preview" ? "Previewing..." : "Preview record"}
        </Button>
        <Button type="button" onClick={() => void recordLedger(false)} disabled={!plan || plan.entries.length === 0 || busyAction === "record"}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {busyAction === "record" ? "Recording..." : "Record ledger"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Launch revenue closure ledger result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Entries</dt>
              <dd>{plan.totals.entries}</dd>
            </div>
            <div>
              <dt>Target</dt>
              <dd>{formatMerchCurrency(plan.totals.expectedFirstWeekRevenue)}</dd>
            </div>
            <div>
              <dt>Triggers</dt>
              <dd>{plan.totals.triggersQueued}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{plan.totals.readyForManualLaunch + plan.totals.monitoringReady}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{plan.totals.blockedEntries}</dd>
            </div>
          </dl>

          {plan.queue.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Launch closure ledger queue">
              <h3>Internal Queue</h3>
              {plan.queue.slice(0, 6).map((item) => (
                <article key={`${item.action}-${item.storeId}`}>
                  <span>{label(item.action)} / {label(item.status)} / score {item.closureScore}</span>
                  <strong>{item.storeName}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </section>
          ) : (
            <p className="revenue-engine-clear">No launch closure entries are queued.</p>
          )}

          <section className="revenue-engine-list" aria-label="Launch closure ledger entries">
            <h3>Scorecards</h3>
            {plan.entries.slice(0, 5).map((entry) => (
              <article key={entry.storeId}>
                <span>{label(entry.status)} / score {entry.closureScore} / {entry.performanceEvidence.evidenceGrade}</span>
                <strong>{entry.storeName}</strong>
                <p>{entry.summary}</p>
                <small>
                  {formatMerchCurrency(entry.expectedFirstWeekRevenue.target)} target / {entry.monitoringTriggers.length} triggers / {entry.launchPack.requestManifests} manifests
                </small>
              </article>
            ))}
          </section>

          {plan.entries[0] ? (
            <section className="revenue-engine-list" aria-label="Launch closure ledger detail">
              <h3>First Scorecard Detail</h3>
              <article>
                <span>{plan.entries[0].launchPack.reviewGate}</span>
                <strong>{plan.entries[0].monitoringTriggers.slice(0, 3).map((trigger) => label(trigger.trigger)).join(" / ")}</strong>
                <p>{plan.entries[0].expectedFirstWeekRevenue.assumptions.slice(0, 2).join(" / ")}</p>
                <small>{plan.entries[0].blockers[0]?.title ?? "No outstanding blockers in this scorecard."}</small>
              </article>
            </section>
          ) : null}

          <div className="revenue-engine-blocked" aria-label="Launch closure ledger locked actions">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>{plan.blockedExternalActions.slice(0, 2).join(" / ")}</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
