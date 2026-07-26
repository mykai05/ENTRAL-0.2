import { createHash } from "node:crypto";
import {
  assertGovernanceActionRequest,
  type BusinessFullRecordResponse,
  type BusinessSummary,
  type CanonicalEvidenceReference,
  type CanonicalEntralConversationResponse,
  type CanonicalHierarchyResponse,
  type CanonicalPortfolioEventsResponse,
  type EntityFullRecord,
  type EntityStatus,
  type EntitySummary,
  type GovernanceActionRequest,
  type GovernanceTargetType,
  type HealthState,
  type JsonValue,
  type PortfolioFinancialTotal,
  type PortfolioSummaryResponse
} from "@entral/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  prisma,
  withCanonicalSession,
  type CanonicalSessionContext
} from "../db.js";

type RawEntitySummary = {
  activeAlert: string | null;
  activeTaskCount: number;
  assignedBusinessId: string | null;
  childCount: number;
  computeTier: string | null;
  entityId: string;
  entityType: EntitySummary["entity_type"];
  health: EntitySummary["health"];
  latestMaterialResult: JsonValue;
  modelClass: string | null;
  name: string;
  parentId: string | null;
  stableCode: string;
  status: EntitySummary["status"];
  currentMission: string | null;
  updatedAt: Date;
  version: number;
};

type RawBusinessSummary = {
  activeMissionCount: number;
  activeTaskCount: number;
  agentCount: number;
  automationCount: number;
  businessId: string;
  businessName: string;
  capitalAvailable: Prisma.Decimal | number | null;
  commanderId: string;
  currency: string | null;
  generalId: string;
  generalName: string;
  grossRevenue: Prisma.Decimal | number | null;
  healthDrivers: BusinessSummary["health_drivers"];
  healthScore: Prisma.Decimal | number | null;
  healthState: BusinessSummary["health_state"];
  integrationCount: number;
  marshalId: string;
  marshalName: string;
  netContribution: Prisma.Decimal | number | null;
  primaryObjective: string | null;
  revenuePeriodEnd: Date | null;
  revenuePeriodStart: Date | null;
  sourceFreshness: Readonly<Record<string, string | null>>;
  stableCode: string;
  status: BusinessSummary["status"];
  toolCount: number;
  topException: string | null;
  topRecommendation: string | null;
  updatedAt: Date;
  version: number;
};

type RawGovernanceAction = {
  actionId: string;
  actionType: GovernanceActionRequest["action_type"];
  businessId: string | null;
  expectedVersion: bigint | number;
  idempotencyKey: string;
  requestedAt: Date;
  status: string;
  targetId: string | null;
  targetType: GovernanceTargetType;
  version: bigint | number;
};

type TargetVersion = {
  businessId: string | null;
  version: bigint | number;
};

type IdempotencyRow = {
  requestHash: string;
  response: { actionId?: string } | null;
  status: string;
};

type JsonRow = {
  value: JsonValue;
};

type PortfolioEventRow = {
  aggregateId: string;
  aggregateType: string;
  aggregateVersion: bigint | number | null;
  businessId: string | null;
  eventId: string;
  eventType: string;
  occurredAt: Date;
  sequenceNumber: bigint | number;
};

type BusinessVersionRow = {
  changedAt: Date;
  reason: string | null;
  version: bigint | number;
};

type EntityVersionRow = {
  changedAt: Date;
  reason: string | null;
  version: bigint | number;
};

type EntralConversationRow = {
  acknowledgedAt: Date | null;
  businessId: string | null;
  content: string;
  createdAt: Date;
  deliveredAt: Date | null;
  direction: "HUMAN_TO_ENTRAL" | "ENTRAL_TO_HUMAN";
  entralEntityId: string;
  eventId: string | null;
  eventSequence: bigint | number | null;
  evidenceRefs: JsonValue;
  messageId: string;
  messageType: string;
  status: string;
};

export type GovernanceActionRecord = {
  action_id: string;
  action_type: GovernanceActionRequest["action_type"];
  business_id: string | null;
  expected_version: number;
  idempotency_key: string;
  requested_at: string;
  status: string;
  target_id: string | null;
  target_type: GovernanceTargetType;
  version: number;
};

export type CanonicalOperationContext = {
  authenticatedHumanEmail?: string;
  databaseSession: CanonicalSessionContext;
};

export class CanonicalControlPlaneError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number
  ) {
    super(message);
    this.name = "CanonicalControlPlaneError";
  }
}

function numeric(value: Prisma.Decimal | number | null) {
  return value === null ? null : Number(value);
}

function evidenceReferenceArray(value: JsonValue): CanonicalEvidenceReference[] {
  if (!Array.isArray(value)) {
    return [{ id: canonicalJson(value).slice(0, 2_000) || "null", type: "INVALID_REFERENCE" }];
  }
  return value.map((item) => {
    if (typeof item === "string" && item.length > 0) {
      return { id: item, type: "LEGACY_REFERENCE" };
    }
    if (item && typeof item === "object" && !Array.isArray(item)) {
      const record = item as Record<string, JsonValue>;
      if (typeof record.type === "string" && record.type.length > 0
        && typeof record.id === "string" && record.id.length > 0) {
        return { id: record.id.slice(0, 2_000), type: record.type.slice(0, 120) };
      }
    }
    return {
      id: canonicalJson(item).slice(0, 2_000) || "null",
      type: "INVALID_REFERENCE"
    };
  });
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
  return `{${entries.join(",")}}`;
}

function requestHash(request: GovernanceActionRequest) {
  return createHash("sha256").update(canonicalJson(request)).digest("hex");
}

function publicGovernanceAction(row: RawGovernanceAction): GovernanceActionRecord {
  return {
    action_id: row.actionId,
    action_type: row.actionType,
    business_id: row.businessId,
    expected_version: Number(row.expectedVersion),
    idempotency_key: row.idempotencyKey,
    requested_at: row.requestedAt.toISOString(),
    status: row.status,
    target_id: row.targetId,
    target_type: row.targetType,
    version: Number(row.version)
  };
}

function mapEntity(row: RawEntitySummary): EntitySummary {
  return {
    active_alert: row.activeAlert,
    active_task_count: row.activeTaskCount,
    assigned_business_id: row.assignedBusinessId,
    child_count: row.childCount,
    compute_tier: row.computeTier,
    current_mission: row.currentMission,
    entity_id: row.entityId,
    entity_type: row.entityType,
    health: row.health,
    latest_material_result: row.latestMaterialResult,
    model_class: row.modelClass,
    name: row.name,
    parent_id: row.parentId,
    stable_code: row.stableCode,
    status: row.status,
    updated_at: row.updatedAt.toISOString(),
    version: row.version
  };
}

function mapBusiness(row: RawBusinessSummary): BusinessSummary {
  return {
    active_mission_count: row.activeMissionCount,
    active_task_count: row.activeTaskCount,
    agent_count: row.agentCount,
    automation_count: row.automationCount,
    business_id: row.businessId,
    business_name: row.businessName,
    capital_available: numeric(row.capitalAvailable),
    commander_id: row.commanderId,
    currency: row.currency,
    general_id: row.generalId,
    general_name: row.generalName,
    gross_revenue: numeric(row.grossRevenue),
    health_drivers: row.healthDrivers,
    health_score: numeric(row.healthScore),
    health_state: row.healthState,
    integration_count: row.integrationCount,
    marshal_id: row.marshalId,
    marshal_name: row.marshalName,
    net_contribution: numeric(row.netContribution),
    primary_objective: row.primaryObjective,
    revenue_period_end: row.revenuePeriodEnd?.toISOString() ?? null,
    revenue_period_start: row.revenuePeriodStart?.toISOString() ?? null,
    source_freshness: row.sourceFreshness,
    stable_code: row.stableCode,
    status: row.status,
    tool_count: row.toolCount,
    top_exception: row.topException,
    top_recommendation: row.topRecommendation,
    updated_at: row.updatedAt.toISOString(),
    version: row.version
  };
}

async function targetVersion(
  tx: Prisma.TransactionClient,
  targetType: GovernanceTargetType,
  targetId: string | null
): Promise<TargetVersion> {
  if (targetType === "SYSTEM") {
    return { businessId: null, version: 0 };
  }
  if (!targetId) {
    throw new CanonicalControlPlaneError("TARGET_ID_REQUIRED", "A target ID is required.", 400);
  }

  let rows: TargetVersion[];
  switch (targetType) {
    case "ENTITY":
      rows = await tx.$queryRaw<TargetVersion[]>`
        SELECT business_id AS "businessId", version
        FROM entral.entities
        WHERE id = ${targetId}::uuid
        FOR SHARE
      `;
      break;
    case "BUSINESS":
      rows = await tx.$queryRaw<TargetVersion[]>`
        SELECT id AS "businessId", version
        FROM entral.businesses
        WHERE id = ${targetId}::uuid
        FOR SHARE
      `;
      break;
    case "MISSION":
      rows = await tx.$queryRaw<TargetVersion[]>`
        SELECT business_id AS "businessId", version
        FROM entral.missions
        WHERE id = ${targetId}::uuid
        FOR SHARE
      `;
      break;
    case "TASK":
      rows = await tx.$queryRaw<TargetVersion[]>`
        SELECT business_id AS "businessId", version
        FROM entral.tasks
        WHERE id = ${targetId}::uuid
        FOR SHARE
      `;
      break;
    case "TOOL_GRANT":
      rows = await tx.$queryRaw<TargetVersion[]>`
        SELECT business_id AS "businessId", version
        FROM entral.tool_grants
        WHERE id = ${targetId}::uuid
        FOR SHARE
      `;
      break;
    case "SCHEDULE":
      rows = await tx.$queryRaw<TargetVersion[]>`
        SELECT business_id AS "businessId", version
        FROM entral.schedules
        WHERE id = ${targetId}::uuid
        FOR SHARE
      `;
      break;
    case "POLICY":
      rows = await tx.$queryRaw<TargetVersion[]>`
        SELECT NULL::uuid AS "businessId", 1::bigint AS version
        FROM entral.policy_versions
        WHERE id = ${targetId}::uuid
        FOR SHARE
      `;
      break;
    case "GOVERNANCE_ACTION":
      rows = await tx.$queryRaw<TargetVersion[]>`
        SELECT business_id AS "businessId", version
        FROM entral.governance_actions
        WHERE id = ${targetId}::uuid
        FOR SHARE
      `;
      break;
    default:
      throw new CanonicalControlPlaneError("INVALID_TARGET", "Unsupported governance target.", 400);
  }

  if (!rows[0]) {
    throw new CanonicalControlPlaneError("TARGET_NOT_FOUND", "Governance target not found.", 404);
  }
  return rows[0];
}

async function findGovernanceAction(
  tx: Prisma.TransactionClient,
  actionId: string
): Promise<RawGovernanceAction | null> {
  const rows = await tx.$queryRaw<RawGovernanceAction[]>`
    SELECT
      id AS "actionId",
      action_type::text AS "actionType",
      status::text AS status,
      target_type AS "targetType",
      target_id AS "targetId",
      business_id AS "businessId",
      expected_version AS "expectedVersion",
      idempotency_key AS "idempotencyKey",
      requested_at AS "requestedAt",
      version
    FROM entral.governance_actions
    WHERE id = ${actionId}::uuid
  `;
  return rows[0] ?? null;
}

export class CanonicalControlPlaneRepository {
  constructor(private readonly db: PrismaClient = prisma) {}

  private async hierarchyRows(
    transaction: Prisma.TransactionClient,
    entityId?: string
  ): Promise<RawEntitySummary[]> {
    const where = entityId
      ? Prisma.sql`WHERE entity_id = ${entityId}::uuid`
      : Prisma.empty;
    return transaction.$queryRaw<RawEntitySummary[]>(Prisma.sql`
      SELECT
        entity_id AS "entityId",
        stable_code AS "stableCode",
        entity_type::text AS "entityType",
        name,
        status::text AS status,
        health,
        parent_id AS "parentId",
        child_count::integer AS "childCount",
        assigned_business_id AS "assignedBusinessId",
        model_class AS "modelClass",
        compute_tier AS "computeTier",
        current_mission AS "currentMission",
        active_task_count::integer AS "activeTaskCount",
        COALESCE(latest_material_result, 'null'::jsonb) AS "latestMaterialResult",
        active_alert AS "activeAlert",
        updated_at AS "updatedAt",
        version::integer AS version
      FROM entral.v_entity_summary
      ${where}
      ORDER BY
        CASE entity_type
          WHEN 'ENTRAL' THEN 0
          WHEN 'MARSHAL' THEN 1
          WHEN 'GENERAL' THEN 2
          WHEN 'COMMANDER' THEN 3
          WHEN 'SOLDIER' THEN 4
        END,
        stable_code
    `);
  }

  private async visibleScope(
    transaction: Prisma.TransactionClient,
    appUserId: string
  ): Promise<PortfolioSummaryResponse["scope"]> {
    const [authorityRows, businessRows] = await Promise.all([
      transaction.$queryRaw<{ isHumanAuthority: boolean }[]>`
        SELECT entral.session_is_human_authority() AS "isHumanAuthority"
      `,
      transaction.$queryRaw<{ businessId: string }[]>`
        SELECT business_id AS "businessId"
        FROM entral.v_business_summary
        ORDER BY stable_code
      `
    ]);
    const humanPortfolio = authorityRows[0]?.isHumanAuthority === true;
    return {
      label: humanPortfolio ? "Human portfolio / all canonical businesses" : "Assigned canonical businesses",
      mode: humanPortfolio ? "HUMAN_PORTFOLIO" : "ASSIGNED_BUSINESSES",
      user_id: appUserId,
      visible_business_ids: businessRows.map((row) => row.businessId)
    };
  }

  async listHierarchy(session: CanonicalSessionContext): Promise<EntitySummary[]> {
    return withCanonicalSession(this.db, session, async (transaction) => {
      const rows = await this.hierarchyRows(transaction);
      return rows.map(mapEntity);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async getHierarchySnapshot(session: CanonicalSessionContext): Promise<CanonicalHierarchyResponse> {
    return withCanonicalSession(this.db, session, async (transaction, appUserId) => {
      const [rows, scope, eventRows] = await Promise.all([
        this.hierarchyRows(transaction),
        this.visibleScope(transaction, appUserId),
        transaction.$queryRaw<{ sequence: bigint | number }[]>`
          SELECT COALESCE(max(sequence_number), 0)::bigint AS sequence
          FROM entral.canonical_events
        `
      ]);
      return {
        entities: rows.map(mapEntity),
        event_sequence: Number(eventRows[0]?.sequence ?? 0),
        generated_at: new Date().toISOString(),
        scope
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async listBusinesses(session: CanonicalSessionContext): Promise<BusinessSummary[]> {
    return withCanonicalSession(this.db, session, async (transaction) => (
      await this.businessRows(transaction)
    ).map(mapBusiness));
  }

  async getBusiness(
    businessId: string,
    session: CanonicalSessionContext
  ): Promise<BusinessSummary | null> {
    return withCanonicalSession(this.db, session, async (transaction) => {
      const rows = await this.businessRows(transaction, businessId);
      return rows[0] ? mapBusiness(rows[0]) : null;
    });
  }

  private async businessRows(
    transaction: Prisma.TransactionClient,
    businessId?: string
  ): Promise<RawBusinessSummary[]> {
    const where = businessId
      ? Prisma.sql`WHERE business_id = ${businessId}::uuid`
      : Prisma.empty;
    return transaction.$queryRaw<RawBusinessSummary[]>(Prisma.sql`
      SELECT
        business_id AS "businessId",
        stable_code AS "stableCode",
        business_name AS "businessName",
        commander_id AS "commanderId",
        general_id AS "generalId",
        general_name AS "generalName",
        marshal_id AS "marshalId",
        marshal_name AS "marshalName",
        status::text AS status,
        COALESCE(health_state::text, 'UNKNOWN') AS "healthState",
        health_score AS "healthScore",
        COALESCE(health_drivers, '[]'::jsonb) AS "healthDrivers",
        revenue_period_start AS "revenuePeriodStart",
        revenue_period_end AS "revenuePeriodEnd",
        gross_revenue AS "grossRevenue",
        net_contribution AS "netContribution",
        currency,
        capital_available AS "capitalAvailable",
        agent_count::integer AS "agentCount",
        tool_count::integer AS "toolCount",
        automation_count::integer AS "automationCount",
        integration_count::integer AS "integrationCount",
        active_mission_count::integer AS "activeMissionCount",
        active_task_count::integer AS "activeTaskCount",
        primary_objective AS "primaryObjective",
        top_exception AS "topException",
        top_recommendation AS "topRecommendation",
        updated_at AS "updatedAt",
        COALESCE(source_freshness, '{}'::jsonb) AS "sourceFreshness",
        version::integer AS version
      FROM entral.v_business_summary
      ${where}
      ORDER BY stable_code
    `);
  }

  async getPortfolio(session: CanonicalSessionContext): Promise<PortfolioSummaryResponse> {
    return withCanonicalSession(this.db, session, async (transaction, appUserId) => {
      const businesses = (await this.businessRows(transaction)).map(mapBusiness);
      const [authorityRows, activeCommanderRows, activeSoldierRows, eventRows] = await Promise.all([
        transaction.$queryRaw<{ isHumanAuthority: boolean }[]>`
          SELECT entral.session_is_human_authority() AS "isHumanAuthority"
        `,
        transaction.$queryRaw<{ count: number }[]>`
          SELECT count(*)::integer AS count
          FROM entral.entities
          WHERE role = 'COMMANDER'
            AND status = 'ACTIVE'
            AND business_id IS NOT NULL
        `,
        transaction.$queryRaw<{ count: number }[]>`
          SELECT count(*)::integer AS count
          FROM entral.entities
          WHERE role = 'SOLDIER'
            AND status = 'ACTIVE'
            AND business_id IS NOT NULL
        `,
        transaction.$queryRaw<{ sequence: bigint | number }[]>`
          SELECT COALESCE(max(sequence_number), 0)::bigint AS sequence
          FROM entral.canonical_events
        `
      ]);

      const financials = new Map<string, PortfolioFinancialTotal>();
      for (const business of businesses) {
        if (!business.currency) continue;
        const current = financials.get(business.currency) ?? {
          business_count: 0,
          businesses_with_financials: 0,
          capital_available: 0,
          currency: business.currency,
          gross_revenue: 0,
          net_contribution: 0
        };
        const hasFinancials = business.gross_revenue !== null
          || business.net_contribution !== null
          || business.capital_available !== null;
        financials.set(business.currency, {
          ...current,
          business_count: current.business_count + 1,
          businesses_with_financials: current.businesses_with_financials + (hasFinancials ? 1 : 0),
          capital_available: current.capital_available + (business.capital_available ?? 0),
          gross_revenue: current.gross_revenue + (business.gross_revenue ?? 0),
          net_contribution: current.net_contribution + (business.net_contribution ?? 0)
        });
      }

      const healthDistribution: Record<HealthState, number> = {
        CRITICAL: 0,
        DEGRADED: 0,
        HEALTHY: 0,
        UNKNOWN: 0,
        WATCH: 0
      };
      for (const business of businesses) {
        healthDistribution[business.health_state] += 1;
      }

      const humanPortfolio = authorityRows[0]?.isHumanAuthority === true;
      return {
        businesses,
        event_sequence: Number(eventRows[0]?.sequence ?? 0),
        generated_at: new Date().toISOString(),
        scope: {
          label: humanPortfolio ? "Human portfolio / all canonical businesses" : "Assigned canonical businesses",
          mode: humanPortfolio ? "HUMAN_PORTFOLIO" : "ASSIGNED_BUSINESSES",
          user_id: appUserId,
          visible_business_ids: businesses.map((business) => business.business_id)
        },
        totals: {
          active_commanders: activeCommanderRows[0]?.count ?? 0,
          active_soldiers: activeSoldierRows[0]?.count ?? 0,
          businesses: businesses.length,
          financials: [...financials.values()].sort((left, right) => left.currency.localeCompare(right.currency)),
          health_distribution: healthDistribution,
          unresolved_exceptions: businesses.filter((business) => Boolean(business.top_exception)).length
        }
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async getBusinessFull(
    businessId: string,
    session: CanonicalSessionContext
  ): Promise<BusinessFullRecordResponse | null> {
    return withCanonicalSession(this.db, session, async (transaction) => {
      const summaryRows = await this.businessRows(transaction, businessId);
      if (!summaryRows[0]) return null;
      const summary = mapBusiness(summaryRows[0]);

      const [
        overviewRows,
        financialRows,
        missionRows,
        taskRows,
        scheduleRows,
        entityRows,
        toolRows,
        healthRows,
        metricRows,
        outcomeRows,
        experimentRows,
        decisionRows,
        governanceRows,
        auditRows,
        recommendationRows,
        sourceRows,
        versionRows,
        evidenceRows,
        eventRows
      ] = await Promise.all([
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'business_id', b.id,
            'stable_code', b.stable_code,
            'name', b.name,
            'legal_name', b.legal_name,
            'brand_name', b.brand_name,
            'status', b.status,
            'primary_objective', b.primary_objective,
            'currency', b.currency,
            'timezone', b.timezone,
            'metadata', b.metadata,
            'commander', jsonb_build_object('id', commander.id, 'name', commander.name),
            'general', jsonb_build_object('id', general.id, 'name', general.name),
            'marshal', jsonb_build_object('id', marshal.id, 'name', marshal.name),
            'profile', COALESCE(to_jsonb(profile) - 'business_id', '{}'::jsonb),
            'state', COALESCE(to_jsonb(state) - 'business_id', '{}'::jsonb),
            'created_at', b.created_at,
            'updated_at', b.updated_at
          ) AS value
          FROM entral.businesses b
          JOIN entral.entities commander ON commander.id = b.commander_id
          JOIN entral.entities general ON general.id = b.general_id
          JOIN entral.entities marshal ON marshal.id = b.marshal_id
          LEFT JOIN entral.business_profiles profile ON profile.business_id = b.id
          LEFT JOIN entral.business_states state ON state.business_id = b.id
          WHERE b.id = ${businessId}::uuid
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(snapshot) ORDER BY snapshot.period_end DESC, snapshot.observed_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, period_start, period_end, gross_revenue, net_contribution,
              operating_cost, spend, capital_available, currency, source_refs, observed_at
            FROM entral.financial_snapshots
            WHERE business_id = ${businessId}::uuid
            ORDER BY period_end DESC, observed_at DESC
          ) snapshot
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(mission) ORDER BY mission.priority DESC, mission.updated_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, stable_code, objective, owner_entity_id, status, priority, deadline,
              required_outputs, success_criteria, version, created_at, updated_at
            FROM entral.missions
            WHERE business_id = ${businessId}::uuid
            ORDER BY priority DESC, updated_at DESC
          ) mission
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(task) ORDER BY task.priority DESC, task.updated_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, stable_code, mission_id, owner_entity_id, objective, status, priority,
              retry_count, max_retries, deadline, result, version, created_at, updated_at
            FROM entral.tasks
            WHERE business_id = ${businessId}::uuid
            ORDER BY priority DESC, updated_at DESC
          ) task
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(schedule) ORDER BY schedule.updated_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, stable_code, owner_entity_id, cron_expression, event_trigger, timezone,
              status, concurrency_limit, retry_policy, next_run_at, last_run_at, version, updated_at
            FROM entral.schedules
            WHERE business_id = ${businessId}::uuid
            ORDER BY updated_at DESC
          ) schedule
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(entity) ORDER BY
            CASE entity.entity_type WHEN 'COMMANDER' THEN 0 WHEN 'SOLDIER' THEN 1 ELSE 2 END,
            entity.stable_code
          ), '[]'::jsonb) AS value
          FROM (
            SELECT entity_id, stable_code, entity_type, name, status, health, parent_id,
              child_count, assigned_business_id, model_class, compute_tier, current_mission,
              active_task_count, latest_material_result, active_alert, updated_at, version
            FROM entral.v_entity_summary
            WHERE assigned_business_id = ${businessId}::uuid
          ) entity
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(grant_record) ORDER BY grant_record.updated_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT grant_row.id, grant_row.entity_id, tool.id AS tool_id, tool.stable_code,
              tool.name, tool.provider, tool.risk_class, grant_row.allowed_actions,
              grant_row.data_scope, grant_row.spend_limit, grant_row.call_limit,
              grant_row.valid_from, grant_row.expires_at, grant_row.version, grant_row.updated_at
            FROM entral.tool_grants grant_row
            JOIN entral.tool_definitions tool ON tool.id = grant_row.tool_id
            WHERE grant_row.business_id = ${businessId}::uuid
            ORDER BY grant_row.updated_at DESC
          ) grant_record
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(assessment) ORDER BY assessment.computed_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, health_state, health_score, driver_records, evidence_refs,
              source_freshness, confidence, calculation_version, computed_at, expires_at
            FROM entral.health_assessments
            WHERE business_id = ${businessId}::uuid
            ORDER BY computed_at DESC
          ) assessment
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(metric) ORDER BY metric.observed_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT observation.id, definition.stable_code, definition.name, definition.unit,
              definition.value_type, observation.numeric_value, observation.text_value,
              observation.json_value, observation.currency, observation.observed_at,
              observation.confidence
            FROM entral.metric_observations observation
            JOIN entral.metric_definitions definition ON definition.id = observation.metric_definition_id
            WHERE observation.business_id = ${businessId}::uuid
            ORDER BY observation.observed_at DESC
          ) metric
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(outcome) ORDER BY outcome.observed_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, outcome_type, expected, actual, value_delta, evidence_refs,
              attribution_confidence, observed_at
            FROM entral.outcomes
            WHERE business_id = ${businessId}::uuid
            ORDER BY observed_at DESC
          ) outcome
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(experiment) ORDER BY experiment.created_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, stable_code, hypothesis, success_criteria, operating_constraints,
              allocation, status, started_at, completed_at, created_at
            FROM entral.experiments
            WHERE business_id = ${businessId}::uuid
            ORDER BY created_at DESC
          ) experiment
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(decision_record) ORDER BY decision_record.effective_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, decision, rationale, options_considered, evidence_refs, decided_by_kind,
              decided_by_id, recommendation_id, governance_action_id, reversible,
              effective_at, created_at
            FROM entral.decisions
            WHERE business_id = ${businessId}::uuid
            ORDER BY effective_at DESC
          ) decision_record
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(action_record) ORDER BY action_record.requested_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, action_type, status, initiated_by_kind, target_type, target_id,
              requested_outcome, reason, risk_class, confidence, expected_version,
              requested_at, completed_at, version
            FROM entral.governance_actions
            WHERE business_id = ${businessId}::uuid
            ORDER BY requested_at DESC
          ) action_record
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(audit_record) ORDER BY audit_record.sequence_number DESC), '[]'::jsonb) AS value
          FROM (
            SELECT sequence_number, occurred_at, actor_kind, actor_id, action, reason,
              target_type, target_id, result, evidence_refs, correlation_id
            FROM entral.audit_entries
            WHERE business_id = ${businessId}::uuid
            ORDER BY sequence_number DESC
          ) audit_record
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(recommendation) ORDER BY recommendation.created_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, objective, diagnosis, proposed_actions, expected_value, estimated_cost,
              risk_class, confidence, authority_required, rollback_plan, verification_plan,
              evidence_refs, status, created_at, expires_at, completed_at
            FROM entral.recommendations
            WHERE business_id = ${businessId}::uuid
            ORDER BY created_at DESC
          ) recommendation
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(source_record) ORDER BY source_record.ingested_at DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, source_type, provider, external_id, uri, content_sha256, observed_at,
              ingested_at, freshness_expires_at, trust_level, metadata
            FROM entral.source_records
            WHERE business_id = ${businessId}::uuid
            ORDER BY ingested_at DESC
          ) source_record
        `,
        transaction.$queryRaw<BusinessVersionRow[]>`
          SELECT
            version,
            recorded_at AS "changedAt",
            reason
          FROM entral.business_versions
          WHERE business_id = ${businessId}::uuid
          ORDER BY version DESC
        `,
        transaction.$queryRaw<{ evidenceIds: string[] }[]>`
          SELECT COALESCE(
            array_agg(DISTINCT COALESCE(link.artifact_id, link.source_record_id)::text)
              FILTER (WHERE link.artifact_id IS NOT NULL OR link.source_record_id IS NOT NULL),
            ARRAY[]::text[]
          ) AS "evidenceIds"
          FROM entral.evidence_links link
          LEFT JOIN entral.artifacts artifact ON artifact.id = link.artifact_id
          LEFT JOIN entral.source_records source ON source.id = link.source_record_id
          WHERE artifact.business_id = ${businessId}::uuid
             OR source.business_id = ${businessId}::uuid
        `,
        transaction.$queryRaw<{ sequence: bigint | number }[]>`
          SELECT COALESCE(max(sequence_number), 0)::bigint AS sequence
          FROM entral.canonical_events
        `
      ]);

      const eventSequence = Number(eventRows[0]?.sequence ?? 0);
      return {
        business: {
          agents_and_tools: {
            entities: entityRows[0]?.value ?? [],
            tool_grants: toolRows[0]?.value ?? []
          },
          aggregate_version: summary.version,
          decisions_and_changes: {
            audit: auditRows[0]?.value ?? [],
            decisions: decisionRows[0]?.value ?? [],
            governance_actions: governanceRows[0]?.value ?? []
          },
          evidence_ids: evidenceRows[0]?.evidenceIds ?? [],
          external_activity: {
            sources: sourceRows[0]?.value ?? []
          },
          financials: {
            snapshots: financialRows[0]?.value ?? []
          },
          issues_and_recommendations: {
            recommendations: recommendationRows[0]?.value ?? []
          },
          loaded_at: new Date().toISOString(),
          operations: {
            missions: missionRows[0]?.value ?? [],
            schedules: scheduleRows[0]?.value ?? [],
            tasks: taskRows[0]?.value ?? []
          },
          overview: overviewRows[0]?.value ?? {},
          performance: {
            experiments: experimentRows[0]?.value ?? [],
            health_assessments: healthRows[0]?.value ?? [],
            metrics: metricRows[0]?.value ?? [],
            outcomes: outcomeRows[0]?.value ?? []
          },
          summary,
          version_history: versionRows.map((version) => ({
            changed_at: version.changedAt.toISOString(),
            reason: version.reason,
            version: Number(version.version)
          }))
        },
        event_sequence: eventSequence
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async getEntityFull(
    entityId: string,
    session: CanonicalSessionContext
  ): Promise<{ entity: EntityFullRecord; event_sequence: number } | null> {
    return withCanonicalSession(this.db, session, async (transaction) => {
      const summaryRows = await this.hierarchyRows(transaction, entityId);
      if (!summaryRows[0]) return null;
      const summary = mapEntity(summaryRows[0]);

      const [
        configurationRows,
        runtimeRows,
        authorityRows,
        operationsRows,
        economicsRows,
        reliabilityRows,
        auditRows,
        evidenceRows,
        connectionsRows,
        versionRows,
        eventRows
      ] = await Promise.all([
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'definition', entity.definition,
            'configuration', entity.configuration,
            'source_version', entity.source_version,
            'taxonomy_version_id', entity.taxonomy_version_id,
            'created_at', entity.created_at,
            'updated_at', entity.updated_at,
            'retired_at', entity.retired_at
          ) AS value
          FROM entral.entities entity
          WHERE entity.id = ${entityId}::uuid
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'missions', COALESCE((
              SELECT jsonb_agg(to_jsonb(mission) ORDER BY mission.priority DESC, mission.updated_at DESC)
              FROM (
                SELECT id, stable_code, objective, status, priority, deadline, version, updated_at
                FROM entral.missions
                WHERE owner_entity_id = ${entityId}::uuid
                ORDER BY priority DESC, updated_at DESC
              ) mission
            ), '[]'::jsonb),
            'tasks', COALESCE((
              SELECT jsonb_agg(to_jsonb(task) ORDER BY task.priority DESC, task.updated_at DESC)
              FROM (
                SELECT id, stable_code, mission_id, objective, status, priority, retry_count,
                  max_retries, deadline, result, version, updated_at
                FROM entral.tasks
                WHERE owner_entity_id = ${entityId}::uuid
                ORDER BY priority DESC, updated_at DESC
              ) task
            ), '[]'::jsonb),
            'schedules', COALESCE((
              SELECT jsonb_agg(to_jsonb(schedule) ORDER BY schedule.updated_at DESC)
              FROM (
                SELECT id, stable_code, cron_expression, event_trigger, timezone, status,
                  concurrency_limit, retry_policy, next_run_at, last_run_at, version, updated_at
                FROM entral.schedules
                WHERE owner_entity_id = ${entityId}::uuid
                ORDER BY updated_at DESC
              ) schedule
            ), '[]'::jsonb)
          ) AS value
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'model_profile', CASE WHEN model.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', model.id,
              'stable_code', model.stable_code,
              'provider', model.provider,
              'model_name', model.model_name,
              'model_version', model.model_version,
              'compute_tier', model.compute_tier,
              'context_limit_tokens', model.context_limit_tokens,
              'configuration', model.configuration,
              'is_active', model.is_active
            ) END,
            'authority_profile', CASE WHEN authority.id IS NULL THEN NULL ELSE jsonb_build_object(
              'id', authority.id,
              'stable_code', authority.stable_code,
              'name', authority.name,
              'allowed_action_types', authority.allowed_action_types,
              'allowed_tool_risk', authority.allowed_tool_risk,
              'max_single_action_cost', authority.max_single_action_cost,
              'max_daily_cost', authority.max_daily_cost,
              'confidence_floor', authority.confidence_floor,
              'requires_human_for', authority.requires_human_for,
              'constraints', authority.constraints,
              'is_active', authority.is_active
            ) END,
            'tool_grants', COALESCE((
              SELECT jsonb_agg(to_jsonb(grant_record) ORDER BY grant_record.updated_at DESC)
              FROM (
                SELECT grant_row.id, tool.stable_code, tool.name, tool.provider, tool.risk_class,
                  grant_row.allowed_actions, grant_row.data_scope, grant_row.spend_limit,
                  grant_row.call_limit, grant_row.valid_from, grant_row.expires_at,
                  grant_row.version, grant_row.updated_at
                FROM entral.tool_grants grant_row
                JOIN entral.tool_definitions tool ON tool.id = grant_row.tool_id
                WHERE grant_row.entity_id = ${entityId}::uuid
                ORDER BY grant_row.updated_at DESC
              ) grant_record
            ), '[]'::jsonb)
          ) AS value
          FROM entral.entities entity
          LEFT JOIN entral.model_profiles model ON model.id = entity.model_profile_id
          LEFT JOIN entral.authority_profiles authority ON authority.id = entity.authority_profile_id
          WHERE entity.id = ${entityId}::uuid
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'messages', COALESCE(jsonb_agg(to_jsonb(message_record) ORDER BY message_record.created_at DESC)
              FILTER (WHERE message_record.id IS NOT NULL), '[]'::jsonb)
          ) AS value
          FROM (
            SELECT id, message_type, status, sender_entity_id, recipient_entity_id, mission_id,
              payload, route_valid, route_error, created_at, delivered_at, acknowledged_at
            FROM entral.operational_messages
            WHERE sender_entity_id = ${entityId}::uuid OR recipient_entity_id = ${entityId}::uuid
            ORDER BY created_at DESC
          ) message_record
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'costs', COALESCE((
              SELECT jsonb_agg(to_jsonb(cost_record) ORDER BY cost_record.incurred_at DESC)
              FROM (
                SELECT id, cost_type, amount, currency, quantity, unit, provider, incurred_at, metadata
                FROM entral.cost_records
                WHERE entity_id = ${entityId}::uuid
                ORDER BY incurred_at DESC
              ) cost_record
            ), '[]'::jsonb),
            'resource_usage', COALESCE((
              SELECT jsonb_agg(to_jsonb(usage_record) ORDER BY usage_record.period_end DESC)
              FROM (
                SELECT id, resource_type, quantity, unit, period_start, period_end, metadata
                FROM entral.resource_usage
                WHERE entity_id = ${entityId}::uuid
                ORDER BY period_end DESC
              ) usage_record
            ), '[]'::jsonb)
          ) AS value
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'health_assessments', COALESCE(jsonb_agg(to_jsonb(assessment) ORDER BY assessment.computed_at DESC)
              FILTER (WHERE assessment.id IS NOT NULL), '[]'::jsonb)
          ) AS value
          FROM (
            SELECT id, health_state, health_score, driver_records, evidence_refs,
              source_freshness, confidence, calculation_version, computed_at, expires_at
            FROM entral.health_assessments
            WHERE scope_type = 'ENTITY' AND scope_id = ${entityId}::uuid
            ORDER BY computed_at DESC
          ) assessment
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT COALESCE(jsonb_agg(to_jsonb(audit_record) ORDER BY audit_record.sequence_number DESC), '[]'::jsonb) AS value
          FROM (
            SELECT id, sequence_number, occurred_at, actor_kind, actor_id, action, reason,
              target_type, target_id, result, evidence_refs, correlation_id
            FROM entral.audit_entries
            WHERE entity_id = ${entityId}::uuid OR target_id = ${entityId}::uuid
            ORDER BY sequence_number DESC
          ) audit_record
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'audit_evidence_refs', COALESCE((
              SELECT jsonb_agg(DISTINCT evidence_ref)
              FROM entral.audit_entries entry,
                LATERAL jsonb_array_elements(entry.evidence_refs) evidence_ref
              WHERE entry.entity_id = ${entityId}::uuid OR entry.target_id = ${entityId}::uuid
            ), '[]'::jsonb),
            'health_evidence_refs', COALESCE((
              SELECT jsonb_agg(DISTINCT evidence_ref)
              FROM entral.health_assessments assessment,
                LATERAL jsonb_array_elements(assessment.evidence_refs) evidence_ref
              WHERE assessment.scope_type = 'ENTITY' AND assessment.scope_id = ${entityId}::uuid
            ), '[]'::jsonb)
          ) AS value
        `,
        transaction.$queryRaw<JsonRow[]>`
          SELECT jsonb_build_object(
            'parent', CASE WHEN parent.id IS NULL THEN NULL ELSE jsonb_build_object(
              'entity_id', parent.id, 'stable_code', parent.stable_code, 'name', parent.name,
              'entity_type', parent.role, 'version', parent.version
            ) END,
            'children', COALESCE((
              SELECT jsonb_agg(jsonb_build_object(
                'entity_id', child.id, 'stable_code', child.stable_code, 'name', child.name,
                'entity_type', child.role, 'status', child.status, 'version', child.version
              ) ORDER BY child.stable_code)
              FROM entral.entities child
              WHERE child.parent_id = entity.id AND child.status <> 'RETIRED'
            ), '[]'::jsonb),
            'business', CASE WHEN business.id IS NULL THEN NULL ELSE jsonb_build_object(
              'business_id', business.id, 'stable_code', business.stable_code,
              'name', business.name, 'status', business.status, 'version', business.version
            ) END
          ) AS value
          FROM entral.entities entity
          LEFT JOIN entral.entities parent ON parent.id = entity.parent_id
          LEFT JOIN entral.businesses business ON business.id = entity.business_id
          WHERE entity.id = ${entityId}::uuid
        `,
        transaction.$queryRaw<EntityVersionRow[]>`
          SELECT version, recorded_at AS "changedAt", reason
          FROM entral.entity_versions
          WHERE entity_id = ${entityId}::uuid
          ORDER BY version DESC
        `,
        transaction.$queryRaw<{ sequence: bigint | number }[]>`
          SELECT COALESCE(max(sequence_number), 0)::bigint AS sequence
          FROM entral.canonical_events
        `
      ]);

      const eventSequence = Number(eventRows[0]?.sequence ?? 0);
      return {
        entity: {
          aggregate_version: summary.version,
          audit: auditRows[0]?.value ?? [],
          authority: authorityRows[0]?.value ?? {},
          configuration: configurationRows[0]?.value ?? {},
          connections: connectionsRows[0]?.value ?? {},
          economics: economicsRows[0]?.value ?? {},
          evidence: evidenceRows[0]?.value ?? {},
          loaded_at: new Date().toISOString(),
          operations: operationsRows[0]?.value ?? {},
          reliability: reliabilityRows[0]?.value ?? {},
          runtime: runtimeRows[0]?.value ?? {},
          summary,
          version_history: versionRows.map((version) => ({
            changed_at: version.changedAt.toISOString(),
            reason: version.reason,
            version: Number(version.version)
          }))
        },
        event_sequence: eventSequence
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async getEntralConversation(
    businessId: string | null,
    session: CanonicalSessionContext
  ): Promise<CanonicalEntralConversationResponse> {
    return withCanonicalSession(this.db, session, async (transaction, appUserId) => {
      const [messageRows, eventRows] = await Promise.all([
        transaction.$queryRaw<EntralConversationRow[]>`
          WITH scoped_messages AS (
            SELECT
              message.id,
              message.message_type,
              message.status,
              message.payload,
              message.evidence_refs,
              message.created_at,
              message.delivered_at,
              message.acknowledged_at,
              CASE
                WHEN message.sender_user_id = ${appUserId}::uuid THEN 'HUMAN_TO_ENTRAL'
                ELSE 'ENTRAL_TO_HUMAN'
              END AS direction,
              COALESCE(
                sender.business_id,
                recipient.business_id,
                task.business_id,
                mission.business_id
              ) AS business_id,
              COALESCE(
                CASE WHEN sender.role = 'ENTRAL' THEN sender.id END,
                CASE WHEN recipient.role = 'ENTRAL' THEN recipient.id END
              ) AS entral_entity_id
            FROM entral.operational_messages message
            LEFT JOIN entral.entities sender ON sender.id = message.sender_entity_id
            LEFT JOIN entral.entities recipient ON recipient.id = message.recipient_entity_id
            LEFT JOIN entral.tasks task ON task.id = message.task_id
            LEFT JOIN entral.missions mission ON mission.id = message.mission_id
            WHERE (
              (
                message.sender_user_id = ${appUserId}::uuid
                AND recipient.role = 'ENTRAL'
              )
              OR (
                message.recipient_user_id = ${appUserId}::uuid
                AND sender.role = 'ENTRAL'
              )
            )
              AND (
                message.mission_id IS NULL
                OR entral.can_access_mission(message.mission_id, 'read')
              )
              AND (
                message.task_id IS NULL
                OR entral.can_access_task(message.task_id, 'read')
              )
          )
          SELECT
            message.id AS "messageId",
            event.id AS "eventId",
            event.sequence_number AS "eventSequence",
            message.message_type::text AS "messageType",
            message.status::text AS status,
            message.direction AS direction,
            COALESCE(
              NULLIF(message.payload->>'content', ''),
              NULLIF(message.payload->>'message', ''),
              message.payload::text
            ) AS content,
            message.evidence_refs AS "evidenceRefs",
            message.business_id AS "businessId",
            message.entral_entity_id AS "entralEntityId",
            message.created_at AS "createdAt",
            message.delivered_at AS "deliveredAt",
            message.acknowledged_at AS "acknowledgedAt"
          FROM scoped_messages message
          LEFT JOIN LATERAL (
            SELECT canonical.id, canonical.sequence_number
            FROM entral.canonical_events canonical
            WHERE canonical.aggregate_type = 'OPERATIONAL_MESSAGES'
              AND canonical.aggregate_id = message.id
            ORDER BY canonical.sequence_number DESC
            LIMIT 1
          ) event ON true
          WHERE (${businessId}::uuid IS NULL OR message.business_id = ${businessId}::uuid)
            AND (
              message.business_id IS NULL
              OR entral.can_access_business(message.business_id, 'read')
            )
          ORDER BY message.created_at, message.id
        `,
        transaction.$queryRaw<{ sequence: bigint | number }[]>`
          SELECT COALESCE(max(sequence_number), 0)::bigint AS sequence
          FROM entral.canonical_events
        `
      ]);
      return {
        event_sequence: Number(eventRows[0]?.sequence ?? 0),
        generated_at: new Date().toISOString(),
        messages: messageRows.map((message) => ({
          acknowledged_at: message.acknowledgedAt?.toISOString() ?? null,
          business_id: message.businessId,
          content: message.content,
          created_at: message.createdAt.toISOString(),
          delivered_at: message.deliveredAt?.toISOString() ?? null,
          direction: message.direction,
          entral_entity_id: message.entralEntityId,
          event_id: message.eventId,
          event_sequence: message.eventSequence === null ? null : Number(message.eventSequence),
          evidence_refs: evidenceReferenceArray(message.evidenceRefs),
          message_id: message.messageId,
          message_type: message.messageType,
          status: message.status
        }))
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  }

  async listPortfolioEvents(
    afterSequence: number,
    session: CanonicalSessionContext
  ): Promise<CanonicalPortfolioEventsResponse> {
    return withCanonicalSession(this.db, session, async (transaction) => {
      const rows = await transaction.$queryRaw<PortfolioEventRow[]>`
        SELECT
          id AS "eventId",
          sequence_number AS "sequenceNumber",
          event_type AS "eventType",
          aggregate_type AS "aggregateType",
          aggregate_id AS "aggregateId",
          aggregate_version AS "aggregateVersion",
          business_id AS "businessId",
          occurred_at AS "occurredAt"
        FROM entral.canonical_events
        WHERE sequence_number > ${afterSequence}
        ORDER BY sequence_number
        LIMIT 200
      `;
      return {
        events: rows.map((event) => ({
          aggregate_id: event.aggregateId,
          aggregate_type: event.aggregateType,
          aggregate_version: event.aggregateVersion === null ? null : Number(event.aggregateVersion),
          business_id: event.businessId,
          event_id: event.eventId,
          event_type: event.eventType,
          occurred_at: event.occurredAt.toISOString(),
          sequence_number: Number(event.sequenceNumber)
        })),
        next_sequence: rows.length
          ? Number(rows[rows.length - 1]!.sequenceNumber)
          : afterSequence
      };
    });
  }

  async createGovernanceAction(
    request: GovernanceActionRequest,
    context: CanonicalOperationContext
  ): Promise<GovernanceActionRecord> {
    assertGovernanceActionRequest(request);
    const hash = requestHash(request);

    return withCanonicalSession(this.db, context.databaseSession, async (tx, appUserId) => {
      const scopeId = request.scope.scope_type === "SYSTEM" ? null : request.scope.scope_id;
      const claimed = await tx.$queryRaw<{ key: string }[]>`
        INSERT INTO entral.idempotency_keys (
          key, operation, scope_type, scope_id, request_sha256, status, locked_until
        )
        VALUES (
          ${request.idempotency_key},
          'governance.action.create',
          ${request.scope.scope_type}::entral.scope_type,
          ${scopeId}::uuid,
          ${hash},
          'IN_PROGRESS',
          CURRENT_TIMESTAMP + INTERVAL '2 minutes'
        )
        ON CONFLICT (key) DO NOTHING
        RETURNING key
      `;

      if (!claimed[0]) {
        const existingKeys = await tx.$queryRaw<IdempotencyRow[]>`
          SELECT
            request_sha256 AS "requestHash",
            response,
            status
          FROM entral.idempotency_keys
          WHERE key = ${request.idempotency_key}
          FOR UPDATE
        `;
        const existingKey = existingKeys[0];
        if (!existingKey || existingKey.requestHash !== hash) {
          throw new CanonicalControlPlaneError(
            "IDEMPOTENCY_KEY_REUSED",
            "The idempotency key was already used for a different request.",
            409
          );
        }
        if (existingKey.status === "SUCCEEDED" && existingKey.response?.actionId) {
          const replayed = await findGovernanceAction(tx, existingKey.response.actionId);
          if (replayed) return publicGovernanceAction(replayed);
        }
        throw new CanonicalControlPlaneError(
          "IDEMPOTENCY_IN_PROGRESS",
          "The idempotent request is already in progress.",
          409
        );
      }

      if (request.actor_type === "HUMAN") {
        if (request.actor_id !== appUserId) {
          throw new CanonicalControlPlaneError(
            "ACTOR_SESSION_MISMATCH",
            "The governance actor does not match the bound database session.",
            403
          );
        }
        const actorRows = await tx.$queryRaw<{ email: string }[]>`
          SELECT email
          FROM entral.app_users
          WHERE id = ${request.actor_id}::uuid
            AND is_human_authority
            AND is_active
          FOR SHARE
        `;
        const actor = actorRows[0];
        if (
          !actor
          || (
            context.authenticatedHumanEmail
            && actor.email.toLocaleLowerCase() !== context.authenticatedHumanEmail.toLocaleLowerCase()
          )
        ) {
          throw new CanonicalControlPlaneError(
            "HUMAN_AUTHORITY_REQUIRED",
            "The authenticated user does not hold the referenced Human authority.",
            403
          );
        }
      } else {
        const actorRows = await tx.$queryRaw<{ id: string }[]>`
          SELECT id
          FROM entral.entities
          WHERE id = ${request.actor_id}::uuid
            AND role = 'ENTRAL'
            AND status <> 'RETIRED'
          FOR SHARE
        `;
        if (!actorRows[0]) {
          throw new CanonicalControlPlaneError(
            "ENTRAL_AUTHORITY_REQUIRED",
            "The referenced actor is not the active ENTRAL entity.",
            403
          );
        }
      }

      const target = await targetVersion(tx, request.target_type, request.target_id);
      const actualVersion = Number(target.version);
      if (actualVersion !== request.expected_version) {
        throw new CanonicalControlPlaneError(
          "STALE_EXPECTED_VERSION",
          `Expected target version ${request.expected_version}, but found ${actualVersion}.`,
          409
        );
      }
      if (target.businessId !== request.business_id) {
        throw new CanonicalControlPlaneError(
          "BUSINESS_SCOPE_MISMATCH",
          "The governance action business scope does not match its target.",
          409
        );
      }

      const initiatedByKind = request.actor_type === "HUMAN" ? "HUMAN" : "ENTITY";
      const initiatedByUserId = request.actor_type === "HUMAN" ? request.actor_id : null;
      const initiatedByEntityId = request.actor_type === "ENTRAL" ? request.actor_id : null;
      const authorityBasis = canonicalJson(request.authority_basis);
      const proposedChanges = canonicalJson(request.proposed_changes);
      const rollbackPlan = canonicalJson(request.rollback_plan);
      const verificationPlan = canonicalJson(request.verification_plan);

      await tx.$executeRaw`
        INSERT INTO entral.governance_actions (
          id,
          action_type,
          initiated_by_kind,
          initiated_by_user_id,
          initiated_by_entity_id,
          target_type,
          target_id,
          business_id,
          requested_outcome,
          reason,
          authority_basis,
          risk_class,
          confidence,
          proposed_changes,
          expected_version,
          rollback_plan,
          verification_plan,
          idempotency_key,
          requested_at
        )
        VALUES (
          ${request.action_id}::uuid,
          ${request.action_type}::entral.governance_action_type,
          ${initiatedByKind}::entral.actor_kind,
          ${initiatedByUserId}::uuid,
          ${initiatedByEntityId}::uuid,
          ${request.target_type},
          ${request.target_id}::uuid,
          ${request.business_id}::uuid,
          ${request.requested_outcome},
          ${request.reason},
          ${authorityBasis}::jsonb,
          ${request.risk_class}::entral.risk_class,
          ${request.confidence ?? null},
          ${proposedChanges}::jsonb,
          ${request.expected_version},
          ${rollbackPlan}::jsonb,
          ${verificationPlan}::jsonb,
          ${request.idempotency_key},
          ${new Date(request.requested_at)}
        )
      `;

      await tx.$executeRaw`
        UPDATE entral.idempotency_keys
        SET
          status = 'SUCCEEDED',
          response = jsonb_build_object('actionId', ${request.action_id}::text),
          completed_at = CURRENT_TIMESTAMP,
          locked_until = NULL
        WHERE key = ${request.idempotency_key}
      `;

      const created = await findGovernanceAction(tx, request.action_id);
      if (!created) {
        throw new CanonicalControlPlaneError(
          "ACTION_NOT_PERSISTED",
          "The governance action could not be read after creation.",
          500
        );
      }
      return publicGovernanceAction(created);
    });
  }

  async updateEntityStatus(
    entityId: string,
    status: EntityStatus,
    expectedVersion: number,
    session: CanonicalSessionContext
  ): Promise<{ entityId: string; status: EntityStatus; version: number }> {
    return withCanonicalSession(this.db, session, async (transaction) => {
      const updated = await transaction.$queryRaw<{
        entityId: string;
        status: EntityStatus;
        version: number;
      }[]>`
        UPDATE entral.entities
        SET
          status = ${status}::entral.entity_status,
          retired_at = CASE
            WHEN ${status}::entral.entity_status = 'RETIRED' THEN COALESCE(retired_at, CURRENT_TIMESTAMP)
            ELSE NULL
          END
        WHERE id = ${entityId}::uuid
          AND version = ${expectedVersion}
        RETURNING
          id AS "entityId",
          status::text AS status,
          version::integer AS version
      `;
      if (updated[0]) return updated[0];

      const current = await transaction.$queryRaw<{ version: number }[]>`
        SELECT version::integer AS version
        FROM entral.entities
        WHERE id = ${entityId}::uuid
      `;
      if (!current[0]) {
        throw new CanonicalControlPlaneError("ENTITY_NOT_FOUND", "Entity not found.", 404);
      }
      throw new CanonicalControlPlaneError(
        "STALE_EXPECTED_VERSION",
        `Expected entity version ${expectedVersion}, but found ${current[0].version}.`,
        409
      );
    });
  }
}

export const canonicalControlPlaneRepository = new CanonicalControlPlaneRepository();
