import type { Metadata } from "next";
import React from "react";
import type { ReactNode } from "react";
import { AppProviders } from "../components/AppProviders";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  applicationName: "Entral",
  title: {
    default: "Entral",
    template: "%s | Entral"
  },
  description: "A clean autonomous workspace for AI chat, tasks, agents, and governance.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "Entral",
    description: "AI chat, automation tasks, multi-agent orchestration, and governance in one launch-ready workspace.",
    images: [{ url: "/icon.svg", width: 512, height: 512, alt: "Entral geometric E network logo" }],
    siteName: "Entral",
    type: "website"
  },
  robots: {
    follow: true,
    index: true
  },
  twitter: {
    card: "summary",
    title: "Entral",
    description: "AI chat, automation tasks, multi-agent orchestration, and governance.",
    images: ["/icon.svg"]
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark" data-theme="dark">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
