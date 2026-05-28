"use client";

import React, { type ReactNode } from "react";
import { CommandPalette } from "./CommandPalette";
import { NeedHelpButton } from "./NeedHelpButton";
import { OnboardingProvider } from "./OnboardingTour";
import { SettingsPanel } from "./SettingsPanel";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <ToastProvider>
        <OnboardingProvider>
          {children}
          <NeedHelpButton />
          <CommandPalette />
          <SettingsPanel />
        </OnboardingProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
