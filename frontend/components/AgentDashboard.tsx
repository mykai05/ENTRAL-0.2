"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { AgentCreateForm, AgentScheduleForm, AgentTaskForm, type Agent, type AgentFormDefaults } from "./AgentForms";
import { AgentList } from "./AgentList";
import { AgentDetail, type AgentLog, type AgentMessage, type AgentSchedule, type AgentTask } from "./AgentDetail";
import { AgentTemplateGallery, type AgentTemplate } from "./AgentTemplateGallery";
import { DataPortability } from "./DataPortability";
import { clearAuthenticatedUserSession } from "../lib/auth-session";

type AgentListResponse = {
  items: Agent[];
};

type AgentDetailResponse = {
  agent: Agent;
  tasks: AgentTask[];
  logs: AgentLog[];
  messages: AgentMessage[];
  schedules: AgentSchedule[];
};

export function AgentDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [schedules, setSchedules] = useState<AgentSchedule[]>([]);
  const [templateDefaults, setTemplateDefaults] = useState<AgentFormDefaults | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAgentSidebarOpen, setIsAgentSidebarOpen] = useState(true);
  const [accessState, setAccessState] = useState<"checking" | "authorized" | "denied" | "unavailable">("checking");

  const activeAgent = useMemo(() => agents.find((agent) => agent.id === activeAgentId) ?? null, [activeAgentId, agents]);

  const handleUnauthorized = useCallback((errorValue: unknown) => {
    if (errorValue instanceof ApiError && errorValue.status === 401) {
      setError("Owner authentication is required for saved agent operations. The local command center remains available.");
      setAccessState("denied");
      clearAuthenticatedUserSession();
      return true;
    }

    return false;
  }, []);

  const loadAgents = useCallback(async () => {
    const response = await apiFetch<AgentListResponse>("/agents");
    setAgents(response.items);

    if (!activeAgentId && response.items[0]) {
      setActiveAgentId(response.items[0].id);
    }

    return response.items;
  }, [activeAgentId]);

  const loadAgentDetail = useCallback(async (agentId: string) => {
    const response = await apiFetch<AgentDetailResponse>(`/agents/${agentId}`);
    setAgents((current) => current.map((agent) => (agent.id === response.agent.id ? response.agent : agent)));
    setTasks(response.tasks);
    setLogs(response.logs);
    setMessages(response.messages);
    setSchedules(response.schedules);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setError("");
      const items = await loadAgents();
      const selectedId = activeAgentId ?? items[0]?.id;

      if (selectedId) {
        await loadAgentDetail(selectedId);
      }
      setAccessState("authorized");
    } catch (refreshError) {
      if (!handleUnauthorized(refreshError)) {
        setError(refreshError instanceof Error ? refreshError.message : "Unable to load agents.");
        setAccessState("unavailable");
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeAgentId, handleUnauthorized, loadAgentDetail, loadAgents]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const hasActiveTasks = tasks.some((task) => task.status === "queued" || task.status === "running");
    const hasActiveSchedules = schedules.some((schedule) => schedule.status === "active");

    if (!activeAgentId || (!hasActiveTasks && !hasActiveSchedules)) {
      return;
    }

    const timer = setInterval(() => {
      void refresh();
    }, 2000);

    return () => clearInterval(timer);
  }, [activeAgentId, refresh, schedules, tasks]);

  async function handleAgentCreated(agent: Agent) {
    setAgents((current) => [agent, ...current]);
    setActiveAgentId(agent.id);
    await loadAgentDetail(agent.id);
  }

  async function handleSelectAgent(agentId: string) {
    setActiveAgentId(agentId);
    await loadAgentDetail(agentId).catch((selectError) => {
      if (!handleUnauthorized(selectError)) {
        setError(selectError instanceof Error ? selectError.message : "Unable to open agent.");
      }
    });
  }

  async function mutateAgent(action: "pause" | "resume" | "restart") {
    if (!activeAgent) {
      return;
    }

    try {
      await apiFetch(`/agents/${activeAgent.id}/${action}`, { method: "POST" });
      await refresh();
    } catch (mutateError) {
      if (!handleUnauthorized(mutateError)) {
        setError(mutateError instanceof Error ? mutateError.message : "Unable to update agent.");
      }
    }
  }

  async function toggleBackground(runInBackground: boolean) {
    if (!activeAgent) {
      return;
    }

    try {
      await apiFetch(`/agents/${activeAgent.id}/background`, {
        method: "PATCH",
        json: { runInBackground }
      });
      await refresh();
    } catch (mutateError) {
      if (!handleUnauthorized(mutateError)) {
        setError(mutateError instanceof Error ? mutateError.message : "Unable to update background mode.");
      }
    }
  }

  async function mutateSchedule(scheduleId: string, action: "pause" | "resume" | "revoke") {
    if (!activeAgent) {
      return;
    }

    try {
      await apiFetch(`/agents/${activeAgent.id}/schedules/${scheduleId}/${action}`, { method: "POST" });
      await refresh();
    } catch (scheduleError) {
      if (!handleUnauthorized(scheduleError)) {
        setError(scheduleError instanceof Error ? scheduleError.message : "Unable to update schedule.");
      }
    }
  }

  const cancelTask = useCallback(async (taskId: string) => {
    if (!activeAgent) {
      return;
    }

    try {
      await apiFetch(`/agents/${activeAgent.id}/tasks/${taskId}/cancel`, { method: "POST" });
      await refresh();
    } catch (cancelError) {
      if (!handleUnauthorized(cancelError)) {
        setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel task.");
      }
    }
  }, [activeAgent, handleUnauthorized, refresh]);

  async function importAgents(data: unknown) {
    const items = Array.isArray(data) ? data : (data as { agents?: unknown[] }).agents;

    if (!Array.isArray(items)) {
      throw new Error("Import must contain an agents array.");
    }

    for (const item of items.slice(0, 15)) {
      const agent = item as { capabilities?: string[]; name?: string; role?: string; webhookUrl?: string | null };

      if (agent.name && agent.role) {
        await apiFetch("/agents", {
          method: "POST",
          json: {
            capabilities: Array.isArray(agent.capabilities) && agent.capabilities.length > 0 ? agent.capabilities : ["general"],
            name: agent.name,
            role: agent.role,
            webhookUrl: agent.webhookUrl || undefined
          }
        });
      }
    }

    await refresh();
  }

  function useTemplate(template: AgentTemplate) {
    setTemplateDefaults({
      action: template.action,
      capabilities: template.capabilities,
      instructions: template.instructions,
      name: template.name,
      role: template.role,
      title: template.title
    });
  }

  if (accessState !== "authorized") {
    return (
      <section className="permission-state" role={accessState === "unavailable" ? "alert" : "status"}>
        <h2>{accessState === "checking" ? "Loading agents" : accessState === "denied" ? "Owner session required" : "Agents unavailable"}</h2>
        <p>{accessState === "checking" ? "Checking saved agent access." : error}</p>
      </section>
    );
  }

  return (
    <section className={isAgentSidebarOpen ? "agent-dashboard" : "agent-dashboard sidebar-closed"} aria-label="Agent orchestration workspace">
      {isAgentSidebarOpen ? (
      <div className="agent-sidebar">
        <div className="sidebar-heading">
          <div>
            <p className="eyebrow">Control</p>
            <h2>Agents</h2>
          </div>
          <button className="sidebar-toggle-button" type="button" onClick={() => setIsAgentSidebarOpen(false)} aria-label="Close agents sidebar">
            <PanelLeftClose aria-hidden="true" size={18} />
          </button>
        </div>
        <AgentCreateForm key={`create-${JSON.stringify(templateDefaults ?? {})}`} defaults={templateDefaults} onCreated={(agent) => void handleAgentCreated(agent)} />
        <AgentList agents={agents} activeAgentId={activeAgentId} isLoading={isLoading} onSelect={(agentId) => void handleSelectAgent(agentId)} />
        <DataPortability
          csvRows={agents.map((agent) => ({
            id: agent.id,
            name: agent.name,
            role: agent.role,
            status: agent.status
          }))}
          data={{ agents, schedules }}
          filename="entral-agent-configs"
          label="Agent config import/export"
          onImport={importAgents}
        />
      </div>
      ) : null}
      <div className="agent-main">
        <div className="agent-main-toolbar">
          <button className="button button-secondary" type="button" onClick={() => setIsAgentSidebarOpen((open) => !open)}>
            {isAgentSidebarOpen ? <PanelLeftClose aria-hidden="true" size={18} /> : <PanelLeftOpen aria-hidden="true" size={18} />}
            {isAgentSidebarOpen ? "Hide agents" : "Show agents"}
          </button>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <AgentTemplateGallery onUseTemplate={useTemplate} />
        <AgentTaskForm key={`task-${JSON.stringify(templateDefaults ?? {})}`} activeAgent={activeAgent} defaults={templateDefaults} onAssigned={refresh} />
        <AgentScheduleForm key={`schedule-${JSON.stringify(templateDefaults ?? {})}`} activeAgent={activeAgent} defaults={templateDefaults} onScheduled={refresh} />
        <AgentDetail
          agent={activeAgent}
          logs={logs}
          messages={messages}
          onCancelTask={cancelTask}
          onPause={() => mutateAgent("pause")}
          onRestart={() => mutateAgent("restart")}
          onResume={() => mutateAgent("resume")}
          onToggleBackground={toggleBackground}
          onSchedulePause={(scheduleId) => mutateSchedule(scheduleId, "pause")}
          onScheduleResume={(scheduleId) => mutateSchedule(scheduleId, "resume")}
          onScheduleRevoke={(scheduleId) => mutateSchedule(scheduleId, "revoke")}
          schedules={schedules}
          tasks={tasks}
        />
      </div>
    </section>
  );
}
