import type { CommandMemory, CommandReportRecord, CommandStatus, CommandTask, NodeType } from "./command-os";
import type { CommandReport } from "./command-communications";

export type CommandReportNode = {
  businessName?: string;
  children?: string[];
  commandType: NodeType;
  currentTask: string | null;
  health: number;
  id: string;
  memory: CommandMemory;
  name: string;
  parentId: string | null;
  reportHistory?: CommandReportRecord[];
  status: CommandStatus;
  taskHistory: string[];
  title: string;
};

type CommandReportInput = {
  label?: string;
  nodes: CommandReportNode[];
  targetId?: string | null;
  tasks: CommandTask[];
};

const activeStatuses = new Set<CommandStatus>(["working", "thinking"]);
const degradedStatuses = new Set<CommandStatus>(["error", "offline", "waiting"]);

function statusLabel(status: CommandStatus) {
  if (status === "working") return "Working";
  if (status === "thinking") return "Thinking";
  if (status === "waiting") return "Waiting";
  if (status === "error") return "Error";
  if (status === "offline") return "Offline";
  return "Idle";
}

function taskStatusLabel(status: CommandTask["status"]) {
  if (status === "assigned") return "Assigned";
  if (status === "running") return "Running";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return "Pending";
}

function reportTitleFor(type: NodeType) {
  if (type === "emperor") return "System Report";
  if (type === "marshal") return "Marshal Report";
  if (type === "general") return "General Report";
  if (type === "commander") return "Commander Report";
  return "Soldier Report";
}

function lineageFor(target: CommandReportNode, nodesById: Map<string, CommandReportNode>) {
  const lineage: CommandReportNode[] = [];
  let cursor: CommandReportNode | undefined = target;
  const visited = new Set<string>();

  while (cursor && !visited.has(cursor.id)) {
    lineage.unshift(cursor);
    visited.add(cursor.id);
    cursor = cursor.parentId ? nodesById.get(cursor.parentId) : undefined;
  }

  return lineage;
}

function descendantIdsFor(targetId: string, nodes: CommandReportNode[]) {
  const descendants: string[] = [];
  const queue = nodes.filter((node) => node.parentId === targetId).map((node) => node.id);

  while (queue.length > 0) {
    const id = queue.shift() as string;
    descendants.push(id);
    queue.push(...nodes.filter((node) => node.parentId === id).map((node) => node.id));
  }

  return descendants;
}

function countByType(nodes: CommandReportNode[], type: NodeType) {
  return nodes.filter((node) => node.commandType === type).length;
}

function formatCounts(nodes: CommandReportNode[]) {
  return `${countByType(nodes, "marshal")} Marshals, ${countByType(nodes, "general")} business Generals, ${countByType(nodes, "commander")} Commanders, and ${countByType(nodes, "soldier")} Soldiers`;
}

function riskSummary(nodes: CommandReportNode[], tasks: CommandTask[]) {
  const degraded = nodes.filter((node) => degradedStatuses.has(node.status));
  const failedTasks = tasks.filter((task) => task.status === "failed");

  if (degraded.length === 0 && failedTasks.length === 0) {
    return "No critical local risks detected.";
  }

  return [
    degraded.length ? `${degraded.length} degraded entities: ${degraded.slice(0, 4).map((node) => `${node.name} (${statusLabel(node.status)})`).join(", ")}${degraded.length > 4 ? ", ..." : ""}.` : "",
    failedTasks.length ? `${failedTasks.length} failed tasks require review.` : ""
  ].filter(Boolean).join(" ");
}

function nextActionsFor(target: CommandReportNode, scopedNodes: CommandReportNode[], scopedTasks: CommandTask[]) {
  const activeTasks = scopedTasks.filter((task) => task.status === "assigned" || task.status === "running");
  const failedTasks = scopedTasks.filter((task) => task.status === "failed");

  if (failedTasks.length > 0 || scopedNodes.some((node) => node.status === "error" || node.status === "offline")) {
    return ["Review degraded entities and failed tasks.", "Reassign work to healthy Soldiers.", "Generate a follow-up report after remediation."];
  }

  if (target.commandType === "emperor" && countByType(scopedNodes, "marshal") === 0) {
    return ["Create the first Marshal.", "Use guided business setup.", "Generate a new report after the first structure exists."];
  }

  if (target.commandType === "marshal" && countByType(scopedNodes, "general") === 0) {
    return ["Create a business General under this Marshal.", "Apply a business template.", "Assign the first objective."];
  }

  if (target.commandType === "general" && countByType(scopedNodes, "commander") === 0) {
    return ["Create operating Commanders.", "Apply the most relevant business template.", "Create initial tasks after departments exist."];
  }

  if (target.commandType === "commander" && countByType(scopedNodes, "soldier") === 0) {
    return ["Create Soldiers under this Commander.", "Assign the first operational task.", "Review Commander permissions."];
  }

  if (activeTasks.length === 0) {
    return ["Assign the next objective.", "Create a starter task.", "Review memory notes before execution."];
  }

  return ["Monitor active tasks.", "Review the assigned entity logs.", "Generate another report after the next status change."];
}

export function buildCommandOSReport(input: CommandReportInput): CommandReport {
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const target = (input.targetId ? nodesById.get(input.targetId) : null) ?? nodesById.get("entral") ?? input.nodes[0];

  if (!target) {
    return {
      analysis: "No command hierarchy data is available in the current local state.",
      nextActions: ["Reload the dashboard.", "Rebuild the command hierarchy if local state is empty."],
      recommendation: "Do not make operational decisions until Command OS state is restored.",
      situation: input.label ?? "System Report unavailable."
    };
  }

  const descendants = descendantIdsFor(target.id, input.nodes);
  const scopedIds = new Set([target.id, ...descendants]);
  const scopedNodes = input.nodes.filter((node) => scopedIds.has(node.id));
  const scopedTasks = input.tasks.filter((task) => task.assignedEntityId === target.id || task.delegationPath.some((id) => scopedIds.has(id)));
  const activeNodes = scopedNodes.filter((node) => activeStatuses.has(node.status));
  const activeTasks = scopedTasks.filter((task) => task.status === "assigned" || task.status === "running");
  const latestTask = scopedTasks[0];
  const lineage = lineageFor(target, nodesById);
  const commandPath = lineage.map((node) => node.name).join(" / ");
  const reportName = input.label ?? reportTitleFor(target.commandType);
  const insufficientData = scopedNodes.length <= 1 && scopedTasks.length === 0 && target.taskHistory.length === 0;

  return {
    analysis: [
      `Source entity: ${target.name} (${target.title}).`,
      `Command path: ${commandPath || target.name}.`,
      `Status: ${statusLabel(target.status)}. Health: ${target.health}%.`,
      `Scope: ${formatCounts(scopedNodes)}. ${activeNodes.length} entities active. ${activeTasks.length} active tasks.`,
      latestTask ? `Latest task: ${latestTask.name} (${taskStatusLabel(latestTask.status)}).` : "Latest task: none recorded.",
      `Risks: ${riskSummary(scopedNodes, scopedTasks)}`
    ].join(" "),
    nextActions: nextActionsFor(target, scopedNodes, scopedTasks),
    recommendation: insufficientData
      ? "Insufficient operational data exists for a full analysis. Create initial tasks or complete guided setup before relying on this report."
      : activeTasks.length > 0
        ? "Maintain current execution cadence and review active task results before expanding scope."
        : "Assign the next objective so the command structure has measurable operating data.",
    situation: `${reportName}: ${target.name} is reporting from ${commandPath || "the current command path"}.`
  };
}

export function buildCommandOSReportRecord(input: CommandReportInput & { createdAt?: string }): CommandReportRecord | null {
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const target = (input.targetId ? nodesById.get(input.targetId) : null) ?? nodesById.get("entral") ?? input.nodes[0];

  if (!target) {
    return null;
  }

  const report = buildCommandOSReport(input);
  const lineage = lineageFor(target, nodesById);
  const marshal = target.commandType === "marshal" ? target : lineage.find((node) => node.commandType === "marshal");
  const general = target.commandType === "general" ? target : lineage.find((node) => node.commandType === "general");
  const commander = target.commandType === "commander" ? target : lineage.find((node) => node.commandType === "commander");
  const soldier = target.commandType === "soldier" ? target : lineage.find((node) => node.commandType === "soldier");
  const destination = target.commandType === "emperor"
    ? target
    : target.parentId
      ? nodesById.get(target.parentId) ?? nodesById.get("entral") ?? target
      : nodesById.get("entral") ?? target;
  const createdAt = input.createdAt ?? new Date().toISOString();

  return {
    analysis: report.analysis ?? "No analysis provided.",
    commanderId: commander?.id ?? null,
    createdAt,
    destinationEntityId: destination.id,
    destinationEntityType: destination.commandType,
    generalId: general?.id ?? null,
    id: `report-${target.id}-${Date.parse(createdAt) || Date.now()}`,
    marshalId: marshal?.id ?? null,
    nextActions: report.nextActions ?? [],
    recommendation: report.recommendation ?? "No recommendation provided.",
    situation: report.situation,
    soldierId: soldier?.id ?? null,
    sourceEntityId: target.id,
    sourceEntityType: target.commandType
  };
}
