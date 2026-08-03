"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Database, RefreshCw, ShieldCheck } from "lucide-react";
import type { CapabilityTruthRecord } from "@entral/contracts";
import {
  loadCapabilityTruthAdminReadback,
  type CapabilityTruthAdminReadback
} from "../lib/capability-truth";
import { Button } from "./Button";
import { SkeletonList } from "./Skeleton";

type CapabilityTruthAdminProps = {
  headers?: HeadersInit;
};

function formatTimestamp(value: string | null) {
  return value ? new Date(value).toLocaleString() : "Never verified";
}

function CapabilityRecordDetails({ record }: { record: CapabilityTruthRecord }) {
  return (
    <details className="admin-row">
      <summary>
        <strong>{record.display_name}</strong>
        {" "}
        <span>{record.capability_key} · {record.capability_version} · {record.lifecycle_state}</span>
      </summary>

      <dl>
        <dt>Capability ID</dt>
        <dd><code>{record.capability_id}</code></dd>
        <dt>Kind</dt>
        <dd>{record.kind}</dd>
        <dt>Lifecycle</dt>
        <dd>{record.lifecycle_state}</dd>
        <dt>Public claim eligibility</dt>
        <dd>{record.public_claim_eligible ? "Eligible" : "Blocked"}</dd>
        <dt>Owner</dt>
        <dd>{record.owner}</dd>
        <dt>Environment</dt>
        <dd>{record.environment}</dd>
        <dt>Scope</dt>
        <dd>{record.scope}{record.organization_id ? ` · organization ${record.organization_id}` : ""}</dd>
        <dt>Last verification</dt>
        <dd>{formatTimestamp(record.last_verified_at)}</dd>
        <dt>Failure state</dt>
        <dd>
          {record.failure_state
            ? `${record.failure_state.code}: ${record.failure_state.summary} (${formatTimestamp(record.failure_state.observed_at)})`
            : "No failure reported"}
        </dd>
        <dt>Rollback path</dt>
        <dd>{record.rollback_path}</dd>
        <dt>Deactivation path</dt>
        <dd>{record.deactivation_path}</dd>
      </dl>

      <section aria-label={`${record.display_name} dependencies`}>
        <h3>Dependencies</h3>
        {record.dependencies.length === 0 ? <p>No dependencies recorded.</p> : (
          <ul>
            {record.dependencies.map((dependency) => (
              <li key={`${dependency.capability_id}:${dependency.capability_version}`}>
                <code>{dependency.capability_id}</code> · {dependency.capability_version} · requires {dependency.minimum_lifecycle_state}{dependency.required ? "" : " (optional)"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={`${record.display_name} activation requirements`}>
        <h3>Activation requirements</h3>
        {record.activation_requirements.length === 0 ? <p>No activation requirements recorded.</p> : (
          <ul>
            {record.activation_requirements.map((requirement) => (
              <li key={requirement.requirement_code}>
                <strong>{requirement.requirement_code}</strong>: {requirement.description} · {requirement.satisfied ? "satisfied" : "not satisfied"}{requirement.required ? "" : " · optional"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={`${record.display_name} verification evidence`}>
        <h3>Verification evidence</h3>
        {record.verification_receipts.length === 0 ? <p>No verification receipts recorded.</p> : (
          <ul>
            {record.verification_receipts.map((receipt) => (
              <li key={receipt.receipt_id}>
                <strong>{receipt.evidence_type}</strong> · {receipt.status} · {receipt.environment} · {formatTimestamp(receipt.captured_at)}<br />
                <span>{receipt.reference}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </details>
  );
}

export function CapabilityTruthAdmin({ headers }: CapabilityTruthAdminProps) {
  const [readback, setReadback] = useState<CapabilityTruthAdminReadback | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");

  const loadReadback = useCallback(async (signal?: AbortSignal) => {
    setReadback(null);
    setStatus("loading");
    try {
      const nextReadback = await loadCapabilityTruthAdminReadback({ headers, signal });
      if (signal?.aborted) return;
      setReadback(nextReadback);
      setStatus("ready");
    } catch {
      if (signal?.aborted) return;
      setReadback(null);
      setStatus("unavailable");
    }
  }, [headers]);

  useEffect(() => {
    const controller = new AbortController();
    void loadReadback(controller.signal);
    return () => controller.abort();
  }, [loadReadback]);

  return (
    <section className="admin-panel" aria-label="Capability Truth Registry">
      <header>
        <div>
          <h2>Capability Truth Registry</h2>
          <p>Read-only lifecycle, publication eligibility, and receipt evidence from the canonical registry.</p>
        </div>
        <Button disabled={status === "loading"} onClick={() => void loadReadback()} type="button" variant="secondary">
          <RefreshCw aria-hidden="true" size={18} />
          Refresh truth
        </Button>
      </header>

      {status === "loading" ? <SkeletonList count={3} label="Loading Capability Truth Registry" /> : null}
      {status === "unavailable" ? (
        <section className="permission-state" role="alert">
          <Database aria-hidden="true" size={28} />
          <h3>Capability Truth unavailable</h3>
          <p>The registry could not be verified. No cached or local capability status is being shown.</p>
        </section>
      ) : null}
      {status === "ready" && readback ? (
        <>
          <div className="admin-metrics" aria-label="Capability Truth summary">
            <article className="metric-card">
              <span>Registry revision</span>
              <strong>{readback.registry_revision}</strong>
            </article>
            <article className="metric-card">
              <span>Capabilities</span>
              <strong>{readback.records.length}</strong>
            </article>
            <article className="metric-card">
              <span>Claims</span>
              <strong>{readback.claims.length}</strong>
            </article>
            <article className="metric-card">
              <span>Installations</span>
              <strong>{readback.installations.length}</strong>
            </article>
          </div>
          <p role="status">
            <ShieldCheck aria-hidden="true" size={16} /> Verified readback generated {formatTimestamp(readback.generated_at)}.
          </p>
          {readback.records.length === 0 ? (
            <p role="status">No capabilities are catalogued in this environment.</p>
          ) : (
            <div className="audit-list">
              {readback.records.map((record) => <CapabilityRecordDetails key={record.capability_id} record={record} />)}
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
