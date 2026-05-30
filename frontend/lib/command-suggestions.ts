import type { NodeType } from "./command-os";

export type CommandSuggestionNode = {
  businessName?: string;
  commandType: NodeType;
  name: string;
  parentCommanderName?: string | null;
};

export type InspectorSuggestedAction = {
  command: string;
  label: string;
};

type CommandSuggestionContext = {
  businessGeneralCount: number;
  isBusinessWizardOpen: boolean;
  pendingAuthorization: boolean;
  selectedNode?: CommandSuggestionNode | null;
};

export function getInspectorSuggestedActions(node?: CommandSuggestionNode | null): InspectorSuggestedAction[] {
  if (!node) return [];

  if (node.commandType === "emperor") {
    return [
      { command: "Create Merch Marshal", label: "Create Marshal" },
      { command: "Create my first business", label: "Create Business" },
      { command: "Generate report", label: "System Report" }
    ];
  }

  if (node.commandType === "marshal") {
    return [
      { command: "Create my first business", label: "Create Business General" },
      { command: `Report on ${node.name}`, label: "Marshal Report" },
      { command: "Show active Generals", label: "Show Active" }
    ];
  }

  if (node.commandType === "general") {
    return [
      { command: "Create Commander under this General", label: "Add Commander" },
      { command: `Report on ${node.name}`, label: "General Report" },
      { command: "Start merch store launch workflow", label: "Start Workflow" }
    ];
  }

  if (node.commandType === "commander") {
    return [
      { command: "Create Soldier under this Commander", label: "Add Soldier" },
      { command: `Report on ${node.name}`, label: "Commander Report" },
      { command: `Assign task to ${node.name}`, label: "Assign Task" }
    ];
  }

  return [
    { command: `Assign task to ${node.name}`, label: "Assign Task" },
    { command: `Report on ${node.name}`, label: "Soldier Report" },
    { command: node.parentCommanderName ? `Open ${node.parentCommanderName}` : "Return to ENTRAL", label: "Parent Commander" }
  ];
}

export function getContextCommandSuggestions(context: CommandSuggestionContext): string[] {
  const { businessGeneralCount, isBusinessWizardOpen, pendingAuthorization, selectedNode } = context;

  if (pendingAuthorization) {
    return [
      "Approve",
      "Cancel",
      "Show help"
    ];
  }

  if (isBusinessWizardOpen) {
    return [
      "Create my first business",
      "Use POD merch store template",
      "Use local service business template",
      "Show business templates"
    ];
  }

  if (businessGeneralCount === 0) {
    return [
      "Help",
      "Create Merch Marshal",
      "Help me create my first business",
      "Load demo environment",
      "Create POD business named Iron House Gym",
      "Show business templates",
      "Explain the chain of command"
    ];
  }

  if (selectedNode?.commandType === "general") {
    return [
      `Report on ${selectedNode.businessName ?? selectedNode.name}`,
      "Start merch store launch workflow",
      "Generate 10 product ideas",
      "Open approval queue",
      "Create task complete business intake"
    ];
  }

  if (selectedNode?.commandType === "commander") {
    return [
      `Assign task to ${selectedNode.name}`,
      "Create Soldier under this Commander",
      "Show active Soldiers",
      "Show failing Operations",
      "Return to ENTRAL"
    ];
  }

  if (selectedNode?.commandType === "soldier") {
    return [
      `Assign task to ${selectedNode.name}`,
      "Show current task",
      "Report on this Soldier",
      "Open parent Commander",
      "Return to ENTRAL"
    ];
  }

  return [
    "Show chain of command",
    "Create my first business",
    "Show active Generals",
    "Open business templates",
    "Create task review today's command status",
    "Return to ENTRAL"
  ];
}
