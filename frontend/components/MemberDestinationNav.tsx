"use client";

import Link from "next/link";
import React from "react";
import { LayoutDashboard, Network, ServerCog } from "lucide-react";

export type MemberDestination = "dashboard" | "graph" | "infrastructure";

export const memberDestinations = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    id: "dashboard",
    label: "Dashboard"
  },
  {
    href: "/graph",
    icon: Network,
    id: "graph",
    label: "OPEN UNIVERSE GRAPH"
  },
  {
    href: "/infrastructure",
    icon: ServerCog,
    id: "infrastructure",
    label: "Infrastructure"
  }
] as const;

export function memberDestinationForPath(pathname: string): MemberDestination {
  if (pathname === "/graph" || pathname.startsWith("/graph/") || pathname === "/member/graph" || pathname.startsWith("/member/graph/")) return "graph";
  if (pathname === "/infrastructure" || pathname.startsWith("/infrastructure/") || pathname === "/member/infrastructure" || pathname.startsWith("/member/infrastructure/")) return "infrastructure";
  return "dashboard";
}

export function MemberDestinationNav({
  className = "",
  current,
  surface = "internal"
}: {
  className?: string;
  current: MemberDestination;
  surface?: "internal" | "member";
}) {
  return (
    <nav className={["member-destination-nav", className].filter(Boolean).join(" ")} data-academy="member-destinations" aria-label="Member destinations">
      {memberDestinations.map(({ href, icon: Icon, id, label }) => (
        <Link
          aria-current={current === id ? "page" : undefined}
          className={current === id ? "active" : ""}
          href={`${surface === "member" ? "/member" : ""}${href}`}
          key={id}
          scroll={false}
        >
          <Icon aria-hidden="true" size={17} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
