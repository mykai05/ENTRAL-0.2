import { describe, expect, it } from "vitest";
import {
  GraphLayoutStaleResultError,
  GraphLayoutWorkerCoordinator,
  type GraphLayoutWorkerPort
} from "../lib/graph-layout-worker-client";
import {
  executeGraphLayoutWorkerRequest,
  GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
  type GraphLayoutWorkerRequest
} from "../lib/graph-layout-worker-protocol";
import { layoutGraph2D, layoutGraph3D } from "../lib/graph-layouts";
import { buildRendererGraphProjection } from "../lib/graph-projection";
import {
  authorityHierarchy,
  largeCanonicalFixture
} from "./phase195-graph-fixtures";

class ControlledWorker implements GraphLayoutWorkerPort {
  readonly requests: GraphLayoutWorkerRequest[] = [];
  terminated = false;
  #messageListeners = new Set<(event: MessageEvent<unknown>) => void>();
  #errorListeners = new Set<(event: Event) => void>();
  #messageErrorListeners = new Set<(event: Event) => void>();

  postMessage(message: GraphLayoutWorkerRequest) {
    this.requests.push(structuredClone(message));
  }

  addEventListener(
    type: "message" | "error" | "messageerror",
    listener:
      | ((event: MessageEvent<unknown>) => void)
      | ((event: Event) => void)
  ) {
    if (type === "message") {
      this.#messageListeners.add(
        listener as (event: MessageEvent<unknown>) => void
      );
    } else if (type === "error") {
      this.#errorListeners.add(listener as (event: Event) => void);
    } else {
      this.#messageErrorListeners.add(listener as (event: Event) => void);
    }
  }

  removeEventListener(
    type: "message" | "error" | "messageerror",
    listener:
      | ((event: MessageEvent<unknown>) => void)
      | ((event: Event) => void)
  ) {
    if (type === "message") {
      this.#messageListeners.delete(
        listener as (event: MessageEvent<unknown>) => void
      );
    } else if (type === "error") {
      this.#errorListeners.delete(listener as (event: Event) => void);
    } else {
      this.#messageErrorListeners.delete(listener as (event: Event) => void);
    }
  }

  terminate() {
    this.terminated = true;
  }

  respond(requestIndex: number) {
    const request = this.requests[requestIndex]!;
    const response = structuredClone(
      executeGraphLayoutWorkerRequest(request)
    );
    for (const listener of this.#messageListeners) {
      listener(new MessageEvent("message", { data: response }));
    }
  }

  respondWith(data: unknown) {
    for (const listener of this.#messageListeners) {
      listener(new MessageEvent("message", { data }));
    }
  }

  fail() {
    for (const listener of this.#errorListeners) {
      listener(new Event("error"));
    }
  }
}

function pointSignature(
  points: readonly {
    readonly entityId: string;
    readonly x: number;
    readonly y: number;
    readonly z?: number;
  }[]
) {
  return points.map((point) => [
    point.entityId,
    point.x,
    point.y,
    point.z ?? null
  ]);
}

describe("Phase 195 canonical graph layout worker", () => {
  it("uses a structured-clone-safe protocol and returns exact deterministic 2D and 3D layouts at the 10,000-node gate", () => {
    const projection = buildRendererGraphProjection(largeCanonicalFixture());
    const requests: GraphLayoutWorkerRequest[] = [
      {
        kind: "GRAPH_LAYOUT_REQUEST",
        protocolVersion: GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
        requestId: 1,
        renderer: "2d",
        projection,
        pattern: "compact-radial",
        options: { density: "compact", nodeRadius: 2, seed: "worker-gate" }
      },
      {
        kind: "GRAPH_LAYOUT_REQUEST",
        protocolVersion: GRAPH_LAYOUT_WORKER_PROTOCOL_VERSION,
        requestId: 2,
        renderer: "3d",
        projection,
        pattern: "authority-rings",
        options: { density: "compact", nodeRadius: 2, seed: "worker-gate" }
      }
    ];

    const clonedRequests = structuredClone(requests);
    const twoDResponse = executeGraphLayoutWorkerRequest(clonedRequests[0]);
    const threeDResponse = executeGraphLayoutWorkerRequest(clonedRequests[1]);
    expect(twoDResponse.kind).toBe("GRAPH_LAYOUT_RESULT");
    expect(threeDResponse.kind).toBe("GRAPH_LAYOUT_RESULT");
    if (
      twoDResponse.kind !== "GRAPH_LAYOUT_RESULT"
      || twoDResponse.renderer !== "2d"
      || threeDResponse.kind !== "GRAPH_LAYOUT_RESULT"
      || threeDResponse.renderer !== "3d"
    ) {
      throw new Error("Expected both canonical worker layouts.");
    }

    expect(twoDResponse.result.points).toHaveLength(10_000);
    expect(threeDResponse.result.points).toHaveLength(10_000);
    expect(twoDResponse.result.edges).toHaveLength(projection.edgeCount);
    expect(threeDResponse.result.edges).toHaveLength(projection.edgeCount);
    expect(new Set(
      twoDResponse.result.points.map((point) => point.entityId)
    ).size).toBe(10_000);
    expect(new Set(
      threeDResponse.result.points.map((point) => point.entityId)
    ).size).toBe(10_000);
    expect(pointSignature(twoDResponse.result.points)).toEqual(pointSignature(
      layoutGraph2D(projection, "compact-radial", {
        density: "compact",
        nodeRadius: 2,
        seed: "worker-gate"
      }).points
    ));
    expect(pointSignature(threeDResponse.result.points)).toEqual(pointSignature(
      layoutGraph3D(projection, "authority-rings", {
        density: "compact",
        nodeRadius: 2,
        seed: "worker-gate"
      }).points
    ));
    expect(() => structuredClone(twoDResponse)).not.toThrow();
    expect(() => structuredClone(threeDResponse)).not.toThrow();
  });

  it("honors OFF and AUTO policy paths without claiming a worker ran", async () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    let factoryCalls = 0;
    const coordinator = new GraphLayoutWorkerCoordinator(() => {
      factoryCalls += 1;
      return new ControlledWorker();
    });

    const off = await coordinator.request({
      renderer: "2d",
      projection,
      pattern: "authority-radial",
      workerUsage: "OFF"
    });
    const automatic = await coordinator.request({
      renderer: "3d",
      projection,
      pattern: "authority-rings",
      workerUsage: "AUTO"
    });

    expect(factoryCalls).toBe(0);
    expect(off.source).toBe("synchronous-policy");
    expect(automatic.source).toBe("synchronous-policy");
    expect(off.workerFailureCode).toBeNull();
    expect(automatic.workerFailureCode).toBeNull();
    expect(automatic.requestId).toBeGreaterThan(off.requestId);
    coordinator.dispose();
  });

  it("uses the worker for AUTO only after the performance policy scale gate", async () => {
    const projection = buildRendererGraphProjection(
      largeCanonicalFixture().slice(0, 1_001)
    );
    const worker = new ControlledWorker();
    const coordinator = new GraphLayoutWorkerCoordinator(() => worker);
    const pending = coordinator.request({
      renderer: "2d",
      projection,
      pattern: "compact-radial",
      workerUsage: "AUTO"
    });
    expect(worker.requests).toHaveLength(1);
    worker.respond(0);
    await expect(pending).resolves.toMatchObject({
      source: "worker",
      workerFailureCode: null
    });
    coordinator.dispose();
  });

  it("honors ON, allows concurrent dimensions, and rejects superseded results by monotonic request ID", async () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const worker = new ControlledWorker();
    const coordinator = new GraphLayoutWorkerCoordinator(() => worker);

    const first2D = coordinator.request({
      renderer: "2d",
      projection,
      pattern: "authority-radial",
      workerUsage: "ON"
    });
    const concurrent3D = coordinator.request({
      renderer: "3d",
      projection,
      pattern: "authority-rings",
      workerUsage: "ON"
    });
    const latest2D = coordinator.request({
      renderer: "2d",
      projection,
      pattern: "domain-clusters",
      workerUsage: "ON"
    });

    await expect(first2D).rejects.toBeInstanceOf(GraphLayoutStaleResultError);
    expect(worker.requests.map((request) => request.requestId)).toEqual([1, 2, 3]);
    worker.respond(1);
    worker.respond(2);

    const [threeD, twoD] = await Promise.all([concurrent3D, latest2D]);
    expect(threeD.requestId).toBe(2);
    expect(twoD.requestId).toBe(3);
    expect(threeD.source).toBe("worker");
    expect(twoD.source).toBe("worker");
    expect(twoD.result.pattern).toBe("domain-clusters");
    coordinator.dispose();
  });

  it("falls back synchronously only after an unavailable or failed requested worker", async () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const unavailable = new GraphLayoutWorkerCoordinator(() => null);
    const unavailableResult = await unavailable.request({
      renderer: "2d",
      projection,
      pattern: "authority-radial",
      workerUsage: "ON"
    });
    expect(unavailableResult).toMatchObject({
      source: "synchronous-fallback",
      workerFailureCode: "WORKER_UNAVAILABLE"
    });

    const worker = new ControlledWorker();
    const failed = new GraphLayoutWorkerCoordinator(() => worker);
    const pending = failed.request({
      renderer: "3d",
      projection,
      pattern: "spherical-shells",
      workerUsage: "ON"
    });
    worker.fail();
    const failedResult = await pending;
    expect(failedResult).toMatchObject({
      source: "synchronous-fallback",
      workerFailureCode: "WORKER_RUNTIME_FAILED"
    });
    expect(failedResult.result.points).toHaveLength(projection.entityCount);
    expect(worker.terminated).toBe(true);
    unavailable.dispose();
    failed.dispose();
  });

  it("rejects malformed worker output and never accepts reduced or fabricated layout truth", async () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const worker = new ControlledWorker();
    const coordinator = new GraphLayoutWorkerCoordinator(() => worker);
    const pending = coordinator.request({
      renderer: "2d",
      projection,
      pattern: "authority-radial",
      workerUsage: "ON"
    });
    const valid = executeGraphLayoutWorkerRequest(worker.requests[0]);
    if (valid.kind !== "GRAPH_LAYOUT_RESULT") {
      throw new Error("Expected a canonical worker result.");
    }
    worker.respondWith({
      ...valid,
      result: {
        ...valid.result,
        points: valid.result.points.slice(1)
      }
    });
    const result = await pending;
    expect(result).toMatchObject({
      source: "synchronous-fallback",
      workerFailureCode: "WORKER_MESSAGE_INVALID"
    });
    expect(result.result.points).toHaveLength(projection.entityCount);
    coordinator.dispose();
  });
});
