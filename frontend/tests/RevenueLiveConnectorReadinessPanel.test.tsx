import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RevenueLiveConnectorReadinessPanel } from "../components/RevenueLiveConnectorReadinessPanel";
import { apiFetch } from "../lib/api";
import type { RevenueLiveConnectorReadinessRegistryPlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const plan: RevenueLiveConnectorReadinessRegistryPlan = {
  auditEvents: ["Live connector readiness registry prepared internally."],
  blockedExternalActions: ["Live connector credentials remain locked.", "Browser and provider write automation remain locked."],
  entries: [{
    action: "record_connector_design_readiness",
    approvalGates: [{
      evidenceRequired: ["Launch closure scorecard"],
      gate: "Launch Closure Ledger",
      status: "ready"
    }, {
      evidenceRequired: ["Approved read-only connector record"],
      gate: "Read-Only Connector Evidence",
      status: "ready"
    }],
    blockers: [],
    closure: {
      expectedFirstWeekRevenue: 320,
      performanceSnapshots: 2,
      score: 88,
      status: "monitoring_ready"
    },
    connectorBoundaries: [{
      approvalGates: ["Approved read-only connector manifest", "Connector design review"],
      blockedExternalActions: ["No provider write is authorized."],
      credentialEnvVars: ["PRINTIFY_CONNECTOR_TOKEN", "PRINTIFY_SHOP_ID"],
      endpointTemplates: ["GET /printify/readonly", "create_pod_product /products"],
      externalExecution: false,
      futureLiveScopes: [{
        reason: "Create draft POD products from approved locked request manifests.",
        scope: "products:write"
      }, {
        reason: "Attach approved print files after artifact hash review.",
        scope: "uploads:write"
      }],
      lane: "commerce",
      liveMode: "blocked_until_operator_design_approval",
      provider: "printify",
      providerContacted: false,
      providerName: "Printify",
      readOnlyScopes: [{
        reason: "Read order and fulfillment economics.",
        scope: "orders:read"
      }],
      readiness: "design_review_ready",
      role: "pod_provider",
      rollbackControls: ["Archive the provider draft product."]
    }],
    externalExecution: false,
    operationsPack: {
      artifactSlots: 2,
      auditReady: true,
      credentialScopes: ["products:write"],
      manualSteps: 2,
      providers: ["Printify"],
      requestManifests: 1,
      status: "ready_for_manual_launch"
    },
    priority: 120,
    providerContacted: false,
    readinessScore: 91,
    readOnlyEvidence: {
      approvedConnectors: 1,
      importJobsQueued: 0,
      manifestIds: ["manifest_printify"],
      pendingApprovals: 0,
      readyManifests: 1,
      requiredConnectors: 1
    },
    rollbackControls: ["Archive the provider draft product."],
    status: "ready_for_design",
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "Signal Forge is ready for internal live connector design review; live execution remains locked."
  }],
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  mode: "Internal Revenue Live Connector Readiness Registry",
  options: {
    includeBlocked: true,
    maxEntries: 10,
    minClosureScore: 76,
    minReadOnlyConnectors: 1,
    requireOperationsPackAudit: true,
    requirePerformanceEvidence: true
  },
  providerContacted: false,
  queue: [{
    action: "record_connector_design_readiness",
    externalExecution: false,
    priority: 120,
    providerContacted: false,
    readinessScore: 91,
    status: "ready_for_design",
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "Signal Forge is ready for internal live connector design review; live execution remains locked."
  }],
  summary: "1 live connector readiness entry prepared; 1 ready for design review, 0 need read-only approval, 0 need operator review, 0 blocked.",
  totals: {
    approvedReadOnlyConnectors: 1,
    blockedEntries: 0,
    entries: 1,
    needsOperatorReview: 0,
    needsReadOnlyApproval: 0,
    readyForDesign: 1,
    requiredBoundaries: 1
  }
};

describe("RevenueLiveConnectorReadinessPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads, previews, and records internal live connector readiness registry entries", async () => {
    const onApplied = vi.fn();
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: null,
          dryRun: true,
          entriesRecorded: 0,
          entriesSelected: 1,
          externalExecution: false,
          providerContacted: false,
          readyForDesign: 1,
          requiredBoundaries: 1,
          summary: "1 live connector readiness entry would be recorded as internal audit artifacts."
        },
        plan
      })
      .mockResolvedValueOnce({
        applied: {
          auditLogId: "audit_live_readiness",
          dryRun: false,
          entriesRecorded: 1,
          entriesSelected: 1,
          externalExecution: false,
          providerContacted: false,
          readyForDesign: 1,
          requiredBoundaries: 1,
          summary: "1 live connector readiness entry recorded as internal audit artifacts."
        },
        plan
      });

    render(<RevenueLiveConnectorReadinessPanel onApplied={onApplied} />);

    await userEvent.click(screen.getByRole("button", { name: /load readiness/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/live-connector-readiness"));
    expect(await screen.findByText("Internal Revenue Live Connector Readiness Registry")).toBeInTheDocument();
    expect(screen.getAllByText("Signal Forge").length).toBeGreaterThan(0);
    expect(screen.getByText(/\$320\.00 target \/ 1 approved read-only \/ 1 boundaries/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview record/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/live-connector-readiness/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RECORD INTERNAL LIVE CONNECTOR READINESS REGISTRY",
        dryRun: true,
        storeIds: ["store_1"]
      }),
      method: "POST"
    })));
    expect(await screen.findByText("1 live connector readiness entry would be recorded as internal audit artifacts.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /record registry/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/merch/revenue-engine/live-connector-readiness/apply", expect.objectContaining({
      json: expect.objectContaining({
        confirm: "RECORD INTERNAL LIVE CONNECTOR READINESS REGISTRY",
        dryRun: false,
        storeIds: ["store_1"]
      }),
      method: "POST"
    })));
    await waitFor(() => expect(onApplied).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("1 live connector readiness entry recorded as internal audit artifacts.")).toBeInTheDocument();
  });
});
