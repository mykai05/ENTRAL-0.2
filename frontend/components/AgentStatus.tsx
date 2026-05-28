import React from "react";
import { AlertTriangle, CheckCircle2, Loader2, PauseCircle } from "lucide-react";

type AgentStatusProps = {
  status: string;
};

export function AgentStatus({ status }: AgentStatusProps) {
  const normalized = status.toLowerCase();

  if (normalized === "busy") {
    return (
      <span className="status-pill status-running" role="status" aria-label="Agent status: Busy">
        <Loader2 aria-hidden="true" size={16} className="spin" />
        Busy
      </span>
    );
  }

  if (normalized === "paused") {
    return (
      <span className="status-pill status-muted" role="status" aria-label="Agent status: Paused">
        <PauseCircle aria-hidden="true" size={16} />
        Paused
      </span>
    );
  }

  if (normalized === "error") {
    return (
      <span className="status-pill status-error" role="status" aria-label="Agent status: Error">
        <AlertTriangle aria-hidden="true" size={16} />
        Error
      </span>
    );
  }

  return (
    <span className="status-pill status-success" role="status" aria-label="Agent status: Idle">
      <CheckCircle2 aria-hidden="true" size={16} />
      Idle
    </span>
  );
}
