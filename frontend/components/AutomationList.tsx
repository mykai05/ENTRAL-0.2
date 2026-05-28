"use client";

import React from "react";
import { ClipboardList, RefreshCw, RotateCcw, X } from "lucide-react";
import { Button } from "./Button";
import { AutomationStatus } from "./AutomationStatus";
import { SkeletonList } from "./Skeleton";

type AutomationLog = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

export type AutomationJob = {
  id: string;
  type: string;
  status: string;
  payload: {
    url?: string;
    selector?: string;
  };
  result?: {
    engine?: string;
    content?: string;
    title?: string;
    statusCode?: number;
  } | null;
  error?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  logs: AutomationLog[];
};

type AutomationListProps = {
  jobs: AutomationJob[];
  isLoading: boolean;
  onRefresh: () => Promise<void>;
  onCancel: (jobId: string) => Promise<void>;
  onRetry: (jobId: string) => Promise<void>;
};

function resultPreview(job: AutomationJob) {
  if (job.error) {
    return job.error;
  }

  if (!job.result) {
    return job.logs[0]?.message ?? "";
  }

  return job.result.content ?? job.result.title ?? JSON.stringify(job.result);
}

export function AutomationList({ jobs, isLoading, onRefresh, onCancel, onRetry }: AutomationListProps) {
  return (
    <section className="automation-list" aria-label="Automation jobs">
      <header>
        <h2>Jobs</h2>
        <Button type="button" variant="secondary" onClick={() => void onRefresh()} disabled={isLoading}>
          <RefreshCw aria-hidden="true" size={18} className={isLoading ? "spin" : ""} />
          Refresh
        </Button>
      </header>

      {isLoading ? (
        <SkeletonList count={4} label="Loading automation jobs" />
      ) : jobs.length === 0 ? (
        <div className="empty-state empty-state-cta">
          <ClipboardList aria-hidden="true" size={28} />
          <div>
            <strong>No automation jobs yet.</strong>
            <p>Create the first browser task and ENTRAL will track every run here.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Status</th>
                <th scope="col">Target</th>
                <th scope="col">Result</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>
                    <AutomationStatus status={job.status} />
                  </td>
                  <td>
                    <strong>{job.payload.url ?? "Unknown URL"}</strong>
                    {job.payload.selector ? <span>{job.payload.selector}</span> : null}
                  </td>
                  <td>
                    <p>{resultPreview(job).slice(0, 220)}</p>
                    {job.logs.length ? <span>{job.logs[0].message}</span> : null}
                  </td>
                  <td>
                    <div className="row-actions">
                      {job.status === "pending" || job.status === "scheduled" ? (
                        <Button type="button" variant="secondary" onClick={() => void onCancel(job.id)} aria-label="Cancel job">
                          <X aria-hidden="true" size={18} />
                          Cancel
                        </Button>
                      ) : null}
                      {job.status === "failed" || job.status === "canceled" || job.status === "completed" ? (
                        <Button type="button" variant="secondary" onClick={() => void onRetry(job.id)} aria-label="Run job again">
                          <RotateCcw aria-hidden="true" size={18} />
                          Run again
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
