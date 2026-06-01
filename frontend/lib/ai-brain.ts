import { classifyCommandIntent } from "./command-intent";
import { defaultToolRegistry, requiredToolsForMessage, toolById, type ToolRiskLevel } from "./tool-registry";

export type AiRequestCategory =
  | "browser_web_request"
  | "business_setup"
  | "calendar_request"
  | "command"
  | "conversation"
  | "create_hierarchy"
  | "delete_archive_hierarchy"
  | "email_request"
  | "external_tool_request"
  | "file_document_request"
  | "help"
  | "merch_pod_workflow"
  | "modify_hierarchy"
  | "report_request"
  | "research_request"
  | "task_creation"
  | "task_update"
  | "unknown_needs_clarification"
  | "website_workflow";

export type AiConfidence = "high" | "medium" | "low";
export type AuthorizationRequirement = "not_required" | "recommended" | "required";
export type ExecutionMode = "manual" | "assisted" | "semi_automated" | "autonomous";

export type AiRequestClassification = {
  authorizationRequirement: AuthorizationRequirement;
  confidence: AiConfidence;
  detectedIntent: AiRequestCategory;
  originalMessage: string;
  requiredEntities: string[];
  requiredTools: string[];
  riskLevel: ToolRiskLevel;
  suggestedAction: string;
  timestamp: string;
};

export type AiActionPlanStep = {
  id: string;
  label: string;
  requiresApproval: boolean;
  status: "blocked" | "planned" | "ready";
};

export type AiActionPlan = {
  authorizationRequired: boolean;
  createdAt: string;
  entitiesAffected: string[];
  expectedOutput: string;
  intent: AiRequestCategory;
  planId: string;
  riskLevel: ToolRiskLevel;
  steps: AiActionPlanStep[];
  summary: string;
  toolsRequired: string[];
  userRequest: string;
};

export type AiAuditEntry = {
  actionPlanId: string;
  authorizationStatus: "approved" | "blocked" | "canceled" | "not_required" | "pending";
  entitiesChanged: string[];
  errors?: string[];
  executionResult: string;
  id: string;
  intent: AiRequestCategory;
  modelName?: string;
  planSummary: string;
  providerName?: string;
  timestamp: string;
  toolsUsed: string[];
  userRequest: string;
};

function normalizedMessage(message: string) {
  return message.trim().toLowerCase();
}

function stableId(prefix: string, value: string, timestamp: string) {
  let hash = 0;
  const source = `${value}:${timestamp}`;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return `${prefix}_${hash.toString(16)}`;
}

function strongestRisk(toolIds: string[]): ToolRiskLevel {
  const weight: Record<ToolRiskLevel, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4
  };

  return toolIds
    .map((toolId) => toolById(toolId, defaultToolRegistry)?.riskLevel ?? "Low")
    .sort((first, second) => weight[second] - weight[first])[0] ?? "Low";
}

function isDevelopmentWriteAction(message: string) {
  const normalized = normalizedMessage(message);

  return (
    /\b(push|commit|merge|delete|rollback|redeploy)\b/.test(normalized) &&
    /\b(github|repo|repository|branch|pull request|pr|vercel|deploy|deployment)\b/.test(normalized)
  ) || /\b(trigger|start|run)\s+(a\s+)?deployment\b/.test(normalized) ||
    /\b(modify|change|edit)\s+(vercel\s+)?(settings|environment variables|env vars)\b/.test(normalized);
}

function authorizationFor(category: AiRequestCategory, toolIds: string[], riskLevel: ToolRiskLevel): AuthorizationRequirement {
  if (riskLevel === "High" || riskLevel === "Critical") return "required";

  if (
    category === "business_setup" ||
    category === "create_hierarchy" ||
    category === "delete_archive_hierarchy" ||
    category === "external_tool_request" ||
    category === "merch_pod_workflow" ||
    category === "modify_hierarchy" ||
    category === "task_creation" ||
    category === "website_workflow"
  ) {
    return "required";
  }

  if (toolIds.length > 0 || category === "research_request" || category === "browser_web_request") {
    return "recommended";
  }

  return "not_required";
}

function categoryFromMessage(message: string): AiRequestCategory {
  const normalized = normalizedMessage(message);
  const commandIntent = classifyCommandIntent(message);

  if (!normalized) return "unknown_needs_clarification";
  if (commandIntent.kind === "help_request" || /\b(help|what can you do|show commands)\b/.test(normalized)) return "help";
  if (commandIntent.kind === "report_request" || /\b(report|briefing|status|readiness)\b/.test(normalized)) return "report_request";
  if (/\b(merch|pod|printify|printful|etsy|shopify|product batch|approval queue|listing|store launch)\b/.test(normalized)) return "merch_pod_workflow";
  if (/\b(email|gmail|outlook|send mail|client message)\b/.test(normalized)) return "email_request";
  if (/\b(calendar|meeting|schedule)\b/.test(normalized)) return "calendar_request";
  if (/\b(browser|scrape|web|google maps|search the web|go to)\b/.test(normalized)) return "browser_web_request";
  if (/\b(research|competitor|market|find businesses|google)\b/.test(normalized)) return "research_request";
  if (/\b(file|document|pdf|drive|upload|export)\b/.test(normalized)) return "file_document_request";
  if (/\b(connect|integration|tool|api|external|github|vercel|codex|stripe|paypal|social|post)\b/.test(normalized)) return "external_tool_request";
  if (commandIntent.kind === "entity_creation_request") return "create_hierarchy";
  if (commandIntent.kind === "entity_deletion_request") return "delete_archive_hierarchy";
  if (commandIntent.kind === "entity_update_request") return "modify_hierarchy";
  if (commandIntent.kind === "task_request" && /\b(update|complete|mark|change)\b/.test(normalized)) return "task_update";
  if (commandIntent.kind === "task_request" || /\b(assign task|create task|new task|operation)\b/.test(normalized)) return "task_creation";
  if (/\b(business|client|brand|store|project)\b/.test(normalized) && /\b(create|start|build|setup|set up)\b/.test(normalized)) return "business_setup";
  if (/\b(website|landing page|deploy|domain|hostinger)\b/.test(normalized)) return "website_workflow";
  if (commandIntent.kind === "command_request" || commandIntent.kind === "navigation_request" || commandIntent.kind === "tutorial_request" || commandIntent.kind === "voice_request") return "command";
  if (commandIntent.kind === "conversation") return "conversation";

  return commandIntent.kind === "unknown" ? "unknown_needs_clarification" : "command";
}

function requiredEntitiesFor(category: AiRequestCategory, message: string) {
  const normalized = normalizedMessage(message);
  const entities = new Set<string>();

  if (/\bmarshal\b/.test(normalized) || category === "business_setup" || category === "merch_pod_workflow") entities.add("Marshal");
  if (/\bgeneral\b|\bbusiness\b|\bclient\b|\bbrand\b|\bstore\b/.test(normalized) || category === "business_setup") entities.add("General");
  if (/\bcommander\b|\bdepartment\b|\blisting\b|\bdesign\b|\bcompliance\b|\bmarketing\b/.test(normalized) || category === "merch_pod_workflow") entities.add("Commander");
  if (/\bsoldier\b|\bexecute\b|\bexecution\b/.test(normalized) || category === "task_creation") entities.add("Soldier");
  if (/\btask\b|\boperation\b|\bworkflow\b/.test(normalized) || category === "task_creation" || category === "task_update") entities.add("Task");

  return Array.from(entities);
}

function suggestedActionFor(category: AiRequestCategory) {
  const suggestions: Record<AiRequestCategory, string> = {
    browser_web_request: "Prepare a governed web/browser plan and use mock mode unless an approved browser tool is connected.",
    business_setup: "Prepare a business structure plan under a selected Marshal and request authorization.",
    calendar_request: "Prepare a calendar action draft and request authorization before creating any external event.",
    command: "Route to the Command OS local handler.",
    conversation: "Respond using ENTRAL command persona.",
    create_hierarchy: "Prepare hierarchy creation and request authorization before mutating Command OS state.",
    delete_archive_hierarchy: "Block direct deletion and require archive/delete authorization with impact review.",
    email_request: "Draft the email only. Require authorization before any external send.",
    external_tool_request: "Select relevant Tool Registry entries and use mock mode unless connected and authorized.",
    file_document_request: "Prepare a document/file plan and require approval before writing or exporting records.",
    help: "Open command guidance and explain available safe operations.",
    merch_pod_workflow: "Prepare Merch/POD workflow steps, compliance gates, and approval checkpoints.",
    modify_hierarchy: "Prepare reassignment/update plan and request authorization for state changes.",
    report_request: "Generate a Situation, Analysis, Recommendation, Next Actions report.",
    research_request: "Prepare a research plan with source boundaries and mock execution unless search is connected.",
    task_creation: "Prepare task delegation through ENTRAL -> Marshal -> General -> Commander -> Soldier.",
    task_update: "Prepare task status update and verify target ownership.",
    unknown_needs_clarification: "Ask for the missing operational detail before execution.",
    website_workflow: "Prepare website workflow draft and require approval before publishing or deployment."
  };

  return suggestions[category];
}

export function classifyAiRequest(message: string, timestamp = new Date().toISOString()): AiRequestClassification {
  const detectedIntent = categoryFromMessage(message);
  const requiredTools = requiredToolsForMessage(message);
  const riskLevel = isDevelopmentWriteAction(message) ? "High" : strongestRisk(requiredTools);
  const authorizationRequirement = authorizationFor(detectedIntent, requiredTools, riskLevel);
  const commandIntent = classifyCommandIntent(message);
  const confidence: AiConfidence = detectedIntent === "unknown_needs_clarification" ? "low" : commandIntent.confidence;

  return {
    authorizationRequirement,
    confidence,
    detectedIntent,
    originalMessage: message,
    requiredEntities: requiredEntitiesFor(detectedIntent, message),
    requiredTools,
    riskLevel,
    suggestedAction: suggestedActionFor(detectedIntent),
    timestamp
  };
}

function planStepsFor(classification: AiRequestClassification): AiActionPlanStep[] {
  const base: AiActionPlanStep[] = [
    { id: "classify", label: `Classify request as ${classification.detectedIntent.replaceAll("_", " ")}.`, requiresApproval: false, status: "ready" },
    { id: "map-context", label: "Map relevant command hierarchy entities and tool requirements.", requiresApproval: false, status: "planned" }
  ];

  if (classification.requiredTools.length > 0) {
    base.push({
      id: "tool-check",
      label: `Check Tool Registry status for ${classification.requiredTools.join(", ")}.`,
      requiresApproval: false,
      status: "planned"
    });
  }

  if (classification.authorizationRequirement === "required") {
    base.push({
      id: "authorization",
      label: "Request explicit authorization before execution.",
      requiresApproval: true,
      status: "blocked"
    });
  }

  base.push({
    id: "report",
    label: "Return command report with result, limitations, and next actions.",
    requiresApproval: false,
    status: "planned"
  });

  return base;
}

export function createAiActionPlan(message: string, timestamp = new Date().toISOString()): AiActionPlan {
  const classification = classifyAiRequest(message, timestamp);
  const authorizationRequired = classification.authorizationRequirement === "required";

  return {
    authorizationRequired,
    createdAt: timestamp,
    entitiesAffected: classification.requiredEntities,
    expectedOutput: authorizationRequired
      ? "Authorization card followed by approved internal execution or mock tool result."
      : "Command response or local UI action.",
    intent: classification.detectedIntent,
    planId: stableId("plan", message, timestamp),
    riskLevel: classification.riskLevel,
    steps: planStepsFor(classification),
    summary: classification.suggestedAction,
    toolsRequired: classification.requiredTools,
    userRequest: message
  };
}

export function createAiAuditEntry(input: {
  authorizationStatus?: AiAuditEntry["authorizationStatus"];
  entitiesChanged?: string[];
  errors?: string[];
  executionResult?: string;
  modelName?: string;
  plan: AiActionPlan;
  providerName?: string;
  timestamp?: string;
  toolsUsed?: string[];
}): AiAuditEntry {
  const timestamp = input.timestamp ?? new Date().toISOString();

  return {
    actionPlanId: input.plan.planId,
    authorizationStatus: input.authorizationStatus ?? (input.plan.authorizationRequired ? "pending" : "not_required"),
    entitiesChanged: input.entitiesChanged ?? [],
    errors: input.errors,
    executionResult: input.executionResult ?? "Planned. No external action executed.",
    id: stableId("audit", input.plan.planId, timestamp),
    intent: input.plan.intent,
    modelName: input.modelName,
    planSummary: input.plan.summary,
    providerName: input.providerName,
    timestamp,
    toolsUsed: input.toolsUsed ?? input.plan.toolsRequired,
    userRequest: input.plan.userRequest
  };
}

export function formatActionPlanSummary(plan: AiActionPlan) {
  return [
    "Objective interpreted: AI Brain action plan prepared.",
    `Intent: ${plan.intent.replaceAll("_", " ")}`,
    `Risk: ${plan.riskLevel}`,
    `Tools: ${plan.toolsRequired.length ? plan.toolsRequired.join(", ") : "None"}`,
    `Entities: ${plan.entitiesAffected.length ? plan.entitiesAffected.join(", ") : "None identified"}`,
    `Authorization: ${plan.authorizationRequired ? "Required" : "Not required"}`,
    `Expected output: ${plan.expectedOutput}`,
    "Approve plan?"
  ].join("\n");
}
