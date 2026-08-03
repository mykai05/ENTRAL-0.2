import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  BusinessFullRecordResponse,
  BusinessSummary,
  CanonicalHierarchyResponse,
  PortfolioSummaryResponse
} from "@entral/contracts";
import { CanonicalPortfolioDashboard } from "../components/CanonicalPortfolioDashboard";
import {
  applyCanonicalEventInvalidation,
  canonicalPortfolioCache,
  canonicalQueryKeys,
  loadCanonicalPortfolio
} from "../lib/canonical-portfolio";

const mocks = vi.hoisted(() => ({
  applyCommerceControl: vi.fn(),
  apiFetch: vi.fn(),
  loadCommerce: vi.fn(),
  search: ""
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mocks.search)
}));

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: mocks.apiFetch
}));

vi.mock("../lib/phase204-internal-commerce", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/phase204-internal-commerce")>()),
  applyPhase204CommerceControl: mocks.applyCommerceControl,
  loadPhase204InternalCommerce: mocks.loadCommerce
}));

const userId = "123e4567-e89b-42d3-a456-426614174000";
const commanderId = "223e4567-e89b-42d3-a456-426614174000";
const marshalId = "323e4567-e89b-42d3-a456-426614174000";

function business(
  businessId: string,
  name: string,
  generalId: string,
  generalName: string,
  overrides: Partial<BusinessSummary> = {}
): BusinessSummary {
  return {
    active_mission_count: 1,
    active_task_count: 2,
    agent_count: 3,
    automation_count: 1,
    business_id: businessId,
    business_name: name,
    capital_available: 5000,
    commander_id: commanderId,
    currency: "USD",
    general_id: generalId,
    general_name: generalName,
    gross_revenue: 12000,
    health_drivers: [{
      code: "verified-margin",
      direction: "POSITIVE",
      evidence_ids: [userId],
      explanation: "The canonical contribution snapshot is positive.",
      label: "Verified margin",
      severity: "INFO",
      source_freshness: "2026-07-25T00:00:00.000Z",
      value: 0.35
    }],
    health_score: 88,
    health_state: "HEALTHY",
    integration_count: 2,
    marshal_id: marshalId,
    marshal_name: "Business Portfolio",
    net_contribution: 4200,
    primary_objective: `Operate the canonical ${generalName.toLowerCase()} business.`,
    revenue_period_end: "2026-07-25T00:00:00.000Z",
    revenue_period_start: "2026-07-01T00:00:00.000Z",
    source_freshness: { finance: "2026-07-25T00:00:00.000Z" },
    stable_code: `business.${generalName.toLowerCase()}`,
    status: "OPERATING",
    tool_count: 4,
    top_exception: null,
    top_recommendation: "Review the next evidence-backed improvement.",
    updated_at: "2026-07-25T01:00:00.000Z",
    version: 3,
    ...overrides
  };
}

const businesses: BusinessSummary[] = [
  business("423e4567-e89b-42d3-a456-426614174000", "Northstar Store", "523e4567-e89b-42d3-a456-426614174000", "Store"),
  business("623e4567-e89b-42d3-a456-426614174000", "Atlas Software", "723e4567-e89b-42d3-a456-426614174000", "Software"),
  business("823e4567-e89b-42d3-a456-426614174000", "Beacon Service", "923e4567-e89b-42d3-a456-426614174000", "Service"),
  business("a23e4567-e89b-42d3-a456-426614174000", "Civic Marketplace", "b23e4567-e89b-42d3-a456-426614174000", "Marketplace"),
  business("c23e4567-e89b-42d3-a456-426614174000", "Delta Subscription", "d23e4567-e89b-42d3-a456-426614174000", "Subscription", {
    currency: null,
    gross_revenue: null,
    net_contribution: null,
    revenue_period_end: null,
    revenue_period_start: null
  })
];

const portfolio: PortfolioSummaryResponse = {
  businesses,
  event_sequence: 9,
  generated_at: "2026-07-25T02:00:00.000Z",
  scope: {
    label: "Human portfolio / all canonical businesses",
    mode: "HUMAN_PORTFOLIO",
    user_id: userId,
    visible_business_ids: businesses.map((candidate) => candidate.business_id)
  },
  totals: {
    active_commanders: 5,
    active_soldiers: 15,
    businesses: 5,
    financials: [{
      business_count: 4,
      businesses_with_financials: 4,
      capital_available: 20000,
      currency: "USD",
      gross_revenue: 48000,
      net_contribution: 16800
    }],
    health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 5, UNKNOWN: 0, WATCH: 0 },
    unresolved_exceptions: 0
  }
};

const hierarchy: CanonicalHierarchyResponse = {
  entities: [{
    active_alert: null,
    active_task_count: 2,
    assigned_business_id: businesses[0].business_id,
    child_count: 0,
    compute_tier: "STANDARD",
    current_mission: "Reconcile verified storefront operations.",
    entity_id: commanderId,
    entity_type: "COMMANDER",
    health: "HEALTHY",
    latest_material_result: { summary: "Verified settlement completed." },
    model_class: "CODEX",
    name: "Northstar Commander",
    parent_id: marshalId,
    stable_code: "commander.northstar",
    status: "ACTIVE",
    updated_at: "2026-07-25T01:30:00.000Z",
    version: 4
  }],
  event_sequence: portfolio.event_sequence,
  generated_at: portfolio.generated_at,
  scope: portfolio.scope
};

function fullRecord(summary = businesses[1]): BusinessFullRecordResponse {
  return {
    business: {
      agents_and_tools: { agents: [{ name: "Support Soldier", status: "ACTIVE" }], tool_grants: [] },
      aggregate_version: summary.version,
      decisions_and_changes: { decisions: [], governance_actions: [] },
      evidence_ids: [userId],
      external_activity: { source_records: [] },
      financials: { snapshots: [{ gross_revenue: summary.gross_revenue }] },
      issues_and_recommendations: { recommendations: [] },
      loaded_at: "2026-07-25T02:00:00.000Z",
      operations: { missions: [{ title: "Verified delivery mission" }], schedules: [], tasks: [] },
      overview: { profile: { business_model: summary.general_name }, state: { status: summary.status } },
      performance: { health: [], metrics: [], outcomes: [] },
      summary,
      version_history: [{ changed_at: "2026-07-25T01:00:00.000Z", reason: "Verified update", version: summary.version }]
    },
    event_sequence: portfolio.event_sequence
  };
}

beforeEach(() => {
  canonicalPortfolioCache.clear();
  mocks.apiFetch.mockReset();
  mocks.applyCommerceControl.mockReset();
  mocks.loadCommerce.mockReset();
  mocks.search = "";
});

afterEach(() => {
  canonicalPortfolioCache.clear();
});

describe("Phase 170 canonical portfolio client", () => {
  it("uses stable source-aware query keys and invalidates only changed business records", async () => {
    mocks.apiFetch.mockResolvedValueOnce(portfolio);
    await expect(loadCanonicalPortfolio({ organizationId: "organization-1" })).resolves.toEqual(portfolio);
    const portfolioKey = canonicalQueryKeys.portfolio({ organizationId: "organization-1" });
    const changedKey = canonicalQueryKeys.business({ organizationId: "organization-1" }, businesses[0].business_id);
    const unchangedKey = canonicalQueryKeys.business({ organizationId: "organization-1" }, businesses[1].business_id);
    canonicalPortfolioCache.set(changedKey, fullRecord(businesses[0]));
    canonicalPortfolioCache.set(unchangedKey, fullRecord(businesses[1]));

    const changed = applyCanonicalEventInvalidation({ organizationId: "organization-1" }, [{
      aggregate_id: businesses[0].business_id,
      aggregate_type: "BUSINESS",
      aggregate_version: 4,
      business_id: businesses[0].business_id,
      event_id: userId,
      event_type: "BUSINESS_UPDATED",
      occurred_at: "2026-07-25T03:00:00.000Z",
      sequence_number: 10
    }]);

    expect(changed).toEqual(new Set([businesses[0].business_id]));
    expect(canonicalPortfolioCache.get(portfolioKey)).toBeUndefined();
    expect(canonicalPortfolioCache.get(changedKey)).toBeUndefined();
    expect(canonicalPortfolioCache.get(unchangedKey)).toBeDefined();
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/member/organizations/organization-1/portfolio/summary",
      { signal: undefined }
    );
  });
});

describe("Phase 170 canonical Dashboard", () => {
  it("renders reusable cards for store, software, service, marketplace, and subscription businesses", async () => {
    mocks.apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith("/portfolio/summary")) return portfolio;
      throw new Error(`Unexpected path ${path}`);
    });

    render(<CanonicalPortfolioDashboard organizationId="organization-1" userName="Ada" />);

    expect(await screen.findByRole("heading", { name: "Ada's Dashboard" })).toBeInTheDocument();
    for (const candidate of businesses) {
      expect(screen.getByRole("heading", { name: candidate.business_name })).toBeInTheDocument();
    }
    expect(screen.getByText("5 of 5 visible")).toBeInTheDocument();
    expect(screen.getByText("Human portfolio / all canonical businesses")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable").length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText("Business, Marshal, General, objective"), {
      target: { value: "software" }
    });
    expect(screen.getByText("1 of 5 visible")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Atlas Software" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Northstar Store" })).not.toBeInTheDocument();
  });

  it("renders Command as an executive-only canonical summary without the Businesses management surface", () => {
    render(
      <CanonicalPortfolioDashboard
        organizationId="organization-1"
        userName="Ada"
        view="command"
        workspaceHierarchy={hierarchy}
        workspacePortfolio={portfolio}
        workspaceStatus="Canonical event 9"
      />
    );

    const command = screen.getByRole("heading", { name: "Command overview" }).closest("[data-member-destination-view]");
    expect(command).toHaveAttribute("data-member-destination-view", "command");
    expect(screen.getByLabelText("Portfolio totals")).toHaveAttribute("data-command-section", "portfolio-totals");
    expect(screen.getByRole("heading", { name: "Executive operating priorities" }).closest("[data-command-section]"))
      .toHaveAttribute("data-command-section", "operating-priorities");
    expect(screen.getByRole("heading", { name: "Requires attention now" })).toBeInTheDocument();
    expect(screen.getByText("No canonical exceptions or degraded businesses require attention.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ENTRAL work now" })).toBeInTheDocument();
    expect(screen.getAllByText("1 active missions · 2 active tasks")).toHaveLength(businesses.length);
    expect(screen.getByRole("heading", { name: "Current ENTRAL actions and results" })).toBeInTheDocument();
    expect(screen.getByText("Reconcile verified storefront operations.")).toBeInTheDocument();
    expect(screen.getByText("Verified settlement completed.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Owner decisions and next actions" })).toBeInTheDocument();
    expect(screen.getAllByText("Review the next evidence-backed improvement.")).toHaveLength(businesses.length);
    expect(screen.queryByLabelText("Portfolio search, sorting, and filters")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Canonical portfolio" })).not.toBeInTheDocument();
    expect(screen.queryAllByText("Open business")).toHaveLength(0);
  });

  it("keeps scoped Command details business-bound and excludes objective-only work", () => {
    const objectiveOnlyPortfolio = {
      ...portfolio,
      businesses: portfolio.businesses.map((candidate, index) => index === 0
        ? { ...candidate, active_mission_count: 0, active_task_count: 0 }
        : candidate)
    };
    const scopedHierarchy = {
      ...hierarchy,
      entities: [
        {
          ...hierarchy.entities[0],
          entity_id: "entral-root",
          entity_type: "ENTRAL" as const,
          assigned_business_id: null,
          current_mission: "Portfolio-wide root action must stay outside a business scope.",
          active_task_count: 1
        },
        ...hierarchy.entities.filter((candidate) => candidate.assigned_business_id === businesses[0].business_id)
      ]
    };

    render(
      <CanonicalPortfolioDashboard
        organizationId="organization-1"
        scopeBusinessId={businesses[0].business_id}
        view="command"
        workspaceHierarchy={scopedHierarchy}
        workspacePortfolio={objectiveOnlyPortfolio}
        workspaceStatus="Canonical event 9"
      />
    );

    expect(screen.getByLabelText("Portfolio-wide totals")).toHaveAttribute("data-command-scope", "business");
    expect(screen.getByText("Verified executive operating details for the active business scope. Portfolio-wide totals remain explicitly labeled."))
      .toBeInTheDocument();
    expect(screen.getByText("No canonical active missions or tasks are recorded.")).toBeInTheDocument();
    expect(screen.queryByText("Portfolio-wide root action must stay outside a business scope.")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: businesses[1].business_name })).not.toBeInTheDocument();
  });

  it("renders Businesses as portfolio management without duplicating the Command summary", () => {
    render(
      <CanonicalPortfolioDashboard
        organizationId="organization-1"
        view="businesses"
        workspacePortfolio={portfolio}
        workspaceStatus="Canonical event 9"
      />
    );

    const businessesView = screen.getByRole("heading", { name: "Businesses" }).closest("[data-member-destination-view]");
    expect(businessesView).toHaveAttribute("data-member-destination-view", "businesses");
    expect(screen.getByLabelText("Portfolio search, sorting, and filters")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Canonical portfolio" }).closest("[data-businesses-section]"))
      .toHaveAttribute("data-businesses-section", "portfolio-management");
    expect(screen.queryByLabelText("Portfolio totals")).not.toBeInTheDocument();
    expect(screen.getAllByText("Open business")[0]).toHaveAttribute(
      "href",
      `/member/dashboard?destination=businesses&record=${businesses[0].business_id}`
    );
  });

  it("keeps business detail and back navigation inside the Businesses destination", async () => {
    mocks.search = `destination=businesses&record=${businesses[1].business_id}`;
    mocks.apiFetch.mockResolvedValueOnce(fullRecord());

    render(
      <CanonicalPortfolioDashboard
        organizationId="organization-1"
        view="businesses"
        workspacePortfolio={portfolio}
      />
    );

    const detail = (await screen.findByRole("heading", { name: businesses[1].business_name }))
      .closest("[data-member-destination-view]");
    expect(detail).toHaveAttribute("data-member-destination-view", "businesses");
    expect(detail).toHaveAttribute("data-businesses-section", "business-detail");
    expect(screen.getByRole("link", { name: "Back to portfolio" })).toHaveAttribute(
      "href",
      "/member/dashboard?destination=businesses"
    );
  });

  it("loads internal commerce truth only inside the real SP-COMMERCE-001 business record", async () => {
    const commerceSummary = business(
      "f23e4567-e89b-42d3-a456-426614174000",
      "Contractor Operations Products",
      "9ce85809-e772-5a8f-be8d-34e01a9448a8",
      "Digital Products",
      { stable_code: "SP-COMMERCE-001" }
    );
    const commercePortfolio = {
      ...portfolio,
      businesses: [...portfolio.businesses, commerceSummary]
    };
    mocks.search = `destination=businesses&record=${commerceSummary.business_id}`;
    mocks.apiFetch.mockResolvedValueOnce(fullRecord(commerceSummary));
    mocks.loadCommerce.mockResolvedValue({
      business: null,
      organization_id: "223e4567-e89b-42d3-a456-426614174000",
      release_version: "phase-204",
      session_authority: { recent_mfa_verified: false },
      state: "NOT_ACTIVATED",
      tenant_id: "323e4567-e89b-42d3-a456-426614174000"
    });

    render(
      <CanonicalPortfolioDashboard
        organizationId="organization-1"
        view="businesses"
        workspacePortfolio={commercePortfolio}
      />
    );

    expect(await screen.findByRole("heading", { name: "Internal Commerce" })).toBeInTheDocument();
    expect(await screen.findByText("Internal commerce is not activated")).toBeInTheDocument();
    expect(mocks.loadCommerce).toHaveBeenCalledWith("organization-1", { signal: expect.any(AbortSignal) });
  });

  it("keeps canonical scope separate from business record navigation", async () => {
    mocks.search = `destination=businesses&business=${businesses[1].business_id}&record=${businesses[1].business_id}`;
    mocks.apiFetch.mockResolvedValueOnce(fullRecord());

    render(
      <CanonicalPortfolioDashboard
        organizationId="organization-1"
        scopeBusinessId={businesses[1].business_id}
        view="businesses"
        workspacePortfolio={portfolio}
      />
    );

    const detail = (await screen.findByRole("heading", { name: businesses[1].business_name }))
      .closest("[data-member-destination-view]");
    expect(detail).toHaveAttribute("data-businesses-section", "business-detail");
    expect(screen.getByRole("link", { name: "Back to portfolio" })).toHaveAttribute(
      "href",
      `/member/dashboard?destination=businesses&business=${businesses[1].business_id}`
    );
  });

  it("loads the full business only after opening its canonical route and keeps versions aligned", async () => {
    mocks.search = `business=${businesses[1].business_id}`;
    mocks.apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith("/portfolio/summary")) return portfolio;
      if (path.includes(`/businesses/${businesses[1].business_id}/full`)) return fullRecord();
      throw new Error(`Unexpected path ${path}`);
    });

    render(<CanonicalPortfolioDashboard organizationId="organization-1" />);

    expect(await screen.findByRole("heading", { name: "Atlas Software" })).toBeInTheDocument();
    expect(screen.getByText("Event 9")).toBeInTheDocument();
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Financials")).toBeInTheDocument();
    expect(screen.getByText("Agents and tools")).toBeInTheDocument();
    expect(screen.getByText("External activity")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        `/member/organizations/organization-1/businesses/${businesses[1].business_id}/full`,
        { signal: expect.any(AbortSignal) }
      );
    });
  });

  it("resolves an ENTRAL evidence deep link or states that the exact reference is unavailable", async () => {
    const missingEvidenceId = "e23e4567-e89b-42d3-a456-426614174000";
    mocks.search = `business=${businesses[1].business_id}&evidence=${missingEvidenceId}`;
    mocks.apiFetch.mockImplementation(async (path: string) => {
      if (path.endsWith("/portfolio/summary")) return portfolio;
      if (path.includes(`/businesses/${businesses[1].business_id}/full`)) return fullRecord();
      throw new Error(`Unexpected path ${path}`);
    });

    render(<CanonicalPortfolioDashboard organizationId="organization-1" />);

    expect(await screen.findByRole("heading", { name: "Evidence reference unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/No substitute evidence is being inferred/i)).toBeInTheDocument();
    expect(document.getElementById(`canonical-evidence-${missingEvidenceId}`)).toBeInTheDocument();
  });

  it("shows an honest empty state without inventing sample records", async () => {
    mocks.apiFetch.mockResolvedValueOnce({
      ...portfolio,
      businesses: [],
      scope: { ...portfolio.scope, visible_business_ids: [] },
      totals: {
        ...portfolio.totals,
        active_commanders: 0,
        active_soldiers: 0,
        businesses: 0,
        financials: [],
        health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 0, UNKNOWN: 0, WATCH: 0 }
      }
    });

    render(<CanonicalPortfolioDashboard organizationId="organization-1" />);

    expect(await screen.findByRole("heading", { name: "No canonical businesses are deployed." })).toBeInTheDocument();
    expect(screen.getByText(/will not create or imply sample business data/i)).toBeInTheDocument();
  });
});
