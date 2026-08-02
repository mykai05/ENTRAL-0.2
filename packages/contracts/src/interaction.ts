import type { HealthDriver, HealthState } from "./domain.js";
import {
  ContractError,
  assertIsoDate,
  assertJsonValue,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
} from "./validation.js";

export const INTERACTION_CONTRACT_VERSION = "1.0.0" as const;
export const INTERACTION_RELEASE_VERSION = "phase-200" as const;

export const INTERACTION_MODES = ["EXECUTIVE", "OPERATIONAL"] as const;
export type InteractionMode = (typeof INTERACTION_MODES)[number];

export const INTERACTION_ANALYTICS_EVENTS = [
  "ROUTE_FAILURE",
  "TUTORIAL_ABANDONED",
  "HELP_USED",
  "CONTROL_FAILED"
] as const;
export type InteractionAnalyticsEventType = (typeof INTERACTION_ANALYTICS_EVENTS)[number];

export const TUTORIAL_ANCHOR_IDS = [
  "command-overview",
  "businesses-overview",
  "universe-navigation",
  "infrastructure-records",
  "entral-assistant"
] as const;
export type TutorialAnchorId = (typeof TUTORIAL_ANCHOR_IDS)[number];

export interface InteractionEvidenceReference {
  readonly evidence_id: string;
  readonly label: string;
  readonly observed_at: string;
  readonly source_id: string;
  readonly source_type: "CANONICAL_PORTFOLIO" | "MEMBER_WORKSPACE";
  readonly freshness: "CURRENT" | "STALE" | "UNKNOWN";
}

export interface InteractionTruthContext {
  readonly assumptions: readonly string[];
  readonly business_id: string | null;
  readonly business_scope: string;
  readonly confidence: "RECORDED" | "INFERRED" | "UNAVAILABLE";
  readonly evidence_freshness: {
    readonly observed_at: string;
    readonly state: "CURRENT" | "STALE" | "UNKNOWN";
  };
  readonly next_action: {
    readonly action_id: string | null;
    readonly label: string;
    readonly available: boolean;
    readonly unavailable_reason: string | null;
  };
  readonly organization_id: string;
}

export interface BusinessHealthResponse {
  readonly contract_version: typeof INTERACTION_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly identity: {
    readonly name: "ENTRAL";
    readonly provider_independent: true;
    readonly release_version: typeof INTERACTION_RELEASE_VERSION;
    readonly voice_version: "entral-voice-v1";
  };
  readonly mode: InteractionMode;
  readonly health: {
    readonly drivers: readonly HealthDriver[];
    readonly score: number | null;
    readonly state: HealthState;
    readonly summary: string;
    readonly value_status: "RECORDED" | "UNAVAILABLE";
  };
  readonly evidence: readonly InteractionEvidenceReference[];
  readonly truth: InteractionTruthContext;
}

export interface TutorialProgress {
  readonly contract_version: typeof INTERACTION_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly release_version: typeof INTERACTION_RELEASE_VERSION;
  readonly user_id: string;
  readonly organization_id: string;
  readonly role_context: "MEMBER" | "OWNER";
  readonly plan_context: string | null;
  readonly business_model_context: string | null;
  readonly commander_pack_context: string | null;
  readonly mode: "beginner" | "advanced";
  readonly completed_anchor_ids: readonly TutorialAnchorId[];
  readonly current_anchor_id: TutorialAnchorId | null;
  readonly first_launch_seen: boolean;
  readonly revision: number;
  readonly started_at: string;
  readonly completed_at: string | null;
  readonly updated_at: string;
}

export interface TutorialProgressUpdateRequest {
  readonly contract_version: typeof INTERACTION_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly idempotency_key: string;
  readonly expected_revision: number;
  readonly mode: "beginner" | "advanced";
  readonly completed_anchor_ids: readonly TutorialAnchorId[];
  readonly current_anchor_id: TutorialAnchorId | null;
  readonly first_launch_seen: boolean;
}

export interface TutorialProgressResetRequest {
  readonly contract_version: typeof INTERACTION_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly idempotency_key: string;
  readonly expected_revision: number;
}

export interface TutorialProgressMutationResponse {
  readonly progress: TutorialProgress;
  readonly idempotent_replay: boolean;
  readonly transition: {
    readonly action: "UPDATE" | "RESET";
    readonly actor_user_id: string;
    readonly authorization: "AUTHENTICATED_MEMBER" | "AUTHENTICATED_OWNER";
    readonly budget: { readonly kind: "NO_EXTERNAL_SPEND"; readonly amount_cents: 0 };
    readonly business_id: null;
    readonly evidence: readonly [{ readonly source_id: string; readonly source_type: "TUTORIAL_PROGRESS" }];
    readonly failure_behavior: "CONFLICT_NO_WRITE";
    readonly idempotency_key: string;
    readonly occurred_at: string;
    readonly organization_id: string;
    readonly prior_revision: number;
    readonly reconciliation: "OPTIMISTIC_REVISION_AND_READBACK";
    readonly release_version: typeof INTERACTION_RELEASE_VERSION;
    readonly resulting_revision: number;
    readonly reversible: true;
    readonly tenant_id: string;
    readonly verification: "TRANSACTIONAL_READ_AFTER_WRITE";
  };
}

export interface InteractionAnalyticsEventRequest {
  readonly contract_version: typeof INTERACTION_CONTRACT_VERSION;
  readonly schema_version: 1;
  readonly event_id: string;
  readonly event_type: InteractionAnalyticsEventType;
  readonly occurred_at: string;
  readonly route: string;
  readonly control_id: string | null;
  readonly reason_code: string | null;
}

function assertExactVersion(value: Record<string, unknown>, field: string) {
  if (value.contract_version !== INTERACTION_CONTRACT_VERSION || value.schema_version !== 1) {
    throw new ContractError("INVALID_INTERACTION_VERSION", `${field} must use the Phase 200 interaction contract`);
  }
}

function assertNullableBoundedString(value: unknown, field: string, maximum: number): asserts value is string | null {
  if (value !== null) assertNonEmptyString(value, field, maximum);
}

function assertTutorialAnchor(value: unknown, field: string): asserts value is TutorialAnchorId {
  if (typeof value !== "string" || !(TUTORIAL_ANCHOR_IDS as readonly string[]).includes(value)) {
    throw new ContractError("INVALID_TUTORIAL_ANCHOR", `${field} is not a released Tutorial anchor`);
  }
}

function assertTutorialMode(value: unknown, field: string): asserts value is TutorialProgress["mode"] {
  if (value !== "beginner" && value !== "advanced") {
    throw new ContractError("INVALID_TUTORIAL_MODE", `${field} must be beginner or advanced`);
  }
}

export function parseTutorialProgressUpdateRequest(value: unknown): TutorialProgressUpdateRequest {
  assertRecord(value, "tutorial_progress_update");
  const allowed = new Set([
    "contract_version",
    "schema_version",
    "idempotency_key",
    "completed_anchor_ids",
    "current_anchor_id",
    "expected_revision",
    "first_launch_seen",
    "mode"
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new ContractError("UNKNOWN_TUTORIAL_FIELD", `tutorial_progress_update.${key} is not allowed`);
  }
  assertExactVersion(value, "tutorial_progress_update");
  assertNonEmptyString(value.idempotency_key, "tutorial_progress_update.idempotency_key", 255);
  if (value.idempotency_key.length < 12) throw new ContractError("IDEMPOTENCY_KEY", "tutorial_progress_update.idempotency_key must be at least 12 characters");
  assertSafeNonNegativeInteger(value.expected_revision, "tutorial_progress_update.expected_revision");
  assertTutorialMode(value.mode, "tutorial_progress_update.mode");
  if (!Array.isArray(value.completed_anchor_ids) || value.completed_anchor_ids.length > TUTORIAL_ANCHOR_IDS.length) {
    throw new ContractError("INVALID_TUTORIAL_ANCHORS", "tutorial_progress_update.completed_anchor_ids is invalid");
  }
  value.completed_anchor_ids.forEach((anchor, index) => assertTutorialAnchor(anchor, `tutorial_progress_update.completed_anchor_ids[${index}]`));
  if (new Set(value.completed_anchor_ids).size !== value.completed_anchor_ids.length) {
    throw new ContractError("DUPLICATE_TUTORIAL_ANCHOR", "Tutorial completion anchors must be unique");
  }
  if (value.current_anchor_id !== null) assertTutorialAnchor(value.current_anchor_id, "tutorial_progress_update.current_anchor_id");
  if (typeof value.first_launch_seen !== "boolean") {
    throw new ContractError("INVALID_TUTORIAL_STATE", "tutorial_progress_update.first_launch_seen must be boolean");
  }
  return value as unknown as TutorialProgressUpdateRequest;
}

export function parseTutorialProgressResetRequest(value: unknown): TutorialProgressResetRequest {
  assertRecord(value, "tutorial_progress_reset");
  const allowed = new Set(["contract_version", "schema_version", "idempotency_key", "expected_revision"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new ContractError("UNKNOWN_TUTORIAL_FIELD", "tutorial_progress_reset contains an unsupported field");
  }
  assertExactVersion(value, "tutorial_progress_reset");
  assertNonEmptyString(value.idempotency_key, "tutorial_progress_reset.idempotency_key", 255);
  if (value.idempotency_key.length < 12) throw new ContractError("IDEMPOTENCY_KEY", "tutorial_progress_reset.idempotency_key must be at least 12 characters");
  assertSafeNonNegativeInteger(value.expected_revision, "tutorial_progress_reset.expected_revision");
  return value as unknown as TutorialProgressResetRequest;
}

export function assertTutorialProgressMutationResponse(value: unknown): asserts value is TutorialProgressMutationResponse {
  assertRecord(value, "tutorial_progress_mutation");
  if (!Object.prototype.hasOwnProperty.call(value, "progress") || !Object.prototype.hasOwnProperty.call(value, "transition") || typeof value.idempotent_replay !== "boolean") {
    throw new ContractError("INVALID_TUTORIAL_MUTATION", "tutorial_progress_mutation is incomplete");
  }
  assertTutorialProgress(value.progress);
  assertRecord(value.transition, "tutorial_progress_mutation.transition");
  const transition = value.transition;
  if (transition.action !== "UPDATE" && transition.action !== "RESET") throw new ContractError("INVALID_TUTORIAL_ACTION", "tutorial mutation action is invalid");
  assertNonEmptyString(transition.actor_user_id, "tutorial_progress_mutation.transition.actor_user_id", 160);
  if (transition.authorization !== "AUTHENTICATED_MEMBER" && transition.authorization !== "AUTHENTICATED_OWNER") throw new ContractError("INVALID_AUTHORIZATION", "tutorial mutation authorization is invalid");
  assertRecord(transition.budget, "tutorial_progress_mutation.transition.budget");
  if (transition.budget.kind !== "NO_EXTERNAL_SPEND" || transition.budget.amount_cents !== 0) throw new ContractError("INVALID_BUDGET", "tutorial mutation cannot declare external spend");
  if (transition.business_id !== null) throw new ContractError("INVALID_BUSINESS_SCOPE", "tutorial mutation is organization scoped");
  if (!Array.isArray(transition.evidence) || transition.evidence.length !== 1) throw new ContractError("INVALID_EVIDENCE", "tutorial mutation requires one progress evidence reference");
  assertRecord(transition.evidence[0], "tutorial_progress_mutation.transition.evidence[0]");
  assertNonEmptyString(transition.evidence[0].source_id, "tutorial_progress_mutation.transition.evidence[0].source_id", 160);
  if (transition.evidence[0].source_type !== "TUTORIAL_PROGRESS") throw new ContractError("INVALID_EVIDENCE", "tutorial mutation evidence source is invalid");
  if (transition.failure_behavior !== "CONFLICT_NO_WRITE" || transition.reconciliation !== "OPTIMISTIC_REVISION_AND_READBACK" || transition.verification !== "TRANSACTIONAL_READ_AFTER_WRITE" || transition.reversible !== true) {
    throw new ContractError("INVALID_SIDE_EFFECT_DECLARATION", "tutorial mutation side-effect guarantees are invalid");
  }
  assertNonEmptyString(transition.idempotency_key, "tutorial_progress_mutation.transition.idempotency_key", 255);
  assertIsoDate(transition.occurred_at, "tutorial_progress_mutation.transition.occurred_at");
  assertNonEmptyString(transition.organization_id, "tutorial_progress_mutation.transition.organization_id", 160);
  assertSafeNonNegativeInteger(transition.prior_revision, "tutorial_progress_mutation.transition.prior_revision");
  assertSafeNonNegativeInteger(transition.resulting_revision, "tutorial_progress_mutation.transition.resulting_revision");
  if (transition.resulting_revision !== transition.prior_revision + 1) throw new ContractError("INVALID_REVISION_TRANSITION", "tutorial mutation must increment exactly one revision");
  if (transition.release_version !== INTERACTION_RELEASE_VERSION) throw new ContractError("INVALID_RELEASE", "tutorial mutation release is invalid");
  assertNonEmptyString(transition.tenant_id, "tutorial_progress_mutation.transition.tenant_id", 160);
  if (transition.tenant_id !== transition.organization_id || transition.organization_id !== value.progress.organization_id || transition.actor_user_id !== value.progress.user_id || transition.resulting_revision !== value.progress.revision) {
    throw new ContractError("INVALID_TRANSITION_SCOPE", "tutorial mutation transition does not match its progress readback");
  }
}

export function parseTutorialProgressMutationResponse(value: unknown): TutorialProgressMutationResponse {
  assertTutorialProgressMutationResponse(value);
  return value;
}

export function parseInteractionAnalyticsEventRequest(value: unknown): InteractionAnalyticsEventRequest {
  assertRecord(value, "interaction_analytics_event");
  assertExactVersion(value, "interaction_analytics_event");
  const allowed = new Set([
    "contract_version",
    "schema_version",
    "event_id",
    "event_type",
    "occurred_at",
    "route",
    "control_id",
    "reason_code"
  ]);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new ContractError("SENSITIVE_ANALYTICS_FIELD", `interaction_analytics_event.${key} is not allowed`);
  }
  assertUuid(value.event_id, "interaction_analytics_event.event_id");
  if (!(INTERACTION_ANALYTICS_EVENTS as readonly unknown[]).includes(value.event_type)) {
    throw new ContractError("INVALID_ANALYTICS_EVENT", "interaction_analytics_event.event_type is not allowed");
  }
  assertIsoDate(value.occurred_at, "interaction_analytics_event.occurred_at");
  assertNonEmptyString(value.route, "interaction_analytics_event.route", 240);
  if (!value.route.startsWith("/")) throw new ContractError("INVALID_ANALYTICS_ROUTE", "interaction_analytics_event.route must be an application path");
  assertNullableBoundedString(value.control_id, "interaction_analytics_event.control_id", 120);
  assertNullableBoundedString(value.reason_code, "interaction_analytics_event.reason_code", 120);
  return value as unknown as InteractionAnalyticsEventRequest;
}

export function assertTutorialProgress(value: unknown): asserts value is TutorialProgress {
  assertRecord(value, "tutorial_progress");
  assertExactVersion(value, "tutorial_progress");
  if (value.release_version !== INTERACTION_RELEASE_VERSION) throw new ContractError("INVALID_RELEASE", "tutorial_progress.release_version is not active");
  assertNonEmptyString(value.user_id, "tutorial_progress.user_id", 160);
  assertNonEmptyString(value.organization_id, "tutorial_progress.organization_id", 160);
  if (value.role_context !== "MEMBER" && value.role_context !== "OWNER") throw new ContractError("INVALID_MEMBER_ROLE", "tutorial_progress.role_context is invalid");
  assertNullableBoundedString(value.plan_context, "tutorial_progress.plan_context", 120);
  assertNullableBoundedString(value.business_model_context, "tutorial_progress.business_model_context", 160);
  assertNullableBoundedString(value.commander_pack_context, "tutorial_progress.commander_pack_context", 160);
  assertTutorialMode(value.mode, "tutorial_progress.mode");
  if (!Array.isArray(value.completed_anchor_ids)) throw new ContractError("INVALID_TUTORIAL_ANCHORS", "tutorial_progress.completed_anchor_ids must be an array");
  value.completed_anchor_ids.forEach((anchor, index) => assertTutorialAnchor(anchor, `tutorial_progress.completed_anchor_ids[${index}]`));
  if (value.current_anchor_id !== null) assertTutorialAnchor(value.current_anchor_id, "tutorial_progress.current_anchor_id");
  if (typeof value.first_launch_seen !== "boolean") throw new ContractError("INVALID_TUTORIAL_STATE", "tutorial_progress.first_launch_seen must be boolean");
  assertSafeNonNegativeInteger(value.revision, "tutorial_progress.revision");
  if (value.revision < 1) throw new ContractError("INVALID_REVISION", "tutorial_progress.revision must be positive");
  assertIsoDate(value.started_at, "tutorial_progress.started_at");
  if (value.completed_at !== null) assertIsoDate(value.completed_at, "tutorial_progress.completed_at");
  assertIsoDate(value.updated_at, "tutorial_progress.updated_at");
}

export function assertBusinessHealthResponse(value: unknown): asserts value is BusinessHealthResponse {
  assertRecord(value, "business_health");
  assertExactVersion(value, "business_health");
  if (!(INTERACTION_MODES as readonly unknown[]).includes(value.mode)) throw new ContractError("INVALID_INTERACTION_MODE", "business_health.mode is invalid");
  assertRecord(value.identity, "business_health.identity");
  if (value.identity.name !== "ENTRAL" || value.identity.provider_independent !== true || value.identity.release_version !== INTERACTION_RELEASE_VERSION || value.identity.voice_version !== "entral-voice-v1") {
    throw new ContractError("INVALID_INTERACTION_IDENTITY", "business_health.identity is not the released provider-independent identity");
  }
  assertRecord(value.health, "business_health.health");
  if (!["HEALTHY", "WATCH", "DEGRADED", "CRITICAL", "UNKNOWN"].includes(String(value.health.state))) throw new ContractError("INVALID_HEALTH_STATE", "business_health.health.state is invalid");
  if (value.health.score !== null && (typeof value.health.score !== "number" || !Number.isFinite(value.health.score) || value.health.score < 0 || value.health.score > 100)) throw new ContractError("INVALID_HEALTH_SCORE", "business_health.health.score must be 0 to 100 or null");
  assertNonEmptyString(value.health.summary, "business_health.health.summary", 1_000);
  if (value.health.value_status !== "RECORDED" && value.health.value_status !== "UNAVAILABLE") throw new ContractError("INVALID_VALUE_STATUS", "business_health.health.value_status is invalid");
  if (!Array.isArray(value.health.drivers)) throw new ContractError("INVALID_HEALTH_DRIVERS", "business_health.health.drivers must be an array");
  value.health.drivers.forEach((driver, index) => assertJsonValue(driver, `business_health.health.drivers[${index}]`));
  if (!Array.isArray(value.evidence)) throw new ContractError("INVALID_EVIDENCE", "business_health.evidence must be an array");
  assertRecord(value.truth, "business_health.truth");
  assertNonEmptyString(value.truth.organization_id, "business_health.truth.organization_id", 160);
  if (value.truth.business_id !== null) assertUuid(value.truth.business_id, "business_health.truth.business_id");
  assertNonEmptyString(value.truth.business_scope, "business_health.truth.business_scope", 500);
  if (!Array.isArray(value.truth.assumptions)) throw new ContractError("INVALID_ASSUMPTIONS", "business_health.truth.assumptions must be an array");
  value.truth.assumptions.forEach((assumption, index) => assertNonEmptyString(assumption, `business_health.truth.assumptions[${index}]`, 500));
  if (!["RECORDED", "INFERRED", "UNAVAILABLE"].includes(String(value.truth.confidence))) throw new ContractError("INVALID_CONFIDENCE", "business_health.truth.confidence is invalid");
  assertRecord(value.truth.evidence_freshness, "business_health.truth.evidence_freshness");
  assertIsoDate(value.truth.evidence_freshness.observed_at, "business_health.truth.evidence_freshness.observed_at");
  if (!["CURRENT", "STALE", "UNKNOWN"].includes(String(value.truth.evidence_freshness.state))) throw new ContractError("INVALID_FRESHNESS", "business_health.truth.evidence_freshness.state is invalid");
  assertRecord(value.truth.next_action, "business_health.truth.next_action");
  if (typeof value.truth.next_action.available !== "boolean") throw new ContractError("INVALID_NEXT_ACTION", "business_health.truth.next_action.available must be boolean");
  assertNullableBoundedString(value.truth.next_action.action_id, "business_health.truth.next_action.action_id", 120);
  assertNonEmptyString(value.truth.next_action.label, "business_health.truth.next_action.label", 240);
  assertNullableBoundedString(value.truth.next_action.unavailable_reason, "business_health.truth.next_action.unavailable_reason", 500);
}
