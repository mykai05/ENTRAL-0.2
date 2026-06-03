import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueOpportunityControlPanel } from "../components/RevenueOpportunityControlPanel";
import { apiFetch } from "../lib/api";
import type { RevenueOpportunityControlResponse } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const controlResponse: RevenueOpportunityControlResponse = {
  plan: {
    auditEvents: ["Revenue Opportunity Control Center evaluated durable opportunity records."],
    blockedExternalActions: ["Publishing listings"],
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    mode: "Internal Revenue Opportunity Control Center",
    opportunities: [
      {
        auditLogId: null,
        blockers: [],
        businessName: "Signal Forge",
        controlActions: [
          {
            enabled: true,
            reason: "Keep visible for more evidence.",
            status: "watch",
            title: "Mark watch"
          },
          {
            enabled: true,
            reason: "Pause internal scaling.",
            status: "paused",
            title: "Pause"
          },
          {
            enabled: true,
            reason: "Ready for manual provider handoff.",
            status: "ready_for_handoff",
            title: "Mark ready for handoff"
          },
          {
            enabled: true,
            reason: "Kill internally.",
            status: "killed",
            title: "Kill internally"
          }
        ],
        createdAt: "2026-06-02T12:00:00.000Z",
        externalExecution: false,
        id: "revenue_opp_1",
        idea: "Signal Forge private operator merch line",
        metrics: {
          approvedProducts: 2,
          estimatedDraftProfit: 128,
          listingReadyProducts: 4,
          netProfit: 80,
          performanceSnapshots: 1,
          productDrafts: 5,
          publishedProducts: 0,
          revenue: 120,
          revisionProducts: 0
        },
        nextInternalActions: [
          {
            action: "generate_provider_handoff",
            externalExecution: false,
            priority: 60,
            status: "ready",
            title: "Generate provider handoff bundle"
          }
        ],
        providerContacted: false,
        readinessScore: 90,
        recommendedStatus: "ready_for_handoff",
        riskLevel: "low",
        sourceKey: "signal-forge",
        stage: "provider_handoff_ready",
        status: "active",
        store: {
          approvalStatus: "Launch Approved",
          businessName: "Signal Forge",
          id: "store_1",
          launchStatus: "Awaiting Approval",
          storePlatform: "Etsy"
        },
        summary: "Signal Forge is in provider handoff ready.",
        updatedAt: "2026-06-02T12:00:00.000Z"
      }
    ],
    options: {
      includeKilled: false,
      maxOpportunities: 50,
      minApprovedProducts: 2,
      minListingReadyProducts: 3,
      minProductDrafts: 5,
      minReadinessForHandoff: 70,
      windowDays: 30
    },
    providerContacted: false,
    stageCounts: {
      blocked_review: 0,
      drafts_seeded: 0,
      idea_captured: 0,
      launch_preparation: 0,
      listing_optimization: 0,
      live_monitoring: 0,
      paused_or_killed: 0,
      provider_handoff_ready: 1,
      store_shell_created: 0
    },
    statusCounts: {
      active: 1,
      blocked: 0,
      killed: 0,
      paused: 0,
      ready_for_handoff: 0,
      watch: 0
    },
    summary: "1 revenue opportunity under control.",
    totals: {
      activeOpportunities: 1,
      blockedOpportunities: 0,
      estimatedDraftProfit: 128,
      netProfit: 80,
      opportunities: 1,
      productDrafts: 5,
      readyForHandoff: 1,
      revenue: 120
    }
  }
};

describe("RevenueOpportunityControlPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads opportunity control state and applies an internal status update", async () => {
    const onApplied = vi.fn().mockResolvedValue(undefined);
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(controlResponse)
      .mockResolvedValueOnce({
        applied: {
          allowed: true,
          auditLogId: "audit_1",
          blockers: [],
          dryRun: false,
          externalExecution: false,
          fromStatus: "active",
          note: "Dashboard control changed Signal Forge from active to watch.",
          opportunityId: "revenue_opp_1",
          providerContacted: false,
          reason: "Internal opportunity status can change from active to watch.",
          toStatus: "watch"
        },
        evaluation: {
          allowed: true,
          blockers: [],
          externalExecution: false,
          fromStatus: "active",
          providerContacted: false,
          reason: "Internal opportunity status can change from active to watch.",
          toStatus: "watch"
        },
        plan: {
          ...controlResponse.plan,
          opportunities: [
            {
              ...controlResponse.plan.opportunities[0],
              status: "watch"
            }
          ]
        }
      });

    render(<RevenueOpportunityControlPanel onApplied={onApplied} />);

    await userEvent.click(screen.getByRole("button", { name: /load opportunities/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/opportunities/control"));
    expect(await screen.findByText("Signal Forge")).toBeInTheDocument();
    expect(screen.getByText("1 opportunity under control.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /watch/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/opportunities/revenue_opp_1/control", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "UPDATE INTERNAL REVENUE OPPORTUNITY CONTROL",
        dryRun: false,
        status: "watch"
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Signal Forge marked watch. No providers contacted.")).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalledTimes(1);
  });
});
