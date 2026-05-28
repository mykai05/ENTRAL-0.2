import React from "react";
import { CheckCircle2, CircleAlert, Clock3, Loader2, PauseCircle, XCircle } from "lucide-react";

type AutomationStatusProps = {
  status: string;
};

export function AutomationStatus({ status }: AutomationStatusProps) {
  const normalized = status.toLowerCase();

  if (normalized === "completed") {
    return (
      <span className="status-pill status-success" role="status">
        <CheckCircle2 aria-hidden="true" size={16} />
        Completed
      </span>
    );
  }

  if (normalized === "failed") {
    return (
      <span className="status-pill status-error" role="status">
        <XCircle aria-hidden="true" size={16} />
        Failed
      </span>
    );
  }

  if (normalized === "running") {
    return (
      <span className="status-pill status-running" role="status">
        <Loader2 aria-hidden="true" size={16} className="spin" />
        Running
      </span>
    );
  }

  if (normalized === "scheduled") {
    return (
      <span className="status-pill status-waiting" role="status">
        <Clock3 aria-hidden="true" size={16} />
        Scheduled
      </span>
    );
  }

  if (normalized === "canceled") {
    return (
      <span className="status-pill status-muted" role="status">
        <PauseCircle aria-hidden="true" size={16} />
        Canceled
      </span>
    );
  }

  return (
    <span className="status-pill status-waiting" role="status">
      <CircleAlert aria-hidden="true" size={16} />
      Pending
    </span>
  );
}
