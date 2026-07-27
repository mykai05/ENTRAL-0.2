"use client";

import type { EntitySummary } from "@entral/contracts";
import { AlertTriangle, RefreshCw } from "lucide-react";
import React from "react";

function TextualHierarchy({
  entities,
  label
}: {
  entities: readonly EntitySummary[];
  label: string;
}) {
  const byParent = new Map<string | null, EntitySummary[]>();
  for (const entity of entities) {
    const siblings = byParent.get(entity.parent_id) ?? [];
    siblings.push(entity);
    byParent.set(entity.parent_id, siblings);
  }
  for (const siblings of byParent.values()) {
    siblings.sort((left, right) =>
      left.stable_code.localeCompare(right.stable_code)
      || left.entity_id.localeCompare(right.entity_id)
    );
  }

  const entityIds = new Set(entities.map((entity) => entity.entity_id));
  const roots = entities
    .filter((entity) => !entity.parent_id || !entityIds.has(entity.parent_id))
    .sort((left, right) =>
      left.stable_code.localeCompare(right.stable_code)
      || left.entity_id.localeCompare(right.entity_id)
    );
  const rendered = new Set<string>();
  const firstEntityId = (roots[0] ?? entities[0])?.entity_id ?? null;

  function branch(
    children: readonly EntitySummary[],
    level: number,
    ancestors = new Set<string>()
  ): React.ReactNode[] {
    return children.flatMap((entity) => {
      if (rendered.has(entity.entity_id) || ancestors.has(entity.entity_id)) return [];
      rendered.add(entity.entity_id);
      const nextAncestors = new Set(ancestors).add(entity.entity_id);
      const descendants = (byParent.get(entity.entity_id) ?? [])
        .filter((candidate) => !nextAncestors.has(candidate.entity_id));
      return [(
        <li
          aria-expanded={descendants.length ? true : undefined}
          aria-label={`${entity.entity_type}: ${entity.name}, ${entity.status}, ${entity.health}`}
          aria-level={level}
          data-entity-id={entity.entity_id}
          key={entity.entity_id}
          role="treeitem"
          tabIndex={entity.entity_id === firstEntityId ? 0 : -1}
        >
          <span>
            <strong>{entity.name}</strong>
            <span>{entity.entity_type} · {entity.status} · {entity.health}</span>
          </span>
          {descendants.length ? (
            <ul role="group">{branch(descendants, level + 1, nextAncestors)}</ul>
          ) : null}
        </li>
      )];
    });
  }

  function handleTreeKeyDown(event: React.KeyboardEvent<HTMLUListElement>) {
    const current = event.target instanceof HTMLElement
      ? event.target.closest<HTMLElement>('[role="treeitem"]')
      : null;
    if (!current || !event.currentTarget.contains(current)) return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="treeitem"]')];
    const index = items.indexOf(current);
    let target: HTMLElement | null = null;
    if (event.key === "ArrowDown") target = items[index + 1] ?? null;
    if (event.key === "ArrowUp") target = items[index - 1] ?? null;
    if (event.key === "Home") target = items[0] ?? null;
    if (event.key === "End") target = items.at(-1) ?? null;
    if (event.key === "ArrowRight") {
      const group = [...current.children]
        .find((child) => child.getAttribute("role") === "group");
      target = group?.querySelector<HTMLElement>('[role="treeitem"]') ?? null;
    }
    if (event.key === "ArrowLeft") {
      target = current.parentElement?.closest<HTMLElement>('[role="treeitem"]') ?? null;
    }
    if (!target) return;
    event.preventDefault();
    for (const item of items) item.tabIndex = item === target ? 0 : -1;
    target.focus();
  }

  const rootBranches = branch(roots.length ? roots : entities, 1);
  const disconnectedBranches = branch(
    entities.filter((entity) => !rendered.has(entity.entity_id)),
    1
  );

  return (
    <details className="phase195-textual-hierarchy">
      <summary>{label} textual hierarchy · {entities.length.toLocaleString()} entities</summary>
      <ul aria-label={label} onKeyDown={handleTreeKeyDown} role="tree">
        {rootBranches}
        {disconnectedBranches}
      </ul>
    </details>
  );
}

type Props = {
  children: React.ReactNode;
  entities: readonly EntitySummary[];
  label: string;
  onFailure?: (diagnosticClass: string) => void;
};

type State = {
  diagnosticClass: string | null;
  retryKey: number;
};

export class CanonicalGraphErrorBoundary extends React.Component<Props, State> {
  state: State = {
    diagnosticClass: null,
    retryKey: 0
  };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return {
      diagnosticClass: error instanceof Error
        ? error.name.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 80) || "Error"
        : "UnknownFailure"
    };
  }

  componentDidCatch(error: unknown) {
    this.props.onFailure?.(
      error instanceof Error
        ? error.name.replace(/[^A-Z0-9_-]/gi, "_").slice(0, 80) || "Error"
        : "UnknownFailure"
    );
  }

  retry = () => {
    this.setState((current) => ({
      diagnosticClass: null,
      retryKey: current.retryKey + 1
    }));
  };

  render() {
    if (!this.state.diagnosticClass) {
      return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    }

    return (
      <section className="phase195-renderer-failure" role="alert">
        <AlertTriangle aria-hidden="true" size={22} />
        <div>
          <strong>{this.props.label} renderer unavailable</strong>
          <p>
            The authorized graph data is still available below. No sample graph
            was substituted. Retry the renderer or continue with the textual hierarchy.
          </p>
          <small>Diagnostic class: {this.state.diagnosticClass}</small>
        </div>
        <button onClick={this.retry} type="button">
          <RefreshCw aria-hidden="true" size={17} /> Retry renderer
        </button>
        <TextualHierarchy entities={this.props.entities} label={this.props.label} />
      </section>
    );
  }
}

export function CanonicalGraphEmptyState({
  label
}: {
  label: string;
}) {
  return (
    <section className="phase195-graph-empty" role="status">
      <strong>No authorized graph entities are available.</strong>
      <p>
        {label} has no RLS-visible canonical entities for the current organization
        and scope. Change scope or retry synchronization; no sample hierarchy is shown.
      </p>
    </section>
  );
}

export { TextualHierarchy as CanonicalGraphTextualHierarchy };
