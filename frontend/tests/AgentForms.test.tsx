import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentCreateForm, AgentScheduleForm, AgentTaskForm, type Agent } from "../components/AgentForms";

const activeAgent: Agent = {
  capabilities: ["research"],
  id: "agent_1",
  isPaused: false,
  lastActivitySeenAt: null,
  load: 0,
  name: "Researcher",
  role: "Research and summarize",
  runInBackground: true,
  status: "idle"
};

describe("AgentForms safety labels", () => {
  it("labels saved agent configuration as real account work", () => {
    render(<AgentCreateForm onCreated={() => undefined} />);

    expect(screen.getByText("Real config")).toBeInTheDocument();
    expect(screen.getByText(/External tool use still depends on connection state/i)).toBeInTheDocument();
  });

  it("labels task assignment guardrails", () => {
    render(<AgentTaskForm activeAgent={activeAgent} onAssigned={async () => undefined} />);

    expect(screen.getByText("Real assignment")).toBeInTheDocument();
    expect(screen.getByText(/approval paths/i)).toBeInTheDocument();
  });

  it("uses scheduled-work language instead of autonomous defaults", () => {
    render(<AgentScheduleForm activeAgent={activeAgent} onScheduled={async () => undefined} />);

    expect(screen.getByText("Scheduled work")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Run a scheduled account check and summarize changes.")).toBeInTheDocument();
    expect(screen.queryByDisplayValue(/autonomous/i)).not.toBeInTheDocument();
  });
});
