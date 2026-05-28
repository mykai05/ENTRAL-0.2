import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgentStatus } from "../components/AgentStatus";

describe("AgentStatus", () => {
  it("labels idle agents accessibly", () => {
    render(<AgentStatus status="idle" />);

    expect(screen.getByRole("status", { name: "Agent status: Idle" })).toHaveTextContent("Idle");
  });

  it("labels busy agents accessibly", () => {
    render(<AgentStatus status="busy" />);

    expect(screen.getByRole("status", { name: "Agent status: Busy" })).toHaveTextContent("Busy");
  });
});
