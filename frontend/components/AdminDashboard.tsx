"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Ban, PauseCircle, Plus, RefreshCw, ShieldCheck } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { policyFormSchema } from "../lib/validation";
import { Button } from "./Button";
import { CurlSnippet } from "./CurlSnippet";
import { SkeletonList } from "./Skeleton";

type Policy = {
  id: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  effect: string;
  severity: string;
  rule: Record<string, unknown>;
};

type AuditLog = {
  id: string;
  action: string;
  outcome: string;
  severity: string;
  targetType: string;
  targetId?: string | null;
  createdAt: string;
  entry?: Record<string, unknown> | null;
  entryHash: string;
};

type ActiveTask = {
  id: string;
  agentName: string;
  title: string;
  action: string;
  status: string;
};

type AdminOverview = {
  activeTasks: ActiveTask[];
  auditLogs: AuditLog[];
  health: {
    activeAgents: number;
    activeSchedules: number;
    agents: number;
    enabledPolicies: number;
    policyViolations24h: number;
    queuedAgentTasks: number;
    runningAgentTasks: number;
  };
  policies: Policy[];
};

const emptyOverview: AdminOverview = {
  activeTasks: [],
  auditLogs: [],
  health: {
    activeAgents: 0,
    activeSchedules: 0,
    agents: 0,
    enabledPolicies: 0,
    policyViolations24h: 0,
    queuedAgentTasks: 0,
    runningAgentTasks: 0
  },
  policies: []
};

function splitValues(input: string) {
  return input.split(",").map((value) => value.trim()).filter(Boolean);
}

function buildRule(kind: string, values: string) {
  const parts = splitValues(values);

  if (kind === "agent_quota") {
    return {
      kind,
      maxTasks: Number(parts[0] ?? 50),
      windowMinutes: Number(parts[1] ?? 60)
    };
  }

  if (kind === "manual_approval_required") {
    return {
      kind,
      actions: parts.length > 0 ? parts : ["sales_outreach"]
    };
  }

  if (kind === "blocked_domains") {
    return {
      kind,
      domains: parts
    };
  }

  return {
    kind,
    keywords: parts
  };
}

function describeRule(policy: Policy) {
  const rule = policy.rule;

  if (rule.kind === "blocked_keywords" && Array.isArray(rule.keywords)) {
    return `Blocks keywords: ${rule.keywords.join(", ")}`;
  }

  if (rule.kind === "blocked_domains" && Array.isArray(rule.domains)) {
    return `Blocks domains: ${rule.domains.join(", ")}`;
  }

  if (rule.kind === "agent_quota") {
    return `Allows ${String(rule.maxTasks)} tasks per ${String(rule.windowMinutes)} minutes`;
  }

  if (rule.kind === "manual_approval_required" && Array.isArray(rule.actions)) {
    return `Requires approval for: ${rule.actions.join(", ")}`;
  }

  return "Custom policy rule";
}

export function AdminDashboard() {
  const [overview, setOverview] = useState<AdminOverview>(emptyOverview);
  const [error, setError] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const adminHeaders = useMemo(() => (
    mfaCode ? { "x-admin-mfa-code": mfaCode } : undefined
  ), [mfaCode]);

  const loadOverview = useCallback(async () => {
    setError("");

    try {
      const response = await apiFetch<AdminOverview>("/admin/overview", {
        headers: adminHeaders
      });
      setOverview(response);
    } catch (loadError) {
      setError(loadError instanceof ApiError ? loadError.message : "Unable to load admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [adminHeaders]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleCreatePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = policyFormSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") || undefined,
      kind: formData.get("kind"),
      values: formData.get("values"),
      enabled: formData.get("enabled") === "on",
      severity: formData.get("severity")
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the policy.");
      return;
    }

    setIsSaving(true);

    try {
      await apiFetch("/admin/policies", {
        headers: adminHeaders,
        method: "POST",
        json: {
          description: parsed.data.description,
          enabled: parsed.data.enabled,
          effect: "block",
          name: parsed.data.name,
          rule: buildRule(parsed.data.kind, parsed.data.values),
          severity: parsed.data.severity
        }
      });
      form.reset();
      await loadOverview();
    } catch (saveError) {
      setError(saveError instanceof ApiError ? saveError.message : "Unable to create policy.");
    } finally {
      setIsSaving(false);
    }
  }

  async function updatePolicy(policy: Policy, enabled: boolean) {
    try {
      await apiFetch(`/admin/policies/${policy.id}`, {
        headers: adminHeaders,
        method: "PATCH",
        json: { enabled }
      });
      await loadOverview();
    } catch (updateError) {
      setError(updateError instanceof ApiError ? updateError.message : "Unable to update policy.");
    }
  }

  async function deletePolicy(policy: Policy) {
    try {
      await apiFetch(`/admin/policies/${policy.id}`, {
        headers: adminHeaders,
        method: "DELETE"
      });
      await loadOverview();
    } catch (deleteError) {
      setError(deleteError instanceof ApiError ? deleteError.message : "Unable to delete policy.");
    }
  }

  async function pauseAllAgents() {
    try {
      await apiFetch("/admin/agents/pause-all", {
        headers: adminHeaders,
        method: "POST"
      });
      await loadOverview();
    } catch (pauseError) {
      setError(pauseError instanceof ApiError ? pauseError.message : "Unable to pause agents.");
    }
  }

  async function revokeTask(taskId: string) {
    try {
      await apiFetch(`/admin/agent-tasks/${taskId}/revoke`, {
        headers: adminHeaders,
        method: "POST"
      });
      await loadOverview();
    } catch (revokeError) {
      setError(revokeError instanceof ApiError ? revokeError.message : "Unable to revoke task.");
    }
  }

  return (
    <section className="admin-dashboard" aria-label="Governance admin dashboard">
      <form className="admin-mfa" onSubmit={(event) => { event.preventDefault(); void loadOverview(); }}>
        <div>
          <label htmlFor="admin-mfa-code">Admin verification code</label>
          <input
            id="admin-mfa-code"
            name="mfaCode"
            onChange={(event) => setMfaCode(event.target.value)}
            placeholder="Only required when configured"
            type="password"
            value={mfaCode}
          />
        </div>
        <Button type="submit" variant="secondary">
          <RefreshCw aria-hidden="true" size={18} />
          Refresh
        </Button>
      </form>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {isLoading ? <SkeletonList count={4} label="Loading governance controls" /> : null}

      <div className="admin-metrics" aria-label="System health">
        <article className="metric-card">
          <span>Agents</span>
          <strong>{overview.health.activeAgents}/{overview.health.agents}</strong>
        </article>
        <article className="metric-card">
          <span>Queued</span>
          <strong>{overview.health.queuedAgentTasks}</strong>
        </article>
        <article className="metric-card">
          <span>Running</span>
          <strong>{overview.health.runningAgentTasks}</strong>
        </article>
        <article className="metric-card">
          <span>Policy hits</span>
          <strong>{overview.health.policyViolations24h}</strong>
        </article>
      </div>

      <section className="admin-panel" aria-label="Autonomy kill switch">
        <header>
          <div>
            <h2>Autonomy Controls</h2>
            <p>{overview.health.activeSchedules} active schedules, {overview.health.enabledPolicies} enabled policies.</p>
          </div>
          <Button type="button" variant="secondary" onClick={() => void pauseAllAgents()}>
            <PauseCircle aria-hidden="true" size={20} />
            Pause all agents
          </Button>
        </header>
        {overview.activeTasks.length === 0 ? <p>No active agent tasks.</p> : overview.activeTasks.map((task) => (
          <article className="admin-row" key={task.id}>
            <div>
              <strong>{task.title}</strong>
              <span>{task.agentName} - {task.action} - {task.status}</span>
            </div>
            <Button type="button" variant="secondary" onClick={() => void revokeTask(task.id)}>
              <Ban aria-hidden="true" size={18} />
              Revoke
            </Button>
          </article>
        ))}
      </section>

      <section className="admin-panel" aria-label="Policy management">
        <header>
          <div>
            <h2>Policies</h2>
            <p>Rules are checked before autonomous or assigned agent work runs.</p>
          </div>
          <ShieldCheck aria-hidden="true" size={28} />
        </header>
        <form className="policy-form" onSubmit={handleCreatePolicy} noValidate>
          <div>
            <label htmlFor="policy-name">Name</label>
            <input defaultValue="Block sensitive data requests" id="policy-name" name="name" required />
          </div>
          <div>
            <label htmlFor="policy-kind">Rule type</label>
            <select defaultValue="blocked_keywords" id="policy-kind" name="kind">
              <option value="blocked_keywords">Blocked keywords</option>
              <option value="blocked_domains">Blocked domains</option>
              <option value="agent_quota">Agent quota</option>
              <option value="manual_approval_required">Manual approval</option>
            </select>
          </div>
          <div>
            <label htmlFor="policy-values">Values</label>
            <input defaultValue="password, api key, private key" id="policy-values" name="values" placeholder="Comma-separated values" required />
          </div>
          <div>
            <label htmlFor="policy-severity">Severity</label>
            <select defaultValue="high" id="policy-severity" name="severity">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <label className="check-row" htmlFor="policy-enabled">
            <input defaultChecked id="policy-enabled" name="enabled" type="checkbox" />
            Enabled
          </label>
          <Button type="submit" disabled={isSaving}>
            <Plus aria-hidden="true" size={20} />
            {isSaving ? "Creating..." : "Create policy"}
          </Button>
        </form>
        <div className="policy-list">
          {overview.policies.map((policy) => (
            <article className="admin-row" key={policy.id}>
              <div>
                <strong>{policy.name}</strong>
                <span>{policy.enabled ? "Enabled" : "Disabled"} - {policy.severity} - {describeRule(policy)}</span>
              </div>
              <div className="row-actions">
                <Button type="button" variant="secondary" onClick={() => void updatePolicy(policy, !policy.enabled)}>
                  {policy.enabled ? "Disable" : "Enable"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => void deletePolicy(policy)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <CurlSnippet
        body={{
          name: "Block sensitive data requests",
          enabled: true,
          effect: "block",
          severity: "high",
          rule: {
            kind: "blocked_keywords",
            keywords: ["password", "api key", "private key"]
          }
        }}
        method="POST"
        path="/admin/policies"
        title="Create policy"
      />

      <section className="admin-panel" aria-label="Audit log">
        <header>
          <div>
            <h2>Audit Log</h2>
            <p>Recent governance, policy, and agent actions.</p>
          </div>
        </header>
        <div className="audit-list">
          {overview.auditLogs.length === 0 ? <p>No audit entries yet.</p> : overview.auditLogs.map((log) => (
            <article className="admin-row" key={log.id}>
              <div>
                <strong>{log.action}</strong>
                <span>{log.outcome} - {log.severity} - {new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <code>{log.entryHash?.slice(0, 12)}</code>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
