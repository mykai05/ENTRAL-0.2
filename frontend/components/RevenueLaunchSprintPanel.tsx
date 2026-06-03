"use client";

import React, { useState } from "react";
import { ClipboardCheck, LockKeyhole, Rocket, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { RevenueLaunchSprintPlan, RevenueLaunchSprintResponse } from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLaunchSprintPanelProps = {
  onApplied: () => void | Promise<void>;
};

type SprintForm = {
  businessName: string;
  idea: string;
  maxCycles: number;
  productCount: number;
  productTypes: string;
};

const sprintConfirmation = "RUN INTERNAL REVENUE LAUNCH SPRINT";

function defaultForm(): SprintForm {
  return {
    businessName: "",
    idea: "Private operator POD revenue line for funding ENTRAL advancement with fast internal launch evidence",
    maxCycles: 4,
    productCount: 5,
    productTypes: "T-shirt, Sticker, Notebook, Poster"
  };
}

function label(value: string) {
  return value.replace(/_/g, " ");
}

function splitProductTypes(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

export function RevenueLaunchSprintPanel({ onApplied }: RevenueLaunchSprintPanelProps) {
  const [form, setForm] = useState<SprintForm>(() => defaultForm());
  const [plan, setPlan] = useState<RevenueLaunchSprintPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  function updateForm(field: keyof SprintForm, value: string | number) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function runSprint(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewing : setIsRunning;

    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchSprintResponse>("/merch/revenue-engine/launch-sprint", {
        json: {
          businessName: form.businessName || undefined,
          confirm: sprintConfirmation,
          dryRun,
          idea: form.idea,
          maxActions: 5,
          maxCycles: form.maxCycles,
          maxItems: 25,
          productCount: form.productCount,
          productTypes: splitProductTypes(form.productTypes),
          riskTolerance: "Low",
          storePlatform: "Etsy"
        },
        method: "POST"
      });

      setPlan(response.sprint);
      setMessage(response.sprint.summary);

      if (!dryRun) {
        await onApplied();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue launch sprint failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="automation-list" aria-label="Revenue Launch Sprint">
      <header>
        <div>
          <h2>Launch Sprint</h2>
          <p>Run a bounded internal sprint from idea to checklist bridge dispatch and launch evidence.</p>
        </div>
        <Rocket aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="autopilot-controls" aria-label="Revenue launch sprint controls">
        <label>
          <span>Idea</span>
          <textarea
            rows={3}
            value={form.idea}
            onChange={(event) => updateForm("idea", event.target.value)}
          />
        </label>
        <label>
          <span>Business name</span>
          <input
            type="text"
            value={form.businessName}
            placeholder="Auto-derived"
            onChange={(event) => updateForm("businessName", event.target.value)}
          />
        </label>
        <label>
          <span>Product types</span>
          <input
            type="text"
            value={form.productTypes}
            onChange={(event) => updateForm("productTypes", event.target.value)}
          />
        </label>
        <label>
          <span>Drafts</span>
          <input
            min="5"
            max="25"
            step="5"
            type="number"
            value={form.productCount}
            onChange={(event) => updateForm("productCount", Math.max(5, Math.min(25, Number(event.target.value) || 5)))}
          />
        </label>
        <label>
          <span>Cycles</span>
          <input
            min="1"
            max="8"
            step="1"
            type="number"
            value={form.maxCycles}
            onChange={(event) => updateForm("maxCycles", Math.max(1, Math.min(8, Number(event.target.value) || 1)))}
          />
        </label>
      </div>

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void runSprint(true)} disabled={isPreviewing || form.idea.trim().length < 10}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {isPreviewing ? "Previewing..." : "Preview sprint"}
        </Button>
        <Button type="button" variant="primary" onClick={() => void runSprint(false)} disabled={isRunning || form.idea.trim().length < 10}>
          <LockKeyhole aria-hidden="true" size={18} />
          {isRunning ? "Running..." : "Run internal sprint"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Revenue launch sprint result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Cycles</dt>
              <dd>{plan.totals.cyclesRun}</dd>
            </div>
            <div>
              <dt>Dispatched</dt>
              <dd>{plan.totals.actionsDispatched}</dd>
            </div>
            <div>
              <dt>Previewed</dt>
              <dd>{plan.totals.actionsPreviewed}</dd>
            </div>
            <div>
              <dt>Drafts</dt>
              <dd>{plan.totals.factoryProductDraftsCreated}</dd>
            </div>
            <div>
              <dt>Evidence</dt>
              <dd>{plan.finalChecklist.signalEvidenceItems}</dd>
            </div>
            <div>
              <dt>Score Controls</dt>
              <dd>{plan.totals.scoreControlActions}</dd>
            </div>
            <div>
              <dt>Commands</dt>
              <dd>{plan.totals.commandRecordsCreated}</dd>
            </div>
            <div>
              <dt>Ledger</dt>
              <dd>{plan.totals.assetControlRecordsCreated}</dd>
            </div>
            <div>
              <dt>Updates</dt>
              <dd>{plan.totals.internalStatusUpdates}</dd>
            </div>
            <div>
              <dt>Stop</dt>
              <dd>{label(plan.stopReason)}</dd>
            </div>
          </dl>

          <section className="revenue-engine-list" aria-label="Revenue launch sprint cycles">
            <h3>Cycles</h3>
            {plan.cycles.map((cycle) => (
              <article key={cycle.cycle}>
                <span>cycle {cycle.cycle} / ready {cycle.readyActions} / score controls {cycle.scoreControlActions} / commands {cycle.dispatched?.commandRecordsCreated ?? 0} / ledger {cycle.dispatched?.assetControlRecordsCreated ?? 0} / blocked {cycle.blockedActions}</span>
                <strong>{cycle.dispatched?.summary ?? "No ready bridge actions selected."}</strong>
                <p>{cycle.selectedDispatchKinds.length > 0 ? `${cycle.selectedDispatchKinds.map(label).join(" / ")} / ${cycle.dispatched?.internalStatusUpdates ?? 0} internal status update${(cycle.dispatched?.internalStatusUpdates ?? 0) === 1 ? "" : "s"}` : "Sprint stopped without internal dispatch."}</p>
              </article>
            ))}
          </section>

          {plan.finalManualReviewActions.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Revenue launch sprint review gates">
              <h3>Review Gates</h3>
              {plan.finalManualReviewActions.slice(0, 5).map((action) => (
                <article key={action.actionId}>
                  <span>{label(action.checklistAction)} / {label(action.dispatchKind)}</span>
                  <strong>{action.storeName}</strong>
                  <p>{action.blockedReason ?? "Direct review required before sprint can continue."}</p>
                </article>
              ))}
            </section>
          ) : null}

          <div className="revenue-engine-blocked" aria-label="Revenue launch sprint locked actions">
            <ShieldCheck aria-hidden="true" size={18} />
            <span>No external publishing, provider writes, payouts, live imports, browser stealth, proxy rotation, fingerprint spoofing, or platform evasion.</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
