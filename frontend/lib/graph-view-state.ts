import type {
  EntityRole,
  EntityStatus,
  HealthState
} from "@entral/contracts";
import {
  createGraphProjectionIndex,
  type RendererGraphProjection as GraphProjection,
  type GraphRelationType
} from "./graph-projection";

export const GRAPH_ARRANGEMENTS = [
  "auto",
  "side-by-side",
  "stacked",
  "2d-only",
  "3d-only"
] as const;
export type GraphArrangement = (typeof GRAPH_ARRANGEMENTS)[number];

export type GraphFilters = {
  readonly entityTypes: readonly EntityRole[];
  readonly authorityLevels: readonly EntityRole[];
  readonly domainIds: readonly string[];
  readonly businessIds: readonly string[];
  readonly statuses: readonly EntityStatus[];
  readonly healthStates: readonly HealthState[];
  readonly relationTypes: readonly GraphRelationType[];
};

export type GraphNavigationSnapshot = {
  readonly selectedEntityId: string | null;
  readonly focusedEntityId: string | null;
  readonly isolatedEntityId: string | null;
  readonly expandedEntityIds: readonly string[];
};

export type GraphNavigationHistory = {
  readonly entries: readonly GraphNavigationSnapshot[];
  readonly index: number;
};

export type GraphViewState = GraphNavigationSnapshot & {
  readonly scopeKey: string | null;
  readonly arrangement: GraphArrangement;
  readonly searchQuery: string;
  readonly filters: GraphFilters;
  readonly breadcrumbEntityIds: readonly string[];
  readonly history: GraphNavigationHistory;
};

export type AuthorizedGraphDeepLink = {
  readonly scopeKey: string | null;
  readonly arrangement: GraphArrangement;
  readonly selectedEntityId: string | null;
  readonly searchQuery: string;
  readonly filters: GraphFilters;
};

export type GraphExpansionMode =
  | "ONE_LEVEL"
  | "DESCENDANTS"
  | "COLLAPSE_DESCENDANTS";

const MAX_HISTORY_ENTRIES = 100;
const MAX_QUERY_LENGTH = 200;
const MAX_FILTER_VALUES = 64;

export const EMPTY_GRAPH_FILTERS: GraphFilters = {
  entityTypes: [],
  authorityLevels: [],
  domainIds: [],
  businessIds: [],
  statuses: [],
  healthStates: [],
  relationTypes: []
};

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function uniqueSorted<T extends string>(
  values: readonly T[],
  allowed: ReadonlySet<string>
): readonly T[] {
  return [...new Set(values)]
    .filter((value) => allowed.has(value))
    .sort(compareText)
    .slice(0, MAX_FILTER_VALUES);
}

function authorizedFilterValues(projection: GraphProjection) {
  return {
    entityTypes: new Set(projection.entities.map((node) => node.entity.entity_type)),
    authorityLevels: new Set(projection.entities.map((node) => node.authority.role)),
    domainIds: new Set(
      projection.entities.flatMap((node) => node.domainId ? [node.domainId] : [])
    ),
    businessIds: new Set(
      projection.entities.flatMap((node) =>
        node.entity.assigned_business_id ? [node.entity.assigned_business_id] : []
      )
    ),
    statuses: new Set(projection.entities.map((node) => node.entity.status)),
    healthStates: new Set(projection.entities.map((node) => node.entity.health)),
    relationTypes: new Set(projection.edges.map((edge) => edge.relationType))
  };
}

export function normalizeGraphFilters(
  filters: Partial<GraphFilters>,
  projection: GraphProjection
): GraphFilters {
  const allowed = authorizedFilterValues(projection);
  return {
    entityTypes: uniqueSorted(filters.entityTypes ?? [], allowed.entityTypes),
    authorityLevels: uniqueSorted(
      filters.authorityLevels ?? [],
      allowed.authorityLevels
    ),
    domainIds: uniqueSorted(filters.domainIds ?? [], allowed.domainIds),
    businessIds: uniqueSorted(filters.businessIds ?? [], allowed.businessIds),
    statuses: uniqueSorted(filters.statuses ?? [], allowed.statuses),
    healthStates: uniqueSorted(filters.healthStates ?? [], allowed.healthStates),
    relationTypes: uniqueSorted(
      filters.relationTypes ?? [],
      allowed.relationTypes
    )
  };
}

function rootEntityId(projection: GraphProjection) {
  return projection.entities.find((node) => node.entity.entity_type === "ENTRAL")
    ?.entityId
    ?? projection.rootIds[0]
    ?? null;
}

function authorizedEntityId(
  projection: GraphProjection,
  candidate: string | null | undefined
) {
  if (!candidate) return null;
  return projection.entities.some((node) => node.entityId === candidate)
    ? candidate
    : null;
}

function breadcrumbFor(
  projection: GraphProjection,
  focusedEntityId: string | null,
  selectedEntityId: string | null
) {
  const index = createGraphProjectionIndex(projection);
  const targetId = focusedEntityId ?? selectedEntityId;
  return targetId
    ? index.entityById.get(targetId)?.lineageIds ?? []
    : [];
}

function snapshot(state: GraphNavigationSnapshot): GraphNavigationSnapshot {
  return {
    selectedEntityId: state.selectedEntityId,
    focusedEntityId: state.focusedEntityId,
    isolatedEntityId: state.isolatedEntityId,
    expandedEntityIds: [...state.expandedEntityIds].sort(compareText)
  };
}

function snapshotsEqual(
  left: GraphNavigationSnapshot,
  right: GraphNavigationSnapshot
) {
  return left.selectedEntityId === right.selectedEntityId
    && left.focusedEntityId === right.focusedEntityId
    && left.isolatedEntityId === right.isolatedEntityId
    && left.expandedEntityIds.length === right.expandedEntityIds.length
    && left.expandedEntityIds.every(
      (entityId, index) => entityId === right.expandedEntityIds[index]
    );
}

function reuseEqualStrings(
  current: readonly string[],
  next: readonly string[]
): readonly string[] {
  // Visibility consumers key off these immutable arrays. Preserve identity
  // when navigation changes selection/history but not branch membership.
  return current.length === next.length
    && current.every((value, index) => value === next[index])
    ? current
    : next;
}

function graphFiltersEqual(left: GraphFilters, right: GraphFilters) {
  return reuseEqualStrings(left.entityTypes, right.entityTypes) === left.entityTypes
    && reuseEqualStrings(
      left.authorityLevels,
      right.authorityLevels
    ) === left.authorityLevels
    && reuseEqualStrings(left.domainIds, right.domainIds) === left.domainIds
    && reuseEqualStrings(left.businessIds, right.businessIds) === left.businessIds
    && reuseEqualStrings(left.statuses, right.statuses) === left.statuses
    && reuseEqualStrings(left.healthStates, right.healthStates) === left.healthStates
    && reuseEqualStrings(
      left.relationTypes,
      right.relationTypes
    ) === left.relationTypes;
}

function withHistory(
  state: GraphViewState,
  projection: GraphProjection,
  nextSnapshot: GraphNavigationSnapshot,
  recordHistory = true
): GraphViewState {
  const snapshotValue = snapshot(nextSnapshot);
  const normalized = {
    ...snapshotValue,
    expandedEntityIds: reuseEqualStrings(
      state.expandedEntityIds,
      snapshotValue.expandedEntityIds
    )
  };
  let history = state.history;
  if (recordHistory) {
    const current = history.entries[history.index];
    if (!current || !snapshotsEqual(current, normalized)) {
      const entries = [
        ...history.entries.slice(0, history.index + 1),
        normalized
      ].slice(-MAX_HISTORY_ENTRIES);
      history = { entries, index: entries.length - 1 };
    }
  }
  return {
    ...state,
    ...normalized,
    breadcrumbEntityIds: breadcrumbFor(
      projection,
      normalized.focusedEntityId,
      normalized.selectedEntityId
    ),
    history
  };
}

export function createGraphViewState(
  projection: GraphProjection,
  options: {
    readonly selectedEntityId?: string | null;
    readonly focusedEntityId?: string | null;
    readonly expandedEntityIds?: readonly string[];
    readonly isolatedEntityId?: string | null;
    readonly searchQuery?: string;
    readonly filters?: Partial<GraphFilters>;
    readonly arrangement?: GraphArrangement;
    readonly scopeKey?: string | null;
  } = {}
): GraphViewState {
  const projectionIndex = createGraphProjectionIndex(projection);
  const allowedIds = new Set(projection.entities.map((node) => node.entityId));
  const defaultEntityId = options.selectedEntityId === null
    ? null
    : authorizedEntityId(projection, options.selectedEntityId)
      ?? rootEntityId(projection);
  const selectedEntityId = defaultEntityId;
  const focusedEntityId = options.focusedEntityId === null
    ? null
    : authorizedEntityId(projection, options.focusedEntityId)
      ?? selectedEntityId;
  const isolatedEntityId = authorizedEntityId(
    projection,
    options.isolatedEntityId
  );
  // The accepted production graph opens with the complete authorized
  // hierarchy visible (132 entities today). Expansion state represents branch
  // disclosure, not a license for either renderer to truncate the canonical
  // default projection.
  const defaultExpandedEntityIds = projection.entities
    .filter((node) =>
      node.childrenIds.length > 0
      && node.entity.entity_type !== "ENTRAL"
    )
    .map((node) => node.entityId);
  const expandedEntityIds = [...new Set(
    options.expandedEntityIds ?? defaultExpandedEntityIds
  )]
    .filter((entityId) => allowedIds.has(entityId))
    .sort(compareText);
  const initialSnapshot = snapshot({
    selectedEntityId,
    focusedEntityId,
    isolatedEntityId,
    expandedEntityIds
  });
  const arrangement = GRAPH_ARRANGEMENTS.includes(
    options.arrangement as GraphArrangement
  )
    ? options.arrangement!
    : "auto";
  return {
    ...initialSnapshot,
    scopeKey: options.scopeKey ?? projection.scopeKey,
    arrangement,
    searchQuery: (options.searchQuery ?? "").slice(0, MAX_QUERY_LENGTH),
    filters: normalizeGraphFilters(options.filters ?? {}, projection),
    breadcrumbEntityIds: breadcrumbFor(
      projection,
      focusedEntityId,
      selectedEntityId
    ),
    history: { entries: [initialSnapshot], index: 0 }
  };
}

export function selectGraphEntity(
  state: GraphViewState,
  projection: GraphProjection,
  entityId: string,
  options: {
    readonly synchronizeFocus?: boolean;
    readonly recordHistory?: boolean;
  } = {}
) {
  const selectedEntityId = authorizedEntityId(projection, entityId);
  if (!selectedEntityId) return state;
  const index = createGraphProjectionIndex(projection);
  const expandedEntityIds = new Set(state.expandedEntityIds);
  for (const lineageId of index.entityById.get(selectedEntityId)?.lineageIds ?? []) {
    if (
      index.entityById.get(lineageId)?.childrenIds.length
      && index.entityById.get(lineageId)?.entity.entity_type !== "ENTRAL"
    ) {
      expandedEntityIds.add(lineageId);
    }
  }
  return withHistory(state, projection, {
    selectedEntityId,
    focusedEntityId: options.synchronizeFocus === false
      ? state.focusedEntityId
      : selectedEntityId,
    isolatedEntityId: state.isolatedEntityId,
    expandedEntityIds: [...expandedEntityIds]
  }, options.recordHistory ?? true);
}

export function focusGraphEntity(
  state: GraphViewState,
  projection: GraphProjection,
  entityId: string,
  options: { readonly recordHistory?: boolean } = {}
) {
  const focusedEntityId = authorizedEntityId(projection, entityId);
  if (!focusedEntityId) return state;
  const index = createGraphProjectionIndex(projection);
  const expandedEntityIds = new Set(state.expandedEntityIds);
  for (const lineageId of index.entityById.get(focusedEntityId)?.lineageIds ?? []) {
    if (
      index.entityById.get(lineageId)?.childrenIds.length
      && index.entityById.get(lineageId)?.entity.entity_type !== "ENTRAL"
    ) {
      expandedEntityIds.add(lineageId);
    }
  }
  return withHistory(state, projection, {
    selectedEntityId: state.selectedEntityId,
    focusedEntityId,
    isolatedEntityId: state.isolatedEntityId,
    expandedEntityIds: [...expandedEntityIds]
  }, options.recordHistory ?? true);
}

export function clearGraphSelection(
  state: GraphViewState,
  projection: GraphProjection
) {
  return withHistory(state, projection, {
    selectedEntityId: null,
    focusedEntityId: null,
    isolatedEntityId: state.isolatedEntityId,
    expandedEntityIds: state.expandedEntityIds
  });
}

export function resetGraphNavigation(
  state: GraphViewState,
  projection: GraphProjection
) {
  const rootId = rootEntityId(projection);
  const expandedEntityIds = projection.entities
    .filter((node) =>
      node.childrenIds.length > 0
      && node.entity.entity_type !== "ENTRAL"
    )
    .map((node) => node.entityId);
  return withHistory(state, projection, {
    selectedEntityId: rootId,
    focusedEntityId: rootId,
    isolatedEntityId: null,
    expandedEntityIds
  });
}

export function collapseGraphToTopLevel(
  state: GraphViewState,
  projection: GraphProjection
) {
  return withHistory(state, projection, {
    selectedEntityId: state.selectedEntityId,
    focusedEntityId: state.focusedEntityId,
    isolatedEntityId: state.isolatedEntityId,
    expandedEntityIds: []
  });
}

export function phase200GraphLabelBudget(
  viewportWidth: number,
  configuredMaximum: number
) {
  const viewportBudget = viewportWidth <= 360
    ? 8
    : viewportWidth <= 390
      ? 10
      : viewportWidth <= 412
        ? 12
        : viewportWidth <= 430
          ? 14
          : viewportWidth <= 767
            ? 20
            : configuredMaximum;
  return Math.max(1, Math.min(configuredMaximum, viewportBudget));
}

export function navigateGraphParent(
  state: GraphViewState,
  projection: GraphProjection
) {
  const index = createGraphProjectionIndex(projection);
  const currentId = state.focusedEntityId ?? state.selectedEntityId;
  const parentId = currentId
    ? index.entityById.get(currentId)?.parentId ?? null
    : null;
  return parentId
    ? selectGraphEntity(state, projection, parentId)
    : state;
}

export function navigateGraphHistory(
  state: GraphViewState,
  projection: GraphProjection,
  direction: "BACK" | "FORWARD"
) {
  const delta = direction === "BACK" ? -1 : 1;
  const nextIndex = Math.min(
    state.history.entries.length - 1,
    Math.max(0, state.history.index + delta)
  );
  if (nextIndex === state.history.index) return state;
  const next = state.history.entries[nextIndex]!;
  return {
    ...state,
    ...next,
    breadcrumbEntityIds: breadcrumbFor(
      projection,
      next.focusedEntityId,
      next.selectedEntityId
    ),
    history: { ...state.history, index: nextIndex }
  };
}

function descendantsOf(
  projection: GraphProjection,
  entityId: string
): readonly string[] {
  const index = createGraphProjectionIndex(projection);
  const descendants: string[] = [];
  const queue = [entityId];
  for (let offset = 0; offset < queue.length; offset += 1) {
    for (const child of index.childrenByParentId.get(queue[offset]!) ?? []) {
      descendants.push(child.entityId);
      queue.push(child.entityId);
    }
  }
  return descendants;
}

export function setGraphExpansion(
  state: GraphViewState,
  projection: GraphProjection,
  entityId: string,
  mode: GraphExpansionMode
) {
  if (!authorizedEntityId(projection, entityId)) return state;
  const index = createGraphProjectionIndex(projection);
  const expanded = new Set(state.expandedEntityIds);
  if (mode === "ONE_LEVEL") {
    expanded.add(entityId);
  } else if (mode === "DESCENDANTS") {
    expanded.add(entityId);
    for (const descendantId of descendantsOf(projection, entityId)) {
      if (index.entityById.get(descendantId)?.childrenIds.length) {
        expanded.add(descendantId);
      }
    }
  } else {
    expanded.delete(entityId);
    for (const descendantId of descendantsOf(projection, entityId)) {
      expanded.delete(descendantId);
    }
  }
  return withHistory(state, projection, {
    selectedEntityId: state.selectedEntityId,
    focusedEntityId: state.focusedEntityId,
    isolatedEntityId: state.isolatedEntityId,
    expandedEntityIds: [...expanded]
  });
}

export function isolateGraphLineage(
  state: GraphViewState,
  projection: GraphProjection,
  entityId: string | null
) {
  const isolatedEntityId = entityId
    ? authorizedEntityId(projection, entityId)
    : null;
  if (entityId && !isolatedEntityId) return state;
  return withHistory(state, projection, {
    selectedEntityId: state.selectedEntityId,
    focusedEntityId: state.focusedEntityId,
    isolatedEntityId,
    expandedEntityIds: state.expandedEntityIds
  });
}

export function updateGraphSearch(
  state: GraphViewState,
  searchQuery: string
): GraphViewState {
  return {
    ...state,
    searchQuery: searchQuery.slice(0, MAX_QUERY_LENGTH)
  };
}

export function updateGraphFilters(
  state: GraphViewState,
  projection: GraphProjection,
  filters: Partial<GraphFilters>
): GraphViewState {
  return {
    ...state,
    filters: normalizeGraphFilters(filters, projection)
  };
}

function setMatches<T extends string>(
  values: readonly T[],
  candidate: T | null
) {
  return values.length === 0 || (candidate !== null && values.includes(candidate));
}

export function visibleGraphEntityIds(
  projection: GraphProjection,
  state: Pick<
    GraphViewState,
    "searchQuery" | "filters" | "isolatedEntityId" | "expandedEntityIds"
  >
): ReadonlySet<string> {
  const query = state.searchQuery.trim().toLocaleLowerCase();
  const requested = new Set<string>();
  for (const node of projection.entities) {
    const entity = node.entity;
    const searchable = [
      entity.name,
      entity.stable_code,
      entity.entity_type,
      entity.status,
      entity.health,
      node.domainId ?? "",
      entity.assigned_business_id ?? ""
    ].join(" ").toLocaleLowerCase();
    if (query && !searchable.includes(query)) continue;
    if (!setMatches(state.filters.entityTypes, entity.entity_type)) continue;
    if (!setMatches(state.filters.authorityLevels, node.authority.role)) continue;
    if (!setMatches(state.filters.domainIds, node.domainId)) continue;
    if (!setMatches(state.filters.businessIds, entity.assigned_business_id)) continue;
    if (!setMatches(state.filters.statuses, entity.status)) continue;
    if (!setMatches(state.filters.healthStates, entity.health)) continue;
    requested.add(node.entityId);
  }

  if (state.filters.relationTypes.length) {
    const connected = new Set<string>();
    for (const edge of projection.edges) {
      if (!state.filters.relationTypes.includes(edge.relationType)) continue;
      connected.add(edge.sourceId);
      connected.add(edge.targetId);
    }
    for (const entityId of [...requested]) {
      if (!connected.has(entityId)) requested.delete(entityId);
    }
  }

  const index = createGraphProjectionIndex(projection);
  if (state.isolatedEntityId) {
    const isolated = index.entityById.get(state.isolatedEntityId);
    const allowed = new Set(isolated?.lineageIds ?? []);
    for (const descendantId of descendantsOf(
      projection,
      state.isolatedEntityId
    )) {
      allowed.add(descendantId);
    }
    for (const entityId of [...requested]) {
      if (!allowed.has(entityId)) requested.delete(entityId);
    }
  }

  const filtersActive = Object.values(state.filters).some(
    (values) => values.length > 0
  );
  if (!query && !filtersActive && !state.isolatedEntityId) {
    const expanded = new Set(state.expandedEntityIds);
    for (const entityId of [...requested]) {
      const node = index.entityById.get(entityId);
      if (!node || node.parentId === null) continue;
      const ancestorIds = node.lineageIds.slice(0, -1);
      if (ancestorIds.some((ancestorId) => {
        const ancestor = index.entityById.get(ancestorId);
        return ancestor?.entity.entity_type !== "ENTRAL" && !expanded.has(ancestorId);
      })) {
        requested.delete(entityId);
      }
    }
  }

  // Keep the canonical path to every match visible without introducing any ID
  // that was not already present in the authorized projection.
  for (const entityId of [...requested]) {
    for (const lineageId of index.entityById.get(entityId)?.lineageIds ?? []) {
      requested.add(lineageId);
    }
  }
  return requested;
}

export function reconcileGraphViewState(
  state: GraphViewState,
  projection: GraphProjection,
  options: {
    readonly selectedEntityId?: string | null;
    readonly filters?: Partial<GraphFilters>;
    readonly scopeKey?: string | null;
  } = {}
): GraphViewState {
  const selectedEntityId = options.selectedEntityId === undefined
    ? state.selectedEntityId
    : options.selectedEntityId;
  const reconciled = createGraphViewState(projection, {
    arrangement: state.arrangement,
    expandedEntityIds: state.expandedEntityIds,
    filters: options.filters ?? state.filters,
    focusedEntityId: state.focusedEntityId,
    isolatedEntityId: state.isolatedEntityId,
    searchQuery: state.searchQuery,
    selectedEntityId,
    scopeKey: options.scopeKey ?? state.scopeKey
  });
  const allowedIds = new Set(projection.entities.map((node) => node.entityId));
  const entries = state.history.entries
    .map((entry) => snapshot({
      selectedEntityId: entry.selectedEntityId && allowedIds.has(entry.selectedEntityId)
        ? entry.selectedEntityId
        : null,
      focusedEntityId: entry.focusedEntityId && allowedIds.has(entry.focusedEntityId)
        ? entry.focusedEntityId
        : null,
      isolatedEntityId: entry.isolatedEntityId && allowedIds.has(entry.isolatedEntityId)
        ? entry.isolatedEntityId
        : null,
      expandedEntityIds: entry.expandedEntityIds.filter((entityId) => allowedIds.has(entityId))
    }))
    .slice(-MAX_HISTORY_ENTRIES);
  const history = entries.length
    ? {
      entries,
      index: Math.min(entries.length - 1, Math.max(0, state.history.index))
    }
    : reconciled.history;
  const filters = graphFiltersEqual(state.filters, reconciled.filters)
    ? state.filters
    : reconciled.filters;
  return {
    ...reconciled,
    expandedEntityIds: reuseEqualStrings(
      state.expandedEntityIds,
      reconciled.expandedEntityIds
    ),
    filters,
    history
  };
}

function parseList(params: URLSearchParams, key: string) {
  return params.getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_FILTER_VALUES);
}

export function parseAuthorizedGraphDeepLink(
  input: string | URLSearchParams,
  projection: GraphProjection,
  options: {
    readonly allowedScopeKeys?: readonly string[];
    readonly defaultArrangement?: GraphArrangement;
  } = {}
): AuthorizedGraphDeepLink {
  const params = typeof input === "string"
    ? new URLSearchParams(input.startsWith("?") ? input.slice(1) : input)
    : input;
  const allowedScopes = new Set(
    options.allowedScopeKeys
      ?? (projection.scopeKey ? [projection.scopeKey] : [])
  );
  const requestedScope = params.get("scope");
  const scopeKey = requestedScope && allowedScopes.has(requestedScope)
    ? requestedScope
    : projection.scopeKey;
  const requestedArrangement = params.get("arrangement") as GraphArrangement | null;
  const arrangement = requestedArrangement
    && GRAPH_ARRANGEMENTS.includes(requestedArrangement)
    ? requestedArrangement
    : options.defaultArrangement ?? "auto";
  const filters = normalizeGraphFilters({
    entityTypes: parseList(params, "type") as EntityRole[],
    authorityLevels: parseList(params, "authority") as EntityRole[],
    domainIds: parseList(params, "domain"),
    businessIds: parseList(params, "business"),
    statuses: parseList(params, "status") as EntityStatus[],
    healthStates: parseList(params, "health") as HealthState[],
    relationTypes: parseList(params, "relation")
  }, projection);
  return {
    scopeKey,
    arrangement,
    selectedEntityId: authorizedEntityId(projection, params.get("entity")),
    searchQuery: (params.get("q") ?? "").slice(0, MAX_QUERY_LENGTH),
    filters
  };
}

function appendList(
  params: URLSearchParams,
  key: string,
  values: readonly string[]
) {
  if (values.length) params.set(key, values.join(","));
}

export function serializeAuthorizedGraphDeepLink(
  state: Pick<
    GraphViewState,
    "scopeKey" | "arrangement" | "selectedEntityId" | "searchQuery" | "filters"
  >,
  projection: GraphProjection,
  options: { readonly allowedScopeKeys?: readonly string[] } = {}
) {
  const normalizedFilters = normalizeGraphFilters(state.filters, projection);
  const params = new URLSearchParams();
  const allowedScopes = new Set(
    options.allowedScopeKeys
      ?? (projection.scopeKey ? [projection.scopeKey] : [])
  );
  if (state.scopeKey && allowedScopes.has(state.scopeKey)) {
    params.set("scope", state.scopeKey);
  }
  if (GRAPH_ARRANGEMENTS.includes(state.arrangement)) {
    params.set("arrangement", state.arrangement);
  }
  const selectedEntityId = authorizedEntityId(
    projection,
    state.selectedEntityId
  );
  if (selectedEntityId) params.set("entity", selectedEntityId);
  const query = state.searchQuery.trim().slice(0, MAX_QUERY_LENGTH);
  if (query) params.set("q", query);
  appendList(params, "type", normalizedFilters.entityTypes);
  appendList(params, "authority", normalizedFilters.authorityLevels);
  appendList(params, "domain", normalizedFilters.domainIds);
  appendList(params, "business", normalizedFilters.businessIds);
  appendList(params, "status", normalizedFilters.statuses);
  appendList(params, "health", normalizedFilters.healthStates);
  appendList(params, "relation", normalizedFilters.relationTypes);
  return params;
}

export function applyAuthorizedGraphDeepLink(
  state: GraphViewState,
  deepLink: AuthorizedGraphDeepLink,
  projection: GraphProjection
): GraphViewState {
  const selectedEntityId = authorizedEntityId(
    projection,
    deepLink.selectedEntityId
  );
  const next = {
    ...state,
    scopeKey: deepLink.scopeKey,
    arrangement: deepLink.arrangement,
    searchQuery: deepLink.searchQuery.slice(0, MAX_QUERY_LENGTH),
    filters: normalizeGraphFilters(deepLink.filters, projection)
  };
  return selectedEntityId
    ? selectGraphEntity(next, projection, selectedEntityId)
    : next;
}
