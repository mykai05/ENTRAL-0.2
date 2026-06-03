import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueOpportunityFactoryPanel } from "../components/RevenueOpportunityFactoryPanel";
import { apiFetch } from "../lib/api";
import type { RevenueOpportunityFactoryResponse } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const response: RevenueOpportunityFactoryResponse = {
  applied: {
    auditLogId: null,
    dryRun: true,
    externalExecution: false,
    productDraftsCreated: 5,
    providerContacted: false,
    skippedExistingProducts: 0,
    storeCreated: true,
    storeId: null,
    opportunityId: null
  },
  plan: {
    auditEvents: ["Revenue Opportunity Factory generated an internal store shell."],
    blockedExternalActions: ["Publishing marketplace listings"],
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    idempotency: {
      sourceKey: "signal-forge",
      storeAlreadyExists: false,
      storeLookup: "Revenue Factory Source: signal-forge"
    },
    mode: "Internal Revenue Opportunity Factory",
    nextInternalActions: [
      {
        action: "create_store",
        externalExecution: false,
        status: "ready",
        title: "Create private store shell"
      }
    ],
    productDrafts: [
      {
        estimatedProfit: 12,
        productName: "Signal Forge Operator Series T-shirt",
        productType: "T-shirt",
        retailPrice: 32,
        status: "Awaiting Approval"
      }
    ],
    providerContacted: false,
    skippedExistingProducts: [],
    storeDraft: {
      approvalStatus: "Research Approved",
      audience: "Private operators",
      brandStyle: "Minimal",
      businessName: "Signal Forge",
      clientName: "ENTRAL Private Revenue",
      contactName: "ENTRAL Revenue Operator",
      email: "signal-forge@entral.local",
      estimatedProfit: 60,
      industry: "Security technology",
      launchStatus: "Discovery",
      notes: "Revenue Factory Source: signal-forge",
      podProvider: "Printify",
      productTypes: ["T-shirt"],
      profitShare: 0,
      storePlatform: "Etsy"
    },
    summary: "New private opportunity shell for Signal Forge: 5 internal product drafts ready.",
    totals: {
      estimatedDraftProfit: 60,
      existingProductDrafts: 0,
      productDrafts: 5,
      skippedProductDrafts: 0,
      storeShells: 1
    }
  },
  store: null
};

describe("RevenueOpportunityFactoryPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("previews and creates an internal opportunity without provider contact", async () => {
    const onApplied = vi.fn().mockResolvedValue(undefined);
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce({
        ...response,
        applied: {
          ...response.applied,
          auditLogId: "audit_1",
          dryRun: false,
          storeId: "store_1",
          opportunityId: "revenue_opp_1"
        },
        createdProducts: [
          {
            id: "product_1",
            productName: "Signal Forge Operator Series T-shirt",
            storeId: "store_1"
          }
        ]
      });

    render(<RevenueOpportunityFactoryPanel onApplied={onApplied} />);

    await userEvent.clear(screen.getByLabelText(/idea/i));
    await userEvent.type(screen.getByLabelText(/idea/i), "Signal Forge private operator merch line for ENTRAL revenue");
    await userEvent.clear(screen.getByLabelText(/business name/i));
    await userEvent.type(screen.getByLabelText(/business name/i), "Signal Forge");

    await userEvent.click(screen.getByRole("button", { name: /preview opportunity/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/opportunity-factory", expect.objectContaining({
      json: expect.objectContaining({
        businessName: "Signal Forge",
        confirm: "CREATE INTERNAL REVENUE OPPORTUNITY",
        dryRun: true,
        storePlatform: "Etsy"
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Opportunity preview ready: 5 internal drafts planned.")).toBeInTheDocument();
    expect(screen.getByText("Signal Forge")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /create internal opportunity/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/opportunity-factory", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "CREATE INTERNAL REVENUE OPPORTUNITY",
        dryRun: false
      }),
      method: "POST"
    })));
    expect(await screen.findByText("Opportunity created: 5 internal drafts written. No providers contacted.")).toBeInTheDocument();
    expect(onApplied).toHaveBeenCalledTimes(1);
  });
});
