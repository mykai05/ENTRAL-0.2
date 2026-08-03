"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FlaskConical, LockKeyhole, PlugZap, ShieldAlert } from "lucide-react";
import { apiFetch, ApiError } from "../lib/api";
import { ProductTruthValidationError, validateFreshProductTruthProjection } from "../lib/capability-truth";
import {
  toolsByCategory,
  type ToolRegistryEntry,
  type ToolTestResult
} from "../lib/tool-registry";
import { ModeStatusStrip } from "./ModeStatus";

type ToolsResponse = {
  items: unknown;
  product_truth: unknown;
};

type ToolResultResponse<T> = {
  result: T;
};

type ConnectionCenterProps = {
  latestRequest?: string;
  onEvent?: (message: string) => void;
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

export function validatePublishedIntegrationTools(value: ToolsResponse): ToolRegistryEntry[] {
  const projection = validateFreshProductTruthProjection(value.product_truth, "INTEGRATION_LIST");
  if (!Array.isArray(value.items)) {
    throw new ProductTruthValidationError("The integration registry returned malformed items.");
  }
  const claims = new Map(projection.claims.map((claim) => [claim.claim_id, claim]));
  const tools = value.items as ToolRegistryEntry[];
  if (tools.length !== projection.claims.length) {
    throw new ProductTruthValidationError("The integration list is not synchronized with Product Truth.");
  }
  const seenClaims = new Set<string>();
  for (const tool of tools) {
    const binding = tool?.productTruth;
    if (!binding) {
      throw new ProductTruthValidationError("The integration list is not synchronized with Product Truth.");
    }
    const claim = claims.get(binding.claimId);
    if (
      !claim
      || seenClaims.has(claim.claim_id)
      || claim.capability_key !== `integration.tool.${tool.id}`
      || binding.capabilityId !== claim.capability_id
      || binding.capabilityKey !== claim.capability_key
      || binding.capabilityVersion !== claim.capability_version
      || binding.claimKey !== claim.claim_key
      || binding.claimRecordVersion !== claim.claim_record_version
      || tool.name !== claim.display_name
      || tool.description !== claim.approved_language
      || JSON.stringify(binding.evidenceReceiptIds) !== JSON.stringify(claim.evidence_receipt_ids)
      || JSON.stringify(binding.limitations) !== JSON.stringify(claim.limitations)
    ) {
      throw new ProductTruthValidationError("The integration list is not synchronized with Product Truth.");
    }
    seenClaims.add(claim.claim_id);
  }
  return tools;
}

export function ConnectionCenter({ onEvent, onRegistryLoad }: ConnectionCenterProps) {
  const [tools, setTools] = useState<ToolRegistryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeResult, setActiveResult] = useState<ToolTestResult | null>(null);
  const [activeError, setActiveError] = useState("");
  const [busyToolId, setBusyToolId] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadTools() {
      setIsLoading(true);
      try {
        const response = await apiFetch<ToolsResponse>("/connections/tools", { timeoutMs: 8000 });
        if (isCancelled) return;
        const publishedTools = validatePublishedIntegrationTools(response);
        setTools(publishedTools);
        setActiveError("");
        onRegistryLoad?.(publishedTools);
      } catch (error) {
        if (isCancelled) return;
        const message = error instanceof ApiError
          ? `Connection registry unavailable (${error.status}). No local substitute was selected.`
          : "Connection registry unavailable. No local substitute was selected.";
        setTools([]);
        setActiveError(message);
        onEvent?.(message);
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
    setActiveError("");
    try {
      const response = await apiFetch<ToolResultResponse<ToolTestResult>>(`/connections/tools/${tool.id}/test`, {
        method: "POST",
        timeoutMs: 8000
      });
      setActiveResult(response.result);
      onEvent?.(response.result.message);
    } catch (error) {
      const message = error instanceof ApiError
        ? `${tool.name} provider test failed (${error.status}). No simulated result was substituted.`
        : `${tool.name} provider test failed. No simulated result was substituted.`;
      setActiveResult(null);
      setActiveError(message);
      onEvent?.(message);
    } finally {
      setBusyToolId(null);
    }
  }

  return (
    <section className="connection-center" aria-label="ENTRAL Connection Center">
      <header>
        <div>
          <p className="eyebrow">Connection Center</p>
          <h3>Registry-published integrations</h3>
          <p>Only receipt-bound integrations published as SELLABLE are listed. Provider execution remains authorization-gated.</p>
        </div>
        <span className={isLoading ? "connection-center-status loading" : "connection-center-status"}>
          <PlugZap aria-hidden="true" size={14} />
          {isLoading ? "Syncing" : `${tools.length} published`}
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
            description: "Unavailable or unverified providers remain disabled and fail closed.",
            label: "Unverified disabled",
            mode: "read-only"
          },
          {
            description: "Repository, deployment, and provider health can run without write access.",
            label: "Read-only checks",
            mode: "read-only"
          }
        ]}
      />
      {!isLoading && !activeError && tools.length === 0 ? (
        <p className="control-hint" role="status">No integrations are currently published as SELLABLE.</p>
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
                  <p className="connection-mock-note">Provider unavailable. Configure and verify credentials before use; no simulated result will be returned.</p>
                ) : null}
                <div className="connection-actions">
                  <button
                    type="button"
                    disabled={busyToolId === tool.id || tool.status !== "Connected"}
                    onClick={() => void testTool(tool)}
                  >
                    <FlaskConical aria-hidden="true" size={14} />
                    Test
                  </button>
                </div>
              </article>
            ))}
          </div>
        </details>
      ))}

      {activeError ? (
        <p className="connection-result" role="alert">{activeError}</p>
      ) : null}

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
