import { describe, expect, it } from "vitest";
import { buildRevenueFirstBusinessLaunchPlan } from "../src/services/revenueFirstBusinessLaunch.js";
import type { RevenueFirstCashSprintPlan } from "../src/services/revenueFirstCashSprint.js";
import type { RevenueLaunchChecklistPlan } from "../src/services/revenueLaunchChecklist.js";

const checklistPlan = {
  blockedExternalActions: ["Publishing marketplace listings"],
  items: [
    {
      blockers: [],
      commandActions: [],
      id: "checklist-iron",
      incomeVelocityScore: 72,
      nextAction: "run_listing_optimization",
      nextActionLabel: "Run listing optimization",
      priorityScore: 78,
      readinessScore: 68,
      riskLevel: "low",
      storeId: "store-iron",
      storeName: "Iron House Gym",
      summary: "Iron House Gym: Run listing optimization. Priority 78, readiness 68, velocity 72."
    },
    {
      blockers: ["Provider payload approval missing."],
      commandActions: [],
      id: "checklist-blocked",
      incomeVelocityScore: 80,
      nextAction: "hold_review",
      nextActionLabel: "Hold for review",
      priorityScore: 74,
      readinessScore: 60,
      riskLevel: "high",
      storeId: "store-blocked",
      storeName: "Blocked Studio",
      summary: "Blocked Studio needs review."
    }
  ],
  mode: "Internal Revenue Launch Checklist"
} as unknown as RevenueLaunchChecklistPlan;

const firstCashSprintPlan = {
  blockedExternalActions: ["Publishing first-cash launch assets"],
  options: {
    includeBlocked: true,
    maxCandidates: 8,
    maxSprintActions: 5,
    targetDaysToFirstCash: 7
  },
  steps: [
    {
      blockers: [],
      bridgeActionId: "bridge-iron",
      cashReadinessScore: 86,
      endpoint: "/merch/revenue-engine/listing-optimization/apply",
      expectedInternalEffect: "Listing optimization can be dispatched internally for Iron House Gym.",
      nextActionTitle: "Run listing optimization",
      priorityScore: 118,
      reason: "Iron House Gym is closest to first sale.",
      sprintActionId: "first_cash:store-iron:optimize_listings",
      status: "ready_internal",
      storeId: "store-iron"
    },
    {
      blockers: ["Operator launch review required."],
      bridgeActionId: null,
      cashReadinessScore: 70,
      endpoint: "/merch/revenue-engine/launch-readiness",
      expectedInternalEffect: "Manual launch review is required.",
      nextActionTitle: "Final operator launch review",
      priorityScore: 90,
      reason: "Manual review is needed.",
      sprintActionId: "first_cash:store-blocked:final_operator_launch_review",
      status: "manual_gate",
      storeId: "store-blocked"
    }
  ],
  summary: "2 first-cash sprint moves prioritized: 1 ready internal, 1 manual-gated, 0 blocked. Top path: Iron House Gym.",
  totals: {
    readyInternal: 1
  }
} as unknown as RevenueFirstCashSprintPlan;

describe("Revenue First Business Launch Path", () => {
  it("promotes the ready first-cash sprint path as the top launch target", () => {
    const plan = buildRevenueFirstBusinessLaunchPlan({
      checklistPlan,
      firstCashSprintPlan,
      generatedAt: "2026-06-02T12:00:00.000Z",
      maxCandidates: 8
    });

    expect(plan.mode).toBe("Revenue Engine First Business Launch Path");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.topCandidate?.storeName).toBe("Iron House Gym");
    expect(plan.topCandidate?.status).toBe("ready_internal");
    expect(plan.topCandidate?.sprintActionId).toBe("first_cash:store-iron:optimize_listings");
    expect(plan.topCandidate?.nextInternalState).toBe("dispatch_ready_first_cash_bridge_action");
    expect(plan.totals.readyInternal).toBe(1);
    expect(plan.blockedExternalActions).toContain("Publishing marketplace listings");
  });

  it("returns a clear no-candidate plan when the checklist is empty", () => {
    const plan = buildRevenueFirstBusinessLaunchPlan({
      checklistPlan: {
        ...checklistPlan,
        items: []
      },
      firstCashSprintPlan
    });

    expect(plan.topCandidate).toBeNull();
    expect(plan.totals.candidates).toBe(0);
    expect(plan.summary).toContain("No first-business launch path");
  });
});
