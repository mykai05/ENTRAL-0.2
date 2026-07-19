import type { NodeType } from "./command-os";

export const COMMAND_UNIVERSE_RENDER_BUDGET = 900;

export type CommandUniverseNode = {
  commandType: NodeType;
  id: string;
  parentId: string | null;
  status?: string;
};

export type CommandUniversePlacement = {
  angle: number;
  index: number;
  radius: number;
  shell: number;
  shellCount: number;
};

export type CommandUniverseVisibility = {
  hiddenCount: number;
  ids: Set<string>;
  renderedCount: number;
  totalCount: number;
};

const rankPriority: Record<NodeType, number> = {
  emperor: 0,
  marshal: 1,
  general: 2,
  commander: 3,
  soldier: 4
};

const orbitCapacity: Record<Exclude<NodeType, "emperor">, number> = {
  marshal: 8,
  general: 12,
  commander: 10,
  soldier: 14
};

const orbitRadius: Record<Exclude<NodeType, "emperor">, { base: number; gap: number }> = {
  marshal: { base: 285, gap: 92 },
  general: { base: 138, gap: 74 },
  commander: { base: 82, gap: 48 },
  soldier: { base: 38, gap: 25 }
};

function stableFraction(seed: string) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % 10000) / 10000;
}

function lineage(nodeId: string, nodesById: Map<string, CommandUniverseNode>) {
  const ids: string[] = [];
  let current = nodesById.get(nodeId);
  const visited = new Set<string>();

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    ids.unshift(current.id);
    current = current.parentId ? nodesById.get(current.parentId) : undefined;
  }

  return ids;
}

function descendants(nodeId: string, childrenByParent: Map<string, CommandUniverseNode[]>) {
  const result: CommandUniverseNode[] = [];
  const queue = [...(childrenByParent.get(nodeId) ?? [])];

  while (queue.length > 0) {
    const node = queue.shift() as CommandUniverseNode;
    result.push(node);
    queue.push(...(childrenByParent.get(node.id) ?? []));
  }

  return result;
}

function prioritySort(a: CommandUniverseNode, b: CommandUniverseNode) {
  const rank = rankPriority[a.commandType] - rankPriority[b.commandType];
  if (rank !== 0) return rank;

  const aActive = a.status === "working" || a.status === "thinking" || a.status === "error" || a.status === "waiting";
  const bActive = b.status === "working" || b.status === "thinking" || b.status === "error" || b.status === "waiting";
  if (aActive !== bActive) return aActive ? -1 : 1;

  return a.id.localeCompare(b.id);
}

export function buildCommandUniversePlacements(nodes: CommandUniverseNode[]) {
  const placements = new Map<string, CommandUniversePlacement>();
  const childrenByParent = new Map<string, CommandUniverseNode[]>();

  for (const node of nodes) {
    if (!node.parentId || node.commandType === "emperor") continue;
    const siblings = childrenByParent.get(node.parentId) ?? [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }

  for (const [parentId, children] of childrenByParent) {
    const ranked = [...children].sort(prioritySort);

    for (const commandType of ["marshal", "general", "commander", "soldier"] as const) {
      const siblings = ranked.filter((node) => node.commandType === commandType);
      const capacity = orbitCapacity[commandType];
      const radius = orbitRadius[commandType];

      siblings.forEach((node, index) => {
        const shell = Math.floor(index / capacity);
        const shellStart = shell * capacity;
        const shellCount = Math.min(capacity, siblings.length - shellStart);
        const indexInShell = index - shellStart;
        const phase = stableFraction(`${parentId}:${commandType}:${shell}`) * Math.PI * 2;

        placements.set(node.id, {
          angle: phase + (indexInShell / Math.max(shellCount, 1)) * Math.PI * 2,
          index,
          radius: radius.base + shell * radius.gap,
          shell,
          shellCount
        });
      });
    }
  }

  return placements;
}

export function selectCommandUniverseVisibility(
  nodes: CommandUniverseNode[],
  selectedId: string | null,
  budget = COMMAND_UNIVERSE_RENDER_BUDGET
): CommandUniverseVisibility {
  const safeBudget = Math.max(1, Math.floor(budget));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParent = new Map<string, CommandUniverseNode[]>();

  for (const node of nodes) {
    if (!node.parentId) continue;
    const children = childrenByParent.get(node.parentId) ?? [];
    children.push(node);
    childrenByParent.set(node.parentId, children);
  }

  const selected = selectedId ? nodesById.get(selectedId) : undefined;
  const ordered = selected && selected.commandType !== "emperor"
    ? [
      ...lineage(selected.id, nodesById).map((id) => nodesById.get(id)).filter((node): node is CommandUniverseNode => Boolean(node)),
      ...descendants(selected.id, childrenByParent).sort(prioritySort),
      ...nodes.filter((node) => node.commandType === "marshal" || node.commandType === "general").sort(prioritySort)
    ]
    : [...nodes].sort(prioritySort);
  const ids = new Set<string>();

  for (const node of ordered) {
    if (ids.size >= safeBudget) break;
    ids.add(node.id);
  }

  return {
    hiddenCount: Math.max(0, nodes.length - ids.size),
    ids,
    renderedCount: ids.size,
    totalCount: nodes.length
  };
}

