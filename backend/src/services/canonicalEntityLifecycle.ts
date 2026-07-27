import { createHash, randomUUID } from "node:crypto";
import {
  assertEntityLifecycleActionResult,
  assertEntityLifecycleActionRequest,
  type EntityLifecycleActionRequest,
  type EntityLifecycleActionResult,
  type EntityRole,
  type EntityStatus,
  type JsonValue
} from "@entral/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  prisma,
  withCanonicalSession,
  type CanonicalSessionContext
} from "../db.js";
import { CanonicalControlPlaneError } from "./canonicalControlPlane.js";

type LifecycleEntityRow = {
  businessId: string | null;
  entityId: string;
  entityRole: EntityRole;
  name: string;
  parentId: string | null;
  snapshot: JsonValue;
  status: EntityStatus;
  version: bigint | number;
};

type LifecycleActionRow = {
  actionId: string;
  actionType: "PAUSE" | "RESUME";
  afterState: JsonValue;
  beforeState: JsonValue;
  businessId: string | null;
  completedAt: Date;
  expectedVersion: bigint | number;
  idempotencyKey: string;
  requestedAt: Date;
  restorationOfActionId: string | null;
  status: string;
  targetId: string;
};

type LifecycleEventRow = {
  aggregateVersion: bigint | number;
  eventId: string;
  sequenceNumber: bigint | number;
};

type LifecycleVerificationRow = {
  checkedAt: Date;
  expectedState: JsonValue;
  observedState: JsonValue;
  status: string;
  verificationId: string;
};

type LifecycleReceiptCountRow = {
  auditCount: bigint | number;
  eventCount: bigint | number;
  outboxCount: bigint | number;
};

type IdempotencyRow = {
  requestHash: string;
  response: { actionId?: string } | null;
  status: string;
};

type RestorationRow = {
  actionId: string;
  actionType: "PAUSE" | "RESUME";
  afterState: JsonValue;
  businessId: string | null;
  status: string;
  targetId: string;
};

export type CanonicalEntityLifecycleContext = {
  authenticatedHumanEmail?: string;
  databaseSession: CanonicalSessionContext;
};

function canonicalJson(value: unknown): string {
  if (value === undefined) {
    return "null";
  }
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
  return `{${entries.join(",")}}`;
}

function requestHash(request: EntityLifecycleActionRequest) {
  return createHash("sha256").update(canonicalJson(request)).digest("hex");
}

function jsonRecord(value: JsonValue, field: string): Readonly<Record<string, JsonValue>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CanonicalControlPlaneError(
      "LIFECYCLE_RECEIPT_INVALID",
      `${field} is not a canonical object.`,
      500
    );
  }
  return value;
}

function stringField(record: Readonly<Record<string, JsonValue>>, field: string) {
  const value = record[field];
  if (typeof value !== "string") {
    throw new CanonicalControlPlaneError(
      "LIFECYCLE_RECEIPT_INVALID",
      `${field} is missing from the canonical lifecycle receipt.`,
      500
    );
  }
  return value;
}

function numberField(record: Readonly<Record<string, JsonValue>>, field: string) {
  const value = record[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new CanonicalControlPlaneError(
      "LIFECYCLE_RECEIPT_INVALID",
      `${field} is missing from the canonical lifecycle receipt.`,
      500
    );
  }
  return value;
}

async function completedLifecycleResult(
  tx: Prisma.TransactionClient,
  actionId: string,
  idempotentReplay: boolean
): Promise<EntityLifecycleActionResult> {
  const actions = await tx.$queryRaw<LifecycleActionRow[]>`
    SELECT
      id AS "actionId",
      action_type::text AS "actionType",
      status::text AS status,
      target_id AS "targetId",
      business_id AS "businessId",
      expected_version AS "expectedVersion",
      before_state AS "beforeState",
      after_state AS "afterState",
      idempotency_key AS "idempotencyKey",
      requested_at AS "requestedAt",
      completed_at AS "completedAt",
      causation_id AS "restorationOfActionId"
    FROM entral.governance_actions
    WHERE id = ${actionId}::uuid
  `;
  const action = actions[0];
  if (
    !action
    || (action.status !== "SUCCEEDED" && action.status !== "ROLLED_BACK")
    || !action.completedAt
  ) {
    throw new CanonicalControlPlaneError(
      "LIFECYCLE_ACTION_NOT_COMPLETE",
      "The lifecycle action does not have a verified completion receipt.",
      409
    );
  }

  const [entities, events, audits, verifications, messages] = await Promise.all([
    tx.$queryRaw<LifecycleEntityRow[]>`
      SELECT
        entity.id AS "entityId",
        entity.role::text AS "entityRole",
        entity.name,
        entity.parent_id AS "parentId",
        entity.business_id AS "businessId",
        entity.status::text AS status,
        entity.version,
        to_jsonb(entity) AS snapshot
      FROM entral.entities entity
      WHERE entity.id = ${action.targetId}::uuid
    `,
    tx.$queryRaw<LifecycleEventRow[]>`
      SELECT
        id AS "eventId",
        aggregate_version AS "aggregateVersion",
        sequence_number AS "sequenceNumber"
      FROM entral.canonical_events
      WHERE governance_action_id = ${actionId}::uuid
        AND aggregate_type = 'ENTITIES'
        AND aggregate_id = ${action.targetId}::uuid
        AND event_type = 'entities.update'
      ORDER BY sequence_number DESC
      LIMIT 1
    `,
    tx.$queryRaw<{ auditId: string }[]>`
      SELECT id AS "auditId"
      FROM entral.audit_entries
      WHERE governance_action_id = ${actionId}::uuid
        AND target_type IN ('ENTITIES', 'GOVERNANCE_ACTIONS', 'VERIFICATION_RESULTS', 'OPERATIONAL_MESSAGES')
      ORDER BY sequence_number
    `,
    tx.$queryRaw<LifecycleVerificationRow[]>`
      SELECT
        verification.id AS "verificationId",
        verification.status::text AS status,
        verification.observed_state AS "observedState",
        verification.expected_state AS "expectedState",
        verification.completed_at AS "checkedAt"
      FROM entral.governance_actions action
      JOIN entral.verification_results verification
        ON verification.id = action.verification_result_id
      WHERE action.id = ${actionId}::uuid
    `,
    tx.$queryRaw<{ messageId: string }[]>`
      SELECT id AS "messageId"
      FROM entral.operational_messages
      WHERE payload->>'governance_action_id' = ${actionId}
        AND message_type = 'CompletionReport'
      ORDER BY created_at DESC
      LIMIT 1
    `
  ]);
  const entity = entities[0];
  const event = events[0];
  const verification = verifications[0];
  const message = messages[0];
  if (!entity || !event || !verification || verification.status !== "PASSED" || !message || audits.length === 0) {
    throw new CanonicalControlPlaneError(
      "LIFECYCLE_RECEIPT_INCOMPLETE",
      "The lifecycle action is missing canonical readback, event, audit, verification, or conversation evidence.",
      500
    );
  }
  if (entity.entityRole === "ENTRAL") {
    throw new CanonicalControlPlaneError(
      "INVALID_LIFECYCLE_TARGET_ROLE",
      "ENTRAL cannot be a pause or resume target.",
      500
    );
  }

  const before = jsonRecord(action.beforeState, "before_state");
  const after = jsonRecord(action.afterState, "after_state");
  const observed = jsonRecord(verification.observedState, "verification.observed_state");
  const expected = jsonRecord(verification.expectedState, "verification.expected_state");
  const beforeStatus = stringField(before, "status") as EntityStatus;
  const beforeVersion = numberField(before, "version");
  const afterStatus = stringField(after, "status") as "ACTIVE" | "PAUSED";
  const afterVersion = numberField(after, "version");
  const expectedStatus = stringField(expected, "status") as "ACTIVE" | "PAUSED";
  const expectedReadbackVersion = numberField(expected, "version");
  const observedStatus = stringField(observed, "status") as "ACTIVE" | "PAUSED";
  const observedVersion = numberField(observed, "version");
  const descendantsAffected = numberField(observed, "descendants_affected");
  const newWorkLeasing = stringField(observed, "new_work_leasing") as "BLOCKED" | "ELIGIBLE";

  const result: EntityLifecycleActionResult = {
    action_id: action.actionId,
    action_type: action.actionType,
    after: {
      status: afterStatus,
      version: afterVersion
    },
    audit_entry_ids: audits.map(({ auditId }) => auditId),
    before: {
      status: beforeStatus,
      version: beforeVersion
    },
    canonical_event: {
      aggregate_version: Number(event.aggregateVersion),
      event_id: event.eventId,
      sequence_number: Number(event.sequenceNumber)
    },
    completed_at: action.completedAt.toISOString(),
    containment: {
      descendants_affected: descendantsAffected,
      new_work_leasing: newWorkLeasing,
      policy: "FINISH_IN_FLIGHT"
    },
    conversation_message_id: message.messageId,
    idempotency_key: action.idempotencyKey,
    idempotent_replay: idempotentReplay,
    requested_at: action.requestedAt.toISOString(),
    restoration_of_action_id: action.restorationOfActionId,
    rollback: {
      action_type: action.actionType === "PAUSE" ? "RESUME" : "PAUSE",
      available: true,
      expected_version: afterVersion,
      restores_action_id: action.actionId
    },
    status: "SUCCEEDED",
    target: {
      business_id: entity.businessId,
      entity_id: entity.entityId,
      entity_role: entity.entityRole,
      status: afterStatus,
      version: afterVersion
    },
    verification: {
      checked_at: verification.checkedAt.toISOString(),
      expected_status: expectedStatus,
      expected_version: expectedReadbackVersion,
      observed_status: observedStatus,
      observed_version: observedVersion,
      passed: true,
      verification_id: verification.verificationId
    }
  };
  assertEntityLifecycleActionResult(result);
  return result;
}

async function validateActor(
  tx: Prisma.TransactionClient,
  appUserId: string,
  request: EntityLifecycleActionRequest,
  context: CanonicalEntityLifecycleContext
) {
  if (request.actor_type === "HUMAN") {
    if (request.actor_id !== appUserId) {
      throw new CanonicalControlPlaneError(
        "ACTOR_SESSION_MISMATCH",
        "The lifecycle actor does not match the bound database session.",
        403
      );
    }
    const actors = await tx.$queryRaw<{ email: string }[]>`
      SELECT email
      FROM entral.app_users
      WHERE id = ${request.actor_id}::uuid
        AND is_human_authority
        AND is_active
      FOR SHARE
    `;
    const actor = actors[0];
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
    return;
  }

  const actors = await tx.$queryRaw<{ id: string }[]>`
    SELECT id
    FROM entral.entities
    WHERE id = ${request.actor_id}::uuid
      AND role = 'ENTRAL'
      AND status = 'ACTIVE'
    FOR SHARE
  `;
  if (!actors[0]) {
    throw new CanonicalControlPlaneError(
      "ENTRAL_AUTHORITY_REQUIRED",
      "The referenced actor is not the active ENTRAL entity.",
      403
    );
  }
}

function assertTargetScope(
  request: EntityLifecycleActionRequest,
  entity: LifecycleEntityRow,
  appUserId: string
) {
  if (request.business_id !== entity.businessId) {
    throw new CanonicalControlPlaneError(
      "BUSINESS_SCOPE_MISMATCH",
      "The lifecycle action business scope does not match the entity.",
      409
    );
  }
  if (request.scope.entity_id !== entity.entityId) {
    throw new CanonicalControlPlaneError(
      "ENTITY_SCOPE_MISMATCH",
      "The lifecycle action scope does not identify its entity target.",
      409
    );
  }
  if (entity.businessId) {
    if (
      request.scope.scope_type !== "BUSINESS"
      || request.scope.scope_id !== entity.businessId
      || request.scope.business_id !== entity.businessId
    ) {
      throw new CanonicalControlPlaneError(
        "BUSINESS_SCOPE_MISMATCH",
        "A business-bound entity requires its exact active business scope.",
        409
      );
    }
    return;
  }
  const validUnboundScope = (
    request.scope.scope_type === "USER"
    && request.scope.scope_id === appUserId
  ) || (
    request.scope.scope_type === "ENTITY"
    && request.scope.scope_id === entity.entityId
  );
  if (!validUnboundScope) {
    throw new CanonicalControlPlaneError(
      "ENTITY_SCOPE_MISMATCH",
      "A portfolio entity requires the current user or exact entity scope.",
      409
    );
  }
}

async function validateRestoration(
  tx: Prisma.TransactionClient,
  request: EntityLifecycleActionRequest,
  entity: LifecycleEntityRow
) {
  if (!request.restores_action_id) return;
  const rows = await tx.$queryRaw<RestorationRow[]>`
    SELECT
      id AS "actionId",
      action_type::text AS "actionType",
      status::text AS status,
      target_id AS "targetId",
      business_id AS "businessId",
      after_state AS "afterState"
    FROM entral.governance_actions
    WHERE id = ${request.restores_action_id}::uuid
    FOR UPDATE
  `;
  const restored = rows[0];
  const expectedPriorAction = request.action_type === "PAUSE" ? "RESUME" : "PAUSE";
  if (
    !restored
    || restored.status !== "SUCCEEDED"
    || restored.actionType !== expectedPriorAction
    || restored.targetId !== entity.entityId
    || restored.businessId !== entity.businessId
  ) {
    throw new CanonicalControlPlaneError(
      "INVALID_RESTORATION_ACTION",
      "The referenced action is not a completed opposite action for this entity and scope.",
      409
    );
  }
  const priorAfter = jsonRecord(restored.afterState, "restored.after_state");
  if (stringField(priorAfter, "status") !== entity.status) {
    throw new CanonicalControlPlaneError(
      "RESTORATION_STATE_DIVERGED",
      "The entity changed after the referenced action and cannot be restored from that version.",
      409
    );
  }
}

export class CanonicalEntityLifecycleService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async execute(
    request: EntityLifecycleActionRequest,
    context: CanonicalEntityLifecycleContext
  ): Promise<EntityLifecycleActionResult> {
    assertEntityLifecycleActionRequest(request);
    const hash = requestHash(request);

    return withCanonicalSession(this.db, context.databaseSession, async (tx, appUserId) => {
      const scopeId = request.scope.scope_type === "SYSTEM" ? null : request.scope.scope_id;
      const claimed = await tx.$queryRaw<{ key: string }[]>`
        INSERT INTO entral.idempotency_keys (
          key, operation, scope_type, scope_id, request_sha256, status, locked_until
        )
        VALUES (
          ${request.idempotency_key},
          'entity.lifecycle.pause_resume',
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
        const existing = existingKeys[0];
        if (!existing || existing.requestHash !== hash) {
          throw new CanonicalControlPlaneError(
            "IDEMPOTENCY_KEY_REUSED",
            "The idempotency key was already used for a different request.",
            409
          );
        }
        if (existing.status === "SUCCEEDED" && existing.response?.actionId) {
          return completedLifecycleResult(tx, existing.response.actionId, true);
        }
        throw new CanonicalControlPlaneError(
          "IDEMPOTENCY_IN_PROGRESS",
          "The idempotent lifecycle request is already in progress.",
          409
        );
      }

      await validateActor(tx, appUserId, request, context);
      const targets = await tx.$queryRaw<LifecycleEntityRow[]>`
        SELECT
          entity.id AS "entityId",
          entity.role::text AS "entityRole",
          entity.name,
          entity.parent_id AS "parentId",
          entity.business_id AS "businessId",
          entity.status::text AS status,
          entity.version,
          to_jsonb(entity) AS snapshot
        FROM entral.entities entity
        WHERE entity.id = ${request.target_id}::uuid
        FOR UPDATE
      `;
      const target = targets[0];
      if (!target) {
        throw new CanonicalControlPlaneError("ENTITY_NOT_FOUND", "Entity not found.", 404);
      }
      if (target.entityRole === "ENTRAL") {
        throw new CanonicalControlPlaneError(
          "INVALID_LIFECYCLE_TARGET_ROLE",
          "ENTRAL cannot be paused or resumed through a lower-entity lifecycle action.",
          422
        );
      }
      assertTargetScope(request, target, appUserId);
      const actualVersion = Number(target.version);
      if (actualVersion !== request.expected_version) {
        throw new CanonicalControlPlaneError(
          "STALE_EXPECTED_VERSION",
          `Expected entity version ${request.expected_version}, but found ${actualVersion}.`,
          409
        );
      }
      if (request.rollback_plan.previous_status !== target.status) {
        throw new CanonicalControlPlaneError(
          "ROLLBACK_STATE_MISMATCH",
          "The rollback plan does not match the entity's current state.",
          409
        );
      }
      const validCurrentState = request.action_type === "PAUSE"
        ? target.status === "ACTIVE" || target.status === "DEGRADED"
        : target.status === "PAUSED";
      if (!validCurrentState) {
        throw new CanonicalControlPlaneError(
          "INVALID_LIFECYCLE_STATE",
          `${request.action_type} is not valid while ${target.name} is ${target.status}.`,
          409
        );
      }
      await validateRestoration(tx, request, target);

      if (request.action_type === "RESUME") {
        const parentBlockers = await tx.$queryRaw<{ name: string; status: string }[]>`
          WITH RECURSIVE ancestors AS (
            SELECT parent.id, parent.parent_id, parent.name, parent.status
            FROM entral.entities parent
            WHERE parent.id = ${target.parentId}::uuid
            UNION ALL
            SELECT parent.id, parent.parent_id, parent.name, parent.status
            FROM entral.entities parent
            JOIN ancestors child ON child.parent_id = parent.id
          )
          SELECT name, status::text AS status
          FROM ancestors
          WHERE status <> 'ACTIVE'
        `;
        if (parentBlockers[0]) {
          throw new CanonicalControlPlaneError(
            "PARENT_CHAIN_NOT_READY",
            `${parentBlockers[0].name} is ${parentBlockers[0].status}; resume the parent chain first.`,
            409
          );
        }
        const dependencyBlockers = await tx.$queryRaw<{ blocker: string }[]>`
          SELECT grant_row.id::text AS blocker
          FROM entral.tool_grants grant_row
          JOIN entral.tool_definitions tool ON tool.id = grant_row.tool_id
          LEFT JOIN entral.credential_references credential
            ON credential.id = grant_row.credential_reference_id
          WHERE grant_row.entity_id = ${target.entityId}::uuid
            AND (
              NOT tool.is_active
              OR grant_row.valid_from > CURRENT_TIMESTAMP
              OR (grant_row.expires_at IS NOT NULL AND grant_row.expires_at <= CURRENT_TIMESTAMP)
              OR (
                grant_row.credential_reference_id IS NOT NULL
                AND (
                  credential.status <> 'ACTIVE'
                  OR (credential.expires_at IS NOT NULL AND credential.expires_at <= CURRENT_TIMESTAMP)
                )
              )
            )
          LIMIT 1
        `;
        if (dependencyBlockers[0]) {
          throw new CanonicalControlPlaneError(
            "ENTITY_DEPENDENCY_NOT_READY",
            "The entity has an inactive tool, grant, or credential dependency.",
            409
          );
        }
      }

      const descendantRows = await tx.$queryRaw<{ count: bigint | number }[]>`
        WITH RECURSIVE descendants AS (
          SELECT child.id
          FROM entral.entities child
          WHERE child.parent_id = ${target.entityId}::uuid
          UNION ALL
          SELECT child.id
          FROM entral.entities child
          JOIN descendants parent ON child.parent_id = parent.id
        )
        SELECT count(*)::bigint AS count FROM descendants
      `;
      const descendantsAffected = Number(descendantRows[0]?.count ?? 0);
      const initiatedByKind = request.actor_type === "HUMAN" ? "HUMAN" : "ENTITY";
      const initiatedByUserId = request.actor_type === "HUMAN" ? request.actor_id : null;
      const initiatedByEntityId = request.actor_type === "ENTRAL" ? request.actor_id : null;
      const beforeState = canonicalJson(target.snapshot);
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
          before_state,
          rollback_plan,
          verification_plan,
          idempotency_key,
          correlation_id,
          causation_id,
          requested_at
        )
        VALUES (
          ${request.action_id}::uuid,
          ${request.action_type}::entral.governance_action_type,
          ${initiatedByKind}::entral.actor_kind,
          ${initiatedByUserId}::uuid,
          ${initiatedByEntityId}::uuid,
          'ENTITY',
          ${request.target_id}::uuid,
          ${request.business_id}::uuid,
          ${request.requested_outcome},
          ${request.reason},
          ${authorityBasis}::jsonb,
          ${request.risk_class}::entral.risk_class,
          ${request.confidence ?? null},
          ${proposedChanges}::jsonb,
          ${request.expected_version},
          ${beforeState}::jsonb,
          ${rollbackPlan}::jsonb,
          ${verificationPlan}::jsonb,
          ${request.idempotency_key},
          NULLIF(current_setting('app.correlation_id', true), '')::uuid,
          ${request.restores_action_id ?? null}::uuid,
          ${new Date(request.requested_at)}
        )
      `;
      await tx.$queryRaw`
        SELECT set_config('app.governance_action_id', ${request.action_id}, true)
      `;
      await tx.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'VALIDATING'
        WHERE id = ${request.action_id}::uuid
      `;
      const policyEvidence = canonicalJson({
        actor_type: request.actor_type,
        business_id: request.business_id,
        containment_policy: request.proposed_changes.containment_policy,
        entity_role: target.entityRole,
        expected_version: request.expected_version,
        target_status: target.status
      });
      await tx.$executeRaw`
        INSERT INTO entral.policy_checks (
          governance_action_id, check_name, passed, decision, evidence
        )
        VALUES
          (${request.action_id}::uuid, 'sovereign-authority', true, 'Human authority or ENTRAL verified.', ${policyEvidence}::jsonb),
          (${request.action_id}::uuid, 'target-role-and-state', true, 'Lower entity role and lifecycle state verified.', ${policyEvidence}::jsonb),
          (${request.action_id}::uuid, 'business-scope-and-version', true, 'RLS scope, business binding, and optimistic version verified.', ${policyEvidence}::jsonb),
          (${request.action_id}::uuid, 'dependency-readiness', true, 'Parent chain, tools, grants, and credentials satisfy the requested transition.', ${policyEvidence}::jsonb)
      `;
      await tx.$executeRaw`
        UPDATE entral.governance_actions
        SET
          status = 'AUTHORIZED',
          authorized_at = GREATEST(clock_timestamp(), requested_at)
        WHERE id = ${request.action_id}::uuid
      `;
      await tx.$executeRaw`
        UPDATE entral.governance_actions
        SET
          status = 'EXECUTING',
          started_at = GREATEST(clock_timestamp(), requested_at)
        WHERE id = ${request.action_id}::uuid
      `;

      const nextStatus = request.action_type === "PAUSE" ? "PAUSED" : "ACTIVE";
      const updated = await tx.$queryRaw<LifecycleEntityRow[]>`
        UPDATE entral.entities AS entity
        SET
          status = ${nextStatus}::entral.entity_status,
          retired_at = NULL
        WHERE entity.id = ${target.entityId}::uuid
          AND entity.version = ${request.expected_version}
          AND entity.status = ${target.status}::entral.entity_status
        RETURNING
          entity.id AS "entityId",
          entity.role::text AS "entityRole",
          entity.name,
          entity.parent_id AS "parentId",
          entity.business_id AS "businessId",
          entity.status::text AS status,
          entity.version,
          to_jsonb(entity) AS snapshot
      `;
      const readback = updated[0];
      if (
        !readback
        || readback.status !== nextStatus
        || Number(readback.version) !== request.expected_version + 1
      ) {
        throw new CanonicalControlPlaneError(
          "LIFECYCLE_READBACK_FAILED",
          "The entity transition did not produce the expected status and next version.",
          500
        );
      }
      const afterState = canonicalJson(readback.snapshot);
      await tx.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'VERIFYING', after_state = ${afterState}::jsonb
        WHERE id = ${request.action_id}::uuid
      `;

      const leasingRows = await tx.$queryRaw<{ eligible: boolean }[]>`
        SELECT entral.entity_accepts_new_work(${target.entityId}::uuid) AS eligible
      `;
      const expectedLeasing = request.action_type === "PAUSE" ? "BLOCKED" : "ELIGIBLE";
      const actualLeasing = leasingRows[0]?.eligible ? "ELIGIBLE" : "BLOCKED";
      if (actualLeasing !== expectedLeasing) {
        throw new CanonicalControlPlaneError(
          "LIFECYCLE_LEASING_VERIFICATION_FAILED",
          "The entity lifecycle state and new-work leasing guard did not converge.",
          500
        );
      }

      const verificationId = randomUUID();
      const expectedState = canonicalJson({
        new_work_leasing: expectedLeasing,
        status: nextStatus,
        version: request.expected_version + 1
      });
      const observedState = canonicalJson({
        descendants_affected: descendantsAffected,
        new_work_leasing: actualLeasing,
        status: readback.status,
        version: Number(readback.version)
      });
      await tx.$executeRaw`
        INSERT INTO entral.verification_results (
          id,
          subject_type,
          subject_id,
          status,
          verification_method,
          assertions,
          observed_state,
          expected_state,
          evidence_refs,
          completed_at
        )
        VALUES (
          ${verificationId}::uuid,
          'GOVERNANCE_ACTION',
          ${request.action_id}::uuid,
          'PASSED',
          'entity-pause-resume-deterministic-readback-v1',
          ${canonicalJson({
            checks: [
              "target canonical status matches",
              "aggregate version advanced exactly once",
              "new-work leasing guard matches requested lifecycle state",
              "entity event, audit, outbox, and conversation receipts exist before response"
            ]
          })}::jsonb,
          ${observedState}::jsonb,
          ${expectedState}::jsonb,
          '[]'::jsonb,
          GREATEST(clock_timestamp(), ${new Date(request.requested_at)})
        )
      `;
      await tx.$executeRaw`
        UPDATE entral.governance_actions
        SET verification_result_id = ${verificationId}::uuid
        WHERE id = ${request.action_id}::uuid
      `;
      await tx.$executeRaw`
        UPDATE entral.governance_actions
        SET
          status = 'SUCCEEDED',
          completed_at = GREATEST(clock_timestamp(), requested_at)
        WHERE id = ${request.action_id}::uuid
      `;

      if (request.restores_action_id) {
        await tx.$executeRaw`
          UPDATE entral.governance_actions
          SET
            status = 'ROLLED_BACK',
            rolled_back_at = GREATEST(
              clock_timestamp(),
              ${new Date(request.requested_at)}
            )
          WHERE id = ${request.restores_action_id}::uuid
            AND status = 'SUCCEEDED'
        `;
      }

      const entralRows = await tx.$queryRaw<{ entityId: string }[]>`
        SELECT id AS "entityId"
        FROM entral.entities
        WHERE role = 'ENTRAL'
          AND status <> 'RETIRED'
        LIMIT 1
      `;
      const entralEntityId = entralRows[0]?.entityId;
      if (!entralEntityId) {
        throw new CanonicalControlPlaneError(
          "ENTRAL_CONVERSATION_UNAVAILABLE",
          "The active ENTRAL entity is unavailable for the completion receipt.",
          500
        );
      }
      const conversationMessageId = randomUUID();
      const completionContent = `${target.name} ${request.action_type === "PAUSE" ? "paused" : "resumed"} successfully at canonical version ${Number(readback.version)} after database readback verification.`;
      await tx.$executeRaw`
        INSERT INTO entral.operational_messages (
          id,
          sender_entity_id,
          recipient_user_id,
          message_type,
          payload,
          evidence_refs,
          confidence,
          correlation_id
        )
        VALUES (
          ${conversationMessageId}::uuid,
          ${entralEntityId}::uuid,
          ${appUserId}::uuid,
          'CompletionReport',
          ${canonicalJson({
            aggregate_version: Number(readback.version),
            content: completionContent,
            governance_action_id: request.action_id,
            status: nextStatus,
            target_entity_id: target.entityId,
            verification_id: verificationId
          })}::jsonb,
          '[]'::jsonb,
          1,
          NULLIF(current_setting('app.correlation_id', true), '')::uuid
        )
      `;

      const receiptRows = await tx.$queryRaw<LifecycleReceiptCountRow[]>`
        SELECT
          event_count AS "eventCount",
          audit_count AS "auditCount",
          outbox_count AS "outboxCount"
        FROM entral.entity_lifecycle_receipt_counts(
          ${request.action_id}::uuid,
          ${target.entityId}::uuid
        )
      `;
      const receipt = receiptRows[0];
      if (
        !receipt
        || Number(receipt.eventCount) !== 1
        || Number(receipt.auditCount) !== 1
        || Number(receipt.outboxCount) !== 1
      ) {
        throw new CanonicalControlPlaneError(
          "LIFECYCLE_RECEIPT_INCOMPLETE",
          "The lifecycle transaction did not produce exactly one entity event, audit entry, and outbox record.",
          500
        );
      }

      await tx.$executeRaw`
        UPDATE entral.idempotency_keys
        SET
          status = 'SUCCEEDED',
          response = jsonb_build_object(
            'actionId', ${request.action_id}::text,
            'entityId', ${target.entityId}::text,
            'version', ${Number(readback.version)}
          ),
          completed_at = GREATEST(
            clock_timestamp(),
            ${new Date(request.requested_at)}
          ),
          locked_until = NULL
        WHERE key = ${request.idempotency_key}
      `;

      return completedLifecycleResult(tx, request.action_id, false);
    });
  }
}

export const canonicalEntityLifecycleService = new CanonicalEntityLifecycleService();
