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
  onOpenFullRecord,
  onSelectedEntityChange,
  selectedEntityId
}: {
  entities: readonly EntitySummary[];
  eventSequence: number;
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
    >
      <header className="phase180-surface-heading">
        <div>
          <p className="eyebrow">Canonical topology · event {eventSequence}</p>
          <h1 id="universe-3d-heading">3D Graph</h1>
          <p>{entities.length.toLocaleString()} RLS-visible entities in the original full 3D Universe Graph.</p>
        </div>
      </header>
      <div className="phase180-graph-3d-stage">
        <OriginalUniverseRenderer
          canonicalEntities={entities}
          canonicalEventSequence={eventSequence}
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
