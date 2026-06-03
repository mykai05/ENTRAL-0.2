"use client";

import React, { useEffect, useState } from "react";
import { Gauge, PauseCircle, RefreshCcw, ShieldCheck, XCircle } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type RevenueOpportunityControlApplyResponse,
  type RevenueOpportunityControlItem,
  type RevenueOpportunityControlPlan,
  type RevenueOpportunityControlResponse,
  type RevenueOpportunityControlStatus
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueOpportunityControlPanelProps = {
  autoLoad?: boolean;
  onApplied: () => void | Promise<void>;
};

const quickStatuses: RevenueOpportunityControlStatus[] = ["watch", "paused", "ready_for_handoff", "killed"];

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function actionIcon(status: RevenueOpportunityControlStatus) {
  if (status === "paused") return <PauseCircle aria-hidden="true" size={16} />;
  if (status === "killed") return <XCircle aria-hidden="true" size={16} />;
  if (status === "ready_for_handoff") return <ShieldCheck aria-hidden="true" size={16} />;

  return <Gauge aria-hidden="true" size={16} />;
}

export function RevenueOpportunityControlPanel({ autoLoad = false, onApplied }: RevenueOpportunityControlPanelProps) {
  const [plan, setPlan] = useState<RevenueOpportunityControlPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  async function loadControlPlan() {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<RevenueOpportunityControlResponse>("/merch/revenue-engine/opportunities/control");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.opportunities} opportunit${response.plan.totals.opportunities === 1 ? "y" : "ies"} under control.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue opportunity control failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updateOpportunity(item: RevenueOpportunityControlItem, status: RevenueOpportunityControlStatus) {
    const actionKey = `${item.id}:${status}`;
    setActiveAction(actionKey);
    setError("");

    try {
      const response = await apiFetch<RevenueOpportunityControlApplyResponse>(`/merch/revenue-engine/opportunities/${item.id}/control`, {
        json: {
          confirm: "UPDATE INTERNAL REVENUE OPPORTUNITY CONTROL",
          dryRun: false,
          note: `Dashboard control changed ${item.businessName} from ${item.status} to ${status}.`,
          status
        },
        method: "POST"
      });

      setPlan(response.plan);
      setMessage(response.applied.allowed
        ? `${item.businessName} marked ${statusLabel(status)}. No providers contacted.`
        : response.applied.reason);
      await onApplied();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Opportunity control update failed.");
    } finally {
      setActiveAction(null);
    }
  }

  useEffect(() => {
    if (autoLoad) {
      void loadControlPlan();
    }
  }, [autoLoad]);

  return (
    <section className="automation-list" aria-label="Revenue Opportunity Control Center">
      <header>
        <div>
          <h2>Revenue Opportunity Control</h2>
          <p>Track idea-to-launch lifecycle state, blockers, and internal status controls.</p>
        </div>
        <Gauge aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadControlPlan()} disabled={isLoading}>
          <RefreshCcw aria-hidden="true" size={18} />
          {isLoading ? "Loading..." : "Load opportunities"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Revenue opportunity control result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Opportunities</dt>
              <dd>{plan.totals.opportunities}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{plan.totals.readyForHandoff}</dd>
            </div>
            <div>
              <dt>Drafts</dt>
              <dd>{plan.totals.productDrafts}</dd>
            </div>
            <div>
              <dt>Draft Profit</dt>
              <dd>{formatMerchCurrency(plan.totals.estimatedDraftProfit)}</dd>
            </div>
            <div>
              <dt>Net Profit</dt>
              <dd>{formatMerchCurrency(plan.totals.netProfit)}</dd>
            </div>
          </dl>

          <section className="revenue-engine-list" aria-label="Revenue opportunity controls">
            <h3>Opportunity Controls</h3>
            {plan.opportunities.slice(0, 6).map((item) => (
              <article key={item.id}>
                <span>{statusLabel(item.stage)} / {item.riskLevel} / score {item.readinessScore}</span>
                <strong>{item.businessName}</strong>
                <p>{item.summary}</p>
                {item.blockers.length > 0 ? <small>{item.blockers.slice(0, 2).map((blocker) => blocker.title).join(" / ")}</small> : null}
                <div className="row-actions">
                  {quickStatuses.map((status) => {
                    const control = item.controlActions.find((action) => action.status === status);
                    const actionKey = `${item.id}:${status}`;

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updateOpportunity(item, status)}
                        disabled={!control?.enabled || activeAction === actionKey}
                        title={control?.reason}
                      >
                        {actionIcon(status)}
                        {activeAction === actionKey ? "Updating..." : statusLabel(status)}
                      </button>
                    );
                  })}
                </div>
              </article>
            ))}
          </section>
        </section>
      ) : null}
    </section>
  );
}
