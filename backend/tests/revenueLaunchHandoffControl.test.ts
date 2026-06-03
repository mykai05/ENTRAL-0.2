import { describe, expect, it } from "vitest";
import {
  buildRevenueLaunchHandoffControlPlan,
  evaluateRevenueLaunchHandoffControlUpdate
} from "../src/services/revenueLaunchHandoffControl.js";
import type { RevenueLaunchHandoffPacketRecordSnapshot } from "../src/services/revenueLaunchHandoff.js";

function packet(input: Partial<RevenueLaunchHandoffPacketRecordSnapshot> = {}): RevenueLaunchHandoffPacketRecordSnapshot {
  return {
    action: "review_provider_handoff_bundle",
    approvedPacketId: "approval_1",
    artifactSlotCount: 12,
    auditLogId: "audit_1",
    blockedActions: ["Sending provider API requests"],
    blockers: [],
    bundle: null,
    connectorReadinessScore: 91,
    connectorStatus: "Ready for manual handoff",
    createdAt: "2026-06-02T12:00:00.000Z",
    credentialScopes: ["shops:read", "products:write"],
    dedupeKey: "launch_handoff:store_1:approval_1:10:10",
    externalExecution: false,
    id: "handoff_packet_1",
    launchReadinessScore: 92,
    manifestCount: 10,
    providerContacted: false,
    providerReadinessScore: 95,
    providers: ["Printify", "Etsy"],
    riskLevel: "low",
    status: "queued_review",
    storeId: "store_1",
    storeName: "Signal Forge",
    summary: "Signal Forge handoff packet is ready for review.",
    updatedAt: "2026-06-02T13:00:00.000Z",
    ...input
  };
}

describe("Revenue Launch Handoff Control Center", () => {
  it("recommends ready status for manifest-backed handoff packets", () => {
    const plan = buildRevenueLaunchHandoffControlPlan({
      packets: [packet()]
    });

    expect(plan.mode).toBe("Internal Launch Handoff Control Center");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.totals.readyForManualHandoff).toBe(0);
    expect(plan.packets[0].recommendedStatus).toBe("ready_for_manual_handoff");
    expect(plan.packets[0].controlActions.find((action) => action.status === "ready_for_manual_handoff")?.enabled).toBe(true);
    expect(plan.blockedExternalActions).toContain("Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation");
  });

  it("blocks unsafe ready status changes when manifests are missing", () => {
    const plan = buildRevenueLaunchHandoffControlPlan({
      packets: [
        packet({
          connectorReadinessScore: 25,
          connectorStatus: "Blocked - no approved payloads",
          manifestCount: 0,
          riskLevel: "high",
          status: "queued_review"
        })
      ]
    });
    const evaluation = evaluateRevenueLaunchHandoffControlUpdate({
      item: plan.packets[0],
      toStatus: "ready_for_manual_handoff"
    });

    expect(plan.packets[0].recommendedStatus).toBe("blocked_review");
    expect(plan.packets[0].reviewBlockers.map((blocker) => blocker.code)).toContain("missing_manifests");
    expect(evaluation.allowed).toBe(false);
    expect(evaluation.providerContacted).toBe(false);
    expect(evaluation.blockers.join(" ")).toContain("not currently recommended");
  });
});
