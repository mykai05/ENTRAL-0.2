import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: {
    follow: false,
    index: false,
    noarchive: true,
    nocache: true
  }
};

export default function MemberLayout({ children }: { children: ReactNode }) {
  return children;
}
