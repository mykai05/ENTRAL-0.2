import {
  type CommandMemory,
  type CommandStatus,
  type CommandTask,
  type CommandTaskStatus,
  type NodeType
} from "./command-os";

export type CommandNodeLike = {
  children?: string[];
  commandType: NodeType;
  currentTask: string | null;
  groupId: string;
  id: string;
  logs: string[];
  memory: CommandMemory;
  name: string;
  parentCommanderId?: string | null;
  parentCommanderName?: string | null;
  parentGeneralId?: string | null;
  parentGeneralName?: string | null;
  parentId: string | null;
  parentMarshalId?: string | null;
  parentMarshalName?: string | null;
  status: CommandStatus;
  taskHistory: string[];
  type: "core" | "agent";
};

export type CommandGroupLike = {
  collapsed?: boolean;
  color: string;
  id: string;
  name: string;
};

export type CommandEdgeLike = {
  id: string;
  label: string;
  source: string;
  target: string;
};

export type CommandOSState<TNode extends CommandNodeLike = CommandNodeLike> = {
  edges: CommandEdgeLike[];
  groups: CommandGroupLike[];
  nodes: TNode[];
  tasks: CommandTask[];
};

export type CommandOSReducerAction<TNode extends CommandNodeLike> =
  | {
    fallback?: CommandOSState<TNode>;
    recoverInterruptedTasks?: boolean;
    state: CommandOSState<TNode>;
    type: "hydrate" | "replace" | "validateCommandGraph" | "repairCommandGraph" | "migrateLegacyHierarchy";
  }
  | {
    fallback?: CommandOSState<TNode>;
    node: TNode;
    parentId?: string;
    state: CommandOSState<TNode>;
    type: "createMarshal" | "createGeneralUnderMarshal" | "createCommanderUnderGeneral" | "createSoldierUnderCommander";
  }
  | {
    changes: Partial<TNode>;
    fallback?: CommandOSState<TNode>;
    marshalId: string;
    state: CommandOSState<TNode>;
    type: "updateMarshal";
  }
  | {
    fallback?: CommandOSState<TNode>;
    marshalId: string;
    state: CommandOSState<TNode>;
    type: "archiveMarshal" | "deleteMarshal";
  }
  | {
    entityId: string;
    fallback?: CommandOSState<TNode>;
    state: CommandOSState<TNode>;
    type: "deleteEntityWithValidation";
  }
  | {
    entityId: string;
    fallback?: CommandOSState<TNode>;
    parentId: string;
    state: CommandOSState<TNode>;
    type: "reassignEntityWithValidation";
  }
  | {
    fallback?: CommandOSState<TNode>;
    generalId: string;
    marshalId: string;
    state: CommandOSState<TNode>;
    type: "moveGeneralToMarshal";
  };

type ValidateOptions<TNode extends CommandNodeLike> = {
  fallback?: CommandOSState<TNode>;
  now?: string;
  recoverInterruptedTasks?: boolean;
};

const activeTaskStatuses = new Set<CommandTaskStatus>(["assigned", "running"]);

function isTaskActive(status: CommandTaskStatus) {
  return activeTaskStatuses.has(status);
}

function isValidStatus(status: unknown): status is CommandStatus {
  return status === "idle" || status === "working" || status === "thinking" || status === "waiting" || status === "error" || status === "offline";
}

function isValidTaskStatus(status: unknown): status is CommandTaskStatus {
  return status === "pending" || status === "assigned" || status === "running" || status === "completed" || status === "failed";
}

function parentTypeFor(type: NodeType) {
  if (type === "marshal") return "emperor";
  if (type === "general") return "marshal";
  if (type === "commander") return "general";
  if (type === "soldier") return "commander";
  return null;
}

function titleFor(type: NodeType) {
  return type === "emperor" ? "Central Command" : type[0].toUpperCase() + type.slice(1);
}

function normalizeTaskStatus(status: unknown): CommandTaskStatus {
  return isValidTaskStatus(status) ? status : "pending";
}

function normalizeNode<TNode extends CommandNodeLike>(node: TNode): TNode {
  return {
    ...node,
    children: Array.isArray(node.children) ? node.children.filter((id): id is string => typeof id === "string") : [],
    commandType: node.type === "core" ? "emperor" : node.commandType,
    currentTask: typeof node.currentTask === "string" ? node.currentTask : null,
    logs: Array.isArray(node.logs) ? node.logs : [],
    memory: {
      instructions: typeof node.memory?.instructions === "string" ? node.memory.instructions : `Operate as ${node.name}.`,
      notes: Array.isArray(node.memory?.notes) ? node.memory.notes.filter((item): item is string => typeof item === "string") : [],
      recentTasks: Array.isArray(node.memory?.recentTasks) ? node.memory.recentTasks.filter((item): item is string => typeof item === "string") : [],
      role: typeof node.memory?.role === "string" ? node.memory.role : titleFor(node.commandType),
      taskResults: Array.isArray(node.memory?.taskResults) ? node.memory.taskResults.filter((item): item is string => typeof item === "string") : []
    },
    parentId: typeof node.parentId === "string" ? node.parentId : null,
    status: isValidStatus(node.status) ? node.status : "idle",
    taskHistory: Array.isArray(node.taskHistory) ? node.taskHistory.filter((item): item is string => typeof item === "string") : [],
    type: node.commandType === "emperor" ? "core" : "agent"
  };
}

function firstNodeOfType<TNode extends CommandNodeLike>(nodes: TNode[], type: NodeType) {
  return nodes.find((node) => node.commandType === type) ?? null;
}

function fallbackMemory(role: string): CommandMemory {
  return {
    instructions: `Operate as ${role}. Preserve local command context and report upward through the official chain of command.`,
    notes: ["Created during Command OS hierarchy recovery."],
    recentTasks: [],
    role,
    taskResults: []
  };
}

function createRecoveryMarshal<TNode extends CommandNodeLike>(now: string): TNode {
  return {
    children: [],
    commandType: "marshal",
    currentTask: null,
    groupId: "primary-marshal",
    id: "primary-marshal",
    logs: ["Created during legacy hierarchy migration."],
    memory: fallbackMemory("Primary strategic command theater"),
    name: "Primary Marshal",
    parentId: "entral",
    status: "idle",
    taskHistory: ["Migrated existing Generals under Primary Marshal."],
    type: "agent"
  } as unknown as TNode;
}

function findValidParent<TNode extends CommandNodeLike>(node: TNode, nodes: TNode[]) {
  if (node.commandType === "emperor") return null;

  const requiredType = parentTypeFor(node.commandType);
  if (!requiredType) return null;

  const currentParent = node.parentId ? nodes.find((candidate) => candidate.id === node.parentId) ?? null : null;
  if (currentParent?.commandType === requiredType) return currentParent.id;

  if (node.commandType === "marshal") return nodes.find((candidate) => candidate.commandType === "emperor")?.id ?? "entral";

  if (node.commandType === "general") {
    return nodes.find((candidate) => candidate.commandType === "marshal" && candidate.id === node.groupId)?.id
      ?? firstNodeOfType(nodes, "marshal")?.id
      ?? null;
  }

  if (node.commandType === "commander") {
    return nodes.find((candidate) => candidate.commandType === "general" && candidate.groupId === node.groupId)?.id
      ?? firstNodeOfType(nodes, "general")?.id
      ?? null;
  }

  return nodes.find((candidate) => candidate.commandType === "commander" && candidate.groupId === node.groupId)?.id
    ?? firstNodeOfType(nodes, "commander")?.id
    ?? null;
}

function ancestorGeneralId<TNode extends CommandNodeLike>(node: TNode, nodesById: Map<string, TNode>) {
  if (node.commandType === "general") return node.id;
  let current: TNode | undefined = node;

  while (current?.parentId) {
    const parent = nodesById.get(current.parentId);
    if (parent?.commandType === "general") return parent.id;
    current = parent;
  }

  return "core";
}

function ancestorMarshalId<TNode extends CommandNodeLike>(node: TNode, nodesById: Map<string, TNode>) {
  if (node.commandType === "marshal") return node.id;
  let current: TNode | undefined = node;

  while (current?.parentId) {
    const parent = nodesById.get(current.parentId);
    if (parent?.commandType === "marshal") return parent.id;
    current = parent;
  }

  return "core";
}

function rebuildGroups<TNode extends CommandNodeLike>(groups: CommandGroupLike[], nodes: TNode[]) {
  const groupMap = new Map(groups.map((group) => [group.id, group]));
  const nextGroups: CommandGroupLike[] = [];
  const core = groupMap.get("core") ?? { color: "#00F0FF", id: "core", name: "ENTRAL Core" };
  nextGroups.push(core);

  for (const general of nodes.filter((node) => node.commandType === "marshal")) {
    nextGroups.push(groupMap.get(general.id) ?? {
      color: "#00F0FF",
      id: general.id,
      name: general.name
    });
  }

  return nextGroups;
}

function rebuildEdges<TNode extends CommandNodeLike>(nodes: TNode[]): CommandEdgeLike[] {
  return nodes
    .filter((node) => node.parentId)
    .map((node) => ({
      id: `e-${node.parentId}-${node.id}`,
      label: `${node.commandType} command link`,
      source: node.parentId as string,
      target: node.id
    }));
}

function lineageFor<TNode extends CommandNodeLike>(entityId: string | null, nodesById: Map<string, TNode>) {
  if (!entityId || !nodesById.has(entityId)) return ["entral"].filter((id) => nodesById.has(id));

  const lineage: string[] = [];
  let current = nodesById.get(entityId) ?? null;
  const seen = new Set<string>();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    lineage.unshift(current.id);
    current = current.parentId ? nodesById.get(current.parentId) ?? null : null;
  }

  return lineage;
}

function firstAssignableNode<TNode extends CommandNodeLike>(nodes: TNode[]) {
  return nodes.find((node) => node.commandType === "soldier" && node.status !== "offline")
    ?? nodes.find((node) => node.commandType === "commander" && node.status !== "offline")
    ?? nodes.find((node) => node.commandType === "general" && node.status !== "offline")
    ?? nodes.find((node) => node.commandType === "marshal" && node.status !== "offline")
    ?? nodes.find((node) => node.commandType === "emperor")
    ?? null;
}

function commandPathDetails<TNode extends CommandNodeLike>(owner: TNode | null, nodesById: Map<string, TNode>) {
  const lineage = lineageFor(owner?.id ?? null, nodesById)
    .map((id) => nodesById.get(id))
    .filter((node): node is TNode => Boolean(node));
  const marshal = lineage.find((node) => node.commandType === "marshal") ?? null;
  const general = lineage.find((node) => node.commandType === "general") ?? null;
  const commander = lineage.find((node) => node.commandType === "commander") ?? null;
  const soldier = lineage.find((node) => node.commandType === "soldier") ?? null;

  return {
    assignedEntityType: owner?.commandType ?? null,
    commanderId: commander?.id ?? null,
    commanderName: commander?.name ?? null,
    generalId: general?.id ?? null,
    generalName: general?.name ?? null,
    marshalId: marshal?.id ?? null,
    marshalName: marshal?.name ?? null,
    soldierId: soldier?.id ?? null,
    soldierName: soldier?.name ?? null
  };
}

function syncNodeAncestry<TNode extends CommandNodeLike>(node: TNode, nodesById: Map<string, TNode>) {
  const lineage = lineageFor(node.id, nodesById)
    .map((id) => nodesById.get(id))
    .filter((candidate): candidate is TNode => Boolean(candidate));
  const marshal = lineage.find((candidate) => candidate.commandType === "marshal") ?? null;
  const general = lineage.find((candidate) => candidate.commandType === "general") ?? null;
  const commander = lineage.find((candidate) => candidate.commandType === "commander") ?? null;

  node.parentMarshalId = node.commandType === "marshal" || node.commandType === "emperor" ? null : marshal?.id ?? null;
  node.parentMarshalName = node.commandType === "marshal" || node.commandType === "emperor" ? null : marshal?.name ?? null;
  node.parentGeneralId = node.commandType === "general" || node.commandType === "marshal" || node.commandType === "emperor" ? null : general?.id ?? null;
  node.parentGeneralName = node.commandType === "general" || node.commandType === "marshal" || node.commandType === "emperor" ? null : general?.name ?? null;
  node.parentCommanderId = node.commandType === "soldier" ? commander?.id ?? null : null;
  node.parentCommanderName = node.commandType === "soldier" ? commander?.name ?? null : null;
}

function sanitizeTasks<TNode extends CommandNodeLike>(
  tasks: CommandTask[],
  nodes: TNode[],
  options: Required<Pick<ValidateOptions<TNode>, "now">> & Pick<ValidateOptions<TNode>, "recoverInterruptedTasks">
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const fallbackOwner = firstAssignableNode(nodes);
  const interruptedNames = new Set<string>();

  return {
    interruptedNames,
    tasks: tasks.map((task) => {
      const now = options.now;
      const status = normalizeTaskStatus(task.status);
      const rawPath = Array.isArray(task.delegationPath) ? task.delegationPath.filter((id) => nodesById.has(id)) : [];
      const assignedStillExists = task.assignedEntityId ? nodesById.has(task.assignedEntityId) : false;
      const originalOwner = assignedStillExists ? nodesById.get(task.assignedEntityId as string) ?? null : null;
      const ownerUnavailable = Boolean(originalOwner && isTaskActive(status) && originalOwner.status === "offline");
      const owner = assignedStillExists && !ownerUnavailable ? originalOwner : fallbackOwner;
      const ownerId = owner?.id ?? null;
      const ownerLineage = lineageFor(ownerId, nodesById);
      const pathDetails = commandPathDetails(owner, nodesById);
      const repairedPath = ownerId ? ownerLineage : rawPath;
      const wasDangling = Boolean(task.assignedEntityId && (!assignedStillExists || ownerUnavailable));
      const wasInterrupted = Boolean(options.recoverInterruptedTasks && isTaskActive(status));
      const history = Array.isArray(task.history) ? [...task.history] : [];
      let nextStatus = status;
      let completedAt = typeof task.completedAt === "string" ? task.completedAt : null;

      if (wasDangling) {
        history.push(ownerId
          ? `Recovered task ownership after ${ownerUnavailable ? "offline" : "deleted"} entity. Reassigned to ${owner?.name ?? ownerId}.`
          : `Recovered task ownership after ${ownerUnavailable ? "offline" : "deleted"} entity. No assignable entity was available.`);
      }

      if (wasInterrupted) {
        nextStatus = "failed";
        completedAt = now;
        interruptedNames.add(task.name);
        history.push("Recovered after refresh: active local delegation was interrupted and marked failed for review.");
      }

      return {
        assignedEntityId: ownerId,
        assignedEntityType: pathDetails.assignedEntityType,
        completedAt,
        commanderId: pathDetails.commanderId,
        commanderName: pathDetails.commanderName,
        createdAt: typeof task.createdAt === "string" ? task.createdAt : now,
        delegationPath: repairedPath,
        description: typeof task.description === "string" ? task.description : "No task description provided.",
        generalId: pathDetails.generalId,
        generalName: pathDetails.generalName,
        history,
        id: typeof task.id === "string" ? task.id : `task-${now}`,
        marshalId: pathDetails.marshalId,
        marshalName: pathDetails.marshalName,
        name: typeof task.name === "string" ? task.name : "Untitled task",
        reportHistory: Array.isArray(task.reportHistory) ? task.reportHistory : [],
        soldierId: pathDetails.soldierId,
        soldierName: pathDetails.soldierName,
        status: nextStatus,
        updatedAt: wasDangling || wasInterrupted || typeof task.updatedAt !== "string" ? now : task.updatedAt
      };
    })
  };
}

export function validateCommandOSState<TNode extends CommandNodeLike>(
  state: CommandOSState<TNode>,
  options: ValidateOptions<TNode> = {}
): CommandOSState<TNode> {
  const now = options.now ?? new Date().toISOString();
  const fallback = options.fallback;
  const baseNodes = state.nodes.length > 0 ? state.nodes : fallback?.nodes ?? [];
  const normalizedById = new Map<string, TNode>();

  for (const node of baseNodes) {
    if (typeof node.id === "string" && node.id.length > 0) {
      normalizedById.set(node.id, normalizeNode(node));
    }
  }

  if (!normalizedById.has("entral") && fallback) {
    const fallbackCore = fallback.nodes.find((node) => node.id === "entral" || node.commandType === "emperor");
    if (fallbackCore) normalizedById.set("entral", normalizeNode(fallbackCore));
  }

  const nodes = Array.from(normalizedById.values());
  const core = nodes.find((node) => node.commandType === "emperor") ?? nodes.find((node) => node.id === "entral");

  if (core) {
    core.id = "entral";
    core.commandType = "emperor";
    core.parentId = null;
    core.groupId = "core";
    core.type = "core";
  }

  const hasGeneralUnderCore = nodes.some((node) => node.commandType === "general" && (node.parentId === "entral" || node.parentId === core?.id));
  const hasMarshal = nodes.some((node) => node.commandType === "marshal");

  if (!hasMarshal && (hasGeneralUnderCore || nodes.some((node) => node.commandType === "general" || node.commandType === "commander" || node.commandType === "soldier"))) {
    if (typeof window !== "undefined") {
      try {
        const backupKey = "entral-command-os-state-v1-backup";
        if (!window.localStorage.getItem(backupKey)) {
          window.localStorage.setItem(backupKey, JSON.stringify(state));
        }
      } catch {
        // Local storage backup is best-effort during migration.
      }
    }

    nodes.push(createRecoveryMarshal<TNode>(now));
  }

  const needsFallbackMarshal = nodes.some((node) => node.commandType === "general" || node.commandType === "commander" || node.commandType === "soldier");
  if (!nodes.some((node) => node.commandType === "marshal") && fallback && needsFallbackMarshal) {
    const fallbackMarshal = fallback.nodes.find((node) => node.commandType === "marshal");
    nodes.push(fallbackMarshal ? normalizeNode(fallbackMarshal) : createRecoveryMarshal<TNode>(now));
  }

  const needsFallbackGeneral = nodes.some((node) => node.commandType === "commander" || node.commandType === "soldier");
  if (!nodes.some((node) => node.commandType === "general") && fallback && needsFallbackGeneral) {
    const fallbackGeneral = fallback.nodes.find((node) => node.commandType === "general");
    if (fallbackGeneral) nodes.push(normalizeNode(fallbackGeneral));
  }

  const needsFallbackCommander = nodes.some((node) => node.commandType === "soldier");
  if (!nodes.some((node) => node.commandType === "commander") && fallback && needsFallbackCommander) {
    const fallbackCommander = fallback.nodes.find((node) => node.commandType === "commander");
    if (fallbackCommander) nodes.push(normalizeNode(fallbackCommander));
  }

  const uniqueNodes = Array.from(new Map(nodes.map((node) => [node.id, node])).values());

  for (const node of uniqueNodes) {
    node.parentId = findValidParent(node, uniqueNodes);
  }

  const nodesById = new Map(uniqueNodes.map((node) => [node.id, node]));

  for (const node of uniqueNodes) {
    if (node.commandType === "emperor") {
      node.groupId = "core";
      node.parentId = null;
      node.type = "core";
    } else if (node.commandType === "marshal") {
      node.groupId = node.id;
      node.type = "agent";
    } else if (node.commandType === "general") {
      node.groupId = ancestorMarshalId(node, nodesById);
      node.type = "agent";
    } else {
      node.groupId = ancestorMarshalId(node, nodesById);
      node.type = "agent";
    }

    syncNodeAncestry(node, nodesById);
  }

  const childIdsByParent = new Map<string, string[]>();

  for (const node of uniqueNodes) {
    if (!node.parentId) continue;
    childIdsByParent.set(node.parentId, [...(childIdsByParent.get(node.parentId) ?? []), node.id]);
  }

  for (const node of uniqueNodes) {
    node.children = Array.from(new Set(childIdsByParent.get(node.id) ?? []));
  }

  const sanitized = sanitizeTasks(state.tasks, uniqueNodes, {
    now,
    recoverInterruptedTasks: options.recoverInterruptedTasks
  });

  if (sanitized.interruptedNames.size > 0) {
    for (const node of uniqueNodes) {
      if (node.currentTask && sanitized.interruptedNames.has(node.currentTask)) {
        node.currentTask = null;
        node.status = node.commandType === "emperor" ? "thinking" : "waiting";
        node.logs = ["Recovered interrupted local delegation after refresh.", ...node.logs].slice(0, 10);
      }
    }
  }

  return {
    edges: rebuildEdges(uniqueNodes),
    groups: rebuildGroups(state.groups.length > 0 ? state.groups : fallback?.groups ?? [], uniqueNodes),
    nodes: uniqueNodes,
    tasks: sanitized.tasks
  };
}

export function commandOSReducer<TNode extends CommandNodeLike>(
  state: CommandOSState<TNode>,
  action: CommandOSReducerAction<TNode>
): CommandOSState<TNode> {
  if (action.type === "hydrate") {
    return validateCommandOSState(action.state, {
      fallback: action.fallback ?? state,
      recoverInterruptedTasks: true
    });
  }

  if (action.type === "validateCommandGraph" || action.type === "repairCommandGraph" || action.type === "migrateLegacyHierarchy") {
    return validateCommandOSState(action.state, {
      fallback: action.fallback ?? state
    });
  }

  if (action.type === "deleteEntityWithValidation") {
    return removeCommandEntity(action.state, action.entityId, action.fallback ?? state).state;
  }

  if (action.type === "deleteMarshal") {
    return removeCommandEntity(action.state, action.marshalId, action.fallback ?? state).state;
  }

  if (action.type === "reassignEntityWithValidation") {
    return moveCommandEntity(action.state, action.entityId, action.parentId, action.fallback ?? state).state;
  }

  if (action.type === "moveGeneralToMarshal") {
    return moveCommandEntity(action.state, action.generalId, action.marshalId, action.fallback ?? state).state;
  }

  if (action.type === "archiveMarshal") {
    return validateCommandOSState({
      ...action.state,
      nodes: action.state.nodes.map((node) => node.id === action.marshalId && node.commandType === "marshal"
        ? {
          ...node,
          logs: ["Marshal archived locally. Descendant references preserved.", ...node.logs].slice(0, 10),
          status: "offline" as CommandStatus
        }
        : node)
    }, { fallback: action.fallback ?? state });
  }

  if (action.type === "updateMarshal") {
    return validateCommandOSState({
      ...action.state,
      nodes: action.state.nodes.map((node) => node.id === action.marshalId && node.commandType === "marshal"
        ? { ...node, ...action.changes, commandType: "marshal" as const }
        : node)
    }, { fallback: action.fallback ?? state });
  }

  if (action.type === "createMarshal" || action.type === "createGeneralUnderMarshal" || action.type === "createCommanderUnderGeneral" || action.type === "createSoldierUnderCommander") {
    return validateCommandOSState({
      ...action.state,
      nodes: [
        ...action.state.nodes,
        {
          ...action.node,
          parentId: action.parentId ?? action.node.parentId
        }
      ]
    }, { fallback: action.fallback ?? state });
  }

  return validateCommandOSState(action.state, {
    fallback: action.fallback ?? state,
    recoverInterruptedTasks: "recoverInterruptedTasks" in action ? action.recoverInterruptedTasks : undefined
  });
}

export function removeCommandEntity<TNode extends CommandNodeLike>(
  state: CommandOSState<TNode>,
  entityId: string,
  fallback?: CommandOSState<TNode>
) {
  const target = state.nodes.find((node) => node.id === entityId);
  if (!target || target.commandType === "emperor") {
    return {
      descendants: [],
      removedIds: [],
      state: validateCommandOSState(state, { fallback })
    };
  }

  const descendants = new Set<string>();
  const stack = state.nodes.filter((node) => node.parentId === entityId).map((node) => node.id);

  while (stack.length > 0) {
    const id = stack.pop() as string;
    descendants.add(id);
    stack.push(...state.nodes.filter((node) => node.parentId === id).map((node) => node.id));
  }

  const removedIds = new Set([entityId, ...descendants]);
  const next = validateCommandOSState({
    ...state,
    nodes: state.nodes.filter((node) => !removedIds.has(node.id)),
    tasks: state.tasks.map((task) => ({
      ...task,
      assignedEntityId: task.assignedEntityId && removedIds.has(task.assignedEntityId) ? null : task.assignedEntityId,
      delegationPath: task.delegationPath.filter((id) => !removedIds.has(id)),
      history: task.delegationPath.some((id) => removedIds.has(id)) || (task.assignedEntityId ? removedIds.has(task.assignedEntityId) : false)
        ? [...task.history, `Entity removal cleaned task references for ${entityId}.`]
        : task.history
    }))
  }, { fallback });

  return {
    descendants: Array.from(descendants),
    removedIds: Array.from(removedIds),
    state: next
  };
}

export function canMoveCommandEntity<TNode extends CommandNodeLike>(node: TNode, parent: TNode) {
  if (node.commandType === "marshal") return parent.commandType === "emperor";
  if (node.commandType === "general") return parent.commandType === "marshal";
  if (node.commandType === "commander") return parent.commandType === "general";
  if (node.commandType === "soldier") return parent.commandType === "commander";
  return false;
}

export function moveCommandEntity<TNode extends CommandNodeLike>(
  state: CommandOSState<TNode>,
  entityId: string,
  parentId: string,
  fallback?: CommandOSState<TNode>
) {
  const node = state.nodes.find((candidate) => candidate.id === entityId);
  const parent = state.nodes.find((candidate) => candidate.id === parentId);

  if (!node || !parent || !canMoveCommandEntity(node, parent)) {
    return { moved: false, state: validateCommandOSState(state, { fallback }) };
  }

  return {
    moved: true,
    state: validateCommandOSState({
      ...state,
      nodes: state.nodes.map((candidate) => candidate.id === entityId
        ? {
          ...candidate,
          logs: [`Moved under ${parent.name}.`, ...candidate.logs].slice(0, 10),
          memory: {
            ...candidate.memory,
            notes: [`Reassigned under ${parent.name}.`, ...candidate.memory.notes].slice(0, 8)
          },
          parentId,
          status: "waiting"
        }
        : candidate)
    }, { fallback })
  };
}

export function assignCommandTask<TNode extends CommandNodeLike>(
  state: CommandOSState<TNode>,
  task: CommandTask,
  fallback?: CommandOSState<TNode>
) {
  return validateCommandOSState({
    ...state,
    tasks: [task, ...state.tasks]
  }, { fallback });
}
