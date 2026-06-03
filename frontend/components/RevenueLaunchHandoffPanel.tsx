"use client";

import React, { useEffect, useState } from "react";
import { ClipboardCheck, PackageCheck, RefreshCcw, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import {
  type RevenueLaunchHandoffApplyResponse,
  type RevenueLaunchHandoffPacketRecord,
  type RevenueLaunchHandoffPlan,
  type RevenueLaunchHandoffResponse
} from "../lib/merch-store";
import { Button } from "./Button";

type RevenueLaunchHandoffPanelProps = {
  autoLoad?: boolean;
};

function label(value: string) {
  return value.replace(/_/g, " ");
}

function firstManifestLabel(item: RevenueLaunchHandoffPlan["items"][number]) {
  const manifest = item.bundle?.requestManifest[0];

  if (!manifest) return `${item.providerPayload.payloadCount} locked payloads`;

  return `${manifest.provider} / ${manifest.method} / ${manifest.executionState}`;
}

export function RevenueLaunchHandoffPanel({ autoLoad = false }: RevenueLaunchHandoffPanelProps) {
  const [plan, setPlan] = useState<RevenueLaunchHandoffPlan | null>(null);
  const [records, setRecords] = useState<RevenueLaunchHandoffPacketRecord[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  async function loadLaunchHandoff() {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchHandoffResponse>("/merch/revenue-engine/launch-handoff");
      setPlan(response.plan);
      setRecords(response.records ?? response.plan.persistedPackets);
      setMessage(`${response.plan.totals.bundlesPrepared} launch handoff bundle${response.plan.totals.bundlesPrepared === 1 ? "" : "s"} prepared internally.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch handoff packets failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function recordLaunchHandoff() {
    setIsRecording(true);
    setError("");

    try {
      const response = await apiFetch<RevenueLaunchHandoffApplyResponse>("/merch/revenue-engine/launch-handoff/apply", {
        json: {
          confirm: "RECORD INTERNAL LAUNCH HANDOFF PACKETS",
          dryRun: false
        },
        method: "POST"
      });
      setPlan(response.plan);
      setRecords(response.records);
      setMessage(`Recorded ${response.applied.recordsCreated} new and ${response.applied.recordsUpdated} updated launch handoff packet${response.applied.recordsToWrite === 1 ? "" : "s"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Launch handoff packet recording failed.");
    } finally {
      setIsRecording(false);
    }
  }

  useEffect(() => {
    if (autoLoad) {
      void loadLaunchHandoff();
    }
  }, [autoLoad]);

  return (
    <section className="automation-list" aria-label="Revenue Launch Handoff Packet Builder">
      <header>
        <div>
          <h2>Launch Handoff Packets</h2>
          <p>Prepare approved provider bundle previews from the launch board.</p>
        </div>
        <PackageCheck aria-hidden="true" size={22} />
      </header>

      {error ? <p className="form-error" role="alert">{error}</p> : null}

      <div className="row-actions">
        <Button type="button" variant="secondary" onClick={() => void loadLaunchHandoff()} disabled={isLoading}>
          <RefreshCcw aria-hidden="true" size={18} />
          {isLoading ? "Loading..." : "Load handoff packets"}
        </Button>
        <Button type="button" onClick={() => void recordLaunchHandoff()} disabled={isRecording}>
          <ClipboardCheck aria-hidden="true" size={18} />
          {isRecording ? "Recording..." : "Record packets"}
        </Button>
      </div>

      {message ? <p className="growth-approval-message" role="status">{message}</p> : null}

      {plan ? (
        <section className="revenue-engine-result" aria-label="Revenue launch handoff result">
          <div className="revenue-engine-summary">
            <strong>{plan.mode}</strong>
            <p>{plan.summary}</p>
          </div>

          <dl className="revenue-engine-metrics">
            <div>
              <dt>Bundles</dt>
              <dd>{plan.totals.bundlesPrepared}</dd>
            </div>
            <div>
              <dt>Manifests</dt>
              <dd>{plan.totals.manifestsPrepared}</dd>
            </div>
            <div>
              <dt>Artifacts</dt>
              <dd>{plan.totals.artifactSlots}</dd>
            </div>
            <div>
              <dt>Ready</dt>
              <dd>{plan.totals.readyForManualHandoff}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd>{plan.totals.blockedBundles}</dd>
            </div>
          </dl>

          {plan.queue.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Launch handoff queue">
              <h3>Internal Queue</h3>
              {plan.queue.slice(0, 6).map((item) => (
                <article key={`${item.action}-${item.storeId}`}>
                  <span>{label(item.action)}</span>
                  <strong>{item.storeName}</strong>
                  <p>{item.summary}</p>
                </article>
              ))}
            </section>
          ) : (
            <p className="revenue-engine-clear">No launch handoff packets are queued.</p>
          )}

          <section className="revenue-engine-list" aria-label="Launch handoff bundles">
            <h3>Bundle Readiness</h3>
            {plan.items.slice(0, 6).map((item) => (
              <article key={item.storeId}>
                <span>{item.connectorReadiness?.status ?? label(item.action)} / {item.riskLevel}</span>
                <strong>{item.storeName}</strong>
                <p>{item.summary}</p>
                <small>
                  {firstManifestLabel(item)}
                  {item.credentialScopes.length > 0 ? ` / ${item.credentialScopes.slice(0, 3).join(", ")}` : ""}
                </small>
              </article>
            ))}
          </section>

          {records.length > 0 ? (
            <section className="revenue-engine-list" aria-label="Recorded launch handoff packets">
              <h3>Recorded Packets</h3>
              {records.slice(0, 6).map((record) => (
                <article key={record.id}>
                  <span>{label(record.status)} / {record.riskLevel}</span>
                  <strong>{record.storeName}</strong>
                  <p>{record.summary}</p>
                  <small>{record.manifestCount} manifests / {record.artifactSlotCount} artifact slots / audit {record.auditLogId ?? "pending"}</small>
                </article>
              ))}
            </section>
          ) : null}

          <div className="revenue-engine-blocked" aria-label="Launch handoff locked actions">
            {plan.totals.readyForManualHandoff > 0 ? <ShieldCheck aria-hidden="true" size={18} /> : <ClipboardCheck aria-hidden="true" size={18} />}
            <span>{plan.blockedExternalActions.slice(0, 2).join(" / ")}</span>
          </div>
        </section>
      ) : null}
    </section>
  );
}
