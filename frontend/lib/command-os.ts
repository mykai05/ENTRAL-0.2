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
    notes: ["Command memory is saved locally and syncs to the backend when the operator is signed in."],
    recentTasks: [],
    role,
    taskResults: []
  };
}

export function createDefaultCommandHierarchy(): CommandNode[] {
  return [
    {
      activeCommanders: 0,
      activeGenerals: 0,
      activeProjects: [],
      activeSoldiers: 0,
      children: [],
      createdAt: bootTime,
      currentTask: null,
      description: "Stationary supreme command layer awaiting user-created Marshals, business Generals, Commanders, Soldiers, approvals, memory, and system health.",
      health: 100,
      id: "entral",
      logs: ["ENTRAL Command System online.", "No command structures detected.", "Awaiting directives."],
      memory: createMemory("Strategic Command Core", "Receive user intent, create command structures only with user direction, maintain hierarchy state, delegate tasks, and preserve operational memory."),
      metrics: {
        commanders: 0,
        generals: 0,
        marshals: 0,
        soldiers: 0
      },
      name: "ENTRAL",
      parentId: null,
      permissions: ["govern_hierarchy", "route_commands", "manage_visual_structure"],
      role: "Strategic Command Core",
      status: "thinking",
      taskHistory: [],
      title: "Central Command",
      tools: ["command_console", "neural_graph", "local_hierarchy_store"],
      type: "emperor"
    }
  ];
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
