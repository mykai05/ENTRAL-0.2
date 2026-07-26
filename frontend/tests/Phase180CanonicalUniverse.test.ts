import { describe, expect, it } from "vitest";
import type { EntityRole, EntitySummary } from "@entral/contracts";
import {
  canonicalLineageAndSubtree,
  entitiesForBusinessScope,
  fitUniverseCamera,
  layoutCanonicalUniverse,
  nextUniverseEntityId,
  semanticUniverseIds
} from "../lib/canonical-universe";

function entity(
  entityId: string,
  role: EntityRole,
  parentId: string | null,
  businessId: string | null = null
): EntitySummary {
  return {
    active_alert: null,
    active_task_count: 0,
    assigned_business_id: businessId,
    child_count: 0,
    compute_tier: null,
    current_mission: null,
    entity_id: entityId,
    entity_type: role,
    health: "HEALTHY",
    latest_material_result: null,
    model_class: null,
    name: entityId,
    parent_id: parentId,
    stable_code: entityId,
    status: "ACTIVE",
    updated_at: "2026-07-25T00:00:00.000Z",
    version: 1
  };
}

const hierarchy = [
  entity("entral", "ENTRAL", null),
  entity("marshal", "MARSHAL", "entral"),
  entity("general", "GENERAL", "marshal"),
  entity("commander-a", "COMMANDER", "general", "business-a"),
  entity("soldier-a", "SOLDIER", "commander-a", "business-a"),
  entity("commander-b", "COMMANDER", "general", "business-b"),
  entity("soldier-b", "SOLDIER", "commander-b", "business-b")
];

describe("Phase 180 canonical Universe invariants", () => {
  it("never hides a selected entity's ancestors or descendants", () => {
    expect([...canonicalLineageAndSubtree(hierarchy, "commander-a")].sort()).toEqual([
      "commander-a",
      "entral",
      "general",
      "marshal",
      "soldier-a"
    ]);
    expect([...canonicalLineageAndSubtree(hierarchy, "soldier-a")].sort()).toEqual([
      "commander-a",
      "entral",
      "general",
      "marshal",
      "soldier-a"
    ]);
  });

  it("preserves the protected branch through semantic zoom budgets", () => {
    const ids = semanticUniverseIds(hierarchy, "commander-a", 0.01, 1);
    for (const expected of ["entral", "marshal", "general", "commander-a", "soldier-a"]) {
      expect(ids.has(expected)).toBe(true);
    }
  });

  it("business scope includes the complete inherited lineage and no unrelated branch", () => {
    expect(entitiesForBusinessScope(hierarchy, "business-a").map((candidate) => candidate.entity_id)).toEqual([
      "entral",
      "marshal",
      "general",
      "commander-a",
      "soldier-a"
    ]);
  });

  it("lays out 10000 canonical entities without DOM expansion", () => {
    const large = [entity("entral", "ENTRAL", null)];
    for (let index = 0; index < 9_999; index += 1) {
      large.push(entity(`soldier-${index}`, "SOLDIER", "entral", `business-${index % 500}`));
    }
    const started = performance.now();
    const points = layoutCanonicalUniverse(large);
    expect(points).toHaveLength(10_000);
    expect(performance.now() - started).toBeLessThan(500);

    for (const [width, height] of [[390, 844], [390, 360]] as const) {
      const camera = fitUniverseCamera(points, width, height);
      expect(camera).not.toBeNull();
      const screenXs = points.map((point) => width / 2 + camera!.x + point.x * camera!.zoom);
      const screenYs = points.map((point) => height / 2 + camera!.y + point.y * camera!.zoom);
      expect(Math.min(...screenXs)).toBeGreaterThanOrEqual(79.99);
      expect(Math.max(...screenXs)).toBeLessThanOrEqual(width - 79.99);
      expect(Math.min(...screenYs)).toBeGreaterThanOrEqual(79.99);
      expect(Math.max(...screenYs)).toBeLessThanOrEqual(height - 79.99);
    }
  });

  it("traverses canonical relationships and siblings in spatial order", () => {
    const points = layoutCanonicalUniverse(hierarchy);
    expect(nextUniverseEntityId(points, null, "right")).toBe("entral");
    expect(nextUniverseEntityId(points, "entral", "right")).toBe("marshal");
    expect(nextUniverseEntityId(points, "marshal", "right")).toBe("general");
    expect(nextUniverseEntityId(points, "commander-a", "left")).toBe("general");
    expect(nextUniverseEntityId(points, "commander-a", "down")).toBe("commander-b");
    expect(nextUniverseEntityId(points, "commander-b", "up")).toBe("commander-a");
  });
});
