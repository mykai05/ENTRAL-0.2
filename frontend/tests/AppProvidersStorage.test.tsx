import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../components/AppProviders";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/dashboard"
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock("../components/SystemStatusBanner", () => ({
  SystemStatusBanner: () => null
}));

describe("AppProviders storage resilience", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the command-center shell even when browser storage is blocked", () => {
    navigationMocks.pathname = "/dashboard";
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    render(
      <AppProviders>
        <main>
          <h1>Entral command center</h1>
        </main>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: "Entral command center" })).toBeInTheDocument();
  });
});
