import type { EntityRole, EntitySummary } from "@entral/contracts";

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
  const roles = new Map<EntityRole, EntitySummary[]>();
  for (const entity of entities) {
    const group = roles.get(entity.entity_type) ?? [];
    group.push(entity);
    roles.set(entity.entity_type, group);
  }

  const points: UniversePoint[] = [];
  for (const role of ["ENTRAL", "MARSHAL", "GENERAL", "COMMANDER", "SOLDIER"] as const) {
    const group = (roles.get(role) ?? []).sort((left, right) =>
      left.stable_code.localeCompare(right.stable_code)
    );
    const spacing = role === "SOLDIER" ? 18 : role === "COMMANDER" ? 26 : 54;
    const rows = Math.max(1, Math.ceil(Math.sqrt(group.length)));
    const columnSpacing = role === "SOLDIER" ? 16 : role === "COMMANDER" ? 20 : 28;
    for (const [index, entity] of group.entries()) {
      const column = Math.floor(index / rows);
      const row = index % rows;
      const rowsInColumn = Math.min(rows, group.length - column * rows);
      points.push({
        entity,
        x: universeRoleDepth[role] * 700 + column * columnSpacing,
        y: (row - (rowsInColumn - 1) / 2) * spacing
      });
    }
  }
  return points;
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
  const zoom = Math.min(maxZoom, availableWidth / contentWidth, availableHeight / contentHeight);
  return {
    x: -((bounds.minX + bounds.maxX) / 2) * zoom,
    y: -((bounds.minY + bounds.maxY) / 2) * zoom,
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
    left.x - right.x
    || left.y - right.y
    || left.entity.stable_code.localeCompare(right.entity.stable_code)
  );
  const current = selectedId ? pointById.get(selectedId) : undefined;
  if (!current) return ordered[0]!.entity.entity_id;

  if (direction === "left" && current.entity.parent_id && pointById.has(current.entity.parent_id)) {
    return current.entity.parent_id;
  }

  const children = points
    .filter((point) => point.entity.parent_id === current.entity.entity_id)
    .sort((left, right) =>
      Math.abs(left.y - current.y) - Math.abs(right.y - current.y)
      || left.entity.stable_code.localeCompare(right.entity.stable_code)
    );
  if (direction === "right" && children[0]) return children[0].entity.entity_id;

  if (direction === "up" || direction === "down") {
    const siblings = points.filter((point) =>
      point.entity.entity_id !== current.entity.entity_id
      && point.entity.parent_id === current.entity.parent_id
      && (direction === "up" ? point.y < current.y : point.y > current.y)
    );
    siblings.sort((left, right) =>
      Math.abs(left.y - current.y) + Math.abs(left.x - current.x) * 2
      - (Math.abs(right.y - current.y) + Math.abs(right.x - current.x) * 2)
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
