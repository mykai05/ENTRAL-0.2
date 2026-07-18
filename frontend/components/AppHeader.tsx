"use client";

import Link from "next/link";
import React, { type ReactNode, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { ModeStatusStrip, authenticatedModeItems, localModeItems } from "./ModeStatus";
import { readAuthenticatedUserSession } from "../lib/auth-session";

type AppHeaderProps = {
  actions?: ReactNode;
  subtitle: string;
  title: string;
};

const navItems = [
  { href: "/dashboard", label: "Command Center" },
  { href: "/chat", label: "Communications" },
  { href: "/automations", label: "Automations" },
  { href: "/agents", label: "Agents" }
];

function readSessionRole() {
  return readAuthenticatedUserSession()?.role ?? null;
}

function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...navItems, { href: "/admin", label: "Governance" }] : navItems;

  return (
    <>
      {items.map((item) => (
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
  const [sessionRole, setSessionRole] = useState<string | null>(null);

  useEffect(() => {
    setSessionRole(readSessionRole());

    function handleAuthenticated(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { role?: string } | undefined : undefined;
      setSessionRole(detail?.role ?? readSessionRole());
    }

    function handleSignedOut() {
      setSessionRole(null);
    }

    window.addEventListener("entral:user-authenticated", handleAuthenticated);
    window.addEventListener("entral:user-signed-out", handleSignedOut);
    return () => {
      window.removeEventListener("entral:user-authenticated", handleAuthenticated);
      window.removeEventListener("entral:user-signed-out", handleSignedOut);
    };
  }, []);

  const isAuthenticated = sessionRole === "USER" || sessionRole === "ADMIN";
  const isAdmin = sessionRole === "ADMIN";

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
        <NavLinks isAdmin={isAdmin} />
      </nav>
      <details className="mobile-nav">
        <summary aria-label="Open navigation menu">
          <Menu aria-hidden="true" size={18} />
          Menu
        </summary>
        <nav aria-label="Mobile navigation">
          <NavLinks isAdmin={isAdmin} />
        </nav>
      </details>
      {actions ? <div className="nav-actions">{actions}</div> : null}
      <ModeStatusStrip
        ariaLabel={isAuthenticated ? "Authenticated workspace mode status" : "Local workspace mode status"}
        className="app-mode-strip"
        compact
        items={isAuthenticated ? authenticatedModeItems : localModeItems}
      />
    </header>
  );
}
