import "@testing-library/jest-dom/vitest";
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CapabilityTruthAdmin } from "../components/CapabilityTruthAdmin";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: mocks.apiFetch
}));

const capabilityId = "10000000-0000-4000-8000-000000000001";

function adminReadback() {
  const capabilityRecord = {
    capability_id: capabilityId,
    capability_key: "capability.tutorial.step.command-overview",
    capability_version: "200.0.0",
    display_name: "Command lesson",
    purpose: "Published Tutorial lesson source.",
    kind: "CAPABILITY",
    owner: "Capability owner",
    data_classification: "INTERNAL",
    environment: "PRODUCTION",
    scope: "GLOBAL",
    supported_scopes: ["GLOBAL"],
    tenant_id: null,
    organization_id: null,
    lifecycle_state: "CATALOGUED",
    audience_status: "UNSUPPORTED",
    production_readiness: "UNVERIFIED",
    dependencies: [{
      capability_id: "10000000-0000-4000-8000-000000000002",
      capability_version: "1.0.0",
      minimum_lifecycle_state: "IMPLEMENTED",
      required: true
    }],
    required_evidence: ["UNIT_TEST"],
    activation_requirements: [{
      requirement_code: "PRODUCTION_READBACK",
      description: "A production journey receipt is required.",
      required: true,
      satisfied: false,
      evidence_receipt_ids: []
    }],
    verification_receipts: [],
    last_verified_at: null,
    failure_state: {
      code: "UNVERIFIED",
      summary: "Production verification has not been attached.",
      observed_at: "2026-08-03T03:00:00.000Z",
      retryable: true
    },
    public_claim_eligible: false,
    pricing_eligibility: "NOT_ELIGIBLE",
    rollback_path: "Remove the catalog binding.",
    deactivation_path: "Keep publication blocked.",
    source_reference: "mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx",
    limitations: ["Source presence is not product readiness."],
    record_version: 1,
    created_at: "2026-08-03T03:00:00.000Z",
    updated_at: "2026-08-03T03:00:00.000Z"
  };
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    registry_revision: 7,
    generated_at: "2026-08-03T04:00:00.000Z",
    records: [capabilityRecord],
    claims: [{
      claim_id: "20000000-0000-4000-8000-000000000001",
      claim_key: "tutorial.command-overview",
      capability_id: capabilityId,
      capability_version: "200.0.0",
      environment: "PRODUCTION",
      surface: "TUTORIAL",
      status: "DRAFT",
      approved_language: "Command lesson publication candidate.",
      limitations: ["Not approved."],
      evidence_receipt_ids: [],
      requires_tenant_installation: false,
      approved_by_actor_id: null,
      approved_at: null,
      record_version: 1,
      created_at: "2026-08-03T03:00:00.000Z",
      updated_at: "2026-08-03T03:00:00.000Z"
    }],
    installations: [{
      installation_id: "30000000-0000-4000-8000-000000000001",
      tenant_id: "30000000-0000-4000-8000-000000000002",
      organization_id: "30000000-0000-4000-8000-000000000003",
      capability_id: capabilityId,
      capability_version: "200.0.0",
      state: "AVAILABLE",
      plan_eligible: false,
      feature_flags: { "tutorial.enabled": false },
      limits: { "tutorial.max_steps": 0 },
      suspension_reason: null,
      activated_at: null,
      verification_receipt_ids: [],
      record_version: 1,
      created_at: "2026-08-03T03:00:00.000Z",
      updated_at: "2026-08-03T03:00:00.000Z"
    }],
    verification_receipts: [],
    dependencies: [{
      capability_id: capabilityId,
      capability_version: "200.0.0",
      dependency_capability_id: "10000000-0000-4000-8000-000000000002",
      dependency_capability_version: "1.0.0",
      minimum_lifecycle_state: "IMPLEMENTED",
      required: true
    }],
    transition_audit: [{
      transition_id: "40000000-0000-4000-8000-000000000001",
      capability_id: capabilityId,
      capability_version: "200.0.0",
      from_state: "CATALOGUED",
      to_state: "DESIGNED",
      prior_record_version: 1,
      resulting_record_version: 2,
      evidence_receipt_ids: [],
      reason: "A reviewed design packet exists.",
      actor_id: "40000000-0000-4000-8000-000000000002",
      tenant_id: null,
      organization_id: null,
      business_id: null,
      pricing_eligibility: "NOT_ELIGIBLE",
      correlation_id: "40000000-0000-4000-8000-000000000003",
      idempotency_key: "phase203-admin-test-transition",
      request_sha256: "a".repeat(64),
      release_version: "phase-203",
      response_snapshot: {
        ...capabilityRecord,
        lifecycle_state: "DESIGNED",
        record_version: 2,
        updated_at: "2026-08-03T03:30:01.000Z"
      },
      requested_at: "2026-08-03T03:30:00.000Z",
      recorded_at: "2026-08-03T03:30:01.000Z"
    }],
    installation_transition_audit: []
  };
}

describe("CapabilityTruthAdmin", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
  });

  it("renders the canonical read-only lifecycle and evidence fields", async () => {
    mocks.apiFetch.mockResolvedValue(adminReadback());

    render(<CapabilityTruthAdmin headers={{ "x-admin-mfa-code": "verified" }} />);

    expect(await screen.findByText("Command lesson")).toBeInTheDocument();
    expect(mocks.apiFetch).toHaveBeenCalledWith("/admin/product-truth", expect.objectContaining({
      headers: { "x-admin-mfa-code": "verified" }
    }));
    fireEvent.click(screen.getByText("Command lesson", { selector: "strong" }));
    expect(screen.getAllByText(capabilityId).length).toBeGreaterThan(0);
    expect(screen.getByText("Capability owner")).toBeInTheDocument();
    expect(screen.getByText("INTERNAL")).toBeInTheDocument();
    expect(screen.getByText("UNIT_TEST")).toBeInTheDocument();
    expect(screen.getAllByText("NOT_ELIGIBLE", { selector: "dd" })).toHaveLength(3);
    expect(screen.getByText("CATALOGUED", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getAllByText("Blocked")).toHaveLength(2);
    expect(screen.getByText("A production journey receipt is required.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("No verification receipts recorded.")).toBeInTheDocument();
    expect(screen.getByText("UNVERIFIED: Production verification has not been attached.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Remove the catalog binding.")).toBeInTheDocument();
    expect(screen.getByText("Keep publication blocked.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /frontend\/components\/OnboardingTour\.tsx/u })).toHaveAttribute(
      "href",
      "https://github.com/mykai05/ENTRAL-0.2/blob/bdceb245ab7d94530f31e4293536497adcad4542/frontend/components/OnboardingTour.tsx"
    );
    expect(screen.getByText("tutorial.command-overview")).toBeInTheDocument();
    expect(screen.getByText("Command lesson publication candidate.")).toBeInTheDocument();
    expect(screen.getByText("AVAILABLE", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("tutorial.enabled")).toBeInTheDocument();
    expect(screen.getByText("tutorial.max_steps")).toBeInTheDocument();
    expect(screen.getByText("phase-203")).toBeInTheDocument();
    expect(screen.getByText("No installation transitions are recorded.")).toBeInTheDocument();
    expect(screen.getByText("CATALOGUED → DESIGNED", { exact: false })).toBeInTheDocument();
  });

  it("shows an explicit unavailable alert without cached registry records", async () => {
    mocks.apiFetch.mockRejectedValue(new Error("offline"));

    render(<CapabilityTruthAdmin />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Capability Truth unavailable");
    expect(screen.getByRole("alert")).toHaveTextContent("No cached or local capability status");
    expect(screen.queryByText("Command lesson")).not.toBeInTheDocument();
  });

  it("rejects malformed admin readback rather than exposing partial truth", async () => {
    mocks.apiFetch.mockResolvedValue({ ...adminReadback(), contract_version: "future" });

    render(<CapabilityTruthAdmin />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Capability Truth unavailable");
    expect(screen.queryByText("Command lesson")).not.toBeInTheDocument();
  });
});
