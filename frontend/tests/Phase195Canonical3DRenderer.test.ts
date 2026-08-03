import { describe, expect, it } from "vitest";
import {
  acceptedGraphFrameDeltaSeconds,
  canonical3DLabelPlacement,
  canonical3DNodeMarkerSize,
  canonical3DPointOpacity,
  canonical3DPointScale,
  canonicalEdgeStrokeOffsets,
  canonicalEdgesForConnectionMode,
  canonicalGraphDetailChildCount,
  canonicalLabelNodeIds,
  graphStateFromCanonicalEntities,
  nextCanonicalGraphEntityId,
  relatedNodeIdsForSelection,
  resolveCanonicalLevelOfDetail,
  shouldDrawCanonical3DNodeMarker,
  visibleNodeIdsForSelection
} from "../components/NeuronsCommandCenter";
import {
  authorityHierarchy,
  current132EntityFixture
} from "./phase195-graph-fixtures";
import {
  canonicalGraphMotionProgress,
  canonicalLineageAndSubtree,
  easedGraphMotionProgress
} from "../lib/canonical-universe";
import { layoutGraph2D, layoutGraph3D } from "../lib/graph-layouts";
import { buildRendererGraphProjection } from "../lib/graph-projection";

describe("Phase 195 canonical 3D renderer policies", () => {
  it("keeps canonical role markers selection-only and bounds depth-alpha point presentation", () => {
    expect(shouldDrawCanonical3DNodeMarker(true, "general-a", "entral", null)).toBe(false);
    expect(shouldDrawCanonical3DNodeMarker(true, "general-a", "general-a", null)).toBe(true);
    expect(shouldDrawCanonical3DNodeMarker(true, "general-a", "entral", "general-a")).toBe(true);
    expect(shouldDrawCanonical3DNodeMarker(false, "general-a", "entral", null)).toBe(true);
    expect(canonical3DNodeMarkerSize(true, 68)).toBeLessThanOrEqual(10);
    expect(canonical3DNodeMarkerSize(true, 28)).toBeCloseTo(3.92);
    expect(canonical3DNodeMarkerSize(false, 68)).toBe(68);
    expect(canonical3DPointOpacity(0.8, 1)).toBeCloseTo(0.8);
    expect(canonical3DPointOpacity(0.2, 3)).toBeGreaterThan(canonical3DPointOpacity(0.2, 2));
    expect(canonical3DPointOpacity(0.2, 5)).toBeGreaterThan(canonical3DPointOpacity(0.2, 3));
    expect(canonical3DPointOpacity(5, 5)).toBe(1);
    expect(canonical3DPointScale(0)).toBe(1);
    expect(canonical3DPointScale(2)).toBeCloseTo(1.3);
    expect(canonical3DPointScale(3)).toBeCloseTo(1.45);
    expect(canonical3DPointScale(20)).toBeCloseTo(1.45);
  });

  it("keeps canonical labels inside the WebGL viewport and flips them away from the right edge", () => {
    const rightEdge = canonical3DLabelPlacement({
      anchorX: 350,
      anchorY: 190,
      fontSize: 11,
      nodeRadius: 8,
      pixelRatio: 1,
      textWidth: 90,
      viewportHeight: 200,
      viewportWidth: 360
    });
    expect(rightEdge.left).toBeLessThan(350);
    expect(rightEdge.right).toBeLessThanOrEqual(352);
    expect(rightEdge.bottom).toBeLessThanOrEqual(192);

    const longLabel = canonical3DLabelPlacement({
      anchorX: 180,
      anchorY: 100,
      fontSize: 22,
      nodeRadius: 8,
      pixelRatio: 2,
      textWidth: 900,
      viewportHeight: 200,
      viewportWidth: 360
    });
    expect(longLabel.maxWidth).toBe(328);
    expect(longLabel.left).toBeGreaterThanOrEqual(16);
    expect(longLabel.right).toBeLessThanOrEqual(344);
  });

  it("limits relevant labels to the selected lineage and direct children", () => {
    const graph = graphStateFromCanonicalEntities(authorityHierarchy(), 195);
    const rootLabels = canonicalLabelNodeIds({
      hoveredId: null,
      labelThreshold: 0.35,
      maximumLiveLabels: 200,
      mode: "RELEVANT",
      nodes: graph.nodes,
      selectedId: "entral",
      zoomFactor: 1
    });
    expect(rootLabels).toEqual(["entral", "marshal-a", "marshal-b"]);
    const generalLabels = canonicalLabelNodeIds({
      hoveredId: null,
      labelThreshold: 0.35,
      maximumLiveLabels: 200,
      mode: "RELEVANT",
      nodes: graph.nodes,
      selectedId: "general-a",
      zoomFactor: 1
    });
    expect(generalLabels).toEqual(["general-a", "entral", "marshal-a", "commander-a"]);
    expect(generalLabels).not.toContain("soldier-a");

    const hoveredOutsideLineage = canonicalLabelNodeIds({
      hoveredId: "general-b",
      labelThreshold: 0.35,
      maximumLiveLabels: 200,
      mode: "RELEVANT",
      nodes: graph.nodes,
      selectedId: "general-a",
      zoomFactor: 1
    });
    expect(hoveredOutsideLineage).toContain("general-b");

    const noSelectionLabels = canonicalLabelNodeIds({
      hoveredId: null,
      labelThreshold: 0.35,
      maximumLiveLabels: 200,
      mode: "RELEVANT",
      nodes: graph.nodes,
      selectedId: null,
      zoomFactor: 1
    });
    expect(noSelectionLabels).toEqual(["entral", "marshal-a", "marshal-b"]);
    expect(noSelectionLabels).not.toContain("general-a");
  });

  it("maps authorized detail fields while deriving 3D direct reports from canonical relationships", () => {
    const entities = authorityHierarchy().map((entity) =>
      entity.entity_id === "commander-b"
        ? {
            ...entity,
            active_alert: "Authorized Phase 195 parity alert.",
            active_task_count: 3,
            child_count: 1,
            current_mission: "Coordinate authorized Phase 195 graph parity.",
            latest_material_result: {
              status: "phase195-parity-verified"
            }
          }
        : entity
    );
    const graph = graphStateFromCanonicalEntities(entities, 195);
    const commander = graph.nodes.find((node) => node.id === "commander-b");

    expect(commander?.children).toEqual(["soldier-b"]);
    expect(commander?.currentTask).toBe(
      "Coordinate authorized Phase 195 graph parity."
    );
    expect(commander?.logs).toContain(
      "Active alert: Authorized Phase 195 parity alert."
    );
    expect(commander?.memory.recentTasks).toEqual(["3 active tasks"]);
    expect(commander?.memory.taskResults).toEqual([
      "{\"status\":\"phase195-parity-verified\"}"
    ]);
    expect(canonicalGraphDetailChildCount(
      entities.find((entity) => entity.entity_id === "commander-b") ?? null,
      0
    )).toBe(1);
    expect(canonicalGraphDetailChildCount(null, 2)).toBe(2);
  });

  it("preserves the complete authorized node set in canonical mode for selection and null selection", () => {
    const graph = graphStateFromCanonicalEntities(authorityHierarchy(), 195);
    const allIds = graph.nodes.map((node) => node.id).sort();

    expect([...visibleNodeIdsForSelection("general-a", graph.nodes, true)].sort()).toEqual(allIds);
    expect([...visibleNodeIdsForSelection(null, graph.nodes, true)].sort()).toEqual(allIds);
    expect(visibleNodeIdsForSelection("general-a", graph.nodes, false)).not.toContain("marshal-b");
    expect(relatedNodeIdsForSelection("general-a", graph.nodes)).not.toContain("marshal-b");
  });

  it("implements ALL, RELEVANT, LINEAGE, and DIRECT without changing canonical node truth", () => {
    const graph = graphStateFromCanonicalEntities(authorityHierarchy(), 195);
    const allEdgeIds = graph.edges.map((edge) => edge.id).sort();

    expect(canonicalEdgesForConnectionMode(graph.edges, graph.nodes, "general-a", "ALL").map((edge) => edge.id).sort()).toEqual(allEdgeIds);
    expect(canonicalEdgesForConnectionMode(graph.edges, graph.nodes, "general-a", "RELEVANT").map((edge) => edge.id).sort()).toEqual(allEdgeIds);
    expect(canonicalEdgesForConnectionMode(graph.edges, graph.nodes, "general-a", "LINEAGE").map((edge) => edge.id).sort()).toEqual([
      "hierarchy:commander-a:soldier-a",
      "hierarchy:entral:marshal-a",
      "hierarchy:general-a:commander-a",
      "hierarchy:marshal-a:general-a"
    ]);
    expect(canonicalEdgesForConnectionMode(graph.edges, graph.nodes, "general-a", "DIRECT").map((edge) => edge.id).sort()).toEqual([
      "hierarchy:general-a:commander-a",
      "hierarchy:marshal-a:general-a"
    ]);
    expect(canonicalEdgesForConnectionMode(graph.edges, graph.nodes, null, "DIRECT")).toEqual([]);
    expect(canonicalEdgesForConnectionMode(graph.edges, graph.nodes, null, "LINEAGE").map((edge) => edge.id).sort()).toEqual(allEdgeIds);
  });

  it("applies label modes, threshold bypasses, and the configured live-label maximum", () => {
    const graph = graphStateFromCanonicalEntities(authorityHierarchy(), 195);
    const common = {
      hoveredId: "general-b",
      labelThreshold: 0.8,
      maximumLiveLabels: 20,
      nodes: graph.nodes,
      selectedId: "general-a",
      zoomFactor: 0.1
    } as const;

    expect(canonicalLabelNodeIds({ ...common, mode: "OFF" })).toEqual([]);
    expect(canonicalLabelNodeIds({ ...common, mode: "HOVER_OR_FOCUS" })).toEqual([
      "general-a",
      "general-b"
    ]);
    expect(canonicalLabelNodeIds({ ...common, maximumLiveLabels: 1, mode: "ALWAYS" })).toEqual([
      "general-a"
    ]);
    expect(canonicalLabelNodeIds({ ...common, mode: "RELEVANT" })).toEqual([
      "general-a",
      "general-b",
      "entral",
      "marshal-a"
    ]);
  });

  it("uses LOD only to reduce presentation detail and keeps the current 132-node graph at FULL", () => {
    expect(resolveCanonicalLevelOfDetail("AUTO", current132EntityFixture().length)).toBe("FULL");
    expect(resolveCanonicalLevelOfDetail("AUTO", 1_001)).toBe("BALANCED");
    expect(resolveCanonicalLevelOfDetail("AUTO", 5_001)).toBe("AGGRESSIVE");
    expect(resolveCanonicalLevelOfDetail("FULL", 10_000)).toBe("FULL");
  });

  it("provides deterministic hierarchy keyboard traversal from a null selection", () => {
    const graph = graphStateFromCanonicalEntities(authorityHierarchy(), 195);

    expect(nextCanonicalGraphEntityId(graph.nodes, null, "right")).toBe("entral");
    expect(nextCanonicalGraphEntityId(graph.nodes, "general-a", "up")).toBe("marshal-a");
    expect(nextCanonicalGraphEntityId(graph.nodes, "general-a", "down")).toBe("commander-a");
    expect(nextCanonicalGraphEntityId(graph.nodes, "marshal-a", "right")).toBe("marshal-b");
    expect(nextCanonicalGraphEntityId(graph.nodes, "marshal-b", "left")).toBe("marshal-a");
  });

  it("derives animation delta from the last accepted frame after frame-cap skips", () => {
    expect(acceptedGraphFrameDeltaSeconds(1.033, 1)).toBeCloseTo(0.033, 6);
    expect(acceptedGraphFrameDeltaSeconds(1.016, 1)).toBeCloseTo(0.016, 6);
    expect(acceptedGraphFrameDeltaSeconds(2, 1)).toBe(0.05);
  });

  it("bounds and applies every persisted shared motion easing mode", () => {
    expect(easedGraphMotionProgress(-1, "LINEAR")).toBe(0);
    expect(easedGraphMotionProgress(2, "LINEAR")).toBe(1);
    expect(easedGraphMotionProgress(0.5, "LINEAR")).toBe(0.5);
    expect(easedGraphMotionProgress(0.5, "EASE_IN")).toBe(0.25);
    expect(easedGraphMotionProgress(0.5, "EASE_OUT")).toBe(0.75);
    expect(easedGraphMotionProgress(0.25, "EASE_IN_OUT")).toBe(0.125);
    expect(easedGraphMotionProgress(0.75, "EASE_IN_OUT")).toBe(0.875);
    expect(canonicalGraphMotionProgress(150, 300, "LINEAR")).toBe(0.5);
    expect(canonicalGraphMotionProgress(150, 300, "EASE_IN")).toBe(0.25);
    expect(canonicalGraphMotionProgress(1, 0, "EASE_IN")).toBe(1);
  });

  it("turns the full persisted edge-width range into deterministic WebGL stroke offsets", () => {
    expect(canonicalEdgeStrokeOffsets(0.25)).toEqual([0]);
    expect(canonicalEdgeStrokeOffsets(1)).toEqual([0]);
    expect(canonicalEdgeStrokeOffsets(2)).toEqual([-0.5, 0.5]);
    expect(canonicalEdgeStrokeOffsets(8)).toHaveLength(8);
    expect(canonicalEdgeStrokeOffsets(100)).toEqual(canonicalEdgeStrokeOffsets(8));
  });

  it("preserves exact 2D/3D General descendants and projection edges for all eight current Marshals", () => {
    const entities = current132EntityFixture();
    const projection = buildRendererGraphProjection(entities, {
      organizationId: "19500000-0000-4000-8000-000000000001",
      projectionVersion: 195,
      scopeKey: "organization:19500000-0000-4000-8000-000000000001"
    });
    const layout2D = layoutGraph2D(projection);
    const layout3D = layoutGraph3D(projection);
    const graph3D = graphStateFromCanonicalEntities(entities, 195, layout3D);
    const marshalIds = entities
      .filter((entity) => entity.entity_type === "MARSHAL")
      .map((entity) => entity.entity_id)
      .sort();
    const generalCounts: number[] = [];

    expect(marshalIds).toHaveLength(8);
    expect(layout2D.projectionId).toBe(projection.projectionId);
    expect(layout3D.projectionId).toBe(projection.projectionId);
    expect(layout2D.edges.map((edge) => edge.edgeId)).toEqual(
      layout3D.edges.map((edge) => edge.edgeId)
    );

    for (const marshalId of marshalIds) {
      const expectedGeneralIds = entities
        .filter((entity) =>
          entity.entity_type === "GENERAL"
          && entity.parent_id === marshalId
        )
        .map((entity) => entity.entity_id)
        .sort();
      const twoDimensionalRelatedIds = canonicalLineageAndSubtree(entities, marshalId);
      const twoDimensionalGeneralIds = entities
        .filter((entity) =>
          entity.entity_type === "GENERAL"
          && twoDimensionalRelatedIds.has(entity.entity_id)
        )
        .map((entity) => entity.entity_id)
        .sort();
      const threeDimensionalRelatedIds = relatedNodeIdsForSelection(marshalId, graph3D.nodes);
      const threeDimensionalGeneralIds = graph3D.nodes
        .filter((node) =>
          node.commandType === "general"
          && threeDimensionalRelatedIds.has(node.id)
        )
        .map((node) => node.id)
        .sort();

      expect(twoDimensionalGeneralIds).toEqual(expectedGeneralIds);
      expect(threeDimensionalGeneralIds).toEqual(expectedGeneralIds);
      expect(visibleNodeIdsForSelection(marshalId, graph3D.nodes, true).size).toBe(132);
      generalCounts.push(expectedGeneralIds.length);
    }

    expect(generalCounts).toEqual([16, 16, 16, 15, 15, 15, 15, 15]);
    expect(generalCounts.reduce((sum, count) => sum + count, 0)).toBe(123);
  });
});
