"use client";

import type { EntitySummary } from "@entral/contracts";
import React from "react";
import { CanonicalUniverse3DGraph } from "./CanonicalUniverse3DGraph";
import { CanonicalUniverseGraph } from "./CanonicalUniverseGraph";

export type CanonicalGraphDimension = "2d" | "3d";

export function CanonicalGraphWorkspace({
  dimension,
  entities,
  eventSequence,
  onDimensionChange,
  onOpenFullRecord,
  onSelectedEntityChange,
  selectedEntityId
}: {
  dimension: CanonicalGraphDimension;
  entities: readonly EntitySummary[];
  eventSequence: number;
  onDimensionChange: (dimension: CanonicalGraphDimension) => void;
  onOpenFullRecord: (entityId: string) => void;
  onSelectedEntityChange: (entityId: string | null) => void;
  selectedEntityId: string | null;
}) {
  return (
    <section
      className="phase180-graph-workspace"
      data-canonical-entity-count={entities.length}
      data-canonical-event-sequence={eventSequence}
    >
      <nav aria-label="Graph view" className="phase180-graph-view-switch">
        <button
          aria-pressed={dimension === "2d"}
          onClick={() => onDimensionChange("2d")}
          type="button"
        >
          2D Graph
        </button>
        <button
          aria-pressed={dimension === "3d"}
          onClick={() => onDimensionChange("3d")}
          type="button"
        >
          3D Graph
        </button>
        <span>One canonical snapshot · two synchronized views</span>
      </nav>
      {dimension === "2d" ? (
        <CanonicalUniverseGraph
          entities={entities}
          eventSequence={eventSequence}
          onOpenFullRecord={onOpenFullRecord}
          onSelectedEntityChange={onSelectedEntityChange}
          selectedEntityId={selectedEntityId}
        />
      ) : (
        <CanonicalUniverse3DGraph
          entities={entities}
          eventSequence={eventSequence}
          onOpenFullRecord={onOpenFullRecord}
          onSelectedEntityChange={onSelectedEntityChange}
          selectedEntityId={selectedEntityId}
        />
      )}
    </section>
  );
}
