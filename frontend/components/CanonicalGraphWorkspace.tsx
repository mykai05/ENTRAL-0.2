"use client";

import type { EntitySummary } from "@entral/contracts";
import { ChevronDown, Columns2, PauseCircle, PlayCircle, Rows3 } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { CanonicalUniverse3DGraph } from "./CanonicalUniverse3DGraph";
import { CanonicalUniverseGraph } from "./CanonicalUniverseGraph";

export type CanonicalGraphLayout = "side-by-side" | "stacked";
export type CanonicalGraphDimension = "2d" | "3d";
export type CanonicalGraphAssistantCommand =
  | { readonly id: number; readonly type: "collapse-inspector"; readonly collapsed: boolean }
  | { readonly id: number; readonly type: "fullscreen"; readonly dimension: CanonicalGraphDimension | null }
  | { readonly id: number; readonly type: "layout"; readonly layout: CanonicalGraphLayout }
  | { readonly id: number; readonly type: "motion"; readonly paused: boolean }
  | { readonly id: number; readonly type: "select"; readonly entityId: string };
export type CanonicalGraphAssistantCommandInput =
  CanonicalGraphAssistantCommand extends infer Command
    ? Command extends { readonly id: number }
      ? Omit<Command, "id">
      : never
    : never;

export function CanonicalGraphWorkspace({
  assistantCommand,
  entities,
  eventSequence,
  onOpenFullRecord,
  onPreferredDimensionChange,
  onSelectedEntityChange,
  preferredDimension,
  selectedEntityId
}: {
  assistantCommand?: CanonicalGraphAssistantCommand | null;
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
  const [fullscreenDimension, setFullscreenDimension] = useState<CanonicalGraphDimension | null>(null);
  const [usesViewportFallback, setUsesViewportFallback] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const [inspectorCollapsed, setInspectorCollapsed] = useState(true);
  const workspaceRef = useRef<HTMLElement>(null);
  const twoDimensionalPanelRef = useRef<HTMLDivElement>(null);
  const threeDimensionalPanelRef = useRef<HTMLDivElement>(null);
  const fullscreenTriggerRef = useRef<HTMLButtonElement | null>(null);
  const handledAssistantCommandRef = useRef<number | null>(null);
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

  const toggleFullscreen = useCallback(async (
    dimension: CanonicalGraphDimension,
    trigger?: HTMLButtonElement | null
  ) => {
    const shell =
      workspaceRef.current?.closest<HTMLElement>(".phase180-shell") ??
      workspaceRef.current;
    if (!(shell instanceof HTMLElement)) {
      setFullscreenError("The graph could not locate its fullscreen surface.");
      return;
    }

    setFullscreenError("");
    fullscreenTriggerRef.current = trigger ?? fullscreenTriggerRef.current;

    if (fullscreenDimension === dimension) {
      if (document.fullscreenElement === shell) {
        if (typeof document.exitFullscreen !== "function") {
          setFullscreenError("Use the browser Escape control to exit full screen.");
          return;
        }
        try {
          await document.exitFullscreen();
        } catch {
          setFullscreenError("The browser could not exit full screen. Press Escape to return.");
        }
        return;
      }
      setUsesViewportFallback(false);
      setFullscreenDimension(null);
      window.requestAnimationFrame(() => fullscreenTriggerRef.current?.focus());
      return;
    }

    setFullscreenDimension(dimension);
    if (document.fullscreenElement === shell) {
      setUsesViewportFallback(false);
      return;
    }
    if (typeof shell.requestFullscreen !== "function") {
      setUsesViewportFallback(true);
      return;
    }

    try {
      await shell.requestFullscreen();
      setUsesViewportFallback(false);
    } catch {
      setUsesViewportFallback(true);
      setFullscreenError("Browser fullscreen was unavailable, so ENTRAL opened the graph in a full-window view.");
    }
  }, [fullscreenDimension]);

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

  useEffect(() => {
    function synchronizeFullscreen() {
      const shell =
        workspaceRef.current?.closest<HTMLElement>(".phase180-shell") ??
        workspaceRef.current;
      if (document.fullscreenElement === shell) return;
      if (!usesViewportFallback) {
        setFullscreenDimension(null);
        window.requestAnimationFrame(() => fullscreenTriggerRef.current?.focus());
      }
    }

    function exitViewportFallback(event: KeyboardEvent) {
      if (event.key !== "Escape" || !usesViewportFallback) return;
      setUsesViewportFallback(false);
      setFullscreenDimension(null);
      window.requestAnimationFrame(() => fullscreenTriggerRef.current?.focus());
    }

    document.addEventListener("fullscreenchange", synchronizeFullscreen);
    window.addEventListener("keydown", exitViewportFallback);
    return () => {
      document.removeEventListener("fullscreenchange", synchronizeFullscreen);
      window.removeEventListener("keydown", exitViewportFallback);
    };
  }, [usesViewportFallback]);

  useEffect(() => {
    if (!usesViewportFallback) return undefined;
    const shell =
      workspaceRef.current?.closest<HTMLElement>(".phase180-shell") ??
      workspaceRef.current;
    const previousOverflow = document.body.style.overflow;
    shell?.setAttribute("data-graph-fullscreen-fallback", "true");
    document.body.style.overflow = "hidden";
    return () => {
      shell?.removeAttribute("data-graph-fullscreen-fallback");
      document.body.style.overflow = previousOverflow;
    };
  }, [usesViewportFallback]);

  useEffect(() => {
    if (!assistantCommand || handledAssistantCommandRef.current === assistantCommand.id) return;
    handledAssistantCommandRef.current = assistantCommand.id;

    if (assistantCommand.type === "motion") setMovementPaused(assistantCommand.paused);
    if (assistantCommand.type === "layout") setLayout(assistantCommand.layout);
    if (assistantCommand.type === "select") onSelectedEntityChange(assistantCommand.entityId);
    if (assistantCommand.type === "collapse-inspector") setInspectorCollapsed(assistantCommand.collapsed);
    if (assistantCommand.type === "fullscreen") {
      if (assistantCommand.dimension) {
        void toggleFullscreen(assistantCommand.dimension);
      } else if (fullscreenDimension) {
        void toggleFullscreen(fullscreenDimension);
      }
    }
  }, [assistantCommand, fullscreenDimension, onSelectedEntityChange, toggleFullscreen]);

  return (
    <section
      aria-labelledby="phase180-universe-workspace-heading"
      className="phase180-graph-workspace"
      data-canonical-entity-count={entities.length}
      data-canonical-event-sequence={eventSequence}
      data-graph-layout={layout}
      data-graph-motion={effectiveMovementPaused ? "paused" : "running"}
      data-fullscreen-dimension={fullscreenDimension ?? undefined}
      data-fullscreen-fallback={usesViewportFallback ? "true" : undefined}
      ref={workspaceRef}
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
            <p><strong>Page scroll:</strong> The mouse wheel always scrolls the page while either graph is embedded. Hold Ctrl or Command while scrolling to zoom a graph, or use its zoom buttons. In full screen, scrolling zooms directly.</p>
            <p><strong>Touch:</strong> Swipe over either embedded graph to keep scrolling the page. Tap its Interact button before using graph gestures; full screen enables them automatically.</p>
            <p><strong>2D:</strong> Drag or use one finger to pan, pinch to zoom, and use Arrow keys to move through the hierarchy.</p>
            <p><strong>3D:</strong> Desktop: left-drag to orbit and right-drag to pan. With touch interaction active, one finger pans; two fingers orbit and pinch-zoom.</p>
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
      {fullscreenError ? <p className="phase180-fullscreen-status" role="status">{fullscreenError}</p> : null}
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
          onFullscreenToggle={(trigger) => void toggleFullscreen("2d", trigger)}
          onMovementToggle={() => setMovementPaused((paused) => !paused)}
          onSelectedEntityChange={onSelectedEntityChange}
          fullscreenActive={fullscreenDimension === "2d"}
          motionLocked={reducedMotion}
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
            onFullscreenToggle={(trigger) => void toggleFullscreen("3d", trigger)}
            onInspectorCollapsedChange={setInspectorCollapsed}
            onMovementToggle={() => setMovementPaused((paused) => !paused)}
            onSelectedEntityChange={onSelectedEntityChange}
            fullscreenActive={fullscreenDimension === "3d"}
            inspectorCollapsed={inspectorCollapsed}
            motionLocked={reducedMotion}
            selectedEntityId={selectedEntityId}
          />
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {fullscreenDimension
          ? `${fullscreenDimension.toUpperCase()} Graph full screen active. Press Escape or Exit full screen to return.`
          : "Graph full screen closed."}
      </span>
    </section>
  );
}
