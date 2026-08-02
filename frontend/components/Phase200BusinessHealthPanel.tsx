"use client";

import type { BusinessHealthResponse, InteractionMode } from "@entral/contracts";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";
import { loadBusinessHealth, recordInteractionAnalytics } from "../lib/interaction-layer";
import { Phase200EvidenceDrawer } from "./Phase200EvidenceDrawer";

export function Phase200BusinessHealthPanel({
  businessId,
  organizationId,
  route
}: {
  readonly businessId: string | null;
  readonly organizationId: string;
  readonly route: string;
}) {
  const [mode, setMode] = useState<InteractionMode>("EXECUTIVE");
  const [response, setResponse] = useState<BusinessHealthResponse | null>(null);
  const [error, setError] = useState("");
  const [reloadSignal, setReloadSignal] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void loadBusinessHealth(organizationId, businessId, mode, { signal: controller.signal })
      .then(setResponse)
      .catch((loadError: unknown) => {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setResponse(null);
        setError("Canonical business health is unavailable. No score or recommendation has been substituted.");
        void recordInteractionAnalytics({
          eventType: "ROUTE_FAILURE",
          organizationId,
          reasonCode: "BUSINESS_HEALTH_LOAD_FAILED",
          route
        }).catch(() => undefined);
      });
    return () => controller.abort();
  }, [businessId, mode, organizationId, reloadSignal, route]);

  return (
    <section className="phase200-business-health" data-academy="business-health" aria-labelledby="phase200-business-health-heading">
      <header>
        <div>
          <span>ENTRAL · interaction v1</span>
          <h2 id="phase200-business-health-heading">Business health</h2>
        </div>
        <div className="phase200-mode-switch" role="group" aria-label="Business health detail mode">
          <button aria-pressed={mode === "EXECUTIVE"} onClick={() => setMode("EXECUTIVE")} type="button">Executive</button>
          <button aria-pressed={mode === "OPERATIONAL"} onClick={() => setMode("OPERATIONAL")} type="button">Operational</button>
        </div>
      </header>

      {error ? (
        <div className="phase200-business-health-error" role="alert">
          <AlertTriangle aria-hidden="true" size={19} />
          <p>{error}</p>
          <button onClick={() => setReloadSignal((signal) => signal + 1)} type="button"><RefreshCw aria-hidden="true" size={15} /> Retry</button>
        </div>
      ) : response ? (
        <>
          <div className="phase200-health-summary" data-health={response.health.state.toLocaleLowerCase()}>
            <CheckCircle2 aria-hidden="true" size={20} />
            <div>
              <strong>{response.health.state}</strong>
              <p>{response.health.summary}</p>
            </div>
            <span>{response.health.score === null ? "Score unavailable" : `${response.health.score}/100`}</span>
          </div>
          {mode === "OPERATIONAL" && response.health.drivers.length ? (
            <ul className="phase200-health-drivers" aria-label="Canonical health drivers">
              {response.health.drivers.map((driver, index) => (
                <li key={index}><code>{JSON.stringify(driver)}</code></li>
              ))}
            </ul>
          ) : null}
          <dl className="phase200-truth-context">
            <div><dt>Scope</dt><dd>{response.truth.business_scope}</dd></div>
            <div><dt>Freshness</dt><dd>{response.truth.evidence_freshness.state.toLocaleLowerCase()} · <time dateTime={response.truth.evidence_freshness.observed_at}>{new Date(response.truth.evidence_freshness.observed_at).toLocaleString()}</time></dd></div>
            <div><dt>Confidence</dt><dd>{response.truth.confidence.toLocaleLowerCase()}</dd></div>
            <div><dt>Next action</dt><dd>{response.truth.next_action.label}{response.truth.next_action.unavailable_reason ? ` · ${response.truth.next_action.unavailable_reason}` : ""}</dd></div>
            <div><dt>Assumptions</dt><dd>{response.truth.assumptions.length ? response.truth.assumptions.join(" ") : "None recorded."}</dd></div>
          </dl>
          <Phase200EvidenceDrawer evidence={response.evidence} />
        </>
      ) : (
        <p className="phase200-business-health-loading" role="status"><RefreshCw aria-hidden="true" className="spin" size={17} /> Reading canonical health evidence...</p>
      )}
    </section>
  );
}
