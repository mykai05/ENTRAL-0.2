import type { ProviderHandoffArtifactSlot } from "./merchProviderPayloads.js";
import type { RevenueLaunchChecklistItem, RevenueLaunchChecklistPlan } from "./revenueLaunchChecklist.js";
import type { RevenueLaunchHandoffItem, RevenueLaunchHandoffPlan } from "./revenueLaunchHandoff.js";

export const revenueLaunchOperationsPackConfirmation = "RECORD INTERNAL LAUNCH OPERATIONS PACKS";

export type RevenueLaunchOperationsPackStatus = "ready_for_manual_launch" | "needs_review" | "blocked";
export type RevenueLaunchOperationsPackQueueAction = "record_launch_pack" | "review_launch_pack" | "resolve_launch_blockers";

export type RevenueLaunchOperationsPackOptions = {
  includeBlocked: boolean;
  maxPacks: number;
  minConnectorReadiness: number;
  minLaunchReadiness: number;
  minProviderReadiness: number;
};

export type RevenueLaunchOperationsRequestManifest = {
  action: string;
  artifactSlots: number;
  credentialScope: string[];
  executionState: "Locked - manual handoff only";
  id: string;
  pathTemplate: string;
  productName: string;
  provider: string;
};

export type RevenueLaunchOperationsPack = {
  artifactSlots: Array<ProviderHandoffArtifactSlot & {
    manifestId: string;
    provider: string;
  }>;
  auditTrail: {
    approvedPacketId: string | null;
    handoffPacketAuditLogId: string | null;
    handoffPacketId: string | null;
    reviewAuditLogId: string | null;
  };
  blockers: Array<{
    code: string;
    severity: "low" | "medium" | "high";
    title: string;
  }>;
  checklist: {
    blockers: string[];
    nextAction: RevenueLaunchChecklistItem["nextAction"] | null;
    priorityScore: number;
    readyStages: number;
    signalEvidence: number;
    summary: string | null;
  };
  credentialScopes: string[];
  externalExecution: false;
  manualOnly: true;
  manualSteps: string[];
  operatorBrief: {
    businessName: string;
    nextReviewGate: string;
    productNames: string[];
    providers: string[];
    readinessLine: string;
    storeName: string;
  };
  priority: number;
  providerContacted: false;
  qaChecklist: string[];
  readiness: {
    connectorReadinessScore: number;
    launchReadinessScore: number;
    overallScore: number;
    providerReadinessScore: number;
  };
  requestManifests: RevenueLaunchOperationsRequestManifest[];
  riskLevel: "low" | "medium" | "high";
  status: RevenueLaunchOperationsPackStatus;
  storeId: string;
  storeName: string;
  summary: string;
};

export type RevenueLaunchOperationsPackPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Revenue Launch Operations Pack";
  options: RevenueLaunchOperationsPackOptions;
  packs: RevenueLaunchOperationsPack[];
  providerContacted: false;
  queue: Array<{
    action: RevenueLaunchOperationsPackQueueAction;
    externalExecution: false;
    priority: number;
    providerContacted: false;
    status: RevenueLaunchOperationsPackStatus;
    storeId: string;
    storeName: string;
    summary: string;
  }>;
  summary: string;
  totals: {
    artifactSlots: number;
    blockedPacks: number;
    credentialScopes: number;
    manualSteps: number;
    packs: number;
    readyPacks: number;
    requestManifests: number;
    reviewPacks: number;
  };
};

type PlanInput = {
  checklistPlan: RevenueLaunchChecklistPlan;
  generatedAt?: string;
  handoffPlan: RevenueLaunchHandoffPlan;
  options?: Partial<RevenueLaunchOperationsPackOptions>;
};

const defaultOptions: RevenueLaunchOperationsPackOptions = {
  includeBlocked: true,
  maxPacks: 10,
  minConnectorReadiness: 70,
  minLaunchReadiness: 70,
  minProviderReadiness: 70
};

const blockedExternalActions = [
  "Publishing listings, creating provider products, changing storefronts, uploading files, or posting social content",
  "Sending Printify, Printful, Etsy, Shopify, AI video, voiceover, ad, payout, or payment API requests",
  "Opening provider admin sessions, creating write scopes, running stealth browsers, rotating proxies, spoofing fingerprints, or evading platform controls",
  "Moving money, approving payouts, changing bank/card/payment settings, or executing Stripe Treasury or Connect transfers"
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function optionsWithDefaults(input: Partial<RevenueLaunchOperationsPackOptions> = {}): RevenueLaunchOperationsPackOptions {
  const provided = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<RevenueLaunchOperationsPackOptions>;

  return {
    includeBlocked: provided.includeBlocked ?? defaultOptions.includeBlocked,
    maxPacks: clamp(Math.round(provided.maxPacks ?? defaultOptions.maxPacks), 1, 50),
    minConnectorReadiness: clamp(Math.round(provided.minConnectorReadiness ?? defaultOptions.minConnectorReadiness), 1, 100),
    minLaunchReadiness: clamp(Math.round(provided.minLaunchReadiness ?? defaultOptions.minLaunchReadiness), 1, 100),
    minProviderReadiness: clamp(Math.round(provided.minProviderReadiness ?? defaultOptions.minProviderReadiness), 1, 100)
  };
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function checklistForStore(plan: RevenueLaunchChecklistPlan, storeId: string) {
  return plan.items.find((item) => item.storeId === storeId) ?? null;
}

function readinessOverall(input: {
  connector: number;
  launch: number;
  provider: number;
}) {
  return Math.round((input.connector + input.launch + input.provider) / 3);
}

function packStatus(item: RevenueLaunchHandoffItem, options: RevenueLaunchOperationsPackOptions): RevenueLaunchOperationsPackStatus {
  if (item.blockers.some((blocker) => blocker.severity === "high")) return "blocked";
  if (!item.bundle) return "blocked";
  if (item.launchReadiness.readinessScore < options.minLaunchReadiness) return "needs_review";
  if (item.providerPayload.readinessScore < options.minProviderReadiness) return "needs_review";
  if ((item.connectorReadiness?.score ?? 0) < options.minConnectorReadiness) return "needs_review";
  if (item.connectorReadiness?.status !== "Ready for manual handoff") return "needs_review";

  return "ready_for_manual_launch";
}

function queueAction(status: RevenueLaunchOperationsPackStatus): RevenueLaunchOperationsPackQueueAction {
  if (status === "ready_for_manual_launch") return "record_launch_pack";
  if (status === "needs_review") return "review_launch_pack";
  return "resolve_launch_blockers";
}

function manifestSummary(item: RevenueLaunchHandoffItem): RevenueLaunchOperationsRequestManifest[] {
  return item.bundle?.requestManifest.map((manifest) => ({
    action: manifest.action,
    artifactSlots: manifest.artifactSlots.length,
    credentialScope: manifest.credentialScope,
    executionState: manifest.executionState,
    id: manifest.id,
    pathTemplate: manifest.pathTemplate,
    productName: manifest.productName,
    provider: manifest.provider
  })) ?? [];
}

function artifactSlots(item: RevenueLaunchHandoffItem) {
  const slots = new Map<string, ProviderHandoffArtifactSlot & {
    manifestId: string;
    provider: string;
  }>();

  for (const manifest of item.bundle?.requestManifest ?? []) {
    for (const slot of manifest.artifactSlots) {
      const key = `${manifest.provider}:${manifest.id}:${slot.slotId}`;
      slots.set(key, {
        ...slot,
        manifestId: manifest.id,
        provider: manifest.provider
      });
    }
  }

  return Array.from(slots.values());
}

function manualSteps(item: RevenueLaunchHandoffItem) {
  return unique([
    ...(item.bundle?.manualLaunchChecklist ?? []),
    ...(item.bundle?.requestManifest.flatMap((manifest) => manifest.manualSteps) ?? [])
  ]);
}

function qaChecklist(item: RevenueLaunchHandoffItem) {
  return unique([
    ...(item.bundle?.requestManifest.flatMap((manifest) => manifest.validationChecklist) ?? []),
    ...(item.bundle?.rollbackChecklist ?? []),
    "Confirm every provider request remains locked until direct operator launch.",
    "Confirm no external upload, payout, social post, ad, browser, or provider call is triggered by this pack."
  ]);
}

function buildPack(input: {
  checklistItem: RevenueLaunchChecklistItem | null;
  item: RevenueLaunchHandoffItem;
  options: RevenueLaunchOperationsPackOptions;
  packetIdByStoreId: Map<string, string>;
  packetAuditByStoreId: Map<string, string | null>;
}): RevenueLaunchOperationsPack {
  const connectorReadinessScore = input.item.connectorReadiness?.score ?? 0;
  const launchReadinessScore = input.item.launchReadiness.readinessScore;
  const providerReadinessScore = input.item.providerPayload.readinessScore;
  const requestManifests = manifestSummary(input.item);
  const providers = unique(input.item.providers);
  const credentialScopes = unique(input.item.credentialScopes);
  const status = packStatus(input.item, input.options);
  const readinessLine = `Launch ${launchReadinessScore}/100, provider ${providerReadinessScore}/100, connector ${connectorReadinessScore}/100.`;
  const productNames = unique(requestManifests.map((manifest) => manifest.productName));
  const checklistReadyStages = input.checklistItem?.stages.filter((stage) => stage.status === "ready" || stage.status === "complete").length ?? 0;
  const nextReviewGate = status === "ready_for_manual_launch"
    ? "Operator manual launch review"
    : input.item.blockers[0]?.title ?? input.checklistItem?.blockers[0] ?? "Review launch pack readiness.";

  return {
    artifactSlots: artifactSlots(input.item),
    auditTrail: {
      approvedPacketId: input.item.approvedPacketId,
      handoffPacketAuditLogId: input.packetAuditByStoreId.get(input.item.storeId) ?? null,
      handoffPacketId: input.packetIdByStoreId.get(input.item.storeId) ?? null,
      reviewAuditLogId: input.item.bundle?.reviewAuditLogId ?? null
    },
    blockers: input.item.blockers,
    checklist: {
      blockers: input.checklistItem?.blockers ?? [],
      nextAction: input.checklistItem?.nextAction ?? null,
      priorityScore: input.checklistItem?.priorityScore ?? 0,
      readyStages: checklistReadyStages,
      signalEvidence: input.checklistItem?.metrics.signalEvidence ?? 0,
      summary: input.checklistItem?.summary ?? null
    },
    credentialScopes,
    externalExecution: false,
    manualOnly: true,
    manualSteps: manualSteps(input.item),
    operatorBrief: {
      businessName: input.item.storeName,
      nextReviewGate,
      productNames,
      providers,
      readinessLine,
      storeName: input.item.storeName
    },
    priority: input.item.priority + (status === "ready_for_manual_launch" ? 20 : 0),
    providerContacted: false,
    qaChecklist: qaChecklist(input.item),
    readiness: {
      connectorReadinessScore,
      launchReadinessScore,
      overallScore: readinessOverall({
        connector: connectorReadinessScore,
        launch: launchReadinessScore,
        provider: providerReadinessScore
      }),
      providerReadinessScore
    },
    requestManifests,
    riskLevel: input.item.riskLevel,
    status,
    storeId: input.item.storeId,
    storeName: input.item.storeName,
    summary: status === "ready_for_manual_launch"
      ? `${input.item.storeName} has a manual-only launch operations pack with ${requestManifests.length} locked request manifest${requestManifests.length === 1 ? "" : "s"}.`
      : `${input.item.storeName} needs ${status === "blocked" ? "blocker resolution" : "operator review"} before manual launch handoff.`
  };
}

export function buildRevenueLaunchOperationsPackPlan(input: PlanInput): RevenueLaunchOperationsPackPlan {
  const options = optionsWithDefaults(input.options);
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const packetIdByStoreId = new Map(input.handoffPlan.persistedPackets.map((packet) => [packet.storeId, packet.id]));
  const packetAuditByStoreId = new Map(input.handoffPlan.persistedPackets.map((packet) => [packet.storeId, packet.auditLogId]));
  const packs = input.handoffPlan.items
    .map((item) => buildPack({
      checklistItem: checklistForStore(input.checklistPlan, item.storeId),
      item,
      options,
      packetAuditByStoreId,
      packetIdByStoreId
    }))
    .filter((pack) => options.includeBlocked || pack.status !== "blocked")
    .sort((a, b) => b.priority - a.priority || b.readiness.overallScore - a.readiness.overallScore)
    .slice(0, options.maxPacks);
  const totals = packs.reduce((accumulator, pack) => {
    accumulator.artifactSlots += pack.artifactSlots.length;
    accumulator.credentialScopes += pack.credentialScopes.length;
    accumulator.manualSteps += pack.manualSteps.length;
    accumulator.requestManifests += pack.requestManifests.length;
    if (pack.status === "ready_for_manual_launch") accumulator.readyPacks += 1;
    if (pack.status === "needs_review") accumulator.reviewPacks += 1;
    if (pack.status === "blocked") accumulator.blockedPacks += 1;

    return accumulator;
  }, {
    artifactSlots: 0,
    blockedPacks: 0,
    credentialScopes: 0,
    manualSteps: 0,
    packs: packs.length,
    readyPacks: 0,
    requestManifests: 0,
    reviewPacks: 0
  });

  return {
    auditEvents: [
      "Revenue Launch Operations Pack consolidated checklist, handoff, manifest, artifact-slot, QA, and blocker evidence.",
      "Every request manifest remains manual-only and locked; no provider, browser, payment, upload, ad, or social execution occurred.",
      "Apply mode records an audit artifact for selected packs without changing external systems."
    ],
    blockedExternalActions: unique([
      ...input.checklistPlan.blockedExternalActions,
      ...input.handoffPlan.blockedExternalActions,
      ...blockedExternalActions,
      ...packs.flatMap((pack) => pack.blockers.map((blocker) => blocker.title))
    ]),
    externalExecution: false,
    generatedAt,
    mode: "Internal Revenue Launch Operations Pack",
    options,
    packs,
    providerContacted: false,
    queue: packs.map((pack) => ({
      action: queueAction(pack.status),
      externalExecution: false,
      priority: pack.priority,
      providerContacted: false,
      status: pack.status,
      storeId: pack.storeId,
      storeName: pack.storeName,
      summary: pack.summary
    })),
    summary: packs.length === 0
      ? "No launch operations packs matched the current filters."
      : `${packs.length} launch operations pack${packs.length === 1 ? "" : "s"} prepared; ${totals.readyPacks} ready for manual launch review, ${totals.reviewPacks} need review, ${totals.blockedPacks} blocked.`,
    totals
  };
}

export function selectRevenueLaunchOperationsPacks(plan: RevenueLaunchOperationsPackPlan, storeIds: string[] = []) {
  const selected = new Set(storeIds.filter(Boolean));

  if (selected.size === 0) return plan.packs;

  return plan.packs.filter((pack) => selected.has(pack.storeId));
}
