"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, FileCheck2, PackageCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import type {
  RevenueLaunchOperationsPackApplyResponse,
  RevenueLaunchOperationsPackPlan,
  RevenueLaunchOperationsPackResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLaunchOperationsPackPanelProps = {
  autoLoad?: boolean;
  onApplied?: () => Promise<void> | void;
};

const confirmation = "RECORD INTERNAL LAUNCH OPERATIONS PACKS";

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function RevenueLaunchOperationsPackPanel({ autoLoad = false, onApplied }: RevenueLaunchOperationsPackPanelProps) {
  const [plan, setPlan] = useState<RevenueLaunchOperationsPackPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<"load" | "preview" | "record" | null>(null);
  const selectedStoreIds = useMemo(() => plan?.packs.map((pack) => pack.storeId) ?? [], [plan]);

  async function loadPlan() {
    setBusyAction("load");
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchOperationsPackResponse>("/merch/revenue-engine/launch-operations-pack");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.packs} launch operations pack${response.plan.totals.packs === 1 ? "" : "s"} prepared internally.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch operations pack failed.");
    } finally {
      setBusyAction(null);
    }
  }

  async function recordPacks(dryRun: boolean) {
    setBusyAction(dryRun ? "preview" : "record");
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchOperationsPackApplyResponse>("/merch/revenue-engine/launch-operations-pack/apply", {
        json: {
          confirm: confirmation,
          dryRun,
          note: dryRun
            ? "Dashboard previewed launch operations pack audit recording."
            : "Dashboard recorded manual-only launch operations pack audit artifacts.",
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
      setError(caught instanceof Error ? caught.message : "Launch operations pack recording failed.");
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
    <section className="automation-list" aria-label="Revenue Launch Operations Pack">
      <header>
        <div>
          <h2>Launch Operations Pack</h2>
          <p>Consolidate sprint, checklist, handoff, manifest, artifact, and QA evidence.</p>
        </div>
        <FileCheck2 aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={busyAction === "load"}>
          <RefreshCcw aria-hidden="true" size={18} className={busyAction === "load" ? "spin" : ""} />
          {busyAction === "load" ? "Loading..." : "Load packs"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void recordPacks(true)} disabled={!plan || plan.packs.length === 0 || busyAction === "preview"}>
          <PackageCheck aria-hidden="true" size={18} />
          {busyAction === "preview" ? "Previewing..." : "Preview record"}
        </Button>
        <Button type="button" onClick={() => void recordPacks(false)} disabled={!plan || plan.packs.length === 0 || busyAction === "record"}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {busyAction === "record" ? "Recording..." : "Record packs"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Revenue launch operations pack result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Packs</dt>
              <dd>{plan.totals.packs}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{plan.totals.readyPacks}</dd>
            </div>
            <div>
              <dt>Manifests</dt>
              <dd>{plan.totals.requestManifests}</dd>
            </div>
            <div>
              <dt>Artifacts</dt>
              <dd>{plan.totals.artifactSlots}</dd>
            </div>
            <div>
              <dt>Steps</dt>
              <dd>{plan.totals.manualSteps}</dd>
            </div>
          </dl>

          {plan.queue.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Launch operations pack queue">
              <h3>Internal Queue</h3>
              {plan.queue.slice(0, 6).map((item) => (
                <article key={`${item.action}-${item.storeId}`}>
                  <span>{label(item.action)} / {label(item.status)} / priority {item.priority}</span>
                  <strong>{item.storeName}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </section>
          ) : (
            <p className="revenue-engine-clear">No launch operations packs are queued.</p>
          )}

          <section className="revenue-engine-list" aria-label="Launch operations packs">
            <h3>Packs</h3>
            {plan.packs.slice(0, 5).map((pack) => (
              <article key={pack.storeId}>
                <span>{label(pack.status)} / score {pack.readiness.overallScore} / {pack.riskLevel}</span>
                <strong>{pack.storeName}</strong>
                <p>{pack.summary}</p>
                <small>
                  {pack.requestManifests.length} manifests / {pack.artifactSlots.length} artifact slots / {pack.credentialScopes.slice(0, 3).join(", ") || "no credential scopes"}
                </small>
              </article>
            ))}
          </section>

          {plan.packs[0] ? (
            <section className="revenue-engine-list" aria-label="Launch operations pack detail">
              <h3>First Pack Detail</h3>
              <article>
                <span>{plan.packs[0].operatorBrief.readinessLine}</span>
                <strong>{plan.packs[0].operatorBrief.nextReviewGate}</strong>
                <p>{plan.packs[0].manualSteps.slice(0, 3).join(" / ") || "No manual steps staged."}</p>
                <small>{plan.packs[0].qaChecklist.slice(0, 2).join(" / ")}</small>
              </article>
            </section>
          ) : null}

          <div className="revenue-engine-blocked" aria-label="Launch operations pack locked actions">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>{plan.blockedExternalActions.slice(0, 2).join(" / ")}</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
