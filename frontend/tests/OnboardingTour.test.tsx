import "@testing-library/jest-dom/vitest";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OnboardingProvider } from "../components/OnboardingTour";

const navigationMocks = vi.hoisted(() => ({ pathname: "/dashboard", push: vi.fn() }));
const interactionMocks = vi.hoisted(() => ({
  loadTutorialProgress: vi.fn(),
  recordInteractionAnalytics: vi.fn(),
  resetTutorialProgress: vi.fn(),
  saveTutorialProgress: vi.fn()
}));
const apiMocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useRouter: () => ({ push: navigationMocks.push })
}));

vi.mock("../lib/interaction-layer", () => interactionMocks);
vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: apiMocks.apiFetch
}));

const organizationId = "organization-phase-200";
const userId = "user-phase-200";

function publishedTutorialProjection() {
  const stepClaims = [
    ["command-overview", "Start from Command"],
    ["businesses-overview", "Review canonical businesses"],
    ["universe-navigation", "Navigate Universe"],
    ["infrastructure-records", "Inspect source records"],
    ["entral-assistant", "Use contextual ENTRAL help"]
  ];
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    projection_id: "30000000-0000-4000-8000-000000000001",
    environment: "PRODUCTION",
    surface: "TUTORIAL",
    registry_revision: 9,
    generated_at: new Date(Date.now() - 1_000).toISOString(),
    expires_at: new Date(Date.now() + 300_000).toISOString(),
    claims: stepClaims.map(([stepId, title], index) => ({
      claim_id: `30000000-0000-4000-8000-${String(index + 2).padStart(12, "0")}`,
      claim_key: `tutorial.${stepId}`,
      capability_id: `30000000-0000-4000-8001-${String(index + 2).padStart(12, "0")}`,
      capability_key: `capability.tutorial.step.${stepId}`,
      capability_version: "200.0.0",
      display_name: title,
      lifecycle_state: "SELLABLE",
      approved_language: `Receipt-backed ${title} lesson.`,
      limitations: [],
      evidence_receipt_ids: [`30000000-0000-4000-8002-${String(index + 2).padStart(12, "0")}`],
      claim_record_version: 1,
      capability_record_version: 1
    }))
  };
}

function progress(overrides: Record<string, unknown> = {}) {
  return {
    business_model_context: null,
    commander_pack_context: null,
    completed_anchor_ids: [],
    completed_at: null,
    contract_version: "1.0.0",
    current_anchor_id: "command-overview",
    first_launch_seen: false,
    mode: "beginner",
    organization_id: organizationId,
    plan_context: null,
    release_version: "phase-200",
    revision: 1,
    role_context: "MEMBER",
    schema_version: 1,
    started_at: "2026-08-02T00:00:00.000Z",
    updated_at: "2026-08-02T00:00:00.000Z",
    user_id: userId,
    ...overrides
  };
}

function authenticateUser() {
  act(() => {
    window.dispatchEvent(new CustomEvent("entral:user-authenticated", { detail: { userId } }));
    window.dispatchEvent(new CustomEvent("entral:organization-context", {
      detail: { organizationId, userId }
    }));
  });
}

function renderProvider() {
  return render(
    <OnboardingProvider>
      <button data-academy="portfolio-dashboard" type="button">Command facts</button>
    </OnboardingProvider>
  );
}

describe("Phase 200 OnboardingProvider", () => {
  beforeEach(() => {
    navigationMocks.pathname = "/dashboard";
    navigationMocks.push.mockReset();
    interactionMocks.loadTutorialProgress.mockReset().mockResolvedValue(progress());
    interactionMocks.saveTutorialProgress.mockReset().mockImplementation(async (_organizationId, update) => progress({
      completed_anchor_ids: update.completed_anchor_ids,
      current_anchor_id: update.current_anchor_id,
      first_launch_seen: update.first_launch_seen,
      mode: update.mode,
      revision: update.expected_revision + 1
    }));
    interactionMocks.resetTutorialProgress.mockReset().mockResolvedValue(progress({ revision: 3 }));
    interactionMocks.recordInteractionAnalytics.mockReset().mockResolvedValue({ accepted: true });
    apiMocks.apiFetch.mockReset().mockResolvedValue(publishedTutorialProjection());
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never opens automatically and loads progress only after authenticated organization context", async () => {
    renderProvider();
    authenticateUser();
    await waitFor(() => expect(interactionMocks.loadTutorialProgress).toHaveBeenCalledWith(organizationId));
    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();
  });

  it("redirects an unauthenticated manual Tutorial request", () => {
    renderProvider();
    act(() => window.dispatchEvent(new Event("entral:open-academy")));
    expect(navigationMocks.push).toHaveBeenCalledWith("/member/sign-in?returnTo=%2Fmember%2Fdashboard");
    expect(screen.queryByRole("dialog", { name: "ENTRAL Academy" })).not.toBeInTheDocument();
  });

  it("resumes released anchors and exposes only the five receipt-backed published lessons", async () => {
    interactionMocks.loadTutorialProgress.mockResolvedValue(progress({
      completed_anchor_ids: ["command-overview", "businesses-overview"],
      current_anchor_id: "universe-navigation",
      first_launch_seen: true,
      revision: 7
    }));
    renderProvider();
    authenticateUser();
    await waitFor(() => expect(interactionMocks.loadTutorialProgress).toHaveBeenCalledWith(organizationId));
    act(() => window.dispatchEvent(new Event("entral:open-academy")));
    expect(await screen.findByText("Server progress synced · revision 7")).toBeInTheDocument();
    expect(screen.getByText("Tutorial library")).toBeInTheDocument();
    expect(screen.getByText("Published lessons")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start from Command" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review canonical businesses" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Navigate Universe" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inspect source records" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use contextual ENTRAL help" })).toBeInTheDocument();
    expect(screen.getByLabelText("2 of 5 Academy lessons completed")).toBeInTheDocument();
    act(() => window.dispatchEvent(new Event("entral:open-tutorial")));
    expect(screen.getByRole("heading", { level: 2, name: "Navigate Universe" })).toBeInTheDocument();
  });

  it("persists mode through the versioned server transition without local progress state", async () => {
    renderProvider();
    authenticateUser();
    await waitFor(() => expect(interactionMocks.loadTutorialProgress).toHaveBeenCalledWith(organizationId));
    act(() => window.dispatchEvent(new Event("entral:open-academy")));
    expect(await screen.findByText("Server progress synced · revision 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Advanced" }));
    await waitFor(() => expect(interactionMocks.saveTutorialProgress).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({
        contract_version: "1.0.0",
        expected_revision: 1,
        idempotency_key: expect.stringContaining("phase200:tutorial:update:"),
        mode: "advanced",
        schema_version: 1
      })
    ));
    expect(window.localStorage.length).toBe(0);
  });

  it("performs an honest server reset and reads back the new revision", async () => {
    interactionMocks.loadTutorialProgress.mockResolvedValue(progress({ revision: 2 }));
    renderProvider();
    authenticateUser();
    await waitFor(() => expect(interactionMocks.loadTutorialProgress).toHaveBeenCalledWith(organizationId));
    act(() => window.dispatchEvent(new Event("entral:open-academy")));
    expect(await screen.findByText("Server progress synced · revision 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset Tutorial progress" }));
    await waitFor(() => expect(interactionMocks.resetTutorialProgress).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({ expected_revision: 2, schema_version: 1 })
    ));
    expect(await screen.findByText("Tutorial reset on the server · revision 3")).toBeInTheDocument();
  });

  it("reports a failed reset as a failed control without claiming success", async () => {
    interactionMocks.resetTutorialProgress.mockRejectedValue(new Error("unavailable"));
    renderProvider();
    authenticateUser();
    await waitFor(() => expect(interactionMocks.loadTutorialProgress).toHaveBeenCalledWith(organizationId));
    act(() => window.dispatchEvent(new Event("entral:open-academy")));
    expect(await screen.findByText("Server progress synced · revision 1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset Tutorial progress" }));
    expect(await screen.findByText("Tutorial reset was not applied. Reload the server progress and try again.")).toBeInTheDocument();
    expect(interactionMocks.recordInteractionAnalytics).toHaveBeenCalledWith(expect.objectContaining({
      controlId: "tutorial-reset",
      eventType: "CONTROL_FAILED"
    }));
  });
});
