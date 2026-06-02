"use client";

import React, { useEffect, useState } from "react";
import { Gauge, ShieldCheck, TriangleAlert } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { ModeBadge, type ModeStatusKind } from "./ModeStatus";

type AiUsageWindow = {
  limitCents: number;
  remainingCents: number;
  usedCents: number;
};

export type AiUsageSummary = {
  daily: AiUsageWindow;
  monthly: AiUsageWindow;
  mode: "mock" | "real";
  provider: {
    modelName: string;
    providerName: string;
    status: string;
  };
};

type AiUsageResponse = {
  summary: AiUsageSummary;
};

type AiUsageGuardrailProps = {
  refreshIndex?: number;
};

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: "currency"
  }).format(cents / 100);
}

function usagePercent(window: AiUsageWindow) {
  if (window.limitCents <= 0) {
    return window.usedCents > 0 ? 100 : 0;
  }

  return Math.min(100, Math.round((window.usedCents / window.limitCents) * 100));
}

function UsageMeter({ label, window }: { label: string; window: AiUsageWindow }) {
  const percent = usagePercent(window);

  return (
    <div className="ai-usage-meter">
      <div className="ai-usage-meter-label">
        <span>{label}</span>
        <span>{formatCents(window.usedCents)} / {formatCents(window.limitCents)}</span>
      </div>
      <div
        aria-label={`${label} AI budget usage`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percent}
        className="ai-usage-meter-track"
        role="progressbar"
      >
        <span style={{ inlineSize: `${percent}%` }} />
      </div>
      <span className="ai-usage-meter-remaining">{formatCents(window.remainingCents)} remaining</span>
    </div>
  );
}

export function AiUsageGuardrail({ refreshIndex = 0 }: AiUsageGuardrailProps) {
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [error, setError] = useState("");
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadUsage() {
      try {
        const response = await apiFetch<AiUsageResponse>("/ai/usage");

        if (isMounted) {
          setSummary(response.summary);
          setError("");
          setIsHidden(false);
        }
      } catch (loadError) {
        if (!isMounted) return;

        if (loadError instanceof ApiError && loadError.status === 401) {
          setIsHidden(true);
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "AI usage status is unavailable.");
      }
    }

    void loadUsage();

    return () => {
      isMounted = false;
    };
  }, [refreshIndex]);

  if (isHidden) {
    return null;
  }

  if (error) {
    return (
      <section className="ai-usage-guardrail compact" aria-label="AI usage guardrails">
        <div className="ai-usage-heading">
          <span className="ai-usage-title">
            <TriangleAlert aria-hidden="true" size={18} />
            <strong>AI cost guardrails</strong>
          </span>
          <ModeBadge mode="read-only">Status unavailable</ModeBadge>
        </div>
        <p>{error}</p>
      </section>
    );
  }

  if (!summary) {
    return (
      <section className="ai-usage-guardrail compact" aria-label="AI usage guardrails">
        <div className="ai-usage-heading">
          <span className="ai-usage-title">
            <Gauge aria-hidden="true" size={18} />
            <strong>AI cost guardrails</strong>
          </span>
          <ModeBadge mode="read-only">Checking</ModeBadge>
        </div>
      </section>
    );
  }

  const isAtLimit = summary.daily.remainingCents <= 0 || summary.monthly.remainingCents <= 0;
  const badgeMode: ModeStatusKind = isAtLimit ? "read-only" : summary.mode;
  const badgeLabel = isAtLimit ? "Budget cap" : summary.mode === "real" ? "Real provider" : "Mock provider";

  return (
    <section className="ai-usage-guardrail" aria-label="AI usage guardrails">
      <div className="ai-usage-heading">
        <span className="ai-usage-title">
          <ShieldCheck aria-hidden="true" size={18} />
          <strong>AI cost guardrails</strong>
        </span>
        <ModeBadge mode={badgeMode}>{badgeLabel}</ModeBadge>
      </div>
      <p>{summary.provider.providerName} status: {summary.provider.status}. Provider calls pause before caps; external actions still require approval.</p>
      <div className="ai-usage-meter-grid">
        <UsageMeter label="Today" window={summary.daily} />
        <UsageMeter label="This month" window={summary.monthly} />
      </div>
    </section>
  );
}
