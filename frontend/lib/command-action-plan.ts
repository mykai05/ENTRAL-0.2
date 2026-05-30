import { classifyCommandIntent, type CommandIntent } from "./command-intent";

export type CommandActionKind =
  | "approve_authorization"
  | "cancel_authorization"
  | "fallback"
  | "open_businesses"
  | "open_help"
  | "open_mobile_guide"
  | "open_reports"
  | "open_tasks"
  | "open_tutorial"
  | "open_voice_settings"
  | "return_to_entral"
  | "show_active"
  | "show_alerts"
  | "show_hierarchy"
  | "show_marshals";

export type CommandActionPlan = {
  intent: CommandIntent;
  kind: CommandActionKind;
  normalized: string;
};

function isTaskCenterCommand(normalized: string) {
  return /\b(show|open|view|list|display)\s+(my\s+|all\s+)?(tasks|work|active work)\b/i.test(normalized)
    || /\btask center\b/i.test(normalized);
}

function isReportCenterCommand(normalized: string) {
  return /\b(show|open|view|list|display|read)\s+(my\s+|all\s+|recent\s+)?reports\b/i.test(normalized)
    || /\breport center\b/i.test(normalized);
}

function isBusinessListCommand(normalized: string) {
  return /\b(show|open|view|list|display)\s+(my\s+|all\s+)?(businesses|business generals|clients|stores|brands)\b/i.test(normalized);
}

export function planCommandAction(message: string): CommandActionPlan {
  const intent = classifyCommandIntent(message);
  const normalized = intent.normalized;

  if (intent.kind === "authorization_approval") {
    return { intent, kind: "approve_authorization", normalized };
  }

  if (intent.kind === "authorization_cancel") {
    return { intent, kind: "cancel_authorization", normalized };
  }

  if (intent.kind === "help_request") {
    return { intent, kind: "open_help", normalized };
  }

  if (/\breturn to entral\b|\bcentral command overview\b|\bemperor overview\b|\bshow entral\b/i.test(normalized)) {
    return { intent, kind: "return_to_entral", normalized };
  }

  if (/\b(chain of command|display hierarchy|show hierarchy|open hierarchy|full picture)\b/i.test(normalized)) {
    return { intent, kind: "show_hierarchy", normalized };
  }

  if (/\b(show failing|show failed|alerts|what is wrong|needs attention)\b/i.test(normalized)) {
    return { intent, kind: "show_alerts", normalized };
  }

  if (/\b(show marshals|all marshals|open marshals|marshal layer)\b/i.test(normalized)) {
    return { intent, kind: "show_marshals", normalized };
  }

  if (/\b(show active|active soldiers|active commanders|active marshals|active generals|running nodes|working nodes)\b/i.test(normalized)) {
    return { intent, kind: "show_active", normalized };
  }

  if (isTaskCenterCommand(normalized)) {
    return { intent, kind: "open_tasks", normalized };
  }

  if (isReportCenterCommand(normalized)) {
    return { intent, kind: "open_reports", normalized };
  }

  if (isBusinessListCommand(normalized)) {
    return { intent, kind: "open_businesses", normalized };
  }

  if (intent.kind === "tutorial_request") {
    if (/\bmobile guide\b/i.test(normalized)) {
      return { intent, kind: "open_mobile_guide", normalized };
    }

    if (/\bvoice guide\b/i.test(normalized)) {
      return { intent, kind: "open_voice_settings", normalized };
    }

    return { intent, kind: "open_tutorial", normalized };
  }

  if (intent.kind === "voice_request") {
    return { intent, kind: "open_voice_settings", normalized };
  }

  return { intent, kind: "fallback", normalized };
}
