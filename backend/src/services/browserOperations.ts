export type BrowserOperationJobStatus = "pending" | "scheduled" | "running" | "completed" | "failed" | "canceled" | string;

export type BrowserOperationOptions = {
  includeCompleted: boolean;
  maxRecoveryJobs: number;
  staleRunningMinutes: number;
  windowHours: number;
};

export type BrowserOperationConfig = {
  allowedDomains: string[];
  featureEnabled: boolean;
  localFallbackEnabled: boolean;
  maxConcurrency: number;
  playwrightConfigured: boolean;
  workerEnabled: boolean;
};

export type BrowserOperationJobSnapshot = {
  completedAt: string | null;
  createdAt: string;
  error: string | null;
  id: string;
  logCount: number;
  payload: Record<string, unknown> & {
    selector?: string;
    url?: string;
  };
  result: Record<string, unknown> | null;
  resultEngine: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  status: BrowserOperationJobStatus;
  type: string;
  updatedAt: string;
};

export type BrowserOperationRunbookAction =
  | "retry_failed_job"
  | "recover_stale_running_job"
  | "inspect_backlog"
  | "review_capacity"
  | "enable_worker"
  | "review_allowlist"
  | "watch";

export type BrowserOperationRunbook = {
  action: BrowserOperationRunbookAction;
  approvalGate: {
    externalExecutionLocked: true;
    humanApprovalRequired: true;
    status: "Required";
  };
  blockedExternalActions: string[];
  expectedInternalEffect: string;
  externalExecution: false;
  id: string;
  priority: number;
  providerContacted: false;
  reason: string;
  riskLevel: "low" | "medium" | "high";
  status: "ready" | "blocked" | "watch";
  targetId: string | null;
  targetName: string;
  targetType: "job" | "queue" | "policy" | "runtime";
};

export type BrowserOperationSafetyLane = {
  checks: Array<{
    evidence: string;
    status: "pass" | "warn" | "block";
    title: string;
  }>;
  lane: "allowlist" | "isolation" | "execution" | "recovery";
  riskLevel: "low" | "medium" | "high";
  summary: string;
};

export type BrowserOperationsPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Browser Operations Layer";
  operationalState: {
    allowedDomains: string[];
    capacitySlots: number;
    featureEnabled: boolean;
    isolationModel: "Ephemeral browser context per job";
    localFallbackEnabled: boolean;
    maxConcurrency: number;
    playwrightConfigured: boolean;
    queuePressure: "clear" | "elevated" | "saturated";
    workerEnabled: boolean;
  };
  options: BrowserOperationOptions;
  providerContacted: false;
  recentJobs: BrowserOperationJobSnapshot[];
  runbooks: BrowserOperationRunbook[];
  safetyLanes: BrowserOperationSafetyLane[];
  summary: string;
  totals: {
    activeJobs: number;
    canceledJobs: number;
    completedJobs: number;
    failedJobs: number;
    pendingJobs: number;
    recoveryActions: number;
    runningJobs: number;
    scheduledJobs: number;
    staleRunningJobs: number;
    totalJobs: number;
  };
};

export const browserOperationsRecoveryConfirmation = "APPLY INTERNAL BROWSER RECOVERY ACTIONS";

export const defaultBrowserOperationOptions: BrowserOperationOptions = {
  includeCompleted: false,
  maxRecoveryJobs: 10,
  staleRunningMinutes: 30,
  windowHours: 24
};

export const browserOperationsBlockedActions = [
  "Browser stealth, anti-detection, CAPTCHA bypass, fingerprint spoofing, or platform evasion",
  "Proxy rotation, residential proxy use, account warmup, or traffic disguise",
  "Logging into third-party accounts, changing storefronts, posting content, uploading files, or clicking purchase/payment flows",
  "Ignoring robots, terms, consent, rate limits, domain allow-lists, or manual approval gates",
  "Running unbounded parallel sessions or increasing concurrency without explicit internal capacity review"
];

function normalizeOptions(options: Partial<BrowserOperationOptions> = {}): BrowserOperationOptions {
  return {
    includeCompleted: options.includeCompleted ?? defaultBrowserOperationOptions.includeCompleted,
    maxRecoveryJobs: options.maxRecoveryJobs ?? defaultBrowserOperationOptions.maxRecoveryJobs,
    staleRunningMinutes: options.staleRunningMinutes ?? defaultBrowserOperationOptions.staleRunningMinutes,
    windowHours: options.windowHours ?? defaultBrowserOperationOptions.windowHours
  };
}

function dateMs(value: string | null) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function active(status: string) {
  return status === "pending" || status === "scheduled" || status === "running";
}

function shopifyBrowserReceiptStatus(job: BrowserOperationJobSnapshot) {
  if (job.type !== "shopify_store_creation_browser_task") return null;

  const receipt = job.result?.receipt;

  if (!receipt || typeof receipt !== "object") return null;

  const status = (receipt as { status?: unknown }).status;

  return typeof status === "string" ? status : null;
}

function recoverableCompletedJob(job: BrowserOperationJobSnapshot) {
  if (job.status !== "completed") return false;

  const status = shopifyBrowserReceiptStatus(job);

  return status === "browser_unavailable" || status === "blocked_operator_gate" || status === "no_domain_detected";
}

function recoveryReason(job: BrowserOperationJobSnapshot) {
  const shopifyReceiptStatus = shopifyBrowserReceiptStatus(job);

  if (shopifyReceiptStatus) {
    return `Shopify store-creation browser task completed with recoverable receipt status ${shopifyReceiptStatus}.`;
  }

  return job.error ? `Job finished as ${job.status}: ${job.error}` : `Job finished as ${job.status} and is eligible for a controlled retry.`;
}

function staleRunning(job: BrowserOperationJobSnapshot, staleRunningMinutes: number, nowMs: number) {
  return job.status === "running" && dateMs(job.startedAt) > 0 && nowMs - dateMs(job.startedAt) >= staleRunningMinutes * 60_000;
}

function runbook(input: Omit<BrowserOperationRunbook, "approvalGate" | "blockedExternalActions" | "externalExecution" | "providerContacted">): BrowserOperationRunbook {
  return {
    ...input,
    approvalGate: {
      externalExecutionLocked: true,
      humanApprovalRequired: true,
      status: "Required"
    },
    blockedExternalActions: browserOperationsBlockedActions,
    externalExecution: false,
    providerContacted: false
  };
}

function queuePressure(activeJobs: number, maxConcurrency: number): BrowserOperationsPlan["operationalState"]["queuePressure"] {
  if (activeJobs >= maxConcurrency * 5) return "saturated";
  if (activeJobs > maxConcurrency) return "elevated";
  return "clear";
}

function safetyLanes(input: {
  config: BrowserOperationConfig;
  recoveryActions: number;
  staleRunningJobs: number;
}): BrowserOperationSafetyLane[] {
  return [
    {
      checks: [
        {
          evidence: input.config.allowedDomains.length > 0
            ? `${input.config.allowedDomains.length} allowed domain rule${input.config.allowedDomains.length === 1 ? "" : "s"} configured.`
            : "No allowed domain rules are configured.",
          status: input.config.allowedDomains.length > 0 ? "pass" : "block",
          title: "Domain allow-list"
        },
        {
          evidence: "Automation URLs must pass public HTTP safety validation before a job can be queued.",
          status: "pass",
          title: "Public target validation"
        }
      ],
      lane: "allowlist",
      riskLevel: input.config.allowedDomains.length > 0 ? "low" : "high",
      summary: "Only configured public domains can enter the browser queue."
    },
    {
      checks: [
        {
          evidence: "The executor opens a fresh browser context per job and closes it after extraction.",
          status: "pass",
          title: "Session isolation"
        },
        {
          evidence: "No proxy, stealth, fingerprint, account warmup, or evasion mode is exposed.",
          status: "pass",
          title: "Evasion controls"
        }
      ],
      lane: "isolation",
      riskLevel: "low",
      summary: "Browser runs are isolated by default and do not mutate external accounts."
    },
    {
      checks: [
        {
          evidence: input.config.featureEnabled ? "Automation feature flag is enabled." : "Automation feature flag is disabled.",
          status: input.config.featureEnabled ? "pass" : "warn",
          title: "Feature flag"
        },
        {
          evidence: input.config.workerEnabled ? "Worker polling is enabled." : "Worker polling is disabled.",
          status: input.config.workerEnabled ? "pass" : "warn",
          title: "Worker state"
        },
        {
          evidence: `Maximum concurrency is ${input.config.maxConcurrency}.`,
          status: input.config.maxConcurrency > 0 ? "pass" : "block",
          title: "Concurrency cap"
        }
      ],
      lane: "execution",
      riskLevel: input.config.featureEnabled && input.config.workerEnabled ? "low" : "medium",
      summary: "Execution is capped, feature-gated, and queue-driven."
    },
    {
      checks: [
        {
          evidence: `${input.recoveryActions} recovery action${input.recoveryActions === 1 ? "" : "s"} available.`,
          status: input.recoveryActions > 0 ? "warn" : "pass",
          title: "Recovery backlog"
        },
        {
          evidence: `${input.staleRunningJobs} stale running job${input.staleRunningJobs === 1 ? "" : "s"} detected.`,
          status: input.staleRunningJobs > 0 ? "warn" : "pass",
          title: "Stale running jobs"
        }
      ],
      lane: "recovery",
      riskLevel: input.staleRunningJobs > 0 ? "medium" : input.recoveryActions > 0 ? "low" : "low",
      summary: "Failed, canceled, and stale jobs can be recovered as internal queue actions."
    }
  ];
}

export function buildBrowserOperationsPlan(input: {
  config: BrowserOperationConfig;
  generatedAt?: string;
  jobs: BrowserOperationJobSnapshot[];
  now?: Date;
  options?: Partial<BrowserOperationOptions>;
}): BrowserOperationsPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const now = input.now ?? new Date();
  const options = normalizeOptions(input.options);
  const nowMs = now.getTime();
  const windowStartMs = nowMs - options.windowHours * 60 * 60_000;
  const recentJobs = input.jobs
    .filter((job) => dateMs(job.createdAt) >= windowStartMs || active(job.status))
    .filter((job) => options.includeCompleted || job.status !== "completed" || recoverableCompletedJob(job))
    .sort((left, right) => dateMs(right.createdAt) - dateMs(left.createdAt));
  const pendingJobs = recentJobs.filter((job) => job.status === "pending").length;
  const scheduledJobs = recentJobs.filter((job) => job.status === "scheduled").length;
  const runningJobs = recentJobs.filter((job) => job.status === "running").length;
  const failedJobs = recentJobs.filter((job) => job.status === "failed").length;
  const canceledJobs = recentJobs.filter((job) => job.status === "canceled").length;
  const completedJobs = recentJobs.filter((job) => job.status === "completed").length;
  const activeJobs = pendingJobs + scheduledJobs + runningJobs;
  const staleJobs = recentJobs.filter((job) => staleRunning(job, options.staleRunningMinutes, nowMs));
  const recoveryJobCandidates = recentJobs
    .filter((job) => job.status === "failed" || job.status === "canceled" || recoverableCompletedJob(job))
    .slice(0, options.maxRecoveryJobs);
  const runbooks: BrowserOperationRunbook[] = [];

  for (const job of staleJobs.slice(0, options.maxRecoveryJobs)) {
    runbooks.push(runbook({
      action: "recover_stale_running_job",
      expectedInternalEffect: "Mark the stale running job as failed with a recovery note so it can be retried deliberately.",
      id: `browser_recover_stale_${job.id}`,
      priority: 10,
      reason: `${job.type} job has been running longer than ${options.staleRunningMinutes} minutes.`,
      riskLevel: "medium",
      status: "ready",
      targetId: job.id,
      targetName: job.payload.url ?? job.id,
      targetType: "job"
    }));
  }

  for (const job of recoveryJobCandidates) {
    runbooks.push(runbook({
      action: "retry_failed_job",
      expectedInternalEffect: "Reset the finished job to pending, clear stale result/error fields, and add a recovery log entry.",
      id: `browser_retry_${job.id}`,
      priority: 20,
      reason: recoveryReason(job),
      riskLevel: "low",
      status: "ready",
      targetId: job.id,
      targetName: job.payload.url ?? job.id,
      targetType: "job"
    }));
  }

  if (!input.config.workerEnabled && input.config.featureEnabled) {
    runbooks.push(runbook({
      action: "enable_worker",
      expectedInternalEffect: "Review runtime configuration before enabling the worker outside this request.",
      id: "browser_enable_worker_review",
      priority: 30,
      reason: "Automation feature flag is enabled, but the worker is not polling queued jobs.",
      riskLevel: "medium",
      status: "blocked",
      targetId: null,
      targetName: "Automation worker",
      targetType: "runtime"
    }));
  }

  if (activeJobs > input.config.maxConcurrency) {
    runbooks.push(runbook({
      action: "inspect_backlog",
      expectedInternalEffect: "Inspect active jobs and schedule pressure before queueing additional work.",
      id: "browser_inspect_backlog",
      priority: 35,
      reason: `${activeJobs} active jobs exceed the configured concurrency cap of ${input.config.maxConcurrency}.`,
      riskLevel: activeJobs >= input.config.maxConcurrency * 5 ? "high" : "medium",
      status: "ready",
      targetId: null,
      targetName: "Browser queue",
      targetType: "queue"
    }));
  }

  if (input.config.allowedDomains.length === 0) {
    runbooks.push(runbook({
      action: "review_allowlist",
      expectedInternalEffect: "Keep browser operations blocked until at least one approved public domain is configured.",
      id: "browser_review_allowlist",
      priority: 5,
      reason: "No approved automation domains are configured.",
      riskLevel: "high",
      status: "blocked",
      targetId: null,
      targetName: "Automation allow-list",
      targetType: "policy"
    }));
  }

  if (runbooks.length === 0) {
    runbooks.push(runbook({
      action: "watch",
      expectedInternalEffect: "Keep monitoring queue pressure, failures, and stale jobs.",
      id: "browser_watch_queue",
      priority: 90,
      reason: "No recovery or policy intervention is currently needed.",
      riskLevel: "low",
      status: "watch",
      targetId: null,
      targetName: "Browser queue",
      targetType: "queue"
    }));
  }

  const recoveryActions = runbooks.filter((item) => item.action === "retry_failed_job" || item.action === "recover_stale_running_job").length;

  return {
    auditEvents: [
      "Browser Operations Layer evaluated queue capacity, recovery posture, isolation controls, and allow-list state.",
      "Browser runs use bounded queue execution and ephemeral contexts for read-only inspection jobs.",
      "No stealth, anti-detection, proxy rotation, fingerprint spoofing, account login, posting, payout, or storefront write path is authorized."
    ],
    blockedExternalActions: browserOperationsBlockedActions,
    externalExecution: false,
    generatedAt,
    mode: "Internal Browser Operations Layer",
    operationalState: {
      allowedDomains: input.config.allowedDomains,
      capacitySlots: Math.max(input.config.maxConcurrency - runningJobs, 0),
      featureEnabled: input.config.featureEnabled,
      isolationModel: "Ephemeral browser context per job",
      localFallbackEnabled: input.config.localFallbackEnabled,
      maxConcurrency: input.config.maxConcurrency,
      playwrightConfigured: input.config.playwrightConfigured,
      queuePressure: queuePressure(activeJobs, input.config.maxConcurrency),
      workerEnabled: input.config.workerEnabled
    },
    options,
    providerContacted: false,
    recentJobs,
    runbooks: runbooks.sort((left, right) => left.priority - right.priority),
    safetyLanes: safetyLanes({
      config: input.config,
      recoveryActions,
      staleRunningJobs: staleJobs.length
    }),
    summary: `${recentJobs.length} browser job${recentJobs.length === 1 ? "" : "s"} evaluated with ${runningJobs} running, ${pendingJobs + scheduledJobs} queued, ${failedJobs} failed, ${staleJobs.length} stale, and ${Math.max(input.config.maxConcurrency - runningJobs, 0)} open capacity slot${Math.max(input.config.maxConcurrency - runningJobs, 0) === 1 ? "" : "s"}. Recovery actions: ${recoveryActions}. External execution remains read-only and allow-listed.`,
    totals: {
      activeJobs,
      canceledJobs,
      completedJobs,
      failedJobs,
      pendingJobs,
      recoveryActions,
      runningJobs,
      scheduledJobs,
      staleRunningJobs: staleJobs.length,
      totalJobs: recentJobs.length
    }
  };
}
