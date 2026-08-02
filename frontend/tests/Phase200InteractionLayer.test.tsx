import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Phase200BusinessHealthPanel } from "../components/Phase200BusinessHealthPanel";
import { Phase200InteractionNavigation } from "../components/Phase200InteractionNavigation";
import { phase200GraphLabelBudget } from "../lib/graph-view-state";

const interactionMocks = vi.hoisted(() => ({
  loadBusinessHealth: vi.fn(),
  recordInteractionAnalytics: vi.fn()
}));

vi.mock("../lib/interaction-layer", () => interactionMocks);
vi.mock("next/link", () => ({
  default: ({ children, href, scroll: _scroll, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...props}>{children}</a>
  )
}));

const response = {
  contract_version: "1.0.0",
  evidence: [{
    evidence_id: "portfolio:200",
    freshness: "CURRENT",
    label: "Canonical portfolio event 200",
    observed_at: "2026-08-02T00:00:00.000Z",
    source_id: "200",
    source_type: "CANONICAL_PORTFOLIO"
  }],
  health: {
    drivers: [{ code: "delivery", direction: "POSITIVE", evidence_ids: ["event:200"], explanation: "Recorded delivery is on track.", label: "Delivery", severity: "INFO", source_freshness: "2026-08-02T00:00:00.000Z", value: 1 }],
    score: 91,
    state: "HEALTHY",
    summary: "Canonical Business is healthy at recorded score 91.",
    value_status: "RECORDED"
  },
  identity: { name: "ENTRAL", provider_independent: true, release_version: "phase-200", voice_version: "entral-voice-v1" },
  mode: "EXECUTIVE",
  schema_version: 1,
  truth: {
    assumptions: [],
    business_id: "123e4567-e89b-42d3-a456-426614174000",
    business_scope: "Canonical Business",
    confidence: "RECORDED",
    evidence_freshness: { observed_at: "2026-08-02T00:00:00.000Z", state: "CURRENT" },
    next_action: { action_id: "OPEN_CANONICAL_BUSINESS_RECORD", available: true, label: "Review the canonical business record", unavailable_reason: null },
    organization_id: "organization-phase-200"
  }
} as const;

beforeEach(() => {
  interactionMocks.loadBusinessHealth.mockReset().mockImplementation(async (_organizationId, _businessId, mode) => ({ ...response, mode }));
  interactionMocks.recordInteractionAnalytics.mockReset().mockResolvedValue({ accepted: true });
});

describe("Phase 200 interaction UI", () => {
  it("renders exactly the five stable role-aware primary destinations", () => {
    render(<Phase200InteractionNavigation current="universe" role="OWNER" />);
    expect(screen.getByRole("navigation", { name: "Owner primary destinations" })).toHaveAttribute("data-member-role", "OWNER");
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Command", "Businesses", "Universe", "Infrastructure", "Tutorial"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/member/dashboard",
      "/member/dashboard?destination=businesses",
      "/member/graph",
      "/member/infrastructure",
      "/member/dashboard?destination=tutorial"
    ]);
    expect(screen.getByRole("link", { name: "Universe" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps executive and operational modes bound to the same canonical facts and evidence", async () => {
    render(<Phase200BusinessHealthPanel businessId={response.truth.business_id} organizationId={response.truth.organization_id} route="/member/dashboard" />);
    expect(await screen.findByText("91/100")).toBeInTheDocument();
    expect(screen.getByText("Canonical portfolio event 200")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Operational" }));
    await waitFor(() => expect(interactionMocks.loadBusinessHealth).toHaveBeenLastCalledWith(
      response.truth.organization_id,
      response.truth.business_id,
      "OPERATIONAL",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    ));
    expect(screen.getByText("91/100")).toBeInTheDocument();
    expect(screen.getByText("Canonical portfolio event 200")).toBeInTheDocument();
    expect(screen.getByText(/Recorded delivery is on track/)).toBeInTheDocument();
  });

  it("renders an honest unavailable state and records only a bounded route failure", async () => {
    interactionMocks.loadBusinessHealth.mockRejectedValue(new Error("unavailable"));
    render(<Phase200BusinessHealthPanel businessId={null} organizationId={response.truth.organization_id} route="/member/dashboard" />);
    expect(await screen.findByRole("alert")).toHaveTextContent("No score or recommendation has been substituted");
    expect(interactionMocks.recordInteractionAnalytics).toHaveBeenCalledWith(expect.objectContaining({
      eventType: "ROUTE_FAILURE",
      reasonCode: "BUSINESS_HEALTH_LOAD_FAILED"
    }));
  });

  it.each([
    [360, 8],
    [390, 10],
    [412, 12],
    [430, 14]
  ])("uses the explicit %ipx mobile label budget", (width, expected) => {
    expect(phase200GraphLabelBudget(width, 80)).toBe(expected);
  });

  it("preserves the configured desktop label budget", () => {
    expect(phase200GraphLabelBudget(1280, 64)).toBe(64);
    expect(phase200GraphLabelBudget(360, 6)).toBe(6);
  });
});
