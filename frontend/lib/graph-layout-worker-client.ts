import type {
  Graph2DLayoutPattern,
  Graph3DLayoutPattern,
  GraphLayout2DOptions,
  GraphLayout2DResult,
  GraphLayout3DOptions,
  GraphLayout3DResult
} from "./graph-layouts";
import { layoutGraph2D, layoutGraph3D } from "./graph-layouts";
import {
  graphPerformancePolicy,
  validateGraphLayoutParity,
  type GraphPerformancePolicy,
  type GraphRendererKind
} from "./graph-diagnostics";
import {
  GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
  isGraphLayoutWorkerResponse,
  type GraphLayoutWorkerRequest,
  type GraphLayoutWorkerResponse
} from "./graph-layout-worker-protocol";
import type {
  ProjectedGraphEdge,
  RendererGraphProjection
} from "./graph-projection";

export type GraphWorkerUsage = "AUTO" | "ON" | "OFF";

export type GraphLayoutExecutionSource =
  | "worker"
  | "synchronous-policy"
  | "synchronous-fallback";

export type GraphLayoutWorkerFailureCode =
  | "WORKER_UNAVAILABLE"
  | "WORKER_POST_FAILED"
  | "WORKER_RUNTIME_FAILED"
  | "WORKER_MESSAGE_INVALID"
  | "WORKER_LAYOUT_FAILED"
  | "WORKER_TIMEOUT";

export type GraphLayoutExecution<Result> = {
  readonly requestId: number;
  readonly result: Result;
  readonly source: GraphLayoutExecutionSource;
  readonly layoutTimeMs: number;
  readonly workerFailureCode: GraphLayoutWorkerFailureCode | null;
};

export type GraphLayout2DTask = {
  readonly renderer: "2d";
  readonly projection: RendererGraphProjection;
  readonly pattern: Graph2DLayoutPattern;
  readonly options?: GraphLayout2DOptions;
  readonly workerUsage: GraphWorkerUsage;
};

export type GraphLayout3DTask = {
  readonly renderer: "3d";
  readonly projection: RendererGraphProjection;
  readonly pattern: Graph3DLayoutPattern;
  readonly options?: GraphLayout3DOptions;
  readonly workerUsage: GraphWorkerUsage;
};

export type GraphLayoutTask = GraphLayout2DTask | GraphLayout3DTask;

export type GraphLayoutWorkerPort = {
  postMessage(message: GraphLayoutWorkerRequest): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void
  ): void;
  addEventListener(
    type: "error" | "messageerror",
    listener: (event: Event) => void
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<unknown>) => void
  ): void;
  removeEventListener(
    type: "error" | "messageerror",
    listener: (event: Event) => void
  ): void;
  terminate(): void;
};

export type GraphLayoutWorkerFactory = () => GraphLayoutWorkerPort | null;

type AnyGraphLayoutResult = GraphLayout2DResult | GraphLayout3DResult;

type PendingRequest = {
  readonly request: GraphLayoutWorkerRequest;
  readonly policy: GraphPerformancePolicy;
  readonly resolve: (
    value: GraphLayoutExecution<AnyGraphLayoutResult>
  ) => void;
  readonly reject: (reason: unknown) => void;
  timeoutId: ReturnType<typeof setTimeout> | null;
};

function now() {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function compareEdges(
  expected: readonly ProjectedGraphEdge[],
  candidate: unknown
) {
  if (!Array.isArray(candidate) || candidate.length !== expected.length) {
    return false;
  }
  for (let index = 0; index < expected.length; index += 1) {
    const wanted = expected[index]!;
    const received = candidate[index];
    if (
      typeof received !== "object"
      || received === null
      || !("edgeId" in received)
      || !("sourceId" in received)
      || !("targetId" in received)
      || !("relationType" in received)
      || !("parentEdge" in received)
      || received.edgeId !== wanted.edgeId
      || received.sourceId !== wanted.sourceId
      || received.targetId !== wanted.targetId
      || received.relationType !== wanted.relationType
      || received.parentEdge !== wanted.parentEdge
    ) {
      return false;
    }
  }
  return true;
}

function validLayoutResult(
  request: GraphLayoutWorkerRequest,
  candidate: unknown
): candidate is AnyGraphLayoutResult {
  if (typeof candidate !== "object" || candidate === null) return false;
  if (
    !("pattern" in candidate)
    || candidate.pattern !== request.pattern
    || !("projectionId" in candidate)
    || candidate.projectionId !== request.projection.projectionId
    || !("points" in candidate)
    || !Array.isArray(candidate.points)
    || !("edges" in candidate)
    || !compareEdges(request.projection.edges, candidate.edges)
    || !("crowdedEntityIds" in candidate)
    || !Array.isArray(candidate.crowdedEntityIds)
    || !("rejectedPinCount" in candidate)
    || typeof candidate.rejectedPinCount !== "number"
    || !Number.isSafeInteger(candidate.rejectedPinCount)
    || candidate.rejectedPinCount < 0
  ) {
    return false;
  }
  if (
    validateGraphLayoutParity(
      request.projection,
      candidate.points as {
        readonly entityId: string;
        readonly x: number;
        readonly y: number;
        readonly z?: number;
      }[]
    ).length > 0
  ) {
    return false;
  }
  if (
    request.renderer === "3d"
    && candidate.points.some((point) =>
      typeof point !== "object"
      || point === null
      || !("z" in point)
      || typeof point.z !== "number"
      || !Number.isFinite(point.z)
    )
  ) {
    return false;
  }
  return true;
}

export function graphLayoutUsesWorker(
  usage: GraphWorkerUsage,
  policy: GraphPerformancePolicy
) {
  if (usage === "OFF") return false;
  if (usage === "ON") return true;
  return policy.workerPreferred;
}

export function graphLayoutWorkerSelected(
  usage: GraphWorkerUsage,
  entityCount: number
) {
  return graphLayoutUsesWorker(usage, graphPerformancePolicy(entityCount));
}

function executeSynchronously(
  request: GraphLayoutWorkerRequest,
  source: Exclude<GraphLayoutExecutionSource, "worker">,
  workerFailureCode: GraphLayoutWorkerFailureCode | null
): GraphLayoutExecution<AnyGraphLayoutResult> {
  const startedAt = now();
  const result = request.renderer === "2d"
    ? layoutGraph2D(request.projection, request.pattern, request.options)
    : layoutGraph3D(request.projection, request.pattern, request.options);
  return {
    requestId: request.requestId,
    result,
    source,
    layoutTimeMs: Math.max(0, now() - startedAt),
    workerFailureCode
  };
}

export function createBrowserGraphLayoutWorker(): GraphLayoutWorkerPort | null {
  if (typeof Worker === "undefined") return null;
  return new Worker(
    new URL("../workers/graph-layout.worker.ts", import.meta.url),
    {
      name: "entral-canonical-graph-layout",
      type: "module"
    }
  );
}

export class GraphLayoutStaleResultError extends Error {
  readonly code = "GRAPH_LAYOUT_STALE_RESULT";
  readonly requestId: number;
  readonly renderer: GraphRendererKind;

  constructor(requestId: number, renderer: GraphRendererKind) {
    super("A newer canonical graph layout request superseded this result.");
    this.name = "GraphLayoutStaleResultError";
    this.requestId = requestId;
    this.renderer = renderer;
  }
}

export class GraphLayoutExecutionError extends Error {
  readonly code = "GRAPH_LAYOUT_EXECUTION_FAILED";
  readonly requestId: number;
  readonly workerFailureCode: GraphLayoutWorkerFailureCode;

  constructor(
    requestId: number,
    workerFailureCode: GraphLayoutWorkerFailureCode
  ) {
    super("The canonical graph layout could not be completed.");
    this.name = "GraphLayoutExecutionError";
    this.requestId = requestId;
    this.workerFailureCode = workerFailureCode;
  }
}

/**
 * Owns one persistent layout worker per graph workspace. Request IDs are
 * process-local, strictly increasing safe integers. Staleness is tracked per
 * renderer so simultaneous 2D and 3D requests do not cancel each other.
 */
export class GraphLayoutWorkerCoordinator {
  #factory: GraphLayoutWorkerFactory;
  #worker: GraphLayoutWorkerPort | null | undefined;
  #workerFailed = false;
  #disposed = false;
  #nextRequestId = 1;
  #latestByRenderer: Record<GraphRendererKind, number> = { "2d": 0, "3d": 0 };
  #pending = new Map<number, PendingRequest>();

  constructor(factory: GraphLayoutWorkerFactory = createBrowserGraphLayoutWorker) {
    this.#factory = factory;
  }

  readonly #onMessage = (event: MessageEvent<unknown>) => {
    if (!isGraphLayoutWorkerResponse(event.data)) {
      this.#failWorker("WORKER_MESSAGE_INVALID");
      return;
    }
    const response = event.data;
    const pending = this.#pending.get(response.requestId);
    if (!pending) return;
    if (
      response.renderer !== pending.request.renderer
      || response.requestId
        !== this.#latestByRenderer[pending.request.renderer]
    ) {
      this.#rejectStale(pending);
      return;
    }
    if (
      response.kind === "GRAPH_LAYOUT_FAILURE"
      || !validLayoutResult(pending.request, response.result)
    ) {
      this.#failWorker(
        response.kind === "GRAPH_LAYOUT_FAILURE"
          ? "WORKER_LAYOUT_FAILED"
          : "WORKER_MESSAGE_INVALID"
      );
      return;
    }
    this.#settlePending(response.requestId);
    pending.resolve({
      requestId: response.requestId,
      result: response.result,
      source: "worker",
      layoutTimeMs: response.layoutTimeMs,
      workerFailureCode: null
    });
  };

  readonly #onWorkerError = () => {
    this.#failWorker("WORKER_RUNTIME_FAILED");
  };

  #createRequest(task: GraphLayoutTask): GraphLayoutWorkerRequest {
    if (this.#nextRequestId >= Number.MAX_SAFE_INTEGER) {
      throw new Error("Graph layout request ID space is exhausted.");
    }
    const requestId = this.#nextRequestId;
    this.#nextRequestId += 1;
    if (task.renderer === "2d") {
      return {
        kind: "GRAPH_LAYOUT_REQUEST",
        protocolVersion: GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
        requestId,
        renderer: "2d",
        projection: task.projection,
        pattern: task.pattern,
        options: task.options ?? {}
      };
    }
    return {
      kind: "GRAPH_LAYOUT_REQUEST",
      protocolVersion: GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
      requestId,
      renderer: "3d",
      projection: task.projection,
      pattern: task.pattern,
      options: task.options ?? {}
    };
  }

  #ensureWorker() {
    if (this.#worker !== undefined) return this.#worker;
    if (this.#workerFailed || this.#disposed) {
      this.#worker = null;
      return null;
    }
    try {
      this.#worker = this.#factory();
    } catch {
      this.#worker = null;
    }
    if (!this.#worker) return null;
    this.#worker.addEventListener("message", this.#onMessage);
    this.#worker.addEventListener("error", this.#onWorkerError);
    this.#worker.addEventListener("messageerror", this.#onWorkerError);
    return this.#worker;
  }

  #settlePending(requestId: number) {
    const pending = this.#pending.get(requestId);
    if (!pending) return;
    if (pending.timeoutId !== null) clearTimeout(pending.timeoutId);
    this.#pending.delete(requestId);
  }

  #rejectStale(pending: PendingRequest) {
    this.#settlePending(pending.request.requestId);
    pending.reject(new GraphLayoutStaleResultError(
      pending.request.requestId,
      pending.request.renderer
    ));
  }

  #fallback(
    pending: PendingRequest,
    failureCode: GraphLayoutWorkerFailureCode
  ) {
    try {
      pending.resolve(executeSynchronously(
        pending.request,
        "synchronous-fallback",
        failureCode
      ));
    } catch {
      pending.reject(new GraphLayoutExecutionError(
        pending.request.requestId,
        failureCode
      ));
    }
  }

  #failWorker(failureCode: GraphLayoutWorkerFailureCode) {
    if (this.#worker) {
      this.#worker.removeEventListener("message", this.#onMessage);
      this.#worker.removeEventListener("error", this.#onWorkerError);
      this.#worker.removeEventListener("messageerror", this.#onWorkerError);
      this.#worker.terminate();
    }
    this.#worker = null;
    this.#workerFailed = true;
    const pendingRequests = [...this.#pending.values()];
    for (const pending of pendingRequests) {
      this.#settlePending(pending.request.requestId);
      if (
        pending.request.requestId
        !== this.#latestByRenderer[pending.request.renderer]
      ) {
        pending.reject(new GraphLayoutStaleResultError(
          pending.request.requestId,
          pending.request.renderer
        ));
      } else {
        this.#fallback(pending, failureCode);
      }
    }
  }

  request(
    task: GraphLayout2DTask
  ): Promise<GraphLayoutExecution<GraphLayout2DResult>>;
  request(
    task: GraphLayout3DTask
  ): Promise<GraphLayoutExecution<GraphLayout3DResult>>;
  request(
    task: GraphLayoutTask
  ): Promise<GraphLayoutExecution<AnyGraphLayoutResult>> {
    if (this.#disposed) {
      return Promise.reject(new GraphLayoutExecutionError(
        0,
        "WORKER_UNAVAILABLE"
      ));
    }
    const request = this.#createRequest(task);
    const policy = graphPerformancePolicy(request.projection.entityCount);
    const previousRequestId = this.#latestByRenderer[request.renderer];
    this.#latestByRenderer[request.renderer] = request.requestId;
    const previous = this.#pending.get(previousRequestId);
    if (previous) this.#rejectStale(previous);

    if (!graphLayoutUsesWorker(task.workerUsage, policy)) {
      try {
        return Promise.resolve(executeSynchronously(
          request,
          "synchronous-policy",
          null
        ));
      } catch {
        return Promise.reject(new GraphLayoutExecutionError(
          request.requestId,
          "WORKER_LAYOUT_FAILED"
        ));
      }
    }

    const worker = this.#ensureWorker();
    if (!worker) {
      try {
        return Promise.resolve(executeSynchronously(
          request,
          "synchronous-fallback",
          "WORKER_UNAVAILABLE"
        ));
      } catch {
        return Promise.reject(new GraphLayoutExecutionError(
          request.requestId,
          "WORKER_UNAVAILABLE"
        ));
      }
    }

    return new Promise((resolve, reject) => {
      const pending: PendingRequest = {
        request,
        policy,
        resolve,
        reject,
        timeoutId: null
      };
      this.#pending.set(request.requestId, pending);
      pending.timeoutId = setTimeout(() => {
        if (!this.#pending.has(request.requestId)) return;
        this.#failWorker("WORKER_TIMEOUT");
      }, Math.max(2_000, Math.min(30_000, policy.layoutBudgetMs * 6)));
      try {
        worker.postMessage(request);
      } catch {
        this.#settlePending(request.requestId);
        this.#fallback(pending, "WORKER_POST_FAILED");
      }
    });
  }

  dispose() {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#worker) {
      this.#worker.removeEventListener("message", this.#onMessage);
      this.#worker.removeEventListener("error", this.#onWorkerError);
      this.#worker.removeEventListener("messageerror", this.#onWorkerError);
      this.#worker.terminate();
    }
    this.#worker = null;
    for (const pending of [...this.#pending.values()]) {
      this.#settlePending(pending.request.requestId);
      pending.reject(new GraphLayoutStaleResultError(
        pending.request.requestId,
        pending.request.renderer
      ));
    }
  }
}
