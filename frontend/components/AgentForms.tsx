"use client";

import React, { FormEvent, useState } from "react";
import { Bot, Send } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { agentFormSchema, agentScheduleFormSchema, agentTaskFormSchema } from "../lib/validation";
import { Button } from "./Button";
import { ModeBadge, type ModeStatusKind } from "./ModeStatus";

export type Agent = {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  status: string;
  isPaused: boolean;
  runInBackground: boolean;
  lastActivitySeenAt?: string | null;
  load: number;
  webhookUrl?: string | null;
};

type AgentFormProps = {
  defaults?: AgentFormDefaults;
  onCreated: (agent: Agent) => void;
};

type AgentTaskFormProps = {
  activeAgent: Agent | null;
  defaults?: AgentFormDefaults;
  onAssigned: () => Promise<void>;
};

type AgentScheduleFormProps = {
  activeAgent: Agent | null;
  defaults?: AgentFormDefaults;
  onScheduled: () => Promise<void>;
};

export type AgentFormDefaults = {
  action?: "research" | "sales_outreach" | "automation_review" | "chat_summary" | "general";
  capabilities?: string;
  instructions?: string;
  name?: string;
  role?: string;
  title?: string;
  webhookUrl?: string;
  runInBackground?: boolean;
};

function splitCapabilities(input: string) {
  return input
    .split(",")
    .map((capability) => capability.trim())
    .filter(Boolean);
}

function AgentModeNote({ children, label, mode }: { children: React.ReactNode; label: string; mode: ModeStatusKind }) {
  return (
    <p className="surface-mode-note" role="note">
      <ModeBadge mode={mode}>{label}</ModeBadge>
      <span>{children}</span>
    </p>
  );
}

export function AgentCreateForm({ defaults, onCreated }: AgentFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = agentFormSchema.safeParse({
      name: formData.get("name"),
      role: formData.get("role"),
      capabilities: formData.get("capabilities"),
      webhookUrl: formData.get("webhookUrl") || undefined,
      runInBackground: formData.get("runInBackground") === "on"
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the agent details.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch<{ agent: Agent }>("/agents", {
        method: "POST",
        json: {
          name: parsed.data.name,
          role: parsed.data.role,
          capabilities: splitCapabilities(parsed.data.capabilities),
          runInBackground: parsed.data.runInBackground,
          webhookUrl: parsed.data.webhookUrl || undefined
        }
      });
      form.reset();
      onCreated(response.agent);
    } catch (createError) {
      setError(createError instanceof ApiError ? createError.message : "Unable to create agent.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="agent-form" onSubmit={handleSubmit} noValidate>
      <AgentModeNote label="Real config" mode="real">
        Agent settings are saved to your account. External tool use still depends on connection state, policies, and approval gates.
      </AgentModeNote>
      <div>
        <label htmlFor="agent-name">Name</label>
        <input defaultValue={defaults?.name ?? "Researcher"} id="agent-name" name="name" placeholder="Researcher" required />
      </div>
      <div>
        <label htmlFor="agent-role">Role</label>
        <input
          defaultValue={defaults?.role ?? "Research and summarize findings"}
          id="agent-role"
          name="role"
          placeholder="Research and summarize findings"
          required
        />
      </div>
      <div>
        <label htmlFor="agent-capabilities">Capabilities</label>
        <input
          defaultValue={defaults?.capabilities ?? "research, summarize, qualify"}
          id="agent-capabilities"
          name="capabilities"
          placeholder="research, summarize, qualify"
          required
        />
      </div>
      <div>
        <label htmlFor="agent-webhook">Default webhook URL</label>
        <input defaultValue={defaults?.webhookUrl ?? ""} id="agent-webhook" name="webhookUrl" placeholder="https://hooks.example.com/agent" type="url" />
      </div>
      <label className="check-row" htmlFor="agent-background">
        <input defaultChecked={defaults?.runInBackground ?? true} id="agent-background" name="runInBackground" type="checkbox" />
        Run in Background
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        <Bot aria-hidden="true" size={20} />
        {isSubmitting ? "Creating..." : "Create agent"}
      </Button>
    </form>
  );
}

export function AgentTaskForm({ activeAgent, defaults, onAssigned }: AgentTaskFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!activeAgent) {
      setError("Select an agent first.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = agentTaskFormSchema.safeParse({
      title: formData.get("title"),
      action: formData.get("action"),
      instructions: formData.get("instructions"),
      context: formData.get("context") || undefined,
      webhookUrl: formData.get("webhookUrl") || undefined
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the task details.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch(`/agents/${activeAgent.id}/assign`, {
        method: "POST",
        json: {
          title: parsed.data.title,
          action: parsed.data.action,
          payload: {
            instructions: parsed.data.instructions,
            context: parsed.data.context,
            sourceType: "manual",
            webhookUrl: parsed.data.webhookUrl || undefined
          }
        }
      });
      form.reset();
      await onAssigned();
    } catch (assignError) {
      setError(assignError instanceof ApiError ? assignError.message : "Unable to assign task.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="agent-form" onSubmit={handleSubmit} noValidate>
      <AgentModeNote label="Real assignment" mode="real">
        Tasks are logged before running. Outreach, webhooks, and external delivery stay governed by configured approval paths.
      </AgentModeNote>
      <div>
        <label htmlFor="agent-task-title">Task title</label>
        <input defaultValue={defaults?.title ?? "Research target account"} id="agent-task-title" name="title" placeholder="Research target account" required />
      </div>
      <div>
        <label htmlFor="agent-task-action">Action</label>
        <select id="agent-task-action" name="action" defaultValue={defaults?.action ?? "research"}>
          <option value="research">Research</option>
          <option value="sales_outreach">Sales outreach</option>
          <option value="automation_review">Automation review</option>
          <option value="chat_summary">Chat summary</option>
          <option value="general">General</option>
        </select>
      </div>
      <div>
        <label htmlFor="agent-task-instructions">Instructions</label>
        <textarea
          defaultValue={defaults?.instructions ?? "Find useful public details and summarize the next best action."}
          id="agent-task-instructions"
          name="instructions"
          placeholder="What should this agent do?"
          rows={4}
          required
        />
      </div>
      <div>
        <label htmlFor="agent-task-context">Context</label>
        <textarea id="agent-task-context" name="context" placeholder="Optional context from chat, automation, or tasks" rows={3} />
      </div>
      <div>
        <label htmlFor="agent-task-webhook">Webhook URL</label>
        <input id="agent-task-webhook" name="webhookUrl" placeholder="https://hooks.example.com/agent-task" type="url" />
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting || !activeAgent}>
        <Send aria-hidden="true" size={20} />
        {isSubmitting ? "Assigning..." : "Assign task"}
      </Button>
    </form>
  );
}

export function AgentScheduleForm({ activeAgent, defaults, onScheduled }: AgentScheduleFormProps) {
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!activeAgent) {
      setError("Select an agent first.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = agentScheduleFormSchema.safeParse({
      title: formData.get("title"),
      action: formData.get("action"),
      instructions: formData.get("instructions"),
      context: formData.get("context") || undefined,
      intervalMinutes: formData.get("intervalMinutes"),
      runImmediately: formData.get("runImmediately") === "on",
      webhookUrl: formData.get("webhookUrl") || undefined
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the schedule details.");
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch(`/agents/${activeAgent.id}/schedules`, {
        method: "POST",
        json: {
          title: parsed.data.title,
          action: parsed.data.action,
          intervalMinutes: parsed.data.intervalMinutes,
          runImmediately: parsed.data.runImmediately,
          payload: {
            instructions: parsed.data.instructions,
            context: parsed.data.context,
            sourceType: "schedule",
            webhookUrl: parsed.data.webhookUrl || undefined
          }
        }
      });
      form.reset();
      await onScheduled();
    } catch (scheduleError) {
      setError(scheduleError instanceof ApiError ? scheduleError.message : "Unable to create schedule.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="agent-form" onSubmit={handleSubmit} noValidate>
      <AgentModeNote label="Scheduled work" mode="read-only">
        Schedules run under background-agent controls, policy checks, and audit logging. Sensitive actions require approval first.
      </AgentModeNote>
      <div>
        <label htmlFor="agent-schedule-title">Schedule title</label>
        <input defaultValue={defaults?.title ?? "Daily account pulse"} id="agent-schedule-title" name="title" placeholder="Daily account pulse" required />
      </div>
      <div>
        <label htmlFor="agent-schedule-action">Action</label>
        <select id="agent-schedule-action" name="action" defaultValue={defaults?.action ?? "research"}>
          <option value="research">Research</option>
          <option value="sales_outreach">Sales outreach</option>
          <option value="automation_review">Automation review</option>
          <option value="chat_summary">Chat summary</option>
          <option value="general">General</option>
        </select>
      </div>
      <div>
        <label htmlFor="agent-schedule-instructions">Instructions</label>
        <textarea
          defaultValue={defaults?.instructions ?? "Run a scheduled account check and summarize changes."}
          id="agent-schedule-instructions"
          name="instructions"
          placeholder="What should this agent do on schedule?"
          rows={4}
          required
        />
      </div>
      <div>
        <label htmlFor="agent-schedule-context">Context</label>
        <textarea id="agent-schedule-context" name="context" placeholder="Optional standing context" rows={3} />
      </div>
      <div>
        <label htmlFor="agent-schedule-webhook">Webhook URL</label>
        <input id="agent-schedule-webhook" name="webhookUrl" placeholder="https://hooks.example.com/schedule" type="url" />
      </div>
      <div>
        <label htmlFor="agent-schedule-interval">Interval minutes</label>
        <input defaultValue="15" id="agent-schedule-interval" min="1" name="intervalMinutes" type="number" />
      </div>
      <label className="check-row" htmlFor="agent-schedule-now">
        <input defaultChecked id="agent-schedule-now" name="runImmediately" type="checkbox" />
        Run once immediately
      </label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting || !activeAgent}>
        <Bot aria-hidden="true" size={20} />
        {isSubmitting ? "Scheduling..." : "Create schedule"}
      </Button>
    </form>
  );
}
