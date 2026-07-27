import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CanonicalGraphSemanticsOverlay
} from "../components/CanonicalGraphSemanticsOverlay";
import { CanonicalUniverseGraph } from "../components/CanonicalUniverseGraph";
import { layoutGraph2D } from "../lib/graph-layouts";
import { buildRendererGraphProjection } from "../lib/graph-projection";
import { authorityHierarchy } from "./phase195-graph-fixtures";
import { phase195DualGraphVisualGoldenSvg } from "./phase195-graph-visual-golden";

class TestResizeObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
}

describe("Phase 195 graph semantic and visual regression contract", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", TestResizeObserver);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the same five visible authority tiers and compact semantics for both graph dimensions", () => {
    const entities = authorityHierarchy();
    const { container } = render(
      <>
        <CanonicalGraphSemanticsOverlay dimension="2D" entities={entities} />
        <CanonicalGraphSemanticsOverlay dimension="3D" entities={entities} />
      </>
    );

    for (const dimension of ["2D", "3D"] as const) {
      const tiers = screen.getByRole("list", {
        name: `${dimension} authority tier and ring labels`
      });
      const items = within(tiers).getAllByRole("listitem");
      expect(items).toHaveLength(5);
      expect(items.map((item) => item.getAttribute("data-authority-role"))).toEqual([
        "ENTRAL",
        "MARSHAL",
        "GENERAL",
        "COMMANDER",
        "SOLDIER"
      ]);
      expect(items.map((item) => item.getAttribute("aria-label"))).toEqual([
        "Tier 0: ENTRAL, 1 visible entity",
        "Tier 1: MARSHAL, 2 visible entities",
        "Tier 2: GENERAL, 2 visible entities",
        "Tier 3: COMMANDER, 2 visible entities",
        "Tier 4: SOLDIER, 2 visible entities"
      ]);
      const semantics = screen.getByRole("list", {
        name: `${dimension} graph visual semantics`
      });
      expect(within(semantics).getAllByRole("listitem")).toHaveLength(4);
      expect(semantics).toHaveTextContent("Authority runs inner to outer");
      expect(semantics).toHaveTextContent("Parent to child edge");
      expect(semantics).toHaveTextContent("White halo marks selection");
      expect(semantics).toHaveTextContent("Tooltip names health and status");
    }

    expect(container.querySelectorAll("[data-graph-semantics-dimension]")).toHaveLength(2);
  });

  it("associates the 2D canvas with a keyboard-accessible tooltip containing non-color semantics", () => {
    const entities = authorityHierarchy();
    const projection = buildRendererGraphProjection(entities);
    render(
      <CanonicalUniverseGraph
        entities={entities}
        eventSequence={195}
        layout={layoutGraph2D(projection)}
        movementPaused
        onOpenFullRecord={() => undefined}
        onSelectedEntityChange={() => undefined}
        selectedEntityId="general-a"
      />
    );

    const canvas = screen.getByRole("application", {
      name: "Canonical Universe Graph with 9 entities"
    });
    fireEvent.focus(canvas);
    const tooltip = screen.getByRole("tooltip");

    expect(tooltip).toHaveAttribute("id", "canonical-2d-node-tooltip");
    expect(canvas.getAttribute("aria-describedby")).toContain(
      "canonical-2d-node-tooltip"
    );
    expect(tooltip).toHaveTextContent("Tier 2");
    expect(tooltip).toHaveTextContent("GENERAL");
    expect(tooltip).toHaveTextContent("Status ACTIVE");
    expect(tooltip).toHaveTextContent("Health HEALTHY");
    expect(tooltip).toHaveTextContent("white halo");
  });

  it("uses level bands for hierarchy tree and obeys the shared legend visibility setting", () => {
    const { container } = render(
      <>
        <CanonicalGraphSemanticsOverlay
          dimension="2D"
          entities={authorityHierarchy()}
          legendVisible={false}
          pattern="hierarchy-tree"
        />
        <CanonicalGraphSemanticsOverlay
          dimension="3D"
          entities={authorityHierarchy()}
          legendVisible={false}
          pattern="authority-rings"
        />
      </>
    );
    const levels = screen.getByRole("list", {
      name: "2D authority tier and level labels"
    });

    expect(levels).toHaveAttribute("data-authority-guide", "bands");
    expect(container.querySelector(
      '[data-graph-semantics-dimension="2d"]'
    )).toHaveAttribute("data-authority-guide", "bands");
    expect(screen.queryByRole("list", {
      name: "2D graph visual semantics"
    })).not.toBeInTheDocument();
    expect(screen.queryByRole("list", {
      name: "3D graph visual semantics"
    })).not.toBeInTheDocument();
    expect(within(levels).getAllByRole("listitem")).toHaveLength(5);
  });

  it("keeps the embedded 3D hover tooltip visible, associated, and non-color-only", () => {
    const rendererSource = readFileSync(
      resolve(process.cwd(), "components", "NeuronsCommandCenter.tsx"),
      "utf8"
    );
    const phaseCss = readFileSync(
      resolve(process.cwd(), "app", "phase180.css"),
      "utf8"
    );

    expect(rendererSource).toContain(
      'activeTooltip ? "command-center-node-tooltip" : null'
    );
    expect(rendererSource).toContain(
      "onFocus={() => setCanvasKeyboardTooltipActive(true)}"
    );
    expect(rendererSource).toContain('id="command-center-node-tooltip"');
    expect(rendererSource).toContain('role="tooltip"');
    expect(rendererSource).toContain("`Tier ${activeTooltip.tier} / `");
    expect(rendererSource).toContain("Health {activeTooltip.healthState");
    expect(rendererSource).toContain("Status {activeTooltip.statusState");
    expect(phaseCss).toMatch(
      /\.phase180-embedded-3d > \.command-node-tooltip\s*\{\s*display: grid !important;/
    );
  });

  it("matches the checked-in deterministic dual-graph visual golden", () => {
    const entities = authorityHierarchy();
    const generated = phase195DualGraphVisualGoldenSvg(entities);
    const checkedIn = readFileSync(
      resolve(
        process.cwd(),
        "tests",
        "goldens",
        "phase195-dual-graph-authority.svg"
      )
    );

    expect(Buffer.from(generated, "utf8")).toEqual(checkedIn);
  });
});
