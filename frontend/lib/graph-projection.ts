import {
  canonicalGraphEdgeId,
  GRAPH_PROJECTION_SCHEMA_VERSION,
  type GraphEntity as CanonicalGraphEntity,
  type GraphProjection as CanonicalGraphProjection,
  type EntitySummary
} from "@entral/contracts";
import {
  describeAuthority,
  stableGraphHash,
  type AuthorityDescriptor
} from "./graph-authority";

export type GraphRelationType =
  | "HIERARCHY"
  | "ASSIGNMENT"
  | "DEPENDENCY"
  | "COMMUNICATION"
  | "EVIDENCE"
  | string;

export type GraphProjectionInputEdge = {
  readonly edge_id?: string;
  readonly edgeId?: string;
  readonly source_id?: string;
  readonly sourceId?: string;
  readonly target_id?: string;
  readonly targetId?: string;
  readonly relation_type?: GraphRelationType;
  readonly relationType?: GraphRelationType;
};

export type ProjectedGraphEdge = {
  readonly edgeId: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly relationType: GraphRelationType;
  readonly parentEdge: boolean;
};

export type ProjectedGraphEntity = {
  /** Sanitized canonical entity. Parent IDs absent from this projection are removed. */
  readonly entity: EntitySummary;
  readonly canonicalEntity: CanonicalGraphEntity | null;
  readonly entityId: string;
  readonly parentId: string | null;
  readonly parentEdgeId: string | null;
  readonly childrenIds: readonly string[];
  readonly lineageIds: readonly string[];
  readonly depth: number;
  readonly domainId: string | null;
  readonly authority: AuthorityDescriptor;
};

export type GraphProjectionDiagnostic = {
  readonly code:
    | "PARENT_OUTSIDE_AUTHORIZED_PROJECTION"
    | "UNSUPPORTED_EDGE_OUTSIDE_AUTHORIZED_PROJECTION";
  readonly count: number;
};

export type RendererGraphProjection = {
  readonly schemaVersion: typeof GRAPH_PROJECTION_SCHEMA_VERSION;
  readonly projectionId: string;
  readonly scopeKey: string | null;
  readonly organizationId: string | null;
  readonly projectionVersion: number | null;
  readonly entities: readonly ProjectedGraphEntity[];
  readonly edges: readonly ProjectedGraphEdge[];
  readonly rootIds: readonly string[];
  readonly entityCount: number;
  readonly edgeCount: number;
  readonly diagnostics: readonly GraphProjectionDiagnostic[];
};

export type GraphProjectionIndex = {
  readonly entityById: ReadonlyMap<string, ProjectedGraphEntity>;
  readonly edgeById: ReadonlyMap<string, ProjectedGraphEdge>;
  readonly childrenByParentId: ReadonlyMap<string, readonly ProjectedGraphEntity[]>;
};

export class GraphProjectionError extends Error {
  readonly code:
    | "DUPLICATE_ENTITY_ID"
    | "DUPLICATE_EDGE_ID"
    | "INVALID_EDGE"
    | "PARENT_CYCLE";

  constructor(
    code: GraphProjectionError["code"],
    message: string
  ) {
    super(message);
    this.name = "GraphProjectionError";
    this.code = code;
  }
}

type CompatibleEntitySummary = EntitySummary & {
  readonly parent_edge_id?: unknown;
  readonly parentEdgeId?: unknown;
  readonly domain_id?: unknown;
  readonly domainId?: unknown;
};

function compareText(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareEntities(left: EntitySummary, right: EntitySummary) {
  return compareText(left.stable_code, right.stable_code)
    || compareText(left.entity_id, right.entity_id);
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function compatibleParentEdgeId(entity: EntitySummary) {
  const compatible = entity as CompatibleEntitySummary;
  return optionalString(compatible.parent_edge_id)
    ?? optionalString(compatible.parentEdgeId);
}

function compatibleDomainId(entity: EntitySummary) {
  const compatible = entity as CompatibleEntitySummary;
  return optionalString(compatible.domain_id)
    ?? optionalString(compatible.domainId);
}

function normalizeInputEdge(edge: GraphProjectionInputEdge): {
  readonly edgeId: string | null;
  readonly sourceId: string | null;
  readonly targetId: string | null;
  readonly relationType: GraphRelationType;
} {
  return {
    edgeId: optionalString(edge.edge_id) ?? optionalString(edge.edgeId),
    sourceId: optionalString(edge.source_id) ?? optionalString(edge.sourceId),
    targetId: optionalString(edge.target_id) ?? optionalString(edge.targetId),
    relationType: edge.relation_type ?? edge.relationType ?? "HIERARCHY"
  };
}

function projectionFingerprint(
  entities: readonly ProjectedGraphEntity[],
  edges: readonly ProjectedGraphEdge[],
  scopeKey: string | null
) {
  let hash = stableGraphHash(scopeKey ?? "authorized-scope");
  for (const node of entities) {
    hash = stableGraphHash(
      `${hash}:${node.entityId}:${node.entity.version}:${node.parentEdgeId ?? ""}`
    );
  }
  for (const edge of edges) {
    hash = stableGraphHash(
      `${hash}:${edge.edgeId}:${edge.sourceId}:${edge.targetId}:${edge.relationType}`
    );
  }
  return `graph-v${GRAPH_PROJECTION_SCHEMA_VERSION}-${hash.toString(16).padStart(8, "0")}`;
}

function assertAcyclic(
  orderedEntities: readonly EntitySummary[],
  parentById: ReadonlyMap<string, string | null>
) {
  const complete = new Set<string>();
  for (const entity of orderedEntities) {
    if (complete.has(entity.entity_id)) continue;
    const path: string[] = [];
    const pathIndex = new Map<string, number>();
    let currentId: string | null = entity.entity_id;
    while (currentId && !complete.has(currentId)) {
      if (pathIndex.has(currentId)) {
        throw new GraphProjectionError(
          "PARENT_CYCLE",
          "The authorized graph payload contains a parent cycle."
        );
      }
      pathIndex.set(currentId, path.length);
      path.push(currentId);
      currentId = parentById.get(currentId) ?? null;
    }
    for (const entityId of path) complete.add(entityId);
  }
}

function resolveLineage(
  entityId: string,
  parentById: ReadonlyMap<string, string | null>,
  cache: Map<string, readonly string[]>
): readonly string[] {
  const known = cache.get(entityId);
  if (known) return known;
  const unresolved: string[] = [];
  let currentId: string | null = entityId;
  while (currentId && !cache.has(currentId)) {
    unresolved.push(currentId);
    currentId = parentById.get(currentId) ?? null;
  }
  let lineage = currentId ? [...(cache.get(currentId) ?? [])] : [];
  for (let index = unresolved.length - 1; index >= 0; index -= 1) {
    lineage = [...lineage, unresolved[index]!];
    cache.set(unresolved[index]!, lineage);
  }
  return cache.get(entityId) ?? [entityId];
}

function resolveDomainId(
  entity: EntitySummary,
  lineageIds: readonly string[],
  entityById: ReadonlyMap<string, EntitySummary>
) {
  const explicit = compatibleDomainId(entity);
  if (explicit) return explicit;
  for (const lineageId of lineageIds) {
    const ancestor = entityById.get(lineageId);
    if (ancestor?.entity_type === "MARSHAL") return ancestor.entity_id;
  }
  return null;
}

export function buildRendererGraphProjection(
  entities: readonly EntitySummary[],
  options: {
    readonly edges?: readonly GraphProjectionInputEdge[];
    readonly scopeKey?: string | null;
    readonly organizationId?: string | null;
    readonly projectionVersion?: number | null;
    readonly authoritySpacingScale?: number;
    readonly authorityScoreInfluence?: number;
  } = {}
): RendererGraphProjection {
  const orderedEntities = [...entities].sort(compareEntities);
  const entityById = new Map<string, EntitySummary>();
  for (const entity of orderedEntities) {
    if (!entity.entity_id || entityById.has(entity.entity_id)) {
      throw new GraphProjectionError(
        "DUPLICATE_ENTITY_ID",
        "The authorized graph payload contains an empty or duplicate entity ID."
      );
    }
    entityById.set(entity.entity_id, entity);
  }

  const parentById = new Map<string, string | null>();
  let withheldParentCount = 0;
  for (const entity of orderedEntities) {
    const candidate = entity.parent_id;
    if (!candidate || candidate === entity.entity_id) {
      if (candidate === entity.entity_id) {
        throw new GraphProjectionError(
          "PARENT_CYCLE",
          "The authorized graph payload contains a self-parent cycle."
        );
      }
      parentById.set(entity.entity_id, null);
      continue;
    }
    if (!entityById.has(candidate)) {
      withheldParentCount += 1;
      parentById.set(entity.entity_id, null);
      continue;
    }
    parentById.set(entity.entity_id, candidate);
  }
  assertAcyclic(orderedEntities, parentById);

  const explicitEdges: ProjectedGraphEdge[] = [];
  const explicitParentEdgeByChildId = new Map<string, ProjectedGraphEdge>();
  const edgeIds = new Set<string>();
  let outsideEdgeCount = 0;
  for (const rawEdge of options.edges ?? []) {
    const normalized = normalizeInputEdge(rawEdge);
    if (!normalized.edgeId || !normalized.sourceId || !normalized.targetId) {
      throw new GraphProjectionError(
        "INVALID_EDGE",
        "The authorized graph payload contains an edge without a canonical ID or endpoint."
      );
    }
    if (!entityById.has(normalized.sourceId) || !entityById.has(normalized.targetId)) {
      outsideEdgeCount += 1;
      continue;
    }
    if (edgeIds.has(normalized.edgeId)) {
      throw new GraphProjectionError(
        "DUPLICATE_EDGE_ID",
        "The authorized graph payload contains a duplicate edge ID."
      );
    }
    edgeIds.add(normalized.edgeId);
    const parentEdge = normalized.relationType === "HIERARCHY"
      && parentById.get(normalized.targetId) === normalized.sourceId;
    const edge: ProjectedGraphEdge = {
      edgeId: normalized.edgeId,
      sourceId: normalized.sourceId,
      targetId: normalized.targetId,
      relationType: normalized.relationType,
      parentEdge
    };
    explicitEdges.push(edge);
    if (parentEdge && !explicitParentEdgeByChildId.has(normalized.targetId)) {
      explicitParentEdgeByChildId.set(normalized.targetId, edge);
    }
  }

  const parentEdgeIdByChildId = new Map<string, string>();
  const derivedParentEdges: ProjectedGraphEdge[] = [];
  for (const entity of orderedEntities) {
    const parentId = parentById.get(entity.entity_id) ?? null;
    if (!parentId) continue;
    const explicit = explicitParentEdgeByChildId.get(entity.entity_id);
    const compatibleId = compatibleParentEdgeId(entity);
    const edgeId = explicit?.edgeId
      ?? compatibleId
      ?? canonicalGraphEdgeId(parentId, entity.entity_id);
    if (!explicit) {
      if (edgeIds.has(edgeId)) {
        throw new GraphProjectionError(
          "DUPLICATE_EDGE_ID",
          "A canonical parent edge ID collides with another authorized edge."
        );
      }
      edgeIds.add(edgeId);
      derivedParentEdges.push({
        edgeId,
        sourceId: parentId,
        targetId: entity.entity_id,
        relationType: "HIERARCHY",
        parentEdge: true
      });
    }
    parentEdgeIdByChildId.set(entity.entity_id, edgeId);
  }

  const childrenByParentId = new Map<string, string[]>();
  for (const entity of orderedEntities) {
    const parentId = parentById.get(entity.entity_id);
    if (!parentId) continue;
    const children = childrenByParentId.get(parentId) ?? [];
    children.push(entity.entity_id);
    childrenByParentId.set(parentId, children);
  }
  for (const children of childrenByParentId.values()) {
    children.sort(compareText);
  }

  const lineageCache = new Map<string, readonly string[]>();
  const projectedEntities = orderedEntities.map((sourceEntity): ProjectedGraphEntity => {
    const parentId = parentById.get(sourceEntity.entity_id) ?? null;
    const entity: EntitySummary = parentId === sourceEntity.parent_id
      ? sourceEntity
      : { ...sourceEntity, parent_id: parentId };
    const lineageIds = resolveLineage(entity.entity_id, parentById, lineageCache);
    return {
      entity,
      canonicalEntity: null,
      entityId: entity.entity_id,
      parentId,
      parentEdgeId: parentEdgeIdByChildId.get(entity.entity_id) ?? null,
      childrenIds: childrenByParentId.get(entity.entity_id) ?? [],
      lineageIds,
      depth: Math.max(0, lineageIds.length - 1),
      domainId: resolveDomainId(entity, lineageIds, entityById),
      authority: describeAuthority(entity, {
        spacingScale: options.authoritySpacingScale,
        scoreInfluence: options.authorityScoreInfluence
      })
    };
  });

  const edges = [...explicitEdges, ...derivedParentEdges].sort((left, right) =>
    compareText(left.edgeId, right.edgeId)
  );
  const diagnostics: GraphProjectionDiagnostic[] = [];
  if (withheldParentCount) {
    diagnostics.push({
      code: "PARENT_OUTSIDE_AUTHORIZED_PROJECTION",
      count: withheldParentCount
    });
  }
  if (outsideEdgeCount) {
    diagnostics.push({
      code: "UNSUPPORTED_EDGE_OUTSIDE_AUTHORIZED_PROJECTION",
      count: outsideEdgeCount
    });
  }
  const scopeKey = options.scopeKey ?? null;
  return {
    schemaVersion: GRAPH_PROJECTION_SCHEMA_VERSION,
    projectionId: projectionFingerprint(projectedEntities, edges, scopeKey),
    scopeKey,
    organizationId: options.organizationId ?? null,
    projectionVersion: options.projectionVersion ?? null,
    entities: projectedEntities,
    edges,
    rootIds: projectedEntities
      .filter((node) => node.parentId === null)
      .map((node) => node.entityId),
    entityCount: projectedEntities.length,
    edgeCount: edges.length,
    diagnostics
  };
}

export function createGraphProjectionIndex(
  projection: RendererGraphProjection
): GraphProjectionIndex {
  const entityById = new Map(
    projection.entities.map((entity) => [entity.entityId, entity])
  );
  const edgeById = new Map(
    projection.edges.map((edge) => [edge.edgeId, edge])
  );
  const childrenByParentId = new Map<string, ProjectedGraphEntity[]>();
  for (const entity of projection.entities) {
    if (!entity.parentId) continue;
    const children = childrenByParentId.get(entity.parentId) ?? [];
    children.push(entity);
    childrenByParentId.set(entity.parentId, children);
  }
  for (const children of childrenByParentId.values()) {
    children.sort((left, right) => compareEntities(left.entity, right.entity));
  }
  return { entityById, edgeById, childrenByParentId };
}

export function filterGraphProjection(
  projection: RendererGraphProjection,
  requestedEntityIds: ReadonlySet<string>,
  options: {
    readonly includeAncestors?: boolean;
    readonly includeDescendants?: boolean;
  } = {}
): RendererGraphProjection {
  const index = createGraphProjectionIndex(projection);
  const included = new Set<string>();
  for (const entityId of requestedEntityIds) {
    if (index.entityById.has(entityId)) included.add(entityId);
  }
  if (options.includeAncestors ?? true) {
    for (const entityId of [...included]) {
      const lineage = index.entityById.get(entityId)?.lineageIds ?? [];
      for (const lineageId of lineage) included.add(lineageId);
    }
  }
  if (options.includeDescendants) {
    const queue = [...included];
    for (let indexOffset = 0; indexOffset < queue.length; indexOffset += 1) {
      const parentId = queue[indexOffset]!;
      for (const child of index.childrenByParentId.get(parentId) ?? []) {
        if (included.has(child.entityId)) continue;
        included.add(child.entityId);
        queue.push(child.entityId);
      }
    }
  }

  const entities = projection.entities
    .filter((node) => included.has(node.entityId))
    .map((node) => node.entity);
  const edges = projection.edges
    .filter((edge) => included.has(edge.sourceId) && included.has(edge.targetId))
    .map((edge): GraphProjectionInputEdge => ({
      edgeId: edge.edgeId,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      relationType: edge.relationType
    }));
  const filtered = buildRendererGraphProjection(entities, {
    edges,
    scopeKey: projection.scopeKey,
    organizationId: projection.organizationId,
    projectionVersion: projection.projectionVersion
  });
  const canonicalById = new Map(
    projection.entities.map((node) => [node.entityId, node.canonicalEntity])
  );
  return {
    ...filtered,
    rootIds: projection.rootIds.filter((entityId) => included.has(entityId)),
    entities: filtered.entities.map((node) => ({
      ...node,
      canonicalEntity: canonicalById.get(node.entityId) ?? null
    }))
  };
}

export function graphProjectionParityKey(projection: RendererGraphProjection) {
  const entityPart = projection.entities
    .map((node) =>
      [
        node.entityId,
        node.parentId ?? "",
        node.parentEdgeId ?? "",
        node.lineageIds.join(">"),
        node.domainId ?? "",
        node.authority.role,
        node.authority.tier,
        node.authority.normalizedScore,
        node.entity.status,
        node.entity.health
      ].join("|")
    )
    .join("\n");
  const edgePart = projection.edges
    .map((edge) =>
      `${edge.edgeId}|${edge.sourceId}|${edge.targetId}|${edge.relationType}`
    )
    .join("\n");
  return `${projection.entityCount}:${projection.edgeCount}:${stableGraphHash(`${entityPart}\n--\n${edgePart}`).toString(16)}`;
}

/**
 * Adapts the authoritative server contract into the renderer index without
 * changing any canonical entity, edge, authority, domain, or lineage ID.
 * Same-event hierarchy summaries may enrich detail-only fields for IDs that
 * already exist in the projection. Direct-child counts always come from the
 * projection's own parent relationships.
 */
export function adaptCanonicalGraphProjection(
  projection: CanonicalGraphProjection,
  alignedHierarchy?: {
    readonly entities: readonly EntitySummary[];
    readonly eventSequence: number;
  }
): RendererGraphProjection {
  const canonicalById = new Map(
    projection.entities.map((entity) => [entity.entity_id, entity])
  );
  const detailById = new Map(
    alignedHierarchy?.eventSequence
      === projection.evidence_version_reference.event_sequence
      ? alignedHierarchy.entities
        .filter((entity) => canonicalById.has(entity.entity_id))
        .map((entity) => [entity.entity_id, entity] as const)
      : []
  );
  const childCountById = new Map<string, number>();
  for (const entity of projection.entities) {
    if (!entity.parent_id || !canonicalById.has(entity.parent_id)) continue;
    childCountById.set(
      entity.parent_id,
      (childCountById.get(entity.parent_id) ?? 0) + 1
    );
  }
  const summaries = projection.entities.map((entity): EntitySummary => {
    const detail = detailById.get(entity.entity_id);
    return {
      active_alert: detail?.active_alert ?? null,
      active_task_count: detail?.active_task_count ?? 0,
      assigned_business_id: entity.business_id,
      authority_score: entity.authority_score,
      child_count: childCountById.get(entity.entity_id) ?? 0,
      compute_tier: detail?.compute_tier ?? null,
      current_mission: detail?.current_mission ?? null,
      domain_id: entity.domain_id,
      entity_id: entity.entity_id,
      entity_type: entity.entity_type,
      health: entity.health,
      latest_material_result: detail?.latest_material_result ?? null,
      model_class: detail?.model_class ?? null,
      name: entity.display_name,
      parent_edge_id: entity.parent_id
        ? canonicalGraphEdgeId(entity.parent_id, entity.entity_id)
        : null,
      parent_id: entity.parent_id,
      stable_code: entity.stable_code,
      status: entity.status,
      updated_at: detail?.updated_at ?? projection.generated_at,
      version: entity.version
    } as EntitySummary;
  });
  const adapted = buildRendererGraphProjection(summaries, {
    edges: projection.edges.map((edge) => ({
      edgeId: edge.edge_id,
      sourceId: edge.source_id,
      targetId: edge.target_id,
      relationType: edge.relation_type
    })),
    scopeKey: `organization:${projection.organization_id}`,
    organizationId: projection.organization_id,
    projectionVersion: projection.projection_version
  });
  return {
    ...adapted,
    rootIds: [projection.root_id],
    entities: adapted.entities.map((node) => ({
      ...node,
      canonicalEntity: canonicalById.get(node.entityId) ?? null
    }))
  };
}
