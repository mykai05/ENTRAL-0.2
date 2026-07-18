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
  nodes: MemberNeuron3D[];
};

export const memberBranchOrder: MemberGraphBranch[] = [
  "core",
  "health",
  "priorities",
  "work",
  "team",
  "summary",
  "findings"
];

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

function branchAngle(branch: MemberGraphBranch) {
  const branchIndex = Math.max(0, memberBranchOrder.indexOf(branch) - 1);
  return -Math.PI / 2 + (Math.PI * 2 * branchIndex) / 6;
}

export function buildMemberNeuronScene3D(overview: MemberOverviewResponse): MemberNeuronScene3D {
  const model = buildMemberGraphModel(overview);
  const branchLeaves = new Map<MemberGraphBranch, MemberGraphNode[]>();

  for (const node of model.nodes) {
    if (node.depth < 2) continue;
    const current = branchLeaves.get(node.branch) ?? [];
    current.push(node);
    branchLeaves.set(node.branch, current);
  }

  const nodes = model.nodes.map<MemberNeuron3D>((node) => {
    if (node.depth === 0) {
      return { ...node, x3: 0, y3: 0, z3: 0 };
    }

    const angle = branchAngle(node.branch);
    if (node.depth === 1) {
      return {
        ...node,
        x3: rounded(Math.cos(angle) * 250),
        y3: rounded(Math.sin(angle * 1.7) * 76),
        z3: rounded(Math.sin(angle) * 250)
      };
    }

    const siblings = branchLeaves.get(node.branch) ?? [node];
    const siblingIndex = Math.max(0, siblings.findIndex((candidate) => candidate.id === node.id));
    const siblingCount = Math.max(1, siblings.length);
    const spread = Math.min(0.86, 0.16 + siblingCount * 0.035);
    const offset = siblingCount === 1 ? 0 : -spread / 2 + (spread * siblingIndex) / (siblingCount - 1);
    const jitter = (stableUnit(node.id, 13) - 0.5) * 0.07;
    const depthRadius = node.depth === 3 ? 585 : 435;
    const radius = depthRadius + (stableUnit(node.id, 29) - 0.5) * (node.depth === 3 ? 86 : 58);
    const verticalBand = ((siblingIndex % 7) - 3) * 35;
    const verticalJitter = (stableUnit(node.id, 47) - 0.5) * 42;
    const finalAngle = angle + offset + jitter;

    return {
      ...node,
      x3: rounded(Math.cos(finalAngle) * radius),
      y3: rounded(verticalBand + verticalJitter + (node.depth === 3 ? 22 : 0)),
      z3: rounded(Math.sin(finalAngle) * radius)
    };
  });

  return { edges: model.edges, nodes };
}
