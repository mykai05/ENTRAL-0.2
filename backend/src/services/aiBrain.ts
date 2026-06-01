import { createHash } from "node:crypto";
import { getToolById, type ToolRiskLevel } from "./toolRegistry.js";

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

export const aiRequestCategories = [
  "browser_web_request",
  "business_setup",
  "calendar_request",
  "command",
  "conversation",
  "create_hierarchy",
  "delete_archive_hierarchy",
  "email_request",
  "external_tool_request",
  "file_document_request",
  "help",
  "merch_pod_workflow",
  "modify_hierarchy",
  "report_request",
  "research_request",
  "task_creation",
  "task_update",
  "unknown_needs_clarification",
  "website_workflow"
] as const satisfies readonly AiRequestCategory[];

const aiConfidenceLevels = ["high", "medium", "low"] as const satisfies readonly AiConfidence[];
const authorizationRequirements = ["not_required", "recommended", "required"] as const satisfies readonly AuthorizationRequirement[];
const riskLevels = ["Low", "Medium", "High", "Critical"] as const satisfies readonly ToolRiskLevel[];

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

export type AiActionPlan = {
  authorizationRequired: boolean;
  createdAt: string;
  entitiesAffected: string[];
  expectedOutput: string;
  intent: AiRequestCategory;
  planId: string;
  riskLevel: ToolRiskLevel;
  steps: Array<{
    id: string;
    label: string;
    requiresApproval: boolean;
    status: "blocked" | "planned" | "ready";
  }>;
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

function normalize(message: string) {
  return message.trim().toLowerCase();
}

function idFor(prefix: string, value: string, timestamp: string) {
  return `${prefix}_${createHash("sha256").update(`${value}:${timestamp}`).digest("hex").slice(0, 12)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function stringArrayValue(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, 20);

  return items.length ? Array.from(new Set(items)) : fallback;
}

function enumValue<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return typeof value === "string" && options.includes(value as T) ? value as T : fallback;
}

function riskWeight(risk: ToolRiskLevel) {
  const weight: Record<ToolRiskLevel, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4
  };

  return weight[risk];
}

function strongestRiskFromValues(values: ToolRiskLevel[]) {
  return values.sort((first, second) => riskWeight(second) - riskWeight(first))[0] ?? "Low";
}

export function requiredToolsForAiMessage(message: string) {
  const normalized = normalize(message);
  const ids = new Set<string>();

  if (/\b(openai|gpt|ai|brain|llm|vision)\b/.test(normalized)) ids.add("openai");
  if (/\b(github|repo|pull request|commit|push)\b/.test(normalized)) ids.add("github");
  if (/\b(vercel|deploy|deployment)\b/.test(normalized)) ids.add("vercel");
  if (/\b(email|gmail|mail|client message)\b/.test(normalized)) ids.add("gmail");
  if (/\b(calendar|schedule|meeting)\b/.test(normalized)) ids.add("google-calendar");
  if (/\b(printify)\b/.test(normalized)) ids.add("printify");
  if (/\b(printful)\b/.test(normalized)) ids.add("printful");
  if (/\b(etsy)\b/.test(normalized)) ids.add("etsy");
  if (/\b(shopify)\b/.test(normalized)) ids.add("shopify");
  if (/\b(canva)\b/.test(normalized)) ids.add("canva");
  if (/\b(kittl)\b/.test(normalized)) ids.add("kittl");
  if (/\b(hostinger|website|domain)\b/.test(normalized)) ids.add(normalized.includes("domain") ? "domain-provider" : "hostinger");
  if (/\b(search|research|google|competitor|scrape|browser|web)\b/.test(normalized)) ids.add(normalized.includes("browser") || normalized.includes("scrape") ? "browser-automation" : "web-search");
  if (/\b(drive|file|document|upload)\b/.test(normalized)) ids.add(normalized.includes("drive") ? "google-drive" : "local-uploads");
  if (/\b(stripe|payment|charge|invoice)\b/.test(normalized)) ids.add("stripe");
  if (/\b(paypal)\b/.test(normalized)) ids.add("paypal");
  if (/\b(post|social|instagram|tiktok|facebook|linkedin)\b/.test(normalized)) ids.add("social-publisher");

  return Array.from(ids);
}

function categoryFromMessage(message: string): AiRequestCategory {
  const normalized = normalize(message);

  if (!normalized) return "unknown_needs_clarification";
  if (/\b(help|what can you do|show commands|how do i use)\b/.test(normalized)) return "help";
  if (/\b(report|briefing|status|readiness|what needs attention)\b/.test(normalized)) return "report_request";
  if (/\b(delete|remove|archive)\b/.test(normalized) && /\b(marshal|general|commander|soldier|entity)\b/.test(normalized)) return "delete_archive_hierarchy";
  if (/\b(move|reassign|redirect|rename|update)\b/.test(normalized) && /\b(marshal|general|commander|soldier|entity)\b/.test(normalized)) return "modify_hierarchy";
  if (/\b(create|add|new)\b/.test(normalized) && /\b(marshal|general|commander|soldier)\b/.test(normalized)) return "create_hierarchy";
  if (/\b(task|assign|operation)\b/.test(normalized) && /\b(update|complete|mark|change)\b/.test(normalized)) return "task_update";
  if (/\b(create task|assign task|new task|workflow|operation)\b/.test(normalized)) return "task_creation";
  if (/\b(merch|pod|printify|printful|etsy|shopify|product batch|approval queue|listing|store launch)\b/.test(normalized)) return "merch_pod_workflow";
  if (/\b(business|client|brand|store|project)\b/.test(normalized) && /\b(create|start|build|setup|set up)\b/.test(normalized)) return "business_setup";
  if (/\b(website|landing page|deploy|domain|hostinger)\b/.test(normalized)) return "website_workflow";
  if (/\b(email|gmail|outlook|send mail|client message)\b/.test(normalized)) return "email_request";
  if (/\b(calendar|meeting|schedule)\b/.test(normalized)) return "calendar_request";
  if (/\b(browser|scrape|web|google maps|search the web|go to)\b/.test(normalized)) return "browser_web_request";
  if (/\b(research|competitor|market|find businesses|google)\b/.test(normalized)) return "research_request";
  if (/\b(file|document|pdf|drive|upload|export)\b/.test(normalized)) return "file_document_request";
  if (/\b(connect|integration|tool|api|external|github|vercel|codex|stripe|paypal|social|post)\b/.test(normalized)) return "external_tool_request";
  if (/\b(open|show|return|zoom|focus|settings|controls|panel|tutorial|voice|graph|gravity|rings?|trails?)\b/.test(normalized)) return "command";
  if (/[?.]$/.test(normalized) || /^(hi|hello|hey|thanks|thank you)\b/.test(normalized)) return "conversation";

  return "unknown_needs_clarification";
}

function requiredEntitiesFor(category: AiRequestCategory, message: string) {
  const normalized = normalize(message);
  const entities = new Set<string>();

  if (/\bmarshal\b/.test(normalized) || category === "business_setup" || category === "merch_pod_workflow") entities.add("Marshal");
  if (/\bgeneral\b|\bbusiness\b|\bclient\b|\bbrand\b|\bstore\b/.test(normalized) || category === "business_setup") entities.add("General");
  if (/\bcommander\b|\bdepartment\b|\blisting\b|\bdesign\b|\bcompliance\b|\bmarketing\b/.test(normalized) || category === "merch_pod_workflow") entities.add("Commander");
  if (/\bsoldier\b|\bexecute\b|\bexecution\b/.test(normalized) || category === "task_creation") entities.add("Soldier");
  if (/\btask\b|\boperation\b|\bworkflow\b/.test(normalized) || category === "task_creation" || category === "task_update") entities.add("Task");

  return Array.from(entities);
}

function strongestRisk(toolIds: string[]): ToolRiskLevel {
  const weight: Record<ToolRiskLevel, number> = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4
  };

  return toolIds
    .map((toolId) => getToolById(toolId)?.riskLevel ?? "Low")
    .sort((first, second) => weight[second] - weight[first])[0] ?? "Low";
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

function authorizationFor(category: AiRequestCategory, toolIds: string[], riskLevel: ToolRiskLevel): AuthorizationRequirement {
  if (riskLevel === "High" || riskLevel === "Critical") return "required";
  if (["business_setup", "create_hierarchy", "delete_archive_hierarchy", "external_tool_request", "merch_pod_workflow", "modify_hierarchy", "task_creation", "website_workflow"].includes(category)) return "required";
  if (toolIds.length > 0 || category === "research_request" || category === "browser_web_request") return "recommended";
  return "not_required";
}

export function classifyAiRequest(message: string, timestamp = new Date().toISOString()): AiRequestClassification {
  const detectedIntent = categoryFromMessage(message);
  const requiredTools = requiredToolsForAiMessage(message);
  const riskLevel = strongestRisk(requiredTools);

  return {
    authorizationRequirement: authorizationFor(detectedIntent, requiredTools, riskLevel),
    confidence: detectedIntent === "unknown_needs_clarification" ? "low" : "medium",
    detectedIntent,
    originalMessage: message,
    requiredEntities: requiredEntitiesFor(detectedIntent, message),
    requiredTools,
    riskLevel,
    suggestedAction: suggestedActionFor(detectedIntent),
    timestamp
  };
}

function planStepsFor(classification: AiRequestClassification) {
  return [
    { id: "classify", label: `Classify request as ${classification.detectedIntent.replaceAll("_", " ")}.`, requiresApproval: false, status: "ready" as const },
    { id: "map-context", label: "Map relevant hierarchy entities and tool requirements.", requiresApproval: false, status: "planned" as const },
    ...(classification.requiredTools.length ? [{ id: "tool-check", label: `Check Tool Registry status for ${classification.requiredTools.join(", ")}.`, requiresApproval: false, status: "planned" as const }] : []),
    ...(classification.authorizationRequirement === "required" ? [{ id: "authorization", label: "Request explicit authorization before execution.", requiresApproval: true, status: "blocked" as const }] : []),
    { id: "report", label: "Return command report with result, limitations, and next actions.", requiresApproval: false, status: "planned" as const }
  ];
}

export function createAiActionPlanFromClassification(classification: AiRequestClassification, timestamp = classification.timestamp): AiActionPlan {
  const authorizationRequired = classification.authorizationRequirement === "required";

  return {
    authorizationRequired,
    createdAt: timestamp,
    entitiesAffected: classification.requiredEntities,
    expectedOutput: authorizationRequired ? "Authorization card followed by approved internal execution or mock tool result." : "Command response or local UI action.",
    intent: classification.detectedIntent,
    planId: idFor("plan", classification.originalMessage, timestamp),
    riskLevel: classification.riskLevel,
    steps: planStepsFor(classification),
    summary: classification.suggestedAction,
    toolsRequired: classification.requiredTools,
    userRequest: classification.originalMessage
  };
}

export function createAiActionPlan(message: string, timestamp = new Date().toISOString()): AiActionPlan {
  return createAiActionPlanFromClassification(classifyAiRequest(message, timestamp), timestamp);
}

export function sanitizeProviderClassification(raw: unknown, fallback: AiRequestClassification): AiRequestClassification {
  if (!isRecord(raw)) {
    return fallback;
  }

  const detectedIntent = enumValue(raw.detectedIntent ?? raw.intent, aiRequestCategories, fallback.detectedIntent);
  const providerTools = stringArrayValue(raw.requiredTools ?? raw.toolsRequired, []);
  const requiredTools = Array.from(new Set([...fallback.requiredTools, ...providerTools]));
  const providerRisk = enumValue(raw.riskLevel, riskLevels, fallback.riskLevel);
  const riskLevel = strongestRiskFromValues([fallback.riskLevel, providerRisk, strongestRisk(requiredTools)]);
  const providerAuthorization = enumValue(raw.authorizationRequirement, authorizationRequirements, fallback.authorizationRequirement);
  const authorizationRequirement = authorizationFor(detectedIntent, requiredTools, riskLevel) === "required" || providerAuthorization === "required"
    ? "required"
    : providerAuthorization === "recommended" || fallback.authorizationRequirement === "recommended" ? "recommended" : "not_required";

  return {
    authorizationRequirement,
    confidence: enumValue(raw.confidence, aiConfidenceLevels, "high"),
    detectedIntent,
    originalMessage: fallback.originalMessage,
    requiredEntities: stringArrayValue(raw.requiredEntities ?? raw.entitiesAffected, fallback.requiredEntities),
    requiredTools,
    riskLevel,
    suggestedAction: stringValue(raw.suggestedAction ?? raw.summary, suggestedActionFor(detectedIntent)),
    timestamp: fallback.timestamp
  };
}

export function sanitizeProviderActionPlan(raw: unknown, fallback: AiActionPlan): AiActionPlan {
  if (!isRecord(raw)) {
    return fallback;
  }

  const intent = enumValue(raw.intent, aiRequestCategories, fallback.intent);
  const providerTools = stringArrayValue(raw.toolsRequired, []);
  const toolsRequired = Array.from(new Set([...fallback.toolsRequired, ...providerTools]));
  const providerRisk = enumValue(raw.riskLevel, riskLevels, fallback.riskLevel);
  const riskLevel = strongestRiskFromValues([fallback.riskLevel, providerRisk, strongestRisk(toolsRequired)]);
  const authorizationRequired = Boolean(raw.authorizationRequired) || fallback.authorizationRequired || authorizationFor(intent, toolsRequired, riskLevel) === "required";
  const steps = Array.isArray(raw.steps)
    ? raw.steps
      .filter(isRecord)
      .slice(0, 8)
      .map((step, index) => ({
        id: stringValue(step.id, `step-${index + 1}`),
        label: stringValue(step.label ?? step.description, fallback.steps[index]?.label ?? "Review command step."),
        requiresApproval: Boolean(step.requiresApproval),
        status: enumValue(step.status, ["blocked", "planned", "ready"] as const, "planned")
      }))
    : fallback.steps;
  const normalizedSteps = authorizationRequired && !steps.some((step) => step.id === "authorization")
    ? [
      ...steps,
      { id: "authorization", label: "Request explicit authorization before execution.", requiresApproval: true, status: "blocked" as const }
    ]
    : steps;

  return {
    authorizationRequired,
    createdAt: fallback.createdAt,
    entitiesAffected: Array.from(new Set([...fallback.entitiesAffected, ...stringArrayValue(raw.entitiesAffected, [])])),
    expectedOutput: stringValue(raw.expectedOutput, fallback.expectedOutput),
    intent,
    planId: fallback.planId,
    riskLevel,
    steps: normalizedSteps.map((step) => authorizationRequired && step.id === "authorization" ? { ...step, requiresApproval: true, status: "blocked" as const } : step),
    summary: stringValue(raw.summary, fallback.summary),
    toolsRequired,
    userRequest: fallback.userRequest
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
    id: idFor("audit", input.plan.planId, timestamp),
    intent: input.plan.intent,
    modelName: input.modelName,
    planSummary: input.plan.summary,
    providerName: input.providerName,
    timestamp,
    toolsUsed: input.toolsUsed ?? input.plan.toolsRequired,
    userRequest: input.plan.userRequest
  };
}

export function buildAiBrainContextPrompt(plan: AiActionPlan) {
  return [
    "AI Brain classification metadata:",
    `Intent: ${plan.intent}`,
    `Risk level: ${plan.riskLevel}`,
    `Authorization required: ${plan.authorizationRequired ? "yes" : "no"}`,
    `Entities affected: ${plan.entitiesAffected.length ? plan.entitiesAffected.join(", ") : "none identified"}`,
    `Tools required: ${plan.toolsRequired.length ? plan.toolsRequired.join(", ") : "none"}`,
    "If authorization is required, do not claim execution. Prepare the plan, state that authorization is required, and explain safe next actions."
  ].join("\n");
}
