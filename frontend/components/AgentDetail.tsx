"use client";

import React from "react";
import { Ban, Copy, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { AgentStatus } from "./AgentStatus";
import { AutomationStatus } from "./AutomationStatus";
import type { Agent } from "./AgentForms";

export type AgentTask = {
  id: string;
  scheduleId?: string | null;
  title: string;
  action: string;
  status: string;
  result?: {
    summary?: string;
    recommendation?: string;
  } | null;
  error?: string | null;
};

export type AgentSchedule = {
  id: string;
  title: string;
  action: string;
  status: string;
  intervalMinutes: number;
  nextRunAt: string;
  lastRunAt?: string | null;
};

export type AgentLog = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

export type AgentMessage = {
  id: string;
  type: string;
  action: string;
  taskId?: string | null;
  createdAt: string;
};

type AgentDetailProps = {
  agent: Agent | null;
  logs: AgentLog[];
  messages: AgentMessage[];
  onCancelTask: (taskId: string) => Promise<void>;
  onPause: () => Promise<void>;
  onRestart: () => Promise<void>;
  onResume: () => Promise<void>;
  onToggleBackground: (runInBackground: boolean) => Promise<void>;
  onSchedulePause: (scheduleId: string) => Promise<void>;
  onScheduleResume: (scheduleId: string) => Promise<void>;
  onScheduleRevoke: (scheduleId: string) => Promise<void>;
  schedules: AgentSchedule[];
  tasks: AgentTask[];
};

export function AgentDetail({
  agent,
  logs,
  messages,
  onCancelTask,
  onPause,
  onRestart,
  onResume,
  onToggleBackground,
  onSchedulePause,
  onScheduleResume,
  onScheduleRevoke,
  schedules,
  tasks
}: AgentDetailProps) {
  async function copyLine(value: string) {
    await navigator.clipboard.writeText(value).catch(() => undefined);
  }

  if (!agent) {
    return (
      <section className="agent-detail">
        <div className="empty-state">
          <div>
            <strong>Select or create an agent.</strong>
            <p>Agent details, schedules, tasks, logs, and console activity will appear here.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="agent-detail" aria-label="Agent detail">
      <header>
        <div>
          <h2>{agent.name}</h2>
          <p>{agent.role}</p>
        </div>
        <AgentStatus status={agent.status} />
      </header>
      <div className="agent-controls">
        <Button type="button" variant={agent.runInBackground ? "secondary" : "primary"} onClick={() => void onToggleBackground(!agent.runInBackground)}>
          {agent.runInBackground ? "Background On" : "Enable Background"}
        </Button>
        {agent.isPaused ? (
          <Button type="button" variant="secondary" onClick={() => void onResume()}>
            <Play aria-hidden="true" size={18} />
            Resume
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={() => void onPause()}>
            <Pause aria-hidden="true" size={18} />
            Pause
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={() => void onRestart()}>
          <RotateCcw aria-hidden="true" size={18} />
          Restart
        </Button>
      </div>
      <div className="agent-section">
        <h3>Capabilities</h3>
        <div className="chip-row">
          <span className={agent.runInBackground ? "chip" : "chip chip-muted"}>
            {agent.runInBackground ? "Background enabled" : "Background disabled"}
          </span>
          {agent.capabilities.map((capability) => (
            <span className="chip" key={capability}>{capability}</span>
          ))}
        </div>
        {agent.webhookUrl ? <p>Default webhook: {agent.webhookUrl}</p> : null}
      </div>
      <div className="agent-section">
        <h3>Background schedules</h3>
        {schedules.length === 0 ? <p>No schedules yet.</p> : schedules.map((schedule) => (
          <article className="agent-task-row" key={schedule.id}>
            <strong>{schedule.title}</strong>
            <span>{schedule.action} - every {schedule.intervalMinutes} min</span>
            <AutomationStatus status={schedule.status === "active" ? "running" : schedule.status} />
            <p>Next run: {new Date(schedule.nextRunAt).toLocaleString()}</p>
            <div className="row-actions">
              {schedule.status === "active" ? (
                <Button type="button" variant="secondary" onClick={() => void onSchedulePause(schedule.id)}>
                  <Pause aria-hidden="true" size={18} />
                  Pause
                </Button>
              ) : schedule.status === "paused" ? (
                <Button type="button" variant="secondary" onClick={() => void onScheduleResume(schedule.id)}>
                  <Play aria-hidden="true" size={18} />
                  Resume
                </Button>
              ) : null}
              {schedule.status !== "revoked" ? (
                <Button type="button" variant="secondary" onClick={() => void onScheduleRevoke(schedule.id)}>
                  <Ban aria-hidden="true" size={18} />
                  Revoke
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      <div className="agent-section">
        <h3>Recent tasks</h3>
        {tasks.length === 0 ? <p>No tasks assigned yet.</p> : tasks.map((task) => (
          <article className="agent-task-row" key={task.id}>
            <strong>{task.title}</strong>
            <span>{task.action}{task.scheduleId ? " - scheduled" : ""}</span>
            <AutomationStatus status={task.status === "queued" ? "pending" : task.status} />
            {task.result?.summary ? <p>{task.result.summary}</p> : null}
            {task.error ? <p className="form-error">{task.error}</p> : null}
            {task.status === "queued" || task.status === "running" ? (
              <Button type="button" variant="secondary" onClick={() => void onCancelTask(task.id)}>
                <Ban aria-hidden="true" size={18} />
                Cancel
              </Button>
            ) : null}
          </article>
        ))}
      </div>
      <div className="agent-section">
        <h3>Live console</h3>
        {messages.length === 0 ? <p>No bus messages yet.</p> : messages.map((message) => (
          <p className="agent-log-line console-line" key={message.id}>
            <span>{message.type} - {message.action}</span>
            <button type="button" onClick={() => void copyLine(`${message.type} - ${message.action}`)} aria-label="Copy console line">
              <Copy aria-hidden="true" size={14} />
            </button>
          </p>
        ))}
      </div>
      <div className="agent-section">
        <h3>Logs</h3>
        {logs.length === 0 ? <p>No logs yet.</p> : logs.map((log) => (
          <p className="agent-log-line console-line" key={log.id}>
            <span>{log.level}: {log.message}</span>
            <button type="button" onClick={() => void copyLine(`${log.level}: ${log.message}`)} aria-label="Copy log line">
              <Copy aria-hidden="true" size={14} />
            </button>
          </p>
        ))}
      </div>
    </section>
  );
}
