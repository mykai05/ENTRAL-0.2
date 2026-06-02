import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MerchOperationsPanel } from "../components/MerchOperationsPanel";
import { apiFetch } from "../lib/api";
import type { ClientMerchStore, GrowthApprovalRecord, GrowthApprovalResponse, GrowthOrchestrationPreviewResponse, GrowthPlan } from "../lib/merch-store";

vi.mock("../lib/api", () => ({
  apiFetch: vi.fn()
}));

const store: ClientMerchStore = {
  approvalStatus: "Listings Approved",
  audience: "independent gym members",
  brandStyle: "bold training aesthetic",
  businessName: "Iron House Gym",
  clientName: "Iron House",
  commandGeneralId: null,
  commandGeneralName: null,
  commandMarshalId: null,
  commandMarshalName: null,
  contactName: "Mara",
  createdAt: "2026-06-01T00:00:00.000Z",
  designCount: 10,
  email: "mara@example.com",
  estimatedProfit: 420,
  id: "store-1",
  industry: "fitness",
  launchStatus: "Awaiting Approval",
  monthlyFee: 199,
  notes: null,
  phone: null,
  podProvider: "Printify",
  productTypes: ["T-shirt"],
  profitShare: 10,
  revenue: 0,
  setupFee: 500,
  storeId: "store-1",
  storePlatform: "Shopify",
  updatedAt: "2026-06-01T00:00:00.000Z",
  userId: "user-1"
};

const plan: GrowthPlan = {
  adCampaignDrafts: [{
    audience: "independent gym members",
    budgetGuardrail: "Draft only. Daily spend stays locked until approval.",
    name: "Launch awareness draft",
    objective: "Prepare awareness campaign brief.",
    status: "Draft - spend locked"
  }],
  analyticsLoop: [{
    cadence: "Weekly",
    guardrail: "Uses read-only or manual data.",
    metric: "Approved product count",
    source: "Approval queue"
  }],
  approvalQueue: ["Approve final social captions before posting."],
  auditEvents: ["No external systems contacted."],
  blockedActions: ["Publishing social posts", "Starting paid ad spend"],
  commercePrep: ["Prepare Shopify collection structure."],
  contentDrafts: [{
    approvalStatus: "Draft - needs approval",
    channel: "Social",
    copy: "Iron House merch is preparing for launch.",
    title: "Social draft 1"
  }],
  mode: "Mock Mode",
  readinessScore: 57,
  summary: "Iron House Gym has one approved product ready for reviewed growth preparation."
};

const approvalRecord: GrowthApprovalRecord = {
  auditLogId: "audit-1",
  createdAt: "2026-06-01T00:00:00.000Z",
  executionState: "No external action executed",
  id: "packet-1",
  mode: "Mock Mode",
  packet: {
    actions: [
      {
        approvalStatus: "Pending human approval",
        channel: "Social",
        executionState: "Locked - no external action",
        id: "action-1",
        requiredControls: ["caption approval", "final user sign-off"],
        scheduledFor: null,
        summary: "Iron House merch is preparing for launch.",
        title: "Social draft 1"
      },
      {
        approvalStatus: "Pending human approval",
        channel: "Ads",
        executionState: "Locked - no external action",
        id: "action-2",
        requiredControls: ["budget approval"],
        scheduledFor: null,
        summary: "Spend remains locked.",
        title: "Launch awareness draft"
      }
    ],
    auditEvents: ["Growth approval packet queued in Mock Mode.", "No external systems contacted."],
    blockedActions: ["Publishing social posts", "Starting paid ad spend"],
    businessName: "Iron House Gym",
    costGuardrail: "External ad spend is $0.",
    createdAt: "2026-06-01T00:00:00.000Z",
    humanApprovalRequired: true,
    id: "packet-1",
    logging: "Stored as an audit event.",
    mode: "Mock Mode",
    note: "Queued from test.",
    scheduledFor: null,
    status: "Pending approval",
    storeId: "store-1",
    summary: "2 growth actions prepared for review. ENTRAL will not publish, change storefronts, start spend, or import analytics without explicit approval."
  },
  requestAuditLogId: "audit-1",
  reviewAuditLogId: null,
  reviewedAt: null,
  reviewedById: null,
  reviewNote: null,
  scheduledFor: null,
  status: "pending",
  statusLabel: "Pending approval",
  updatedAt: "2026-06-01T00:00:00.000Z"
};

const approvalResponse: GrowthApprovalResponse = {
  approval: approvalRecord,
  auditLogId: "audit-1",
  packet: approvalRecord.packet
};

const approvedRecord: GrowthApprovalRecord = {
  ...approvalRecord,
  reviewAuditLogId: "audit-2",
  reviewedAt: "2026-06-01T01:00:00.000Z",
  status: "approved",
  statusLabel: "Approved - execution still locked",
  updatedAt: "2026-06-01T01:00:00.000Z"
};

const orchestrationPreview: GrowthOrchestrationPreviewResponse = {
  auditLogId: "audit-3",
  preview: {
    approvalPacketId: "packet-1",
    auditEvents: [
      "Read-only growth orchestration preview generated.",
      "No social, Shopify, ad, or analytics system was contacted."
    ],
    businessName: "Iron House Gym",
    costGuardrail: "External spend remains $0. Estimated AI/provider cost for this preview is 0 cents.",
    estimatedAiCostCents: 0,
    estimatedExternalSpendCents: 0,
    externalExecution: false,
    mode: "Read-only orchestration preview",
    providerContacted: false,
    scheduledFor: null,
    status: "Approved - execution locked",
    steps: [
      {
        actionId: "action-1",
        channel: "Social",
        checklist: ["Confirm caption approval."],
        executionState: "Locked - no external action",
        guardrail: "No post is published or queued on a platform.",
        scheduledFor: null,
        status: "Ready for manual handoff",
        title: "Social draft 1"
      },
      {
        actionId: "action-2",
        channel: "Shopify",
        checklist: ["Confirm storefront checklist."],
        executionState: "Locked - no external action",
        guardrail: "No Shopify or marketplace listing is created, changed, or launched.",
        scheduledFor: null,
        status: "Ready for manual handoff",
        title: "Storefront prep review"
      }
    ],
    summary: "2 approved growth actions are organized for manual handoff. ENTRAL still will not publish posts, update storefronts, start ad spend, or import analytics data."
  }
};

describe("MerchOperationsPanel", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
  });

  it("builds a guarded mock growth plan without external execution", async () => {
    vi.mocked(apiFetch)
      .mockResolvedValueOnce({ plan })
      .mockResolvedValueOnce(approvalResponse)
      .mockResolvedValueOnce({
        approval: approvedRecord,
        auditLogId: "audit-2",
        message: "Growth packet approved for preparation only. No external action executed."
      })
      .mockResolvedValueOnce(orchestrationPreview);

    render(<MerchOperationsPanel isLoadingStores={false} onRefreshStores={vi.fn()} stores={[store]} />);

    expect(screen.getByText("Growth & Scale Plan")).toBeInTheDocument();
    expect(screen.getByText("Mock Mode / Approval Required")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /build growth plan/i }));

    expect(apiFetch).toHaveBeenCalledWith("/merch/stores/store-1/growth-plan");
    expect(await screen.findByText("57/100")).toBeInTheDocument();
    expect(screen.getByText("Publishing social posts")).toBeInTheDocument();
    expect(screen.getByText(/Daily spend stays locked until approval/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /queue approval packet/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/growth-plan/approval-request", {
      json: {
        note: "Queued from the Growth & Scale Plan panel for human review.",
        scheduledFor: undefined
      },
      method: "POST"
    });
    expect(await screen.findByText("Approval packet queued")).toBeInTheDocument();
    expect(screen.getByText("Audit log: audit-1")).toBeInTheDocument();
    expect(screen.getAllByText("Locked - no external action")).toHaveLength(2);
    expect(screen.getByText("Growth approval queue")).toBeInTheDocument();
    expect(screen.getByText("Real review records / external execution locked")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /approve preparation/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/growth-approvals/packet-1/approve", {
      json: {
        note: "Approved for preparation only. External execution remains locked."
      },
      method: "POST"
    });
    expect(await screen.findByText(/Approved - execution still locked/)).toBeInTheDocument();
    expect(screen.getByText("Growth packet approved for preparation only. No external action executed.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /preview locked schedule/i }));

    expect(apiFetch).toHaveBeenLastCalledWith("/merch/stores/store-1/growth-approvals/packet-1/orchestration-preview");
    expect(await screen.findByText("Locked orchestration preview")).toBeInTheDocument();
    expect(screen.getByText(/External spend: 0 cents \/ AI cost: 0 cents/i)).toBeInTheDocument();
    expect(screen.getByText(/No social, Shopify, ad, or analytics system was contacted/i)).toBeInTheDocument();
  });
});
