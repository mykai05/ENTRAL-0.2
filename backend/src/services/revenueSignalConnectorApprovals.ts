import type {
  RevenueSignalConnectorManifest,
  RevenueSignalConnectorPlan,
  RevenueSignalConnectorProvider,
  RevenueSignalConnectorRiskLevel
} from "./revenueSignalConnectors.js";
import type { SignalIntakeInput, SignalIntakePlan } from "./signalIntakeCenter.js";

export const revenueSignalConnectorApprovalConfirmation = "QUEUE READONLY SIGNAL CONNECTOR APPROVALS";
export const revenueSignalConnectorApproveConfirmation = "APPROVE READONLY SIGNAL CONNECTOR";
export const revenueSignalConnectorRejectConfirmation = "REJECT READONLY SIGNAL CONNECTOR";
export const revenueSignalImportJobConfirmation = "QUEUE READONLY SIGNAL IMPORT JOBS";

export const revenueSignalConnectorApprovalStatuses = [
  "pending_review",
  "approved",
  "rejected",
  "import_queued",
  "archived"
] as const;

export const revenueSignalImportJobStatuses = [
  "queued_review",
  "ready_for_signal_intake",
  "blocked_review",
  "completed",
  "archived"
] as const;

export type RevenueSignalConnectorApprovalStatus = (typeof revenueSignalConnectorApprovalStatuses)[number];
export type RevenueSignalImportJobStatus = (typeof revenueSignalImportJobStatuses)[number];

export type RevenueSignalConnectorApprovalRecordSnapshot = {
  blockedActions: string[];
  contentBriefId: string | null;
  createdAt: string;
  credentialEnvVars: string[];
  dedupeKey: string;
  endpointTemplates: string[];
  externalExecution: false;
  id: string;
  lane: RevenueSignalConnectorManifest["lane"];
  manifest: RevenueSignalConnectorManifest;
  manifestId: string;
  productId: string | null;
  provider: RevenueSignalConnectorProvider;
  providerContacted: false;
  providerName: string;
  readOnlyScopes: RevenueSignalConnectorManifest["readOnlyScopes"];
  readinessScore: number;
  requestAuditLogId: string | null;
  reviewAuditLogId: string | null;
  reviewedAt: string | null;
  reviewedById: string | null;
  reviewNote: string | null;
  riskLevel: RevenueSignalConnectorRiskLevel;
  samplePayload: SignalIntakeInput | null;
  signalPreview: SignalIntakePlan;
  status: RevenueSignalConnectorApprovalStatus | string;
  storeId: string | null;
  storeName: string | null;
  transformTarget: RevenueSignalConnectorManifest["transformTarget"];
  updatedAt: string;
};

export type RevenueSignalImportJobSnapshot = {
  approvalId: string;
  auditLogId: string | null;
  completedAt: string | null;
  createdAt: string;
  externalExecution: false;
  handoffAuditLogId: string | null;
  id: string;
  intakeResult: Record<string, unknown> | null;
  lane: RevenueSignalConnectorManifest["lane"];
  manifestId: string;
  provider: RevenueSignalConnectorProvider;
  providerContacted: false;
  samplePayload: SignalIntakeInput | null;
  signalPreview: SignalIntakePlan;
  status: RevenueSignalImportJobStatus | string;
  transformTarget: RevenueSignalConnectorManifest["transformTarget"];
  updatedAt: string;
};

export type RevenueSignalConnectorApprovalQueueItem = {
  action: "queue_approval";
  externalExecution: false;
  manifestId: string;
  priority: number;
  provider: RevenueSignalConnectorProvider;
  providerContacted: false;
  riskLevel: RevenueSignalConnectorRiskLevel;
  sampleSignals: number;
  summary: string;
  targetName: string;
};

export type RevenueSignalImportQueueItem = {
  action: "queue_readonly_import_job";
  approvalId: string;
  externalExecution: false;
  manifestId: string;
  priority: number;
  provider: RevenueSignalConnectorProvider;
  providerContacted: false;
  sampleSignals: number;
  summary: string;
};

export type RevenueSignalConnectorApprovalPlan = {
  approvalQueue: RevenueSignalConnectorApprovalQueueItem[];
  approvals: RevenueSignalConnectorApprovalRecordSnapshot[];
  auditEvents: string[];
  blockedExternalActions: string[];
  connectorPlan: RevenueSignalConnectorPlan;
  externalExecution: false;
  generatedAt: string;
  importJobs: RevenueSignalImportJobSnapshot[];
  importQueue: RevenueSignalImportQueueItem[];
  mode: "Internal Read-Only Signal Connector Approval Center";
  providerContacted: false;
  statusCounts: {
    approvals: Record<RevenueSignalConnectorApprovalStatus, number>;
    importJobs: Record<RevenueSignalImportJobStatus, number>;
  };
  summary: string;
  totals: {
    approvedApprovals: number;
    approvalQueue: number;
    importJobs: number;
    importQueue: number;
    manifests: number;
    pendingApprovals: number;
    readyManifests: number;
    rejectedApprovals: number;
    sampleSignalsQueued: number;
  };
};

function sampleSignalCount(payload: SignalIntakeInput | null) {
  return (payload?.commerceSignals?.length ?? 0)
    + (payload?.contentSignals?.length ?? 0)
    + (payload?.paymentSignals?.length ?? 0);
}

function approvalCounts() {
  return Object.fromEntries(revenueSignalConnectorApprovalStatuses.map((status) => [status, 0])) as Record<RevenueSignalConnectorApprovalStatus, number>;
}

function importJobCounts() {
  return Object.fromEntries(revenueSignalImportJobStatuses.map((status) => [status, 0])) as Record<RevenueSignalImportJobStatus, number>;
}

function normalizedApprovalStatus(status: string): RevenueSignalConnectorApprovalStatus {
  return revenueSignalConnectorApprovalStatuses.includes(status as RevenueSignalConnectorApprovalStatus)
    ? status as RevenueSignalConnectorApprovalStatus
    : "pending_review";
}

function normalizedImportJobStatus(status: string): RevenueSignalImportJobStatus {
  return revenueSignalImportJobStatuses.includes(status as RevenueSignalImportJobStatus)
    ? status as RevenueSignalImportJobStatus
    : "queued_review";
}

function priorityForManifest(manifest: RevenueSignalConnectorManifest) {
  if (manifest.provider === "stripe") return 15;
  if (manifest.lane === "commerce") return 20;
  if (manifest.lane === "content") return 30;
  return 40;
}

function targetName(manifest: RevenueSignalConnectorManifest) {
  return manifest.target.storeName ?? manifest.title;
}

export function revenueSignalConnectorApprovalDedupeKey(manifest: RevenueSignalConnectorManifest) {
  return manifest.id;
}

export function buildRevenueSignalConnectorApprovalPlan(input: {
  approvals?: RevenueSignalConnectorApprovalRecordSnapshot[];
  connectorPlan: RevenueSignalConnectorPlan;
  generatedAt?: string;
  importJobs?: RevenueSignalImportJobSnapshot[];
}): RevenueSignalConnectorApprovalPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const approvals = input.approvals ?? [];
  const importJobs = input.importJobs ?? [];
  const approvalIdsWithJobs = new Set(importJobs.map((job) => job.approvalId));
  const approvalsByDedupe = new Map(approvals.map((approval) => [approval.dedupeKey, approval]));
  const approvalQueue = input.connectorPlan.manifests
    .filter((manifest) => manifest.status === "ready_for_approval")
    .filter((manifest) => !approvalsByDedupe.has(revenueSignalConnectorApprovalDedupeKey(manifest)))
    .map((manifest): RevenueSignalConnectorApprovalQueueItem => ({
      action: "queue_approval",
      externalExecution: false,
      manifestId: manifest.id,
      priority: priorityForManifest(manifest),
      provider: manifest.provider,
      providerContacted: false,
      riskLevel: manifest.riskLevel,
      sampleSignals: sampleSignalCount(manifest.samplePayload),
      summary: `${manifest.title} is ready for internal read-only connector approval. ${sampleSignalCount(manifest.samplePayload)} sample signal${sampleSignalCount(manifest.samplePayload) === 1 ? "" : "s"} will preview through Signal Intake.`,
      targetName: targetName(manifest)
    }))
    .sort((a, b) => a.priority - b.priority || b.sampleSignals - a.sampleSignals);
  const importQueue = approvals
    .filter((approval) => normalizedApprovalStatus(approval.status) === "approved")
    .filter((approval) => !approvalIdsWithJobs.has(approval.id))
    .filter((approval) => sampleSignalCount(approval.samplePayload) > 0)
    .map((approval): RevenueSignalImportQueueItem => ({
      action: "queue_readonly_import_job",
      approvalId: approval.id,
      externalExecution: false,
      manifestId: approval.manifestId,
      priority: approval.provider === "stripe" ? 10 : approval.lane === "commerce" ? 20 : 30,
      provider: approval.provider,
      providerContacted: false,
      sampleSignals: sampleSignalCount(approval.samplePayload),
      summary: `${approval.providerName} manifest ${approval.manifestId} can create a queued read-only import job with ${sampleSignalCount(approval.samplePayload)} staged signal${sampleSignalCount(approval.samplePayload) === 1 ? "" : "s"}.`,
    }))
    .sort((a, b) => a.priority - b.priority || b.sampleSignals - a.sampleSignals);
  const approvalStatusCounts = approvalCounts();
  const importStatusCounts = importJobCounts();

  for (const approval of approvals) {
    approvalStatusCounts[normalizedApprovalStatus(approval.status)] += 1;
  }

  for (const job of importJobs) {
    importStatusCounts[normalizedImportJobStatus(job.status)] += 1;
  }

  const sampleSignalsQueued = importQueue.reduce((sum, item) => sum + item.sampleSignals, 0);

  return {
    approvalQueue,
    approvals,
    auditEvents: [
      "Read-only connector manifests were compared against durable approval records.",
      "Approved connector records can queue internal import jobs that stage already-reviewed sample payloads for Signal Intake.",
      "No provider, marketplace, social platform, payment processor, browser, proxy, upload target, bank, card, or payout system was contacted."
    ],
    blockedExternalActions: input.connectorPlan.blockedExternalActions,
    connectorPlan: input.connectorPlan,
    externalExecution: false,
    generatedAt,
    importJobs,
    importQueue,
    mode: "Internal Read-Only Signal Connector Approval Center",
    providerContacted: false,
    statusCounts: {
      approvals: approvalStatusCounts,
      importJobs: importStatusCounts
    },
    summary: `${approvalQueue.length} connector manifest${approvalQueue.length === 1 ? "" : "s"} need approval records, ${approvalStatusCounts.pending_review} approvals are pending, ${approvalStatusCounts.approved} are approved, and ${importQueue.length} approved connector${importQueue.length === 1 ? "" : "s"} can queue read-only import jobs.`,
    totals: {
      approvedApprovals: approvalStatusCounts.approved,
      approvalQueue: approvalQueue.length,
      importJobs: importJobs.length,
      importQueue: importQueue.length,
      manifests: input.connectorPlan.manifests.length,
      pendingApprovals: approvalStatusCounts.pending_review,
      readyManifests: input.connectorPlan.totals.readyConnectors,
      rejectedApprovals: approvalStatusCounts.rejected,
      sampleSignalsQueued
    }
  };
}

export function selectRevenueSignalApprovalsForImport(plan: RevenueSignalConnectorApprovalPlan, approvalIds?: string[]) {
  const selectedIds = approvalIds && approvalIds.length > 0 ? new Set(approvalIds) : null;
  const importableIds = new Set(plan.importQueue.map((item) => item.approvalId));

  return plan.approvals.filter((approval) => (
    normalizedApprovalStatus(approval.status) === "approved"
      && importableIds.has(approval.id)
      && (!selectedIds || selectedIds.has(approval.id))
  ));
}
