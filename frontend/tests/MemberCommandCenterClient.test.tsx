import "@testing-library/jest-dom/vitest";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemberCommandCenterClient } from "../components/MemberCommandCenterClient";
import { OnboardingProvider } from "../components/OnboardingTour";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn()
}));

const api = vi.hoisted(() => ({
  apiFetch: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/member/dashboard",
  useRouter: () => navigation
}));

vi.mock("../lib/api", () => ({
  apiFetch: api.apiFetch
}));

vi.mock("../components/NeuronsCommandCenter", () => ({
  NeuronsCommandCenter: ({ onLogout }: { onLogout: () => Promise<void> }) => React.createElement(
    "main",
    null,
    React.createElement("p", null, "Member command center"),
    React.createElement("button", { onClick: onLogout, type: "button" }, "Sign out")
  )
}));

describe("MemberCommandCenterClient authentication handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("persists only the server-validated member identity before publishing the Academy auth event", async () => {
    let authDetail: unknown = null;
    const handleAuthenticated = (event: Event) => {
      authDetail = event instanceof CustomEvent ? event.detail : null;
    };
    window.addEventListener("entral:user-authenticated", handleAuthenticated);

    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
    });

    const storedIdentity = JSON.parse(window.sessionStorage.getItem("entral-authenticated-user") ?? "null");
    expect(storedIdentity).toEqual({ userId: "user-1" });
    expect(authDetail).toEqual({ userId: "user-1" });
    expect(storedIdentity).not.toHaveProperty("email");
    expect(storedIdentity).not.toHaveProperty("role");
    expect(storedIdentity).not.toHaveProperty("token");

    window.removeEventListener("entral:user-authenticated", handleAuthenticated);
  });

  it("opens Academy from the real provider hierarchy without redirecting the authenticated member", async () => {
    render(
      <OnboardingProvider>
        <MemberCommandCenterClient
          organizationId="organization-1"
          userId="user-1"
        />
      </OnboardingProvider>
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
    });
    act(() => {
      window.dispatchEvent(new Event("entral:open-academy"));
    });

    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "ENTRAL Academy" })).toBeInTheDocument();
    expect(screen.getByText("Tutorial library")).toBeInTheDocument();
  });

  it("opens Academy from the real provider hierarchy when browser storage is blocked", async () => {
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
        <MemberCommandCenterClient
          organizationId="organization-1"
          userId="user-1"
        />
      </OnboardingProvider>
    );

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 10));
    });
    act(() => {
      window.dispatchEvent(new Event("entral:open-academy"));
    });

    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "ENTRAL Academy" })).toBeInTheDocument();
    expect(screen.getByText("Tutorial library")).toBeInTheDocument();
  });

  it("clears the published identity only after backend sign-out succeeds", async () => {
    api.apiFetch.mockResolvedValueOnce({ ok: true });
    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/member/sign-in");
    });
    expect(api.apiFetch).toHaveBeenCalledWith("/logout", { method: "POST" });
    expect(window.sessionStorage.getItem("entral-authenticated-user")).toBeNull();
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("preserves the valid identity when backend sign-out fails", async () => {
    api.apiFetch.mockRejectedValueOnce(new Error("sign-out unavailable"));
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Sign out could not be completed. Please try again.");
    });
    expect(window.sessionStorage.getItem("entral-authenticated-user")).toBe(JSON.stringify({ userId: "user-1" }));
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
