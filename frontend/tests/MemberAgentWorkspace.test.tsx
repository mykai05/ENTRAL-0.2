import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemberAgentWorkspace } from "../components/MemberAgentWorkspace";

const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));
vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: api.apiFetch
}));

const result = {
  id: "entral-12345678",
  organizationId: "org-1",
  requestedBy: "user-1",
  kind: "business_discovery" as const,
  request: {},
  createdAt: "2026-07-19T00:00:00.000Z",
  result: {
    status: "completed" as const,
    mode: "business_type_radius" as const,
    search_summary: "Found one verified contractor.",
    businesses: [{
      name: "North Star Builders", business_type: "General contractor", city: "San Diego", region: "California",
      confidence: "high" as const, website: "https://example.com", match_basis: "Verified on the company website.",
      sources: [{ title: "Company website", url: "https://example.com", source_type: "company_website" }]
    }],
    source_coverage: ["Company websites"],
    limitations: ["Public sources may be incomplete."],
    next_command_action: "Review before outreach."
  }
};

describe("MemberAgentWorkspace", () => {
  const availability = {
    executionEnabled: true,
    agents: [{ agentId: "business_discovery", state: "service_live" }]
  };

  beforeEach(() => {
    vi.clearAllMocks();
    api.apiFetch.mockResolvedValue({ availability, runs: [] });
    vi.stubGlobal("crypto", { randomUUID: () => "12345678-1234-1234-1234-123456789012" });
  });

  it("runs a real owner discovery request and renders cited results", async () => {
    const user = userEvent.setup();
    api.apiFetch
      .mockResolvedValueOnce({ availability, runs: [] })
      .mockResolvedValueOnce({ stored: true, run: result });
    render(<MemberAgentWorkspace organizationId="org-1" organizationName="North Star Works" role="OWNER" />);
    await screen.findByText(/No research runs yet/);

    await user.type(screen.getByLabelText("Business type"), "General contractors");
    await user.type(screen.getByLabelText("City"), "San Diego");
    await user.selectOptions(screen.getByLabelText("Radius"), "10");
    await user.click(screen.getByRole("button", { name: "Run business discovery" }));

    await waitFor(() => expect(api.apiFetch).toHaveBeenLastCalledWith(
      "/api/member/organizations/org-1/agent-runs",
      expect.objectContaining({ method: "POST", sameOrigin: true, timeoutMs: 295000 })
    ));
    expect(await screen.findByText("North Star Builders")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Company website/ })[0]).toHaveAttribute("href", "https://example.com");
    expect(screen.getByText("Review before outreach.")).toBeInTheDocument();
  });

  it("lets non-owners review history without showing the execution form", async () => {
    api.apiFetch.mockResolvedValue({ availability, runs: [result] });
    render(<MemberAgentWorkspace organizationId="org-1" organizationName="North Star Works" role="MEMBER" />);
    expect(await screen.findByText("North Star Builders")).toBeInTheDocument();
    expect(screen.getByText(/Organization owners can start research/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run business discovery" })).not.toBeInTheDocument();
  });

  it("requires either named companies or a complete category and city", async () => {
    const user = userEvent.setup();
    render(<MemberAgentWorkspace organizationId="org-1" organizationName="North Star Works" role="OWNER" />);
    const submit = await screen.findByRole("button", { name: "Run business discovery" });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/Specific businesses/), "Acme Construction");
    expect(submit).toBeEnabled();
  });

  it("truthfully disables execution when the production agent service is unavailable", async () => {
    api.apiFetch.mockResolvedValue({ availability: { agents: [], executionEnabled: false }, runs: [] });
    const user = userEvent.setup();
    render(<MemberAgentWorkspace organizationId="org-1" organizationName="North Star Works" role="OWNER" />);
    await screen.findByText("Execution unavailable");
    await user.type(screen.getByLabelText(/Specific businesses/), "Acme Construction");
    expect(screen.getByRole("button", { name: "Run business discovery" })).toBeDisabled();
    expect(screen.getByText(/safely disabled until the production agent service is healthy/i)).toBeInTheDocument();
  });

  it("reuses an execution key only for an unchanged retry request", async () => {
    const user = userEvent.setup();
    const randomUUID = vi.fn()
      .mockReturnValueOnce("11111111-1111-1111-1111-111111111111")
      .mockReturnValueOnce("22222222-2222-2222-2222-222222222222");
    vi.stubGlobal("crypto", { randomUUID });
    api.apiFetch
      .mockResolvedValueOnce({ availability, runs: [] })
      .mockRejectedValueOnce(new Error("Temporary upstream failure"))
      .mockResolvedValueOnce({ stored: true, run: result });

    render(<MemberAgentWorkspace organizationId="org-1" organizationName="North Star Works" role="OWNER" />);
    await screen.findByText(/No research runs yet/);
    const names = screen.getByLabelText(/Specific businesses/);
    await user.type(names, "Acme Construction");
    await user.click(screen.getByRole("button", { name: "Run business discovery" }));
    expect(await screen.findByText("Temporary upstream failure")).toBeInTheDocument();

    await user.type(names, "\nNorthwind Services");
    await user.click(screen.getByRole("button", { name: "Run business discovery" }));
    expect(await screen.findByText("North Star Builders")).toBeInTheDocument();

    const posts = api.apiFetch.mock.calls.filter(([, options]) => options?.method === "POST");
    expect(posts).toHaveLength(2);
    expect(posts[0]?.[1]?.json?.idempotencyKey).toBe("entral-11111111-1111-1111-1111-111111111111");
    expect(posts[1]?.[1]?.json?.idempotencyKey).toBe("entral-22222222-2222-2222-2222-222222222222");
  });
});
