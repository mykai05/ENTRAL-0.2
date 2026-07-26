"use client";

import type {
  BusinessFullRecord,
  BusinessSummary,
  HealthState,
  JsonValue,
  PortfolioFinancialTotal,
  PortfolioSummaryResponse
} from "@entral/contracts";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  CircleDollarSign,
  Clock3,
  Database,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "../lib/api";
import {
  canonicalPortfolioCache,
  canonicalQueryKeys,
  loadCanonicalBusiness,
  loadCanonicalPortfolio,
  subscribeCanonicalPortfolioEvents,
  type CanonicalPortfolioSource
} from "../lib/canonical-portfolio";
import { Button } from "./Button";

type SortMode = "ENTRAL_PRIORITY" | "HEALTH" | "REVENUE" | "NET_CONTRIBUTION" | "RECENT_CHANGE";
type PerformanceFilter = "ALL" | "POSITIVE" | "NEGATIVE" | "UNAVAILABLE";
type ChangeFilter = "ALL" | "RECENT" | "STALE";
type PriorityFilter = "ALL" | "EXCEPTIONS" | "RECOMMENDATIONS";

const healthOrder: Record<HealthState, number> = {
  CRITICAL: 0,
  DEGRADED: 1,
  WATCH: 2,
  UNKNOWN: 3,
  HEALTHY: 4
};

const sectionLabels: Readonly<Record<
  Exclude<keyof BusinessFullRecord, "summary" | "aggregate_version" | "evidence_ids" | "version_history" | "loaded_at">,
  string
>> = {
  agents_and_tools: "Agents and tools",
  decisions_and_changes: "Decisions and changes",
  external_activity: "External activity",
  financials: "Financials",
  issues_and_recommendations: "Issues and recommendations",
  operations: "Operations",
  overview: "Overview",
  performance: "Performance"
};

const sectionOrder = Object.keys(sectionLabels) as Array<keyof typeof sectionLabels>;

function dashboardPath(source: CanonicalPortfolioSource) {
  return source.organizationId ? "/member/dashboard" : "/dashboard";
}

function errorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const details = error.details as { code?: string; message?: string; requestId?: string } | null;
    const request = details?.requestId ? ` Request ${details.requestId}.` : "";
    return `${details?.message ?? error.message}${request}`;
  }
  return error instanceof Error ? error.message : "Canonical portfolio data could not be loaded.";
}

function number(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function money(value: number | null, currency: string | null) {
  if (value === null || !currency) return "Unavailable";
  try {
    return new Intl.NumberFormat("en-US", {
      currency,
      maximumFractionDigits: 0,
      style: "currency"
    }).format(value);
  } catch {
    return `${number(value)} ${currency}`;
  }
}

function dateTime(value: string | null) {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function period(business: BusinessSummary) {
  if (!business.revenue_period_start || !business.revenue_period_end) return "No financial period";
  return `${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(business.revenue_period_start))} – ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(business.revenue_period_end))}`;
}

function freshness(business: BusinessSummary) {
  const values = Object.values(business.source_freshness)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  if (!values.length) return { label: "Freshness unknown", state: "unknown" };
  const oldest = Math.min(...values);
  const stale = Date.now() - oldest > 24 * 60 * 60 * 1_000;
  return {
    label: `${stale ? "Stale source" : "Current sources"} / ${dateTime(new Date(Math.max(...values)).toISOString())}`,
    state: stale ? "stale" : "current"
  };
}

function isRecentChange(business: BusinessSummary) {
  return Date.now() - new Date(business.updated_at).getTime() <= 7 * 24 * 60 * 60 * 1_000;
}

function priorityScore(business: BusinessSummary) {
  return (business.top_exception ? 100 : 0)
    + (business.top_recommendation ? 40 : 0)
    + (4 - healthOrder[business.health_state]) * 10
    + (isRecentChange(business) ? 2 : 0);
}

function humanLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isTechnicalKey(key: string) {
  return key === "id"
    || key.endsWith("_id")
    || key.endsWith("_ids")
    || key.includes("sha256")
    || key.includes("correlation");
}

function JsonValueView({ value, depth = 0 }: { value: JsonValue; depth?: number }) {
  if (value === null) return <span className="phase170-unavailable">Unavailable</span>;
  if (typeof value === "boolean") return <span>{value ? "Yes" : "No"}</span>;
  if (typeof value === "number") return <span>{number(value)}</span>;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return <span>{Number.isNaN(parsed) || !value.includes("T") ? value : dateTime(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (!value.length) return <p className="phase170-empty-copy">No canonical records.</p>;
    return (
      <div className="phase170-json-list">
        {value.slice(0, 50).map((item, index) => (
          <article key={index}>
            <JsonValueView value={item} depth={depth + 1} />
          </article>
        ))}
        {value.length > 50 ? <p>Showing 50 of {value.length} records.</p> : null}
      </div>
    );
  }
  const entries = Object.entries(value).filter(([key]) => !isTechnicalKey(key));
  if (!entries.length) return <p className="phase170-empty-copy">No canonical records.</p>;
  return (
    <dl className={depth > 1 ? "phase170-record-fields nested" : "phase170-record-fields"}>
      {entries.map(([key, item]) => (
        <div key={key}>
          <dt>{humanLabel(key)}</dt>
          <dd><JsonValueView value={item} depth={depth + 1} /></dd>
        </div>
      ))}
    </dl>
  );
}

function FinancialTotals({ total }: { total: PortfolioFinancialTotal }) {
  return (
    <article>
      <span>{total.currency} portfolio period</span>
      <strong>{money(total.gross_revenue, total.currency)}</strong>
      <small>
        {money(total.net_contribution, total.currency)} net / {total.businesses_with_financials} of {total.business_count} businesses reporting
      </small>
    </article>
  );
}

function BusinessCard({
  business,
  href
}: {
  business: BusinessSummary;
  href: string;
}) {
  const sourceFreshness = freshness(business);
  const healthDrivers = business.health_drivers.slice(0, 3);

  return (
    <article className="phase170-business-card" data-business-type={business.general_name}>
      <header>
        <div>
          <p>{business.marshal_name} / {business.general_name}</p>
          <h3>{business.business_name}</h3>
        </div>
        <span className={`phase170-status status-${business.status.toLowerCase()}`}>{humanLabel(business.status)}</span>
      </header>

      <div className="phase170-business-metrics">
        <div>
          <span>Health</span>
          <strong className={`health-${business.health_state.toLowerCase()}`}>
            {humanLabel(business.health_state)}{business.health_score === null ? "" : ` / ${number(business.health_score)}`}
          </strong>
        </div>
        <div><span>Gross revenue</span><strong>{money(business.gross_revenue, business.currency)}</strong><small>{period(business)}</small></div>
        <div><span>Net contribution</span><strong>{money(business.net_contribution, business.currency)}</strong></div>
        <div><span>Active work</span><strong>{business.active_mission_count} missions / {business.active_task_count} tasks</strong></div>
      </div>

      {healthDrivers.length ? (
        <ul className="phase170-health-drivers" aria-label={`${business.business_name} health drivers`}>
          {healthDrivers.map((driver) => (
            <li key={driver.code} className={`driver-${driver.direction.toLowerCase()}`}>
              <strong>{driver.label}</strong>
              <span>{driver.explanation}</span>
            </li>
          ))}
        </ul>
      ) : <p className="phase170-empty-copy">No evidence-linked health drivers are available.</p>}

      <dl className="phase170-component-counts">
        <div><dt>Agents</dt><dd>{business.agent_count}</dd></div>
        <div><dt>Tools</dt><dd>{business.tool_count}</dd></div>
        <div><dt>Automations</dt><dd>{business.automation_count}</dd></div>
        <div><dt>Integrations</dt><dd>{business.integration_count}</dd></div>
      </dl>

      <div className="phase170-priority-lines">
        <p className={business.top_exception ? "urgent" : ""}>
          <AlertTriangle aria-hidden="true" size={16} />
          <span><strong>Exception</strong>{business.top_exception ?? "No urgent exception recorded."}</span>
        </p>
        <p>
          <Sparkles aria-hidden="true" size={16} />
          <span><strong>ENTRAL recommendation</strong>{business.top_recommendation ?? "No open recommendation recorded."}</span>
        </p>
      </div>

      <footer>
        <span className={`freshness-${sourceFreshness.state}`}><Clock3 aria-hidden="true" size={14} />{sourceFreshness.label}</span>
        <span>Version {business.version}</span>
        <Link href={href} scroll={false}>Open business</Link>
      </footer>
    </article>
  );
}

function BusinessDetail({
  business,
  error,
  isLoading,
  onRetry,
  requestedEvidenceId,
  snapshotEventSequence,
  source
}: {
  business: BusinessFullRecord | null;
  error: string;
  isLoading: boolean;
  onRetry: () => void;
  requestedEvidenceId: string | null;
  snapshotEventSequence: number;
  source: CanonicalPortfolioSource;
}) {
  if (isLoading) {
    return <section className="phase170-loading" role="status"><Loader2 aria-hidden="true" className="spin" size={24} />Loading canonical business record…</section>;
  }
  if (error) {
    return (
      <section className="phase170-error" role="alert">
        <AlertTriangle aria-hidden="true" size={22} />
        <div><h2>Business record unavailable</h2><p>{error}</p></div>
        <Button onClick={onRetry} variant="secondary"><RefreshCw aria-hidden="true" size={16} />Retry</Button>
      </section>
    );
  }
  if (!business) return null;
  const summary = business.summary;
  const sourceFreshness = freshness(summary);

  return (
    <section className="phase170-business-detail" aria-labelledby="business-detail-heading">
      <Link className="phase170-back-link" href={dashboardPath(source)} scroll={false}>
        <ArrowLeft aria-hidden="true" size={17} />Back to portfolio
      </Link>
      <header>
        <div>
          <p className="eyebrow">{summary.marshal_name} / {summary.general_name}</p>
          <h1 id="business-detail-heading">{summary.business_name}</h1>
          <p>{summary.primary_objective ?? "No primary objective is recorded."}</p>
        </div>
        <dl>
          <div><dt>State</dt><dd>{humanLabel(summary.status)}</dd></div>
          <div><dt>Health</dt><dd>{humanLabel(summary.health_state)}{summary.health_score === null ? "" : ` / ${number(summary.health_score)}`}</dd></div>
          <div><dt>Aggregate version</dt><dd>v{business.aggregate_version}</dd></div>
          <div><dt>Canonical snapshot</dt><dd>Event {snapshotEventSequence}</dd></div>
          <div><dt>Freshness</dt><dd>{sourceFreshness.label}</dd></div>
        </dl>
      </header>

      <div className="phase170-detail-sections">
        {sectionOrder.map((section, index) => (
          <details key={section} open={index === 0}>
            <summary>
              <span>{sectionLabels[section]}</span>
              <small>Canonical record</small>
            </summary>
            <div><JsonValueView value={business[section]} /></div>
          </details>
        ))}
      </div>

      {business.evidence_ids.length ? (
        <section aria-label="Canonical business evidence references" className="phase170-evidence-list">
          <h2>Evidence references</h2>
          <ul>
            {business.evidence_ids.map((evidenceId) => (
              <li
                className={requestedEvidenceId === evidenceId ? "requested" : undefined}
                id={`canonical-evidence-${evidenceId}`}
                key={evidenceId}
              >
                <code>{evidenceId}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {requestedEvidenceId && !business.evidence_ids.includes(requestedEvidenceId) ? (
        <section
          className="phase170-evidence-list unresolved"
          id={`canonical-evidence-${requestedEvidenceId}`}
          role="status"
        >
          <h2>Evidence reference unavailable</h2>
          <p>
            Reference <code>{requestedEvidenceId}</code> is recorded in the conversation but is not linked to this
            canonical business record. No substitute evidence is being inferred.
          </p>
        </section>
      ) : null}

      <footer>
        <span>Loaded {dateTime(business.loaded_at)}</span>
        <span>{business.evidence_ids.length} evidence reference{business.evidence_ids.length === 1 ? "" : "s"}</span>
        <span>{business.version_history.length} recorded version{business.version_history.length === 1 ? "" : "s"}</span>
      </footer>
    </section>
  );
}

export function CanonicalPortfolioDashboard({
  organizationId,
  scopeBusinessId,
  userName,
  workspacePortfolio,
  workspaceStatus
}: {
  organizationId?: string;
  scopeBusinessId?: string | null;
  userName?: string;
  workspacePortfolio?: PortfolioSummaryResponse;
  workspaceStatus?: string;
}) {
  const searchParams = useSearchParams();
  const selectedBusinessId = scopeBusinessId ?? searchParams.get("business");
  const source = useMemo<CanonicalPortfolioSource>(() => ({ organizationId }), [organizationId]);
  const [portfolio, setPortfolio] = useState<PortfolioSummaryResponse | null>(
    () => workspacePortfolio ?? canonicalPortfolioCache.get(canonicalQueryKeys.portfolio(source)) ?? null
  );
  const [portfolioError, setPortfolioError] = useState("");
  const [isPortfolioLoading, setIsPortfolioLoading] = useState(!portfolio);
  const [business, setBusiness] = useState<BusinessFullRecord | null>(null);
  const [businessError, setBusinessError] = useState("");
  const [isBusinessLoading, setIsBusinessLoading] = useState(Boolean(selectedBusinessId));
  const [eventStatus, setEventStatus] = useState(workspaceStatus ?? "Listening for canonical events");
  const [search, setSearch] = useState("");
  const [marshal, setMarshal] = useState("ALL");
  const [general, setGeneral] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [health, setHealth] = useState("ALL");
  const [performance, setPerformance] = useState<PerformanceFilter>("ALL");
  const [change, setChange] = useState<ChangeFilter>("ALL");
  const [priority, setPriority] = useState<PriorityFilter>("ALL");
  const [sort, setSort] = useState<SortMode>("ENTRAL_PRIORITY");
  const businessRefreshGenerationRef = useRef(0);

  const refreshPortfolio = useCallback(async (signal?: AbortSignal) => {
    setPortfolioError("");
    setIsPortfolioLoading(true);
    try {
      setPortfolio(await loadCanonicalPortfolio(source, { signal }));
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setPortfolioError(errorMessage(error));
    } finally {
      if (!signal?.aborted) setIsPortfolioLoading(false);
    }
  }, [source]);

  const refreshBusiness = useCallback(async (
    businessId: string,
    expectedEventSequence: number,
    signal?: AbortSignal
  ) => {
    const refreshGeneration = ++businessRefreshGenerationRef.current;
    const isCurrentRefresh = () => !signal?.aborted && refreshGeneration === businessRefreshGenerationRef.current;
    setBusinessError("");
    setIsBusinessLoading(true);
    try {
      let accepted: Awaited<ReturnType<typeof loadCanonicalBusiness>> | null = null;
      for (let attempt = 0; attempt < 3 && !signal?.aborted; attempt += 1) {
        const response = await loadCanonicalBusiness(source, businessId, { signal });
        if (response.event_sequence === expectedEventSequence) {
          accepted = response;
          break;
        }
        canonicalPortfolioCache.invalidate(canonicalQueryKeys.business(source, businessId));
      }
      if (!accepted) {
        throw new Error("The canonical business record changed during snapshot assembly. Entral will retry before displaying mixed versions.");
      }
      if (!isCurrentRefresh()) return;
      setBusiness(accepted.business);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      if (!isCurrentRefresh()) return;
      setBusiness(null);
      setBusinessError(errorMessage(error));
    } finally {
      if (isCurrentRefresh()) setIsBusinessLoading(false);
    }
  }, [source]);

  useEffect(() => {
    if (workspacePortfolio) {
      setPortfolio(workspacePortfolio);
      setPortfolioError("");
      setIsPortfolioLoading(false);
      return;
    }
    const controller = new AbortController();
    void refreshPortfolio(controller.signal);
    return () => controller.abort();
  }, [refreshPortfolio, workspacePortfolio]);

  useEffect(() => {
    if (workspaceStatus) setEventStatus(workspaceStatus);
  }, [workspaceStatus]);

  useEffect(() => {
    if (!selectedBusinessId) {
      businessRefreshGenerationRef.current += 1;
      setBusiness(null);
      setBusinessError("");
      setIsBusinessLoading(false);
      return;
    }
    const expectedEventSequence = workspacePortfolio?.event_sequence ?? portfolio?.event_sequence;
    if (expectedEventSequence === undefined) return;
    const cached = canonicalPortfolioCache.get<Awaited<ReturnType<typeof loadCanonicalBusiness>>>(
      canonicalQueryKeys.business(source, selectedBusinessId)
    );
    if (cached?.event_sequence === expectedEventSequence) setBusiness(cached.business);
    const controller = new AbortController();
    void refreshBusiness(selectedBusinessId, expectedEventSequence, controller.signal);
    return () => {
      controller.abort();
      businessRefreshGenerationRef.current += 1;
    };
  }, [portfolio?.event_sequence, refreshBusiness, selectedBusinessId, source, workspacePortfolio?.event_sequence]);

  useEffect(() => {
    if (workspacePortfolio) return;
    if (!portfolio) return;
    return subscribeCanonicalPortfolioEvents(source, {
      afterSequence: portfolio.event_sequence,
      onError: () => setEventStatus("Event reconnect pending"),
      onEvents: (response, changedBusinessIds) => {
        setEventStatus(`Updated through event ${response.next_sequence}`);
        void refreshPortfolio();
        if (selectedBusinessId && changedBusinessIds.has(selectedBusinessId)) {
          void refreshBusiness(selectedBusinessId, response.next_sequence);
        }
      }
    });
  }, [portfolio?.event_sequence, refreshBusiness, refreshPortfolio, selectedBusinessId, source, workspacePortfolio]);

  const businesses = useMemo(() => {
    if (!portfolio) return [];
    const query = search.trim().toLowerCase();
    return [...portfolio.businesses]
      .filter((candidate) => !query || [
        candidate.business_name,
        candidate.stable_code,
        candidate.marshal_name,
        candidate.general_name,
        candidate.primary_objective ?? ""
      ].some((value) => value.toLowerCase().includes(query)))
      .filter((candidate) => marshal === "ALL" || candidate.marshal_id === marshal)
      .filter((candidate) => general === "ALL" || candidate.general_id === general)
      .filter((candidate) => status === "ALL" || candidate.status === status)
      .filter((candidate) => health === "ALL" || candidate.health_state === health)
      .filter((candidate) => performance === "ALL"
        || (performance === "POSITIVE" && (candidate.net_contribution ?? 0) > 0)
        || (performance === "NEGATIVE" && candidate.net_contribution !== null && candidate.net_contribution <= 0)
        || (performance === "UNAVAILABLE" && candidate.net_contribution === null))
      .filter((candidate) => change === "ALL"
        || (change === "RECENT" && isRecentChange(candidate))
        || (change === "STALE" && !isRecentChange(candidate)))
      .filter((candidate) => priority === "ALL"
        || (priority === "EXCEPTIONS" && Boolean(candidate.top_exception))
        || (priority === "RECOMMENDATIONS" && Boolean(candidate.top_recommendation)))
      .sort((left, right) => {
        if (sort === "HEALTH") return healthOrder[left.health_state] - healthOrder[right.health_state];
        if (sort === "REVENUE") return (right.gross_revenue ?? Number.NEGATIVE_INFINITY) - (left.gross_revenue ?? Number.NEGATIVE_INFINITY);
        if (sort === "NET_CONTRIBUTION") return (right.net_contribution ?? Number.NEGATIVE_INFINITY) - (left.net_contribution ?? Number.NEGATIVE_INFINITY);
        if (sort === "RECENT_CHANGE") return Date.parse(right.updated_at) - Date.parse(left.updated_at);
        return priorityScore(right) - priorityScore(left);
      });
  }, [change, general, health, marshal, performance, portfolio, priority, search, sort, status]);

  const marshalOptions = useMemo(() => {
    const unique = new Map(portfolio?.businesses.map((candidate) => [candidate.marshal_id, candidate.marshal_name]) ?? []);
    return [...unique.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [portfolio]);
  const generalOptions = useMemo(() => {
    const unique = new Map(
      (portfolio?.businesses ?? [])
        .filter((candidate) => marshal === "ALL" || candidate.marshal_id === marshal)
        .map((candidate) => [candidate.general_id, candidate.general_name])
    );
    return [...unique.entries()].sort((left, right) => left[1].localeCompare(right[1]));
  }, [marshal, portfolio]);

  if (selectedBusinessId) {
    return (
      <BusinessDetail
        business={business}
        error={businessError}
        isLoading={isBusinessLoading}
        onRetry={() => void refreshBusiness(
          selectedBusinessId,
          workspacePortfolio?.event_sequence ?? portfolio?.event_sequence ?? 0
        )}
        requestedEvidenceId={searchParams.get("evidence")}
        snapshotEventSequence={workspacePortfolio?.event_sequence ?? portfolio?.event_sequence ?? 0}
        source={source}
      />
    );
  }

  return (
    <div className="phase170-portfolio">
      <header className="phase170-page-heading">
        <div>
          <p className="eyebrow">{portfolio?.scope.mode === "HUMAN_PORTFOLIO" ? "Human portfolio mode" : "Assigned business mode"}</p>
          <h1>{userName ? `${userName}'s Dashboard` : "Dashboard"}</h1>
          <p>Canonical PostgreSQL summaries only. Missing financial, health, or operating data stays visibly unavailable.</p>
        </div>
        <div className="phase170-scope-card" aria-label="Visible portfolio scope">
          <ShieldCheck aria-hidden="true" size={18} />
          <span><strong>{portfolio?.scope.label ?? "Resolving canonical scope"}</strong>{eventStatus}</span>
        </div>
      </header>

      {portfolioError ? (
        <section className="phase170-error" role="alert">
          <AlertTriangle aria-hidden="true" size={22} />
          <div><h2>Canonical portfolio unavailable</h2><p>{portfolioError}</p></div>
          <Button onClick={() => void refreshPortfolio()} variant="secondary"><RefreshCw aria-hidden="true" size={16} />Retry</Button>
        </section>
      ) : null}

      {isPortfolioLoading && !portfolio ? (
        <section className="phase170-loading" role="status"><Loader2 aria-hidden="true" className="spin" size={24} />Loading canonical portfolio…</section>
      ) : null}

      {portfolio ? (
        <>
          <section className="phase170-summary-grid" aria-label="Portfolio totals">
            <article><span>Businesses</span><strong>{portfolio.totals.businesses}</strong><small>{portfolio.totals.active_commanders} active Commanders</small></article>
            <article><span>Active Soldiers</span><strong>{portfolio.totals.active_soldiers}</strong><small>RLS-visible operating entities</small></article>
            <article><span>Unresolved exceptions</span><strong>{portfolio.totals.unresolved_exceptions}</strong><small>{portfolio.totals.health_distribution.CRITICAL} critical / {portfolio.totals.health_distribution.DEGRADED} degraded</small></article>
            {portfolio.totals.financials.length
              ? portfolio.totals.financials.map((total) => <FinancialTotals key={total.currency} total={total} />)
              : <article className="unavailable"><span>Financial totals</span><strong>Unavailable</strong><small>No canonical financial snapshots exist.</small></article>}
          </section>

          <section className="phase170-controls" aria-label="Portfolio search, sorting, and filters">
            <label className="phase170-search"><Search aria-hidden="true" size={17} /><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Business, Marshal, General, objective" /></label>
            <label><Filter aria-hidden="true" size={15} /><span>Marshal</span><select value={marshal} onChange={(event) => { setMarshal(event.target.value); setGeneral("ALL"); }}><option value="ALL">All Marshals</option>{marshalOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label><span>General</span><select value={general} onChange={(event) => setGeneral(event.target.value)}><option value="ALL">All Generals</option>{generalOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
            <label><span>State</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All states</option>{["BUILDING", "OPERATING", "PAUSED", "DEGRADED", "RETIRED"].map((value) => <option key={value} value={value}>{humanLabel(value)}</option>)}</select></label>
            <label><span>Health</span><select value={health} onChange={(event) => setHealth(event.target.value)}><option value="ALL">All health</option>{Object.keys(healthOrder).map((value) => <option key={value} value={value}>{humanLabel(value)}</option>)}</select></label>
            <label><span>Performance</span><select value={performance} onChange={(event) => setPerformance(event.target.value as PerformanceFilter)}><option value="ALL">All performance</option><option value="POSITIVE">Positive net</option><option value="NEGATIVE">Non-positive net</option><option value="UNAVAILABLE">Unavailable</option></select></label>
            <label><span>Change</span><select value={change} onChange={(event) => setChange(event.target.value as ChangeFilter)}><option value="ALL">Any change</option><option value="RECENT">Changed in 7 days</option><option value="STALE">Older than 7 days</option></select></label>
            <label><span>ENTRAL priority</span><select value={priority} onChange={(event) => setPriority(event.target.value as PriorityFilter)}><option value="ALL">All priorities</option><option value="EXCEPTIONS">Urgent exceptions</option><option value="RECOMMENDATIONS">Open recommendations</option></select></label>
            <label><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="ENTRAL_PRIORITY">ENTRAL priority</option><option value="HEALTH">Health risk</option><option value="REVENUE">Revenue</option><option value="NET_CONTRIBUTION">Net contribution</option><option value="RECENT_CHANGE">Recent change</option></select></label>
          </section>

          <section className="phase170-business-list" aria-labelledby="canonical-businesses-heading">
            <header>
              <div><p className="eyebrow">Businesses</p><h2 id="canonical-businesses-heading">Canonical portfolio</h2></div>
              <span>{businesses.length} of {portfolio.businesses.length} visible</span>
            </header>
            {businesses.length ? businesses.map((candidate) => (
              <BusinessCard
                business={candidate}
                href={`${dashboardPath(source)}?business=${encodeURIComponent(candidate.business_id)}`}
                key={candidate.business_id}
              />
            )) : (
              <div className="phase170-empty-state">
                <Database aria-hidden="true" size={28} />
                <h3>{portfolio.businesses.length ? "No businesses match these filters." : "No canonical businesses are deployed."}</h3>
                <p>{portfolio.businesses.length ? "Clear or change filters to review another scoped record." : "ENTRAL will not create or imply sample business data. A business appears here only after canonical deployment and scope assignment."}</p>
              </div>
            )}
          </section>

          <section className="phase170-dashboard-footnotes" aria-label="Dashboard data contract">
            <p><BriefcaseBusiness aria-hidden="true" size={17} /><span><strong>Reusable business view</strong>Store, software, service, marketplace, and subscription Commanders use this same contract.</span></p>
            <p><Activity aria-hidden="true" size={17} /><span><strong>Version consistent</strong>Cards and detail records share the business aggregate version and refresh after canonical events.</span></p>
            <p><CircleDollarSign aria-hidden="true" size={17} /><span><strong>Financially honest</strong>Currency totals remain separate; unavailable periods are never estimated.</span></p>
            <p><Bot aria-hidden="true" size={17} /><span><strong>Scoped by authority</strong>Human authority sees the portfolio; other operators see only RLS-assigned businesses.</span></p>
            <p><Wrench aria-hidden="true" size={17} /><span><strong>On demand</strong>Full operations, tools, decisions, evidence, and external activity load only after opening a business.</span></p>
          </section>
        </>
      ) : null}
    </div>
  );
}
