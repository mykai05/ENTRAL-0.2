"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Cable, ClipboardCheck, KeyRound, RefreshCcw, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type RevenueLiveConnectorReadinessApplyResponse,
  type RevenueLiveConnectorReadinessRegistryPlan,
  type RevenueLiveConnectorReadinessResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLiveConnectorReadinessPanelProps = {
  autoLoad?: boolean;
  onApplied?: () => Promise<void> | void;
};

const confirmation = "RECORD INTERNAL LIVE CONNECTOR READINESS REGISTRY";

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function RevenueLiveConnectorReadinessPanel({ autoLoad = false, onApplied }: RevenueLiveConnectorReadinessPanelProps) {
  const [plan, setPlan] = useState<RevenueLiveConnectorReadinessRegistryPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<"load" | "preview" | "record" | null>(null);
  const selectedStoreIds = useMemo(() => plan?.entries.map((entry) => entry.storeId) ?? [], [plan]);

  async function loadPlan() {
    setBusyAction("load");
    setError("");

    try {
      const response = await apiFetch<RevenueLiveConnectorReadinessResponse>("/merch/revenue-engine/live-connector-readiness");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.entries} live connector readiness entr${response.plan.totals.entries === 1 ? "y" : "ies"} prepared internally.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live connector readiness check failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function recordRegistry(dryRun: boolean) {
    setBusyAction(dryRun ? "preview" : "record");
    setError("");

    try {
      const response = await apiFetch<RevenueLiveConnectorReadinessApplyResponse>("/merch/revenue-engine/live-connector-readiness/apply", {
        json: {
          confirm: confirmation,
          dryRun,
          note: dryRun
            ? "Dashboard previewed live connector readiness registry audit recording."
            : "Dashboard recorded live connector readiness registry entries.",
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
      setError(caught instanceof Error ? caught.message : "Live connector readiness recording failed.");
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
    <section className="automation-list" aria-label="Revenue Live Connector Readiness Registry">
      <header>
        <div>
          <h2>Connector Readiness</h2>
          <p>Map live connector design gates, credentials, scopes, and rollback controls.</p>
        </div>
        <Cable aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={busyAction === "load"}>
          <RefreshCcw aria-hidden="true" size={18} className={busyAction === "load" ? "spin" : ""} />
          {busyAction === "load" ? "Loading..." : "Load readiness"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void recordRegistry(true)} disabled={!plan || plan.entries.length === 0 || busyAction === "preview"}>
          <ShieldCheck aria-hidden="true" size={18} />
          {busyAction === "preview" ? "Previewing..." : "Preview record"}
        </Button>
        <Button type="button" onClick={() => void recordRegistry(false)} disabled={!plan || plan.entries.length === 0 || busyAction === "record"}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {busyAction === "record" ? "Recording..." : "Record registry"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Live connector readiness result">
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
              <dt>Design Ready</dt>
              <dd>{plan.totals.readyForDesign}</dd>
            </div>
            <div>
              <dt>Need Read-Only</dt>
              <dd>{plan.totals.needsReadOnlyApproval}</dd>
            </div>
            <div>
              <dt>Boundaries</dt>
              <dd>{plan.totals.requiredBoundaries}</dd>
            </div>
            <div>
              <dt>Approved</dt>
              <dd>{plan.totals.approvedReadOnlyConnectors}</dd>
            </div>
          </dl>

          {plan.queue.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Live connector readiness queue">
              <h3>Internal Queue</h3>
              {plan.queue.slice(0, 6).map((item) => (
                <article key={`${item.action}-${item.storeId}`}>
                  <span>{label(item.action)} / {label(item.status)} / {item.readinessScore}/100</span>
                  <strong>{item.storeName}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </section>
          ) : (
            <p className="revenue-engine-clear">No live connector readiness entries are queued.</p>
          )}

          <section className="revenue-engine-list" aria-label="Live connector readiness entries">
            <h3>Readiness Entries</h3>
            {plan.entries.slice(0, 5).map((entry) => (
              <article key={entry.storeId}>
                <span>{label(entry.status)} / {entry.readinessScore}/100 / closure {entry.closure.score}</span>
                <strong>{entry.storeName}</strong>
                <p>{entry.summary}</p>
                <small>
                  {formatMerchCurrency(entry.closure.expectedFirstWeekRevenue)} target / {entry.readOnlyEvidence.approvedConnectors} approved read-only / {entry.connectorBoundaries.length} boundaries
                </small>
              </article>
            ))}
          </section>

          {plan.entries[0] ? (
            <section className="revenue-engine-list" aria-label="Live connector readiness boundary detail">
              <h3>First Boundary Detail</h3>
              {plan.entries[0].connectorBoundaries.slice(0, 4).map((boundary) => (
                <article key={`${boundary.provider}-${boundary.role}`}>
                  <span>{label(boundary.role)} / {boundary.providerName} / {label(boundary.readiness)}</span>
                  <strong>{boundary.futureLiveScopes.slice(0, 2).map((scope) => scope.scope).join(" / ")}</strong>
                  <p>{boundary.approvalGates.slice(0, 2).join(" / ")}</p>
                  <small>{boundary.credentialEnvVars.slice(0, 3).join(" / ") || "No credential env vars required."}</small>
                </article>
              ))}
            </section>
          ) : null}

          <div className="revenue-engine-blocked" aria-label="Live connector readiness locked actions">
            <KeyRound aria-hidden="true" size={18} />
            <span>{plan.blockedExternalActions.slice(0, 2).join(" / ")}</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
