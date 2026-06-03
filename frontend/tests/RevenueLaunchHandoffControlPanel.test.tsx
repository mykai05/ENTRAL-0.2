import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLaunchHandoffControlPanel } from "../components/RevenueLaunchHandoffControlPanel";
import { apiFetch } from "../lib/api";
import type { RevenueLaunchHandoffControlResponse } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const response: RevenueLaunchHandoffControlResponse = {
  plan: {
    auditEvents: ["Launch Handoff Control Center evaluated durable handoff packet records."],
    blockedExternalActions: ["Publishing listings, products, collections, or storefront changes", "Sending Printify, Printful, Etsy, Shopify, or other provider API requests"],
    externalExecution: false,
    generatedAt: "2026-06-02T14:00:00.000Z",
    mode: "Internal Launch Handoff Control Center",
    options: {
      includeArchived: false,
      maxPackets: 25,
      minConnectorReadiness: 70
    },
    packets: [
      {
        action: "review_provider_handoff_bundle",
        approvedPacketId: "approval_1",
        artifactSlotCount: 3,
        auditLogId: "audit_record",
        blockedActions: ["Sending provider API requests"],
        blockers: [],
        bundle: null,
        connectorReadinessScore: 91,
        connectorStatus: "Ready for manual handoff",
        controlActions: [
          {
            enabled: true,
            reason: "Return this packet to internal review queue.",
            status: "queued_review",
            title: "Queue review"
          },
          {
            enabled: true,
            reason: "Manifests, connector readiness, and blocker checks support manual handoff review.",
            status: "ready_for_manual_handoff",
            title: "Ready for handoff"
          },
          {
            enabled: true,
            reason: "Hold packet in blocked review while blockers are resolved internally.",
            status: "blocked_review",
            title: "Block review"
          },
          {
            enabled: true,
            reason: "Archive stale or superseded internal packet records without deleting audit history.",
            status: "archived",
            title: "Archive"
          }
        ],
        createdAt: "2026-06-02T13:10:00.000Z",
        credentialScopes: ["shops:read", "products:write"],
        dedupeKey: "launch_handoff:store_1:approval_1:1:1",
        externalExecution: false,
        id: "handoff_record_1",
        launchReadinessScore: 92,
        manifestCount: 1,
        providerContacted: false,
        providerReadinessScore: 95,
        providers: ["Printify"],
        recommendedStatus: "ready_for_manual_handoff",
        reviewBlockers: [],
        riskLevel: "low",
        status: "queued_review",
        storeId: "store_1",
        storeName: "Signal Forge",
        summary: "Signal Forge has 1 locked request manifest ready for internal manual handoff review. No provider was contacted.",
        updatedAt: "2026-06-02T13:10:00.000Z"
      }
    ],
    providerContacted: false,
    statusCounts: {
      archived: 0,
      blocked_review: 0,
      queued_review: 1,
      ready_for_manual_handoff: 0
    },
    summary: "1 launch handoff packet under control: 0 ready, 1 queued, 0 blocked, 0 archived.",
    totals: {
      archivedPackets: 0,
      artifactSlots: 3,
      blockedPackets: 0,
      manifestCount: 1,
      packets: 1,
      queuedPackets: 1,
      readyForManualHandoff: 0
    }
  }
};

const updatedResponse: RevenueLaunchHandoffControlResponse = {
  plan: {
    ...response.plan,
    packets: [
      {
        ...response.plan.packets[0],
        auditLogId: "audit_control",
        status: "ready_for_manual_handoff"
      }
    ],
    statusCounts: {
      archived: 0,
      blocked_review: 0,
      queued_review: 0,
      ready_for_manual_handoff: 1
    },
    totals: {
      ...response.plan.totals,
      queuedPackets: 0,
      readyForManualHandoff: 1
    }
  }
};

describe("RevenueLaunchHandoffControlPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads and updates internal launch handoff packet controls", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce({
        applied: {
          allowed: true,
          auditLogId: "audit_control",
          blockers: [],
          dryRun: false,
          externalExecution: false,
          fromStatus: "queued_review",
          note: "Dashboard control changed Signal Forge packet from queued_review to ready_for_manual_handoff.",
          packetId: "handoff_record_1",
          providerContacted: false,
          reason: "Internal handoff packet status can move from queued_review to ready_for_manual_handoff. External execution remains locked.",
          toStatus: "ready_for_manual_handoff"
        },
        evaluation: {
          allowed: true,
          blockers: [],
          externalExecution: false,
          fromStatus: "queued_review",
          providerContacted: false,
          reason: "Internal handoff packet status can move from queued_review to ready_for_manual_handoff. External execution remains locked.",
          toStatus: "ready_for_manual_handoff"
        },
        plan: updatedResponse.plan
      });

    render(<RevenueLaunchHandoffControlPanel />);

    await userEvent.click(screen.getByRole("button", { name: /load packet control/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-handoff/control"));
    expect(await screen.findByText("1 launch handoff packet under control.")).toBeInTheDocument();
    expect(screen.getByText("queued review / low / 91/100")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /ready for manual handoff/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-handoff/packets/handoff_record_1/control", {
      json: {
        confirm: "UPDATE INTERNAL LAUNCH HANDOFF CONTROL",
        dryRun: false,
        note: "Dashboard control changed Signal Forge packet from queued_review to ready_for_manual_handoff.",
        status: "ready_for_manual_handoff"
      },
      method: "POST"
    }));
    expect(await screen.findByText("Signal Forge packet marked ready for manual handoff. No providers contacted.")).toBeInTheDocument();
    expect(screen.getByText("ready for manual handoff / low / 91/100")).toBeInTheDocument();
    expect(screen.getByText(/Publishing listings, products/)).toBeInTheDocument();
  });
});
