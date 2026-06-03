import { describe, expect, it } from "vitest";
import {
  buildRevenueSignalConnectorPlan,
  revenueSignalConnectorConfirmation,
  selectRevenueSignalConnectorManifests
} from "../src/services/revenueSignalConnectors.js";

const stores = [{
  businessName: "Signal Forge",
  id: "store_1",
  launchStatus: "Launched",
  podProvider: "Printify",
  storePlatform: "Etsy"
}];

const products = [{
  id: "product_1",
  productName: "Operator Field Notes",
  storeId: "store_1"
}];

const briefs = [{
  id: "brief_1",
  productId: "product_1",
  storeId: "store_1",
  title: "Operator Field Notes Launch Short"
}];

describe("Revenue Signal Connector Center", () => {
  it("builds read-only connector manifests and signal intake samples", () => {
    const plan = buildRevenueSignalConnectorPlan({
      briefs,
      generatedAt: "2026-06-02T12:00:00.000Z",
      products,
      stores
    });

    expect(plan.mode).toBe("Internal Read-Only Signal Connector Center");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.readyConnectors).toBeGreaterThan(0);
    expect(plan.totals.sampleCommerceSignals).toBeGreaterThan(0);
    expect(plan.totals.sampleContentSignals).toBeGreaterThan(0);
    expect(plan.totals.samplePaymentSignals).toBe(1);
    expect(plan.signalIntakePreview.totals.signals).toBe(
      plan.totals.sampleCommerceSignals + plan.totals.sampleContentSignals + plan.totals.samplePaymentSignals
    );
    expect(plan.manifests[0].approvalGate.requiredConfirmation).toBe(revenueSignalConnectorConfirmation);
    expect(plan.manifests.every((manifest) => manifest.writeScopes.length === 0)).toBe(true);
    expect(plan.blockedExternalActions.join(" ")).toContain("write scopes");
  });

  it("marks connector manifests as missing inputs when products and briefs are absent", () => {
    const plan = buildRevenueSignalConnectorPlan({
      options: {
        includePayments: false,
        onlyReady: false
      },
      stores
    });

    expect(plan.totals.missingInputConnectors).toBeGreaterThan(0);
    expect(selectRevenueSignalConnectorManifests(plan)).toHaveLength(0);
  });
});
