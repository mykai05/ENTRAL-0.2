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

function rankPluralFor(commandType: NodeType) {
  if (commandType === "marshal") return "Marshals";
  if (commandType === "general") return "Generals";
  if (commandType === "commander") return "Commanders";
  if (commandType === "soldier") return "Soldiers";
  return "entities";
}

function branchSuggestionFor(node?: CommandSuggestionNode | null) {
  return node && (node.commandType === "marshal" || node.commandType === "general" || node.commandType === "commander")
    ? "Set selected branch gravity to 220%"
    : null;
}

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
      { command: `Set ${node.name} gravity to 300%`, label: "Tune Gravity" },
      { command: `Clear ${node.name} gravity`, label: "Clear Gravity" },
      { command: "Show active Generals", label: "Show Active" }
    ];
  }

  if (node.commandType === "general") {
    return [
      { command: "Create Commander under this General", label: "Add Commander" },
      { command: `Report on ${node.name}`, label: "General Report" },
      { command: `Set ${node.name} gravity to 300%`, label: "Tune Gravity" },
      { command: `Clear ${node.name} gravity`, label: "Clear Gravity" },
      { command: "Start merch store launch workflow", label: "Start Workflow" }
    ];
  }

  if (node.commandType === "commander") {
    return [
      { command: "Create Soldier under this Commander", label: "Add Soldier" },
      { command: `Report on ${node.name}`, label: "Commander Report" },
      { command: `Set ${node.name} gravity to 300%`, label: "Tune Gravity" },
      { command: `Clear ${node.name} gravity`, label: "Clear Gravity" },
      { command: `Assign task to ${node.name}`, label: "Assign Task" }
    ];
  }

  return [
    { command: `Assign task to ${node.name}`, label: "Assign Task" },
    { command: `Report on ${node.name}`, label: "Soldier Report" },
    { command: `Set ${node.name} gravity to 300%`, label: "Tune Gravity" },
    { command: `Clear ${node.name} gravity`, label: "Clear Gravity" },
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
      "Create Merch Marshal",
      "Create POD business named Iron House Gym",
      "Create Website business named FutureFocused Web Works",
      "Show business templates",
      "Explain the chain of command",
      "Explain gravity controls"
    ];
  }

  if (selectedNode?.commandType === "marshal") {
    return [
      `Report on ${selectedNode.name}`,
      "Set selected gravity to 300%",
      "Nudge selected gravity up",
      "Loosen selected gravity",
      `Set all ${rankPluralFor(selectedNode.commandType)} gravity to 220%`,
      branchSuggestionFor(selectedNode) ?? "Set selected branch gravity to 220%",
      "Clear selected gravity",
      "Create my first business",
      "Show active Generals"
    ];
  }

  if (selectedNode?.commandType === "general") {
    return [
      `Report on ${selectedNode.businessName ?? selectedNode.name}`,
      "Set selected gravity to 300%",
      "Nudge selected gravity up",
      "Loosen selected gravity",
      `Set all ${rankPluralFor(selectedNode.commandType)} gravity to 220%`,
      branchSuggestionFor(selectedNode) ?? "Set selected branch gravity to 220%",
      "Clear selected gravity",
      "Start merch store launch workflow",
      "Generate 10 product ideas",
      "Open approval queue",
      "Create task complete business intake"
    ];
  }

  if (selectedNode?.commandType === "commander") {
    return [
      `Assign task to ${selectedNode.name}`,
      "Set selected gravity to 300%",
      "Nudge selected gravity up",
      "Loosen selected gravity",
      `Set all ${rankPluralFor(selectedNode.commandType)} gravity to 220%`,
      branchSuggestionFor(selectedNode) ?? "Set selected branch gravity to 220%",
      "Clear selected gravity",
      "Create Soldier under this Commander",
      "Show active Soldiers",
      "Show failing Operations",
      "Return to ENTRAL"
    ];
  }

  if (selectedNode?.commandType === "soldier") {
    return [
      `Assign task to ${selectedNode.name}`,
      "Set selected gravity to 300%",
      "Nudge selected gravity up",
      "Loosen selected gravity",
      `Set all ${rankPluralFor(selectedNode.commandType)} gravity to 220%`,
      "Clear selected gravity",
      "Show current task",
      "Report on this Soldier",
      "Open parent Commander",
      "Return to ENTRAL"
    ];
  }

  return [
    "Show chain of command",
    "Create my first business",
    "Explain gravity controls",
    "Set global gravity to 300%",
    "Set global gravity to 1000%",
    "Nudge global gravity up",
    "Loosen global gravity",
    "Set all gravity to 300%",
    "Set all gravity to 900%",
    "Nudge all gravity up",
    "Set all Soldiers gravity to 250%",
    "Nudge Soldiers gravity down",
    "Set every entity gravity to 300%",
    "Clear all gravity overrides",
    "Show active Generals",
    "Open business templates",
    "Create task review today's command status",
    "Return to ENTRAL"
  ];
}
