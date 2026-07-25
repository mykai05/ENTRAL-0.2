import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "../components/DashboardClient";
import { ApiError } from "../lib/api";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    apiFetch: mocks.apiFetch
  };
});

vi.mock("../components/NeuronsCommandCenter", () => ({
  NeuronsCommandCenter: ({
    initialDestination,
    onLogout,
    user
  }: {
    initialDestination: string;
    onLogout: () => Promise<void>;
    user: { id: string; name: string };
  }) => (
    <main>
      <h1>Verified command graph</h1>
      <p>{user.id}:{user.name}:{initialDestination}</p>
      <button type="button" onClick={() => void onLogout()}>Log out</button>
    </main>
  )
}));

const dashboardResponse = {
  message: "ready",
  user: {
    email: "operator@entral.local",
    id: "user-1",
    name: "operator",
    role: "ADMIN" as const
  }
};

describe("DashboardClient authentication boundary", () => {
  afterEach(() => {
    mocks.apiFetch.mockReset();
    mocks.push.mockReset();
    mocks.refresh.mockReset();
    window.sessionStorage.clear();
  });

  it("shows the graph only after the authenticated dashboard request succeeds", async () => {
    mocks.apiFetch.mockResolvedValueOnce(dashboardResponse);

    render(<DashboardClient />);

    expect(screen.getByRole("status")).toHaveTextContent("Booting ENTRAL command center");
    expect(screen.queryByRole("heading", { name: "Verified command graph" })).not.toBeInTheDocument();

    expect(await screen.findByRole("heading", { name: "Verified command graph" })).toBeInTheDocument();
    expect(screen.getByText("user-1:Operator:dashboard")).toBeInTheDocument();
    expect(JSON.parse(window.sessionStorage.getItem("entral-authenticated-user") ?? "{}")).toEqual({
      email: "operator@entral.local",
      userId: "user-1"
    });
  });

  it("preserves the requested member destination through authentication", async () => {
    mocks.apiFetch.mockResolvedValueOnce(dashboardResponse);

    render(<DashboardClient initialDestination="infrastructure" />);

    expect(await screen.findByText("user-1:Operator:infrastructure")).toBeInTheDocument();
  });

  it("fails closed and redirects when the session is unauthorized", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new ApiError(401, "Unauthorized", null));

    render(<DashboardClient />);

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith("/onboarding?next=/dashboard");
    });

    expect(screen.queryByRole("heading", { name: "Verified command graph" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Returning to verified account access");
  });

  it("shows a retryable error without a graph for non-auth failures", async () => {
    mocks.apiFetch.mockRejectedValueOnce(new ApiError(503, "Backend unavailable", null));

    render(<DashboardClient />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend unavailable");
    expect(screen.queryByRole("heading", { name: "Verified command graph" })).not.toBeInTheDocument();
  });

  it("loads the graph after a successful retry", async () => {
    mocks.apiFetch
      .mockRejectedValueOnce(new ApiError(503, "Backend unavailable", null))
      .mockResolvedValueOnce(dashboardResponse);

    render(<DashboardClient />);

    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("heading", { name: "Verified command graph" })).toBeInTheDocument();
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
  });

  it("clears the local handoff and returns to sign-in on logout", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce(dashboardResponse)
      .mockResolvedValueOnce({ ok: true });
    window.history.replaceState(null, "", "/infrastructure?section=agents");

    render(<DashboardClient initialDestination="infrastructure" />);
    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(mocks.apiFetch).toHaveBeenLastCalledWith("/logout", { method: "POST" });
      expect(mocks.push).toHaveBeenCalledWith("/login?next=%2Finfrastructure%3Fsection%3Dagents");
      expect(mocks.refresh).toHaveBeenCalled();
    });
    expect(window.sessionStorage.getItem("entral-authenticated-user")).toBeNull();
  });

  it("keeps the local session intact when backend logout fails", async () => {
    mocks.apiFetch
      .mockResolvedValueOnce(dashboardResponse)
      .mockRejectedValueOnce(new ApiError(503, "Backend unavailable", null));
    window.history.replaceState(null, "", "/dashboard");

    render(<DashboardClient />);
    await screen.findByRole("heading", { name: "Verified command graph" });
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign out failed: Backend unavailable");
    expect(mocks.push).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
  });
});
