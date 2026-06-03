import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserOperationsPanel } from "../components/BrowserOperationsPanel";
import { apiFetch } from "../lib/api";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const browserPlan = {
  blockedExternalActions: [
    "Browser stealth, anti-detection, CAPTCHA bypass, fingerprint spoofing, or platform evasion",
    "Proxy rotation, residential proxy use, account warmup, or traffic disguise"
  ],
  externalExecution: false,
  mode: "Internal Browser Operations Layer",
  operationalState: {
    allowedDomains: ["example.com"],
    capacitySlots: 1,
    featureEnabled: true,
    isolationModel: "Ephemeral browser context per job",
    localFallbackEnabled: true,
    maxConcurrency: 2,
    playwrightConfigured: false,
    queuePressure: "elevated",
    workerEnabled: true
  },
  providerContacted: false,
  runbooks: [
    {
      action: "retry_failed_job",
      expectedInternalEffect: "Requeue the failed job for a fresh isolated browser context.",
      id: "retry_failed_job:job_failed",
      priority: 1,
      reason: "Job failed before returning usable read-only output.",
      riskLevel: "medium",
      status: "ready",
      targetName: "scrape https://example.com",
      targetType: "automation_job"
    },
    {
      action: "recover_stale_running_job",
      expectedInternalEffect: "Mark the stale running job failed so it can be retried deliberately.",
      id: "recover_stale_running_job:job_stale",
      priority: 2,
      reason: "Job has exceeded the stale running threshold.",
      riskLevel: "high",
      status: "ready",
      targetName: "scrape https://example.com",
      targetType: "automation_job"
    }
  ],
  safetyLanes: [
    {
      lane: "allowlist",
      riskLevel: "low",
      summary: "Read-only browser jobs are restricted to configured allowed domains."
    },
    {
      lane: "isolation",
      riskLevel: "low",
      summary: "Every browser job uses a fresh ephemeral browser context."
    }
  ],
  summary: "Browser queue has 3 active jobs, 2 recovery actions, and no external provider execution.",
  totals: {
    activeJobs: 3,
    failedJobs: 1,
    pendingJobs: 1,
    recoveryActions: 2,
    runningJobs: 1,
    scheduledJobs: 0,
    staleRunningJobs: 1,
    totalJobs: 4
  }
};

function recoveryResponse(plan: typeof browserPlan, dryRun: boolean) {
  return {
    applied: {
      dryRun,
      externalExecution: false,
      providerContacted: false,
      recoveryRunbooks: 2,
      requeuedJobIds: ["job_failed"],
      staleRecoveredJobIds: ["job_stale"]
    },
    plan
  };
}

describe("BrowserOperationsPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("loads browser operations and applies internal recovery with approval text", async () => {
    const onRecovered = vi.fn().mockResolvedValue(undefined);

    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan: browserPlan })
      .mockResolvedValueOnce(recoveryResponse(browserPlan, true))
      .mockResolvedValueOnce(recoveryResponse({
        ...browserPlan,
        totals: {
          ...browserPlan.totals,
          recoveryActions: 0
        }
      }, false));

    render(<BrowserOperationsPanel onRecovered={onRecovered} />);

    expect(apiFetch).toHaveBeenCalledWith("/automation/browser-operations");
    expect(await screen.findByText(/Internal Browser Operations Layer/)).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Browser stealth, anti-detection, CAPTCHA bypass, fingerprint spoofing, or platform evasion")).toBeInTheDocument();
    expect(screen.getAllByText("scrape https://example.com").length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("button", { name: /preview recovery/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/automation/browser-operations/recovery/apply", {
      json: {
        confirm: "APPLY INTERNAL BROWSER RECOVERY ACTIONS",
        dryRun: true
      },
      method: "POST"
    }));
    expect(await screen.findByText("Recovery preview ready: 2 internal actions identified.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /apply recovery/i }));

    await waitFor(() => expect(apiFetch).toHaveBeenLastCalledWith("/automation/browser-operations/recovery/apply", {
      json: {
        confirm: "APPLY INTERNAL BROWSER RECOVERY ACTIONS",
        dryRun: false
      },
      method: "POST"
    }));
    expect(await screen.findByText("Recovery applied: 1 job requeued and 1 stale job marked for review.")).toBeInTheDocument();
    expect(onRecovered).toHaveBeenCalledTimes(1);
  });
});
