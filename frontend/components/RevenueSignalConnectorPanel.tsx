"use client";

import React, { useEffect, useState } from "react";
import { DatabaseZap, RefreshCcw, ShieldCheck, Signal, SplitSquareHorizontal } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  type RevenueSignalConnectorApplyResponse,
  type RevenueSignalConnectorManifest,
  type RevenueSignalConnectorPlan,
  type RevenueSignalConnectorResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueSignalConnectorPanelProps = {
  autoLoad?: boolean;
  onApplied?: () => Promise<void> | void;
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

function manifestSignalCount(manifest: RevenueSignalConnectorManifest) {
  return (manifest.samplePayload?.commerceSignals?.length ?? 0)
    + (manifest.samplePayload?.contentSignals?.length ?? 0)
    + (manifest.samplePayload?.paymentSignals?.length ?? 0);
}

export function RevenueSignalConnectorPanel({ autoLoad = false, onApplied }: RevenueSignalConnectorPanelProps) {
  const [plan, setPlan] = useState<RevenueSignalConnectorPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  async function loadPlan() {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<RevenueSignalConnectorResponse>("/merch/revenue-engine/signal-connectors");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.connectors} read-only connector manifest${response.plan.totals.connectors === 1 ? "" : "s"} prepared.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal connector check failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function recordManifests() {
    setIsApplying(true);
    setError("");

    try {
      const response = await apiFetch<RevenueSignalConnectorApplyResponse>("/merch/revenue-engine/signal-connectors/apply", {
        json: {
          confirm: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
          dryRun: false,
          manifestIds: plan?.manifests.filter((manifest) => manifest.status === "ready_for_approval").map((manifest) => manifest.id) ?? [],
          note: "Dashboard recorded read-only connector manifests for Signal Intake review."
        },
        method: "POST"
      });
      setPlan(response.plan);
      setMessage(`${response.applied.manifestsRecorded} connector manifest${response.applied.manifestsRecorded === 1 ? "" : "s"} recorded. No providers contacted.`);
      await onApplied?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal connector manifest recording failed.");
    } finally {
      setIsApplying(false);
    }
  }

  useEffect(() => {
    if (autoLoad) {
      void loadPlan();
    }
  }, [autoLoad]);

  const readyCount = plan?.totals.readyConnectors ?? 0;

  return (
    <section className="automation-list" aria-label="Read-only Signal Connector Center">
      <header>
        <div>
          <h2>Signal Connectors</h2>
          <p>Prepare read-only commerce, content, and payment import manifests.</p>
        </div>
        <Signal aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={isLoading}>
          <RefreshCcw aria-hidden="true" size={18} />
          {isLoading ? "Loading..." : "Load connectors"}
        </Button>
        <Button type="button" onClick={() => void recordManifests()} disabled={isApplying || !plan || readyCount === 0}>
          <ShieldCheck aria-hidden="true" size={18} />
          {isApplying ? "Recording..." : "Record manifests"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Read-only signal connector result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Connectors</dt>
              <dd>{plan.totals.connectors}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{plan.totals.readyConnectors}</dd>
            </div>
            <div>
              <dt>Commerce</dt>
              <dd>{plan.totals.commerceConnectors}</dd>
            </div>
            <div>
              <dt>Content</dt>
              <dd>{plan.totals.contentConnectors}</dd>
            </div>
            <div>
              <dt>Payments</dt>
              <dd>{plan.totals.paymentConnectors}</dd>
            </div>
            <div>
              <dt>Sample Signals</dt>
              <dd>{plan.signalIntakePreview.totals.signals}</dd>
            </div>
          </dl>

          <section className="revenue-engine-list" aria-label="Read-only connector manifests">
            <h3>Connector Manifests</h3>
            {plan.manifests.length > 0 ? plan.manifests.slice(0, 8).map((manifest) => (
              <article key={manifest.id}>
                <span>{label(manifest.lane)} / {manifest.providerName} / {manifest.readinessScore}/100</span>
                <strong>{manifest.title}</strong>
                <p>{manifest.summary}</p>
                <small>{label(manifest.status)} / {manifest.readOnlyScopes.length} read scopes / {manifestSignalCount(manifest)} sample signal{manifestSignalCount(manifest) === 1 ? "" : "s"}</small>
              </article>
            )) : <p className="revenue-engine-clear">No read-only connector manifests are ready.</p>}
          </section>

          <section className="revenue-engine-list" aria-label="Signal intake preview">
            <h3>Signal Intake Preview</h3>
            <article>
              <span>{plan.signalIntakePreview.mode}</span>
              <strong>{plan.signalIntakePreview.totals.signals} staged records</strong>
              <p>{plan.signalIntakePreview.summary}</p>
            </article>
          </section>

          <div className="revenue-engine-blocked" aria-label="Signal connector locked actions">
            <SplitSquareHorizontal aria-hidden="true" size={18} />
            <span>{plan.blockedExternalActions.slice(0, 2).join(" / ")}</span>
          </div>

          <div className="revenue-engine-blocked" aria-label="Signal connector scope boundary">
            <DatabaseZap aria-hidden="true" size={18} />
            <span>Read-only manifests only. No credential, write-scope, browser, upload, payout, or provider execution.</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
