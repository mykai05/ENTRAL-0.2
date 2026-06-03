"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, ClipboardCheck, LockKeyhole, PlayCircle, RefreshCcw, ShieldAlert, Zap } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type RevenueAutopilotApplyResponse,
  type RevenueAutopilotExecuteResponse,
  type RevenueAutopilotMode,
  type RevenueAutopilotPlan,
  type RevenueAutopilotResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueAutopilotPanelProps = {
  autoLoad?: boolean;
  onApplied: () => void | Promise<void>;
};

type AutopilotForm = {
  includeAssetBatchActions: boolean;
  includeContent: boolean;
  includeDraftCreation: boolean;
  includeFinance: boolean;
  includeLaunchApprovalPackets: boolean;
  includeSignalIntake: boolean;
  maxActions: number;
  mode: RevenueAutopilotMode;
};

const modes: RevenueAutopilotMode[] = ["balanced", "velocity", "conservative"];

function label(value: string) {
  return value.replace(/_/g, " ");
}

function defaultForm(): AutopilotForm {
  return {
    includeAssetBatchActions: true,
    includeContent: true,
    includeDraftCreation: false,
    includeFinance: true,
    includeLaunchApprovalPackets: false,
    includeSignalIntake: true,
    maxActions: 12,
    mode: "balanced"
  };
}

export function RevenueAutopilotPanel({ autoLoad = true, onApplied }: RevenueAutopilotPanelProps) {
  const [form, setForm] = useState<AutopilotForm>(() => defaultForm());
  const [plan, setPlan] = useState<RevenueAutopilotPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isPreviewingSteps, setIsPreviewingSteps] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionReceipt, setExecutionReceipt] = useState<RevenueAutopilotExecuteResponse | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      includeContent: String(form.includeContent),
      includeFinance: String(form.includeFinance),
      includeSignalIntake: String(form.includeSignalIntake),
      maxActions: String(form.maxActions),
      mode: form.mode
    });

    return params.toString();
  }, [form]);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<RevenueAutopilotResponse>(`/merch/revenue-engine/autopilot?${query}`);
      setPlan(response.plan);
      setMessage("");
      setExecutionReceipt(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue autopilot check failed.");
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (autoLoad) {
      void loadPlan();
    }
  }, [autoLoad, loadPlan]);

  function updateBoolean(field: "includeAssetBatchActions" | "includeContent" | "includeDraftCreation" | "includeFinance" | "includeLaunchApprovalPackets" | "includeSignalIntake") {
    setForm((current) => ({
      ...current,
      [field]: !current[field]
    }));
  }

  async function runAutopilot(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewing : setIsApplying;
    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<RevenueAutopilotApplyResponse>("/merch/revenue-engine/autopilot/apply", {
        json: {
          ...form,
          confirm: "RUN INTERNAL REVENUE AUTOPILOT",
          dryRun
        },
        method: "POST"
      });

      setPlan(response.plan);
      setExecutionReceipt(null);
      setMessage(dryRun
        ? `Autopilot preview ready: ${response.applied.readyActions} ready command${response.applied.readyActions === 1 ? "" : "s"}.`
        : `Autopilot recorded: ${response.applied.commandRecordsCreated} command record${response.applied.commandRecordsCreated === 1 ? "" : "s"} queued.`);

      if (!dryRun) {
        await onApplied();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue autopilot apply failed.");
    } finally {
      setBusy(false);
    }
  }

  async function executeAutopilotSteps(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewingSteps : setIsExecuting;
    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<RevenueAutopilotExecuteResponse>("/merch/revenue-engine/autopilot/execute", {
        json: {
          ...form,
          confirm: "EXECUTE INTERNAL REVENUE AUTOPILOT STEPS",
          dryRun,
          includeAssetBatchActions: form.includeAssetBatchActions,
          includeDraftCreation: form.includeDraftCreation,
          includeLaunchApprovalPackets: form.includeLaunchApprovalPackets,
          maxSteps: 6
        },
        method: "POST"
      });

      setPlan(response.plan);
      setExecutionReceipt(response);
      const batchText = response.executed.assetBatchActions > 0
        ? ` ${response.executed.assetBatchActions} asset batch action${response.executed.assetBatchActions === 1 ? "" : "s"} included.`
        : "";
      const skippedBatchText = response.executed.assetBatchSkipped > 0
        ? ` ${response.executed.assetBatchSkipped} asset batch action${response.executed.assetBatchSkipped === 1 ? "" : "s"} skipped.`
        : "";
      const controlRecordText = response.executed.assetControlRecordsCreated > 0
        ? dryRun
          ? ` ${response.executed.assetControlRecordsCreated} control record${response.executed.assetControlRecordsCreated === 1 ? "" : "s"} would be logged.`
          : ` ${response.executed.assetControlRecordsCreated} control record${response.executed.assetControlRecordsCreated === 1 ? "" : "s"} logged.`
        : "";
      const firstCashText = response.executed.firstCashSprintActions > 0
        ? dryRun
          ? ` ${response.executed.firstCashSprintActions} first-cash sprint action${response.executed.firstCashSprintActions === 1 ? "" : "s"} would run.`
          : ` ${response.executed.firstCashSprintActionsDispatched} first-cash sprint action${response.executed.firstCashSprintActionsDispatched === 1 ? "" : "s"} dispatched.`
        : "";
      const firstBusinessText = response.executed.firstBusinessLaunchActions > 0
        ? dryRun
          ? ` ${response.executed.firstBusinessLaunchActions} first-business launch action${response.executed.firstBusinessLaunchActions === 1 ? "" : "s"} would run.`
          : ` ${response.executed.firstBusinessLaunchActionsDispatched} first-business launch action${response.executed.firstBusinessLaunchActionsDispatched === 1 ? "" : "s"} dispatched.`
        : "";
      setMessage(dryRun
        ? `Autopilot step preview ready: ${response.executed.stepsReady} executable internal step${response.executed.stepsReady === 1 ? "" : "s"}.${batchText}${skippedBatchText}${controlRecordText}${firstBusinessText}${firstCashText}`
        : `Autopilot executed: ${response.executed.stepsExecuted} internal step${response.executed.stepsExecuted === 1 ? "" : "s"}.${batchText}${skippedBatchText}${controlRecordText}${firstBusinessText}${firstCashText} No providers contacted.`);

      if (!dryRun) {
        await onApplied();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue autopilot execution failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="automation-list" aria-label="Revenue Autopilot">
      <header>
        <div>
          <h2>Revenue Autopilot</h2>
          <p>Cross-module command planning for launch readiness, finance control, content, and portfolio rotation.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={isLoading}>
          <RefreshCcw aria-hidden="true" size={18} className={isLoading ? "spin" : ""} />
          Refresh
        </Button>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="autopilot-controls" aria-label="Revenue autopilot controls">
        <div className="autopilot-mode" role="group" aria-label="Autopilot mode">
          {modes.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={form.mode === mode}
              onClick={() => setForm((current) => ({ ...current, mode }))}
            >
              {label(mode)}
            </button>
          ))}
        </div>

        <label>
          <input checked={form.includeSignalIntake} type="checkbox" onChange={() => updateBoolean("includeSignalIntake")} />
          Signals
        </label>
        <label>
          <input checked={form.includeAssetBatchActions} type="checkbox" onChange={() => updateBoolean("includeAssetBatchActions")} />
          Asset batch
        </label>
        <label>
          <input checked={form.includeDraftCreation} type="checkbox" onChange={() => updateBoolean("includeDraftCreation")} />
          Draft creation
        </label>
        <label>
          <input checked={form.includeLaunchApprovalPackets} type="checkbox" onChange={() => updateBoolean("includeLaunchApprovalPackets")} />
          Launch packets
        </label>
        <label>
          <input checked={form.includeContent} type="checkbox" onChange={() => updateBoolean("includeContent")} />
          Content
        </label>
        <label>
          <input checked={form.includeFinance} type="checkbox" onChange={() => updateBoolean("includeFinance")} />
          Finance
        </label>
        <label>
          <span>Max actions</span>
          <input
            min="1"
            max="50"
            step="1"
            type="number"
            value={form.maxActions}
            onChange={(event) => setForm((current) => ({
              ...current,
              maxActions: Math.max(1, Math.min(50, Number(event.target.value) || 1))
            }))}
          />
        </label>
      </div>

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void runAutopilot(true)} disabled={isPreviewing}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {isPreviewing ? "Previewing..." : "Preview autopilot"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void runAutopilot(false)} disabled={isApplying || !plan || plan.actions.length === 0}>
          <LockKeyhole aria-hidden="true" size={18} />
          {isApplying ? "Recording..." : "Record autopilot commands"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void executeAutopilotSteps(true)} disabled={isPreviewingSteps || !plan || plan.actions.length === 0}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {isPreviewingSteps ? "Checking..." : "Preview steps"}
        </Button>
        <Button type="button" variant="primary" onClick={() => void executeAutopilotSteps(false)} disabled={isExecuting || !plan || plan.actions.length === 0}>
          <PlayCircle aria-hidden="true" size={18} />
          {isExecuting ? "Executing..." : "Execute internal steps"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {executionReceipt ? (
        <section className="revenue-engine-result" aria-label="Revenue autopilot execution receipt">
          <div className="revenue-engine-summary">
            <strong>Autopilot Execution Receipt</strong>
            <p>{executionReceipt.executed.dryRun ? "Previewed internal steps only." : "Recorded internal step execution."} External execution: {String(executionReceipt.executed.externalExecution)} / provider contacted: {String(executionReceipt.executed.providerContacted)}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Ready</dt>
              <dd>{executionReceipt.executed.stepsReady}</dd>
            </div>
            <div>
              <dt>Previewed</dt>
              <dd>{executionReceipt.executed.stepsPreviewed}</dd>
            </div>
            <div>
              <dt>Executed</dt>
              <dd>{executionReceipt.executed.stepsExecuted}</dd>
            </div>
            <div>
              <dt>Skipped</dt>
              <dd>{executionReceipt.executed.stepsSkipped}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{executionReceipt.executed.stepsBlocked}</dd>
            </div>
            <div>
              <dt>First Business</dt>
              <dd>{executionReceipt.executed.firstBusinessLaunchActions}</dd>
            </div>
            <div>
              <dt>First Cash</dt>
              <dd>{executionReceipt.executed.firstCashSprintActions}</dd>
            </div>
            <div>
              <dt>Ledger</dt>
              <dd>{executionReceipt.executed.assetControlRecordsCreated}</dd>
            </div>
            <div>
              <dt>Audit</dt>
              <dd>{executionReceipt.executed.auditLogId ?? "pending"}</dd>
            </div>
          </dl>

          {executionReceipt.executed.assetControlBatchReviews.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Revenue autopilot asset-control batch reviews">
              <h3>Asset-Control Reviews</h3>
              {executionReceipt.executed.assetControlBatchReviews.slice(0, 3).map((review, index) => (
                <article key={`${review.summary}-${index}`}>
                  <span>{label(review.riskTier)} risk / {review.alignment.matchedRecommendations} matched / {review.alignment.dashboardOverrides} overrides</span>
                  <strong>{review.executionScope.internalStatusChanges} internal status changes</strong>
                  <p>{review.summary}</p>
                  <small>{review.executionScope.auditOnly} audit-only / {review.skipped} skipped / review {review.requiresOperatorReview ? "required" : "not required"}</small>
                </article>
              ))}
            </section>
          ) : null}

          <section className="revenue-engine-list" aria-label="Revenue autopilot execution steps">
            <h3>Step Results</h3>
            {(executionReceipt.steps.length > 0 ? executionReceipt.steps : executionReceipt.selection.steps).slice(0, 6).map((step) => (
              <article key={step.commandHash}>
                <span>{label(step.executionStatus ?? step.status)} / {label(step.phase)} / {label(step.riskLevel)} risk</span>
                <strong>{step.title}</strong>
                <p>{step.reason}</p>
                <small>Selection: {label(step.selectionSource)}. {step.selectionReason}</small>
                <small>{step.expectedInternalEffect}</small>
              </article>
            ))}
          </section>
        </section>
      ) : null}

      {plan ? (
        <>
          <div className="command-health-grid">
            <article>
              <span>Ready</span>
              <strong>{plan.totals.readyActions}</strong>
              <small>{plan.totals.actions} total commands</small>
            </article>
            <article>
              <span>First Business</span>
              <strong>{plan.totals.firstBusinessLaunchReady}</strong>
              <small>{plan.totals.firstBusinessLaunchManualGates} manual gates / {plan.totals.firstBusinessLaunchCandidates} candidates</small>
            </article>
            <article>
              <span>First Cash</span>
              <strong>{plan.totals.firstCashSprintReady}</strong>
              <small>{plan.totals.firstCashSprintManualGates} manual gates</small>
            </article>
            <article>
              <span>Stores</span>
              <strong>{plan.totals.stores}</strong>
              <small>{plan.totals.products} products tracked</small>
            </article>
            <article>
              <span>Draft Profit</span>
              <strong>{formatMerchCurrency(plan.totals.estimatedDraftProfit)}</strong>
              <small>{plan.totals.digitalDraftsQueued} digital drafts</small>
            </article>
            <article>
              <span>Finance</span>
              <strong>{plan.totals.financePayoutIntents}</strong>
              <small>{plan.totals.releasePackets} release packets</small>
            </article>
            <article>
              <span>Portfolio</span>
              <strong>{formatMerchCurrency(plan.totals.profitVelocity)}/day</strong>
              <small>{plan.totals.rotationChanges} rotations / {plan.totals.trackedAssets} tracked</small>
            </article>
          </div>

          <section className="revenue-engine-result" aria-label="Revenue autopilot summary">
            <div className="revenue-engine-summary">
              <strong>{plan.mode}</strong>
              <p>{plan.summary}</p>
            </div>

            <section className="revenue-engine-list" aria-label="Revenue autopilot phases">
              <h3>Phases</h3>
              {plan.phases.map((phase) => (
                <article key={phase.name}>
                  <span>{label(phase.status)} / {phase.actionCount} command{phase.actionCount === 1 ? "" : "s"}</span>
                  <strong>{phase.title}</strong>
                  <p>{phase.summary}</p>
                </article>
              ))}
            </section>

            <section className="revenue-engine-list" aria-label="Revenue autopilot actions">
              <h3>Actions</h3>
              {plan.actions.slice(0, 8).map((item) => (
                <article key={item.commandHash}>
                  <span>{label(item.phase)} / {label(item.riskLevel)} risk</span>
                  <strong>{item.title}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </section>
          </section>

          <div className="revenue-engine-blocked" aria-label="Revenue autopilot blocked external actions">
            {plan.blockedExternalActions.slice(0, 5).map((item) => (
              <span key={item}>
                {item.includes("browser") || item.includes("stealth") ? <Bot aria-hidden="true" size={14} /> : item.includes("Publishing") ? <Zap aria-hidden="true" size={14} /> : <ShieldAlert aria-hidden="true" size={14} />}
                {item}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
