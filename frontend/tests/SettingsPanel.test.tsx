import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsPanel } from "../components/SettingsPanel";

vi.mock("../components/ThemeProvider", () => ({
  neonPresets: [{ color: "#00f0ff", label: "Cyan" }],
  useTheme: () => ({
    settings: { accentColor: "#00f0ff", brightness: 1, saturation: 1 },
    updateSettings: vi.fn()
  })
}));

vi.mock("../components/OnboardingTour", () => ({
  useOnboarding: () => ({
    mode: "beginner",
    openLibrary: vi.fn(),
    openTour: vi.fn(),
    progress: { completed: 0, total: 4 },
    setMode: vi.fn()
  })
}));

vi.mock("../components/VoiceProvider", () => ({
  speechModeLabels: { full: "Full", reports: "Reports", silent: "Silent" },
  useVoice: () => ({
    isSpeechSupported: true,
    settings: { mode: "reports", pushToTalk: true, rate: 1, volume: 1, voiceURI: "", wakeWordEnabled: false },
    updateVoiceSettings: vi.fn(),
    voices: []
  })
}));

vi.mock("../components/AccountPrivacyControls", () => ({
  AccountPrivacyControls: () => <div>Privacy controls</div>
}));

describe("SettingsPanel", () => {
  it("shows only implemented settings controls", async () => {
    const user = userEvent.setup();
    render(<SettingsPanel />);

    await user.click(screen.getByRole("button", { name: "Open settings" }));

    expect(screen.queryByRole("tab", { name: "Command AI" })).not.toBeInTheDocument();
    expect(screen.queryByText("AI memory")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Account" }));

    expect(screen.getByLabelText("Profile name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });
});
