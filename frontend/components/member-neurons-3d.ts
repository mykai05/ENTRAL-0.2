import type { MemberOverviewResponse } from "../lib/member";
import {
  buildMemberGraphModel,
  type MemberGraphBranch,
  type MemberGraphEdge,
  type MemberGraphNode
} from "./member-graph-model";

export type MemberNeuron3D = MemberGraphNode & {
  x3: number;
  y3: number;
  z3: number;
};

export type MemberNeuronScene3D = {
  edges: MemberGraphEdge[];
  hierarchySource: "published" | "starter";
  hiddenNodeCount: number;
  nodes: MemberNeuron3D[];
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

function orbitRadius(node: MemberGraphNode) {
  if (node.branch === "marshal") return 240;
  if (node.branch === "general") return 130;
  if (node.branch === "commander") return 70;
  if (node.branch === "soldier") return 35;
  if (["health", "priorities", "work", "team", "summary", "findings"].includes(node.branch)) {
    return node.kind === node.branch ? 82 : 38;
  }
  return 46;
}

function selectVisibleNodes(nodes: MemberGraphNode[]) {
  if (nodes.length <= memberRenderBudget) return nodes;
  return [...nodes]
    .sort((first, second) => first.depth - second.depth || first.id.localeCompare(second.id))
    .slice(0, memberRenderBudget);
}

export function buildMemberNeuronScene3D(overview: MemberOverviewResponse): MemberNeuronScene3D {
  const model = buildMemberGraphModel(overview);
  const visibleNodes = selectVisibleNodes(model.nodes);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const siblingGroups = new Map<string, MemberGraphNode[]>();
  for (const node of visibleNodes) {
    const key = node.parentId ?? "__root__";
    siblingGroups.set(key, [...(siblingGroups.get(key) ?? []), node]);
  }

  const positioned = new Map<string, MemberNeuron3D>();
  for (const node of [...visibleNodes].sort((first, second) => first.depth - second.depth || first.id.localeCompare(second.id))) {
    if (!node.parentId) {
      positioned.set(node.id, { ...node, x3: 0, y3: 0, z3: 0 });
      continue;
    }

    const parent = positioned.get(node.parentId);
    if (!parent) continue;
    const siblings = siblingGroups.get(node.parentId) ?? [node];
    const siblingIndex = Math.max(0, siblings.findIndex((candidate) => candidate.id === node.id));
    const angle = (Math.PI * 2 * siblingIndex) / Math.max(1, siblings.length) + stableUnit(node.parentId, 17) * Math.PI * 2;
    const tilt = (stableUnit(node.parentId, 31) - 0.5) * 0.82;
    const radius = orbitRadius(node) * (0.92 + stableUnit(node.id, 47) * 0.16);
    const vertical = Math.sin(angle * 1.7 + tilt) * radius * 0.34;

    positioned.set(node.id, {
      ...node,
      x3: rounded(parent.x3 + Math.cos(angle) * radius),
      y3: rounded(parent.y3 + vertical),
      z3: rounded(parent.z3 + Math.sin(angle) * Math.cos(tilt) * radius)
    });
  }

  const nodes = visibleNodes.map((node) => positioned.get(node.id)).filter((node): node is MemberNeuron3D => Boolean(node));
  return {
    edges: model.edges.filter((item) => visibleIds.has(item.from) && visibleIds.has(item.to)),
    hierarchySource: model.hierarchySource,
    hiddenNodeCount: Math.max(0, model.nodes.length - nodes.length),
    nodes,
    totalNodeCount: model.nodes.length
  };
}
