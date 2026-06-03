import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignalIntakePanel } from "../components/SignalIntakePanel";
import { apiFetch } from "../lib/api";
import type { ClientMerchStore, SignalIntakePlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const store = {
  approvalStatus: "Launch Approved",
  audience: "Gym founders",
  brandStyle: "Minimal command typography",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  commandGeneralId: null,
  commandGeneralName: null,
  commandMarshalId: null,
  commandMarshalName: null,
  contactName: "Jordan",
  createdAt: "2026-06-02T00:00:00.000Z",
  designCount: 10,
  email: "owner@example.com",
  estimatedProfit: 500,
  id: "store_1",
  industry: "Fitness",
  launchStatus: "Optimizing",
  monthlyFee: 99,
  notes: null,
  phone: null,
  podProvider: "Printify",
  productTypes: ["T-shirts"],
  profitShare: 15,
  revenue: 1000,
  setupFee: 499,
  storeId: "store_1",
  storePlatform: "Etsy",
  updatedAt: "2026-06-02T00:00:00.000Z",
  userId: "user_1"
} as ClientMerchStore;

const plan: SignalIntakePlan = {
  auditEvents: ["Signal Intake Center normalized approved read-only signals."],
  blockedExternalActions: [
    "Moving money, creating transfers, creating payouts, changing bank accounts, or authorizing spend"
  ],
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  lanes: [
    {
      count: 0,
      externalExecution: false,
      lane: "commerce",
      providerContacted: false,
      riskLevel: "low",
      summary: "Commerce signals normalize into revenue performance snapshots."
    },
    {
      count: 0,
      externalExecution: false,
      lane: "content",
      providerContacted: false,
      riskLevel: "low",
      summary: "Content signals normalize into faceless content performance snapshots."
    },
    {
      count: 0,
      externalExecution: false,
      lane: "payments",
      providerContacted: false,
      riskLevel: "low",
      summary: "Payment signals normalize into reconciliation-only evidence."
    }
  ],
  mode: "Internal Signal Intake Center",
  normalized: {
    commerceSnapshots: [],
    contentSnapshots: [],
    paymentReconciliationDrafts: []
  },
  options: {
    includeSamplePayloads: true,
    maxSignals: 100,
    windowDays: 30
  },
  providerContacted: false,
  readiness: {
    contentBriefsAvailable: 0,
    productsAvailable: 1,
    storesAvailable: 1
  },
  samplePayloads: null,
  summary: "0 approved read-only signals staged.",
  totals: {
    commerceSignals: 0,
    contentSignals: 0,
    estimatedNetProfit: 0,
    paymentSignals: 0,
    projectedAvailableBalance: 0,
    projectedContentRevenue: 0,
    projectedGrossRevenue: 0,
    signals: 0
  }
};

function appliedPlan(): SignalIntakePlan {
  return {
    ...plan,
    lanes: plan.lanes.map((lane) => ({
      ...lane,
      count: 1
    })),
    summary: "3 approved read-only signals staged.",
    totals: {
      commerceSignals: 1,
      contentSignals: 1,
      estimatedNetProfit: 128,
      paymentSignals: 1,
      projectedAvailableBalance: 180,
      projectedContentRevenue: 110,
      projectedGrossRevenue: 240,
      signals: 3
    }
  };
}

describe("SignalIntakePanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads readiness and preview/applies approved read-only signals", async () => {
    const onApplied = vi.fn().mockResolvedValue(undefined);

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan })
      .mockResolvedValueOnce({
        ingested: {
          auditLogId: null,
          contentSnapshotsCreated: 1,
          dryRun: true,
          externalExecution: false,
          paymentReconciliationReportId: null,
          paymentSignalsRecorded: 1,
          providerContacted: false,
          revenueSnapshotsCreated: 1
        },
        plan: appliedPlan()
      })
      .mockResolvedValueOnce({
        ingested: {
          auditLogId: "audit_1",
          contentSnapshotsCreated: 1,
          dryRun: false,
          externalExecution: false,
          paymentReconciliationReportId: "report_1",
          paymentSignalsRecorded: 1,
          providerContacted: false,
          revenueSnapshotsCreated: 1
        },
        plan: appliedPlan()
      });

    render(<SignalIntakePanel selectedStore={store} onApplied={onApplied} />);

    expect(apiFetch).toHaveBeenCalledWith("/merch/revenue-engine/signal-intake");
    expect(await screen.findByText("Internal Signal Intake Center")).toBeInTheDocument();
    expect(screen.getByText("Iron House Gym")).toBeInTheDocument();
    expect(screen.getByText("Moving money, creating transfers, creating payouts, changing bank accounts, or authorizing spend")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview intake/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-intake/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "INGEST APPROVED READ-ONLY SIGNALS",
        dryRun: true
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Signal preview ready: 3 approved read-only signals staged.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record signals/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-intake/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "INGEST APPROVED READ-ONLY SIGNALS",
        dryRun: false
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Signal intake recorded: 1 commerce, 1 content, and 1 payment signal.")).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalledTimes(1);
  });
});
