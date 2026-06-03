"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ClipboardList, Gauge, LockKeyhole, PlayCircle, RefreshCcw, Route, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type RevenueLaunchChecklistActionBridgeApplyResponse,
  type RevenueLaunchChecklistActionBridgePlan,
  type RevenueLaunchChecklistActionBridgeResponse,
  type RevenueLaunchChecklistPlan,
  type RevenueLaunchChecklistResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLaunchChecklistPanelProps = {
  autoLoad?: boolean;
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

const bridgeConfirmation = "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS";

export function RevenueLaunchChecklistPanel({ autoLoad = false }: RevenueLaunchChecklistPanelProps) {
  const [plan, setPlan] = useState<RevenueLaunchChecklistPlan | null>(null);
  const [bridgePlan, setBridgePlan] = useState<RevenueLaunchChecklistActionBridgePlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBridge, setIsLoadingBridge] = useState(false);
  const [isPreviewingBridge, setIsPreviewingBridge] = useState(false);
  const [isDispatchingBridge, setIsDispatchingBridge] = useState(false);

  const loadChecklist = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchChecklistResponse>("/merch/revenue-engine/launch-checklist");
      setPlan(response.plan);
      setMessage(`${response.plan.totals.readyItems} checklist item${response.plan.totals.readyItems === 1 ? "" : "s"} ready; ${response.plan.totals.importHandoffsReady} import handoff${response.plan.totals.importHandoffsReady === 1 ? "" : "s"} can move into Signal Intake.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue launch checklist failed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadBridge = useCallback(async () => {
    setIsLoadingBridge(true);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchChecklistActionBridgeResponse>("/merch/revenue-engine/launch-checklist/action-bridge");
      setPlan(response.checklist);
      setBridgePlan(response.plan);
      setMessage(`${response.plan.totals.readyActions} bridge action${response.plan.totals.readyActions === 1 ? "" : "s"} ready; ${response.plan.totals.blockedActions} require direct review.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue launch checklist bridge failed.");
    } finally {
      setIsLoadingBridge(false);
    }
  }, []);

  const applyBridge = useCallback(async (dryRun: boolean) => {
    const setBusy = dryRun ? setIsPreviewingBridge : setIsDispatchingBridge;

    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchChecklistActionBridgeApplyResponse>("/merch/revenue-engine/launch-checklist/action-bridge/apply", {
        json: {
          confirm: bridgeConfirmation,
          dryRun
        },
        method: "POST"
      });
      setBridgePlan(response.bridge);

      if (response.checklist) {
        setPlan(response.checklist);
      }

      setMessage(response.dispatched.summary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue launch checklist bridge apply failed.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void loadChecklist();
    }
  }, [autoLoad, loadChecklist]);

  return (
    <section className="automation-list" aria-label="Revenue Launch Checklist">
      <header>
        <div>
          <h2>Launch Checklist</h2>
          <p>Ranked internal path from opportunity to launch evidence and portfolio commands.</p>
        </div>
        <ClipboardList aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadChecklist()} disabled={isLoading}>
          <RefreshCcw aria-hidden="true" size={18} className={isLoading ? "spin" : ""} />
          {isLoading ? "Loading..." : "Load checklist"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void loadBridge()} disabled={isLoadingBridge}>
          <Route aria-hidden="true" size={18} className={isLoadingBridge ? "spin" : ""} />
          {isLoadingBridge ? "Loading..." : "Load bridge"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void applyBridge(true)}
          disabled={!bridgePlan || bridgePlan.totals.readyActions === 0 || isPreviewingBridge || isDispatchingBridge}
        >
          <PlayCircle aria-hidden="true" size={18} />
          {isPreviewingBridge ? "Previewing..." : "Preview dispatch"}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={() => void applyBridge(false)}
          disabled={!bridgePlan || bridgePlan.totals.readyActions === 0 || isDispatchingBridge || isPreviewingBridge}
        >
          <LockKeyhole aria-hidden="true" size={18} />
          {isDispatchingBridge ? "Dispatching..." : "Dispatch ready"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Revenue launch checklist result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Items</dt>
              <dd>{plan.totals.items}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{plan.totals.readyItems}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{plan.totals.blockedItems}</dd>
            </div>
            <div>
              <dt>Handoffs</dt>
              <dd>{plan.totals.importHandoffsReady}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{plan.totals.signalEvidenceItems}</dd>
            </div>
            <div>
              <dt>Scored</dt>
              <dd>{plan.totals.scoredAssets}</dd>
            </div>
            <div>
              <dt>Draft Profit</dt>
              <dd>{formatMerchCurrency(plan.totals.estimatedDraftProfit)}</dd>
            </div>
          </dl>

          <section className="revenue-engine-list" aria-label="Ranked checklist items">
            <h3>Ranked Work</h3>
            {plan.items.length > 0 ? plan.items.slice(0, 7).map((item) => (
              <article key={item.id}>
                <span>{item.nextActionLabel} / priority {item.priorityScore} / velocity {item.incomeVelocityScore}</span>
                <strong>{item.storeName}</strong>
                <p>{item.summary}</p>
                <small>
                  {item.stages.slice(0, 4).map((stage) => `${label(stage.key)}: ${label(stage.status)}`).join(" / ")}
                </small>
                {item.assetSignal ? (
                  <small>
                    Asset score: {item.assetSignal.recommendation} / rank {item.assetSignal.finalRank} / {item.assetSignal.scoreBand} / next {item.assetSignal.nextInternalState ?? "no change"}
                  </small>
                ) : null}
                {item.blockers.length > 0 ? <small>{item.blockers.slice(0, 2).join(" / ")}</small> : null}
              </article>
            )) : <p className="revenue-engine-clear">No launch checklist items matched the current filters.</p>}
          </section>

          <section className="revenue-engine-list" aria-label="Checklist command actions">
            <h3>Command Links</h3>
            {plan.items.some((item) => item.commandActions.length > 0) ? plan.items
              .flatMap((item) => item.commandActions.map((command) => ({ command, item })))
              .slice(0, 5)
              .map(({ command, item }) => (
                <article key={`${item.id}-${command.commandHash}`}>
                  <span>{label(command.action)} / {command.riskLevel} / priority {command.priority}</span>
                  <strong>{item.storeName}</strong>
                  <p>{command.expectedInternalEffect}</p>
                </article>
              )) : <p className="revenue-engine-clear">No portfolio command links are queued for these checklist items.</p>}
          </section>

          {bridgePlan ? (
            <section className="revenue-engine-list" aria-label="Checklist action bridge">
              <h3>Action Bridge</h3>
              <dl className="revenue-engine-metrics">
                <div>
                  <dt>Ready</dt>
                  <dd>{bridgePlan.totals.readyActions}</dd>
                </div>
                <div>
                  <dt>Blocked</dt>
                  <dd>{bridgePlan.totals.blockedActions}</dd>
                </div>
                <div>
                  <dt>Watch</dt>
                  <dd>{bridgePlan.totals.watchActions}</dd>
                </div>
                <div>
                  <dt>Launch</dt>
                  <dd>{bridgePlan.totals.launchPipelineActions}</dd>
                </div>
                <div>
                  <dt>Signals</dt>
                  <dd>{bridgePlan.totals.connectorApprovalActions + bridgePlan.totals.importJobActions + bridgePlan.totals.importHandoffActions}</dd>
                </div>
                <div>
                  <dt>Commands</dt>
                  <dd>{bridgePlan.totals.portfolioCommandActions}</dd>
                </div>
              </dl>

              {bridgePlan.actions.length > 0 ? bridgePlan.actions.map((action) => (
                <article key={action.actionId}>
                  <span>{label(action.dispatchKind)} / {label(action.status)} / priority {action.priorityScore}</span>
                  <strong>{action.storeName}</strong>
                  <p>{action.summary}</p>
                  <small>{action.endpoint}</small>
                  {action.blockedReason ? <small>{action.blockedReason}</small> : null}
                </article>
              )) : <p className="revenue-engine-clear">No bridge actions matched the current checklist filters.</p>}
            </section>
          ) : null}

          <div className="revenue-engine-blocked" aria-label="Revenue launch checklist locked actions">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>No marketplace, provider, payout, upload, browser, proxy, stealth, fingerprint, or external write execution.</span>
          </div>

          <div className="revenue-engine-blocked" aria-label="Revenue launch checklist score model">
            <Gauge aria-hidden="true" size={18} />
            <span>Scores combine readiness, income velocity, connector urgency, signal evidence, blockers, and risk.</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
