import {
  authorityBand,
  authorityRadius,
  normalizeAngle,
  resolveAngularCollisions,
  stableAngularSlots,
  stableGraphHash
} from "./graph-authority";
import { layoutCanonicalUniverse } from "./canonical-universe";
import type {
  RendererGraphProjection as GraphProjection,
  ProjectedGraphEdge,
  ProjectedGraphEntity
} from "./graph-projection";
import { BoundedGraphLayoutCache } from "./graph-diagnostics";

export const GRAPH_2D_LAYOUT_PATTERNS = [
  "authority-radial",
  "hierarchy-tree",
  "domain-clusters",
  "compact-radial"
] as const;
export type Graph2DLayoutPattern = (typeof GRAPH_2D_LAYOUT_PATTERNS)[number];

export const GRAPH_3D_LAYOUT_PATTERNS = [
  "authority-rings",
  "elliptical-orbits",
  "spherical-shells",
  "domain-clusters"
] as const;
export type Graph3DLayoutPattern = (typeof GRAPH_3D_LAYOUT_PATTERNS)[number];

export type GraphDensity = "compact" | "balanced" | "spacious";

export type GraphPosition2D = {
  readonly x: number;
  readonly y: number;
};

export type GraphPosition3D = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

export type GraphPinnedPositions2D = Readonly<Record<string, GraphPosition2D>>;
export type GraphPinnedPositions3D = Readonly<Record<string, GraphPosition3D>>;

export type GraphPoint2D = GraphPosition2D & {
  readonly entityId: string;
  readonly parentId: string | null;
  readonly parentEdgeId: string | null;
  readonly domainId: string | null;
  readonly tier: number;
  readonly angle: number;
  readonly authorityRadius: number;
  readonly radialDistance: number;
  readonly depth: number;
  readonly siblingIndex: number;
  readonly siblingCount: number;
  readonly collisionLane: number;
  readonly crowded: boolean;
  readonly pinned: boolean;
};

export type GraphPoint3D = GraphPosition3D & {
  readonly entityId: string;
  readonly parentId: string | null;
  readonly parentEdgeId: string | null;
  readonly domainId: string | null;
  readonly tier: number;
  readonly angle: number;
  readonly authorityRadius: number;
  readonly radialDistance: number;
  readonly collisionLane: number;
  readonly crowded: boolean;
  readonly pinned: boolean;
};

export type GraphLayout2DResult = {
  readonly pattern: Graph2DLayoutPattern;
  readonly projectionId: string;
  readonly points: readonly GraphPoint2D[];
  readonly edges: readonly ProjectedGraphEdge[];
  readonly appliedForceIterations: number;
  readonly forceIterationsRejected: boolean;
  readonly crowdedEntityIds: readonly string[];
  readonly rejectedPinCount: number;
};

export type GraphLayout3DResult = {
  readonly pattern: Graph3DLayoutPattern;
  readonly projectionId: string;
  readonly points: readonly GraphPoint3D[];
  readonly edges: readonly ProjectedGraphEdge[];
  readonly crowdedEntityIds: readonly string[];
  readonly rejectedPinCount: number;
};

export type GraphLayoutOptions = {
  readonly seed?: string;
  readonly density?: GraphDensity;
  readonly authoritySpacingScale?: number;
  readonly authorityScoreInfluence?: number;
  readonly collisionPadding?: number;
  readonly nodeRadius?: number;
};

export type GraphLayout2DOptions = GraphLayoutOptions & {
  readonly forceIterations?: number;
  readonly pins?: GraphPinnedPositions2D;
  readonly treeOrientation?: "top-down" | "left-right" | "center-out";
  readonly siblingSpacing?: number;
  readonly levelSpacing?: number;
  readonly clusterSpread?: number;
  readonly sectorPadding?: number;
};

export type GraphLayout3DOptions = GraphLayoutOptions & {
  readonly pins?: GraphPinnedPositions3D;
  readonly ellipseEccentricity?: number;
  readonly orbitTilt?: number;
  readonly clusterSpread?: number;
  readonly verticalSpread?: number;
  readonly depthScale?: number;
};

const TAU = Math.PI * 2;
const MAX_PIN_COORDINATE = 1_000_000;
const graph2DLayoutCache = new BoundedGraphLayoutCache<GraphLayout2DResult>(12);
const graph3DLayoutCache = new BoundedGraphLayoutCache<GraphLayout3DResult>(12);

function optionFingerprint(options: object) {
  return stableGraphHash(JSON.stringify(options)).toString(16);
}

/**
 * Geometry excludes health/status/task metadata so canonical event updates
 * that do not move hierarchy, authority, or domain relationships can reuse
 * the exact immutable point array. The returned layout is rebound to the new
 * projection ID and edge array, preserving current truth without recomputing
 * unchanged geometry.
 */
export function graphLayoutGeometryKey(projection: GraphProjection) {
  let hash = stableGraphHash(
    `${projection.organizationId ?? ""}:${projection.scopeKey ?? ""}`
  );
  for (const node of projection.entities) {
    hash = stableGraphHash([
      hash,
      node.entityId,
      node.entity.stable_code,
      node.parentId ?? "",
      node.parentEdgeId ?? "",
      node.domainId ?? "",
      node.authority.role,
      node.authority.tier,
      node.authority.normalizedScore,
      node.depth
    ].join(":"));
  }
  for (const edge of projection.edges) {
    hash = stableGraphHash([
      hash,
      edge.edgeId,
      edge.sourceId,
      edge.targetId,
      edge.relationType
    ].join(":"));
  }
  return hash.toString(16);
}

function rebindCachedLayout<Result extends GraphLayout2DResult | GraphLayout3DResult>(
  cached: Result,
  projection: GraphProjection
): Result {
  if (
    cached.projectionId === projection.projectionId
    && cached.edges === projection.edges
  ) {
    return cached;
  }
  return {
    ...cached,
    projectionId: projection.projectionId,
    edges: projection.edges
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function finiteCoordinate(value: unknown) {
  return typeof value === "number"
    && Number.isFinite(value)
    && Math.abs(value) <= MAX_PIN_COORDINATE;
}

function densityScale(density: GraphDensity | undefined) {
  if (density === "compact") return 0.76;
  if (density === "spacious") return 1.24;
  return 1;
}

function effectiveSpacing(options: GraphLayoutOptions) {
  const explicit = Number.isFinite(options.authoritySpacingScale)
    ? options.authoritySpacingScale!
    : 1;
  return clamp(explicit, 0.05, 64) * densityScale(options.density);
}

function nodeAuthorityRadius(
  node: ProjectedGraphEntity,
  options: GraphLayoutOptions,
  compactFactor = 1
) {
  return authorityRadius(
    node.authority.role,
    node.authority.normalizedScore,
    {
      spacingScale: effectiveSpacing(options) * compactFactor,
      scoreInfluence: options.authorityScoreInfluence
    }
  );
}

function siblingMetadata(projection: GraphProjection) {
  const siblingsByParent = new Map<string, ProjectedGraphEntity[]>();
  for (const node of projection.entities) {
    const key = node.parentId ?? "__roots__";
    const siblings = siblingsByParent.get(key) ?? [];
    siblings.push(node);
    siblingsByParent.set(key, siblings);
  }
  const metadata = new Map<string, {
    readonly siblingIndex: number;
    readonly siblingCount: number;
  }>();
  for (const siblings of siblingsByParent.values()) {
    siblings.sort((left, right) =>
      compareText(left.entity.stable_code, right.entity.stable_code)
      || compareText(left.entityId, right.entityId)
    );
    for (let index = 0; index < siblings.length; index += 1) {
      metadata.set(siblings[index]!.entityId, {
        siblingIndex: index,
        siblingCount: siblings.length
      });
    }
  }
  return metadata;
}

function lineageAngles(
  projection: GraphProjection,
  seed: string,
  sectorPadding = 0
): ReadonlyMap<string, number> {
  const angles = new Map<string, number>();
  const marshals = projection.entities.filter(
    (node) => node.authority.role === "MARSHAL"
  );
  const marshalAngles = stableAngularSlots(
    marshals.map((node) => node.entityId),
    { seed: `${seed}:marshals` }
  );
  for (const [entityId, angle] of marshalAngles) angles.set(entityId, angle);
  const marshalSectorWidth = TAU / Math.max(1, marshals.length);
  const usableSectorScale = 1 - clamp(sectorPadding, 0, 0.45) * 2;

  for (const role of ["GENERAL", "COMMANDER", "SOLDIER"] as const) {
    const byDomain = new Map<string, ProjectedGraphEntity[]>();
    for (const node of projection.entities) {
      if (node.authority.role !== role) continue;
      const domainKey = node.domainId ?? `unscoped:${role}`;
      const group = byDomain.get(domainKey) ?? [];
      group.push(node);
      byDomain.set(domainKey, group);
    }
    const orderedDomains = [...byDomain.keys()].sort(compareText);
    const fallbackDomainAngles = stableAngularSlots(
      orderedDomains,
      { seed: `${seed}:${role}:domains` }
    );
    for (const domainId of orderedDomains) {
      const group = byDomain.get(domainId)!;
      const center = marshalAngles.get(domainId)
        ?? fallbackDomainAngles.get(domainId)
        ?? normalizeAngle(stableGraphHash(domainId, seed) / 0xffffffff * TAU);
      const span = marshalSectorWidth
        * (role === "GENERAL" ? 0.6 : role === "COMMANDER" ? 0.78 : 0.92)
        * usableSectorScale;
      const count = Math.max(1, group.length);
      const start = center - span / 2 + span / (count * 2);
      const slots = stableAngularSlots(
        group.map((node) => node.entityId),
        { seed: `${seed}:${role}:${domainId}`, startAngle: start, span }
      );
      for (const [entityId, angle] of slots) angles.set(entityId, angle);
    }
  }

  for (const node of projection.entities) {
    if (node.authority.role === "ENTRAL") angles.set(node.entityId, 0);
    if (!angles.has(node.entityId)) {
      angles.set(
        node.entityId,
        normalizeAngle(stableGraphHash(node.entityId, seed) / 0xffffffff * TAU)
      );
    }
  }
  return angles;
}

function collisionLayout(
  projection: GraphProjection,
  angles: ReadonlyMap<string, number>,
  options: GraphLayoutOptions,
  compactFactor = 1
) {
  return resolveAngularCollisions(
    projection.entities.map((node) => ({
      entityId: node.entityId,
      role: node.authority.role,
      desiredAngle: angles.get(node.entityId) ?? 0,
      radius: nodeAuthorityRadius(node, options, compactFactor),
      collisionRadius: clamp(
        Number.isFinite(options.nodeRadius) ? options.nodeRadius! : 8,
        0,
        500
      )
    })),
    {
      padding: options.collisionPadding,
      spacingScale: effectiveSpacing(options) * compactFactor
    }
  );
}

function radial2D(
  projection: GraphProjection,
  pattern: Exclude<Graph2DLayoutPattern, "hierarchy-tree">,
  options: GraphLayout2DOptions
) {
  const seed = options.seed ?? "entral-phase-195";
  const baseAngles = lineageAngles(projection, seed, options.sectorPadding);
  const compactFactor = pattern === "compact-radial" ? 0.72 : 1;
  const collisions = collisionLayout(
    projection,
    baseAngles,
    options,
    compactFactor
  );
  const collisionById = new Map(
    collisions.map((collision) => [collision.entityId, collision])
  );
  const domainSpread = clamp(
    Number.isFinite(options.clusterSpread) ? options.clusterSpread! : 0.42,
    0.05,
    1
  );
  return projection.entities.map((node) => {
    const collision = collisionById.get(node.entityId)!;
    let angle = collision.angle;
    if (pattern === "domain-clusters" && node.domainId && node.authority.role !== "MARSHAL") {
      const domainAngle = baseAngles.get(node.domainId) ?? angle;
      let delta = normalizeAngle(angle - domainAngle);
      if (delta > Math.PI) delta -= TAU;
      angle = normalizeAngle(domainAngle + delta * domainSpread);
    }
    return {
      node,
      angle,
      radius: collision.radius,
      collisionLane: collision.lane,
      crowded: collision.crowded,
      x: Math.cos(angle) * collision.radius,
      y: Math.sin(angle) * collision.radius
    };
  });
}

function tree2D(
  projection: GraphProjection,
  options: GraphLayout2DOptions
) {
  const points = layoutCanonicalUniverse(
    projection.entities.map((node) => node.entity)
  );
  const byId = new Map(points.map((point) => [point.entity.entity_id, point]));
  const density = densityScale(options.density);
  const siblingScale = clamp(
    Number.isFinite(options.siblingSpacing) ? options.siblingSpacing! : 1,
    0.05,
    16
  );
  const levelScale = clamp(
    Number.isFinite(options.levelSpacing) ? options.levelSpacing! : 1,
    0.05,
    32
  );
  const centerOutAngles = options.treeOrientation === "center-out"
    ? lineageAngles(projection, options.seed ?? "entral-phase-195:center-out")
    : null;
  return projection.entities.map((node) => {
    const point = byId.get(node.entityId);
    let x = (point?.x ?? 0) * density * siblingScale;
    let y = (point?.y ?? 0) * density * levelScale;
    if (options.treeOrientation === "left-right") {
      [x, y] = [y, x];
    } else if (options.treeOrientation === "center-out") {
      const radius = nodeAuthorityRadius(node, options);
      const angle = centerOutAngles?.get(node.entityId) ?? 0;
      x = Math.cos(angle) * radius;
      y = Math.sin(angle) * radius;
    }
    return {
      node,
      angle: normalizeAngle(Math.atan2(y, x)),
      radius: nodeAuthorityRadius(node, options),
      collisionLane: 0,
      crowded: false,
      x,
      y
    };
  });
}

function boundedPin2D(
  pin: GraphPosition2D | undefined
): GraphPosition2D | null {
  return pin && finiteCoordinate(pin.x) && finiteCoordinate(pin.y)
    ? { x: pin.x, y: pin.y }
    : null;
}

function boundedPin3D(
  pin: GraphPosition3D | undefined
): GraphPosition3D | null {
  return pin
    && finiteCoordinate(pin.x)
    && finiteCoordinate(pin.y)
    && finiteCoordinate(pin.z)
    ? { x: pin.x, y: pin.y, z: pin.z }
    : null;
}

function project2DPinToAuthorityRadius(
  pin: GraphPosition2D,
  radius: number
) {
  if (radius === 0) return { x: 0, y: 0 };
  const length = Math.hypot(pin.x, pin.y);
  if (length <= Number.EPSILON) return { x: radius, y: 0 };
  return { x: pin.x / length * radius, y: pin.y / length * radius };
}

function project3DPinToAuthorityRadius(
  pin: GraphPosition3D,
  radius: number
) {
  if (radius === 0) return { x: 0, y: 0, z: 0 };
  const length = Math.hypot(pin.x, pin.y, pin.z);
  if (length <= Number.EPSILON) return { x: radius, y: 0, z: 0 };
  return {
    x: pin.x / length * radius,
    y: pin.y / length * radius,
    z: pin.z / length * radius
  };
}

export function sanitizePinnedPositions2D(
  projection: GraphProjection,
  pins: GraphPinnedPositions2D
): {
  readonly pins: GraphPinnedPositions2D;
  readonly rejectedCount: number;
} {
  const authorized = new Set(projection.entities.map((node) => node.entityId));
  const sanitized: Record<string, GraphPosition2D> = {};
  let rejectedCount = 0;
  for (const [entityId, pin] of Object.entries(pins)) {
    const bounded = boundedPin2D(pin);
    if (!authorized.has(entityId) || !bounded) {
      rejectedCount += 1;
      continue;
    }
    sanitized[entityId] = bounded;
  }
  return { pins: sanitized, rejectedCount };
}

export function sanitizePinnedPositions3D(
  projection: GraphProjection,
  pins: GraphPinnedPositions3D
): {
  readonly pins: GraphPinnedPositions3D;
  readonly rejectedCount: number;
} {
  const authorized = new Set(projection.entities.map((node) => node.entityId));
  const sanitized: Record<string, GraphPosition3D> = {};
  let rejectedCount = 0;
  for (const [entityId, pin] of Object.entries(pins)) {
    const bounded = boundedPin3D(pin);
    if (!authorized.has(entityId) || !bounded) {
      rejectedCount += 1;
      continue;
    }
    sanitized[entityId] = bounded;
  }
  return { pins: sanitized, rejectedCount };
}

export function pinGraphNode2D(
  projection: GraphProjection,
  pins: GraphPinnedPositions2D,
  entityId: string,
  position: GraphPosition2D
): GraphPinnedPositions2D {
  const authorized = projection.entities.some((node) => node.entityId === entityId);
  const bounded = boundedPin2D(position);
  return authorized && bounded ? { ...pins, [entityId]: bounded } : pins;
}

export function pinGraphNode3D(
  projection: GraphProjection,
  pins: GraphPinnedPositions3D,
  entityId: string,
  position: GraphPosition3D
): GraphPinnedPositions3D {
  const authorized = projection.entities.some((node) => node.entityId === entityId);
  const bounded = boundedPin3D(position);
  return authorized && bounded ? { ...pins, [entityId]: bounded } : pins;
}

export function unpinGraphNode<TPosition>(
  pins: Readonly<Record<string, TPosition>>,
  entityId: string
): Readonly<Record<string, TPosition>> {
  if (!(entityId in pins)) return pins;
  const next = { ...pins };
  delete next[entityId];
  return next;
}

function signedAngleDelta(from: number, to: number) {
  const normalized = normalizeAngle(to - from);
  return normalized > Math.PI ? normalized - TAU : normalized;
}

export function boundedGraphForceIterations(forceIterations: number) {
  return Number.isFinite(forceIterations)
    ? clamp(Math.floor(forceIterations), 0, 500)
    : 0;
}

export function graph2DForceIterationsSupported(
  pattern: Graph2DLayoutPattern
) {
  return pattern !== "hierarchy-tree";
}

/**
 * Applies a bounded deterministic tangential relaxation. Every node keeps its
 * original radius, hierarchy metadata, and edge identity; only its angle may
 * move. The closed-form progress is equivalent to repeated 4% relaxation
 * steps, so all accepted iteration counts from 1 through 500 have a stable,
 * observable effect without an O(nodes * iterations) main-thread loop.
 */
export function applyDeterministicForceIterations2D(
  points: readonly GraphPoint2D[],
  forceIterations: number,
  seed = "entral-phase-195"
): readonly GraphPoint2D[] {
  const iterations = boundedGraphForceIterations(forceIterations);
  if (iterations === 0 || points.length === 0) return points;

  const pointById = new Map(points.map((point) => [point.entityId, point]));
  const relaxationProgress = 1 - Math.pow(0.96, iterations);

  return points.map((point) => {
    if (point.pinned || point.radialDistance <= Number.EPSILON) return point;

    const originalAngle = normalizeAngle(Math.atan2(point.y, point.x));
    const parent = point.parentId ? pointById.get(point.parentId) : null;
    const parentInfluence = parent && parent.radialDistance > Number.EPSILON
      ? signedAngleDelta(originalAngle, parent.angle) * 0.08
      : 0;
    const siblingCenter = point.siblingCount > 1
      ? point.siblingIndex / (point.siblingCount - 1) - 0.5
      : 0;
    const siblingInfluence = siblingCenter * Math.min(
      0.12,
      32 / Math.max(point.radialDistance, 1)
    );
    const deterministicBias = (
      stableGraphHash(point.entityId, `${seed}:force`) / 0xffffffff - 0.5
    ) * 0.03;
    const targetDelta = clamp(
      parentInfluence + siblingInfluence + deterministicBias,
      -0.16,
      0.16
    );
    const angle = normalizeAngle(
      originalAngle + targetDelta * relaxationProgress
    );

    return {
      ...point,
      angle,
      x: Math.cos(angle) * point.radialDistance,
      y: Math.sin(angle) * point.radialDistance
    };
  });
}

export function layoutGraph2D(
  projection: GraphProjection,
  pattern: Graph2DLayoutPattern = "authority-radial",
  options: GraphLayout2DOptions = {}
): GraphLayout2DResult {
  const validPattern = GRAPH_2D_LAYOUT_PATTERNS.includes(pattern)
    ? pattern
    : "authority-radial";
  const cacheKey = `${graphLayoutGeometryKey(projection)}:2d:${validPattern}:${optionFingerprint(options)}`;
  const cached = graph2DLayoutCache.get(cacheKey);
  if (cached) {
    const rebound = rebindCachedLayout(cached, projection);
    graph2DLayoutCache.set(cacheKey, rebound);
    return rebound;
  }
  const canonical = validPattern === "hierarchy-tree"
    ? tree2D(projection, options)
    : radial2D(projection, validPattern, options);
  const siblings = siblingMetadata(projection);
  const sanitizedPins = sanitizePinnedPositions2D(
    projection,
    options.pins ?? {}
  );
  const basePoints = canonical.map((point): GraphPoint2D => {
    const metadata = siblings.get(point.node.entityId) ?? {
      siblingIndex: 0,
      siblingCount: 1
    };
    const pin = sanitizedPins.pins[point.node.entityId];
    const pinnedPosition = pin
      ? validPattern === "hierarchy-tree"
        ? pin
        : project2DPinToAuthorityRadius(pin, point.radius)
      : null;
    const x = pinnedPosition?.x ?? point.x;
    const y = pinnedPosition?.y ?? point.y;
    return {
      entityId: point.node.entityId,
      parentId: point.node.parentId,
      parentEdgeId: point.node.parentEdgeId,
      domainId: point.node.domainId,
      tier: point.node.authority.tier,
      x,
      y,
      angle: normalizeAngle(Math.atan2(y, x)),
      authorityRadius: point.radius,
      radialDistance: Math.hypot(x, y),
      depth: point.node.depth,
      siblingIndex: metadata.siblingIndex,
      siblingCount: metadata.siblingCount,
      collisionLane: point.collisionLane,
      crowded: point.crowded,
      pinned: Boolean(pin)
    };
  });
  const requestedForceIterations = boundedGraphForceIterations(
    options.forceIterations ?? 0
  );
  const forceIterationsSupported = graph2DForceIterationsSupported(
    validPattern
  );
  const appliedForceIterations = forceIterationsSupported
    ? requestedForceIterations
    : 0;
  const points = applyDeterministicForceIterations2D(
    basePoints,
    appliedForceIterations,
    options.seed
  );
  const result: GraphLayout2DResult = {
    pattern: validPattern,
    projectionId: projection.projectionId,
    points,
    edges: projection.edges,
    appliedForceIterations,
    forceIterationsRejected:
      !forceIterationsSupported && requestedForceIterations > 0,
    crowdedEntityIds: points
      .filter((point) => point.crowded)
      .map((point) => point.entityId),
    rejectedPinCount: sanitizedPins.rejectedCount
  };
  graph2DLayoutCache.set(cacheKey, result);
  return result;
}

function normalized3D(
  x: number,
  y: number,
  z: number,
  radius: number
): GraphPosition3D {
  if (radius === 0) return { x: 0, y: 0, z: 0 };
  const length = Math.hypot(x, y, z);
  if (length <= Number.EPSILON) return { x: radius, y: 0, z: 0 };
  return {
    x: x / length * radius,
    y: y / length * radius,
    z: z / length * radius
  };
}

function canonical3DPosition(
  node: ProjectedGraphEntity,
  angle: number,
  radius: number,
  pattern: Graph3DLayoutPattern,
  options: GraphLayout3DOptions,
  domainAngle?: number
): GraphPosition3D {
  if (radius === 0) return { x: 0, y: 0, z: 0 };
  const depthScale = clamp(
    Number.isFinite(options.depthScale) ? options.depthScale! : 1,
    0.1,
    10
  );
  const hashUnit = stableGraphHash(
    node.entityId,
    options.seed ?? "entral-phase-195"
  ) / 0xffffffff;
  if (pattern === "elliptical-orbits") {
    const eccentricity = clamp(
      Number.isFinite(options.ellipseEccentricity)
        ? options.ellipseEccentricity!
        : 0.32,
      0,
      0.9
    );
    const tilt = clamp(
      Number.isFinite(options.orbitTilt) ? options.orbitTilt! : 0.2,
      -Math.PI * 85 / 180,
      Math.PI * 85 / 180
    );
    return normalized3D(
      Math.cos(angle),
      Math.sin(angle) * tilt,
      Math.sin(angle) * (1 - eccentricity) * depthScale,
      radius
    );
  }
  if (pattern === "spherical-shells") {
    const latitude = Math.asin(clamp((hashUnit * 2 - 1) * 0.82, -1, 1));
    return normalized3D(
      Math.cos(latitude) * Math.cos(angle),
      Math.sin(latitude),
      Math.cos(latitude) * Math.sin(angle) * depthScale,
      radius
    );
  }
  if (pattern === "domain-clusters") {
    const verticalSpread = clamp(
      Number.isFinite(options.verticalSpread) ? options.verticalSpread! : 0.28,
      0,
      10
    );
    const clusterSpread = clamp(
      Number.isFinite(options.clusterSpread) ? options.clusterSpread! : 0.38,
      0.1,
      10
    );
    const center = domainAngle ?? angle;
    let delta = normalizeAngle(angle - center);
    if (delta > Math.PI) delta -= TAU;
    const clusteredAngle = normalizeAngle(center + delta * clusterSpread);
    return normalized3D(
      Math.cos(clusteredAngle),
      (hashUnit * 2 - 1) * verticalSpread,
      Math.sin(clusteredAngle) * depthScale,
      radius
    );
  }
  const verticalSpread = clamp(
    Number.isFinite(options.verticalSpread) ? options.verticalSpread! : 0.12,
    0,
    10
  );
  return normalized3D(
    Math.cos(angle),
    (hashUnit * 2 - 1) * verticalSpread,
    Math.sin(angle) * depthScale,
    radius
  );
}

export function layoutGraph3D(
  projection: GraphProjection,
  pattern: Graph3DLayoutPattern = "authority-rings",
  options: GraphLayout3DOptions = {}
): GraphLayout3DResult {
  const validPattern = GRAPH_3D_LAYOUT_PATTERNS.includes(pattern)
    ? pattern
    : "authority-rings";
  const cacheKey = `${graphLayoutGeometryKey(projection)}:3d:${validPattern}:${optionFingerprint(options)}`;
  const cached = graph3DLayoutCache.get(cacheKey);
  if (cached) {
    const rebound = rebindCachedLayout(cached, projection);
    graph3DLayoutCache.set(cacheKey, rebound);
    return rebound;
  }
  const angles = lineageAngles(
    projection,
    options.seed ?? "entral-phase-195"
  );
  const collisions = collisionLayout(projection, angles, options);
  const collisionById = new Map(
    collisions.map((collision) => [collision.entityId, collision])
  );
  const sanitizedPins = sanitizePinnedPositions3D(
    projection,
    options.pins ?? {}
  );
  const points = projection.entities.map((node): GraphPoint3D => {
    const collision = collisionById.get(node.entityId)!;
    const canonical = canonical3DPosition(
      node,
      collision.angle,
      collision.radius,
      validPattern,
      options,
      node.domainId ? angles.get(node.domainId) : undefined
    );
    const pin = sanitizedPins.pins[node.entityId];
    const position = pin
      ? project3DPinToAuthorityRadius(pin, collision.radius)
      : canonical;
    return {
      entityId: node.entityId,
      parentId: node.parentId,
      parentEdgeId: node.parentEdgeId,
      domainId: node.domainId,
      tier: node.authority.tier,
      ...position,
      angle: normalizeAngle(Math.atan2(position.z, position.x)),
      authorityRadius: collision.radius,
      radialDistance: Math.hypot(position.x, position.y, position.z),
      collisionLane: collision.lane,
      crowded: collision.crowded,
      pinned: Boolean(pin)
    };
  });
  const result: GraphLayout3DResult = {
    pattern: validPattern,
    projectionId: projection.projectionId,
    points,
    edges: projection.edges,
    crowdedEntityIds: points
      .filter((point) => point.crowded)
      .map((point) => point.entityId),
    rejectedPinCount: sanitizedPins.rejectedCount
  };
  graph3DLayoutCache.set(cacheKey, result);
  return result;
}

export function layoutPreservesAuthorityOrder(
  points: readonly {
    readonly tier: number;
    readonly authorityRadius: number;
  }[]
) {
  const bounds = new Map<number, { minimum: number; maximum: number }>();
  for (const point of points) {
    const current = bounds.get(point.tier);
    bounds.set(point.tier, {
      minimum: Math.min(current?.minimum ?? Infinity, point.authorityRadius),
      maximum: Math.max(current?.maximum ?? -Infinity, point.authorityRadius)
    });
  }
  const ordered = [...bounds.entries()].sort((left, right) => left[0] - right[0]);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index]![1].minimum < ordered[index - 1]![1].maximum) {
      return false;
    }
  }
  return true;
}

export function positionWithinAuthorityBand(
  node: ProjectedGraphEntity,
  radius: number,
  spacingScale = 1
) {
  const band = authorityBand(node.authority.role, spacingScale);
  return radius >= band.minRadius - Number.EPSILON
    && radius <= band.maxRadius + Number.EPSILON;
}
