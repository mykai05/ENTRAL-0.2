import {
  ENTITY_ROLES,
  GOVERNANCE_ACTION_TARGETS,
  GOVERNANCE_ACTION_TYPES,
  GOVERNANCE_TARGET_TYPES,
  type ActionRequest,
  type AuditEntry,
  type CanonicalEvent,
  type ContextScope,
  type EntityLifecycleActionRequest,
  type EntityLifecycleActionResult,
  type EntityRole,
  type GovernanceActionRequest,
  type JsonValue
} from "./domain.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const SCOPE_TYPES = ["SYSTEM", "MARSHAL", "GENERAL", "BUSINESS", "ENTITY", "MISSION", "USER"] as const;
const ACTOR_TYPES = ["HUMAN", ...ENTITY_ROLES, "SYSTEM"] as const;
const roleIndex: Readonly<Record<EntityRole, number>> = Object.freeze({
  ENTRAL: 0,
  MARSHAL: 1,
  GENERAL: 2,
  COMMANDER: 3,
  SOLDIER: 4
});

export class ContractError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "ContractError";
  }
}

export function assertRecord(value: unknown, field = "value"): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ContractError("INVALID_RECORD", `${field} must be an object`);
  }
}

export function assertNonEmptyString(value: unknown, field: string, maximum = 10_000): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    throw new ContractError("INVALID_STRING", `${field} must be a non-empty string no longer than ${maximum} characters`);
  }
}

export function assertUuid(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new ContractError("INVALID_UUID", `${field} must be a UUID`);
  }
}

export function assertIsoDate(value: unknown, field: string): asserts value is string {
  if (typeof value !== "string" || !ISO_DATE_RE.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ContractError("INVALID_TIMESTAMP", `${field} must be an ISO-8601 UTC timestamp`);
  }
}

export function assertSafeNonNegativeInteger(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new ContractError("INVALID_INTEGER", `${field} must be a non-negative safe integer`);
  }
}

export function assertJsonValue(value: unknown, field: string): asserts value is JsonValue {
  const seen = new WeakSet<object>();
  const visit = (candidate: unknown, path: string, depth: number): void => {
    if (depth > 64) throw new ContractError("JSON_DEPTH", `${field} exceeds the maximum JSON depth`);
    if (
      candidate === null ||
      typeof candidate === "string" ||
      typeof candidate === "boolean" ||
      (typeof candidate === "number" && Number.isFinite(candidate))
    ) {
      return;
    }
    if (typeof candidate !== "object") {
      throw new ContractError("INVALID_JSON_VALUE", `${path} must be JSON-compatible`);
    }
    if (seen.has(candidate)) throw new ContractError("CYCLIC_JSON_VALUE", `${field} must not contain cycles`);
    seen.add(candidate);
    if (Array.isArray(candidate)) {
      candidate.forEach((item, index) => visit(item, `${path}[${index}]`, depth + 1));
    } else {
      const prototype = Object.getPrototypeOf(candidate);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new ContractError("INVALID_JSON_OBJECT", `${path} must be a plain JSON object`);
      }
      for (const [key, item] of Object.entries(candidate)) {
        visit(item, `${path}.${key}`, depth + 1);
      }
    }
    seen.delete(candidate);
  };
  visit(value, field, 0);
}

export function isEntityRole(value: unknown): value is EntityRole {
  return typeof value === "string" && (ENTITY_ROLES as readonly string[]).includes(value);
}

export function isAdjacentRole(first: EntityRole, second: EntityRole): boolean {
  return Math.abs(roleIndex[first] - roleIndex[second]) === 1;
}

export function assertValidParentRole(child: EntityRole, parent: EntityRole | null): void {
  if (!isEntityRole(child)) {
    throw new ContractError("INVALID_ENTITY_ROLE", `${String(child)} is not a canonical entity role`);
  }
  if (parent !== null && !isEntityRole(parent)) {
    throw new ContractError("INVALID_ENTITY_ROLE", `${String(parent)} is not a canonical entity role`);
  }
  if (child === "ENTRAL") {
    if (parent !== null) throw new ContractError("ENTRAL_PARENT", "ENTRAL cannot have a parent");
    return;
  }
  if (parent === null) throw new ContractError("MISSING_PARENT", `${child} requires a parent`);
  const requiredParent = ENTITY_ROLES[roleIndex[child] - 1];
  if (requiredParent === undefined || parent !== requiredParent) {
    throw new ContractError("INVALID_PARENT_ROLE", `${child} must have a ${requiredParent ?? "valid"} parent`);
  }
}

export function assertOperationalRoute(sender: EntityRole, recipient: EntityRole): void {
  if (!isEntityRole(sender) || !isEntityRole(recipient) || !isAdjacentRole(sender, recipient)) {
    throw new ContractError("INVALID_OPERATIONAL_ROUTE", `${sender} cannot communicate operationally with ${recipient}`);
  }
}

export function assertContextScope(scope: ContextScope): void {
  assertRecord(scope, "scope");
  if (!(SCOPE_TYPES as readonly unknown[]).includes(scope.scope_type)) {
    throw new ContractError("INVALID_SCOPE_TYPE", `${String(scope.scope_type)} is not a canonical scope type`);
  }
  assertUuid(scope.scope_id, "scope.scope_id");
  assertNonEmptyString(scope.display_label, "scope.display_label", 200);
  if (scope.business_id !== undefined) assertUuid(scope.business_id, "scope.business_id");
  if (scope.entity_id !== undefined) assertUuid(scope.entity_id, "scope.entity_id");
  if (scope.inherited_scope_ids !== undefined) {
    if (!Array.isArray(scope.inherited_scope_ids)) {
      throw new ContractError("INVALID_SCOPE", "scope.inherited_scope_ids must be an array");
    }
    scope.inherited_scope_ids.forEach((value, index) => assertUuid(value, `scope.inherited_scope_ids[${index}]`));
  }
  if (scope.scope_type === "BUSINESS" && scope.business_id !== scope.scope_id) {
    throw new ContractError("BUSINESS_SCOPE_MISMATCH", "BUSINESS scope_id must equal business_id");
  }
  if (scope.scope_type === "ENTITY" && scope.entity_id !== scope.scope_id) {
    throw new ContractError("ENTITY_SCOPE_MISMATCH", "ENTITY scope_id must equal entity_id");
  }
}

export function assertActionRequest(request: ActionRequest): void {
  assertRecord(request, "request");
  assertUuid(request.action_id, "action_id");
  if (!(ACTOR_TYPES as readonly unknown[]).includes(request.actor_type)) {
    throw new ContractError("INVALID_ACTOR_TYPE", `${String(request.actor_type)} is not a canonical actor type`);
  }
  assertUuid(request.actor_id, "actor_id");
  assertContextScope(request.scope);
  if (request.target_entity_id !== undefined) assertUuid(request.target_entity_id, "target_entity_id");
  if (request.target_business_id !== undefined) assertUuid(request.target_business_id, "target_business_id");
  assertNonEmptyString(request.action_type, "action_type", 120);
  if (request.action_type.trim().length < 3) {
    throw new ContractError("ACTION_TYPE", "action_type must be at least 3 characters");
  }
  assertNonEmptyString(request.reason, "reason", 2_000);
  if (request.reason.trim().length < 3) {
    throw new ContractError("REASON", "reason must be at least 3 characters");
  }
  assertJsonValue(request.parameters, "parameters");
  assertSafeNonNegativeInteger(request.expected_version, "expected_version");
  assertNonEmptyString(request.idempotency_key, "idempotency_key", 255);
  if (request.idempotency_key.trim().length < 12) {
    throw new ContractError("IDEMPOTENCY_KEY", "idempotency_key must be at least 12 characters");
  }
  assertIsoDate(request.requested_at, "requested_at");
}

export function assertGovernanceActionRequest(request: GovernanceActionRequest): void {
  assertRecord(request, "governance_action_request");
  assertUuid(request.action_id, "action_id");
  if (!(GOVERNANCE_ACTION_TYPES as readonly unknown[]).includes(request.action_type)) {
    throw new ContractError("INVALID_GOVERNANCE_ACTION", `${String(request.action_type)} is not a governance action type`);
  }
  if (request.actor_type !== "HUMAN" && request.actor_type !== "ENTRAL") {
    throw new ContractError("INVALID_GOVERNANCE_ACTOR", "Governance actions require Human authority or ENTRAL");
  }
  if (request.action_type === "REPAIR" && request.actor_type !== "ENTRAL") {
    throw new ContractError("INVALID_GOVERNANCE_ACTOR", "REPAIR governance actions require ENTRAL");
  }
  assertUuid(request.actor_id, "actor_id");
  assertContextScope(request.scope);
  if (!(GOVERNANCE_TARGET_TYPES as readonly unknown[]).includes(request.target_type)) {
    throw new ContractError("INVALID_GOVERNANCE_TARGET", `${String(request.target_type)} is not a governance target type`);
  }
  if (!GOVERNANCE_ACTION_TARGETS[request.action_type].includes(request.target_type)) {
    throw new ContractError(
      "ACTION_TARGET_MISMATCH",
      `${request.action_type} cannot target ${request.target_type}`
    );
  }
  if (request.target_type === "SYSTEM") {
    if (request.target_id !== null) {
      throw new ContractError("SYSTEM_TARGET_ID", "SYSTEM governance actions cannot carry a target_id");
    }
  } else {
    assertUuid(request.target_id, "target_id");
  }
  if (request.target_type === "GOVERNANCE_ACTION" && request.target_id === request.action_id) {
    throw new ContractError("SELF_TARGET", "A governance action cannot target itself");
  }
  if (request.business_id !== null) assertUuid(request.business_id, "business_id");
  if ((request.target_type === "SYSTEM" || request.target_type === "POLICY") && request.business_id !== null) {
    throw new ContractError("GLOBAL_TARGET_SCOPE", `${request.target_type} governance actions cannot be business-scoped`);
  }
  assertNonEmptyString(request.requested_outcome, "requested_outcome", 2_000);
  assertNonEmptyString(request.reason, "reason", 2_000);
  assertJsonValue(request.authority_basis, "authority_basis");
  if (!["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(request.risk_class)) {
    throw new ContractError("INVALID_RISK_CLASS", `${String(request.risk_class)} is not a risk class`);
  }
  if (
    request.confidence !== undefined
    && (typeof request.confidence !== "number"
      || !Number.isFinite(request.confidence)
      || request.confidence < 0
      || request.confidence > 1)
  ) {
    throw new ContractError("INVALID_CONFIDENCE", "confidence must be between 0 and 1");
  }
  assertJsonValue(request.proposed_changes, "proposed_changes");
  assertJsonValue(request.rollback_plan, "rollback_plan");
  assertJsonValue(request.verification_plan, "verification_plan");
  assertSafeNonNegativeInteger(request.expected_version, "expected_version");
  assertNonEmptyString(request.idempotency_key, "idempotency_key", 255);
  if (request.idempotency_key.trim().length < 12) {
    throw new ContractError("IDEMPOTENCY_KEY", "idempotency_key must be at least 12 characters");
  }
  assertIsoDate(request.requested_at, "requested_at");
  if (request.restores_action_id !== undefined) {
    assertUuid(request.restores_action_id, "restores_action_id");
    if (request.restores_action_id === request.action_id) {
      throw new ContractError("SELF_RESTORATION", "An action cannot restore itself");
    }
  }
}

export function assertEntityLifecycleActionRequest(
  request: EntityLifecycleActionRequest
): void {
  assertGovernanceActionRequest(request);
  if (request.action_type !== "PAUSE" && request.action_type !== "RESUME") {
    throw new ContractError("INVALID_LIFECYCLE_ACTION", "Entity lifecycle actions must be PAUSE or RESUME");
  }
  if (request.target_type !== "ENTITY" || request.target_id === null) {
    throw new ContractError("INVALID_LIFECYCLE_TARGET", "Entity lifecycle actions require an entity target");
  }
  assertRecord(request.proposed_changes, "proposed_changes");
  const expectedStatus = request.action_type === "PAUSE" ? "PAUSED" : "ACTIVE";
  if (request.proposed_changes.status !== expectedStatus) {
    throw new ContractError(
      "LIFECYCLE_STATUS_MISMATCH",
      `${request.action_type} requires proposed status ${expectedStatus}`
    );
  }
  if (request.proposed_changes.containment_policy !== "FINISH_IN_FLIGHT") {
    throw new ContractError(
      "INVALID_CONTAINMENT_POLICY",
      "The production pause slice supports FINISH_IN_FLIGHT containment"
    );
  }
  assertRecord(request.rollback_plan, "rollback_plan");
  const inverseAction = request.action_type === "PAUSE" ? "RESUME" : "PAUSE";
  if (request.rollback_plan.action !== inverseAction) {
    throw new ContractError(
      "ROLLBACK_ACTION_MISMATCH",
      `${request.action_type} requires ${inverseAction} as its restoration action`
    );
  }
  if (!["BUILDING", "ACTIVE", "PAUSED", "DEGRADED", "RETIRED"].includes(request.rollback_plan.previous_status)) {
    throw new ContractError("INVALID_ROLLBACK_STATUS", "rollback_plan.previous_status is not an entity status");
  }
}

export function assertEntityLifecycleActionResult(
  result: unknown
): asserts result is EntityLifecycleActionResult {
  assertRecord(result, "entity_lifecycle_action_result");
  const candidate = result as unknown as EntityLifecycleActionResult;
  assertUuid(candidate.action_id, "action_id");
  if (candidate.action_type !== "PAUSE" && candidate.action_type !== "RESUME") {
    throw new ContractError("INVALID_LIFECYCLE_ACTION", "action_type must be PAUSE or RESUME");
  }
  if (candidate.status !== "SUCCEEDED" || typeof candidate.idempotent_replay !== "boolean") {
    throw new ContractError(
      "INVALID_LIFECYCLE_COMPLETION",
      "A lifecycle receipt must be succeeded and declare whether it is an idempotent replay"
    );
  }
  assertRecord(candidate.target, "target");
  assertUuid(candidate.target?.entity_id, "target.entity_id");
  if (
    !(["MARSHAL", "GENERAL", "COMMANDER", "SOLDIER"] as readonly unknown[])
      .includes(candidate.target.entity_role)
  ) {
    throw new ContractError(
      "INVALID_LIFECYCLE_TARGET_ROLE",
      "target.entity_role must be MARSHAL, GENERAL, COMMANDER, or SOLDIER"
    );
  }
  if (candidate.target.business_id !== null) {
    assertUuid(candidate.target.business_id, "target.business_id");
  }
  assertRecord(candidate.before, "before");
  assertRecord(candidate.after, "after");
  assertSafeNonNegativeInteger(candidate.before?.version, "before.version");
  assertSafeNonNegativeInteger(candidate.after?.version, "after.version");
  assertSafeNonNegativeInteger(candidate.target.version, "target.version");
  const entityStatuses = ["BUILDING", "ACTIVE", "PAUSED", "DEGRADED", "RETIRED"] as const;
  if (!(entityStatuses as readonly unknown[]).includes(candidate.before.status)) {
    throw new ContractError("INVALID_LIFECYCLE_STATUS", "before.status is not an entity status");
  }
  const validBeforeStatus = candidate.action_type === "PAUSE"
    ? candidate.before.status === "ACTIVE" || candidate.before.status === "DEGRADED"
    : candidate.before.status === "PAUSED";
  if (!validBeforeStatus) {
    throw new ContractError(
      "INVALID_LIFECYCLE_PRECONDITION",
      `${candidate.action_type} cannot start from ${candidate.before.status}`
    );
  }
  const expectedAfterStatus = candidate.action_type === "PAUSE" ? "PAUSED" : "ACTIVE";
  if (
    candidate.after.status !== expectedAfterStatus
    || candidate.target.status !== expectedAfterStatus
  ) {
    throw new ContractError(
      "LIFECYCLE_STATUS_MISMATCH",
      `${candidate.action_type} receipts must converge on ${expectedAfterStatus}`
    );
  }
  if (candidate.after.version !== candidate.before.version + 1) {
    throw new ContractError("INVALID_LIFECYCLE_VERSION", "A lifecycle action must advance the entity by exactly one version");
  }
  if (candidate.verification?.passed !== true) {
    throw new ContractError("UNVERIFIED_LIFECYCLE_RESULT", "A lifecycle success requires passed readback verification");
  }
  if (
    candidate.target.version !== candidate.after.version
    || candidate.target.status !== candidate.after.status
    || candidate.verification.expected_version !== candidate.after.version
    || candidate.verification.expected_status !== candidate.after.status
    || candidate.verification.observed_version !== candidate.after.version
    || candidate.verification.observed_status !== candidate.after.status
  ) {
    throw new ContractError("LIFECYCLE_READBACK_MISMATCH", "Lifecycle result fields do not share one verified aggregate version");
  }
  assertRecord(candidate.containment, "containment");
  assertSafeNonNegativeInteger(candidate.containment.descendants_affected, "containment.descendants_affected");
  const expectedLeasing = candidate.action_type === "PAUSE" ? "BLOCKED" : "ELIGIBLE";
  if (
    candidate.containment.policy !== "FINISH_IN_FLIGHT"
    || candidate.containment.new_work_leasing !== expectedLeasing
  ) {
    throw new ContractError(
      "LIFECYCLE_CONTAINMENT_MISMATCH",
      `${candidate.action_type} requires FINISH_IN_FLIGHT containment with ${expectedLeasing} new-work leasing`
    );
  }
  assertUuid(candidate.verification.verification_id, "verification.verification_id");
  assertIsoDate(candidate.verification.checked_at, "verification.checked_at");
  assertUuid(candidate.canonical_event?.event_id, "canonical_event.event_id");
  assertSafeNonNegativeInteger(
    candidate.canonical_event?.aggregate_version,
    "canonical_event.aggregate_version"
  );
  assertSafeNonNegativeInteger(candidate.canonical_event?.sequence_number, "canonical_event.sequence_number");
  if (candidate.canonical_event.aggregate_version !== candidate.after.version) {
    throw new ContractError(
      "LIFECYCLE_EVENT_VERSION_MISMATCH",
      "The canonical event aggregate version must equal the verified entity version"
    );
  }
  if (candidate.canonical_event.sequence_number < 1) {
    throw new ContractError("INVALID_SEQUENCE", "canonical_event.sequence_number must be at least 1");
  }
  if (!Array.isArray(candidate.audit_entry_ids) || candidate.audit_entry_ids.length === 0) {
    throw new ContractError("MISSING_AUDIT", "Lifecycle result requires at least one audit entry");
  }
  candidate.audit_entry_ids.forEach((id, index) => assertUuid(id, `audit_entry_ids[${index}]`));
  assertUuid(candidate.conversation_message_id, "conversation_message_id");
  assertNonEmptyString(candidate.idempotency_key, "idempotency_key", 255);
  assertIsoDate(candidate.requested_at, "requested_at");
  assertIsoDate(candidate.completed_at, "completed_at");
  if (Date.parse(candidate.completed_at) < Date.parse(candidate.requested_at)) {
    throw new ContractError("INVALID_LIFECYCLE_TIMELINE", "completed_at cannot precede requested_at");
  }
  assertRecord(candidate.rollback, "rollback");
  assertUuid(candidate.rollback?.restores_action_id, "rollback.restores_action_id");
  const inverseAction = candidate.action_type === "PAUSE" ? "RESUME" : "PAUSE";
  if (
    candidate.rollback.action_type !== inverseAction
    || candidate.rollback.available !== true
    || candidate.rollback.expected_version !== candidate.after.version
    || candidate.rollback.restores_action_id !== candidate.action_id
  ) {
    throw new ContractError(
      "INVALID_LIFECYCLE_ROLLBACK",
      "rollback must be the available opposite action for the verified aggregate version"
    );
  }
  if (candidate.restoration_of_action_id !== null) {
    assertUuid(candidate.restoration_of_action_id, "restoration_of_action_id");
    if (candidate.restoration_of_action_id === candidate.action_id) {
      throw new ContractError("SELF_RESTORATION", "An action cannot restore itself");
    }
  }
}

export function assertExpectedVersion(expectedVersion: number, actualVersion: number): void {
  assertSafeNonNegativeInteger(expectedVersion, "expected_version");
  assertSafeNonNegativeInteger(actualVersion, "actual_version");
  if (expectedVersion !== actualVersion) {
    throw new ContractError(
      "STALE_EXPECTED_VERSION",
      `expected_version ${expectedVersion} does not match actual version ${actualVersion}`
    );
  }
}

export class IdempotencyKeyRegistry {
  readonly #keys = new Set<string>();

  claim(key: string): void {
    assertNonEmptyString(key, "idempotency_key", 255);
    if (key.trim().length < 12) {
      throw new ContractError("IDEMPOTENCY_KEY", "idempotency_key must be at least 12 characters");
    }
    if (this.#keys.has(key)) {
      throw new ContractError("DUPLICATE_IDEMPOTENCY_KEY", `idempotency_key ${key} has already been claimed`);
    }
    this.#keys.add(key);
  }

  has(key: string): boolean {
    return this.#keys.has(key);
  }
}

export function assertCanonicalEvent(event: CanonicalEvent): void {
  assertRecord(event, "event");
  assertUuid(event.event_id, "event_id");
  assertSafeNonNegativeInteger(event.sequence_number, "sequence_number");
  if (event.sequence_number < 1) throw new ContractError("INVALID_SEQUENCE", "sequence_number must be at least 1");
  assertNonEmptyString(event.event_type, "event_type", 160);
  assertNonEmptyString(event.aggregate_type, "aggregate_type", 120);
  assertUuid(event.aggregate_id, "aggregate_id");
  assertSafeNonNegativeInteger(event.aggregate_version, "aggregate_version");
  assertContextScope(event.scope);
  if (!(ACTOR_TYPES as readonly unknown[]).includes(event.actor_type)) {
    throw new ContractError("INVALID_ACTOR_TYPE", `${String(event.actor_type)} is not a canonical actor type`);
  }
  assertUuid(event.actor_id, "actor_id");
  assertUuid(event.correlation_id, "correlation_id");
  if (event.causation_id !== null) assertUuid(event.causation_id, "causation_id");
  assertIsoDate(event.occurred_at, "occurred_at");
  assertJsonValue(event.payload, "payload");
}

export function assertAuditEntry(entry: AuditEntry): void {
  assertRecord(entry, "audit_entry");
  assertUuid(entry.audit_id, "audit_id");
  assertSafeNonNegativeInteger(entry.sequence_number, "sequence_number");
  if (entry.sequence_number < 1) throw new ContractError("INVALID_SEQUENCE", "sequence_number must be at least 1");
  if (!(ACTOR_TYPES as readonly unknown[]).includes(entry.actor_type)) {
    throw new ContractError("INVALID_ACTOR_TYPE", `${String(entry.actor_type)} is not a canonical actor type`);
  }
  assertUuid(entry.actor_id, "actor_id");
  assertNonEmptyString(entry.action_type, "action_type", 160);
  assertNonEmptyString(entry.target_type, "target_type", 120);
  assertUuid(entry.target_id, "target_id");
  assertContextScope(entry.scope);
  assertNonEmptyString(entry.reason, "reason", 2_000);
  assertJsonValue(entry.before_state, "before_state");
  assertJsonValue(entry.after_state, "after_state");
  if (!["SUCCEEDED", "FAILED", "ROLLED_BACK"].includes(entry.result)) {
    throw new ContractError("INVALID_AUDIT_RESULT", `${String(entry.result)} is not a canonical audit result`);
  }
  if (!Array.isArray(entry.evidence_ids)) {
    throw new ContractError("INVALID_EVIDENCE", "evidence_ids must be an array");
  }
  entry.evidence_ids.forEach((value, index) => assertUuid(value, `evidence_ids[${index}]`));
  if (entry.rollback_action_id !== null) assertUuid(entry.rollback_action_id, "rollback_action_id");
  assertUuid(entry.correlation_id, "correlation_id");
  assertIsoDate(entry.created_at, "created_at");
}
