"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { NeuronsCommandCenter } from "./NeuronsCommandCenter";
import { clearAuthenticatedUserSession, writeAuthenticatedUserSession } from "../lib/auth-session";

type User = {
  email: string;
  id: string;
  name: string;
  role: "USER" | "ADMIN";
};

type DashboardResponse = {
  message: string;
  user: User;
};

const localModeStatuses = new Set([401, 404, 408, 502, 503]);

function displayName(name: string) {
  const trimmed = name.trim();
  return trimmed ? `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}` : "Operator";
}

export function DashboardClient() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setError("");
      const dashboard = await apiFetch<DashboardResponse>("/dashboard", { timeoutMs: 8000 });
      const nextUser = { ...dashboard.user, name: displayName(dashboard.user.name) };
      const authDetail = {
        email: nextUser.email,
        role: nextUser.role,
        userId: nextUser.id
      };
      setUser(nextUser);
      writeAuthenticatedUserSession(authDetail);
    } catch (loadError) {
      if (loadError instanceof ApiError && localModeStatuses.has(loadError.status)) {
        setUser(null);
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Unable to load Command Center.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    await apiFetch("/logout", { method: "POST" }).catch(() => null);
    clearAuthenticatedUserSession();
    router.replace("/dashboard");
    router.refresh();
  }

  if (isLoading) {
    return (
      <main className="command-center-page command-center-loading" role="status" aria-live="polite">
        <Logo />
        <Loader2 aria-hidden="true" size={28} className="spin" />
        <p>Booting ENTRAL command center...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="command-center-page command-center-loading" role="alert">
        <AlertTriangle aria-hidden="true" size={30} />
        <h1>Command center could not load.</h1>
        <p>{error}</p>
        <Button type="button" variant="secondary" onClick={() => {
          setIsLoading(true);
          void loadDashboard();
        }}>
          <RefreshCw aria-hidden="true" size={18} />
          Retry
        </Button>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="command-center-page command-center-loading" role="status" aria-live="polite">
        <Loader2 aria-hidden="true" size={28} className="spin" />
        <p>Returning to verified account access...</p>
      </main>
    );
  }

  return <NeuronsCommandCenter user={user} onLogout={handleLogout} />;
}
