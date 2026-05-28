export type NodeType = "emperor" | "general" | "soldier" | "operation";

export type CommandStatus = "idle" | "running" | "success" | "warning" | "error" | "awaiting_approval" | "paused";

export type CommandNode = {
  children?: string[];
  createdAt?: string;
  description?: string;
  health: number;
  id: string;
  logs?: string[];
  metrics?: Record<string, number | string>;
  name: string;
  parentId: string | null;
  permissions?: string[];
  progress?: number;
  role: string;
  status: CommandStatus;
  title: string;
  tools?: string[];
  type: NodeType;
};

export type CommandGeneral = {
  color: string;
  id: string;
  name: string;
  role: string;
  soldiers: string[];
};

export const commandGenerals: CommandGeneral[] = [
  {
    color: "#00F0FF",
    id: "aris",
    name: "ARIS",
    role: "Operations & Business Execution",
    soldiers: ["Website Builder", "Deployment Manager", "SOP Architect", "Automation Runner", "Client Delivery"]
  },
  {
    color: "#8A5CFF",
    id: "vanta",
    name: "VANTA",
    role: "Security & Monitoring",
    soldiers: ["Server Monitor", "Auth Watch", "Audit Log", "Threat Detection", "Permission Guard"]
  },
  {
    color: "#FF00FF",
    id: "mercury",
    name: "MERCURY",
    role: "Marketing & Growth",
    soldiers: ["SEO Analyst", "Trend Scanner", "Ad Strategist", "Social Publisher", "Conversion Tracker"]
  },
  {
    color: "#39FF14",
    id: "orion",
    name: "ORION",
    role: "Research & Intelligence",
    soldiers: ["Market Scanner", "Competitor Analyst", "Product Validator", "Pricing Research", "Report Builder"]
  },
  {
    color: "#00BFFF",
    id: "helix",
    name: "HELIX",
    role: "Development & Debugging",
    soldiers: ["Bug Tracker", "Code Review", "Patch Planner", "Repo Scanner", "Test Runner"]
  }
];

const defaultOperationByGeneral: Record<string, string> = {
  aris: "Generate landing page wireframe",
  helix: "Review deployment logs",
  mercury: "Run SEO keyword scan",
  orion: "Build market intelligence brief",
  vanta: "Monitor failed auth events"
};

const defaultPermissions = ["read_project_context", "write_mock_plan", "request_approval"];
const defaultTools = ["mock_command_bus", "mock_operation_log", "mock_status_reporter"];

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function healthFor(id: string) {
  const base = Array.from(id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return 86 + (base % 14);
}

export function createDefaultCommandHierarchy(): CommandNode[] {
  const nodes: CommandNode[] = [
    {
      children: commandGenerals.map((general) => general.id),
      description: "Supreme command layer overseeing all Generals, Soldiers, Operations, approvals, memory, and system health.",
      health: 100,
      id: "entral",
      logs: ["Command OS online.", "Emperor layer supervising Generals.", "Mock execution mode active."],
      metrics: { approvals: 4, generals: commandGenerals.length, operations: commandGenerals.length },
      name: "ENTRAL",
      parentId: null,
      permissions: ["govern_all_generals", "approve_operations", "read_system_memory", "route_commands"],
      role: "Strategic Command",
      status: "running",
      title: "Emperor",
      tools: ["command_console", "neural_graph", "policy_gate", "memory_layer"],
      type: "emperor"
    }
  ];

  for (const general of commandGenerals) {
    const soldierIds = general.soldiers.map((soldier) => `${general.id}-${slugify(soldier)}`);

    nodes.push({
      children: soldierIds,
      description: `${general.name} coordinates ${general.role.toLowerCase()} through specialized Soldiers and mock Operations.`,
      health: 96,
      id: general.id,
      logs: [`${general.name} General online.`, `${general.soldiers.length} Soldiers standing by.`],
      metrics: { soldiers: soldierIds.length, active: 1, alerts: general.id === "vanta" ? 1 : 0 },
      name: general.name,
      parentId: "entral",
      permissions: ["assign_soldiers", "create_mock_operations", "report_status"],
      role: general.role,
      status: general.id === "vanta" ? "warning" : "running",
      title: "General",
      tools: ["mock_dispatcher", "mock_activity_feed", "mock_health_monitor"],
      type: "general"
    });

    for (const [index, soldier] of general.soldiers.entries()) {
      const soldierId = `${general.id}-${slugify(soldier)}`;
      const shouldSeedOperation = index === 0;
      const operationId = `${soldierId}-operation-1`;

      nodes.push({
        children: shouldSeedOperation ? [operationId] : [],
        description: `${soldier} supports ${general.name}'s ${general.role.toLowerCase()} lane.`,
        health: healthFor(soldierId),
        id: soldierId,
        logs: [`${soldier} Soldier initialized.`, "Awaiting Command OS instructions."],
        metrics: { operations: shouldSeedOperation ? 1 : 0, successRate: `${88 + (index % 9)}%` },
        name: soldier,
        parentId: general.id,
        permissions: defaultPermissions,
        role: `${general.role} specialist`,
        status: shouldSeedOperation ? "running" : "idle",
        title: "Soldier",
        tools: defaultTools,
        type: "soldier"
      });

      if (shouldSeedOperation) {
        nodes.push({
          createdAt: new Date().toISOString(),
          description: "Simulated live task. No external execution is connected yet.",
          health: 92,
          id: operationId,
          logs: ["Mock Operation created.", "Progress simulation ready."],
          metrics: { progress: 42, mode: "mock" },
          name: defaultOperationByGeneral[general.id],
          parentId: soldierId,
          permissions: ["read_parent_context"],
          progress: 42,
          role: "Mock live process",
          status: general.id === "vanta" ? "warning" : "running",
          title: "Operation",
          tools: ["mock_progress_engine"],
          type: "operation"
        });
      }
    }
  }

  return nodes;
}

export function commandStatusLabel(status: CommandStatus) {
  if (status === "awaiting_approval") return "Awaiting approval";
  if (status === "running") return "Running";
  if (status === "success") return "Complete";
  if (status === "warning") return "Warning";
  if (status === "error") return "Failed";
  if (status === "paused") return "Paused";
  return "Idle";
}

export function inferSoldierBlueprint(name: string, generalId: string) {
  const lowerName = name.toLowerCase();

  if (lowerName.includes("shopify")) {
    return {
      permissions: ["read_project_context", "generate_copy", "generate_page_structure", "suggest_integrations"],
      role: "Shopify storefront and landing page support",
      tools: ["mock_shopify_tool", "mock_landing_page_builder"]
    };
  }

  if (lowerName.includes("seo")) {
    return {
      permissions: ["read_project_context", "analyze_keywords", "draft_growth_plan"],
      role: "SEO research, content structure, and growth support",
      tools: ["mock_keyword_scanner", "mock_serp_reporter"]
    };
  }

  if (generalId === "helix") {
    return {
      permissions: ["read_repo_context", "create_patch_plan", "summarize_test_output"],
      role: "Development support and debugging",
      tools: ["mock_repo_scanner", "mock_test_runner"]
    };
  }

  return {
    permissions: defaultPermissions,
    role: "Specialized Command OS support",
    tools: defaultTools
  };
}

export function createCommandId(label: string, fallbackPrefix: string) {
  const slug = slugify(label);
  return slug || `${fallbackPrefix}-${Date.now().toString(36)}`;
}
