import { describe, expect, it } from "vitest";
import {
  canonical2DLayoutTransitionEnabled,
  interpolateCanonical2DGraphPoints
} from "../components/CanonicalUniverseGraph";
import {
  layoutGraph2D,
  layoutPreservesAuthorityOrder,
  pinGraphNode2D
} from "../lib/graph-layouts";
import { buildRendererGraphProjection } from "../lib/graph-projection";
import {
  authorityHierarchy,
  graphEntity
} from "./phase195-graph-fixtures";

function coordinateSignature(points: readonly {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
}[]) {
  return points.map((point) => [
    point.entityId,
    Number(point.x.toFixed(8)),
    Number(point.y.toFixed(8))
  ]);
}

describe("Phase 195 shared graph motion", () => {
  it("interpolates 2D layout positions with duration and every persisted easing mode", () => {
    const target = [{
      entity: graphEntity("general-a", "GENERAL", "marshal-a"),
      x: 100,
      y: 40
    }];
    const from = new Map([["general-a", { x: 0, y: 0 }]]);

    expect(interpolateCanonical2DGraphPoints(
      target,
      from,
      150,
      300,
      "LINEAR"
    )[0]).toMatchObject({ x: 50, y: 20 });
    expect(interpolateCanonical2DGraphPoints(
      target,
      from,
      150,
      300,
      "EASE_IN"
    )[0]).toMatchObject({ x: 25, y: 10 });
    expect(interpolateCanonical2DGraphPoints(
      target,
      from,
      150,
      300,
      "EASE_OUT"
    )[0]).toMatchObject({ x: 75, y: 30 });
    expect(interpolateCanonical2DGraphPoints(
      target,
      from,
      75,
      300,
      "EASE_IN_OUT"
    )[0]).toMatchObject({ x: 12.5, y: 5 });
    expect(interpolateCanonical2DGraphPoints(
      target,
      from,
      1,
      0,
      "EASE_IN"
    )[0]).toBe(target[0]);
  });

  it("disables 2D transitions for zero duration, pause, reduced/off motion, and reduced-motion lock", () => {
    const enabled = {
      durationMs: 300,
      hasPreviousLayout: true,
      motionLocked: false,
      motionMode: "NORMAL" as const,
      movementPaused: false,
      positionsChanged: true
    };

    expect(canonical2DLayoutTransitionEnabled(enabled)).toBe(true);
    expect(canonical2DLayoutTransitionEnabled({
      ...enabled,
      durationMs: 0
    })).toBe(false);
    expect(canonical2DLayoutTransitionEnabled({
      ...enabled,
      movementPaused: true
    })).toBe(false);
    expect(canonical2DLayoutTransitionEnabled({
      ...enabled,
      motionLocked: true
    })).toBe(false);
    expect(canonical2DLayoutTransitionEnabled({
      ...enabled,
      motionMode: "OFF"
    })).toBe(false);
    expect(canonical2DLayoutTransitionEnabled({
      ...enabled,
      motionMode: "REDUCED"
    })).toBe(false);
    expect(canonical2DLayoutTransitionEnabled({
      ...enabled,
      positionsChanged: false
    })).toBe(false);
  });
});

describe("Phase 195 deterministic 2D force relaxation", () => {
  it("makes every bounded nonzero iteration count effective without changing authority truth", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const common = { seed: "phase195-force-proof" } as const;
    const zero = layoutGraph2D(projection, "authority-radial", {
      ...common,
      forceIterations: 0
    });
    const one = layoutGraph2D(projection, "authority-radial", {
      ...common,
      forceIterations: 1
    });
    const fifty = layoutGraph2D(projection, "authority-radial", {
      ...common,
      forceIterations: 50
    });
    const fiveHundred = layoutGraph2D(projection, "authority-radial", {
      ...common,
      forceIterations: 500
    });

    expect(coordinateSignature(one.points)).not.toEqual(
      coordinateSignature(zero.points)
    );
    expect(coordinateSignature(fifty.points)).not.toEqual(
      coordinateSignature(one.points)
    );
    expect(coordinateSignature(fiveHundred.points)).not.toEqual(
      coordinateSignature(fifty.points)
    );
    expect(layoutGraph2D(projection, "authority-radial", {
      ...common,
      forceIterations: 50
    })).toBe(fifty);

    for (const result of [one, fifty, fiveHundred]) {
      expect(result.edges).toBe(projection.edges);
      expect(result.points.map((point) => point.entityId)).toEqual(
        zero.points.map((point) => point.entityId)
      );
      expect(result.points.map((point) => point.parentId)).toEqual(
        zero.points.map((point) => point.parentId)
      );
      expect(layoutPreservesAuthorityOrder(result.points)).toBe(true);
      for (const point of result.points) {
        expect(point.radialDistance).toBeCloseTo(point.authorityRadius, 8);
        expect(Math.hypot(point.x, point.y)).toBeCloseTo(
          point.radialDistance,
          8
        );
      }
    }
  });

  it("bounds invalid inputs to no force, clamps overflow, and never moves pins", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const pins = pinGraphNode2D(
      projection,
      {},
      "marshal-a",
      { x: 0, y: 999 }
    );
    const zero = layoutGraph2D(projection, "authority-radial", {
      forceIterations: 0,
      pins,
      seed: "phase195-force-bounds"
    });
    const invalid = layoutGraph2D(projection, "authority-radial", {
      forceIterations: Number.NaN,
      pins,
      seed: "phase195-force-bounds"
    });
    const maximum = layoutGraph2D(projection, "authority-radial", {
      forceIterations: 500,
      pins,
      seed: "phase195-force-bounds"
    });
    const overflow = layoutGraph2D(projection, "authority-radial", {
      forceIterations: 5_000,
      pins,
      seed: "phase195-force-bounds"
    });
    const pinnedAtZero = zero.points.find(
      (point) => point.entityId === "marshal-a"
    )!;
    const pinnedAtMaximum = maximum.points.find(
      (point) => point.entityId === "marshal-a"
    )!;

    expect(coordinateSignature(invalid.points)).toEqual(
      coordinateSignature(zero.points)
    );
    expect(coordinateSignature(overflow.points)).toEqual(
      coordinateSignature(maximum.points)
    );
    expect(pinnedAtMaximum).toMatchObject({
      pinned: true,
      x: pinnedAtZero.x,
      y: pinnedAtZero.y
    });
  });

  it("explicitly rejects force relaxation for hierarchy tree and preserves every level coordinate", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const unforced = layoutGraph2D(projection, "hierarchy-tree", {
      forceIterations: 0,
      seed: "phase195-tree-force-safety",
      treeOrientation: "top-down"
    });
    const rejected = layoutGraph2D(projection, "hierarchy-tree", {
      forceIterations: 200,
      seed: "phase195-tree-force-safety",
      treeOrientation: "top-down"
    });
    const unforcedById = new Map(
      unforced.points.map((point) => [point.entityId, point])
    );

    expect(rejected.appliedForceIterations).toBe(0);
    expect(rejected.forceIterationsRejected).toBe(true);
    expect(coordinateSignature(rejected.points)).toEqual(
      coordinateSignature(unforced.points)
    );
    for (const point of rejected.points) {
      const original = unforcedById.get(point.entityId)!;
      expect(point.depth).toBe(original.depth);
      expect(point.x).toBe(original.x);
      expect(point.y).toBe(original.y);
    }
  });
});
