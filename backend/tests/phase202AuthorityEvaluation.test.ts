import type {
  AuthorityEvaluationRequest,
  AutonomyEnvelope,
  IdentityActorReference,
  TenantOwnershipContext
} from "@entral/contracts";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/db.js", () => ({
  prisma: {},
  withTenantSession: vi.fn()
}));
vi.mock("../src/services/audit.js", () => ({ recordAuditLog: vi.fn() }));

import {
  evaluateAuthority,
  type DurableAuthorityContext
} from "../src/services/phase202IdentityAuthority.js";

const requestId = "123e4567-e89b-42d3-a456-426614174000";
const actorId = "123e4567-e89b-42d3-a456-426614174001";
const organizationId = "123e4567-e89b-42d3-a456-426614174002";
const tenantId = "123e4567-e89b-42d3-a456-426614174003";
const businessId = "123e4567-e89b-42d3-a456-426614174004";
const envelopeId = "123e4567-e89b-42d3-a456-426614174005";
const agentId = "phase202-agent-authority-test";
const now = new Date("2026-08-02T12:00:00.000Z");

const ownership: TenantOwnershipContext = {
  organization_id: organizationId,
  tenant_id: tenantId,
  business_id: businessId,
  environment: "PRODUCTION",
  data_residency: "US"
};

const actor: IdentityActorReference = {
  actor_id: actorId,
  actor_type: "AGENT",
  human_user_id: null,
  service_subject: null,
  agent_id: agentId
};

function request(overrides: Partial<AuthorityEvaluationRequest> = {}): AuthorityEvaluationRequest {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    request_id: requestId,
    idempotency_key: "phase202-authority-request-001",
    actor,
    ownership,
    role: "AGENT",
    authority_domain: "OPERATIONS",
    data_classification: "INTERNAL",
    action: "task.create",
    action_risk: "MEDIUM",
    requested_at: now.toISOString(),
    ...overrides
  };
}

function durable(overrides: Partial<DurableAuthorityContext> = {}): DurableAuthorityContext {
  return {
    actor,
    authorityDomains: ["OPERATIONS"],
    ownership,
    role: "AGENT",
    ...overrides
  };
}

function envelope(overrides: Partial<AutonomyEnvelope> = {}): AutonomyEnvelope {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    envelope_id: envelopeId,
    version: 1,
    ownership,
    actor,
    allowed_action_types: ["task.create"],
    tool_scope: ["task.write"],
    data_scope: [`business:${businessId}`],
    budget: { currency: "USD", maximum_minor_units: 1000 },
    reversible: true,
    verification: "Read the created task through the same tenant authority.",
    escalation: "Escalate any denied or ambiguous action to the tenant owner.",
    created_at: "2026-08-02T11:55:00.000Z",
    expires_at: "2026-08-02T12:30:00.000Z",
    ...overrides
  };
}

describe("Phase 202 durable RBAC and ABAC evaluation", () => {
  it("fails closed without a server-derived durable authority context", () => {
    expect(evaluateAuthority(request(), { envelope: envelope(), stepUpVerified: false, now })).toMatchObject({
      decision: "DENY",
      reason_code: "DURABLE_AUTHORITY_CONTEXT_REQUIRED"
    });
  });

  it.each([
    ["actor", durable({ actor: { ...actor, agent_id: "another-agent" } })],
    ["role", durable({ role: "SERVICE" })],
    ["business", durable({ ownership: { ...ownership, business_id: null } })],
    ["environment", durable({ ownership: { ...ownership, environment: "STAGING" } })],
    ["residency", durable({ ownership: { ...ownership, data_residency: "EU" } })]
  ])("denies a request whose %s differs from durable authority", (_field, context) => {
    expect(evaluateAuthority(request(), { durableContext: context, envelope: envelope(), stepUpVerified: false, now })).toMatchObject({
      decision: "DENY",
      reason_code: "DURABLE_AUTHORITY_CONTEXT_MISMATCH"
    });
  });

  it("requires both role permission and durable assignment authority domain", () => {
    expect(evaluateAuthority(request(), {
      durableContext: durable({ authorityDomains: ["IDENTITY"] }),
      envelope: envelope(),
      stepUpVerified: false,
      now
    })).toMatchObject({ decision: "DENY", reason_code: "ROLE_DOMAIN_DENIED" });
  });

  it.each([
    ["expired", envelope({ expires_at: "2026-08-02T12:00:00.000Z" }), "AUTONOMY_ENVELOPE_EXPIRED"],
    ["future-created", envelope({ created_at: "2026-08-02T12:01:00.000Z" }), "AUTONOMY_ENVELOPE_EXPIRED"],
    ["action", envelope({ allowed_action_types: ["task.read"] }), "AUTONOMY_SCOPE_DENIED"],
    ["business-data", envelope({ data_scope: ["business:another"] }), "AUTONOMY_SCOPE_DENIED"],
    ["environment", envelope({ ownership: { ...ownership, environment: "STAGING" } }), "AUTONOMY_SCOPE_DENIED"],
    ["residency", envelope({ ownership: { ...ownership, data_residency: "EU" } }), "AUTONOMY_SCOPE_DENIED"]
  ])("denies an agent envelope with invalid %s scope", (_field, autonomyEnvelope, reasonCode) => {
    expect(evaluateAuthority(request(), {
      durableContext: durable(),
      envelope: autonomyEnvelope,
      stepUpVerified: false,
      now
    })).toMatchObject({ decision: "DENY", reason_code: reasonCode });
  });

  it("requires recent server-verified MFA for high-risk or restricted actions", () => {
    expect(evaluateAuthority(request({ action_risk: "HIGH" }), {
      durableContext: durable(),
      envelope: envelope(),
      stepUpVerified: false,
      now
    })).toMatchObject({ decision: "STEP_UP_REQUIRED", reason_code: "RECENT_MFA_STEP_UP_REQUIRED" });
  });

  it("allows only the exact durable actor, ownership, domain, envelope, and step-up combination", () => {
    expect(evaluateAuthority(request({ action_risk: "CRITICAL", data_classification: "RESTRICTED" }), {
      durableContext: durable(),
      envelope: envelope(),
      stepUpVerified: true,
      now
    })).toMatchObject({ decision: "ALLOW", reason_code: "RBAC_ABAC_ALLOW" });
  });
});
