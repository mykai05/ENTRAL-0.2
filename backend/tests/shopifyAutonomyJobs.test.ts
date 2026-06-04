import { beforeEach, describe, expect, it, vi } from "vitest";

function resetEnv() {
  vi.resetModules();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
}

describe("Shopify Autonomy Jobs", () => {
  beforeEach(resetEnv);

  it("builds bounded connection watch decisions for blocked Shopify resume jobs", async () => {
    const { buildShopifyConnectionWatchDecision } = await import("../src/services/shopifyAutonomyJobs.js");
    const decision = buildShopifyConnectionWatchDecision({
      attempt: 0,
      intervalMinutes: 15,
      maxAttempts: 24,
      now: new Date("2026-06-04T10:00:00.000Z"),
      status: "blocked_store_creation_required",
      watchForConnection: true
    });

    expect(decision).toMatchObject({
      attempt: 0,
      enabled: true,
      intervalMinutes: 15,
      maxAttempts: 24,
      nextAttempt: 1,
      reason: "scheduled",
      shouldSchedule: true
    });
    expect(decision.scheduledAt?.toISOString()).toBe("2026-06-04T10:15:00.000Z");

    expect(buildShopifyConnectionWatchDecision({
      attempt: 24,
      intervalMinutes: 15,
      maxAttempts: 24,
      now: new Date("2026-06-04T10:00:00.000Z"),
      status: "blocked_credentials",
      watchForConnection: true
    })).toMatchObject({
      nextAttempt: null,
      reason: "exhausted",
      scheduledAt: null,
      shouldSchedule: false
    });

    expect(buildShopifyConnectionWatchDecision({
      attempt: 2,
      intervalMinutes: 15,
      maxAttempts: 24,
      now: new Date("2026-06-04T10:00:00.000Z"),
      status: "executed_shopify_draft",
      watchForConnection: true
    })).toMatchObject({
      reason: "not_connection_blocked",
      shouldSchedule: false
    });

    expect(buildShopifyConnectionWatchDecision({
      attempt: 0,
      intervalMinutes: 15,
      maxAttempts: 24,
      now: new Date("2026-06-04T10:00:00.000Z"),
      status: "blocked_store_creation_required",
      watchForConnection: false
    })).toMatchObject({
      enabled: false,
      reason: "disabled",
      shouldSchedule: false
    });
  });

  it("builds supervisor decisions from Shopify autonomy run results", async () => {
    const {
      buildShopifyAutonomySupervisorDecision,
      buildShopifyConnectionWatchDecision
    } = await import("../src/services/shopifyAutonomyJobs.js");
    const connectionWatch = buildShopifyConnectionWatchDecision({
      attempt: 0,
      intervalMinutes: 15,
      maxAttempts: 24,
      now: new Date("2026-06-04T10:00:00.000Z"),
      status: "blocked_store_creation_required",
      watchForConnection: true
    });

    expect(buildShopifyAutonomySupervisorDecision({
      connectionWatch,
      followUpJobId: "job-follow-up-1",
      plan: {
        status: "blocked_store_creation_required",
        storefrontDraft: null,
        totals: {
          blockedActions: 1,
          executedActions: 0,
          failedActions: 0,
          plannedDraftActions: 0
        }
      } as any
    })).toMatchObject({
      action: "wait_for_connection",
      followUpJobId: "job-follow-up-1",
      nextRunAt: "2026-06-04T10:15:00.000Z",
      status: "queued_follow_up"
    });

    expect(buildShopifyAutonomySupervisorDecision({
      connectionWatch: buildShopifyConnectionWatchDecision({
        attempt: 1,
        intervalMinutes: 15,
        maxAttempts: 24,
        now: new Date("2026-06-04T10:00:00.000Z"),
        status: "executed_shopify_draft",
        watchForConnection: true
      }),
      plan: {
        status: "executed_shopify_draft",
        storefrontDraft: {
          launchReadiness: {
            readyResourceCount: 6,
            status: "ready_for_review",
            summary: "Six Shopify draft resources are ready for owner review."
          }
        },
        totals: {
          blockedActions: 0,
          executedActions: 6,
          failedActions: 0,
          plannedDraftActions: 6
        }
      } as any
    })).toMatchObject({
      action: "review_draft_resources",
      launchReadinessStatus: "ready_for_review",
      reviewResourceCount: 6,
      status: "ready_for_next_step"
    });
  });

  it("builds Shopify approval queue packets from actionable supervisor decisions", async () => {
    const { buildShopifyAutonomySupervisorApprovalPacket } = await import("../src/services/shopifyAutonomyJobs.js");
    const plan = {
      blockedExternalActions: [
        "Publishing products, collections, pages, policies, or theme navigation to public sales channels without separate public launch approval"
      ],
      guardrails: [
        "Keep products in draft status and collections unpublished."
      ],
      sourceStore: {
        businessName: "Iron House Gym",
        storePlatform: "Shopify"
      },
      storefrontDraft: {
        status: "executed"
      }
    } as any;
    const packet = buildShopifyAutonomySupervisorApprovalPacket({
      createdAt: "2026-06-04T10:00:00.000Z",
      decision: {
        action: "review_draft_resources",
        failedActionCount: 0,
        followUpJobId: null,
        launchReadinessStatus: "ready_for_review",
        nextRunAt: null,
        reason: "Six Shopify draft resources are ready for owner review.",
        reviewResourceCount: 6,
        status: "ready_for_next_step",
        summary: "Shopify draft resources are ready for review and later public-launch gating."
      },
      note: "Queued by test",
      plan,
      storeId: "store-1"
    });

    expect(packet).toMatchObject({
      businessName: "Iron House Gym",
      humanApprovalRequired: true,
      mode: "Mock Mode",
      shopifyAutonomy: {
        action: "review_draft_resources",
        reviewResourceCount: 6,
        storefrontDraftStatus: "executed"
      },
      status: "Pending approval",
      storeId: "store-1"
    });
    expect(packet?.actions[0]).toMatchObject({
      channel: "Shopify",
      executionState: "Locked - no external action",
      title: "Review Shopify draft resources"
    });
    expect(packet?.actions[0]?.requiredControls.join(" ")).toContain("Admin link");

    expect(buildShopifyAutonomySupervisorApprovalPacket({
      decision: {
        action: "wait_for_connection",
        failedActionCount: 0,
        followUpJobId: "job-2",
        launchReadinessStatus: null,
        nextRunAt: "2026-06-04T10:15:00.000Z",
        reason: "Waiting for connection.",
        reviewResourceCount: 0,
        status: "queued_follow_up",
        summary: "Waiting for Shopify connection."
      },
      plan,
      storeId: "store-1"
    })).toBeNull();
  });

  it("turns Shopify approval reviews into continuation receipts without external execution", async () => {
    const {
      buildShopifyAutonomyReviewContinuation,
      buildShopifyAutonomySupervisorApprovalPacket
    } = await import("../src/services/shopifyAutonomyJobs.js");
    const packet = buildShopifyAutonomySupervisorApprovalPacket({
      createdAt: "2026-06-04T10:00:00.000Z",
      decision: {
        action: "review_draft_resources",
        failedActionCount: 0,
        followUpJobId: null,
        launchReadinessStatus: "ready_for_review",
        nextRunAt: null,
        reason: "Six Shopify draft resources are ready for owner review.",
        reviewResourceCount: 6,
        status: "ready_for_next_step",
        summary: "Shopify draft resources are ready for review and later public-launch gating."
      },
      note: "Queued by test",
      plan: {
        blockedExternalActions: [
          "Publishing products, collections, pages, policies, or theme navigation to public sales channels without separate public launch approval"
        ],
        guardrails: [
          "Keep products in draft status and collections unpublished."
        ],
        sourceStore: {
          businessName: "Iron House Gym",
          storePlatform: "Shopify"
        },
        storefrontDraft: {
          status: "executed"
        }
      } as any,
      storeId: "store-1"
    });

    expect(packet).not.toBeNull();
    expect(buildShopifyAutonomyReviewContinuation({
      packet: packet!,
      reviewStatus: "approved",
      storeId: "store-1"
    })).toMatchObject({
      action: "review_draft_resources",
      approvalStatus: "approved",
      canResumeAutonomy: false,
      externalExecution: false,
      nextStep: "public_launch_approval_required",
      providerContacted: false,
      recommendedEndpoint: null,
      reviewResourceCount: 6
    });
    expect(buildShopifyAutonomyReviewContinuation({
      packet: packet!,
      reviewStatus: "rejected",
      storeId: "store-1"
    })).toMatchObject({
      approvalStatus: "rejected",
      canResumeAutonomy: false,
      nextStep: "repair_failed_draft_actions",
      recommendedEndpoint: "/api/v1/merch/stores/store-1/shopify-autonomy-resume-job"
    });
    expect(buildShopifyAutonomyReviewContinuation({
      packet: {
        ...packet!,
        shopifyAutonomy: undefined
      } as any,
      reviewStatus: "approved",
      storeId: "store-1"
    })).toBeNull();
  });
});
