"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, ExternalLink, Loader2, MapPin, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import type { MemberOrganizationRole } from "../lib/member";
import { Button } from "./Button";

type DiscoverySource = {
  source_type: string;
  title: string;
  url: string;
};

type DiscoveryBusiness = {
  approximate_distance_miles?: number | null;
  business_type?: string | null;
  city?: string | null;
  confidence: "high" | "medium" | "low";
  country?: string | null;
  match_basis: string;
  name: string;
  region?: string | null;
  sources: DiscoverySource[];
  website?: string | null;
};

type DiscoveryResult = {
  businesses: DiscoveryBusiness[];
  limitations: string[];
  mode: "business_type_radius" | "mixed" | "named_businesses";
  next_command_action: string;
  search_summary: string;
  source_coverage: string[];
  status: "blocked" | "completed" | "partial";
};

type AgentRun = {
  createdAt: string;
  id: string;
  kind: "business_discovery";
  organizationId: string;
  request: unknown;
  requestedBy: string;
  result: DiscoveryResult;
};

type AgentAvailability = {
  agents: Array<{ agentId: string; state: string }>;
  executionEnabled: boolean;
};

type AgentRunsResponse = { availability?: AgentAvailability; runs: AgentRun[] };
type StoredAgentRunResponse = { run: AgentRun; stored: true };

const agentNetwork = [
  { id: "business_discovery", name: "Business Discovery", purpose: "Source-linked company and local-market research." },
  { id: "intake_evidence", name: "Intake & Evidence", purpose: "Evidence normalization, provenance, and G1 review preparation." },
  { id: "leakage_analysis", name: "Leakage Analysis", purpose: "Evidence-bound operational leakage assessment." },
  { id: "pricing_roi", name: "Pricing & ROI", purpose: "Deterministic financial calculations from approved inputs." },
  { id: "proposal_assembly", name: "Proposal Assembly", purpose: "Controlled proposal lineage and approved-field assembly." },
  { id: "quality_compliance", name: "Quality & Compliance", purpose: "Release controls, reconciliation, and policy validation." },
  { id: "contact_inbox", name: "Contact Inbox", purpose: "Internal Microsoft contact triage and governed draft preparation." },
  { id: "website_operations", name: "Website Operations", purpose: "Site health, traffic, and incident review." },
  { id: "microsoft_operations", name: "Microsoft Operations", purpose: "Approval-gated Microsoft reads, records, and execution receipts." }
] as const;

function stateLabel(state: string | undefined) {
  if (state === "service_live") return "Live execution";
  if (state === "policy_gated_runtime") return "Runtime verified";
  if (state === "microsoft_control_plane") return "Microsoft control plane";
  if (state === "approval_gated_control_plane") return "Approval gated";
  return "Connection pending";
}

function lines(value: string) {
  return Array.from(new Set(value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean))).slice(0, 20);
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function runKey() {
  return `entral-${crypto.randomUUID()}`;
}

export function MemberAgentWorkspace({
  organizationId,
  organizationName,
  role
}: {
  organizationId: string;
  organizationName: string;
  role: MemberOrganizationRole;
}) {
  const [namedBusinesses, setNamedBusinesses] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [centerCity, setCenterCity] = useState("");
  const [region, setRegion] = useState("");
  const [radiusMiles, setRadiusMiles] = useState("25");
  const [maxResults, setMaxResults] = useState("20");
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [availability, setAvailability] = useState<AgentAvailability | null>(null);
  const [error, setError] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);

  const names = useMemo(() => lines(namedBusinesses), [namedBusinesses]);
  const hasRadiusSearch = Boolean(businessType.trim() || centerCity.trim());
  const formComplete = names.length > 0 || (businessType.trim().length >= 2 && centerCity.trim().length >= 2);

  const loadRuns = useCallback(async () => {
    setError("");
    setIsLoadingHistory(true);
    try {
      const response = await apiFetch<AgentRunsResponse>(
        `/api/member/organizations/${encodeURIComponent(organizationId)}/agent-runs`,
        { sameOrigin: true }
      );
      setRuns(Array.isArray(response.runs) ? response.runs : []);
      setAvailability(response.availability && Array.isArray(response.availability.agents)
        ? response.availability
        : { agents: [], executionEnabled: false });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Agent history could not be loaded.");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  async function submitRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRunning || !formComplete) return;
    setError("");
    setIsRunning(true);
    const idempotencyKey = pendingRunId ?? runKey();
    setPendingRunId(idempotencyKey);
    try {
      const response = await apiFetch<StoredAgentRunResponse>(
        `/api/member/organizations/${encodeURIComponent(organizationId)}/agent-runs`,
        {
          json: {
            idempotencyKey,
            namedBusinesses: names,
            ...(hasRadiusSearch ? {
              businessType: businessType.trim(),
              centerCity: centerCity.trim(),
              ...(region.trim() ? { region: region.trim() } : {}),
              radiusMiles: Number(radiusMiles)
            } : {}),
            country: "US",
            maxResults: Number(maxResults)
          },
          method: "POST",
          sameOrigin: true,
          timeoutMs: 295_000
        }
      );
      setRuns((current) => [response.run, ...current.filter((run) => run.id !== response.run.id)]);
      setPendingRunId(null);
    } catch (requestError) {
      const message = requestError instanceof ApiError && requestError.status === 408
        ? "The research run reached its time limit. Refresh history before trying again; the controlled record may still complete."
        : requestError instanceof Error ? requestError.message : "Sovereign Command could not complete the run.";
      setError(message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="member-agent-workspace member-panel" aria-labelledby="sovereign-command-heading">
      <div className="member-section-heading member-agent-heading">
        <Bot aria-hidden="true" size={22} />
        <div>
          <p className="eyebrow">Connected agent execution</p>
          <h2 id="sovereign-command-heading">Sovereign Command</h2>
          <p>Research named companies or discover a business category within a chosen radius. Results are source-linked and saved to {organizationName}.</p>
        </div>
        <span className={availability?.executionEnabled ? "member-agent-live" : "member-agent-live is-unavailable"}>
          <span aria-hidden="true" />
          {availability === null ? "Checking connection" : availability.executionEnabled ? "Live production connection" : "Execution unavailable"}
        </span>
      </div>

      <div className="member-agent-network" aria-labelledby="agent-network-heading">
        <div className="member-agent-network-copy">
          <p className="eyebrow">Connected operating network</p>
          <h3 id="agent-network-heading">Nine governed specialists, one command surface</h3>
          <p>Business Discovery can run here. Downstream specialists activate only when their required evidence and human review gate exists; Microsoft specialists remain inside the controlled Microsoft 365 plane.</p>
        </div>
        <div className="member-agent-network-grid">
          {agentNetwork.map((agent) => {
            const state = availability?.agents.find((item) => item.agentId === agent.id)?.state;
            return (
              <article className="member-agent-network-card" key={agent.id}>
                <div><strong>{agent.name}</strong><span>{stateLabel(state)}</span></div>
                <p>{agent.purpose}</p>
              </article>
            );
          })}
        </div>
      </div>

      {role === "OWNER" ? (
        <form className="member-agent-form" onSubmit={submitRun}>
          <div className="member-agent-form-grid">
            <label className="member-agent-field member-agent-field-wide">
              <span>Specific businesses <small>one per line, up to 20</small></span>
              <textarea
                maxLength={3200}
                onChange={(event) => {
                  setNamedBusinesses(event.target.value);
                  setPendingRunId(null);
                }}
                placeholder={"Acme Construction\nNorthwind Services"}
                rows={4}
                value={namedBusinesses}
              />
            </label>
            <div className="member-agent-search-group" aria-labelledby="radius-search-label">
              <div className="member-agent-search-label" id="radius-search-label"><MapPin aria-hidden="true" size={17} />Or discover by category and radius</div>
              <label className="member-agent-field">
                <span>Business type</span>
                <input maxLength={120} onChange={(event) => {
                  setBusinessType(event.target.value);
                  setPendingRunId(null);
                }} placeholder="General contractors" value={businessType} />
              </label>
              <label className="member-agent-field">
                <span>City</span>
                <input maxLength={120} onChange={(event) => {
                  setCenterCity(event.target.value);
                  setPendingRunId(null);
                }} placeholder="San Diego" value={centerCity} />
              </label>
              <label className="member-agent-field">
                <span>State or region <small>optional</small></span>
                <input maxLength={120} onChange={(event) => {
                  setRegion(event.target.value);
                  setPendingRunId(null);
                }} placeholder="California" value={region} />
              </label>
              <label className="member-agent-field">
                <span>Radius</span>
                <select onChange={(event) => {
                  setRadiusMiles(event.target.value);
                  setPendingRunId(null);
                }} value={radiusMiles}>
                  <option value="5">5 miles</option>
                  <option value="10">10 miles</option>
                  <option value="25">25 miles</option>
                  <option value="50">50 miles</option>
                  <option value="100">100 miles</option>
                  <option value="250">250 miles</option>
                </select>
              </label>
              <label className="member-agent-field">
                <span>Result limit</span>
                <select onChange={(event) => {
                  setMaxResults(event.target.value);
                  setPendingRunId(null);
                }} value={maxResults}>
                  <option value="10">10 companies</option>
                  <option value="20">20 companies</option>
                  <option value="40">40 companies</option>
                </select>
              </label>
            </div>
          </div>
          <div className="member-agent-actions">
            <Button disabled={!formComplete || availability?.executionEnabled !== true} isLoading={isRunning} type="submit">
              {isRunning ? <Loader2 aria-hidden="true" className="spin" size={17} /> : <Search aria-hidden="true" size={17} />}
              {isRunning ? "Researching public sources..." : "Run business discovery"}
            </Button>
            <p>{availability?.executionEnabled === false ? "Execution is safely disabled until the production agent service is healthy." : "Source coverage is documented; results are not represented as a complete census of the internet."}</p>
          </div>
        </form>
      ) : (
        <div className="member-agent-readonly">
          <ShieldCheck aria-hidden="true" size={20} />
          <p>Organization owners can start research. You can review every completed result below.</p>
        </div>
      )}

      {error ? (
        <div className="member-agent-error" role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <div className="member-agent-history-heading">
        <div><h3>Research history</h3><p>Organization-scoped production records with public-source citations.</p></div>
        <Button disabled={isLoadingHistory || isRunning} onClick={() => void loadRuns()} variant="ghost"><RefreshCw aria-hidden="true" size={16} />Refresh</Button>
      </div>

      {isLoadingHistory ? (
        <div className="member-agent-loading" role="status"><Loader2 aria-hidden="true" className="spin" size={20} />Loading research history...</div>
      ) : runs.length ? (
        <div className="member-agent-run-list">
          {runs.map((run) => (
            <article className="member-agent-run" key={run.id}>
              <header>
                <div><span className={`member-agent-status status-${run.result.status}`}>{run.result.status}</span><time dateTime={run.createdAt}>{displayDate(run.createdAt)}</time></div>
                <p>{run.result.search_summary}</p>
              </header>
              {run.result.businesses.length ? (
                <ol className="member-agent-businesses">
                  {run.result.businesses.map((business, index) => (
                    <li key={`${run.id}-${business.name}-${index}`}>
                      <div className="member-agent-business-heading">
                        <div><strong>{business.name}</strong><span>{[business.business_type, business.city, business.region].filter(Boolean).join(" · ") || "Business record"}</span></div>
                        <span className={`member-agent-confidence confidence-${business.confidence}`}>{business.confidence} confidence</span>
                      </div>
                      <p>{business.match_basis}</p>
                      <div className="member-agent-links">
                        {business.website ? <a href={business.website} rel="noopener noreferrer" target="_blank">Website<ExternalLink aria-hidden="true" size={13} /></a> : null}
                        {business.sources.map((source) => <a href={source.url} key={source.url} rel="noopener noreferrer" target="_blank">{source.title}<ExternalLink aria-hidden="true" size={13} /></a>)}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : <p className="member-panel-empty">No verified business records were returned for this run.</p>}
              {run.result.limitations.length ? <details><summary>Coverage notes</summary><ul>{run.result.limitations.map((item) => <li key={item}>{item}</li>)}</ul></details> : null}
              <footer><strong>Next command action</strong><p>{run.result.next_command_action}</p></footer>
            </article>
          ))}
        </div>
      ) : <div className="member-agent-empty"><Search aria-hidden="true" size={22} /><p>No research runs yet. Start with company names or a business type and radius.</p></div>}
    </section>
  );
}
