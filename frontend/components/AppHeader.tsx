"use client";

import React, { type ReactNode, useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandMark } from "./BrandMark";
import { MemberDestinationNav, memberDestinationForPath } from "./MemberDestinationNav";
import { ModeStatusStrip, authenticatedModeItems, localModeItems } from "./ModeStatus";
import { readAuthenticatedUserSession } from "../lib/auth-session";

type AppHeaderProps = {
  actions?: ReactNode;
  subtitle: string;
  title: string;
};

function readSessionRole() {
  return readAuthenticatedUserSession()?.role ?? null;
}

function NavLinks() {
  const pathname = usePathname();
  return <MemberDestinationNav current={memberDestinationForPath(pathname)} />;
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

  return (
    <header className="app-header">
      <div className="app-header-main">
        <BrandMark />
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="app-nav">
        <NavLinks />
      </div>
      <details className="mobile-nav">
        <summary aria-label="Open navigation menu">
          <Menu aria-hidden="true" size={18} />
          Menu
        </summary>
        <div>
          <NavLinks />
        </div>
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
