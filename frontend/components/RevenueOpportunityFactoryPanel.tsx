"use client";

import React, { useState } from "react";
import { Factory, PlayCircle, SearchCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  formatMerchCurrency,
  type RevenueOpportunityFactoryPlan,
  type RevenueOpportunityFactoryResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueOpportunityFactoryPanelProps = {
  onApplied: () => void | Promise<void>;
};

type FactoryForm = {
  businessName: string;
  idea: string;
  productCount: number;
  productTypes: string;
};

function defaultForm(): FactoryForm {
  return {
    businessName: "",
    idea: "Private operator merch and digital-adjacent POD line for funding ENTRAL advancement",
    productCount: 5,
    productTypes: "T-shirt, Sticker, Notebook, Poster"
  };
}

function splitProductTypes(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12);
}

export function RevenueOpportunityFactoryPanel({ onApplied }: RevenueOpportunityFactoryPanelProps) {
  const [form, setForm] = useState<FactoryForm>(() => defaultForm());
  const [plan, setPlan] = useState<RevenueOpportunityFactoryPlan | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  function updateForm(field: keyof FactoryForm, value: string | number) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }

  async function runFactory(dryRun: boolean) {
    const setBusy = dryRun ? setIsPreviewing : setIsApplying;
    setBusy(true);
    setError("");

    try {
      const response = await apiFetch<RevenueOpportunityFactoryResponse>("/merch/revenue-engine/opportunity-factory", {
        json: {
          businessName: form.businessName || undefined,
          confirm: "CREATE INTERNAL REVENUE OPPORTUNITY",
          dryRun,
          idea: form.idea,
          priceRange: {
            max: 64,
            min: 18
          },
          productCount: form.productCount,
          productTypes: splitProductTypes(form.productTypes),
          riskTolerance: "Low",
          storePlatform: "Etsy"
        },
        method: "POST"
      });

      setPlan(response.plan);
      setMessage(dryRun
        ? `Opportunity preview ready: ${response.applied.productDraftsCreated} internal draft${response.applied.productDraftsCreated === 1 ? "" : "s"} planned.`
        : `Opportunity created: ${response.applied.productDraftsCreated} internal draft${response.applied.productDraftsCreated === 1 ? "" : "s"} written. No providers contacted.`);

      if (!dryRun) {
        await onApplied();
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Revenue opportunity factory failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="automation-list" aria-label="Revenue Opportunity Factory">
      <header>
        <div>
          <h2>Revenue Opportunity Factory</h2>
          <p>Turn a private idea into an internal store shell, draft products, and the next revenue-engine queue.</p>
        </div>
        <Factory aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="autopilot-controls" aria-label="Revenue opportunity factory controls">
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
      </div>

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void runFactory(true)} disabled={isPreviewing || form.idea.trim().length < 10}>
          <SearchCheck aria-hidden="true" size={18} />
          {isPreviewing ? "Previewing..." : "Preview opportunity"}
        </Button>
        <Button type="button" variant="primary" onClick={() => void runFactory(false)} disabled={isApplying || form.idea.trim().length < 10}>
          <PlayCircle aria-hidden="true" size={18} />
          {isApplying ? "Creating..." : "Create internal opportunity"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Revenue opportunity factory result">
          <div className="revenue-engine-summary">
            <strong>{plan.storeDraft.businessName}</strong>
            <p>{plan.summary}</p>
          </div>
          <dl className="revenue-engine-metrics">
            <div>
              <dt>Drafts</dt>
              <dd>{plan.totals.productDrafts}</dd>
            </div>
            <div>
              <dt>Skipped</dt>
              <dd>{plan.totals.skippedProductDrafts}</dd>
            </div>
            <div>
              <dt>Draft Profit</dt>
              <dd>{formatMerchCurrency(plan.totals.estimatedDraftProfit)}</dd>
            </div>
          </dl>
          <section className="revenue-engine-list" aria-label="Revenue opportunity next actions">
            <h3>Next Actions</h3>
            {plan.nextInternalActions.map((item) => (
              <article key={item.action}>
                <span>{item.status.replace(/_/g, " ")}</span>
                <strong>{item.title}</strong>
              </article>
            ))}
          </section>
        </section>
      ) : null}
    </section>
  );
}
