"use client";

import {
  canonicalGraphPreferenceSettings,
  type EntitySummary,
  type GraphPreferenceSettings
} from "@entral/contracts";
import {
  ArrowUp,
  Focus,
  Hand,
  LocateFixed,
  Maximize2,
  Minimize2,
  PauseCircle,
  PlayCircle,
  Search,
  Settings2,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  availableUniverseNavigationPoints,
  canonicalGraphMotionProgress,
  canonicalLineageAndSubtree,
  fitUniverseCamera,
  MAX_UNIVERSE_ZOOM,
  MIN_UNIVERSE_ZOOM,
  nextUniverseEntityId,
  semanticUniverseIds,
  type CanonicalRendererFrameDiagnostics
} from "../lib/canonical-universe";
import {
  GRAPH_AUTHORITY_ROLES,
  stableGraphHash
} from "../lib/graph-authority";
import {
  layoutGraph2D,
  type GraphLayout2DResult
} from "../lib/graph-layouts";
import { buildRendererGraphProjection } from "../lib/graph-projection";
import { effectiveGraphRendererSettings } from "../lib/graph-renderer-performance";
import { CanonicalGraphSemanticsOverlay } from "./CanonicalGraphSemanticsOverlay";

type Camera = { x: number; y: number; zoom: number };
type PointerRecord = { x: number; y: number };
type FocusRect = Pick<DOMRectReadOnly, "bottom" | "height" | "left" | "right" | "top" | "width">;
type Canonical2DRenderPoint = {
  readonly entity: EntitySummary;
  readonly x: number;
  readonly y: number;
};
type Canonical2DLayoutTransition = {
  readonly durationMs: number;
  readonly easing: GraphPreferenceSettings["advanced_shared"]["motion_easing"];
  readonly fromById: ReadonlyMap<string, PointerRecord>;
  readonly startedAtMs: number;
};

const SEARCH_INPUT_ID = "phase180-graph-search";
const SEARCH_RESULTS_ID = "phase180-graph-search-results";
const GRAPH_INSTRUCTIONS_ID = "phase180-graph-instructions";
export const CANONICAL_2D_RENDER_ID_SIGNATURE_SEED =
  "entral-phase-195-2d-render-frame-v1";

export function canonical2DRenderedIdSignature(entityIds: readonly string[]) {
  return stableGraphHash(
    entityIds.join("\u0000"),
    CANONICAL_2D_RENDER_ID_SIGNATURE_SEED
  ).toString(16).padStart(8, "0");
}

export function phase195Canonical2DRenderIds(
  points: readonly {
    readonly entity: Pick<EntitySummary, "entity_id">;
  }[]
) {
  return new Set(points.map((point) => point.entity.entity_id));
}

export function canonical2DFocusAnchor(
  canvasRect: FocusRect,
  inspectorRect: FocusRect | null,
  clearance = 12
): PointerRecord {
  const center = {
    x: canvasRect.width / 2,
    y: canvasRect.height / 2
  };
  if (
    !inspectorRect
    || inspectorRect.right <= canvasRect.left
    || inspectorRect.left >= canvasRect.right
    || inspectorRect.bottom <= canvasRect.top
    || inspectorRect.top >= canvasRect.bottom
  ) {
    return center;
  }

  const overlapWidth = Math.min(canvasRect.right, inspectorRect.right)
    - Math.max(canvasRect.left, inspectorRect.left);
  const overlayStartsAtX = inspectorRect.left - canvasRect.left;
  const overlayStartsAtY = inspectorRect.top - canvasRect.top;
  if (overlapWidth >= canvasRect.width * 0.6) {
    return {
      x: center.x,
      y: Math.max(24, Math.min(center.y, (overlayStartsAtY - clearance) / 2))
    };
  }
  const canvasCenterX = canvasRect.left + center.x;
  const inspectorCenterX = (inspectorRect.left + inspectorRect.right) / 2;
  if (inspectorCenterX >= canvasCenterX) {
    return {
      x: Math.max(24, Math.min(center.x, (overlayStartsAtX - clearance) / 2)),
      y: center.y
    };
  }
  return {
    x: Math.min(canvasRect.width - 24, Math.max(center.x, (
      inspectorRect.right - canvasRect.left + clearance + canvasRect.width
    ) / 2)),
    y: center.y
  };
}

export function canonical2DFramePosition(
  point: {
    readonly entity: Pick<EntitySummary, "entity_id">;
    readonly x: number;
    readonly y: number;
  },
  visibleIds: ReadonlySet<string>,
  camera: Readonly<Camera>,
  viewportWidth: number,
  viewportHeight: number
): PointerRecord | null {
  if (!visibleIds.has(point.entity.entity_id)) return null;
  const position = {
    x: viewportWidth / 2 + camera.x + point.x * camera.zoom,
    y: viewportHeight / 2 + camera.y + point.y * camera.zoom
  };
  return (
    position.x < -80 || position.x > viewportWidth + 80
    || position.y < -40 || position.y > viewportHeight + 40
  ) ? null : position;
}

function graphDetailAttribute(value: EntitySummary["latest_material_result"]) {
  if (value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function clampZoom(zoom: number) {
  return Math.max(MIN_UNIVERSE_ZOOM, Math.min(MAX_UNIVERSE_ZOOM, zoom));
}

function zoomCameraAt(
  camera: Camera,
  zoom: number,
  anchor: PointerRecord,
  viewportWidth: number,
  viewportHeight: number
): Camera {
  const nextZoom = clampZoom(zoom);
  if (nextZoom === camera.zoom) return camera;
  const centerX = viewportWidth / 2 + camera.x;
  const centerY = viewportHeight / 2 + camera.y;
  const worldX = (anchor.x - centerX) / camera.zoom;
  const worldY = (anchor.y - centerY) / camera.zoom;
  return {
    x: anchor.x - viewportWidth / 2 - worldX * nextZoom,
    y: anchor.y - viewportHeight / 2 - worldY * nextZoom,
    zoom: nextZoom
  };
}

export function interpolateCanonical2DGraphPoints(
  targetPoints: readonly Canonical2DRenderPoint[],
  fromById: ReadonlyMap<string, PointerRecord>,
  elapsedMs: number,
  durationMs: number,
  easing: GraphPreferenceSettings["advanced_shared"]["motion_easing"]
): readonly Canonical2DRenderPoint[] {
  const progress = canonicalGraphMotionProgress(
    elapsedMs,
    durationMs,
    easing
  );
  return targetPoints.map((point) => {
    const from = fromById.get(point.entity.entity_id);
    if (!from || progress >= 1) return point;
    return {
      ...point,
      x: from.x + (point.x - from.x) * progress,
      y: from.y + (point.y - from.y) * progress
    };
  });
}

export function canonical2DLayoutTransitionEnabled({
  durationMs,
  hasPreviousLayout,
  motionLocked,
  motionMode,
  movementPaused,
  positionsChanged
}: {
  readonly durationMs: number;
  readonly hasPreviousLayout: boolean;
  readonly motionLocked: boolean;
  readonly motionMode: GraphPreferenceSettings["simple"]["motion"];
  readonly movementPaused: boolean;
  readonly positionsChanged: boolean;
}) {
  return (
    hasPreviousLayout
    && positionsChanged
    && durationMs > 0
    && !movementPaused
    && !motionLocked
    && motionMode !== "OFF"
    && motionMode !== "REDUCED"
  );
}

export function canonical2DLabelPlacement({
  anchorX,
  anchorY,
  canvasHeight,
  canvasWidth,
  nodeRadius,
  textWidth
}: {
  anchorX: number;
  anchorY: number;
  canvasHeight: number;
  canvasWidth: number;
  nodeRadius: number;
  textWidth: number;
}) {
  const padding = 8;
  const drawableWidth = Math.max(0, Math.min(textWidth, canvasWidth - padding * 2));
  const gap = nodeRadius + 5;
  const preferredRight = anchorX + gap;
  const preferredLeft = anchorX - gap - drawableWidth;
  const maximumLeft = Math.max(padding, canvasWidth - padding - drawableWidth);
  const left = preferredRight + drawableWidth <= canvasWidth - padding
    ? preferredRight
    : preferredLeft >= padding
      ? preferredLeft
      : Math.min(Math.max(preferredRight, padding), maximumLeft);
  const baselineY = Math.min(Math.max(anchorY + 4, 14), Math.max(14, canvasHeight - 8));
  return {
    baselineY,
    bottom: baselineY + 4,
    drawableWidth,
    left,
    right: left + drawableWidth,
    top: baselineY - 10
  };
}

export type Canonical2DBounds = Readonly<{
  bottom: number;
  left: number;
  right: number;
  top: number;
}>;

export function canonical2DBoundsOverlap(
  left: Canonical2DBounds,
  right: Canonical2DBounds,
  horizontalGap = 0,
  verticalGap = 0
) {
  return left.left < right.right + horizontalGap
    && left.right + horizontalGap > right.left
    && left.top < right.bottom + verticalGap
    && left.bottom + verticalGap > right.top;
}

export function canonical2DLabelBoundsAccepted(
  candidate: Canonical2DBounds,
  occupied: readonly Canonical2DBounds[]
) {
  return !occupied.some((bounds) => canonical2DBoundsOverlap(candidate, bounds, 6, 3));
}

const roleColors = {
  ENTRAL: "#f4f7ff",
  MARSHAL: "#8eb9ff",
  GENERAL: "#55e8d5",
  COMMANDER: "#d6a7ff",
  SOLDIER: "#ffca75"
} as const;

const healthColors = {
  HEALTHY: "#57e6a3",
  WATCH: "#ffd56a",
  DEGRADED: "#ff8e67",
  CRITICAL: "#ff5c73",
  UNKNOWN: "#8795ad"
} as const;

const statusColors = {
  ACTIVE: "#57e6a3",
  BUILDING: "#8eb9ff",
  PAUSED: "#ffd56a",
  DEGRADED: "#ff8e67",
  OTHER: "#8795ad"
} as const;

function healthColor(entity: EntitySummary) {
  if (entity.health === "CRITICAL") return "#ff5c73";
  if (entity.health === "DEGRADED") return "#ff8e67";
  if (entity.health === "WATCH") return "#ffd56a";
  if (entity.health === "HEALTHY") return "#57e6a3";
  return roleColors[entity.entity_type];
}

function statusColor(entity: EntitySummary) {
  if (entity.status === "ACTIVE") return "#57e6a3";
  if (entity.status === "BUILDING") return "#8eb9ff";
  if (entity.status === "PAUSED") return "#ffd56a";
  if (entity.status === "DEGRADED") return "#ff8e67";
  return "#8795ad";
}

function entityColor(
  entity: EntitySummary,
  mode: GraphPreferenceSettings["advanced_shared"]["color_mode"]
) {
  if (mode === "HEALTH") return healthColor(entity);
  if (mode === "STATUS") return statusColor(entity);
  return roleColors[entity.entity_type];
}

export function CanonicalUniverseGraph({
  entities,
  eventSequence,
  focusedEntityId = null,
  fullscreenActive = false,
  layout: suppliedLayout,
  movementPaused,
  motionLocked = false,
  onOpenFullRecord,
  onFullscreenToggle,
  onFrameDiagnostics,
  onMovementToggle,
  onSelectedEntityChange,
  selectedEntityId,
  settings: suppliedSettings,
  touchInteractionActive: controlledTouchInteractionActive,
  onTouchInteractionChange,
  viewFitSignal = 0,
  viewFocusSignal = 0
}: {
  entities: readonly EntitySummary[];
  eventSequence: number;
  focusedEntityId?: string | null;
  fullscreenActive?: boolean;
  layout?: GraphLayout2DResult;
  movementPaused: boolean;
  motionLocked?: boolean;
  onOpenFullRecord: (entityId: string) => void;
  onFullscreenToggle?: (trigger: HTMLButtonElement) => void;
  onFrameDiagnostics?: (diagnostics: CanonicalRendererFrameDiagnostics) => void;
  onMovementToggle?: () => void;
  onSelectedEntityChange: (entityId: string | null) => void;
  onTouchInteractionChange?: (active: boolean) => void;
  selectedEntityId: string | null;
  settings?: GraphPreferenceSettings;
  touchInteractionActive?: boolean;
  viewFitSignal?: number;
  viewFocusSignal?: number;
}) {
  const requestedSettings = useMemo(
    () => suppliedSettings ?? canonicalGraphPreferenceSettings(),
    [suppliedSettings]
  );
  const rendererPerformance = useMemo(
    () => effectiveGraphRendererSettings(requestedSettings, entities.length),
    [entities.length, requestedSettings]
  );
  const settings = rendererPerformance.settings;
  const fallbackProjection = useMemo(
    () => suppliedLayout ? null : buildRendererGraphProjection(entities),
    [entities, suppliedLayout]
  );
  const layout = useMemo(
    () => suppliedLayout ?? layoutGraph2D(fallbackProjection!),
    [fallbackProjection, suppliedLayout]
  );
  const surfaceRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detailDrawerRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const lastViewFitSignalRef = useRef(viewFitSignal);
  const lastViewFocusSignalRef = useRef(viewFocusSignal);
  const initialFitRef = useRef(false);
  const pointersRef = useRef(new Map<number, PointerRecord>());
  const gestureRef = useRef<{ camera: Camera; distance: number; midpoint: PointerRecord } | null>(null);
  const dragStartRef = useRef<PointerRecord | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 0.72 });
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [dimUnrelated, setDimUnrelated] = useState(true);
  const [uncontrolledTouchInteractionActive, setUncontrolledTouchInteractionActive] = useState(false);
  const touchInteractionActive = controlledTouchInteractionActive ?? uncontrolledTouchInteractionActive;
  const setTouchInteractionActive = (active: boolean) => {
    if (controlledTouchInteractionActive === undefined) {
      setUncontrolledTouchInteractionActive(active);
    }
    onTouchInteractionChange?.(active);
  };
  const [rendererFailure, setRendererFailure] = useState<Error | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<PointerRecord | null>(null);
  const [keyboardTooltipActive, setKeyboardTooltipActive] = useState(false);
  const points = useMemo<readonly Canonical2DRenderPoint[]>(() => {
    const entityById = new Map(entities.map((entity) => [entity.entity_id, entity]));
    return layout.points.flatMap((point) => {
      const entity = entityById.get(point.entityId);
      return entity ? [{ entity, x: point.x, y: point.y }] : [];
    });
  }, [entities, layout]);
  const renderedPointsRef = useRef<readonly Canonical2DRenderPoint[]>(points);
  const layoutTransitionRef = useRef<Canonical2DLayoutTransition | null>(null);
  const hadLayoutRef = useRef(points.length > 0);
  const byId = useMemo(() => new Map(entities.map((entity) => [entity.entity_id, entity])), [entities]);
  const pointById = useMemo(() => new Map(points.map((point) => [point.entity.entity_id, point])), [points]);
  const selected = selectedEntityId ? byId.get(selectedEntityId) ?? null : null;
  const tooltipEntity = hoveredEntityId
    ? byId.get(hoveredEntityId) ?? null
    : keyboardTooltipActive
      ? selected
      : null;
  const relatedIds = useMemo(
    () => canonicalLineageAndSubtree(entities, selectedEntityId),
    [entities, selectedEntityId]
  );
  const canonicalRenderIds = useMemo(
    () => suppliedLayout
      ? phase195Canonical2DRenderIds(points)
      : null,
    [points, suppliedLayout]
  );
  const legacyVisibleIds = useMemo(
    () => canonicalRenderIds
      ? null
      : semanticUniverseIds(entities, selectedEntityId, camera.zoom),
    [camera.zoom, canonicalRenderIds, entities, selectedEntityId]
  );
  const visibleIds = canonicalRenderIds ?? legacyVisibleIds!;
  const activeLevelOfDetail = rendererPerformance.effectiveLevelOfDetail;
  const maximumLiveLabels = settings.advanced_shared.maximum_live_labels;
  const legend = useMemo(() => {
    if (settings.advanced_shared.color_mode === "HEALTH") {
      return { entries: Object.entries(healthColors), label: "Health legend" };
    }
    if (settings.advanced_shared.color_mode === "STATUS") {
      return { entries: Object.entries(statusColors), label: "Status legend" };
    }
    return { entries: Object.entries(roleColors), label: "Entity type legend" };
  }, [settings.advanced_shared.color_mode]);

  useEffect(() => {
    setShowLabels(settings.simple.labels !== "OFF");
    setShowGrid(settings.advanced_shared.grid_visible);
    setDimUnrelated(settings.simple.connections !== "ALL");
  }, [
    settings.advanced_shared.grid_visible,
    settings.simple.connections,
    settings.simple.labels
  ]);

  useEffect(() => {
    const currentById = new Map(
      renderedPointsRef.current.map((point) => [
        point.entity.entity_id,
        point
      ])
    );
    const positionsChanged = points.some((point) => {
      const current = currentById.get(point.entity.entity_id);
      return Boolean(
        current
        && (current.x !== point.x || current.y !== point.y)
      );
    });
    const durationMs = Math.max(
      0,
      Math.min(5_000, settings.advanced_shared.animation_duration_ms)
    );
    const shouldAnimate = canonical2DLayoutTransitionEnabled({
      durationMs,
      hasPreviousLayout: hadLayoutRef.current,
      motionLocked,
      motionMode: settings.simple.motion,
      movementPaused,
      positionsChanged
    });

    layoutTransitionRef.current = shouldAnimate
      ? {
          durationMs,
          easing: settings.advanced_shared.motion_easing,
          fromById: new Map(points.map((point) => {
            const current = currentById.get(point.entity.entity_id);
            return [
              point.entity.entity_id,
              {
                x: current?.x ?? point.x,
                y: current?.y ?? point.y
              }
            ];
          })),
          startedAtMs: performance.now()
        }
      : null;
    renderedPointsRef.current = shouldAnimate
      ? interpolateCanonical2DGraphPoints(
          points,
          layoutTransitionRef.current!.fromById,
          0,
          durationMs,
          settings.advanced_shared.motion_easing
        )
      : points;
    hadLayoutRef.current = points.length > 0;
  }, [
    motionLocked,
    movementPaused,
    points,
    settings.advanced_shared.animation_duration_ms,
    settings.advanced_shared.motion_easing,
    settings.simple.motion
  ]);

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points.length) return;
    const fitted = fitUniverseCamera(
      points,
      canvas.clientWidth,
      canvas.clientHeight,
      settings.advanced_2d.fit_padding
    );
    if (fitted) setCamera(fitted);
  }, [points, settings.advanced_2d.fit_padding]);

  useEffect(() => {
    if (lastViewFitSignalRef.current === viewFitSignal) return undefined;
    lastViewFitSignalRef.current = viewFitSignal;
    const frame = window.requestAnimationFrame(fit);
    return () => window.cancelAnimationFrame(frame);
  }, [fit, viewFitSignal]);

  useEffect(() => {
    if (initialFitRef.current || !points.length) return undefined;
    const frame = window.requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas || initialFitRef.current) return;
      const fitted = fitUniverseCamera(
        points,
        canvas.clientWidth,
        canvas.clientHeight,
        settings.advanced_2d.fit_padding
      );
      if (!fitted) return;
      initialFitRef.current = true;
      setCamera(fitted);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [points, settings.advanced_2d.fit_padding]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const handleWheel = (event: WheelEvent) => {
      if (!fullscreenActive && !event.ctrlKey && !event.metaKey) return;
      const deltaY = event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? event.deltaY * 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? event.deltaY * canvas.clientHeight
          : event.deltaY;
      if (deltaY === 0) return;
      event.preventDefault();
      const factor = Math.exp(-deltaY * 0.0012);
      const bounds = canvas.getBoundingClientRect();
      const anchor = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top
      };
      setCamera((current) => zoomCameraAt(
        current,
        current.zoom * factor,
        anchor,
        canvas.clientWidth,
        canvas.clientHeight
      ));
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [fullscreenActive]);

  useEffect(() => {
    if (!fullscreenActive && controlledTouchInteractionActive === undefined) {
      setUncontrolledTouchInteractionActive(false);
    }
  }, [controlledTouchInteractionActive, fullscreenActive]);

  const moveCameraToEntity = useCallback((entityId: string) => {
    const point = renderedPointsRef.current.find(
      (candidate) => candidate.entity.entity_id === entityId
    ) ?? pointById.get(entityId);
    if (!point) return;
    const canvas = canvasRef.current;
    const canvasRect = canvas?.getBoundingClientRect() ?? null;
    const inspectorRect = detailDrawerRef.current?.getBoundingClientRect() ?? null;
    const anchor = canvasRect
      ? canonical2DFocusAnchor(canvasRect, inspectorRect)
      : null;
    const inspectorOverlapsCanvas = Boolean(
      canvasRect
      && inspectorRect
      && inspectorRect.right > canvasRect.left
      && inspectorRect.left < canvasRect.right
      && inspectorRect.bottom > canvasRect.top
      && inspectorRect.top < canvasRect.bottom
    );
    let inspectorFittedCamera: Camera | null = null;
    let resolvedFocusAnchor = anchor;
    if (canvas && canvasRect && inspectorRect && inspectorOverlapsCanvas) {
      const usableWidth = Math.max(
        160,
        Math.min(canvas.clientWidth, inspectorRect.left - canvasRect.left - 12)
      );
      const focusPoints = renderedPointsRef.current.filter((candidate) =>
        relatedIds.has(candidate.entity.entity_id)
      );
      const fitted = fitUniverseCamera(
        focusPoints.length > 0 ? focusPoints : [point],
        usableWidth,
        canvas.clientHeight,
        Math.min(
          settings.advanced_2d.fit_padding,
          usableWidth * 0.26,
          canvas.clientHeight * 0.18
        ),
        0.75
      );
      if (fitted) {
        inspectorFittedCamera = {
          x: fitted.x + usableWidth / 2 - canvas.clientWidth / 2,
          y: fitted.y,
          zoom: fitted.zoom
        };
        resolvedFocusAnchor = {
          x: canvas.clientWidth / 2 + inspectorFittedCamera.x + point.x * fitted.zoom,
          y: canvas.clientHeight / 2 + inspectorFittedCamera.y + point.y * fitted.zoom
        };
      }
    }
    setCamera((current) => {
      if (inspectorFittedCamera) return inspectorFittedCamera;
      const focusedZoom = clampZoom(Math.max(current.zoom, 0.75));
      return {
        x: (anchor?.x ?? 0) - (canvas?.clientWidth ?? 0) / 2 - point.x * focusedZoom,
        y: (anchor?.y ?? 0) - (canvas?.clientHeight ?? 0) / 2 - point.y * focusedZoom,
        zoom: focusedZoom
      };
    });
    if (surfaceRef.current && resolvedFocusAnchor) {
      surfaceRef.current.dataset.canonicalFocusAnchorX = resolvedFocusAnchor.x.toFixed(2);
      surfaceRef.current.dataset.canonicalFocusAnchorY = resolvedFocusAnchor.y.toFixed(2);
    }
  }, [pointById, relatedIds, settings.advanced_2d.fit_padding]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const drawer = detailDrawerRef.current;
    if (!selectedEntityId || !canvas || !drawer) return undefined;
    moveCameraToEntity(selectedEntityId);
    const observer = new ResizeObserver(() => moveCameraToEntity(selectedEntityId));
    observer.observe(canvas);
    observer.observe(drawer);
    return () => observer.disconnect();
  }, [moveCameraToEntity, selectedEntityId]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    const surface = surfaceRef.current;
    if (!surface) return;
    const point = selectedEntityId
      ? renderedPointsRef.current.find((candidate) => candidate.entity.entity_id === selectedEntityId)
        ?? pointById.get(selectedEntityId)
      : null;
    const position = point && canvas
      ? canonical2DFramePosition(point, visibleIds, camera, canvas.clientWidth, canvas.clientHeight)
      : null;
    if (!position || !selectedEntityId) {
      delete surface.dataset.canonicalCameraTargetEntityId;
      delete surface.dataset.canonicalSelectedScreenX;
      delete surface.dataset.canonicalSelectedScreenY;
      return;
    }
    surface.dataset.canonicalCameraTargetEntityId = selectedEntityId;
    surface.dataset.canonicalSelectedScreenX = position.x.toFixed(2);
    surface.dataset.canonicalSelectedScreenY = position.y.toFixed(2);
  }, [camera, pointById, selectedEntityId, visibleIds]);

  const focusEntity = useCallback((entityId: string) => {
    moveCameraToEntity(entityId);
    onSelectedEntityChange(entityId);
  }, [moveCameraToEntity, onSelectedEntityChange]);

  useEffect(() => {
    if (lastViewFocusSignalRef.current === viewFocusSignal) return;
    lastViewFocusSignalRef.current = viewFocusSignal;
    if (focusedEntityId) moveCameraToEntity(focusedEntityId);
  }, [focusedEntityId, moveCameraToEntity, viewFocusSignal]);

  useEffect(() => {
    if (!selectedEntityId || byId.has(selectedEntityId)) return;
    onSelectedEntityChange(null);
  }, [byId, onSelectedEntityChange, selectedEntityId]);

  useEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;
    delete surface.dataset.renderedCanonicalIdCount;
    delete surface.dataset.renderedCanonicalIdSignature;
  }, [camera, points, visibleIds]);

  useEffect(() => {
    const currentCanvas = canvasRef.current;
    if (!currentCanvas) return;
    const canvas: HTMLCanvasElement = currentCanvas;
    let lastAnimatedRenderAt: number | null = null;
    const resize = () => {
      const qualityLimit =
        settings.advanced_shared.performance_mode === "PERFORMANCE"
        || settings.advanced_shared.rendering_quality === "LOW"
          ? 1
          : settings.advanced_shared.rendering_quality === "MEDIUM"
            ? 1.5
            : 2;
      const ratio = Math.min(window.devicePixelRatio || 1, qualityLimit);
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("orientationchange", resize);
    resize();
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", resize);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    function draw() {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(renderFrame);
    }

    function renderFrame(frameTime: number) {
      const transition = layoutTransitionRef.current;
      const minimumFrameInterval =
        1_000 / settings.advanced_shared.frame_rate_cap;
      if (
        transition
        && lastAnimatedRenderAt !== null
        && frameTime - lastAnimatedRenderAt < minimumFrameInterval
      ) {
        frameRef.current = requestAnimationFrame(renderFrame);
        return;
      }
      if (transition) lastAnimatedRenderAt = frameTime;
      const elapsedMs = transition
        ? Math.max(0, frameTime - transition.startedAtMs)
        : 0;
      const renderPoints = transition
        ? interpolateCanonical2DGraphPoints(
            points,
            transition.fromById,
            elapsedMs,
            transition.durationMs,
            transition.easing
          )
        : points;
      renderedPointsRef.current = renderPoints;
      if (transition && elapsedMs >= transition.durationMs) {
        layoutTransitionRef.current = null;
      }
      const renderPointById = new Map(
        renderPoints.map((point) => [point.entity.entity_id, point])
      );

        const renderStartedAt = performance.now();
        try {
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Canvas2DUnavailable");
        const ratio = canvas.width / Math.max(1, canvas.clientWidth);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        if (settings.advanced_shared.background_visible) {
          context.fillStyle = "#050913";
          context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        }
        const centerX = canvas.clientWidth / 2 + camera.x;
        const centerY = canvas.clientHeight / 2 + camera.y;

        if (showGrid) {
          const spacing = Math.max(26, 90 * camera.zoom);
          context.strokeStyle = "rgba(139, 169, 217, .08)";
          context.lineWidth = 1;
          context.beginPath();
          for (let x = ((centerX % spacing) + spacing) % spacing; x < canvas.clientWidth; x += spacing) {
            context.moveTo(x, 0);
            context.lineTo(x, canvas.clientHeight);
          }
          for (let y = ((centerY % spacing) + spacing) % spacing; y < canvas.clientHeight; y += spacing) {
            context.moveTo(0, y);
            context.lineTo(canvas.clientWidth, y);
          }
          context.stroke();
        }

        const screen = (point: { x: number; y: number }) => ({
          x: centerX + point.x * camera.zoom,
          y: centerY + point.y * camera.zoom
        });
        context.lineWidth = Math.max(
          0.25,
          settings.advanced_shared.edge_width * Math.min(1.5, Math.max(0.5, camera.zoom))
        );
        for (const point of renderPoints) {
          if (!visibleIds.has(point.entity.entity_id) || !point.entity.parent_id) continue;
          const parent = renderPointById.get(point.entity.parent_id);
          if (!parent || !visibleIds.has(parent.entity.entity_id)) continue;
          const from = screen(parent);
          const to = screen(point);
          if (
            Math.max(from.x, to.x) < -20 || Math.min(from.x, to.x) > canvas.clientWidth + 20
            || Math.max(from.y, to.y) < -20 || Math.min(from.y, to.y) > canvas.clientHeight + 20
          ) continue;
          const related = relatedIds.has(point.entity.entity_id) && relatedIds.has(parent.entity.entity_id);
          const direct = selectedEntityId === point.entity.entity_id
            || selectedEntityId === parent.entity.entity_id;
          if (
            settings.simple.connections === "LINEAGE" && selected && !related
            || settings.simple.connections === "DIRECT" && selected && !direct
            || settings.simple.connections === "DIRECT" && !selected
          ) continue;
          const baseOpacity = settings.advanced_shared.edge_opacity;
          const emphasizedOpacity = Math.min(
            1,
            baseOpacity * settings.advanced_shared.lineage_emphasis
          );
          context.strokeStyle = related
            ? `rgba(112, 230, 211, ${emphasizedOpacity})`
            : `rgba(112, 146, 197, ${
              baseOpacity * (dimUnrelated && selected ? 0.2 : 0.65)
            })`;
          context.beginPath();
          context.moveTo(from.x, from.y);
          if (settings.advanced_2d.edge_routing === "ORTHOGONAL") {
            context.lineTo(from.x, to.y);
            context.lineTo(to.x, to.y);
          } else if (
            settings.advanced_2d.edge_routing === "CURVED"
            && settings.advanced_shared.edge_curvature > 0
          ) {
            const midpointX = (from.x + to.x) / 2;
            const midpointY = (from.y + to.y) / 2;
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const curvature = settings.advanced_shared.edge_curvature;
            context.quadraticCurveTo(
              midpointX - dy * curvature,
              midpointY + dx * curvature,
              to.x,
              to.y
            );
          } else {
            context.lineTo(to.x, to.y);
          }
          context.stroke();
        }

        const labelCandidates: Array<{
          alpha: number;
          entity: EntitySummary;
          isSelected: boolean;
          position: PointerRecord;
          radius: number;
        }> = [];
        const renderedCanonicalIds: string[] = [];
        for (const point of renderPoints) {
          const position = canonical2DFramePosition(
            point,
            visibleIds,
            camera,
            canvas.clientWidth,
            canvas.clientHeight
          );
          if (!position) continue;
          renderedCanonicalIds.push(point.entity.entity_id);
          const isSelected = selectedEntityId === point.entity.entity_id;
          const unrelated = Boolean(selected) && !relatedIds.has(point.entity.entity_id);
          const radius = (
            isSelected
              ? 8 * settings.advanced_shared.selected_node_scale
              : point.entity.entity_type === "SOLDIER" ? 2.4 : 4.6
          ) * settings.advanced_shared.node_scale;
          context.globalAlpha = dimUnrelated && unrelated ? 0.22 : 1;
          context.fillStyle = entityColor(
            point.entity,
            settings.advanced_shared.color_mode
          );
          context.beginPath();
          context.arc(position.x, position.y, radius, 0, Math.PI * 2);
          context.fill();
          if (isSelected) {
            context.strokeStyle = "#ffffff";
            context.lineWidth = 2;
            context.beginPath();
            context.arc(position.x, position.y, radius + 5, 0, Math.PI * 2);
            context.stroke();
          }
          const structuralLabel = point.entity.entity_type === "ENTRAL"
            || (point.entity.entity_type === "MARSHAL" && camera.zoom >= 0.02);
          const labelsAlways = settings.simple.labels === "ALWAYS";
          const labelIsRelevant = !selected || relatedIds.has(point.entity.entity_id);
          const labelByMode =
            labelsAlways
            || settings.simple.labels === "RELEVANT" && labelIsRelevant
            || settings.simple.labels === "HOVER_OR_FOCUS" && isSelected;
          if (
            showLabels
            && labelByMode
            && (labelsAlways || point.entity.entity_type !== "SOLDIER" || isSelected)
            && (
              camera.zoom >= settings.advanced_shared.label_threshold
              || isSelected
              || structuralLabel
            )
          ) {
            labelCandidates.push({
              alpha: dimUnrelated && unrelated ? 0.22 : 1,
              entity: point.entity,
              isSelected,
              position,
              radius
            });
          }
          context.globalAlpha = 1;
        }
        const surface = surfaceRef.current;
        if (surface) {
          surface.dataset.renderedCanonicalIdCount =
            String(renderedCanonicalIds.length);
          surface.dataset.renderedCanonicalIdSignature =
            canonical2DRenderedIdSignature(renderedCanonicalIds);
        }

        context.font = `600 ${11 * settings.advanced_shared.label_scale}px Inter, system-ui, sans-serif`;
        const canvasBounds = canvas.getBoundingClientRect();
        const inspectorBounds = detailDrawerRef.current?.getBoundingClientRect() ?? null;
        const labelViewportRight = inspectorBounds
          && inspectorBounds.right > canvasBounds.left
          && inspectorBounds.left < canvasBounds.right
          && inspectorBounds.bottom > canvasBounds.top
          && inspectorBounds.top < canvasBounds.bottom
            ? Math.max(16, inspectorBounds.left - canvasBounds.left - 12)
            : canvas.clientWidth;
        const minimapBounds: Canonical2DBounds | null =
          settings.advanced_2d.minimap_visible && renderPoints.length > 1
            ? {
                bottom: canvas.clientHeight - 12,
                left: canvas.clientWidth - 128,
                right: canvas.clientWidth - 12,
                top: canvas.clientHeight - 94
              }
            : null;
        const occupiedLabels: Canonical2DBounds[] = minimapBounds ? [minimapBounds] : [];
        const renderedLabelBounds: Canonical2DBounds[] = [];
        if (surface) {
          surface.dataset.canonicalLabelViewportRight = labelViewportRight.toFixed(2);
          surface.dataset.canonicalMinimapVisible = String(Boolean(minimapBounds));
          delete surface.dataset.canonicalSelectedLabelBottom;
          delete surface.dataset.canonicalSelectedLabelLeft;
          delete surface.dataset.canonicalSelectedLabelRight;
          delete surface.dataset.canonicalSelectedLabelTop;
          if (minimapBounds) {
            surface.dataset.canonicalMinimapBottom = minimapBounds.bottom.toFixed(2);
            surface.dataset.canonicalMinimapLeft = minimapBounds.left.toFixed(2);
            surface.dataset.canonicalMinimapRight = minimapBounds.right.toFixed(2);
            surface.dataset.canonicalMinimapTop = minimapBounds.top.toFixed(2);
          } else {
            delete surface.dataset.canonicalMinimapBottom;
            delete surface.dataset.canonicalMinimapLeft;
            delete surface.dataset.canonicalMinimapRight;
            delete surface.dataset.canonicalMinimapTop;
          }
        }
        labelCandidates
          .sort((left, right) => {
            const priority = (candidate: typeof left) => candidate.isSelected
              ? 0
              : candidate.entity.entity_type === "ENTRAL"
                ? 1
                : candidate.entity.entity_type === "MARSHAL"
                  ? 2
                  : 3;
            return priority(left) - priority(right)
              || left.entity.stable_code.localeCompare(right.entity.stable_code);
          })
          .slice(0, maximumLiveLabels)
          .forEach((candidate) => {
            const placement = canonical2DLabelPlacement({
              anchorX: candidate.position.x,
              anchorY: candidate.position.y,
              canvasHeight: canvas.clientHeight,
              canvasWidth: labelViewportRight,
              nodeRadius: candidate.radius,
              textWidth: context.measureText(candidate.entity.name).width
            });
            const { baselineY, bottom, drawableWidth, left, right, top } = placement;
            const bounds = { bottom, left, right, top };
            if (!canonical2DLabelBoundsAccepted(bounds, occupiedLabels)) return;
            occupiedLabels.push(bounds);
            renderedLabelBounds.push(bounds);
            if (candidate.isSelected && surface) {
              surface.dataset.canonicalSelectedLabelBottom = bottom.toFixed(2);
              surface.dataset.canonicalSelectedLabelLeft = left.toFixed(2);
              surface.dataset.canonicalSelectedLabelRight = right.toFixed(2);
              surface.dataset.canonicalSelectedLabelTop = top.toFixed(2);
            }
            context.globalAlpha = candidate.alpha;
            context.fillStyle = "#f0f5ff";
            context.fillText(candidate.entity.name, left, baselineY, drawableWidth);
            context.globalAlpha = 1;
          });
        if (surface) {
          surface.dataset.canonicalRenderedLabelBounds = JSON.stringify(renderedLabelBounds);
          surface.dataset.canonicalMinimapLabelCollisionCount = String(
            minimapBounds
              ? renderedLabelBounds.filter((bounds) => canonical2DBoundsOverlap(bounds, minimapBounds)).length
              : 0
          );
        }
        if (minimapBounds) {
          const mapWidth = minimapBounds.right - minimapBounds.left;
          const mapHeight = minimapBounds.bottom - minimapBounds.top;
          const mapLeft = minimapBounds.left;
          const mapTop = minimapBounds.top;
          const xs = renderPoints.map((point) => point.x);
          const ys = renderPoints.map((point) => point.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const spanX = Math.max(1, maxX - minX);
          const spanY = Math.max(1, maxY - minY);
          context.fillStyle = "rgba(5, 9, 19, .82)";
          context.strokeStyle = "rgba(142, 185, 255, .48)";
          context.lineWidth = 1;
          context.fillRect(mapLeft, mapTop, mapWidth, mapHeight);
          context.strokeRect(mapLeft, mapTop, mapWidth, mapHeight);
          for (const point of renderPoints) {
            context.fillStyle = entityColor(
              point.entity,
              settings.advanced_shared.color_mode
            );
            context.fillRect(
              mapLeft + 6 + (point.x - minX) / spanX * (mapWidth - 12),
              mapTop + 6 + (point.y - minY) / spanY * (mapHeight - 12),
              2,
              2
            );
          }
        }
          const renderTimeMs = Math.max(0, performance.now() - renderStartedAt);
          const frameBudgetMs = 1_000 / settings.advanced_shared.frame_rate_cap;
          const expectedFrameSlots = Math.max(
            1,
            Math.ceil(renderTimeMs / frameBudgetMs)
          );
          const droppedFrameRateRatio =
            (expectedFrameSlots - 1) / expectedFrameSlots;
          onFrameDiagnostics?.({
            droppedFrameRateRatio,
            errorCode: droppedFrameRateRatio > 0.2
              ? "GRAPH_PERFORMANCE_DEGRADED"
              : "NONE",
            frameRateFps: Math.min(
              settings.advanced_shared.frame_rate_cap,
              1_000 / Math.max(1, renderTimeMs)
            ),
            renderer: "2D",
            renderTimeMs,
            sampleWindowMs: Math.max(1, renderTimeMs)
          });
        } catch {
          layoutTransitionRef.current = null;
          const error = new Error("The 2D graph renderer is unavailable.");
          error.name = "Canvas2DRendererFailure";
          setRendererFailure(error);
        } finally {
          frameRef.current = null;
          if (layoutTransitionRef.current) {
            frameRef.current = requestAnimationFrame(renderFrame);
          }
        }
    }
  }, [
    camera,
    dimUnrelated,
    motionLocked,
    movementPaused,
    points,
    relatedIds,
    selected,
    selectedEntityId,
    settings.advanced_shared.node_scale,
    settings.advanced_shared.selected_node_scale,
    settings,
    maximumLiveLabels,
    onFrameDiagnostics,
    showGrid,
    showLabels,
    visibleIds
  ]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>): PointerRecord {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    pointersRef.current.set(event.pointerId, point);
    dragStartRef.current = point;
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      gestureRef.current = {
        camera,
        distance: Math.hypot(second!.x - first!.x, second!.y - first!.y),
        midpoint: { x: (first!.x + second!.x) / 2, y: (first!.y + second!.y) / 2 }
      };
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const next = canvasPoint(event);
    const centerX = event.currentTarget.clientWidth / 2 + camera.x;
    const centerY = event.currentTarget.clientHeight / 2 + camera.y;
    let nearest: { distance: number; id: string } | null = null;
    for (const candidate of renderedPointsRef.current) {
      if (!visibleIds.has(candidate.entity.entity_id)) continue;
      const x = centerX + candidate.x * camera.zoom;
      const y = centerY + candidate.y * camera.zoom;
      const distance = Math.hypot(next.x - x, next.y - y);
      if (distance <= 18 && (!nearest || distance < nearest.distance)) {
        nearest = { distance, id: candidate.entity.entity_id };
      }
    }
    setHoveredEntityId(nearest?.id ?? null);
    setTooltipPosition(nearest ? next : null);
    if (!pointersRef.current.has(event.pointerId)) return;
    const previous = pointersRef.current.get(event.pointerId)!;
    pointersRef.current.set(event.pointerId, next);
    if (pointersRef.current.size === 1) {
      setCamera((current) => ({ ...current, x: current.x + next.x - previous.x, y: current.y + next.y - previous.y }));
      return;
    }
    const [first, second] = [...pointersRef.current.values()];
    const gesture = gestureRef.current;
    if (!gesture || !first || !second) return;
    const distance = Math.max(10, Math.hypot(second.x - first.x, second.y - first.y));
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    const zoomed = zoomCameraAt(
      gesture.camera,
      gesture.camera.zoom * distance / Math.max(10, gesture.distance),
      gesture.midpoint,
      event.currentTarget.clientWidth,
      event.currentTarget.clientHeight
    );
    setCamera({
      ...zoomed,
      x: zoomed.x + midpoint.x - gesture.midpoint.x,
      y: zoomed.y + midpoint.y - gesture.midpoint.y
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);
    const start = dragStartRef.current;
    const wasTap = start && Math.hypot(point.x - start.x, point.y - start.y) < 7 && pointersRef.current.size === 1;
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
    if (!wasTap) return;
    const centerX = event.currentTarget.clientWidth / 2 + camera.x;
    const centerY = event.currentTarget.clientHeight / 2 + camera.y;
    let nearest: { distance: number; id: string } | null = null;
    for (const candidate of renderedPointsRef.current) {
      if (!visibleIds.has(candidate.entity.entity_id)) continue;
      const x = centerX + candidate.x * camera.zoom;
      const y = centerY + candidate.y * camera.zoom;
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= 18 && (!nearest || distance < nearest.distance)) {
        nearest = { distance, id: candidate.entity.entity_id };
      }
    }
    onSelectedEntityChange(nearest?.id ?? null);
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
    dragStartRef.current = null;
  }

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return entities.filter((entity) =>
      [entity.name, entity.stable_code, entity.entity_type].some((value) => value.toLowerCase().includes(normalized))
    ).slice(0, 8);
  }, [entities, query]);
  const resultsVisible = searchOpen && results.length > 0;
  const resolvedActiveResultIndex = Math.min(activeResultIndex, Math.max(0, results.length - 1));
  const activeResult = results[resolvedActiveResultIndex] ?? null;

  useEffect(() => {
    if (!results.length) {
      setActiveResultIndex(0);
      return;
    }
    setActiveResultIndex((index) => Math.min(index, results.length - 1));
  }, [results.length]);

  function selectSearchResult(entity: EntitySummary) {
    focusEntity(entity.entity_id);
    setQuery(entity.name);
    setSearchOpen(false);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!results.length) return;
      setSearchOpen(true);
      setActiveResultIndex((index) => (index + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;
      setSearchOpen(true);
      setActiveResultIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Enter" && resultsVisible && activeResult) {
      event.preventDefault();
      selectSearchResult(activeResult);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchOpen(false);
    }
  }

  function handleCanvasKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onSelectedEntityChange(null);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (selectedEntityId) onOpenFullRecord(selectedEntityId);
      else {
        const firstId = nextUniverseEntityId(
          availableUniverseNavigationPoints(renderedPointsRef.current, points),
          null,
          "right"
        );
        if (firstId) focusEntity(firstId);
      }
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setCamera((current) => ({ ...current, zoom: clampZoom(current.zoom * 1.2) }));
      return;
    }
    if (event.key === "-") {
      event.preventDefault();
      setCamera((current) => ({ ...current, zoom: clampZoom(current.zoom / 1.2) }));
      return;
    }
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      fit();
      return;
    }
    const direction = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down"
    }[event.key] as "left" | "right" | "up" | "down" | undefined;
    if (!direction) return;
    event.preventDefault();
    if (event.shiftKey) {
      const movement = 80;
      if (direction === "left") setCamera((current) => ({ ...current, x: current.x + movement }));
      if (direction === "right") setCamera((current) => ({ ...current, x: current.x - movement }));
      if (direction === "up") setCamera((current) => ({ ...current, y: current.y + movement }));
      if (direction === "down") setCamera((current) => ({ ...current, y: current.y - movement }));
      return;
    }
    const nextId = nextUniverseEntityId(
      availableUniverseNavigationPoints(renderedPointsRef.current, points),
      selectedEntityId,
      direction
    );
    if (nextId) focusEntity(nextId);
  }

  if (rendererFailure) throw rendererFailure;

  return (
    <section
      className="phase180-graph"
      aria-labelledby="universe-heading"
      data-canonical-entity-count={entities.length}
      data-canonical-edge-count={layout.edges.length}
      data-canonical-edge-ids={layout.edges.map((edge) => edge.edgeId).join(",")}
      data-canonical-event-sequence={eventSequence}
      data-canonical-entity-ids={layout.points.map((point) => point.entityId).join(",")}
      data-canonical-render-candidate-count={visibleIds.size}
      data-canonical-selected-active-alert={selected?.active_alert ?? undefined}
      data-canonical-selected-active-task-count={selected?.active_task_count}
      data-canonical-selected-child-count={selected?.child_count}
      data-canonical-selected-current-mission={selected?.current_mission ?? undefined}
      data-canonical-selected-entity-id={selected?.entity_id}
      data-canonical-selected-latest-material-result={
        graphDetailAttribute(selected?.latest_material_result ?? null)
      }
      data-graph-dimension="2d"
      data-graph-animation-duration={settings.advanced_shared.animation_duration_ms}
      data-graph-level-of-detail={activeLevelOfDetail.toLowerCase()}
      data-graph-motion-easing={settings.advanced_shared.motion_easing}
      data-graph-pattern={layout.pattern}
      data-graph-motion={movementPaused ? "paused" : "stable"}
      data-rendered-canonical-id-signature-algorithm={
        `fnv1a32:${CANONICAL_2D_RENDER_ID_SIGNATURE_SEED}`
      }
      ref={surfaceRef}
    >
      <header className="phase180-surface-heading">
        <div>
          <p className="eyebrow">Canonical topology · event {eventSequence}</p>
          <h2 id="universe-heading">2D Graph</h2>
          <p>{entities.length.toLocaleString()} RLS-visible entities. Selection preserves its complete lineage and subtree.</p>
        </div>
        <div className="phase180-surface-actions">
          <span className="phase180-panel-state" data-state={movementPaused ? "paused" : "stable"}>
            {movementPaused ? "Movement paused" : "Stable topology"}
          </span>
          {fullscreenActive && onMovementToggle ? (
            <button
              className="phase180-surface-action"
              disabled={motionLocked}
              onClick={onMovementToggle}
              title={motionLocked ? "Movement is paused by your device reduced-motion setting." : undefined}
              type="button"
            >
              {movementPaused && !motionLocked ? <PlayCircle aria-hidden="true" size={17} /> : <PauseCircle aria-hidden="true" size={17} />}
              {motionLocked ? "Movement paused" : movementPaused ? "Resume movement" : "Stop movement"}
            </button>
          ) : null}
          {!fullscreenActive ? (
            <button
              aria-pressed={touchInteractionActive}
              className="phase180-surface-action phase180-touch-interaction-toggle"
              onClick={() => setTouchInteractionActive(!touchInteractionActive)}
              type="button"
            >
              <Hand aria-hidden="true" size={17} />
              {touchInteractionActive ? "Release 2D Graph touch controls" : "Interact with 2D Graph"}
            </button>
          ) : null}
          {onFullscreenToggle ? (
            <button
              aria-label={fullscreenActive ? "Exit 2D Graph full screen" : "Enter 2D Graph full screen"}
              className="phase180-surface-action"
              onClick={(event) => onFullscreenToggle(event.currentTarget)}
              type="button"
            >
              {fullscreenActive ? <Minimize2 aria-hidden="true" size={17} /> : <Maximize2 aria-hidden="true" size={17} />}
              {fullscreenActive ? "Exit full screen" : "Full screen"}
            </button>
          ) : null}
        </div>
      </header>
      <div className="phase180-graph-toolbar">
        <label className="phase180-graph-search" htmlFor={SEARCH_INPUT_ID}>
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search canonical entities</span>
          <input
            aria-activedescendant={resultsVisible && activeResult
              ? `${SEARCH_RESULTS_ID}-option-${resolvedActiveResultIndex}`
              : undefined}
            aria-autocomplete="list"
            aria-controls={SEARCH_RESULTS_ID}
            aria-expanded={resultsVisible}
            autoComplete="off"
            id={SEARCH_INPUT_ID}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (!(next instanceof HTMLElement) || !next.closest(`#${SEARCH_RESULTS_ID}`)) {
                setSearchOpen(false);
              }
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveResultIndex(0);
              setSearchOpen(Boolean(event.target.value.trim()));
            }}
            onFocus={() => setSearchOpen(Boolean(query.trim()))}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search name, code, or rank"
            role="combobox"
            value={query}
          />
        </label>
        <button
          disabled={!selected?.parent_id}
          onClick={() => selected?.parent_id && focusEntity(selected.parent_id)}
          type="button"
        >
          <ArrowUp aria-hidden="true" size={17} /> Parent
        </button>
        <button
          aria-label="Zoom in 2D Graph"
          onClick={() => setCamera((current) => ({ ...current, zoom: clampZoom(current.zoom * 1.25) }))}
          type="button"
        >
          <ZoomIn aria-hidden="true" size={17} /> Zoom in
        </button>
        <button
          aria-label="Zoom out 2D Graph"
          onClick={() => setCamera((current) => ({ ...current, zoom: clampZoom(current.zoom / 1.25) }))}
          type="button"
        >
          <ZoomOut aria-hidden="true" size={17} /> Zoom out
        </button>
        <button onClick={fit} type="button"><LocateFixed aria-hidden="true" size={17} /> Fit</button>
        <button
          aria-expanded={settingsOpen}
          aria-controls="phase180-graph-settings"
          onClick={() => setSettingsOpen((open) => !open)}
          type="button"
        >
          <Settings2 aria-hidden="true" size={17} /> Settings
        </button>
      </div>
      {resultsVisible ? (
        <div
          aria-label="Entity search results"
          className="phase180-graph-results"
          id={SEARCH_RESULTS_ID}
          role="listbox"
        >
          {results.map((entity, index) => (
            <button
              aria-selected={selectedEntityId === entity.entity_id}
              className={resolvedActiveResultIndex === index ? "active" : undefined}
              id={`${SEARCH_RESULTS_ID}-option-${index}`}
              key={entity.entity_id}
              onClick={() => selectSearchResult(entity)}
              onMouseEnter={() => setActiveResultIndex(index)}
              role="option"
              tabIndex={-1}
              type="button"
            >
              <strong>{entity.name}</strong><span>{entity.entity_type} · {entity.stable_code}</span>
            </button>
          ))}
        </div>
      ) : null}
      {settingsOpen ? (
        <aside className="phase180-graph-settings" id="phase180-graph-settings">
          <header><strong>Graph settings</strong><button aria-label="Close graph settings" onClick={() => setSettingsOpen(false)} type="button"><X size={17} /></button></header>
          <label><input checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} type="checkbox" /> Semantic labels</label>
          <label><input checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} type="checkbox" /> Coordinate grid</label>
          <label><input checked={dimUnrelated} onChange={(event) => setDimUnrelated(event.target.checked)} type="checkbox" /> Dim unrelated branches</label>
          <div className="phase180-graph-setting-summary">
            <span>Viewport zoom</span>
            <strong>{camera.zoom < 0.01 ? camera.zoom.toExponential(2) : `${Math.round(camera.zoom * 100).toLocaleString("en-US")}%`}</strong>
            <small>High-range navigation from 0.0001% to 6,400%. Fit always restores the complete hierarchy.</small>
          </div>
        </aside>
      ) : null}
      <p className="phase180-graph-instructions" id={GRAPH_INSTRUCTIONS_ID}>
        <strong>Controls:</strong> Page scrolling stays available over the embedded graph. Hold Ctrl or Command while
        scrolling to zoom, or use the zoom buttons. On touch screens, use Interact with 2D Graph before panning or
        pinching. In full screen, graph touch controls and scroll-to-zoom are active directly. Arrow Up moves to the
        parent, Arrow Down enters the closest child, and Arrow Left or Right moves between siblings. Shift + Arrow pans;
        F fits the authorized graph; Enter opens the selected record; Escape clears the selection.
      </p>
      <p className="sr-only" aria-live="polite">
        {selected
          ? `Selected ${selected.name}, ${selected.entity_type}. ${selected.child_count} direct children.`
          : "No graph entity selected."}
      </p>
      <div className="phase180-graph-stage">
        <canvas
          className="phase180-graph-canvas"
          aria-describedby={[
            GRAPH_INSTRUCTIONS_ID,
            tooltipEntity ? "canonical-2d-node-tooltip" : null
          ].filter(Boolean).join(" ")}
          aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight F Enter Escape"
          aria-label={`Canonical Universe Graph with ${entities.length} entities`}
          data-touch-interaction={fullscreenActive || touchInteractionActive ? "graph" : "page"}
          onBlur={() => setKeyboardTooltipActive(false)}
          onFocus={() => setKeyboardTooltipActive(true)}
          onPointerCancel={handlePointerCancel}
          onPointerDown={handlePointerDown}
          onPointerLeave={() => {
            setHoveredEntityId(null);
            setTooltipPosition(null);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleCanvasKeyDown}
          ref={canvasRef}
          role="application"
          tabIndex={0}
        />
        <CanonicalGraphSemanticsOverlay
          dimension="2D"
          entities={entities}
          legendVisible={settings.advanced_shared.legend_visible}
          pattern={layout.pattern}
        />
        {tooltipEntity ? (
          <div
            aria-live="polite"
            className={[
              "phase195-graph-tooltip",
              tooltipPosition ? "" : "keyboard"
            ].filter(Boolean).join(" ")}
            id="canonical-2d-node-tooltip"
            role="tooltip"
            style={tooltipPosition ? {
              left: `min(calc(100% - 15rem), ${tooltipPosition.x + 14}px)`,
              top: `min(calc(100% - 8rem), ${tooltipPosition.y + 14}px)`
            } : undefined}
          >
            <strong>{tooltipEntity.name}</strong>
            <span>
              Tier {GRAPH_AUTHORITY_ROLES.indexOf(tooltipEntity.entity_type)} / {tooltipEntity.entity_type}
            </span>
            <span>Status {tooltipEntity.status} / Health {tooltipEntity.health}</span>
            <small>
              {tooltipEntity.entity_id === selectedEntityId
                ? "Selected entity; the white halo marks this node."
                : "Pointer target; select to inspect its authorized lineage."}
            </small>
          </div>
        ) : null}
        {settings.advanced_shared.legend_visible ? (
          <div className="phase180-graph-legend" aria-label={legend.label}>
            {legend.entries.map(([meaning, color]) => (
              <span key={meaning}><i aria-hidden="true" style={{ background: color }} />{meaning}</span>
            ))}
          </div>
        ) : null}
      </div>
      {selected ? (
        <aside
          aria-label={`${selected.name} graph details`}
          className="phase180-graph-drawer"
          data-canonical-detail-surface="2d"
          data-canonical-selected-active-alert={selected.active_alert ?? undefined}
          data-canonical-selected-active-task-count={selected.active_task_count}
          data-canonical-selected-child-count={selected.child_count}
          data-canonical-selected-current-mission={selected.current_mission ?? undefined}
          data-canonical-selected-entity-id={selected.entity_id}
          data-canonical-selected-latest-material-result={
            graphDetailAttribute(selected.latest_material_result)
          }
          ref={detailDrawerRef}
        >
          <header>
            <div><span>{selected.entity_type}</span><h2>{selected.name}</h2></div>
            <button aria-label="Close entity details" onClick={() => onSelectedEntityChange(null)} type="button"><X size={18} /></button>
          </header>
          <dl>
            <div><dt>Status</dt><dd>{selected.status}</dd></div>
            <div><dt>Health</dt><dd>{selected.health}</dd></div>
            <div><dt>Version</dt><dd>{selected.version}</dd></div>
            <div><dt>Children</dt><dd>{selected.child_count}</dd></div>
            <div><dt>Mission</dt><dd>{selected.current_mission ?? "No active mission recorded"}</dd></div>
            <div><dt>Alert</dt><dd>{selected.active_alert ?? "No active alert"}</dd></div>
          </dl>
          <button className="phase180-primary-action" onClick={() => onOpenFullRecord(selected.entity_id)} type="button">
            <Focus aria-hidden="true" size={17} /> Open full record
          </button>
        </aside>
      ) : null}
    </section>
  );
}
