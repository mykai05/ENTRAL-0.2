"use client";

import type {
  EntitySummary,
  GraphArrangement as ContractGraphArrangement,
  GraphConnectionMode,
  GraphDensity as ContractGraphDensity,
  GraphLabelMode,
  GraphMotionMode,
  GraphPreferenceResetScope,
  GraphPreferenceSettings,
  GraphProjection as CanonicalGraphProjection,
  GraphRenderer,
  GraphRendererErrorCode,
  GraphRendererTelemetryRequest,
  GraphThreeDLayout,
  GraphTwoDLayout,
  GraphViewPreferences
} from "@entral/contracts";
import {
  assertGraphPreferenceSettings,
  canonicalGraphPreferenceSettings,
  GRAPH_CONTRACT_VERSION,
  resetGraphPreferenceSettings
} from "@entral/contracts";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Columns2,
  Download,
  Focus,
  ImageDown,
  PauseCircle,
  Pin,
  PlayCircle,
  RotateCcw,
  Rows3,
  Search,
  Settings2,
  PinOff,
  X
} from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { ApiError } from "../lib/api";
import {
  recordCanonicalGraphTelemetry,
  resetCanonicalGraphPreferences,
  updateCanonicalGraphPreferences
} from "../lib/canonical-graph";
import {
  adaptCanonicalGraphProjection,
  buildRendererGraphProjection,
  createGraphProjectionIndex,
  filterGraphProjection,
  graphProjectionParityKey
} from "../lib/graph-projection";
import {
  graph2DForceIterationsSupported,
  layoutGraph2D,
  layoutGraph3D,
  type Graph2DLayoutPattern,
  type Graph3DLayoutPattern,
  type GraphLayout2DOptions,
  type GraphLayout2DResult,
  type GraphLayout3DOptions,
  type GraphLayout3DResult
} from "../lib/graph-layouts";
import {
  graphLayoutWorkerSelected,
  GraphLayoutExecutionError,
  GraphLayoutStaleResultError,
  GraphLayoutWorkerCoordinator,
  type GraphLayoutExecutionSource,
  type GraphLayoutWorkerFailureCode
} from "../lib/graph-layout-worker-client";
import type {
  CanonicalRendererFrameDiagnostics,
  CanonicalWebGlRendererEvent
} from "../lib/canonical-universe";
import { effectiveGraphRendererSettings } from "../lib/graph-renderer-performance";
import {
  applyAuthorizedGraphDeepLink,
  clearGraphSelection,
  createGraphViewState,
  EMPTY_GRAPH_FILTERS,
  focusGraphEntity,
  isolateGraphLineage,
  navigateGraphHistory,
  navigateGraphParent,
  parseAuthorizedGraphDeepLink,
  reconcileGraphViewState,
  resetGraphNavigation,
  selectGraphEntity,
  serializeAuthorizedGraphDeepLink,
  setGraphExpansion,
  updateGraphFilters,
  updateGraphSearch,
  visibleGraphEntityIds,
  type GraphArrangement,
  type GraphViewState
} from "../lib/graph-view-state";
import {
  CanonicalGraphEmptyState,
  CanonicalGraphErrorBoundary,
  CanonicalGraphTextualHierarchy
} from "./CanonicalGraphErrorBoundary";
import { CanonicalUniverse3DGraph } from "./CanonicalUniverse3DGraph";
import { CanonicalUniverseGraph } from "./CanonicalUniverseGraph";

export type CanonicalGraphLayout = GraphArrangement;
export type CanonicalGraphDimension = "2d" | "3d";
export type CanonicalGraphAssistantCommand =
  | { readonly id: number; readonly type: "collapse-inspector"; readonly collapsed: boolean }
  | { readonly id: number; readonly type: "fullscreen"; readonly dimension: CanonicalGraphDimension | null }
  | { readonly id: number; readonly type: "layout"; readonly layout: CanonicalGraphLayout }
  | { readonly id: number; readonly type: "motion"; readonly paused: boolean }
  | { readonly id: number; readonly type: "select"; readonly entityId: string };
export type CanonicalGraphAssistantCommandInput =
  CanonicalGraphAssistantCommand extends infer Command
    ? Command extends { readonly id: number }
      ? Omit<Command, "id">
      : never
    : never;

const arrangementFromContract: Readonly<Record<ContractGraphArrangement, GraphArrangement>> = {
  AUTO: "auto",
  SIDE_BY_SIDE: "side-by-side",
  STACK: "stacked",
  TWO_D_ONLY: "2d-only",
  THREE_D_ONLY: "3d-only"
};

const arrangementToContract: Readonly<Record<GraphArrangement, ContractGraphArrangement>> = {
  auto: "AUTO",
  "side-by-side": "SIDE_BY_SIDE",
  stacked: "STACK",
  "2d-only": "TWO_D_ONLY",
  "3d-only": "THREE_D_ONLY"
};

const twoDPattern: Readonly<Record<GraphTwoDLayout, Graph2DLayoutPattern>> = {
  AUTHORITY_RADIAL: "authority-radial",
  HIERARCHY_TREE: "hierarchy-tree",
  DOMAIN_CLUSTERS: "domain-clusters",
  COMPACT_RADIAL: "compact-radial"
};

const threeDPattern: Readonly<Record<GraphThreeDLayout, Graph3DLayoutPattern>> = {
  AUTHORITY_RINGS: "authority-rings",
  ELLIPTICAL_ORBITS: "elliptical-orbits",
  SPHERICAL_SHELLS: "spherical-shells",
  DOMAIN_CLUSTERS: "domain-clusters"
};

const densityForLayout: Readonly<Record<ContractGraphDensity, "compact" | "balanced" | "spacious">> = {
  COMPACT: "compact",
  BALANCED: "balanced",
  SPACIOUS: "spacious"
};

const legacyGraphSettings = canonicalGraphPreferenceSettings();
const legacyGraphPreferences: GraphViewPreferences = {
  contract_version: "1.0.0",
  schema_version: 2,
  preference_id: null,
  user_id: "legacy-member-graph",
  organization_id: "legacy-member-graph",
  source: "CANONICAL_DEFAULTS",
  settings: {
    ...legacyGraphSettings,
    simple: {
      ...legacyGraphSettings.simple,
      arrangement: "SIDE_BY_SIDE"
    }
  },
  version: 0,
  created_at: null,
  updated_at: null,
  migrated_from_schema_version: null
};

function selectedTarget(state: GraphViewState) {
  return state.focusedEntityId ?? state.selectedEntityId;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function csvCell(value: unknown) {
  const raw = value === null || value === undefined ? "" : String(value);
  // Quoting alone does not prevent spreadsheet formula execution. Prefix
  // formula-like cells with an apostrophe before RFC 4180 escaping.
  const text = /^(?:[\t\r\n]|[\t\r\n ]*[=+\-@])/.test(raw) ? `'${raw}` : raw;
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function settingMatches(query: string, ...labels: string[]) {
  const normalized = query.trim().toLocaleLowerCase();
  return !normalized || labels.some((label) => label.toLocaleLowerCase().includes(normalized));
}

function boundedTelemetryNumber(
  value: number,
  maximum: number,
  minimum = 0
) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

function graphTelemetryId() {
  if (typeof crypto === "undefined") return null;
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  if (typeof crypto.getRandomValues !== "function") return null;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10).join("")
  ].join("-");
}

function GraphLayoutFailure({
  renderer
}: {
  readonly renderer: GraphRenderer;
}): React.ReactNode {
  throw new Error(`${renderer} canonical graph layout failed.`);
}

type GraphLayoutComputation<Result> = {
  readonly error: boolean;
  readonly layout: Result | null;
  readonly loading: boolean;
  readonly requestKey: string;
  readonly source: GraphLayoutExecutionSource | null;
  readonly workerFailureCode: GraphLayoutWorkerFailureCode | null;
};

function GraphLayoutLoading({
  entities,
  renderer
}: {
  readonly entities: readonly EntitySummary[];
  readonly renderer: GraphRenderer;
}) {
  return (
    <section aria-live="polite" className="phase195-layout-loading" role="status">
      <strong>Computing the authorized {renderer} graph layout...</strong>
      <p>
        The canonical projection remains unchanged while the layout worker
        completes. No nodes, edges, or sample data are being substituted.
      </p>
      <CanonicalGraphTextualHierarchy
        entities={entities}
        label={`${renderer} Graph`}
      />
    </section>
  );
}

export function CanonicalGraphWorkspace({
  assistantCommand,
  entities: _legacyEntities,
  eventSequence,
  onOpenFullRecord,
  onPreferencesChange = () => undefined,
  onPreferredDimensionChange,
  onSelectedEntityChange,
  organizationId = "legacy-member-graph",
  preferences = legacyGraphPreferences,
  preferredDimension,
  projection,
  scopeBusinessId = null,
  selectedEntityId
}: {
  assistantCommand?: CanonicalGraphAssistantCommand | null;
  entities: readonly EntitySummary[];
  eventSequence: number;
  onOpenFullRecord: (entityId: string) => void;
  onPreferencesChange?: (preferences: GraphViewPreferences) => void;
  onPreferredDimensionChange: (dimension: CanonicalGraphDimension) => void;
  onSelectedEntityChange: (entityId: string | null) => void;
  organizationId?: string;
  preferences?: GraphViewPreferences;
  preferredDimension: CanonicalGraphDimension | null;
  projection?: CanonicalGraphProjection;
  scopeBusinessId?: string | null;
  selectedEntityId: string | null;
}) {
  const rendererProjection = useMemo(
    () => projection
      ? adaptCanonicalGraphProjection(projection, {
        entities: _legacyEntities,
        eventSequence
      })
      : buildRendererGraphProjection(_legacyEntities, {
        organizationId,
        projectionVersion: eventSequence,
        scopeKey: `organization:${organizationId}`
      }),
    [_legacyEntities, eventSequence, organizationId, projection]
  );
  const persistenceEnabled = projection !== undefined;
  const projectionIndex = useMemo(
    () => createGraphProjectionIndex(rendererProjection),
    [rendererProjection]
  );
  const [settings, setSettings] = useState<GraphPreferenceSettings>(preferences.settings);
  const [viewState, setViewState] = useState<GraphViewState>(() =>
    createGraphViewState(rendererProjection, {
      arrangement: arrangementFromContract[preferences.settings.simple.arrangement],
      filters: scopeBusinessId ? { businessIds: [scopeBusinessId] } : undefined,
      selectedEntityId,
      scopeKey: `organization:${organizationId}`
    })
  );
  const [movementPaused, setMovementPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [narrowViewport, setNarrowViewport] = useState(false);
  const [fullscreenDimension, setFullscreenDimension] = useState<CanonicalGraphDimension | null>(null);
  const [usesViewportFallback, setUsesViewportFallback] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [viewFitSignal, setViewFitSignal] = useState(0);
  const [viewFocusSignal, setViewFocusSignal] = useState(0);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedSettingsExpanded, setAdvancedSettingsExpanded] = useState(false);
  const [advancedSearch, setAdvancedSearch] = useState("");
  const [saveStatus, setSaveStatus] = useState(
    preferences.source === "SAVED_OVERRIDE" ? `Saved settings v${preferences.version}` : "Canonical defaults"
  );
  const [settingsDirty, setSettingsDirty] = useState(false);
  const workspaceRef = useRef<HTMLElement>(null);
  const twoDimensionalPanelRef = useRef<HTMLDivElement>(null);
  const threeDimensionalPanelRef = useRef<HTMLDivElement>(null);
  const fullscreenTriggerRef = useRef<HTMLButtonElement | null>(null);
  const handledAssistantCommandRef = useRef<number | null>(null);
  const deepLinkAppliedProjectionRef = useRef<string | null>(null);
  const enforcedBusinessScopeRef = useRef<string | null>(scopeBusinessId);
  const preScopeBusinessFiltersRef = useRef<readonly string[]>([]);
  const settingsRevisionRef = useRef(0);
  const lastTelemetryKeyRef = useRef<Record<GraphRenderer, string>>({
    "2D": "",
    "3D": ""
  });
  const lastWebGlTelemetryKeyRef = useRef("");
  const layout2DDurationMsRef = useRef(0);
  const layout3DDurationMsRef = useRef(0);
  const layoutCoordinatorRef = useRef<GraphLayoutWorkerCoordinator | null>(null);
  const layoutCoordinatorLifecycleRef = useRef(0);
  if (!layoutCoordinatorRef.current) {
    layoutCoordinatorRef.current = new GraphLayoutWorkerCoordinator();
  }
  const [workerLayout2D, setWorkerLayout2D] = useState<
    GraphLayoutComputation<GraphLayout2DResult>
  >({
    error: false,
    layout: null,
    loading: true,
    requestKey: "",
    source: null,
    workerFailureCode: null
  });
  const [workerLayout3D, setWorkerLayout3D] = useState<
    GraphLayoutComputation<GraphLayout3DResult>
  >({
    error: false,
    layout: null,
    loading: true,
    requestKey: "",
    source: null,
    workerFailureCode: null
  });
  const effectiveMovementPaused =
    movementPaused
    || reducedMotion
    || settings.simple.motion === "OFF"
    || settings.simple.motion === "REDUCED";

  const visibleEntityIds = useMemo(
    () => visibleGraphEntityIds(rendererProjection, {
      expandedEntityIds: viewState.expandedEntityIds,
      filters: viewState.filters,
      isolatedEntityId: viewState.isolatedEntityId,
      searchQuery: viewState.searchQuery
    }),
    // Selection, focus, breadcrumbs, and history do not alter projection
    // visibility and must not restart both large-graph layout pipelines.
    [
      rendererProjection,
      viewState.expandedEntityIds,
      viewState.filters,
      viewState.isolatedEntityId,
      viewState.searchQuery
    ]
  );
  const activeProjection = useMemo(
    () => filterGraphProjection(rendererProjection, visibleEntityIds, {
      includeAncestors: true,
      includeDescendants: false
    }),
    [rendererProjection, visibleEntityIds]
  );
  const activeEntities = useMemo(
    () => activeProjection.entities.map((node) => node.entity),
    [activeProjection]
  );
  const effectiveRendererPerformance = useMemo(
    () => effectiveGraphRendererSettings(settings, activeProjection.entityCount),
    [activeProjection.entityCount, settings]
  );
  const rendererSettings = effectiveRendererPerformance.settings;
  const authorizedDomainIds = useMemo(
    () => [...new Set(
      rendererProjection.entities.flatMap((node) => node.domainId ? [node.domainId] : [])
    )].sort(),
    [rendererProjection]
  );
  const authorizedBusinessIds = useMemo(
    () => [...new Set(
      rendererProjection.entities.flatMap((node) =>
        node.entity.assigned_business_id ? [node.entity.assigned_business_id] : []
      )
    )].sort(),
    [rendererProjection]
  );
  const twoDPins = useMemo(
    () => Object.fromEntries(
      settings.pinned_positions
        .filter((position) => position.renderer === "2D")
        .map((position) => [position.entity_id, { x: position.x, y: position.y }])
    ),
    [settings.pinned_positions]
  );
  const threeDPins = useMemo(
    () => Object.fromEntries(
      settings.pinned_positions
        .filter((position) => position.renderer === "3D" && position.z !== null)
        .map((position) => [position.entity_id, { x: position.x, y: position.y, z: position.z! }])
    ),
    [settings.pinned_positions]
  );
  const selectedTwoDPattern = twoDPattern[settings.simple.two_d_layout];
  const selectedThreeDPattern = threeDPattern[settings.simple.three_d_layout];
  const twoDForceSupported = graph2DForceIterationsSupported(
    selectedTwoDPattern
  );
  const layout2DOptions = useMemo<GraphLayout2DOptions>(
    () => ({
      authorityScoreInfluence: settings.advanced_shared.authority_score_influence,
      authoritySpacingScale:
        settings.advanced_shared.authority_band_spacing
        * settings.advanced_2d.ring_spacing / 160,
      collisionPadding: settings.advanced_2d.collision_padding,
      density: densityForLayout[settings.simple.density],
      forceIterations: twoDForceSupported
        ? settings.advanced_2d.force_iterations
        : 0,
      levelSpacing: settings.advanced_2d.level_spacing / 64,
      nodeRadius: 8 * settings.advanced_shared.node_scale,
      pins: twoDPins,
      sectorPadding: settings.advanced_2d.sector_padding,
      seed: settings.advanced_shared.stable_layout_seed,
      siblingSpacing: settings.advanced_2d.sibling_spacing / 48,
      treeOrientation:
        settings.advanced_2d.tree_orientation === "LEFT_RIGHT"
          ? "left-right"
          : settings.advanced_2d.tree_orientation === "CENTER_OUT"
            ? "center-out"
            : "top-down"
    }),
    [
      settings.advanced_2d.collision_padding,
      settings.advanced_2d.force_iterations,
      settings.advanced_2d.level_spacing,
      settings.advanced_2d.ring_spacing,
      settings.advanced_2d.sector_padding,
      settings.advanced_2d.sibling_spacing,
      settings.advanced_2d.tree_orientation,
      settings.advanced_shared.authority_band_spacing,
      settings.advanced_shared.authority_score_influence,
      settings.advanced_shared.node_scale,
      settings.advanced_shared.stable_layout_seed,
      settings.simple.density,
      twoDForceSupported,
      twoDPins
    ]
  );
  const layout3DOptions = useMemo<GraphLayout3DOptions>(
    () => ({
      authorityScoreInfluence: settings.advanced_shared.authority_score_influence,
      authoritySpacingScale:
        settings.advanced_shared.authority_band_spacing
        * settings.advanced_3d.ring_spacing / 220,
      clusterSpread: settings.advanced_3d.cluster_spread,
      collisionPadding: settings.advanced_3d.collision_radius,
      density: densityForLayout[settings.simple.density],
      depthScale: settings.advanced_3d.depth_scale,
      ellipseEccentricity: settings.advanced_3d.ellipse_eccentricity,
      nodeRadius: 8 * settings.advanced_shared.node_scale,
      orbitTilt: settings.advanced_3d.orbit_tilt_degrees * Math.PI / 180,
      pins: threeDPins,
      seed: settings.advanced_shared.stable_layout_seed,
      verticalSpread: settings.advanced_3d.vertical_spread
    }),
    [
      settings.advanced_3d.cluster_spread,
      settings.advanced_3d.collision_radius,
      settings.advanced_3d.depth_scale,
      settings.advanced_3d.ellipse_eccentricity,
      settings.advanced_3d.orbit_tilt_degrees,
      settings.advanced_3d.ring_spacing,
      settings.advanced_3d.vertical_spread,
      settings.advanced_shared.authority_band_spacing,
      settings.advanced_shared.authority_score_influence,
      settings.advanced_shared.node_scale,
      settings.advanced_shared.stable_layout_seed,
      settings.simple.density,
      threeDPins
    ]
  );
  const layout2DRequestKey = useMemo(
    () => JSON.stringify([
      activeProjection.projectionId,
      selectedTwoDPattern,
      layout2DOptions,
      settings.advanced_shared.worker_usage
    ]),
    [
      activeProjection.projectionId,
      layout2DOptions,
      selectedTwoDPattern,
      settings.advanced_shared.worker_usage
    ]
  );
  const layout3DRequestKey = useMemo(
    () => JSON.stringify([
      activeProjection.projectionId,
      selectedThreeDPattern,
      layout3DOptions,
      settings.advanced_shared.worker_usage
    ]),
    [
      activeProjection.projectionId,
      layout3DOptions,
      selectedThreeDPattern,
      settings.advanced_shared.worker_usage
    ]
  );
  const workerLayoutSelected = graphLayoutWorkerSelected(
    settings.advanced_shared.worker_usage,
    activeProjection.entityCount
  );
  const synchronousLayout2D = useMemo<
    GraphLayoutComputation<GraphLayout2DResult> | null
  >(
    () => {
      if (workerLayoutSelected) return null;
      const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
      try {
        const layout = layoutGraph2D(
          activeProjection,
          selectedTwoDPattern,
          layout2DOptions
        );
        return {
          error: false,
          layout,
          loading: false,
          requestKey: layout2DRequestKey,
          source: "synchronous-policy",
          workerFailureCode: null
        };
      } catch {
        return {
          error: true,
          layout: null,
          loading: false,
          requestKey: layout2DRequestKey,
          source: null,
          workerFailureCode: null
        };
      } finally {
        const finishedAt = typeof performance === "undefined" ? Date.now() : performance.now();
        layout2DDurationMsRef.current = Math.max(0, finishedAt - startedAt);
      }
    },
    [
      activeProjection,
      layout2DOptions,
      layout2DRequestKey,
      selectedTwoDPattern,
      workerLayoutSelected
    ]
  );
  const synchronousLayout3D = useMemo<
    GraphLayoutComputation<GraphLayout3DResult> | null
  >(
    () => {
      if (workerLayoutSelected) return null;
      const startedAt = typeof performance === "undefined" ? Date.now() : performance.now();
      try {
        const layout = layoutGraph3D(
          activeProjection,
          selectedThreeDPattern,
          layout3DOptions
        );
        return {
          error: false,
          layout,
          loading: false,
          requestKey: layout3DRequestKey,
          source: "synchronous-policy",
          workerFailureCode: null
        };
      } catch {
        return {
          error: true,
          layout: null,
          loading: false,
          requestKey: layout3DRequestKey,
          source: null,
          workerFailureCode: null
        };
      } finally {
        const finishedAt = typeof performance === "undefined" ? Date.now() : performance.now();
        layout3DDurationMsRef.current = Math.max(0, finishedAt - startedAt);
      }
    },
    [
      activeProjection,
      layout3DOptions,
      layout3DRequestKey,
      selectedThreeDPattern,
      workerLayoutSelected
    ]
  );
  const pendingLayout2D: GraphLayoutComputation<GraphLayout2DResult> = {
    error: false,
    layout: null,
    loading: true,
    requestKey: layout2DRequestKey,
    source: null,
    workerFailureCode: null
  };
  const pendingLayout3D: GraphLayoutComputation<GraphLayout3DResult> = {
    error: false,
    layout: null,
    loading: true,
    requestKey: layout3DRequestKey,
    source: null,
    workerFailureCode: null
  };
  const layout2DComputation = workerLayoutSelected
    ? workerLayout2D.requestKey === layout2DRequestKey
      ? workerLayout2D
      : pendingLayout2D
    : synchronousLayout2D!;
  const layout3DComputation = workerLayoutSelected
    ? workerLayout3D.requestKey === layout3DRequestKey
      ? workerLayout3D
      : pendingLayout3D
    : synchronousLayout3D!;
  const layout2D = layout2DComputation.layout;
  const layout3D = layout3DComputation.layout;
  const requestedArrangement = viewState.arrangement;
  const effectiveArrangement: GraphArrangement =
    narrowViewport && (requestedArrangement === "auto" || requestedArrangement === "side-by-side")
      ? "stacked"
      : requestedArrangement === "auto"
        ? "side-by-side"
        : requestedArrangement;
  const render2D = effectiveArrangement !== "3d-only";
  const render3D = effectiveArrangement !== "2d-only";
  const parityKey = graphProjectionParityKey(activeProjection);
  const activeProjectionVersion = rendererProjection.projectionVersion ?? eventSequence;
  const activeOrganizationId = rendererProjection.organizationId ?? organizationId;
  const submitRendererTelemetry = useCallback((
    renderer: GraphRenderer,
    input: {
      readonly droppedFrameRate: number;
      readonly errorCode: GraphRendererErrorCode;
      readonly frameRate: number;
      readonly layoutTimeMs: number;
      readonly renderTimeMs: number;
      readonly sampleWindowMs: number;
    }
  ) => {
    if (!persistenceEnabled) return;
    const telemetryId = graphTelemetryId();
    if (!telemetryId) return;
    const request: GraphRendererTelemetryRequest = {
      contract_version: GRAPH_CONTRACT_VERSION,
      schema_version: 1,
      telemetry_id: telemetryId,
      observed_at: new Date().toISOString(),
      renderer,
      layout_pattern:
        renderer === "2D"
          ? settings.simple.two_d_layout
          : settings.simple.three_d_layout,
      projection_id: rendererProjection.rootIds[0]!,
      projection_version: Math.floor(boundedTelemetryNumber(
        activeProjectionVersion,
        Number.MAX_SAFE_INTEGER
      )),
      node_count: Math.floor(boundedTelemetryNumber(activeProjection.entityCount, 100_000)),
      edge_count: Math.floor(boundedTelemetryNumber(activeProjection.edgeCount, 200_000)),
      settings_version: Math.floor(boundedTelemetryNumber(
        preferences.version,
        Number.MAX_SAFE_INTEGER
      )),
      layout_time_ms: boundedTelemetryNumber(input.layoutTimeMs, 600_000),
      render_time_ms: boundedTelemetryNumber(input.renderTimeMs, 600_000),
      sample_window_ms: boundedTelemetryNumber(input.sampleWindowMs, 600_000, 1),
      frame_rate_fps: boundedTelemetryNumber(input.frameRate, 1_000),
      dropped_frame_rate_ratio: boundedTelemetryNumber(input.droppedFrameRate, 1),
      error_code: input.errorCode
    };
    void recordCanonicalGraphTelemetry(organizationId, request).catch(() => {
      // Telemetry is deliberately best effort and payload-free. A metrics
      // transport outage must never replace or corrupt the authorized graph.
    });
  }, [
    activeProjection.edgeCount,
    activeProjection.entityCount,
    activeProjectionVersion,
    organizationId,
    persistenceEnabled,
    preferences.version,
    rendererProjection.projectionId,
    rendererProjection.rootIds,
    settings.simple.three_d_layout,
    settings.simple.two_d_layout
  ]);

  const submitFrameTelemetry = useCallback((
    diagnostics: CanonicalRendererFrameDiagnostics
  ) => {
    if (!persistenceEnabled || settingsDirty) return;
    const computation = diagnostics.renderer === "2D"
      ? layout2DComputation
      : layout3DComputation;
    if (!computation.layout) return;
    const errorCode: GraphRendererErrorCode = computation.workerFailureCode
      ? "GRAPH_WORKER_FAILURE"
      : diagnostics.errorCode;
    const telemetryKey = [
      rendererProjection.projectionId,
      activeProjectionVersion,
      preferences.version,
      diagnostics.renderer,
      computation.source ?? "unknown",
      computation.workerFailureCode ?? "worker-ok",
      errorCode
    ].join(":");
    if (lastTelemetryKeyRef.current[diagnostics.renderer] === telemetryKey) return;
    lastTelemetryKeyRef.current[diagnostics.renderer] = telemetryKey;
    submitRendererTelemetry(diagnostics.renderer, {
      droppedFrameRate: diagnostics.droppedFrameRateRatio,
      errorCode,
      frameRate: diagnostics.frameRateFps,
      layoutTimeMs: diagnostics.renderer === "2D"
        ? layout2DDurationMsRef.current
        : layout3DDurationMsRef.current,
      renderTimeMs: diagnostics.renderTimeMs,
      sampleWindowMs: diagnostics.sampleWindowMs
    });
  }, [
    activeProjectionVersion,
    layout2DComputation,
    layout3DComputation,
    persistenceEnabled,
    preferences.version,
    rendererProjection.projectionId,
    settingsDirty,
    submitRendererTelemetry
  ]);

  const submitWebGlTelemetry = useCallback((
    event: CanonicalWebGlRendererEvent
  ) => {
    const telemetryKey = [
      rendererProjection.projectionId,
      activeProjectionVersion,
      preferences.version,
      event.type
    ].join(":");
    if (lastWebGlTelemetryKeyRef.current === telemetryKey) return;
    lastWebGlTelemetryKeyRef.current = telemetryKey;
    submitRendererTelemetry("3D", {
      droppedFrameRate: 0,
      errorCode: event.errorCode,
      frameRate: 0,
      layoutTimeMs: layout3DDurationMsRef.current,
      renderTimeMs: 0,
      sampleWindowMs: 1
    });
  }, [
    activeProjectionVersion,
    preferences.version,
    rendererProjection.projectionId,
    submitRendererTelemetry
  ]);

  useEffect(() => {
    const generation = layoutCoordinatorLifecycleRef.current + 1;
    layoutCoordinatorLifecycleRef.current = generation;
    return () => {
      queueMicrotask(() => {
        if (layoutCoordinatorLifecycleRef.current !== generation) return;
        layoutCoordinatorRef.current?.dispose();
        layoutCoordinatorRef.current = null;
      });
    };
  }, []);

  useEffect(() => {
    if (!workerLayoutSelected) return undefined;
    let current = true;
    setWorkerLayout2D({
      error: false,
      layout: null,
      loading: true,
      requestKey: layout2DRequestKey,
      source: null,
      workerFailureCode: null
    });
    const coordinator = layoutCoordinatorRef.current;
    if (!coordinator) {
      setWorkerLayout2D({
        error: true,
        layout: null,
        loading: false,
        requestKey: layout2DRequestKey,
        source: null,
        workerFailureCode: "WORKER_UNAVAILABLE"
      });
      return undefined;
    }
    void coordinator.request({
      renderer: "2d",
      projection: activeProjection,
      pattern: selectedTwoDPattern,
      options: layout2DOptions,
      workerUsage: settings.advanced_shared.worker_usage
    }).then((execution) => {
      if (!current) return;
      layout2DDurationMsRef.current = execution.layoutTimeMs;
      setWorkerLayout2D({
        error: false,
        layout: execution.result,
        loading: false,
        requestKey: layout2DRequestKey,
        source: execution.source,
        workerFailureCode: execution.workerFailureCode
      });
    }).catch((error: unknown) => {
      if (!current || error instanceof GraphLayoutStaleResultError) return;
      setWorkerLayout2D({
        error: true,
        layout: null,
        loading: false,
        requestKey: layout2DRequestKey,
        source: null,
        workerFailureCode: error instanceof GraphLayoutExecutionError
          ? error.workerFailureCode
          : null
      });
    });
    return () => {
      current = false;
    };
  }, [
    activeProjection,
    layout2DOptions,
    layout2DRequestKey,
    selectedTwoDPattern,
    settings.advanced_shared.worker_usage,
    workerLayoutSelected
  ]);

  useEffect(() => {
    if (!workerLayoutSelected) return undefined;
    let current = true;
    setWorkerLayout3D({
      error: false,
      layout: null,
      loading: true,
      requestKey: layout3DRequestKey,
      source: null,
      workerFailureCode: null
    });
    const coordinator = layoutCoordinatorRef.current;
    if (!coordinator) {
      setWorkerLayout3D({
        error: true,
        layout: null,
        loading: false,
        requestKey: layout3DRequestKey,
        source: null,
        workerFailureCode: "WORKER_UNAVAILABLE"
      });
      return undefined;
    }
    void coordinator.request({
      renderer: "3d",
      projection: activeProjection,
      pattern: selectedThreeDPattern,
      options: layout3DOptions,
      workerUsage: settings.advanced_shared.worker_usage
    }).then((execution) => {
      if (!current) return;
      layout3DDurationMsRef.current = execution.layoutTimeMs;
      setWorkerLayout3D({
        error: false,
        layout: execution.result,
        loading: false,
        requestKey: layout3DRequestKey,
        source: execution.source,
        workerFailureCode: execution.workerFailureCode
      });
    }).catch((error: unknown) => {
      if (!current || error instanceof GraphLayoutStaleResultError) return;
      setWorkerLayout3D({
        error: true,
        layout: null,
        loading: false,
        requestKey: layout3DRequestKey,
        source: null,
        workerFailureCode: error instanceof GraphLayoutExecutionError
          ? error.workerFailureCode
          : null
      });
    });
    return () => {
      current = false;
    };
  }, [
    activeProjection,
    layout3DOptions,
    layout3DRequestKey,
    selectedThreeDPattern,
    settings.advanced_shared.worker_usage,
    workerLayoutSelected
  ]);

  function setSharedView(next: GraphViewState) {
    if (
      settings.simple.synchronized_navigation
      && next.focusedEntityId
      && next.focusedEntityId !== viewState.focusedEntityId
    ) {
      setViewFocusSignal((signal) => signal + 1);
    }
    setViewState(next);
    if (next.selectedEntityId !== viewState.selectedEntityId) {
      onSelectedEntityChange(next.selectedEntityId);
    }
  }

  function changeSettings(updater: (current: GraphPreferenceSettings) => GraphPreferenceSettings) {
    const next = updater(settings);
    try {
      assertGraphPreferenceSettings(next);
    } catch {
      setSaveStatus("That graph setting is invalid and was not applied.");
      return;
    }
    settingsRevisionRef.current += 1;
    setSettings(next);
    setSettingsDirty(true);
    setSaveStatus("Saving settings...");
  }

  function updateSimple<Key extends keyof GraphPreferenceSettings["simple"]>(
    key: Key,
    value: GraphPreferenceSettings["simple"][Key]
  ) {
    changeSettings((current) => ({
      ...current,
      simple: { ...current.simple, [key]: value }
    }));
  }

  function updateAdvancedShared<Key extends keyof GraphPreferenceSettings["advanced_shared"]>(
    key: Key,
    value: GraphPreferenceSettings["advanced_shared"][Key]
  ) {
    changeSettings((current) => ({
      ...current,
      advanced_shared: { ...current.advanced_shared, [key]: value }
    }));
  }

  function updateAdvanced2D<Key extends keyof GraphPreferenceSettings["advanced_2d"]>(
    key: Key,
    value: GraphPreferenceSettings["advanced_2d"][Key]
  ) {
    changeSettings((current) => ({
      ...current,
      advanced_2d: { ...current.advanced_2d, [key]: value }
    }));
  }

  function updateAdvanced3D<Key extends keyof GraphPreferenceSettings["advanced_3d"]>(
    key: Key,
    value: GraphPreferenceSettings["advanced_3d"][Key]
  ) {
    changeSettings((current) => ({
      ...current,
      advanced_3d: { ...current.advanced_3d, [key]: value }
    }));
  }

  function copyTwoDSpacingToThreeD() {
    changeSettings((current) => ({
      ...current,
      advanced_3d: {
        ...current.advanced_3d,
        collision_radius: current.advanced_2d.collision_padding,
        ring_spacing: current.advanced_2d.ring_spacing
      }
    }));
  }

  function copyThreeDSpacingToTwoD() {
    changeSettings((current) => ({
      ...current,
      advanced_2d: {
        ...current.advanced_2d,
        collision_padding: current.advanced_3d.collision_radius,
        ring_spacing: Math.min(1_000, current.advanced_3d.ring_spacing)
      }
    }));
  }

  function changeArrangement(arrangement: GraphArrangement) {
    setSharedView({ ...viewState, arrangement });
    updateSimple("arrangement", arrangementToContract[arrangement]);
  }

  function graphScrollBehavior(): ScrollBehavior {
    return reducedMotion ? "auto" : "smooth";
  }

  function focusPanel(dimension: CanonicalGraphDimension) {
    onPreferredDimensionChange(dimension);
    const panel = dimension === "2d"
      ? twoDimensionalPanelRef.current
      : threeDimensionalPanelRef.current;
    panel?.scrollIntoView({ behavior: graphScrollBehavior(), block: "start" });
    panel?.focus({ preventScroll: true });
  }

  const toggleFullscreen = useCallback(async (
    dimension: CanonicalGraphDimension,
    trigger?: HTMLButtonElement | null
  ) => {
    const shell =
      workspaceRef.current?.closest<HTMLElement>(".phase180-shell")
      ?? workspaceRef.current;
    if (!(shell instanceof HTMLElement)) {
      setFullscreenError("The graph could not locate its fullscreen surface.");
      return;
    }
    setFullscreenError("");
    fullscreenTriggerRef.current = trigger ?? fullscreenTriggerRef.current;
    if (fullscreenDimension === dimension) {
      if (document.fullscreenElement === shell) {
        if (typeof document.exitFullscreen !== "function") {
          setFullscreenError("Use the browser Escape control to exit full screen.");
          return;
        }
        try {
          await document.exitFullscreen();
        } catch {
          setFullscreenError("The browser could not exit full screen. Press Escape to return.");
        }
        return;
      }
      setUsesViewportFallback(false);
      setFullscreenDimension(null);
      window.requestAnimationFrame(() => fullscreenTriggerRef.current?.focus());
      return;
    }
    setFullscreenDimension(dimension);
    if (document.fullscreenElement === shell) {
      setUsesViewportFallback(false);
      return;
    }
    if (typeof shell.requestFullscreen !== "function") {
      setUsesViewportFallback(true);
      return;
    }
    try {
      await shell.requestFullscreen();
      setUsesViewportFallback(false);
    } catch {
      setUsesViewportFallback(true);
      setFullscreenError("Browser fullscreen was unavailable, so ENTRAL opened a full-window graph view.");
    }
  }, [fullscreenDimension]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const narrowPreference = window.matchMedia("(max-width: 1180px)");
    const synchronize = () => {
      setReducedMotion(motionPreference.matches);
      setNarrowViewport(narrowPreference.matches);
    };
    synchronize();
    motionPreference.addEventListener("change", synchronize);
    narrowPreference.addEventListener("change", synchronize);
    return () => {
      motionPreference.removeEventListener("change", synchronize);
      narrowPreference.removeEventListener("change", synchronize);
    };
  }, []);

  useEffect(() => {
    if (settingsDirty) return;
    setSettings(preferences.settings);
    setSaveStatus(
      preferences.source === "SAVED_OVERRIDE"
        ? `Saved settings v${preferences.version}`
        : "Canonical defaults"
    );
    setViewState((current) => ({
      ...current,
      arrangement: arrangementFromContract[preferences.settings.simple.arrangement]
    }));
  }, [preferences, settingsDirty]);

  useEffect(() => {
    const previousScopeBusinessId = enforcedBusinessScopeRef.current;
    enforcedBusinessScopeRef.current = scopeBusinessId;
    setViewState((current) => reconcileGraphViewState(
      current,
      rendererProjection,
      {
        filters: {
          ...current.filters,
          businessIds: scopeBusinessId
            ? [scopeBusinessId]
            : previousScopeBusinessId
              ? preScopeBusinessFiltersRef.current
              : current.filters.businessIds
        },
        selectedEntityId,
        scopeKey: `organization:${organizationId}`
      }
    ));
    if (scopeBusinessId && !previousScopeBusinessId) {
      preScopeBusinessFiltersRef.current = viewState.filters.businessIds;
    }
    if (!scopeBusinessId && previousScopeBusinessId) {
      preScopeBusinessFiltersRef.current = [];
    }
  }, [organizationId, rendererProjection, scopeBusinessId, selectedEntityId]);

  useEffect(() => {
    if (deepLinkAppliedProjectionRef.current === rendererProjection.projectionId) return;
    deepLinkAppliedProjectionRef.current = rendererProjection.projectionId;
    const deepLink = parseAuthorizedGraphDeepLink(window.location.search, rendererProjection, {
      allowedScopeKeys: [`organization:${organizationId}`],
      defaultArrangement: arrangementFromContract[preferences.settings.simple.arrangement]
    });
    setViewState((current) => applyAuthorizedGraphDeepLink(current, deepLink, rendererProjection));
  }, [organizationId, preferences.settings.simple.arrangement, rendererProjection]);

  useEffect(() => {
    const params = serializeAuthorizedGraphDeepLink(viewState, rendererProjection, {
      allowedScopeKeys: [`organization:${organizationId}`]
    });
    if (scopeBusinessId) params.set("business", scopeBusinessId);
    const next = `${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`;
    window.history.replaceState(window.history.state, "", next);
  }, [
    organizationId,
    rendererProjection,
    scopeBusinessId,
    viewState.arrangement,
    viewState.filters,
    viewState.searchQuery,
    viewState.selectedEntityId,
    viewState.scopeKey
  ]);

  useEffect(() => {
    if (!settingsDirty || !persistenceEnabled) return undefined;
    const revision = settingsRevisionRef.current;
    const timer = window.setTimeout(() => {
      void updateCanonicalGraphPreferences(organizationId, {
        expectedVersion: preferences.version,
        settings
      }).then((result) => {
        onPreferencesChange(result.preferences);
        if (settingsRevisionRef.current === revision) {
          setSettings(result.preferences.settings);
          setSettingsDirty(false);
          setSaveStatus(`Saved settings v${result.preferences.version}`);
        }
      }).catch((error) => {
        if (error instanceof ApiError && error.status === 409) {
          setSaveStatus("Settings changed in another session. Reload before saving again.");
        } else {
          setSaveStatus("Settings could not be saved. Your current view remains local.");
        }
      });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    onPreferencesChange,
    organizationId,
    persistenceEnabled,
    preferences.version,
    settings,
    settingsDirty
  ]);

  useEffect(() => {
    if (!preferredDimension) return;
    const frame = window.requestAnimationFrame(() => focusPanel(preferredDimension));
    return () => window.cancelAnimationFrame(frame);
  }, [preferredDimension]);

  useEffect(() => {
    function synchronizeFullscreen() {
      const shell =
        workspaceRef.current?.closest<HTMLElement>(".phase180-shell")
        ?? workspaceRef.current;
      if (document.fullscreenElement === shell) return;
      if (!usesViewportFallback) {
        setFullscreenDimension(null);
        window.requestAnimationFrame(() => fullscreenTriggerRef.current?.focus());
      }
    }
    function exitViewportFallback(event: KeyboardEvent) {
      if (event.key !== "Escape" || !usesViewportFallback) return;
      setUsesViewportFallback(false);
      setFullscreenDimension(null);
      window.requestAnimationFrame(() => fullscreenTriggerRef.current?.focus());
    }
    document.addEventListener("fullscreenchange", synchronizeFullscreen);
    window.addEventListener("keydown", exitViewportFallback);
    return () => {
      document.removeEventListener("fullscreenchange", synchronizeFullscreen);
      window.removeEventListener("keydown", exitViewportFallback);
    };
  }, [usesViewportFallback]);

  useEffect(() => {
    if (!usesViewportFallback) return undefined;
    const shell =
      workspaceRef.current?.closest<HTMLElement>(".phase180-shell")
      ?? workspaceRef.current;
    const previousOverflow = document.body.style.overflow;
    shell?.setAttribute("data-graph-fullscreen-fallback", "true");
    document.body.style.overflow = "hidden";
    return () => {
      shell?.removeAttribute("data-graph-fullscreen-fallback");
      document.body.style.overflow = previousOverflow;
    };
  }, [usesViewportFallback]);

  useEffect(() => {
    if (!assistantCommand || handledAssistantCommandRef.current === assistantCommand.id) return;
    handledAssistantCommandRef.current = assistantCommand.id;
    if (assistantCommand.type === "motion") setMovementPaused(assistantCommand.paused);
    if (assistantCommand.type === "layout") changeArrangement(assistantCommand.layout);
    if (assistantCommand.type === "select") {
      const next = selectGraphEntity(viewState, rendererProjection, assistantCommand.entityId, {
        synchronizeFocus: settings.simple.synchronized_navigation
      });
      setSharedView(next);
    }
    if (assistantCommand.type === "collapse-inspector") setInspectorCollapsed(assistantCommand.collapsed);
    if (assistantCommand.type === "fullscreen") {
      if (assistantCommand.dimension) void toggleFullscreen(assistantCommand.dimension);
      else if (fullscreenDimension) void toggleFullscreen(fullscreenDimension);
    }
  }, [
    assistantCommand,
    fullscreenDimension,
    rendererProjection,
    settings.simple.synchronized_navigation,
    toggleFullscreen,
    viewState
  ]);

  async function resetPreferences(resetScope: GraphPreferenceResetScope) {
    const resetStatus: Readonly<Record<GraphPreferenceResetScope, string>> = {
      ALL: "All saved graph overrides deleted",
      PINNED_POSITIONS: "Saved node positions deleted",
      SHARED: "Shared graph defaults restored",
      VIEW_2D: "2D graph defaults restored",
      VIEW_3D: "3D graph defaults restored"
    };
    if (!persistenceEnabled) {
      const resetSettings = resetGraphPreferenceSettings(settings, resetScope);
      settingsRevisionRef.current += 1;
      setSettings(resetSettings);
      setSettingsDirty(false);
      setSaveStatus(resetStatus[resetScope]);
      if (resetScope === "ALL") {
        setViewState((current) => ({
          ...resetGraphNavigation(current, rendererProjection),
          arrangement: arrangementFromContract[resetSettings.simple.arrangement]
        }));
      } else if (resetScope === "SHARED") {
        setViewState((current) => ({
          ...current,
          arrangement: arrangementFromContract[resetSettings.simple.arrangement]
        }));
      }
      return;
    }
    setSaveStatus("Resetting settings...");
    try {
      const result = await resetCanonicalGraphPreferences(organizationId, {
        expectedVersion: preferences.version,
        resetScope
      });
      settingsRevisionRef.current += 1;
      setSettings(result.preferences.settings);
      setSettingsDirty(false);
      onPreferencesChange(result.preferences);
      setSaveStatus(resetStatus[resetScope]);
      if (resetScope === "ALL") {
        setViewState((current) => ({
          ...resetGraphNavigation(current, rendererProjection),
          arrangement: arrangementFromContract[result.preferences.settings.simple.arrangement]
        }));
      } else if (resetScope === "SHARED") {
        setViewState((current) => ({
          ...current,
          arrangement: arrangementFromContract[result.preferences.settings.simple.arrangement]
        }));
      }
    } catch (error) {
      setSaveStatus(
        error instanceof ApiError && error.status === 409
          ? "Reset conflict. Reload the latest settings and retry."
          : "Settings reset failed; no saved override was deleted."
      );
    }
  }

  function pinSelected(renderer: "2D" | "3D") {
    const entityId = selectedTarget(viewState);
    if (!entityId) return;
    const point = renderer === "2D"
      ? layout2D?.points.find((candidate) => candidate.entityId === entityId)
      : layout3D?.points.find((candidate) => candidate.entityId === entityId);
    if (!point) return;
    const gridSize = settings.advanced_2d.grid_size;
    const x = renderer === "2D" && settings.advanced_2d.grid_snapping
      ? Math.round(point.x / gridSize) * gridSize
      : point.x;
    const y = renderer === "2D" && settings.advanced_2d.grid_snapping
      ? Math.round(point.y / gridSize) * gridSize
      : point.y;
    changeSettings((current) => ({
      ...current,
      pinned_positions: [
        ...current.pinned_positions.filter(
          (position) => !(position.entity_id === entityId && position.renderer === renderer)
        ),
        {
          entity_id: entityId,
          renderer,
          x,
          y,
          z: renderer === "3D" && "z" in point ? point.z : null
        }
      ]
    }));
  }

  function unpinSelected() {
    const entityId = selectedTarget(viewState);
    if (!entityId) return;
    changeSettings((current) => ({
      ...current,
      pinned_positions: current.pinned_positions.filter(
        (position) => position.entity_id !== entityId
      )
    }));
  }

  function reportGraphExportFailure() {
    const metrics = {
      droppedFrameRate: 0,
      errorCode: "GRAPH_EXPORT_FAILURE" as const,
      frameRate: 0,
      renderTimeMs: 0,
      sampleWindowMs: 1
    };
    if (render2D) {
      submitRendererTelemetry("2D", {
        ...metrics,
        layoutTimeMs: layout2DDurationMsRef.current
      });
    }
    if (render3D) {
      submitRendererTelemetry("3D", {
        ...metrics,
        layoutTimeMs: layout3DDurationMsRef.current
      });
    }
  }

  function exportGraphData(format: "json" | "csv") {
    const metadata = {
      contract_version: "1.0.0",
      schema_version: rendererProjection.schemaVersion,
      projection_version: activeProjectionVersion,
      organization_id: activeOrganizationId,
      active_filters: viewState.filters,
      search_query: viewState.searchQuery,
      entity_count: activeProjection.entityCount,
      edge_count: activeProjection.edgeCount
    };
    if (format === "json") {
      downloadBlob(new Blob([JSON.stringify({
        metadata,
        entities: activeProjection.entities.map((node) => node.canonicalEntity ?? ({
          entity_id: node.entityId,
          entity_type: node.entity.entity_type,
          stable_code: node.entity.stable_code,
          display_name: node.entity.name,
          parent_id: node.parentId,
          authority_tier: node.authority.tier,
          authority_score: node.authority.normalizedScore,
          domain_id: node.domainId,
          business_id: node.entity.assigned_business_id,
          status: node.entity.status,
          health: node.entity.health,
          version: node.entity.version
        })),
        edges: activeProjection.edges.map((edge) => ({
          edge_id: edge.edgeId,
          source_id: edge.sourceId,
          target_id: edge.targetId,
          relation_type: edge.relationType
        }))
      }, null, 2)], { type: "application/json" }), `entral-graph-v${activeProjectionVersion}.json`);
      return;
    }
    const rows = [
      ["entity_id", "entity_type", "display_name", "parent_id", "authority_tier", "authority_score", "domain_id", "business_id", "status", "health"],
      ...activeProjection.entities.map((node) => [
        node.entityId,
        node.entity.entity_type,
        node.entity.name,
        node.parentId,
        node.authority.tier,
        node.authority.normalizedScore,
        node.domainId,
        node.entity.assigned_business_id,
        node.entity.status,
        node.entity.health
      ])
    ];
    downloadBlob(
      new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv" }),
      `entral-graph-v${activeProjectionVersion}.csv`
    );
  }

  async function exportCurrentViewImage() {
    const canvases = [
      ...(render2D ? [...(twoDimensionalPanelRef.current?.querySelectorAll("canvas") ?? [])] : []),
      ...(render3D ? [...(threeDimensionalPanelRef.current?.querySelectorAll("canvas") ?? [])] : [])
    ] as HTMLCanvasElement[];
    if (!canvases.length) {
      reportGraphExportFailure();
      setFullscreenError("No active renderer canvas is available for image export.");
      return;
    }
    const width = canvases.reduce((sum, canvas) => sum + canvas.width, 0);
    const height = Math.max(...canvases.map((canvas) => canvas.height));
    const output = document.createElement("canvas");
    output.width = width;
    output.height = height;
    const context = output.getContext("2d");
    if (!context) {
      reportGraphExportFailure();
      setFullscreenError("The browser could not create an image export surface.");
      return;
    }
    let x = 0;
    try {
      for (const canvas of canvases) {
        context.drawImage(canvas, x, 0);
        x += canvas.width;
      }
    } catch {
      reportGraphExportFailure();
      setFullscreenError("The active graph view could not be read for image export.");
      return;
    }
    let blob: Blob | null;
    try {
      blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/png"));
    } catch {
      reportGraphExportFailure();
      setFullscreenError("The active graph view could not be encoded as an image.");
      return;
    }
    if (!blob) {
      reportGraphExportFailure();
      setFullscreenError("The active graph view could not be encoded as an image.");
      return;
    }
    downloadBlob(blob, `entral-current-graph-v${activeProjectionVersion}.png`);
  }

  async function copyAuthorizedDeepLink() {
    const params = serializeAuthorizedGraphDeepLink(viewState, rendererProjection, {
      allowedScopeKeys: [`organization:${organizationId}`]
    });
    if (scopeBusinessId) params.set("business", scopeBusinessId);
    const url = `${window.location.origin}${window.location.pathname}${params.size ? `?${params.toString()}` : ""}`;
    try {
      await navigator.clipboard.writeText(url);
      setSaveStatus("Authorized graph link copied");
    } catch {
      setSaveStatus("The browser did not allow this graph link to be copied.");
    }
  }

  const activeSelectedEntityId = selectedTarget(viewState);
  const selectedNode = activeSelectedEntityId
    ? projectionIndex.entityById.get(activeSelectedEntityId) ?? null
    : null;
  const canPinSelectedIn2D = Boolean(
    activeSelectedEntityId
    && layout2D?.points.some((point) => point.entityId === activeSelectedEntityId)
  );
  const canPinSelectedIn3D = Boolean(
    activeSelectedEntityId
    && layout3D?.points.some((point) => point.entityId === activeSelectedEntityId)
  );
  const canUnpinSelected = Boolean(
    activeSelectedEntityId
    && settings.pinned_positions.some(
      (position) => position.entity_id === activeSelectedEntityId
    )
  );
  const sharedRange = (
    label: string,
    value: number,
    minimum: number,
    maximum: number,
    step: number,
    onChange: (value: number) => void
  ) => settingMatches(advancedSearch, label) ? (
    <label>
      <span>{label}</span>
      <input
        aria-label={label}
        max={maximum}
        min={minimum}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="range"
        value={value}
      />
      <output>{value}</output>
    </label>
  ) : null;

  return (
    <section
      aria-labelledby="phase180-universe-workspace-heading"
      className="phase180-graph-workspace phase195-graph-workspace"
      data-canonical-edge-count={activeProjection.edgeCount}
      data-canonical-entity-count={activeProjection.entityCount}
      data-canonical-event-sequence={eventSequence}
      data-effective-arrangement={effectiveArrangement}
      data-fullscreen-dimension={fullscreenDimension ?? undefined}
      data-fullscreen-fallback={usesViewportFallback ? "true" : undefined}
      data-graph-layout={requestedArrangement}
      data-effective-level-of-detail={
        effectiveRendererPerformance.effectiveLevelOfDetail
      }
      data-layout-source-2d={
        layout2DComputation.source
        ?? (layout2DComputation.loading ? "pending" : "failed")
      }
      data-layout-source-3d={
        layout3DComputation.source
        ?? (layout3DComputation.loading ? "pending" : "failed")
      }
      data-layout-worker-failure-2d={layout2DComputation.workerFailureCode ?? undefined}
      data-layout-worker-failure-3d={layout3DComputation.workerFailureCode ?? undefined}
      data-graph-motion={effectiveMovementPaused ? "paused" : "running"}
      data-graph-parity-key={parityKey}
      ref={workspaceRef}
      style={{
        "--phase195-edge-opacity": settings.advanced_shared.edge_opacity,
        "--phase195-edge-width": `${settings.advanced_shared.edge_width}px`,
        "--phase195-label-scale": settings.advanced_shared.label_scale,
        "--phase195-node-scale": settings.advanced_shared.node_scale
      } as React.CSSProperties}
    >
      <header className="phase180-graph-control-bar">
        <div className="phase180-graph-control-title">
          <span>Universe workspace</span>
          <h1 id="phase180-universe-workspace-heading">2D + 3D Universe Graph</h1>
          <small>
            Projection v{activeProjectionVersion} · {activeProjection.entityCount.toLocaleString()} authorized entities · exact renderer parity
          </small>
        </div>
        <button
          aria-pressed={effectiveMovementPaused}
          className="phase180-motion-toggle"
          data-state={effectiveMovementPaused ? "paused" : "running"}
          disabled={reducedMotion || settings.simple.motion === "OFF"}
          onClick={() => setMovementPaused((paused) => !paused)}
          type="button"
        >
          {effectiveMovementPaused && !reducedMotion && settings.simple.motion !== "OFF"
            ? <PlayCircle aria-hidden="true" size={19} />
            : <PauseCircle aria-hidden="true" size={19} />}
          {reducedMotion || settings.simple.motion === "OFF"
            ? "Movement paused"
            : effectiveMovementPaused
              ? "Resume movement"
              : "Stop movement"}
        </button>
        <label className="phase195-arrangement-control">
          <span>Arrangement</span>
          <select
            aria-label="Graph arrangement"
            onChange={(event) => changeArrangement(event.target.value as GraphArrangement)}
            value={requestedArrangement}
          >
            <option value="auto">Auto</option>
            <option value="side-by-side">Side by side</option>
            <option value="stacked">Stack</option>
            <option value="2d-only">2D only</option>
            <option value="3d-only">3D only</option>
          </select>
        </label>
        <div aria-label="Graph layout shortcuts" className="phase180-graph-layout-controls" role="group">
          <button aria-pressed={requestedArrangement === "side-by-side"} onClick={() => changeArrangement("side-by-side")} type="button">
            <Columns2 aria-hidden="true" size={17} /> Side by side
          </button>
          <button aria-pressed={requestedArrangement === "stacked"} onClick={() => changeArrangement("stacked")} type="button">
            <Rows3 aria-hidden="true" size={17} /> Stacked
          </button>
        </div>
        <button className="phase180-surface-action" onClick={() => setAdvancedOpen((open) => !open)} type="button">
          <Settings2 aria-hidden="true" size={17} /> {advancedOpen ? "Close settings" : "Settings"}
        </button>
        <details className="phase180-graph-control-guide">
          <summary><ChevronDown aria-hidden="true" className="phase180-guide-chevron" size={17} /> Control guide</summary>
          <div>
            <p><strong>One projection:</strong> Both renderers use the same server-built IDs, edges, lineage, authority, status, health, and RLS visibility.</p>
            <p><strong>Responsive:</strong> Auto uses equal columns on desktop and Stack on narrow screens. A safe narrow-screen override never changes the saved choice.</p>
            <p><strong>Navigation:</strong> Selection, focus, history, isolation, expansion, search, and filters are shared.</p>
            <p><strong>Keyboard:</strong> Tab reaches every shared control. In 2D, Arrow keys move through the hierarchy, Enter opens the record, Escape clears selection, plus/minus zoom, and F fits the visible graph. The 3D canvas supports the same zoom and fit keys.</p>
          </div>
        </details>
      </header>

      <section className="phase195-shared-toolbar" aria-label="Shared graph navigation and filters">
        <div className="phase195-navigation-controls" role="group" aria-label="Graph navigation">
          <button disabled={viewState.history.index <= 0} onClick={() => setSharedView(navigateGraphHistory(viewState, rendererProjection, "BACK"))} type="button" title="Back">
            <ArrowLeft aria-hidden="true" size={16} /> Back
          </button>
          <button disabled={viewState.history.index >= viewState.history.entries.length - 1} onClick={() => setSharedView(navigateGraphHistory(viewState, rendererProjection, "FORWARD"))} type="button" title="Forward">
            <ArrowRight aria-hidden="true" size={16} /> Forward
          </button>
          <button disabled={!selectedNode?.parentId} onClick={() => setSharedView(navigateGraphParent(viewState, rendererProjection))} type="button">
            <ArrowUp aria-hidden="true" size={16} /> Parent
          </button>
          <button disabled={!viewState.selectedEntityId} onClick={() => {
            if (viewState.selectedEntityId) {
              setSharedView(focusGraphEntity(viewState, rendererProjection, viewState.selectedEntityId));
              setViewFocusSignal((signal) => signal + 1);
            }
          }} type="button">
            <Focus aria-hidden="true" size={16} /> Focus selected
          </button>
          <button disabled={!viewState.selectedEntityId} onClick={() => setSharedView(clearGraphSelection(viewState, rendererProjection))} type="button">
            <X aria-hidden="true" size={16} /> Clear
          </button>
          <button onClick={() => setViewFitSignal((signal) => signal + 1)} type="button">
            <Focus aria-hidden="true" size={16} /> Fit visible
          </button>
          <button onClick={() => {
            setSharedView(resetGraphNavigation(viewState, rendererProjection));
            setViewFitSignal((signal) => signal + 1);
          }} type="button">
            <RotateCcw aria-hidden="true" size={16} /> Reset view
          </button>
        </div>
        <nav className="phase195-breadcrumb" aria-label="Graph breadcrumb">
          {viewState.breadcrumbEntityIds.map((entityId, index) => {
            const node = projectionIndex.entityById.get(entityId);
            return (
              <React.Fragment key={entityId}>
                {index ? <span aria-hidden="true">/</span> : null}
                <button onClick={() => setSharedView(selectGraphEntity(viewState, rendererProjection, entityId, {
                  synchronizeFocus: settings.simple.synchronized_navigation
                }))} type="button">
                  {node?.entity.name ?? entityId}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
        <label className="phase195-shared-search">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search both graphs</span>
          <input
            aria-label="Search both graphs"
            onChange={(event) => setSharedView(updateGraphSearch(viewState, event.target.value))}
            placeholder="Search name, code, type, domain, status, or health"
            value={viewState.searchQuery}
          />
          {viewState.searchQuery ? (
            <button aria-label="Clear graph search" onClick={() => setSharedView(updateGraphSearch(viewState, ""))} type="button"><X size={15} /></button>
          ) : null}
        </label>
        <div className="phase195-filter-row">
          <label>
            <span>Entity type</span>
            <select
              aria-label="Filter by entity type"
              onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                entityTypes: event.target.value ? [event.target.value as EntitySummary["entity_type"]] : []
              }))}
              value={viewState.filters.entityTypes[0] ?? ""}
            >
              <option value="">All types</option>
              <option value="ENTRAL">ENTRAL</option>
              <option value="MARSHAL">Marshals</option>
              <option value="GENERAL">Generals</option>
              <option value="COMMANDER">Commanders</option>
              <option value="SOLDIER">Soldiers</option>
            </select>
          </label>
          <label>
            <span>Status</span>
            <select
              aria-label="Filter by status"
              onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                statuses: event.target.value ? [event.target.value as EntitySummary["status"]] : []
              }))}
              value={viewState.filters.statuses[0] ?? ""}
            >
              <option value="">All statuses</option>
              <option value="BUILDING">Building</option>
              <option value="ACTIVE">Active</option>
              <option value="PAUSED">Paused</option>
              <option value="DEGRADED">Degraded</option>
              <option value="RETIRED">Retired</option>
            </select>
          </label>
          <label>
            <span>Health</span>
            <select
              aria-label="Filter by health"
              onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                healthStates: event.target.value ? [event.target.value as EntitySummary["health"]] : []
              }))}
              value={viewState.filters.healthStates[0] ?? ""}
            >
              <option value="">All health</option>
              <option value="HEALTHY">Healthy</option>
              <option value="WATCH">Watch</option>
              <option value="DEGRADED">Degraded</option>
              <option value="CRITICAL">Critical</option>
              <option value="UNKNOWN">Unknown</option>
            </select>
          </label>
          <label>
            <span>Authority</span>
            <select
              aria-label="Filter by authority level"
              onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                authorityLevels: event.target.value
                  ? [event.target.value as EntitySummary["entity_type"]]
                  : []
              }))}
              value={viewState.filters.authorityLevels[0] ?? ""}
            >
              <option value="">All authority levels</option>
              <option value="ENTRAL">ENTRAL</option>
              <option value="MARSHAL">Marshal</option>
              <option value="GENERAL">General</option>
              <option value="COMMANDER">Commander</option>
              <option value="SOLDIER">Soldier</option>
            </select>
          </label>
          <label>
            <span>Domain</span>
            <select
              aria-label="Filter by domain"
              onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                domainIds: event.target.value ? [event.target.value] : []
              }))}
              value={viewState.filters.domainIds[0] ?? ""}
            >
              <option value="">All domains</option>
              {authorizedDomainIds.map((domainId) => <option key={domainId} value={domainId}>{domainId}</option>)}
            </select>
          </label>
          <label>
            <span>Business</span>
            <select
              aria-label="Filter by business"
              disabled={Boolean(scopeBusinessId)}
              onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                businessIds: event.target.value ? [event.target.value] : []
              }))}
              value={viewState.filters.businessIds[0] ?? ""}
            >
              <option value="">All businesses</option>
              {authorizedBusinessIds.map((businessId) => <option key={businessId} value={businessId}>{businessId}</option>)}
            </select>
          </label>
          <label>
            <span>Connections</span>
            <select
              aria-label="Connection display mode"
              onChange={(event) => updateSimple("connections", event.target.value as GraphConnectionMode)}
              value={settings.simple.connections}
            >
              <option value="RELEVANT">Relevant</option>
              <option value="LINEAGE">Lineage</option>
              <option value="DIRECT">Direct</option>
              <option value="ALL">All</option>
            </select>
          </label>
          <button
            onClick={() => setSharedView(updateGraphFilters(
              viewState,
              rendererProjection,
              {
                ...EMPTY_GRAPH_FILTERS,
                businessIds: scopeBusinessId ? [scopeBusinessId] : []
              }
            ))}
            type="button"
          >
            Clear filters
          </button>
        </div>
        <div className="phase195-context-actions" role="group" aria-label="Selected graph context">
          <button disabled={!selectedTarget(viewState)} onClick={() => {
            const target = selectedTarget(viewState);
            if (target) setSharedView(isolateGraphLineage(viewState, rendererProjection, target));
          }} type="button">Isolate lineage</button>
          <button disabled={!selectedTarget(viewState)} onClick={() => {
            const target = selectedTarget(viewState);
            if (target) setSharedView(setGraphExpansion(viewState, rendererProjection, target, "ONE_LEVEL"));
          }} type="button">Expand one level</button>
          <button disabled={!selectedTarget(viewState)} onClick={() => {
            const target = selectedTarget(viewState);
            if (target) setSharedView(setGraphExpansion(viewState, rendererProjection, target, "DESCENDANTS"));
          }} type="button">Expand descendants</button>
          <button disabled={!selectedTarget(viewState)} onClick={() => {
            const target = selectedTarget(viewState);
            if (target) setSharedView(setGraphExpansion(viewState, rendererProjection, target, "COLLAPSE_DESCENDANTS"));
          }} type="button">Collapse descendants</button>
          <button onClick={() => setSharedView(isolateGraphLineage(viewState, rendererProjection, null))} type="button">Show all lineages</button>
        </div>
      </section>

      {advancedOpen ? (
        <aside className="phase195-settings" aria-label="Graph settings">
          <header>
            <div><span>Versioned preferences</span><strong>{saveStatus}</strong></div>
            <button aria-label="Close graph settings" onClick={() => setAdvancedOpen(false)} type="button"><X size={17} /></button>
          </header>
          <section className="phase195-simple-settings" aria-label="Simple graph settings">
            <label><span>Arrangement</span><select aria-label="Simple graph arrangement" value={requestedArrangement} onChange={(event) => changeArrangement(event.target.value as GraphArrangement)}>
              <option value="auto">Auto</option><option value="side-by-side">Side by side</option><option value="stacked">Stack</option><option value="2d-only">2D only</option><option value="3d-only">3D only</option>
            </select></label>
            <label><span>2D layout</span><select value={settings.simple.two_d_layout} onChange={(event) => updateSimple("two_d_layout", event.target.value as GraphTwoDLayout)}>
              <option value="AUTHORITY_RADIAL">Authority Radial</option><option value="HIERARCHY_TREE">Hierarchy Tree</option><option value="DOMAIN_CLUSTERS">Domain Clusters</option><option value="COMPACT_RADIAL">Compact Radial</option>
            </select></label>
            <label><span>3D pattern</span><select value={settings.simple.three_d_layout} onChange={(event) => updateSimple("three_d_layout", event.target.value as GraphThreeDLayout)}>
              <option value="AUTHORITY_RINGS">Authority Rings</option><option value="ELLIPTICAL_ORBITS">Elliptical Orbits</option><option value="SPHERICAL_SHELLS">Spherical Shells</option><option value="DOMAIN_CLUSTERS">Domain Clusters</option>
            </select></label>
            <label><span>Density</span><select value={settings.simple.density} onChange={(event) => updateSimple("density", event.target.value as ContractGraphDensity)}>
              <option value="COMPACT">Compact</option><option value="BALANCED">Balanced</option><option value="SPACIOUS">Spacious</option>
            </select></label>
            <label><span>Labels</span><select value={settings.simple.labels} onChange={(event) => updateSimple("labels", event.target.value as GraphLabelMode)}>
              <option value="ALWAYS">Always</option><option value="RELEVANT">Relevant</option><option value="HOVER_OR_FOCUS">Hover or focus</option><option value="OFF">Off</option>
            </select></label>
            <label><span>Motion</span><select value={settings.simple.motion} onChange={(event) => updateSimple("motion", event.target.value as GraphMotionMode)}>
              <option value="NORMAL">Normal</option><option value="REDUCED">Reduced</option><option value="OFF">Off</option>
            </select></label>
            <label><span>Connections</span><select aria-label="Simple connection display mode" value={settings.simple.connections} onChange={(event) => updateSimple("connections", event.target.value as GraphConnectionMode)}>
              <option value="RELEVANT">Relevant</option><option value="LINEAGE">Lineage</option><option value="DIRECT">Direct</option><option value="ALL">All</option>
            </select></label>
            <label className="phase195-check"><input checked={settings.simple.synchronized_navigation} onChange={(event) => updateSimple("synchronized_navigation", event.target.checked)} type="checkbox" /> <span>Synchronized navigation</span></label>
            <button onClick={() => void resetPreferences("ALL")} type="button"><RotateCcw size={16} /> Reset settings</button>
            <button aria-expanded={advancedSettingsExpanded} onClick={() => setAdvancedSettingsExpanded((expanded) => !expanded)} type="button"><Settings2 size={16} /> Advanced settings</button>
          </section>
          <details
            className="phase195-advanced-settings"
            onToggle={(event) => setAdvancedSettingsExpanded(event.currentTarget.open)}
            open={advancedSettingsExpanded}
          >
            <summary>Advanced</summary>
            <label className="phase195-advanced-search"><Search size={16} /><input aria-label="Search advanced graph settings" onChange={(event) => setAdvancedSearch(event.target.value)} placeholder="Search settings" value={advancedSearch} /></label>
            <section><h3>Shared presentation and performance</h3>
              {sharedRange("Authority band spacing", settings.advanced_shared.authority_band_spacing, 0.5, 3, 0.05, (value) => updateAdvancedShared("authority_band_spacing", value))}
              {sharedRange("Authority score influence", settings.advanced_shared.authority_score_influence, 0, 0.45, 0.01, (value) => updateAdvancedShared("authority_score_influence", value))}
              {sharedRange("Node scale", settings.advanced_shared.node_scale, 0.5, 3, 0.05, (value) => updateAdvancedShared("node_scale", value))}
              {sharedRange("Selected node scale", settings.advanced_shared.selected_node_scale, 1, 4, 0.05, (value) => updateAdvancedShared("selected_node_scale", value))}
              {sharedRange("Edge width", settings.advanced_shared.edge_width, 0.25, 8, 0.25, (value) => updateAdvancedShared("edge_width", value))}
              {sharedRange("Edge opacity", settings.advanced_shared.edge_opacity, 0, 1, 0.05, (value) => updateAdvancedShared("edge_opacity", value))}
              {sharedRange("Edge curvature", settings.advanced_shared.edge_curvature, 0, 1, 0.05, (value) => updateAdvancedShared("edge_curvature", value))}
              {sharedRange("Label threshold", settings.advanced_shared.label_threshold, 0, 1, 0.05, (value) => updateAdvancedShared("label_threshold", value))}
              {sharedRange("Label scale", settings.advanced_shared.label_scale, 0.5, 3, 0.05, (value) => updateAdvancedShared("label_scale", value))}
              {sharedRange("Lineage emphasis", settings.advanced_shared.lineage_emphasis, 1, 5, 0.1, (value) => updateAdvancedShared("lineage_emphasis", value))}
              {sharedRange("Maximum live labels", settings.advanced_shared.maximum_live_labels, 0, 10000, 25, (value) => updateAdvancedShared("maximum_live_labels", Math.round(value)))}
              {sharedRange("Animation duration", settings.advanced_shared.animation_duration_ms, 0, 5000, 25, (value) => updateAdvancedShared("animation_duration_ms", Math.round(value)))}
              {settingMatches(advancedSearch, "Motion easing", "Animation easing") ? <label><span>Motion easing</span><select value={settings.advanced_shared.motion_easing} onChange={(event) => updateAdvancedShared("motion_easing", event.target.value as GraphPreferenceSettings["advanced_shared"]["motion_easing"])}><option value="LINEAR">Linear</option><option value="EASE_IN">Ease in</option><option value="EASE_OUT">Ease out</option><option value="EASE_IN_OUT">Ease in and out</option></select></label> : null}
              {settingMatches(advancedSearch, "Stable layout seed") ? <label><span>Stable layout seed</span><input value={settings.advanced_shared.stable_layout_seed} onChange={(event) => updateAdvancedShared("stable_layout_seed", event.target.value)} /></label> : null}
              {settingMatches(advancedSearch, "Color mode") ? <label><span>Color mode</span><select value={settings.advanced_shared.color_mode} onChange={(event) => updateAdvancedShared("color_mode", event.target.value as GraphPreferenceSettings["advanced_shared"]["color_mode"])}><option value="AUTHORITY">Authority</option><option value="HEALTH">Health</option><option value="STATUS">Status</option></select></label> : null}
              {settingMatches(advancedSearch, "Performance mode") ? <label><span>Performance mode</span><select value={settings.advanced_shared.performance_mode} onChange={(event) => updateAdvancedShared("performance_mode", event.target.value as GraphPreferenceSettings["advanced_shared"]["performance_mode"])}><option value="AUTO">Auto</option><option value="QUALITY">Quality</option><option value="BALANCED">Balanced</option><option value="PERFORMANCE">Performance</option></select></label> : null}
              {settingMatches(advancedSearch, "Level of detail", "LOD") ? <label><span>Level of detail</span><select aria-label="Level of detail" value={settings.advanced_shared.level_of_detail} onChange={(event) => updateAdvancedShared("level_of_detail", event.target.value as GraphPreferenceSettings["advanced_shared"]["level_of_detail"])}><option value="AUTO">Auto</option><option value="FULL">Full</option><option value="BALANCED">Balanced</option><option value="AGGRESSIVE">Aggressive</option></select></label> : null}
              {settingMatches(advancedSearch, "Layout worker usage", "Worker usage") ? <label><span>Layout worker usage</span><select aria-label="Layout worker usage" value={settings.advanced_shared.worker_usage} onChange={(event) => updateAdvancedShared("worker_usage", event.target.value as GraphPreferenceSettings["advanced_shared"]["worker_usage"])}><option value="AUTO">Auto</option><option value="ON">On</option><option value="OFF">Off</option></select></label> : null}
              {settingMatches(advancedSearch, "Rendering quality") ? <label><span>Rendering quality</span><select value={settings.advanced_shared.rendering_quality} onChange={(event) => updateAdvancedShared("rendering_quality", event.target.value as GraphPreferenceSettings["advanced_shared"]["rendering_quality"])}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label> : null}
              {settingMatches(advancedSearch, "Frame rate cap") ? <label><span>Frame rate cap</span><select value={settings.advanced_shared.frame_rate_cap} onChange={(event) => updateAdvancedShared("frame_rate_cap", Number(event.target.value) as GraphPreferenceSettings["advanced_shared"]["frame_rate_cap"])}><option value={30}>30 fps</option><option value={45}>45 fps</option><option value={60}>60 fps</option><option value={90}>90 fps</option><option value={120}>120 fps</option></select></label> : null}
              {settingMatches(advancedSearch, "Background visible") ? <label className="phase195-check"><input checked={settings.advanced_shared.background_visible} onChange={(event) => updateAdvancedShared("background_visible", event.target.checked)} type="checkbox" /><span>Background visible</span></label> : null}
              {settingMatches(advancedSearch, "Grid visible") ? <label className="phase195-check"><input checked={settings.advanced_shared.grid_visible} onChange={(event) => updateAdvancedShared("grid_visible", event.target.checked)} type="checkbox" /><span>Grid visible</span></label> : null}
              {settingMatches(advancedSearch, "Legend visible") ? <label className="phase195-check"><input checked={settings.advanced_shared.legend_visible} onChange={(event) => updateAdvancedShared("legend_visible", event.target.checked)} type="checkbox" /><span>Legend visible</span></label> : null}
            </section>
            <section><h3>Shared filters and navigation</h3>
              <label><span>Density</span><select aria-label="Advanced density" value={settings.simple.density} onChange={(event) => updateSimple("density", event.target.value as ContractGraphDensity)}><option value="COMPACT">Compact</option><option value="BALANCED">Balanced</option><option value="SPACIOUS">Spacious</option></select></label>
              <label><span>Entity type</span><select aria-label="Advanced filter by entity type" value={viewState.filters.entityTypes[0] ?? ""} onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                entityTypes: event.target.value ? [event.target.value as EntitySummary["entity_type"]] : []
              }))}><option value="">All types</option><option value="ENTRAL">ENTRAL</option><option value="MARSHAL">Marshals</option><option value="GENERAL">Generals</option><option value="COMMANDER">Commanders</option><option value="SOLDIER">Soldiers</option></select></label>
              <label><span>Authority</span><select aria-label="Advanced filter by authority level" value={viewState.filters.authorityLevels[0] ?? ""} onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                authorityLevels: event.target.value ? [event.target.value as EntitySummary["entity_type"]] : []
              }))}><option value="">All authority levels</option><option value="ENTRAL">ENTRAL</option><option value="MARSHAL">Marshal</option><option value="GENERAL">General</option><option value="COMMANDER">Commander</option><option value="SOLDIER">Soldier</option></select></label>
              <label><span>Domain</span><select aria-label="Advanced filter by domain" value={viewState.filters.domainIds[0] ?? ""} onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                domainIds: event.target.value ? [event.target.value] : []
              }))}><option value="">All domains</option>{authorizedDomainIds.map((domainId) => <option key={domainId} value={domainId}>{domainId}</option>)}</select></label>
              <label><span>Business</span><select aria-label="Advanced filter by business" disabled={Boolean(scopeBusinessId)} value={viewState.filters.businessIds[0] ?? ""} onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                businessIds: event.target.value ? [event.target.value] : []
              }))}><option value="">All businesses</option>{authorizedBusinessIds.map((businessId) => <option key={businessId} value={businessId}>{businessId}</option>)}</select></label>
              <label><span>Status</span><select aria-label="Advanced filter by status" value={viewState.filters.statuses[0] ?? ""} onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                statuses: event.target.value ? [event.target.value as EntitySummary["status"]] : []
              }))}><option value="">All statuses</option><option value="BUILDING">Building</option><option value="ACTIVE">Active</option><option value="PAUSED">Paused</option><option value="DEGRADED">Degraded</option><option value="RETIRED">Retired</option></select></label>
              <label><span>Health</span><select aria-label="Advanced filter by health" value={viewState.filters.healthStates[0] ?? ""} onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                healthStates: event.target.value ? [event.target.value as EntitySummary["health"]] : []
              }))}><option value="">All health states</option><option value="HEALTHY">Healthy</option><option value="WATCH">Watch</option><option value="DEGRADED">Degraded</option><option value="CRITICAL">Critical</option><option value="UNKNOWN">Unknown</option></select></label>
              <label><span>Relation context</span><select aria-label="Advanced relation context" value={viewState.filters.relationTypes[0] ?? ""} onChange={(event) => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...viewState.filters,
                relationTypes: event.target.value ? ["HIERARCHY"] : []
              }))}><option value="">All authorized relations</option><option value="HIERARCHY">Hierarchy</option></select></label>
              <label className="phase195-check"><input checked={settings.simple.synchronized_navigation} onChange={(event) => updateSimple("synchronized_navigation", event.target.checked)} type="checkbox" /><span>Advanced synchronized navigation</span></label>
              <button disabled={!viewState.selectedEntityId} onClick={() => {
                if (viewState.selectedEntityId) {
                  setSharedView(focusGraphEntity(viewState, rendererProjection, viewState.selectedEntityId));
                  setViewFocusSignal((signal) => signal + 1);
                }
              }} type="button"><Focus size={16} /> Focus selected</button>
              <button onClick={() => setViewFitSignal((signal) => signal + 1)} type="button"><Focus size={16} /> Fit visible</button>
              <button onClick={() => {
                setSharedView(resetGraphNavigation(viewState, rendererProjection));
                setViewFitSignal((signal) => signal + 1);
              }} type="button"><RotateCcw size={16} /> Reset camera and view</button>
              <button disabled={!viewState.searchQuery} onClick={() => setSharedView(updateGraphSearch(viewState, ""))} type="button"><X size={16} /> Clear search</button>
              <button onClick={() => setSharedView(updateGraphFilters(viewState, rendererProjection, {
                ...EMPTY_GRAPH_FILTERS,
                businessIds: scopeBusinessId ? [scopeBusinessId] : []
              }))} type="button"><X size={16} /> Clear filters</button>
              <button disabled={!selectedTarget(viewState)} onClick={() => {
                const target = selectedTarget(viewState);
                if (target) setSharedView(isolateGraphLineage(viewState, rendererProjection, target));
              }} type="button">Advanced isolate selected lineage</button>
              <button disabled={!selectedTarget(viewState)} onClick={() => {
                const target = selectedTarget(viewState);
                if (target) setSharedView(setGraphExpansion(viewState, rendererProjection, target, "ONE_LEVEL"));
              }} type="button">Advanced expand one level</button>
              <button disabled={!selectedTarget(viewState)} onClick={() => {
                const target = selectedTarget(viewState);
                if (target) setSharedView(setGraphExpansion(viewState, rendererProjection, target, "DESCENDANTS"));
              }} type="button">Advanced expand descendants</button>
              <button disabled={!selectedTarget(viewState)} onClick={() => {
                const target = selectedTarget(viewState);
                if (target) setSharedView(setGraphExpansion(viewState, rendererProjection, target, "COLLAPSE_DESCENDANTS"));
              }} type="button">Advanced collapse descendants</button>
              <button onClick={() => void resetPreferences("SHARED")} type="button"><RotateCcw size={16} /> Advanced restore shared defaults</button>
              <button onClick={() => void resetPreferences("VIEW_2D")} type="button"><RotateCcw size={16} /> Advanced restore 2D defaults</button>
              <button onClick={() => void resetPreferences("VIEW_3D")} type="button"><RotateCcw size={16} /> Advanced restore 3D defaults</button>
              <button onClick={copyTwoDSpacingToThreeD} type="button">Copy compatible 2D spacing to 3D</button>
              <button onClick={copyThreeDSpacingToTwoD} type="button">Copy compatible 3D spacing to 2D</button>
            </section>
            <section><h3>2D geometry</h3>
              {sharedRange("2D ring spacing", settings.advanced_2d.ring_spacing, 40, 1000, 10, (value) => updateAdvanced2D("ring_spacing", value))}
              {sharedRange("2D sibling spacing", settings.advanced_2d.sibling_spacing, 8, 500, 4, (value) => updateAdvanced2D("sibling_spacing", value))}
              {sharedRange("2D level spacing", settings.advanced_2d.level_spacing, 16, 800, 4, (value) => updateAdvanced2D("level_spacing", value))}
              {sharedRange("2D sector padding", settings.advanced_2d.sector_padding, 0, 0.45, 0.01, (value) => updateAdvanced2D("sector_padding", value))}
              {sharedRange("2D collision padding", settings.advanced_2d.collision_padding, 0, 100, 1, (value) => updateAdvanced2D("collision_padding", value))}
              {settingMatches(advancedSearch, "2D force iterations") ? (
                <label>
                  <span>2D force iterations</span>
                  <input
                    aria-describedby={!twoDForceSupported ? "phase195-force-tree-note" : undefined}
                    aria-label="2D force iterations"
                    disabled={!twoDForceSupported}
                    max={500}
                    min={0}
                    onChange={(event) => updateAdvanced2D(
                      "force_iterations",
                      Math.round(Number(event.target.value))
                    )}
                    step={1}
                    type="range"
                    value={settings.advanced_2d.force_iterations}
                  />
                  <output>
                    {twoDForceSupported
                      ? settings.advanced_2d.force_iterations
                      : "Disabled for hierarchy tree"}
                  </output>
                  {!twoDForceSupported ? (
                    <small id="phase195-force-tree-note" role="status">
                      Force relaxation is retained for radial layouts and does not deform hierarchy-tree levels.
                    </small>
                  ) : null}
                </label>
              ) : null}
              {sharedRange("2D fit padding", settings.advanced_2d.fit_padding, 0, 200, 2, (value) => updateAdvanced2D("fit_padding", value))}
              {settingMatches(advancedSearch, "2D tree orientation") ? <label><span>2D tree orientation</span><select value={settings.advanced_2d.tree_orientation} onChange={(event) => updateAdvanced2D("tree_orientation", event.target.value as GraphPreferenceSettings["advanced_2d"]["tree_orientation"])}><option value="TOP_DOWN">Top down</option><option value="LEFT_RIGHT">Left to right</option><option value="CENTER_OUT">Center out</option></select></label> : null}
              {settingMatches(advancedSearch, "2D edge routing") ? <label><span>2D edge routing</span><select value={settings.advanced_2d.edge_routing} onChange={(event) => updateAdvanced2D("edge_routing", event.target.value as GraphPreferenceSettings["advanced_2d"]["edge_routing"])}><option value="STRAIGHT">Straight</option><option value="CURVED">Curved</option><option value="ORTHOGONAL">Orthogonal</option></select></label> : null}
              {settingMatches(advancedSearch, "2D minimap") ? <label className="phase195-check"><input checked={settings.advanced_2d.minimap_visible} onChange={(event) => updateAdvanced2D("minimap_visible", event.target.checked)} type="checkbox" /><span>2D minimap</span></label> : null}
              {settingMatches(advancedSearch, "2D grid snapping") ? <label className="phase195-check"><input checked={settings.advanced_2d.grid_snapping} onChange={(event) => updateAdvanced2D("grid_snapping", event.target.checked)} type="checkbox" /><span>2D grid snapping</span></label> : null}
              {settings.advanced_2d.grid_snapping ? sharedRange("2D grid size", settings.advanced_2d.grid_size, 1, 200, 1, (value) => updateAdvanced2D("grid_size", value)) : null}
            </section>
            <section><h3>3D geometry and camera</h3>
              {sharedRange("3D ring spacing", settings.advanced_3d.ring_spacing, 40, 1200, 10, (value) => updateAdvanced3D("ring_spacing", value))}
              {sharedRange("3D ellipse eccentricity", settings.advanced_3d.ellipse_eccentricity, 0, 0.9, 0.01, (value) => updateAdvanced3D("ellipse_eccentricity", value))}
              {sharedRange("3D orbit tilt", settings.advanced_3d.orbit_tilt_degrees, -85, 85, 1, (value) => updateAdvanced3D("orbit_tilt_degrees", value))}
              {sharedRange("3D cluster spread", settings.advanced_3d.cluster_spread, 0.25, 4, 0.05, (value) => updateAdvanced3D("cluster_spread", value))}
              {sharedRange("3D vertical spread", settings.advanced_3d.vertical_spread, 0, 4, 0.05, (value) => updateAdvanced3D("vertical_spread", value))}
              {sharedRange("3D depth scale", settings.advanced_3d.depth_scale, 0.25, 4, 0.05, (value) => updateAdvanced3D("depth_scale", value))}
              {sharedRange("3D collision radius", settings.advanced_3d.collision_radius, 0, 100, 1, (value) => updateAdvanced3D("collision_radius", value))}
              {sharedRange("3D camera field of view", settings.advanced_3d.camera_field_of_view, 20, 100, 1, (value) => updateAdvanced3D("camera_field_of_view", value))}
              {sharedRange("3D focus distance", settings.advanced_3d.focus_distance, 100, 5000, 25, (value) => updateAdvanced3D("focus_distance", value))}
              {sharedRange("3D focus transition", settings.advanced_3d.focus_transition_ms, 0, 3000, 25, (value) => updateAdvanced3D("focus_transition_ms", Math.round(value)))}
              {sharedRange("3D near clip", settings.advanced_3d.near_clip, 0.001, Math.max(0.002, settings.advanced_3d.far_clip - 0.001), 0.01, (value) => updateAdvanced3D("near_clip", value))}
              {sharedRange("3D far clip", settings.advanced_3d.far_clip, settings.advanced_3d.near_clip + 0.001, 100000, 100, (value) => updateAdvanced3D("far_clip", value))}
              {sharedRange("3D minimum zoom", settings.advanced_3d.minimum_zoom, 0.01, Math.max(0.02, settings.advanced_3d.maximum_zoom - 0.01), 0.01, (value) => updateAdvanced3D("minimum_zoom", value))}
              {sharedRange("3D maximum zoom", settings.advanced_3d.maximum_zoom, settings.advanced_3d.minimum_zoom + 0.01, 100, 0.05, (value) => updateAdvanced3D("maximum_zoom", value))}
              {sharedRange("3D auto orbit speed", settings.advanced_3d.auto_orbit_speed, 0, 5, 0.05, (value) => updateAdvanced3D("auto_orbit_speed", value))}
              {sharedRange("3D bloom intensity", settings.advanced_3d.bloom_intensity, 0, 3, 0.05, (value) => updateAdvanced3D("bloom_intensity", value))}
              {sharedRange("3D lighting intensity", settings.advanced_3d.lighting_intensity, 0, 5, 0.05, (value) => updateAdvanced3D("lighting_intensity", value))}
              {settingMatches(advancedSearch, "3D orbit direction") ? <label><span>3D orbit direction</span><select value={settings.advanced_3d.orbit_direction} onChange={(event) => updateAdvanced3D("orbit_direction", event.target.value as GraphPreferenceSettings["advanced_3d"]["orbit_direction"])}><option value="CLOCKWISE">Clockwise</option><option value="COUNTERCLOCKWISE">Counterclockwise</option></select></label> : null}
              {settingMatches(advancedSearch, "3D auto orbit") ? <label className="phase195-check"><input checked={settings.advanced_3d.auto_orbit_enabled} onChange={(event) => updateAdvanced3D("auto_orbit_enabled", event.target.checked)} type="checkbox" /><span>3D auto orbit</span></label> : null}
              {settingMatches(advancedSearch, "3D node billboard") ? <label className="phase195-check"><input checked={settings.advanced_3d.node_billboard} onChange={(event) => updateAdvanced3D("node_billboard", event.target.checked)} type="checkbox" /><span>3D node billboard</span></label> : null}
              {settingMatches(advancedSearch, "3D edge depth fade") ? <label className="phase195-check"><input checked={settings.advanced_3d.edge_depth_fade} onChange={(event) => updateAdvanced3D("edge_depth_fade", event.target.checked)} type="checkbox" /><span>3D edge depth fade</span></label> : null}
            </section>
          </details>
          <footer>
            <button disabled={!canPinSelectedIn2D} onClick={() => pinSelected("2D")} type="button"><Pin size={16} /> Pin selected in 2D</button>
            <button disabled={!canPinSelectedIn3D} onClick={() => pinSelected("3D")} type="button"><Pin size={16} /> Pin selected in 3D</button>
            <button disabled={!canUnpinSelected} onClick={unpinSelected} type="button"><PinOff size={16} /> Return selected to automatic layout</button>
            <button onClick={() => void resetPreferences("SHARED")} type="button"><RotateCcw size={16} /> Restore shared defaults</button>
            <button onClick={() => void resetPreferences("VIEW_2D")} type="button"><RotateCcw size={16} /> Restore 2D defaults</button>
            <button onClick={() => void resetPreferences("VIEW_3D")} type="button"><RotateCcw size={16} /> Restore 3D defaults</button>
            <button disabled={settings.pinned_positions.length === 0} onClick={() => void resetPreferences("PINNED_POSITIONS")} type="button"><PinOff size={16} /> Delete saved node positions</button>
            <button onClick={() => void resetPreferences("ALL")} type="button"><RotateCcw size={16} /> Delete all saved graph overrides</button>
          </footer>
        </aside>
      ) : null}

      <section className="phase195-export-bar" aria-label="Graph exports">
        <button onClick={() => exportGraphData("json")} type="button"><Download size={16} /> Export JSON</button>
        <button onClick={() => exportGraphData("csv")} type="button"><Download size={16} /> Export CSV</button>
        <button onClick={() => void exportCurrentViewImage()} type="button"><ImageDown size={16} /> Export current view image</button>
        <button onClick={() => void copyAuthorizedDeepLink()} type="button">Copy deep link</button>
        <button onClick={() => {
          setAdvancedOpen(true);
          setAdvancedSettingsExpanded(true);
        }} type="button"><Settings2 size={16} /> Advanced</button>
        <span role="status">{saveStatus}</span>
      </section>

      <p aria-live="polite" className="phase180-graph-motion-status" role="status">
        {reducedMotion
          ? "Graph movement is paused by your reduced-motion setting. Agent activity and live canonical updates continue."
          : effectiveMovementPaused
            ? "Graph movement is paused. Agent activity and live canonical updates continue."
            : "Graph movement is active. Agent activity and live canonical updates continue."}
      </p>
      {narrowViewport && requestedArrangement === "side-by-side" ? (
        <p className="phase195-responsive-note" role="status">Stack is active as a safe narrow-screen override; Side by side remains saved.</p>
      ) : null}
      {fullscreenError ? <p className="phase180-fullscreen-status" role="status">{fullscreenError}</p> : null}
      {layout2D && layout2DComputation.workerFailureCode ? (
        <p className="phase195-responsive-note" role="status">
          The 2D layout worker was unavailable, so ENTRAL completed the same
          authorized layout synchronously without reducing graph data.
        </p>
      ) : null}
      {layout3D && layout3DComputation.workerFailureCode ? (
        <p className="phase195-responsive-note" role="status">
          The 3D layout worker was unavailable, so ENTRAL completed the same
          authorized layout synchronously without reducing graph data.
        </p>
      ) : null}

      {activeEntities.length === 0 ? (
        <CanonicalGraphEmptyState label="Universe Graph" />
      ) : (
        <div className="phase180-graph-panels" data-layout={effectiveArrangement}>
          {render2D ? (
            <div className="phase180-graph-panel" data-panel="2d" ref={twoDimensionalPanelRef} tabIndex={-1}>
              <CanonicalGraphErrorBoundary
                entities={activeEntities}
                label="2D Graph"
                onFailure={() => submitRendererTelemetry("2D", {
                  droppedFrameRate: 0,
                  errorCode: layout2DComputation.error
                    ? "GRAPH_LAYOUT_FAILURE"
                    : "GRAPH_RENDERER_FAILURE",
                  frameRate: 0,
                  layoutTimeMs: layout2DDurationMsRef.current,
                  renderTimeMs: 0,
                  sampleWindowMs: 1
                })}
              >
                {layout2D ? <CanonicalUniverseGraph
                  entities={activeEntities}
                  eventSequence={eventSequence}
                  fullscreenActive={fullscreenDimension === "2d"}
                  focusedEntityId={viewState.focusedEntityId}
                  layout={layout2D}
                  movementPaused={effectiveMovementPaused}
                  motionLocked={reducedMotion || settings.simple.motion === "OFF"}
                  onFrameDiagnostics={submitFrameTelemetry}
                  onOpenFullRecord={onOpenFullRecord}
                  onFullscreenToggle={(trigger) => void toggleFullscreen("2d", trigger)}
                  onMovementToggle={() => setMovementPaused((paused) => !paused)}
                  onSelectedEntityChange={(entityId) => {
                    const next = entityId
                      ? selectGraphEntity(viewState, rendererProjection, entityId, {
                        synchronizeFocus: settings.simple.synchronized_navigation
                      })
                      : clearGraphSelection(viewState, rendererProjection);
                    setSharedView(next);
                  }}
                  selectedEntityId={viewState.selectedEntityId}
                  settings={rendererSettings}
                  viewFitSignal={viewFitSignal}
                  viewFocusSignal={viewFocusSignal}
                /> : layout2DComputation.loading ? (
                  <GraphLayoutLoading entities={activeEntities} renderer="2D" />
                ) : <GraphLayoutFailure renderer="2D" />}
              </CanonicalGraphErrorBoundary>
            </div>
          ) : null}
          {render3D ? (
            <div className="phase180-graph-panel" data-panel="3d" ref={threeDimensionalPanelRef} tabIndex={-1}>
              <CanonicalGraphErrorBoundary
                entities={activeEntities}
                label="3D Graph"
                onFailure={() => submitRendererTelemetry("3D", {
                  droppedFrameRate: 0,
                  errorCode: layout3DComputation.error
                    ? "GRAPH_LAYOUT_FAILURE"
                    : "GRAPH_RENDERER_FAILURE",
                  frameRate: 0,
                  layoutTimeMs: layout3DDurationMsRef.current,
                  renderTimeMs: 0,
                  sampleWindowMs: 1
                })}
              >
                {layout3D ? <CanonicalUniverse3DGraph
                  entities={activeEntities}
                  eventSequence={eventSequence}
                  focusedEntityId={viewState.focusedEntityId}
                  fullscreenActive={fullscreenDimension === "3d"}
                  inspectorCollapsed={inspectorCollapsed}
                  layout={layout3D}
                  motionLocked={reducedMotion || settings.simple.motion === "OFF"}
                  movementPaused={effectiveMovementPaused}
                  onFullscreenToggle={(trigger) => void toggleFullscreen("3d", trigger)}
                  onFrameDiagnostics={submitFrameTelemetry}
                  onInspectorCollapsedChange={setInspectorCollapsed}
                  onMovementToggle={() => setMovementPaused((paused) => !paused)}
                  onOpenFullRecord={onOpenFullRecord}
                  onRendererFailure={() => submitRendererTelemetry("3D", {
                    droppedFrameRate: 0,
                    errorCode: "GRAPH_RENDERER_FAILURE",
                    frameRate: 0,
                    layoutTimeMs: layout3DDurationMsRef.current,
                    renderTimeMs: 0,
                    sampleWindowMs: 1
                  })}
                  onSelectedEntityChange={(entityId) => {
                    const next = entityId
                      ? selectGraphEntity(viewState, rendererProjection, entityId, {
                        synchronizeFocus: settings.simple.synchronized_navigation
                      })
                      : clearGraphSelection(viewState, rendererProjection);
                    setSharedView(next);
                  }}
                  onWebGlStateChange={submitWebGlTelemetry}
                  selectedEntityId={viewState.selectedEntityId}
                  settings={rendererSettings}
                  viewFitSignal={viewFitSignal}
                  viewFocusSignal={viewFocusSignal}
                /> : layout3DComputation.loading ? (
                  <GraphLayoutLoading entities={activeEntities} renderer="3D" />
                ) : <GraphLayoutFailure renderer="3D" />}
              </CanonicalGraphErrorBoundary>
            </div>
          ) : null}
        </div>
      )}

      {settings.advanced_shared.legend_visible ? (
        <aside className="phase195-legend" aria-label="Graph legend">
          <strong>Authority</strong>
          <span data-tier="0">ENTRAL · center</span>
          <span data-tier="1">Marshal · band 1</span>
          <span data-tier="2">General · band 2</span>
          <span data-tier="3">Commander · band 3</span>
          <span data-tier="4">Soldier · band 4</span>
          <span>Connections · {settings.simple.connections.toLocaleLowerCase()}</span>
          <span>Health and status use color plus text/tooltips</span>
        </aside>
      ) : null}
      <CanonicalGraphTextualHierarchy entities={activeEntities} label="Universe Graph" />
      <span className="sr-only" aria-live="polite">
        {fullscreenDimension
          ? `${fullscreenDimension.toUpperCase()} Graph full screen active. Press Escape or Exit full screen to return.`
          : `${activeProjection.entityCount} entities and ${activeProjection.edgeCount} edges are synchronized across active renderers.`}
      </span>
    </section>
  );
}
