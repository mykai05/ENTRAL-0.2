"use client";

import React, { useEffect, useState } from "react";
import type { MemberOrganizationsResponse } from "@entral/contracts";
import { writeAuthenticatedUserIdentity } from "../lib/auth-session";
import { Logo } from "./Logo";
import { CanonicalMemberShell } from "./CanonicalMemberShell";
import type { MemberDestination } from "./MemberDestinationNav";

const memberScopeKey = "entral-member-command-center-scope";
const organizationLocalKeys = [
  "entral-command-center-controls",
  "entral-command-os-state-v1",
  "entral-command-os-state-v2",
  "entral-command-os-state-v3",
  "entral-command-os-state-updated-at",
  "entral-command-os-pre-marshal-backup"
] as const;

type MemberCommandCenterClientProps = {
  initialDestination?: MemberDestination;
  initialSession?: MemberOrganizationsResponse;
  organizationId?: string;
  userId?: string;
};

export function MemberCommandCenterClient({
  initialDestination = "dashboard",
  initialSession,
  organizationId,
  userId
}: MemberCommandCenterClientProps) {
  const [isScopeReady, setIsScopeReady] = useState(false);
  const session = initialSession ?? {
    organizations: organizationId ? [{
      id: organizationId,
      joinedAt: "1970-01-01T00:00:00.000Z",
      memberCount: 1,
      memberLimit: 5,
      name: "Entral organization",
      role: "MEMBER" as const,
      slug: "entral-organization"
    }] : [],
    user: {
      email: "member@entral.local",
      id: userId ?? "member",
      name: "Member"
    }
  };
  const activeOrganizationId = session.organizations[0]?.id ?? "";
  const activeUserId = session.user.id;

  useEffect(() => {
    const nextScope = `${activeUserId}:${activeOrganizationId}`;

    try {
      const previousScope = window.localStorage.getItem(memberScopeKey);
      if (previousScope && previousScope !== nextScope) {
        for (const key of organizationLocalKeys) {
          window.localStorage.removeItem(key);
        }
      }
      window.localStorage.setItem(memberScopeKey, nextScope);
    } catch {
      // The Command Center already degrades safely when browser storage is unavailable.
    }

    setIsScopeReady(true);
    const academyAuthTimer = window.setTimeout(() => {
      writeAuthenticatedUserIdentity({ userId: activeUserId });
    }, 0);

    return () => {
      window.clearTimeout(academyAuthTimer);
    };
  }, [activeOrganizationId, activeUserId]);

  if (!isScopeReady) {
    return (
      <main className="command-center-page command-center-loading" role="status" aria-live="polite">
        <Logo />
        <p>Booting ENTRAL command center...</p>
      </main>
    );
  }

  return <CanonicalMemberShell initialDestination={initialDestination} initialSession={session} />;
}
