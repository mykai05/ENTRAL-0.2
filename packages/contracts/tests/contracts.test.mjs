import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse as parseYaml } from "yaml";
import {
  ContractError,
  IdempotencyKeyRegistry,
  assertActionRequest,
  assertAuditEntry,
  assertCanonicalEvent,
  assertExecutableIntegration,
  assertIntegrationRegistryRecord,
  assertMemberCommandHierarchy,
  assertMemberOverviewResponse,
  assertOperationalRoute,
  assertPersonalityProfile,
  assertQueueJobEnvelope,
  assertValidParentRole,
  assertExpectedVersion,
  assertGovernanceActionRequest,
  parseMemberOrganizationsResponse
} from "../dist/index.js";

const id = "123e4567-e89b-42d3-a456-426614174000";
const secondId = "223e4567-e89b-42d3-a456-426614174000";
const thirdId = "323e4567-e89b-42d3-a456-426614174000";

test("canonical parent roles pass and invalid roles fail", () => {
  assert.doesNotThrow(() => assertValidParentRole("ENTRAL", null));
  assert.doesNotThrow(() => assertValidParentRole("MARSHAL", "ENTRAL"));
  assert.doesNotThrow(() => assertValidParentRole("GENERAL", "MARSHAL"));
  assert.doesNotThrow(() => assertValidParentRole("COMMANDER", "GENERAL"));
  assert.doesNotThrow(() => assertValidParentRole("SOLDIER", "COMMANDER"));
  assert.throws(() => assertValidParentRole("COMMANDER", "MARSHAL"), (error) => {
    assert.equal(error.code, "INVALID_PARENT_ROLE");
    return true;
  });
  assert.throws(() => assertValidParentRole("EMPEROR", null), (error) => {
    assert.equal(error.code, "INVALID_ENTITY_ROLE");
    return true;
  });
});

test("skipped operational routes are rejected in both directions", () => {
  assert.throws(() => assertOperationalRoute("ENTRAL", "COMMANDER"), ContractError);
  assert.throws(() => assertOperationalRoute("SOLDIER", "GENERAL"), ContractError);
  assert.doesNotThrow(() => assertOperationalRoute("COMMANDER", "SOLDIER"));
  assert.doesNotThrow(() => assertOperationalRoute("SOLDIER", "COMMANDER"));
});

test("member hierarchy accepts the canonical chain and rejects legacy emperor", () => {
  assert.doesNotThrow(() => assertMemberCommandHierarchy({
    nodes: [
      { id: "entral", name: "ENTRAL", parentId: null, rank: "ENTRAL", status: "working" },
      { id: "marshal", name: "Marshal", parentId: "entral", rank: "MARSHAL", status: "idle" },
      { id: "general", name: "General", parentId: "marshal", rank: "GENERAL", status: "idle" },
      { id: "commander", name: "Commander", parentId: "general", rank: "COMMANDER", status: "idle" },
      { id: "soldier", name: "Soldier", parentId: "commander", rank: "SOLDIER", status: "idle" }
    ]
  }));
  assert.throws(() => assertMemberCommandHierarchy({
    nodes: [{ id: "entral", name: "ENTRAL", parentId: null, rank: "emperor", status: "idle" }]
  }), (error) => {
    assert.equal(error.code, "INVALID_ENTITY_ROLE");
    return true;
  });
});

test("member response parsing strips non-contract fields", () => {
  const parsed = parseMemberOrganizationsResponse({
    organizations: [{
      id: "organization",
      joinedAt: "2026-07-24T00:00:00Z",
      memberCount: 1,
      memberLimit: 5,
      name: "Organization",
      role: "OWNER",
      slug: "organization",
      internal: "remove"
    }],
    user: {
      email: "owner@example.com",
      id: "owner",
      name: "Owner",
      role: "ADMIN"
    },
    token: "remove"
  });
  assert.deepEqual(parsed, {
    organizations: [{
      id: "organization",
      joinedAt: "2026-07-24T00:00:00Z",
      memberCount: 1,
      memberLimit: 5,
      name: "Organization",
      role: "OWNER",
      slug: "organization"
    }],
    user: {
      email: "owner@example.com",
      id: "owner",
      name: "Owner"
    }
  });
});

test("member response preserves the existing one-to-five seat contract", () => {
  const response = {
    organizations: [{
      id: "organization",
      joinedAt: "2026-07-24T00:00:00Z",
      memberCount: 1,
      memberLimit: 6,
      name: "Organization",
      role: "OWNER",
      slug: "organization"
    }],
    user: {
      email: "owner@example.com",
      id: "owner",
      name: "Owner"
    }
  };
  assert.throws(() => parseMemberOrganizationsResponse(response), ContractError);
  assert.doesNotThrow(() => parseMemberOrganizationsResponse({
    ...response,
    organizations: [{ ...response.organizations[0], memberLimit: 5 }]
  }));
});

test("member overview rejects out-of-range published values", () => {
  assert.throws(() => assertMemberOverviewResponse({
    availability: { subscription: { available: false, reason: "Not configured" } },
    members: [],
    organization: {
      id: "organization",
      memberCount: 1,
      memberLimit: 5,
      name: "Organization",
      role: "OWNER",
      slug: "organization"
    },
    recentTasks: [],
    taskSummary: { done: 0, inProgress: 0, overdue: 0, todo: 0, total: 0 },
    workspace: {
      businessHealth: { score: 101, status: "stable", summary: "Invalid" },
      findingsAndRecommendations: [],
      monthlyOperatingSummary: null,
      objectivesAndPriorities: [],
      publishedAt: "2026-07-24T00:00:00Z",
      version: 1
    }
  }), ContractError);
});

test("action request validates versioned and idempotent input", () => {
  const request = {
    action_id: id,
    action_type: "PAUSE_ENTITY",
    actor_type: "ENTRAL",
    actor_id: secondId,
    scope: {
      scope_type: "ENTITY",
      scope_id: thirdId,
      entity_id: thirdId,
      display_label: "Target entity"
    },
    target_entity_id: thirdId,
    reason: "Verified dependency failure",
    parameters: {},
    expected_version: 3,
    idempotency_key: "pause-entity-123456",
    requested_at: "2026-07-24T00:00:00Z"
  };
  assert.doesNotThrow(() => assertActionRequest(request));
  assert.throws(() => assertActionRequest({ ...request, actor_type: "EMPEROR" }), (error) => {
    assert.equal(error.code, "INVALID_ACTOR_TYPE");
    return true;
  });
  assert.throws(() => assertActionRequest({
    ...request,
    scope: { ...request.scope, scope_type: "ORGANIZATION" }
  }), (error) => {
    assert.equal(error.code, "INVALID_SCOPE_TYPE");
    return true;
  });
});

test("stale expected version is rejected", () => {
  assert.doesNotThrow(() => assertExpectedVersion(4, 4));
  assert.throws(() => assertExpectedVersion(3, 4), (error) => {
    assert.equal(error.code, "STALE_EXPECTED_VERSION");
    return true;
  });
});

test("governance action requests enforce actor, target, scope, and policy compatibility", () => {
  const request = {
    action_id: id,
    action_type: "PAUSE",
    actor_type: "HUMAN",
    actor_id: secondId,
    scope: {
      scope_type: "ENTITY",
      scope_id: thirdId,
      entity_id: thirdId,
      display_label: "Target entity"
    },
    target_type: "ENTITY",
    target_id: thirdId,
    business_id: null,
    requested_outcome: "Pause the target without changing its hierarchy.",
    reason: "A verified dependency is unavailable.",
    authority_basis: { permission: "pause" },
    risk_class: "MEDIUM",
    confidence: 1,
    proposed_changes: { status: "PAUSED" },
    rollback_plan: { action: "RESUME" },
    verification_plan: { checks: ["read-after-write"] },
    expected_version: 3,
    idempotency_key: "pause-entity-123456",
    requested_at: "2026-07-24T00:00:00Z"
  };

  assert.doesNotThrow(() => assertGovernanceActionRequest(request));
  assert.throws(
    () => assertGovernanceActionRequest({ ...request, actor_type: "SYSTEM" }),
    (error) => error.code === "INVALID_GOVERNANCE_ACTOR"
  );
  assert.throws(
    () => assertGovernanceActionRequest({ ...request, action_type: "SCHEDULE_CHANGE" }),
    (error) => error.code === "ACTION_TARGET_MISMATCH"
  );
  assert.throws(
    () => assertGovernanceActionRequest({ ...request, action_type: "REPAIR" }),
    (error) => error.code === "INVALID_GOVERNANCE_ACTOR"
  );
});

test("duplicate idempotency key is rejected", () => {
  const registry = new IdempotencyKeyRegistry();
  registry.claim("entity-edit-123456");
  assert.throws(() => registry.claim("entity-edit-123456"), (error) => {
    assert.equal(error.code, "DUPLICATE_IDEMPOTENCY_KEY");
    return true;
  });
});

test("invalid personality version is rejected", () => {
  const profile = {
    personality_id: id,
    version: "phase-130",
    display_name: "ENTRAL",
    purpose: "Evidence disciplined command support",
    traits: ["direct"],
    response_principles: ["verify"],
    prohibited_tendencies: ["invent"],
    default_detail: "BALANCED",
    warmth: 0.5,
    humor: 0.1,
    assertiveness: 0.8,
    evidence_discipline: 1
  };
  assert.throws(() => assertPersonalityProfile(profile), (error) => {
    assert.equal(error.code, "INVALID_PERSONALITY_VERSION");
    return true;
  });
  assert.doesNotThrow(() => assertPersonalityProfile({ ...profile, version: "1.0.0" }));
});

function activeIntegration(overrides = {}) {
  return {
    integration_id: id,
    provider_code: "shopify",
    provider_name: "Shopify",
    provider_api_version: "2026-04",
    capability_codes: ["COMMERCE_PLATFORM"],
    official_documentation_url: "https://shopify.dev/docs/api",
    stage: "ACTIVE",
    adapter_version: "1.0.0",
    auth_methods: ["API_KEY"],
    credential_reference_id: secondId,
    owning_business_id: thirdId,
    granted_operation_codes: ["storefront.draft.write"],
    live_tested_at: "2026-07-24T00:00:00Z",
    active_at: "2026-07-24T01:00:00Z",
    evidence_ids: [id],
    disabled_reason: null,
    ...overrides
  };
}

const requirement = {
  provider_code: "shopify",
  provider_api_version: "2026-04",
  adapter_version: "1.0.0",
  credential_reference_id: secondId,
  owning_business_id: thirdId,
  operation_code: "storefront.draft.write"
};

test("non-active provider execution is rejected", () => {
  assert.throws(() => assertExecutableIntegration(activeIntegration({
    stage: "LIVE_TESTED",
    active_at: null
  }), requirement), (error) => {
    assert.equal(error.code, "INTEGRATION_NOT_ACTIVE");
    return true;
  });
});

test("active provider must match exact owner, versions, credential, and operation", () => {
  assert.doesNotThrow(() => assertExecutableIntegration(activeIntegration(), requirement));
  for (const changed of [
    { owning_business_id: id },
    { adapter_version: "2.0.0" },
    { provider_api_version: "2025-10" },
    { credential_reference_id: id },
    { granted_operation_codes: ["orders.read"] }
  ]) {
    assert.throws(() => assertExecutableIntegration(activeIntegration(changed), requirement), ContractError);
  }
});

test("integration registry records reject malformed arrays and duplicate grants", () => {
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    auth_methods: "API_KEY"
  })), (error) => {
    assert.equal(error.code, "INVALID_AUTH_METHODS");
    return true;
  });
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    granted_operation_codes: ["storefront.draft.write", "storefront.draft.write"]
  })), (error) => {
    assert.equal(error.code, "DUPLICATE_INTEGRATION_VALUE");
    return true;
  });
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    stage: "ACTIVE",
    disabled_reason: "operator disabled"
  })), (error) => {
    assert.equal(error.code, "ACTIVE_INTEGRATION_DISABLED");
    return true;
  });
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    provider_api_version: null
  })), (error) => {
    assert.equal(error.code, "ACTIVE_INTEGRATION_INCOMPLETE");
    return true;
  });
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    active_at: "2026-07-23T23:00:00Z"
  })), (error) => {
    assert.equal(error.code, "INVALID_ACTIVATION_ORDER");
    return true;
  });
});

test("queue payload requires the shared versioned envelope", () => {
  assert.doesNotThrow(() => assertQueueJobEnvelope({
    contract_version: "1.0.0",
    job_id: id,
    job_type: "agent-task",
    idempotency_key: "agent-task-123456",
    correlation_id: secondId,
    enqueued_at: "2026-07-24T00:00:00Z",
    payload: { taskId: thirdId }
  }));
  assert.throws(() => assertQueueJobEnvelope({ job_type: "agent-task", payload: {} }), ContractError);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => assertQueueJobEnvelope({
    contract_version: "1.0.0",
    job_id: id,
    job_type: "agent-task",
    idempotency_key: "agent-task-123456",
    correlation_id: secondId,
    enqueued_at: "2026-07-24T00:00:00Z",
    payload: cyclic
  }), (error) => {
    assert.equal(error.code, "CYCLIC_JSON_VALUE");
    return true;
  });
  assert.throws(() => assertQueueJobEnvelope({
    contract_version: "1.0.0",
    job_id: id,
    job_type: "agent-task",
    idempotency_key: "agent-task-123456",
    correlation_id: secondId,
    enqueued_at: "2026-07-24T00:00:00Z",
    payload: { invalid: Number.POSITIVE_INFINITY }
  }), (error) => {
    assert.equal(error.code, "INVALID_JSON_VALUE");
    return true;
  });
});

test("event and audit consumers reject malformed canonical records", () => {
  const scope = {
    scope_type: "ENTITY",
    scope_id: thirdId,
    entity_id: thirdId,
    display_label: "Target entity"
  };
  const event = {
    event_id: id,
    sequence_number: 1,
    event_type: "entity.paused",
    aggregate_type: "ENTITY",
    aggregate_id: thirdId,
    aggregate_version: 4,
    scope,
    actor_type: "ENTRAL",
    actor_id: secondId,
    correlation_id: id,
    causation_id: null,
    payload: {},
    occurred_at: "2026-07-24T00:00:00Z"
  };
  const audit = {
    audit_id: id,
    sequence_number: 1,
    actor_type: "ENTRAL",
    actor_id: secondId,
    action_type: "PAUSE_ENTITY",
    target_type: "ENTITY",
    target_id: thirdId,
    scope,
    reason: "Verified dependency failure",
    before_state: { status: "ACTIVE" },
    after_state: { status: "PAUSED" },
    result: "SUCCEEDED",
    evidence_ids: [id],
    rollback_action_id: null,
    correlation_id: id,
    created_at: "2026-07-24T00:00:00Z"
  };
  assert.doesNotThrow(() => assertCanonicalEvent(event));
  assert.doesNotThrow(() => assertAuditEntry(audit));
  assert.throws(() => assertCanonicalEvent({ ...event, sequence_number: 0 }), ContractError);
  assert.throws(() => assertCanonicalEvent({ ...event, actor_type: "EMPEROR" }), ContractError);
  assert.throws(() => assertAuditEntry({ ...audit, correlation_id: "not-a-uuid" }), ContractError);
  assert.throws(() => assertAuditEntry({ ...audit, result: "PENDING" }), ContractError);
});

test("OpenAPI exposes only implemented member and Phase 140 control-plane paths", async () => {
  const openapi = await readFile(new URL("../openapi.yaml", import.meta.url), "utf8");
  const document = parseYaml(openapi);
  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual(Object.keys(document.paths).sort(), [
    "/api/v1/control-plane/businesses",
    "/api/v1/control-plane/businesses/{businessId}",
    "/api/v1/control-plane/governance-actions",
    "/api/v1/control-plane/hierarchy",
    "/api/v1/member/organizations",
    "/api/v1/member/organizations/{organizationId}/overview"
  ]);
  assert.equal(document.components.schemas.CanonicalEntitySummary.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalBusinessSummary.additionalProperties, false);
  assert.equal(document.components.schemas.GovernanceActionRequest.additionalProperties, false);
  assert.equal(document.components.schemas.MemberOverviewResponse.additionalProperties, false);
  assert.equal(document.components.schemas.MemberWorkspace.additionalProperties, false);
  for (const unimplemented of ["/portfolio", "/businesses", "/entities", "/actions", "/audit", "/events"]) {
    assert.equal(openapi.includes(`  ${unimplemented}`), false, `${unimplemented} must not be exposed`);
  }
});

test("action policy matrix parses and preserves provider execution requirements", async () => {
  const raw = await readFile(new URL("../action-policy-matrix.yaml", import.meta.url), "utf8");
  const policy = parseYaml(raw);
  assert.equal(policy.schema_version, "1.0.0");
  assert.deepEqual(Object.keys(policy.actions).sort(), [
    "BUDGET_CHANGE",
    "CREATE",
    "DUPLICATE",
    "EDIT",
    "ISOLATE",
    "MODEL_CHANGE",
    "PAUSE",
    "POLICY_CHANGE",
    "REASSIGN",
    "RECONFIGURE",
    "REPAIR",
    "RESTORE",
    "RESUME",
    "RETARGET",
    "RETIRE",
    "ROLLBACK",
    "SCHEDULE_CHANGE",
    "TOOL_GRANT_CHANGE"
  ]);
  assert.equal(policy.provider_execution.required_stage, "ACTIVE");
  assert.deepEqual(policy.provider_execution.required_exact_matches, [
    "provider_code",
    "provider_api_version",
    "adapter_version",
    "credential_reference_id",
    "owning_business_id",
    "operation_code"
  ]);
});

test("integration registry JSON schema is versioned and requires activation evidence", async () => {
  const raw = await readFile(new URL("../integration-registry-record.schema.json", import.meta.url), "utf8");
  const schema = JSON.parse(raw);
  assert.equal(schema.$id, "https://entral.dev/contracts/v1/integration-registry-record.schema.json");
  assert.ok(schema.required.includes("provider_api_version"));
  assert.ok(schema.required.includes("evidence_ids"));
  const activeConstraint = schema.allOf.find((entry) => entry.if?.properties?.stage?.const === "ACTIVE");
  assert.ok(activeConstraint);
  assert.equal(activeConstraint.then.properties.provider_api_version.type, "string");
  assert.equal(activeConstraint.then.properties.owning_business_id.type, "string");
  assert.equal(activeConstraint.then.properties.granted_operation_codes.minItems, 1);
  assert.equal(activeConstraint.then.properties.evidence_ids.minItems, 1);
});
