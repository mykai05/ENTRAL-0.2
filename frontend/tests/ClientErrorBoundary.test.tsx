import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClientErrorBoundary } from "../components/ClientErrorBoundary";

function BrokenView(): React.ReactElement | null {
  throw new Error("render failed");
}

describe("ClientErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a recovery surface instead of a blank screen", () => {
    const sendBeacon = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: sendBeacon
    });

    render(
      <ClientErrorBoundary>
        <BrokenView />
      </ClientErrorBoundary>
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Workspace recovered");
    expect(screen.getByText(/mock and read-only safeguards remain/i)).toBeInTheDocument();
    expect(sendBeacon).toHaveBeenCalled();
  });
});
