import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type {
  GovernanceActionRequest,
  GovernanceActionType,
  GovernanceTargetType
} from "@entral/contracts";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  CanonicalControlPlaneError,
  CanonicalControlPlaneRepository
} from "../src/services/canonicalControlPlane.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(testDatabaseUrl && process.env.RUN_POSTGRES_INTEGRATION === "1");

type EntitySeed = {
  businessId: string | null;
  id: string;
  parentId: string | null;
  role: "ENTRAL" | "MARSHAL" | "GENERAL" | "COMMANDER" | "SOLDIER";
  version: number;
};

function governanceRequest(input: {
  actionType: GovernanceActionType;
  actorId: string;
  businessId: string | null;
  expectedVersion: number;
  targetId: string | null;
  targetType: GovernanceTargetType;
}): GovernanceActionRequest {
  const scopeId = input.businessId ?? input.targetId ?? randomUUID();
  return {
    action_id: randomUUID(),
    action_type: input.actionType,
    actor_id: input.actorId,
    actor_type: "HUMAN",
    authority_basis: { permission: input.actionType.toLocaleLowerCase() },
    business_id: input.businessId,
    expected_version: input.expectedVersion,
    idempotency_key: `phase140-${randomUUID()}`,
    proposed_changes: { requested: input.actionType },
    reason: "Phase 140 integration verification.",
    requested_at: new Date().toISOString(),
    requested_outcome: `Verify ${input.targetType} governance creation.`,
    risk_class: "MEDIUM",
    rollback_plan: { strategy: "forward compensation" },
    scope: input.businessId
      ? {
          business_id: input.businessId,
          display_label: "Integration test business",
          scope_id: input.businessId,
          scope_type: "BUSINESS"
        }
      : {
          display_label: "Integration test global scope",
          scope_id: scopeId,
          scope_type: "SYSTEM"
        },
    target_id: input.targetId,
    target_type: input.targetType,
    verification_plan: { checks: ["database-readback"] }
  };
}

function authenticatedDatabaseSession(authSubject: string, actionReason: string) {
  return {
    actionReason,
    authSubject,
    correlationId: randomUUID(),
  } as const;
}

describe.skipIf(!integrationEnabled)("Phase 140 canonical PostgreSQL control plane", () => {
  it("enforces hierarchy, business, routing, governance, concurrency, and restart invariants", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const databaseName = `entral_phase140_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const databaseUrl = new URL(baseUrl);
    databaseUrl.pathname = `/${databaseName}`;
    databaseUrl.searchParams.delete("schema");
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    let client: PrismaClient | null = null;

    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
      const prismaCli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));
      const migration = spawnSync(process.execPath, [
        prismaCli,
        "migrate",
        "deploy",
        "--schema",
        "prisma/schema.prisma"
      ], {
        cwd: repositoryRoot,
        encoding: "utf8",
        env: { ...process.env, DATABASE_URL: databaseUrl.toString() }
      });
      if (migration.status !== 0) {
        throw new Error(`Disposable PostgreSQL migration failed: ${migration.stderr || migration.stdout}`);
      }

      client = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
      const repository = new CanonicalControlPlaneRepository(client);
      const humanId = randomUUID();
      const nonHumanId = randomUUID();
      const humanSubject = `phase140-authority-${randomUUID()}`;
      await client.user.create({
        data: {
          email: "authority@example.test",
          id: humanSubject,
          name: "Human Authority",
          passwordHash: "integration-test-only",
          role: "ADMIN"
        }
      });
      await client.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, auth_subject
        )
        VALUES
          (
            ${humanId}::uuid,
            'authority@example.test',
            'Human Authority',
            true,
            ${humanSubject}
          ),
          (${nonHumanId}::uuid, 'member@example.test', 'Non-authority User', false, NULL)
      `;

      const entralId = randomUUID();
      const marshalId = randomUUID();
      const secondMarshalId = randomUUID();
      const generalId = randomUUID();
      const secondGeneralId = randomUUID();
      const commanderId = randomUUID();
      const secondCommanderId = randomUUID();
      const businessId = randomUUID();
      const soldierId = randomUUID();

      await client.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, status)
        VALUES (${entralId}::uuid, 'ENTRAL', 'ENTRAL', 'ENTRAL', 'ACTIVE')
      `;
      await client.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
        VALUES
          (${marshalId}::uuid, 'M01', 'MARSHAL', 'Primary Marshal', ${entralId}::uuid, 'ACTIVE'),
          (${secondMarshalId}::uuid, 'M02', 'MARSHAL', 'Secondary Marshal', ${entralId}::uuid, 'ACTIVE')
      `;
      await client.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
        VALUES
          (${generalId}::uuid, 'G-M01-01', 'GENERAL', 'Primary General', ${marshalId}::uuid, 'ACTIVE'),
          (${secondGeneralId}::uuid, 'G-M01-02', 'GENERAL', 'Secondary General', ${marshalId}::uuid, 'ACTIVE')
      `;

      await client.$transaction(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
          VALUES (${commanderId}::uuid, 'C-G-M01-01-001', 'COMMANDER', 'Primary Commander', ${generalId}::uuid, 'ACTIVE')
        `;
        await tx.$executeRaw`
          INSERT INTO entral.businesses (
            id, stable_code, name, commander_id, general_id, marshal_id, status
          )
          VALUES (
            ${businessId}::uuid,
            'BIZ-001',
            'Canonical Business',
            ${commanderId}::uuid,
            ${generalId}::uuid,
            ${marshalId}::uuid,
            'OPERATING'
          )
        `;
        await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
      });
      await client.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
        VALUES (${secondCommanderId}::uuid, 'C-G-M01-01-002', 'COMMANDER', 'Second Commander', ${generalId}::uuid, 'ACTIVE')
      `;
      await client.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
        VALUES (${soldierId}::uuid, 'S-C-G-M01-01-001-01', 'SOLDIER', 'Primary Soldier', ${commanderId}::uuid, 'ACTIVE')
      `;

      const entities = new Map<string, EntitySeed>([
        ["ENTRAL", { businessId: null, id: entralId, parentId: null, role: "ENTRAL", version: 1 }],
        ["MARSHAL", { businessId: null, id: marshalId, parentId: entralId, role: "MARSHAL", version: 1 }],
        ["GENERAL", { businessId: null, id: generalId, parentId: marshalId, role: "GENERAL", version: 1 }],
        ["COMMANDER", { businessId, id: commanderId, parentId: generalId, role: "COMMANDER", version: 2 }],
        ["SOLDIER", { businessId, id: soldierId, parentId: commanderId, role: "SOLDIER", version: 1 }]
      ]);

      const inheritedSoldier = await client.$queryRaw<{ businessId: string }[]>`
        SELECT business_id AS "businessId"
        FROM entral.entities
        WHERE id = ${soldierId}::uuid
      `;
      expect(inheritedSoldier[0]?.businessId).toBe(businessId);

      const requiredParent: Record<string, string | null> = {
        ENTRAL: null,
        MARSHAL: "ENTRAL",
        GENERAL: "MARSHAL",
        COMMANDER: "GENERAL",
        SOLDIER: "COMMANDER"
      };
      for (const childRole of Object.keys(requiredParent)) {
        for (const parent of entities.values()) {
          if (requiredParent[childRole] === parent.role) continue;
          const retiredAt = childRole === "ENTRAL" ? new Date() : null;
          await expect(client.$executeRaw`
            INSERT INTO entral.entities (
              id, stable_code, role, name, parent_id, status, retired_at
            )
            VALUES (
              ${randomUUID()}::uuid,
              ${`INVALID-${childRole}-${parent.role}-${randomUUID()}`},
              ${childRole}::entral.entity_role,
              'Invalid hierarchy candidate',
              ${parent.id}::uuid,
              ${childRole === "ENTRAL" ? "RETIRED" : "BUILDING"}::entral.entity_status,
              ${retiredAt}
            )
          `).rejects.toThrow();
        }
      }
      await expect(client.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name)
        VALUES (${randomUUID()}::uuid, ${`ENTRAL-${randomUUID()}`}, 'ENTRAL', 'Duplicate ENTRAL')
      `).rejects.toThrow();

      const invalidBusinessId = randomUUID();
      await expect(client.$transaction(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO entral.businesses (
            id, stable_code, name, commander_id, general_id, marshal_id
          )
          VALUES (
            ${invalidBusinessId}::uuid,
            ${`BIZ-INVALID-${randomUUID()}`},
            'Invalid Business',
            ${secondCommanderId}::uuid,
            ${generalId}::uuid,
            ${secondMarshalId}::uuid
          )
        `;
        await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
      })).rejects.toThrow();
      await expect(client.$executeRaw`
        INSERT INTO entral.businesses (
          id, stable_code, name, commander_id, general_id, marshal_id
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${`BIZ-DUPLICATE-${randomUUID()}`},
          'Duplicate Commander Business',
          ${commanderId}::uuid,
          ${generalId}::uuid,
          ${marshalId}::uuid
        )
      `).rejects.toThrow();
      await expect(client.$transaction(async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.entities
          SET parent_id = ${secondMarshalId}::uuid
          WHERE id = ${generalId}::uuid
        `;
        await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
      })).rejects.toThrow();

      async function message(input: {
        messageType: "Clarification" | "ExecutionReport" | "MissionOrder";
        recipientEntityId?: string;
        recipientUserId?: string;
        senderEntityId?: string;
        senderUserId?: string;
      }) {
        const rows = await client!.$queryRaw<{ routeValid: boolean; status: string }[]>`
          INSERT INTO entral.operational_messages (
            sender_user_id,
            sender_entity_id,
            recipient_user_id,
            recipient_entity_id,
            message_type,
            payload
          )
          VALUES (
            ${input.senderUserId ?? null}::uuid,
            ${input.senderEntityId ?? null}::uuid,
            ${input.recipientUserId ?? null}::uuid,
            ${input.recipientEntityId ?? null}::uuid,
            ${input.messageType}::entral.message_type,
            '{"test":true}'::jsonb
          )
          RETURNING route_valid AS "routeValid", status::text AS status
        `;
        return rows[0]!;
      }

      const chain = [...entities.values()];
      for (let index = 0; index < chain.length - 1; index += 1) {
        const parent = chain[index]!;
        const child = chain[index + 1]!;
        await expect(message({
          messageType: "MissionOrder",
          recipientEntityId: child.id,
          senderEntityId: parent.id
        })).resolves.toEqual({ routeValid: true, status: "CREATED" });
        await expect(message({
          messageType: "ExecutionReport",
          recipientEntityId: parent.id,
          senderEntityId: child.id
        })).resolves.toEqual({ routeValid: true, status: "CREATED" });
      }
      await expect(message({
        messageType: "MissionOrder",
        recipientEntityId: entralId,
        senderUserId: humanId
      })).resolves.toEqual({ routeValid: true, status: "CREATED" });
      await expect(message({
        messageType: "ExecutionReport",
        recipientUserId: humanId,
        senderEntityId: entralId
      })).resolves.toEqual({ routeValid: true, status: "CREATED" });

      let invalidRouteCount = 0;
      for (const sender of chain) {
        for (const recipient of chain) {
          const adjacent = sender.parentId === recipient.id || recipient.parentId === sender.id;
          if (adjacent) continue;
          await expect(message({
            messageType: "Clarification",
            recipientEntityId: recipient.id,
            senderEntityId: sender.id
          })).resolves.toEqual({ routeValid: false, status: "REJECTED" });
          invalidRouteCount += 1;
        }
      }
      await expect(message({
        messageType: "MissionOrder",
        recipientEntityId: entralId,
        senderUserId: nonHumanId
      })).resolves.toEqual({ routeValid: false, status: "REJECTED" });
      await expect(message({
        messageType: "ExecutionReport",
        recipientUserId: nonHumanId,
        senderEntityId: entralId
      })).resolves.toEqual({ routeValid: false, status: "REJECTED" });
      const rejectedMessages = await client.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*)::integer AS count
        FROM entral.operational_messages
        WHERE status = 'REJECTED' AND NOT route_valid AND delivered_at IS NULL
      `;
      expect(rejectedMessages[0]?.count).toBe(invalidRouteCount + 2);

      const missionId = randomUUID();
      const taskId = randomUUID();
      const toolId = randomUUID();
      const toolGrantId = randomUUID();
      const scheduleId = randomUUID();
      const policyId = randomUUID();
      await client.$executeRaw`
        INSERT INTO entral.missions (
          id, stable_code, objective, issuer_user_id, owner_entity_id, business_id, status
        )
        VALUES (
          ${missionId}::uuid,
          'MISSION-001',
          'Verify the canonical mission store.',
          ${humanId}::uuid,
          ${commanderId}::uuid,
          ${businessId}::uuid,
          'ACTIVE'
        )
      `;
      await client.$executeRaw`
        INSERT INTO entral.tasks (
          id, stable_code, mission_id, owner_entity_id, business_id, objective, status
        )
        VALUES (
          ${taskId}::uuid,
          'TASK-001',
          ${missionId}::uuid,
          ${soldierId}::uuid,
          ${businessId}::uuid,
          'Verify the canonical task store.',
          'ACTIVE'
        )
      `;
      await client.$executeRaw`
        INSERT INTO entral.tool_definitions (
          id, stable_code, name, provider, description, input_schema, output_schema, adapter_ref
        )
        VALUES (
          ${toolId}::uuid,
          'TOOL-001',
          'Test Tool',
          'internal',
          'Integration-only tool definition.',
          '{}'::jsonb,
          '{}'::jsonb,
          'internal:test'
        )
      `;
      await client.$executeRaw`
        INSERT INTO entral.tool_grants (
          id, entity_id, tool_id, business_id, allowed_actions
        )
        VALUES (
          ${toolGrantId}::uuid,
          ${soldierId}::uuid,
          ${toolId}::uuid,
          ${businessId}::uuid,
          ARRAY['read']::text[]
        )
      `;
      await client.$executeRaw`
        INSERT INTO entral.schedules (
          id, stable_code, owner_entity_id, business_id, mission_template, event_trigger
        )
        VALUES (
          ${scheduleId}::uuid,
          'SCHEDULE-001',
          ${commanderId}::uuid,
          ${businessId}::uuid,
          '{}'::jsonb,
          '{"event":"integration"}'::jsonb
        )
      `;
      await client.$executeRaw`
        INSERT INTO entral.policy_versions (
          id, stable_code, semantic_version, policy_type, content, content_sha256
        )
        VALUES (
          ${policyId}::uuid,
          'POLICY-001',
          '1.0.0',
          'integration',
          '{}'::jsonb,
          ${"0".repeat(64)}
        )
      `;

      const targetCases: Array<{
        actionType: GovernanceActionType;
        businessId: string | null;
        expectedVersion: number;
        targetId: string | null;
        targetType: GovernanceTargetType;
      }> = [
        { actionType: "PAUSE", businessId, expectedVersion: 2, targetId: commanderId, targetType: "ENTITY" },
        { actionType: "EDIT", businessId, expectedVersion: 1, targetId: businessId, targetType: "BUSINESS" },
        { actionType: "EDIT", businessId, expectedVersion: 1, targetId: missionId, targetType: "MISSION" },
        { actionType: "EDIT", businessId, expectedVersion: 1, targetId: taskId, targetType: "TASK" },
        { actionType: "TOOL_GRANT_CHANGE", businessId, expectedVersion: 1, targetId: toolGrantId, targetType: "TOOL_GRANT" },
        { actionType: "SCHEDULE_CHANGE", businessId, expectedVersion: 1, targetId: scheduleId, targetType: "SCHEDULE" },
        { actionType: "POLICY_CHANGE", businessId: null, expectedVersion: 1, targetId: policyId, targetType: "POLICY" },
        { actionType: "POLICY_CHANGE", businessId: null, expectedVersion: 0, targetId: null, targetType: "SYSTEM" }
      ];
      const createdActions = [];
      for (const targetCase of targetCases) {
        const request = governanceRequest({ ...targetCase, actorId: humanId });
        const action = await repository.createGovernanceAction(request, {
          authenticatedHumanEmail: "authority@example.test",
          databaseSession: authenticatedDatabaseSession(humanSubject, request.reason)
        });
        expect(action).toMatchObject({
          action_id: request.action_id,
          expected_version: targetCase.expectedVersion,
          status: "PROPOSED",
          target_id: targetCase.targetId,
          target_type: targetCase.targetType
        });
        const replay = await repository.createGovernanceAction(request, {
          authenticatedHumanEmail: "authority@example.test",
          databaseSession: authenticatedDatabaseSession(humanSubject, request.reason)
        });
        expect(replay.action_id).toBe(action.action_id);
        createdActions.push(action);
      }
      const rollbackRequest = governanceRequest({
        actionType: "ROLLBACK",
        actorId: humanId,
        businessId,
        expectedVersion: 1,
        targetId: createdActions[0]!.action_id,
        targetType: "GOVERNANCE_ACTION"
      });
      await expect(repository.createGovernanceAction(rollbackRequest, {
        authenticatedHumanEmail: "authority@example.test",
        databaseSession: authenticatedDatabaseSession(humanSubject, rollbackRequest.reason)
      })).resolves.toMatchObject({ status: "PROPOSED", target_type: "GOVERNANCE_ACTION" });

      const staleRequest = governanceRequest({
        actionType: "PAUSE",
        actorId: humanId,
        businessId,
        expectedVersion: 1,
        targetId: commanderId,
        targetType: "ENTITY"
      });
      await expect(repository.createGovernanceAction(staleRequest, {
        authenticatedHumanEmail: "authority@example.test",
        databaseSession: authenticatedDatabaseSession(humanSubject, staleRequest.reason)
      })).rejects.toMatchObject({ code: "STALE_EXPECTED_VERSION", statusCode: 409 });

      const lifecycleActionId = createdActions[1]!.action_id;
      await expect(client.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'SUCCEEDED', completed_at = CURRENT_TIMESTAMP
        WHERE id = ${createdActions[2]!.action_id}::uuid
      `).rejects.toThrow();
      await client.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'VALIDATING'
        WHERE id = ${lifecycleActionId}::uuid
      `;
      await client.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'AUTHORIZED', authorized_at = CURRENT_TIMESTAMP
        WHERE id = ${lifecycleActionId}::uuid
      `;
      await client.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'EXECUTING', started_at = CURRENT_TIMESTAMP
        WHERE id = ${lifecycleActionId}::uuid
      `;
      await client.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'VERIFYING'
        WHERE id = ${lifecycleActionId}::uuid
      `;
      const lifecycleVerificationId = randomUUID();
      await client.$transaction(async (tx) => {
        await tx.$queryRaw`
          SELECT entral.bind_authenticated_app_user(${humanSubject})
        `;
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
            completed_at
          )
          VALUES (
            ${lifecycleVerificationId}::uuid,
            'GOVERNANCE_ACTION',
            ${lifecycleActionId}::uuid,
            'PASSED',
            'database-readback',
            '{"checks":["lifecycle-state"]}'::jsonb,
            '{"status":"VERIFYING"}'::jsonb,
            '{"status":"VERIFYING"}'::jsonb,
            CURRENT_TIMESTAMP
          )
        `;
      });
      await client.$executeRaw`
        UPDATE entral.governance_actions
        SET verification_result_id = ${lifecycleVerificationId}::uuid
        WHERE id = ${lifecycleActionId}::uuid
      `;
      await client.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'SUCCEEDED', completed_at = CURRENT_TIMESTAMP
        WHERE id = ${lifecycleActionId}::uuid
      `;
      await client.$executeRaw`
        UPDATE entral.governance_actions
        SET status = 'ROLLED_BACK', rolled_back_at = CURRENT_TIMESTAMP
        WHERE id = ${lifecycleActionId}::uuid
      `;
      const lifecycle = await client.$queryRaw<{ status: string; version: number }[]>`
        SELECT status::text AS status, version::integer AS version
        FROM entral.governance_actions
        WHERE id = ${lifecycleActionId}::uuid
      `;
      expect(lifecycle[0]).toEqual({ status: "ROLLED_BACK", version: 8 });

      const systemActionId = randomUUID();
      await expect(client.$executeRaw`
        INSERT INTO entral.governance_actions (
          id,
          action_type,
          initiated_by_kind,
          target_type,
          requested_outcome,
          reason,
          authority_basis,
          risk_class,
          proposed_changes,
          expected_version
        )
        VALUES (
          ${systemActionId}::uuid,
          'ISOLATE',
          'SYSTEM',
          'SYSTEM',
          'Invalid system actor test.',
          'A SYSTEM actor must not bypass authority.',
          '{}'::jsonb,
          'HIGH',
          '{}'::jsonb,
          0
        )
      `).rejects.toThrow();

      const concurrent = await Promise.allSettled([
        repository.updateEntityStatus(
          secondMarshalId,
          "PAUSED",
          1,
          authenticatedDatabaseSession(humanSubject, "Pause the secondary Marshal.")
        ),
        repository.updateEntityStatus(
          secondMarshalId,
          "PAUSED",
          1,
          authenticatedDatabaseSession(humanSubject, "Pause the secondary Marshal.")
        )
      ]);
      expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
      const rejected = concurrent.find((result) => result.status === "rejected");
      expect(rejected).toBeDefined();
      expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(CanonicalControlPlaneError);
      expect((rejected as PromiseRejectedResult).reason).toMatchObject({
        code: "STALE_EXPECTED_VERSION",
        statusCode: 409
      });

      const hierarchy = await repository.listHierarchy(
        authenticatedDatabaseSession(humanSubject, "Read the canonical entity hierarchy.")
      );
      expect(hierarchy).toEqual(expect.arrayContaining([
        expect.objectContaining({ entity_id: entralId, entity_type: "ENTRAL", parent_id: null }),
        expect.objectContaining({
          assigned_business_id: businessId,
          entity_id: soldierId,
          entity_type: "SOLDIER",
          parent_id: commanderId
        })
      ]));
      await expect(repository.getBusiness(
        businessId,
        authenticatedDatabaseSession(humanSubject, "Read the canonical business.")
      )).resolves.toMatchObject({
        business_id: businessId,
        commander_id: commanderId,
        general_id: generalId,
        marshal_id: marshalId,
        stable_code: "BIZ-001"
      });

      await client.$disconnect();
      client = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
      const restartedRepository = new CanonicalControlPlaneRepository(client);
      await expect(restartedRepository.getBusiness(
        businessId,
        authenticatedDatabaseSession(humanSubject, "Read the canonical business after restart.")
      )).resolves.toMatchObject({
        business_id: businessId,
        version: 1
      });
      await expect(restartedRepository.listHierarchy(
        authenticatedDatabaseSession(humanSubject, "Read the canonical hierarchy after restart.")
      )).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ entity_id: entralId }),
        expect.objectContaining({ entity_id: soldierId })
      ]));
    } finally {
      await client?.$disconnect();
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
      );
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await admin.$disconnect();
    }
  }, 120_000);
});
