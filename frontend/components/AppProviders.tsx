"use client";

import React, { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CommandPalette } from "./CommandPalette";
import { OnboardingProvider } from "./OnboardingTour";
import { SettingsPanel } from "./SettingsPanel";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { VoiceProvider } from "./VoiceProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthScreen = pathname === "/login" || pathname === "/signup";

  return (
    <ThemeProvider>
      <ToastProvider>
        <VoiceProvider>
          <OnboardingProvider>
            {children}
            {isAuthScreen ? null : (
              <>
                <CommandPalette />
                <SettingsPanel />
              </>
            )}
          </OnboardingProvider>
        </VoiceProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
