import { describe, expect, it } from "vitest";
import { buildRendererGraphProjection } from "../lib/graph-projection";
import {
  GRAPH_2D_LAYOUT_PATTERNS,
  GRAPH_3D_LAYOUT_PATTERNS,
  layoutGraph2D,
  layoutGraph3D,
  layoutPreservesAuthorityOrder,
  pinGraphNode2D,
  pinGraphNode3D,
  sanitizePinnedPositions2D,
  unpinGraphNode
} from "../lib/graph-layouts";
import {
  authorityHierarchy,
  current132EntityFixture
} from "./phase195-graph-fixtures";

function signature2D(points: readonly {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
}[]) {
  return points
    .map((point) => [
      point.entityId,
      Number(point.x.toFixed(5)),
      Number(point.y.toFixed(5))
    ])
    .sort();
}

function signature3D(points: readonly {
  readonly entityId: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}[]) {
  return points
    .map((point) => [
      point.entityId,
      Number(point.x.toFixed(5)),
      Number(point.y.toFixed(5)),
      Number(point.z.toFixed(5))
    ])
    .sort();
}

describe("Phase 195 2D graph layouts", () => {
  it("implements four deterministic patterns over the exact same projection", () => {
    const projection = buildRendererGraphProjection(current132EntityFixture());
    const results = GRAPH_2D_LAYOUT_PATTERNS.map((pattern) =>
      layoutGraph2D(projection, pattern, { seed: "accepted-seed" })
    );

    for (const result of results) {
      expect(result.points).toHaveLength(projection.entityCount);
      expect(result.edges).toBe(projection.edges);
      expect(new Set(result.points.map((point) => point.entityId))).toEqual(
        new Set(projection.entities.map((node) => node.entityId))
      );
      expect(result.points.every((point) =>
        Number.isFinite(point.x)
        && Number.isFinite(point.y)
        && Number.isFinite(point.authorityRadius)
      )).toBe(true);
      expect(layoutPreservesAuthorityOrder(result.points)).toBe(true);
      expect(signature2D(layoutGraph2D(
        projection,
        result.pattern,
        { seed: "accepted-seed" }
      ).points)).toEqual(signature2D(result.points));
    }

    const signatures = new Set(results.map((result) =>
      JSON.stringify(signature2D(result.points))
    ));
    expect(signatures.size).toBe(GRAPH_2D_LAYOUT_PATTERNS.length);
  });

  it("keeps radial positions inside ordered authority bands and exposes tree adapter metadata", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    for (const pattern of [
      "authority-radial",
      "domain-clusters",
      "compact-radial"
    ] as const) {
      const result = layoutGraph2D(projection, pattern);
      for (const point of result.points) {
        expect(point.radialDistance).toBeCloseTo(point.authorityRadius, 8);
      }
    }

    const tree = layoutGraph2D(projection, "hierarchy-tree");
    const soldier = tree.points.find((point) => point.entityId === "soldier-a")!;
    expect(soldier.depth).toBe(4);
    expect(soldier.parentId).toBe("commander-a");
    expect(soldier.parentEdgeId).toBeTruthy();
    expect(soldier.siblingCount).toBe(1);
    expect(
      tree.points.find((point) => point.entityId === "entral")
        ?.radialDistance
    ).toBe(0);
  });

  it("keeps authorized pins separate, finite, immutable, and authority-safe", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const sanitized = sanitizePinnedPositions2D(projection, {
      "marshal-a": { x: 0, y: 999 },
      "not-authorized": { x: 1, y: 1 },
      "marshal-b": { x: Number.POSITIVE_INFINITY, y: 0 }
    });
    expect(sanitized.rejectedCount).toBe(2);
    expect(Object.keys(sanitized.pins)).toEqual(["marshal-a"]);

    const pins = pinGraphNode2D(
      projection,
      {},
      "marshal-a",
      { x: 0, y: 999 }
    );
    const pinned = layoutGraph2D(projection, "authority-radial", { pins });
    const marshal = pinned.points.find((point) => point.entityId === "marshal-a")!;
    expect(marshal.pinned).toBe(true);
    expect(marshal.x).toBeCloseTo(0, 8);
    expect(marshal.y).toBeCloseTo(marshal.authorityRadius, 8);
    expect(marshal.radialDistance).toBeCloseTo(marshal.authorityRadius, 8);
    expect(unpinGraphNode(pins, "marshal-a")).toEqual({});
    expect(pins).toEqual({ "marshal-a": { x: 0, y: 999 } });
  });
});

describe("Phase 195 3D graph layouts", () => {
  it("implements four distinct stable patterns with exact shell distance and projection parity", () => {
    const projection = buildRendererGraphProjection(current132EntityFixture());
    const results = GRAPH_3D_LAYOUT_PATTERNS.map((pattern) =>
      layoutGraph3D(projection, pattern, { seed: "accepted-seed" })
    );
    for (const result of results) {
      expect(result.points).toHaveLength(132);
      expect(result.edges).toBe(projection.edges);
      expect(result.points.every((point) =>
        Number.isFinite(point.x)
        && Number.isFinite(point.y)
        && Number.isFinite(point.z)
      )).toBe(true);
      for (const point of result.points) {
        expect(point.radialDistance).toBeCloseTo(point.authorityRadius, 8);
      }
      expect(layoutPreservesAuthorityOrder(result.points)).toBe(true);
      expect(signature3D(layoutGraph3D(
        projection,
        result.pattern,
        { seed: "accepted-seed" }
      ).points)).toEqual(signature3D(result.points));
    }
    const signatures = new Set(results.map((result) =>
      JSON.stringify(signature3D(result.points))
    ));
    expect(signatures.size).toBe(GRAPH_3D_LAYOUT_PATTERNS.length);
  });

  it("projects 3D pins back onto the entity's authority shell", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const pins = pinGraphNode3D(
      projection,
      {},
      "general-a",
      { x: 0, y: 10_000, z: 0 }
    );
    const result = layoutGraph3D(projection, "spherical-shells", { pins });
    const general = result.points.find((point) => point.entityId === "general-a")!;
    expect(general.pinned).toBe(true);
    expect(general.x).toBeCloseTo(0, 8);
    expect(general.y).toBeCloseTo(general.authorityRadius, 8);
    expect(general.z).toBeCloseTo(0, 8);
    expect(general.radialDistance).toBeCloseTo(general.authorityRadius, 8);
  });
});

describe("Phase 195 incremental graph layout updates", () => {
  it("reuses immutable geometry for metadata-only projection deltas and rebinds current truth", () => {
    const initialEntities = current132EntityFixture();
    const initialProjection = buildRendererGraphProjection(initialEntities, {
      organizationId: "19500000-0000-4000-8000-000000000040",
      projectionVersion: 1
    });
    const updatedProjection = buildRendererGraphProjection(
      initialEntities.map((entity, index) => index === 20
        ? { ...entity, status: "PAUSED" as const, version: entity.version + 1 }
        : entity),
      {
        organizationId: "19500000-0000-4000-8000-000000000040",
        projectionVersion: 2
      }
    );
    expect(updatedProjection.projectionId).not.toBe(initialProjection.projectionId);

    const initial2D = layoutGraph2D(initialProjection, "authority-radial", {
      seed: "incremental-metadata"
    });
    const updated2D = layoutGraph2D(updatedProjection, "authority-radial", {
      seed: "incremental-metadata"
    });
    const initial3D = layoutGraph3D(initialProjection, "authority-rings", {
      seed: "incremental-metadata"
    });
    const updated3D = layoutGraph3D(updatedProjection, "authority-rings", {
      seed: "incremental-metadata"
    });

    expect(updated2D.points).toBe(initial2D.points);
    expect(updated3D.points).toBe(initial3D.points);
    expect(updated2D.projectionId).toBe(updatedProjection.projectionId);
    expect(updated3D.projectionId).toBe(updatedProjection.projectionId);
    expect(updated2D.edges).toBe(updatedProjection.edges);
    expect(updated3D.edges).toBe(updatedProjection.edges);
  });

  it("invalidates incremental geometry when authority input changes", () => {
    const initialEntities = authorityHierarchy();
    const initialProjection = buildRendererGraphProjection(initialEntities);
    const changedProjection = buildRendererGraphProjection(
      initialEntities.map((entity) => entity.entity_id === "general-a"
        ? { ...entity, authority_score: 0.01, version: entity.version + 1 }
        : entity)
    );
    const initial = layoutGraph2D(initialProjection, "authority-radial", {
      seed: "incremental-authority"
    });
    const changed = layoutGraph2D(changedProjection, "authority-radial", {
      seed: "incremental-authority"
    });

    expect(changed.points).not.toBe(initial.points);
    expect(
      changed.points.find((point) => point.entityId === "general-a")?.authorityRadius
    ).not.toBe(
      initial.points.find((point) => point.entityId === "general-a")?.authorityRadius
    );
  });
});
