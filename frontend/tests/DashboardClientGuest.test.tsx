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
    apiMocks.apiFetch.mockRejectedValue(new ApiError(401, "Unauthorized", null));
  });

  it("opens the local command center instead of redirecting to account creation", async () => {
    render(<DashboardClient />);

    expect(await screen.findByLabelText("ENTRAL Command Center")).toHaveTextContent("Local operator");
    expect(navigationMocks.push).not.toHaveBeenCalled();
    expect(navigationMocks.replace).not.toHaveBeenCalled();
  });
});
