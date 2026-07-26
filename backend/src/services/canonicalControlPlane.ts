import { createHash } from "node:crypto";
import {
  assertGovernanceActionRequest,
  type BusinessSummary,
  type EntityStatus,
  type EntitySummary,
  type GovernanceActionRequest,
  type GovernanceTargetType,
  type JsonValue
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

  async listHierarchy(session: CanonicalSessionContext): Promise<EntitySummary[]> {
    return withCanonicalSession(this.db, session, async (transaction) => {
      const rows = await transaction.$queryRaw<RawEntitySummary[]>`
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
        ORDER BY
          CASE entity_type
            WHEN 'ENTRAL' THEN 0
            WHEN 'MARSHAL' THEN 1
            WHEN 'GENERAL' THEN 2
            WHEN 'COMMANDER' THEN 3
            WHEN 'SOLDIER' THEN 4
          END,
          stable_code
      `;
      return rows.map(mapEntity);
    });
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
