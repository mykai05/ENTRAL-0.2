import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthLoadingFallback } from "../components/AuthLoadingFallback";

describe("AuthLoadingFallback", () => {
  it("renders an accessible loading state for suspense-backed auth forms", () => {
    render(<AuthLoadingFallback label="Loading verification form..." />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading verification form...");
  });
});
