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
  generalType?: "Internal Business" | "Client Business" | "POD Store" | "Brand" | "Agency Client" | "Test Business" | "Other";
  health: number;
  id: string;
  logs?: string[];
  marshalType?: "Merch Theater" | "Website Theater" | "Voice Operations Theater" | "Marketing Theater" | "Automation Theater" | "Client Operations Theater" | "Internal Operations Theater" | "Test Theater" | "Other";
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
  { color: "#00F0FF", id: "merch-marshal", name: "Merch Marshal", role: "Merchandising, POD stores, client merch operations, launch packaging, and reporting theater", type: "Merch Theater" }
];

export const commandGenerals: CommandGeneral[] = [
  { businessName: "ENTRAL", id: "entral-general", marshalId: "merch-marshal", name: "ENTRAL General", role: "Internal POD merch operating command for ENTRAL-owned and client-prep workflows", type: "Internal Business" }
];

const defaultPermissions = ["read_command_context", "request_approval", "report_status"];
const defaultTools = ["command_bus", "status_reporter"];
const bootTime = "2026-05-28T00:00:00.000Z";

const merchCommanders = [
  {
    name: "Client Intake Commander",
    soldiers: ["Business Profile Soldier", "Audience Soldier", "Offer Soldier", "Notes Soldier"]
  },
  {
    name: "Niche Research Commander",
    soldiers: ["Niche Scanner Soldier", "Competitor Research Soldier", "Buyer Emotion Soldier", "Product Opportunity Soldier"]
  },
  {
    name: "Brand Commander",
    soldiers: ["Brand Voice Soldier", "Color Direction Soldier", "Style Direction Soldier", "Collection Theme Soldier"]
  },
  {
    name: "Design Commander",
    soldiers: ["Design Concept Soldier", "Prompt Soldier", "Typography Soldier", "Mockup Soldier", "Variation Soldier"]
  },
  {
    name: "Listing Commander",
    soldiers: ["Title Soldier", "Description Soldier", "Tags Soldier", "SEO Soldier", "Materials Soldier"]
  },
  {
    name: "Compliance Commander",
    soldiers: ["Trademark Risk Soldier", "Copyright Risk Soldier", "AI Disclosure Soldier", "Production Partner Soldier", "Prohibited Content Soldier"]
  },
  {
    name: "Store Launch Commander",
    soldiers: ["Etsy Setup Soldier", "Printify Setup Soldier", "Shopify Setup Soldier", "Product Publish Checklist Soldier", "Launch QA Soldier"]
  },
  {
    name: "Marketing Commander",
    soldiers: ["Instagram Caption Soldier", "TikTok Script Soldier", "Email Launch Soldier", "QR Flyer Soldier", "Promo Calendar Soldier"]
  },
  {
    name: "Reporting Commander",
    soldiers: ["Weekly Report Soldier", "Sales Report Soldier", "Product Performance Soldier", "Opportunity Report Soldier"]
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
    notes: ["Local memory is persisted in browser storage until database-backed memory is connected."],
    recentTasks: [],
    role,
    taskResults: []
  };
}

export function createDefaultCommandHierarchy(): CommandNode[] {
  const merchMarshal = commandMarshals[0];
  const merchGeneral = commandGenerals[0];
  const commanderIds = merchCommanders.map((commander) => createCommandId(commander.name, "commander"));
  const nodes: CommandNode[] = [
    {
      activeCommanders: merchCommanders.length,
      activeGenerals: 1,
      activeProjects: ["ENTRAL Merch Operations"],
      activeSoldiers: merchCommanders.reduce((total, commander) => total + commander.soldiers.length, 0),
      children: [merchMarshal.id],
      createdAt: bootTime,
      currentTask: "Supervising the Merch theater and routing command-console directives.",
      description: "Stationary supreme command layer overseeing Marshals, business Generals, Commanders, Soldiers, approvals, memory, and system health.",
      health: 100,
      id: "entral",
      logs: ["Command OS online.", "ENTRAL core stable.", "Marshal layer initialized.", "Merch theater initialized."],
      memory: createMemory("Strategic Command Core", "Receive user intent, maintain Marshal hierarchy state, delegate tasks, and preserve operational memory."),
      metrics: {
        commanders: merchCommanders.length,
        generals: 1,
        marshals: 1,
        soldiers: merchCommanders.reduce((total, commander) => total + commander.soldiers.length, 0)
      },
      name: "ENTRAL",
      parentId: null,
      permissions: ["govern_hierarchy", "route_commands", "manage_visual_structure"],
      role: "Strategic Command Core",
      status: "thinking",
      taskHistory: ["Booted Merch Command OS hierarchy."],
      title: "Central Command",
      tools: ["command_console", "neural_graph", "local_hierarchy_store"],
      type: "emperor"
    }
  ];

  nodes.push({
    activeCommanders: merchCommanders.length,
    activeGenerals: 1,
    activeProjects: ["Client Merch Store Launch"],
    activeSoldiers: merchCommanders.reduce((total, commander) => total + commander.soldiers.length, 0),
    children: [merchGeneral.id],
    createdAt: bootTime,
    currentTask: "Maintaining Merch theater readiness and routing business Generals.",
    description: "Merch Marshal is the strategic theater authority for POD stores, launch packages, product batches, compliance review, and client merch operations.",
    health: healthFor(merchMarshal.id),
    id: merchMarshal.id,
    logs: ["Merch Marshal initialized.", "ENTRAL General assigned."],
    marshalType: merchMarshal.type,
    memory: {
      ...createMemory(merchMarshal.role, "Oversee all Merch business Generals, enforce approval rules, track theater health, and report strategic readiness to ENTRAL."),
      notes: [
        "Strategic Purpose: operate the POD merch service through business Generals.",
        "Business Category: client merch stores and POD launch operations.",
        "Approval Rules: no publishing, client contact, deletion, or launch-status changes without user approval.",
        "Compliance Notes: risk warnings are operational signals only and are not legal advice."
      ]
    },
    metrics: {
      activeBusinesses: 1,
      activeGenerals: 1,
      commanders: merchCommanders.length,
      riskLevel: "low",
      soldiers: merchCommanders.reduce((total, commander) => total + commander.soldiers.length, 0),
      successRate: 100
    },
    name: merchMarshal.name,
    parentId: "entral",
    permissions: ["create_generals", "archive_generals", "inspect_businesses", "route_merch_operations"],
    reports: [],
    reportHistory: [],
    role: merchMarshal.role,
    status: "idle",
    taskHistory: [],
    title: "Marshal",
    tools: ["merch_theater_router", "approval_gate", ...defaultTools],
    type: "marshal",
    updatedAt: bootTime
  });

  nodes.push({
    children: commanderIds,
    createdAt: bootTime,
    currentTask: "Standing by as the default internal business General for Merch Command workflows.",
    businessName: merchGeneral.businessName,
    description: "ENTRAL General represents the internal business operation used to stage POD workflows until a client/business General is created.",
    generalType: merchGeneral.type,
    health: healthFor(merchGeneral.id),
    id: merchGeneral.id,
    logs: ["ENTRAL General initialized.", `${commanderIds.length} operating Commanders assigned.`],
    memory: {
      ...createMemory(merchGeneral.role, "Represent the named business or client being operated, coordinate department Commanders, and report business status to Merch Marshal."),
      notes: [
        "Business Name: ENTRAL.",
        "Industry: AI command systems and merch operations.",
        "Audience: ENTRAL operators and client merch workflows.",
        "Approval Rules: user approval required before publishing or external client contact."
      ]
    },
    metrics: {
      activeProjects: 1,
      businessHealth: "healthy",
      commanders: commanderIds.length,
      soldiers: merchCommanders.reduce((total, commander) => total + commander.soldiers.length, 0)
    },
    name: merchGeneral.name,
    parentId: merchMarshal.id,
    parentMarshalId: merchMarshal.id,
    parentMarshalName: merchMarshal.name,
    permissions: ["create_commanders", "remove_commanders", "inspect_soldiers", "route_merch_operations"],
    reports: [],
    reportHistory: [],
    role: merchGeneral.role,
    status: "idle",
    taskHistory: [],
    title: "General",
    tools: ["merch_command_router", ...defaultTools],
    type: "general",
    updatedAt: bootTime
  });

  for (const commander of merchCommanders) {
    const commanderId = createCommandId(commander.name, "commander");
    const soldierIds = commander.soldiers.map((soldier) => `${commanderId}-${createCommandId(soldier, "soldier")}`);

    nodes.push({
      children: soldierIds,
      createdAt: bootTime,
      currentTask: null,
      description: `${commander.name} manages ${commander.soldiers.length} Merch Soldiers and reports execution status to ENTRAL General.`,
      health: healthFor(commanderId),
      id: commanderId,
      logs: [`${commander.name} initialized.`, `${commander.soldiers.length} Soldiers assigned.`],
      memory: createMemory(`${commander.name} operations`, "Break Merch theater work into Soldier-level execution and update the business General with progress."),
      metrics: { soldiers: soldierIds.length },
      name: commander.name,
      parentId: merchGeneral.id,
      parentGeneralId: merchGeneral.id,
      parentGeneralName: merchGeneral.name,
      parentMarshalId: merchMarshal.id,
      parentMarshalName: merchMarshal.name,
      permissions: ["create_soldiers", "remove_soldiers", "report_readiness", "assign_merch_work"],
      operationalArea: commander.name.replace(/\s+Commander$/i, ""),
      reports: [],
      reportHistory: [],
      role: `${commander.name} operations`,
      status: "idle",
      taskHistory: [],
      title: "Commander",
      tools: ["merch_status_reporter", ...defaultTools],
      type: "commander",
      updatedAt: bootTime
    });

    for (const soldierName of commander.soldiers) {
      const soldierId = `${commanderId}-${createCommandId(soldierName, "soldier")}`;

      nodes.push({
        children: [],
        createdAt: bootTime,
        currentTask: null,
        description: `${soldierName} executes ${commander.name.toLowerCase()} work for the Merch theater.`,
        health: healthFor(soldierId),
        id: soldierId,
        logs: [`${soldierName} initialized.`, "Awaiting Merch theater directives."],
        memory: createMemory(`${soldierName} execution`, `Execute assigned ${commander.name.toLowerCase()} tasks and return concise results to ${commander.name}.`),
        metrics: { readiness: "ready" },
        name: soldierName,
        parentId: commanderId,
        parentCommanderId: commanderId,
        parentCommanderName: commander.name,
        parentGeneralId: merchGeneral.id,
        parentGeneralName: merchGeneral.name,
        parentMarshalId: merchMarshal.id,
        parentMarshalName: merchMarshal.name,
        permissions: defaultPermissions,
        executionRole: `${soldierName} execution`,
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
