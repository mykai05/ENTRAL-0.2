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
  const isPublicEntry = pathname === "/" || pathname?.startsWith("/login") || pathname?.startsWith("/signup");

  const appChrome = isPublicEntry ? children : (
    <OnboardingProvider>
      {children}
      <CommandPalette />
      <SettingsPanel />
    </OnboardingProvider>
  );

  return (
    <ThemeProvider>
      <ToastProvider>
        <VoiceProvider>
          {appChrome}
        </VoiceProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
