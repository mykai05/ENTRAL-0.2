import { describe, expect, it } from "vitest";
import { buildRevenueFirstBusinessLaunchPlan } from "../src/services/revenueFirstBusinessLaunch.js";
import type { FacelessContentPipelinePlan } from "../src/services/facelessContentPipeline.js";
import type { RevenueEngineProductSnapshot, RevenueEngineStoreSnapshot } from "../src/services/revenueEngine.js";
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

const stores: RevenueEngineStoreSnapshot[] = [{
  approvalStatus: "Approved",
  audience: "Strength athletes",
  brandStyle: "Industrial training",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  estimatedProfit: 120,
  id: "store-iron",
  industry: "Fitness",
  launchStatus: "Building Store",
  productTypes: ["T-Shirt"],
  revenue: 240,
  storePlatform: "Shopify"
}];

const products: RevenueEngineProductSnapshot[] = [{
  aiDisclosureNeeded: false,
  designConcept: "Core strength tee",
  designPrompt: "Bold gym tee",
  estimatedProfit: 42,
  id: "product-iron-core",
  listingTitle: "Core Tee",
  productName: "Core Tee",
  productType: "T-Shirt",
  productionPartnerDisclosureNeeded: true,
  profitMargin: 58,
  retailPrice: 32,
  status: "Approved",
  storeId: "store-iron",
  tags: ["gym", "strength"]
}];

const contentPlan = {
  blockedExternalActions: ["Uploading, scheduling, publishing, deleting, or editing social content"],
  briefs: [{
    channelPackages: [{ channel: "youtube_shorts" }, { channel: "tiktok" }, { channel: "instagram_reels" }],
    concept: {
      hook: "Nobody sees the system behind Core Tee.",
      objective: "product_discovery"
    },
    estimatedRevenueImpact: 90,
    id: "faceless-iron-core",
    productId: "product-iron-core",
    priority: 5,
    status: "draft_queued",
    storeId: "store-iron",
    targetChannels: ["youtube_shorts", "tiktok", "instagram_reels"],
    title: "Iron House Gym Core Tee faceless short"
  }]
} as unknown as FacelessContentPipelinePlan;

describe("Revenue First Business Launch Path", () => {
  it("promotes the ready first-cash sprint path as the top launch target", () => {
    const plan = buildRevenueFirstBusinessLaunchPlan({
      checklistPlan,
      contentPlan,
      firstCashSprintPlan,
      generatedAt: "2026-06-02T12:00:00.000Z",
      maxCandidates: 8,
      products,
      stores
    });

    expect(plan.mode).toBe("Revenue Engine First Business Launch Path");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.topCandidate?.storeName).toBe("Iron House Gym");
    expect(plan.topCandidate?.status).toBe("ready_internal");
    expect(plan.topCandidate?.sprintActionId).toBe("first_cash:store-iron:optimize_listings");
    expect(plan.topCandidate?.nextInternalState).toBe("dispatch_ready_first_cash_bridge_action");
    expect(plan.launchPackage?.store.businessName).toBe("Iron House Gym");
    expect(plan.launchPackage?.products[0]?.productName).toBe("Core Tee");
    expect(plan.launchPackage?.contentTieIns[0]?.title).toBe("Iron House Gym Core Tee faceless short");
    expect(plan.launchPackage?.organicTrafficPlan.noSpend).toBe(true);
    expect(plan.launchPackage?.batchStage.requiredConfirmation).toBe("RUN INTERNAL MONEY ARMY BATCH PIPELINE");
    expect(plan.totals.readyInternal).toBe(1);
    expect(plan.totals.productsPrepared).toBe(1);
    expect(plan.totals.contentTieIns).toBe(1);
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
