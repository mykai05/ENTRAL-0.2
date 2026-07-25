"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "../lib/api";
import { clearAuthenticatedUserSession } from "../lib/auth-session";
import { Logo } from "./Logo";
import type { MemberDestination } from "./MemberDestinationNav";
import { NeuronsCommandCenter } from "./NeuronsCommandCenter";

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
  organizationId: string;
  userId: string;
};

export function MemberCommandCenterClient({ initialDestination = "dashboard", organizationId, userId }: MemberCommandCenterClientProps) {
  const router = useRouter();
  const [isScopeReady, setIsScopeReady] = useState(false);

  useEffect(() => {
    const nextScope = `${userId}:${organizationId}`;

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
    window.dispatchEvent(new CustomEvent("entral:user-authenticated", {
      detail: { userId }
    }));
  }, [organizationId, userId]);

  async function handleLogout() {
    try {
      await apiFetch("/logout", { method: "POST" });
      clearAuthenticatedUserSession();
      router.replace("/member/sign-in");
      router.refresh();
    } catch {
      window.alert("Sign out could not be completed. Please try again.");
    }
  }

  if (!isScopeReady) {
    return (
      <main className="command-center-page command-center-loading" role="status" aria-live="polite">
        <Logo />
        <p>Booting ENTRAL command center...</p>
      </main>
    );
  }

  // A member session opens the exact approved Command Center presentation.
  // Passing a null internal operator prevents Command OS persistence and all
  // internal-only API access; the backend independently rejects member tokens
  // on those routes while local visual controls continue to work.
  return <NeuronsCommandCenter initialDestination={initialDestination} surface="member" user={null} onLogout={handleLogout} />;
}
