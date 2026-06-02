import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "../components/AppHeader";
import { ModeBadge, ModeStatusStrip, authenticatedModeItems } from "../components/ModeStatus";

vi.mock("next/navigation", () => ({
  usePathname: () => "/agents"
}));

describe("ModeStatus", () => {
  it("renders real, mock, and read-only workspace labels", () => {
    render(<ModeStatusStrip items={authenticatedModeItems} />);

    expect(screen.getByText("Real account")).toBeInTheDocument();
    expect(screen.getByText("Mock when disconnected")).toBeInTheDocument();
    expect(screen.getByText("Read-only until approved")).toBeInTheDocument();
  });

  it("can render a compact badge label", () => {
    render(<ModeBadge mode="mock">Mock Mode</ModeBadge>);

    expect(screen.getByText("Mock Mode")).toBeInTheDocument();
  });

  it("adds the mode strip to authenticated app headers", () => {
    render(<AppHeader title="Agent Management" subtitle="Create and review agents." />);

    expect(screen.getByRole("group", { name: "Authenticated workspace mode status" })).toHaveTextContent("Real account");
    expect(screen.getAllByRole("link", { name: "Agents" }).some((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });
});
