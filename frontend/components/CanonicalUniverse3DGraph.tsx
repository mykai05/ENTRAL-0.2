"use client";

import type { EntitySummary } from "@entral/contracts";
import { Maximize2, Minimize2, PauseCircle, PlayCircle } from "lucide-react";
import dynamic from "next/dynamic";
import React from "react";

const OriginalUniverseRenderer = dynamic(
  () => import("./NeuronsCommandCenter").then((module) => module.NeuronsCommandCenter),
  {
    loading: () => (
      <div className="phase180-graph-3d-loading" role="status">
        Restoring the original 3D Universe Graph...
      </div>
    ),
    ssr: false
  }
);

export function CanonicalUniverse3DGraph({
  entities,
  eventSequence,
  fullscreenActive = false,
  inspectorCollapsed,
  movementPaused,
  motionLocked = false,
  onOpenFullRecord,
  onFullscreenToggle,
  onInspectorCollapsedChange,
  onMovementToggle,
  onSelectedEntityChange,
  selectedEntityId
}: {
  entities: readonly EntitySummary[];
  eventSequence: number;
  fullscreenActive?: boolean;
  inspectorCollapsed: boolean;
  movementPaused: boolean;
  motionLocked?: boolean;
  onOpenFullRecord: (entityId: string) => void;
  onFullscreenToggle?: (trigger: HTMLButtonElement) => void;
  onInspectorCollapsedChange: (collapsed: boolean) => void;
  onMovementToggle?: () => void;
  onSelectedEntityChange: (entityId: string | null) => void;
  selectedEntityId: string | null;
}) {
  return (
    <section
      aria-labelledby="universe-3d-heading"
      className="phase180-graph phase180-graph-3d"
      data-canonical-entity-count={entities.length}
      data-canonical-event-sequence={eventSequence}
      data-graph-dimension="3d"
      data-graph-motion={movementPaused ? "paused" : "running"}
    >
      <header className="phase180-surface-heading">
        <div>
          <p className="eyebrow">Canonical topology · event {eventSequence}</p>
          <h2 id="universe-3d-heading">3D Graph</h2>
          <p>{entities.length.toLocaleString()} RLS-visible entities in the original full 3D Universe Graph.</p>
        </div>
        <div className="phase180-surface-actions">
          <span className="phase180-panel-state" data-state={movementPaused ? "paused" : "running"}>
            {movementPaused ? "Movement paused" : "Visual motion active"}
          </span>
          {fullscreenActive && onMovementToggle ? (
            <button
              className="phase180-surface-action"
              disabled={motionLocked}
              onClick={onMovementToggle}
              title={motionLocked ? "Movement is paused by your device reduced-motion setting." : undefined}
              type="button"
            >
              {movementPaused && !motionLocked ? <PlayCircle aria-hidden="true" size={17} /> : <PauseCircle aria-hidden="true" size={17} />}
              {motionLocked ? "Movement paused" : movementPaused ? "Resume movement" : "Stop movement"}
            </button>
          ) : null}
          {onFullscreenToggle ? (
            <button
              aria-label={fullscreenActive ? "Exit 3D Graph full screen" : "Enter 3D Graph full screen"}
              className="phase180-surface-action"
              onClick={(event) => onFullscreenToggle(event.currentTarget)}
              type="button"
            >
              {fullscreenActive ? <Minimize2 aria-hidden="true" size={17} /> : <Maximize2 aria-hidden="true" size={17} />}
              {fullscreenActive ? "Exit full screen" : "Full screen"}
            </button>
          ) : null}
        </div>
      </header>
      <div className="phase180-graph-3d-stage">
        <OriginalUniverseRenderer
          canonicalEntities={entities}
          canonicalEventSequence={eventSequence}
          canonicalInspectorCollapsed={inspectorCollapsed}
          canonicalMotionPaused={movementPaused}
          canonicalSelectedEntityId={selectedEntityId}
          embeddedGraphOnly
          initialDestination="graph"
          onCanonicalInspectorCollapsedChange={onInspectorCollapsedChange}
          onCanonicalOpenFullRecord={onOpenFullRecord}
          onCanonicalSelectedEntityChange={onSelectedEntityChange}
          onLogout={() => undefined}
          surface="member"
          user={null}
        />
      </div>
    </section>
  );
}
