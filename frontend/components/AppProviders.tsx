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
  const isRouteFamily = (prefix: string) => pathname === prefix || pathname?.startsWith(`${prefix}/`);
  const usesFullMemberCommandCenter = ["/member/dashboard", "/member/graph", "/member/infrastructure"].some(isRouteFamily);

  if (pathname.startsWith("/member") && !usesFullMemberCommandCenter) {
    return (
      <ThemeProvider>
        <ClientErrorBoundary>{children}</ClientErrorBoundary>
      </ThemeProvider>
    );
  }

  if (usesFullMemberCommandCenter) {
    return (
      <ThemeProvider>
        <ToastProvider>
          <VoiceProvider>
            <ClientErrorBoundary>
              <OnboardingProvider>
                {children}
                <SettingsPanel hideTrigger surface="member" />
              </OnboardingProvider>
            </ClientErrorBoundary>
          </VoiceProvider>
        </ToastProvider>
      </ThemeProvider>
    );
  }

  const isPublicEntry = pathname === "/"
    || isRouteFamily("/forgot-password")
    || isRouteFamily("/login")
    || isRouteFamily("/onboarding")
    || isRouteFamily("/reset-password")
    || isRouteFamily("/signup")
    || isRouteFamily("/verify-email");
  const isMemberEntry = [
    "/admin",
    "/agents",
    "/automations",
    "/chat",
    "/dashboard",
    "/graph",
    "/infrastructure"
  ].some(isRouteFamily);
  const isUniverseGraph = isRouteFamily("/graph");

  const appChrome = isPublicEntry || !isMemberEntry ? children : (
    <>
      <SystemStatusBanner />
      <OnboardingProvider>
        {children}
        {isUniverseGraph ? null : <CommandPalette />}
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
