import "@testing-library/jest-dom/vitest";
import React, { useState } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductTruthValidationError } from "../lib/capability-truth";
import { ConnectionCenter, validatePublishedIntegrationTools } from "../components/ConnectionCenter";
import type { ToolRegistryEntry } from "../lib/tool-registry";

const mocks = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: mocks.apiFetch
}));

const now = Date.now();
const claim = {
  claim_id: "123e4567-e89b-42d3-a456-426614174000",
  claim_key: "integration.openai.list",
  capability_id: "223e4567-e89b-42d3-a456-426614174000",
  capability_key: "integration.tool.openai",
  capability_version: "1.0.0",
  display_name: "Approved OpenAI integration",
  lifecycle_state: "SELLABLE",
  pricing_eligibility: "INCLUDED",
  approved_language: "Approved receipt-bound AI provider connection.",
  limitations: ["Provider authorization remains required."],
  evidence_receipt_ids: ["323e4567-e89b-42d3-a456-426614174000"],
  claim_record_version: 2,
  capability_record_version: 9
} as const;

function projection(claims: unknown[] = [claim]) {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    projection_id: "423e4567-e89b-42d3-a456-426614174000",
    environment: "PRODUCTION",
    surface: "INTEGRATION_LIST",
    registry_revision: 9,
    generated_at: new Date(now - 1_000).toISOString(),
    expires_at: new Date(now + 4 * 60_000).toISOString(),
    claims
  };
}

function tool() {
  return {
    availableActions: ["chat.completions"],
    category: "AI",
    connectionStatus: "Connected",
    description: claim.approved_language,
    id: "openai",
    name: claim.display_name,
    productTruth: {
      capabilityId: claim.capability_id,
      capabilityKey: claim.capability_key,
      capabilityVersion: claim.capability_version,
      claimId: claim.claim_id,
      claimKey: claim.claim_key,
      claimRecordVersion: claim.claim_record_version,
      evidenceReceiptIds: [...claim.evidence_receipt_ids],
      limitations: [...claim.limitations]
    },
    requiredCredentials: ["OPENAI_API_KEY"],
    requiresAuthorization: true,
    riskLevel: "High",
    status: "Connected"
  };
}

describe("Capability Truth integration list", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts only exact receipt-bound SELLABLE integration items", () => {
    expect(validatePublishedIntegrationTools({
      items: [tool()],
      product_truth: projection()
    })).toEqual([tool()]);
  });

  it("accepts a verified empty projection without restoring the legacy registry", () => {
    expect(validatePublishedIntegrationTools({
      items: [],
      product_truth: projection([])
    })).toEqual([]);
  });

  it("rejects unbound, mismatched, or invented integration entries", () => {
    for (const items of [
      [{ ...tool(), productTruth: undefined }],
      [{ ...tool(), description: "Invented availability claim." }],
      [{ ...tool(), id: "codex" }],
      [tool(), { ...tool(), id: "codex" }]
    ]) {
      expect(() => validatePublishedIntegrationTools({
        items,
        product_truth: projection()
      })).toThrow(ProductTruthValidationError);
    }
  });

  it("loads once across inline parent callback rerenders", async () => {
    mocks.apiFetch.mockResolvedValue({ items: [tool()], product_truth: projection() });
    function Parent() {
      const [, setPublished] = useState<ToolRegistryEntry[]>([]);
      return <ConnectionCenter onEvent={() => undefined} onRegistryLoad={(items) => setPublished(items)} />;
    }
    const view = render(<Parent />);
    expect(await screen.findByText(claim.display_name)).toBeInTheDocument();
    await act(async () => { await Promise.resolve(); });
    expect(mocks.apiFetch).toHaveBeenCalledTimes(1);
    view.unmount();
  });

  it("clears stale integrations and revalidates at projection expiry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    mocks.apiFetch.mockResolvedValue({ items: [tool()], product_truth: projection() });
    const onRegistryLoad = vi.fn();
    const view = render(<ConnectionCenter onRegistryLoad={onRegistryLoad} />);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByText(claim.display_name)).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(4 * 60_000 + 1);
      await Promise.resolve();
    });
    expect(mocks.apiFetch).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(claim.display_name)).not.toBeInTheDocument();
    expect(onRegistryLoad).toHaveBeenLastCalledWith([]);
    view.unmount();
  });
});
