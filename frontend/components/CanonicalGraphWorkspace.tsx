"use client";

import type { EntitySummary } from "@entral/contracts";
import { ChevronDown, Columns2, PauseCircle, PlayCircle, Rows3 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { CanonicalUniverse3DGraph } from "./CanonicalUniverse3DGraph";
import { CanonicalUniverseGraph } from "./CanonicalUniverseGraph";

export type CanonicalGraphLayout = "side-by-side" | "stacked";
export type CanonicalGraphDimension = "2d" | "3d";

export function CanonicalGraphWorkspace({
  entities,
  eventSequence,
  onOpenFullRecord,
  onPreferredDimensionChange,
  onSelectedEntityChange,
  preferredDimension,
  selectedEntityId
}: {
  entities: readonly EntitySummary[];
  eventSequence: number;
  onOpenFullRecord: (entityId: string) => void;
  onPreferredDimensionChange: (dimension: CanonicalGraphDimension) => void;
  onSelectedEntityChange: (entityId: string | null) => void;
  preferredDimension: CanonicalGraphDimension | null;
  selectedEntityId: string | null;
}) {
  const [layout, setLayout] = useState<CanonicalGraphLayout>("side-by-side");
  const [movementPaused, setMovementPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const twoDimensionalPanelRef = useRef<HTMLDivElement>(null);
  const threeDimensionalPanelRef = useRef<HTMLDivElement>(null);
  const effectiveMovementPaused = movementPaused || reducedMotion;

  function graphScrollBehavior(): ScrollBehavior {
    return reducedMotion ? "auto" : "smooth";
  }

  function focusPanel(dimension: CanonicalGraphDimension) {
    onPreferredDimensionChange(dimension);
    const panel = dimension === "2d" ? twoDimensionalPanelRef.current : threeDimensionalPanelRef.current;
    panel?.scrollIntoView({ behavior: graphScrollBehavior(), block: "start" });
    panel?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const synchronizePreference = () => setReducedMotion(preference.matches);

    synchronizePreference();
    preference.addEventListener("change", synchronizePreference);
    return () => preference.removeEventListener("change", synchronizePreference);
  }, []);

  useEffect(() => {
    if (!preferredDimension) return;
    const frame = window.requestAnimationFrame(() => {
      const panel = preferredDimension === "2d" ? twoDimensionalPanelRef.current : threeDimensionalPanelRef.current;
      panel?.scrollIntoView({ behavior: graphScrollBehavior(), block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [preferredDimension]);

  return (
    <section
      aria-labelledby="phase180-universe-workspace-heading"
      className="phase180-graph-workspace"
      data-canonical-entity-count={entities.length}
      data-canonical-event-sequence={eventSequence}
      data-graph-layout={layout}
      data-graph-motion={effectiveMovementPaused ? "paused" : "running"}
    >
      <header className="phase180-graph-control-bar">
        <div className="phase180-graph-control-title">
          <span>Universe workspace</span>
          <h1 id="phase180-universe-workspace-heading">2D + 3D Universe Graph</h1>
          <small>One canonical snapshot · synchronized selection · independent camera controls</small>
        </div>
        <button
          aria-pressed={effectiveMovementPaused}
          className="phase180-motion-toggle"
          data-state={effectiveMovementPaused ? "paused" : "running"}
          disabled={reducedMotion}
          onClick={() => setMovementPaused((paused) => !paused)}
          title={reducedMotion ? "Movement is paused by your device reduced-motion setting." : undefined}
          type="button"
        >
          {movementPaused && !reducedMotion
            ? <PlayCircle aria-hidden="true" size={19} />
            : <PauseCircle aria-hidden="true" size={19} />}
          {reducedMotion ? "Movement paused" : movementPaused ? "Resume movement" : "Stop movement"}
        </button>
        <div aria-label="Graph layout" className="phase180-graph-layout-controls" role="group">
          <button
            aria-pressed={layout === "side-by-side"}
            onClick={() => setLayout("side-by-side")}
            type="button"
          >
            <Columns2 aria-hidden="true" size={17} /> Side by side
          </button>
          <button
            aria-pressed={layout === "stacked"}
            onClick={() => setLayout("stacked")}
            type="button"
          >
            <Rows3 aria-hidden="true" size={17} /> Stacked
          </button>
        </div>
        <div aria-label="Jump to graph" className="phase180-graph-focus-controls" role="group">
          <button onClick={() => focusPanel("2d")} type="button">Jump to 2D</button>
          <button onClick={() => focusPanel("3d")} type="button">Jump to 3D</button>
        </div>
        <details className="phase180-graph-control-guide">
          <summary><ChevronDown aria-hidden="true" className="phase180-guide-chevron" size={17} /> Control guide</summary>
          <div>
            <p><strong>2D:</strong> drag or use one finger to pan, scroll or pinch to zoom, and use Arrow keys to move through the hierarchy.</p>
            <p><strong>3D:</strong> Desktop: left-drag to orbit, right-drag to pan, and scroll to zoom. Touch: one finger pans; two fingers orbit and pinch-zoom.</p>
            <p><strong>Stop movement:</strong> freezes visual animation only. Agent work, status updates, and canonical synchronization continue.</p>
          </div>
        </details>
      </header>
      <p aria-live="polite" className="phase180-graph-motion-status" role="status">
        {reducedMotion
          ? "Graph movement paused by your reduced-motion setting. Agent activity and live canonical updates continue."
          : movementPaused
          ? "Graph movement paused. Agent activity and live canonical updates continue."
          : "Graph movement active. Use Stop movement for a stable inspection view."}
      </p>
      <div className="phase180-graph-panels" data-layout={layout}>
        <div
          className="phase180-graph-panel"
          data-panel="2d"
          ref={twoDimensionalPanelRef}
          tabIndex={-1}
        >
        <CanonicalUniverseGraph
          entities={entities}
          eventSequence={eventSequence}
          movementPaused={effectiveMovementPaused}
          onOpenFullRecord={onOpenFullRecord}
          onSelectedEntityChange={onSelectedEntityChange}
          selectedEntityId={selectedEntityId}
        />
        </div>
        <div
          className="phase180-graph-panel"
          data-panel="3d"
          ref={threeDimensionalPanelRef}
          tabIndex={-1}
        >
          <CanonicalUniverse3DGraph
            entities={entities}
            eventSequence={eventSequence}
            movementPaused={effectiveMovementPaused}
            onOpenFullRecord={onOpenFullRecord}
            onSelectedEntityChange={onSelectedEntityChange}
            selectedEntityId={selectedEntityId}
          />
        </div>
      </div>
    </section>
  );
}
