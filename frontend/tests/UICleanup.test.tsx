import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/Button";
import { SettingsPanel } from "../components/SettingsPanel";

const navigation = vi.hoisted(() => ({ pathname: "/agents" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={String(href)} {...props}>{children}</a>
}));

vi.mock("../components/ThemeProvider", () => ({
  neonPresets: [{ color: "#00f0ff", label: "Cyan" }],
  useTheme: () => ({ settings: { accentColor: "#00f0ff", brightness: 1, saturation: 1 }, updateSettings: vi.fn() })
}));

vi.mock("../components/OnboardingTour", () => ({
  useOnboarding: () => ({ mode: "beginner", openLibrary: vi.fn(), openTour: vi.fn(), progress: { completed: 0, total: 4 }, setMode: vi.fn() })
}));

vi.mock("../components/VoiceProvider", () => ({
  speechModeLabels: { silent: "Silent", reports: "Reports only", full: "Full voice" },
  useVoice: () => ({
    isSpeechSupported: true,
    settings: { mode: "reports", pushToTalk: true, rate: 1, volume: 1, voiceURI: "", wakeWordEnabled: true },
    updateVoiceSettings: vi.fn(),
    voices: []
  })
}));

vi.mock("../components/AccountPrivacyControls", () => ({ AccountPrivacyControls: () => <div>Privacy controls</div> }));

describe("Entral UI cleanup", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    navigation.pathname = "/agents";
  });

  it("uses safe button defaults and a canonical danger variant", () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });

    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveClass("button-danger");
  });

  it("shows truthful local mode and hides admin navigation without an admin session", async () => {
    render(<AppHeader title="Agents" subtitle="Manage agents." />);

    expect(await screen.findByText("Local workspace")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Governance" })).not.toBeInTheDocument();
  });

  it("shows governance navigation only for a confirmed admin session", async () => {
    window.sessionStorage.setItem("entral-authenticated-user", JSON.stringify({ role: "ADMIN" }));
    render(<AppHeader title="Governance" subtitle="Review controls." />);

    expect(await screen.findAllByRole("link", { name: "Governance" })).not.toHaveLength(0);
    expect(screen.getByText("Real account")).toBeInTheDocument();
  });

  it("removes dead password settings and restores focus when the dialog closes", async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);
    const trigger = screen.getByRole("button", { name: "Open settings" });

    trigger.focus();
    await user.click(trigger);
    expect(screen.getByRole("dialog", { name: "ENTRAL settings" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Account" }));

    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "ENTRAL settings" })).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
