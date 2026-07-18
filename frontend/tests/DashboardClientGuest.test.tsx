import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { DashboardClient } from "../components/DashboardClient";

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

describe("DashboardClient guest entry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([401, 404, 408, 502, 503])("opens the local command center when the backend returns %s", async (status) => {
    apiMocks.apiFetch.mockRejectedValue(new ApiError(status, "Backend unavailable", null));
    render(<DashboardClient />);

    expect(await screen.findByLabelText("ENTRAL Command Center")).toHaveTextContent("Local operator");
    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });
});
