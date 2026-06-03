import { describe, expect, it } from "vitest";
import { buildSignalIntakePlan } from "../src/services/signalIntakeCenter.js";
import { buildRevenueSignalConnectorPlan } from "../src/services/revenueSignalConnectors.js";
import {
  buildRevenueSignalConnectorApprovalPlan,
  revenueSignalConnectorApprovalConfirmation,
  revenueSignalConnectorApproveConfirmation,
  revenueSignalImportJobConfirmation,
  selectRevenueSignalApprovalsForImport,
  type RevenueSignalConnectorApprovalRecordSnapshot
} from "../src/services/revenueSignalConnectorApprovals.js";

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

function approvalFromManifest(manifest: ReturnType<typeof buildRevenueSignalConnectorPlan>["manifests"][number], status: string): RevenueSignalConnectorApprovalRecordSnapshot {
  const signalPreview = buildSignalIntakePlan({
    incoming: manifest.samplePayload ?? undefined,
    options: {
      includeSamplePayloads: false,
      maxSignals: 100,
      windowDays: 30
    }
  });

  return {
    blockedActions: manifest.blockedExternalActions,
    contentBriefId: manifest.target.contentBriefId,
    createdAt: "2026-06-02T12:00:00.000Z",
    credentialEnvVars: manifest.credentialEnvVars,
    dedupeKey: manifest.id,
    endpointTemplates: manifest.endpointTemplates,
    externalExecution: false,
    id: `approval_${manifest.id}`,
    lane: manifest.lane,
    manifest,
    manifestId: manifest.id,
    productId: manifest.target.productId,
    provider: manifest.provider,
    providerContacted: false,
    providerName: manifest.providerName,
    readOnlyScopes: manifest.readOnlyScopes,
    readinessScore: manifest.readinessScore,
    requestAuditLogId: "audit_request",
    reviewAuditLogId: status === "approved" ? "audit_review" : null,
    reviewedAt: status === "approved" ? "2026-06-02T12:05:00.000Z" : null,
    reviewedById: status === "approved" ? "user_1" : null,
    reviewNote: null,
    riskLevel: manifest.riskLevel,
    samplePayload: manifest.samplePayload,
    signalPreview,
    status,
    storeId: manifest.target.storeId,
    storeName: manifest.target.storeName,
    transformTarget: manifest.transformTarget,
    updatedAt: "2026-06-02T12:05:00.000Z"
  };
}

describe("Revenue Signal Connector Approval Center", () => {
  it("builds approval and import queues without external execution", () => {
    const connectorPlan = buildRevenueSignalConnectorPlan({
      briefs,
      generatedAt: "2026-06-02T12:00:00.000Z",
      products,
      stores
    });
    const approved = approvalFromManifest(connectorPlan.manifests[0], "approved");
    const plan = buildRevenueSignalConnectorApprovalPlan({
      approvals: [approved],
      connectorPlan,
      generatedAt: "2026-06-02T12:15:00.000Z",
      importJobs: []
    });

    expect(revenueSignalConnectorApprovalConfirmation).toBe("QUEUE READONLY SIGNAL CONNECTOR APPROVALS");
    expect(revenueSignalConnectorApproveConfirmation).toBe("APPROVE READONLY SIGNAL CONNECTOR");
    expect(revenueSignalImportJobConfirmation).toBe("QUEUE READONLY SIGNAL IMPORT JOBS");
    expect(plan.mode).toBe("Internal Read-Only Signal Connector Approval Center");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.approvalQueue.some((item) => item.manifestId === approved.manifestId)).toBe(false);
    expect(plan.importQueue).toHaveLength(1);
    expect(plan.importQueue[0].approvalId).toBe(approved.id);
    expect(plan.totals.approvedApprovals).toBe(1);
    expect(plan.totals.sampleSignalsQueued).toBeGreaterThan(0);
    expect(plan.blockedExternalActions.join(" ")).toContain("browser");
  });

  it("selects only approved records that are still eligible for import", () => {
    const connectorPlan = buildRevenueSignalConnectorPlan({
      briefs,
      generatedAt: "2026-06-02T12:00:00.000Z",
      products,
      stores
    });
    const approved = approvalFromManifest(connectorPlan.manifests[0], "approved");
    const rejected = approvalFromManifest(connectorPlan.manifests[1], "rejected");
    const plan = buildRevenueSignalConnectorApprovalPlan({
      approvals: [approved, rejected],
      connectorPlan,
      importJobs: []
    });

    expect(selectRevenueSignalApprovalsForImport(plan)).toEqual([approved]);
    expect(selectRevenueSignalApprovalsForImport(plan, [rejected.id])).toEqual([]);
  });
});
