import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueSignalConnectorPanel } from "../components/RevenueSignalConnectorPanel";
import { apiFetch } from "../lib/api";
import type { RevenueSignalConnectorResponse } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const response: RevenueSignalConnectorResponse = {
  plan: {
    auditEvents: ["Read-only signal connector manifests were prepared."],
    blockedExternalActions: ["Calling marketplace, POD, social, payment, analytics, bank, card, payout, upload, or ad APIs", "Creating write scopes"],
    externalExecution: false,
    generatedAt: "2026-06-02T12:00:00.000Z",
    manifests: [
      {
        approvalGate: {
          humanApprovalRequired: true,
          requiredConfirmation: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
          status: "Required"
        },
        blockedExternalActions: ["Calling marketplace APIs"],
        credentialEnvVars: ["ETSY_READONLY_CLIENT_ID"],
        endpointTemplates: ["GET /v3/application/shops/{shop_id}/receipts"],
        externalExecution: false,
        id: "readonly_signal_connector:commerce:etsy:store_1:product_1",
        lane: "commerce",
        provider: "etsy",
        providerContacted: false,
        providerName: "Etsy",
        readinessScore: 82,
        readOnlyScopes: [
          {
            reason: "Read order totals.",
            scope: "orders:read"
          }
        ],
        riskLevel: "low",
        samplePayload: {
          commerceSignals: [{
            grossRevenue: 240,
            periodEnd: "2026-06-02T12:00:00.000Z",
            periodStart: "2026-05-26T12:00:00.000Z",
            source: "etsy",
            storeId: "store_1"
          }]
        },
        status: "ready_for_approval",
        summary: "Etsy read-only order, listing, and traffic metrics can feed the Performance Velocity Ledger for Signal Forge.",
        target: {
          contentBriefId: null,
          productId: "product_1",
          storeId: "store_1",
          storeName: "Signal Forge"
        },
        title: "Signal Forge commerce metrics",
        transformTarget: "revenue_performance_snapshot",
        writeScopes: []
      }
    ],
    mode: "Internal Read-Only Signal Connector Center",
    options: {
      includeCommerce: true,
      includeContent: true,
      includePayments: true,
      includeSamplePayloads: true,
      maxConnectors: 18,
      onlyReady: false,
      windowDays: 30
    },
    providerContacted: false,
    sampleSignalBatch: {
      commerceSignals: [{
        grossRevenue: 240,
        periodEnd: "2026-06-02T12:00:00.000Z",
        periodStart: "2026-05-26T12:00:00.000Z",
        source: "etsy",
        storeId: "store_1"
      }]
    },
    signalIntakePreview: {
      auditEvents: ["Signal Intake Center normalized approved read-only signals into internal evidence records."],
      blockedExternalActions: ["Calling marketplace APIs"],
      externalExecution: false,
      generatedAt: "2026-06-02T12:00:00.000Z",
      lanes: [{
        count: 1,
        externalExecution: false,
        lane: "commerce",
        providerContacted: false,
        riskLevel: "low",
        summary: "Commerce signals normalize into revenue performance snapshots."
      }],
      mode: "Internal Signal Intake Center",
      normalized: {
        commerceSnapshots: [{
          grossRevenue: 240,
          id: "signal_commerce_store_1_store_1780401600000_0",
          netProfit: 240,
          notes: null,
          periodEnd: "2026-06-02T12:00:00.000Z",
          periodStart: "2026-05-26T12:00:00.000Z",
          productId: null,
          source: "etsy",
          storeId: "store_1"
        }],
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
      summary: "1 approved read-only signal staged.",
      totals: {
        commerceSignals: 1,
        contentSignals: 0,
        estimatedNetProfit: 240,
        paymentSignals: 0,
        projectedAvailableBalance: 0,
        projectedContentRevenue: 0,
        projectedGrossRevenue: 240,
        signals: 1
      }
    },
    statusCounts: {
      disabled: 0,
      missing_inputs: 0,
      ready_for_approval: 1
    },
    summary: "1 read-only signal connector manifest prepared: 1 ready for approval, 0 missing inputs. Sample batch stages 1 Signal Intake record.",
    totals: {
      commerceConnectors: 1,
      connectors: 1,
      contentConnectors: 0,
      disabledConnectors: 0,
      missingInputConnectors: 0,
      paymentConnectors: 0,
      readyConnectors: 1,
      sampleCommerceSignals: 1,
      sampleContentSignals: 0,
      samplePaymentSignals: 0
    }
  }
};

describe("RevenueSignalConnectorPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads and records read-only connector manifests", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce({
        applied: {
          auditLogId: "audit_signal_connectors",
          blockedManifestIds: [],
          dryRun: false,
          externalExecution: false,
          manifestIds: ["readonly_signal_connector:commerce:etsy:store_1:product_1"],
          manifestsRecorded: 1,
          providerContacted: false,
          readyManifests: 1,
          sampleSignals: 1,
          summary: "1 read-only signal connector manifest recorded internally. External execution remains locked."
        },
        plan: response.plan
      });

    render(<RevenueSignalConnectorPanel />);

    await userEvent.click(screen.getByRole("button", { name: /load connectors/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors"));
    expect(await screen.findByText("1 read-only connector manifest prepared.")).toBeInTheDocument();
    expect(screen.getByText("commerce / Etsy / 82/100")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record manifests/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/signal-connectors/apply", {
      json: {
        confirm: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
        dryRun: false,
        manifestIds: ["readonly_signal_connector:commerce:etsy:store_1:product_1"],
        note: "Dashboard recorded read-only connector manifests for Signal Intake review."
      },
      method: "POST"
    }));
    expect(await screen.findByText("1 connector manifest recorded. No providers contacted.")).toBeInTheDocument();
    expect(screen.getByText(/Read-only manifests only/)).toBeInTheDocument();
  });
});
