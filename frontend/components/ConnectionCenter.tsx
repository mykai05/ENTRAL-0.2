"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FlaskConical, LockKeyhole, PlugZap, ShieldAlert, Sparkles } from "lucide-react";
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

type ToolsResponse = {
  items: ToolRegistryEntry[];
};

type ToolResultResponse<T> = {
  result: T;
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

export function ConnectionCenter({ latestRequest = "", onEvent, onMockResult, onRegistryLoad }: ConnectionCenterProps) {
  const [tools, setTools] = useState<ToolRegistryEntry[]>(defaultToolRegistry);
  const [isLoading, setIsLoading] = useState(false);
  const [activeResult, setActiveResult] = useState<ToolTestResult | MockToolExecutionResult | null>(null);
  const [busyToolId, setBusyToolId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadTools() {
      setIsLoading(true);
      try {
        const response = await apiFetch<ToolsResponse>("/connections/tools", { timeoutMs: 8000 });
        if (isCancelled) return;
        setTools(response.items);
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

      {Object.entries(groupedTools).map(([category, categoryTools]) => (
        <details className="connection-category" key={category} open={category === "AI" || category === "Development" || category === "POD"}>
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
                  <span>{tool.requiresAuthorization ? "Approval required" : "No approval gate"}</span>
                </div>
                <p className="connection-credentials">
                  <LockKeyhole aria-hidden="true" size={13} />
                  {tool.requiredCredentials.length ? tool.requiredCredentials.join(", ") : "No credentials required"}
                </p>
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
          <p>{activeResult.message}</p>
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
