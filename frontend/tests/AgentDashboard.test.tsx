import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDashboard } from "../components/AgentDashboard";
import { apiFetch } from "../lib/api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;

    constructor(message: string, status = 500) {
      super(message);
      this.status = status;
    }
  },
  apiFetch: vi.fn()
}));

vi.mock("../components/AgentForms", () => ({
  AgentCreateForm: () => <div>Create agent</div>,
  AgentScheduleForm: () => <div>Schedule agent</div>,
  AgentTaskForm: () => <div>Assign task</div>
}));
vi.mock("../components/AgentList", () => ({ AgentList: () => <div>Agent list</div> }));
vi.mock("../components/AgentDetail", () => ({ AgentDetail: () => <div>Agent detail</div> }));
vi.mock("../components/AgentTemplateGallery", () => ({ AgentTemplateGallery: () => <div>Templates</div> }));
vi.mock("../components/CurlSnippet", () => ({ CurlSnippet: () => null }));
vi.mock("../components/DataPortability", () => ({ DataPortability: () => null }));

const agent = {
  id: "agent-1",
  name: "Researcher",
  role: "research",
  status: "RUNNING",
  capabilities: ["research"],
  runInBackground: true
};

describe("AgentDashboard", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(apiFetch).mockImplementation(async (path) => {
      if (path === "/agents") return { items: [agent] };
      if (path === `/agents/${agent.id}`) {
        return {
          agent,
          logs: [],
          messages: [],
          schedules: [],
          tasks: [{ id: "task-1", status: "running", title: "Research target" }]
        };
      }
      throw new Error(`Unexpected API path: ${path}`);
    });
  });

  it("uses one sidebar toggle and never cancels work on Escape", async () => {
    const user = userEvent.setup();
    render(<AgentDashboard />);

    await screen.findByText("Agent detail");
    expect(screen.getAllByRole("button", { name: "Hide agents" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Close agents sidebar" })).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(vi.mocked(apiFetch).mock.calls.some(([path]) => String(path).includes("/cancel"))).toBe(false);
    });

    await user.click(screen.getByRole("button", { name: "Hide agents" }));
    expect(screen.getByRole("button", { name: "Show agents" })).toBeInTheDocument();
  });
});
