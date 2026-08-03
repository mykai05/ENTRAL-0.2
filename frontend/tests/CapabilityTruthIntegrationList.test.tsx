import { describe, expect, it } from "vitest";
import { ProductTruthValidationError } from "../lib/capability-truth";
import { validatePublishedIntegrationTools } from "../components/ConnectionCenter";

const now = Date.now();
const claim = {
  claim_id: "123e4567-e89b-42d3-a456-426614174000",
  claim_key: "integration.openai.list",
  capability_id: "223e4567-e89b-42d3-a456-426614174000",
  capability_key: "integration.tool.openai",
  capability_version: "1.0.0",
  display_name: "Approved OpenAI integration",
  lifecycle_state: "SELLABLE",
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
});
