"use client";

import React from "react";
import { Bot } from "lucide-react";
import { AgentStatus } from "./AgentStatus";
import type { Agent } from "./AgentForms";
import { SkeletonList } from "./Skeleton";

type AgentListProps = {
  agents: Agent[];
  activeAgentId: string | null;
  isLoading?: boolean;
  onSelect: (agentId: string) => void;
};

export function AgentList({ agents, activeAgentId, isLoading = false, onSelect }: AgentListProps) {
  if (isLoading) {
    return <SkeletonList count={4} label="Loading agents" />;
  }

  if (agents.length === 0) {
    return (
      <div className="empty-state empty-state-cta">
        <Bot aria-hidden="true" size={28} />
        <div>
          <strong>No agents yet.</strong>
          <p>Use a preset below or create one focused execution unit to start orchestration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-list" aria-label="Agents">
      {agents.map((agent) => (
        <button
          className={agent.id === activeAgentId ? "agent-item active" : "agent-item"}
          key={agent.id}
          onClick={() => onSelect(agent.id)}
          type="button"
        >
          <span>
            <strong>{agent.name}</strong>
            <AgentStatus status={agent.status} />
          </span>
          <p>{agent.role}</p>
          <small>{agent.runInBackground ? "Background on" : "Background off"} - {agent.load} active task{agent.load === 1 ? "" : "s"}</small>
        </button>
      ))}
    </div>
  );
}
