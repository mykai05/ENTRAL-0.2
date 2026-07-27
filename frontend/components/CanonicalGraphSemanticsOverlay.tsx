"use client";

import type { EntitySummary } from "@entral/contracts";
import React, { useMemo } from "react";
import {
  GRAPH_AUTHORITY_ROLES,
  type GraphAuthorityRole
} from "../lib/graph-authority";

const AUTHORITY_COLORS: Readonly<Record<GraphAuthorityRole, string>> = {
  ENTRAL: "#f4f7ff",
  MARSHAL: "#8eb9ff",
  GENERAL: "#55e8d5",
  COMMANDER: "#d6a7ff",
  SOLDIER: "#ffca75"
};

export type CanonicalAuthorityTierLabel = {
  readonly color: string;
  readonly count: number;
  readonly role: GraphAuthorityRole;
  readonly tier: number;
};

export function canonicalAuthorityTierLabels(
  entities: readonly EntitySummary[]
): readonly CanonicalAuthorityTierLabel[] {
  const counts = new Map<GraphAuthorityRole, number>(
    GRAPH_AUTHORITY_ROLES.map((role) => [role, 0])
  );
  for (const entity of entities) {
    counts.set(entity.entity_type, (counts.get(entity.entity_type) ?? 0) + 1);
  }
  return GRAPH_AUTHORITY_ROLES.map((role, tier) => ({
    color: AUTHORITY_COLORS[role],
    count: counts.get(role) ?? 0,
    role,
    tier
  }));
}

export function CanonicalGraphSemanticsOverlay({
  dimension,
  entities,
  legendVisible = true,
  pattern
}: {
  readonly dimension: "2D" | "3D";
  readonly entities: readonly EntitySummary[];
  readonly legendVisible?: boolean;
  readonly pattern?: string;
}) {
  const tiers = useMemo(
    () => canonicalAuthorityTierLabels(entities),
    [entities]
  );
  const usesAuthorityBands = (
    dimension === "2D"
    && pattern === "hierarchy-tree"
  );
  const authorityDirection = usesAuthorityBands
    ? "Authority runs top to bottom"
    : "Authority runs inner to outer";

  return (
    <div
      className="phase195-graph-semantics-overlay"
      data-authority-guide={usesAuthorityBands ? "bands" : "rings"}
      data-graph-semantics-dimension={dimension.toLowerCase()}
    >
      <ol
        aria-label={`${dimension} authority tier and ${usesAuthorityBands ? "level" : "ring"} labels`}
        className="phase195-authority-rings"
        data-authority-guide={usesAuthorityBands ? "bands" : "rings"}
      >
        {tiers.map((tier) => (
          <li
            aria-label={`Tier ${tier.tier}: ${tier.role}, ${tier.count} visible ${tier.count === 1 ? "entity" : "entities"}`}
            data-authority-role={tier.role}
            data-authority-tier={tier.tier}
            key={tier.role}
            style={{
              "--phase195-authority-color": tier.color,
              "--phase195-authority-tier": tier.tier
            } as React.CSSProperties}
          >
            <span>
              <strong>Tier {tier.tier}</strong>
              {tier.role}
              <small>{tier.count.toLocaleString("en-US")}</small>
            </span>
          </li>
        ))}
      </ol>
      {legendVisible ? (
        <ul
          aria-label={`${dimension} graph visual semantics`}
          className="phase195-graph-semantics-key"
        >
          <li data-graph-semantic="authority">
            <i aria-hidden="true" className="authority" />
            {authorityDirection}
          </li>
          <li data-graph-semantic="edge">
            <i aria-hidden="true" className="edge" />
            Parent to child edge
          </li>
          <li data-graph-semantic="selection">
            <i aria-hidden="true" className="selection" />
            White halo marks selection
          </li>
          <li data-graph-semantic="state">
            <i aria-hidden="true" className="state" />
            Tooltip names health and status
          </li>
        </ul>
      ) : null}
    </div>
  );
}
