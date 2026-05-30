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
  commanderName: string;
  description: string;
  id: string;
  name: string;
  soldierName: string;
};

export type MerchWorkflowBuildResult = {
  missingSteps: MerchWorkflowStep[];
  tasks: CommandTask[];
  workflowId: string;
};

export const merchLaunchWorkflowSteps: MerchWorkflowStep[] = [
  {
    commanderName: "Client Intake Commander",
    description: "Capture client business details, contacts, goals, offer notes, and launch constraints.",
    id: "client-intake",
    name: "Client Intake",
    soldierName: "Business Profile Soldier"
  },
  {
    commanderName: "Brand Commander",
    description: "Analyze brand voice, visual direction, collection tone, and style guardrails.",
    id: "brand-analysis",
    name: "Brand Analysis",
    soldierName: "Brand Voice Soldier"
  },
  {
    commanderName: "Client Intake Commander",
    description: "Define the buyer profile, audience motivations, and customer language.",
    id: "audience-research",
    name: "Audience Research",
    soldierName: "Audience Soldier"
  },
  {
    commanderName: "Niche Research Commander",
    description: "Scan the niche, competitors, buyer emotion, and product opportunity lanes.",
    id: "niche-research",
    name: "Niche Research",
    soldierName: "Niche Scanner Soldier"
  },
  {
    commanderName: "Niche Research Commander",
    description: "Select product types, collection structure, design count, and pricing targets.",
    id: "product-planning",
    name: "Product Planning",
    soldierName: "Product Opportunity Soldier"
  },
  {
    commanderName: "Design Commander",
    description: "Generate design directions, collection concepts, and variation strategy.",
    id: "design-concept-generation",
    name: "Design Concept Generation",
    soldierName: "Design Concept Soldier"
  },
  {
    commanderName: "Design Commander",
    description: "Convert approved concepts into usable generation prompts and creative instructions.",
    id: "design-prompt-generation",
    name: "Design Prompt Generation",
    soldierName: "Prompt Soldier"
  },
  {
    commanderName: "Listing Commander",
    description: "Draft product titles, descriptions, tags, materials, and SEO listing structure.",
    id: "listing-draft-generation",
    name: "Listing Draft Generation",
    soldierName: "Title Soldier"
  },
  {
    commanderName: "Compliance Commander",
    description: "Review trademark risk, copyright risk, AI disclosure, production partner disclosure, and prohibited content.",
    id: "compliance-review",
    name: "Compliance Review",
    soldierName: "Trademark Risk Soldier"
  },
  {
    commanderName: "Client Intake Commander",
    description: "Prepare client approval packet and capture revision decisions before store build.",
    id: "client-approval",
    name: "Client Approval",
    soldierName: "Notes Soldier"
  },
  {
    commanderName: "Store Launch Commander",
    description: "Build the selected Etsy, Shopify, or POD-backed storefront and connect required production systems.",
    id: "store-build",
    name: "Store Build",
    soldierName: "Shopify Setup Soldier"
  },
  {
    commanderName: "Store Launch Commander",
    description: "Publish products, run launch QA, confirm checklist completion, and prepare go-live status.",
    id: "launch",
    name: "Launch",
    soldierName: "Launch QA Soldier"
  },
  {
    commanderName: "Reporting Commander",
    description: "Generate launch report, product performance summary, and client-facing operating status.",
    id: "reporting",
    name: "Reporting",
    soldierName: "Weekly Report Soldier"
  },
  {
    commanderName: "Reporting Commander",
    description: "Identify optimization opportunities, product improvements, and next-cycle recommendations.",
    id: "optimization",
    name: "Optimization",
    soldierName: "Opportunity Report Soldier"
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

function firstOnlineChild(nodes: WorkflowNode[], parentId: string, type: NodeType) {
  return nodes.find((node) => node.parentId === parentId && commandTypeFor(node) === type && node.status !== "offline") ?? null;
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
  const commander = nodeByName(nodes, step.commanderName, "commander");

  if (!commander || commander.status === "offline") {
    return null;
  }

  const soldier = commander
    ? nodeByName(nodes, step.soldierName, "soldier", commander.id) ?? firstOnlineChild(nodes, commander.id, "soldier")
    : null;
  const assignee = soldier && soldier.status !== "offline" ? soldier : commander;

  if (!assignee) {
    return null;
  }

  return {
    assignee,
    commander,
    lineage: lineageFor(assignee, nodes)
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
        `[MARSHAL] Merch Marshal routed ${step.name} through the active business General.`,
        `[GENERAL] ${assignment.lineage.find((node) => commandTypeFor(node) === "general")?.name ?? "Business General"} routed ${step.name} to ${assignment.commander.name}.`,
        `[COMMANDER] ${assignment.commander.name} assigned execution to ${assignment.assignee.name}.`,
        `[SOLDIER] ${assignment.assignee.name} received ${step.name}.`,
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
