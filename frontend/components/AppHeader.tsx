"use client";

import Link from "next/link";
import React, { type ReactNode } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { ModeStatusStrip, authenticatedModeItems } from "./ModeStatus";

type AppHeaderProps = {
  actions?: ReactNode;
  subtitle: string;
  title: string;
};

const navItems = [
  { href: "/dashboard", label: "Command Center" },
  { href: "/chat", label: "Communications" },
  { href: "/automations", label: "Automations" },
  { href: "/agents", label: "Agents" },
  { href: "/admin", label: "Governance" }
];

function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {navItems.map((item) => (
        <Link
          aria-current={pathname.startsWith(item.href) ? "page" : undefined}
          className={pathname.startsWith(item.href) ? "app-nav-link active" : "app-nav-link"}
          href={item.href}
          key={item.href}
        >
          {item.label}
        </Link>
      ))}
    </>
  );
}

export function AppHeader({ actions, subtitle, title }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-main">
        <BrandMark />
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <nav className="app-nav" aria-label="Primary navigation">
        <NavLinks />
      </nav>
      <details className="mobile-nav">
        <summary aria-label="Open navigation menu">
          <Menu aria-hidden="true" size={18} />
          Menu
        </summary>
        <nav aria-label="Mobile navigation">
          <NavLinks />
        </nav>
      </details>
      {actions ? <div className="nav-actions">{actions}</div> : null}
      <ModeStatusStrip
        ariaLabel="Authenticated workspace mode status"
        className="app-mode-strip"
        compact
        items={authenticatedModeItems}
      />
    </header>
  );
}
