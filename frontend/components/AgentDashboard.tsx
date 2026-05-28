"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { AgentCreateForm, AgentScheduleForm, AgentTaskForm, type Agent, type AgentFormDefaults } from "./AgentForms";
import { AgentList } from "./AgentList";
import { AgentDetail, type AgentLog, type AgentMessage, type AgentSchedule, type AgentTask } from "./AgentDetail";
import { AgentTemplateGallery, type AgentTemplate } from "./AgentTemplateGallery";
import { CurlSnippet } from "./CurlSnippet";
import { DataPortability } from "./DataPortability";

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
  const router = useRouter();
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

  const activeAgent = useMemo(() => agents.find((agent) => agent.id === activeAgentId) ?? null, [activeAgentId, agents]);

  const handleUnauthorized = useCallback((errorValue: unknown) => {
    if (errorValue instanceof ApiError && errorValue.status === 401) {
      router.push("/login?next=/agents");
      return true;
    }

    return false;
  }, [router]);

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
    } catch (refreshError) {
      if (!handleUnauthorized(refreshError)) {
        setError(refreshError instanceof Error ? refreshError.message : "Unable to load agents.");
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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      const target = event.target;
      const isEditableTarget = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      const hasOpenOverlay = Boolean(document.querySelector(".overlay-backdrop, [role='dialog']"));

      if (isEditableTarget || hasOpenOverlay) {
        return;
      }

      const activeTask = tasks.find((task) => task.status === "queued" || task.status === "running");

      if (activeTask) {
        void cancelTask(activeTask.id);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelTask, tasks]);

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
        <AgentCreateForm defaults={templateDefaults} onCreated={(agent) => void handleAgentCreated(agent)} />
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
        <AgentTaskForm activeAgent={activeAgent} defaults={templateDefaults} onAssigned={refresh} />
        <AgentScheduleForm activeAgent={activeAgent} defaults={templateDefaults} onScheduled={refresh} />
        <CurlSnippet
          body={{
            title: templateDefaults?.title ?? "Research target account",
            action: templateDefaults?.action ?? "research",
            payload: {
              instructions: templateDefaults?.instructions ?? "Find useful public details and summarize the next best action.",
              sourceType: "manual"
            }
          }}
          method="POST"
          path={`/agents/${activeAgent?.id ?? "agent_id"}/assign`}
          title="Assign agent task"
        />
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
