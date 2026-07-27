import "@testing-library/jest-dom/vitest";
import type { EntityRole, EntitySummary } from "@entral/contracts";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canonical2DFramePosition,
  canonical2DRenderedIdSignature,
  CanonicalUniverseGraph,
  phase195Canonical2DRenderIds
} from "../components/CanonicalUniverseGraph";
import { fitUniverseCamera } from "../lib/canonical-universe";
import { largeCanonicalFixture } from "./phase195-graph-fixtures";

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
  entities = hierarchy,
  fullscreenActive = false,
  initialSelectedEntityId = null,
  onOpenFullRecord = vi.fn()
}: {
  entities?: readonly EntitySummary[];
  fullscreenActive?: boolean;
  initialSelectedEntityId?: string | null;
  onOpenFullRecord?: (entityId: string) => void;
}) {
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(
    initialSelectedEntityId
  );
  return (
    <CanonicalUniverseGraph
      entities={entities}
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
  it("renders selected authorized detail fields and canonical child counts without a fallback summary", () => {
    const detailedHierarchy = hierarchy.map((candidate) =>
      candidate.entity_id === "general"
        ? {
            ...candidate,
            active_alert: "Authorized Phase 195 parity alert.",
            active_task_count: 3,
            child_count: 2,
            current_mission: "Coordinate authorized Phase 195 graph parity.",
            latest_material_result: {
              status: "phase195-parity-verified"
            }
          }
        : candidate
    );
    const { container } = render(
      <GraphHarness
        entities={detailedHierarchy}
        initialSelectedEntityId="general"
      />
    );
    const graph = container.querySelector("[data-graph-dimension='2d']");
    const drawer = screen.getByRole("complementary", {
      name: /general graph details/i
    });

    for (const surface of [graph, drawer]) {
      expect(surface).toHaveAttribute(
        "data-canonical-selected-entity-id",
        "general"
      );
      expect(surface).toHaveAttribute(
        "data-canonical-selected-child-count",
        "2"
      );
      expect(surface).toHaveAttribute(
        "data-canonical-selected-current-mission",
        "Coordinate authorized Phase 195 graph parity."
      );
      expect(surface).toHaveAttribute(
        "data-canonical-selected-active-alert",
        "Authorized Phase 195 parity alert."
      );
      expect(surface).toHaveAttribute(
        "data-canonical-selected-active-task-count",
        "3"
      );
      expect(surface).toHaveAttribute(
        "data-canonical-selected-latest-material-result",
        "{\"status\":\"phase195-parity-verified\"}"
      );
    }
    expect(drawer).toHaveTextContent(
      "Coordinate authorized Phase 195 graph parity."
    );
    expect(drawer).toHaveTextContent("Authorized Phase 195 parity alert.");
  });

  it("submits all 10,000 Phase 195 canonical IDs at fitted zoom and signs the exact draw set", () => {
    const entities = largeCanonicalFixture(10_000);
    const points = entities.map((candidate, index) => ({
      entity: candidate,
      x: (index % 100) * 1_000,
      y: Math.floor(index / 100) * 1_000
    }));
    const visibleIds = phase195Canonical2DRenderIds(points);
    const fitted = fitUniverseCamera(points, 1_440, 900, 48);

    expect(fitted).not.toBeNull();
    expect(fitted!.zoom).toBeLessThan(0.1);
    const renderedIds = points.flatMap((point) =>
      canonical2DFramePosition(
        point,
        visibleIds,
        fitted!,
        1_440,
        900
      )
        ? [point.entity.entity_id]
        : []
    );

    expect(renderedIds).toHaveLength(10_000);
    expect(canonical2DRenderedIdSignature(renderedIds)).toBe(
      canonical2DRenderedIdSignature(
        points.map((point) => point.entity.entity_id)
      )
    );
  });

  it("exposes an interactive graph and traverses canonical relationships by keyboard", () => {
    const openFullRecord = vi.fn();
    render(<GraphHarness onOpenFullRecord={openFullRecord} />);

    const graph = screen.getByRole("application", { name: /canonical universe graph with 5 entities/i });
    expect(graph).toHaveAccessibleDescription(/arrow up moves to the parent/i);
    expect(screen.getByText(/shift \+ arrow pans/i)).toBeVisible();

    fireEvent.keyDown(graph, { key: "ArrowDown" });
    expect(screen.getByRole("complementary", { name: /entral graph details/i })).toBeVisible();
    fireEvent.keyDown(graph, { key: "ArrowDown" });
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
    const interactionToggle = screen.getByRole("button", {
      name: "Interact with 2D Graph"
    });

    expect(graph).toHaveAttribute("data-touch-interaction", "page");
    expect(interactionToggle).toHaveClass("phase180-surface-action");
    expect(interactionToggle.closest(".phase180-surface-actions")).not.toBeNull();
    expect(interactionToggle.closest(".phase180-graph-toolbar")).toBeNull();
    fireEvent.click(interactionToggle);
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

  it("uses the complete high-range zoom envelope from the visible controls", () => {
    render(<GraphHarness />);
    const zoomIn = screen.getByRole("button", { name: "Zoom in 2D Graph" });
    const zoomOut = screen.getByRole("button", { name: "Zoom out 2D Graph" });

    for (let index = 0; index < 30; index += 1) fireEvent.click(zoomIn);
    fireEvent.click(screen.getByRole("button", { name: /settings/i }));
    expect(screen.getByText("6,400%")).toBeVisible();

    for (let index = 0; index < 100; index += 1) fireEvent.click(zoomOut);
    expect(screen.getByText("1.00e-6")).toBeVisible();
  });
});
