import "@testing-library/jest-dom/vitest";
import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingProvider } from "../components/OnboardingTour";

const navigation = vi.hoisted(() => ({ pathname: "/member/dashboard", push: vi.fn() }));
const interaction = vi.hoisted(() => ({
  loadTutorialProgress: vi.fn(),
  recordInteractionAnalytics: vi.fn(),
  resetTutorialProgress: vi.fn(),
  saveTutorialProgress: vi.fn()
}));
const api = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push })
}));

vi.mock("../lib/interaction-layer", () => interaction);
vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: api.apiFetch
}));

const userId = "user-phase-203";
const organizationA = "organization-phase-203-a";
const organizationB = "organization-phase-203-b";

function progress(organizationId: string) {
  return {
    business_model_context: null,
    commander_pack_context: null,
    completed_anchor_ids: [],
    completed_at: null,
    contract_version: "1.0.0",
    current_anchor_id: "command-overview",
    first_launch_seen: true,
    mode: "beginner",
    organization_id: organizationId,
    plan_context: null,
    release_version: "phase-200",
    revision: 1,
    role_context: "MEMBER",
    schema_version: 1,
    started_at: "2026-08-03T03:00:00.000Z",
    updated_at: "2026-08-03T03:00:00.000Z",
    user_id: userId
  };
}

function projection(overrides: Record<string, unknown> = {}, claimOverrides: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    projection_id: "20000000-0000-4000-8000-000000000001",
    environment: "PRODUCTION",
    surface: "TUTORIAL",
    registry_revision: 9,
    generated_at: new Date(now - 1_000).toISOString(),
    expires_at: new Date(now + 300_000).toISOString(),
    claims: [{
      claim_id: "20000000-0000-4000-8000-000000000002",
      claim_key: "tutorial.command-overview",
      capability_id: "20000000-0000-4000-8000-000000000003",
      capability_key: "capability.tutorial.step.command-overview",
      capability_version: "200.0.0",
      display_name: "Approved Command lesson",
      lifecycle_state: "SELLABLE",
      approved_language: "Use the approved Command lesson backed by production evidence.",
      limitations: [],
      evidence_receipt_ids: ["20000000-0000-4000-8000-000000000004"],
      claim_record_version: 2,
      capability_record_version: 8,
      ...claimOverrides
    }],
    ...overrides
  };
}

function authenticate(organizationId = organizationA) {
  act(() => {
    window.dispatchEvent(new CustomEvent("entral:user-authenticated", { detail: { userId } }));
    window.dispatchEvent(new CustomEvent("entral:organization-context", {
      detail: { organizationId, userId }
    }));
  });
}

function openLibrary() {
  act(() => window.dispatchEvent(new Event("entral:open-academy")));
}

function renderProvider() {
  return render(
    <OnboardingProvider>
      <button data-academy="portfolio-dashboard" type="button">Command workspace</button>
    </OnboardingProvider>
  );
}

describe("Phase 203 Tutorial Product Truth publication", () => {
  beforeEach(() => {
    api.apiFetch.mockReset().mockResolvedValue(projection());
    interaction.loadTutorialProgress.mockReset().mockImplementation(async (organizationId) => progress(organizationId));
    interaction.recordInteractionAnalytics.mockReset().mockResolvedValue({ accepted: true });
    interaction.resetTutorialProgress.mockReset().mockImplementation(async (organizationId) => progress(organizationId));
    interaction.saveTutorialProgress.mockReset().mockImplementation(async (organizationId) => progress(organizationId));
    navigation.push.mockReset();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("renders only an exact fresh receipt-backed SELLABLE Tutorial claim", async () => {
    renderProvider();
    authenticate();
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledWith(
      `/member/organizations/${organizationA}/product-truth?surface=TUTORIAL`,
      expect.objectContaining({ signal: undefined })
    ));
    openLibrary();

    expect(await screen.findByText("Published Tutorial verified · registry revision 9")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approved Command lesson" })).toBeInTheDocument();
    expect(screen.queryByText("Navigate Universe")).not.toBeInTheDocument();

    act(() => window.dispatchEvent(new Event("entral:open-tutorial")));
    expect(screen.getByRole("heading", { level: 2, name: "Approved Command lesson" })).toBeInTheDocument();
    expect(screen.getAllByText("Use the approved Command lesson backed by production evidence.")).toHaveLength(2);
    expect(screen.queryByText("Review the business-health explanation and open its evidence source before choosing an action.")).not.toBeInTheDocument();
    expect(screen.queryByText("Command is the default post-login surface.", { exact: false })).not.toBeInTheDocument();
  });

  it("shows an explicit no-published-lessons state for an empty verified projection", async () => {
    api.apiFetch.mockResolvedValue(projection({ claims: [] }));
    renderProvider();
    authenticate();
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalled());
    openLibrary();

    expect(await screen.findByRole("heading", { name: "No published Tutorial lessons" })).toBeInTheDocument();
    expect(screen.queryByText("Start from Command")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enter Command Center" })).toBeInTheDocument();
  });

  it("fails closed with an alert when Product Truth is unavailable", async () => {
    api.apiFetch.mockRejectedValue(new Error("offline"));
    renderProvider();
    authenticate();
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalled());
    openLibrary();

    expect(await screen.findByRole("alert")).toHaveTextContent("Tutorial publication unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("No local or cached lessons");
    expect(screen.queryByText("Start from Command")).not.toBeInTheDocument();
  });

  it.each([
    ["malformed", () => projection({ schema_version: 2 })],
    ["stale", () => projection({
      generated_at: new Date(Date.now() - 600_000).toISOString(),
      expires_at: new Date(Date.now() - 300_000).toISOString()
    })],
    ["ACTIVE", () => projection({}, { lifecycle_state: "ACTIVE" })],
    ["non-sellable", () => projection({}, { lifecycle_state: "CATALOGUED" })]
  ])("blocks a %s projection without exposing the static lesson", async (_label, buildProjection) => {
    api.apiFetch.mockResolvedValue(buildProjection());
    renderProvider();
    authenticate();
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalled());
    openLibrary();

    expect(await screen.findByRole("alert")).toHaveTextContent("Tutorial publication unavailable");
    expect(screen.queryByText("Start from Command")).not.toBeInTheDocument();
    expect(screen.queryByText("Approved Command lesson")).not.toBeInTheDocument();
  });

  it("clears the previous organization eligibility before the next organization readback resolves", async () => {
    let resolveSecond: ((value: unknown) => void) | undefined;
    let resolveSecondProgress: ((value: unknown) => void) | undefined;
    const secondProjection = new Promise((resolve) => { resolveSecond = resolve; });
    const secondProgress = new Promise((resolve) => { resolveSecondProgress = resolve; });
    api.apiFetch.mockImplementation((path: string) => path.includes(organizationB)
      ? secondProjection
      : Promise.resolve(projection()));
    interaction.loadTutorialProgress.mockImplementation((organizationId) => organizationId === organizationB
      ? secondProgress
      : Promise.resolve(progress(organizationId)));

    renderProvider();
    authenticate(organizationA);
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledWith(
      `/member/organizations/${organizationA}/product-truth?surface=TUTORIAL`,
      expect.objectContaining({ signal: undefined })
    ));
    openLibrary();
    expect(await screen.findByRole("button", { name: "Approved Command lesson" })).toBeInTheDocument();

    authenticate(organizationB);
    expect(screen.queryByRole("button", { name: "Approved Command lesson" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verifying published Tutorial lessons" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset Tutorial progress" })).toBeDisabled();

    await act(async () => {
      resolveSecond?.(projection({ claims: [] }));
      resolveSecondProgress?.(progress(organizationB));
    });
    expect(await screen.findByRole("heading", { name: "No published Tutorial lessons" })).toBeInTheDocument();
    expect(api.apiFetch).toHaveBeenCalledWith(
      `/member/organizations/${organizationB}/product-truth?surface=TUTORIAL`,
      expect.objectContaining({ signal: undefined })
    );
  });
});
