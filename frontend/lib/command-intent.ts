import { type NodeType } from "./command-os";

export type CommandIntentKind =
  | "authorization_approval"
  | "authorization_cancel"
  | "business_creation_request"
  | "command_request"
  | "conversation"
  | "entity_creation_request"
  | "entity_deletion_request"
  | "entity_update_request"
  | "help_request"
  | "navigation_request"
  | "report_request"
  | "task_request"
  | "template_request"
  | "tutorial_request"
  | "unknown"
  | "voice_request";

export type CommandIntent = {
  confidence: "high" | "medium" | "low";
  entityType?: Exclude<NodeType, "emperor">;
  kind: CommandIntentKind;
  normalized: string;
  requiresAuthorization: boolean;
};

const entityTypeMatchers: Array<[Exclude<NodeType, "emperor">, RegExp]> = [
  ["marshal", /\bmarshal\b/i],
  ["general", /\bgeneral\b/i],
  ["commander", /\bcommander\b/i],
  ["soldier", /\bsoldier\b/i]
];

function cleanCommand(value: string) {
  return value
    .trim()
    .replace(/^(entral|marshal|general|commander)[,\s:;-]+/i, "")
    .trim()
    .toLowerCase();
}

function entityTypeFromText(value: string) {
  const matches = entityTypeMatchers
    .map(([type]) => ({ index: value.search(new RegExp(`\\b${type}\\b`, "i")), type }))
    .filter((match) => match.index >= 0)
    .sort((first, second) => first.index - second.index);

  return matches[0]?.type;
}

function isGraphControlCommand(value: string) {
  return /\b(settings|controls|panel|sidebar|focus mode|clean room|graph|rings?|trails?|tails?|speed|gravity|glow|particle size|export|governance|automation|agent)\b/i.test(value);
}

export function explicitHierarchyCreateTypeFromText(message: string) {
  const normalized = cleanCommand(message);

  if (!/\b(create|add|new)\b/i.test(normalized)) return null;

  return entityTypeFromText(normalized) ?? null;
}

export function classifyCommandIntent(message: string): CommandIntent {
  const normalized = cleanCommand(message);

  if (!normalized) {
    return { confidence: "low", kind: "unknown", normalized, requiresAuthorization: false };
  }

  if (/^(approve|authorize|confirm|yes|proceed|execute)$/i.test(normalized)) {
    return { confidence: "high", kind: "authorization_approval", normalized, requiresAuthorization: false };
  }

  if (/^(cancel|deny|reject|stop)$/i.test(normalized)) {
    return { confidence: "high", kind: "authorization_cancel", normalized, requiresAuthorization: false };
  }

  if (
    normalized === "help"
    || normalized === "?"
    || normalized.includes("what can you do")
    || normalized.includes("show commands")
    || normalized.includes("show help")
    || normalized.includes("command help")
    || normalized.includes("how do i use")
    || normalized.includes("explain the chain of command")
  ) {
    return { confidence: "high", kind: "help_request", normalized, requiresAuthorization: false };
  }

  if (/\b(report|briefing|status|readiness|what needs attention|what is wrong)\b/i.test(normalized)) {
    return { confidence: "high", kind: "report_request", normalized, requiresAuthorization: false };
  }

  if (/\b(start tutorial|replay tutorial|academy|onboarding|mobile guide|voice guide)\b/i.test(normalized)) {
    return { confidence: "high", kind: "tutorial_request", normalized, requiresAuthorization: false };
  }

  if (/\b(voice|microphone|speech|speak|talk)\b/i.test(normalized)) {
    return { confidence: "medium", kind: "voice_request", normalized, requiresAuthorization: false };
  }

  const hierarchyCreateType = explicitHierarchyCreateTypeFromText(message);

  if (hierarchyCreateType) {
    return {
      confidence: "high",
      entityType: hierarchyCreateType,
      kind: "entity_creation_request",
      normalized,
      requiresAuthorization: true
    };
  }

  if (/\b(workflow|launch sequence|launch plan)\b/i.test(normalized)) {
    return { confidence: "high", kind: "task_request", normalized, requiresAuthorization: true };
  }

  if (isGraphControlCommand(normalized)) {
    return { confidence: "medium", kind: "command_request", normalized, requiresAuthorization: false };
  }

  if (/\b(templates?|pod|merch|website agency|website operation|content agency|e-commerce|ecommerce|saas|local service|custom blank)\b/i.test(normalized)) {
    if (/\b(create|start|build|set up|setup|use|apply|want)\b/i.test(normalized)) {
      return { confidence: "high", kind: "business_creation_request", normalized, requiresAuthorization: true };
    }

    return { confidence: "medium", kind: "template_request", normalized, requiresAuthorization: false };
  }

  if (/\b(create|start|build|set up|setup)\b/i.test(normalized) && /\b(business|client|brand|store|project|operation)\b/i.test(normalized)) {
    return { confidence: "high", kind: "business_creation_request", normalized, requiresAuthorization: true };
  }

  if (/\b(delete|remove|archive)\b/i.test(normalized) && /\b(marshal|general|commander|soldier|entity|selected)\b/i.test(normalized)) {
    return {
      confidence: "high",
      entityType: entityTypeFromText(normalized),
      kind: "entity_deletion_request",
      normalized,
      requiresAuthorization: true
    };
  }

  if (/\b(move|reassign|redirect|rename|update|pause|resume|offline)\b/i.test(normalized)) {
    return {
      confidence: "medium",
      entityType: entityTypeFromText(normalized),
      kind: "entity_update_request",
      normalized,
      requiresAuthorization: /\b(move|reassign|redirect|rename|update)\b/i.test(normalized)
    };
  }

  if (/\b(task|assign|run|workflow|operation)\b/i.test(normalized)) {
    return { confidence: "medium", kind: "task_request", normalized, requiresAuthorization: /\bbulk|workflow|multiple|generate starter\b/i.test(normalized) };
  }

  if (/\b(open|show|return|zoom|focus|select|take me to|pull up|go to)\b/i.test(normalized)) {
    return { confidence: "medium", kind: "navigation_request", normalized, requiresAuthorization: false };
  }

  if (isGraphControlCommand(normalized)) {
    return { confidence: "medium", kind: "command_request", normalized, requiresAuthorization: false };
  }

  if (/[?.]$/.test(normalized) || /^(hi|hello|hey|thanks|thank you)\b/i.test(normalized)) {
    return { confidence: "medium", kind: "conversation", normalized, requiresAuthorization: false };
  }

  return { confidence: "low", kind: "unknown", normalized, requiresAuthorization: false };
}
