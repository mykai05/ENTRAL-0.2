"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { NeuronsCommandCenter } from "./NeuronsCommandCenter";

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
      setUser(nextUser);
      window.dispatchEvent(new CustomEvent("entral:user-authenticated", {
        detail: {
          email: nextUser.email,
          userId: nextUser.id
        }
      }));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        router.push("/login?next=/dashboard");
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Unable to load dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function handleLogout() {
    await apiFetch("/logout", { method: "POST" }).catch(() => null);
    window.dispatchEvent(new Event("entral:user-signed-out"));
    router.push("/login");
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

  return <NeuronsCommandCenter user={user} onLogout={handleLogout} />;
}
