import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type {
  EntityLifecycleActionRequest,
  EntityRole,
  EntityStatus
} from "@entral/contracts";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  CanonicalEntityLifecycleService
} from "../src/services/canonicalEntityLifecycle.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(testDatabaseUrl && process.env.RUN_POSTGRES_INTEGRATION === "1");

type Target = {
  businessId: string | null;
  id: string;
  role: Exclude<EntityRole, "ENTRAL">;
};

function runPrisma(
  prismaCli: string,
  repositoryRoot: string,
  databaseUrl: string,
  args: string[],
  operation: string
) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
  if (result.status !== 0) {
    throw new Error(`${operation} failed: ${result.stderr || result.stdout}`);
  }
}

function loginUrl(databaseUrl: URL, name: string, password: string) {
  const url = new URL(databaseUrl);
  url.username = name;
  url.password = password;
  url.searchParams.set("connection_limit", "4");
  return url.toString();
}

function session(authSubject: string, reason: string) {
  return {
    actionReason: reason,
    authSubject,
    correlationId: randomUUID()
  } as const;
}

function lifecycleRequest(input: {
  actionType: "PAUSE" | "RESUME";
  actorId: string;
  businessId: string | null;
  expectedVersion: number;
  idempotencyKey?: string;
  previousStatus: EntityStatus;
  reason?: string;
  restoresActionId?: string;
  targetId: string;
}): EntityLifecycleActionRequest {
  const actionId = randomUUID();
  const nextStatus = input.actionType === "PAUSE" ? "PAUSED" : "ACTIVE";
  const rollbackAction = input.actionType === "PAUSE" ? "RESUME" : "PAUSE";
  return {
    action_id: actionId,
    action_type: input.actionType,
    actor_id: input.actorId,
    actor_type: "HUMAN",
    authority_basis: {
      channel: "MEMBER_INFRASTRUCTURE",
      explicit_confirmation_required: true,
      target_version: input.expectedVersion
    },
    business_id: input.businessId,
    confidence: 1,
    expected_version: input.expectedVersion,
    idempotency_key: input.idempotencyKey ?? `phase190:${actionId}`,
    proposed_changes: {
      containment_policy: "FINISH_IN_FLIGHT",
      status: nextStatus
    },
    reason: input.reason ?? `${input.actionType} the Phase 190 integration target.`,
    requested_at: new Date().toISOString(),
    requested_outcome: `${input.actionType} the entity with verified canonical convergence.`,
    restores_action_id: input.restoresActionId,
    risk_class: "MEDIUM",
    rollback_plan: {
      action: rollbackAction,
      previous_status: input.previousStatus
    },
    scope: input.businessId
      ? {
          business_id: input.businessId,
          display_label: "Phase 190 business",
          entity_id: input.targetId,
          scope_id: input.businessId,
          scope_type: "BUSINESS"
        }
      : {
          display_label: "Phase 190 Human portfolio",
          entity_id: input.targetId,
          scope_id: input.actorId,
          scope_type: "USER"
        },
    target_id: input.targetId,
    target_type: "ENTITY",
    verification_plan: {
      checks: [
        "canonical status and version readback",
        "new-work lease containment",
        "event audit outbox and conversation receipts"
      ]
    }
  };
}

describe.skipIf(!integrationEnabled)("Phase 190 entity pause/resume PostgreSQL gate", () => {
  it("executes, verifies, restores, isolates, retries, and recovers the complete vertical slice", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const databaseName = `entral_phase190_${suffix}`;
    const apiRole = `entral_phase190_api_${suffix}`;
    const workerRole = `entral_phase190_worker_${suffix}`;
    const apiPassword = randomUUID();
    const workerPassword = randomUUID();
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const databaseUrl = new URL(baseUrl);
    databaseUrl.pathname = `/${databaseName}`;
    databaseUrl.searchParams.delete("schema");
    const previousDatabaseUrl = process.env.DATABASE_URL;
    const previousJwtSecret = process.env.JWT_SECRET;
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    let owner: PrismaClient | null = null;
    let api: PrismaClient | null = null;
    let worker: PrismaClient | null = null;

    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
      const prismaCli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        ["migrate", "deploy", "--schema", "prisma/schema.prisma"],
        "Phase 190 disposable PostgreSQL migration"
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        [
          "db",
          "execute",
          "--file",
          "prisma/security/046_roles_and_grants.sql",
          "--schema",
          "prisma/schema.prisma"
        ],
        "Phase 190 role and grant deployment"
      );
      await admin.$executeRawUnsafe(
        `CREATE ROLE "${apiRole}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS ` +
        `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${apiPassword}'`
      );
      await admin.$executeRawUnsafe(`GRANT entral_api TO "${apiRole}"`);
      await admin.$executeRawUnsafe(
        `CREATE ROLE "${workerRole}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS ` +
        `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${workerPassword}'`
      );
      await admin.$executeRawUnsafe(`GRANT entral_worker TO "${workerRole}"`);

      owner = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
      api = new PrismaClient({
        datasources: { db: { url: loginUrl(databaseUrl, apiRole, apiPassword) } }
      });
      worker = new PrismaClient({
        datasources: { db: { url: loginUrl(databaseUrl, workerRole, workerPassword) } }
      });

      const humanId = randomUUID();
      const otherHumanId = randomUUID();
      const workerUserId = randomUUID();
      const humanSubject = `phase190-human-${suffix}`;
      const humanEmail = `phase190-human-${suffix}@example.test`;
      await owner.user.create({
        data: {
          email: humanEmail,
          id: humanSubject,
          name: "Phase 190 Human",
          passwordHash: "integration-test-only",
          role: "ADMIN"
        }
      });
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active, auth_subject
        )
        VALUES
          (
            ${humanId}::uuid,
            ${humanEmail},
            'Phase 190 Human',
            true,
            true,
            ${humanSubject}
          ),
          (
            ${otherHumanId}::uuid,
            ${`phase190-other-${suffix}@example.test`},
            'Other Human',
            true,
            true,
            NULL
          ),
          (
            ${workerUserId}::uuid,
            ${`phase190-worker-${suffix}@example.test`},
            'Phase 190 Worker',
            false,
            true,
            NULL
          )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.scope_grants (user_id, scope_type, scope_id, permissions)
        VALUES
          (
            ${humanId}::uuid,
            'SYSTEM',
            NULL,
            ARRAY['record_verification']::text[]
          ),
          (
            ${workerUserId}::uuid,
            'SYSTEM',
            NULL,
            ARRAY['publish_events']::text[]
          )
      `;

      const entralId = randomUUID();
      const marshalId = randomUUID();
      const generalId = randomUUID();
      const commanderId = randomUUID();
      const soldierId = randomUUID();
      const businessId = randomUUID();
      const otherGeneralId = randomUUID();
      const otherCommanderId = randomUUID();
      const otherBusinessId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, status)
        VALUES (${entralId}::uuid, ${`ENTRAL-${suffix}`}, 'ENTRAL', 'ENTRAL', 'ACTIVE')
      `;
      await owner.$executeRaw`
        INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
        VALUES
          (${marshalId}::uuid, ${`M-${suffix}`}, 'MARSHAL', 'Operations Marshal', ${entralId}::uuid, 'ACTIVE'),
          (${generalId}::uuid, ${`G-A-${suffix}`}, 'GENERAL', 'Primary General', ${marshalId}::uuid, 'ACTIVE'),
          (${otherGeneralId}::uuid, ${`G-B-${suffix}`}, 'GENERAL', 'Other General', ${marshalId}::uuid, 'ACTIVE')
      `;
      await owner.$transaction(async (transaction) => {
        await transaction.$executeRaw`
          INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
          VALUES
            (${commanderId}::uuid, ${`C-A-${suffix}`}, 'COMMANDER', 'Primary Commander', ${generalId}::uuid, 'ACTIVE'),
            (${otherCommanderId}::uuid, ${`C-B-${suffix}`}, 'COMMANDER', 'Other Commander', ${otherGeneralId}::uuid, 'ACTIVE')
        `;
        await transaction.$executeRaw`
          INSERT INTO entral.businesses (
            id, stable_code, name, commander_id, general_id, marshal_id, status
          )
          VALUES
            (
              ${businessId}::uuid,
              ${`BIZ-A-${suffix}`},
              'Primary Phase 190 Business',
              ${commanderId}::uuid,
              ${generalId}::uuid,
              ${marshalId}::uuid,
              'OPERATING'
            ),
            (
              ${otherBusinessId}::uuid,
              ${`BIZ-B-${suffix}`},
              'Other Phase 190 Business',
              ${otherCommanderId}::uuid,
              ${otherGeneralId}::uuid,
              ${marshalId}::uuid,
              'OPERATING'
            )
        `;
        await transaction.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
      });
      await owner.$executeRaw`
        INSERT INTO entral.entities (
          id, stable_code, role, name, parent_id, business_id, status
        )
        VALUES (
          ${soldierId}::uuid,
          ${`S-A-${suffix}`},
          'SOLDIER',
          'Primary Soldier',
          ${commanderId}::uuid,
          ${businessId}::uuid,
          'ACTIVE'
        )
      `;
      const existingScheduleId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.schedules (
          id, stable_code, owner_entity_id, business_id, mission_template, event_trigger, status
        )
        VALUES (
          ${existingScheduleId}::uuid,
          ${`SCHEDULE-IN-FLIGHT-${suffix}`},
          ${soldierId}::uuid,
          ${businessId}::uuid,
          '{}'::jsonb,
          '{"event":"phase190-existing"}'::jsonb,
          'ACTIVE'
        )
      `;

      const service = new CanonicalEntityLifecycleService(api);
      const targets: Target[] = [
        { businessId: null, id: marshalId, role: "MARSHAL" },
        { businessId: null, id: generalId, role: "GENERAL" },
        { businessId, id: commanderId, role: "COMMANDER" },
        { businessId, id: soldierId, role: "SOLDIER" }
      ];
      let restartReplayRequest: EntityLifecycleActionRequest | null = null;
      let restartReplayEventId: string | null = null;

      for (const [index, target] of targets.entries()) {
        const beforeRows = await owner.$queryRaw<{ status: EntityStatus; version: bigint }[]>`
          SELECT status::text AS status, version
          FROM entral.entities
          WHERE id = ${target.id}::uuid
        `;
        const before = beforeRows[0]!;
        const pauseRequest = lifecycleRequest({
          actionType: "PAUSE",
          actorId: humanId,
          businessId: target.businessId,
          expectedVersion: Number(before.version),
          previousStatus: before.status,
          targetId: target.id
        });
        const paused = await service.execute(pauseRequest, {
          authenticatedHumanEmail: humanEmail,
          databaseSession: session(humanSubject, pauseRequest.reason)
        });
        expect(paused).toMatchObject({
          action_id: pauseRequest.action_id,
          action_type: "PAUSE",
          after: {
            status: "PAUSED",
            version: Number(before.version) + 1
          },
          before: {
            status: "ACTIVE",
            version: Number(before.version)
          },
          containment: {
            new_work_leasing: "BLOCKED",
            policy: "FINISH_IN_FLIGHT"
          },
          idempotent_replay: false,
          status: "SUCCEEDED",
          target: {
            business_id: target.businessId,
            entity_id: target.id,
            entity_role: target.role,
            status: "PAUSED",
            version: Number(before.version) + 1
          },
          verification: {
            observed_status: "PAUSED",
            observed_version: Number(before.version) + 1,
            passed: true
          }
        });
        if (target.role !== "SOLDIER") {
          expect(paused.containment.descendants_affected).toBeGreaterThan(0);
        }

        const receipts = await owner.$queryRaw<{
          audits: number;
          events: number;
          outbox: number;
        }[]>`
          SELECT
            (
              SELECT count(*)::integer
              FROM entral.audit_entries
              WHERE governance_action_id = ${pauseRequest.action_id}::uuid
                AND target_type = 'ENTITIES'
                AND target_id = ${target.id}::uuid
            ) AS audits,
            (
              SELECT count(*)::integer
              FROM entral.canonical_events
              WHERE governance_action_id = ${pauseRequest.action_id}::uuid
                AND aggregate_type = 'ENTITIES'
                AND aggregate_id = ${target.id}::uuid
                AND event_type = 'entities.update'
            ) AS events,
            (
              SELECT count(*)::integer
              FROM entral.transactional_outbox outbox
              JOIN entral.canonical_events event ON event.id = outbox.event_id
              WHERE event.governance_action_id = ${pauseRequest.action_id}::uuid
                AND event.aggregate_type = 'ENTITIES'
                AND event.aggregate_id = ${target.id}::uuid
                AND event.event_type = 'entities.update'
            ) AS outbox
        `;
        expect(receipts[0]).toEqual({ audits: 1, events: 1, outbox: 1 });
        const completion = await owner.$queryRaw<{
          aggregateVersion: number;
          governanceActionId: string;
          status: string;
          targetEntityId: string;
        }[]>`
          SELECT
            (payload->>'aggregate_version')::integer AS "aggregateVersion",
            payload->>'governance_action_id' AS "governanceActionId",
            payload->>'status' AS status,
            payload->>'target_entity_id' AS "targetEntityId"
          FROM entral.operational_messages
          WHERE id = ${paused.conversation_message_id}::uuid
        `;
        expect(completion[0]).toEqual({
          aggregateVersion: paused.after.version,
          governanceActionId: pauseRequest.action_id,
          status: "PAUSED",
          targetEntityId: target.id
        });

        const replay = await service.execute(pauseRequest, {
          authenticatedHumanEmail: humanEmail,
          databaseSession: session(humanSubject, pauseRequest.reason)
        });
        expect(replay).toMatchObject({
          action_id: paused.action_id,
          canonical_event: paused.canonical_event,
          idempotent_replay: true
        });
        await expect(service.execute({
          ...pauseRequest,
          reason: "A different request must not reuse this idempotency key."
        }, {
          authenticatedHumanEmail: humanEmail,
          databaseSession: session(humanSubject, "Reject a reused idempotency key.")
        })).rejects.toMatchObject({
          code: "IDEMPOTENCY_KEY_REUSED",
          statusCode: 409
        });

        if (index === 0) {
          await owner.$executeRaw`
            UPDATE entral.schedules
            SET timezone = 'America/Los_Angeles'
            WHERE id = ${existingScheduleId}::uuid
          `;
          const inFlight = await owner.$queryRaw<{ status: string }[]>`
            SELECT status::text AS status
            FROM entral.schedules
            WHERE id = ${existingScheduleId}::uuid
          `;
          expect(inFlight[0]?.status).toBe("ACTIVE");
          await expect(owner.$executeRaw`
            INSERT INTO entral.schedules (
              id, stable_code, owner_entity_id, business_id, mission_template, event_trigger, status
            )
            VALUES (
              ${randomUUID()}::uuid,
              ${`SCHEDULE-BLOCKED-${suffix}`},
              ${soldierId}::uuid,
              ${businessId}::uuid,
              '{}'::jsonb,
              '{"event":"phase190-blocked"}'::jsonb,
              'ACTIVE'
            )
          `).rejects.toThrow(/not eligible to lease new work/i);
        }

        const resumeRequest = lifecycleRequest({
          actionType: "RESUME",
          actorId: humanId,
          businessId: target.businessId,
          expectedVersion: paused.after.version,
          previousStatus: "PAUSED",
          restoresActionId: pauseRequest.action_id,
          targetId: target.id
        });
        const resumed = await service.execute(resumeRequest, {
          authenticatedHumanEmail: humanEmail,
          databaseSession: session(humanSubject, resumeRequest.reason)
        });
        expect(resumed).toMatchObject({
          action_id: resumeRequest.action_id,
          action_type: "RESUME",
          after: {
            status: "ACTIVE",
            version: paused.after.version + 1
          },
          containment: {
            new_work_leasing: "ELIGIBLE",
            policy: "FINISH_IN_FLIGHT"
          },
          restoration_of_action_id: pauseRequest.action_id,
          status: "SUCCEEDED"
        });
        const history = await owner.$queryRaw<{
          actionId: string;
          causationId: string | null;
          status: string;
        }[]>`
          SELECT
            id AS "actionId",
            causation_id AS "causationId",
            status::text AS status
          FROM entral.governance_actions
          WHERE id IN (${pauseRequest.action_id}::uuid, ${resumeRequest.action_id}::uuid)
          ORDER BY requested_at
        `;
        expect(history).toEqual(expect.arrayContaining([
          {
            actionId: pauseRequest.action_id,
            causationId: null,
            status: "ROLLED_BACK"
          },
          {
            actionId: resumeRequest.action_id,
            causationId: pauseRequest.action_id,
            status: "SUCCEEDED"
          }
        ]));

        const historicalReplay = await service.execute(pauseRequest, {
          authenticatedHumanEmail: humanEmail,
          databaseSession: session(humanSubject, pauseRequest.reason)
        });
        expect(historicalReplay).toMatchObject({
          action_id: pauseRequest.action_id,
          after: paused.after,
          idempotent_replay: true
        });
        const current = await owner.$queryRaw<{ status: string; version: bigint }[]>`
          SELECT status::text AS status, version
          FROM entral.entities
          WHERE id = ${target.id}::uuid
        `;
        expect(current[0]).toEqual({
          status: "ACTIVE",
          version: BigInt(resumed.after.version)
        });
        restartReplayRequest ??= pauseRequest;
        restartReplayEventId ??= paused.canonical_event.event_id;
      }

      const soldierState = await owner.$queryRaw<{ status: EntityStatus; version: bigint }[]>`
        SELECT status::text AS status, version
        FROM entral.entities
        WHERE id = ${soldierId}::uuid
      `;
      const currentSoldier = soldierState[0]!;
      const stale = lifecycleRequest({
        actionType: "PAUSE",
        actorId: humanId,
        businessId,
        expectedVersion: Number(currentSoldier.version) - 1,
        previousStatus: currentSoldier.status,
        targetId: soldierId
      });
      await expect(service.execute(stale, {
        authenticatedHumanEmail: humanEmail,
        databaseSession: session(humanSubject, stale.reason)
      })).rejects.toMatchObject({
        code: "STALE_EXPECTED_VERSION",
        statusCode: 409
      });
      const wrongAuthority = lifecycleRequest({
        actionType: "PAUSE",
        actorId: otherHumanId,
        businessId,
        expectedVersion: Number(currentSoldier.version),
        previousStatus: currentSoldier.status,
        targetId: soldierId
      });
      await expect(service.execute(wrongAuthority, {
        authenticatedHumanEmail: humanEmail,
        databaseSession: session(humanSubject, wrongAuthority.reason)
      })).rejects.toMatchObject({
        code: "ACTOR_SESSION_MISMATCH",
        statusCode: 403
      });
      const wrongBusiness = lifecycleRequest({
        actionType: "PAUSE",
        actorId: humanId,
        businessId: otherBusinessId,
        expectedVersion: Number(currentSoldier.version),
        previousStatus: currentSoldier.status,
        targetId: soldierId
      });
      await expect(service.execute(wrongBusiness, {
        authenticatedHumanEmail: humanEmail,
        databaseSession: session(humanSubject, wrongBusiness.reason)
      })).rejects.toMatchObject({
        code: "BUSINESS_SCOPE_MISMATCH",
        statusCode: 409
      });

      const concurrentA = lifecycleRequest({
        actionType: "PAUSE",
        actorId: humanId,
        businessId,
        expectedVersion: Number(currentSoldier.version),
        previousStatus: "ACTIVE",
        targetId: soldierId
      });
      const concurrentB = lifecycleRequest({
        actionType: "PAUSE",
        actorId: humanId,
        businessId,
        expectedVersion: Number(currentSoldier.version),
        previousStatus: "ACTIVE",
        targetId: soldierId
      });
      const concurrent = await Promise.allSettled([
        service.execute(concurrentA, {
          authenticatedHumanEmail: humanEmail,
          databaseSession: session(humanSubject, concurrentA.reason)
        }),
        service.execute(concurrentB, {
          authenticatedHumanEmail: humanEmail,
          databaseSession: session(humanSubject, concurrentB.reason)
        })
      ]);
      const winner = concurrent.find(
        (result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof service.execute>>> =>
          result.status === "fulfilled"
      );
      const loser = concurrent.find(
        (result): result is PromiseRejectedResult => result.status === "rejected"
      );
      expect(winner).toBeDefined();
      expect(loser?.reason).toMatchObject({
        code: "STALE_EXPECTED_VERSION",
        statusCode: 409
      });
      const winningRequest = winner?.value.action_id === concurrentA.action_id
        ? concurrentA
        : concurrentB;
      const concurrencyRestore = lifecycleRequest({
        actionType: "RESUME",
        actorId: humanId,
        businessId,
        expectedVersion: winner!.value.after.version,
        previousStatus: "PAUSED",
        restoresActionId: winningRequest.action_id,
        targetId: soldierId
      });
      await expect(service.execute(concurrencyRestore, {
        authenticatedHumanEmail: humanEmail,
        databaseSession: session(humanSubject, concurrencyRestore.reason)
      })).resolves.toMatchObject({
        after: { status: "ACTIVE" },
        restoration_of_action_id: winningRequest.action_id
      });

      const versionBeforeDispatch = await owner.$queryRaw<{ version: bigint }[]>`
        SELECT version FROM entral.entities WHERE id = ${soldierId}::uuid
      `;
      process.env.DATABASE_URL = databaseUrl.toString();
      process.env.JWT_SECRET = "phase190-postgres-integration-only-secret";
      const { dispatchCanonicalOutboxBatch } = await import(
        "../src/services/canonicalOutboxWorker.js"
      );
      let firstFailedOutboxId: string | null = null;
      const publicationAttempts: string[] = [];
      const firstDispatch = await dispatchCanonicalOutboxBatch({
        batchSize: 1_000,
        database: worker,
        lockDurationMs: 10_000,
        maxAttempts: 3,
        publisher: {
          publish: async (event) => {
            publicationAttempts.push(event.id);
            if (!firstFailedOutboxId) {
              firstFailedOutboxId = event.id;
              throw new Error("Simulated crash after claiming one event.");
            }
          }
        },
        retryBaseDelayMs: 1,
        retryMaxDelayMs: 10,
        serviceAppUserId: workerUserId,
        workerId: `phase190-worker-${suffix}`
      });
      expect(firstDispatch.failed).toBe(1);
      expect(firstDispatch.published).toBeGreaterThan(0);
      await owner.$executeRaw`
        UPDATE entral.transactional_outbox
        SET available_at = clock_timestamp() - interval '1 second'
        WHERE id = ${firstFailedOutboxId}::uuid
          AND status = 'FAILED'
      `;
      const secondDispatch = await dispatchCanonicalOutboxBatch({
        batchSize: 1_000,
        database: worker,
        lockDurationMs: 10_000,
        maxAttempts: 3,
        publisher: {
          publish: async (event) => {
            publicationAttempts.push(event.id);
          }
        },
        retryBaseDelayMs: 1,
        retryMaxDelayMs: 10,
        serviceAppUserId: workerUserId,
        workerId: `phase190-worker-retry-${suffix}`
      });
      expect(secondDispatch).toMatchObject({
        claimed: 1,
        failed: 0,
        published: 1
      });
      expect(publicationAttempts.filter((id) => id === firstFailedOutboxId)).toHaveLength(2);
      const versionAfterDispatch = await owner.$queryRaw<{ version: bigint }[]>`
        SELECT version FROM entral.entities WHERE id = ${soldierId}::uuid
      `;
      expect(versionAfterDispatch[0]?.version).toBe(versionBeforeDispatch[0]?.version);

      await api.$disconnect();
      api = new PrismaClient({
        datasources: { db: { url: loginUrl(databaseUrl, apiRole, apiPassword) } }
      });
      const restartedService = new CanonicalEntityLifecycleService(api);
      const restartReplay = await restartedService.execute(restartReplayRequest!, {
        authenticatedHumanEmail: humanEmail,
        databaseSession: session(humanSubject, restartReplayRequest!.reason)
      });
      expect(restartReplay).toMatchObject({
        canonical_event: { event_id: restartReplayEventId },
        idempotent_replay: true
      });
    } finally {
      await api?.$disconnect();
      await worker?.$disconnect();
      await owner?.$disconnect();
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity ` +
        `WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
      );
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${apiRole}"`);
      await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${workerRole}"`);
      await admin.$disconnect();
      if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previousDatabaseUrl;
      if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousJwtSecret;
    }
  }, 180_000);
});
