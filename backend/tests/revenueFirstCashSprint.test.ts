import { describe, expect, it } from "vitest";
import type { RevenueFirstCashReadinessPlan } from "../src/services/revenueFirstCashReadiness.js";
import {
  buildRevenueFirstCashSprintPlan,
  selectRevenueFirstCashSprintBridgeActionIds
} from "../src/services/revenueFirstCashSprint.js";
import type { RevenueLaunchChecklistActionBridgePlan } from "../src/services/revenueLaunchChecklistActionBridge.js";

const firstCashPlan: RevenueFirstCashReadinessPlan = {
  auditEvents: ["First-cash readiness generated."],
  blockedExternalActions: ["No external writes."],
  candidates: [{
    automaticCashEtaDays: 12,
    automaticCashReady: false,
    automaticCashStatus: "launch_work_needed",
    blockers: [],
    cashReadinessScore: 82,
    estimatedFirstSaleDays: 7,
    evidence: {
      approvedProducts: 3,
      launchReadinessScore: 84,
      liveConnectorReadinessScore: 72,
      payloadsPrepared: 3,
      providerApprovalApproved: false,
      providerApprovalPending: false,
      revenue: 0
    },
    externalExecution: false,
    launchStage: "listing_optimization",
    manualLaunchReady: false,
    nextAction: {
      action: "optimize_listings",
      reason: "Listing improvements are the fastest internal path to launch review.",
      title: "Optimize listings"
    },
    paymentReadiness: "approved_readonly",
    providerContacted: false,
    status: "needs_products",
    storeId: "store-first-cash",
    storeName: "First Cash Studio",
    summary: "First Cash Studio: needs products. First sale ETA 7 days; automatic cash ETA 12 days."
  }],
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  mode: "Revenue Engine First Cash Readiness",
  options: {
    includeBlocked: true,
    maxCandidates: 8,
    targetDaysToFirstCash: 7
  },
  providerContacted: false,
  summary: "1 first-cash candidate ranked. Top path: First Cash Studio, first sale ETA 7 days, automatic cash ETA 12 days.",
  topCandidate: null,
  totals: {
    automaticCashReady: 0,
    blocked: 0,
    candidates: 1,
    manualLaunchReady: 0,
    targetReady: 1
  }
};
firstCashPlan.topCandidate = firstCashPlan.candidates[0] ?? null;

const bridgePlan: RevenueLaunchChecklistActionBridgePlan = {
  actions: [{
    actionId: "store-first-cash:run_listing_optimization:listing_optimization",
    blockedReason: null,
    checklistAction: "run_listing_optimization",
    checklistItemId: "checklist-first-cash",
    confirmationRequired: "DISPATCH INTERNAL REVENUE LAUNCH CHECKLIST ACTIONS",
    dispatchKind: "listing_optimization",
    endpoint: "/merch/revenue-engine/listing-optimization/apply",
    externalExecution: false,
    payload: {
      storeId: "store-first-cash"
    },
    priorityScore: 94,
    providerContacted: false,
    status: "ready",
    storeId: "store-first-cash",
    storeName: "First Cash Studio",
    summary: "Listing optimization can update internal product listing drafts for First Cash Studio."
  }],
  auditEvents: [],
  blockedExternalActions: ["No provider writes."],
  checklist: {
    generatedAt: "2026-06-02T12:00:00.000Z",
    items: 1,
    readyItems: 1,
    summary: "Checklist ready."
  },
  externalExecution: false,
  generatedAt: "2026-06-02T12:00:00.000Z",
  mode: "Internal Revenue Launch Checklist Action Bridge",
  options: {
    includeCompleted: true,
    maxActions: 5,
    maxItems: 25,
    minPriorityScore: 0,
    windowDays: 30
  },
  providerContacted: false,
  summary: "1 bridge action ready.",
  totals: {
    actions: 1,
    blockedActions: 0,
    connectorApprovalActions: 0,
    importHandoffActions: 0,
    importJobActions: 0,
    launchPipelineActions: 0,
    listingOptimizationActions: 1,
    manualReviewActions: 0,
    portfolioCommandActions: 0,
    readyActions: 1,
    storeSetupActions: 0,
    watchActions: 0
  }
};

describe("Revenue First Cash Sprint", () => {
  it("maps the fastest first-cash candidate to a ready internal bridge action", () => {
    const sprint = buildRevenueFirstCashSprintPlan({
      bridgePlan,
      firstCashPlan,
      generatedAt: "2026-06-02T12:05:00.000Z"
    });

    expect(sprint.mode).toBe("Revenue Engine First Cash Sprint");
    expect(sprint.externalExecution).toBe(false);
    expect(sprint.providerContacted).toBe(false);
    expect(sprint.totals).toMatchObject({
      eligibleBridgeActions: 1,
      readyInternal: 1,
      targetReady: 1
    });
    expect(sprint.steps[0]).toMatchObject({
      action: "optimize_listings",
      bridgeActionId: "store-first-cash:run_listing_optimization:listing_optimization",
      dispatchKind: "listing_optimization",
      status: "ready_internal",
      storeName: "First Cash Studio"
    });
    expect(selectRevenueFirstCashSprintBridgeActionIds(sprint)).toEqual([
      "store-first-cash:run_listing_optimization:listing_optimization"
    ]);
    expect(sprint.blockedExternalActions.join(" ")).toContain("fingerprint");
  });

  it("keeps manual launch review as a manual gate when no bridge action exists", () => {
    const manualPlan: RevenueFirstCashReadinessPlan = {
      ...firstCashPlan,
      candidates: [{
        ...firstCashPlan.candidates[0],
        automaticCashEtaDays: 3,
        automaticCashStatus: "automatic_cash_ready",
        estimatedFirstSaleDays: 2,
        manualLaunchReady: true,
        nextAction: {
          action: "final_operator_launch_review",
          reason: "The revenue path is close enough for final operator launch review.",
          title: "Final operator launch review"
        },
        status: "ready_for_manual_launch",
        summary: "First Cash Studio: ready for manual launch. First sale ETA 2 days; automatic cash ETA 3 days."
      }],
      summary: "1 first-cash candidate ranked. Top path: First Cash Studio, first sale ETA 2 days, automatic cash ETA 3 days."
    };
    manualPlan.topCandidate = manualPlan.candidates[0] ?? null;

    const sprint = buildRevenueFirstCashSprintPlan({
      bridgePlan,
      firstCashPlan: manualPlan
    });

    expect(sprint.steps[0]).toMatchObject({
      action: "final_operator_launch_review",
      bridgeActionId: null,
      endpoint: "/merch/revenue-engine/launch-readiness",
      status: "manual_gate"
    });
    expect(selectRevenueFirstCashSprintBridgeActionIds(sprint)).toEqual([]);
  });
});
