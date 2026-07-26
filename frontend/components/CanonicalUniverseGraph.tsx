"use client";

import type { EntitySummary } from "@entral/contracts";
import {
  ArrowLeft,
  Focus,
  LocateFixed,
  Search,
  Settings2,
  X
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canonicalLineageAndSubtree,
  fitUniverseCamera,
  layoutCanonicalUniverse,
  nextUniverseEntityId,
  semanticUniverseIds
} from "../lib/canonical-universe";

type Camera = { x: number; y: number; zoom: number };
type PointerRecord = { x: number; y: number };

const SEARCH_INPUT_ID = "phase180-graph-search";
const SEARCH_RESULTS_ID = "phase180-graph-search-results";
const GRAPH_INSTRUCTIONS_ID = "phase180-graph-instructions";
const MIN_ZOOM = 0.001;

const roleColors = {
  ENTRAL: "#f4f7ff",
  MARSHAL: "#8eb9ff",
  GENERAL: "#55e8d5",
  COMMANDER: "#d6a7ff",
  SOLDIER: "#ffca75"
} as const;

function healthColor(entity: EntitySummary) {
  if (entity.health === "CRITICAL") return "#ff5c73";
  if (entity.health === "DEGRADED") return "#ff8e67";
  if (entity.health === "WATCH") return "#ffd56a";
  if (entity.health === "HEALTHY") return "#57e6a3";
  return roleColors[entity.entity_type];
}

export function CanonicalUniverseGraph({
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointersRef = useRef(new Map<number, PointerRecord>());
  const gestureRef = useRef<{ camera: Camera; distance: number; midpoint: PointerRecord } | null>(null);
  const dragStartRef = useRef<PointerRecord | null>(null);
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 0.72 });
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [dimUnrelated, setDimUnrelated] = useState(true);
  const points = useMemo(() => layoutCanonicalUniverse(entities), [entities]);
  const byId = useMemo(() => new Map(entities.map((entity) => [entity.entity_id, entity])), [entities]);
  const pointById = useMemo(() => new Map(points.map((point) => [point.entity.entity_id, point])), [points]);
  const selected = selectedEntityId ? byId.get(selectedEntityId) ?? null : null;
  const relatedIds = useMemo(
    () => canonicalLineageAndSubtree(entities, selectedEntityId),
    [entities, selectedEntityId]
  );
  const visibleIds = useMemo(
    () => semanticUniverseIds(entities, selectedEntityId, camera.zoom),
    [camera.zoom, entities, selectedEntityId]
  );

  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !points.length) return;
    const fitted = fitUniverseCamera(points, canvas.clientWidth, canvas.clientHeight);
    if (fitted) setCamera(fitted);
  }, [points]);

  const focusEntity = useCallback((entityId: string) => {
    const point = pointById.get(entityId);
    if (!point) return;
    setCamera((current) => ({
      x: -point.x * Math.max(current.zoom, 0.75),
      y: -point.y * Math.max(current.zoom, 0.75),
      zoom: Math.max(current.zoom, 0.75)
    }));
    onSelectedEntityChange(entityId);
  }, [onSelectedEntityChange, pointById]);

  useEffect(() => {
    if (!selectedEntityId || byId.has(selectedEntityId)) return;
    onSelectedEntityChange(null);
  }, [byId, onSelectedEntityChange, selectedEntityId]);

  useEffect(() => {
    const currentCanvas = canvasRef.current;
    if (!currentCanvas) return;
    const canvas: HTMLCanvasElement = currentCanvas;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.floor(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      draw();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener("orientationchange", resize);
    resize();
    return () => {
      observer.disconnect();
      window.removeEventListener("orientationchange", resize);
    };

    function draw() {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => {
        const context = canvas.getContext("2d");
        if (!context) return;
        const ratio = canvas.width / Math.max(1, canvas.clientWidth);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        context.fillStyle = "#050913";
        context.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        const centerX = canvas.clientWidth / 2 + camera.x;
        const centerY = canvas.clientHeight / 2 + camera.y;

        if (showGrid) {
          const spacing = Math.max(26, 90 * camera.zoom);
          context.strokeStyle = "rgba(139, 169, 217, .08)";
          context.lineWidth = 1;
          context.beginPath();
          for (let x = ((centerX % spacing) + spacing) % spacing; x < canvas.clientWidth; x += spacing) {
            context.moveTo(x, 0);
            context.lineTo(x, canvas.clientHeight);
          }
          for (let y = ((centerY % spacing) + spacing) % spacing; y < canvas.clientHeight; y += spacing) {
            context.moveTo(0, y);
            context.lineTo(canvas.clientWidth, y);
          }
          context.stroke();
        }

        const screen = (point: { x: number; y: number }) => ({
          x: centerX + point.x * camera.zoom,
          y: centerY + point.y * camera.zoom
        });
        context.lineWidth = Math.max(0.5, Math.min(1.5, camera.zoom));
        for (const point of points) {
          if (!visibleIds.has(point.entity.entity_id) || !point.entity.parent_id) continue;
          const parent = pointById.get(point.entity.parent_id);
          if (!parent || !visibleIds.has(parent.entity.entity_id)) continue;
          const from = screen(parent);
          const to = screen(point);
          if (
            Math.max(from.x, to.x) < -20 || Math.min(from.x, to.x) > canvas.clientWidth + 20
            || Math.max(from.y, to.y) < -20 || Math.min(from.y, to.y) > canvas.clientHeight + 20
          ) continue;
          const related = relatedIds.has(point.entity.entity_id) && relatedIds.has(parent.entity.entity_id);
          context.strokeStyle = related
            ? "rgba(112, 230, 211, .72)"
            : `rgba(112, 146, 197, ${dimUnrelated && selected ? 0.08 : 0.24})`;
          context.beginPath();
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
          context.stroke();
        }

        for (const point of points) {
          if (!visibleIds.has(point.entity.entity_id)) continue;
          const position = screen(point);
          if (
            position.x < -80 || position.x > canvas.clientWidth + 80
            || position.y < -40 || position.y > canvas.clientHeight + 40
          ) continue;
          const isSelected = selectedEntityId === point.entity.entity_id;
          const unrelated = Boolean(selected) && !relatedIds.has(point.entity.entity_id);
          const radius = isSelected ? 8 : point.entity.entity_type === "SOLDIER" ? 2.4 : 4.6;
          context.globalAlpha = dimUnrelated && unrelated ? 0.22 : 1;
          context.fillStyle = healthColor(point.entity);
          context.beginPath();
          context.arc(position.x, position.y, radius, 0, Math.PI * 2);
          context.fill();
          if (isSelected) {
            context.strokeStyle = "#ffffff";
            context.lineWidth = 2;
            context.beginPath();
            context.arc(position.x, position.y, radius + 5, 0, Math.PI * 2);
            context.stroke();
          }
          if (showLabels && (camera.zoom >= 0.48 || isSelected) && point.entity.entity_type !== "SOLDIER") {
            context.fillStyle = "#f0f5ff";
            context.font = "600 11px Inter, system-ui, sans-serif";
            context.fillText(point.entity.name, position.x + radius + 5, position.y + 4);
          }
          context.globalAlpha = 1;
        }
      });
    }
  }, [
    camera,
    dimUnrelated,
    pointById,
    points,
    relatedIds,
    selected,
    selectedEntityId,
    showGrid,
    showLabels,
    visibleIds
  ]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>): PointerRecord {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    pointersRef.current.set(event.pointerId, point);
    dragStartRef.current = point;
    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      gestureRef.current = {
        camera,
        distance: Math.hypot(second!.x - first!.x, second!.y - first!.y),
        midpoint: { x: (first!.x + second!.x) / 2, y: (first!.y + second!.y) / 2 }
      };
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    const previous = pointersRef.current.get(event.pointerId)!;
    const next = canvasPoint(event);
    pointersRef.current.set(event.pointerId, next);
    if (pointersRef.current.size === 1) {
      setCamera((current) => ({ ...current, x: current.x + next.x - previous.x, y: current.y + next.y - previous.y }));
      return;
    }
    const [first, second] = [...pointersRef.current.values()];
    const gesture = gestureRef.current;
    if (!gesture || !first || !second) return;
    const distance = Math.max(10, Math.hypot(second.x - first.x, second.y - first.y));
    const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
    setCamera({
      x: gesture.camera.x + midpoint.x - gesture.midpoint.x,
      y: gesture.camera.y + midpoint.y - gesture.midpoint.y,
      zoom: Math.max(MIN_ZOOM, Math.min(4, gesture.camera.zoom * distance / Math.max(10, gesture.distance)))
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const point = canvasPoint(event);
    const start = dragStartRef.current;
    const wasTap = start && Math.hypot(point.x - start.x, point.y - start.y) < 7 && pointersRef.current.size === 1;
    pointersRef.current.delete(event.pointerId);
    gestureRef.current = null;
    if (!wasTap) return;
    const centerX = event.currentTarget.clientWidth / 2 + camera.x;
    const centerY = event.currentTarget.clientHeight / 2 + camera.y;
    let nearest: { distance: number; id: string } | null = null;
    for (const candidate of points) {
      if (!visibleIds.has(candidate.entity.entity_id)) continue;
      const x = centerX + candidate.x * camera.zoom;
      const y = centerY + candidate.y * camera.zoom;
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= 18 && (!nearest || distance < nearest.distance)) {
        nearest = { distance, id: candidate.entity.entity_id };
      }
    }
    onSelectedEntityChange(nearest?.id ?? null);
  }

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return entities.filter((entity) =>
      [entity.name, entity.stable_code, entity.entity_type].some((value) => value.toLowerCase().includes(normalized))
    ).slice(0, 8);
  }, [entities, query]);
  const resultsVisible = searchOpen && results.length > 0;
  const resolvedActiveResultIndex = Math.min(activeResultIndex, Math.max(0, results.length - 1));
  const activeResult = results[resolvedActiveResultIndex] ?? null;

  useEffect(() => {
    if (!results.length) {
      setActiveResultIndex(0);
      return;
    }
    setActiveResultIndex((index) => Math.min(index, results.length - 1));
  }, [results.length]);

  function selectSearchResult(entity: EntitySummary) {
    focusEntity(entity.entity_id);
    setQuery(entity.name);
    setSearchOpen(false);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!results.length) return;
      setSearchOpen(true);
      setActiveResultIndex((index) => (index + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!results.length) return;
      setSearchOpen(true);
      setActiveResultIndex((index) => (index - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Enter" && resultsVisible && activeResult) {
      event.preventDefault();
      selectSearchResult(activeResult);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setSearchOpen(false);
    }
  }

  function handleCanvasKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onSelectedEntityChange(null);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (selectedEntityId) onOpenFullRecord(selectedEntityId);
      else {
        const firstId = nextUniverseEntityId(points, null, "right");
        if (firstId) focusEntity(firstId);
      }
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      setCamera((current) => ({ ...current, zoom: Math.min(4, current.zoom * 1.15) }));
      return;
    }
    if (event.key === "-") {
      event.preventDefault();
      setCamera((current) => ({ ...current, zoom: Math.max(MIN_ZOOM, current.zoom / 1.15) }));
      return;
    }
    const direction = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down"
    }[event.key] as "left" | "right" | "up" | "down" | undefined;
    if (!direction) return;
    event.preventDefault();
    if (event.shiftKey) {
      const movement = 80;
      if (direction === "left") setCamera((current) => ({ ...current, x: current.x + movement }));
      if (direction === "right") setCamera((current) => ({ ...current, x: current.x - movement }));
      if (direction === "up") setCamera((current) => ({ ...current, y: current.y + movement }));
      if (direction === "down") setCamera((current) => ({ ...current, y: current.y - movement }));
      return;
    }
    const nextId = nextUniverseEntityId(points, selectedEntityId, direction);
    if (nextId) focusEntity(nextId);
  }

  return (
    <section
      className="phase180-graph"
      aria-labelledby="universe-heading"
      data-canonical-entity-count={entities.length}
      data-canonical-event-sequence={eventSequence}
      data-graph-dimension="2d"
    >
      <header className="phase180-surface-heading">
        <div>
          <p className="eyebrow">Canonical topology · event {eventSequence}</p>
          <h1 id="universe-heading">2D Graph</h1>
          <p>{entities.length.toLocaleString()} RLS-visible entities. Selection preserves its complete lineage and subtree.</p>
        </div>
      </header>
      <div className="phase180-graph-toolbar">
        <label className="phase180-graph-search" htmlFor={SEARCH_INPUT_ID}>
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search canonical entities</span>
          <input
            aria-activedescendant={resultsVisible && activeResult
              ? `${SEARCH_RESULTS_ID}-option-${resolvedActiveResultIndex}`
              : undefined}
            aria-autocomplete="list"
            aria-controls={SEARCH_RESULTS_ID}
            aria-expanded={resultsVisible}
            autoComplete="off"
            id={SEARCH_INPUT_ID}
            onBlur={(event) => {
              const next = event.relatedTarget;
              if (!(next instanceof HTMLElement) || !next.closest(`#${SEARCH_RESULTS_ID}`)) {
                setSearchOpen(false);
              }
            }}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveResultIndex(0);
              setSearchOpen(Boolean(event.target.value.trim()));
            }}
            onFocus={() => setSearchOpen(Boolean(query.trim()))}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search name, code, or rank"
            role="combobox"
            value={query}
          />
        </label>
        <button
          disabled={!selected?.parent_id}
          onClick={() => selected?.parent_id && focusEntity(selected.parent_id)}
          type="button"
        >
          <ArrowLeft aria-hidden="true" size={17} /> Back
        </button>
        <button onClick={fit} type="button"><LocateFixed aria-hidden="true" size={17} /> Fit</button>
        <button
          aria-expanded={settingsOpen}
          aria-controls="phase180-graph-settings"
          onClick={() => setSettingsOpen((open) => !open)}
          type="button"
        >
          <Settings2 aria-hidden="true" size={17} /> Settings
        </button>
      </div>
      {resultsVisible ? (
        <div
          aria-label="Entity search results"
          className="phase180-graph-results"
          id={SEARCH_RESULTS_ID}
          role="listbox"
        >
          {results.map((entity, index) => (
            <button
              aria-selected={selectedEntityId === entity.entity_id}
              className={resolvedActiveResultIndex === index ? "active" : undefined}
              id={`${SEARCH_RESULTS_ID}-option-${index}`}
              key={entity.entity_id}
              onClick={() => selectSearchResult(entity)}
              onMouseEnter={() => setActiveResultIndex(index)}
              role="option"
              tabIndex={-1}
              type="button"
            >
              <strong>{entity.name}</strong><span>{entity.entity_type} · {entity.stable_code}</span>
            </button>
          ))}
        </div>
      ) : null}
      {settingsOpen ? (
        <aside className="phase180-graph-settings" id="phase180-graph-settings">
          <header><strong>Graph settings</strong><button aria-label="Close graph settings" onClick={() => setSettingsOpen(false)} type="button"><X size={17} /></button></header>
          <label><input checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} type="checkbox" /> Semantic labels</label>
          <label><input checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} type="checkbox" /> Coordinate grid</label>
          <label><input checked={dimUnrelated} onChange={(event) => setDimUnrelated(event.target.checked)} type="checkbox" /> Dim unrelated branches</label>
        </aside>
      ) : null}
      <p className="phase180-graph-instructions" id={GRAPH_INSTRUCTIONS_ID}>
        <strong>Keyboard:</strong> Arrow keys move between related nodes; Shift + Arrow pans; + / - zooms;
        Enter opens the selected record; Escape clears the selection.
      </p>
      <p className="sr-only" aria-live="polite">
        {selected
          ? `Selected ${selected.name}, ${selected.entity_type}. ${selected.child_count} direct children.`
          : "No graph entity selected."}
      </p>
      <div className="phase180-graph-stage">
        <canvas
          aria-describedby={GRAPH_INSTRUCTIONS_ID}
          aria-label={`Canonical Universe Graph with ${entities.length} entities`}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleCanvasKeyDown}
          onWheel={(event) => {
            event.preventDefault();
            const factor = Math.exp(-event.deltaY * 0.0012);
            setCamera((current) => ({ ...current, zoom: Math.max(MIN_ZOOM, Math.min(4, current.zoom * factor)) }));
          }}
          ref={canvasRef}
          role="application"
          tabIndex={0}
        />
        <div className="phase180-graph-legend" aria-label="Rank legend">
          {Object.entries(roleColors).map(([role, color]) => <span key={role}><i style={{ background: color }} />{role}</span>)}
        </div>
      </div>
      {selected ? (
        <aside className="phase180-graph-drawer" aria-label={`${selected.name} graph details`}>
          <header>
            <div><span>{selected.entity_type}</span><h2>{selected.name}</h2></div>
            <button aria-label="Close entity details" onClick={() => onSelectedEntityChange(null)} type="button"><X size={18} /></button>
          </header>
          <dl>
            <div><dt>Status</dt><dd>{selected.status}</dd></div>
            <div><dt>Health</dt><dd>{selected.health}</dd></div>
            <div><dt>Version</dt><dd>{selected.version}</dd></div>
            <div><dt>Children</dt><dd>{selected.child_count}</dd></div>
            <div><dt>Mission</dt><dd>{selected.current_mission ?? "No active mission recorded"}</dd></div>
            <div><dt>Alert</dt><dd>{selected.active_alert ?? "No active alert"}</dd></div>
          </dl>
          <button className="phase180-primary-action" onClick={() => onOpenFullRecord(selected.entity_id)} type="button">
            <Focus aria-hidden="true" size={17} /> Open full record
          </button>
        </aside>
      ) : null}
    </section>
  );
}
