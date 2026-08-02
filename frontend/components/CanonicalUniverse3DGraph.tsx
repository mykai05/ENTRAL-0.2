"use client";

import type { EntitySummary, GraphPreferenceSettings } from "@entral/contracts";
import { Hand, Maximize2, Minimize2, PauseCircle, PlayCircle } from "lucide-react";
import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CanonicalGraphEmptyState,
  CanonicalGraphErrorBoundary
} from "./CanonicalGraphErrorBoundary";
import type {
  CanonicalRendererFrameDiagnostics,
  CanonicalWebGlRendererEvent
} from "../lib/canonical-universe";
import type { GraphLayout3DResult } from "../lib/graph-layouts";
import { CanonicalGraphSemanticsOverlay } from "./CanonicalGraphSemanticsOverlay";

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

function graphDetailAttribute(value: EntitySummary["latest_material_result"]) {
  if (value === null) return undefined;
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function CanonicalUniverse3DGraph({
  entities,
  eventSequence,
  focusedEntityId,
  fullscreenActive = false,
  inspectorCollapsed,
  layout,
  movementPaused,
  motionLocked = false,
  onOpenFullRecord,
  onFullscreenToggle,
  onInspectorCollapsedChange,
  onMovementToggle,
  onFrameDiagnostics,
  onSelectedEntityChange,
  onTouchInteractionChange,
  onWebGlStateChange,
  selectedEntityId,
  settings,
  touchInteractionActive: controlledTouchInteractionActive,
  onRendererFailure,
  viewFitSignal = 0,
  viewFocusSignal = 0
}: {
  entities: readonly EntitySummary[];
  eventSequence: number;
  focusedEntityId: string | null;
  fullscreenActive?: boolean;
  inspectorCollapsed: boolean;
  layout: GraphLayout3DResult;
  movementPaused: boolean;
  motionLocked?: boolean;
  onOpenFullRecord: (entityId: string) => void;
  onFullscreenToggle?: (trigger: HTMLButtonElement) => void;
  onInspectorCollapsedChange: (collapsed: boolean) => void;
  onMovementToggle?: () => void;
  onFrameDiagnostics?: (diagnostics: CanonicalRendererFrameDiagnostics) => void;
  onRendererFailure?: (diagnosticClass: string) => void;
  onSelectedEntityChange: (entityId: string | null) => void;
  onTouchInteractionChange?: (active: boolean) => void;
  onWebGlStateChange?: (event: CanonicalWebGlRendererEvent) => void;
  selectedEntityId: string | null;
  settings: GraphPreferenceSettings;
  touchInteractionActive?: boolean;
  viewFitSignal?: number;
  viewFocusSignal?: number;
}) {
  const [uncontrolledTouchInteractionActive, setUncontrolledTouchInteractionActive] = useState(false);
  const touchInteractionActive = controlledTouchInteractionActive ?? uncontrolledTouchInteractionActive;
  const setTouchInteractionActive = (active: boolean) => {
    if (controlledTouchInteractionActive === undefined) {
      setUncontrolledTouchInteractionActive(active);
    }
    onTouchInteractionChange?.(active);
  };
  const selectedEntity = useMemo(
    () => selectedEntityId
      ? entities.find((entity) => entity.entity_id === selectedEntityId) ?? null
      : null,
    [entities, selectedEntityId]
  );

  useEffect(() => {
    if (!fullscreenActive && controlledTouchInteractionActive === undefined) {
      setUncontrolledTouchInteractionActive(false);
    }
  }, [controlledTouchInteractionActive, fullscreenActive]);

  const handleWebGlStateChange = useCallback((event: CanonicalWebGlRendererEvent) => {
    onWebGlStateChange?.(event);
  }, [onWebGlStateChange]);

  return (
    <section
      aria-labelledby="universe-3d-heading"
      className="phase180-graph phase180-graph-3d"
      data-canonical-entity-count={entities.length}
      data-canonical-edge-count={layout.edges.length}
      data-canonical-edge-ids={layout.edges.map((edge) => edge.edgeId).join(",")}
      data-canonical-event-sequence={eventSequence}
      data-canonical-entity-ids={layout.points.map((point) => point.entityId).join(",")}
      data-canonical-detail-surface="3d"
      data-canonical-selected-active-alert={
        selectedEntity?.active_alert ?? undefined
      }
      data-canonical-selected-active-task-count={
        selectedEntity?.active_task_count
      }
      data-canonical-selected-child-count={selectedEntity?.child_count}
      data-canonical-selected-current-mission={
        selectedEntity?.current_mission ?? undefined
      }
      data-canonical-selected-entity-id={selectedEntity?.entity_id}
      data-canonical-selected-latest-material-result={
        graphDetailAttribute(selectedEntity?.latest_material_result ?? null)
      }
      data-graph-dimension="3d"
      data-graph-motion={movementPaused ? "paused" : "running"}
      data-graph-pattern={layout.pattern}
      data-graph-snapshot-strategy="preserved-drawing-buffer"
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
          {!fullscreenActive ? (
            <button
              aria-pressed={touchInteractionActive}
              className="phase180-surface-action phase180-touch-interaction-toggle"
              onClick={() => setTouchInteractionActive(!touchInteractionActive)}
              type="button"
            >
              <Hand aria-hidden="true" size={17} />
              {touchInteractionActive ? "Release 3D Graph touch controls" : "Interact with 3D Graph"}
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
        {entities.length === 0 ? (
          <CanonicalGraphEmptyState label="3D Graph" />
        ) : (
          <CanonicalGraphErrorBoundary
            entities={entities}
            label="3D Graph"
            onFailure={onRendererFailure}
          >
            <OriginalUniverseRenderer
              canonicalEntities={entities}
              canonicalEventSequence={eventSequence}
              canonicalFocusedEntityId={focusedEntityId}
              canonicalFullscreenActive={fullscreenActive}
              canonicalInspectorCollapsed={inspectorCollapsed}
              canonicalLayout3D={layout}
              canonicalMotionPaused={movementPaused}
              canonicalGraphSettings={settings}
              canonicalSelectedEntityId={selectedEntityId}
              canonicalTouchInteractionActive={fullscreenActive || touchInteractionActive}
              canonicalViewFitSignal={viewFitSignal}
              canonicalViewFocusSignal={viewFocusSignal}
              embeddedGraphOnly
              initialDestination="graph"
              onCanonicalInspectorCollapsedChange={onInspectorCollapsedChange}
              onCanonicalFrameDiagnostics={onFrameDiagnostics}
              onCanonicalOpenFullRecord={onOpenFullRecord}
              onCanonicalSelectedEntityChange={onSelectedEntityChange}
              onCanonicalWebGlStateChange={handleWebGlStateChange}
              onLogout={() => undefined}
              surface="member"
              user={null}
            />
          </CanonicalGraphErrorBoundary>
        )}
        {entities.length > 0 ? (
          <CanonicalGraphSemanticsOverlay
            dimension="3D"
            entities={entities}
            legendVisible={settings.advanced_shared.legend_visible}
            pattern={layout.pattern}
          />
        ) : null}
      </div>
    </section>
  );
}
