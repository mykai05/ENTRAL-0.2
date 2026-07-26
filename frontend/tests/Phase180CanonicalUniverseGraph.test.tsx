import "@testing-library/jest-dom/vitest";
import type { EntityRole, EntitySummary } from "@entral/contracts";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CanonicalUniverseGraph } from "../components/CanonicalUniverseGraph";

function entity(
  entityId: string,
  role: EntityRole,
  parentId: string | null
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
    version: 1
  };
}

const hierarchy = [
  entity("entral", "ENTRAL", null),
  entity("marshal", "MARSHAL", "entral"),
  entity("general", "GENERAL", "marshal"),
  entity("commander-a", "COMMANDER", "general"),
  entity("commander-b", "COMMANDER", "general")
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
  if (!HTMLCanvasElement.prototype.setPointerCapture) {
    Object.defineProperty(HTMLCanvasElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn()
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function GraphHarness({
  fullscreenActive = false,
  onOpenFullRecord = vi.fn()
}: {
  fullscreenActive?: boolean;
  onOpenFullRecord?: (entityId: string) => void;
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  return (
    <CanonicalUniverseGraph
      entities={hierarchy}
      eventSequence={9}
      fullscreenActive={fullscreenActive}
      movementPaused={false}
      onOpenFullRecord={onOpenFullRecord}
      onSelectedEntityChange={setSelectedEntityId}
      selectedEntityId={selectedEntityId}
    />
  );
}

describe("Phase 180 Canonical Universe Graph interaction semantics", () => {
  it("exposes an interactive graph and traverses canonical relationships by keyboard", () => {
    const openFullRecord = vi.fn();
    render(<GraphHarness onOpenFullRecord={openFullRecord} />);

    const graph = screen.getByRole("application", { name: /canonical universe graph with 5 entities/i });
    expect(graph).toHaveAccessibleDescription(/arrow keys move between related nodes/i);
    expect(screen.getByText(/shift \+ arrow pans/i)).toBeVisible();

    fireEvent.keyDown(graph, { key: "ArrowRight" });
    expect(screen.getByRole("complementary", { name: /entral graph details/i })).toBeVisible();
    fireEvent.keyDown(graph, { key: "ArrowRight" });
    expect(screen.getByRole("complementary", { name: /marshal graph details/i })).toBeVisible();
    fireEvent.keyDown(graph, { key: "Enter" });
    expect(openFullRecord).toHaveBeenCalledWith("marshal");
  });

  it("implements combobox active-option and committed-selection state", () => {
    render(<GraphHarness />);
    const search = screen.getByRole("combobox", { name: /search canonical entities/i });

    fireEvent.change(search, { target: { value: "commander" } });
    expect(search).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(search, { key: "ArrowDown" });
    expect(search).toHaveAttribute(
      "aria-activedescendant",
      "phase180-graph-search-results-option-1"
    );
    fireEvent.keyDown(search, { key: "Enter" });
    expect(screen.getByRole("complementary", { name: /commander-b graph details/i })).toBeVisible();

    fireEvent.focus(search);
    const selectedOption = screen.getByRole("option", { name: /commander-b/i });
    expect(selectedOption).toHaveAttribute("aria-selected", "true");
  });

  it("keeps ordinary page wheel scrolling available while retaining deliberate graph zoom", () => {
    const { rerender } = render(<GraphHarness />);
    const graph = screen.getByRole("application", { name: /canonical universe graph with 5 entities/i });
    const ordinaryWheel = createEvent.wheel(graph, { bubbles: true, cancelable: true, deltaY: 120 });

    fireEvent(graph, ordinaryWheel);
    expect(ordinaryWheel.defaultPrevented).toBe(false);

    const modifiedWheel = createEvent.wheel(graph, {
      bubbles: true,
      cancelable: true,
      ctrlKey: true,
      deltaY: 120
    });
    fireEvent(graph, modifiedWheel);
    expect(modifiedWheel.defaultPrevented).toBe(true);

    rerender(<GraphHarness fullscreenActive />);
    const fullscreenWheel = createEvent.wheel(graph, { bubbles: true, cancelable: true, deltaY: 120 });
    fireEvent(graph, fullscreenWheel);
    expect(fullscreenWheel.defaultPrevented).toBe(true);
  });

  it("defaults touch input to page scrolling and only captures it after explicit activation", () => {
    render(<GraphHarness />);
    const graph = screen.getByRole("application", { name: /canonical universe graph with 5 entities/i });

    expect(graph).toHaveAttribute("data-touch-interaction", "page");
    fireEvent.click(screen.getByRole("button", { name: "Interact with 2D Graph" }));
    expect(graph).toHaveAttribute("data-touch-interaction", "graph");
    fireEvent.click(screen.getByRole("button", { name: "Release 2D Graph touch controls" }));
    expect(graph).toHaveAttribute("data-touch-interaction", "page");
  });

  it("clears a canceled pointer gesture without selecting an entity", () => {
    render(<GraphHarness />);
    const graph = screen.getByRole("application", { name: /canonical universe graph with 5 entities/i });

    fireEvent.pointerDown(graph, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerCancel(graph, { clientX: 0, clientY: 0, pointerId: 1 });
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
