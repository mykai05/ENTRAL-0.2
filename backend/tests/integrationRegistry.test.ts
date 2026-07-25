import { describe, expect, it, vi } from "vitest";
import {
  getProviderExecutionAuthorization,
  parseIntegrationRegistry
} from "../src/services/integrationRegistry.js";

vi.hoisted(() => {
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
});

const activeRecord = {
  integration_id: "123e4567-e89b-42d3-a456-426614174000",
  provider_code: "shopify",
  provider_name: "Shopify",
  provider_api_version: "2026-04",
  capability_codes: ["COMMERCE_PLATFORM"],
  official_documentation_url: "https://shopify.dev/docs/api",
  stage: "ACTIVE",
  adapter_version: "1.0.0",
  auth_methods: ["API_KEY"],
  credential_reference_id: "223e4567-e89b-42d3-a456-426614174000",
  owning_business_id: "323e4567-e89b-42d3-a456-426614174000",
  granted_operation_codes: ["storefront.draft.write"],
  live_tested_at: "2026-07-24T00:00:00Z",
  active_at: "2026-07-24T01:00:00Z",
  evidence_ids: ["423e4567-e89b-42d3-a456-426614174000"],
  disabled_reason: null
} as const;

describe("canonical integration registry", () => {
  it("parses and resolves one exact active provider owner", () => {
    const records = parseIntegrationRegistry(JSON.stringify([activeRecord]));
    const authorization = getProviderExecutionAuthorization(
      "shopify",
      "storefront.draft.write",
      records
    );

    expect(authorization.requirement).toMatchObject({
      adapter_version: "1.0.0",
      owning_business_id: activeRecord.owning_business_id,
      provider_api_version: "2026-04"
    });
  });

  it("rejects inactive records and operations outside the exact grant", () => {
    expect(() => getProviderExecutionAuthorization(
      "shopify",
      "storefront.draft.write",
      [{ ...activeRecord, active_at: null, stage: "LIVE_TESTED" }]
    )).toThrowError(expect.objectContaining({ code: "INTEGRATION_NOT_ACTIVE" }));
    expect(() => getProviderExecutionAuthorization(
      "shopify",
      "orders.write",
      [activeRecord]
    )).toThrowError(expect.objectContaining({ code: "OPERATION_NOT_GRANTED" }));
  });

  it("rejects ambiguous owners instead of selecting one", () => {
    expect(() => getProviderExecutionAuthorization(
      "shopify",
      "storefront.draft.write",
      [
        activeRecord,
        {
          ...activeRecord,
          integration_id: "523e4567-e89b-42d3-a456-426614174000",
          owning_business_id: "623e4567-e89b-42d3-a456-426614174000"
        }
      ]
    )).toThrowError(expect.objectContaining({ code: "INTEGRATION_OWNER_REQUIRED" }));
  });

  it("rejects malformed and duplicate registry records", () => {
    expect(() => parseIntegrationRegistry("{")).toThrowError(
      expect.objectContaining({ code: "INTEGRATION_REGISTRY_JSON" })
    );
    expect(() => parseIntegrationRegistry(JSON.stringify([activeRecord, activeRecord]))).toThrowError(
      expect.objectContaining({ code: "DUPLICATE_INTEGRATION_ID" })
    );
  });
});
