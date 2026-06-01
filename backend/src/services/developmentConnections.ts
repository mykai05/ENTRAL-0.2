import { env } from "../env.js";
import type { AuditEntry } from "./audit.js";

export type DevelopmentToolId = "github" | "vercel";
export type DevelopmentHealthStatus = "Green" | "Yellow" | "Red" | "Gray";
export type DevelopmentConnectionStatus = "Connected" | "Disabled" | "Error" | "Missing Credentials" | "Mock Mode" | "Not Connected";

export type SafeMetadataValue = string | number | boolean | null;

export type ReadOnlyConnectionState = {
  lastCheckedAt: string;
  message: string;
  missingEnvVars: string[];
  nextSteps: string[];
  readOnly: true;
  requiredEnvVars: string[];
  status: DevelopmentConnectionStatus;
  toolId: DevelopmentToolId;
  toolName: string;
  writeActionsEnabled: false;
};

export type GitHubCommitSummary = {
  author: string | null;
  date: string | null;
  message: string;
  sha: string;
  url: string | null;
};

export type GitHubPullRequestSummary = {
  number: number;
  title: string;
  url: string | null;
};

export type GitHubReadOnlyStatus = ReadOnlyConnectionState & {
  currentBranch: string | null;
  defaultBranch: string | null;
  latestCommit: GitHubCommitSummary | null;
  lastPushAt: string | null;
  openPullRequests: GitHubPullRequestSummary[];
  owner: string | null;
  recentCommits: GitHubCommitSummary[];
  repository: string | null;
  repositoryUrl: string | null;
  toolId: "github";
  workflowStatus: string | null;
};

export type VercelDeploymentSummary = {
  createdAt: string | null;
  errorSummary: string | null;
  id: string;
  status: string;
  target: string | null;
  url: string | null;
};

export type VercelReadOnlyStatus = ReadOnlyConnectionState & {
  latestDeployment: VercelDeploymentSummary | null;
  productionDeployment: VercelDeploymentSummary | null;
  productionUrl: string | null;
  projectId: string | null;
  projectName: string | null;
  recentDeployments: VercelDeploymentSummary[];
  toolId: "vercel";
};

export type DevelopmentStatusSnapshot = {
  github: GitHubReadOnlyStatus;
  health: {
    message: string;
    status: DevelopmentHealthStatus;
    updatedAt: string;
  };
  vercel: VercelReadOnlyStatus;
};

type GithubRepoResponse = {
  default_branch?: string;
  full_name?: string;
  html_url?: string;
  name?: string;
  owner?: { login?: string };
  pushed_at?: string;
};

type GithubCommitResponse = {
  author?: { login?: string };
  commit?: {
    author?: {
      date?: string;
      name?: string;
    };
    message?: string;
  };
  html_url?: string;
  sha?: string;
};

type GithubPullResponse = {
  html_url?: string;
  number?: number;
  title?: string;
};

type GithubWorkflowRunsResponse = {
  workflow_runs?: Array<{
    conclusion?: string | null;
    status?: string | null;
  }>;
};

type VercelProjectResponse = {
  id?: string;
  name?: string;
  targets?: {
    production?: {
      alias?: string[];
      url?: string;
    };
  };
};

type VercelDeploymentsResponse = {
  deployments?: Array<{
    created?: number;
    errorCode?: string | null;
    errorMessage?: string | null;
    id?: string;
    state?: string;
    target?: string | null;
    url?: string;
  }>;
};

class ReadOnlyConnectionError extends Error {
  constructor(message: string, readonly statusCode?: number) {
    super(message);
    this.name = "ReadOnlyConnectionError";
  }
}

function hasValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function missingEnv(required: string[]) {
  return required.filter((name) => !hasValue(process.env[name]));
}

function now() {
  return new Date().toISOString();
}

function safeUrl(hostOrUrl?: string | null) {
  if (!hostOrUrl) {
    return null;
  }

  return hostOrUrl.startsWith("http") ? hostOrUrl : `https://${hostOrUrl}`;
}

async function requestJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, {
    headers,
    method: "GET"
  });

  if (!response.ok) {
    let message = `Read-only request failed with HTTP ${response.status}.`;

    try {
      const body = await response.json() as { message?: string; error?: { message?: string } };
      message = body.message ?? body.error?.message ?? message;
    } catch {
      // Keep the generic message when the upstream body is not JSON.
    }

    throw new ReadOnlyConnectionError(message, response.status);
  }

  return await response.json() as T;
}

async function requestOptionalJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    return await requestJson<T>(url, headers);
  } catch {
    return null;
  }
}

function missingGitHubStatus(timestamp = now()): GitHubReadOnlyStatus {
  const requiredEnvVars = ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"];
  const missingEnvVars = missingEnv(requiredEnvVars);

  return {
    currentBranch: null,
    defaultBranch: null,
    lastCheckedAt: timestamp,
    latestCommit: null,
    lastPushAt: null,
    message: "GitHub read-only connection is in Mock Mode because credentials are missing.",
    missingEnvVars,
    nextSteps: [
      "Add GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO to the backend environment.",
      "Use a token with read-only repository metadata permissions.",
      "Run the GitHub test connection again."
    ],
    openPullRequests: [],
    owner: env.GITHUB_OWNER ?? null,
    readOnly: true,
    recentCommits: [],
    repository: env.GITHUB_REPO ?? null,
    repositoryUrl: null,
    requiredEnvVars,
    status: "Missing Credentials",
    toolId: "github",
    toolName: "GitHub",
    workflowStatus: null,
    writeActionsEnabled: false
  };
}

function missingVercelStatus(timestamp = now()): VercelReadOnlyStatus {
  const requiredEnvVars = ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"];
  const missingEnvVars = missingEnv(requiredEnvVars);

  return {
    lastCheckedAt: timestamp,
    latestDeployment: null,
    message: "Vercel read-only connection is in Mock Mode because credentials are missing.",
    missingEnvVars,
    nextSteps: [
      "Add VERCEL_TOKEN, VERCEL_ORG_ID, and VERCEL_PROJECT_ID to the backend environment.",
      "Use read-only project/deployment access.",
      "Run the Vercel test connection again."
    ],
    productionDeployment: null,
    productionUrl: null,
    projectId: env.VERCEL_PROJECT_ID ?? null,
    projectName: null,
    readOnly: true,
    recentDeployments: [],
    requiredEnvVars,
    status: "Missing Credentials",
    toolId: "vercel",
    toolName: "Vercel",
    writeActionsEnabled: false
  };
}

function summarizeCommit(commit: GithubCommitResponse): GitHubCommitSummary {
  return {
    author: commit.author?.login ?? commit.commit?.author?.name ?? null,
    date: commit.commit?.author?.date ?? null,
    message: commit.commit?.message?.split("\n")[0] ?? "Commit message unavailable",
    sha: commit.sha?.slice(0, 12) ?? "unknown",
    url: commit.html_url ?? null
  };
}

function summarizeDeployment(deployment: NonNullable<VercelDeploymentsResponse["deployments"]>[number]): VercelDeploymentSummary {
  const errorSummary = deployment.errorMessage ?? deployment.errorCode ?? null;

  return {
    createdAt: typeof deployment.created === "number" ? new Date(deployment.created).toISOString() : null,
    errorSummary,
    id: deployment.id ?? "unknown",
    status: deployment.state ?? "UNKNOWN",
    target: deployment.target ?? null,
    url: safeUrl(deployment.url)
  };
}

export function getGitHubConnectionState(): ReadOnlyConnectionState {
  const status = missingGitHubStatus();

  if (status.missingEnvVars.length > 0) {
    return status;
  }

  return {
    ...status,
    message: "GitHub read-only credentials are configured. Run a test to verify access.",
    missingEnvVars: [],
    status: "Not Connected"
  };
}

export function getVercelConnectionState(): ReadOnlyConnectionState {
  const status = missingVercelStatus();

  if (status.missingEnvVars.length > 0) {
    return status;
  }

  return {
    ...status,
    message: "Vercel read-only credentials are configured. Run a test to verify access.",
    missingEnvVars: [],
    status: "Not Connected"
  };
}

export async function getGitHubReadOnlyStatus(): Promise<GitHubReadOnlyStatus> {
  const timestamp = now();
  const missing = missingGitHubStatus(timestamp);

  if (missing.missingEnvVars.length > 0) {
    return missing;
  }

  const owner = env.GITHUB_OWNER!;
  const repo = env.GITHUB_REPO!;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    "User-Agent": "ENTRAL-Command-OS",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  try {
    const baseUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    const repository = await requestJson<GithubRepoResponse>(baseUrl, headers);
    const commits = await requestJson<GithubCommitResponse[]>(`${baseUrl}/commits?per_page=5`, headers);
    const pulls = await requestOptionalJson<GithubPullResponse[]>(`${baseUrl}/pulls?state=open&per_page=5`, headers);
    const workflows = await requestOptionalJson<GithubWorkflowRunsResponse>(`${baseUrl}/actions/runs?per_page=5`, headers);
    const workflowRun = workflows?.workflow_runs?.[0];

    return {
      currentBranch: repository.default_branch ?? null,
      defaultBranch: repository.default_branch ?? null,
      lastCheckedAt: timestamp,
      latestCommit: commits[0] ? summarizeCommit(commits[0]) : null,
      lastPushAt: repository.pushed_at ?? null,
      message: "GitHub read-only repository status retrieved successfully.",
      missingEnvVars: [],
      nextSteps: ["Review repository health.", "Keep write actions disabled until a future approved phase."],
      openPullRequests: (pulls ?? []).map((pull) => ({
        number: pull.number ?? 0,
        title: pull.title ?? "Untitled pull request",
        url: pull.html_url ?? null
      })),
      owner: repository.owner?.login ?? owner,
      readOnly: true,
      recentCommits: commits.map(summarizeCommit),
      repository: repository.full_name ?? `${owner}/${repo}`,
      repositoryUrl: repository.html_url ?? null,
      requiredEnvVars: ["GITHUB_TOKEN", "GITHUB_OWNER", "GITHUB_REPO"],
      status: "Connected",
      toolId: "github",
      toolName: "GitHub",
      workflowStatus: workflowRun ? workflowRun.conclusion ?? workflowRun.status ?? "unknown" : null,
      writeActionsEnabled: false
    };
  } catch (error) {
    return {
      ...missing,
      message: error instanceof Error ? error.message : "GitHub read-only status check failed.",
      missingEnvVars: [],
      status: "Error"
    };
  }
}

export async function getVercelReadOnlyStatus(): Promise<VercelReadOnlyStatus> {
  const timestamp = now();
  const missing = missingVercelStatus(timestamp);

  if (missing.missingEnvVars.length > 0) {
    return missing;
  }

  const projectId = env.VERCEL_PROJECT_ID!;
  const teamQuery = env.VERCEL_ORG_ID ? `?teamId=${encodeURIComponent(env.VERCEL_ORG_ID)}` : "";
  const deploymentsParams = new URLSearchParams({
    limit: "5",
    projectId
  });

  if (env.VERCEL_ORG_ID) {
    deploymentsParams.set("teamId", env.VERCEL_ORG_ID);
  }

  const headers = {
    Authorization: `Bearer ${env.VERCEL_TOKEN}`
  };

  try {
    const project = await requestJson<VercelProjectResponse>(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectId)}${teamQuery}`, headers);
    const deploymentsResponse = await requestJson<VercelDeploymentsResponse>(`https://api.vercel.com/v6/deployments?${deploymentsParams.toString()}`, headers);
    const deployments = (deploymentsResponse.deployments ?? []).map(summarizeDeployment);
    const productionDeployment = deployments.find((deployment) => deployment.target === "production") ?? null;
    const productionUrl = safeUrl(project.targets?.production?.alias?.[0] ?? project.targets?.production?.url ?? productionDeployment?.url ?? null);

    return {
      lastCheckedAt: timestamp,
      latestDeployment: deployments[0] ?? null,
      message: "Vercel read-only deployment status retrieved successfully.",
      missingEnvVars: [],
      nextSteps: ["Review deployment health.", "Keep deployment triggers disabled until a future approved phase."],
      productionDeployment,
      productionUrl,
      projectId: project.id ?? projectId,
      projectName: project.name ?? null,
      readOnly: true,
      recentDeployments: deployments,
      requiredEnvVars: ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"],
      status: "Connected",
      toolId: "vercel",
      toolName: "Vercel",
      writeActionsEnabled: false
    };
  } catch (error) {
    return {
      ...missing,
      message: error instanceof Error ? error.message : "Vercel read-only status check failed.",
      missingEnvVars: [],
      status: "Error"
    };
  }
}

function developmentHealth(github: GitHubReadOnlyStatus, vercel: VercelReadOnlyStatus): DevelopmentStatusSnapshot["health"] {
  const updatedAt = now();

  if (github.status === "Error" || vercel.status === "Error" || vercel.latestDeployment?.status === "ERROR") {
    return {
      message: "Deployment pipeline needs attention.",
      status: "Red",
      updatedAt
    };
  }

  if (github.status === "Connected" && vercel.status === "Connected" && vercel.productionDeployment?.status === "READY") {
    return {
      message: "GitHub and Vercel are connected. Production deployment is healthy.",
      status: "Green",
      updatedAt
    };
  }

  if (github.status === "Connected" || vercel.status === "Connected") {
    return {
      message: "Development pipeline is partially connected or deployment status is unclear.",
      status: "Yellow",
      updatedAt
    };
  }

  return {
    message: "Development pipeline is in Mock Mode or not configured.",
    status: "Gray",
    updatedAt
  };
}

export async function getDevelopmentStatusSnapshot(): Promise<DevelopmentStatusSnapshot> {
  const [github, vercel] = await Promise.all([
    getGitHubReadOnlyStatus(),
    getVercelReadOnlyStatus()
  ]);

  return {
    github,
    health: developmentHealth(github, vercel),
    vercel
  };
}

export function isDevelopmentWriteActionRequest(message: string) {
  const normalized = message.toLowerCase();

  return (
    /\b(push|commit|merge|delete|rollback|redeploy)\b/.test(normalized) &&
    /\b(github|repo|repository|branch|pull request|pr|vercel|deploy|deployment)\b/.test(normalized)
  ) || /\b(trigger|start|run)\s+(a\s+)?deployment\b/.test(normalized) ||
    /\b(modify|change|edit)\s+(vercel\s+)?(settings|environment variables|env vars)\b/.test(normalized);
}

export function isDevelopmentStatusRequest(message: string) {
  const normalized = message.toLowerCase();

  return /\b(deployment status|check deployment|build status|vercel status|github status|repo status|repository status|latest commit|last commit|is entral live|development health|pipeline status|what'?s wrong with deployment)\b/.test(normalized);
}

export function requestedDevelopmentTools(message: string): DevelopmentToolId[] {
  const normalized = message.toLowerCase();
  const wantsGitHub = /\b(github|repo|repository|commit|pull request|pr|branch)\b/.test(normalized);
  const wantsVercel = /\b(vercel|deploy|deployment|build|live|production)\b/.test(normalized);

  if (wantsGitHub && !wantsVercel) return ["github"];
  if (wantsVercel && !wantsGitHub) return ["vercel"];
  return ["github", "vercel"];
}

export function createReadOnlyWriteRefusal() {
  return [
    "[ENTRAL]",
    "Situation:\nThat action is not enabled. Current GitHub and Vercel connections are read-only.",
    "Analysis:\nENTRAL may inspect repository and deployment status, but it cannot push code, create commits, merge pull requests, trigger deployments, roll back Vercel, delete branches, or modify project settings in this phase.",
    "Recommendation:\nKeep write actions manual until a future approved phase adds explicit authorization, scoped credentials, and rollback controls.",
    "Next Actions:\n- Request a read-only status report if pipeline visibility is needed.\n- Perform write/deployment actions manually outside ENTRAL for now."
  ].join("\n\n");
}

export async function createDevelopmentStatusReport(message: string) {
  const tools = requestedDevelopmentTools(message);
  const checks = await Promise.all(tools.map((toolId) => toolId === "github" ? getGitHubReadOnlyStatus() : getVercelReadOnlyStatus()));
  const github = checks.find((check): check is GitHubReadOnlyStatus => check.toolId === "github");
  const vercel = checks.find((check): check is VercelReadOnlyStatus => check.toolId === "vercel");
  const situation = vercel && !github
    ? `Vercel status: ${vercel.status}. ${vercel.latestDeployment ? `Latest deployment is ${vercel.latestDeployment.status}.` : vercel.message}`
    : github && !vercel
      ? `GitHub status: ${github.status}. ${github.latestCommit ? `Latest commit ${github.latestCommit.sha}: ${github.latestCommit.message}.` : github.message}`
      : `GitHub status: ${github?.status ?? "Not checked"}. Vercel status: ${vercel?.status ?? "Not checked"}.`;
  const analysis = [
    github ? `Repository: ${github.repository ?? "not configured"}. Branch: ${github.defaultBranch ?? "unknown"}. Latest commit: ${github.latestCommit ? `${github.latestCommit.sha} - ${github.latestCommit.message}` : "unavailable"}. Workflow/check: ${github.workflowStatus ?? "unavailable"}.` : null,
    vercel ? `Project: ${vercel.projectName ?? vercel.projectId ?? "not configured"}. Production URL: ${vercel.productionUrl ?? "unavailable"}. Latest deployment: ${vercel.latestDeployment ? `${vercel.latestDeployment.status}${vercel.latestDeployment.url ? ` at ${vercel.latestDeployment.url}` : ""}` : "unavailable"}.` : null
  ].filter(Boolean).join("\n");
  const hasError = checks.some((check) => check.status === "Error");
  const hasMissing = checks.some((check) => check.status === "Missing Credentials");
  const recommendation = hasError
    ? "Investigate the failed read-only connection and verify tokens/scopes."
    : hasMissing
      ? "Configure backend-only credentials to enable live repository/deployment visibility."
      : "Pipeline visibility is available in read-only mode. No write access is enabled.";

  return {
    checks,
    content: [
      "[ENTRAL]",
      `Situation:\n${situation}`,
      `Analysis:\n${analysis || "No live development data is available yet."}`,
      `Recommendation:\n${recommendation}`,
      "Next Actions:\n- Use Connection Center to test GitHub and Vercel independently.\n- Keep push, deploy, rollback, merge, and settings changes manual until a future write-enabled phase."
    ].join("\n\n")
  };
}

export function buildDevelopmentStatusAuditEntry(input: {
  actorRole?: string;
  actorUserId?: string | null;
  requestId?: string;
  result: GitHubReadOnlyStatus | VercelReadOnlyStatus;
  userRequest?: string;
}): AuditEntry {
  const { result } = input;
  return {
    action: result.toolId === "github" ? "github.status.read" : "vercel.status.read",
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    metadata: {
      readOnly: result.readOnly,
      requestedBy: input.userRequest ?? null,
      resultStatus: result.status,
      tool: result.toolName,
      writeActionsEnabled: result.writeActionsEnabled
    },
    outcome: result.status === "Connected" ? "success" : result.status === "Error" ? "failure" : "blocked",
    requestId: input.requestId,
    severity: result.status === "Error" ? "medium" : "low",
    targetId: result.toolId,
    targetType: "external_tool"
  };
}
