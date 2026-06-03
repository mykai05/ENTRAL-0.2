import {
  buildProviderHandoffBundle,
  isProviderPayloadApprovalPacket,
  type ProviderHandoffBundle,
  type ProviderPayloadApprovalPacket,
  type ProviderPayloadPackage
} from "./merchProviderPayloads.js";
import type {
  RevenueLaunchReadinessApprovalSnapshot,
  RevenueLaunchReadinessItem,
  RevenueLaunchReadinessPlan
} from "./revenueLaunchReadiness.js";

export type RevenueLaunchHandoffOptions = {
  includeBlocked: boolean;
  maxBundles: number;
  minConnectorReadiness: number;
  minLaunchReadiness: number;
  minProviderReadiness: number;
};

export type RevenueLaunchHandoffAction =
  | "review_provider_handoff_bundle"
  | "request_provider_payload_approval"
  | "resolve_handoff_blockers";

export type RevenueLaunchHandoffRiskLevel = "low" | "medium" | "high";
export type RevenueLaunchHandoffRecordStatus = "blocked_review" | "queued_review" | "ready_for_manual_handoff";

export type RevenueLaunchHandoffBlocker = {
  code: string;
  severity: RevenueLaunchHandoffRiskLevel;
  title: string;
};

export type RevenueLaunchHandoffItem = {
  action: RevenueLaunchHandoffAction;
  approvedPacketId: string | null;
  artifactSlotCount: number;
  blockers: RevenueLaunchHandoffBlocker[];
  bundle: ProviderHandoffBundle | null;
  connectorReadiness: ProviderHandoffBundle["connectorReadiness"] | null;
  credentialScopes: string[];
  externalExecution: false;
  launchReadiness: {
    nextInternalAction: RevenueLaunchReadinessItem["nextInternalAction"];
    readinessScore: number;
    stage: RevenueLaunchReadinessItem["stage"];
  };
  manifestCount: number;
  priority: number;
  providerContacted: false;
  providerPayload: {
    adapterCoverage: string[];
    payloadCount: number;
    readinessScore: number;
    warnings: string[];
  };
  providers: string[];
  riskLevel: RevenueLaunchHandoffRiskLevel;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLaunchHandoffPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  items: RevenueLaunchHandoffItem[];
  mode: "Internal Launch Handoff Packet Builder";
  options: RevenueLaunchHandoffOptions;
  persistedPackets: RevenueLaunchHandoffPacketRecordSnapshot[];
  providerContacted: false;
  queue: Array<{
    action: RevenueLaunchHandoffAction;
    externalExecution: false;
    priority: number;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    artifactSlots: number;
    blockedBundles: number;
    bundlesPrepared: number;
    credentialScopes: number;
    manifestsPrepared: number;
    needsReview: number;
    openPacketRecords: number;
    readyForManualHandoff: number;
    storesEvaluated: number;
  };
};

export type RevenueLaunchHandoffPacketRecordSnapshot = {
  action: RevenueLaunchHandoffAction | string;
  approvedPacketId: string | null;
  artifactSlotCount: number;
  auditLogId: string | null;
  blockedActions: string[];
  blockers: RevenueLaunchHandoffBlocker[];
  bundle: ProviderHandoffBundle | null;
  connectorReadinessScore: number;
  connectorStatus: string | null;
  createdAt: string;
  credentialScopes: string[];
  dedupeKey: string;
  externalExecution: false;
  id: string;
  launchReadinessScore: number;
  manifestCount: number;
  providerContacted: false;
  providerReadinessScore: number;
  providers: string[];
  riskLevel: RevenueLaunchHandoffRiskLevel | string;
  status: RevenueLaunchHandoffRecordStatus | string;
  storeId: string;
  storeName: string;
  summary: string;
  updatedAt: string;
};

type ApprovedProviderApproval = RevenueLaunchReadinessApprovalSnapshot & {
  packet: ProviderPayloadApprovalPacket;
};

const defaultOptions: RevenueLaunchHandoffOptions = {
  includeBlocked: true,
  maxBundles: 10,
  minConnectorReadiness: 70,
  minLaunchReadiness: 70,
  minProviderReadiness: 70
};

const blockedExternalActions = [
  "Publishing listings, products, collections, or storefront changes",
  "Sending Printify, Printful, Etsy, Shopify, or other provider API requests",
  "Opening provider admin sessions or browser automation sessions",
  "Uploading artwork, mockups, image sets, files, or provider assets",
  "Moving money, creating payouts, starting ad spend, or posting social content",
  "Using stealth, anti-detection, proxy rotation, fingerprint spoofing, account warmup, or platform evasion automation"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function optionsWithDefaults(input: Partial<RevenueLaunchHandoffOptions> = {}): RevenueLaunchHandoffOptions {
  const provided = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<RevenueLaunchHandoffOptions>;

  return {
    includeBlocked: provided.includeBlocked ?? defaultOptions.includeBlocked,
    maxBundles: clamp(Math.round(provided.maxBundles ?? defaultOptions.maxBundles), 1, 50),
    minConnectorReadiness: clamp(Math.round(provided.minConnectorReadiness ?? defaultOptions.minConnectorReadiness), 1, 100),
    minLaunchReadiness: clamp(Math.round(provided.minLaunchReadiness ?? defaultOptions.minLaunchReadiness), 1, 100),
    minProviderReadiness: clamp(Math.round(provided.minProviderReadiness ?? defaultOptions.minProviderReadiness), 1, 100)
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sortTimestamp(approval: RevenueLaunchReadinessApprovalSnapshot) {
  return new Date(approval.reviewedAt ?? approval.createdAt).getTime();
}

function latestApprovedProviderApproval(storeId: string, approvals: RevenueLaunchReadinessApprovalSnapshot[]): ApprovedProviderApproval | null {
  return approvals
    .filter((approval): approval is ApprovedProviderApproval => {
      if (!approval.packet) return false;

      return approval.storeId === storeId
        && approval.status === "approved"
        && isProviderPayloadApprovalPacket(approval.packet);
    })
    .sort((a, b) => sortTimestamp(b) - sortTimestamp(a))[0] ?? null;
}

function providerPayloadForStore(storeId: string, providerPayloads: ProviderPayloadPackage[]) {
  return providerPayloads.find((providerPayload) => providerPayload.store.storeId === storeId) ?? null;
}

function blockerList(input: {
  approval: ApprovedProviderApproval | null;
  bundle: ProviderHandoffBundle | null;
  item: RevenueLaunchReadinessItem;
  options: RevenueLaunchHandoffOptions;
  providerPayload: ProviderPayloadPackage | null;
}) {
  const blockers: RevenueLaunchHandoffBlocker[] = input.item.blockers.map((blocker) => ({
    code: `readiness_${blocker.code}`,
    severity: blocker.severity,
    title: blocker.title
  }));

  if (input.item.nextInternalAction !== "generate_provider_handoff") {
    blockers.push({
      code: "not_handoff_action",
      severity: "medium",
      title: "Readiness board has not selected provider handoff generation for this store."
    });
  }

  if (input.item.readinessScore < input.options.minLaunchReadiness) {
    blockers.push({
      code: "launch_readiness_floor",
      severity: "medium",
      title: `Launch readiness is ${input.item.readinessScore}/100, below the ${input.options.minLaunchReadiness}/100 handoff floor.`
    });
  }

  if (!input.providerPayload || input.providerPayload.payloadCount === 0) {
    blockers.push({
      code: "missing_provider_payloads",
      severity: "high",
      title: "No locked provider payload package is available for handoff."
    });
  } else if (input.providerPayload.readinessScore < input.options.minProviderReadiness) {
    blockers.push({
      code: "provider_readiness_floor",
      severity: "medium",
      title: `Provider payload readiness is ${input.providerPayload.readinessScore}/100, below the ${input.options.minProviderReadiness}/100 floor.`
    });
  }

  if (!input.approval) {
    blockers.push({
      code: "approved_packet_missing",
      severity: "high",
      title: "No approved provider payload approval packet exists for this store."
    });
  }

  if (input.bundle?.connectorReadiness.score !== undefined && input.bundle.connectorReadiness.score < input.options.minConnectorReadiness) {
    blockers.push({
      code: "connector_readiness_floor",
      severity: "medium",
      title: `Connector readiness is ${input.bundle.connectorReadiness.score}/100, below the ${input.options.minConnectorReadiness}/100 handoff floor.`
    });
  }

  if (input.bundle?.connectorReadiness.status === "Needs review") {
    blockers.push({
      code: "bundle_drift_review",
      severity: "medium",
      title: "Current locked payloads drifted from the approved packet and need review."
    });
  }

  if (input.bundle?.connectorReadiness.status === "Blocked - no approved payloads") {
    blockers.push({
      code: "bundle_no_manifest",
      severity: "high",
      title: "No request manifests could be prepared from the approved packet."
    });
  }

  return blockers;
}

function riskLevel(blockers: RevenueLaunchHandoffBlocker[]): RevenueLaunchHandoffRiskLevel {
  if (blockers.some((blocker) => blocker.severity === "high")) return "high";
  if (blockers.some((blocker) => blocker.severity === "medium")) return "medium";
  return "low";
}

function actionFor(input: {
  approval: ApprovedProviderApproval | null;
  blockers: RevenueLaunchHandoffBlocker[];
  bundle: ProviderHandoffBundle | null;
  options: RevenueLaunchHandoffOptions;
}): RevenueLaunchHandoffAction {
  if (!input.approval) return "request_provider_payload_approval";

  if (
    input.bundle
      && input.bundle.connectorReadiness.status === "Ready for manual handoff"
      && input.bundle.connectorReadiness.score >= input.options.minConnectorReadiness
      && !input.blockers.some((blocker) => blocker.severity === "high")
  ) {
    return "review_provider_handoff_bundle";
  }

  return "resolve_handoff_blockers";
}

export function revenueLaunchHandoffDedupeKey(item: RevenueLaunchHandoffItem) {
  return [
    "launch_handoff",
    item.storeId,
    item.approvedPacketId ?? "no_approved_packet",
    item.providerPayload.payloadCount,
    item.manifestCount
  ].join(":");
}

export function revenueLaunchHandoffRecordStatus(item: RevenueLaunchHandoffItem): RevenueLaunchHandoffRecordStatus {
  if (item.action === "review_provider_handoff_bundle" && item.riskLevel !== "high") return "ready_for_manual_handoff";
  if (item.riskLevel === "high") return "blocked_review";
  return "queued_review";
}

function itemSummary(input: {
  action: RevenueLaunchHandoffAction;
  bundle: ProviderHandoffBundle | null;
  blockers: RevenueLaunchHandoffBlocker[];
  item: RevenueLaunchReadinessItem;
}) {
  if (input.bundle && input.action === "review_provider_handoff_bundle") {
    return `${input.item.store.businessName} has ${input.bundle.requestManifest.length} locked request manifest${input.bundle.requestManifest.length === 1 ? "" : "s"} ready for internal manual handoff review. No provider was contacted.`;
  }

  if (!input.bundle) {
    return `${input.item.store.businessName} cannot produce a handoff bundle yet: ${input.blockers.slice(0, 2).map((blocker) => blocker.title).join(" ")}`;
  }

  return `${input.item.store.businessName} has a handoff bundle, but ${input.blockers.length} blocker${input.blockers.length === 1 ? "" : "s"} require internal review before manual handoff.`;
}

function buildItem(input: {
  approvals: RevenueLaunchReadinessApprovalSnapshot[];
  generatedAt: string;
  item: RevenueLaunchReadinessItem;
  options: RevenueLaunchHandoffOptions;
  providerPayload: ProviderPayloadPackage | null;
}): RevenueLaunchHandoffItem {
  const approval = latestApprovedProviderApproval(input.item.store.id, input.approvals);
  const bundle = approval && input.providerPayload
    ? buildProviderHandoffBundle({
      approvalId: approval.id,
      generatedAt: input.generatedAt,
      package: input.providerPayload,
      packet: approval.packet,
      reviewedAt: approval.reviewedAt,
      reviewAuditLogId: approval.reviewAuditLogId
    })
    : null;
  const blockers = blockerList({
    approval,
    bundle,
    item: input.item,
    options: input.options,
    providerPayload: input.providerPayload
  });
  const action = actionFor({
    approval,
    blockers,
    bundle,
    options: input.options
  });
  const credentialScopes = bundle
    ? unique(bundle.requestManifest.flatMap((manifest) => manifest.credentialScope))
    : [];
  const providers = bundle
    ? unique(bundle.requestManifest.map((manifest) => manifest.provider))
    : input.providerPayload?.adapterCoverage ?? input.item.providerPayload.adapterCoverage;
  const artifactSlotCount = bundle
    ? bundle.requestManifest.reduce((sum, manifest) => sum + manifest.artifactSlots.length, 0)
    : 0;
  const risk = riskLevel(blockers);

  return {
    action,
    approvedPacketId: approval?.id ?? null,
    artifactSlotCount,
    blockers,
    bundle,
    connectorReadiness: bundle?.connectorReadiness ?? null,
    credentialScopes,
    externalExecution: false,
    launchReadiness: {
      nextInternalAction: input.item.nextInternalAction,
      readinessScore: input.item.readinessScore,
      stage: input.item.stage
    },
    manifestCount: bundle?.requestManifest.length ?? 0,
    priority: action === "review_provider_handoff_bundle" ? 1 : action === "resolve_handoff_blockers" ? 2 : 3,
    providerContacted: false,
    providerPayload: input.providerPayload ? {
      adapterCoverage: input.providerPayload.adapterCoverage,
      payloadCount: input.providerPayload.payloadCount,
      readinessScore: input.providerPayload.readinessScore,
      warnings: input.providerPayload.warnings
    } : input.item.providerPayload,
    providers,
    riskLevel: risk,
    storeId: input.item.store.id,
    storeName: input.item.store.businessName,
    summary: itemSummary({
      action,
      blockers,
      bundle,
      item: input.item
    })
  };
}

export function buildRevenueLaunchHandoffPlan(input: {
  approvals?: RevenueLaunchReadinessApprovalSnapshot[];
  generatedAt?: string;
  options?: Partial<RevenueLaunchHandoffOptions>;
  persistedPackets?: RevenueLaunchHandoffPacketRecordSnapshot[];
  providerPayloads: ProviderPayloadPackage[];
  readinessPlan: RevenueLaunchReadinessPlan;
}): RevenueLaunchHandoffPlan {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const options = optionsWithDefaults(input.options);
  const candidates = input.readinessPlan.stores
    .filter((item) => item.nextInternalAction === "generate_provider_handoff" || options.includeBlocked)
    .slice(0, options.maxBundles);
  const items = candidates
    .map((item) => buildItem({
      approvals: input.approvals ?? [],
      generatedAt,
      item,
      options,
      providerPayload: providerPayloadForStore(item.store.id, input.providerPayloads)
    }))
    .sort((a, b) => a.priority - b.priority || b.launchReadiness.readinessScore - a.launchReadiness.readinessScore);
  const queue = items.map((item) => ({
    action: item.action,
    externalExecution: false as const,
    priority: item.priority,
    storeId: item.storeId,
    storeName: item.storeName,
    summary: item.summary
  }));
  const readyForManualHandoff = items.filter((item) => item.action === "review_provider_handoff_bundle").length;
  const bundlesPrepared = items.filter((item) => item.bundle).length;
  const manifestsPrepared = items.reduce((sum, item) => sum + item.manifestCount, 0);
  const artifactSlots = items.reduce((sum, item) => sum + item.artifactSlotCount, 0);
  const credentialScopes = unique(items.flatMap((item) => item.credentialScopes)).length;
  const blockedBundles = items.filter((item) => item.riskLevel === "high").length;
  const needsReview = items.filter((item) => item.action === "resolve_handoff_blockers").length;
  const persistedPackets = input.persistedPackets ?? [];

  return {
    auditEvents: [
      "Launch handoff packets were generated from the Launch Readiness Board, locked provider payloads, and approved provider approval records.",
      "Every request manifest is locked for manual review only.",
      "No external provider, marketplace, browser, payment provider, social platform, or ad account was contacted."
    ],
    blockedExternalActions,
    externalExecution: false,
    generatedAt,
    items,
    mode: "Internal Launch Handoff Packet Builder",
    options,
    persistedPackets,
    providerContacted: false,
    queue,
    summary: `${items.length} stores evaluated for launch handoff: ${readyForManualHandoff} ready for manual handoff review, ${bundlesPrepared} bundles prepared, ${manifestsPrepared} locked request manifests, ${blockedBundles} blocked.`,
    totals: {
      artifactSlots,
      blockedBundles,
      bundlesPrepared,
      credentialScopes,
      manifestsPrepared,
      needsReview,
      openPacketRecords: persistedPackets.filter((packet) => packet.status !== "archived").length,
      readyForManualHandoff,
      storesEvaluated: items.length
    }
  };
}
