import type {
  Graph2DLayoutPattern,
  Graph3DLayoutPattern,
  GraphLayout2DOptions,
  GraphLayout2DResult,
  GraphLayout3DOptions,
  GraphLayout3DResult
} from "./graph-layouts";
import { layoutGraph2D, layoutGraph3D } from "./graph-layouts";
import type { RendererGraphProjection } from "./graph-projection";

export const GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION = 1 as const;

type GraphLayoutWorkerRequestBase = {
  readonly kind: "GRAPH_LAYOUT_REQUEST";
  readonly protocolVersion: typeof GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly projection: RendererGraphProjection;
};

export type GraphLayoutWorker2DRequest = GraphLayoutWorkerRequestBase & {
  readonly renderer: "2d";
  readonly pattern: Graph2DLayoutPattern;
  readonly options: GraphLayout2DOptions;
};

export type GraphLayoutWorker3DRequest = GraphLayoutWorkerRequestBase & {
  readonly renderer: "3d";
  readonly pattern: Graph3DLayoutPattern;
  readonly options: GraphLayout3DOptions;
};

export type GraphLayoutWorkerRequest =
  | GraphLayoutWorker2DRequest
  | GraphLayoutWorker3DRequest;

type GraphLayoutWorkerResultBase = {
  readonly kind: "GRAPH_LAYOUT_RESULT";
  readonly protocolVersion: typeof GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly layoutTimeMs: number;
};

export type GraphLayoutWorker2DResult = GraphLayoutWorkerResultBase & {
  readonly renderer: "2d";
  readonly result: GraphLayout2DResult;
};

export type GraphLayoutWorker3DResult = GraphLayoutWorkerResultBase & {
  readonly renderer: "3d";
  readonly result: GraphLayout3DResult;
};

export type GraphLayoutWorkerFailure = {
  readonly kind: "GRAPH_LAYOUT_FAILURE";
  readonly protocolVersion: typeof GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION;
  readonly requestId: number;
  readonly renderer: "2d" | "3d";
  readonly code: "GRAPH_WORKER_FAILURE";
};

export type GraphLayoutWorkerResponse =
  | GraphLayoutWorker2DResult
  | GraphLayoutWorker3DResult
  | GraphLayoutWorkerFailure;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validRequestId(value: unknown): value is number {
  return typeof value === "number"
    && Number.isSafeInteger(value)
    && value > 0;
}

function now() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

/**
 * The worker protocol deliberately contains only plain records, arrays,
 * strings, booleans, nulls, and finite numbers. It never transports Maps,
 * functions, DOM objects, or customer payloads outside the already-authorized
 * canonical projection.
 */
export function isGraphLayoutWorkerRequest(
  value: unknown
): value is GraphLayoutWorkerRequest {
  if (!isRecord(value)) return false;
  if (
    value.kind !== "GRAPH_LAYOUT_REQUEST"
    || value.protocolVersion !== GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION
    || !validRequestId(value.requestId)
    || (value.renderer !== "2d" && value.renderer !== "3d")
    || !isRecord(value.projection)
    || !Array.isArray(value.projection.entities)
    || !Array.isArray(value.projection.edges)
    || typeof value.pattern !== "string"
    || !isRecord(value.options)
  ) {
    return false;
  }
  return true;
}

export function isGraphLayoutWorkerResponse(
  value: unknown
): value is GraphLayoutWorkerResponse {
  if (!isRecord(value)) return false;
  if (
    value.protocolVersion !== GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION
    || !validRequestId(value.requestId)
    || (value.renderer !== "2d" && value.renderer !== "3d")
  ) {
    return false;
  }
  if (value.kind === "GRAPH_LAYOUT_FAILURE") {
    return value.code === "GRAPH_WORKER_FAILURE";
  }
  return value.kind === "GRAPH_LAYOUT_RESULT"
    && typeof value.layoutTimeMs === "number"
    && Number.isFinite(value.layoutTimeMs)
    && value.layoutTimeMs >= 0
    && isRecord(value.result);
}

/**
 * Pure worker-side execution entrypoint. Keeping it independent from
 * DedicatedWorkerGlobalScope makes the exact worker behavior testable in Node
 * and jsdom without pretending a browser worker exists.
 */
export function executeGraphLayoutWorkerRequest(
  input: unknown
): GraphLayoutWorkerResponse {
  const requestId =
    isRecord(input) && validRequestId(input.requestId) ? input.requestId : 1;
  const renderer =
    isRecord(input) && input.renderer === "3d" ? "3d" : "2d";
  if (!isGraphLayoutWorkerRequest(input)) {
    return {
      kind: "GRAPH_LAYOUT_FAILURE",
      protocolVersion: GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId,
      renderer,
      code: "GRAPH_WORKER_FAILURE"
    };
  }

  const startedAt = now();
  try {
    if (input.renderer === "2d") {
      return {
        kind: "GRAPH_LAYOUT_RESULT",
        protocolVersion: GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
        requestId: input.requestId,
        renderer: "2d",
        result: layoutGraph2D(
          input.projection,
          input.pattern,
          input.options
        ),
        layoutTimeMs: Math.max(0, now() - startedAt)
      };
    }
    return {
      kind: "GRAPH_LAYOUT_RESULT",
      protocolVersion: GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: input.requestId,
      renderer: "3d",
      result: layoutGraph3D(
        input.projection,
        input.pattern,
        input.options
      ),
      layoutTimeMs: Math.max(0, now() - startedAt)
    };
  } catch {
    return {
      kind: "GRAPH_LAYOUT_FAILURE",
      protocolVersion: GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId: input.requestId,
      renderer: input.renderer,
      code: "GRAPH_WORKER_FAILURE"
    };
  }
}
