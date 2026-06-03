import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLaunchReadinessPanel } from "../components/RevenueLaunchReadinessPanel";
import { apiFetch } from "../lib/api";
import type { RevenueLaunchReadinessResponse } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const response: RevenueLaunchReadinessResponse = {
  plan: {
    auditEvents: ["Launch Readiness Board aggregated evidence."],
    blockedExternalActions: ["Publishing listings or products", "Sending provider API requests"],
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    mode: "Internal Launch Readiness Board",
    options: {
      includeApprovalHistory: true,
      maxStores: 12,
      minLaunchReadiness: 70,
      minProviderReadiness: 70
    },
    providerContacted: false,
    queue: [
      {
        action: "generate_provider_handoff",
        externalExecution: false,
        priority: 1,
        readinessScore: 92,
        storeId: "store_1",
        storeName: "Signal Forge",
        summary: "Signal Forge is handoff ready."
      }
    ],
    stageCounts: {
      blocked: 0,
      handoff_ready: 1,
      launch_approval: 0,
      listing_optimization: 0,
      live_monitoring: 0,
      product_drafting: 0,
      provider_payload_review: 0,
      store_setup: 0
    },
    stores: [
      {
        approvalState: {
          approvedPackets: 1,
          latestProviderApprovalId: "approval_1",
          pendingPackets: 0,
          providerApprovalApproved: true,
          providerApprovalPending: false,
          rejectedPackets: 0,
          totalPackets: 1
        },
        blockers: [],
        externalExecution: false,
        launchPipeline: {
          action: "queue_launch_approval",
          missingProducts: 0,
          readyProducts: 5,
          reason: "Ready for launch approval."
        },
        nextInternalAction: "generate_provider_handoff",
        priority: 1,
        providerContacted: false,
        providerPayload: {
          adapterCoverage: ["Printify", "Etsy"],
          payloadCount: 10,
          readinessScore: 100,
          warnings: []
        },
        readinessScore: 92,
        riskLevel: "low",
        stage: "handoff_ready",
        store: {
          approvalStatus: "Launch Approved",
          businessName: "Signal Forge",
          estimatedProfit: 200,
          id: "store_1",
          launchStatus: "Building Store",
          productTypes: ["T-shirt"],
          revenue: 0,
          storePlatform: "Etsy"
        },
        storeSetup: {
          connectorReadinessScore: 90,
          connectorStatus: "Ready for manual handoff",
          queuedAction: "queue_connector_readiness",
          readinessScore: 90
        },
        summary: "Signal Forge is handoff ready."
      }
    ],
    summary: "1 store ranked for launch readiness.",
    totals: {
      approvedProviderPackets: 1,
      blockedStores: 0,
      handoffReadyStores: 1,
      payloadsPrepared: 10,
      queuedStores: 1,
      storesEvaluated: 1
    }
  }
};

describe("RevenueLaunchReadinessPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads the internal launch readiness board", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce(response);

    render(<RevenueLaunchReadinessPanel />);

    await userEvent.click(screen.getByRole("button", { name: /load launch board/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/launch-readiness"));
    expect(await screen.findByText("1 launch-readiness action queued internally.")).toBeInTheDocument();
    expect(screen.getAllByText("Signal Forge").length).toBeGreaterThan(0);
    expect(screen.getByText("generate provider handoff / score 92")).toBeInTheDocument();
    expect(screen.getByText(/Publishing listings or products/)).toBeInTheDocument();
  });
});
