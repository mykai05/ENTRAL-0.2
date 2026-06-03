import {
  buildSignalIntakePlan,
  type SignalIntakeInput,
  type SignalIntakePlan
} from "./signalIntakeCenter.js";
import type {
  RevenueSignalImportJobSnapshot,
  RevenueSignalImportJobStatus
} from "./revenueSignalConnectorApprovals.js";

export const revenueSignalImportHandoffConfirmation = "INGEST QUEUED READONLY SIGNAL IMPORT JOBS";

export type RevenueSignalImportHandoffOptions = {
  includeArchived: boolean;
  maxJobs: number;
  maxSignals: number;
  windowDays: number;
};

export type RevenueSignalImportHandoffItem = {
  action: "ingest_queued_readonly_signals";
  approvalId: string;
  externalExecution: false;
  importJobId: string;
  lane: RevenueSignalImportJobSnapshot["lane"];
  manifestId: string;
  priority: number;
  provider: RevenueSignalImportJobSnapshot["provider"];
  providerContacted: false;
  sampleSignals: number;
  summary: string;
};

export type RevenueSignalImportHandoffBlockedItem = {
  approvalId: string;
  blocker: string;
  externalExecution: false;
  importJobId: string;
  providerContacted: false;
  sampleSignals: number;
  status: RevenueSignalImportJobStatus | string;
};

export type RevenueSignalImportHandoffPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  blockedHandoffs: RevenueSignalImportHandoffBlockedItem[];
  externalExecution: false;
  generatedAt: string;
  importJobs: RevenueSignalImportJobSnapshot[];
  mode: "Internal Read-Only Signal Import Handoff";
  options: RevenueSignalImportHandoffOptions;
  providerContacted: false;
  readyHandoffs: RevenueSignalImportHandoffItem[];
  signalIntakePreview: SignalIntakePlan;
  stagedPayload: SignalIntakeInput;
  summary: string;
  totals: {
    blockedJobs: number;
    completedJobs: number;
    contentSignals: number;
    handoffSignals: number;
    importJobs: number;
    paymentSignals: number;
    readyJobs: number;
    revenueSignals: number;
  };
};

export const revenueSignalImportHandoffBlockedExternalActions = [
  "Calling marketplace, POD, social, payment, analytics, bank, card, payout, upload, or ad APIs",
  "Opening provider dashboards, browser sessions, proxy pools, fingerprint profiles, or automation contexts",
  "Refreshing credentials, creating write scopes, changing account settings, moving money, publishing listings, or posting content",
  "Importing live provider data; only already-approved stored sample payloads can be transformed into internal records"
];

function sampleSignalCount(payload: SignalIntakeInput | null) {
  return (payload?.commerceSignals?.length ?? 0)
    + (payload?.contentSignals?.length ?? 0)
    + (payload?.paymentSignals?.length ?? 0);
}

function isReadyStatus(status: string) {
  return status === "queued_review" || status === "ready_for_signal_intake";
}

function blockerFor(job: RevenueSignalImportJobSnapshot) {
  if (job.status === "completed") return "Import job has already completed Signal Intake handoff.";
  if (job.status === "archived") return "Import job is archived.";
  if (job.status === "blocked_review") return "Import job is blocked for review.";
  if (!isReadyStatus(job.status)) return `Import job status ${job.status} is not ready for Signal Intake handoff.`;
  if (sampleSignalCount(job.samplePayload) === 0) return "Import job has no stored sample payload signals.";

  return null;
}

function priorityFor(job: RevenueSignalImportJobSnapshot) {
  if (job.provider === "stripe") return 10;
  if (job.lane === "commerce") return 20;
  if (job.lane === "content") return 30;
  return 40;
}

export function mergeRevenueSignalImportJobPayloads(
  jobs: RevenueSignalImportJobSnapshot[],
  maxSignals: number
): SignalIntakeInput {
  return {
    commerceSignals: jobs.flatMap((job) => job.samplePayload?.commerceSignals ?? []).slice(0, maxSignals),
    contentSignals: jobs.flatMap((job) => job.samplePayload?.contentSignals ?? []).slice(0, maxSignals),
    paymentSignals: jobs.flatMap((job) => job.samplePayload?.paymentSignals ?? []).slice(0, Math.min(maxSignals, 25))
  };
}

export function buildRevenueSignalImportHandoffPlan(input: {
  generatedAt?: string;
  importJobs?: RevenueSignalImportJobSnapshot[];
  options?: Partial<RevenueSignalImportHandoffOptions>;
}): RevenueSignalImportHandoffPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const options: RevenueSignalImportHandoffOptions = {
    includeArchived: input.options?.includeArchived ?? false,
    maxJobs: input.options?.maxJobs ?? 25,
    maxSignals: input.options?.maxSignals ?? 100,
    windowDays: input.options?.windowDays ?? 30
  };
  const importJobs = (input.importJobs ?? []).slice(0, options.maxJobs);
  const readyHandoffs = importJobs
    .filter((job) => !blockerFor(job))
    .map((job): RevenueSignalImportHandoffItem => ({
      action: "ingest_queued_readonly_signals",
      approvalId: job.approvalId,
      externalExecution: false,
      importJobId: job.id,
      lane: job.lane,
      manifestId: job.manifestId,
      priority: priorityFor(job),
      provider: job.provider,
      providerContacted: false,
      sampleSignals: sampleSignalCount(job.samplePayload),
      summary: `${job.provider} ${job.lane} import job ${job.id} can hand off ${sampleSignalCount(job.samplePayload)} stored signal${sampleSignalCount(job.samplePayload) === 1 ? "" : "s"} into Signal Intake.`
    }))
    .sort((a, b) => a.priority - b.priority || b.sampleSignals - a.sampleSignals);
  const readyJobIds = new Set(readyHandoffs.map((item) => item.importJobId));
  const blockedHandoffs = importJobs
    .filter((job) => !readyJobIds.has(job.id))
    .map((job): RevenueSignalImportHandoffBlockedItem => ({
      approvalId: job.approvalId,
      blocker: blockerFor(job) ?? "Import job is not selected for handoff.",
      externalExecution: false,
      importJobId: job.id,
      providerContacted: false,
      sampleSignals: sampleSignalCount(job.samplePayload),
      status: job.status
    }));
  const readyJobs = importJobs.filter((job) => readyJobIds.has(job.id));
  const stagedPayload = mergeRevenueSignalImportJobPayloads(readyJobs, options.maxSignals);
  const signalIntakePreview = buildSignalIntakePlan({
    generatedAt,
    incoming: stagedPayload,
    options: {
      includeSamplePayloads: false,
      maxSignals: options.maxSignals,
      windowDays: options.windowDays
    }
  });

  return {
    auditEvents: [
      "Queued read-only signal import jobs were evaluated for internal Signal Intake handoff.",
      "Only stored, already-approved sample payloads can be transformed; live provider imports remain locked.",
      "No provider, marketplace, social platform, payment processor, browser, proxy, upload target, bank, card, or payout system was contacted."
    ],
    blockedExternalActions: revenueSignalImportHandoffBlockedExternalActions,
    blockedHandoffs,
    externalExecution: false,
    generatedAt,
    importJobs,
    mode: "Internal Read-Only Signal Import Handoff",
    options,
    providerContacted: false,
    readyHandoffs,
    signalIntakePreview,
    stagedPayload,
    summary: `${readyHandoffs.length} import job${readyHandoffs.length === 1 ? "" : "s"} can hand off ${signalIntakePreview.totals.signals} stored signal${signalIntakePreview.totals.signals === 1 ? "" : "s"} into Signal Intake; ${blockedHandoffs.length} job${blockedHandoffs.length === 1 ? "" : "s"} remain blocked or completed.`,
    totals: {
      blockedJobs: blockedHandoffs.length,
      completedJobs: importJobs.filter((job) => job.status === "completed").length,
      contentSignals: signalIntakePreview.totals.contentSignals,
      handoffSignals: signalIntakePreview.totals.signals,
      importJobs: importJobs.length,
      paymentSignals: signalIntakePreview.totals.paymentSignals,
      readyJobs: readyHandoffs.length,
      revenueSignals: signalIntakePreview.totals.commerceSignals
    }
  };
}

export function selectRevenueSignalImportJobsForHandoff(plan: RevenueSignalImportHandoffPlan, importJobIds?: string[]) {
  const selectedIds = importJobIds && importJobIds.length > 0 ? new Set(importJobIds) : null;
  const readyIds = new Set(plan.readyHandoffs.map((item) => item.importJobId));

  return plan.importJobs.filter((job) => readyIds.has(job.id) && (!selectedIds || selectedIds.has(job.id)));
}
