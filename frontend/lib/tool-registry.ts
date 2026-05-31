export type ToolCategory =
  | "AI"
  | "Analytics"
  | "Browser"
  | "Calendar"
  | "Design"
  | "Development"
  | "E-commerce"
  | "Email"
  | "File Storage"
  | "Payments"
  | "POD"
  | "Research"
  | "Social Media"
  | "Website";

export type ToolConnectionStatus = "Connected" | "Coming Soon" | "Disabled" | "Error" | "Mock Mode" | "Needs Credentials" | "Not Connected";
export type ToolRiskLevel = "Low" | "Medium" | "High" | "Critical";

export type ToolRegistryEntry = {
  availableActions: string[];
  category: ToolCategory;
  connectionStatus: ToolConnectionStatus;
  description: string;
  id: string;
  lastUsedAt?: string | null;
  name: string;
  requiredCredentials: string[];
  requiresAuthorization: boolean;
  riskLevel: ToolRiskLevel;
  status: ToolConnectionStatus;
};

export type ToolTestResult = {
  error?: string;
  message: string;
  nextSteps: string[];
  status: ToolConnectionStatus;
  success: boolean;
  timestamp: string;
  toolId: string;
  toolName: string;
};

export type MockToolExecutionResult = {
  fieldsRequired: string[];
  message: string;
  nextSteps: string[];
  simulatedResult: string;
  timestamp: string;
  toolId: string;
  toolName: string;
};

function entry(input: Omit<ToolRegistryEntry, "connectionStatus" | "status"> & { status?: ToolConnectionStatus }): ToolRegistryEntry {
  const status = input.status ?? "Not Connected";

  return {
    ...input,
    connectionStatus: status,
    status
  };
}

export const defaultToolRegistry: ToolRegistryEntry[] = [
  entry({
    availableActions: ["chat.completions", "vision.analysis", "intent.support"],
    category: "AI",
    description: "Primary AI provider for ENTRAL command reasoning and vision analysis.",
    id: "openai",
    name: "OpenAI",
    requiredCredentials: ["OPENAI_API_KEY", "OPENAI_MODEL"],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["model.placeholder"],
    category: "AI",
    description: "Future alternate AI provider abstraction.",
    id: "anthropic",
    name: "Anthropic",
    requiredCredentials: ["ANTHROPIC_API_KEY"],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["local.reasoning.placeholder"],
    category: "AI",
    description: "Local model placeholder for future offline reasoning.",
    id: "local-llm",
    name: "Local LLM placeholder",
    requiredCredentials: [],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["code.review", "patch.plan", "implementation.mock"],
    category: "Development",
    description: "Development operator connection for future controlled code work.",
    id: "codex",
    name: "Codex",
    requiredCredentials: [],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["repo.read", "issue.create.mock", "pull_request.mock"],
    category: "Development",
    description: "Repository connection for future source control operations.",
    id: "github",
    name: "GitHub",
    requiredCredentials: ["GITHUB_TOKEN"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["deployment.status.mock", "deployment.trigger.mock"],
    category: "Development",
    description: "Deployment platform connection for future release operations.",
    id: "vercel",
    name: "Vercel",
    requiredCredentials: ["VERCEL_TOKEN", "VERCEL_PROJECT_ID"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["draft.email.mock", "send.email.future"],
    category: "Email",
    description: "Gmail connection for future outbound communication after approval.",
    id: "gmail",
    name: "Gmail",
    requiredCredentials: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Not Connected"
  }),
  entry({
    availableActions: ["draft.email.mock"],
    category: "Email",
    description: "Outlook mail placeholder for future Microsoft email support.",
    id: "outlook-mail",
    name: "Outlook placeholder",
    requiredCredentials: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["calendar.event.mock"],
    category: "Calendar",
    description: "Google Calendar connection for future scheduling actions.",
    id: "google-calendar",
    name: "Google Calendar",
    requiredCredentials: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Not Connected"
  }),
  entry({
    availableActions: ["calendar.event.mock"],
    category: "Calendar",
    description: "Outlook Calendar placeholder for future scheduling support.",
    id: "outlook-calendar",
    name: "Outlook Calendar placeholder",
    requiredCredentials: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["product.draft.mock", "catalog.sync.future"],
    category: "POD",
    description: "Printify POD production connection for future product drafting and publishing.",
    id: "printify",
    name: "Printify",
    requiredCredentials: ["PRINTIFY_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["product.draft.mock"],
    category: "POD",
    description: "Printful POD production connection placeholder.",
    id: "printful",
    name: "Printful",
    requiredCredentials: ["PRINTFUL_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Not Connected"
  }),
  entry({
    availableActions: ["listing.draft.mock", "listing.publish.future"],
    category: "E-commerce",
    description: "Etsy marketplace connection for future listing operations.",
    id: "etsy",
    name: "Etsy",
    requiredCredentials: ["ETSY_CLIENT_ID", "ETSY_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["store.setup.mock", "product.publish.future"],
    category: "E-commerce",
    description: "Shopify store connection for future storefront operations.",
    id: "shopify",
    name: "Shopify",
    requiredCredentials: ["SHOPIFY_ADMIN_TOKEN", "SHOPIFY_SHOP_DOMAIN"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["design.brief.mock"],
    category: "Design",
    description: "Canva placeholder for future design draft handoff.",
    id: "canva",
    name: "Canva placeholder",
    requiredCredentials: ["CANVA_CLIENT_ID"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["design.brief.mock"],
    category: "Design",
    description: "Kittl placeholder for future merch design operations.",
    id: "kittl",
    name: "Kittl placeholder",
    requiredCredentials: ["KITTL_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["website.plan.mock", "website.publish.future"],
    category: "Website",
    description: "Hostinger placeholder for future website operations.",
    id: "hostinger",
    name: "Hostinger placeholder",
    requiredCredentials: ["HOSTINGER_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["domain.lookup.mock"],
    category: "Website",
    description: "Domain provider placeholder for future DNS and domain operations.",
    id: "domain-provider",
    name: "Domain provider placeholder",
    requiredCredentials: ["DOMAIN_PROVIDER_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["search.mock", "result.summary.mock"],
    category: "Research",
    description: "Web search connection for future governed research.",
    id: "web-search",
    name: "Web Search",
    requiredCredentials: ["SEARCH_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["competitor.scan.mock"],
    category: "Research",
    description: "Competitor research placeholder.",
    id: "competitor-research",
    name: "Competitor Research placeholder",
    requiredCredentials: ["SEARCH_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["file.read.mock", "file.write.future"],
    category: "File Storage",
    description: "Google Drive connection for future document storage.",
    id: "google-drive",
    name: "Google Drive",
    requiredCredentials: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Not Connected"
  }),
  entry({
    availableActions: ["local.upload.mock"],
    category: "File Storage",
    description: "Local upload handling for user-provided files.",
    id: "local-uploads",
    name: "Local Uploads",
    requiredCredentials: [],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["payment.intent.future"],
    category: "Payments",
    description: "Stripe placeholder. Money-moving actions remain disabled.",
    id: "stripe",
    name: "Stripe placeholder",
    requiredCredentials: ["STRIPE_SECRET_KEY"],
    requiresAuthorization: true,
    riskLevel: "Critical",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["payment.intent.future"],
    category: "Payments",
    description: "PayPal placeholder. Money-moving actions remain disabled.",
    id: "paypal",
    name: "PayPal placeholder",
    requiredCredentials: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "Critical",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["post.draft.mock"],
    category: "Social Media",
    description: "Social media publishing placeholder. Posting requires explicit approval.",
    id: "social-publisher",
    name: "Social Media Publisher placeholder",
    requiredCredentials: ["SOCIAL_PLATFORM_TOKEN"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  }),
  entry({
    availableActions: ["browser.plan.mock", "browser.action.future"],
    category: "Browser",
    description: "Browser automation connection for future governed web actions.",
    id: "browser-automation",
    name: "Browser Automation",
    requiredCredentials: [],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  }),
  entry({
    availableActions: ["metrics.read.mock"],
    category: "Analytics",
    description: "Analytics placeholder for future performance reporting.",
    id: "analytics",
    name: "Analytics placeholder",
    requiredCredentials: ["ANALYTICS_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Coming Soon"
  })
];

export function toolById(toolId: string, registry = defaultToolRegistry) {
  return registry.find((tool) => tool.id === toolId);
}

export function toolsByCategory(registry = defaultToolRegistry) {
  return registry.reduce<Record<string, ToolRegistryEntry[]>>((groups, tool) => {
    groups[tool.category] ??= [];
    groups[tool.category].push(tool);
    return groups;
  }, {});
}

export function requiredToolsForMessage(message: string) {
  const normalized = message.toLowerCase();
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

export function buildToolTestResult(tool: ToolRegistryEntry): ToolTestResult {
  const success = tool.status === "Connected" || tool.status === "Mock Mode";
  const missingCredentials = tool.requiredCredentials.length ? tool.requiredCredentials.join(", ") : "No credentials required";

  return {
    error: success ? undefined : `${tool.name} is ${tool.status}.`,
    message: success
      ? `${tool.name} is available in ${tool.status}. No external action was executed.`
      : `${tool.name} is not connected. Required credentials: ${missingCredentials}.`,
    nextSteps: success
      ? ["Use mock execution for planning.", "Request explicit approval before any external action."]
      : ["Add backend-controlled credentials.", "Configure required scopes.", "Run test connection again."],
    status: tool.status,
    success,
    timestamp: new Date().toISOString(),
    toolId: tool.id,
    toolName: tool.name
  };
}

export function buildMockToolExecution(tool: ToolRegistryEntry, request: string): MockToolExecutionResult {
  return {
    fieldsRequired: tool.requiredCredentials.length ? tool.requiredCredentials : ["No credentials required for mock mode"],
    message: `${tool.name} mock execution prepared. No external system was contacted.`,
    nextSteps: [
      "Review the simulated result.",
      "Connect credentials only when ready.",
      "Require approval before any real external action."
    ],
    simulatedResult: `Mock result for request: ${request.slice(0, 220) || "No directive supplied."}`,
    timestamp: new Date().toISOString(),
    toolId: tool.id,
    toolName: tool.name
  };
}
