import type { NodeType } from "./command-os";

export type CommandSpeaker = "operator" | NodeType;

export type CommandReport = {
  analysis?: string;
  nextActions?: string[];
  recommendation?: string;
  situation: string;
};

export type CommandCommunicationProfile = {
  description: string;
  label: string;
  title: string;
};

export const commandCommunicationProfiles: Record<CommandSpeaker, CommandCommunicationProfile> = {
  commander: {
    description: "Operational, task-oriented, and efficient.",
    label: "COMMANDER",
    title: "Operational Manager"
  },
  emperor: {
    description: "Formal, strategic, calm, direct, and highly competent.",
    label: "ENTRAL",
    title: "Supreme Command Authority"
  },
  general: {
    description: "Business-focused, accountable, strategic, and practical.",
    label: "GENERAL",
    title: "Business Authority"
  },
  marshal: {
    description: "Broad, executive, command-level, analytical, and theater-focused.",
    label: "MARSHAL",
    title: "Strategic Theater Authority"
  },
  operator: {
    description: "Human directive issued into the command structure.",
    label: "OPERATOR",
    title: "Human Command"
  },
  soldier: {
    description: "Concise, focused, and execution-oriented.",
    label: "SOLDIER",
    title: "Execution Unit"
  }
};

export function commandSourceLabel(speaker: CommandSpeaker) {
  return `[${commandCommunicationProfiles[speaker].label}]`;
}

export function commandSpeakerFromNodeType(type?: NodeType | null): Exclude<CommandSpeaker, "operator"> {
  return type ?? "emperor";
}

export function formatCommandReport(report: CommandReport) {
  return [
    `Situation:\n${report.situation}`,
    report.analysis ? `Analysis:\n${report.analysis}` : null,
    report.recommendation ? `Recommendation:\n${report.recommendation}` : null,
    report.nextActions?.length ? `Next Actions:\n${report.nextActions.map((action) => `- ${action}`).join("\n")}` : null
  ].filter(Boolean).join("\n\n");
}

export function formatCommandTransmission(content: string | CommandReport) {
  return typeof content === "string" ? content.trim() : formatCommandReport(content);
}

export function commandSpeakerFromPrefix(content: string): CommandSpeaker | null {
  const prefix = /^\s*\[(ENTRAL|MARSHAL|GENERAL|COMMANDER|SOLDIER|OPERATOR)\]/i.exec(content)?.[1]?.toUpperCase();

  if (prefix === "ENTRAL") return "emperor";
  if (prefix === "MARSHAL") return "marshal";
  if (prefix === "GENERAL") return "general";
  if (prefix === "COMMANDER") return "commander";
  if (prefix === "SOLDIER") return "soldier";
  if (prefix === "OPERATOR") return "operator";
  return null;
}

export function stripCommandSourcePrefix(content: string) {
  return content.replace(/^\s*\[(?:ENTRAL|MARSHAL|GENERAL|COMMANDER|SOLDIER|OPERATOR)\]\s*/i, "").trim();
}

export function statusLineForTransmission(content: string) {
  const sectionHeaders = new Set(["Situation:", "Analysis:", "Recommendation:", "Next Actions:"]);

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => !sectionHeaders.has(line))
    .find(Boolean) ?? "Directive processed.";
}
