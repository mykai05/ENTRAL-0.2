import { describe, expect, it } from "vitest";
import type { RevenueLaunchOperationsPackPlan } from "../src/services/revenueLaunchOperationsPack.js";
import type { RevenuePerformanceDigest } from "../src/services/revenuePerformance.js";
import {
  buildRevenueLaunchClosureLedgerPlan,
  selectRevenueLaunchClosureLedgerEntries
} from "../src/services/revenueLaunchClosureLedger.js";

function operationsPackPlan(blocked = false): RevenueLaunchOperationsPackPlan {
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
      artifactSlots: blocked ? [] : [{
        acceptedFormats: ["png"],
        label: "Design asset",
        manifestId: "manifest_1",
        notes: "Approved artwork only.",
        provider: "Printify",
        required: true,
        slotId: "design"
      }],
      auditTrail: {
        approvedPacketId: blocked ? null : "packet_1",
        handoffPacketAuditLogId: blocked ? null : "audit_handoff",
        handoffPacketId: blocked ? null : "handoff_1",
        reviewAuditLogId: blocked ? null : "audit_review"
      },
      blockers: blocked ? [{
        code: "missing_packet",
        severity: "high",
        title: "No approved provider packet exists."
      }] : [],
      checklist: {
        blockers: [],
        nextAction: "generate_provider_handoff",
        priorityScore: 90,
        readyStages: 3,
        signalEvidence: 1,
        summary: "Ready checklist."
      },
      credentialScopes: blocked ? [] : ["products:write"],
      externalExecution: false,
      manualOnly: true,
      manualSteps: blocked ? [] : ["Open provider manually."],
      operatorBrief: {
        businessName: "Signal Forge",
        nextReviewGate: blocked ? "Resolve launch blockers." : "Operator manual launch review",
        productNames: blocked ? [] : ["Focus Poster"],
        providers: blocked ? [] : ["Printify"],
        readinessLine: blocked ? "Launch 50/100, provider 0/100, connector 0/100." : "Launch 90/100, provider 88/100, connector 86/100.",
        storeName: "Signal Forge"
      },
      priority: 100,
      providerContacted: false,
      qaChecklist: blocked ? [] : ["Confirm title."],
      readiness: {
        connectorReadinessScore: blocked ? 0 : 86,
        launchReadinessScore: blocked ? 50 : 90,
        overallScore: blocked ? 17 : 89,
        providerReadinessScore: blocked ? 0 : 88
      },
      requestManifests: blocked ? [] : [{
        action: "create_pod_product",
        artifactSlots: 1,
        credentialScope: ["products:write"],
        executionState: "Locked - manual handoff only",
        id: "manifest_1",
        pathTemplate: "/products",
        productName: "Focus Poster",
        provider: "Printify"
      }],
      riskLevel: blocked ? "high" : "low",
      status: blocked ? "blocked" : "ready_for_manual_launch",
      storeId: "store_1",
      storeName: "Signal Forge",
      summary: blocked ? "Blocked pack." : "Ready pack."
    }],
    providerContacted: false,
    queue: [],
    summary: "Pack ready.",
    totals: {
      artifactSlots: blocked ? 0 : 1,
      blockedPacks: blocked ? 1 : 0,
      credentialScopes: blocked ? 0 : 1,
      manualSteps: blocked ? 0 : 1,
      packs: 1,
      readyPacks: blocked ? 0 : 1,
      requestManifests: blocked ? 0 : 1,
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

describe("Revenue Launch Closure Ledger", () => {
  it("builds a monitoring-ready scorecard with first-week revenue and triggers", () => {
    const plan = buildRevenueLaunchClosureLedgerPlan({
      operationsPackPlan: operationsPackPlan(),
      performanceDigest: performanceDigest()
    });

    expect(plan.mode).toBe("Internal Launch Revenue Closure Ledger");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.entries[0].status).toBe("monitoring_ready");
    expect(plan.entries[0].expectedFirstWeekRevenue.target).toBeGreaterThan(0);
    expect(plan.entries[0].monitoringTriggers).toHaveLength(5);
    expect(plan.totals.triggersQueued).toBe(5);
    expect(plan.queue[0].action).toBe("schedule_monitoring");
  });

  it("filters blocked entries and supports store-id selection", () => {
    const hidden = buildRevenueLaunchClosureLedgerPlan({
      operationsPackPlan: operationsPackPlan(true),
      options: {
        includeBlocked: false
      },
      performanceDigest: performanceDigest()
    });

    expect(hidden.entries).toHaveLength(0);

    const visible = buildRevenueLaunchClosureLedgerPlan({
      operationsPackPlan: operationsPackPlan(true),
      options: {
        includeBlocked: true
      },
      performanceDigest: performanceDigest()
    });

    expect(visible.entries[0].status).toBe("blocked");
    expect(selectRevenueLaunchClosureLedgerEntries(visible, ["store_1"])).toHaveLength(1);
    expect(selectRevenueLaunchClosureLedgerEntries(visible, ["store_missing"])).toHaveLength(0);
  });
});
