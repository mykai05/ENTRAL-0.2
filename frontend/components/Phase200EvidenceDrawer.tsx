"use client";

import type { InteractionEvidenceReference } from "@entral/contracts";
import { ChevronDown, Database } from "lucide-react";
import React from "react";

export function Phase200EvidenceDrawer({
  evidence,
  label = "Evidence and freshness"
}: {
  readonly evidence: readonly InteractionEvidenceReference[];
  readonly label?: string;
}) {
  return (
    <details className="phase200-evidence-drawer">
      <summary>
        <Database aria-hidden="true" size={16} />
        {label}
        <span>{evidence.length}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </summary>
      {evidence.length ? (
        <ul>
          {evidence.map((reference) => (
            <li key={reference.evidence_id}>
              <strong>{reference.label}</strong>
              <span>{reference.source_type.replaceAll("_", " ")} · {reference.freshness.toLocaleLowerCase()}</span>
              <time dateTime={reference.observed_at}>{new Date(reference.observed_at).toLocaleString()}</time>
              <code>{reference.source_id}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p>No source reference is available for this response.</p>
      )}
    </details>
  );
}
