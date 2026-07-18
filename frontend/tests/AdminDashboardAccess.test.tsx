import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "../components/AdminDashboard";
import { ApiError } from "../lib/api";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: mocks.apiFetch
}));

describe("AdminDashboard access state", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
  });

  it("hides governance write controls when the session is not authorized", async () => {
    mocks.apiFetch.mockRejectedValue(new ApiError(401, "Owner authentication required", null));
    render(<AdminDashboard />);

    expect(await screen.findByRole("heading", { name: "Admin access required" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause all agents" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create policy" })).not.toBeInTheDocument();
  });
});
