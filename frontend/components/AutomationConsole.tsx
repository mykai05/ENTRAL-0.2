"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ApiError, apiFetch } from "../lib/api";
import { AutomationForm } from "./AutomationForm";
import { AutomationList, type AutomationJob } from "./AutomationList";
import { BrowserOperationsPanel } from "./BrowserOperationsPanel";
import { useToast } from "./ToastProvider";
import { clearAuthenticatedUserSession } from "../lib/auth-session";

type AutomationListResponse = {
  items: AutomationJob[];
};

type AutomationJobResponse = {
  job: AutomationJob;
};

function hasActiveJobs(jobs: AutomationJob[]) {
  return jobs.some((job) => job.status === "pending" || job.status === "scheduled" || job.status === "running");
}

export function AutomationConsole() {
  const { notify } = useToast();
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [accessState, setAccessState] = useState<"checking" | "authorized" | "denied" | "unavailable">("checking");

  const handleUnauthorized = useCallback((errorValue: unknown) => {
    if (errorValue instanceof ApiError && errorValue.status === 401) {
      setError("Owner authentication is required for saved automation operations. The local command center remains available.");
      setAccessState("denied");
      clearAuthenticatedUserSession();
      return true;
    }

    return false;
  }, []);

  const loadJobs = useCallback(async () => {
    try {
      setError("");
      const response = await apiFetch<AutomationListResponse>("/automation/jobs");
      setJobs(response.items);
      setAccessState("authorized");
    } catch (loadError) {
      if (!handleUnauthorized(loadError)) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load automation jobs.");
        setAccessState("unavailable");
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleUnauthorized]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!hasActiveJobs(jobs)) {
      return;
    }

    const timer = setInterval(() => {
      void loadJobs();
    }, 2000);

    return () => clearInterval(timer);
  }, [jobs, loadJobs]);

  async function handleCancel(jobId: string) {
    if (!window.confirm("Cancel this queued automation job?")) return;

    try {
      const response = await apiFetch<AutomationJobResponse>(`/automation/jobs/${jobId}/cancel`, { method: "POST" });
      setJobs((current) => current.map((job) => (job.id === jobId ? response.job : job)));
      notify({ title: "Job canceled", type: "success" });
    } catch (cancelError) {
      if (!handleUnauthorized(cancelError)) {
        setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel job.");
        notify({ title: "Cancel failed", message: cancelError instanceof Error ? cancelError.message : "Unable to cancel job.", type: "error" });
      }
    }
  }

  async function handleRetry(jobId: string) {
    try {
      const response = await apiFetch<AutomationJobResponse>(`/automation/jobs/${jobId}/retry`, { method: "POST" });
      setJobs((current) => current.map((job) => (job.id === jobId ? response.job : job)));
      await loadJobs();
      notify({ title: "Job queued", message: "Run again started.", type: "success" });
    } catch (retryError) {
      if (!handleUnauthorized(retryError)) {
        setError(retryError instanceof Error ? retryError.message : "Unable to retry job.");
        notify({ title: "Run failed", message: retryError instanceof Error ? retryError.message : "Unable to retry job.", type: "error" });
      }
    }
  }

  if (accessState !== "authorized") {
    return (
      <section className="permission-state" role={accessState === "unavailable" ? "alert" : "status"}>
        <h2>{accessState === "checking" ? "Loading automations" : accessState === "denied" ? "Owner session required" : "Automations unavailable"}</h2>
        <p>{accessState === "checking" ? "Checking saved automation access." : error}</p>
      </section>
    );
  }

  return (
    <section className="automation-console" aria-label="Automation workspace">
      <BrowserOperationsPanel onRecovered={loadJobs} />
      <AutomationForm onCreated={loadJobs} />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <AutomationList
        jobs={jobs}
        isLoading={isLoading}
        onCancel={handleCancel}
        onRefresh={loadJobs}
        onRetry={handleRetry}
      />
    </section>
  );
}
