import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AutomationStatus } from "../components/AutomationStatus";

describe("AutomationStatus", () => {
  it("renders completed status text", () => {
    render(<AutomationStatus status="completed" />);

    expect(screen.getByRole("status")).toHaveTextContent("Completed");
  });

  it("renders running status text", () => {
    render(<AutomationStatus status="running" />);

    expect(screen.getByRole("status")).toHaveTextContent("Running");
  });
});
