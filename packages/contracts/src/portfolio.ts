import type { BusinessSummary, EntitySummary, HealthState, JsonValue } from "./domain.js";
import {
  ContractError,
  assertIsoDate,
  assertJsonValue,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid,
  isEntityRole
} from "./validation.js";

export const BUSINESS_DETAIL_SECTIONS = [
  "overview",
  "financials",
  "operations",
  "agents_and_tools",
  "performance",
  "decisions_and_changes",
  "issues_and_recommendations",
  "external_activity"
] as const;

export type BusinessDetailSection = (typeof BUSINESS_DETAIL_SECTIONS)[number];
export type PortfolioScopeMode = "HUMAN_PORTFOLIO" | "ASSIGNED_BUSINESSES";

export interface VisiblePortfolioScope {
  readonly mode: PortfolioScopeMode;
  readonly label: string;
  readonly user_id: string;
  readonly visible_business_ids: readonly string[];
}

export interface PortfolioFinancialTotal {
  readonly currency: string;
  readonly business_count: number;
  readonly businesses_with_financials: number;
  readonly gross_revenue: number;
  readonly net_contribution: number;
  readonly capital_available: number;
}

export interface PortfolioTotals {
  readonly businesses: number;
  readonly active_commanders: number;
  readonly active_soldiers: number;
  readonly unresolved_exceptions: number;
  readonly health_distribution: Readonly<Record<HealthState, number>>;
  readonly financials: readonly PortfolioFinancialTotal[];
}

export interface PortfolioSummaryResponse {
  readonly scope: VisiblePortfolioScope;
  readonly totals: PortfolioTotals;
  readonly businesses: readonly BusinessSummary[];
  readonly event_sequence: number;
  readonly generated_at: string;
}

export interface BusinessVersionSummary {
  readonly version: number;
  readonly changed_at: string;
  readonly reason: string | null;
}

export interface BusinessFullRecord {
  readonly summary: BusinessSummary;
  readonly aggregate_version: number;
  readonly overview: JsonValue;
  readonly financials: JsonValue;
  readonly operations: JsonValue;
  readonly agents_and_tools: JsonValue;
  readonly performance: JsonValue;
  readonly decisions_and_changes: JsonValue;
  readonly issues_and_recommendations: JsonValue;
  readonly external_activity: JsonValue;
  readonly evidence_ids: readonly string[];
  readonly version_history: readonly BusinessVersionSummary[];
  readonly loaded_at: string;
}

export interface BusinessFullRecordResponse {
  readonly business: BusinessFullRecord;
  readonly event_sequence: number;
}

export interface CanonicalPortfolioEvent {
  readonly event_id: string;
  readonly sequence_number: number;
  readonly event_type: string;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly aggregate_version: number | null;
  readonly business_id: string | null;
  readonly occurred_at: string;
}

export interface CanonicalPortfolioEventsResponse {
  readonly events: readonly CanonicalPortfolioEvent[];
  readonly next_sequence: number;
}

export interface CanonicalEntralConversationMessage {
  readonly message_id: string;
  readonly event_id: string | null;
  readonly event_sequence: number | null;
  readonly message_type: string;
  readonly status: string;
  readonly direction: "HUMAN_TO_ENTRAL" | "ENTRAL_TO_HUMAN";
  readonly content: string;
  readonly evidence_refs: readonly CanonicalEvidenceReference[];
  readonly business_id: string | null;
  readonly entral_entity_id: string;
  readonly created_at: string;
  readonly delivered_at: string | null;
  readonly acknowledged_at: string | null;
}

export interface CanonicalEvidenceReference {
  readonly type: string;
  readonly id: string;
}

export interface CanonicalEntralConversationResponse {
  readonly messages: readonly CanonicalEntralConversationMessage[];
  readonly event_sequence: number;
  readonly generated_at: string;
}

export interface CanonicalHierarchyResponse {
  readonly scope: VisiblePortfolioScope;
  readonly entities: readonly EntitySummary[];
  readonly event_sequence: number;
  readonly generated_at: string;
}

export interface EntityVersionSummary {
  readonly version: number;
  readonly changed_at: string;
  readonly reason: string | null;
}

export interface EntityFullRecord {
  readonly summary: EntitySummary;
  readonly aggregate_version: number;
  readonly configuration: JsonValue;
  readonly runtime: JsonValue;
  readonly authority: JsonValue;
  readonly operations: JsonValue;
  readonly economics: JsonValue;
  readonly reliability: JsonValue;
  readonly audit: JsonValue;
  readonly evidence: JsonValue;
  readonly connections: JsonValue;
  readonly version_history: readonly EntityVersionSummary[];
  readonly loaded_at: string;
}

export interface EntityFullRecordResponse {
  readonly entity: EntityFullRecord;
  readonly event_sequence: number;
}

const healthStates = new Set<HealthState>(["HEALTHY", "WATCH", "DEGRADED", "CRITICAL", "UNKNOWN"]);
const businessStatuses = new Set(["BUILDING", "OPERATING", "PAUSED", "DEGRADED", "RETIRED"]);
const entityStatuses = new Set(["BUILDING", "ACTIVE", "PAUSED", "DEGRADED", "RETIRED"]);

function assertNullableNumber(value: unknown, field: string): asserts value is number | null {
  if (value !== null && (typeof value !== "number" || !Number.isFinite(value))) {
    throw new ContractError("INVALID_NUMBER", `${field} must be a finite number or null`);
  }
}

function assertNullableIsoDate(value: unknown, field: string): asserts value is string | null {
  if (value !== null) assertIsoDate(value, field);
}

function assertBusinessSummary(value: unknown, field: string): asserts value is BusinessSummary {
  assertRecord(value, field);
  assertUuid(value.business_id, `${field}.business_id`);
  assertNonEmptyString(value.stable_code, `${field}.stable_code`, 160);
  assertNonEmptyString(value.business_name, `${field}.business_name`, 240);
  assertUuid(value.commander_id, `${field}.commander_id`);
  assertUuid(value.marshal_id, `${field}.marshal_id`);
  assertNonEmptyString(value.marshal_name, `${field}.marshal_name`, 240);
  assertUuid(value.general_id, `${field}.general_id`);
  assertNonEmptyString(value.general_name, `${field}.general_name`, 240);
  if (!businessStatuses.has(String(value.status))) {
    throw new ContractError("INVALID_BUSINESS_STATUS", `${field}.status is not a canonical business status`);
  }
  if (!healthStates.has(value.health_state as HealthState)) {
    throw new ContractError("INVALID_HEALTH_STATE", `${field}.health_state is not a canonical health state`);
  }
  assertNullableNumber(value.health_score, `${field}.health_score`);
  if (!Array.isArray(value.health_drivers)) {
    throw new ContractError("INVALID_HEALTH_DRIVERS", `${field}.health_drivers must be an array`);
  }
  value.health_drivers.forEach((driver, index) => assertJsonValue(driver, `${field}.health_drivers[${index}]`));
  assertNullableIsoDate(value.revenue_period_start, `${field}.revenue_period_start`);
  assertNullableIsoDate(value.revenue_period_end, `${field}.revenue_period_end`);
  assertNullableNumber(value.gross_revenue, `${field}.gross_revenue`);
  assertNullableNumber(value.net_contribution, `${field}.net_contribution`);
  assertNullableNumber(value.capital_available, `${field}.capital_available`);
  if (value.currency !== null) {
    assertNonEmptyString(value.currency, `${field}.currency`, 3);
  }
  for (const countField of [
    "agent_count",
    "tool_count",
    "automation_count",
    "integration_count",
    "active_mission_count",
    "active_task_count"
  ] as const) {
    assertSafeNonNegativeInteger(value[countField], `${field}.${countField}`);
  }
  for (const nullableTextField of [
    "primary_objective",
    "top_exception",
    "top_recommendation"
  ] as const) {
    const candidate = value[nullableTextField];
    if (candidate !== null) assertNonEmptyString(candidate, `${field}.${nullableTextField}`, 5_000);
  }
  assertIsoDate(value.updated_at, `${field}.updated_at`);
  assertRecord(value.source_freshness, `${field}.source_freshness`);
  for (const [key, freshness] of Object.entries(value.source_freshness)) {
    assertNullableIsoDate(freshness, `${field}.source_freshness.${key}`);
  }
  assertSafeNonNegativeInteger(value.version, `${field}.version`);
  if (value.version < 1) {
    throw new ContractError("INVALID_VERSION", `${field}.version must be at least 1`);
  }
}

function assertVisiblePortfolioScope(value: unknown, field: string): asserts value is VisiblePortfolioScope {
  assertRecord(value, field);
  if (value.mode !== "HUMAN_PORTFOLIO" && value.mode !== "ASSIGNED_BUSINESSES") {
    throw new ContractError("INVALID_PORTFOLIO_SCOPE", `${field}.mode is invalid`);
  }
  assertNonEmptyString(value.label, `${field}.label`, 240);
  assertUuid(value.user_id, `${field}.user_id`);
  if (!Array.isArray(value.visible_business_ids)) {
    throw new ContractError("INVALID_PORTFOLIO_SCOPE", `${field}.visible_business_ids must be an array`);
  }
  value.visible_business_ids.forEach((id, index) => assertUuid(id, `${field}.visible_business_ids[${index}]`));
}

function assertEntitySummary(value: unknown, field: string): asserts value is EntitySummary {
  assertRecord(value, field);
  assertUuid(value.entity_id, `${field}.entity_id`);
  assertNonEmptyString(value.stable_code, `${field}.stable_code`, 160);
  if (!isEntityRole(value.entity_type)) {
    throw new ContractError("INVALID_ENTITY_ROLE", `${field}.entity_type is not canonical`);
  }
  assertNonEmptyString(value.name, `${field}.name`, 240);
  if (!entityStatuses.has(String(value.status))) {
    throw new ContractError("INVALID_ENTITY_STATUS", `${field}.status is not canonical`);
  }
  if (!healthStates.has(value.health as HealthState)) {
    throw new ContractError("INVALID_HEALTH_STATE", `${field}.health is not canonical`);
  }
  if (value.parent_id !== null) assertUuid(value.parent_id, `${field}.parent_id`);
  assertSafeNonNegativeInteger(value.child_count, `${field}.child_count`);
  if (value.assigned_business_id !== null) {
    assertUuid(value.assigned_business_id, `${field}.assigned_business_id`);
  }
  for (const nullableTextField of ["model_class", "compute_tier", "current_mission", "active_alert"] as const) {
    const candidate = value[nullableTextField];
    if (candidate !== null) assertNonEmptyString(candidate, `${field}.${nullableTextField}`, 5_000);
  }
  assertSafeNonNegativeInteger(value.active_task_count, `${field}.active_task_count`);
  assertJsonValue(value.latest_material_result, `${field}.latest_material_result`);
  assertIsoDate(value.updated_at, `${field}.updated_at`);
  assertSafeNonNegativeInteger(value.version, `${field}.version`);
  if (value.version < 1) {
    throw new ContractError("INVALID_VERSION", `${field}.version must be at least 1`);
  }
}

export function parsePortfolioSummaryResponse(value: unknown): PortfolioSummaryResponse {
  assertRecord(value, "portfolio");
  assertVisiblePortfolioScope(value.scope, "portfolio.scope");

  assertRecord(value.totals, "portfolio.totals");
  for (const countField of [
    "businesses",
    "active_commanders",
    "active_soldiers",
    "unresolved_exceptions"
  ] as const) {
    assertSafeNonNegativeInteger(value.totals[countField], `portfolio.totals.${countField}`);
  }
  assertRecord(value.totals.health_distribution, "portfolio.totals.health_distribution");
  for (const state of healthStates) {
    assertSafeNonNegativeInteger(
      value.totals.health_distribution[state],
      `portfolio.totals.health_distribution.${state}`
    );
  }
  if (!Array.isArray(value.totals.financials)) {
    throw new ContractError("INVALID_PORTFOLIO_TOTALS", "portfolio.totals.financials must be an array");
  }
  value.totals.financials.forEach((financial, index) => {
    assertRecord(financial, `portfolio.totals.financials[${index}]`);
    assertNonEmptyString(financial.currency, `portfolio.totals.financials[${index}].currency`, 3);
    assertSafeNonNegativeInteger(financial.business_count, `portfolio.totals.financials[${index}].business_count`);
    assertSafeNonNegativeInteger(
      financial.businesses_with_financials,
      `portfolio.totals.financials[${index}].businesses_with_financials`
    );
    for (const amount of ["gross_revenue", "net_contribution", "capital_available"] as const) {
      if (typeof financial[amount] !== "number" || !Number.isFinite(financial[amount])) {
        throw new ContractError("INVALID_PORTFOLIO_TOTALS", `portfolio.totals.financials[${index}].${amount} must be finite`);
      }
    }
  });

  if (!Array.isArray(value.businesses)) {
    throw new ContractError("INVALID_PORTFOLIO", "portfolio.businesses must be an array");
  }
  value.businesses.forEach((business, index) => assertBusinessSummary(business, `portfolio.businesses[${index}]`));
  assertSafeNonNegativeInteger(value.event_sequence, "portfolio.event_sequence");
  assertIsoDate(value.generated_at, "portfolio.generated_at");
  return value as unknown as PortfolioSummaryResponse;
}

export function parseCanonicalHierarchyResponse(value: unknown): CanonicalHierarchyResponse {
  assertRecord(value, "hierarchy");
  assertVisiblePortfolioScope(value.scope, "hierarchy.scope");
  if (!Array.isArray(value.entities)) {
    throw new ContractError("INVALID_HIERARCHY", "hierarchy.entities must be an array");
  }
  if (value.entities.length > 100_000) {
    throw new ContractError("INVALID_HIERARCHY", "hierarchy.entities exceeds the 100000 record safety limit");
  }
  const entities = new Map<string, EntitySummary>();
  value.entities.forEach((entity, index) => {
    assertEntitySummary(entity, `hierarchy.entities[${index}]`);
    if (entities.has(entity.entity_id)) {
      throw new ContractError("DUPLICATE_ENTITY", `Duplicate hierarchy entity ${entity.entity_id}`);
    }
    entities.set(entity.entity_id, entity);
  });
  for (const entity of entities.values()) {
    if (entity.parent_id !== null && !entities.has(entity.parent_id)) {
      throw new ContractError("MISSING_HIERARCHY_PARENT", `${entity.entity_id} references a missing parent`);
    }
  }
  assertSafeNonNegativeInteger(value.event_sequence, "hierarchy.event_sequence");
  assertIsoDate(value.generated_at, "hierarchy.generated_at");
  return value as unknown as CanonicalHierarchyResponse;
}

export function parseEntityFullRecordResponse(value: unknown): EntityFullRecordResponse {
  assertRecord(value, "entity_response");
  assertRecord(value.entity, "entity_response.entity");
  assertEntitySummary(value.entity.summary, "entity_response.entity.summary");
  assertSafeNonNegativeInteger(value.entity.aggregate_version, "entity_response.entity.aggregate_version");
  assertSafeNonNegativeInteger(value.event_sequence, "entity_response.event_sequence");
  if (value.entity.aggregate_version !== value.entity.summary.version) {
    throw new ContractError(
      "ENTITY_VERSION_MISMATCH",
      "entity aggregate_version must equal entity.summary.version"
    );
  }
  for (const section of [
    "configuration",
    "runtime",
    "authority",
    "operations",
    "economics",
    "reliability",
    "audit",
    "evidence",
    "connections"
  ] as const) {
    assertJsonValue(value.entity[section], `entity_response.entity.${section}`);
  }
  if (!Array.isArray(value.entity.version_history)) {
    throw new ContractError("INVALID_VERSION_HISTORY", "entity_response.entity.version_history must be an array");
  }
  value.entity.version_history.forEach((version, index) => {
    assertRecord(version, `entity_response.entity.version_history[${index}]`);
    assertSafeNonNegativeInteger(version.version, `entity_response.entity.version_history[${index}].version`);
    assertIsoDate(version.changed_at, `entity_response.entity.version_history[${index}].changed_at`);
    if (version.reason !== null) {
      assertNonEmptyString(version.reason, `entity_response.entity.version_history[${index}].reason`, 2_000);
    }
  });
  assertIsoDate(value.entity.loaded_at, "entity_response.entity.loaded_at");
  return value as unknown as EntityFullRecordResponse;
}

export function parseBusinessFullRecordResponse(value: unknown): BusinessFullRecordResponse {
  assertRecord(value, "business_response");
  assertRecord(value.business, "business_response.business");
  assertBusinessSummary(value.business.summary, "business_response.business.summary");
  assertSafeNonNegativeInteger(value.business.aggregate_version, "business_response.business.aggregate_version");
  assertSafeNonNegativeInteger(value.event_sequence, "business_response.event_sequence");
  if (value.business.aggregate_version !== value.business.summary.version) {
    throw new ContractError(
      "BUSINESS_VERSION_MISMATCH",
      "business aggregate_version must equal business.summary.version"
    );
  }
  for (const section of BUSINESS_DETAIL_SECTIONS) {
    assertJsonValue(value.business[section], `business_response.business.${section}`);
  }
  if (!Array.isArray(value.business.evidence_ids)) {
    throw new ContractError("INVALID_EVIDENCE", "business_response.business.evidence_ids must be an array");
  }
  value.business.evidence_ids.forEach((id, index) =>
    assertUuid(id, `business_response.business.evidence_ids[${index}]`)
  );
  if (!Array.isArray(value.business.version_history)) {
    throw new ContractError("INVALID_VERSION_HISTORY", "business_response.business.version_history must be an array");
  }
  value.business.version_history.forEach((version, index) => {
    assertRecord(version, `business_response.business.version_history[${index}]`);
    assertSafeNonNegativeInteger(version.version, `business_response.business.version_history[${index}].version`);
    assertIsoDate(version.changed_at, `business_response.business.version_history[${index}].changed_at`);
    if (version.reason !== null) {
      assertNonEmptyString(version.reason, `business_response.business.version_history[${index}].reason`, 2_000);
    }
  });
  assertIsoDate(value.business.loaded_at, "business_response.business.loaded_at");
  return value as unknown as BusinessFullRecordResponse;
}

export function parseCanonicalPortfolioEventsResponse(value: unknown): CanonicalPortfolioEventsResponse {
  assertRecord(value, "events_response");
  if (!Array.isArray(value.events)) {
    throw new ContractError("INVALID_EVENTS", "events_response.events must be an array");
  }
  value.events.forEach((event, index) => {
    assertRecord(event, `events_response.events[${index}]`);
    assertUuid(event.event_id, `events_response.events[${index}].event_id`);
    assertSafeNonNegativeInteger(event.sequence_number, `events_response.events[${index}].sequence_number`);
    if (event.sequence_number < 1) {
      throw new ContractError("INVALID_SEQUENCE", `events_response.events[${index}].sequence_number must be at least 1`);
    }
    assertNonEmptyString(event.event_type, `events_response.events[${index}].event_type`, 160);
    assertNonEmptyString(event.aggregate_type, `events_response.events[${index}].aggregate_type`, 120);
    assertUuid(event.aggregate_id, `events_response.events[${index}].aggregate_id`);
    if (event.aggregate_version !== null) {
      assertSafeNonNegativeInteger(event.aggregate_version, `events_response.events[${index}].aggregate_version`);
    }
    if (event.business_id !== null) {
      assertUuid(event.business_id, `events_response.events[${index}].business_id`);
    }
    assertIsoDate(event.occurred_at, `events_response.events[${index}].occurred_at`);
  });
  assertSafeNonNegativeInteger(value.next_sequence, "events_response.next_sequence");
  return value as unknown as CanonicalPortfolioEventsResponse;
}

export function parseCanonicalEntralConversationResponse(value: unknown): CanonicalEntralConversationResponse {
  assertRecord(value, "entral_conversation");
  if (!Array.isArray(value.messages)) {
    throw new ContractError("INVALID_ENTRAL_CONVERSATION", "entral_conversation.messages must be an array");
  }
  value.messages.forEach((message, index) => {
    const field = `entral_conversation.messages[${index}]`;
    assertRecord(message, field);
    assertUuid(message.message_id, `${field}.message_id`);
    if (message.event_id !== null) assertUuid(message.event_id, `${field}.event_id`);
    if (message.event_sequence !== null) {
      assertSafeNonNegativeInteger(message.event_sequence, `${field}.event_sequence`);
      if (message.event_sequence < 1) {
        throw new ContractError("INVALID_SEQUENCE", `${field}.event_sequence must be at least 1`);
      }
    }
    assertNonEmptyString(message.message_type, `${field}.message_type`, 120);
    assertNonEmptyString(message.status, `${field}.status`, 120);
    if (message.direction !== "HUMAN_TO_ENTRAL" && message.direction !== "ENTRAL_TO_HUMAN") {
      throw new ContractError("INVALID_ENTRAL_DIRECTION", `${field}.direction is invalid`);
    }
    assertNonEmptyString(message.content, `${field}.content`, 100_000);
    if (!Array.isArray(message.evidence_refs)) {
      throw new ContractError("INVALID_EVIDENCE", `${field}.evidence_refs must be an array`);
    }
    message.evidence_refs.forEach((reference, referenceIndex) => {
      const referenceField = `${field}.evidence_refs[${referenceIndex}]`;
      assertRecord(reference, referenceField);
      assertNonEmptyString(reference.type, `${referenceField}.type`, 120);
      assertNonEmptyString(reference.id, `${referenceField}.id`, 2_000);
    });
    if (message.business_id !== null) assertUuid(message.business_id, `${field}.business_id`);
    assertUuid(message.entral_entity_id, `${field}.entral_entity_id`);
    assertIsoDate(message.created_at, `${field}.created_at`);
    assertNullableIsoDate(message.delivered_at, `${field}.delivered_at`);
    assertNullableIsoDate(message.acknowledged_at, `${field}.acknowledged_at`);
  });
  assertSafeNonNegativeInteger(value.event_sequence, "entral_conversation.event_sequence");
  assertIsoDate(value.generated_at, "entral_conversation.generated_at");
  return value as unknown as CanonicalEntralConversationResponse;
}
