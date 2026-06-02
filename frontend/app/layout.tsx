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
  description: "An AI command center for organizing, planning, monitoring, and safely preparing business operations.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg"
  },
  openGraph: {
    title: "Entral",
    description: "An AI command center for organizing, planning, monitoring, and safely preparing business operations.",
    images: [{ url: "/icon.svg", width: 512, height: 512, alt: "Entral command emblem logo" }],
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
    description: "An AI command center for organizing, planning, monitoring, and safely preparing business operations.",
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
