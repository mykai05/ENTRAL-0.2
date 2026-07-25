import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { DashboardClient } from "../components/DashboardClient";
import { memberSignInPath } from "../lib/member";

const apiMocks = vi.hoisted(() => ({
  apiFetch: vi.fn()
}));

const navigationMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn()
}));

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: apiMocks.apiFetch
}));

vi.mock("next/navigation", () => ({
  useRouter: () => navigationMocks
}));

vi.mock("../components/NeuronsCommandCenter", () => ({
  NeuronsCommandCenter: ({ user }: { user?: { name?: string } | null }) => (
    <main aria-label="ENTRAL Command Center">
      {user?.name ?? "Local operator"}
    </main>
  )
}));

describe("DashboardClient protected entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects an unauthorized session to the canonical member sign-in", async () => {
    apiMocks.apiFetch.mockRejectedValue(new ApiError(401, "Unauthorized", null));
    render(<DashboardClient />);

    expect(await screen.findByText("Returning to verified account access...")).toBeInTheDocument();
    expect(navigationMocks.push).toHaveBeenCalledWith(memberSignInPath("/member/dashboard"));
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });

  it.each([404, 408, 502, 503])("shows an actionable error when the backend returns %s", async (status) => {
    apiMocks.apiFetch.mockRejectedValue(new ApiError(status, "Backend unavailable", null));
    render(<DashboardClient />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Backend unavailable");
    expect(screen.queryByLabelText("ENTRAL Command Center")).not.toBeInTheDocument();
    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });
});
