import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { assertPhase202WorkerAuthority } from "../src/services/phase202WorkerAuthority.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(
  testDatabaseUrl
  && process.env.RUN_POSTGRES_INTEGRATION === "1"
);

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

function loginUrl(
  databaseUrl: URL,
  role: string,
  password: string,
  workerAppUserId?: string
) {
  const url = new URL(databaseUrl);
  url.username = role;
  url.password = password;
  url.searchParams.set("connection_limit", "2");
  if (workerAppUserId) {
    const existingOptions = url.searchParams.get("options")?.trim();
    url.searchParams.set(
      "options",
      [existingOptions, `-c app.phase202_worker_app_user_id=${workerAppUserId}`]
        .filter(Boolean)
        .join(" ")
    );
  }
  return url.toString();
}

describe.skipIf(!integrationEnabled)("Phase 202 tenant-bound worker authority", () => {
  it("binds worker authority to the real SERVICE actor and grant and fails closed otherwise", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const databaseName = `entral_p202_worker_${suffix}`;
    const workerRole = `entral_p202_worker_login_${suffix}`;
    const invalidWorkerRole = `entral_p202_invalid_worker_${suffix}`;
    const apiRole = `entral_p202_api_login_${suffix}`;
    const workerPassword = randomUUID();
    const invalidWorkerPassword = randomUUID();
    const apiPassword = randomUUID();
    const validServiceAppUserId = randomUUID();
    const invalidServiceAppUserId = randomUUID();
    const serviceActorId = randomUUID();
    const humanOwnerActorId = randomUUID();
    const humanOwnerUserId = `phase202-human-owner-${suffix}`;
    const automationJobId = `phase202-worker-job-${suffix}`;
    const rejectedAutomationJobId = `phase202-worker-rejected-job-${suffix}`;
    const workerAuditId = `phase202-worker-audit-${suffix}`;
    const tenantBServiceAppUserId = randomUUID();
    const tenantBServiceActorId = randomUUID();
    const notificationEvidenceId = randomUUID();
    const notificationDeliveryId = randomUUID();
    const notificationSecretId = randomUUID();
    const tenantId = randomUUID();
    const organizationId = randomUUID();
    const teamId = `phase202-worker-${suffix}`;
    const tenantBNotificationEvidenceId = randomUUID();
    const tenantBNotificationDeliveryId = randomUUID();
    const tenantBNotificationSecretId = randomUUID();
    const tenantBId = randomUUID();
    const tenantBOrganizationId = randomUUID();
    const tenantBTeamId = `phase202-worker-b-${suffix}`;
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const databaseUrl = new URL(baseUrl);
    databaseUrl.pathname = `/${databaseName}`;
    databaseUrl.searchParams.delete("schema");
    const admin = new PrismaClient({
      datasources: { db: { url: adminUrl.toString() } }
    });
    const clients: PrismaClient[] = [];

    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
      const prismaCli = fileURLToPath(
        new URL("../../node_modules/prisma/build/index.js", import.meta.url)
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        ["migrate", "deploy", "--schema", "prisma/schema.prisma"],
        "Phase 202 disposable PostgreSQL migration"
      );
      for (const securityFile of [
        "prisma/security/046_roles_and_grants.sql",
        "prisma/security/047_phase_195_roles_and_grants.sql",
        "prisma/security/048_phase_202_roles_and_grants.sql"
      ]) {
        runPrisma(
          prismaCli,
          repositoryRoot,
          databaseUrl.toString(),
          ["db", "execute", "--file", securityFile, "--schema", "prisma/schema.prisma"],
          `Phase 202 disposable role deployment (${securityFile})`
        );
      }

      for (const [role, password, inheritedRole] of [
        [workerRole, workerPassword, "entral_worker"],
        [invalidWorkerRole, invalidWorkerPassword, "entral_worker"],
        [apiRole, apiPassword, "entral_api"]
      ]) {
        await admin.$executeRawUnsafe(
          `CREATE ROLE "${role}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS `
          + `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${password}'`
        );
        await admin.$executeRawUnsafe(`GRANT ${inheritedRole} TO "${role}"`);
      }

      const owner = new PrismaClient({
        datasources: { db: { url: databaseUrl.toString() } }
      });
      clients.push(owner);
      await owner.$executeRaw`
        INSERT INTO public."Team" (
          "id","organizationId","tenantId","name","slug","environment","dataResidency","updatedAt"
        ) VALUES
          (
            ${teamId},${organizationId}::uuid,${tenantId}::uuid,
            'Phase 202 Worker Tenant A',${`phase202-worker-${suffix}`},'PRODUCTION','US',now()
          ),
          (
            ${tenantBTeamId},${tenantBOrganizationId}::uuid,${tenantBId}::uuid,
            'Phase 202 Worker Tenant B',${`phase202-worker-b-${suffix}`},'PRODUCTION','US',now()
          )
      `;
      await owner.$executeRaw`
        INSERT INTO public."TenantBoundary" (
          "id","organizationId","legacyTeamId","environment","dataResidency"
        ) VALUES
          (${tenantId}::uuid,${organizationId}::uuid,${teamId},'PRODUCTION','US'),
          (${tenantBId}::uuid,${tenantBOrganizationId}::uuid,${tenantBTeamId},'PRODUCTION','US')
      `;
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id,email,display_name,is_human_authority,is_active,auth_subject,auth_link_eligible
        ) VALUES
          (
            ${validServiceAppUserId}::uuid,
            ${`phase202-valid-worker-${suffix}@example.test`},
            'Phase 202 Valid Worker',false,true,NULL,false
          ),
          (
            ${invalidServiceAppUserId}::uuid,
            ${`phase202-invalid-worker-${suffix}@example.test`},
            'Phase 202 Invalid Worker',false,true,NULL,false
          ),
          (
            ${tenantBServiceAppUserId}::uuid,
            ${`phase202-tenant-b-service-${suffix}@example.test`},
            'Phase 202 Tenant B Service',false,true,NULL,false
          )
      `;
      await owner.$executeRaw`
        INSERT INTO public."User" ("id","name","email","passwordHash","updatedAt")
        VALUES (
          ${humanOwnerUserId},'Phase 202 Human Source Owner',
          ${`phase202-human-owner-${suffix}@example.test`},'not-a-real-password-hash',now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."IdentityActor" (
          "id","actorType","humanUserId","serviceSubject","status"
        )
        VALUES
          (
            ${serviceActorId}::uuid,'SERVICE',NULL,
            ${`canonical-app-user:${validServiceAppUserId}`},'ACTIVE'
          ),
          (
            ${tenantBServiceActorId}::uuid,'SERVICE',NULL,
            ${`canonical-app-user:${tenantBServiceAppUserId}`},'ACTIVE'
          ),
          (
            ${humanOwnerActorId}::uuid,'HUMAN',${humanOwnerUserId},NULL,'ACTIVE'
          )
      `;
      await owner.$executeRaw`
        INSERT INTO public."TenantActorAssignment" (
          "actorId","organizationId","tenantId","role","authorityDomains","status"
        ) VALUES
          (
            ${serviceActorId}::uuid,${organizationId}::uuid,${tenantId}::uuid,
            'SERVICE',ARRAY['OPERATIONS']::text[],'ACTIVE'
          ),
          (
            ${tenantBServiceActorId}::uuid,${tenantBOrganizationId}::uuid,${tenantBId}::uuid,
            'SERVICE',ARRAY['OPERATIONS']::text[],'ACTIVE'
          ),
          (
            ${humanOwnerActorId}::uuid,${organizationId}::uuid,${tenantId}::uuid,
            'OWNER',ARRAY['IDENTITY','OPERATIONS','FINANCE','INTEGRATIONS']::text[],'ACTIVE'
          )
      `;
      await owner.$executeRaw`
        INSERT INTO public."TeamMember" ("userId","teamId","role","status","updatedAt")
        VALUES (${humanOwnerUserId},${teamId},'OWNER','ACTIVE',now())
      `;
      await owner.$executeRaw`
        INSERT INTO entral.scope_grants (user_id,scope_type,scope_id,permissions)
        VALUES (
          ${validServiceAppUserId}::uuid,'SYSTEM',NULL,
          ARRAY['worker','publish_events']::text[]
        )
      `;
      const workerAssignments = await owner.$queryRaw<Array<{ tenantId: string }>>`
        SELECT assignment."tenantId"::text AS "tenantId"
        FROM public."TenantActorAssignment" assignment
        WHERE assignment."actorId"=${serviceActorId}::uuid
        ORDER BY assignment."tenantId"
      `;
      expect(workerAssignments).toEqual([{ tenantId }]);

      const worker = new PrismaClient({
        datasources: {
          db: {
            url: loginUrl(
              databaseUrl,
              workerRole,
              workerPassword,
              validServiceAppUserId
            )
          }
        }
      });
      const invalidWorker = new PrismaClient({
        datasources: {
          db: {
            url: loginUrl(
              databaseUrl,
              invalidWorkerRole,
              invalidWorkerPassword,
              invalidServiceAppUserId
            )
          }
        }
      });
      const spoofingApi = new PrismaClient({
        datasources: {
          db: {
            url: loginUrl(databaseUrl, apiRole, apiPassword, validServiceAppUserId)
          }
        }
      });
      clients.push(worker, invalidWorker, spoofingApi);

      const validWorkerFacts = await worker.$queryRaw<Array<{
        boundAppUserId: string;
        inheritsWorker: boolean;
        ready: boolean;
      }>>`
        SELECT
          current_setting('app.phase202_worker_app_user_id',true) AS "boundAppUserId",
          pg_has_role(session_user,'entral_worker','USAGE') AS "inheritsWorker",
          entral.phase202_worker_runtime_ready() AS "ready"
      `;
      expect(validWorkerFacts).toEqual([{
        boundAppUserId: validServiceAppUserId,
        inheritsWorker: true,
        ready: true
      }]);
      await expect(assertPhase202WorkerAuthority({
        database: worker,
        serviceAppUserId: validServiceAppUserId
      })).resolves.toBeUndefined();

      await expect(worker.$executeRaw`
        INSERT INTO public."AutomationJob" (
          "id","userId","type","status","payloadJson","organizationId","tenantId",
          "actorId","createdBy","ownedBy","updatedAt"
        ) VALUES (
          ${rejectedAutomationJobId},${humanOwnerUserId},'PHASE_202_PROVENANCE',
          'pending','{}',${tenantBOrganizationId}::uuid,${tenantBId}::uuid,
          ${humanOwnerActorId}::uuid,${humanOwnerActorId}::uuid,${humanOwnerActorId}::uuid,now()
        )
      `).rejects.toThrow();

      await worker.$executeRaw`
        INSERT INTO public."AutomationJob" (
          "id","userId","type","status","payloadJson","organizationId","tenantId",
          "actorId","createdBy","ownedBy","updatedAt"
        ) VALUES (
          ${automationJobId},${humanOwnerUserId},'PHASE_202_PROVENANCE',
          'pending','{}',${organizationId}::uuid,${tenantId}::uuid,
          ${humanOwnerActorId}::uuid,${humanOwnerActorId}::uuid,${serviceActorId}::uuid,now()
        )
      `;
      const createdJobProvenance = await owner.$queryRaw<Array<{
        actorId: string;
        actorType: string;
        createdBy: string;
        organizationId: string;
        ownedBy: string;
        sidecarActorId: string;
        sidecarCreatedBy: string;
        sidecarOwnedBy: string;
        tenantId: string;
      }>>`
        SELECT job."actorId"::text AS "actorId",actor."actorType" AS "actorType",
               job."createdBy"::text AS "createdBy",job."ownedBy"::text AS "ownedBy",
               job."organizationId"::text AS "organizationId",job."tenantId"::text AS "tenantId",
               ownership."actorId"::text AS "sidecarActorId",
               ownership."createdBy"::text AS "sidecarCreatedBy",
               ownership."ownedBy"::text AS "sidecarOwnedBy"
        FROM public."AutomationJob" job
        JOIN public."IdentityActor" actor ON actor."id"=job."actorId"
        JOIN public."CustomerRecordOwnership" ownership
          ON ownership."sourceTable"='AutomationJob' AND ownership."sourceRecordId"=job."id"
        WHERE job."id"=${automationJobId}
      `;
      expect(createdJobProvenance).toEqual([{
        actorId: serviceActorId,
        actorType: "SERVICE",
        createdBy: serviceActorId,
        organizationId,
        ownedBy: humanOwnerActorId,
        sidecarActorId: serviceActorId,
        sidecarCreatedBy: serviceActorId,
        sidecarOwnedBy: humanOwnerActorId,
        tenantId
      }]);

      await worker.$executeRaw`
        UPDATE public."AutomationJob"
        SET "status"='completed',"resultJson"='{"verified":true}',
            "actorId"=${humanOwnerActorId}::uuid,
            "createdBy"=${humanOwnerActorId}::uuid,
            "ownedBy"=${serviceActorId}::uuid,
            "updatedAt"=now()
        WHERE "id"=${automationJobId}
      `;
      const mutatedJobProvenance = await owner.$queryRaw<Array<{
        actorId: string;
        createdBy: string;
        ownedBy: string;
        sidecarActorId: string;
        sidecarCreatedBy: string;
        sidecarOwnedBy: string;
        status: string;
      }>>`
        SELECT job."actorId"::text AS "actorId",job."createdBy"::text AS "createdBy",
               job."ownedBy"::text AS "ownedBy",job."status",
               ownership."actorId"::text AS "sidecarActorId",
               ownership."createdBy"::text AS "sidecarCreatedBy",
               ownership."ownedBy"::text AS "sidecarOwnedBy"
        FROM public."AutomationJob" job
        JOIN public."CustomerRecordOwnership" ownership
          ON ownership."sourceTable"='AutomationJob' AND ownership."sourceRecordId"=job."id"
        WHERE job."id"=${automationJobId}
      `;
      expect(mutatedJobProvenance).toEqual([{
        actorId: serviceActorId,
        createdBy: serviceActorId,
        ownedBy: humanOwnerActorId,
        sidecarActorId: serviceActorId,
        sidecarCreatedBy: serviceActorId,
        sidecarOwnedBy: humanOwnerActorId,
        status: "completed"
      }]);

      await worker.$executeRaw`
        INSERT INTO public."AuditLog" (
          "id","actorUserId","action","targetType","targetId","outcome","severity",
          "entryJson","entryHash","scopeKind","scopeResolution","organizationId","tenantId",
          "actorId","createdBy","ownedBy"
        ) VALUES (
          ${workerAuditId},${humanOwnerUserId},'PHASE_202_WORKER_CUSTOMER_RECORD_MUTATED',
          'AutomationJob',${automationJobId},'success','info','{"verified":true}',${"c".repeat(64)},
          'TENANT','FORGED_HUMAN_PROVENANCE',${tenantBOrganizationId}::uuid,${tenantBId}::uuid,
          ${humanOwnerActorId}::uuid,${humanOwnerActorId}::uuid,${humanOwnerActorId}::uuid
        )
      `;
      const auditProvenance = await owner.$queryRaw<Array<{
        actorId: string;
        actorType: string;
        actorUserId: string | null;
        createdBy: string;
        organizationId: string;
        ownedBy: string;
        scopeKind: string;
        sidecarActorId: string;
        sidecarCreatedBy: string;
        sidecarOwnedBy: string;
        tenantId: string;
      }>>`
        SELECT audit."actorId"::text AS "actorId",actor."actorType" AS "actorType",
               audit."actorUserId" AS "actorUserId",audit."createdBy"::text AS "createdBy",
               audit."ownedBy"::text AS "ownedBy",audit."scopeKind",
               audit."organizationId"::text AS "organizationId",audit."tenantId"::text AS "tenantId",
               ownership."actorId"::text AS "sidecarActorId",
               ownership."createdBy"::text AS "sidecarCreatedBy",
               ownership."ownedBy"::text AS "sidecarOwnedBy"
        FROM public."AuditLog" audit
        JOIN public."IdentityActor" actor ON actor."id"=audit."actorId"
        JOIN public."CustomerRecordOwnership" ownership
          ON ownership."sourceTable"='AuditLog' AND ownership."sourceRecordId"=audit."id"
        WHERE audit."id"=${workerAuditId}
      `;
      expect(auditProvenance).toEqual([{
        actorId: serviceActorId,
        actorType: "SERVICE",
        actorUserId: null,
        createdBy: serviceActorId,
        organizationId,
        ownedBy: serviceActorId,
        scopeKind: "TENANT",
        sidecarActorId: serviceActorId,
        sidecarCreatedBy: serviceActorId,
        sidecarOwnedBy: serviceActorId,
        tenantId
      }]);

      const encryptedDeliveryCommand = JSON.stringify({
        __entralEncrypted: true,
        alg: "aes-256-gcm",
        data: "cGhhc2UyMDI=",
        environment: "PRODUCTION",
        iv: "cGhhc2UyMDI=",
        keyVersion: "v1",
        tag: "cGhhc2UyMDI=",
        v: 2
      });
      await owner.$executeRaw`
        INSERT INTO public."NotificationEvidence" (
          "id","organizationId","tenantId","channel","recipientHash",
          "templateId","status","occurredAt"
        ) VALUES
          (
            ${notificationEvidenceId}::uuid,${organizationId}::uuid,${tenantId}::uuid,
            'EMAIL',${"a".repeat(64)},'phase202-membership-invitation-v1','PENDING',now()
          ),
          (
            ${tenantBNotificationEvidenceId}::uuid,${tenantBOrganizationId}::uuid,${tenantBId}::uuid,
            'EMAIL',${"b".repeat(64)},'phase202-membership-invitation-v1','PENDING',now()
          )
      `;
      await owner.$executeRaw`
        INSERT INTO public."SecretReference" (
          "id","organizationId","tenantId","provider","purpose","environment",
          "keyVersion","encryptedValue","version","createdByActorId","updatedAt"
        ) VALUES
          (
            ${notificationSecretId}::uuid,${organizationId}::uuid,${tenantId}::uuid,
            'resend','membership-email-delivery','PRODUCTION','v1',${encryptedDeliveryCommand},
            1,${serviceActorId}::uuid,now()
          ),
          (
            ${tenantBNotificationSecretId}::uuid,${tenantBOrganizationId}::uuid,${tenantBId}::uuid,
            'resend','membership-email-delivery','PRODUCTION','v1',${encryptedDeliveryCommand},
            1,${tenantBServiceActorId}::uuid,now()
          )
      `;
      await owner.$executeRaw`
        INSERT INTO public."NotificationDeliveryOutbox" (
          "id","organizationId","tenantId","notificationEvidenceId","secretReferenceId",
          "deliveryKind","status","attempts","availableAt","deadlineAt","updatedAt"
        ) VALUES
          (
            ${notificationDeliveryId}::uuid,${organizationId}::uuid,${tenantId}::uuid,
            ${notificationEvidenceId}::uuid,${notificationSecretId}::uuid,
            'INVITATION','PENDING',0,now(),now()+interval '22 hours',now()
          ),
          (
            ${tenantBNotificationDeliveryId}::uuid,${tenantBOrganizationId}::uuid,${tenantBId}::uuid,
            ${tenantBNotificationEvidenceId}::uuid,${tenantBNotificationSecretId}::uuid,
            'INVITATION','PENDING',0,now(),now()+interval '22 hours',now()
          )
      `;
      await expect(spoofingApi.$queryRaw`
        SELECT * FROM entral.phase202_claim_notification_deliveries('spoofed-api',1,60000)
      `).rejects.toThrow();
      const claimed = await worker.$queryRaw<Array<{
        attempts: number;
        deliveryId: string;
        encryptedValue: string;
        secretReferenceId: string;
      }>>`
        SELECT * FROM entral.phase202_claim_notification_deliveries(
          ${`phase202-worker:${suffix}`},10,60000
        )
      `;
      expect(claimed).toHaveLength(1);
      expect(claimed[0]).toMatchObject({
        attempts: 1,
        deliveryId: notificationDeliveryId,
        secretReferenceId: notificationSecretId
      });
      expect(claimed[0]?.encryptedValue).toBe(encryptedDeliveryCommand);
      await expect(worker.$queryRaw`
        SELECT entral.phase202_complete_notification_delivery(
          ${notificationDeliveryId}::uuid,${`phase202-worker:${suffix}`},
          'PROVIDER_ACCEPTED','phase202-provider-message'
        )
      `).resolves.toBeDefined();
      const deliveryReadback = await owner.$queryRaw<Array<{
        auditCount: bigint;
        deliveryId: string;
        evidenceStatus: string;
        outboxStatus: string;
        secretRevoked: boolean;
        tenantId: string;
      }>>`
        SELECT delivery."id"::text AS "deliveryId",delivery."tenantId"::text AS "tenantId",
               delivery."status" AS "outboxStatus",evidence."status" AS "evidenceStatus",
               secret."revokedAt" IS NOT NULL AS "secretRevoked",
               (SELECT count(*) FROM public."SecretAccessAudit" audit
                WHERE audit."secretReferenceId"=secret."id") AS "auditCount"
        FROM public."NotificationDeliveryOutbox" delivery
        JOIN public."NotificationEvidence" evidence ON evidence."id"=delivery."notificationEvidenceId"
        JOIN public."SecretReference" secret ON secret."id"=delivery."secretReferenceId"
        WHERE delivery."id" IN (
          ${notificationDeliveryId}::uuid,
          ${tenantBNotificationDeliveryId}::uuid
        )
        ORDER BY CASE WHEN delivery."id"=${notificationDeliveryId}::uuid THEN 0 ELSE 1 END
      `;
      expect(deliveryReadback).toEqual([
        {
          auditCount: 1n,
          deliveryId: notificationDeliveryId,
          evidenceStatus: "PROVIDER_ACCEPTED",
          outboxStatus: "PROVIDER_ACCEPTED",
          secretRevoked: true,
          tenantId
        },
        {
          auditCount: 0n,
          deliveryId: tenantBNotificationDeliveryId,
          evidenceStatus: "PENDING",
          outboxStatus: "PENDING",
          secretRevoked: false,
          tenantId: tenantBId
        }
      ]);

      const invalidWorkerFacts = await invalidWorker.$queryRaw<Array<{ ready: boolean }>>`
        SELECT entral.phase202_worker_runtime_ready() AS "ready"
      `;
      expect(invalidWorkerFacts).toEqual([{ ready: false }]);
      await expect(assertPhase202WorkerAuthority({
        database: invalidWorker,
        serviceAppUserId: invalidServiceAppUserId
      })).rejects.toThrow(
        "Worker authority startup probe denied the configured service identity."
      );

      const apiFacts = await spoofingApi.$queryRaw<Array<{
        boundAppUserId: string;
        inheritsWorker: boolean;
      }>>`
        SELECT
          current_setting('app.phase202_worker_app_user_id',true) AS "boundAppUserId",
          pg_has_role(session_user,'entral_worker','USAGE') AS "inheritsWorker"
      `;
      expect(apiFacts).toEqual([{
        boundAppUserId: validServiceAppUserId,
        inheritsWorker: false
      }]);
      await expect(assertPhase202WorkerAuthority({
        database: spoofingApi,
        serviceAppUserId: validServiceAppUserId
      })).rejects.toThrow(
        "Worker authority startup probe could not query the worker authority boundary."
      );

      await expect(invalidWorker.$transaction(async (transaction) => {
        await transaction.$queryRaw`
          SELECT entral.bind_service_app_user(${invalidServiceAppUserId}::uuid)
        `;
        await transaction.$executeRaw`
          INSERT INTO entral.worker_readiness_heartbeats (
            instance_id,service_app_user_id,service_name,process_role,status,
            components,started_at,heartbeat_at
          ) VALUES (
            ${`phase202-invalid-worker-${suffix}`},${invalidServiceAppUserId}::uuid,
            'entral-worker','WORKER','READY',
            ${JSON.stringify({
              process: true,
              automation_worker: true,
              agent_orchestrator: true,
              autonomy_scheduler: true,
              canonical_outbox_dispatcher: true,
              membership_notification_dispatcher: true
            })}::jsonb,
            now(),now()
          )
        `;
      })).rejects.toThrow();
      const readiness = await spoofingApi.$queryRaw<Array<{ status: string }>>`
        SELECT readiness_status AS "status"
        FROM entral.public_worker_readiness()
      `;
      expect(readiness).toEqual([{ status: "UNAVAILABLE" }]);

      await owner.$executeRaw`
        DELETE FROM entral.scope_grants
        WHERE user_id=${validServiceAppUserId}::uuid AND scope_type='SYSTEM'
      `;
      const revokedGrantFacts = await worker.$queryRaw<Array<{ ready: boolean }>>`
        SELECT entral.phase202_worker_runtime_ready() AS "ready"
      `;
      expect(revokedGrantFacts).toEqual([{ ready: false }]);
      await expect(assertPhase202WorkerAuthority({
        database: worker,
        serviceAppUserId: validServiceAppUserId
      })).rejects.toThrow(
        "Worker authority startup probe denied the configured service identity."
      );
    } finally {
      await Promise.allSettled(clients.map((client) => client.$disconnect()));
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity `
        + `WHERE datname='${databaseName}' AND pid<>pg_backend_pid()`
      );
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      for (const role of [workerRole, invalidWorkerRole, apiRole]) {
        await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${role}"`);
      }
      await admin.$disconnect();
    }
  }, 180_000);
});
