"use client";

import React, { useEffect, useState } from "react";
import { ClipboardCheck, RefreshCcw, Rocket } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  type RevenueLaunchReadinessPlan,
  type RevenueLaunchReadinessResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLaunchReadinessPanelProps = {
  autoLoad?: boolean;
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

export function RevenueLaunchReadinessPanel({ autoLoad = false }: RevenueLaunchReadinessPanelProps) {
  const [plan, setPlan] = useState<RevenueLaunchReadinessPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function loadLaunchReadiness() {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchReadinessResponse>("/merch/revenue-engine/launch-readiness");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.queuedStores} launch-readiness action${response.plan.totals.queuedStores === 1 ? "" : "s"} queued internally.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch readiness board failed.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (autoLoad) {
      void loadLaunchReadiness();
    }
  }, [autoLoad]);

  return (
    <section className="automation-list" aria-label="Revenue Launch Readiness Board">
      <header>
        <div>
          <h2>Launch Readiness Board</h2>
          <p>Rank stores by launch, setup, provider payload, and approval evidence.</p>
        </div>
        <Rocket aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadLaunchReadiness()} disabled={isLoading}>
          <RefreshCcw aria-hidden="true" size={18} />
          {isLoading ? "Loading..." : "Load launch board"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Revenue launch readiness result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Stores</dt>
              <dd>{plan.totals.storesEvaluated}</dd>
            </div>
            <div>
              <dt>Queued</dt>
              <dd>{plan.totals.queuedStores}</dd>
            </div>
            <div>
              <dt>Handoff Ready</dt>
              <dd>{plan.totals.handoffReadyStores}</dd>
            </div>
            <div>
              <dt>Payloads</dt>
              <dd>{plan.totals.payloadsPrepared}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{plan.totals.blockedStores}</dd>
            </div>
          </dl>

          {plan.queue.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Launch readiness queue">
              <h3>Internal Queue</h3>
              {plan.queue.slice(0, 6).map((item) => (
                <article key={`${item.action}-${item.storeId}`}>
                  <span>{label(item.action)} / score {item.readinessScore}</span>
                  <strong>{item.storeName}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </section>
          ) : (
            <p className="revenue-engine-clear">No launch-readiness actions are queued.</p>
          )}

          <section className="revenue-engine-list" aria-label="Launch readiness stores">
            <h3>Store Readiness</h3>
            {plan.stores.slice(0, 6).map((item) => (
              <article key={item.store.id}>
                <span>{label(item.stage)} / {item.riskLevel} / score {item.readinessScore}</span>
                <strong>{item.store.businessName}</strong>
                <p>{item.summary}</p>
                <small>
                  {item.blockers.length > 0
                    ? item.blockers.slice(0, 2).map((blocker) => blocker.title).join(" / ")
                    : `${item.providerPayload.payloadCount} locked payloads across ${item.providerPayload.adapterCoverage.join(", ") || "no adapters"}`}
                </small>
              </article>
            ))}
          </section>

          <div className="revenue-engine-blocked" aria-label="Launch readiness locked actions">
            <ClipboardCheck aria-hidden="true" size={18} />
            <span>{plan.blockedExternalActions.slice(0, 2).join(" / ")}</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
