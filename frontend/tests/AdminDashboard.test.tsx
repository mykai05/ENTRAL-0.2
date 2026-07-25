import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminDashboard } from "../components/AdminDashboard";
import { ApiError, apiFetch } from "../lib/api";

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    details: unknown;

    constructor(status: number, message: string, details: unknown) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.details = details;
    }
  },
  apiFetch: vi.fn()
}));

vi.mock("../components/CurlSnippet", () => ({ CurlSnippet: () => null }));

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("fails closed without exposing administrative writes after a non-admin response", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new ApiError(403, "Admin access is required.", null));

    render(<AdminDashboard />);

    expect(await screen.findByRole("status")).toHaveTextContent("Admin access required");
    expect(screen.getByRole("status")).toHaveTextContent("Admin access is required.");
    expect(screen.queryByRole("button", { name: "Pause all agents" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create policy" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Name" })).not.toBeInTheDocument();
  });
});
