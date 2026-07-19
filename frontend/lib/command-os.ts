export type NodeType = "emperor" | "marshal" | "general" | "commander" | "soldier";

export type CommandStatus = "idle" | "working" | "thinking" | "waiting" | "error" | "offline";

export type CommandTaskStatus = "pending" | "assigned" | "running" | "completed" | "failed";

export type CommandMemory = {
  instructions: string;
  notes: string[];
  recentTasks: string[];
  role: string;
  taskResults: string[];
};

export type CommandTask = {
  assignedEntityId: string | null;
  assignedEntityType?: NodeType | null;
  completedAt?: string | null;
  commanderId?: string | null;
  commanderName?: string | null;
  createdAt: string;
  delegationPath: string[];
  description: string;
  generalId?: string | null;
  generalName?: string | null;
  history: string[];
  id: string;
  marshalId?: string | null;
  marshalName?: string | null;
  name: string;
  reportHistory?: CommandReportRecord[];
  soldierId?: string | null;
  soldierName?: string | null;
  status: CommandTaskStatus;
  updatedAt: string;
};

export type CommandReportRecord = {
  analysis: string;
  commanderId?: string | null;
  createdAt: string;
  destinationEntityId: string;
  destinationEntityType: NodeType;
  generalId?: string | null;
  id: string;
  marshalId?: string | null;
  nextActions: string[];
  recommendation: string;
  situation: string;
  soldierId?: string | null;
  sourceEntityId: string;
  sourceEntityType: NodeType;
};

export type CommandNode = {
  children: string[];
  createdAt: string;
  currentTask: string | null;
  activeCommanders?: number;
  activeGenerals?: number;
  activeProjects?: string[];
  activeSoldiers?: number;
  activeStores?: string[];
  businessName?: string;
  description?: string;
  executionRole?: string;
  generalType?: "Operating Business" | "Internal Business" | "Client Business" | "POD Store" | "Brand" | "Agency Client" | "Test Business" | "Other";
  health: number;
  id: string;
  logs?: string[];
  marshalType?: "Portfolio Theater" | "Merch Theater" | "Website Theater" | "Voice Operations Theater" | "Marketing Theater" | "Automation Theater" | "Client Operations Theater" | "Internal Operations Theater" | "Test Theater" | "Other";
  memory: CommandMemory;
  metrics?: Record<string, number | string>;
  name: string;
  operationalArea?: string;
  parentId: string | null;
  parentCommanderId?: string | null;
  parentCommanderName?: string | null;
  parentGeneralId?: string | null;
  parentGeneralName?: string | null;
  parentMarshalId?: string | null;
  parentMarshalName?: string | null;
  permissions?: string[];
  progress?: number;
  reports?: CommandReportRecord[];
  reportHistory?: CommandReportRecord[];
  role: string;
  status: CommandStatus;
  taskHistory: string[];
  title: string;
  tools?: string[];
  type: NodeType;
  updatedAt?: string;
};

export type CommandMarshal = {
  color: string;
  id: string;
  name: string;
  role: string;
  type: NonNullable<CommandNode["marshalType"]>;
};

export type CommandGeneral = {
  businessName: string;
  id: string;
  marshalId: string;
  name: string;
  role: string;
  type: NonNullable<CommandNode["generalType"]>;
};

export const commandMarshals: CommandMarshal[] = [
  { color: "#00F0FF", id: "portfolio-marshal", name: "Portfolio Marshal", role: "Multi-business portfolio oversight, organization routing, capacity, and cross-business visibility", type: "Client Operations Theater" },
  { color: "#9B7BFF", id: "intelligence-marshal", name: "Intelligence Marshal", role: "Research, evidence, market intelligence, opportunity discovery, and decision support", type: "Other" },
  { color: "#39FF9A", id: "operations-marshal", name: "Operations Marshal", role: "Business delivery, implementation, workflow execution, service quality, and operating cadence", type: "Internal Operations Theater" },
  { color: "#FF4FD8", id: "growth-marshal", name: "Growth Marshal", role: "Positioning, pipeline, client development, retention, and measured growth systems", type: "Marketing Theater" },
  { color: "#FFD166", id: "governance-marshal", name: "Governance Marshal", role: "Approvals, security, compliance, auditability, risk, and controlled automation", type: "Automation Theater" }
];

export const commandGenerals: CommandGeneral[] = [
  { businessName: "Sovereign Protocol", id: "sovereign-protocol-general", marshalId: "operations-marshal", name: "Sovereign Protocol General", role: "Internal business command for Sovereign Protocol delivery, systems, client success, and operating quality", type: "Internal Business" }
];

const defaultPermissions = ["read_command_context", "request_approval", "report_status"];
const defaultTools = ["command_bus", "status_reporter"];
const bootTime = "2026-05-28T00:00:00.000Z";

const sovereignCommanders = [
  {
    name: "Research & Evidence Commander",
    soldiers: ["Business Research Soldier", "Market Intelligence Soldier", "Evidence Quality Soldier", "Source Lineage Soldier"]
  },
  {
    name: "Strategy & Planning Commander",
    soldiers: ["Objective Soldier", "Priority Soldier", "Operating Plan Soldier", "Risk Scenario Soldier"]
  },
  {
    name: "Delivery & Implementation Commander",
    soldiers: ["Workflow Design Soldier", "Integration Soldier", "Deployment Readiness Soldier", "Training Soldier"]
  },
  {
    name: "Governance & Quality Commander",
    soldiers: ["Approval Gate Soldier", "Security Review Soldier", "Quality Assurance Soldier", "Operating Review Soldier"]
  }
] as const;

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function healthFor(id: string) {
  const base = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 88 + (base % 12);
}

function createMemory(role: string, instructions: string): CommandMemory {
  return {
    instructions,
    notes: ["Command memory is saved locally and syncs to the backend when the operator is signed in."],
    recentTasks: [],
    role,
    taskResults: []
  };
}

export function createDefaultCommandHierarchy(): CommandNode[] {
  const general = commandGenerals[0];
  const commanderIds = sovereignCommanders.map((commander) => createCommandId(commander.name, "commander"));
  const soldierCount = sovereignCommanders.reduce((total, commander) => total + commander.soldiers.length, 0);
  const nodes: CommandNode[] = [{
    activeCommanders: sovereignCommanders.length,
    activeGenerals: 1,
    activeProjects: ["Sovereign Protocol"],
    activeSoldiers: soldierCount,
    children: commandMarshals.map((marshal) => marshal.id),
    createdAt: bootTime,
    currentTask: "Maintaining the multi-business command universe and routing work through the chain of command.",
    description: "Stationary strategic nucleus for a portfolio-scale command universe. Marshals own theaters, Generals represent businesses, Commanders own departments, and Soldiers execute bounded work.",
    health: 100,
    id: "entral",
    logs: ["ENTRAL Command System online.", "Five strategic theaters initialized.", "Chain of command ready for additional businesses."],
    memory: createMemory("Strategic Command Core", "Receive operator intent, maintain a portfolio-scale hierarchy, route objectives through Marshals, business Generals, Commanders, and Soldiers, and preserve governed operational memory."),
    metrics: {
      commanders: sovereignCommanders.length,
      generals: 1,
      marshals: commandMarshals.length,
      soldiers: soldierCount
    },
    name: "ENTRAL",
    parentId: null,
    permissions: ["govern_hierarchy", "route_commands", "manage_visual_structure"],
    role: "Strategic Command Core",
    status: "thinking",
    taskHistory: [],
    title: "Central Command",
    tools: ["command_console", "neural_graph", "portfolio_router", "local_hierarchy_store"],
    type: "emperor"
  }];

  for (const marshal of commandMarshals) {
    const ownsInternalBusiness = marshal.id === general.marshalId;

    nodes.push({
      activeCommanders: ownsInternalBusiness ? sovereignCommanders.length : 0,
      activeGenerals: ownsInternalBusiness ? 1 : 0,
      activeProjects: ownsInternalBusiness ? ["Sovereign Protocol"] : [],
      activeSoldiers: ownsInternalBusiness ? soldierCount : 0,
      children: ownsInternalBusiness ? [general.id] : [],
      createdAt: bootTime,
      currentTask: null,
      description: marshal.role,
      health: healthFor(marshal.id),
      id: marshal.id,
      logs: [`${marshal.name} initialized.`, ownsInternalBusiness ? "Sovereign Protocol General assigned." : "Ready to receive business Generals."],
      marshalType: marshal.type,
      memory: createMemory(marshal.role, `Own the ${marshal.name.replace(/\s+Marshal$/i, "")} theater, coordinate every assigned business General, and report portfolio status to ENTRAL.`),
      metrics: {
        activeBusinesses: ownsInternalBusiness ? 1 : 0,
        activeGenerals: ownsInternalBusiness ? 1 : 0,
        commanders: ownsInternalBusiness ? sovereignCommanders.length : 0,
        soldiers: ownsInternalBusiness ? soldierCount : 0
      },
      name: marshal.name,
      parentId: "entral",
      permissions: ["create_generals", "archive_generals", "inspect_businesses", "route_theater_operations"],
      reports: [],
      reportHistory: [],
      role: marshal.role,
      status: "idle",
      taskHistory: [],
      title: "Marshal",
      tools: ["portfolio_router", "approval_gate", ...defaultTools],
      type: "marshal",
      updatedAt: bootTime
    });
  }

  nodes.push({
    businessName: general.businessName,
    children: commanderIds,
    createdAt: bootTime,
    currentTask: "Operating the internal Sovereign Protocol business system.",
    description: "The internal business General coordinates research, planning, delivery, and governance departments without exposing cross-client or privileged control-plane data.",
    generalType: general.type,
    health: healthFor(general.id),
    id: general.id,
    logs: ["Sovereign Protocol General initialized.", `${commanderIds.length} department Commanders assigned.`],
    memory: createMemory(general.role, "Coordinate the Sovereign Protocol operating system, delegate department work, preserve tenant boundaries, and report business status to the Operations Marshal."),
    metrics: { activeProjects: 1, commanders: commanderIds.length, soldiers: soldierCount },
    name: general.name,
    parentId: general.marshalId,
    parentMarshalId: general.marshalId,
    parentMarshalName: commandMarshals.find((marshal) => marshal.id === general.marshalId)?.name,
    permissions: ["create_commanders", "remove_commanders", "inspect_soldiers", "route_business_operations"],
    reports: [],
    reportHistory: [],
    role: general.role,
    status: "idle",
    taskHistory: [],
    title: "General",
    tools: ["business_command_router", ...defaultTools],
    type: "general",
    updatedAt: bootTime
  });

  for (const commander of sovereignCommanders) {
    const commanderId = createCommandId(commander.name, "commander");
    const soldierIds = commander.soldiers.map((soldier) => `${commanderId}-${createCommandId(soldier, "soldier")}`);

    nodes.push({
      children: soldierIds,
      createdAt: bootTime,
      currentTask: null,
      description: `${commander.name} owns a bounded operating department and reports outcomes to Sovereign Protocol General.`,
      health: healthFor(commanderId),
      id: commanderId,
      logs: [`${commander.name} initialized.`, `${soldierIds.length} execution Soldiers assigned.`],
      memory: createMemory(`${commander.name} operations`, "Break approved objectives into bounded execution work, coordinate Soldiers, and report results to the business General."),
      metrics: { soldiers: soldierIds.length },
      name: commander.name,
      operationalArea: commander.name.replace(/\s+Commander$/i, ""),
      parentGeneralId: general.id,
      parentGeneralName: general.name,
      parentId: general.id,
      parentMarshalId: general.marshalId,
      parentMarshalName: commandMarshals.find((marshal) => marshal.id === general.marshalId)?.name,
      permissions: ["create_soldiers", "remove_soldiers", "report_readiness", "assign_department_work"],
      reports: [],
      reportHistory: [],
      role: `${commander.name} operations`,
      status: "idle",
      taskHistory: [],
      title: "Commander",
      tools: ["department_status_reporter", ...defaultTools],
      type: "commander",
      updatedAt: bootTime
    });

    for (const soldierName of commander.soldiers) {
      const soldierId = `${commanderId}-${createCommandId(soldierName, "soldier")}`;

      nodes.push({
        children: [],
        createdAt: bootTime,
        currentTask: null,
        description: `${soldierName} is a bounded execution unit inside ${commander.name}.`,
        executionRole: `${soldierName} execution`,
        health: healthFor(soldierId),
        id: soldierId,
        logs: [`${soldierName} initialized.`, "Awaiting an approved directive."],
        memory: createMemory(`${soldierName} execution`, `Execute approved ${commander.name.toLowerCase()} work and return concise evidence to ${commander.name}.`),
        metrics: { readiness: "ready" },
        name: soldierName,
        parentCommanderId: commanderId,
        parentCommanderName: commander.name,
        parentGeneralId: general.id,
        parentGeneralName: general.name,
        parentId: commanderId,
        parentMarshalId: general.marshalId,
        parentMarshalName: commandMarshals.find((marshal) => marshal.id === general.marshalId)?.name,
        permissions: defaultPermissions,
        reports: [],
        reportHistory: [],
        role: `${soldierName} execution`,
        status: "idle",
        taskHistory: [],
        title: "Soldier",
        tools: defaultTools,
        type: "soldier",
        updatedAt: bootTime
      });
    }
  }

  return nodes;
}

export function commandStatusLabel(status: CommandStatus) {
  if (status === "working") return "Working";
  if (status === "thinking") return "Thinking";
  if (status === "waiting") return "Waiting";
  if (status === "error") return "Error";
  if (status === "offline") return "Offline";
  return "Idle";
}

export function commandStatusColor(status: CommandStatus) {
  if (status === "working") return "#39FF14";
  if (status === "thinking") return "#00BFFF";
  if (status === "waiting") return "#FFCC00";
  if (status === "error") return "#FF4D6D";
  if (status === "offline") return "#8A8F98";
  return "#00F0FF";
}

export function commandTaskStatusLabel(status: CommandTaskStatus) {
  if (status === "assigned") return "Assigned";
  if (status === "running") return "Running";
  if (status === "completed") return "Completed";
  if (status === "failed") return "Failed";
  return "Pending";
}

export function inferSoldierBlueprint(name: string) {
  return {
    permissions: defaultPermissions,
    role: `${name} execution Soldier`,
    tools: defaultTools
  };
}

export function createCommandId(label: string, fallbackPrefix: string) {
  const slug = slugify(label);
  return slug || `${fallbackPrefix}-${Date.now().toString(36)}`;
}
