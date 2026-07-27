import {
  canonicalGraphEdgeId,
  canonicalGraphPreferenceSettings,
  type GraphProjection,
  type GraphViewPreferences,
  type EntityRole,
  type EntityStatus,
  type EntitySummary,
  type HealthState
} from "@entral/contracts";

export const PHASE195_ORGANIZATION_ID = "19500000-0000-4000-8000-000000000001";
export const PHASE195_USER_ID = "19500000-0000-4000-8000-000000000002";
export const PHASE195_PREFERENCE_ID = "19500000-0000-4000-8000-000000000003";
export const PHASE195_TIMESTAMP = "2026-07-26T19:00:00.000Z";

const authorityTier: Readonly<Record<EntityRole, 0 | 1 | 2 | 3 | 4>> = {
  ENTRAL: 0,
  MARSHAL: 1,
  GENERAL: 2,
  COMMANDER: 3,
  SOLDIER: 4
};

export function graphEntity(
  entityId: string,
  role: EntityRole,
  parentId: string | null,
  options: {
    readonly authorityScore?: number;
    readonly businessId?: string | null;
    readonly domainId?: string | null;
    readonly health?: HealthState;
    readonly status?: EntityStatus;
    readonly parentEdgeId?: string;
  } = {}
): EntitySummary {
  return {
    active_alert: null,
    active_task_count: 0,
    assigned_business_id: options.businessId ?? null,
    authority_score: options.authorityScore,
    child_count: 0,
    compute_tier: null,
    current_mission: null,
    domain_id: options.domainId,
    entity_id: entityId,
    entity_type: role,
    health: options.health ?? "HEALTHY",
    latest_material_result: null,
    model_class: null,
    name: entityId,
    parent_edge_id: options.parentEdgeId,
    parent_id: parentId,
    stable_code: entityId,
    status: options.status ?? "ACTIVE",
    updated_at: "2026-07-26T00:00:00.000Z",
    version: 1
  } as EntitySummary;
}

export function authorityHierarchy() {
  return [
    graphEntity("entral", "ENTRAL", null, { authorityScore: 1 }),
    graphEntity("marshal-a", "MARSHAL", "entral", { authorityScore: 0.9 }),
    graphEntity("marshal-b", "MARSHAL", "entral", { authorityScore: 0.2 }),
    graphEntity("general-a", "GENERAL", "marshal-a", {
      authorityScore: 0.8,
      businessId: "business-a"
    }),
    graphEntity("general-b", "GENERAL", "marshal-b", {
      authorityScore: 0.3,
      businessId: "business-b"
    }),
    graphEntity("commander-a", "COMMANDER", "general-a", {
      authorityScore: 0.7,
      businessId: "business-a"
    }),
    graphEntity("commander-b", "COMMANDER", "general-b", {
      authorityScore: 0.4,
      businessId: "business-b"
    }),
    graphEntity("soldier-a", "SOLDIER", "commander-a", {
      authorityScore: 0.6,
      businessId: "business-a"
    }),
    graphEntity("soldier-b", "SOLDIER", "commander-b", {
      authorityScore: 0.1,
      businessId: "business-b",
      health: "WATCH",
      status: "PAUSED"
    })
  ];
}

export function current132EntityFixture() {
  const entities: EntitySummary[] = [
    graphEntity("entral", "ENTRAL", null, { authorityScore: 1 })
  ];
  for (let marshalIndex = 0; marshalIndex < 8; marshalIndex += 1) {
    const marshalId = `marshal-${String(marshalIndex).padStart(2, "0")}`;
    entities.push(graphEntity(marshalId, "MARSHAL", "entral", {
      authorityScore: 1 - marshalIndex / 10
    }));
  }
  for (let generalIndex = 0; generalIndex < 123; generalIndex += 1) {
    const marshalId = `marshal-${String(generalIndex % 8).padStart(2, "0")}`;
    entities.push(graphEntity(
      `general-${String(generalIndex).padStart(3, "0")}`,
      "GENERAL",
      marshalId,
      {
        authorityScore: (generalIndex % 17) / 16,
        businessId: `business-${String(generalIndex).padStart(3, "0")}`
      }
    ));
  }
  return entities;
}

export function largeCanonicalFixture(entityCount = 10_000) {
  const entities: EntitySummary[] = [
    graphEntity("entral", "ENTRAL", null, { authorityScore: 1 })
  ];
  const marshalCount = Math.min(8, Math.max(1, entityCount - 1));
  for (let index = 0; index < marshalCount; index += 1) {
    entities.push(graphEntity(
      `marshal-${String(index).padStart(2, "0")}`,
      "MARSHAL",
      "entral",
      { authorityScore: 1 - index / marshalCount }
    ));
  }
  for (let index = entities.length; index < entityCount; index += 1) {
    const marshalIndex = index % marshalCount;
    entities.push(graphEntity(
      `soldier-${String(index).padStart(5, "0")}`,
      "SOLDIER",
      `marshal-${String(marshalIndex).padStart(2, "0")}`,
      {
        authorityScore: (index % 101) / 100,
        businessId: `business-${index % 500}`
      }
    ));
  }
  return entities;
}

export function canonicalProjectionFixture(
  entities: readonly EntitySummary[] = authorityHierarchy(),
  options: {
    readonly organizationId?: string;
    readonly projectionVersion?: number;
  } = {}
): GraphProjection {
  const organizationId = options.organizationId ?? PHASE195_ORGANIZATION_ID;
  const projectionVersion = options.projectionVersion ?? 195;
  const byId = new Map(entities.map((entity) => [entity.entity_id, entity]));
  const lineageById = new Map<string, readonly string[]>();

  function lineage(entityId: string, visited = new Set<string>()): readonly string[] {
    const existing = lineageById.get(entityId);
    if (existing) return existing;
    const entity = byId.get(entityId);
    if (!entity || visited.has(entityId)) return [entityId];
    const nextVisited = new Set(visited).add(entityId);
    const resolved = entity.parent_id && byId.has(entity.parent_id)
      ? [...lineage(entity.parent_id, nextVisited), entityId]
      : [entityId];
    lineageById.set(entityId, resolved);
    return resolved;
  }

  const projectionEntities = entities.map((entity) => {
    const enrichedEntity = entity as EntitySummary & {
      readonly authority_score?: number;
      readonly domain_id?: string | null;
    };
    const lineageIds = lineage(entity.entity_id);
    const marshalId = lineageIds
      .map((entityId) => byId.get(entityId))
      .find((candidate) => candidate?.entity_type === "MARSHAL")
      ?.entity_id ?? null;
    return {
      authority_score: enrichedEntity.authority_score ?? null,
      authority_tier: authorityTier[entity.entity_type],
      business_id: entity.assigned_business_id,
      display_name: entity.name,
      domain_id: enrichedEntity.domain_id ?? marshalId,
      entity_id: entity.entity_id,
      entity_type: entity.entity_type,
      health: entity.health,
      hierarchy_level: authorityTier[entity.entity_type],
      lineage_ids: lineageIds,
      marshal_id: marshalId,
      organization_id: organizationId,
      parent_id: entity.parent_id && byId.has(entity.parent_id)
        ? entity.parent_id
        : null,
      stable_code: entity.stable_code,
      status: entity.status,
      version: entity.version
    };
  });
  const root = projectionEntities.find((entity) => entity.entity_type === "ENTRAL");
  const edges = projectionEntities
    .filter((entity): entity is typeof entity & { parent_id: string } =>
      entity.parent_id !== null
    )
    .map((entity) => ({
      direction: "OUTBOUND" as const,
      edge_id: canonicalGraphEdgeId(entity.parent_id, entity.entity_id),
      lineage: true as const,
      relation_type: "HIERARCHY" as const,
      source_id: entity.parent_id,
      status: entity.status,
      target_id: entity.entity_id
    }));

  return {
    contract_version: "1.0.0",
    edges,
    entities: projectionEntities,
    evidence_version_reference: {
      event_sequence: projectionVersion,
      source: "canonical_hierarchy"
    },
    generated_at: PHASE195_TIMESTAMP,
    organization_id: organizationId,
    projection_version: projectionVersion,
    root_id: root?.entity_id ?? "no-authorized-root",
    schema_version: 1
  };
}

export function graphPreferencesFixture(
  overrides: Partial<GraphViewPreferences> = {}
): GraphViewPreferences {
  const source = overrides.source ?? "CANONICAL_DEFAULTS";
  return {
    contract_version: "1.0.0",
    created_at: source === "SAVED_OVERRIDE" ? PHASE195_TIMESTAMP : null,
    migrated_from_schema_version: null,
    organization_id: PHASE195_ORGANIZATION_ID,
    preference_id: source === "SAVED_OVERRIDE" ? PHASE195_PREFERENCE_ID : null,
    schema_version: 2,
    settings: canonicalGraphPreferenceSettings(),
    source,
    updated_at: source === "SAVED_OVERRIDE" ? PHASE195_TIMESTAMP : null,
    user_id: PHASE195_USER_ID,
    version: source === "SAVED_OVERRIDE" ? 1 : 0,
    ...overrides
  };
}
