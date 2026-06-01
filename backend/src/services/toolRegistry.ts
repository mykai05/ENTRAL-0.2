import { getPrimaryAiProviderState, testPrimaryAiProvider, type AiProviderTestResult } from "./aiProvider.js";
import {
  getGitHubConnectionState,
  getGitHubReadOnlyStatus,
  getVercelConnectionState,
  getVercelReadOnlyStatus,
  type GitHubReadOnlyStatus,
  type VercelReadOnlyStatus
} from "./developmentConnections.js";

export type ToolCategory =
  | "AI"
  | "Analytics"
  | "Browser"
  | "Calendar"
  | "Design"
  | "Deployment"
  | "Development"
  | "E-commerce"
  | "Email"
  | "File Storage"
  | "Payments"
  | "POD"
  | "Research"
  | "Social Media"
  | "Website";

export type ToolConnectionStatus = "Connected" | "Coming Soon" | "Disabled" | "Error" | "Missing API Key" | "Missing Credentials" | "Mock Mode" | "Needs Credentials" | "Not Connected";
export type ToolRiskLevel = "Low" | "Medium" | "High" | "Critical";

export type ToolRegistryEntry = {
  availableActions: string[];
  category: ToolCategory;
  connectionStatus: ToolConnectionStatus;
  description: string;
  id: string;
  lastUsedAt?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  missingEnvVars?: string[];
  modelName?: string;
  name: string;
  providerName?: string;
  requiredCredentials: string[];
  readOnly?: boolean;
  requiresAuthorization: boolean;
  riskLevel: ToolRiskLevel;
  status: ToolConnectionStatus;
  writeActionsEnabled?: boolean;
};

export type ToolTestResult = {
  error?: string;
  message: string;
  metadata?: Record<string, string | number | boolean | null>;
  nextSteps: string[];
  providerName?: string;
  missingEnvVars?: string[];
  modelName?: string;
  readOnly?: boolean;
  status: ToolConnectionStatus;
  success: boolean;
  timestamp: string;
  toolId: string;
  toolName: string;
  writeActionsEnabled?: boolean;
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

type ToolBlueprint = Omit<ToolRegistryEntry, "connectionStatus" | "status"> & {
  status?: ToolConnectionStatus;
};

function entry(input: ToolBlueprint): ToolRegistryEntry {
  const status = input.status ?? "Not Connected";

  return {
    ...input,
    connectionStatus: status,
    status
  };
}

const toolBlueprints: ToolBlueprint[] = [
  {
    availableActions: ["chat.completions", "vision.analysis", "intent.support"],
    category: "AI",
    description: "Primary AI provider for ENTRAL command reasoning and vision analysis.",
    id: "openai",
    name: "OpenAI",
    requiredCredentials: ["OPENAI_API_KEY", "OPENAI_MODEL"],
    requiresAuthorization: false,
    riskLevel: "Low"
  },
  {
    availableActions: ["model.placeholder"],
    category: "AI",
    description: "Future alternate AI provider abstraction.",
    id: "anthropic",
    name: "Anthropic",
    requiredCredentials: ["ANTHROPIC_API_KEY"],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Coming Soon"
  },
  {
    availableActions: ["local.reasoning.placeholder"],
    category: "AI",
    description: "Local model placeholder for future offline reasoning.",
    id: "local-llm",
    name: "Local LLM placeholder",
    requiredCredentials: [],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Coming Soon"
  },
  {
    availableActions: ["code.review", "patch.plan", "implementation.mock"],
    category: "Development",
    description: "Development operator connection for future controlled code work.",
    id: "codex",
    name: "Codex",
    requiredCredentials: [],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  },
  {
    availableActions: ["repo.metadata.read", "repo.commits.read", "repo.pull_requests.read", "repo.checks.read"],
    category: "Development",
    description: "Read-only repository status for ENTRAL development visibility.",
    id: "github",
    name: "GitHub",
    readOnly: true,
    requiredCredentials: ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Mock Mode"
  },
  {
    availableActions: ["deployment.status.read", "deployment.metadata.read"],
    category: "Deployment",
    description: "Read-only Vercel deployment status for ENTRAL release visibility.",
    id: "vercel",
    name: "Vercel",
    readOnly: true,
    requiredCredentials: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Mock Mode"
  },
  {
    availableActions: ["draft.email.mock", "send.email.future"],
    category: "Email",
    description: "Gmail connection for future outbound communication after approval.",
    id: "gmail",
    name: "Gmail",
    requiredCredentials: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High"
  },
  {
    availableActions: ["draft.email.mock"],
    category: "Email",
    description: "Outlook mail placeholder for future email support.",
    id: "outlook-mail",
    name: "Outlook placeholder",
    requiredCredentials: ["MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  },
  {
    availableActions: ["calendar.event.mock"],
    category: "Calendar",
    description: "Google Calendar connection for future scheduling actions.",
    id: "google-calendar",
    name: "Google Calendar",
    requiredCredentials: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High"
  },
  {
    availableActions: ["product.draft.mock", "catalog.sync.future"],
    category: "POD",
    description: "Printify POD production connection for future product drafting and publishing.",
    id: "printify",
    name: "Printify",
    requiredCredentials: ["PRINTIFY_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  },
  {
    availableActions: ["product.draft.mock"],
    category: "POD",
    description: "Printful POD production connection placeholder.",
    id: "printful",
    name: "Printful",
    requiredCredentials: ["PRINTFUL_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High"
  },
  {
    availableActions: ["listing.draft.mock", "listing.publish.future"],
    category: "E-commerce",
    description: "Etsy marketplace connection for future listing operations.",
    id: "etsy",
    name: "Etsy",
    requiredCredentials: ["ETSY_CLIENT_ID", "ETSY_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  },
  {
    availableActions: ["store.setup.mock", "product.publish.future"],
    category: "E-commerce",
    description: "Shopify store connection for future storefront operations.",
    id: "shopify",
    name: "Shopify",
    requiredCredentials: ["SHOPIFY_ADMIN_TOKEN", "SHOPIFY_SHOP_DOMAIN"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  },
  {
    availableActions: ["design.brief.mock"],
    category: "Design",
    description: "Canva placeholder for future design draft handoff.",
    id: "canva",
    name: "Canva placeholder",
    requiredCredentials: ["CANVA_CLIENT_ID"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Coming Soon"
  },
  {
    availableActions: ["design.brief.mock"],
    category: "Design",
    description: "Kittl placeholder for future merch design operations.",
    id: "kittl",
    name: "Kittl placeholder",
    requiredCredentials: ["KITTL_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Coming Soon"
  },
  {
    availableActions: ["website.plan.mock", "website.publish.future"],
    category: "Website",
    description: "Hostinger placeholder for future website operations.",
    id: "hostinger",
    name: "Hostinger placeholder",
    requiredCredentials: ["HOSTINGER_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  },
  {
    availableActions: ["domain.lookup.mock"],
    category: "Website",
    description: "Domain provider placeholder for future DNS and domain operations.",
    id: "domain-provider",
    name: "Domain provider placeholder",
    requiredCredentials: ["DOMAIN_PROVIDER_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  },
  {
    availableActions: ["search.mock", "result.summary.mock"],
    category: "Research",
    description: "Web search connection for future governed research.",
    id: "web-search",
    name: "Web Search",
    requiredCredentials: ["SEARCH_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Mock Mode"
  },
  {
    availableActions: ["competitor.scan.mock"],
    category: "Research",
    description: "Competitor research placeholder.",
    id: "competitor-research",
    name: "Competitor Research placeholder",
    requiredCredentials: ["SEARCH_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Coming Soon"
  },
  {
    availableActions: ["file.read.mock", "file.write.future"],
    category: "File Storage",
    description: "Google Drive connection for future document storage.",
    id: "google-drive",
    name: "Google Drive",
    requiredCredentials: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "Medium"
  },
  {
    availableActions: ["local.upload.mock"],
    category: "File Storage",
    description: "Local upload handling for user-provided files.",
    id: "local-uploads",
    name: "Local Uploads",
    requiredCredentials: [],
    requiresAuthorization: false,
    riskLevel: "Low",
    status: "Mock Mode"
  },
  {
    availableActions: ["payment.intent.future"],
    category: "Payments",
    description: "Stripe placeholder. Money-moving actions remain disabled.",
    id: "stripe",
    name: "Stripe placeholder",
    requiredCredentials: ["STRIPE_SECRET_KEY"],
    requiresAuthorization: true,
    riskLevel: "Critical",
    status: "Coming Soon"
  },
  {
    availableActions: ["payment.intent.future"],
    category: "Payments",
    description: "PayPal placeholder. Money-moving actions remain disabled.",
    id: "paypal",
    name: "PayPal placeholder",
    requiredCredentials: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
    requiresAuthorization: true,
    riskLevel: "Critical",
    status: "Coming Soon"
  },
  {
    availableActions: ["post.draft.mock"],
    category: "Social Media",
    description: "Social media publishing placeholder. Posting requires explicit approval.",
    id: "social-publisher",
    name: "Social Media Publisher placeholder",
    requiredCredentials: ["SOCIAL_PLATFORM_TOKEN"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Coming Soon"
  },
  {
    availableActions: ["browser.plan.mock", "browser.action.future"],
    category: "Browser",
    description: "Browser automation connection for future governed web actions.",
    id: "browser-automation",
    name: "Browser Automation",
    requiredCredentials: [],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Mock Mode"
  },
  {
    availableActions: ["metrics.read.mock"],
    category: "Analytics",
    description: "Analytics placeholder for future performance reporting.",
    id: "analytics",
    name: "Analytics placeholder",
    requiredCredentials: ["ANALYTICS_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "Medium",
    status: "Coming Soon"
  }
];

function statusForTool(tool: ToolBlueprint): ToolConnectionStatus {
  if (tool.id === "openai") {
    return getPrimaryAiProviderState().connectionStatus;
  }

  if (tool.id === "github") {
    return getGitHubConnectionState().status;
  }

  if (tool.id === "vercel") {
    return getVercelConnectionState().status;
  }

  return tool.status ?? "Not Connected";
}

export function getToolRegistry() {
  return toolBlueprints.map((tool) => {
    if (tool.id === "openai") {
      const provider = getPrimaryAiProviderState();
      return entry({
        ...tool,
        missingEnvVars: provider.missingEnvVars,
        modelName: provider.modelName,
        providerName: provider.providerName,
        status: statusForTool(tool)
      });
    }

    if (tool.id === "github") {
      const state = getGitHubConnectionState();
      return entry({
        ...tool,
        metadata: {
          mode: state.missingEnvVars.length ? "Mock Mode" : "Read-only pending test",
          readOnly: state.readOnly,
          writeActionsEnabled: state.writeActionsEnabled
        },
        missingEnvVars: state.missingEnvVars,
        readOnly: state.readOnly,
        status: state.status,
        writeActionsEnabled: state.writeActionsEnabled
      });
    }

    if (tool.id === "vercel") {
      const state = getVercelConnectionState();
      return entry({
        ...tool,
        metadata: {
          mode: state.missingEnvVars.length ? "Mock Mode" : "Read-only pending test",
          readOnly: state.readOnly,
          writeActionsEnabled: state.writeActionsEnabled
        },
        missingEnvVars: state.missingEnvVars,
        readOnly: state.readOnly,
        status: state.status,
        writeActionsEnabled: state.writeActionsEnabled
      });
    }

    return entry({ ...tool, status: statusForTool(tool) });
  });
}

export function getToolById(toolId: string) {
  return getToolRegistry().find((tool) => tool.id === toolId);
}

export function buildToolTestResult(tool: ToolRegistryEntry): ToolTestResult {
  const success = tool.status === "Connected" || tool.status === "Mock Mode";
  const missingCredentials = tool.requiredCredentials.length ? tool.requiredCredentials.join(", ") : "No credentials required";

  return {
    error: success ? undefined : `${tool.name} is ${tool.status}.`,
    message: success
      ? `${tool.name} is available in ${tool.status}. No external action was executed.`
      : `${tool.name} is not connected. Required credentials: ${missingCredentials}.`,
    metadata: tool.metadata,
    missingEnvVars: tool.missingEnvVars,
    modelName: tool.modelName,
    nextSteps: success
      ? ["Use mock execution for planning.", "Request explicit approval before any external action."]
      : ["Add backend-controlled credentials.", "Configure required scopes.", "Run test connection again."],
    providerName: tool.providerName,
    readOnly: tool.readOnly,
    status: tool.status,
    success,
    timestamp: new Date().toISOString(),
    toolId: tool.id,
    toolName: tool.name,
    writeActionsEnabled: tool.writeActionsEnabled
  };
}

function developmentToolResult(tool: ToolRegistryEntry, result: GitHubReadOnlyStatus | VercelReadOnlyStatus): ToolTestResult {
  let metadata: Record<string, string | number | boolean | null>;

  if (result.toolId === "github") {
    metadata = {
      currentBranch: result.currentBranch,
      defaultBranch: result.defaultBranch,
      latestCommit: result.latestCommit ? `${result.latestCommit.sha} ${result.latestCommit.message}` : null,
      owner: result.owner,
      repository: result.repository,
      repositoryUrl: result.repositoryUrl,
      workflowStatus: result.workflowStatus
    };
  } else {
    metadata = {
      latestDeploymentStatus: result.latestDeployment?.status ?? null,
      latestDeploymentUrl: result.latestDeployment?.url ?? null,
      productionDeploymentStatus: result.productionDeployment?.status ?? null,
      productionUrl: result.productionUrl,
      projectId: result.projectId,
      projectName: result.projectName
    };
  }

  return {
    error: result.status === "Error" ? result.message : undefined,
    message: result.message,
    metadata,
    missingEnvVars: result.missingEnvVars,
    nextSteps: result.nextSteps,
    readOnly: result.readOnly,
    status: result.status,
    success: result.status === "Connected",
    timestamp: result.lastCheckedAt,
    toolId: tool.id,
    toolName: tool.name,
    writeActionsEnabled: result.writeActionsEnabled
  };
}

export async function buildToolTestResultWithProvider(tool: ToolRegistryEntry): Promise<ToolTestResult> {
  if (tool.id === "openai") {
    const result: AiProviderTestResult = await testPrimaryAiProvider();
    return {
      error: result.error,
      message: result.message,
      missingEnvVars: result.missingEnvVars,
      modelName: result.modelName,
      nextSteps: result.nextSteps,
      providerName: result.providerName,
      status: result.status,
      success: result.success,
      timestamp: result.timestamp,
      toolId: tool.id,
      toolName: tool.name
    };
  }

  if (tool.id === "github") {
    return developmentToolResult(tool, await getGitHubReadOnlyStatus());
  }

  if (tool.id === "vercel") {
    return developmentToolResult(tool, await getVercelReadOnlyStatus());
  }

  return buildToolTestResult(tool);
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
