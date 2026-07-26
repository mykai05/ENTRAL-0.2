import "@testing-library/jest-dom/vitest";
import type { EntityRole, EntitySummary } from "@entral/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanonicalGraphWorkspace } from "../components/CanonicalGraphWorkspace";
import { graphStateFromCanonicalEntities } from "../components/NeuronsCommandCenter";

vi.mock("../components/CanonicalUniverse3DGraph", () => ({
  CanonicalUniverse3DGraph: ({
    entities,
    eventSequence,
    selectedEntityId
  }: {
    entities: readonly EntitySummary[];
    eventSequence: number;
    selectedEntityId: string | null;
  }) => (
    <section
      data-canonical-entity-count={entities.length}
      data-canonical-event-sequence={eventSequence}
      data-selected-entity-id={selectedEntityId ?? ""}
      data-testid="canonical-3d-graph"
    >
      <h1>3D Graph</h1>
    </section>
  )
}));

function entity(
  entityId: string,
  role: EntityRole,
  parentId: string | null,
  overrides: Partial<EntitySummary> = {}
): EntitySummary {
  return {
    active_alert: null,
    active_task_count: 0,
    assigned_business_id: null,
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
    version: 1,
    ...overrides
  };
}

const hierarchy = [
  entity("root-uuid", "ENTRAL", null, { child_count: 1, name: "ENTRAL", stable_code: "ENTRAL.CORE" }),
  entity("marshal", "MARSHAL", "root-uuid", { child_count: 1 }),
  entity("general", "GENERAL", "marshal", { child_count: 1 }),
  entity("commander", "COMMANDER", "general", { child_count: 1 }),
  entity("soldier", "SOLDIER", "commander", {
    active_alert: "Awaiting evidence",
    active_task_count: 2,
    compute_tier: "priority",
    current_mission: "Verify the release",
    health: "WATCH",
    latest_material_result: { status: "verified" },
    model_class: "reasoning",
    status: "PAUSED",
    version: 7
  })
];

class ResizeObserverStub {
  disconnect() {}
  observe() {}
  unobserve() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Phase 180 dual canonical Graph views", () => {
  it("switches labels while passing one entity array, event sequence, and selection to both renderers", () => {
    const onDimensionChange = vi.fn();
    const { rerender } = render(
      <CanonicalGraphWorkspace
        dimension="2d"
        entities={hierarchy}
        eventSequence={173}
        onDimensionChange={onDimensionChange}
        onOpenFullRecord={vi.fn()}
        onSelectedEntityChange={vi.fn()}
        selectedEntityId="soldier"
      />
    );

    expect(screen.getByRole("heading", { name: "2D Graph" })).toBeVisible();
    expect(screen.getByRole("button", { name: "2D Graph" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "3D Graph" })).toHaveAttribute("aria-pressed", "false");
    const twoDimensional = screen.getByRole("region", { name: "2D Graph" });
    expect(twoDimensional).toHaveAttribute("data-canonical-entity-count", "5");
    expect(twoDimensional).toHaveAttribute("data-canonical-event-sequence", "173");

    fireEvent.click(screen.getByRole("button", { name: "3D Graph" }));
    expect(onDimensionChange).toHaveBeenCalledWith("3d");

    rerender(
      <CanonicalGraphWorkspace
        dimension="3d"
        entities={hierarchy}
        eventSequence={173}
        onDimensionChange={onDimensionChange}
        onOpenFullRecord={vi.fn()}
        onSelectedEntityChange={vi.fn()}
        selectedEntityId="soldier"
      />
    );
    const threeDimensional = screen.getByTestId("canonical-3d-graph");
    expect(screen.getByRole("heading", { name: "3D Graph" })).toBeVisible();
    expect(threeDimensional).toHaveAttribute("data-canonical-entity-count", "5");
    expect(threeDimensional).toHaveAttribute("data-canonical-event-sequence", "173");
    expect(threeDimensional).toHaveAttribute("data-selected-entity-id", "soldier");
  });

  it("adapts every canonical record into the original 3D graph without changing canonical identity or evidence", () => {
    const graph = graphStateFromCanonicalEntities(hierarchy, 173);

    expect(graph.nodes).toHaveLength(hierarchy.length);
    expect(new Set(graph.nodes.map((node) => node.canonicalEntityId))).toEqual(
      new Set(hierarchy.map((candidate) => candidate.entity_id))
    );
    expect(graph.edges).toHaveLength(hierarchy.length - 1);
    expect(graph.nodes.find((node) => node.canonicalEntityId === "root-uuid")).toMatchObject({
      id: "entral",
      name: "ENTRAL",
      type: "core"
    });
    expect(graph.nodes.find((node) => node.canonicalEntityId === "soldier")).toMatchObject({
      canonicalVersion: 7,
      currentTask: "Verify the release",
      health: 72,
      memory: {
        taskResults: ['{"status":"verified"}']
      },
      parentId: "commander",
      stableCode: "soldier",
      status: "waiting"
    });
    expect(graph.nodes.find((node) => node.canonicalEntityId === "soldier")?.memory.notes)
      .toContain("Canonical event: 173");
  });

  it("keeps canonical-to-3D adaptation linear enough for the 10000-entity scale contract", () => {
    const large: EntitySummary[] = [entity("root", "ENTRAL", null)];
    for (let index = 0; index < 9_999; index += 1) {
      large.push(entity(`soldier-${index}`, "SOLDIER", "root"));
    }

    const started = performance.now();
    const graph = graphStateFromCanonicalEntities(large, 174);
    expect(graph.nodes).toHaveLength(10_000);
    expect(graph.edges).toHaveLength(9_999);
    expect(performance.now() - started).toBeLessThan(750);
  });
});
