"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type HealthPayload = {
  backend?: {
    configured?: boolean;
    error?: string;
    ok?: boolean;
    status?: number | null;
  };
  frontend?: {
    ok?: boolean;
  };
  ok?: boolean;
  requestId?: string;
};

type SystemStatus = {
  message: string;
  requestId?: string;
  state: "checking" | "healthy" | "degraded";
};

export function SystemStatusBanner() {
  const [status, setStatus] = useState<SystemStatus>({ message: "", state: "checking" });
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);

    async function checkHealth() {
      try {
        const response = await fetch("/health", {
          cache: "no-store",
          headers: { accept: "application/json" },
          signal: controller.signal
        });
        const payload = await response.json().catch(() => null) as HealthPayload | null;

        if (response.ok && payload?.ok) {
          setStatus({ message: "", state: "healthy" });
          return;
        }

        const backendStatus = payload?.backend?.status ? `Backend status ${payload.backend.status}.` : "Backend health is unavailable.";
        setStatus({
          message: `${backendStatus} Real account actions may fail; disconnected systems remain mock/read-only until health returns.`,
          requestId: payload?.requestId ?? response.headers.get("x-request-id") ?? undefined,
          state: "degraded"
        });
      } catch (error) {
        setStatus({
          message: error instanceof Error && error.name === "AbortError"
            ? "Health check timed out. Real account actions may be delayed; mock/read-only safeguards remain visible."
            : "Health check failed. Real account actions may be unavailable; mock/read-only safeguards remain visible.",
          state: "degraded"
        });
      } finally {
        window.clearTimeout(timeout);
      }
    }

    void checkHealth();

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [refreshIndex]);

  if (status.state !== "degraded") {
    return null;
  }

  return (
    <aside className="system-status-banner" role="status" aria-live="polite">
      <AlertTriangle aria-hidden="true" size={18} />
      <div>
        <strong>System health degraded</strong>
        <span>{status.message}</span>
        {status.requestId ? <code>Request {status.requestId}</code> : null}
      </div>
      <button type="button" onClick={() => setRefreshIndex((current) => current + 1)}>
        <RefreshCw aria-hidden="true" size={15} />
        Retry
      </button>
    </aside>
  );
}
