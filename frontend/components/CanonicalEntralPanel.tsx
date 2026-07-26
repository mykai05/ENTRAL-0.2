"use client";

import type {
  CanonicalEntralConversationMessage,
  CanonicalEvidenceReference,
  CanonicalPortfolioEvent
} from "@entral/contracts";
import { CheckCircle2, Clock3, ExternalLink, FileSearch, MessageSquareText, ShieldCheck } from "lucide-react";
import Link from "next/link";
import React, { useMemo } from "react";

function actionState(event: CanonicalPortfolioEvent | undefined) {
  if (!event) return null;
  if (/(failed|rejected|blocked|cancelled)/i.test(event.event_type)) return "Exception recorded";
  if (/(completed|applied|verified|succeeded|approved)/i.test(event.event_type)) return "Verified result recorded";
  return "Canonical update recorded";
}

function evidenceHref(reference: CanonicalEvidenceReference, messageBusinessId: string | null) {
  const referenceType = reference.type.toUpperCase();
  const businessId = referenceType === "BUSINESS" ? reference.id : messageBusinessId;
  if (businessId) {
    return `/member/dashboard?business=${encodeURIComponent(businessId)}&evidence=${encodeURIComponent(reference.id)}#canonical-evidence-${encodeURIComponent(reference.id)}`;
  }
  if (referenceType === "ENTITY") {
    return `/member/infrastructure?entity=${encodeURIComponent(reference.id)}`;
  }
  return null;
}

export function CanonicalEntralPanel({
  eventSequence,
  events,
  isAligned,
  messages,
  scopeBusinessId,
  scopeLabel,
  selectedEntityId,
  syncState,
  workspaceError
}: {
  eventSequence: number;
  events: readonly CanonicalPortfolioEvent[];
  isAligned: boolean;
  messages: readonly CanonicalEntralConversationMessage[];
  scopeBusinessId: string | null;
  scopeLabel: string;
  selectedEntityId: string | null;
  syncState: "connecting" | "connected" | "disconnected";
  workspaceError: string;
}) {
  const scopedEvents = useMemo(() => events
    .filter((event) => !scopeBusinessId || (
      event.business_id === scopeBusinessId
      || (event.aggregate_type.toUpperCase() === "BUSINESS" && event.aggregate_id === scopeBusinessId)
    ))
    .sort((left, right) => right.sequence_number - left.sequence_number)
    .slice(0, 12), [events, scopeBusinessId]);
  const scopedMessages = useMemo(
    () => [...messages].sort((left, right) => right.created_at.localeCompare(left.created_at)),
    [messages]
  );
  const latestActionEvent = scopedEvents.find((event) => /(action|mission|task|command)/i.test(event.event_type));
  const recordHref = selectedEntityId
    ? "/member/infrastructure"
    : scopeBusinessId
      ? `/member/dashboard?business=${encodeURIComponent(scopeBusinessId)}`
      : "/member/dashboard";
  const verified = isAligned && syncState === "connected" && !workspaceError;

  return (
    <section className="phase180-entral-panel" aria-label="Canonical ENTRAL context">
      <header>
        <div>
          <p className="eyebrow">Canonical context</p>
          <h2>ENTRAL Communications</h2>
        </div>
        <span>Event {eventSequence}</span>
      </header>

      <p className="phase180-entral-scope">
        <ShieldCheck aria-hidden="true" size={18} />
        <span><strong>Visible inherited scope</strong>{scopeLabel}</span>
      </p>

      <div className="phase180-entral-status-grid">
        <article>
          <MessageSquareText aria-hidden="true" size={19} />
          <div>
            <strong>Versioned conversation history</strong>
            {scopedMessages.length ? (
              <ol aria-label="Scoped Human and ENTRAL conversation history" className="phase180-entral-history">
                {scopedMessages.map((message) => (
                  <li key={message.message_id}>
                    <span>
                      {message.direction === "HUMAN_TO_ENTRAL" ? "Human to ENTRAL" : "ENTRAL to Human"}
                      {message.event_sequence ? ` · Event ${message.event_sequence}` : ""}
                    </span>
                    <strong>{message.content}</strong>
                    <small>
                      {message.message_type.replace(/[._]/g, " ")} · {message.status.replace(/[._]/g, " ")}
                      {" · "}{new Date(message.created_at).toLocaleString()}
                      {message.event_id ? ` · Event ID ${message.event_id}` : " · Event receipt pending"}
                    </small>
                    {message.evidence_refs.length ? (
                      <span>
                        Evidence:{" "}
                        {message.evidence_refs.map((reference, index) => {
                          const href = evidenceHref(reference, message.business_id);
                          return (
                            <React.Fragment key={`${reference.type}:${reference.id}:${index}`}>
                              {index ? ", " : ""}
                              {href ? (
                                <Link href={href}>{reference.id}</Link>
                              ) : (
                                <span title="No canonical UI record target is available for this reference type.">
                                  <code>{reference.id}</code> ({reference.type})
                                </span>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No versioned Human and ENTRAL conversation message is recorded for this inherited scope through Event {eventSequence}.</p>
            )}
          </div>
        </article>
        <article>
          <Clock3 aria-hidden="true" size={19} />
          <div>
            <strong>Action progress</strong>
            <p>
              {latestActionEvent
                ? `${actionState(latestActionEvent)} at Event ${latestActionEvent.sequence_number}: ${latestActionEvent.event_type.replace(/[._]/g, " ")}.`
                : "No action-status event is present in the canonical history returned for this scope."}
              {" "}Member mutation controls remain withheld until their governed execution path is complete.
            </p>
          </div>
        </article>
        <article>
          <CheckCircle2 aria-hidden="true" size={19} />
          <div>
            <strong>Verified result</strong>
            <p>{verified
              ? `Dashboard, Universe Graph, Infrastructure, and this ENTRAL context are aligned to canonical event ${eventSequence}.`
              : `Cross-surface verification is pending while canonical synchronization is ${syncState}.`}</p>
          </div>
        </article>
        <article>
          <FileSearch aria-hidden="true" size={19} />
          <div>
            <strong>Remaining exception</strong>
            <p>{workspaceError || (syncState === "disconnected"
              ? "The canonical event channel is disconnected and retrying."
              : "No unresolved shell synchronization exception is reported.")}</p>
          </div>
        </article>
      </div>

      <footer>
        <Link href={recordHref}>
          {selectedEntityId ? "Open selected entity evidence" : scopeBusinessId ? "Open scoped business evidence" : "Review canonical Dashboard"}
          <ExternalLink aria-hidden="true" size={15} />
        </Link>
        <span>Conversation entries expose their canonical event receipt and exact evidence references; no action is inferred from presentation state.</span>
      </footer>
    </section>
  );
}
