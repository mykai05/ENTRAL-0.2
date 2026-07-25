"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  parseMemberOverviewResponse
} from "@entral/contracts";
import {
  AlertCircle,
  CalendarClock,
  CircleSlash2,
  ClipboardList,
  FileText,
  HeartPulse,
  LayoutDashboard,
  Loader2,
  LogOut,
  Network,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Target,
  Users
} from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { clearAuthenticatedUserSession } from "../lib/auth-session";
import type { MemberOrganizationsResponse, MemberOverviewResponse } from "../lib/member";
import { memberSignInPath, sovereignProtocolUrl } from "../lib/member";
import { BrandMark } from "./BrandMark";
import { Button } from "./Button";
import { MemberNeuronGraph } from "./MemberNeuronGraph";
import { MemberNeuronsCommandCenter } from "./MemberNeuronsCommandCenter";

const statusLabels: Record<string, string> = {
  ARCHIVED: "Archived",
  DONE: "Done",
  IN_PROGRESS: "In progress",
  TODO: "To do"
};

function statusLabel(status: string) {
  return statusLabels[status] ?? status.replaceAll("_", " ").toLowerCase();
}

function formattedDate(value: string | null) {
  if (!value) return "No due date";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(value));
}

function formattedMonth(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC", year: "numeric" })
    .format(new Date(`${value}-01T00:00:00.000Z`));
}

function roleLabel(role: "MEMBER" | "OWNER") {
  return role === "OWNER" ? "Owner" : "Member";
}

export function MemberDashboardClient({
  initialSession,
  view = "dashboard"
}: {
  initialSession: MemberOrganizationsResponse;
  view?: "dashboard" | "graph";
}) {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState(initialSession.organizations[0]?.id ?? "");
  const [overview, setOverview] = useState<MemberOverviewResponse | null>(null);
  const [workspaceError, setWorkspaceError] = useState("");
  const [canRetryWorkspace, setCanRetryWorkspace] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [isLoading, setIsLoading] = useState(Boolean(organizationId));
  const [isSigningOut, setIsSigningOut] = useState(false);
  const activeOverviewRequest = useRef<AbortController | null>(null);
  const overviewRequestGeneration = useRef(0);

  const selectedOrganization = useMemo(
    () => initialSession.organizations.find((organization) => organization.id === organizationId) ?? null,
    [initialSession.organizations, organizationId]
  );

  const loadOverview = useCallback(async () => {
    if (!organizationId) return;

    activeOverviewRequest.current?.abort();
    const controller = new AbortController();
    const generation = overviewRequestGeneration.current + 1;
    const requestedOrganizationId = organizationId;
    activeOverviewRequest.current = controller;
    overviewRequestGeneration.current = generation;
    setWorkspaceError("");
    setCanRetryWorkspace(false);
    setIsLoading(true);
    setOverview(null);

    try {
      const payload = await apiFetch<unknown>(
        `/member/organizations/${encodeURIComponent(requestedOrganizationId)}/overview`,
        { signal: controller.signal }
      );
      const response = parseMemberOverviewResponse(payload);

      if (controller.signal.aborted || overviewRequestGeneration.current !== generation) return;
      if (response.organization.id !== requestedOrganizationId) {
        setWorkspaceError("Entral returned data for a different organization. Refresh and try again.");
        setCanRetryWorkspace(true);
        return;
      }
      setOverview(response);
    } catch (requestError) {
      if (controller.signal.aborted || overviewRequestGeneration.current !== generation) return;
      if (requestError instanceof ApiError && requestError.status === 401) {
        router.replace(memberSignInPath(view === "graph" ? "/member/graph" : "/member"));
        router.refresh();
        return;
      }

      if (requestError instanceof ApiError && requestError.status === 404) {
        setWorkspaceError("This organization is no longer available to your account.");
        setCanRetryWorkspace(false);
      } else {
        setWorkspaceError(requestError instanceof Error ? requestError.message : "Entral could not load this workspace.");
        setCanRetryWorkspace(true);
      }
      setOverview(null);
    } finally {
      if (overviewRequestGeneration.current === generation) {
        setIsLoading(false);
      }
    }
  }, [organizationId, router, view]);

  useEffect(() => {
    void loadOverview();
    return () => activeOverviewRequest.current?.abort();
  }, [loadOverview]);

  async function handleLogout() {
    if (isSigningOut) return;
    setSignOutError("");
    setIsSigningOut(true);

    try {
      await apiFetch("/logout", { method: "POST" });
      clearAuthenticatedUserSession();
      router.replace("/member/sign-in");
      router.refresh();
    } catch (requestError) {
      setSignOutError(requestError instanceof Error ? requestError.message : "Sign out failed. Try again.");
      setIsSigningOut(false);
    }
  }

  return (
    <main className="member-workspace" id="main-content">
      <header className="member-header">
        <div className="member-header-primary">
          <BrandMark href="/member" />
          <nav className="member-navigation" aria-label="Member workspace">
            <Link aria-current={view === "dashboard" ? "page" : undefined} href="/member">
              <LayoutDashboard aria-hidden="true" size={16} />Workspace
            </Link>
            <Link aria-current={view === "graph" ? "page" : undefined} href="/member/graph">
              <Network aria-hidden="true" size={16} />Full graph
            </Link>
          </nav>
        </div>
        <div className="member-header-account">
          <span title={initialSession.user.email}>{initialSession.user.email}</span>
          <Button isLoading={isSigningOut} onClick={handleLogout} variant="secondary">
            {isSigningOut ? <Loader2 aria-hidden="true" className="spin" size={17} /> : <LogOut aria-hidden="true" size={17} />}
            Sign out
          </Button>
        </div>
      </header>

      <section className="member-intro" aria-labelledby="member-heading">
        <div>
          <p className="eyebrow">{view === "graph" ? "Organization intelligence" : "Member workspace"}</p>
          <h1 id="member-heading">{view === "graph" ? "Full organization graph" : `Welcome, ${initialSession.user.name}`}</h1>
          <p>{view === "graph" ? "Explore every approved operating signal available to your organization." : "Review the organization work that has been approved for member visibility."}</p>
        </div>
        {initialSession.organizations.length > 1 ? (
          <label className="member-organization-select">
            <span>Organization</span>
            <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)}>
              {initialSession.organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>{organization.name}</option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      {signOutError ? (
        <section className="member-error" role="alert">
          <AlertCircle aria-hidden="true" size={20} />
          <div><strong>Sign out failed</strong><p>{signOutError}</p></div>
          <Button onClick={() => void handleLogout()} variant="secondary"><RefreshCw aria-hidden="true" size={17} />Try again</Button>
        </section>
      ) : null}

      {workspaceError ? (
        <section className="member-error" role="alert">
          <AlertCircle aria-hidden="true" size={20} />
          <div><strong>Workspace unavailable</strong><p>{workspaceError}</p></div>
          {organizationId && canRetryWorkspace ? <Button onClick={() => void loadOverview()} variant="secondary"><RefreshCw aria-hidden="true" size={17} />Retry</Button> : null}
        </section>
      ) : null}

      {!organizationId ? (
        <section className="member-empty-state">
          <Users aria-hidden="true" size={28} />
          <h2>No organization assigned</h2>
          <p>Your account is verified, but it does not currently belong to an Entral organization.</p>
          <a className="button button-secondary" href={`${sovereignProtocolUrl()}/contact`}>Contact support</a>
        </section>
      ) : null}

      {isLoading ? (
        <section className="member-loading" role="status" aria-live="polite">
          <Loader2 aria-hidden="true" className="spin" size={24} />
          <p>Loading {selectedOrganization?.name ?? "organization"}...</p>
        </section>
      ) : null}

      {overview && !isLoading ? (
        <>
          <section className="member-organization-bar" aria-label="Selected organization">
            <div>
              <span className="eyebrow">Organization</span>
              <h2>{overview.organization.name}</h2>
            </div>
            <dl>
              <div><dt>Your role</dt><dd>{roleLabel(overview.organization.role)}</dd></div>
              <div><dt>Entral Base seats</dt><dd>{overview.organization.memberCount} of {overview.organization.memberLimit}</dd></div>
            </dl>
          </section>

          {view === "graph" ? (
            <MemberNeuronsCommandCenter overview={overview} />
          ) : (
            <>
              <MemberNeuronGraph overview={overview} />

          <section className="member-metrics" aria-labelledby="work-overview-heading">
            <div className="member-section-heading">
              <ClipboardList aria-hidden="true" size={20} />
              <div><h2 id="work-overview-heading">Work overview</h2><p>Current organization task records.</p></div>
            </div>
            <div className="member-metric-grid">
              <article><span>Total</span><strong>{overview.taskSummary.total}</strong></article>
              <article><span>To do</span><strong>{overview.taskSummary.todo}</strong></article>
              <article><span>In progress</span><strong>{overview.taskSummary.inProgress}</strong></article>
              <article><span>Done</span><strong>{overview.taskSummary.done}</strong></article>
              <article className={overview.taskSummary.overdue > 0 ? "member-metric-alert" : ""}><span>Overdue</span><strong>{overview.taskSummary.overdue}</strong></article>
            </div>
          </section>

          <div className="member-content-grid">
            <section className="member-panel" aria-labelledby="active-work-heading">
              <div className="member-section-heading">
                <CalendarClock aria-hidden="true" size={20} />
                <div><h2 id="active-work-heading">Recent work</h2><p>Latest task activity visible to this organization.</p></div>
              </div>
              {overview.recentTasks.length ? (
                <ul className="member-task-list">
                  {overview.recentTasks.map((task) => (
                    <li key={task.id}>
                      <div><strong>{task.title}</strong><span>{task.assignedTo?.name ?? "Unassigned"} <span aria-hidden="true">&middot;</span> {formattedDate(task.dueDate)}</span></div>
                      <span className={`member-task-status status-${task.status.toLowerCase()}`}>{statusLabel(task.status)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="member-panel-empty">No task records are available for this organization.</p>}
            </section>

            <section className="member-panel" aria-labelledby="members-heading">
              <div className="member-section-heading">
                <Users aria-hidden="true" size={20} />
                <div><h2 id="members-heading">Organization members</h2><p>Members currently assigned to this organization.</p></div>
              </div>
              <ul className="member-list">
                {overview.members.map((member) => (
                  <li key={member.id}><span aria-hidden="true">{member.name.charAt(0).toUpperCase()}</span><div><strong>{member.name}</strong><small>{roleLabel(member.role)}</small></div></li>
                ))}
              </ul>
            </section>
          </div>

          {!overview.workspace ? (
            <section className="member-panel member-published-empty" aria-labelledby="published-workspace-heading">
              <ShieldCheck aria-hidden="true" size={22} />
              <div>
                <h2 id="published-workspace-heading">Operating view not published yet</h2>
                <p>There is no approved business-health, planning, findings, or monthly-summary snapshot for this organization yet.</p>
              </div>
            </section>
          ) : (
            <section className="member-published-workspace" aria-labelledby="published-workspace-heading">
              <div className="member-published-heading">
                <div>
                  <p className="eyebrow">Approved operating view</p>
                  <h2 id="published-workspace-heading">Business direction and visibility</h2>
                </div>
                <p>Published {formattedDate(overview.workspace.publishedAt)} <span aria-hidden="true">&middot;</span> Version {overview.workspace.version}</p>
              </div>

              <div className="member-workspace-grid">
                <article className="member-panel member-health-panel">
                  <div className="member-section-heading">
                    <HeartPulse aria-hidden="true" size={20} />
                    <div><h3>Business health</h3><p>Latest approved operating assessment.</p></div>
                  </div>
                  {overview.workspace.businessHealth ? (
                    <div className="member-health-summary">
                      <strong>{overview.workspace.businessHealth.score}<span>/100</span></strong>
                      <div>
                        <span className={`member-workspace-status status-${overview.workspace.businessHealth.status}`}>
                          {overview.workspace.businessHealth.status}
                        </span>
                        <p>{overview.workspace.businessHealth.summary}</p>
                      </div>
                    </div>
                  ) : <p className="member-panel-empty">No business-health assessment has been published.</p>}
                </article>

                <article className="member-panel">
                  <div className="member-section-heading">
                    <Target aria-hidden="true" size={20} />
                    <div><h3>Objectives and priorities</h3><p>Approved priorities and progress.</p></div>
                  </div>
                  {overview.workspace.objectivesAndPriorities.length ? (
                    <ul className="member-objective-list">
                      {overview.workspace.objectivesAndPriorities.map((objective) => (
                        <li key={objective.id}>
                          <div><strong>{objective.title}</strong><span>{objective.priority} priority <span aria-hidden="true">&middot;</span> {objective.status}</span></div>
                          <div className="member-progress" aria-label={`${objective.title}: ${objective.progress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={objective.progress}>
                            <span style={{ width: `${objective.progress}%` }} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="member-panel-empty">No objectives or priorities have been published.</p>}
                </article>
              </div>

              <div className="member-workspace-grid">
                <article className="member-panel">
                  <div className="member-section-heading">
                    <SearchCheck aria-hidden="true" size={20} />
                    <div><h3>Findings and recommendations</h3><p>Approved observations and next-step guidance.</p></div>
                  </div>
                  {overview.workspace.findingsAndRecommendations.length ? (
                    <ul className="member-finding-list">
                      {overview.workspace.findingsAndRecommendations.map((finding) => (
                        <li key={finding.id}>
                          <span className={`member-workspace-status severity-${finding.severity}`}>{finding.severity}</span>
                          <h4>{finding.title}</h4>
                          <p>{finding.detail}</p>
                          <div><strong>Recommendation</strong><p>{finding.recommendation}</p></div>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="member-panel-empty">No findings or recommendations have been published.</p>}
                </article>

                <article className="member-panel">
                  <div className="member-section-heading">
                    <FileText aria-hidden="true" size={20} />
                    <div><h3>Monthly operating summary</h3><p>Latest approved monthly review.</p></div>
                  </div>
                  {overview.workspace.monthlyOperatingSummary ? (
                    <div className="member-monthly-summary">
                      <span>{formattedMonth(overview.workspace.monthlyOperatingSummary.period)}</span>
                      <h4>{overview.workspace.monthlyOperatingSummary.headline}</h4>
                      <p>{overview.workspace.monthlyOperatingSummary.summary}</p>
                      <div className="member-summary-columns">
                        <div><strong>Accomplishments</strong><ul>{overview.workspace.monthlyOperatingSummary.accomplishments.map((item) => <li key={item}>{item}</li>)}</ul></div>
                        <div><strong>Next priorities</strong><ul>{overview.workspace.monthlyOperatingSummary.nextPriorities.map((item) => <li key={item}>{item}</li>)}</ul></div>
                      </div>
                    </div>
                  ) : <p className="member-panel-empty">No monthly operating summary has been published.</p>}
                </article>
              </div>
            </section>
          )}

              <section className="member-panel member-subscription-state" aria-labelledby="subscription-heading">
                <CircleSlash2 aria-hidden="true" size={18} />
                <div><h2 id="subscription-heading">Subscription management unavailable</h2><p>{overview.availability.subscription.reason}</p></div>
              </section>
            </>
          )}
          <footer className="member-footer">
            <p>Need help with your Entral workspace or a separately scoped implementation?</p>
            <a href={`${sovereignProtocolUrl()}/contact`}>Support and consultation</a>
          </footer>
        </>
      ) : null}
    </main>
  );
}
