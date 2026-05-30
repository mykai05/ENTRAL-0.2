import "@testing-library/jest-dom/vitest";
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingProvider } from "../components/OnboardingTour";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/dashboard",
  push: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ push: navigationMocks.push })
}));

const userId = "user-1";
const userAcademyKey = `entral-academy-state-v1:${encodeURIComponent(userId)}`;

function authenticateUser() {
  act(() => {
    window.dispatchEvent(new CustomEvent("entral:user-authenticated", {
      detail: {
        email: "operator@entral.local",
        userId
      }
    }));
  });
}

describe("OnboardingProvider", () => {
  beforeEach(() => {
    navigationMocks.pathname = "/dashboard";
    navigationMocks.push.mockClear();
    window.localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("waits for a signed-in user before opening the first-sign-in Academy", () => {
    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();

    authenticateUser();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByRole("dialog", { name: "ENTRAL Academy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start from ENTRAL", level: 2 })).toBeInTheDocument();
  });

  it("opens the tutorial library from the global event", () => {
    window.localStorage.setItem(userAcademyKey, JSON.stringify({ firstLaunchSeen: true, completedSteps: [], mode: "beginner" }));
    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    authenticateUser();

    act(() => {
      window.dispatchEvent(new Event("entral:open-academy"));
    });

    expect(screen.getByText("Tutorial library")).toBeInTheDocument();
    expect(screen.getByText("Quick Start")).toBeInTheDocument();
    expect(screen.getByText("Business Creation")).toBeInTheDocument();
  });

  it("persists advanced mode selection", async () => {
    window.localStorage.setItem(userAcademyKey, JSON.stringify({ firstLaunchSeen: true, completedSteps: [], mode: "beginner" }));
    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    authenticateUser();

    act(() => {
      window.dispatchEvent(new Event("entral:open-academy"));
    });

    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));

    expect(JSON.parse(window.localStorage.getItem(userAcademyKey) ?? "{}")).toMatchObject({ mode: "advanced" });
  });

  it("closes the Academy during a live walkthrough and returns to the same lesson", () => {
    window.localStorage.setItem(userAcademyKey, JSON.stringify({ firstLaunchSeen: true, completedSteps: [], mode: "beginner" }));
    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    authenticateUser();

    act(() => {
      window.dispatchEvent(new Event("entral:open-tutorial"));
    });

    fireEvent.click(screen.getByRole("button", { name: "Show me" }));

    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Start from ENTRAL walkthrough" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Return to Academy" }));

    expect(screen.getByRole("dialog", { name: "ENTRAL Academy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start from ENTRAL", level: 2 })).toBeInTheDocument();
  });
});
