import type { NodeType } from "./command-os";

export type CreationNodeContext = {
  commandType: NodeType;
  id: string;
  name: string;
};

export type CreationBlockedTransmission = {
  analysis: string;
  nextActions: string[];
  recommendation: string;
  situation: string;
};

function titleFor(type: Exclude<NodeType, "emperor">) {
  if (type === "marshal") return "Marshal";
  if (type === "general") return "General";
  if (type === "commander") return "Commander";
  return "Soldier";
}

export function nextCommandPlaceholderName(type: Exclude<NodeType, "emperor">, nodes: CreationNodeContext[]) {
  const label = titleFor(type);
  const matcher = new RegExp(`^${label} (\\d+)$`, "i");
  const max = nodes.reduce((highest, node) => {
    if (node.commandType !== type) return highest;
    const value = Number(matcher.exec(node.name)?.[1] ?? 0);
    return Math.max(highest, value);
  }, 0);

  return `${label} ${max + 1}`;
}

export function hierarchyNameFromCommandText(text: string, type: Exclude<NodeType, "emperor">, nodes: CreationNodeContext[]) {
  const label = titleFor(type);
  const directNamed = new RegExp(`\\b${label}\\s+(?:named|called)\\s+([^,.;]+?)(?:\\s+under\\b|\\s+for\\b|$)`, "i").exec(text)?.[1]?.trim();
  const beforeUnder = new RegExp(`\\b(?:create|add|new)\\s+(?:a\\s+|an\\s+|new\\s+)?(.+?)\\s+${label}(?:\\s+under|\\s+for|$)`, "i").exec(text)?.[1]?.trim();
  const afterFor = new RegExp(`${label}\\s+for\\s+([^,.;]+)`, "i").exec(text)?.[1]?.trim();
  const usableBeforeUnder = beforeUnder && beforeUnder.replace(/^new$/i, "").trim().length > 0 ? beforeUnder : undefined;
  const rawName = directNamed || usableBeforeUnder || afterFor;

  if (!rawName) return nextCommandPlaceholderName(type, nodes);

  const cleaned = rawName.replace(/^new\s+/i, "").trim();
  const normalized = cleaned.length > 0 ? cleaned : titleFor(type);

  return new RegExp(`\\b${label}$`, "i").test(normalized) ? normalized : `${normalized} ${label}`;
}

export function creationBlockedTransmission(type: Exclude<NodeType, "emperor">): CreationBlockedTransmission {
  if (type === "general") {
    return {
      analysis: "Additional operational detail is required. A General represents one niche inside a broad-domain Marshal.",
      nextActions: ["Select or create a broad-domain Marshal.", "Create the niche General under that Marshal.", "Or open guided business setup."],
      recommendation: "Do not create Generals directly under ENTRAL.",
      situation: "General creation blocked by hierarchy requirements."
    };
  }

  if (type === "commander") {
    return {
      analysis: "A Commander represents one business and must belong to its niche General.",
      nextActions: ["Select or create a broad-domain Marshal.", "Select or create a niche General.", "Create the business Commander again."],
      recommendation: "Use guided business setup if you want ENTRAL to build the business and its operational functions.",
      situation: "Commander creation blocked by hierarchy requirements."
    };
  }

  if (type === "soldier") {
    return {
      analysis: "A Soldier represents one operational function and must belong to a business Commander.",
      nextActions: ["Select or create a niche General.", "Create the business Commander under that General.", "Create the operational Soldier again."],
      recommendation: "Build the business command lane before adding operational functions.",
      situation: "Soldier creation blocked by hierarchy requirements."
    };
  }

  return {
    analysis: "ENTRAL can create a Marshal directly under the central command system after authorization.",
    nextActions: ["Review the authorization preview.", "Approve creation if the Marshal name is correct."],
    recommendation: "Use each Marshal as a broad operating domain that contains niche Generals.",
    situation: "Marshal creation ready for authorization."
  };
}
