import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLaunchHandoffPanel } from "../components/RevenueLaunchHandoffPanel";
import { apiFetch } from "../lib/api";
import type { RevenueLaunchHandoffResponse } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const response: RevenueLaunchHandoffResponse = {
  plan: {
    auditEvents: ["Launch handoff packets generated internally."],
    blockedExternalActions: ["Publishing listings, products, collections, or storefront changes", "Sending Printify, Printful, Etsy, Shopify, or other provider API requests"],
    externalExecution: false,
    generatedAt: "2026-06-02T13:00:00.000Z",
    items: [
      {
        action: "review_provider_handoff_bundle",
        approvedPacketId: "approval_1",
        artifactSlotCount: 3,
        blockers: [],
        bundle: {
          approvedAt: "2026-06-02T12:30:00.000Z",
          approvedPacketId: "approval_1",
          auditEvents: ["Provider handoff bundle generated from an approved provider payload packet."],
          blockedActions: ["Sending provider API requests"],
          businessName: "Signal Forge",
          connectorReadiness: {
            requiredBeforeConnector: ["Attach approved artwork."],
            score: 91,
            status: "Ready for manual handoff"
          },
          drift: {
            adapterCoverageMatches: true,
            payloadCountMatches: true,
            readinessScoreDelta: 0,
            warnings: []
          },
          externalExecution: false,
          generatedAt: "2026-06-02T13:00:00.000Z",
          manualLaunchChecklist: ["Request a separate final publish approval after draft QA passes."],
          mode: "Provider Handoff Bundle",
          providerContacted: false,
          requestManifest: [
            {
              action: "create_pod_product",
              artifactSlots: [
                {
                  acceptedFormats: ["json"],
                  label: "Approved request body",
                  notes: "Review before handoff.",
                  required: true,
                  slotId: "printify_signal_body"
                },
                {
                  acceptedFormats: ["png"],
                  label: "Approved design asset",
                  notes: "Final printable artwork.",
                  required: true,
                  slotId: "printify_signal_art"
                },
                {
                  acceptedFormats: ["png"],
                  label: "QA screenshot",
                  notes: "Draft proof.",
                  required: true,
                  slotId: "printify_signal_qa"
                }
              ],
              bodyJson: "{\n  \"title\": \"Signal Forge Tee\"\n}",
              credentialScope: ["shops:read", "products:write"],
              executionState: "Locked - manual handoff only",
              headers: {
                authorization: "Bearer <PRINTIFY_TOKEN>"
              },
              id: "printify_signal_forge_tee",
              idempotencyKey: "entral:store_1:signal-forge-tee:printify",
              manualSteps: ["Replace every placeholder with approved internal values only."],
              method: "POST",
              pathTemplate: "/v1/shops/{shop_id}/products.json",
              productName: "Signal Forge Tee",
              provider: "Printify",
              requiredApprovals: ["Printify credential scope approval"],
              validationChecklist: ["Confirm product remains approved in ENTRAL."]
            }
          ],
          reviewAuditLogId: "audit_review",
          rollbackChecklist: ["Prepare delete/archive calls."],
          summary: "1 locked request manifest prepared for Signal Forge."
        },
        connectorReadiness: {
          requiredBeforeConnector: ["Attach approved artwork."],
          score: 91,
          status: "Ready for manual handoff"
        },
        credentialScopes: ["shops:read", "products:write"],
        externalExecution: false,
        launchReadiness: {
          nextInternalAction: "generate_provider_handoff",
          readinessScore: 92,
          stage: "handoff_ready"
        },
        manifestCount: 1,
        priority: 1,
        providerContacted: false,
        providerPayload: {
          adapterCoverage: ["Printify", "Etsy"],
          payloadCount: 1,
          readinessScore: 95,
          warnings: []
        },
        providers: ["Printify"],
        riskLevel: "low",
        storeId: "store_1",
        storeName: "Signal Forge",
        summary: "Signal Forge has 1 locked request manifest ready for internal manual handoff review. No provider was contacted."
      }
    ],
    mode: "Internal Launch Handoff Packet Builder",
    options: {
      includeBlocked: true,
      maxBundles: 10,
      minConnectorReadiness: 70,
      minLaunchReadiness: 70,
      minProviderReadiness: 70
    },
    persistedPackets: [],
    providerContacted: false,
    queue: [
      {
        action: "review_provider_handoff_bundle",
        externalExecution: false,
        priority: 1,
        storeId: "store_1",
        storeName: "Signal Forge",
        summary: "Signal Forge has 1 locked request manifest ready for internal manual handoff review. No provider was contacted."
      }
    ],
    summary: "1 stores evaluated for launch handoff.",
    totals: {
      artifactSlots: 3,
      blockedBundles: 0,
      bundlesPrepared: 1,
      credentialScopes: 2,
      manifestsPrepared: 1,
      needsReview: 0,
      openPacketRecords: 0,
      readyForManualHandoff: 1,
      storesEvaluated: 1
    }
  },
  records: []
};

const recordedResponse: RevenueLaunchHandoffResponse = {
  plan: {
    ...response.plan,
    persistedPackets: [
      {
        action: "review_provider_handoff_bundle",
        approvedPacketId: "approval_1",
        artifactSlotCount: 3,
        auditLogId: "audit_record",
        blockedActions: ["Sending provider API requests"],
        blockers: [],
        bundle: response.plan.items[0].bundle,
        connectorReadinessScore: 91,
        connectorStatus: "Ready for manual handoff",
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
        riskLevel: "low",
        status: "ready_for_manual_handoff",
        storeId: "store_1",
        storeName: "Signal Forge",
        summary: "Signal Forge has 1 locked request manifest ready for internal manual handoff review. No provider was contacted.",
        updatedAt: "2026-06-02T13:10:00.000Z"
      }
    ],
    totals: {
      ...response.plan.totals,
      openPacketRecords: 1
    }
  },
  records: [
    {
      action: "review_provider_handoff_bundle",
      approvedPacketId: "approval_1",
      artifactSlotCount: 3,
      auditLogId: "audit_record",
      blockedActions: ["Sending provider API requests"],
      blockers: [],
      bundle: response.plan.items[0].bundle,
      connectorReadinessScore: 91,
      connectorStatus: "Ready for manual handoff",
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
      riskLevel: "low",
      status: "ready_for_manual_handoff",
      storeId: "store_1",
      storeName: "Signal Forge",
      summary: "Signal Forge has 1 locked request manifest ready for internal manual handoff review. No provider was contacted.",
      updatedAt: "2026-06-02T13:10:00.000Z"
    }
  ]
};

describe("RevenueLaunchHandoffPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads internal launch handoff packets", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce({
        applied: {
          auditLogId: "audit_record",
          dryRun: false,
          externalExecution: false,
          providerContacted: false,
          readyForManualHandoff: 1,
          recordsCreated: 1,
          recordsToWrite: 1,
          recordsUpdated: 0,
          storedRecords: recordedResponse.records
        },
        plan: recordedResponse.plan,
        records: recordedResponse.records
      });

    render(<RevenueLaunchHandoffPanel />);

    await userEvent.click(screen.getByRole("button", { name: /load handoff packets/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-handoff"));
    expect(await screen.findByText("1 launch handoff bundle prepared internally.")).toBeInTheDocument();
    expect(screen.getByText("Internal Launch Handoff Packet Builder")).toBeInTheDocument();
    expect(screen.getAllByText("Signal Forge").length).toBeGreaterThan(0);
    expect(screen.getByText("Printify / POST / Locked - manual handoff only / shops:read, products:write")).toBeInTheDocument();
    expect(screen.getByText(/Publishing listings, products/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record packets/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-handoff/apply", {
      json: {
        confirm: "RECORD INTERNAL LAUNCH HANDOFF PACKETS",
        dryRun: false
      },
      method: "POST"
    }));
    expect(await screen.findByText("Recorded 1 new and 0 updated launch handoff packet.")).toBeInTheDocument();
    expect(screen.getByText("ready for manual handoff / low")).toBeInTheDocument();
    expect(screen.getByText("1 manifests / 3 artifact slots / audit audit_record")).toBeInTheDocument();
  });
});
