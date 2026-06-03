"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, ClipboardCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Button } from "./Button";

type BrowserOperationRunbook = {
  action: string;
  expectedInternalEffect: string;
  id: string;
  priority: number;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  status: "ready" | "blocked" | "watch";
  targetName: string;
  targetType: string;
};

type BrowserOperationsPlan = {
  blockedExternalActions: string[];
  externalExecution: false;
  mode: "Internal Browser Operations Layer";
  operationalState: {
    allowedDomains: string[];
    capacitySlots: number;
    featureEnabled: boolean;
    isolationModel: "Ephemeral browser context per job";
    localFallbackEnabled: boolean;
    maxConcurrency: number;
    playwrightConfigured: boolean;
    queuePressure: "clear" | "elevated" | "saturated";
    workerEnabled: boolean;
  };
  providerContacted: false;
  runbooks: BrowserOperationRunbook[];
  safetyLanes: Array<{
    lane: string;
    riskLevel: "low" | "medium" | "high";
    summary: string;
  }>;
  summary: string;
  totals: {
    activeJobs: number;
    failedJobs: number;
    pendingJobs: number;
    recoveryActions: number;
    runningJobs: number;
    scheduledJobs: number;
    staleRunningJobs: number;
    totalJobs: number;
  };
};

type BrowserOperationsResponse = {
  plan: BrowserOperationsPlan;
};

type BrowserOperationsRecoveryResponse = {
  applied: {
    dryRun: boolean;
    externalExecution: false;
    providerContacted: false;
    recoveryRunbooks: number;
    requeuedJobIds: string[];
    staleRecoveredJobIds: string[];
  };
  plan: BrowserOperationsPlan;
};

type BrowserOperationsPanelProps = {
  onRecovered: () => Promise<void>;
};

function riskLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function BrowserOperationsPanel({ onRecovered }: BrowserOperationsPanelProps) {
  const [plan, setPlan] = useState<BrowserOperationsPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<BrowserOperationsResponse>("/automation/browser-operations");
      setPlan(response.plan);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load browser operations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  async function applyRecovery(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewing : setIsApplying;

    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<BrowserOperationsRecoveryResponse>("/automation/browser-operations/recovery/apply", {
        method: "POST",
        json: {
          confirm: "APPLY INTERNAL BROWSER RECOVERY ACTIONS",
          dryRun
        }
      });
      setPlan(response.plan);
      setMessage(dryRun
        ? `Recovery preview ready: ${response.applied.recoveryRunbooks} internal action${response.applied.recoveryRunbooks === 1 ? "" : "s"} identified.`
        : `Recovery applied: ${response.applied.requeuedJobIds.length} job${response.applied.requeuedJobIds.length === 1 ? "" : "s"} requeued and ${response.applied.staleRecoveredJobIds.length} stale job${response.applied.staleRecoveredJobIds.length === 1 ? "" : "s"} marked for review.`);

      if (!dryRun) {
        await onRecovered();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to apply browser recovery.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="automation-list" aria-label="Browser operations layer">
      <header>
        <div>
          <h2>Browser Operations</h2>
          <p>Queue health, isolation controls, and recovery actions for read-only browser jobs.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={isLoading}>
          <RefreshCw aria-hidden="true" size={18} className={isLoading ? "spin" : ""} />
          Refresh
        </Button>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      {plan ? (
        <>
          <p className="surface-mode-note" role="note">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>{plan.mode}: {plan.summary}</span>
          </p>

          <div className="command-health-grid">
            <article>
              <span>Active</span>
              <strong>{plan.totals.activeJobs}</strong>
              <small>{plan.totals.runningJobs} running / {plan.totals.pendingJobs + plan.totals.scheduledJobs} queued</small>
            </article>
            <article>
              <span>Capacity</span>
              <strong>{plan.operationalState.capacitySlots}</strong>
              <small>max {plan.operationalState.maxConcurrency} / {plan.operationalState.queuePressure}</small>
            </article>
            <article>
              <span>Recovery</span>
              <strong>{plan.totals.recoveryActions}</strong>
              <small>{plan.totals.failedJobs} failed / {plan.totals.staleRunningJobs} stale</small>
            </article>
            <article>
              <span>Isolation</span>
              <strong>{plan.providerContacted ? "External" : "Internal"}</strong>
              <small>{plan.operationalState.isolationModel}</small>
            </article>
          </div>

          <div className="row-actions">
            <Button type="button" variant="secondary" onClick={() => void applyRecovery(true)} disabled={isPreviewing || plan.totals.recoveryActions === 0}>
              <ClipboardCheck aria-hidden="true" size={18} />
              {isPreviewing ? "Previewing..." : "Preview recovery"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void applyRecovery(false)} disabled={isApplying || plan.totals.recoveryActions === 0}>
              <Activity aria-hidden="true" size={18} />
              {isApplying ? "Applying..." : "Apply recovery"}
            </Button>
          </div>

          {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

          <section className="revenue-engine-list" aria-label="Browser safety lanes">
            <h3>Safety Lanes</h3>
            {plan.safetyLanes.map((lane) => (
              <article key={lane.lane}>
                <span>{riskLabel(lane.riskLevel)} risk</span>
                <strong>{riskLabel(lane.lane)}</strong>
                <p>{lane.summary}</p>
              </article>
            ))}
          </section>

          <section className="revenue-engine-list warning" aria-label="Browser runbooks">
            <h3>Runbooks</h3>
            {plan.runbooks.slice(0, 5).map((runbook) => (
              <article key={runbook.id}>
                <span>{riskLabel(runbook.action)} / {runbook.status} / {riskLabel(runbook.riskLevel)}</span>
                <strong>{runbook.targetName}</strong>
                <p>{runbook.reason}</p>
                <small>{runbook.expectedInternalEffect}</small>
              </article>
            ))}
          </section>

          <div className="revenue-engine-blocked" aria-label="Browser blocked external actions">
            {plan.blockedExternalActions.slice(0, 5).map((action) => (
              <span key={action}>
                <AlertTriangle aria-hidden="true" size={14} />
                {action}
              </span>
            ))}
          </div>
        </>
      ) : !isLoading ? (
        <p className="revenue-engine-clear">Browser operations are not loaded.</p>
      ) : null}
    </section>
  );
}
