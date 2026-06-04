import { describe, expect, it } from "vitest";
import {
  buildBrowserOperationsPlan,
  type BrowserOperationJobSnapshot
} from "../src/services/browserOperations.js";

const now = new Date("2026-06-02T12:00:00.000Z");

function job(input: Partial<BrowserOperationJobSnapshot> & { id: string; status: string }): BrowserOperationJobSnapshot {
  return {
    completedAt: null,
    createdAt: "2026-06-02T11:00:00.000Z",
    error: null,
    id: input.id,
    logCount: 1,
    payload: {
      selector: "h1",
      url: "https://example.com"
    },
    result: null,
    resultEngine: null,
    scheduledAt: null,
    startedAt: null,
    status: input.status,
    type: "scrape",
    updatedAt: "2026-06-02T11:00:00.000Z",
    ...input
  };
}

describe("Browser Operations Layer", () => {
  it("builds queue safety, isolation, and recovery runbooks without external execution", () => {
    const plan = buildBrowserOperationsPlan({
      config: {
        allowedDomains: ["example.com"],
        featureEnabled: true,
        localFallbackEnabled: true,
        maxConcurrency: 2,
        playwrightConfigured: false,
        workerEnabled: true
      },
      jobs: [
        job({ id: "job_failed", status: "failed", error: "Browser unavailable." }),
        job({
          id: "job_stale",
          startedAt: "2026-06-02T10:00:00.000Z",
          status: "running"
        }),
        job({ id: "job_pending", status: "pending" })
      ],
      now,
      options: {
        staleRunningMinutes: 30
      }
    });

    expect(plan.mode).toBe("Internal Browser Operations Layer");
    expect(plan.externalExecution).toBe(false);
    expect(plan.providerContacted).toBe(false);
    expect(plan.operationalState.isolationModel).toBe("Ephemeral browser context per job");
    expect(plan.totals.recoveryActions).toBe(2);
    expect(plan.totals.staleRunningJobs).toBe(1);
    expect(plan.runbooks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        action: "recover_stale_running_job",
        externalExecution: false,
        targetId: "job_stale"
      }),
      expect.objectContaining({
        action: "retry_failed_job",
        providerContacted: false,
        targetId: "job_failed"
      })
    ]));
    expect(plan.safetyLanes.map((lane) => lane.lane)).toEqual(["allowlist", "isolation", "execution", "recovery"]);
    expect(plan.blockedExternalActions).toContain("Browser stealth, anti-detection, CAPTCHA bypass, fingerprint spoofing, or platform evasion");
    expect(plan.blockedExternalActions).toContain("Proxy rotation, residential proxy use, account warmup, or traffic disguise");
  });

  it("blocks operation when no automation allow-list exists", () => {
    const plan = buildBrowserOperationsPlan({
      config: {
        allowedDomains: [],
        featureEnabled: true,
        localFallbackEnabled: true,
        maxConcurrency: 2,
        playwrightConfigured: true,
        workerEnabled: true
      },
      jobs: [],
      now
    });

    expect(plan.runbooks[0]).toMatchObject({
      action: "review_allowlist",
      riskLevel: "high",
      status: "blocked",
      targetType: "policy"
    });
    expect(plan.safetyLanes[0].riskLevel).toBe("high");
  });

  it("treats completed recoverable Shopify browser receipts as retry candidates", () => {
    const plan = buildBrowserOperationsPlan({
      config: {
        allowedDomains: ["dev.shopify.com"],
        featureEnabled: true,
        localFallbackEnabled: true,
        maxConcurrency: 2,
        playwrightConfigured: true,
        workerEnabled: true
      },
      jobs: [
        job({
          id: "shopify_browser_login_gate",
          payload: {
            url: "https://dev.shopify.com/dashboard/stores"
          },
          result: {
            receipt: {
              status: "blocked_operator_gate",
              summary: "Shopify Dev Dashboard browser task stopped at a login, verification, or permission gate."
            }
          },
          status: "completed",
          type: "shopify_store_creation_browser_task"
        })
      ],
      now
    });

    expect(plan.totals.recoveryActions).toBe(1);
    expect(plan.runbooks[0]).toMatchObject({
      action: "retry_failed_job",
      reason: "Shopify store-creation browser task completed with recoverable receipt status blocked_operator_gate.",
      status: "ready",
      targetId: "shopify_browser_login_gate"
    });
  });

  it("does not retry completed Shopify browser hard-stop receipts", () => {
    const plan = buildBrowserOperationsPlan({
      config: {
        allowedDomains: ["dev.shopify.com"],
        featureEnabled: true,
        localFallbackEnabled: true,
        maxConcurrency: 2,
        playwrightConfigured: true,
        workerEnabled: true
      },
      jobs: [
        job({
          id: "shopify_browser_billing_gate",
          payload: {
            url: "https://dev.shopify.com/dashboard/stores"
          },
          result: {
            receipt: {
              status: "blocked_hard_stop",
              summary: "Shopify Dev Dashboard browser task stopped at a billing gate."
            }
          },
          status: "completed",
          type: "shopify_store_creation_browser_task"
        })
      ],
      now
    });

    expect(plan.totals.recoveryActions).toBe(0);
    expect(plan.runbooks[0]).toMatchObject({
      action: "watch"
    });
  });
});
