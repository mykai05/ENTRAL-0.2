"use client";

import React, { useEffect, useState } from "react";
import { Archive, ClipboardCheck, PauseCircle, RefreshCcw, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  type RevenueLaunchHandoffControlApplyResponse,
  type RevenueLaunchHandoffControlItem,
  type RevenueLaunchHandoffControlPlan,
  type RevenueLaunchHandoffControlResponse,
  type RevenueLaunchHandoffControlStatus
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLaunchHandoffControlPanelProps = {
  autoLoad?: boolean;
};

const quickStatuses: RevenueLaunchHandoffControlStatus[] = [
  "queued_review",
  "ready_for_manual_handoff",
  "blocked_review",
  "archived"
];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function statusIcon(status: RevenueLaunchHandoffControlStatus) {
  if (status === "ready_for_manual_handoff") return <ShieldCheck aria-hidden="true" size={16} />;
  if (status === "blocked_review") return <PauseCircle aria-hidden="true" size={16} />;
  if (status === "archived") return <Archive aria-hidden="true" size={16} />;

  return <ClipboardCheck aria-hidden="true" size={16} />;
}

export function RevenueLaunchHandoffControlPanel({ autoLoad = false }: RevenueLaunchHandoffControlPanelProps) {
  const [plan, setPlan] = useState<RevenueLaunchHandoffControlPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  async function loadControlPlan() {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchHandoffControlResponse>("/merch/revenue-engine/launch-handoff/control");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.packets} launch handoff packet${response.plan.totals.packets === 1 ? "" : "s"} under control.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch handoff control failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function updatePacket(item: RevenueLaunchHandoffControlItem, status: RevenueLaunchHandoffControlStatus) {
    const actionKey = `${item.id}:${status}`;
    setActiveAction(actionKey);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchHandoffControlApplyResponse>(`/merch/revenue-engine/launch-handoff/packets/${item.id}/control`, {
        json: {
          confirm: "UPDATE INTERNAL LAUNCH HANDOFF CONTROL",
          dryRun: false,
          note: `Dashboard control changed ${item.storeName} packet from ${item.status} to ${status}.`,
          status
        },
        method: "POST"
      });
      setPlan(response.plan);
      setMessage(response.applied.allowed
        ? `${item.storeName} packet marked ${label(status)}. No providers contacted.`
        : response.applied.reason);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch handoff control update failed.");
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
    <section className="automation-list" aria-label="Revenue Launch Handoff Control Center">
      <header>
        <div>
          <h2>Handoff Packet Control</h2>
          <p>Manage saved launch handoff packet records and review states.</p>
        </div>
        <ShieldCheck aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadControlPlan()} disabled={isLoading}>
          <RefreshCcw aria-hidden="true" size={18} />
          {isLoading ? "Loading..." : "Load packet control"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Revenue launch handoff control result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Packets</dt>
              <dd>{plan.totals.packets}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{plan.totals.readyForManualHandoff}</dd>
            </div>
            <div>
              <dt>Queued</dt>
              <dd>{plan.totals.queuedPackets}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{plan.totals.blockedPackets}</dd>
            </div>
            <div>
              <dt>Manifests</dt>
              <dd>{plan.totals.manifestCount}</dd>
            </div>
          </dl>

          <section className="revenue-engine-list" aria-label="Launch handoff packet controls">
            <h3>Packet Controls</h3>
            {plan.packets.length > 0 ? plan.packets.slice(0, 6).map((item) => (
              <article key={item.id}>
                <span>{label(item.status)} / {item.riskLevel} / {item.connectorReadinessScore}/100</span>
                <strong>{item.storeName}</strong>
                <p>{item.summary}</p>
                {item.reviewBlockers.length > 0 ? <small>{item.reviewBlockers.slice(0, 2).map((blocker) => blocker.title).join(" / ")}</small> : null}
                <div className="row-actions">
                  {quickStatuses.map((status) => {
                    const control = item.controlActions.find((action) => action.status === status);
                    const actionKey = `${item.id}:${status}`;

                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => void updatePacket(item, status)}
                        disabled={!control?.enabled || activeAction === actionKey}
                        title={control?.reason}
                      >
                        {statusIcon(status)}
                        {activeAction === actionKey ? "Updating..." : label(status)}
                      </button>
                    );
                  })}
                </div>
              </article>
            )) : <p className="revenue-engine-clear">No launch handoff packet records found.</p>}
          </section>

          <div className="revenue-engine-blocked" aria-label="Launch handoff control locked actions">
            <ClipboardCheck aria-hidden="true" size={18} />
            <span>{plan.blockedExternalActions.slice(0, 2).join(" / ")}</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
