import type { NodeType } from "./command-os";

export function commandTitleFor(type: Exclude<NodeType, "emperor">) {
  if (type === "marshal") return "Marshal";
  if (type === "general") return "General";
  if (type === "commander") return "Commander";
  return "Soldier";
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

export function buildCreateNodeAuthorizationSummary(input: {
  nodeName: string;
  nodeType: Exclude<NodeType, "emperor">;
  parentName: string;
}) {
  const title = commandTitleFor(input.nodeType);

  return [
    `Objective interpreted: Create ${title}.`,
    `Name: ${input.nodeName}`,
    `Parent: ${input.parentName}`,
    `Command path impact: 1 new ${title} will be added under ${input.parentName}.`,
    "Authorize creation?"
  ].join("\n");
}

export function buildCreateNodeEditDraft(input: {
  nodeName: string;
  nodeType: Exclude<NodeType, "emperor">;
  parentName: string;
}) {
  return `Create ${commandTitleFor(input.nodeType)} named ${input.nodeName} under ${input.parentName}`;
}

export function buildBusinessTemplateAuthorizationSummary(input: {
  businessName: string;
  contextLines: string[];
  commanderCount: number;
  marshalName: string;
  soldierCount: number;
  templateLabel: string;
}) {
  const generalName = /\bGeneral$/i.test(input.businessName) ? input.businessName : `${input.businessName} General`;

  return [
    "Objective interpreted: Create business command structure.",
    `Template: ${input.templateLabel}`,
    `Marshal: ${input.marshalName}`,
    `Business General: ${generalName}`,
    `Commanders: ${input.commanderCount}`,
    `Soldiers: ${input.soldierCount}`,
    input.contextLines.length ? `Context: ${input.contextLines.join(" | ")}` : "Context: no optional business context entered.",
    "Initial setup: first intake task assigned for review.",
    "Authorize creation?"
  ].join("\n");
}

export function buildMoveAuthorizationSummary(input: {
  currentParentName: string;
  descendantCount: number;
  entityName: string;
  newParentName: string;
}) {
  return [
    "Objective interpreted: Move command entity.",
    `Entity: ${input.entityName}`,
    `Current parent: ${input.currentParentName}`,
    `New parent: ${input.newParentName}`,
    `Child impact: ${pluralize(input.descendantCount, "descendant")} will keep reporting through ${input.entityName}.`,
    "Authorize reassignment?"
  ].join("\n");
}

export function buildMoveEditDraft(input: {
  entityName: string;
  newParentName: string;
}) {
  return `Move ${input.entityName} under ${input.newParentName}`;
}

export function buildArchiveAuthorizationSummary(input: {
  descendantCount: number;
  entityName: string;
  entityTitle: string;
  parentName: string;
}) {
  return [
    "Objective interpreted: Archive command entity.",
    `Entity: ${input.entityName}`,
    `Type: ${input.entityTitle}`,
    `Parent: ${input.parentName}`,
    `Child impact: ${pluralize(input.descendantCount, "descendant")} will remain preserved but inactive under this archived entity.`,
    "Safety: Archive is recommended before permanent deletion because descendants, task history, and reports remain available for review.",
    "Authorize archive?"
  ].join("\n");
}

export function buildArchiveEditDraft(input: {
  entityName: string;
}) {
  return `Archive ${input.entityName}`;
}

export function buildRemoveAuthorizationImpact(input: {
  descendantCount: number;
  entityName: string;
  entityTitle: string;
  parentName: string;
  reportCount: number;
  taskCount: number;
}) {
  return {
    body: `Are you sure you want to remove ${input.entityName}? It reports to ${input.parentName}.`,
    impact: [
      `Parent: ${input.parentName}`,
      `Child impact: ${pluralize(input.descendantCount, "descendant")} will be removed with ${input.entityName}.`,
      `Task impact: ${pluralize(input.taskCount, "task")} will be reassigned, failed, or detached by Command OS cleanup rules.`,
      `Report impact: ${pluralize(input.reportCount, "report")} will remain in preserved history where possible.`
    ],
    title: `Remove ${input.entityTitle}?`
  };
}

export function buildWorkflowAuthorizationSummary(input: {
  assignedSoldierCount: number;
  missingLanes: string[];
  taskCount: number;
  workflowName: string;
}) {
  return [
    "Objective interpreted: Generate Merch/POD workflow.",
    `Workflow: ${input.workflowName}`,
    `Planned tasks: ${input.taskCount}`,
    `Assigned Soldiers: ${input.assignedSoldierCount}`,
    input.missingLanes.length ? `Missing lanes: ${input.missingLanes.join(", ")}` : "Missing lanes: none detected.",
    "This will create task records and update entity memory/status in local Command OS state.",
    "Authorize workflow generation?"
  ].join("\n");
}
