import type {
  EntityRole,
  EntityStatus,
  HealthState
} from "./domain.js";
import type { CanonicalHierarchyResponse } from "./portfolio.js";
import {
  ContractError,
  assertIsoDate,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
} from "./validation.js";

export const GRAPH_CONTRACT_VERSION = "1.0.0" as const;
export const GRAPH_PREFERENCES_SCHEMA_VERSION = 2 as const;
export const GRAPH_PROJECTION_SCHEMA_VERSION = 1 as const;
export const GRAPH_SHARED_VIEW_STATE_SCHEMA_VERSION = 1 as const;

export const GRAPH_ARRANGEMENTS = ["AUTO", "SIDE_BY_SIDE", "STACK", "TWO_D_ONLY", "THREE_D_ONLY"] as const;
export const GRAPH_TWO_D_LAYOUTS = ["AUTHORITY_RADIAL", "HIERARCHY_TREE", "DOMAIN_CLUSTERS", "COMPACT_RADIAL"] as const;
export const GRAPH_THREE_D_LAYOUTS = ["AUTHORITY_RINGS", "ELLIPTICAL_ORBITS", "SPHERICAL_SHELLS", "DOMAIN_CLUSTERS"] as const;
export const GRAPH_DENSITIES = ["COMPACT", "BALANCED", "SPACIOUS"] as const;
export const GRAPH_LABEL_MODES = ["ALWAYS", "RELEVANT", "HOVER_OR_FOCUS", "OFF"] as const;
export const GRAPH_CONNECTION_MODES = ["RELEVANT", "LINEAGE", "DIRECT", "ALL"] as const;
export const GRAPH_MOTION_MODES = ["NORMAL", "REDUCED", "OFF"] as const;
export const GRAPH_RENDERERS = ["2D", "3D"] as const;

export type GraphArrangement = (typeof GRAPH_ARRANGEMENTS)[number];
export type GraphTwoDLayout = (typeof GRAPH_TWO_D_LAYOUTS)[number];
export type GraphThreeDLayout = (typeof GRAPH_THREE_D_LAYOUTS)[number];
export type GraphDensity = (typeof GRAPH_DENSITIES)[number];
export type GraphLabelMode = (typeof GRAPH_LABEL_MODES)[number];
export type GraphConnectionMode = (typeof GRAPH_CONNECTION_MODES)[number];
export type GraphMotionMode = (typeof GRAPH_MOTION_MODES)[number];
export type GraphRenderer = (typeof GRAPH_RENDERERS)[number];

export interface GraphEntity {
  readonly entity_id: string;
  readonly organization_id: string;
  readonly entity_type: EntityRole;
  readonly hierarchy_level: 0 | 1 | 2 | 3 | 4;
  readonly authority_tier: 0 | 1 | 2 | 3 | 4;
  readonly authority_score: number | null;
  readonly parent_id: string | null;
  readonly lineage_ids: readonly string[];
  readonly marshal_id: string | null;
  readonly domain_id: string | null;
  readonly business_id: string | null;
  readonly stable_code: string;
  readonly display_name: string;
  readonly status: EntityStatus;
  readonly health: HealthState;
  readonly version: number;
}

export interface GraphEdge {
  readonly edge_id: string;
  readonly source_id: string;
  readonly target_id: string;
  readonly relation_type: "HIERARCHY";
  readonly direction: "OUTBOUND";
  readonly lineage: true;
  readonly status: EntityStatus;
}

export interface GraphProjection {
  readonly contract_version: typeof GRAPH_CONTRACT_VERSION;
  readonly schema_version: typeof GRAPH_PROJECTION_SCHEMA_VERSION;
  readonly organization_id: string;
  readonly projection_version: number;
  readonly root_id: string;
  readonly entities: readonly GraphEntity[];
  readonly edges: readonly GraphEdge[];
  readonly generated_at: string;
  readonly evidence_version_reference: {
    readonly source: "canonical_hierarchy";
    readonly event_sequence: number;
  };
}

/**
 * Phase 195 compatibility seam for the canonical AgentInstance and assignment
 * contracts introduced later in V7. Runtime state is joined onto already
 * authorized graph entities; it can never add an entity or become a second
 * graph hierarchy source.
 */
export interface CanonicalGraphRuntimeStateBinding<
  TAgentInstance extends object,
  TAssignment extends object
> {
  readonly entity_id: string;
  readonly agent_instance: TAgentInstance;
  readonly assignment: TAssignment | null;
}

export interface CanonicalGraphEntityRuntimeView<
  TAgentInstance extends object,
  TAssignment extends object
> {
  readonly graph_entity: GraphEntity;
  readonly runtime_state: {
    readonly agent_instance: TAgentInstance;
    readonly assignment: TAssignment | null;
  } | null;
}

export interface GraphFilters {
  readonly entity_types: readonly EntityRole[];
  readonly authority_tiers: readonly number[];
  readonly domain_ids: readonly string[];
  readonly business_ids: readonly string[];
  readonly statuses: readonly EntityStatus[];
  readonly health_states: readonly HealthState[];
  readonly relation_types: readonly "HIERARCHY"[];
}

export interface GraphSharedViewState {
  readonly contract_version: typeof GRAPH_CONTRACT_VERSION;
  readonly schema_version: typeof GRAPH_SHARED_VIEW_STATE_SCHEMA_VERSION;
  readonly organization_id: string;
  readonly selected_entity_id: string | null;
  readonly focused_entity_id: string | null;
  readonly expanded_entity_ids: readonly string[];
  readonly isolated_root_id: string | null;
  readonly breadcrumb_entity_ids: readonly string[];
  readonly search_query: string;
  readonly filters: GraphFilters;
  readonly arrangement: GraphArrangement;
  readonly synchronized_navigation: boolean;
  readonly navigation_history: {
    readonly back: readonly string[];
    readonly current: string | null;
    readonly forward: readonly string[];
  };
}

export interface GraphSimpleSettings {
  readonly arrangement: GraphArrangement;
  readonly two_d_layout: GraphTwoDLayout;
  readonly three_d_layout: GraphThreeDLayout;
  readonly density: GraphDensity;
  readonly labels: GraphLabelMode;
  readonly connections: GraphConnectionMode;
  readonly motion: GraphMotionMode;
  readonly synchronized_navigation: boolean;
}

export interface GraphAdvancedSharedSettings {
  readonly authority_band_spacing: number;
  readonly authority_score_influence: number;
  readonly node_scale: number;
  readonly selected_node_scale: number;
  readonly edge_width: number;
  readonly edge_opacity: number;
  readonly edge_curvature: number;
  readonly label_threshold: number;
  readonly label_scale: number;
  readonly lineage_emphasis: number;
  readonly color_mode: "AUTHORITY" | "HEALTH" | "STATUS";
  readonly background_visible: boolean;
  readonly grid_visible: boolean;
  readonly legend_visible: boolean;
  readonly animation_duration_ms: number;
  readonly motion_easing: "LINEAR" | "EASE_IN" | "EASE_OUT" | "EASE_IN_OUT";
  readonly stable_layout_seed: string;
  readonly performance_mode: "AUTO" | "QUALITY" | "BALANCED" | "PERFORMANCE";
  readonly level_of_detail: "AUTO" | "FULL" | "BALANCED" | "AGGRESSIVE";
  readonly maximum_live_labels: number;
  readonly frame_rate_cap: 30 | 45 | 60 | 90 | 120;
  readonly worker_usage: "AUTO" | "ON" | "OFF";
  readonly rendering_quality: "LOW" | "MEDIUM" | "HIGH";
}

export interface GraphAdvancedTwoDSettings {
  readonly ring_spacing: number;
  readonly tree_orientation: "TOP_DOWN" | "LEFT_RIGHT" | "CENTER_OUT";
  readonly sibling_spacing: number;
  readonly level_spacing: number;
  readonly sector_padding: number;
  readonly collision_padding: number;
  readonly force_iterations: number;
  readonly edge_routing: "STRAIGHT" | "CURVED" | "ORTHOGONAL";
  readonly minimap_visible: boolean;
  readonly grid_snapping: boolean;
  readonly grid_size: number;
  readonly fit_padding: number;
}

export interface GraphAdvancedThreeDSettings {
  readonly ring_spacing: number;
  readonly ellipse_eccentricity: number;
  readonly orbit_tilt_degrees: number;
  readonly cluster_spread: number;
  readonly vertical_spread: number;
  readonly depth_scale: number;
  readonly collision_radius: number;
  readonly camera_field_of_view: number;
  readonly near_clip: number;
  readonly far_clip: number;
  readonly minimum_zoom: number;
  readonly maximum_zoom: number;
  readonly focus_distance: number;
  readonly auto_orbit_enabled: boolean;
  readonly auto_orbit_speed: number;
  readonly orbit_direction: "CLOCKWISE" | "COUNTERCLOCKWISE";
  readonly node_billboard: boolean;
  readonly edge_depth_fade: boolean;
  readonly bloom_intensity: number;
  readonly lighting_intensity: number;
  readonly focus_transition_ms: number;
}

export interface GraphPinnedPosition {
  readonly entity_id: string;
  readonly renderer: GraphRenderer;
  readonly x: number;
  readonly y: number;
  readonly z: number | null;
}

export interface GraphPreferenceSettings {
  readonly simple: GraphSimpleSettings;
  readonly advanced_shared: GraphAdvancedSharedSettings;
  readonly advanced_2d: GraphAdvancedTwoDSettings;
  readonly advanced_3d: GraphAdvancedThreeDSettings;
  readonly pinned_positions: readonly GraphPinnedPosition[];
}

export interface GraphViewPreferences {
  readonly contract_version: typeof GRAPH_CONTRACT_VERSION;
  readonly schema_version: typeof GRAPH_PREFERENCES_SCHEMA_VERSION;
  readonly preference_id: string | null;
  readonly user_id: string;
  readonly organization_id: string;
  readonly source: "CANONICAL_DEFAULTS" | "SAVED_OVERRIDE";
  readonly settings: GraphPreferenceSettings;
  readonly version: number;
  readonly created_at: string | null;
  readonly updated_at: string | null;
  readonly migrated_from_schema_version: number | null;
}

export interface GraphViewPreferencesUpdateRequest {
  readonly contract_version: typeof GRAPH_CONTRACT_VERSION;
  readonly schema_version: 1 | typeof GRAPH_PREFERENCES_SCHEMA_VERSION;
  readonly expected_version: number;
  readonly idempotency_key: string;
  readonly settings: unknown;
}

export const GRAPH_PREFERENCE_RESET_SCOPES = [
  "ALL",
  "SHARED",
  "VIEW_2D",
  "VIEW_3D",
  "PINNED_POSITIONS"
] as const;
export type GraphPreferenceResetScope = (typeof GRAPH_PREFERENCE_RESET_SCOPES)[number];

export interface GraphViewPreferencesResetRequest {
  readonly contract_version: typeof GRAPH_CONTRACT_VERSION;
  readonly expected_version: number;
  readonly idempotency_key: string;
  readonly reset_scope: GraphPreferenceResetScope;
}

export interface GraphViewPreferencesMutationResponse {
  readonly preferences: GraphViewPreferences;
  readonly idempotent_replay: boolean;
  readonly event_ids: readonly string[];
}

export const GRAPH_RENDERER_ERROR_CODES = [
  "NONE",
  "GRAPH_LAYOUT_FAILURE",
  "GRAPH_RENDERER_FAILURE",
  "GRAPH_WEBGL_CONTEXT_LOST",
  "GRAPH_WORKER_FAILURE",
  "GRAPH_EXPORT_FAILURE",
  "GRAPH_PERFORMANCE_DEGRADED"
] as const;
export type GraphRendererErrorCode = (typeof GRAPH_RENDERER_ERROR_CODES)[number];

export interface GraphRendererTelemetryRequest {
  readonly contract_version: typeof GRAPH_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly telemetry_id: string;
  readonly observed_at: string;
  readonly renderer: GraphRenderer;
  readonly layout_pattern: GraphTwoDLayout | GraphThreeDLayout;
  readonly projection_id: string;
  readonly projection_version: number;
  readonly node_count: number;
  readonly edge_count: number;
  readonly settings_version: number;
  readonly layout_time_ms: number;
  readonly render_time_ms: number;
  readonly sample_window_ms: number;
  readonly frame_rate_fps: number;
  readonly dropped_frame_rate_ratio: number;
  readonly error_code: GraphRendererErrorCode;
}

export interface GraphRendererTelemetryResponse {
  readonly contract_version: typeof GRAPH_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly telemetry_id: string;
  readonly organization_id: string;
  readonly accepted: true;
  readonly recorded_at: string;
}

const roles = ["ENTRAL", "MARSHAL", "GENERAL", "COMMANDER", "SOLDIER"] as const;
const statuses = ["BUILDING", "ACTIVE", "PAUSED", "DEGRADED", "RETIRED"] as const;
const healthStates = ["HEALTHY", "WATCH", "DEGRADED", "CRITICAL", "UNKNOWN"] as const;
const hierarchyLevel: Readonly<Record<EntityRole, 0 | 1 | 2 | 3 | 4>> = {
  ENTRAL: 0,
  MARSHAL: 1,
  GENERAL: 2,
  COMMANDER: 3,
  SOLDIER: 4
};

const simpleDefaults: GraphSimpleSettings = {
  arrangement: "AUTO",
  two_d_layout: "AUTHORITY_RADIAL",
  three_d_layout: "AUTHORITY_RINGS",
  density: "BALANCED",
  labels: "RELEVANT",
  connections: "RELEVANT",
  motion: "NORMAL",
  synchronized_navigation: true
};

const advancedSharedDefaults: GraphAdvancedSharedSettings = {
  authority_band_spacing: 1,
  authority_score_influence: 0.2,
  node_scale: 1,
  selected_node_scale: 1.35,
  edge_width: 1,
  edge_opacity: 0.5,
  edge_curvature: 0.15,
  label_threshold: 0.35,
  label_scale: 1,
  lineage_emphasis: 1.4,
  color_mode: "AUTHORITY",
  background_visible: true,
  grid_visible: true,
  legend_visible: true,
  animation_duration_ms: 300,
  motion_easing: "EASE_IN_OUT",
  stable_layout_seed: "entral-authority-v1",
  performance_mode: "AUTO",
  level_of_detail: "AUTO",
  maximum_live_labels: 200,
  frame_rate_cap: 60,
  worker_usage: "AUTO",
  rendering_quality: "HIGH"
};

const advancedTwoDDefaults: GraphAdvancedTwoDSettings = {
  ring_spacing: 160,
  tree_orientation: "TOP_DOWN",
  sibling_spacing: 48,
  level_spacing: 64,
  sector_padding: 0.1,
  collision_padding: 12,
  force_iterations: 0,
  edge_routing: "CURVED",
  minimap_visible: true,
  grid_snapping: false,
  grid_size: 16,
  fit_padding: 24
};

const advancedThreeDDefaults: GraphAdvancedThreeDSettings = {
  ring_spacing: 220,
  ellipse_eccentricity: 0.25,
  orbit_tilt_degrees: 15,
  cluster_spread: 1,
  vertical_spread: 0.6,
  depth_scale: 1,
  collision_radius: 12,
  camera_field_of_view: 50,
  near_clip: 0.1,
  far_clip: 5_000,
  minimum_zoom: 0.5,
  maximum_zoom: 3,
  focus_distance: 600,
  auto_orbit_enabled: false,
  auto_orbit_speed: 0.1,
  orbit_direction: "CLOCKWISE",
  node_billboard: true,
  edge_depth_fade: true,
  bloom_intensity: 0.2,
  lighting_intensity: 1,
  focus_transition_ms: 350
};

export function canonicalGraphPreferenceSettings(): GraphPreferenceSettings {
  return {
    simple: { ...simpleDefaults },
    advanced_shared: { ...advancedSharedDefaults },
    advanced_2d: { ...advancedTwoDDefaults },
    advanced_3d: { ...advancedThreeDDefaults },
    pinned_positions: []
  };
}

export function resetGraphPreferenceSettings(
  current: GraphPreferenceSettings,
  resetScope: GraphPreferenceResetScope
): GraphPreferenceSettings {
  const defaults = canonicalGraphPreferenceSettings();
  if (resetScope === "ALL") return defaults;
  if (resetScope === "SHARED") {
    return {
      ...current,
      simple: {
        ...defaults.simple,
        two_d_layout: current.simple.two_d_layout,
        three_d_layout: current.simple.three_d_layout
      },
      advanced_shared: defaults.advanced_shared
    };
  }
  if (resetScope === "VIEW_2D") {
    return {
      ...current,
      simple: {
        ...current.simple,
        two_d_layout: defaults.simple.two_d_layout
      },
      advanced_2d: defaults.advanced_2d,
      pinned_positions: current.pinned_positions.filter(
        (position) => position.renderer !== "2D"
      )
    };
  }
  if (resetScope === "VIEW_3D") {
    return {
      ...current,
      simple: {
        ...current.simple,
        three_d_layout: defaults.simple.three_d_layout
      },
      advanced_3d: defaults.advanced_3d,
      pinned_positions: current.pinned_positions.filter(
        (position) => position.renderer !== "3D"
      )
    };
  }
  return {
    ...current,
    pinned_positions: []
  };
}

function assertExactKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(value).filter((key) => !allowedKeys.has(key));
  if (unknown.length > 0) {
    throw new ContractError("UNKNOWN_GRAPH_SETTING", `${field} contains unsupported fields: ${unknown.join(", ")}`);
  }
}

function assertBoolean(value: unknown, field: string): asserts value is boolean {
  if (typeof value !== "boolean") {
    throw new ContractError("INVALID_BOOLEAN", `${field} must be a boolean`);
  }
}

function assertFiniteRange(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number
): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new ContractError("INVALID_GRAPH_RANGE", `${field} must be between ${minimum} and ${maximum}`);
  }
}

function assertIntegerRange(
  value: unknown,
  field: string,
  minimum: number,
  maximum: number
): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new ContractError("INVALID_GRAPH_INTEGER", `${field} must be an integer between ${minimum} and ${maximum}`);
  }
}

function assertEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string
): asserts value is T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new ContractError("INVALID_GRAPH_ENUM", `${field} is not a supported value`);
  }
}

function assertStringId(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field, 200);
}

function assertUniqueStrings(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new ContractError("DUPLICATE_GRAPH_ID", `${field} must not contain duplicate identifiers`);
  }
}

function assertStringIdArray(value: unknown, field: string, maximum = 100_000): asserts value is string[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new ContractError("INVALID_GRAPH_ARRAY", `${field} must be an array with at most ${maximum} entries`);
  }
  value.forEach((item, index) => assertStringId(item, `${field}[${index}]`));
  assertUniqueStrings(value, field);
}

export function canonicalGraphEdgeId(sourceId: string, targetId: string): string {
  assertStringId(sourceId, "source_id");
  assertStringId(targetId, "target_id");
  return `hierarchy:${sourceId}:${targetId}`;
}

export function buildGraphProjection(input: {
  readonly hierarchy: CanonicalHierarchyResponse;
  readonly organization_id: string;
}): GraphProjection {
  assertStringId(input.organization_id, "organization_id");
  const byId = new Map(input.hierarchy.entities.map((entity) => [entity.entity_id, entity]));
  const roots = input.hierarchy.entities.filter((entity) => entity.parent_id === null);
  const entralRoots = roots.filter((entity) => entity.entity_type === "ENTRAL");
  if (roots.length !== 1 || entralRoots.length !== 1) {
    throw new ContractError("INVALID_GRAPH_ROOT", "The authorized projection requires exactly one canonical ENTRAL root");
  }

  const lineageById = new Map<string, readonly string[]>();
  const resolveLineage = (entityId: string, path = new Set<string>()): readonly string[] => {
    const existing = lineageById.get(entityId);
    if (existing) return existing;
    if (path.has(entityId)) {
      throw new ContractError("GRAPH_HIERARCHY_CYCLE", `Canonical hierarchy cycle detected at ${entityId}`);
    }
    const entity = byId.get(entityId);
    if (!entity) throw new ContractError("MISSING_GRAPH_ENTITY", `Missing graph entity ${entityId}`);
    const nextPath = new Set(path).add(entityId);
    const lineage = entity.parent_id === null
      ? [entity.entity_id]
      : [...resolveLineage(entity.parent_id, nextPath), entity.entity_id];
    lineageById.set(entityId, lineage);
    return lineage;
  };

  const entities = input.hierarchy.entities.map((entity): GraphEntity => {
    const lineage = resolveLineage(entity.entity_id);
    const marshal = lineage
      .map((entityId) => byId.get(entityId))
      .find((candidate) => candidate?.entity_type === "MARSHAL");
    return {
      entity_id: entity.entity_id,
      organization_id: input.organization_id,
      entity_type: entity.entity_type,
      hierarchy_level: hierarchyLevel[entity.entity_type],
      authority_tier: hierarchyLevel[entity.entity_type],
      authority_score: null,
      parent_id: entity.parent_id,
      lineage_ids: lineage,
      marshal_id: marshal?.entity_id ?? null,
      domain_id: marshal?.entity_id ?? null,
      business_id: entity.assigned_business_id,
      stable_code: entity.stable_code,
      display_name: entity.name,
      status: entity.status,
      health: entity.health,
      version: entity.version
    };
  });
  const edges = entities
    .filter((entity): entity is GraphEntity & { parent_id: string } => entity.parent_id !== null)
    .map((entity): GraphEdge => ({
      edge_id: canonicalGraphEdgeId(entity.parent_id, entity.entity_id),
      source_id: entity.parent_id,
      target_id: entity.entity_id,
      relation_type: "HIERARCHY",
      direction: "OUTBOUND",
      lineage: true,
      status: entity.status
    }));
  const projection: GraphProjection = {
    contract_version: GRAPH_CONTRACT_VERSION,
    schema_version: GRAPH_PROJECTION_SCHEMA_VERSION,
    organization_id: input.organization_id,
    projection_version: input.hierarchy.event_sequence,
    root_id: entralRoots[0]!.entity_id,
    entities,
    edges,
    generated_at: input.hierarchy.generated_at,
    evidence_version_reference: {
      source: "canonical_hierarchy",
      event_sequence: input.hierarchy.event_sequence
    }
  };
  assertGraphProjection(projection);
  return projection;
}

export function bindCanonicalGraphRuntimeState<
  TAgentInstance extends object,
  TAssignment extends object
>(
  projection: GraphProjection,
  bindings: readonly CanonicalGraphRuntimeStateBinding<TAgentInstance, TAssignment>[]
): readonly CanonicalGraphEntityRuntimeView<TAgentInstance, TAssignment>[] {
  assertGraphProjection(projection);
  if (!Array.isArray(bindings) || bindings.length > projection.entities.length) {
    throw new ContractError(
      "GRAPH_RUNTIME_STATE_SCOPE_MISMATCH",
      "Runtime state bindings cannot exceed the authorized graph projection"
    );
  }

  const authorizedEntityIds = new Set(
    projection.entities.map((entity) => entity.entity_id)
  );
  const runtimeStateByEntityId = new Map<string, {
    readonly agent_instance: TAgentInstance;
    readonly assignment: TAssignment | null;
  }>();

  bindings.forEach((candidate, index) => {
    assertRecord(candidate, `graph_runtime_state_bindings[${index}]`);
    assertExactKeys(
      candidate,
      ["entity_id", "agent_instance", "assignment"],
      `graph_runtime_state_bindings[${index}]`
    );
    assertStringId(
      candidate.entity_id,
      `graph_runtime_state_bindings[${index}].entity_id`
    );
    assertRecord(
      candidate.agent_instance,
      `graph_runtime_state_bindings[${index}].agent_instance`
    );
    if (candidate.assignment !== null) {
      assertRecord(
        candidate.assignment,
        `graph_runtime_state_bindings[${index}].assignment`
      );
    }
    if (!authorizedEntityIds.has(candidate.entity_id)) {
      throw new ContractError(
        "GRAPH_RUNTIME_STATE_SCOPE_MISMATCH",
        "Runtime state may bind only to an entity in the authorized graph projection"
      );
    }
    if (runtimeStateByEntityId.has(candidate.entity_id)) {
      throw new ContractError(
        "DUPLICATE_GRAPH_RUNTIME_STATE",
        "Each authorized graph entity may have at most one runtime state binding"
      );
    }
    runtimeStateByEntityId.set(candidate.entity_id, {
      agent_instance: candidate.agent_instance as TAgentInstance,
      assignment: candidate.assignment as TAssignment | null
    });
  });

  return projection.entities.map((graphEntity) => ({
    graph_entity: graphEntity,
    runtime_state: runtimeStateByEntityId.get(graphEntity.entity_id) ?? null
  }));
}

export function assertGraphProjection(value: unknown): asserts value is GraphProjection {
  assertRecord(value, "graph_projection");
  assertExactKeys(value, [
    "contract_version", "schema_version", "organization_id", "projection_version",
    "root_id", "entities", "edges", "generated_at", "evidence_version_reference"
  ], "graph_projection");
  if (value.contract_version !== GRAPH_CONTRACT_VERSION || value.schema_version !== GRAPH_PROJECTION_SCHEMA_VERSION) {
    throw new ContractError("GRAPH_CONTRACT_VERSION", "graph_projection uses an unsupported contract or schema version");
  }
  assertStringId(value.organization_id, "graph_projection.organization_id");
  assertSafeNonNegativeInteger(value.projection_version, "graph_projection.projection_version");
  assertStringId(value.root_id, "graph_projection.root_id");
  assertIsoDate(value.generated_at, "graph_projection.generated_at");
  if (!Array.isArray(value.entities) || value.entities.length > 100_000) {
    throw new ContractError("INVALID_GRAPH_ENTITIES", "graph_projection.entities exceeds the 100000 entity safety limit");
  }
  const entities = new Map<string, GraphEntity>();
  value.entities.forEach((candidate, index) => {
    assertRecord(candidate, `graph_projection.entities[${index}]`);
    assertExactKeys(candidate, [
      "entity_id", "organization_id", "entity_type", "hierarchy_level", "authority_tier",
      "authority_score", "parent_id", "lineage_ids", "marshal_id", "domain_id",
      "business_id", "stable_code", "display_name", "status", "health", "version"
    ], `graph_projection.entities[${index}]`);
    assertStringId(candidate.entity_id, `graph_projection.entities[${index}].entity_id`);
    if (candidate.organization_id !== value.organization_id) {
      throw new ContractError("GRAPH_SCOPE_MISMATCH", "Every graph entity must share the projection organization scope");
    }
    assertEnum(candidate.entity_type, roles, `graph_projection.entities[${index}].entity_type`);
    assertIntegerRange(candidate.hierarchy_level, `graph_projection.entities[${index}].hierarchy_level`, 0, 4);
    assertIntegerRange(candidate.authority_tier, `graph_projection.entities[${index}].authority_tier`, 0, 4);
    if (
      candidate.hierarchy_level !== hierarchyLevel[candidate.entity_type]
      || candidate.authority_tier !== hierarchyLevel[candidate.entity_type]
    ) {
      throw new ContractError("AUTHORITY_TIER_MISMATCH", "Graph hierarchy level and authority tier must match the canonical entity role");
    }
    if (candidate.authority_score !== null) {
      assertFiniteRange(candidate.authority_score, `graph_projection.entities[${index}].authority_score`, 0, 1);
    }
    if (candidate.parent_id !== null) assertStringId(candidate.parent_id, `graph_projection.entities[${index}].parent_id`);
    assertStringIdArray(candidate.lineage_ids, `graph_projection.entities[${index}].lineage_ids`, 64);
    if (candidate.lineage_ids.at(-1) !== candidate.entity_id) {
      throw new ContractError("GRAPH_LINEAGE_MISMATCH", "A graph entity lineage must terminate at that entity");
    }
    if (candidate.marshal_id !== null) assertStringId(candidate.marshal_id, `graph_projection.entities[${index}].marshal_id`);
    if (candidate.domain_id !== null) assertStringId(candidate.domain_id, `graph_projection.entities[${index}].domain_id`);
    if (candidate.business_id !== null) assertUuid(candidate.business_id, `graph_projection.entities[${index}].business_id`);
    assertNonEmptyString(candidate.stable_code, `graph_projection.entities[${index}].stable_code`, 200);
    assertNonEmptyString(candidate.display_name, `graph_projection.entities[${index}].display_name`, 300);
    assertEnum(candidate.status, statuses, `graph_projection.entities[${index}].status`);
    assertEnum(candidate.health, healthStates, `graph_projection.entities[${index}].health`);
    assertIntegerRange(candidate.version, `graph_projection.entities[${index}].version`, 1, Number.MAX_SAFE_INTEGER);
    if (entities.has(candidate.entity_id)) {
      throw new ContractError("DUPLICATE_GRAPH_ENTITY", `Duplicate graph entity ${candidate.entity_id}`);
    }
    entities.set(candidate.entity_id, candidate as unknown as GraphEntity);
  });
  const root = entities.get(value.root_id);
  if (!root || root.entity_type !== "ENTRAL" || root.parent_id !== null) {
    throw new ContractError("INVALID_GRAPH_ROOT", "graph_projection.root_id must identify the canonical ENTRAL root");
  }
  if (!Array.isArray(value.edges) || value.edges.length > 200_000) {
    throw new ContractError("INVALID_GRAPH_EDGES", "graph_projection.edges exceeds the 200000 edge safety limit");
  }
  const edgeIds = new Set<string>();
  value.edges.forEach((candidate, index) => {
    assertRecord(candidate, `graph_projection.edges[${index}]`);
    assertExactKeys(candidate, [
      "edge_id", "source_id", "target_id", "relation_type", "direction", "lineage", "status"
    ], `graph_projection.edges[${index}]`);
    assertStringId(candidate.edge_id, `graph_projection.edges[${index}].edge_id`);
    assertStringId(candidate.source_id, `graph_projection.edges[${index}].source_id`);
    assertStringId(candidate.target_id, `graph_projection.edges[${index}].target_id`);
    if (!entities.has(candidate.source_id) || !entities.has(candidate.target_id)) {
      throw new ContractError("DANGLING_GRAPH_EDGE", `${candidate.edge_id} references a hidden or missing entity`);
    }
    if (candidate.edge_id !== canonicalGraphEdgeId(candidate.source_id, candidate.target_id)) {
      throw new ContractError("INVALID_GRAPH_EDGE_ID", "Hierarchy edge IDs must use the canonical deterministic format");
    }
    if (
      candidate.relation_type !== "HIERARCHY"
      || candidate.direction !== "OUTBOUND"
      || candidate.lineage !== true
    ) {
      throw new ContractError("INVALID_GRAPH_EDGE", "Graph hierarchy edges must be outbound lineage edges");
    }
    const target = entities.get(candidate.target_id)!;
    if (target.parent_id !== candidate.source_id || candidate.status !== target.status) {
      throw new ContractError("GRAPH_EDGE_MISMATCH", "Graph hierarchy edges must match the canonical child relationship and status");
    }
    if (edgeIds.has(candidate.edge_id)) throw new ContractError("DUPLICATE_GRAPH_EDGE", `Duplicate graph edge ${candidate.edge_id}`);
    edgeIds.add(candidate.edge_id);
  });
  const expectedEdges = [...entities.values()].filter((entity) => entity.parent_id !== null).length;
  if (edgeIds.size !== expectedEdges) {
    throw new ContractError("GRAPH_EDGE_COUNT_MISMATCH", "Every non-root graph entity requires exactly one canonical hierarchy edge");
  }
  assertRecord(value.evidence_version_reference, "graph_projection.evidence_version_reference");
  assertExactKeys(value.evidence_version_reference, ["source", "event_sequence"], "graph_projection.evidence_version_reference");
  if (
    value.evidence_version_reference.source !== "canonical_hierarchy"
    || value.evidence_version_reference.event_sequence !== value.projection_version
  ) {
    throw new ContractError("GRAPH_EVIDENCE_MISMATCH", "Graph projection evidence must identify its canonical hierarchy event sequence");
  }
}

export function parseGraphProjection(value: unknown): GraphProjection {
  assertGraphProjection(value);
  return value;
}

function assertGraphFilters(value: unknown, field: string): asserts value is GraphFilters {
  assertRecord(value, field);
  assertExactKeys(value, [
    "entity_types", "authority_tiers", "domain_ids", "business_ids",
    "statuses", "health_states", "relation_types"
  ], field);
  if (!Array.isArray(value.entity_types)) throw new ContractError("INVALID_GRAPH_FILTER", `${field}.entity_types must be an array`);
  value.entity_types.forEach((item, index) => assertEnum(item, roles, `${field}.entity_types[${index}]`));
  if (!Array.isArray(value.authority_tiers)) throw new ContractError("INVALID_GRAPH_FILTER", `${field}.authority_tiers must be an array`);
  value.authority_tiers.forEach((item, index) => assertIntegerRange(item, `${field}.authority_tiers[${index}]`, 0, 4));
  assertStringIdArray(value.domain_ids, `${field}.domain_ids`, 10_000);
  assertStringIdArray(value.business_ids, `${field}.business_ids`, 10_000);
  if (!Array.isArray(value.statuses)) throw new ContractError("INVALID_GRAPH_FILTER", `${field}.statuses must be an array`);
  value.statuses.forEach((item, index) => assertEnum(item, statuses, `${field}.statuses[${index}]`));
  if (!Array.isArray(value.health_states)) throw new ContractError("INVALID_GRAPH_FILTER", `${field}.health_states must be an array`);
  value.health_states.forEach((item, index) => assertEnum(item, healthStates, `${field}.health_states[${index}]`));
  if (!Array.isArray(value.relation_types)) throw new ContractError("INVALID_GRAPH_FILTER", `${field}.relation_types must be an array`);
  value.relation_types.forEach((item, index) => assertEnum(item, ["HIERARCHY"], `${field}.relation_types[${index}]`));
}

export function assertGraphSharedViewState(value: unknown): asserts value is GraphSharedViewState {
  assertRecord(value, "graph_shared_view_state");
  assertExactKeys(value, [
    "contract_version", "schema_version", "organization_id", "selected_entity_id",
    "focused_entity_id", "expanded_entity_ids", "isolated_root_id",
    "breadcrumb_entity_ids", "search_query", "filters", "arrangement",
    "synchronized_navigation", "navigation_history"
  ], "graph_shared_view_state");
  if (
    value.contract_version !== GRAPH_CONTRACT_VERSION
    || value.schema_version !== GRAPH_SHARED_VIEW_STATE_SCHEMA_VERSION
  ) {
    throw new ContractError("GRAPH_CONTRACT_VERSION", "graph_shared_view_state uses an unsupported version");
  }
  assertStringId(value.organization_id, "graph_shared_view_state.organization_id");
  if (value.selected_entity_id !== null) assertStringId(value.selected_entity_id, "graph_shared_view_state.selected_entity_id");
  if (value.focused_entity_id !== null) assertStringId(value.focused_entity_id, "graph_shared_view_state.focused_entity_id");
  assertStringIdArray(value.expanded_entity_ids, "graph_shared_view_state.expanded_entity_ids");
  if (value.isolated_root_id !== null) assertStringId(value.isolated_root_id, "graph_shared_view_state.isolated_root_id");
  assertStringIdArray(value.breadcrumb_entity_ids, "graph_shared_view_state.breadcrumb_entity_ids", 64);
  if (typeof value.search_query !== "string" || value.search_query.length > 500) {
    throw new ContractError("INVALID_GRAPH_SEARCH", "graph_shared_view_state.search_query must be at most 500 characters");
  }
  assertGraphFilters(value.filters, "graph_shared_view_state.filters");
  assertEnum(value.arrangement, GRAPH_ARRANGEMENTS, "graph_shared_view_state.arrangement");
  assertBoolean(value.synchronized_navigation, "graph_shared_view_state.synchronized_navigation");
  assertRecord(value.navigation_history, "graph_shared_view_state.navigation_history");
  assertExactKeys(value.navigation_history, ["back", "current", "forward"], "graph_shared_view_state.navigation_history");
  assertStringIdArray(value.navigation_history.back, "graph_shared_view_state.navigation_history.back", 100);
  if (value.navigation_history.current !== null) {
    assertStringId(value.navigation_history.current, "graph_shared_view_state.navigation_history.current");
  }
  assertStringIdArray(value.navigation_history.forward, "graph_shared_view_state.navigation_history.forward", 100);
}

export function parseGraphSharedViewState(value: unknown): GraphSharedViewState {
  assertGraphSharedViewState(value);
  return value;
}

function assertSimpleSettings(value: unknown, field: string): asserts value is GraphSimpleSettings {
  assertRecord(value, field);
  assertExactKeys(value, [
    "arrangement", "two_d_layout", "three_d_layout", "density",
    "labels", "connections", "motion", "synchronized_navigation"
  ], field);
  assertEnum(value.arrangement, GRAPH_ARRANGEMENTS, `${field}.arrangement`);
  assertEnum(value.two_d_layout, GRAPH_TWO_D_LAYOUTS, `${field}.two_d_layout`);
  assertEnum(value.three_d_layout, GRAPH_THREE_D_LAYOUTS, `${field}.three_d_layout`);
  assertEnum(value.density, GRAPH_DENSITIES, `${field}.density`);
  assertEnum(value.labels, GRAPH_LABEL_MODES, `${field}.labels`);
  assertEnum(value.connections, GRAPH_CONNECTION_MODES, `${field}.connections`);
  assertEnum(value.motion, GRAPH_MOTION_MODES, `${field}.motion`);
  assertBoolean(value.synchronized_navigation, `${field}.synchronized_navigation`);
}

function assertAdvancedShared(value: unknown, field: string): asserts value is GraphAdvancedSharedSettings {
  assertRecord(value, field);
  assertExactKeys(value, Object.keys(advancedSharedDefaults), field);
  assertFiniteRange(value.authority_band_spacing, `${field}.authority_band_spacing`, 0.5, 3);
  assertFiniteRange(value.authority_score_influence, `${field}.authority_score_influence`, 0, 0.45);
  assertFiniteRange(value.node_scale, `${field}.node_scale`, 0.25, 4);
  assertFiniteRange(value.selected_node_scale, `${field}.selected_node_scale`, 1, 5);
  assertFiniteRange(value.edge_width, `${field}.edge_width`, 0.25, 8);
  assertFiniteRange(value.edge_opacity, `${field}.edge_opacity`, 0, 1);
  assertFiniteRange(value.edge_curvature, `${field}.edge_curvature`, 0, 1);
  assertFiniteRange(value.label_threshold, `${field}.label_threshold`, 0, 1);
  assertFiniteRange(value.label_scale, `${field}.label_scale`, 0.5, 3);
  assertFiniteRange(value.lineage_emphasis, `${field}.lineage_emphasis`, 1, 5);
  assertEnum(value.color_mode, ["AUTHORITY", "HEALTH", "STATUS"], `${field}.color_mode`);
  assertBoolean(value.background_visible, `${field}.background_visible`);
  assertBoolean(value.grid_visible, `${field}.grid_visible`);
  assertBoolean(value.legend_visible, `${field}.legend_visible`);
  assertIntegerRange(value.animation_duration_ms, `${field}.animation_duration_ms`, 0, 5_000);
  assertEnum(value.motion_easing, ["LINEAR", "EASE_IN", "EASE_OUT", "EASE_IN_OUT"], `${field}.motion_easing`);
  assertNonEmptyString(value.stable_layout_seed, `${field}.stable_layout_seed`, 100);
  assertEnum(value.performance_mode, ["AUTO", "QUALITY", "BALANCED", "PERFORMANCE"], `${field}.performance_mode`);
  assertEnum(value.level_of_detail, ["AUTO", "FULL", "BALANCED", "AGGRESSIVE"], `${field}.level_of_detail`);
  assertIntegerRange(value.maximum_live_labels, `${field}.maximum_live_labels`, 0, 10_000);
  assertIntegerRange(value.frame_rate_cap, `${field}.frame_rate_cap`, 30, 120);
  if (![30, 45, 60, 90, 120].includes(value.frame_rate_cap)) {
    throw new ContractError("INVALID_GRAPH_ENUM", `${field}.frame_rate_cap is not a supported value`);
  }
  assertEnum(value.worker_usage, ["AUTO", "ON", "OFF"], `${field}.worker_usage`);
  assertEnum(value.rendering_quality, ["LOW", "MEDIUM", "HIGH"], `${field}.rendering_quality`);
}

function assertAdvancedTwoD(value: unknown, field: string): asserts value is GraphAdvancedTwoDSettings {
  assertRecord(value, field);
  assertExactKeys(value, Object.keys(advancedTwoDDefaults), field);
  assertFiniteRange(value.ring_spacing, `${field}.ring_spacing`, 20, 2_000);
  assertEnum(value.tree_orientation, ["TOP_DOWN", "LEFT_RIGHT", "CENTER_OUT"], `${field}.tree_orientation`);
  assertFiniteRange(value.sibling_spacing, `${field}.sibling_spacing`, 4, 500);
  assertFiniteRange(value.level_spacing, `${field}.level_spacing`, 10, 2_000);
  assertFiniteRange(value.sector_padding, `${field}.sector_padding`, 0, 0.45);
  assertFiniteRange(value.collision_padding, `${field}.collision_padding`, 0, 200);
  assertIntegerRange(value.force_iterations, `${field}.force_iterations`, 0, 500);
  assertEnum(value.edge_routing, ["STRAIGHT", "CURVED", "ORTHOGONAL"], `${field}.edge_routing`);
  assertBoolean(value.minimap_visible, `${field}.minimap_visible`);
  assertBoolean(value.grid_snapping, `${field}.grid_snapping`);
  assertFiniteRange(value.grid_size, `${field}.grid_size`, 1, 200);
  assertFiniteRange(value.fit_padding, `${field}.fit_padding`, 0, 500);
}

function assertAdvancedThreeD(value: unknown, field: string): asserts value is GraphAdvancedThreeDSettings {
  assertRecord(value, field);
  assertExactKeys(value, Object.keys(advancedThreeDDefaults), field);
  assertFiniteRange(value.ring_spacing, `${field}.ring_spacing`, 20, 5_000);
  assertFiniteRange(value.ellipse_eccentricity, `${field}.ellipse_eccentricity`, 0, 0.9);
  assertFiniteRange(value.orbit_tilt_degrees, `${field}.orbit_tilt_degrees`, -85, 85);
  assertFiniteRange(value.cluster_spread, `${field}.cluster_spread`, 0.1, 10);
  assertFiniteRange(value.vertical_spread, `${field}.vertical_spread`, 0, 10);
  assertFiniteRange(value.depth_scale, `${field}.depth_scale`, 0.1, 10);
  assertFiniteRange(value.collision_radius, `${field}.collision_radius`, 0, 500);
  assertFiniteRange(value.camera_field_of_view, `${field}.camera_field_of_view`, 20, 100);
  assertFiniteRange(value.near_clip, `${field}.near_clip`, 0.001, 100);
  assertFiniteRange(value.far_clip, `${field}.far_clip`, 100, 100_000);
  assertFiniteRange(value.minimum_zoom, `${field}.minimum_zoom`, 0.01, 100);
  assertFiniteRange(value.maximum_zoom, `${field}.maximum_zoom`, 0.01, 100);
  if (value.near_clip >= value.far_clip || value.minimum_zoom >= value.maximum_zoom) {
    throw new ContractError("INVALID_GRAPH_COMBINATION", `${field} clipping and zoom ranges must be increasing`);
  }
  assertFiniteRange(value.focus_distance, `${field}.focus_distance`, 1, 100_000);
  assertBoolean(value.auto_orbit_enabled, `${field}.auto_orbit_enabled`);
  assertFiniteRange(value.auto_orbit_speed, `${field}.auto_orbit_speed`, 0, 5);
  assertEnum(value.orbit_direction, ["CLOCKWISE", "COUNTERCLOCKWISE"], `${field}.orbit_direction`);
  assertBoolean(value.node_billboard, `${field}.node_billboard`);
  assertBoolean(value.edge_depth_fade, `${field}.edge_depth_fade`);
  assertFiniteRange(value.bloom_intensity, `${field}.bloom_intensity`, 0, 3);
  assertFiniteRange(value.lighting_intensity, `${field}.lighting_intensity`, 0, 5);
  assertIntegerRange(value.focus_transition_ms, `${field}.focus_transition_ms`, 0, 5_000);
}

function assertPinnedPositions(value: unknown, field: string): asserts value is GraphPinnedPosition[] {
  if (!Array.isArray(value) || value.length > 5_000) {
    throw new ContractError("INVALID_PINNED_POSITIONS", `${field} must contain at most 5000 positions`);
  }
  const keys = new Set<string>();
  value.forEach((candidate, index) => {
    assertRecord(candidate, `${field}[${index}]`);
    assertExactKeys(candidate, ["entity_id", "renderer", "x", "y", "z"], `${field}[${index}]`);
    assertUuid(candidate.entity_id, `${field}[${index}].entity_id`);
    assertEnum(candidate.renderer, GRAPH_RENDERERS, `${field}[${index}].renderer`);
    assertFiniteRange(candidate.x, `${field}[${index}].x`, -1_000_000, 1_000_000);
    assertFiniteRange(candidate.y, `${field}[${index}].y`, -1_000_000, 1_000_000);
    if (candidate.renderer === "2D") {
      if (candidate.z !== null) throw new ContractError("INVALID_PINNED_POSITION", "2D pinned positions require z=null");
    } else {
      assertFiniteRange(candidate.z, `${field}[${index}].z`, -1_000_000, 1_000_000);
    }
    const key = `${candidate.renderer}:${candidate.entity_id}`;
    if (keys.has(key)) throw new ContractError("DUPLICATE_PINNED_POSITION", `Duplicate pinned position ${key}`);
    keys.add(key);
  });
}

export function assertGraphPreferenceSettings(value: unknown): asserts value is GraphPreferenceSettings {
  assertRecord(value, "graph_preference_settings");
  assertExactKeys(value, ["simple", "advanced_shared", "advanced_2d", "advanced_3d", "pinned_positions"], "graph_preference_settings");
  assertSimpleSettings(value.simple, "graph_preference_settings.simple");
  assertAdvancedShared(value.advanced_shared, "graph_preference_settings.advanced_shared");
  assertAdvancedTwoD(value.advanced_2d, "graph_preference_settings.advanced_2d");
  assertAdvancedThreeD(value.advanced_3d, "graph_preference_settings.advanced_3d");
  assertPinnedPositions(value.pinned_positions, "graph_preference_settings.pinned_positions");
}

function mergeKnown<T extends object>(defaults: T, value: unknown): T {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return { ...defaults };
  return { ...defaults, ...value };
}

export function normalizeGraphPreferenceSettings(
  value: unknown,
  schemaVersion: 1 | typeof GRAPH_PREFERENCES_SCHEMA_VERSION
): { settings: GraphPreferenceSettings; migrated_from_schema_version: number | null } {
  if (schemaVersion !== 1 && schemaVersion !== GRAPH_PREFERENCES_SCHEMA_VERSION) {
    throw new ContractError("GRAPH_SCHEMA_VERSION", `Unsupported graph preference schema version ${schemaVersion}`);
  }
  let normalized: GraphPreferenceSettings;
  if (schemaVersion === 1) {
    assertRecord(value, "graph_preference_settings");
    assertExactKeys(value, ["simple", "advanced_shared", "advanced_2d", "advanced_3d", "pinned_positions"], "graph_preference_settings");
    normalized = {
      simple: mergeKnown(simpleDefaults, value.simple),
      advanced_shared: mergeKnown(advancedSharedDefaults, value.advanced_shared),
      advanced_2d: mergeKnown(advancedTwoDDefaults, value.advanced_2d),
      advanced_3d: mergeKnown(advancedThreeDDefaults, value.advanced_3d),
      pinned_positions: Array.isArray(value.pinned_positions) ? value.pinned_positions as GraphPinnedPosition[] : []
    };
  } else {
    normalized = value as GraphPreferenceSettings;
  }
  assertGraphPreferenceSettings(normalized);
  return {
    settings: normalized,
    migrated_from_schema_version: schemaVersion === GRAPH_PREFERENCES_SCHEMA_VERSION ? null : schemaVersion
  };
}

export function assertGraphViewPreferences(value: unknown): asserts value is GraphViewPreferences {
  assertRecord(value, "graph_view_preferences");
  assertExactKeys(value, [
    "contract_version", "schema_version", "preference_id", "user_id", "organization_id",
    "source", "settings", "version", "created_at", "updated_at", "migrated_from_schema_version"
  ], "graph_view_preferences");
  if (
    value.contract_version !== GRAPH_CONTRACT_VERSION
    || value.schema_version !== GRAPH_PREFERENCES_SCHEMA_VERSION
  ) {
    throw new ContractError("GRAPH_CONTRACT_VERSION", "graph_view_preferences uses an unsupported version");
  }
  if (value.preference_id !== null) assertUuid(value.preference_id, "graph_view_preferences.preference_id");
  assertUuid(value.user_id, "graph_view_preferences.user_id");
  assertStringId(value.organization_id, "graph_view_preferences.organization_id");
  assertEnum(value.source, ["CANONICAL_DEFAULTS", "SAVED_OVERRIDE"], "graph_view_preferences.source");
  assertGraphPreferenceSettings(value.settings);
  assertSafeNonNegativeInteger(value.version, "graph_view_preferences.version");
  if (value.source === "CANONICAL_DEFAULTS") {
    if (value.preference_id !== null || value.version !== 0 || value.created_at !== null || value.updated_at !== null) {
      throw new ContractError("INVALID_DEFAULT_PREFERENCES", "Canonical defaults cannot claim a persisted identifier or version");
    }
  } else {
    if (value.preference_id === null || value.version < 1 || value.created_at === null || value.updated_at === null) {
      throw new ContractError("INVALID_SAVED_PREFERENCES", "Saved preferences require an identifier, timestamps, and positive version");
    }
  }
  if (value.created_at !== null) assertIsoDate(value.created_at, "graph_view_preferences.created_at");
  if (value.updated_at !== null) assertIsoDate(value.updated_at, "graph_view_preferences.updated_at");
  if (value.migrated_from_schema_version !== null) {
    assertIntegerRange(value.migrated_from_schema_version, "graph_view_preferences.migrated_from_schema_version", 1, GRAPH_PREFERENCES_SCHEMA_VERSION - 1);
  }
}

export function parseGraphViewPreferences(value: unknown): GraphViewPreferences {
  assertGraphViewPreferences(value);
  return value;
}

function assertIdempotencyKey(value: unknown, field: string): asserts value is string {
  assertNonEmptyString(value, field, 255);
  if (value.length < 12) throw new ContractError("IDEMPOTENCY_KEY", `${field} must be at least 12 characters`);
}

export function parseGraphViewPreferencesUpdateRequest(value: unknown): {
  readonly contract_version: typeof GRAPH_CONTRACT_VERSION;
  readonly schema_version: typeof GRAPH_PREFERENCES_SCHEMA_VERSION;
  readonly expected_version: number;
  readonly idempotency_key: string;
  readonly settings: GraphPreferenceSettings;
  readonly migrated_from_schema_version: number | null;
} {
  assertRecord(value, "graph_preferences_update");
  assertExactKeys(value, ["contract_version", "schema_version", "expected_version", "idempotency_key", "settings"], "graph_preferences_update");
  if (value.contract_version !== GRAPH_CONTRACT_VERSION) {
    throw new ContractError("GRAPH_CONTRACT_VERSION", "graph_preferences_update.contract_version is unsupported");
  }
  if (value.schema_version !== 1 && value.schema_version !== GRAPH_PREFERENCES_SCHEMA_VERSION) {
    throw new ContractError("GRAPH_SCHEMA_VERSION", "graph_preferences_update.schema_version is unsupported");
  }
  assertSafeNonNegativeInteger(value.expected_version, "graph_preferences_update.expected_version");
  assertIdempotencyKey(value.idempotency_key, "graph_preferences_update.idempotency_key");
  const normalized = normalizeGraphPreferenceSettings(value.settings, value.schema_version);
  return {
    contract_version: GRAPH_CONTRACT_VERSION,
    schema_version: GRAPH_PREFERENCES_SCHEMA_VERSION,
    expected_version: value.expected_version,
    idempotency_key: value.idempotency_key,
    settings: normalized.settings,
    migrated_from_schema_version: normalized.migrated_from_schema_version
  };
}

export function parseGraphViewPreferencesResetRequest(value: unknown): GraphViewPreferencesResetRequest {
  assertRecord(value, "graph_preferences_reset");
  assertExactKeys(value, ["contract_version", "expected_version", "idempotency_key", "reset_scope"], "graph_preferences_reset");
  if (value.contract_version !== GRAPH_CONTRACT_VERSION) {
    throw new ContractError("GRAPH_CONTRACT_VERSION", "graph_preferences_reset.contract_version is unsupported");
  }
  assertSafeNonNegativeInteger(value.expected_version, "graph_preferences_reset.expected_version");
  assertIdempotencyKey(value.idempotency_key, "graph_preferences_reset.idempotency_key");
  assertEnum(value.reset_scope, GRAPH_PREFERENCE_RESET_SCOPES, "graph_preferences_reset.reset_scope");
  return value as unknown as GraphViewPreferencesResetRequest;
}

export function assertGraphViewPreferencesMutationResponse(
  value: unknown
): asserts value is GraphViewPreferencesMutationResponse {
  assertRecord(value, "graph_preferences_mutation_response");
  assertExactKeys(value, ["preferences", "idempotent_replay", "event_ids"], "graph_preferences_mutation_response");
  assertGraphViewPreferences(value.preferences);
  assertBoolean(value.idempotent_replay, "graph_preferences_mutation_response.idempotent_replay");
  if (!Array.isArray(value.event_ids)) throw new ContractError("INVALID_EVENTS", "event_ids must be an array");
  value.event_ids.forEach((eventId, index) => assertUuid(eventId, `event_ids[${index}]`));
}

export function parseGraphViewPreferencesMutationResponse(
  value: unknown
): GraphViewPreferencesMutationResponse {
  assertGraphViewPreferencesMutationResponse(value);
  return value;
}

export function assertGraphRendererTelemetryRequest(
  value: unknown
): asserts value is GraphRendererTelemetryRequest {
  assertRecord(value, "graph_renderer_telemetry");
  assertExactKeys(value, [
    "contract_version", "schema_version", "telemetry_id", "observed_at",
    "renderer", "layout_pattern", "projection_id", "projection_version",
    "node_count", "edge_count", "settings_version", "layout_time_ms",
    "render_time_ms", "sample_window_ms", "frame_rate_fps",
    "dropped_frame_rate_ratio", "error_code"
  ], "graph_renderer_telemetry");
  if (value.contract_version !== GRAPH_CONTRACT_VERSION || value.schema_version !== 1) {
    throw new ContractError(
      "GRAPH_TELEMETRY_VERSION",
      "graph_renderer_telemetry uses an unsupported contract or schema version"
    );
  }
  assertUuid(value.telemetry_id, "graph_renderer_telemetry.telemetry_id");
  assertIsoDate(value.observed_at, "graph_renderer_telemetry.observed_at");
  assertEnum(value.renderer, GRAPH_RENDERERS, "graph_renderer_telemetry.renderer");
  if (value.renderer === "2D") {
    assertEnum(
      value.layout_pattern,
      GRAPH_TWO_D_LAYOUTS,
      "graph_renderer_telemetry.layout_pattern"
    );
  } else {
    assertEnum(
      value.layout_pattern,
      GRAPH_THREE_D_LAYOUTS,
      "graph_renderer_telemetry.layout_pattern"
    );
  }
  assertUuid(value.projection_id, "graph_renderer_telemetry.projection_id");
  assertSafeNonNegativeInteger(
    value.projection_version,
    "graph_renderer_telemetry.projection_version"
  );
  assertIntegerRange(value.node_count, "graph_renderer_telemetry.node_count", 0, 100_000);
  assertIntegerRange(value.edge_count, "graph_renderer_telemetry.edge_count", 0, 200_000);
  assertSafeNonNegativeInteger(
    value.settings_version,
    "graph_renderer_telemetry.settings_version"
  );
  assertFiniteRange(
    value.layout_time_ms,
    "graph_renderer_telemetry.layout_time_ms",
    0,
    600_000
  );
  assertFiniteRange(
    value.render_time_ms,
    "graph_renderer_telemetry.render_time_ms",
    0,
    600_000
  );
  assertFiniteRange(
    value.sample_window_ms,
    "graph_renderer_telemetry.sample_window_ms",
    1,
    600_000
  );
  assertFiniteRange(
    value.frame_rate_fps,
    "graph_renderer_telemetry.frame_rate_fps",
    0,
    1_000
  );
  assertFiniteRange(
    value.dropped_frame_rate_ratio,
    "graph_renderer_telemetry.dropped_frame_rate_ratio",
    0,
    1
  );
  assertEnum(
    value.error_code,
    GRAPH_RENDERER_ERROR_CODES,
    "graph_renderer_telemetry.error_code"
  );
}

export function parseGraphRendererTelemetryRequest(
  value: unknown
): GraphRendererTelemetryRequest {
  assertGraphRendererTelemetryRequest(value);
  return value;
}

export function assertGraphRendererTelemetryResponse(
  value: unknown
): asserts value is GraphRendererTelemetryResponse {
  assertRecord(value, "graph_renderer_telemetry_response");
  assertExactKeys(value, [
    "contract_version", "schema_version", "telemetry_id",
    "organization_id", "accepted", "recorded_at"
  ], "graph_renderer_telemetry_response");
  if (
    value.contract_version !== GRAPH_CONTRACT_VERSION
    || value.schema_version !== 1
    || value.accepted !== true
  ) {
    throw new ContractError(
      "GRAPH_TELEMETRY_RESPONSE",
      "graph_renderer_telemetry_response is not a canonical acceptance receipt"
    );
  }
  assertUuid(value.telemetry_id, "graph_renderer_telemetry_response.telemetry_id");
  assertStringId(
    value.organization_id,
    "graph_renderer_telemetry_response.organization_id"
  );
  assertIsoDate(value.recorded_at, "graph_renderer_telemetry_response.recorded_at");
}

export function parseGraphRendererTelemetryResponse(
  value: unknown
): GraphRendererTelemetryResponse {
  assertGraphRendererTelemetryResponse(value);
  return value;
}
