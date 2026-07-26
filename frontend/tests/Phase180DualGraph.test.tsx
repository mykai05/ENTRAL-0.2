import "@testing-library/jest-dom/vitest";
import type { EntityRole, EntitySummary } from "@entral/contracts";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanonicalGraphWorkspace } from "../components/CanonicalGraphWorkspace";
import {
  graphStateFromCanonicalEntities,
  reconcileCanonicalGraphPositions
} from "../components/NeuronsCommandCenter";

vi.mock("../components/CanonicalUniverse3DGraph", () => ({
  CanonicalUniverse3DGraph: ({
    entities,
    eventSequence,
    movementPaused,
    selectedEntityId
  }: {
    entities: readonly EntitySummary[];
    eventSequence: number;
    movementPaused: boolean;
    selectedEntityId: string | null;
  }) => (
    <section
      data-canonical-entity-count={entities.length}
      data-canonical-event-sequence={eventSequence}
      data-graph-motion={movementPaused ? "paused" : "running"}
      data-selected-entity-id={selectedEntityId ?? ""}
      data-testid="canonical-3d-graph"
    >
      <h2>3D Graph</h2>
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
  it("keeps both renderers visible with one entity array, event sequence, and selection", () => {
    render(
      <CanonicalGraphWorkspace
        entities={hierarchy}
        eventSequence={173}
        onOpenFullRecord={vi.fn()}
        onPreferredDimensionChange={vi.fn()}
        onSelectedEntityChange={vi.fn()}
        preferredDimension={null}
        selectedEntityId="soldier"
      />
    );

    expect(screen.getByRole("heading", { name: "2D Graph" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "3D Graph" })).toBeVisible();
    const twoDimensional = screen.getByRole("region", { name: "2D Graph" });
    const threeDimensional = screen.getByTestId("canonical-3d-graph");
    expect(twoDimensional).toHaveAttribute("data-canonical-entity-count", "5");
    expect(twoDimensional).toHaveAttribute("data-canonical-event-sequence", "173");
    expect(threeDimensional).toHaveAttribute("data-canonical-entity-count", "5");
    expect(threeDimensional).toHaveAttribute("data-canonical-event-sequence", "173");
    expect(threeDimensional).toHaveAttribute("data-selected-entity-id", "soldier");
  });

  it("pauses only visual movement while keeping agent activity and live updates explicit", () => {
    const { container, rerender } = render(
      <CanonicalGraphWorkspace
        entities={hierarchy}
        eventSequence={173}
        onOpenFullRecord={vi.fn()}
        onPreferredDimensionChange={vi.fn()}
        onSelectedEntityChange={vi.fn()}
        preferredDimension={null}
        selectedEntityId={null}
      />
    );
    const workspace = container.querySelector(".phase180-graph-workspace");
    const stop = screen.getByRole("button", { name: "Stop movement" });

    expect(stop).toHaveAttribute("aria-pressed", "false");
    expect(workspace).toHaveAttribute("data-graph-motion", "running");
    expect(screen.getByTestId("canonical-3d-graph")).toHaveAttribute("data-graph-motion", "running");

    fireEvent.click(stop);

    expect(screen.getByRole("button", { name: "Resume movement" })).toHaveAttribute("aria-pressed", "true");
    expect(workspace).toHaveAttribute("data-graph-motion", "paused");
    expect(screen.getByRole("region", { name: "2D Graph" })).toHaveAttribute("data-graph-motion", "paused");
    expect(screen.getByTestId("canonical-3d-graph")).toHaveAttribute("data-graph-motion", "paused");
    expect(screen.getByText(/Agent activity and live canonical updates continue/i)).toBeVisible();

    const updatedHierarchy = [
      ...hierarchy,
      entity("soldier-two", "SOLDIER", "commander", { current_mission: "Continue working" })
    ];
    rerender(
      <CanonicalGraphWorkspace
        entities={updatedHierarchy}
        eventSequence={174}
        onOpenFullRecord={vi.fn()}
        onPreferredDimensionChange={vi.fn()}
        onSelectedEntityChange={vi.fn()}
        preferredDimension={null}
        selectedEntityId={null}
      />
    );

    expect(workspace).toHaveAttribute("data-graph-motion", "paused");
    expect(screen.getByRole("region", { name: "2D Graph" })).toHaveAttribute(
      "data-canonical-event-sequence",
      "174"
    );
    expect(screen.getByTestId("canonical-3d-graph")).toHaveAttribute("data-canonical-entity-count", "6");
    expect(screen.getByTestId("canonical-3d-graph")).toHaveAttribute("data-canonical-event-sequence", "174");
  });

  it("reports device reduced-motion as an effective graph pause without implying agent inactivity", () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      addEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      removeEventListener: vi.fn()
    })));
    const { container } = render(
      <CanonicalGraphWorkspace
        entities={hierarchy}
        eventSequence={173}
        onOpenFullRecord={vi.fn()}
        onPreferredDimensionChange={vi.fn()}
        onSelectedEntityChange={vi.fn()}
        preferredDimension={null}
        selectedEntityId={null}
      />
    );

    expect(container.querySelector(".phase180-graph-workspace")).toHaveAttribute("data-graph-motion", "paused");
    expect(screen.getByRole("button", { name: "Movement paused" })).toBeDisabled();
    expect(screen.getByText(/paused by your reduced-motion setting/i)).toHaveTextContent(
      /Agent activity and live canonical updates continue/i
    );
    expect(screen.getByTestId("canonical-3d-graph")).toHaveAttribute("data-graph-motion", "paused");
  });

  it("offers a clean side-by-side or stacked layout without unmounting either graph", () => {
    const { container } = render(
      <CanonicalGraphWorkspace
        entities={hierarchy}
        eventSequence={173}
        onOpenFullRecord={vi.fn()}
        onPreferredDimensionChange={vi.fn()}
        onSelectedEntityChange={vi.fn()}
        preferredDimension={null}
        selectedEntityId={null}
      />
    );
    const workspace = container.querySelector(".phase180-graph-workspace");

    expect(workspace).toHaveAttribute("data-graph-layout", "side-by-side");
    expect(screen.getByRole("button", { name: "Side by side" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Stacked" }));
    expect(workspace).toHaveAttribute("data-graph-layout", "stacked");
    expect(screen.getByRole("heading", { name: "2D Graph" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "3D Graph" })).toBeVisible();
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

  it("applies status-only canonical updates without moving established 3D nodes", () => {
    const current = graphStateFromCanonicalEntities(hierarchy, 173);
    const movedCurrent = {
      ...current,
      nodes: current.nodes.map((node) => node.id === "soldier"
        ? { ...node, vx: 3, vy: 4, vz: 5, x: 321, y: -45, z: 678 }
        : node)
    };
    const updatedHierarchy: EntitySummary[] = [
      ...hierarchy.map((candidate) => candidate.entity_id === "soldier"
        ? { ...candidate, health: "HEALTHY" as const, status: "ACTIVE" as const, version: 8 }
        : candidate),
      entity("soldier-two", "SOLDIER", "commander")
    ];
    const seededUpdate = graphStateFromCanonicalEntities(updatedHierarchy, 174);
    const reconciled = reconcileCanonicalGraphPositions(seededUpdate, movedCurrent);

    expect(reconciled.nodes.find((node) => node.id === "soldier")).toMatchObject({
      canonicalVersion: 8,
      health: 100,
      status: "working",
      vx: 3,
      vy: 4,
      vz: 5,
      x: 321,
      y: -45,
      z: 678
    });
    expect(reconciled.nodes.find((node) => node.id === "soldier")?.memory.notes)
      .toContain("Canonical event: 174");
    expect(reconciled.nodes.find((node) => node.id === "soldier-two")).toMatchObject(
      seededUpdate.nodes.find((node) => node.id === "soldier-two") ?? {}
    );
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
