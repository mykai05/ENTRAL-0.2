import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../components/AppProviders";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/login"
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ push: vi.fn() })
}));

describe("AppProviders storage resilience", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders public entry pages even when browser storage is blocked", () => {
    navigationMocks.pathname = "/login";
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    render(
      <AppProviders>
        <main>
          <h1>Sign in to ENTRAL</h1>
        </main>
      </AppProviders>
    );

    expect(screen.getByRole("heading", { name: "Sign in to ENTRAL" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /settings/i })).not.toBeInTheDocument();
  });
});
