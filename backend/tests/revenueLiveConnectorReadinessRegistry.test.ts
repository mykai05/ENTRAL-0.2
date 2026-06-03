import { describe, expect, it } from "vitest";
import type { RevenueLaunchOperationsPackPlan } from "../src/services/revenueLaunchOperationsPack.js";
import {
  buildRevenueLaunchClosureLedgerPlan,
  type RevenueLaunchClosureLedgerPlan
} from "../src/services/revenueLaunchClosureLedger.js";
import type { RevenuePerformanceDigest } from "../src/services/revenuePerformance.js";
import type {
  RevenueSignalConnectorApprovalPlan,
  RevenueSignalConnectorApprovalRecordSnapshot
} from "../src/services/revenueSignalConnectorApprovals.js";
import type {
  RevenueSignalConnectorManifest,
  RevenueSignalConnectorPlan,
  RevenueSignalConnectorProvider
} from "../src/services/revenueSignalConnectors.js";
import {
  buildRevenueLiveConnectorReadinessRegistryPlan,
  selectRevenueLiveConnectorReadinessEntries
} from "../src/services/revenueLiveConnectorReadinessRegistry.js";

function operationsPackPlan(): RevenueLaunchOperationsPackPlan {
  return {
    auditEvents: [],
    blockedExternalActions: ["Provider writes are locked."],
    externalExecution: false,
    generatedAt: "2026-06-02T00:00:00.000Z",
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
      }],
      auditTrail: {
        approvedPacketId: "packet_1",
        handoffPacketAuditLogId: "audit_handoff",
        handoffPacketId: "handoff_1",
        reviewAuditLogId: "audit_review"
      },
      blockers: [],
      checklist: {
        blockers: [],
        nextAction: "generate_provider_handoff",
        priorityScore: 90,
        readyStages: 3,
        signalEvidence: 1,
        summary: "Ready checklist."
      },
      credentialScopes: ["products:write"],
      externalExecution: false,
      manualOnly: true,
      manualSteps: ["Open provider manually."],
      operatorBrief: {
        businessName: "Signal Forge",
        nextReviewGate: "Operator manual launch review",
        productNames: ["Focus Poster"],
        providers: ["Printify", "Etsy"],
        readinessLine: "Launch 90/100, provider 88/100, connector 86/100.",
        storeName: "Signal Forge"
      },
      priority: 100,
      providerContacted: false,
      qaChecklist: ["Confirm title."],
      readiness: {
        connectorReadinessScore: 86,
        launchReadinessScore: 90,
        overallScore: 89,
        providerReadinessScore: 88
      },
      requestManifests: [{
        action: "create_pod_product",
        artifactSlots: 1,
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
      summary: "Ready pack."
    }],
    providerContacted: false,
    queue: [],
    summary: "Pack ready.",
    totals: {
      artifactSlots: 1,
      blockedPacks: 0,
      credentialScopes: 1,
      manualSteps: 1,
      packs: 1,
      readyPacks: 1,
      requestManifests: 1,
      reviewPacks: 0
    }
  };
}

function performanceDigest(): RevenuePerformanceDigest {
  return {
    auditEvents: [],
    blockedExternalActions: ["Performance import is approval gated."],
    externalExecution: false,
    generatedAt: "2026-06-02T00:00:00.000Z",
    mode: "Internal Performance Velocity Ledger",
    options: {
      maxAdSpendRatio: 70,
      maxRecommendations: 25,
      maxRefundRate: 25,
      minKillProfitVelocity: -5,
      minPauseProfitVelocity: -1,
      minScaleConversionRate: 1.5,
      minScaleProfitVelocity: 10,
      minSnapshotsForKill: 2,
      minWatchVisits: 50,
      windowDays: 7
    },
    productScores: [],
    rotationChanges: [],
    snapshots: [],
    storeScores: [{
      action: "scale",
      adSpendRatio: 0,
      confidence: 80,
      conversionRate: 4,
      costs: 40,
      discounts: 0,
      evidenceGrade: "usable",
      grossRevenue: 320,
      impressions: 1200,
      netProfit: 180,
      netRevenue: 320,
      periodDays: 7,
      profitMargin: 56.25,
      profitVelocity: 25.71,
      reason: "Early revenue evidence is usable.",
      refunds: 0,
      refundRate: 0,
      revenueVelocity: 45.71,
      scaleProducts: 2,
      snapshots: 2,
      storeId: "store_1",
      storeName: "Signal Forge",
      unitsSold: 10,
      visits: 250
    }],
    summary: "Performance ready.",
    totals: {
      grossRevenue: 320,
      netProfit: 180,
      netRevenue: 320,
      productsTracked: 0,
      profitVelocity: 25.71,
      revenueVelocity: 45.71,
      rotationChanges: 0,
      scaleRecommendations: 1,
      snapshots: 2,
      storesTracked: 1
    }
  };
}

function closureLedgerPlan(): RevenueLaunchClosureLedgerPlan {
  return buildRevenueLaunchClosureLedgerPlan({
    operationsPackPlan: operationsPackPlan(),
    performanceDigest: performanceDigest()
  });
}

function manifest(provider: RevenueSignalConnectorProvider): RevenueSignalConnectorManifest {
  const lane = provider === "stripe" ? "payments" : "commerce";

  return {
    approvalGate: {
      humanApprovalRequired: true,
      requiredConfirmation: "RECORD READONLY SIGNAL CONNECTOR MANIFESTS",
      status: "Required"
    },
    blockedExternalActions: ["Connector writes are locked."],
    credentialEnvVars: [`${provider.toUpperCase()}_READONLY_TOKEN`],
    endpointTemplates: [`GET /${provider}/readonly`],
    externalExecution: false,
    id: `manifest_${provider}`,
    lane,
    provider,
    providerContacted: false,
    providerName: provider === "stripe" ? "Stripe" : provider === "printify" ? "Printify" : "Etsy",
    readinessScore: 82,
    readOnlyScopes: [{ reason: "Read internal evidence only.", scope: "orders:read" }],
    riskLevel: provider === "stripe" ? "medium" : "low",
    samplePayload: null,
    status: "ready_for_approval",
    summary: `${provider} manifest ready.`,
    target: {
      contentBriefId: null,
      productId: null,
      storeId: provider === "stripe" ? null : "store_1",
      storeName: provider === "stripe" ? null : "Signal Forge"
    },
    title: `${provider} read-only manifest`,
    transformTarget: provider === "stripe" ? "financial_reconciliation_report" : "revenue_performance_snapshot",
    writeScopes: []
  };
}

function signalApprovalPlan(approved = true): RevenueSignalConnectorApprovalPlan {
  const manifests = [manifest("etsy"), manifest("printify"), manifest("stripe")];
  const connectorPlan: RevenueSignalConnectorPlan = {
    auditEvents: [],
    blockedExternalActions: ["Read-only connector approval is internal."],
    externalExecution: false,
    generatedAt: "2026-06-02T00:00:00.000Z",
    manifests,
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
    sampleSignalBatch: null,
    signalIntakePreview: {
      auditEvents: [],
      blockedExternalActions: [],
      externalExecution: false,
      generatedAt: "2026-06-02T00:00:00.000Z",
      lanes: [],
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
        productsAvailable: 0,
        storesAvailable: 0
      },
      samplePayloads: null,
      summary: "No signals.",
      totals: {
        commerceSignals: 0,
        contentSignals: 0,
        estimatedNetProfit: 0,
        paymentSignals: 0,
        projectedContentRevenue: 0,
        projectedAvailableBalance: 0,
        projectedGrossRevenue: 0,
        signals: 0
      }
    },
    statusCounts: {
      disabled: 0,
      missing_inputs: 0,
      ready_for_approval: 3
    },
    summary: "Connectors ready.",
    totals: {
      commerceConnectors: 2,
      connectors: 3,
      contentConnectors: 0,
      disabledConnectors: 0,
      missingInputConnectors: 0,
      paymentConnectors: 1,
      readyConnectors: 3,
      sampleCommerceSignals: 0,
      sampleContentSignals: 0,
      samplePaymentSignals: 0
    }
  };
  const approvals: RevenueSignalConnectorApprovalRecordSnapshot[] = approved
    ? [{
      blockedActions: ["Connector writes are locked."],
      contentBriefId: null,
      createdAt: "2026-06-02T00:00:00.000Z",
      credentialEnvVars: ["ETSY_READONLY_TOKEN"],
      dedupeKey: "manifest_etsy",
      endpointTemplates: ["GET /etsy/readonly"],
      externalExecution: false,
      id: "approval_etsy",
      lane: "commerce",
      manifest: manifests[0],
      manifestId: "manifest_etsy",
      productId: null,
      provider: "etsy",
      providerContacted: false,
      providerName: "Etsy",
      readOnlyScopes: manifests[0].readOnlyScopes,
      readinessScore: 82,
      requestAuditLogId: "audit_request",
      reviewAuditLogId: "audit_review",
      reviewedAt: "2026-06-02T00:00:00.000Z",
      reviewedById: "user_1",
      reviewNote: "Approved read-only evidence.",
      riskLevel: "low",
      samplePayload: null,
      signalPreview: connectorPlan.signalIntakePreview,
      status: "approved",
      storeId: "store_1",
      storeName: "Signal Forge",
      transformTarget: "revenue_performance_snapshot",
      updatedAt: "2026-06-02T00:00:00.000Z"
    }]
    : [];

  return {
    approvalQueue: [],
    approvals,
    auditEvents: [],
    blockedExternalActions: connectorPlan.blockedExternalActions,
    connectorPlan,
    externalExecution: false,
    generatedAt: "2026-06-02T00:00:00.000Z",
    importJobs: [],
    importQueue: [],
    mode: "Internal Read-Only Signal Connector Approval Center",
    providerContacted: false,
    statusCounts: {
      approvals: {
        archived: 0,
        approved: approvals.length,
        import_queued: 0,
        pending_review: 0,
        rejected: 0
      },
      importJobs: {
        archived: 0,
        blocked_review: 0,
        completed: 0,
        queued_review: 0,
        ready_for_signal_intake: 0
      }
    },
    summary: "Approval plan ready.",
    totals: {
      approvedApprovals: approvals.length,
      approvalQueue: 0,
      importJobs: 0,
      importQueue: 0,
      manifests: 3,
      pendingApprovals: 0,
      readyManifests: 3,
      rejectedApprovals: 0,
      sampleSignalsQueued: 0
    }
  };
}

describe("Revenue Live Connector Readiness Registry", () => {
  it("marks launch-closed stores ready for connector design when read-only evidence is approved", () => {
    const plan = buildRevenueLiveConnectorReadinessRegistryPlan({
      closureLedgerPlan: closureLedgerPlan(),
      operationsPackPlan: operationsPackPlan(),
      signalApprovalPlan: signalApprovalPlan(true)
    });

    expect(plan.mode).toBe("Internal Revenue Live Connector Readiness Registry");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.entries[0].status).toBe("ready_for_design");
    expect(plan.entries[0].connectorBoundaries.some((boundary) => boundary.provider === "printify")).toBe(true);
    expect(plan.entries[0].connectorBoundaries.every((boundary) => boundary.liveMode === "blocked_until_operator_design_approval")).toBe(true);
    expect(plan.entries[0].readOnlyEvidence.approvedConnectors).toBe(1);
    expect(plan.totals.readyForDesign).toBe(1);
  });

  it("requires read-only connector approval before design readiness and supports store selection", () => {
    const plan = buildRevenueLiveConnectorReadinessRegistryPlan({
      closureLedgerPlan: closureLedgerPlan(),
      operationsPackPlan: operationsPackPlan(),
      signalApprovalPlan: signalApprovalPlan(false)
    });

    expect(plan.entries[0].status).toBe("needs_readonly_approval");
    expect(plan.entries[0].blockers.some((blocker) => blocker.code === "readonly_approval")).toBe(true);
    expect(selectRevenueLiveConnectorReadinessEntries(plan, ["store_1"])).toHaveLength(1);
    expect(selectRevenueLiveConnectorReadinessEntries(plan, ["store_missing"])).toHaveLength(0);
  });
});
