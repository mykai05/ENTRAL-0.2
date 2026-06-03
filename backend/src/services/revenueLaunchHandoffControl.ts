import type {
  RevenueLaunchHandoffPacketRecordSnapshot,
  RevenueLaunchHandoffRecordStatus,
  RevenueLaunchHandoffRiskLevel
} from "./revenueLaunchHandoff.js";

export const revenueLaunchHandoffControlStatuses = [
  "queued_review",
  "ready_for_manual_handoff",
  "blocked_review",
  "archived"
] as const;

export type RevenueLaunchHandoffControlStatus = (typeof revenueLaunchHandoffControlStatuses)[number];

export type RevenueLaunchHandoffControlOptions = {
  includeArchived: boolean;
  maxPackets: number;
  minConnectorReadiness: number;
};

export type RevenueLaunchHandoffControlAction = {
  enabled: boolean;
  reason: string;
  status: RevenueLaunchHandoffControlStatus;
  title: string;
};

export type RevenueLaunchHandoffControlItem = RevenueLaunchHandoffPacketRecordSnapshot & {
  controlActions: RevenueLaunchHandoffControlAction[];
  recommendedStatus: RevenueLaunchHandoffControlStatus;
  reviewBlockers: Array<{
    code: string;
    severity: RevenueLaunchHandoffRiskLevel;
    title: string;
  }>;
};

export type RevenueLaunchHandoffControlPlan = {
  auditEvents: string[];
  blockedExternalActions: string[];
  externalExecution: false;
  generatedAt: string;
  mode: "Internal Launch Handoff Control Center";
  options: RevenueLaunchHandoffControlOptions;
  packets: RevenueLaunchHandoffControlItem[];
  providerContacted: false;
  statusCounts: Record<RevenueLaunchHandoffControlStatus, number>;
  summary: string;
  totals: {
    archivedPackets: number;
    artifactSlots: number;
    blockedPackets: number;
    manifestCount: number;
    packets: number;
    queuedPackets: number;
    readyForManualHandoff: number;
  };
};

export type RevenueLaunchHandoffControlEvaluation = {
  allowed: boolean;
  blockers: string[];
  externalExecution: false;
  fromStatus: RevenueLaunchHandoffControlStatus;
  providerContacted: false;
  reason: string;
  toStatus: RevenueLaunchHandoffControlStatus;
};

const defaultOptions: RevenueLaunchHandoffControlOptions = {
  includeArchived: false,
  maxPackets: 25,
  minConnectorReadiness: 70
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

function optionsWithDefaults(input: Partial<RevenueLaunchHandoffControlOptions> = {}): RevenueLaunchHandoffControlOptions {
  const provided = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<RevenueLaunchHandoffControlOptions>;

  return {
    includeArchived: provided.includeArchived ?? defaultOptions.includeArchived,
    maxPackets: clamp(Math.round(provided.maxPackets ?? defaultOptions.maxPackets), 1, 100),
    minConnectorReadiness: clamp(Math.round(provided.minConnectorReadiness ?? defaultOptions.minConnectorReadiness), 1, 100)
  };
}

function normalizeStatus(value: string): RevenueLaunchHandoffControlStatus {
  return revenueLaunchHandoffControlStatuses.includes(value as RevenueLaunchHandoffControlStatus)
    ? value as RevenueLaunchHandoffControlStatus
    : "queued_review";
}

function emptyStatusCounts(): Record<RevenueLaunchHandoffControlStatus, number> {
  return Object.fromEntries(revenueLaunchHandoffControlStatuses.map((status) => [status, 0])) as Record<RevenueLaunchHandoffControlStatus, number>;
}

function reviewBlockers(record: RevenueLaunchHandoffPacketRecordSnapshot, options: RevenueLaunchHandoffControlOptions) {
  const blockers: RevenueLaunchHandoffControlItem["reviewBlockers"] = record.blockers.map((blocker) => ({
    code: `packet_${blocker.code}`,
    severity: blocker.severity as RevenueLaunchHandoffRiskLevel,
    title: blocker.title
  }));

  if (record.manifestCount <= 0) {
    blockers.push({
      code: "missing_manifests",
      severity: "high",
      title: "No locked request manifests are attached to this packet."
    });
  }

  if (record.connectorReadinessScore < options.minConnectorReadiness) {
    blockers.push({
      code: "connector_readiness_floor",
      severity: "medium",
      title: `Connector readiness is ${record.connectorReadinessScore}/100, below the ${options.minConnectorReadiness}/100 control floor.`
    });
  }

  if (record.providerContacted || record.externalExecution) {
    blockers.push({
      code: "external_execution_flag",
      severity: "high",
      title: "This packet record indicates external execution or provider contact and requires investigation."
    });
  }

  return blockers;
}

function recommendedStatus(record: RevenueLaunchHandoffPacketRecordSnapshot, blockers: RevenueLaunchHandoffControlItem["reviewBlockers"], options: RevenueLaunchHandoffControlOptions): RevenueLaunchHandoffControlStatus {
  const status = normalizeStatus(record.status);

  if (status === "archived") return "archived";
  if (blockers.some((blocker) => blocker.severity === "high")) return "blocked_review";

  if (
    record.manifestCount > 0
      && record.connectorStatus === "Ready for manual handoff"
      && record.connectorReadinessScore >= options.minConnectorReadiness
  ) {
    return "ready_for_manual_handoff";
  }

  return "queued_review";
}

function controlsFor(record: RevenueLaunchHandoffPacketRecordSnapshot, blockers: RevenueLaunchHandoffControlItem["reviewBlockers"], recommendation: RevenueLaunchHandoffControlStatus): RevenueLaunchHandoffControlAction[] {
  const hasHighRisk = blockers.some((blocker) => blocker.severity === "high");
  const canReady = recommendation === "ready_for_manual_handoff" && !hasHighRisk;
  const canQueue = normalizeStatus(record.status) !== "archived";

  return [
    {
      enabled: canQueue,
      reason: canQueue ? "Return this packet to internal review queue." : "Archived packets must be reopened by rebuilding or recording a new packet.",
      status: "queued_review",
      title: "Queue review"
    },
    {
      enabled: canReady,
      reason: canReady
        ? "Manifests, connector readiness, and blocker checks support manual handoff review."
        : "Packet needs manifests, connector readiness, and no high-risk blockers before manual handoff.",
      status: "ready_for_manual_handoff",
      title: "Ready for handoff"
    },
    {
      enabled: normalizeStatus(record.status) !== "archived",
      reason: "Hold packet in blocked review while blockers are resolved internally.",
      status: "blocked_review",
      title: "Block review"
    },
    {
      enabled: true,
      reason: "Archive stale or superseded internal packet records without deleting audit history.",
      status: "archived",
      title: "Archive"
    }
  ];
}

export function buildRevenueLaunchHandoffControlPlan(input: {
  generatedAt?: string;
  options?: Partial<RevenueLaunchHandoffControlOptions>;
  packets: RevenueLaunchHandoffPacketRecordSnapshot[];
}): RevenueLaunchHandoffControlPlan {
  const options = optionsWithDefaults(input.options);
  const packets = input.packets
    .filter((packet) => options.includeArchived || normalizeStatus(packet.status) !== "archived")
    .slice(0, options.maxPackets)
    .map((packet): RevenueLaunchHandoffControlItem => {
      const blockers = reviewBlockers(packet, options);
      const recommendation = recommendedStatus(packet, blockers, options);

      return {
        ...packet,
        controlActions: controlsFor(packet, blockers, recommendation),
        recommendedStatus: recommendation,
        reviewBlockers: blockers,
        status: normalizeStatus(packet.status)
      };
    })
    .sort((a, b) => {
      const priority = (item: RevenueLaunchHandoffControlItem) => (
        item.status === "blocked_review" ? 1 : item.status === "queued_review" ? 2 : item.status === "ready_for_manual_handoff" ? 3 : 4
      );

      return priority(a) - priority(b) || b.updatedAt.localeCompare(a.updatedAt);
    });
  const statusCounts = emptyStatusCounts();

  for (const packet of packets) {
    statusCounts[normalizeStatus(packet.status)] += 1;
  }

  const manifestCount = packets.reduce((sum, packet) => sum + packet.manifestCount, 0);
  const artifactSlots = packets.reduce((sum, packet) => sum + packet.artifactSlotCount, 0);

  return {
    auditEvents: [
      "Launch Handoff Control Center evaluated durable handoff packet records.",
      "Status controls update ENTRAL records only.",
      "No provider, marketplace, browser, payment provider, social platform, or ad account was contacted."
    ],
    blockedExternalActions,
    externalExecution: false,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mode: "Internal Launch Handoff Control Center",
    options,
    packets,
    providerContacted: false,
    statusCounts,
    summary: `${packets.length} launch handoff packet${packets.length === 1 ? "" : "s"} under control: ${statusCounts.ready_for_manual_handoff} ready, ${statusCounts.queued_review} queued, ${statusCounts.blocked_review} blocked, ${statusCounts.archived} archived.`,
    totals: {
      archivedPackets: statusCounts.archived,
      artifactSlots,
      blockedPackets: statusCounts.blocked_review,
      manifestCount,
      packets: packets.length,
      queuedPackets: statusCounts.queued_review,
      readyForManualHandoff: statusCounts.ready_for_manual_handoff
    }
  };
}

export function evaluateRevenueLaunchHandoffControlUpdate(input: {
  item: RevenueLaunchHandoffControlItem;
  overrideReadiness?: boolean;
  toStatus: RevenueLaunchHandoffControlStatus;
}): RevenueLaunchHandoffControlEvaluation {
  const fromStatus = normalizeStatus(input.item.status);
  const blockers: string[] = [];

  if (input.toStatus === "ready_for_manual_handoff" && input.item.recommendedStatus !== "ready_for_manual_handoff" && !input.overrideReadiness) {
    blockers.push("Packet is not currently recommended for manual handoff. Resolve manifest, connector, and blocker checks first.");
  }

  if (input.toStatus === "ready_for_manual_handoff" && input.item.reviewBlockers.some((blocker) => blocker.severity === "high") && !input.overrideReadiness) {
    blockers.push("High-risk review blockers must be resolved before marking ready for manual handoff.");
  }

  const allowed = blockers.length === 0;

  return {
    allowed,
    blockers,
    externalExecution: false,
    fromStatus,
    providerContacted: false,
    reason: allowed
      ? `Internal handoff packet status can move from ${fromStatus} to ${input.toStatus}. External execution remains locked.`
      : blockers.join(" "),
    toStatus: input.toStatus
  };
}

export function isRevenueLaunchHandoffControlStatus(value: string): value is RevenueLaunchHandoffControlStatus {
  return revenueLaunchHandoffControlStatuses.includes(value as RevenueLaunchHandoffControlStatus);
}
