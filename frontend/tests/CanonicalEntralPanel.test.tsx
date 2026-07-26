import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CanonicalEntralPanel } from "../components/CanonicalEntralPanel";

describe("CanonicalEntralPanel", () => {
  it("renders real scope-bound Human and ENTRAL messages with event receipts and evidence links", () => {
    render(
      <CanonicalEntralPanel
        eventSequence={12}
        events={[]}
        isAligned
        messages={[{
          acknowledged_at: null,
          business_id: "123e4567-e89b-42d3-a456-426614174000",
          content: "The scoped result is verified.",
          created_at: "2026-07-25T03:00:00.000Z",
          delivered_at: "2026-07-25T03:00:01.000Z",
          direction: "ENTRAL_TO_HUMAN",
          entral_entity_id: "223e4567-e89b-42d3-a456-426614174000",
          event_id: "323e4567-e89b-42d3-a456-426614174000",
          event_sequence: 11,
          evidence_refs: [{
            id: "423e4567-e89b-42d3-a456-426614174000",
            type: "SOURCE_RECORD"
          }],
          message_id: "523e4567-e89b-42d3-a456-426614174000",
          message_type: "RESULT",
          status: "DELIVERED"
        }]}
        scopeBusinessId="123e4567-e89b-42d3-a456-426614174000"
        scopeLabel="Business · Verified"
        selectedEntityId={null}
        syncState="connected"
        workspaceError=""
      />
    );

    expect(screen.getByText("The scoped result is verified.")).toBeInTheDocument();
    expect(screen.getByText(/Event ID 323e4567/)).toBeInTheDocument();
    const evidenceLink = screen.getByRole("link", { name: "423e4567-e89b-42d3-a456-426614174000" });
    expect(evidenceLink).toHaveAttribute(
      "href",
      "/member/dashboard?business=123e4567-e89b-42d3-a456-426614174000&evidence=423e4567-e89b-42d3-a456-426614174000#canonical-evidence-423e4567-e89b-42d3-a456-426614174000"
    );
    expect(screen.getByText(/aligned to canonical event 12/i)).toBeInTheDocument();
  });

  it("does not render a dangling action for an unscoped evidence type without a canonical UI target", () => {
    render(
      <CanonicalEntralPanel
        eventSequence={12}
        events={[]}
        isAligned
        messages={[{
          acknowledged_at: null,
          business_id: null,
          content: "Global audit reference.",
          created_at: "2026-07-25T03:00:00.000Z",
          delivered_at: null,
          direction: "HUMAN_TO_ENTRAL",
          entral_entity_id: "223e4567-e89b-42d3-a456-426614174000",
          event_id: null,
          event_sequence: null,
          evidence_refs: [{
            id: "audit-ledger-entry-1",
            type: "AUDIT_ENTRY"
          }],
          message_id: "523e4567-e89b-42d3-a456-426614174000",
          message_type: "CLARIFICATION",
          status: "CREATED"
        }]}
        scopeBusinessId={null}
        scopeLabel="Human portfolio"
        selectedEntityId={null}
        syncState="connected"
        workspaceError=""
      />
    );

    expect(screen.getByText("audit-ledger-entry-1")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "audit-ledger-entry-1" })).not.toBeInTheDocument();
    expect(screen.getByTitle(/No canonical UI record target/i)).toBeInTheDocument();
  });
});
