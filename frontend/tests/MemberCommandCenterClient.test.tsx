import "@testing-library/jest-dom/vitest";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemberCommandCenterClient } from "../components/MemberCommandCenterClient";
import { OnboardingProvider } from "../components/OnboardingTour";
import {
  canonicalOrganizationSwitchPresentation,
  isCanonicalRefreshCurrent
} from "../lib/canonical-refresh";

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn()
}));

const api = vi.hoisted(() => ({
  apiFetch: vi.fn()
}));

const interaction = vi.hoisted(() => ({
  loadBusinessHealth: vi.fn(),
  loadTutorialProgress: vi.fn(),
  recordInteractionAnalytics: vi.fn(),
  resetTutorialProgress: vi.fn(),
  saveTutorialProgress: vi.fn()
}));

const canonicalEvents = vi.hoisted(() => ({
  subscriptions: [] as Array<{
    onError?: (error: unknown) => void;
    onEvents: (response: {
      events: readonly Record<string, unknown>[];
      next_sequence: number;
    }, changedBusinessIds: ReadonlySet<string>) => void;
    onPoll?: (response: {
      events: readonly Record<string, unknown>[];
      next_sequence: number;
    }) => void;
  }>
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/member/dashboard",
  useRouter: () => navigation,
  useSearchParams: () => new URLSearchParams()
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    apiFetch: api.apiFetch
  };
});

vi.mock("../lib/canonical-portfolio", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/canonical-portfolio")>();
  return {
    ...actual,
    subscribeCanonicalPortfolioEvents: vi.fn((_source, options) => {
      canonicalEvents.subscriptions.push(options);
      return () => undefined;
    })
  };
});

vi.mock("../lib/interaction-layer", () => interaction);

vi.mock("../components/Phase200BusinessHealthPanel", () => ({
  Phase200BusinessHealthPanel: () => null
}));

vi.mock("../components/CanonicalPortfolioDashboard", () => ({
  CanonicalPortfolioDashboard: ({ workspacePortfolio }: {
    workspacePortfolio: { scope: { label: string } };
  }) => <><h1>Member Dashboard</h1><div>{workspacePortfolio.scope.label}</div></>
}));

const portfolio = {
  businesses: [],
  event_sequence: 0,
  generated_at: "2026-07-25T00:00:00.000Z",
  scope: {
    label: "Human portfolio / all canonical businesses",
    mode: "HUMAN_PORTFOLIO",
    user_id: "123e4567-e89b-42d3-a456-426614174000",
    visible_business_ids: []
  },
  totals: {
    active_commanders: 0,
    active_soldiers: 0,
    businesses: 0,
    financials: [],
    health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 0, UNKNOWN: 0, WATCH: 0 },
    unresolved_exceptions: 0
  }
};

const hierarchy = {
  entities: [{
    active_alert: null,
    active_task_count: 0,
    assigned_business_id: null,
    child_count: 0,
    compute_tier: null,
    current_mission: null,
    entity_id: "223e4567-e89b-42d3-a456-426614174000",
    entity_type: "ENTRAL",
    health: "HEALTHY",
    latest_material_result: null,
    model_class: null,
    name: "ENTRAL",
    parent_id: null,
    stable_code: "ENTRAL.CORE",
    status: "ACTIVE",
    updated_at: "2026-07-25T00:00:00.000Z",
    version: 1
  }],
  event_sequence: 0,
  generated_at: "2026-07-25T00:00:00.000Z",
  scope: portfolio.scope
};

function emptyEntralConversation(eventSequence = 0) {
  return {
    event_sequence: eventSequence,
    generated_at: "2026-07-25T00:00:00.000Z",
    messages: []
  };
}

const phase200BusinessHealth = {
  contract_version: "1.0.0",
  evidence: [{
    evidence_id: "canonical-portfolio:0",
    freshness: "CURRENT",
    label: "Canonical portfolio event 0",
    observed_at: "2026-07-25T00:00:00.000Z",
    source_id: "portfolio:event:0",
    source_type: "CANONICAL_PORTFOLIO"
  }],
  health: {
    drivers: [],
    score: null,
    state: "UNKNOWN",
    summary: "No canonical business health score is recorded.",
    value_status: "UNAVAILABLE"
  },
  identity: {
    name: "ENTRAL",
    provider_independent: true,
    release_version: "phase-200",
    voice_version: "entral-voice-v1"
  },
  mode: "EXECUTIVE",
  schema_version: 1,
  truth: {
    assumptions: [],
    business_id: null,
    business_scope: "Human portfolio / all canonical businesses",
    confidence: "RECORDED",
    evidence_freshness: {
      observed_at: "2026-07-25T00:00:00.000Z",
      state: "CURRENT"
    },
    next_action: {
      action_id: "OPEN_CANONICAL_BUSINESS_RECORD",
      available: false,
      label: "Review the canonical business record",
      unavailable_reason: "No business is selected."
    },
    organization_id: "organization-1"
  }
};

const phase200TutorialProgress = {
  business_model_context: "Software",
  commander_pack_context: "Operations",
  completed_anchor_ids: [],
  completed_at: null,
  contract_version: "1.0.0",
  current_anchor_id: "command-overview",
  first_launch_seen: true,
  mode: "beginner",
  organization_id: "organization-1",
  plan_context: "Owner",
  release_version: "phase-200",
  revision: 1,
  role_context: "OWNER",
  schema_version: 1,
  started_at: "2026-07-25T00:00:00.000Z",
  updated_at: "2026-07-25T00:00:00.000Z",
  user_id: "user-1"
};

function successfulApi(path: string) {
  if (path.endsWith("/portfolio/summary")) return Promise.resolve(portfolio);
  if (path.endsWith("/hierarchy")) return Promise.resolve(hierarchy);
  if (path.includes("/interaction/business-health?")) return Promise.resolve(phase200BusinessHealth);
  if (path.endsWith("/interaction/tutorial-progress")) return Promise.resolve(phase200TutorialProgress);
  if (path.endsWith("/interaction/analytics")) return Promise.resolve({ accepted: true });
  if (path.includes("/entral/conversation")) return Promise.resolve(emptyEntralConversation());
  if (path.includes("/events?afterSequence=")) return Promise.resolve({ events: [], next_sequence: 0 });
  if (path === "/logout") return Promise.resolve({ ok: true });
  return Promise.reject(new Error(`Unexpected test request: ${path}`));
}

describe("MemberCommandCenterClient authentication handoff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.apiFetch.mockReset().mockImplementation((path: string) => successfulApi(path));
    interaction.loadBusinessHealth.mockReset().mockResolvedValue(phase200BusinessHealth);
    interaction.loadTutorialProgress.mockReset().mockResolvedValue(phase200TutorialProgress);
    interaction.recordInteractionAnalytics.mockReset().mockResolvedValue({ accepted: true });
    interaction.resetTutorialProgress.mockReset().mockResolvedValue(phase200TutorialProgress);
    interaction.saveTutorialProgress.mockReset().mockResolvedValue(phase200TutorialProgress);
    canonicalEvents.subscriptions.length = 0;
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("persists only the server-validated member identity before publishing the Academy auth event", async () => {
    let authDetail: unknown = null;
    const handleAuthenticated = (event: Event) => {
      authDetail = event instanceof CustomEvent ? event.detail : null;
    };
    window.addEventListener("entral:user-authenticated", handleAuthenticated);

    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
    });

    const storedIdentity = JSON.parse(window.sessionStorage.getItem("entral-authenticated-user") ?? "null");
    expect(storedIdentity).toEqual({ userId: "user-1" });
    expect(authDetail).toEqual({ userId: "user-1" });
    expect(storedIdentity).not.toHaveProperty("email");
    expect(storedIdentity).not.toHaveProperty("role");
    expect(storedIdentity).not.toHaveProperty("token");

    window.removeEventListener("entral:user-authenticated", handleAuthenticated);
  });

  it("opens Academy from the real provider hierarchy without redirecting the authenticated member", async () => {
    render(
      <OnboardingProvider>
        <MemberCommandCenterClient
          organizationId="organization-1"
          userId="user-1"
        />
      </OnboardingProvider>
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
    });
    act(() => {
      window.dispatchEvent(new Event("entral:open-academy"));
    });

    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "ENTRAL Academy" })).toBeInTheDocument();
    expect(screen.getByText("Tutorial library")).toBeInTheDocument();
  });

  it("opens Academy from the real provider hierarchy when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    render(
      <OnboardingProvider>
        <MemberCommandCenterClient
          organizationId="organization-1"
          userId="user-1"
        />
      </OnboardingProvider>
    );

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 10));
    });
    act(() => {
      window.dispatchEvent(new Event("entral:open-academy"));
    });

    expect(navigation.push).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "ENTRAL Academy" })).toBeInTheDocument();
    expect(screen.getByText("Tutorial library")).toBeInTheDocument();
  });

  it("opens the compact member-safe ENTRAL assistant without calling internal conversation APIs", async () => {
    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Dashboard$/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Open ENTRAL assistant" }));

    expect(screen.getByRole("region", { name: "ENTRAL assistant" })).toBeInTheDocument();
    expect(screen.getByText("Event 0")).toBeInTheDocument();
    expect(screen.getByText(/Same RLS scope, selection, and canonical event/i)).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message ENTRAL" })).toBeInTheDocument();
    expect(api.apiFetch).not.toHaveBeenCalledWith(expect.stringContaining("/ai/"), expect.anything());
  });

  it("keeps a scope-visible ENTRAL message visible while its canonical event receipt is pending", async () => {
    api.apiFetch.mockImplementation((path: string) => {
      if (path.endsWith("/portfolio/summary")) return Promise.resolve(portfolio);
      if (path.endsWith("/hierarchy")) return Promise.resolve(hierarchy);
      if (path.includes("/entral/conversation")) {
        return Promise.resolve({
          ...emptyEntralConversation(),
          messages: [{
            acknowledged_at: null,
            business_id: null,
            content: "Canonical receipt is still being recorded.",
            created_at: "2026-07-25T03:00:00.000Z",
            delivered_at: null,
            direction: "HUMAN_TO_ENTRAL",
            entral_entity_id: "223e4567-e89b-42d3-a456-426614174000",
            event_id: null,
            event_sequence: null,
            evidence_refs: [],
            message_id: "323e4567-e89b-42d3-a456-426614174000",
            message_type: "CLARIFICATION",
            status: "PENDING"
          }]
        });
      }
      if (path.includes("/events?afterSequence=")) {
        return Promise.resolve({ events: [], next_sequence: 0 });
      }
      return Promise.reject(new Error(`Unexpected test request: ${path}`));
    });

    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await screen.findByRole("heading", { name: /Dashboard$/ });
    fireEvent.click(screen.getByRole("button", { name: "Open ENTRAL assistant" }));

    expect(screen.getByText("Canonical receipt is still being recorded.")).toBeInTheDocument();
    expect(screen.getByText("Event 0")).toBeInTheDocument();
  });

  it("does not let a stale organization refresh overwrite the newly selected workspace", () => {
    expect(isCanonicalRefreshCurrent({
      currentGeneration: 4,
      currentOrganizationId: "organization-2",
      requestedGeneration: 3,
      requestedOrganizationId: "organization-1"
    })).toBe(false);
    expect(isCanonicalRefreshCurrent({
      currentGeneration: 4,
      currentOrganizationId: "organization-2",
      requestedGeneration: 4,
      requestedOrganizationId: "organization-1"
    })).toBe(false);
    expect(isCanonicalRefreshCurrent({
      currentGeneration: 4,
      currentOrganizationId: "organization-2",
      requestedGeneration: 4,
      requestedOrganizationId: "organization-2"
    })).toBe(true);
  });

  it("hides the prior organization snapshot while the newly selected organization is still loading", () => {
    expect(canonicalOrganizationSwitchPresentation()).toEqual({
      conversationMessages: [],
      graphPreferences: null,
      graphProjection: null,
      hierarchy: null,
      isLoading: true,
      portfolio: null,
      syncState: "connecting",
      syncStatus: "Switching member access context",
      workspaceError: ""
    });
  });

  it("does not report connected or aligned while a post-event snapshot refresh is still pending", async () => {
    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await screen.findByRole("heading", { name: /Dashboard$/ });
    fireEvent.click(screen.getByRole("button", { name: "Open ENTRAL assistant" }));
    expect(screen.getByText("Event 0")).toBeInTheDocument();

    let resolveRefreshedPortfolio!: (value: typeof portfolio) => void;
    let resolveRefreshedHierarchy!: (value: typeof hierarchy) => void;
    const refreshedPortfolioRequest = new Promise<typeof portfolio>((resolve) => {
      resolveRefreshedPortfolio = resolve;
    });
    const refreshedHierarchyRequest = new Promise<typeof hierarchy>((resolve) => {
      resolveRefreshedHierarchy = resolve;
    });
    api.apiFetch.mockImplementation((path: string) => {
      if (path.endsWith("/portfolio/summary")) return refreshedPortfolioRequest;
      if (path.endsWith("/hierarchy")) return refreshedHierarchyRequest;
      if (path.includes("/entral/conversation")) return Promise.resolve(emptyEntralConversation(1));
      if (path.includes("/events?afterSequence=")) return Promise.resolve({ events: [], next_sequence: 1 });
      return Promise.reject(new Error(`Unexpected test request: ${path}`));
    });

    const subscription = canonicalEvents.subscriptions.at(-1);
    expect(subscription).toBeDefined();
    act(() => {
      subscription!.onEvents({
        events: [{
          aggregate_id: "business-1",
          aggregate_type: "BUSINESS",
          aggregate_version: 1,
          business_id: "business-1",
          event_id: "event-1",
          event_type: "BUSINESS_UPDATED",
          occurred_at: "2026-07-25T01:00:00.000Z",
          sequence_number: 1
        }],
        next_sequence: 1
      }, new Set(["business-1"]));
    });
    expect(screen.getAllByText("Refreshing through canonical event 1")).not.toHaveLength(0);

    act(() => {
      subscription!.onPoll?.({ events: [], next_sequence: 1 });
    });
    expect(screen.getAllByText("Event channel connected · refreshing canonical snapshot through event 1")).not.toHaveLength(0);
    expect(screen.queryByText(/Connected · canonical event 1/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Connected Â· canonical event 1/i)).not.toBeInTheDocument();

    const refreshedPortfolio = {
      ...portfolio,
      event_sequence: 1,
      generated_at: "2026-07-25T01:00:00.000Z"
    };
    const refreshedHierarchy = {
      ...hierarchy,
      event_sequence: 1,
      generated_at: "2026-07-25T01:00:00.000Z"
    };
    await act(async () => {
      resolveRefreshedPortfolio(refreshedPortfolio);
      resolveRefreshedHierarchy(refreshedHierarchy);
      await Promise.resolve();
    });

    expect(await screen.findByText("Event 1")).toBeInTheDocument();
    expect(screen.getAllByText(/canonical event 1/i)).not.toHaveLength(0);
  });

  it("keeps a failed post-event refresh blocked when the event channel polls successfully again", async () => {
    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await screen.findByRole("heading", { name: /Dashboard$/ });
    fireEvent.click(screen.getByRole("button", { name: "Open ENTRAL assistant" }));
    api.apiFetch.mockImplementation((path: string) => {
      if (path.endsWith("/portfolio/summary") || path.endsWith("/hierarchy")) {
        return Promise.reject(new Error("post-event snapshot unavailable"));
      }
      if (path.includes("/entral/conversation")) return Promise.resolve(emptyEntralConversation(1));
      if (path.includes("/events?afterSequence=")) return Promise.resolve({ events: [], next_sequence: 1 });
      return Promise.reject(new Error(`Unexpected test request: ${path}`));
    });

    const subscription = canonicalEvents.subscriptions.at(-1);
    expect(subscription).toBeDefined();
    act(() => {
      subscription!.onEvents({
        events: [{
          aggregate_id: "business-1",
          aggregate_type: "BUSINESS",
          aggregate_version: 1,
          business_id: "business-1",
          event_id: "event-1",
          event_type: "BUSINESS_UPDATED",
          occurred_at: "2026-07-25T01:00:00.000Z",
          sequence_number: 1
        }],
        next_sequence: 1
      }, new Set(["business-1"]));
    });

    expect(await screen.findAllByText("post-event snapshot unavailable")).not.toHaveLength(0);
    expect(screen.getByText("Canonical sync blocked")).toBeInTheDocument();

    await act(async () => {
      subscription!.onPoll?.({ events: [], next_sequence: 1 });
      await Promise.resolve();
    });
    expect(await screen.findAllByText("post-event snapshot unavailable")).not.toHaveLength(0);
    expect(screen.queryByText(/Connected · canonical event 1/i)).not.toBeInTheDocument();
    expect(screen.getByText("Event 0")).toBeInTheDocument();
    expect(screen.queryByText("Event 1")).not.toBeInTheDocument();
  });

  it("clears the published identity only after backend sign-out succeeds", async () => {
    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/member/sign-in");
    });
    expect(api.apiFetch).toHaveBeenCalledWith("/logout", { method: "POST" });
    expect(window.sessionStorage.getItem("entral-authenticated-user")).toBeNull();
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("preserves the valid identity when backend sign-out fails", async () => {
    api.apiFetch.mockImplementation((path: string) =>
      path === "/logout" ? Promise.reject(new Error("sign-out unavailable")) : successfulApi(path)
    );
    const alert = vi.spyOn(window, "alert").mockImplementation(() => undefined);
    render(
      <MemberCommandCenterClient
        organizationId="organization-1"
        userId="user-1"
      />
    );

    await waitFor(() => {
      expect(window.sessionStorage.getItem("entral-authenticated-user")).not.toBeNull();
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(alert).toHaveBeenCalledWith("Sign out could not be completed. Please try again.");
    });
    expect(window.sessionStorage.getItem("entral-authenticated-user")).toBe(JSON.stringify({ userId: "user-1" }));
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
