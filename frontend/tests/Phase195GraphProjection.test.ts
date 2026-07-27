import { describe, expect, it } from "vitest";
import { canonicalGraphEdgeId } from "@entral/contracts";
import {
  authorityBand,
  authorityBandsAreMonotonic,
  authorityRadius,
  describeAuthority,
  resolveAngularCollisions,
  stableAngularSlots
} from "../lib/graph-authority";
import {
  adaptCanonicalGraphProjection,
  buildRendererGraphProjection,
  filterGraphProjection,
  graphProjectionParityKey,
  GraphProjectionError
} from "../lib/graph-projection";
import {
  authorityHierarchy,
  canonicalProjectionFixture,
  current132EntityFixture,
  graphEntity
} from "./phase195-graph-fixtures";

function circularGap(left: number, right: number) {
  const difference = Math.abs(left - right);
  return Math.min(difference, Math.PI * 2 - difference);
}

describe("Phase 195 canonical graph projection", () => {
  it("joins only same-event authorized details and derives child counts from canonical parent relationships", () => {
    const hierarchy = authorityHierarchy().map((entity) =>
      entity.entity_id === "commander-a"
        ? {
            ...entity,
            active_alert: "Authorized parity alert",
            active_task_count: 3,
            child_count: 99,
            compute_tier: "priority",
            current_mission: "Coordinate canonical parity",
            latest_material_result: { status: "verified" },
            model_class: "reasoning",
            name: "Hierarchy detail must not rename",
            stable_code: "HIERARCHY-MUST-NOT-RECODE",
            updated_at: "2026-07-26T18:00:00.000Z",
            version: 99
          }
        : entity
    );
    const baseProjection = canonicalProjectionFixture(hierarchy, {
      projectionVersion: 195
    });
    const projection = {
      ...baseProjection,
      entities: baseProjection.entities.map((entity) =>
        entity.entity_id === "commander-a"
          ? {
              ...entity,
              display_name: "Projection Commander A",
              health: "WATCH" as const,
              stable_code: "PROJECTION-COMMANDER-A",
              status: "PAUSED" as const,
              version: 7
            }
          : entity
      )
    };
    const outside = {
      ...graphEntity("outside-projection", "SOLDIER", "commander-a"),
      current_mission: "Must never be introduced"
    };
    const adapted = adaptCanonicalGraphProjection(projection, {
      entities: [...hierarchy, outside],
      eventSequence: 195
    });
    const commander = adapted.entities.find(
      (node) => node.entityId === "commander-a"
    )?.entity;

    expect(adapted.entityCount).toBe(projection.entities.length);
    expect(adapted.entities.some(
      (node) => node.entityId === outside.entity_id
    )).toBe(false);
    expect(commander).toMatchObject({
      active_alert: "Authorized parity alert",
      active_task_count: 3,
      child_count: 1,
      compute_tier: "priority",
      current_mission: "Coordinate canonical parity",
      health: "WATCH",
      latest_material_result: { status: "verified" },
      model_class: "reasoning",
      name: "Projection Commander A",
      stable_code: "PROJECTION-COMMANDER-A",
      status: "PAUSED",
      version: 7
    });

    const stale = adaptCanonicalGraphProjection(projection, {
      entities: hierarchy,
      eventSequence: 194
    }).entities.find((node) => node.entityId === "commander-a")?.entity;
    expect(stale).toMatchObject({
      active_alert: null,
      active_task_count: 0,
      child_count: 1,
      current_mission: null,
      latest_material_result: null
    });
  });

  it("normalizes one deterministic renderer-neutral model without rewriting canonical IDs", () => {
    const entities = authorityHierarchy();
    const projection = buildRendererGraphProjection(entities, {
      scopeKey: "organization:authorized",
      edges: [{
        edge_id: "canonical-edge-entral-marshal-a",
        source_id: "entral",
        target_id: "marshal-a",
        relation_type: "HIERARCHY"
      }, {
        edge_id: "canonical-dependency",
        source_id: "general-a",
        target_id: "general-b",
        relation_type: "DEPENDENCY"
      }]
    });
    const reversed = buildRendererGraphProjection([...entities].reverse(), {
      scopeKey: "organization:authorized",
      edges: [{
        edge_id: "canonical-dependency",
        source_id: "general-a",
        target_id: "general-b",
        relation_type: "DEPENDENCY"
      }, {
        edge_id: "canonical-edge-entral-marshal-a",
        source_id: "entral",
        target_id: "marshal-a",
        relation_type: "HIERARCHY"
      }]
    });

    expect(projection.projectionId).toBe(reversed.projectionId);
    expect(graphProjectionParityKey(projection)).toBe(
      graphProjectionParityKey(reversed)
    );
    expect(projection.entityCount).toBe(entities.length);
    expect(projection.entities.map((node) => node.entityId)).toEqual(
      reversed.entities.map((node) => node.entityId)
    );
    expect(new Set(projection.entities.map((node) => node.entityId))).toEqual(
      new Set(entities.map((entity) => entity.entity_id))
    );
    expect(
      projection.entities.find((node) => node.entityId === "marshal-a")
        ?.parentEdgeId
    ).toBe("canonical-edge-entral-marshal-a");
    expect(
      projection.entities.find((node) => node.entityId === "soldier-a")
        ?.parentEdgeId
    ).toBe(canonicalGraphEdgeId("commander-a", "soldier-a"));
    expect(
      projection.entities.find((node) => node.entityId === "soldier-a")
        ?.lineageIds
    ).toEqual([
      "entral",
      "marshal-a",
      "general-a",
      "commander-a",
      "soldier-a"
    ]);
    expect(
      projection.entities.find((node) => node.entityId === "soldier-a")
        ?.domainId
    ).toBe("marshal-a");
    expect(projection.edges).toContainEqual({
      edgeId: "canonical-dependency",
      sourceId: "general-a",
      targetId: "general-b",
      relationType: "DEPENDENCY",
      parentEdge: false
    });
  });

  it("scrubs parents and edges outside the already-authorized projection", () => {
    const projection = buildRendererGraphProjection([
      graphEntity("visible-child", "GENERAL", "hidden-parent")
    ], {
      edges: [{
        edgeId: "hidden-edge",
        sourceId: "hidden-parent",
        targetId: "visible-child",
        relationType: "HIERARCHY"
      }]
    });
    const child = projection.entities[0]!;

    expect(child.parentId).toBeNull();
    expect(child.entity.parent_id).toBeNull();
    expect(child.parentEdgeId).toBeNull();
    expect(projection.edges).toEqual([]);
    expect(projection.diagnostics).toEqual([
      { code: "PARENT_OUTSIDE_AUTHORIZED_PROJECTION", count: 1 },
      { code: "UNSUPPORTED_EDGE_OUTSIDE_AUTHORIZED_PROJECTION", count: 1 }
    ]);
    expect(JSON.stringify(projection)).not.toContain("hidden-parent");
    expect(JSON.stringify(projection)).not.toContain("hidden-edge");
  });

  it("rejects duplicate IDs, duplicate edges, and parent cycles truthfully", () => {
    const duplicate = graphEntity("duplicate", "ENTRAL", null);
    expect(() => buildRendererGraphProjection([duplicate, duplicate])).toThrowError(
      GraphProjectionError
    );
    expect(() => buildRendererGraphProjection([
      graphEntity("a", "MARSHAL", "b"),
      graphEntity("b", "GENERAL", "a")
    ])).toThrowError(expect.objectContaining({ code: "PARENT_CYCLE" }));
    expect(() => buildRendererGraphProjection(authorityHierarchy(), {
      edges: [{
        edgeId: "same",
        sourceId: "entral",
        targetId: "marshal-a"
      }, {
        edgeId: "same",
        sourceId: "entral",
        targetId: "marshal-b"
      }]
    })).toThrowError(expect.objectContaining({ code: "DUPLICATE_EDGE_ID" }));
  });

  it("subsets only authorized nodes while retaining requested lineage and canonical edge IDs", () => {
    const projection = buildRendererGraphProjection(authorityHierarchy());
    const filtered = filterGraphProjection(
      projection,
      new Set(["soldier-a", "not-authorized"]),
      { includeAncestors: true }
    );

    expect(filtered.entities.map((node) => node.entityId)).toEqual([
      "commander-a",
      "entral",
      "general-a",
      "marshal-a",
      "soldier-a"
    ]);
    expect(filtered.edges.every((edge) =>
      filtered.entities.some((node) => node.entityId === edge.sourceId)
      && filtered.entities.some((node) => node.entityId === edge.targetId)
    )).toBe(true);
    expect(JSON.stringify(filtered)).not.toContain("not-authorized");
  });
});

describe("Phase 195 authority geometry primitives", () => {
  it("keeps every authority tier in a non-overlapping monotonic band", () => {
    expect(authorityBandsAreMonotonic()).toBe(true);
    const roles = ["ENTRAL", "MARSHAL", "GENERAL", "COMMANDER", "SOLDIER"] as const;
    for (let index = 1; index < roles.length; index += 1) {
      expect(authorityBand(roles[index]!).minRadius).toBeGreaterThan(
        authorityBand(roles[index - 1]!).maxRadius
      );
    }
    expect(authorityRadius("MARSHAL", 1)).toBe(
      authorityBand("MARSHAL").minRadius
    );
    expect(authorityRadius("MARSHAL", 0)).toBe(
      authorityBand("MARSHAL").maxRadius
    );
    expect(authorityRadius("MARSHAL", 0.9)).toBeLessThan(
      authorityRadius("MARSHAL", 0.2)
    );
    expect(describeAuthority(
      graphEntity("explicit", "GENERAL", null, { authorityScore: 3 })
    )).toMatchObject({
      normalizedScore: 1,
      scoreSource: "canonical"
    });
  });

  it("assigns stable, order-independent, evenly spaced angular slots", () => {
    const ids = ["delta", "alpha", "charlie", "bravo"];
    const slots = stableAngularSlots(ids, { seed: "fixed" });
    const reversed = stableAngularSlots([...ids].reverse(), { seed: "fixed" });
    expect([...slots]).toEqual([...reversed]);
    const angles = [...slots.values()].sort((left, right) => left - right);
    const gaps = angles.map((angle, index) =>
      circularGap(angle, angles[(index + 1) % angles.length]!)
    );
    for (const gap of gaps) expect(gap).toBeCloseTo(Math.PI / 2, 10);
  });

  it("resolves the current 132-entity peer fixture without random overlap or data loss", () => {
    const projection = buildRendererGraphProjection(current132EntityFixture());
    const slots = stableAngularSlots(
      projection.entities.map((node) => node.entityId)
    );
    const resolved = resolveAngularCollisions(
      projection.entities.map((node) => ({
        entityId: node.entityId,
        role: node.authority.role,
        desiredAngle: slots.get(node.entityId) ?? 0,
        radius: node.authority.radius,
        collisionRadius: 7
      }))
    );

    expect(resolved).toHaveLength(132);
    expect(new Set(resolved.map((node) => node.entityId)).size).toBe(132);
    expect(resolved.every((node) => Number.isFinite(node.angle))).toBe(true);
    expect(resolved.filter((node) => node.role === "GENERAL")
      .every((node) => !node.crowded)).toBe(true);
    const generals = resolved.filter((node) => node.role === "GENERAL");
    let minimumDistance = Infinity;
    for (let leftIndex = 0; leftIndex < generals.length; leftIndex += 1) {
      const left = generals[leftIndex]!;
      const leftX = Math.cos(left.angle) * left.radius;
      const leftY = Math.sin(left.angle) * left.radius;
      for (let rightIndex = leftIndex + 1; rightIndex < generals.length; rightIndex += 1) {
        const right = generals[rightIndex]!;
        const rightX = Math.cos(right.angle) * right.radius;
        const rightY = Math.sin(right.angle) * right.radius;
        minimumDistance = Math.min(
          minimumDistance,
          Math.hypot(leftX - rightX, leftY - rightY)
        );
      }
    }
    expect(minimumDistance).toBeGreaterThan(14);
  });
});
