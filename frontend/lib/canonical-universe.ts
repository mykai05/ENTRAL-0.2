import type {
  EntityRole,
  EntitySummary,
  GraphPreferenceSettings,
  GraphRenderer,
  GraphRendererErrorCode
} from "@entral/contracts";

export type CanonicalWebGlRendererEvent =
  | {
      readonly errorCode: "GRAPH_RENDERER_FAILURE";
      readonly recoverable: true;
      readonly type: "WEBGL_UNAVAILABLE";
    }
  | {
      readonly errorCode: "GRAPH_WEBGL_CONTEXT_LOST";
      readonly recoverable: true;
      readonly type: "WEBGL_CONTEXT_LOST";
    }
  | {
      readonly errorCode: "NONE";
      readonly recoverable: true;
      readonly type: "WEBGL_CONTEXT_RESTORED";
    };

export type CanonicalRendererFrameDiagnostics = {
  readonly droppedFrameRateRatio: number;
  readonly errorCode: GraphRendererErrorCode;
  readonly frameRateFps: number;
  readonly renderer: GraphRenderer;
  readonly renderTimeMs: number;
  readonly sampleWindowMs: number;
};

export function easedGraphMotionProgress(
  progress: number,
  easing: GraphPreferenceSettings["advanced_shared"]["motion_easing"]
) {
  const bounded = Math.max(0, Math.min(1, progress));
  if (easing === "LINEAR") return bounded;
  if (easing === "EASE_IN") return bounded * bounded;
  if (easing === "EASE_OUT") return 1 - (1 - bounded) * (1 - bounded);
  return bounded < 0.5
    ? 2 * bounded * bounded
    : 1 - Math.pow(-2 * bounded + 2, 2) / 2;
}

export function canonicalGraphMotionProgress(
  elapsedMs: number,
  durationMs: number,
  easing: GraphPreferenceSettings["advanced_shared"]["motion_easing"]
) {
  if (durationMs <= 0) return 1;
  return easedGraphMotionProgress(elapsedMs / durationMs, easing);
}

export type UniversePoint = {
  readonly entity: EntitySummary;
  readonly x: number;
  readonly y: number;
};

export type UniverseBounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
};

export type UniverseCamera = {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
};

export type UniverseDirection = "left" | "right" | "up" | "down";

export const universeRoleDepth: Readonly<Record<EntityRole, number>> = {
  ENTRAL: 0,
  MARSHAL: 1,
  GENERAL: 2,
  COMMANDER: 3,
  SOLDIER: 4
};

export const MIN_UNIVERSE_ZOOM = 0.000001;
export const MAX_UNIVERSE_ZOOM = 64;

const UNIVERSE_HORIZONTAL_GAP = 150;
const MIN_UNIVERSE_VERTICAL_GAP = 700;
const UNIVERSE_COMPONENT_GAP = 2.4;

function compareUniverseEntities(left: EntitySummary, right: EntitySummary) {
  return left.stable_code.localeCompare(right.stable_code)
    || left.entity_id.localeCompare(right.entity_id);
}

function siblingGapFor(entity: EntitySummary) {
  if (entity.entity_type === "ENTRAL") return 1.2;
  if (entity.entity_type === "MARSHAL") return 0.55;
  if (entity.entity_type === "GENERAL") return 0.35;
  return 0.2;
}

export function canonicalLineageAndSubtree(
  entities: readonly EntitySummary[],
  selectedId: string | null
): ReadonlySet<string> {
  if (!selectedId) return new Set();
  const byId = new Map(entities.map((entity) => [entity.entity_id, entity]));
  if (!byId.has(selectedId)) return new Set();
  const children = new Map<string, string[]>();
  for (const entity of entities) {
    if (!entity.parent_id) continue;
    const existing = children.get(entity.parent_id) ?? [];
    existing.push(entity.entity_id);
    children.set(entity.parent_id, existing);
  }

  const included = new Set<string>([selectedId]);
  let current = byId.get(selectedId);
  while (current?.parent_id) {
    included.add(current.parent_id);
    current = byId.get(current.parent_id);
  }
  const queue = [selectedId];
  while (queue.length) {
    const parentId = queue.shift()!;
    for (const childId of children.get(parentId) ?? []) {
      if (included.has(childId)) continue;
      included.add(childId);
      queue.push(childId);
    }
  }
  return included;
}

export function entitiesForBusinessScope(
  entities: readonly EntitySummary[],
  businessId: string | null
): readonly EntitySummary[] {
  if (!businessId) return entities;
  const byId = new Map(entities.map((entity) => [entity.entity_id, entity]));
  const included = new Set(
    entities
      .filter((entity) => entity.assigned_business_id === businessId)
      .map((entity) => entity.entity_id)
  );
  for (const entityId of [...included]) {
    let current = byId.get(entityId);
    while (current?.parent_id) {
      included.add(current.parent_id);
      current = byId.get(current.parent_id);
    }
  }
  return entities.filter((entity) => included.has(entity.entity_id));
}

export function layoutCanonicalUniverse(entities: readonly EntitySummary[]): readonly UniversePoint[] {
  if (!entities.length) return [];

  const ordered = [...entities].sort(compareUniverseEntities);
  const byId = new Map(ordered.map((entity) => [entity.entity_id, entity]));
  const parentById = new Map<string, string | null>();

  for (const entity of ordered) {
    const parentId = entity.parent_id;
    parentById.set(
      entity.entity_id,
      parentId && parentId !== entity.entity_id && byId.has(parentId) ? parentId : null
    );
  }

  // Break malformed parent cycles deterministically so layout remains linear and total.
  const resolved = new Set<string>();
  for (const entity of ordered) {
    if (resolved.has(entity.entity_id)) continue;
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let currentId: string | null = entity.entity_id;

    while (currentId && !resolved.has(currentId)) {
      const cycleStart = pathIndex.get(currentId);
      if (cycleStart !== undefined) {
        const cycleRoot = path
          .slice(cycleStart)
          .map((entityId) => byId.get(entityId)!)
          .sort(compareUniverseEntities)[0]!;
        parentById.set(cycleRoot.entity_id, null);
        break;
      }
      pathIndex.set(currentId, path.length);
      path.push(currentId);
      currentId = parentById.get(currentId) ?? null;
    }
    for (const entityId of path) resolved.add(entityId);
  }

  const childrenByParent = new Map<string, EntitySummary[]>();
  for (const entity of ordered) {
    const parentId = parentById.get(entity.entity_id);
    if (!parentId) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(entity);
    childrenByParent.set(parentId, children);
  }
  for (const children of childrenByParent.values()) children.sort(compareUniverseEntities);

  const roots = ordered
    .filter((entity) => !parentById.get(entity.entity_id))
    .sort((left, right) =>
      universeRoleDepth[left.entity_type] - universeRoleDepth[right.entity_type]
      || compareUniverseEntities(left, right)
    );
  const subtreeUnits = new Map<string, number>();
  const depthById = new Map<string, number>();

  for (const root of roots) {
    const stack: Array<{ entity: EntitySummary; depth: number; visited: boolean }> = [
      { depth: 0, entity: root, visited: false }
    ];
    while (stack.length) {
      const current = stack.pop()!;
      if (current.visited) {
        const children = childrenByParent.get(current.entity.entity_id) ?? [];
        const childUnits = children.reduce(
          (sum, child) => sum + (subtreeUnits.get(child.entity_id) ?? 1),
          0
        );
        subtreeUnits.set(
          current.entity.entity_id,
          Math.max(1, childUnits + Math.max(0, children.length - 1) * siblingGapFor(current.entity))
        );
        continue;
      }

      depthById.set(current.entity.entity_id, current.depth);
      stack.push({ ...current, visited: true });
      const children = childrenByParent.get(current.entity.entity_id) ?? [];
      for (let index = children.length - 1; index >= 0; index -= 1) {
        stack.push({ depth: current.depth + 1, entity: children[index]!, visited: false });
      }
    }
  }

  const rawXById = new Map<string, number>();
  let componentLeft = 0;
  for (const root of roots) {
    const rootUnits = subtreeUnits.get(root.entity_id) ?? 1;
    const stack: Array<{ entity: EntitySummary; left: number }> = [
      { entity: root, left: componentLeft }
    ];
    while (stack.length) {
      const current = stack.pop()!;
      const units = subtreeUnits.get(current.entity.entity_id) ?? 1;
      rawXById.set(current.entity.entity_id, current.left + units / 2);
      const children = childrenByParent.get(current.entity.entity_id) ?? [];
      let childLeft = current.left;
      const placements: Array<{ entity: EntitySummary; left: number }> = [];
      for (const child of children) {
        placements.push({ entity: child, left: childLeft });
        childLeft += (subtreeUnits.get(child.entity_id) ?? 1) + siblingGapFor(current.entity);
      }
      for (let index = placements.length - 1; index >= 0; index -= 1) {
        stack.push(placements[index]!);
      }
    }
    componentLeft += rootUnits + UNIVERSE_COMPONENT_GAP;
  }

  const rawXs = [...rawXById.values()];
  const centerX = (Math.min(...rawXs) + Math.max(...rawXs)) / 2;
  const horizontalSpan = Math.max(UNIVERSE_HORIZONTAL_GAP, (Math.max(...rawXs) - Math.min(...rawXs)) * UNIVERSE_HORIZONTAL_GAP);
  const maximumDepth = Math.max(1, ...depthById.values());
  const verticalGap = Math.max(MIN_UNIVERSE_VERTICAL_GAP, horizontalSpan * 0.62 / maximumDepth);
  return ordered.map((entity) => ({
    entity,
    x: ((rawXById.get(entity.entity_id) ?? centerX) - centerX) * UNIVERSE_HORIZONTAL_GAP,
    y: (depthById.get(entity.entity_id) ?? universeRoleDepth[entity.entity_type]) * verticalGap
  }));
}

export function universeBounds(points: readonly UniversePoint[]): UniverseBounds | null {
  if (!points.length) return null;
  let minX = points[0]!.x;
  let maxX = minX;
  let minY = points[0]!.y;
  let maxY = minY;
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index]!;
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, maxX, minY, maxY };
}

export function fitUniverseCamera(
  points: readonly UniversePoint[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 80,
  maxZoom = 1.4
): UniverseCamera | null {
  const bounds = universeBounds(points);
  if (!bounds || viewportWidth <= 0 || viewportHeight <= 0) return null;
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const availableWidth = Math.max(1, viewportWidth - padding * 2);
  const availableHeight = Math.max(1, viewportHeight - padding * 2);
  const zoom = Math.max(
    MIN_UNIVERSE_ZOOM,
    Math.min(MAX_UNIVERSE_ZOOM, maxZoom, availableWidth / contentWidth, availableHeight / contentHeight)
  );
  return {
    x: -((bounds.minX + bounds.maxX) / 2) * zoom,
    y: padding - viewportHeight / 2 - bounds.minY * zoom,
    zoom
  };
}

export function nextUniverseEntityId(
  points: readonly UniversePoint[],
  selectedId: string | null,
  direction: UniverseDirection
): string | null {
  if (!points.length) return null;
  const pointById = new Map(points.map((point) => [point.entity.entity_id, point]));
  const ordered = [...points].sort((left, right) =>
    left.y - right.y
    || left.x - right.x
    || left.entity.stable_code.localeCompare(right.entity.stable_code)
  );
  const current = selectedId ? pointById.get(selectedId) : undefined;
  if (!current) {
    return ordered.find((point) => point.entity.entity_type === "ENTRAL")?.entity.entity_id
      ?? ordered[0]!.entity.entity_id;
  }

  if (direction === "up" && current.entity.parent_id && pointById.has(current.entity.parent_id)) {
    return current.entity.parent_id;
  }

  const children = points
    .filter((point) => point.entity.parent_id === current.entity.entity_id)
    .sort((left, right) =>
      Math.abs(left.x - current.x) - Math.abs(right.x - current.x)
      || left.entity.stable_code.localeCompare(right.entity.stable_code)
    );
  if (direction === "down" && children[0]) return children[0].entity.entity_id;

  if (direction === "left" || direction === "right") {
    const siblings = points.filter((point) =>
      point.entity.entity_id !== current.entity.entity_id
      && point.entity.parent_id === current.entity.parent_id
      && (direction === "left" ? point.x < current.x : point.x > current.x)
    );
    siblings.sort((left, right) =>
      Math.abs(left.x - current.x) + Math.abs(left.y - current.y) * 2
      - (Math.abs(right.x - current.x) + Math.abs(right.y - current.y) * 2)
      || left.entity.stable_code.localeCompare(right.entity.stable_code)
    );
    if (siblings[0]) return siblings[0].entity.entity_id;
  }

  const candidates = points.filter((point) => {
    if (point.entity.entity_id === current.entity.entity_id) return false;
    if (direction === "left") return point.x < current.x;
    if (direction === "right") return point.x > current.x;
    if (direction === "up") return point.y < current.y;
    return point.y > current.y;
  });
  const score = (point: UniversePoint) => {
    const dx = Math.abs(point.x - current.x);
    const dy = Math.abs(point.y - current.y);
    return direction === "left" || direction === "right" ? dx + dy * 2 : dy + dx * 2;
  };
  candidates.sort((left, right) =>
    score(left) - score(right)
    || left.entity.stable_code.localeCompare(right.entity.stable_code)
  );
  return candidates[0]?.entity.entity_id ?? current.entity.entity_id;
}

export function availableUniverseNavigationPoints(
  renderedPoints: readonly UniversePoint[],
  authorizedPoints: readonly UniversePoint[]
): readonly UniversePoint[] {
  return renderedPoints.length > 0 ? renderedPoints : authorizedPoints;
}

export function semanticUniverseIds(
  entities: readonly EntitySummary[],
  selectedId: string | null,
  zoom: number,
  unrelatedBudget = 3_000
): ReadonlySet<string> {
  const protectedIds = canonicalLineageAndSubtree(entities, selectedId);
  const included = new Set(protectedIds);
  const candidates = entities.filter((entity) => {
    if (protectedIds.has(entity.entity_id)) return false;
    if (zoom < 0.1) return entity.entity_type === "ENTRAL" || entity.entity_type === "MARSHAL";
    if (zoom < 0.24) return entity.entity_type !== "SOLDIER";
    return true;
  });
  for (const entity of candidates.slice(0, unrelatedBudget)) included.add(entity.entity_id);
  return included;
}

export function hierarchyDepths(entities: readonly EntitySummary[]): ReadonlyMap<string, number> {
  const byId = new Map(entities.map((entity) => [entity.entity_id, entity]));
  const result = new Map<string, number>();
  const resolve = (entity: EntitySummary, seen = new Set<string>()): number => {
    const known = result.get(entity.entity_id);
    if (known !== undefined) return known;
    if (!entity.parent_id || seen.has(entity.entity_id)) {
      result.set(entity.entity_id, universeRoleDepth[entity.entity_type]);
      return universeRoleDepth[entity.entity_type];
    }
    seen.add(entity.entity_id);
    const parent = byId.get(entity.parent_id);
    const depth = parent ? resolve(parent, seen) + 1 : universeRoleDepth[entity.entity_type];
    result.set(entity.entity_id, depth);
    return depth;
  };
  for (const entity of entities) resolve(entity);
  return result;
}
