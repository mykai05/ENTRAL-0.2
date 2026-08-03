import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { Phase204InternalCommerce } from "../components/Phase204InternalCommerce";
import {
  PHASE204_INTERNAL_BUSINESS_CODE,
  PHASE204_METRIC_CODES,
  PHASE204_PRODUCTS,
  phase204MetricCells,
  validatePhase204InternalCommerceReadback,
  type Phase204InternalCommerceReadback,
  type Phase204OperationalMetric
} from "../lib/phase204-internal-commerce";

const ids = {
  business: "20400000-0000-4000-8000-000000000001",
  boundary: "20400000-0000-4000-8000-000000000002",
  organization: "20400000-0000-4000-8000-000000000003",
  tenant: "20400000-0000-4000-8000-000000000004"
};

function metrics(): Phase204OperationalMetric[] {
  const scopes = [PHASE204_INTERNAL_BUSINESS_CODE, ...PHASE204_PRODUCTS.map((product) => product.code)] as const;
  return scopes.flatMap((scopeCode, scopeIndex) => PHASE204_METRIC_CODES.map((metricCode, metricIndex) => ({
    currency: metricIndex < 6 ? "USD" as const : null,
    evidence_id: null,
    is_estimate: false as const,
    metric_code: metricCode,
    metric_id: `2041${String(scopeIndex).padStart(3, "0")}-${String(metricIndex).padStart(4, "0")}-4000-8000-000000000001`,
    observed_at: null,
    provider_record_id: null,
    scope: {
      scope_code: scopeCode,
      scope_type: scopeCode === PHASE204_INTERNAL_BUSINESS_CODE ? "BUSINESS" as const : "PRODUCT" as const
    },
    source_type: null,
    truth_state: "UNAVAILABLE" as const,
    unavailable_reason: "No provider observation exists yet; no numeric value is inferred.",
    unit: metricIndex < 6
      ? "USD_CENTS" as const
      : metricCode === "CONVERSION"
        ? "RATIO" as const
        : metricCode === "SUPPORT_VOLUME"
          ? "COUNT" as const
          : "SCORE" as const,
    value: null
  })));
}

function readback(overrides: {
  externalProviderMutationAvailable?: boolean;
  ownerApprovalId?: string | null;
  publicationAllowed?: boolean;
} = {}): Phase204InternalCommerceReadback {
  const operationalMetrics = metrics();
  return {
    business: {
      boundary_status: "ACTIVE",
      business_boundary_id: ids.boundary,
      canonical_business_id: ids.business,
      commander_id: "20400000-0000-4000-8000-000000000005",
      general_id: "9ce85809-e772-5a8f-be8d-34e01a9448a8",
      internal_code: "SP-COMMERCE-001",
      launch_mission_id: "20400000-0000-4000-8000-000000000006",
      marshal_id: "a50b1493-ffe1-5373-ad1b-96bb393a0c6f",
      status: "OPERATING",
      working_name: "Contractor Operations Products"
    },
    capabilities: [
      ["20300000-0002-4000-8000-000000000108", "Governance layer", true],
      ["20300000-0002-4000-8000-000000000107", "Tool orchestration", true],
      ["20300000-0002-4000-8000-000000000106", "Brand operations", true],
      ["20300000-0001-4000-8000-000000000012", "Etsy", false]
    ].map(([catalogCapabilityId, name, active], index) => ({
      catalog_capability_id: catalogCapabilityId as string,
      environment: "PRODUCTION" as const,
      installation_id: active ? `20400000-0000-4000-8000-${String(20 + index).padStart(12, "0")}` : null,
      installation_state: active ? "ACTIVE" : null,
      lifecycle_state: active ? "ACTIVE" : "CATALOGUED",
      name: name as string,
      public_claim_eligible: false as const,
      scope: "TENANT" as const,
      tenant_capability_id: `20400000-0000-4000-8000-${String(30 + index).padStart(12, "0")}`
    })),
    controls: [
      {
        availability: "AVAILABLE",
        control_code: "DISABLE_PUBLICATION",
        control_id: "20400000-0000-4000-8000-000000000009",
        evidence_ids: ["20400000-0000-4000-8000-000000000010"],
        last_action_id: "20400000-0000-4000-8000-000000000011",
        reason: "Publication starts disabled pending exact owner approval.",
        requires_owner_approval: false,
        state: "ENGAGED",
        verified_at: "2026-08-03T18:00:00.000Z",
        version: 1
      },
      {
        availability: "AVAILABLE",
        control_code: "KILL_BUSINESS",
        control_id: "20400000-0000-4000-8000-000000000012",
        evidence_ids: ["20400000-0000-4000-8000-000000000010"],
        last_action_id: null,
        reason: null,
        requires_owner_approval: true,
        state: "ARMED",
        verified_at: "2026-08-03T18:00:00.000Z",
        version: 1
      },
      {
        availability: "AVAILABLE",
        control_code: "PAUSE_BUSINESS",
        control_id: "20400000-0000-4000-8000-000000000013",
        evidence_ids: ["20400000-0000-4000-8000-000000000010"],
        last_action_id: null,
        reason: null,
        requires_owner_approval: false,
        state: "ARMED",
        verified_at: "2026-08-03T18:00:00.000Z",
        version: 1
      }
    ],
    daily_operating_summary: {
      estimated_values_included: false,
      observed_provider_fact_count: 0,
      operational_metrics: operationalMetrics,
      period_end: "2026-08-03T19:00:00.000Z",
      period_start: "2026-08-02T19:00:00.000Z",
      unavailable_provider_fact_count: 9
    },
    generated_at: "2026-08-03T19:00:00.000Z",
    operational_metrics: operationalMetrics,
    organization_id: ids.organization,
    products: PHASE204_PRODUCTS.map((product, index) => ({
      asset_role_count: 9,
      claims_sha256: "b".repeat(64),
      currency: "USD",
      delivery_manifest_sha256: "a".repeat(64),
      latest_passed_gate_count: 6,
      price_cents: product.priceCents,
      product_code: product.code,
      product_id: `2042${String(index).padStart(3, "0")}-0000-4000-8000-000000000001`,
      product_kind: product.kind,
      product_version: "1.0.0",
      ready: true,
      title: product.title
    })),
    readiness: {
      all_products_ready: true,
      exact_control_count: 3,
      exact_listing_count: overrides.publicationAllowed ? 5 : 0,
      exact_metric_truth_count: 54,
      exact_product_count: 5,
      manifest_hashes: {},
      owner_approval_present: Boolean(overrides.ownerApprovalId)
    },
    release_version: "phase-204",
    storefront: {
      external_provider_mutation_available: overrides.externalProviderMutationAvailable ?? false,
      listings: overrides.publicationAllowed ? PHASE204_PRODUCTS.map((product, index) => ({
        claims_manifest_sha256: "b".repeat(64),
        delivery_manifest_sha256: "a".repeat(64),
        listing_record_id: `2043${String(index).padStart(3, "0")}-0000-4000-8000-000000000001`,
        price_cents: product.priceCents,
        product_code: product.code,
        provider_evidence_ids: ["20400000-0000-4000-8000-000000000014"],
        provider_listing_id: null,
        provider_listing_reference_sha256: null,
        published_at: null,
        status: "READY_FOR_OWNER_APPROVAL" as const
      })) : [],
      owner_approval_id: overrides.ownerApprovalId ?? null,
      preferred_provider: "ETSY",
      provider: "ETSY",
      provider_policy_evidence_ids: ["20400000-0000-4000-8000-000000000014"],
      provider_policy_source_record_id: "20400000-0000-4000-8000-000000000015",
      public_brand: overrides.publicationAllowed ? "Evidence-Selected Test Brand" : null,
      publication_allowed: overrides.publicationAllowed ?? false,
      state: overrides.publicationAllowed ? "READY_FOR_OWNER_APPROVAL" : "OWNER_ACTION_REQUIRED",
      state_reason: overrides.publicationAllowed
        ? "Exact owner-approved envelope is current."
        : "Owner provider identity and publication approval are required.",
      storefront_id: "20400000-0000-4000-8000-000000000016"
    },
    tenant_id: ids.tenant
  };
}

describe("Phase204InternalCommerce", () => {
  it("renders the exact product line, internal-only capability truth, and all 54 explicitly unavailable metric cells", () => {
    const truth = readback();
    render(<Phase204InternalCommerce readback={truth} status="ready" />);

    expect(screen.getByRole("heading", { name: "Internal Commerce" })).toBeInTheDocument();
    expect(screen.getByText("Contractor Operations Products")).toBeInTheDocument();
    expect(screen.getByText("SP-COMMERCE-001 / Operating")).toBeInTheDocument();
    for (const product of PHASE204_PRODUCTS) {
      const productCard = document.querySelector(`[data-product-code="${product.code}"]`);
      expect(productCard).not.toBeNull();
      expect(within(productCard as HTMLElement).getByText(product.title)).toBeInTheDocument();
      expect(within(productCard as HTMLElement).getByText(new Intl.NumberFormat("en-US", { currency: "USD", style: "currency" }).format(product.priceCents / 100))).toBeInTheDocument();
    }
    expect(document.querySelectorAll(".phase204-metric")).toHaveLength(54);
    expect(document.querySelectorAll('[data-truth-state="UNAVAILABLE"]')).toHaveLength(54);
    expect(screen.getAllByText("No provider observation exists yet; no numeric value is inferred.")).toHaveLength(54);
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
    expect(screen.getByText(/not presented as customer software/iu)).toBeInTheDocument();
    expect(screen.queryByText("SELLABLE", { exact: false })).not.toBeInTheDocument();
  });

  it("keeps external publication absent until every backend gate is true, then submits only the exact approval identifiers", async () => {
    const onPublishApprovedStorefront = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(
      <Phase204InternalCommerce
        onPublishApprovedStorefront={onPublishApprovedStorefront}
        readback={readback({ ownerApprovalId: "20400000-0000-4000-8000-000000000017", publicationAllowed: true })}
        status="ready"
      />
    );
    expect(screen.queryByRole("button", { name: /Publish exact approved envelope/iu })).not.toBeInTheDocument();
    expect(screen.getByText(/No external publication action is available/iu)).toBeInTheDocument();

    rerender(
      <Phase204InternalCommerce
        mfaState={{ PUBLISH_APPROVED_STOREFRONT: "VERIFIED" }}
        onPublishApprovedStorefront={onPublishApprovedStorefront}
        readback={readback({
          externalProviderMutationAvailable: true,
          ownerApprovalId: "20400000-0000-4000-8000-000000000017",
          publicationAllowed: true
        })}
        status="ready"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Publish exact approved envelope/iu }));
    fireEvent.click(within(screen.getByRole("alertdialog", { name: "Approved publication" }))
      .getByRole("button", { name: "Publish approved envelope" }));
    await waitFor(() => expect(onPublishApprovedStorefront).toHaveBeenCalledWith({
      ownerApprovalId: "20400000-0000-4000-8000-000000000017",
      storefrontId: "20400000-0000-4000-8000-000000000016"
    }));
  });

  it("requires an explicit reason and confirmation before invoking a bounded control callback", async () => {
    const onControlAction = vi.fn().mockResolvedValue(undefined);
    render(<Phase204InternalCommerce onControlAction={onControlAction} readback={readback()} status="ready" />);

    fireEvent.click(screen.getByRole("button", { name: "Pause business" }));
    const dialog = screen.getByRole("alertdialog", { name: "Business pause" });
    const confirm = within(dialog).getByRole("button", { name: "Confirm business pause" });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Reason" }), {
      target: { value: "Pause fulfillment while the provider account is verified." }
    });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);

    await waitFor(() => expect(onControlAction).toHaveBeenCalledWith({
      action: "PAUSE_BUSINESS",
      businessBoundaryId: ids.boundary,
      reason: "Pause fulfillment while the provider account is verified."
    }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("fails closed when caller-provided MFA state is required for the kill control", () => {
    render(
      <Phase204InternalCommerce
        mfaState={{ KILL_BUSINESS: "REQUIRED" }}
        onControlAction={vi.fn()}
        readback={readback()}
        status="ready"
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Kill business" }));
    const dialog = screen.getByRole("alertdialog", { name: "Business kill" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Reason" }), { target: { value: "Owner-directed shutdown." } });
    expect(within(dialog).getByText(/Recent MFA verification is required/iu)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Confirm permanent kill" })).toBeDisabled();
  });

  it("exposes responsive mobile and desktop semantics without changing canonical scope", () => {
    const { container } = render(<Phase204InternalCommerce readback={readback()} status="ready" />);
    const panel = container.querySelector(".phase204-commerce");
    expect(panel).toHaveAttribute("data-phase204-responsive", "mobile-single-column desktop-twelve-column");
    expect(container.querySelector(".phase204-responsive-grid")).toHaveAttribute("data-layout", "responsive-commerce-truth");
    expect(container.querySelector("style")?.textContent).toContain("@container phase204 (max-width: 48rem)");
    expect(container.querySelector("style")?.textContent).toContain("@media (max-width: 720px)");
    expect(screen.getByText("SP-COMMERCE-001 / Operating")).toBeInTheDocument();
  });

  it("provides accessible loading, error, and not-activated states without cached truth", () => {
    const { rerender } = render(<Phase204InternalCommerce status="loading" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading internal commerce truth");

    rerender(<Phase204InternalCommerce errorMessage="Canonical readback failed." status="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Canonical readback failed.");
    expect(screen.queryByText("Contractor Operations Products")).not.toBeInTheDocument();

    rerender(<Phase204InternalCommerce readback={{
      business: null,
      organization_id: ids.organization,
      release_version: "phase-204",
      state: "NOT_ACTIVATED",
      tenant_id: ids.tenant
    }} status="ready" />);
    expect(screen.getByRole("status")).toHaveTextContent("Internal commerce is not activated");
  });
});

describe("Phase 204 commerce truth validator", () => {
  it("rejects fake zero, missing metric cells, public claim eligibility, and an unapproved publication gate", () => {
    const base = readback();
    expect(validatePhase204InternalCommerceReadback(base)).toBe(base);
    expect(phase204MetricCells(base.operational_metrics ?? [])).toHaveLength(54);

    expect(() => validatePhase204InternalCommerceReadback({
      ...base,
      operational_metrics: (base.operational_metrics ?? []).slice(0, 53)
    })).toThrow(/54-cell metric truth matrix/iu);

    expect(() => validatePhase204InternalCommerceReadback({
      ...base,
      operational_metrics: (base.operational_metrics ?? []).map((metric, index) => index === 0 ? {
        ...metric,
        truth_state: "UNAVAILABLE",
        unavailable_reason: "No provider observation exists.",
        value: 0
      } : metric)
    })).toThrow(/unavailable metric contains a numeric value/iu);

    expect(() => validatePhase204InternalCommerceReadback({
      ...base,
      capabilities: (base.capabilities ?? []).map((capability) => ({ ...capability, public_claim_eligible: true }))
    })).toThrow(/publicly claimable/iu);

    expect(() => validatePhase204InternalCommerceReadback({
      ...base,
      capabilities: (base.capabilities ?? []).map((capability) => (
        capability.catalog_capability_id === "20300000-0001-4000-8000-000000000012"
          ? { ...capability, installation_state: "ACTIVE", lifecycle_state: "ACTIVE" }
          : capability
      ))
    })).toThrow(/unverified Etsy capability was activated/iu);

    expect(() => validatePhase204InternalCommerceReadback({
      ...base,
      storefront: { ...base.storefront!, owner_approval_id: null, publication_allowed: true }
    })).toThrow(/without exact owner approval/iu);
  });
});
