import { type CommandStatus, type CommandTask, type NodeType } from "./command-os";

type WorkflowNode = {
  commandType?: NodeType;
  id: string;
  name: string;
  parentId: string | null;
  status: CommandStatus;
  type?: NodeType | "core" | "agent";
};

export type MerchWorkflowStep = {
  description: string;
  id: string;
  name: string;
  operationalSoldierName: string;
  supportingWorkLabel: string;
};

export type MerchWorkflowBuildResult = {
  missingSteps: MerchWorkflowStep[];
  tasks: CommandTask[];
  workflowId: string;
};

export const merchLaunchWorkflowSteps: MerchWorkflowStep[] = [
  {
    description: "Capture client business details, contacts, goals, offer notes, and launch constraints.",
    id: "client-intake",
    name: "Client Intake",
    operationalSoldierName: "Client Intake Soldier",
    supportingWorkLabel: "Business Profile"
  },
  {
    description: "Analyze brand voice, visual direction, collection tone, and style guardrails.",
    id: "brand-analysis",
    name: "Brand Analysis",
    operationalSoldierName: "Brand Soldier",
    supportingWorkLabel: "Brand Voice"
  },
  {
    description: "Define the buyer profile, audience motivations, and customer language.",
    id: "audience-research",
    name: "Audience Research",
    operationalSoldierName: "Client Intake Soldier",
    supportingWorkLabel: "Audience"
  },
  {
    description: "Scan the niche, competitors, buyer emotion, and product opportunity lanes.",
    id: "niche-research",
    name: "Niche Research",
    operationalSoldierName: "Niche Research Soldier",
    supportingWorkLabel: "Niche Scanner"
  },
  {
    description: "Select product types, collection structure, design count, and pricing targets.",
    id: "product-planning",
    name: "Product Planning",
    operationalSoldierName: "Niche Research Soldier",
    supportingWorkLabel: "Product Opportunity"
  },
  {
    description: "Generate design directions, collection concepts, and variation strategy.",
    id: "design-concept-generation",
    name: "Design Concept Generation",
    operationalSoldierName: "Design Soldier",
    supportingWorkLabel: "Design Concept"
  },
  {
    description: "Convert approved concepts into usable generation prompts and creative instructions.",
    id: "design-prompt-generation",
    name: "Design Prompt Generation",
    operationalSoldierName: "Design Soldier",
    supportingWorkLabel: "Prompt"
  },
  {
    description: "Draft product titles, descriptions, tags, materials, and SEO listing structure.",
    id: "listing-draft-generation",
    name: "Listing Draft Generation",
    operationalSoldierName: "Listing Soldier",
    supportingWorkLabel: "Title"
  },
  {
    description: "Review trademark risk, copyright risk, AI disclosure, production partner disclosure, and prohibited content.",
    id: "compliance-review",
    name: "Compliance Review",
    operationalSoldierName: "Compliance Soldier",
    supportingWorkLabel: "Trademark Risk"
  },
  {
    description: "Prepare client approval packet and capture revision decisions before store build.",
    id: "client-approval",
    name: "Client Approval",
    operationalSoldierName: "Client Intake Soldier",
    supportingWorkLabel: "Notes"
  },
  {
    description: "Prepare the selected Etsy, Shopify, or POD-backed storefront and list required production connections for approval.",
    id: "store-build",
    name: "Store Build",
    operationalSoldierName: "Store Launch Soldier",
    supportingWorkLabel: "Shopify Setup"
  },
  {
    description: "Prepare product publishing steps, run launch QA, confirm checklist completion, and queue go-live status for approval.",
    id: "launch",
    name: "Launch",
    operationalSoldierName: "Store Launch Soldier",
    supportingWorkLabel: "Launch QA"
  },
  {
    description: "Generate launch report, product performance summary, and client-facing operating status.",
    id: "reporting",
    name: "Reporting",
    operationalSoldierName: "Reporting Soldier",
    supportingWorkLabel: "Weekly Report"
  },
  {
    description: "Identify optimization opportunities, product improvements, and next-cycle recommendations.",
    id: "optimization",
    name: "Optimization",
    operationalSoldierName: "Reporting Soldier",
    supportingWorkLabel: "Opportunity Report"
  }
];

function commandTypeFor(node: WorkflowNode): NodeType | null {
  if (node.commandType) {
    return node.commandType;
  }

  if (node.type === "core") {
    return "emperor";
  }

  if (node.type === "agent") {
    return "soldier";
  }

  return node.type ?? null;
}

function nodeByName(nodes: WorkflowNode[], name: string, type?: NodeType, parentId?: string) {
  const normalized = name.toLowerCase();
  return nodes.find((node) => (
    node.name.toLowerCase() === normalized
    && (!type || commandTypeFor(node) === type)
    && (!parentId || node.parentId === parentId)
  )) ?? null;
}

function lineageFor(node: WorkflowNode, nodes: WorkflowNode[]) {
  const byId = new Map(nodes.map((item) => [item.id, item]));
  const lineage: WorkflowNode[] = [];
  let current: WorkflowNode | null = node;
  const seen = new Set<string>();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    lineage.unshift(current);
    current = current.parentId ? byId.get(current.parentId) ?? null : null;
  }

  return lineage;
}

function assignmentForStep(step: MerchWorkflowStep, nodes: WorkflowNode[]) {
  const soldier = nodeByName(nodes, step.operationalSoldierName, "soldier");
  const commander = soldier?.parentId
    ? nodes.find((node) => node.id === soldier.parentId && commandTypeFor(node) === "commander") ?? null
    : null;

  if (!soldier || soldier.status === "offline" || !commander || commander.status === "offline") {
    return null;
  }

  return {
    assignee: soldier,
    commander,
    lineage: lineageFor(soldier, nodes)
  };
}

export function createMerchLaunchWorkflowTasks(
  nodes: WorkflowNode[],
  options: { now?: string; workflowName?: string } = {}
): MerchWorkflowBuildResult {
  const now = options.now ?? new Date().toISOString();
  const workflowId = `merch-launch-${Date.now().toString(36)}`;
  const workflowName = options.workflowName?.trim() || "Client Merch Store Launch";
  const missingSteps: MerchWorkflowStep[] = [];
  const tasks: CommandTask[] = [];

  merchLaunchWorkflowSteps.forEach((step, index) => {
    const assignment = assignmentForStep(step, nodes);

    if (!assignment) {
      missingSteps.push(step);
      return;
    }

    const pathNames = assignment.lineage.map((node) => node.name);
    const reportPath = [...pathNames].reverse();
    const stepNumber = String(index + 1).padStart(2, "0");
    const marshal = assignment.lineage.find((node) => commandTypeFor(node) === "marshal");
    const general = assignment.lineage.find((node) => commandTypeFor(node) === "general");
    const commander = assignment.lineage.find((node) => commandTypeFor(node) === "commander");
    const soldier = assignment.lineage.find((node) => commandTypeFor(node) === "soldier");

    tasks.push({
      assignedEntityId: assignment.assignee.id,
      assignedEntityType: commandTypeFor(assignment.assignee),
      completedAt: null,
      commanderId: commander?.id ?? null,
      commanderName: commander?.name ?? null,
      createdAt: now,
      delegationPath: assignment.lineage.map((node) => node.id),
      description: `${workflowName}: ${step.description}`,
      generalId: general?.id ?? null,
      generalName: general?.name ?? null,
      history: [
        `[ENTRAL] Workflow step ${stepNumber} created for ${workflowName}.`,
        `[MARSHAL] Merch Marshal routed ${step.name} through the active niche General.`,
        `[GENERAL] ${assignment.lineage.find((node) => commandTypeFor(node) === "general")?.name ?? "Niche General"} routed ${step.name} to business ${assignment.commander.name}.`,
        `[COMMANDER] ${assignment.commander.name} assigned ${step.supportingWorkLabel} work to ${assignment.assignee.name}.`,
        `[SOLDIER] ${assignment.assignee.name} received ${step.name} as an operational-function task.`,
        `[REPORT] Report path established: ${reportPath.join(" -> ")}.`
      ],
      id: `${workflowId}-${step.id}`,
      marshalId: marshal?.id ?? null,
      marshalName: marshal?.name ?? null,
      name: `${stepNumber}. ${step.name}`,
      reportHistory: [],
      soldierId: soldier?.id ?? null,
      soldierName: soldier?.name ?? null,
      status: "pending",
      updatedAt: now
    });
  });

  return { missingSteps, tasks, workflowId };
}
