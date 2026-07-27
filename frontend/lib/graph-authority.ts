import type { EntityRole, EntitySummary } from "@entral/contracts";

export const GRAPH_AUTHORITY_ROLES = [
  "ENTRAL",
  "MARSHAL",
  "GENERAL",
  "COMMANDER",
  "SOLDIER"
] as const satisfies readonly EntityRole[];

export type GraphAuthorityRole = (typeof GRAPH_AUTHORITY_ROLES)[number];

export type AuthorityBand = {
  readonly role: GraphAuthorityRole;
  readonly tier: number;
  readonly minRadius: number;
  readonly maxRadius: number;
};

export type AuthorityDescriptor = {
  readonly role: GraphAuthorityRole;
  readonly tier: number;
  readonly normalizedScore: number;
  readonly scoreSource: "canonical" | "default";
  readonly minRadius: number;
  readonly maxRadius: number;
  readonly radius: number;
};

export type StableAngularSlotOptions = {
  readonly seed?: string;
  readonly startAngle?: number;
  readonly span?: number;
};

export type AngularCollisionInput = {
  readonly entityId: string;
  readonly role: GraphAuthorityRole;
  readonly desiredAngle: number;
  readonly radius: number;
  readonly collisionRadius?: number;
};

export type AngularCollisionResult = AngularCollisionInput & {
  readonly angle: number;
  readonly lane: number;
  readonly crowded: boolean;
};

const TAU = Math.PI * 2;
const DEFAULT_COLLISION_RADIUS = 8;

const AUTHORITY_BANDS: Readonly<Record<GraphAuthorityRole, AuthorityBand>> = {
  ENTRAL: { role: "ENTRAL", tier: 0, minRadius: 0, maxRadius: 0 },
  MARSHAL: { role: "MARSHAL", tier: 1, minRadius: 120, maxRadius: 168 },
  GENERAL: { role: "GENERAL", tier: 2, minRadius: 232, maxRadius: 284 },
  COMMANDER: { role: "COMMANDER", tier: 3, minRadius: 352, maxRadius: 408 },
  SOLDIER: { role: "SOLDIER", tier: 4, minRadius: 480, maxRadius: 544 }
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeAngle(angle: number) {
  if (!Number.isFinite(angle)) return 0;
  const normalized = angle % TAU;
  return normalized < 0 ? normalized + TAU : normalized;
}

export function stableGraphHash(value: string, seed = "entral-phase-195") {
  let hash = 0x811c9dc5;
  const input = `${seed}\u0000${value}`;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function authorityBand(
  role: GraphAuthorityRole,
  spacingScale = 1
): AuthorityBand {
  const canonical = AUTHORITY_BANDS[role];
  const scale = Number.isFinite(spacingScale)
    ? clamp(spacingScale, 0.05, 64)
    : 1;
  return {
    role,
    tier: canonical.tier,
    minRadius: canonical.minRadius * scale,
    maxRadius: canonical.maxRadius * scale
  };
}

export function resolveAuthorityScore(entity: EntitySummary): {
  readonly score: number;
  readonly source: "canonical" | "default";
} {
  const compatible = entity as EntitySummary & {
    readonly authority_score?: unknown;
    readonly authorityScore?: unknown;
    readonly authority?: unknown;
    readonly authority_metadata?: unknown;
  };
  const authority = record(compatible.authority);
  const metadata = record(compatible.authority_metadata);
  const candidates = [
    compatible.authority_score,
    compatible.authorityScore,
    authority?.normalized_score,
    authority?.normalizedScore,
    authority?.score,
    metadata?.normalized_score,
    metadata?.normalizedScore,
    metadata?.score
  ];
  for (const candidate of candidates) {
    const numeric = finiteNumber(candidate);
    if (numeric !== null) {
      return { score: clamp(numeric, 0, 1), source: "canonical" };
    }
  }
  return {
    score: entity.entity_type === "ENTRAL" ? 1 : 0.5,
    source: "default"
  };
}

export function authorityRadius(
  role: GraphAuthorityRole,
  normalizedScore = 0.5,
  options: {
    readonly spacingScale?: number;
    readonly scoreInfluence?: number;
  } = {}
) {
  const band = authorityBand(role, options.spacingScale);
  if (role === "ENTRAL") return 0;
  const score = clamp(
    Number.isFinite(normalizedScore) ? normalizedScore : 0.5,
    0,
    1
  );
  const influence = clamp(
    Number.isFinite(options.scoreInfluence) ? options.scoreInfluence! : 1,
    0,
    1
  );
  const influencedScore = 0.5 + (score - 0.5) * influence;
  return band.maxRadius - (band.maxRadius - band.minRadius) * influencedScore;
}

export function describeAuthority(
  entity: EntitySummary,
  options: {
    readonly spacingScale?: number;
    readonly scoreInfluence?: number;
  } = {}
): AuthorityDescriptor {
  const role = entity.entity_type;
  const band = authorityBand(role, options.spacingScale);
  const resolved = resolveAuthorityScore(entity);
  return {
    role,
    tier: band.tier,
    normalizedScore: resolved.score,
    scoreSource: resolved.source,
    minRadius: band.minRadius,
    maxRadius: band.maxRadius,
    radius: authorityRadius(role, resolved.score, options)
  };
}

/**
 * Assigns identity-stable, evenly spaced slots. Input order never affects the
 * result, and adding an entity only changes the peer group that receives it.
 */
export function stableAngularSlots(
  entityIds: readonly string[],
  options: StableAngularSlotOptions = {}
): ReadonlyMap<string, number> {
  const unique = [...new Set(entityIds)];
  const seed = options.seed ?? "entral-phase-195";
  const startAngle = normalizeAngle(options.startAngle ?? 0);
  const span = clamp(
    Number.isFinite(options.span) ? options.span! : TAU,
    Number.EPSILON,
    TAU
  );
  unique.sort((left, right) =>
    stableGraphHash(left, seed) - stableGraphHash(right, seed)
    || compareText(left, right)
  );
  const slots = new Map<string, number>();
  if (!unique.length) return slots;
  const step = span / unique.length;
  for (let index = 0; index < unique.length; index += 1) {
    slots.set(unique[index]!, normalizeAngle(startAngle + step * index));
  }
  return slots;
}

function minimumAngularSeparation(radius: number, diameter: number) {
  if (radius <= 0) return TAU;
  return 2 * Math.asin(clamp(diameter / (2 * radius), 0, 1));
}

/**
 * Resolves peer collisions without crossing authority bands. Current-sized
 * groups are distributed evenly. If a fixture exceeds the physical band
 * capacity, all canonical nodes are retained and marked `crowded` so the
 * renderer can reduce node detail instead of dropping or fabricating data.
 */
export function resolveAngularCollisions(
  nodes: readonly AngularCollisionInput[],
  options: {
    readonly padding?: number;
    readonly spacingScale?: number;
  } = {}
): readonly AngularCollisionResult[] {
  const byRole = new Map<GraphAuthorityRole, AngularCollisionInput[]>();
  for (const node of nodes) {
    const group = byRole.get(node.role) ?? [];
    group.push(node);
    byRole.set(node.role, group);
  }

  const results = new Map<string, AngularCollisionResult>();
  const padding = clamp(
    Number.isFinite(options.padding) ? options.padding! : 2,
    0,
    128
  );

  for (const role of GRAPH_AUTHORITY_ROLES) {
    const group = byRole.get(role) ?? [];
    if (!group.length) continue;
    if (role === "ENTRAL") {
      for (const node of group) {
        results.set(node.entityId, {
          ...node,
          angle: 0,
          lane: 0,
          radius: 0,
          crowded: group.length > 1
        });
      }
      continue;
    }

    const band = authorityBand(role, options.spacingScale);
    const maximumDiameter = Math.max(
      1,
      ...group.map((node) => (node.collisionRadius ?? DEFAULT_COLLISION_RADIUS) * 2 + padding)
    );
    const minimumRadius = Math.max(1, band.minRadius);
    const minimumSeparation = minimumAngularSeparation(minimumRadius, maximumDiameter);
    const perLaneCapacity = Math.max(1, Math.floor(TAU / Math.max(minimumSeparation, Number.EPSILON)));
    const requiredLanes = Math.max(1, Math.ceil(group.length / perLaneCapacity));
    const bandWidth = Math.max(0, band.maxRadius - band.minRadius);
    const physicalLaneCapacity = Math.max(1, Math.floor(bandWidth / maximumDiameter) + 1);
    const laneCount = Math.min(requiredLanes, physicalLaneCapacity);
    const crowded = requiredLanes > physicalLaneCapacity;

    const ordered = [...group].sort((left, right) =>
      normalizeAngle(left.desiredAngle) - normalizeAngle(right.desiredAngle)
      || compareText(left.entityId, right.entityId)
    );
    const laneGroups: AngularCollisionInput[][] = Array.from(
      { length: laneCount },
      () => []
    );
    for (let index = 0; index < ordered.length; index += 1) {
      laneGroups[index % laneCount]!.push(ordered[index]!);
    }

    for (let lane = 0; lane < laneGroups.length; lane += 1) {
      const laneNodes = laneGroups[lane]!;
      if (!laneNodes.length) continue;
      const laneRadius = laneCount === 1
        ? null
        : band.minRadius + bandWidth * lane / Math.max(1, laneCount - 1);
      const firstAngle = normalizeAngle(laneNodes[0]!.desiredAngle);
      const step = TAU / laneNodes.length;
      for (let index = 0; index < laneNodes.length; index += 1) {
        const node = laneNodes[index]!;
        results.set(node.entityId, {
          ...node,
          angle: normalizeAngle(firstAngle + step * index),
          lane,
          radius: clamp(laneRadius ?? node.radius, band.minRadius, band.maxRadius),
          crowded
        });
      }
    }
  }

  return nodes.map((node) => results.get(node.entityId) ?? {
    ...node,
    angle: normalizeAngle(node.desiredAngle),
    lane: 0,
    crowded: false
  });
}

export function authorityBandsAreMonotonic(
  spacingScale = 1
): boolean {
  let previousMaximum = -Infinity;
  for (const role of GRAPH_AUTHORITY_ROLES) {
    const band = authorityBand(role, spacingScale);
    if (band.minRadius < previousMaximum || band.maxRadius < band.minRadius) {
      return false;
    }
    previousMaximum = band.maxRadius;
  }
  return true;
}
