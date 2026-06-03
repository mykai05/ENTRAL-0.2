import { describe, expect, it } from "vitest";
import type { RevenueLaunchChecklistPlan } from "../src/services/revenueLaunchChecklist.js";
import type { RevenueLaunchHandoffPlan } from "../src/services/revenueLaunchHandoff.js";
import {
  buildRevenueLaunchOperationsPackPlan,
  selectRevenueLaunchOperationsPacks
} from "../src/services/revenueLaunchOperationsPack.js";

function checklistPlan(): RevenueLaunchChecklistPlan {
  return {
    auditEvents: [],
    blockedExternalActions: ["Checklist external writes locked"],
    externalExecution: false,
    generatedAt: "2026-06-02T00:00:00.000Z",
    items: [{
      assetSignal: null,
      blockers: [],
      businessName: "Signal Forge",
      commandActions: [],
      externalExecution: false,
      id: "check_store_1",
      incomeVelocityScore: 72,
      metrics: {
        approvedProducts: 5,
        commandActions: 0,
        completedHandoffs: 0,
        connectorApprovalQueue: 0,
        estimatedDraftProfit: 500,
        importHandoffsReady: 1,
        importJobs: 1,
        listingReadyProducts: 5,
        netProfit: 240,
        pendingConnectorApprovals: 0,
        performanceSnapshots: 1,
        scoredAssets: 0,
        productDrafts: 5,
        revenue: 400,
        signalEvidence: 1
      },
      nextAction: "generate_provider_handoff",
      nextActionLabel: "Generate provider handoff",
      opportunityId: "opp_1",
      opportunityStatus: "ready_for_handoff",
      priorityScore: 91,
      providerContacted: false,
      readinessScore: 88,
      riskLevel: "low",
      stages: [{
        action: "generate_provider_handoff",
        key: "launch_readiness",
        score: 90,
        status: "ready",
        summary: "Ready"
      }],
      storeId: "store_1",
      storeName: "Signal Forge",
      summary: "Signal Forge is ready for handoff."
    }],
    mode: "Internal Revenue Launch Checklist",
    options: {
      includeCompleted: true,
      maxItems: 25,
      minPriorityScore: 0,
      windowDays: 30
    },
    providerContacted: false,
    stageCounts: {
      blocked: 0,
      complete: 0,
      missing: 0,
      ready: 1,
      watch: 0
    },
    summary: "Checklist ready.",
    totals: {
      approvedProducts: 5,
      blockedItems: 0,
      commandActions: 0,
      completedItems: 0,
      connectorApprovalQueue: 0,
      estimatedDraftProfit: 500,
      importHandoffsReady: 1,
      importJobs: 1,
      items: 1,
      killAssets: 0,
      listingReadyProducts: 5,
      netProfit: 240,
      opportunities: 1,
      pendingConnectorApprovals: 0,
      pauseAssets: 0,
      productDrafts: 5,
      readyItems: 1,
      revenue: 400,
      scaleAssets: 0,
      scoredAssets: 0,
      signalEvidenceItems: 1,
      stores: 1,
      watchAssets: 0
    }
  };
}

function handoffPlan(blocked = false): RevenueLaunchHandoffPlan {
  return {
    auditEvents: [],
    blockedExternalActions: ["Provider execution locked"],
    externalExecution: false,
    generatedAt: "2026-06-02T00:00:00.000Z",
    items: [{
      action: blocked ? "resolve_handoff_blockers" : "review_provider_handoff_bundle",
      approvedPacketId: blocked ? null : "packet_1",
      artifactSlotCount: blocked ? 0 : 2,
      blockers: blocked ? [{
        code: "approved_packet_missing",
        severity: "high",
        title: "No approved provider payload approval packet exists for this store."
      }] : [],
      bundle: blocked ? null : {
        approvedAt: "2026-06-02T00:00:00.000Z",
        approvedPacketId: "packet_1",
        auditEvents: ["Provider handoff bundle generated from an approved provider payload packet."],
        blockedActions: ["Do not send provider requests."],
        businessName: "Signal Forge",
        connectorReadiness: {
          requiredBeforeConnector: ["Manual launch review"],
          score: 86,
          status: "Ready for manual handoff"
        },
        drift: {
          adapterCoverageMatches: true,
          payloadCountMatches: true,
          readinessScoreDelta: 0,
          warnings: []
        },
        externalExecution: false,
        generatedAt: "2026-06-02T00:00:00.000Z",
        manualLaunchChecklist: ["Open provider manually.", "Copy locked payload fields."],
        mode: "Provider Handoff Bundle",
        providerContacted: false,
        requestManifest: [{
          action: "create_pod_product",
          artifactSlots: [{
            acceptedFormats: ["png"],
            label: "Design asset",
            notes: "Approved artwork only.",
            required: true,
            slotId: "design"
          }, {
            acceptedFormats: ["png", "jpg"],
            label: "Mockup",
            notes: "Approved mockup only.",
            required: true,
            slotId: "mockup"
          }],
          bodyJson: "{}",
          credentialScope: ["products:write"],
          executionState: "Locked - manual handoff only",
          headers: {},
          id: "manifest_1",
          idempotencyKey: "key_1",
          manualSteps: ["Paste title manually."],
          method: "POST",
          pathTemplate: "/products",
          productName: "Focus Poster",
          provider: "Printify",
          requiredApprovals: ["final approval"],
          validationChecklist: ["Confirm title."]
        }],
        reviewAuditLogId: "audit_review",
        rollbackChecklist: ["Archive draft if mismatch is found."],
        summary: "Ready bundle."
      },
      connectorReadiness: blocked ? null : {
        requiredBeforeConnector: ["Manual launch review"],
        score: 86,
        status: "Ready for manual handoff"
      },
      credentialScopes: blocked ? [] : ["products:write"],
      externalExecution: false,
      launchReadiness: {
        nextInternalAction: "generate_provider_handoff",
        readinessScore: blocked ? 60 : 90,
        stage: blocked ? "blocked" : "handoff_ready"
      },
      manifestCount: blocked ? 0 : 1,
      priority: 80,
      providerContacted: false,
      providerPayload: {
        adapterCoverage: blocked ? [] : ["Printify"],
        payloadCount: blocked ? 0 : 1,
        readinessScore: blocked ? 0 : 90,
        warnings: []
      },
      providers: blocked ? [] : ["Printify"],
      riskLevel: blocked ? "high" : "low",
      storeId: "store_1",
      storeName: "Signal Forge",
      summary: blocked ? "Blocked handoff." : "Ready handoff."
    }],
    mode: "Internal Launch Handoff Packet Builder",
    options: {
      includeBlocked: true,
      maxBundles: 10,
      minConnectorReadiness: 70,
      minLaunchReadiness: 70,
      minProviderReadiness: 70
    },
    persistedPackets: [{
      action: "review_provider_handoff_bundle",
      approvedPacketId: "packet_1",
      artifactSlotCount: 2,
      auditLogId: "audit_record",
      blockedActions: [],
      blockers: [],
      bundle: null,
      connectorReadinessScore: 86,
      connectorStatus: "Ready for manual handoff",
      createdAt: "2026-06-02T00:00:00.000Z",
      credentialScopes: ["products:write"],
      dedupeKey: "store_1:packet_1",
      externalExecution: false,
      id: "handoff_record_1",
      launchReadinessScore: 90,
      manifestCount: 1,
      providerContacted: false,
      providerReadinessScore: 90,
      providers: ["Printify"],
      riskLevel: "low",
      status: "ready_for_manual_handoff",
      storeId: "store_1",
      storeName: "Signal Forge",
      summary: "Stored packet.",
      updatedAt: "2026-06-02T00:00:00.000Z"
    }],
    providerContacted: false,
    queue: [],
    summary: "Handoff ready.",
    totals: {
      artifactSlots: blocked ? 0 : 2,
      blockedBundles: blocked ? 1 : 0,
      bundlesPrepared: 1,
      credentialScopes: blocked ? 0 : 1,
      manifestsPrepared: blocked ? 0 : 1,
      needsReview: 0,
      openPacketRecords: 1,
      readyForManualHandoff: blocked ? 0 : 1,
      storesEvaluated: 1
    }
  };
}

describe("Revenue Launch Operations Pack", () => {
  it("consolidates a manual-only launch pack from handoff and checklist evidence", () => {
    const plan = buildRevenueLaunchOperationsPackPlan({
      checklistPlan: checklistPlan(),
      handoffPlan: handoffPlan()
    });

    expect(plan.mode).toBe("Internal Revenue Launch Operations Pack");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.readyPacks).toBe(1);
    expect(plan.totals.requestManifests).toBe(1);
    expect(plan.packs[0].status).toBe("ready_for_manual_launch");
    expect(plan.packs[0].manualSteps).toContain("Paste title manually.");
    expect(plan.packs[0].artifactSlots).toHaveLength(2);
    expect(plan.queue[0].action).toBe("record_launch_pack");
  });

  it("can filter blocked packs and select by store id", () => {
    const plan = buildRevenueLaunchOperationsPackPlan({
      checklistPlan: checklistPlan(),
      handoffPlan: handoffPlan(true),
      options: {
        includeBlocked: false
      }
    });

    expect(plan.packs).toHaveLength(0);

    const visibleBlockedPlan = buildRevenueLaunchOperationsPackPlan({
      checklistPlan: checklistPlan(),
      handoffPlan: handoffPlan(true),
      options: {
        includeBlocked: true
      }
    });

    expect(visibleBlockedPlan.packs[0].status).toBe("blocked");
    expect(selectRevenueLaunchOperationsPacks(visibleBlockedPlan, ["store_1"])).toHaveLength(1);
    expect(selectRevenueLaunchOperationsPacks(visibleBlockedPlan, ["store_missing"])).toHaveLength(0);
  });
});
