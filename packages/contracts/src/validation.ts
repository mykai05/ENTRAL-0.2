import {
  ENTITY_ROLES,
  type ActionRequest,
  type AuditEntry,
  type CanonicalEvent,
  type ContextScope,
  type EntityRole,
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
