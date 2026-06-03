import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLaunchOperationsPackPanel } from "../components/RevenueLaunchOperationsPackPanel";
import { apiFetch } from "../lib/api";
import type { RevenueLaunchOperationsPackPlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const plan: RevenueLaunchOperationsPackPlan = {
  auditEvents: ["Launch pack prepared."],
  blockedExternalActions: ["Publishing listings remains locked.", "Provider API calls remain locked."],
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  mode: "Internal Revenue Launch Operations Pack",
  options: {
    includeBlocked: true,
    maxPacks: 10,
    minConnectorReadiness: 70,
    minLaunchReadiness: 70,
    minProviderReadiness: 70
  },
  packs: [{
    artifactSlots: [{
      acceptedFormats: ["png"],
      label: "Design asset",
      manifestId: "manifest_1",
      notes: "Approved artwork only.",
      provider: "Printify",
      required: true,
      slotId: "design"
    }, {
      acceptedFormats: ["png", "jpg"],
      label: "Mockup",
      manifestId: "manifest_1",
      notes: "Approved mockup only.",
      provider: "Printify",
      required: true,
      slotId: "mockup"
    }],
    auditTrail: {
      approvedPacketId: "packet_1",
      handoffPacketAuditLogId: "audit_record",
      handoffPacketId: "handoff_1",
      reviewAuditLogId: "audit_review"
    },
    blockers: [],
    checklist: {
      blockers: [],
      nextAction: "generate_provider_handoff",
      priorityScore: 91,
      readyStages: 3,
      signalEvidence: 1,
      summary: "Signal Forge is ready for handoff."
    },
    credentialScopes: ["products:write"],
    externalExecution: false,
    manualOnly: true,
    manualSteps: ["Open provider manually.", "Paste title manually."],
    operatorBrief: {
      businessName: "Signal Forge",
      nextReviewGate: "Operator manual launch review",
      productNames: ["Focus Poster"],
      providers: ["Printify"],
      readinessLine: "Launch 90/100, provider 90/100, connector 86/100.",
      storeName: "Signal Forge"
    },
    priority: 100,
    providerContacted: false,
    qaChecklist: ["Confirm title.", "Confirm every provider request remains locked until direct operator launch."],
    readiness: {
      connectorReadinessScore: 86,
      launchReadinessScore: 90,
      overallScore: 89,
      providerReadinessScore: 90
    },
    requestManifests: [{
      action: "create_pod_product",
      artifactSlots: 2,
      credentialScope: ["products:write"],
      executionState: "Locked - manual handoff only",
      id: "manifest_1",
      pathTemplate: "/products",
      productName: "Focus Poster",
      provider: "Printify"
    }],
    riskLevel: "low",
    status: "ready_for_manual_launch",
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "Signal Forge has a manual-only launch operations pack with 1 locked request manifest."
  }],
  providerContacted: false,
  queue: [{
    action: "record_launch_pack",
    externalExecution: false,
    priority: 100,
    providerContacted: false,
    status: "ready_for_manual_launch",
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "Signal Forge has a manual-only launch operations pack with 1 locked request manifest."
  }],
  summary: "1 launch operations pack prepared; 1 ready for manual launch review, 0 need review, 0 blocked.",
  totals: {
    artifactSlots: 2,
    blockedPacks: 0,
    credentialScopes: 1,
    manualSteps: 2,
    packs: 1,
    readyPacks: 1,
    requestManifests: 1,
    reviewPacks: 0
  }
};

describe("RevenueLaunchOperationsPackPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads, previews, and records internal launch operations packs", async () => {
    const onApplied = vi.fn();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: null,
          dryRun: true,
          externalExecution: false,
          packsRecorded: 0,
          packsSelected: 1,
          providerContacted: false,
          readyPacks: 1,
          summary: "1 launch operations pack would be recorded as internal audit artifacts."
        },
        plan
      })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: "audit_launch_pack",
          dryRun: false,
          externalExecution: false,
          packsRecorded: 1,
          packsSelected: 1,
          providerContacted: false,
          readyPacks: 1,
          summary: "1 launch operations pack recorded as internal audit artifacts."
        },
        plan
      });

    render(<RevenueLaunchOperationsPackPanel onApplied={onApplied} />);

    await userEvent.click(screen.getByRole("button", { name: /load packs/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-operations-pack"));
    expect(await screen.findByText("Internal Revenue Launch Operations Pack")).toBeInTheDocument();
    expect(screen.getAllByText("Signal Forge").length).toBeGreaterThan(0);
    expect(screen.getByText(/1 manifests \/ 2 artifact slots/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview record/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-operations-pack/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RECORD INTERNAL LAUNCH OPERATIONS PACKS",
        dryRun: true,
        storeIds: ["store_1"]
      }),
      method: "POST"
    })));
    expect(await screen.findByText("1 launch operations pack would be recorded as internal audit artifacts.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record packs/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-operations-pack/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RECORD INTERNAL LAUNCH OPERATIONS PACKS",
        dryRun: false,
        storeIds: ["store_1"]
      }),
      method: "POST"
    })));
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("1 launch operations pack recorded as internal audit artifacts.")).toBeInTheDocument();
  });
});
