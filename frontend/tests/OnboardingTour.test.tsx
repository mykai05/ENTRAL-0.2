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
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
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

  it("lets a first-time user enter the Command Center without completing the tutorial", () => {
    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    authenticateUser();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    fireEvent.click(screen.getByRole("button", { name: "Enter Command Center" }));

    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(userAcademyKey) ?? "{}")).toMatchObject({ firstLaunchSeen: true });
  });

  it("keeps Academy dismissed if a late auth handoff repeats after the user enters Command Center", () => {
    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    authenticateUser();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    fireEvent.click(screen.getByRole("button", { name: "Enter Command Center" }));
    authenticateUser();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(userAcademyKey) ?? "{}")).toMatchObject({ firstLaunchSeen: true });
  });

  it("does not reopen from a stale first-launch timer after dismissal", () => {
    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    authenticateUser();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    fireEvent.click(screen.getByRole("button", { name: "Enter Command Center" }));

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(userAcademyKey) ?? "{}")).toMatchObject({ firstLaunchSeen: true });
  });

  it("does not interrupt if the operator acts before the first-launch Academy opens", () => {
    render(
      <OnboardingProvider>
        <main className="command-center-page">
          <input aria-label="Command input" />
        </main>
      </OnboardingProvider>
    );

    authenticateUser();

    fireEvent.input(screen.getByLabelText("Command input"), { target: { value: "Add Merch Marshal" } });

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(userAcademyKey) ?? "{}")).toMatchObject({ firstLaunchSeen: true });
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

  it("recovers first-sign-in Academy when the auth event happened before the provider mounted", () => {
    window.sessionStorage.setItem("entral-authenticated-user", JSON.stringify({
      email: "operator@entral.local",
      userId
    }));

    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByRole("dialog", { name: "ENTRAL Academy" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Start from ENTRAL", level: 2 })).toBeInTheDocument();
  });

  it("does not trap users when browser storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    render(
      <OnboardingProvider>
        <button data-academy="command-brand" type="button">ENTRAL</button>
      </OnboardingProvider>
    );

    authenticateUser();

    act(() => {
      vi.advanceTimersByTime(700);
    });

    expect(screen.getByRole("dialog", { name: "ENTRAL Academy" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Enter Command Center" }));

    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ENTRAL" })).toBeInTheDocument();
  });
});
