import type { MemberOverviewResponse } from "../lib/member";
import {
  buildMemberGraphModel,
  type MemberGraphBranch,
  type MemberGraphEdge,
  type MemberGraphNode
} from "./member-graph-model";

export type MemberOrbitFamily = "command" | "records" | "signals";

export type MemberNeuron3D = MemberGraphNode & {
  orbitFamily: MemberOrbitFamily;
  orbitLane: number;
  orbitPhase: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitTilt: number;
  orbitYaw: number;
  x3: number;
  y3: number;
  z3: number;
};

export type MemberOrbitTrack3D = {
  branch: MemberGraphBranch;
  depth: number;
  family: MemberOrbitFamily;
  id: string;
  lane: number;
  parentId: string;
  radius: number;
  tilt: number;
  yaw: number;
};

export type MemberNeuronPoint3D = { x: number; y: number; z: number };

export type MemberNeuronScene3D = {
  edges: MemberGraphEdge[];
  hierarchySource: "published" | "starter";
  hiddenNodeCount: number;
  nodes: MemberNeuron3D[];
  orbits: MemberOrbitTrack3D[];
  totalNodeCount: number;
};

export const memberBranchOrder: MemberGraphBranch[] = [
  "core",
  "marshal",
  "general",
  "commander",
  "soldier",
  "health",
  "priorities",
  "work",
  "team",
  "summary",
  "findings"
];

const memberRenderBudget = 900;
const commandBranches = new Set<MemberGraphBranch>(["core", "marshal", "general", "commander", "soldier"]);
const signalBranches = new Set<MemberGraphBranch>(["health", "priorities", "work", "team", "summary", "findings"]);

type OrbitProfile = {
  capacity: number;
  laneSpacing: number;
  radius: number;
  speed: number;
  tilt: number;
};

function stableUnit(value: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

function rounded(value: number) {
  return Number(value.toFixed(4));
}

function orbitFamily(node: MemberGraphNode): MemberOrbitFamily {
  if (commandBranches.has(node.branch)) return "command";
  if (signalBranches.has(node.branch) && node.kind === node.branch) return "signals";
  return "records";
}

function orbitProfile(node: MemberGraphNode): OrbitProfile {
  if (node.branch === "marshal") return { capacity: 8, laneSpacing: 88, radius: 250, speed: 0.055, tilt: 0.19 };
  if (node.branch === "general") return { capacity: 16, laneSpacing: 48, radius: 138, speed: 0.095, tilt: 0.34 };
  if (node.branch === "commander") return { capacity: 10, laneSpacing: 31, radius: 76, speed: 0.16, tilt: 0.46 };
  if (node.branch === "soldier") return { capacity: 12, laneSpacing: 14, radius: 35, speed: 0.27, tilt: 0.57 };
  if (orbitFamily(node) === "signals") return { capacity: 8, laneSpacing: 24, radius: 100, speed: 0.12, tilt: 0.26 };
  return { capacity: 14, laneSpacing: 13, radius: 41, speed: 0.21, tilt: 0.48 };
}

function nodeSelectionOrder(first: MemberGraphNode, second: MemberGraphNode) {
  return first.depth - second.depth || (first.parentId ?? "").localeCompare(second.parentId ?? "") || first.id.localeCompare(second.id);
}

function selectVisibleNodes(nodes: MemberGraphNode[]) {
  if (nodes.length <= memberRenderBudget) return nodes;

  const sorted = [...nodes].sort(nodeSelectionOrder);
  const selected = new Map<string, MemberGraphNode>();
  const quotas: Array<[MemberGraphBranch, number]> = [
    ["core", 1],
    ["marshal", 24],
    ["general", 180],
    ["commander", 280],
    ["soldier", 320]
  ];

  for (const [branch, quota] of quotas) {
    let added = 0;
    for (const node of sorted) {
      if (node.branch !== branch || added >= quota || selected.size >= memberRenderBudget) continue;
      if (node.parentId && !selected.has(node.parentId)) continue;
      selected.set(node.id, node);
      added += 1;
    }
  }

  let changed = true;
  while (selected.size < memberRenderBudget && changed) {
    changed = false;
    for (const node of sorted) {
      if (selected.size >= memberRenderBudget) break;
      if (selected.has(node.id) || (node.parentId && !selected.has(node.parentId))) continue;
      selected.set(node.id, node);
      changed = true;
    }
  }

  return [...selected.values()].sort(nodeSelectionOrder);
}

function rotateOrbitPoint(point: MemberNeuronPoint3D, tilt: number, yaw: number): MemberNeuronPoint3D {
  const tilted = {
    x: point.x,
    y: point.y * Math.cos(tilt) - point.z * Math.sin(tilt),
    z: point.y * Math.sin(tilt) + point.z * Math.cos(tilt)
  };
  return {
    x: tilted.x * Math.cos(yaw) + tilted.z * Math.sin(yaw),
    y: tilted.y,
    z: -tilted.x * Math.sin(yaw) + tilted.z * Math.cos(yaw)
  };
}

export function memberOrbitPoint(
  radius: number,
  angle: number,
  tilt: number,
  yaw: number,
  spacing = 1
): MemberNeuronPoint3D {
  const scaledRadius = radius * spacing;
  return rotateOrbitPoint({
    x: Math.cos(angle) * scaledRadius,
    y: 0,
    z: Math.sin(angle) * scaledRadius
  }, tilt, yaw);
}

export function positionMemberNeuronScene3D(
  nodes: MemberNeuron3D[],
  elapsedSeconds = 0,
  spacing = 1
): Map<string, MemberNeuronPoint3D> {
  const positions = new Map<string, MemberNeuronPoint3D>();
  for (const node of [...nodes].sort(nodeSelectionOrder)) {
    if (!node.parentId) {
      positions.set(node.id, { x: 0, y: 0, z: 0 });
      continue;
    }
    const parent = positions.get(node.parentId);
    if (!parent) continue;
    const local = memberOrbitPoint(
      node.orbitRadius,
      node.orbitPhase + elapsedSeconds * node.orbitSpeed,
      node.orbitTilt,
      node.orbitYaw,
      spacing
    );
    positions.set(node.id, {
      x: parent.x + local.x,
      y: parent.y + local.y,
      z: parent.z + local.z
    });
  }
  return positions;
}

export function memberOrbitTrackPoints(
  track: MemberOrbitTrack3D,
  center: MemberNeuronPoint3D,
  spacing = 1,
  segments = 96
) {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const local = memberOrbitPoint(track.radius, Math.PI * 2 * index / segments, track.tilt, track.yaw, spacing);
    return { x: center.x + local.x, y: center.y + local.y, z: center.z + local.z };
  });
}

export function buildMemberNeuronScene3D(overview: MemberOverviewResponse): MemberNeuronScene3D {
  const model = buildMemberGraphModel(overview);
  const visibleNodes = selectVisibleNodes(model.nodes);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const siblingGroups = new Map<string, MemberGraphNode[]>();

  for (const node of visibleNodes) {
    if (!node.parentId) continue;
    const key = `${node.parentId}:${orbitFamily(node)}:${node.branch}`;
    siblingGroups.set(key, [...(siblingGroups.get(key) ?? []), node]);
  }
  for (const siblings of siblingGroups.values()) siblings.sort((first, second) => first.id.localeCompare(second.id));

  const orbitalNodes: MemberNeuron3D[] = visibleNodes.map((node) => {
    if (!node.parentId) {
      return {
        ...node,
        orbitFamily: "command",
        orbitLane: 0,
        orbitPhase: 0,
        orbitRadius: 0,
        orbitSpeed: 0,
        orbitTilt: 0,
        orbitYaw: 0,
        x3: 0,
        y3: 0,
        z3: 0
      };
    }

    const family = orbitFamily(node);
    const siblings = siblingGroups.get(`${node.parentId}:${family}:${node.branch}`) ?? [node];
    const siblingIndex = Math.max(0, siblings.findIndex((candidate) => candidate.id === node.id));
    const profile = orbitProfile(node);
    const lane = Math.floor(siblingIndex / profile.capacity);
    const laneIndex = siblingIndex % profile.capacity;
    const laneCount = Math.min(profile.capacity, siblings.length - lane * profile.capacity);
    const direction = stableUnit(`${node.parentId}:${node.branch}`, 71) > 0.5 ? 1 : -1;
    const planeKey = `${node.parentId}:${family}:${node.branch}:${lane}`;

    return {
      ...node,
      orbitFamily: family,
      orbitLane: lane,
      orbitPhase: Math.PI * 2 * laneIndex / Math.max(1, laneCount) + stableUnit(planeKey, 17) * 0.42,
      orbitRadius: profile.radius + lane * profile.laneSpacing,
      orbitSpeed: profile.speed * direction * (0.9 + stableUnit(node.id, 83) * 0.2),
      orbitTilt: (stableUnit(planeKey, 31) - 0.5) * profile.tilt * 2,
      orbitYaw: stableUnit(planeKey, 47) * Math.PI * 2,
      x3: 0,
      y3: 0,
      z3: 0
    };
  });

  const initialPositions = positionMemberNeuronScene3D(orbitalNodes);
  const nodes = orbitalNodes.map((node) => {
    const point = initialPositions.get(node.id) ?? { x: 0, y: 0, z: 0 };
    return { ...node, x3: rounded(point.x), y3: rounded(point.y), z3: rounded(point.z) };
  });
  const trackMap = new Map<string, MemberOrbitTrack3D>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const id = `${node.parentId}:${node.orbitFamily}:${node.branch}:${node.orbitLane}`;
    if (!trackMap.has(id)) {
      trackMap.set(id, {
        branch: node.branch,
        depth: node.depth,
        family: node.orbitFamily,
        id,
        lane: node.orbitLane,
        parentId: node.parentId,
        radius: node.orbitRadius,
        tilt: node.orbitTilt,
        yaw: node.orbitYaw
      });
    }
  }

  return {
    edges: model.edges.filter((item) => visibleIds.has(item.from) && visibleIds.has(item.to)),
    hierarchySource: model.hierarchySource,
    hiddenNodeCount: Math.max(0, model.nodes.length - nodes.length),
    nodes,
    orbits: [...trackMap.values()].sort((first, second) => first.depth - second.depth || first.id.localeCompare(second.id)),
    totalNodeCount: model.nodes.length
  };
}
