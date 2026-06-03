"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileKey2, KeyRound, RefreshCcw, Route } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type RevenueLiveConnectorDesignDossierApplyResponse,
  type RevenueLiveConnectorDesignDossierPlan,
  type RevenueLiveConnectorDesignDossierResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLiveConnectorDesignDossierPanelProps = {
  autoLoad?: boolean;
  onApplied?: () => Promise<void> | void;
};

const confirmation = "RECORD INTERNAL LIVE CONNECTOR DESIGN DOSSIERS";

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function RevenueLiveConnectorDesignDossierPanel({ autoLoad = false, onApplied }: RevenueLiveConnectorDesignDossierPanelProps) {
  const [plan, setPlan] = useState<RevenueLiveConnectorDesignDossierPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<"load" | "preview" | "record" | null>(null);
  const selectedStoreIds = useMemo(() => plan?.entries.map((entry) => entry.storeId) ?? [], [plan]);

  async function loadPlan() {
    setBusyAction("load");
    setError("");

    try {
      const response = await apiFetch<RevenueLiveConnectorDesignDossierResponse>("/merch/revenue-engine/live-connector-design-dossier");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.dossiers} live connector design dossier${response.plan.totals.dossiers === 1 ? "" : "s"} prepared internally.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Live connector design dossier check failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function recordDossier(dryRun: boolean) {
    setBusyAction(dryRun ? "preview" : "record");
    setError("");

    try {
      const response = await apiFetch<RevenueLiveConnectorDesignDossierApplyResponse>("/merch/revenue-engine/live-connector-design-dossier/apply", {
        json: {
          confirm: confirmation,
          dryRun,
          note: dryRun
            ? "Dashboard previewed live connector design dossier audit recording."
            : "Dashboard recorded live connector design dossiers.",
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
      setError(caught instanceof Error ? caught.message : "Live connector design dossier recording failed.");
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
    <section className="automation-list" aria-label="Revenue Live Connector Design Dossier">
      <header>
        <div>
          <h2>Connector Dossier</h2>
          <p>Prepare dry-run request maps, custody checks, rollback rehearsals, and pending operator packets.</p>
        </div>
        <FileKey2 aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={busyAction === "load"}>
          <RefreshCcw aria-hidden="true" size={18} className={busyAction === "load" ? "spin" : ""} />
          {busyAction === "load" ? "Loading..." : "Load dossier"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void recordDossier(true)} disabled={!plan || plan.entries.length === 0 || busyAction === "preview"}>
          <Route aria-hidden="true" size={18} />
          {busyAction === "preview" ? "Previewing..." : "Preview record"}
        </Button>
        <Button type="button" onClick={() => void recordDossier(false)} disabled={!plan || plan.entries.length === 0 || busyAction === "record"}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {busyAction === "record" ? "Recording..." : "Record dossier"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Live connector design dossier result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Dossiers</dt>
              <dd>{plan.totals.dossiers}</dd>
            </div>
            <div>
              <dt>Requests</dt>
              <dd>{plan.totals.dryRunRequests}</dd>
            </div>
            <div>
              <dt>Custody</dt>
              <dd>{plan.totals.credentialCustodyItems}</dd>
            </div>
            <div>
              <dt>Rollback</dt>
              <dd>{plan.totals.rollbackRehearsals}</dd>
            </div>
            <div>
              <dt>Packets</dt>
              <dd>{plan.totals.approvalPackets}</dd>
            </div>
          </dl>

          {plan.queue.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Live connector design dossier queue">
              <h3>Internal Queue</h3>
              {plan.queue.slice(0, 6).map((item) => (
                <article key={`${item.action}-${item.storeId}`}>
                  <span>{label(item.action)} / {label(item.status)} / {item.dryRunRequests} requests</span>
                  <strong>{item.storeName}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </section>
          ) : (
            <p className="revenue-engine-clear">No live connector design dossiers are queued.</p>
          )}

          <section className="revenue-engine-list" aria-label="Live connector design dossier entries">
            <h3>Dossier Entries</h3>
            {plan.entries.slice(0, 5).map((entry) => (
              <article key={entry.storeId}>
                <span>{label(entry.status)} / {entry.readiness.readinessScore}/100 / {entry.dryRunRequests} requests</span>
                <strong>{entry.storeName}</strong>
                <p>{entry.summary}</p>
                <small>
                  {formatMerchCurrency(entry.readiness.expectedFirstWeekRevenue)} target / {entry.approvalPackets} packets / {entry.rollbackRehearsals} rehearsals
                </small>
              </article>
            ))}
          </section>

          {plan.entries[0]?.boundaryDossiers[0] ? (
            <section className="revenue-engine-list" aria-label="Live connector design dossier packet detail">
              <h3>First Packet Detail</h3>
              {plan.entries[0].boundaryDossiers.slice(0, 4).map((boundary) => (
                <article key={`${boundary.provider}-${boundary.role}`}>
                  <span>{label(boundary.role)} / {boundary.providerName} / {label(boundary.readiness)}</span>
                  <strong>{boundary.finalApprovalPacket.packetId}</strong>
                  <p>{boundary.dryRunRequestMap[0]?.idempotencyKey ?? "No dry-run request map required."}</p>
                  <small>{boundary.credentialCustodyChecklist.slice(0, 2).map((item) => item.credentialEnvVar).join(" / ") || "No credential custody items."}</small>
                </article>
              ))}
            </section>
          ) : null}

          <div className="revenue-engine-blocked" aria-label="Live connector design dossier locked actions">
            <KeyRound aria-hidden="true" size={18} />
            <span>{plan.blockedExternalActions.slice(0, 2).join(" / ")}</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
