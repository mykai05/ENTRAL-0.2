"use client";

import {
  assertEntityLifecycleActionResult,
  type EntityFullRecord,
  type EntityLifecycleActionRequest,
  type EntityLifecycleActionResult,
  type EntityLifecycleActionType,
  type EntityRole,
  type EntityStatus,
  type EntitySummary,
  type HealthState
} from "@entral/contracts";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, apiFetch } from "../lib/api";
import {
  canonicalPortfolioCache,
  canonicalQueryKeys,
  loadCanonicalEntity,
  type CanonicalPortfolioSource
} from "../lib/canonical-portfolio";

const rowHeight = 58;
const overscan = 8;
const recordAlignmentAttempts = 3;
const roles: readonly EntityRole[] = ["ENTRAL", "MARSHAL", "GENERAL", "COMMANDER", "SOLDIER"];
const healthStates: readonly HealthState[] = ["HEALTHY", "WATCH", "DEGRADED", "CRITICAL", "UNKNOWN"];
const statuses = ["BUILDING", "ACTIVE", "PAUSED", "DEGRADED", "RETIRED"] as const;

type InfrastructureBaseRow = {
  readonly depth: number;
  readonly entity: EntitySummary;
  readonly parentName: string | null;
};

type InfrastructureRow = InfrastructureBaseRow & {
  readonly isContext: boolean;
  readonly positionInSet: number;
  readonly setSize: number;
};

function compareEntities(left: EntitySummary, right: EntitySummary) {
  const roleDifference = roles.indexOf(left.entity_type) - roles.indexOf(right.entity_type);
  if (roleDifference) return roleDifference;
  return left.stable_code.localeCompare(right.stable_code)
    || left.name.localeCompare(right.name)
    || left.entity_id.localeCompare(right.entity_id);
}

/**
 * Turns the canonical flat read model into a deterministic depth-first tree.
 * Orphans remain reachable as roots, while the visited set prevents malformed
 * cycles from hiding records or recursing forever.
 */
export function orderCanonicalInfrastructureEntities(
  entities: readonly EntitySummary[]
): readonly InfrastructureBaseRow[] {
  const byId = new Map(entities.map((entity) => [entity.entity_id, entity]));
  const children = new Map<string, EntitySummary[]>();
  const roots: EntitySummary[] = [];

  for (const entity of entities) {
    if (!entity.parent_id || entity.parent_id === entity.entity_id || !byId.has(entity.parent_id)) {
      roots.push(entity);
      continue;
    }
    const siblings = children.get(entity.parent_id) ?? [];
    siblings.push(entity);
    children.set(entity.parent_id, siblings);
  }
  roots.sort(compareEntities);
  for (const siblings of children.values()) siblings.sort(compareEntities);

  const ordered: InfrastructureBaseRow[] = [];
  const visited = new Set<string>();
  const visit = (entity: EntitySummary, depth: number) => {
    if (visited.has(entity.entity_id)) return;
    visited.add(entity.entity_id);
    ordered.push({
      depth,
      entity,
      parentName: entity.parent_id ? byId.get(entity.parent_id)?.name ?? null : null
    });
    for (const child of children.get(entity.entity_id) ?? []) visit(child, depth + 1);
  };

  for (const root of roots) visit(root, 0);
  for (const entity of [...entities].sort(compareEntities)) visit(entity, 0);
  return ordered;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const payload = error.details as { message?: string; requestId?: string } | null;
    return `${payload?.message ?? error.message}${payload?.requestId ? ` Request ${payload.requestId}.` : ""}`;
  }
  return error instanceof Error ? error.message : "The canonical entity record could not be loaded.";
}

function JsonRecordSection({
  label,
  value
}: {
  label: string;
  value: EntityFullRecord[keyof EntityFullRecord];
}) {
  const empty = value === null
    || (Array.isArray(value) && value.length === 0)
    || (typeof value === "object" && value !== null && !Array.isArray(value) && Object.keys(value).length === 0);
  return (
    <details className="phase180-record-section" open={label === "Configuration" || label === "Runtime"}>
      <summary><strong>{label}</strong><span>{empty ? "No canonical records" : "Canonical data"}</span></summary>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export function CanonicalInfrastructure({
  entities,
  eventSequence,
  humanUserId,
  onRefresh,
  organizationId,
  onSelectedEntityChange,
  scopeLabel,
  selectedEntityId
}: {
  entities: readonly EntitySummary[];
  eventSequence: number;
  humanUserId: string;
  onRefresh: () => void;
  organizationId: string;
  onSelectedEntityChange: (entityId: string | null) => void;
  scopeLabel: string;
  selectedEntityId: string | null;
}) {
  const source = useMemo<CanonicalPortfolioSource>(() => ({ organizationId }), [organizationId]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const recordLoadIdRef = useRef(0);
  const focusRequestedRef = useRef(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [health, setHealth] = useState("ALL");
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(520);
  const [record, setRecord] = useState<EntityFullRecord | null>(null);
  const [recordSequence, setRecordSequence] = useState(0);
  const [recordError, setRecordError] = useState("");
  const [isRecordLoading, setIsRecordLoading] = useState(false);
  const [lifecycleReason, setLifecycleReason] = useState("");
  const [lifecycleError, setLifecycleError] = useState("");
  const [lifecycleResult, setLifecycleResult] = useState<EntityLifecycleActionResult | null>(null);
  const [isLifecycleRunning, setIsLifecycleRunning] = useState(false);
  const [focusedEntityId, setFocusedEntityId] = useState<string | null>(selectedEntityId);
  const hierarchy = useMemo(() => orderCanonicalInfrastructureEntities(entities), [entities]);
  const selectedSummary = selectedEntityId
    ? entities.find((entity) => entity.entity_id === selectedEntityId) ?? null
    : null;
  const selectedLifecycleResult = lifecycleResult?.target.entity_id === selectedSummary?.entity_id
    ? lifecycleResult
    : null;
  const selectedLifecycleStatus = selectedLifecycleResult?.after.status ?? selectedSummary?.status;
  const selectedLifecycleVersion = selectedLifecycleResult?.after.version ?? selectedSummary?.version;

  useEffect(() => {
    setLifecycleReason("");
    setLifecycleError("");
    setLifecycleResult(null);
  }, [selectedEntityId]);

  const { filtered, matchCount } = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matchingIds = new Set(entities.filter((entity) =>
      (!normalized || [
        entity.name,
        entity.stable_code,
        entity.entity_type,
        entity.current_mission ?? "",
        entity.active_alert ?? ""
      ].some((value) => value.toLowerCase().includes(normalized)))
      && (role === "ALL" || entity.entity_type === role)
      && (status === "ALL" || entity.status === status)
      && (health === "ALL" || entity.health === health)
    ).map((entity) => entity.entity_id));
    const includedIds = new Set(matchingIds);
    const byId = new Map(entities.map((entity) => [entity.entity_id, entity]));
    for (const entityId of matchingIds) {
      const seen = new Set<string>();
      let current = byId.get(entityId);
      while (current?.parent_id && !seen.has(current.parent_id)) {
        seen.add(current.parent_id);
        includedIds.add(current.parent_id);
        current = byId.get(current.parent_id);
      }
    }

    const included = hierarchy.filter((row) => includedIds.has(row.entity.entity_id));
    const siblingGroups = new Map<string, InfrastructureBaseRow[]>();
    for (const row of included) {
      const parentKey = row.entity.parent_id && includedIds.has(row.entity.parent_id)
        ? row.entity.parent_id
        : "__root__";
      const siblings = siblingGroups.get(parentKey) ?? [];
      siblings.push(row);
      siblingGroups.set(parentKey, siblings);
    }
    const rows: InfrastructureRow[] = included.map((row) => {
      const parentKey = row.entity.parent_id && includedIds.has(row.entity.parent_id)
        ? row.entity.parent_id
        : "__root__";
      const siblings = siblingGroups.get(parentKey) ?? [row];
      return {
        ...row,
        isContext: !matchingIds.has(row.entity.entity_id),
        positionInSet: siblings.findIndex((sibling) => sibling.entity.entity_id === row.entity.entity_id) + 1,
        setSize: siblings.length
      };
    });
    return { filtered: rows, matchCount: matchingIds.size };
  }, [entities, health, hierarchy, query, role, status]);

  const loadRecord = useCallback(async (entityId: string, signal?: AbortSignal) => {
    const loadId = ++recordLoadIdRef.current;
    setIsRecordLoading(true);
    setRecord(null);
    setRecordSequence(0);
    setRecordError("");
    try {
      for (let attempt = 1; attempt <= recordAlignmentAttempts; attempt += 1) {
        const response = await loadCanonicalEntity(source, entityId, { signal });
        if (signal?.aborted || loadId !== recordLoadIdRef.current) return;
        if (response.event_sequence === eventSequence) {
          setRecord(response.entity);
          setRecordSequence(response.event_sequence);
          return;
        }
        canonicalPortfolioCache.invalidate(canonicalQueryKeys.entity(source, entityId));
      }
      throw new Error(
        `The canonical entity record did not align with workspace event ${eventSequence} after ${recordAlignmentAttempts} readbacks. Refresh the workspace and retry.`
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      if (loadId !== recordLoadIdRef.current) return;
      setRecord(null);
      setRecordSequence(0);
      setRecordError(errorMessage(error));
    } finally {
      if (!signal?.aborted && loadId === recordLoadIdRef.current) setIsRecordLoading(false);
    }
  }, [eventSequence, source]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (viewport.clientHeight > 0) setViewportHeight(viewport.clientHeight);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (viewport.clientHeight > 0) setViewportHeight(viewport.clientHeight);
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedEntityId || !selectedSummary) {
      recordLoadIdRef.current += 1;
      setRecord(null);
      setRecordSequence(0);
      setRecordError("");
      setIsRecordLoading(false);
      return;
    }
    const cacheKey = canonicalQueryKeys.entity(source, selectedEntityId);
    const cached = canonicalPortfolioCache.get<{ entity: EntityFullRecord; event_sequence: number }>(cacheKey);
    if (cached?.event_sequence === eventSequence) {
      recordLoadIdRef.current += 1;
      setRecord(cached.entity);
      setRecordSequence(cached.event_sequence);
      setRecordError("");
      setIsRecordLoading(false);
      return;
    }
    if (cached) canonicalPortfolioCache.invalidate(cacheKey);
    const controller = new AbortController();
    void loadRecord(selectedEntityId, controller.signal);
    return () => controller.abort();
  }, [eventSequence, loadRecord, selectedEntityId, selectedSummary, source]);

  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const last = Math.min(filtered.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
  const visible = filtered.slice(first, last);
  const selectedIndex = selectedEntityId
    ? filtered.findIndex((row) => row.entity.entity_id === selectedEntityId)
    : -1;

  useEffect(() => {
    if (!selectedEntityId || selectedIndex < 0) return;
    setFocusedEntityId(selectedEntityId);
    const viewport = viewportRef.current;
    if (!viewport) return;
    const top = selectedIndex * rowHeight;
    const bottom = top + rowHeight;
    const effectiveHeight = viewport.clientHeight || viewportHeight;
    let nextScrollTop = viewport.scrollTop;
    if (top < viewport.scrollTop) nextScrollTop = top;
    if (bottom > viewport.scrollTop + effectiveHeight) {
      nextScrollTop = bottom - effectiveHeight;
    }
    if (nextScrollTop !== viewport.scrollTop) viewport.scrollTop = nextScrollTop;
    setScrollTop(nextScrollTop);
  }, [selectedEntityId, selectedIndex, viewportHeight]);

  useEffect(() => {
    const maximumScrollTop = Math.max(0, filtered.length * rowHeight - viewportHeight);
    if (scrollTop > maximumScrollTop) {
      if (viewportRef.current) viewportRef.current.scrollTop = maximumScrollTop;
      setScrollTop(maximumScrollTop);
    }
    if (!filtered.some((row) => row.entity.entity_id === focusedEntityId)) {
      const nextFocused = selectedEntityId && filtered.some((row) => row.entity.entity_id === selectedEntityId)
        ? selectedEntityId
        : filtered[0]?.entity.entity_id ?? null;
      setFocusedEntityId(nextFocused);
    }
  }, [filtered, focusedEntityId, scrollTop, selectedEntityId, viewportHeight]);

  useEffect(() => {
    if (!focusRequestedRef.current || !focusedEntityId) return;
    const row = rowRefs.current.get(focusedEntityId);
    if (!row) return;
    row.focus();
    focusRequestedRef.current = false;
  }, [first, focusedEntityId, last]);

  function ensureIndexIsVisible(index: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const top = index * rowHeight;
    const bottom = top + rowHeight;
    const effectiveHeight = viewport.clientHeight || viewportHeight;
    let nextScrollTop = viewport.scrollTop;
    if (top < viewport.scrollTop) nextScrollTop = top;
    if (bottom > viewport.scrollTop + effectiveHeight) {
      nextScrollTop = bottom - effectiveHeight;
    }
    if (nextScrollTop !== viewport.scrollTop) {
      viewport.scrollTop = nextScrollTop;
      setScrollTop(nextScrollTop);
    }
  }

  function moveFocusToIndex(index: number) {
    const boundedIndex = Math.max(0, Math.min(filtered.length - 1, index));
    const target = filtered[boundedIndex];
    if (!target) return;
    focusRequestedRef.current = true;
    setFocusedEntityId(target.entity.entity_id);
    ensureIndexIsVisible(boundedIndex);
  }

  function handleTreeKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const current = filtered[index];
    if (!current) return;
    let targetIndex = -1;
    if (event.key === "ArrowDown") targetIndex = Math.min(filtered.length - 1, index + 1);
    if (event.key === "ArrowUp") targetIndex = Math.max(0, index - 1);
    if (event.key === "Home") targetIndex = 0;
    if (event.key === "End") targetIndex = filtered.length - 1;
    if (event.key === "ArrowRight") {
      targetIndex = filtered.findIndex((row) => row.entity.parent_id === current.entity.entity_id);
    }
    if (event.key === "ArrowLeft") {
      targetIndex = current.entity.parent_id
        ? filtered.findIndex((row) => row.entity.entity_id === current.entity.parent_id)
        : -1;
      if (targetIndex < 0) {
        for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
          if (filtered[candidate].depth < current.depth) {
            targetIndex = candidate;
            break;
          }
        }
      }
    }
    if (targetIndex >= 0) {
      event.preventDefault();
      moveFocusToIndex(targetIndex);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectEntity(current.entity.entity_id);
    }
  }

  function selectEntity(entityId: string) {
    onSelectedEntityChange(entityId);
    const index = filtered.findIndex((row) => row.entity.entity_id === entityId);
    if (index >= 0) ensureIndexIsVisible(index);
  }

  function lifecycleRequest(
    entity: EntitySummary,
    actionType: EntityLifecycleActionType,
    reason: string,
    expectedVersion: number,
    previousStatus: EntityStatus,
    restoresActionId?: string
  ): EntityLifecycleActionRequest {
    const actionId = crypto.randomUUID();
    const businessId = entity.assigned_business_id;
    return {
      action_id: actionId,
      action_type: actionType,
      actor_id: humanUserId,
      actor_type: "HUMAN",
      authority_basis: {
        channel: "MEMBER_INFRASTRUCTURE",
        explicit_confirmation_required: true,
        target_version: expectedVersion
      },
      business_id: businessId,
      confidence: 1,
      expected_version: expectedVersion,
      idempotency_key: `member-infrastructure:${actionId}`,
      proposed_changes: {
        containment_policy: "FINISH_IN_FLIGHT",
        status: actionType === "PAUSE" ? "PAUSED" : "ACTIVE"
      },
      reason,
      requested_at: new Date().toISOString(),
      requested_outcome: `${actionType === "PAUSE" ? "Pause" : "Resume"} ${entity.name}.`,
      restores_action_id: restoresActionId,
      risk_class: "MEDIUM",
      rollback_plan: {
        action: actionType === "PAUSE" ? "RESUME" : "PAUSE",
        previous_status: previousStatus
      },
      scope: businessId
        ? {
            business_id: businessId,
            display_label: scopeLabel,
            entity_id: entity.entity_id,
            scope_id: businessId,
            scope_type: "BUSINESS"
          }
        : {
            display_label: scopeLabel,
            entity_id: entity.entity_id,
            scope_id: humanUserId,
            scope_type: "USER"
          },
      target_id: entity.entity_id,
      target_type: "ENTITY",
      verification_plan: {
        checks: [
          "Read target status and version after mutation.",
          "Verify the descendant new-work leasing guard.",
          "Require canonical event, audit, outbox, and ENTRAL completion receipts."
        ]
      }
    };
  }

  async function runLifecycleAction(
    actionType: EntityLifecycleActionType,
    restoration?: EntityLifecycleActionResult
  ) {
    if (!selectedSummary || isLifecycleRunning) return;
    const reason = restoration
      ? `Restore ${selectedSummary.name} by reversing governed action ${restoration.action_id}.`
      : lifecycleReason.trim();
    if (!reason) {
      setLifecycleError("Enter a concise operational reason before changing this entity.");
      return;
    }
    const expectedVersion = restoration?.after.version ?? selectedLifecycleVersion ?? selectedSummary.version;
    const previousStatus = restoration?.after.status ?? selectedLifecycleStatus ?? selectedSummary.status;
    const request = lifecycleRequest(
      selectedSummary,
      actionType,
      reason,
      expectedVersion,
      previousStatus,
      restoration?.action_id
    );
    setIsLifecycleRunning(true);
    setLifecycleError("");
    try {
      const payload = await apiFetch<unknown>(
        `/member/organizations/${encodeURIComponent(organizationId)}/entities/${encodeURIComponent(selectedSummary.entity_id)}/actions/${actionType.toLocaleLowerCase()}`,
        { json: request, method: "POST" }
      );
      if (!payload || typeof payload !== "object" || !("action" in payload)) {
        throw new Error("The lifecycle response did not contain an action receipt.");
      }
      const action = (payload as { action: EntityLifecycleActionResult }).action;
      assertEntityLifecycleActionResult(action);
      setLifecycleResult(action);
      setLifecycleReason("");
      onRefresh();
    } catch (error) {
      setLifecycleError(errorMessage(error));
    } finally {
      setIsLifecycleRunning(false);
    }
  }

  return (
    <section className="phase180-infrastructure" aria-labelledby="infrastructure-heading">
      <header className="phase180-surface-heading">
        <div>
          <p className="eyebrow">Canonical records · event {eventSequence}</p>
          <h1 id="infrastructure-heading">Infrastructure</h1>
          <p>Searchable RLS-visible hierarchy and on-demand full records. Eligible lower entities expose verified, version-bound Pause and Resume actions.</p>
        </div>
        <div className="phase180-integrity-note"><ShieldCheck size={18} /><span>PostgreSQL readback<strong>Version checked</strong></span></div>
      </header>
      <div className="phase180-infrastructure-filters">
        <label className="phase180-infrastructure-search">
          <Search aria-hidden="true" size={17} />
          <span className="sr-only">Search infrastructure</span>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search records" value={query} />
        </label>
        <label><span>Rank</span><select onChange={(event) => setRole(event.target.value)} value={role}><option value="ALL">All ranks</option>{roles.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Status</span><select onChange={(event) => setStatus(event.target.value)} value={status}><option value="ALL">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Health</span><select onChange={(event) => setHealth(event.target.value)} value={health}><option value="ALL">All health</option>{healthStates.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className={selectedEntityId ? "phase180-infrastructure-grid record-open" : "phase180-infrastructure-grid"}>
        <section className="phase180-infrastructure-tree" aria-label="Canonical hierarchy">
          <header>
            <strong>{matchCount.toLocaleString()} matching records</strong>
            <span>{filtered.length !== matchCount ? `${filtered.length.toLocaleString()} rows with lineage · ` : ""}{entities.length.toLocaleString()} in scope</span>
          </header>
          <div
            className="phase180-virtual-list"
            onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
            ref={viewportRef}
            aria-label="Canonical hierarchy"
            role="tree"
          >
            <div style={{ height: filtered.length * rowHeight, position: "relative" }}>
              {visible.map((row, offset) => {
                const index = first + offset;
                const entity = row.entity;
                const isSelected = entity.entity_id === selectedEntityId;
                return (
                  <button
                    aria-current={isSelected ? "true" : undefined}
                    aria-label={`${entity.name}, ${entity.entity_type}, parent ${row.parentName ?? "none"}`}
                    aria-level={row.depth + 1}
                    aria-posinset={row.positionInSet}
                    aria-selected={isSelected}
                    aria-setsize={row.setSize}
                    className={`${isSelected ? "selected " : ""}${row.isContext ? "lineage-context" : ""}`.trim()}
                    key={entity.entity_id}
                    onClick={() => selectEntity(entity.entity_id)}
                    onFocus={() => setFocusedEntityId(entity.entity_id)}
                    onKeyDown={(event) => handleTreeKeyDown(event, index)}
                    ref={(element) => {
                      if (element) rowRefs.current.set(entity.entity_id, element);
                      else rowRefs.current.delete(entity.entity_id);
                    }}
                    role="treeitem"
                    style={{
                      height: rowHeight,
                      paddingInlineStart: `${14 + Math.min(6, row.depth) * 16}px`,
                      position: "absolute",
                      top: index * rowHeight
                    }}
                    tabIndex={entity.entity_id === focusedEntityId ? 0 : -1}
                    type="button"
                  >
                    <i data-health={entity.health} />
                    <span>
                      <strong>{entity.name}{row.isContext ? " (lineage)" : ""}</strong>
                      <small>{entity.entity_type} · {entity.stable_code} · Parent: {row.parentName ?? "Root"}</small>
                    </span>
                    <em>v{entity.version}</em>
                  </button>
                );
              })}
            </div>
          </div>
          {selectedIndex >= 0 ? <footer>Selected row {selectedIndex + 1} of {filtered.length}</footer> : null}
        </section>
        <section className="phase180-record" aria-label="Canonical entity full record">
          {selectedSummary ? (
            <>
              <header className="phase180-record-heading">
                <button className="phase180-record-back" onClick={() => onSelectedEntityChange(null)} type="button"><ArrowLeft size={18} /> Back</button>
                <div>
                  <p className="eyebrow">{selectedSummary.entity_type} · version {selectedLifecycleVersion}</p>
                  <h2>{selectedSummary.name}</h2>
                  <p>{selectedSummary.stable_code} · {selectedLifecycleStatus} · {selectedSummary.health}</p>
                </div>
                <span>{recordSequence ? `Aligned snapshot event ${recordSequence}` : `Workspace event ${eventSequence}`}</span>
              </header>
              {selectedSummary.entity_type !== "ENTRAL" ? (
                <section className="phase190-lifecycle" aria-label="Governed pause and resume">
                  <div className="phase190-lifecycle-heading">
                    <div>
                      <span>Governed lifecycle</span>
                      <strong>{selectedLifecycleStatus === "PAUSED" ? "New work blocked" : "Current work state preserved"}</strong>
                    </div>
                    <small>Optimistic v{selectedLifecycleVersion} · finish in-flight</small>
                  </div>
                  <label>
                    <span>Operational reason</span>
                    <textarea
                      disabled={isLifecycleRunning}
                      maxLength={2_000}
                      onChange={(event) => setLifecycleReason(event.target.value)}
                      placeholder={`Why should ${selectedSummary.name} be ${selectedLifecycleStatus === "PAUSED" ? "resumed" : "paused"}?`}
                      rows={2}
                      value={lifecycleReason}
                    />
                  </label>
                  <div className="phase190-lifecycle-actions">
                    {selectedLifecycleStatus === "PAUSED" ? (
                      <button
                        disabled={isLifecycleRunning}
                        onClick={() => void runLifecycleAction("RESUME")}
                        type="button"
                      >
                        {isLifecycleRunning ? <Loader2 aria-hidden="true" className="spin" size={17} /> : <Play aria-hidden="true" size={17} />}
                        Resume entity
                      </button>
                    ) : selectedLifecycleStatus === "ACTIVE" || selectedLifecycleStatus === "DEGRADED" ? (
                      <button
                        disabled={isLifecycleRunning}
                        onClick={() => void runLifecycleAction("PAUSE")}
                        type="button"
                      >
                        {isLifecycleRunning ? <Loader2 aria-hidden="true" className="spin" size={17} /> : <Pause aria-hidden="true" size={17} />}
                        Pause entity
                      </button>
                    ) : (
                      <p>This entity cannot be paused or resumed from its current {selectedLifecycleStatus?.toLocaleLowerCase()} state.</p>
                    )}
                  </div>
                  {selectedLifecycleResult ? (
                    <div className="phase190-lifecycle-receipt" role="status">
                      <CheckCircle2 aria-hidden="true" size={18} />
                      <span>
                        <strong>{selectedLifecycleResult.action_type === "PAUSE" ? "Paused" : "Resumed"} and verified</strong>
                        Version {selectedLifecycleResult.before.version} → {selectedLifecycleResult.after.version} · event {selectedLifecycleResult.canonical_event.sequence_number}
                      </span>
                      <button
                        disabled={isLifecycleRunning}
                        onClick={() => void runLifecycleAction(selectedLifecycleResult.rollback.action_type, selectedLifecycleResult)}
                        type="button"
                      >
                        <RotateCcw aria-hidden="true" size={15} />
                        Undo
                      </button>
                    </div>
                  ) : null}
                  {lifecycleError ? <p className="phase190-lifecycle-error" role="alert">{lifecycleError}</p> : null}
                </section>
              ) : null}
              {isRecordLoading ? (
                <div className="phase180-record-state" role="status"><Loader2 className="spin" size={22} /> Loading canonical full record...</div>
              ) : recordError ? (
                <div className="phase180-record-state error" role="alert">
                  <AlertTriangle size={22} /><span>{recordError}</span>
                  <button onClick={() => void loadRecord(selectedSummary.entity_id)} type="button"><RefreshCw size={17} /> Retry</button>
                </div>
              ) : record ? (
                <div className="phase180-record-sections">
                  <JsonRecordSection label="Configuration" value={record.configuration} />
                  <JsonRecordSection label="Runtime" value={record.runtime} />
                  <JsonRecordSection label="Authority" value={record.authority} />
                  <JsonRecordSection label="Operations" value={record.operations} />
                  <JsonRecordSection label="Economics" value={record.economics} />
                  <JsonRecordSection label="Reliability" value={record.reliability} />
                  <JsonRecordSection label="Audit" value={record.audit} />
                  <JsonRecordSection label="Evidence" value={record.evidence} />
                  <JsonRecordSection label="Connections" value={record.connections} />
                  <JsonRecordSection label="Versions" value={record.version_history} />
                </div>
              ) : null}
            </>
          ) : (
            <div className="phase180-record-empty">
              {selectedEntityId ? <AlertTriangle aria-hidden="true" size={30} /> : <Database aria-hidden="true" size={30} />}
              <h2>{selectedEntityId ? "Requested record unavailable" : "Select an infrastructure record"}</h2>
              <p>{selectedEntityId
                ? `Entity ${selectedEntityId} is not present in the inherited canonical scope. No substitute record is shown.`
                : "The full canonical record loads on demand. No sample or browser-local state is shown."}</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
