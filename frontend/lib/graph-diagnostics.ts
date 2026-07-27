import type {
  RendererGraphProjection as GraphProjection
} from "./graph-projection";

export type GraphRendererKind = "2d" | "3d";
export type GraphLevelOfDetail = "full" | "balanced" | "minimal";

export type GraphPerformancePolicy = {
  readonly levelOfDetail: GraphLevelOfDetail;
  readonly preserveAllCanonicalNodes: true;
  readonly maximumLiveLabels: number;
  readonly layoutBudgetMs: number;
  readonly targetFrameRate: number;
  readonly workerPreferred: boolean;
};

export type GraphTelemetrySample = {
  readonly renderer: GraphRendererKind;
  readonly pattern: string;
  readonly projectionId: string;
  readonly nodeCount: number;
  readonly edgeCount: number;
  readonly settingsVersion: number;
  readonly layoutTimeMs: number | null;
  readonly renderTimeMs: number | null;
  readonly frameRate: number | null;
  readonly droppedFrameRate: number | null;
  readonly errorCode: string | null;
};

export type GraphRendererFailure = {
  readonly code: "GRAPH_RENDERER_FAILURE";
  readonly recoverable: true;
  readonly userMessage: string;
  readonly textualHierarchyAvailable: true;
  readonly diagnosticClass: string;
};

export type GraphLayoutParityIssue =
  | "NODE_COUNT_MISMATCH"
  | "EDGE_COUNT_MISMATCH"
  | "UNKNOWN_NODE_ID"
  | "DUPLICATE_NODE_ID"
  | "NON_FINITE_POSITION";

export type GraphPositionLike = {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
  readonly z?: number;
};

export const CURRENT_GRAPH_ENTITY_GATE = 132;
export const LARGE_GRAPH_ENTITY_GATE = 10_000;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function finiteNonNegative(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function graphPerformancePolicy(
  entityCount: number
): GraphPerformancePolicy {
  const count = Math.max(0, Math.floor(
    Number.isFinite(entityCount) ? entityCount : 0
  ));
  if (count <= CURRENT_GRAPH_ENTITY_GATE) {
    return {
      levelOfDetail: "full",
      preserveAllCanonicalNodes: true,
      maximumLiveLabels: Math.max(1, count),
      layoutBudgetMs: 50,
      targetFrameRate: 60,
      workerPreferred: false
    };
  }
  if (count <= 1_000) {
    return {
      levelOfDetail: "balanced",
      preserveAllCanonicalNodes: true,
      maximumLiveLabels: 300,
      layoutBudgetMs: 150,
      targetFrameRate: 45,
      workerPreferred: false
    };
  }
  return {
    levelOfDetail: "minimal",
    preserveAllCanonicalNodes: true,
    maximumLiveLabels: 240,
    layoutBudgetMs: count <= LARGE_GRAPH_ENTITY_GATE ? 500 : 1_000,
    targetFrameRate: 30,
    workerPreferred: true
  };
}

export function createGraphTelemetrySample(
  projection: GraphProjection,
  input: {
    readonly renderer: GraphRendererKind;
    readonly pattern: string;
    readonly settingsVersion: number;
    readonly layoutTimeMs?: number | null;
    readonly renderTimeMs?: number | null;
    readonly frameRate?: number | null;
    readonly droppedFrameRate?: number | null;
    readonly errorCode?: string | null;
  }
): GraphTelemetrySample {
  const frameRate = finiteNonNegative(input.frameRate);
  const droppedFrameRate = finiteNonNegative(input.droppedFrameRate);
  return {
    renderer: input.renderer,
    pattern: input.pattern.slice(0, 80),
    projectionId: projection.projectionId,
    nodeCount: projection.entityCount,
    edgeCount: projection.edgeCount,
    settingsVersion: Math.max(0, Math.floor(input.settingsVersion)),
    layoutTimeMs: finiteNonNegative(input.layoutTimeMs),
    renderTimeMs: finiteNonNegative(input.renderTimeMs),
    frameRate: frameRate === null ? null : clamp(frameRate, 0, 1_000),
    droppedFrameRate: droppedFrameRate === null
      ? null
      : clamp(droppedFrameRate, 0, 1),
    errorCode: input.errorCode
      ? input.errorCode.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 80)
      : null
  };
}

export function classifyGraphRendererFailure(
  error: unknown
): GraphRendererFailure {
  const diagnosticClass = error instanceof Error
    ? error.name.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 80) || "Error"
    : "UnknownFailure";
  return {
    code: "GRAPH_RENDERER_FAILURE",
    recoverable: true,
    userMessage: "The graph renderer is unavailable. Retry or use the textual hierarchy.",
    textualHierarchyAvailable: true,
    diagnosticClass
  };
}

export function validateGraphLayoutParity(
  projection: GraphProjection,
  points: readonly GraphPositionLike[]
): readonly GraphLayoutParityIssue[] {
  const issues = new Set<GraphLayoutParityIssue>();
  if (points.length !== projection.entityCount) {
    issues.add("NODE_COUNT_MISMATCH");
  }
  const authorizedIds = new Set(
    projection.entities.map((node) => node.entityId)
  );
  const seen = new Set<string>();
  for (const point of points) {
    if (!authorizedIds.has(point.entityId)) issues.add("UNKNOWN_NODE_ID");
    if (seen.has(point.entityId)) issues.add("DUPLICATE_NODE_ID");
    seen.add(point.entityId);
    if (
      !Number.isFinite(point.x)
      || !Number.isFinite(point.y)
      || (point.z !== undefined && !Number.isFinite(point.z))
    ) {
      issues.add("NON_FINITE_POSITION");
    }
  }
  // A layout does not transform edges; this check makes accidental adapter
  // omission observable without copying customer payloads into telemetry.
  if (projection.edges.length !== projection.edgeCount) {
    issues.add("EDGE_COUNT_MISMATCH");
  }
  return [...issues].sort();
}

/**
 * Small insertion-ordered cache for deterministic geometry. A hard entry cap
 * prevents large authenticated graphs from growing memory without bound.
 */
export class BoundedGraphLayoutCache<T> {
  readonly maximumEntries: number;
  #entries = new Map<string, T>();

  constructor(maximumEntries = 8) {
    this.maximumEntries = clamp(
      Math.floor(Number.isFinite(maximumEntries) ? maximumEntries : 8),
      1,
      64
    );
  }

  get size() {
    return this.#entries.size;
  }

  get(key: string): T | undefined {
    const existing = this.#entries.get(key);
    if (existing === undefined) return undefined;
    this.#entries.delete(key);
    this.#entries.set(key, existing);
    return existing;
  }

  set(key: string, value: T) {
    if (this.#entries.has(key)) this.#entries.delete(key);
    this.#entries.set(key, value);
    while (this.#entries.size > this.maximumEntries) {
      const oldestKey = this.#entries.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      this.#entries.delete(oldestKey);
    }
  }

  clear() {
    this.#entries.clear();
  }
}

export function graphLayoutCacheKey(
  projection: GraphProjection,
  renderer: GraphRendererKind,
  pattern: string,
  settingsVersion: number,
  stableSeed: string
) {
  return [
    projection.projectionId,
    renderer,
    pattern,
    Math.max(0, Math.floor(settingsVersion)),
    stableSeed
  ].join(":");
}

export class GraphFrameDiagnostics {
  #frameCount = 0;
  #droppedFrames = 0;
  #elapsedMs = 0;

  addFrame(durationMs: number, targetFrameRate = 60) {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    const budgetMs = 1_000 / clamp(targetFrameRate, 1, 240);
    this.#frameCount += 1;
    this.#elapsedMs += durationMs;
    if (durationMs > budgetMs * 1.5) this.#droppedFrames += 1;
  }

  snapshot() {
    const frameRate = this.#elapsedMs > 0
      ? this.#frameCount / (this.#elapsedMs / 1_000)
      : null;
    return {
      frameCount: this.#frameCount,
      frameRate,
      droppedFrameRate: this.#frameCount
        ? this.#droppedFrames / this.#frameCount
        : null
    };
  }

  reset() {
    this.#frameCount = 0;
    this.#droppedFrames = 0;
    this.#elapsedMs = 0;
  }
}
