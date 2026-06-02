"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FlaskConical, GitBranch, LockKeyhole, PlugZap, Rocket, ShieldAlert, Sparkles } from "lucide-react";
import { apiFetch, ApiError } from "../lib/api";
import {
  buildMockToolExecution,
  buildToolTestResult,
  defaultToolRegistry,
  toolsByCategory,
  type MockToolExecutionResult,
  type ToolRegistryEntry,
  type ToolTestResult
} from "../lib/tool-registry";
import { ModeStatusStrip } from "./ModeStatus";

type ToolsResponse = {
  items: ToolRegistryEntry[];
};

type ToolResultResponse<T> = {
  result: T;
};

type DevelopmentStatusResponse = {
  github: {
    defaultBranch: string | null;
    latestCommit: { message: string; sha: string; url: string | null } | null;
    missingEnvVars: string[];
    repository: string | null;
    status: ToolRegistryEntry["status"];
    workflowStatus: string | null;
  };
  health: {
    message: string;
    status: "Green" | "Yellow" | "Red" | "Gray";
    updatedAt: string;
  };
  vercel: {
    latestDeployment: { status: string; url: string | null; createdAt: string | null } | null;
    missingEnvVars: string[];
    productionDeployment: { status: string; url: string | null; createdAt: string | null } | null;
    productionUrl: string | null;
    projectName: string | null;
    status: ToolRegistryEntry["status"];
  };
};

type ConnectionCenterProps = {
  latestRequest?: string;
  onEvent?: (message: string) => void;
  onMockResult?: (result: MockToolExecutionResult) => void;
  onRegistryLoad?: (tools: ToolRegistryEntry[]) => void;
};

function statusClass(status: ToolRegistryEntry["status"]) {
  return status.toLowerCase().replaceAll(" ", "-");
}

function riskClass(risk: ToolRegistryEntry["riskLevel"]) {
  return risk.toLowerCase();
}

function approvalLabel(tool: ToolRegistryEntry) {
  if (tool.requiresAuthorization) return "Approval required";
  if (tool.readOnly || tool.writeActionsEnabled === false) return "Read-only scope";
  return "Standard approval policy";
}

export function ConnectionCenter({ latestRequest = "", onEvent, onMockResult, onRegistryLoad }: ConnectionCenterProps) {
  const [tools, setTools] = useState<ToolRegistryEntry[]>(defaultToolRegistry);
  const [isLoading, setIsLoading] = useState(false);
  const [activeResult, setActiveResult] = useState<ToolTestResult | MockToolExecutionResult | null>(null);
  const [busyToolId, setBusyToolId] = useState<string | null>(null);
  const [developmentStatus, setDevelopmentStatus] = useState<DevelopmentStatusResponse | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadTools() {
      setIsLoading(true);
      try {
        const response = await apiFetch<ToolsResponse>("/connections/tools", { timeoutMs: 8000 });
        const statusResponse = await apiFetch<DevelopmentStatusResponse>("/connections/development-status", { timeoutMs: 8000 }).catch(() => null);
        if (isCancelled) return;
        setTools(response.items);
        setDevelopmentStatus(statusResponse);
        onRegistryLoad?.(response.items);
      } catch (error) {
        if (isCancelled) return;
        setTools(defaultToolRegistry);
        onEvent?.(error instanceof ApiError ? "Connection Center using local registry fallback." : "Connection Center registry fallback active.");
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadTools();

    return () => {
      isCancelled = true;
    };
  }, [onEvent, onRegistryLoad]);

  const groupedTools = useMemo(() => toolsByCategory(tools), [tools]);
  const developmentHealthClass = developmentStatus?.health.status.toLowerCase() ?? "gray";

  async function testTool(tool: ToolRegistryEntry) {
    setBusyToolId(tool.id);
    try {
      const response = await apiFetch<ToolResultResponse<ToolTestResult>>(`/connections/tools/${tool.id}/test`, {
        method: "POST",
        timeoutMs: 8000
      });
      setActiveResult(response.result);
      onEvent?.(response.result.message);
    } catch {
      const fallback = buildToolTestResult(tool);
      setActiveResult(fallback);
      onEvent?.(fallback.message);
    } finally {
      setBusyToolId(null);
    }
  }

  async function mockExecute(tool: ToolRegistryEntry) {
    setBusyToolId(tool.id);
    try {
      const response = await apiFetch<ToolResultResponse<MockToolExecutionResult>>(`/connections/tools/${tool.id}/mock-execute`, {
        method: "POST",
        json: { request: latestRequest },
        timeoutMs: 8000
      });
      setActiveResult(response.result);
      onMockResult?.(response.result);
      onEvent?.(response.result.message);
    } catch {
      const fallback = buildMockToolExecution(tool, latestRequest);
      setActiveResult(fallback);
      onMockResult?.(fallback);
      onEvent?.(fallback.message);
    } finally {
      setBusyToolId(null);
    }
  }

  return (
    <section className="connection-center" aria-label="ENTRAL Connection Center">
      <header>
        <div>
          <p className="eyebrow">Connection Center</p>
          <h3>External tools</h3>
          <p>All connected services are listed here. Real external execution remains authorization-gated.</p>
        </div>
        <span className={isLoading ? "connection-center-status loading" : "connection-center-status"}>
          <PlugZap aria-hidden="true" size={14} />
          {isLoading ? "Syncing" : `${tools.length} tools`}
        </span>
      </header>
      <ModeStatusStrip
        ariaLabel="Connection mode status"
        className="connection-mode-strip"
        compact
        items={[
          {
            description: "Connected services show provider-backed status and stay logged.",
            label: "Real connections",
            mode: "real"
          },
          {
            description: "Missing credentials use local simulations before trust.",
            label: "Mock Mode",
            mode: "mock"
          },
          {
            description: "Repository, deployment, and provider health can run without write access.",
            label: "Read-only checks",
            mode: "read-only"
          }
        ]}
      />

      {developmentStatus ? (
        <section className={`development-status-panel health-${developmentHealthClass}`} aria-label="ENTRAL development status">
          <div className="development-status-header">
            <div>
              <p className="eyebrow">Development Status</p>
              <h4>Pipeline health: {developmentStatus.health.status}</h4>
              <p>{developmentStatus.health.message}</p>
            </div>
            <span className="connection-readonly-badge">Read-only</span>
          </div>
          <div className="development-status-grid">
            <article>
              <GitBranch aria-hidden="true" size={15} />
              <div>
                <strong>GitHub</strong>
                <span>{developmentStatus.github.status}</span>
                <small>{developmentStatus.github.repository ?? "Repository not configured"}</small>
                <small>{developmentStatus.github.defaultBranch ? `Branch: ${developmentStatus.github.defaultBranch}` : "Branch unavailable"}</small>
                <small>{developmentStatus.github.latestCommit ? `Latest: ${developmentStatus.github.latestCommit.sha} ${developmentStatus.github.latestCommit.message}` : "Latest commit unavailable"}</small>
              </div>
            </article>
            <article>
              <Rocket aria-hidden="true" size={15} />
              <div>
                <strong>Vercel</strong>
                <span>{developmentStatus.vercel.status}</span>
                <small>{developmentStatus.vercel.projectName ?? "Project not configured"}</small>
                <small>{developmentStatus.vercel.productionDeployment ? `Production: ${developmentStatus.vercel.productionDeployment.status}` : "Production deployment unavailable"}</small>
                <small>{developmentStatus.vercel.productionUrl ?? developmentStatus.vercel.latestDeployment?.url ?? "Deployment URL unavailable"}</small>
              </div>
            </article>
          </div>
        </section>
      ) : null}

      {Object.entries(groupedTools).map(([category, categoryTools]) => (
        <details className="connection-category" key={category} open={category === "AI" || category === "Development" || category === "Deployment" || category === "POD"}>
          <summary>
            <span>{category}</span>
            <small>{categoryTools.length} tools</small>
          </summary>
          <div className="connection-tool-grid">
            {categoryTools.map((tool) => (
              <article className="connection-tool-card" key={tool.id}>
                <div className="connection-tool-card-header">
                  <div>
                    <h4>{tool.name}</h4>
                    <p>{tool.description}</p>
                  </div>
                  <span className={`connection-status ${statusClass(tool.status)}`}>
                    {tool.status === "Connected" ? <CheckCircle2 aria-hidden="true" size={13} /> : <ShieldAlert aria-hidden="true" size={13} />}
                    {tool.status}
                  </span>
                </div>
                <div className="connection-tool-meta">
                  <span className={`connection-risk risk-${riskClass(tool.riskLevel)}`}>{tool.riskLevel} risk</span>
                  <span>{approvalLabel(tool)}</span>
                  {tool.readOnly ? <span className="connection-readonly-badge">Read-only connection</span> : null}
                  {tool.writeActionsEnabled === false ? <span>No write access enabled</span> : null}
                  {tool.providerName ? <span>{tool.providerName} / {tool.modelName ?? "default model"}</span> : null}
                </div>
                <p className="connection-credentials">
                  <LockKeyhole aria-hidden="true" size={13} />
                  {tool.missingEnvVars?.length
                    ? `Missing: ${tool.missingEnvVars.join(", ")}`
                    : tool.requiredCredentials.length ? tool.requiredCredentials.join(", ") : "No credentials required"}
                </p>
                {tool.status === "Missing API Key" || tool.status === "Missing Credentials" || tool.status === "Mock Mode" ? (
                  <p className="connection-mock-note">Mock Mode active. No provider secrets are exposed to the browser.</p>
                ) : null}
                <div className="connection-actions">
                  <button type="button" disabled={busyToolId === tool.id} onClick={() => void testTool(tool)}>
                    <FlaskConical aria-hidden="true" size={14} />
                    Test
                  </button>
                  <button type="button" disabled={busyToolId === tool.id} onClick={() => void mockExecute(tool)}>
                    <Sparkles aria-hidden="true" size={14} />
                    Mock
                  </button>
                </div>
              </article>
            ))}
          </div>
        </details>
      ))}

      {activeResult ? (
        <article className="connection-result" aria-label="Latest connection result">
          {"providerName" in activeResult && activeResult.providerName ? (
            <strong>{activeResult.providerName} / {activeResult.modelName ?? "default model"}</strong>
          ) : null}
          <p>{activeResult.message}</p>
          {"missingEnvVars" in activeResult && activeResult.missingEnvVars?.length ? (
            <p>Missing: {activeResult.missingEnvVars.join(", ")}</p>
          ) : null}
          {"metadata" in activeResult && activeResult.metadata ? (
            <dl className="connection-result-metadata">
              {Object.entries(activeResult.metadata).map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                  <dd>{value === null || value === "" ? "Unavailable" : String(value)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {"simulatedResult" in activeResult ? <pre>{activeResult.simulatedResult}</pre> : null}
          <ul>
            {activeResult.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </article>
      ) : null}
    </section>
  );
}
