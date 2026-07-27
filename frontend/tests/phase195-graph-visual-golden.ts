import type { EntitySummary } from "@entral/contracts";
import { canonicalAuthorityTierLabels } from "../components/CanonicalGraphSemanticsOverlay";
import { layoutGraph2D, layoutGraph3D } from "../lib/graph-layouts";
import { buildRendererGraphProjection } from "../lib/graph-projection";

type Point2D = {
  readonly x: number;
  readonly y: number;
};

const ROLE_COLORS = {
  ENTRAL: "#f4f7ff",
  MARSHAL: "#8eb9ff",
  GENERAL: "#55e8d5",
  COMMANDER: "#d6a7ff",
  SOLDIER: "#ffca75"
} as const;

function fixed(value: number) {
  return Number.isFinite(value) ? value.toFixed(2) : "0.00";
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizedScreenPoints(
  points: readonly {
    readonly entityId: string;
    readonly x: number;
    readonly y: number;
    readonly z?: number;
  }[],
  center: Point2D,
  project: (point: {
    readonly x: number;
    readonly y: number;
    readonly z?: number;
  }) => Point2D
) {
  const projected = points.map((point) => ({
    entityId: point.entityId,
    ...project(point)
  }));
  const maximum = Math.max(
    1,
    ...projected.map((point) => Math.hypot(point.x, point.y))
  );
  const scale = 228 / maximum;
  return new Map(projected.map((point) => [
    point.entityId,
    {
      x: center.x + point.x * scale,
      y: center.y + point.y * scale
    }
  ]));
}

function panelMarkup({
  center,
  dimension,
  edges,
  entities,
  points
}: {
  readonly center: Point2D;
  readonly dimension: "2D" | "3D";
  readonly edges: readonly {
    readonly edgeId: string;
    readonly sourceId: string;
    readonly targetId: string;
  }[];
  readonly entities: readonly EntitySummary[];
  readonly points: ReadonlyMap<string, Point2D>;
}) {
  const entityById = new Map(entities.map((entity) => [entity.entity_id, entity]));
  const tierLabels = canonicalAuthorityTierLabels(entities);
  const lines = edges.flatMap((edge) => {
    const source = points.get(edge.sourceId);
    const target = points.get(edge.targetId);
    if (!source || !target) return [];
    return [
      `    <line data-edge-id="${escapeXml(edge.edgeId)}" x1="${fixed(source.x)}" y1="${fixed(source.y)}" x2="${fixed(target.x)}" y2="${fixed(target.y)}" />`
    ];
  });
  const rings = tierLabels.map((tier) => {
    const rolePoints = entities.flatMap((entity) => {
      if (entity.entity_type !== tier.role) return [];
      const point = points.get(entity.entity_id);
      return point ? [point] : [];
    });
    const radius = tier.tier === 0
      ? 7
      : Math.max(
        18,
        ...rolePoints.map((point) => Math.hypot(
          point.x - center.x,
          point.y - center.y
        ))
      );
    const labelY = center.y - radius;
    return [
      `    <circle data-authority-role="${tier.role}" data-authority-tier="${tier.tier}" cx="${fixed(center.x)}" cy="${fixed(center.y)}" r="${fixed(radius)}" style="--tier-color:${tier.color}" />`,
      `    <text data-tier-label="${tier.role}" x="${fixed(center.x)}" y="${fixed(labelY)}">Tier ${tier.tier} | ${tier.role} | ${tier.count}</text>`
    ].join("\n");
  });
  const nodes = [...points.entries()].map(([entityId, point]) => {
    const entity = entityById.get(entityId);
    if (!entity) throw new Error(`Visual golden cannot resolve ${entityId}`);
    return [
      `    <circle class="node" data-entity-id="${escapeXml(entityId)}" data-role="${entity.entity_type}" cx="${fixed(point.x)}" cy="${fixed(point.y)}" r="${entity.entity_type === "ENTRAL" ? "7.00" : "4.50"}" fill="${ROLE_COLORS[entity.entity_type]}">`,
      `      <title>${escapeXml(entity.name)} | ${entity.entity_type} | ${entity.status} | ${entity.health}</title>`,
      "    </circle>"
    ].join("\n");
  });

  return [
    `  <g aria-label="${dimension} canonical graph visual golden" data-dimension="${dimension.toLowerCase()}">`,
    `    <rect class="panel" x="${fixed(center.x - 300)}" y="40.00" width="600.00" height="560.00" rx="18.00" />`,
    `    <text class="heading" x="${fixed(center.x - 276)}" y="76.00">${dimension} GRAPH</text>`,
    ...rings,
    ...lines,
    ...nodes,
    "  </g>"
  ].join("\n");
}

export function phase195DualGraphVisualGoldenSvg(
  entities: readonly EntitySummary[]
) {
  const projection = buildRendererGraphProjection(entities, {
    organizationId: "19500000-0000-4000-8000-000000000001",
    projectionVersion: 195,
    scopeKey: "organization:19500000-0000-4000-8000-000000000001"
  });
  const twoDimensional = layoutGraph2D(projection);
  const threeDimensional = layoutGraph3D(projection);
  const twoDimensionalCenter = { x: 320, y: 330 };
  const threeDimensionalCenter = { x: 960, y: 330 };
  const twoDimensionalPoints = normalizedScreenPoints(
    twoDimensional.points,
    twoDimensionalCenter,
    (point) => ({ x: point.x, y: point.y })
  );
  const threeDimensionalPoints = normalizedScreenPoints(
    threeDimensional.points,
    threeDimensionalCenter,
    (point) => ({
      x: point.x + (point.z ?? 0) * 0.38,
      y: point.y - (point.z ?? 0) * 0.22
    })
  );

  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<svg xmlns=\"http://www.w3.org/2000/svg\" role=\"img\" aria-labelledby=\"title description\" viewBox=\"0 0 1280 640\">",
    "  <title id=\"title\">Phase 195 deterministic dual graph visual golden</title>",
    "  <desc id=\"description\">Portable source golden for exact 2D and projected 3D authority layouts, tier labels, edges, and non-color node semantics.</desc>",
    "  <style>",
    "    .background{fill:#050913}.panel{fill:#09111f;stroke:#263b5d;stroke-width:1.5}",
    "    [data-dimension] line{stroke:#7092c5;stroke-opacity:.7;stroke-width:1}",
    "    [data-authority-tier]{fill:none;stroke:var(--tier-color);stroke-opacity:.32;stroke-width:1}",
    "    text{fill:#a8b6cd;font-family:system-ui,sans-serif;font-size:10px;font-weight:700}",
    "    .heading{fill:#f0f5ff;font-size:16px;letter-spacing:1.5px}.node{stroke:#050913;stroke-width:1.5}",
    "  </style>",
    "  <rect class=\"background\" width=\"1280\" height=\"640\" />",
    panelMarkup({
      center: twoDimensionalCenter,
      dimension: "2D",
      edges: twoDimensional.edges,
      entities,
      points: twoDimensionalPoints
    }),
    panelMarkup({
      center: threeDimensionalCenter,
      dimension: "3D",
      edges: threeDimensional.edges,
      entities,
      points: threeDimensionalPoints
    }),
    "  <g aria-label=\"Visual semantics\" transform=\"translate(24 620)\">",
    "    <text>Authority: inner to outer | Edge: parent to child | Selection: white halo | Tooltip: role, status, health</text>",
    "  </g>",
    "</svg>",
    ""
  ].join("\n");
}
