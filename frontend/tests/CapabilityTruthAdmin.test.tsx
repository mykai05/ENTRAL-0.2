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
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    registry_revision: 7,
    generated_at: "2026-08-03T04:00:00.000Z",
    records: [{
      capability_id: capabilityId,
      capability_key: "capability.tutorial.step.command-overview",
      capability_version: "200.0.0",
      display_name: "Command lesson",
      purpose: "Published Tutorial lesson source.",
      kind: "CAPABILITY",
      owner: "Capability owner",
      environment: "PRODUCTION",
      scope: "GLOBAL",
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
      rollback_path: "Remove the catalog binding.",
      deactivation_path: "Keep publication blocked.",
      source_reference: "mykai05/ENTRAL-0.2@commit:frontend/components/OnboardingTour.tsx",
      limitations: ["Source presence is not product readiness."],
      record_version: 1,
      created_at: "2026-08-03T03:00:00.000Z",
      updated_at: "2026-08-03T03:00:00.000Z"
    }],
    claims: [],
    installations: [],
    verification_receipts: [],
    dependencies: [],
    transition_audit: []
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
    fireEvent.click(screen.getByText(/Command lesson/));
    expect(screen.getByText(capabilityId)).toBeInTheDocument();
    expect(screen.getByText("Capability owner")).toBeInTheDocument();
    expect(screen.getByText("CATALOGUED", { selector: "dd" })).toBeInTheDocument();
    expect(screen.getByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText("A production journey receipt is required.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("No verification receipts recorded.")).toBeInTheDocument();
    expect(screen.getByText("UNVERIFIED: Production verification has not been attached.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("Remove the catalog binding.")).toBeInTheDocument();
    expect(screen.getByText("Keep publication blocked.")).toBeInTheDocument();
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
