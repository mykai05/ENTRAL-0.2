"use client";

import { BookOpen, BriefcaseBusiness, LayoutDashboard, Network, ServerCog } from "lucide-react";
import Link from "next/link";
import React from "react";

export type Phase200InteractionDestination = "businesses" | "command" | "infrastructure" | "tutorial" | "universe";

export const phase200InteractionDestinations = [
  { href: "/member/dashboard", icon: LayoutDashboard, id: "command", label: "Command" },
  { href: "/member/dashboard?destination=businesses", icon: BriefcaseBusiness, id: "businesses", label: "Businesses" },
  { href: "/member/graph", icon: Network, id: "universe", label: "Universe" },
  { href: "/member/infrastructure", icon: ServerCog, id: "infrastructure", label: "Infrastructure" },
  { href: "/member/dashboard?destination=tutorial", icon: BookOpen, id: "tutorial", label: "Tutorial" }
] as const;

function destinationHref(href: string, businessScopeId: string | null | undefined) {
  if (!businessScopeId) return href;
  return `${href}${href.includes("?") ? "&" : "?"}business=${encodeURIComponent(businessScopeId)}`;
}

export function Phase200InteractionNavigation({
  businessScopeId,
  current,
  role
}: {
  readonly businessScopeId?: string | null;
  readonly current: Phase200InteractionDestination;
  readonly role: "MEMBER" | "OWNER";
}) {
  return (
    <nav
      aria-label={`${role === "OWNER" ? "Owner" : "Member"} primary destinations`}
      className="member-destination-nav phase200-interaction-navigation"
      data-academy="member-destinations"
      data-member-role={role}
    >
      {phase200InteractionDestinations.map(({ href, icon: Icon, id, label }) => (
        <Link
          aria-current={current === id ? "page" : undefined}
          className={current === id ? "active" : ""}
          data-phase200-destination={id}
          href={destinationHref(href, businessScopeId)}
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
