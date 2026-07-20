"use client";

import React, { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ClientErrorBoundary } from "./ClientErrorBoundary";
import { CommandPalette } from "./CommandPalette";
import { OnboardingProvider } from "./OnboardingTour";
import { SettingsPanel } from "./SettingsPanel";
import { SystemStatusBanner } from "./SystemStatusBanner";
import { ThemeProvider } from "./ThemeProvider";
import { ToastProvider } from "./ToastProvider";
import { VoiceProvider } from "./VoiceProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const usesFullCommandCenter = pathname === "/member/dashboard" || pathname.startsWith("/member/dashboard/");

  if (pathname.startsWith("/member") && !usesFullCommandCenter) {
    return (
      <ThemeProvider>
        <ClientErrorBoundary>{children}</ClientErrorBoundary>
      </ThemeProvider>
    );
  }

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
