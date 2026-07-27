import { describe, expect, it } from "vitest";
import {
  BoundedGraphLayoutCache,
  classifyGraphRendererFailure,
  createGraphTelemetrySample,
  graphLayoutCacheKey,
  graphPerformancePolicy,
  GraphFrameDiagnostics,
  validateGraphLayoutParity
} from "../lib/graph-diagnostics";
import { layoutGraph2D, layoutGraph3D } from "../lib/graph-layouts";
import { buildRendererGraphProjection } from "../lib/graph-projection";
import {
  current132EntityFixture,
  largeCanonicalFixture
} from "./phase195-graph-fixtures";

describe("Phase 195 graph performance and safe diagnostics", () => {
  it("keeps the current 132-entity projection and both default layouts inside the interaction gate", () => {
    const started = performance.now();
    const projection = buildRendererGraphProjection(current132EntityFixture());
    const twoD = layoutGraph2D(projection, "authority-radial");
    const threeD = layoutGraph3D(projection, "authority-rings");
    const elapsed = performance.now() - started;

    expect(elapsed).toBeLessThan(150);
    expect(validateGraphLayoutParity(projection, twoD.points)).toEqual([]);
    expect(validateGraphLayoutParity(projection, threeD.points)).toEqual([]);
    expect(graphPerformancePolicy(132)).toEqual({
      levelOfDetail: "full",
      preserveAllCanonicalNodes: true,
      maximumLiveLabels: 132,
      layoutBudgetMs: 50,
      targetFrameRate: 60,
      workerPreferred: false
    });
  });

  it("lays out an isolated 10,000-entity canonical fixture without dropping or fabricating nodes", () => {
    const fixture = largeCanonicalFixture();
    const projectionStarted = performance.now();
    const projection = buildRendererGraphProjection(fixture);
    const projectionElapsed = performance.now() - projectionStarted;
    const layoutStarted = performance.now();
    const twoD = layoutGraph2D(projection, "compact-radial", {
      density: "compact",
      nodeRadius: 2
    });
    const threeD = layoutGraph3D(projection, "authority-rings", {
      density: "compact",
      nodeRadius: 2
    });
    const layoutElapsed = performance.now() - layoutStarted;

    expect(projectionElapsed).toBeLessThan(1_000);
    expect(layoutElapsed).toBeLessThan(2_000);
    expect(projection.entityCount).toBe(10_000);
    expect(twoD.points).toHaveLength(10_000);
    expect(threeD.points).toHaveLength(10_000);
    expect(new Set(twoD.points.map((point) => point.entityId)).size).toBe(10_000);
    expect(new Set(threeD.points.map((point) => point.entityId)).size).toBe(10_000);
    expect(validateGraphLayoutParity(projection, twoD.points)).toEqual([]);
    expect(validateGraphLayoutParity(projection, threeD.points)).toEqual([]);
    expect(graphPerformancePolicy(10_000)).toMatchObject({
      levelOfDetail: "minimal",
      preserveAllCanonicalNodes: true,
      maximumLiveLabels: 240,
      layoutBudgetMs: 500,
      targetFrameRate: 30,
      workerPreferred: true
    });
  });

  it("bounds deterministic layout caches and records payload-free telemetry", () => {
    const projection = buildRendererGraphProjection(current132EntityFixture());
    const cache = new BoundedGraphLayoutCache<number>(2);
    const firstKey = graphLayoutCacheKey(
      projection,
      "2d",
      "authority-radial",
      1,
      "seed-a"
    );
    cache.set(firstKey, 1);
    cache.set("second", 2);
    expect(cache.get(firstKey)).toBe(1);
    cache.set("third", 3);
    expect(cache.size).toBe(2);
    expect(cache.get("second")).toBeUndefined();

    const telemetry = createGraphTelemetrySample(projection, {
      renderer: "2d",
      pattern: "authority-radial",
      settingsVersion: 1,
      layoutTimeMs: 12.5,
      frameRate: 59.2,
      droppedFrameRate: 0.01,
      errorCode: "NONE"
    });
    expect(telemetry).toMatchObject({
      projectionId: projection.projectionId,
      nodeCount: 132,
      settingsVersion: 1
    });
    expect(JSON.stringify(telemetry)).not.toContain("marshal-");
    expect(JSON.stringify(telemetry)).not.toContain("business-");
  });

  it("reports renderer failures truthfully without echoing sensitive error text", () => {
    const failure = classifyGraphRendererFailure(
      new TypeError("customer-secret-token")
    );
    expect(failure).toEqual({
      code: "GRAPH_RENDERER_FAILURE",
      recoverable: true,
      userMessage: "The graph renderer is unavailable. Retry or use the textual hierarchy.",
      textualHierarchyAvailable: true,
      diagnosticClass: "TypeError"
    });
    expect(JSON.stringify(failure)).not.toContain("customer-secret-token");

    const frames = new GraphFrameDiagnostics();
    frames.addFrame(10);
    frames.addFrame(40);
    expect(frames.snapshot()).toMatchObject({
      frameCount: 2,
      droppedFrameRate: 0.5
    });
    frames.reset();
    expect(frames.snapshot().frameCount).toBe(0);
  });
});
