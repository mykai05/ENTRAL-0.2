import assert from "node:assert/strict";
import test from "node:test";
import {
  ContractError,
  TUTORIAL_ANCHOR_IDS,
  assertBusinessHealthResponse,
  assertTutorialProgress,
  assertTutorialProgressMutationResponse,
  parseInteractionAnalyticsEventRequest,
  parseTutorialProgressResetRequest,
  parseTutorialProgressUpdateRequest
} from "../dist/index.js";

const eventId = "123e4567-e89b-42d3-a456-426614174000";

test("Phase 200 Tutorial progress accepts only released anchors and bounded server state", () => {
  const update = parseTutorialProgressUpdateRequest({
    contract_version: "1.0.0",
    completed_anchor_ids: ["command-overview", "universe-navigation"],
    current_anchor_id: "universe-navigation",
    expected_revision: 2,
    first_launch_seen: true,
    idempotency_key: "phase200:tutorial:update:contract-test",
    mode: "advanced",
    schema_version: 1
  });
  assert.deepEqual(update.completed_anchor_ids, ["command-overview", "universe-navigation"]);
  assert.deepEqual(TUTORIAL_ANCHOR_IDS, [
    "command-overview",
    "businesses-overview",
    "universe-navigation",
    "infrastructure-records",
    "entral-assistant"
  ]);
  assert.deepEqual(parseTutorialProgressResetRequest({
    contract_version: "1.0.0",
    expected_revision: 2,
    idempotency_key: "phase200:tutorial:reset:contract-test",
    schema_version: 1
  }).expected_revision, 2);

  const progress = {
    business_model_context: null,
    commander_pack_context: null,
    completed_anchor_ids: update.completed_anchor_ids,
    completed_at: null,
    contract_version: "1.0.0",
    current_anchor_id: update.current_anchor_id,
    first_launch_seen: true,
    mode: update.mode,
    organization_id: "organization-1",
    plan_context: null,
    release_version: "phase-200",
    revision: 3,
    role_context: "MEMBER",
    schema_version: 1,
    started_at: "2026-08-02T00:00:00.000Z",
    updated_at: "2026-08-02T00:01:00.000Z",
    user_id: "user-1"
  };
  assertTutorialProgress(progress);
  assertTutorialProgressMutationResponse({
    idempotent_replay: false,
    progress,
    transition: {
      action: "UPDATE",
      actor_user_id: "user-1",
      authorization: "AUTHENTICATED_MEMBER",
      budget: { amount_cents: 0, kind: "NO_EXTERNAL_SPEND" },
      business_id: null,
      evidence: [{ source_id: eventId, source_type: "TUTORIAL_PROGRESS" }],
      failure_behavior: "CONFLICT_NO_WRITE",
      idempotency_key: "phase200:tutorial:update:contract-test",
      occurred_at: "2026-08-02T00:01:00.000Z",
      organization_id: "organization-1",
      prior_revision: 2,
      reconciliation: "OPTIMISTIC_REVISION_AND_READBACK",
      release_version: "phase-200",
      resulting_revision: 3,
      reversible: true,
      tenant_id: "organization-1",
      verification: "TRANSACTIONAL_READ_AFTER_WRITE"
    }
  });
});

test("Phase 200 Tutorial and analytics contracts reject future or sensitive fields", () => {
  assert.throws(() => parseTutorialProgressUpdateRequest({
    contract_version: "1.0.0",
    completed_anchor_ids: ["future-agent-builder"],
    current_anchor_id: null,
    expected_revision: 1,
    first_launch_seen: false,
    idempotency_key: "phase200:tutorial:update:future",
    mode: "beginner",
    schema_version: 1
  }), ContractError);
  assert.throws(() => parseTutorialProgressUpdateRequest({
    contract_version: "1.0.0",
    completed_anchor_ids: [],
    current_anchor_id: null,
    expected_revision: 1,
    first_launch_seen: false,
    idempotency_key: "short",
    mode: "beginner",
    schema_version: 1
  }), ContractError);
  assert.throws(() => parseInteractionAnalyticsEventRequest({
    contract_version: "1.0.0",
    control_id: null,
    event_id: eventId,
    event_type: "ROUTE_FAILURE",
    occurred_at: "2026-08-02T00:00:00.000Z",
    reason_code: "API_UNAVAILABLE",
    route: "/member/dashboard",
    secret: "must not be recorded"
  }), ContractError);
});

test("Phase 200 business health binds facts, freshness, assumptions, evidence, confidence, and next action", () => {
  assert.doesNotThrow(() => assertBusinessHealthResponse({
    contract_version: "1.0.0",
    evidence: [{
      evidence_id: "portfolio:7",
      freshness: "CURRENT",
      label: "Canonical portfolio event 7",
      observed_at: "2026-08-02T00:00:00.000Z",
      source_id: "7",
      source_type: "CANONICAL_PORTFOLIO"
    }],
    health: {
      drivers: [],
      score: 91,
      state: "HEALTHY",
      summary: "Canonical Business is healthy at recorded score 91.",
      value_status: "RECORDED"
    },
    identity: {
      name: "ENTRAL",
      provider_independent: true,
      release_version: "phase-200",
      voice_version: "entral-voice-v1"
    },
    mode: "EXECUTIVE",
    schema_version: 1,
    truth: {
      assumptions: [],
      business_id: eventId,
      business_scope: "Canonical Business",
      confidence: "RECORDED",
      evidence_freshness: {
        observed_at: "2026-08-02T00:00:00.000Z",
        state: "CURRENT"
      },
      next_action: {
        action_id: null,
        available: false,
        label: "Review canonical business record",
        unavailable_reason: "No mutation is implied by a health explanation."
      },
      organization_id: "organization-1"
    }
  }));
});
