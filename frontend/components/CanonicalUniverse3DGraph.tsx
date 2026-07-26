"use client";

import type { EntitySummary } from "@entral/contracts";
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
  movementPaused,
  onOpenFullRecord,
  onSelectedEntityChange,
  selectedEntityId
}: {
  entities: readonly EntitySummary[];
  eventSequence: number;
  movementPaused: boolean;
  onOpenFullRecord: (entityId: string) => void;
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
        <span className="phase180-panel-state" data-state={movementPaused ? "paused" : "running"}>
          {movementPaused ? "Movement paused" : "Visual motion active"}
        </span>
      </header>
      <div className="phase180-graph-3d-stage">
        <OriginalUniverseRenderer
          canonicalEntities={entities}
          canonicalEventSequence={eventSequence}
          canonicalMotionPaused={movementPaused}
          canonicalSelectedEntityId={selectedEntityId}
          embeddedGraphOnly
          initialDestination="graph"
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
