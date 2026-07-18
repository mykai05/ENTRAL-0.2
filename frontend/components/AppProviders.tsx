"use client";

import React, { type ReactNode } from "react";
import { ClientErrorBoundary } from "./ClientErrorBoundary";
import { CommandPalette } from "./CommandPalette";
import { OnboardingProvider } from "./OnboardingTour";
import { SettingsPanel } from "./SettingsPanel";
import { SystemStatusBanner } from "./SystemStatusBanner";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { VoiceProvider } from "./VoiceProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  const appChrome = (
    <>
      <SystemStatusBanner />
      <OnboardingProvider>
        {children}
        <CommandPalette />
        <SettingsPanel />
      </OnboardingProvider>
    </>
  );

  return (
    <ThemeProvider>
      <ToastProvider>
        <VoiceProvider>
          <ClientErrorBoundary>{appChrome}</ClientErrorBoundary>
        </VoiceProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
