"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, DatabaseZap, RefreshCcw, ShieldAlert } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type ClientMerchStore,
  type SignalIntakeApplyResponse,
  type SignalIntakeInput,
  type SignalIntakePlan,
  type SignalIntakeResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type SignalIntakePanelProps = {
  autoLoad?: boolean;
  onApplied: () => void | Promise<void>;
  selectedStore: ClientMerchStore | null;
};

type SignalIntakeForm = {
  availableBalance: number;
  contentRevenue: number;
  grossRevenue: number;
  unitsSold: number;
  visits: number;
  views: number;
};

function defaultForm(): SignalIntakeForm {
  return {
    availableBalance: 180,
    contentRevenue: 110,
    grossRevenue: 240,
    unitsSold: 8,
    visits: 320,
    views: 2400
  };
}

function sourceFor(store: ClientMerchStore | null) {
  if (store?.storePlatform === "Shopify") return "shopify";
  if (store?.storePlatform === "Etsy") return "etsy";
  return "manual";
}

function signalWindow() {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 86_400_000);

  return {
    periodEnd: periodEnd.toISOString(),
    periodStart: periodStart.toISOString()
  };
}

function buildSignals(store: ClientMerchStore, form: SignalIntakeForm): SignalIntakeInput {
  const window = signalWindow();

  return {
    commerceSignals: [{
      adSpend: 0,
      externalReference: `${store.storePlatform.toLowerCase()}-approved-readonly`,
      grossRevenue: form.grossRevenue,
      periodEnd: window.periodEnd,
      periodStart: window.periodStart,
      platformFees: Math.round(form.grossRevenue * 0.08 * 100) / 100,
      productionCost: Math.round(form.grossRevenue * 0.3 * 100) / 100,
      shippingCost: Math.round(form.unitsSold * 3.5 * 100) / 100,
      source: sourceFor(store),
      storeId: store.id,
      unitsSold: form.unitsSold,
      visits: form.visits
    }],
    contentSignals: [{
      channel: "youtube_shorts",
      clicks: Math.round(form.views * 0.02),
      conversions: Math.max(0, Math.round(form.unitsSold / 2)),
      externalReference: "shorts-approved-readonly",
      periodEnd: window.periodEnd,
      periodStart: window.periodStart,
      revenue: form.contentRevenue,
      source: "youtube",
      storeId: store.id,
      views: form.views,
      watchSeconds: Math.round(form.views * 13)
    }],
    paymentSignals: [{
      availableBalance: form.availableBalance,
      externalReference: "stripe-approved-readonly",
      fees: Math.round((form.grossRevenue + form.contentRevenue) * 0.03 * 100) / 100,
      paidOut: 0,
      pendingBalance: Math.round(form.grossRevenue * 0.25 * 100) / 100,
      periodEnd: window.periodEnd,
      periodStart: window.periodStart,
      provider: "stripe"
    }]
  };
}

function riskLabel(value: string) {
  return value.replace(/_/g, " ");
}

export function SignalIntakePanel({ autoLoad = true, onApplied, selectedStore }: SignalIntakePanelProps) {
  const [plan, setPlan] = useState<SignalIntakePlan | null>(null);
  const [form, setForm] = useState<SignalIntakeForm>(() => defaultForm());
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const stagedSignals = useMemo(() => selectedStore ? buildSignals(selectedStore, form) : null, [form, selectedStore]);

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<SignalIntakeResponse>("/merch/revenue-engine/signal-intake");
      setPlan(response.plan);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal intake check failed.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoLoad) {
      void loadPlan();
    }
  }, [autoLoad, loadPlan]);

  function updateField(field: keyof SignalIntakeForm, value: number) {
    setForm((current) => ({
      ...current,
      [field]: Number.isFinite(value) ? value : 0
    }));
  }

  async function runIntake(dryRun: boolean) {
    if (!selectedStore || !stagedSignals) {
      setError("Select a merch store before staging signal intake.");
      return;
    }

    const setBusy = dryRun ? setIsPreviewing : setIsApplying;
    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<SignalIntakeApplyResponse>("/merch/revenue-engine/signal-intake/apply", {
        json: {
          ...stagedSignals,
          confirm: "INGEST APPROVED READ-ONLY SIGNALS",
          dryRun
        },
        method: "POST"
      });

      setPlan(response.plan);
      setMessage(dryRun
        ? `Signal preview ready: ${response.plan.totals.signals} approved read-only signals staged.`
        : `Signal intake recorded: ${response.ingested.revenueSnapshotsCreated} commerce, ${response.ingested.contentSnapshotsCreated} content, and ${response.ingested.paymentSignalsRecorded} payment signal${response.ingested.paymentSignalsRecorded === 1 ? "" : "s"}.`);

      if (!dryRun) {
        await onApplied();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Signal intake failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="automation-list" aria-label="Signal Intake Center">
      <header>
        <div>
          <h2>Signal Intake</h2>
          <p>Approved read-only evidence for revenue, content, and payment reconciliation.</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void loadPlan()} disabled={isLoading}>
          <RefreshCcw aria-hidden="true" size={18} className={isLoading ? "spin" : ""} />
          Refresh
        </Button>
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="command-health-grid">
        <article>
          <span>Store</span>
          <strong>{selectedStore?.businessName ?? "None"}</strong>
          <small>{selectedStore?.storePlatform ?? "Select a store"}</small>
        </article>
        <article>
          <span>Gross</span>
          <strong>{formatMerchCurrency(form.grossRevenue)}</strong>
          <small>{form.unitsSold} units / {form.visits} visits</small>
        </article>
        <article>
          <span>Content</span>
          <strong>{form.views}</strong>
          <small>{formatMerchCurrency(form.contentRevenue)} signal revenue</small>
        </article>
        <article>
          <span>Balance</span>
          <strong>{formatMerchCurrency(form.availableBalance)}</strong>
          <small>record-only payment evidence</small>
        </article>
      </div>

      <div className="signal-intake-fields">
        {([
          ["grossRevenue", "Gross revenue"],
          ["unitsSold", "Units"],
          ["visits", "Visits"],
          ["views", "Views"],
          ["contentRevenue", "Content revenue"],
          ["availableBalance", "Available balance"]
        ] as const).map(([field, label]) => (
          <label key={field}>
            <span>{label}</span>
            <input
              min="0"
              step={field === "unitsSold" || field === "visits" || field === "views" ? "1" : "0.01"}
              type="number"
              value={form[field]}
              onChange={(event) => updateField(field, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void runIntake(true)} disabled={!selectedStore || isPreviewing}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {isPreviewing ? "Previewing..." : "Preview intake"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => void runIntake(false)} disabled={!selectedStore || isApplying}>
          <DatabaseZap aria-hidden="true" size={18} />
          {isApplying ? "Recording..." : "Record signals"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <>
          <section className="revenue-engine-list" aria-label="Signal intake lanes">
            <h3>{plan.mode}</h3>
            {plan.lanes.map((lane) => (
              <article key={lane.lane}>
                <span>{riskLabel(lane.riskLevel)} risk / {lane.count} signal{lane.count === 1 ? "" : "s"}</span>
                <strong>{riskLabel(lane.lane)}</strong>
                <p>{lane.summary}</p>
              </article>
            ))}
          </section>

          <div className="revenue-engine-blocked" aria-label="Signal intake blocked external actions">
            {plan.blockedExternalActions.slice(0, 4).map((action) => (
              <span key={action}>
                <ShieldAlert aria-hidden="true" size={14} />
                {action}
              </span>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
