import type { BusinessSummary, HealthState, JsonValue } from "./domain.js";
import {
  ContractError,
  assertIsoDate,
  assertJsonValue,
  assertNonEmptyString,
  assertRecord,
  assertSafeNonNegativeInteger,
  assertUuid
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

const healthStates = new Set<HealthState>(["HEALTHY", "WATCH", "DEGRADED", "CRITICAL", "UNKNOWN"]);
const businessStatuses = new Set(["BUILDING", "OPERATING", "PAUSED", "DEGRADED", "RETIRED"]);

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

export function parsePortfolioSummaryResponse(value: unknown): PortfolioSummaryResponse {
  assertRecord(value, "portfolio");
  assertRecord(value.scope, "portfolio.scope");
  if (value.scope.mode !== "HUMAN_PORTFOLIO" && value.scope.mode !== "ASSIGNED_BUSINESSES") {
    throw new ContractError("INVALID_PORTFOLIO_SCOPE", "portfolio.scope.mode is invalid");
  }
  assertNonEmptyString(value.scope.label, "portfolio.scope.label", 240);
  assertUuid(value.scope.user_id, "portfolio.scope.user_id");
  if (!Array.isArray(value.scope.visible_business_ids)) {
    throw new ContractError("INVALID_PORTFOLIO_SCOPE", "portfolio.scope.visible_business_ids must be an array");
  }
  value.scope.visible_business_ids.forEach((id, index) =>
    assertUuid(id, `portfolio.scope.visible_business_ids[${index}]`)
  );

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

export function parseBusinessFullRecordResponse(value: unknown): BusinessFullRecordResponse {
  assertRecord(value, "business_response");
  assertRecord(value.business, "business_response.business");
  assertBusinessSummary(value.business.summary, "business_response.business.summary");
  assertSafeNonNegativeInteger(value.business.aggregate_version, "business_response.business.aggregate_version");
  if (value.business.aggregate_version !== value.business.summary.version) {
    throw new ContractError(
      "BUSINESS_VERSION_MISMATCH",
      "business aggregate_version must equal summary.version"
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
