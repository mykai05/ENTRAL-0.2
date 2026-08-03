import { randomUUID } from "node:crypto";
import {
  cpSync,
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildGraphProjection } from "@entral/contracts";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NODE_ENV ??= "test";
  process.env.DATABASE_URL ??= "file:./phase203-production-graph-recovery-skipped.db";
  process.env.JWT_SECRET ??= "phase203-production-graph-recovery-test-secret";
});

import { withTenantSession } from "../src/db.js";
import { CanonicalControlPlaneRepository } from "../src/services/canonicalControlPlane.js";
import { recordAuditLog } from "../src/services/audit.js";

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

function loginUrl(databaseUrl: URL, role: string, password: string) {
  const url = new URL(databaseUrl);
  url.username = role;
  url.password = password;
  url.searchParams.set("connection_limit", "4");
  return url.toString();
}

describe.skipIf(!integrationEnabled)("Phase 203 migrated-account production graph recovery", () => {
  it("fails on the Phase 202 boundary and restores only the shared canonical taxonomy after the forward repair", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const databaseName = `entral_p203_graph_recovery_${suffix}`;
    const apiRole = `entral_p203_graph_api_${suffix}`;
    const apiPassword = randomUUID();
    const migratedUserId = `phase203-migrated-owner-${suffix}`;
    const migratedMemberId = `phase203-migrated-member-${suffix}`;
    const migratedTeamId = `phase203-migrated-team-${suffix}`;
    const rootId = randomUUID();
    const marshalId = randomUUID();
    const generalId = randomUUID();
    const privateCommanderId = randomUUID();
    const privateBusinessId = randomUUID();
    const privateBusinessBoundaryId = randomUUID();
    const tenantBUserId = `phase203-tenant-b-${suffix}`;
    const tenantBTeamId = `phase203-tenant-b-team-${suffix}`;
    const tenantBActorId = randomUUID();
    const tenantBTenantId = randomUUID();
    const tenantBOrganizationId = randomUUID();
    const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
    const prismaCli = fileURLToPath(
      new URL("../../node_modules/prisma/build/index.js", import.meta.url)
    );
    const sourceMigrations = join(repositoryRoot, "prisma", "migrations");
    const stagedPrisma = mkdtempSync(join(tmpdir(), "entral-p203-graph-recovery-"));
    const stagedMigrations = join(stagedPrisma, "migrations");
    const stagedSchema = join(stagedPrisma, "schema.prisma");
    mkdirSync(stagedMigrations);
    copyFileSync(join(repositoryRoot, "prisma", "schema.prisma"), stagedSchema);
    cpSync(join(sourceMigrations, "migration_lock.toml"), join(stagedMigrations, "migration_lock.toml"), {
      recursive: true
    });
    for (const migration of readdirSync(sourceMigrations)) {
      if (migration <= "20260802023000_phase_200_interaction_layer") {
        cpSync(join(sourceMigrations, migration), join(stagedMigrations, migration), { recursive: true });
      }
    }

    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const isolatedUrl = new URL(baseUrl);
    isolatedUrl.pathname = `/${databaseName}`;
    isolatedUrl.searchParams.delete("schema");
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    let owner: PrismaClient | null = null;
    let api: PrismaClient | null = null;
    let databaseCreated = false;
    let apiRoleCreated = false;

    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      databaseCreated = true;
      runPrisma(
        prismaCli,
        repositoryRoot,
        isolatedUrl.toString(),
        ["migrate", "deploy", "--schema", stagedSchema],
        "Phase 200 disposable migration baseline"
      );

      owner = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
      await owner.$executeRaw`
        INSERT INTO public."User" (
          "id","name","email","passwordHash","role","internalAccess",
          "sessionVersion","createdAt","updatedAt"
        ) VALUES (
          ${migratedUserId},'Migrated Sovereign Owner',${`p203-migrated-${suffix}@example.test`},
          'integration-password-hash','ADMIN',true,0,now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."User" (
          "id","name","email","passwordHash","role","internalAccess",
          "sessionVersion","createdAt","updatedAt"
        ) VALUES (
          ${migratedMemberId},'Migrated Sovereign Member',${`p203-member-${suffix}@example.test`},
          'integration-password-hash','USER',false,0,now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."Team" (
          "id","name","slug","memberAccessEnabled","memberSeatLimit","createdAt","updatedAt"
        ) VALUES (
          ${migratedTeamId},'Sovereign Protocol',${`p203-migrated-${suffix}`},true,5,now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."TeamMember" ("userId","teamId","role","joinedAt")
        VALUES (${migratedUserId},${migratedTeamId},'OWNER',now())
      `;
      await owner.$executeRaw`
        INSERT INTO public."TeamMember" ("userId","teamId","role","joinedAt")
        VALUES (${migratedMemberId},${migratedTeamId},'MEMBER',now())
      `;
      await owner.$executeRaw`
        INSERT INTO public."MemberTutorialProgress" (
          "id","userId","organizationId","releaseVersion","roleContext","mode",
          "completedAnchorIds","firstLaunchSeen","revision","startedAt","createdAt","updatedAt"
        ) VALUES (
          ${`phase203-tutorial-${suffix}`},${migratedUserId},${migratedTeamId},'phase-200',
          'OWNER','beginner',ARRAY[]::text[],true,1,now(),now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."MemberTutorialProgress" (
          "id","userId","organizationId","releaseVersion","roleContext","mode",
          "completedAnchorIds","firstLaunchSeen","revision","startedAt","createdAt","updatedAt"
        ) VALUES (
          ${`phase203-member-tutorial-${suffix}`},${migratedMemberId},${migratedTeamId},'phase-200',
          'MEMBER','beginner',ARRAY[]::text[],true,1,now(),now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.entities (id,stable_code,role,name,parent_id,status)
        VALUES
          (${rootId}::uuid,${`p203-root-${suffix}`},'ENTRAL','ENTRAL',NULL,'ACTIVE'),
          (${marshalId}::uuid,${`p203-marshal-${suffix}`},'MARSHAL','Operations',${rootId}::uuid,'ACTIVE'),
          (${generalId}::uuid,${`p203-general-${suffix}`},'GENERAL','Sovereign Protocol',${marshalId}::uuid,'ACTIVE')
      `;
      await owner.$disconnect();
      owner = null;

      cpSync(
        join(sourceMigrations, "20260802090000_phase_202_identity_tenancy_authority"),
        join(stagedMigrations, "20260802090000_phase_202_identity_tenancy_authority"),
        { recursive: true }
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        isolatedUrl.toString(),
        ["migrate", "deploy", "--schema", stagedSchema],
        "Phase 202 migrated-account boundary"
      );
      for (const securityFile of [
        "prisma/security/046_roles_and_grants.sql",
        "prisma/security/047_phase_195_roles_and_grants.sql",
        "prisma/security/048_phase_202_roles_and_grants.sql"
      ]) {
        runPrisma(
          prismaCli,
          repositoryRoot,
          isolatedUrl.toString(),
          ["db", "execute", "--file", securityFile, "--schema", stagedSchema],
          `Phase 203 graph recovery role deployment (${securityFile})`
        );
      }
      await admin.$executeRawUnsafe(
        `CREATE ROLE "${apiRole}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS `
        + `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${apiPassword}'`
      );
      apiRoleCreated = true;
      await admin.$executeRawUnsafe(`GRANT entral_api TO "${apiRole}"`);

      owner = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
      const migratedScope = await owner.$queryRaw<Array<{
        actorId: string;
        organizationId: string;
        tenantId: string;
      }>>`
        SELECT assignment."actorId"::text AS "actorId",
               assignment."organizationId"::text AS "organizationId",
               assignment."tenantId"::text AS "tenantId"
        FROM public."TenantActorAssignment" assignment
        JOIN public."IdentityActor" actor ON actor."id"=assignment."actorId"
        WHERE actor."humanUserId"=${migratedUserId}
      `;
      expect(migratedScope).toHaveLength(1);
      const migrated = migratedScope[0]!;

      await owner.$queryRaw`
        SELECT * FROM entral.phase202_provision_tenant_owner(
          ${tenantBUserId},'Tenant B Owner',${`p203-tenant-b-${suffix}@example.test`},
          'integration-password-hash',${tenantBTeamId},'Tenant B',${`p203-tenant-b-${suffix}`},
          ${tenantBOrganizationId}::uuid,${tenantBTenantId}::uuid,${tenantBActorId}::uuid
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.entities (id,stable_code,role,name,parent_id,status)
        VALUES (
          ${privateCommanderId}::uuid,${`p203-private-commander-${suffix}`},'COMMANDER',
          'Tenant B Commander',${generalId}::uuid,'ACTIVE'
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.businesses (
          id,stable_code,name,commander_id,general_id,marshal_id,status
        ) VALUES (
          ${privateBusinessId}::uuid,${`p203-private-business-${suffix}`},'Tenant B Business',
          ${privateCommanderId}::uuid,${generalId}::uuid,${marshalId}::uuid,'OPERATING'
        )
      `;
      await owner.$executeRaw`
        UPDATE entral.entities SET business_id=${privateBusinessId}::uuid
        WHERE id=${privateCommanderId}::uuid
      `;
      await owner.$executeRaw`
        INSERT INTO public."BusinessBoundary" (
          "id","organizationId","tenantId","canonicalBusinessId","stableCode",
          "environment","dataResidency","status"
        ) VALUES (
          ${privateBusinessBoundaryId}::uuid,${tenantBOrganizationId}::uuid,
          ${tenantBTenantId}::uuid,${privateBusinessId}::uuid,
          ${`p203-private-business-${suffix}`},'PRODUCTION','US','ACTIVE'
        )
      `;

      const ownershipBlockers = await owner.$queryRaw<Array<{ blocker: string; subject: string | null }>>`
        SELECT blocker,subject FROM entral.phase202_live_ownership_blockers()
      `;
      expect(ownershipBlockers.filter((entry) => entry.blocker === "CANONICAL_BUSINESS_MAPPING_INVALID")).toEqual([]);

      api = new PrismaClient({
        datasources: { db: { url: loginUrl(isolatedUrl, apiRole, apiPassword) } }
      });
      let repository = new CanonicalControlPlaneRepository(api);
      const session = {
        actionReason: "Reproduce the migrated Phase 202 production graph incident.",
        authSubject: migratedUserId,
        organizationId: migrated.organizationId,
        tenantId: migrated.tenantId
      } as const;
      const beforeRepair = await repository.getHierarchySnapshot(session);
      expect(beforeRepair.entities).toEqual([]);
      let graphFailureCode: string | undefined;
      try {
        buildGraphProjection({
          hierarchy: beforeRepair,
          organization_id: migratedTeamId
        });
      } catch (error) {
        graphFailureCode = (error as { code?: string }).code;
      }
      expect(graphFailureCode).toBe("INVALID_GRAPH_ROOT");

      const tutorialBeforeRepair = await withTenantSession(api, {
        actionReason: "Reproduce the migrated tutorial RLS incident.",
        authSubject: migratedUserId,
        tenantId: migrated.tenantId
      }, (transaction) => transaction.memberTutorialProgress.findMany());
      expect(tutorialBeforeRepair).toEqual([]);
      const memberAssignment = await owner.$queryRaw<Array<{
        organizationId: string;
        tenantId: string;
      }>>`
        SELECT assignment."organizationId"::text AS "organizationId",
               assignment."tenantId"::text AS "tenantId"
        FROM public."TenantActorAssignment" assignment
        JOIN public."IdentityActor" actor ON actor."id"=assignment."actorId"
        WHERE actor."humanUserId"=${migratedMemberId}
          AND assignment."role"='MEMBER' AND assignment."status"='ACTIVE'
      `;
      expect(memberAssignment).toHaveLength(1);
      const migratedMember = memberAssignment[0]!;
      const memberTutorialBeforeRepair = await withTenantSession(api, {
        actionReason: "Reproduce the migrated member tutorial RLS incident.",
        authSubject: migratedMemberId,
        tenantId: migratedMember.tenantId
      }, (transaction) => transaction.memberTutorialProgress.findMany());
      expect(memberTutorialBeforeRepair).toEqual([]);

      await api.$disconnect();
      await owner.$disconnect();
      api = null;
      owner = null;
      cpSync(
        join(sourceMigrations, "20260803000000_phase_203_graph_recovery"),
        join(stagedMigrations, "20260803000000_phase_203_graph_recovery"),
        { recursive: true }
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        isolatedUrl.toString(),
        ["migrate", "deploy", "--schema", stagedSchema],
        "Phase 203 production graph forward recovery"
      );

      owner = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
      api = new PrismaClient({
        datasources: { db: { url: loginUrl(isolatedUrl, apiRole, apiPassword) } }
      });
      repository = new CanonicalControlPlaneRepository(api);
      const afterRepair = await repository.getHierarchySnapshot(session);
      expect(afterRepair.entities.map((entity) => entity.entity_id)).toEqual([
        rootId,
        marshalId,
        generalId
      ]);
      expect(afterRepair.entities.map((entity) => entity.entity_id)).not.toContain(privateCommanderId);
      expect(afterRepair.entities.filter((entity) => entity.parent_id === null)).toHaveLength(1);
      const projection = buildGraphProjection({
        hierarchy: afterRepair,
        organization_id: migratedTeamId
      });
      expect(projection.root_id).toBe(rootId);
      expect(projection.entities).toHaveLength(3);
      expect(projection.edges).toHaveLength(2);
      expect(projection.projection_version).toBe(afterRepair.event_sequence);
      expect(projection.evidence_version_reference.event_sequence).toBe(afterRepair.event_sequence);

      const rootRecord = await repository.getEntityFull(rootId, session);
      expect(rootRecord?.entity.summary.entity_id).toBe(rootId);
      const privateRecord = await repository.getEntityFull(privateCommanderId, session);
      expect(privateRecord).toBeNull();

      const tutorialAfterRepair = await withTenantSession(api, {
        actionReason: "Verify exact migrated tutorial subject access after recovery.",
        authSubject: migratedUserId,
        tenantId: migrated.tenantId
      }, async (transaction) => {
        const rows = await transaction.memberTutorialProgress.findMany();
        await transaction.memberTutorialProgress.update({
          data: { currentAnchorId: "universe-navigation", revision: { increment: 1 } },
          where: { id: `phase203-tutorial-${suffix}` }
        });
        return rows;
      });
      expect(tutorialAfterRepair).toHaveLength(1);
      expect(tutorialAfterRepair[0]).toEqual(expect.objectContaining({
        organizationId: migratedTeamId,
        tenantId: migrated.tenantId,
        userId: migratedUserId
      }));

      const memberAnalyticsId = randomUUID();
      const memberTutorialAfterRepair = await withTenantSession(api, {
        actionReason: "Verify exact migrated member Tutorial and analytics access after recovery.",
        authSubject: migratedMemberId,
        tenantId: migratedMember.tenantId
      }, async (transaction) => {
        const rows = await transaction.memberTutorialProgress.findMany({
          where: { userId: migratedMemberId }
        });
        const updated = await transaction.memberTutorialProgress.update({
          data: { currentAnchorId: "universe-navigation", revision: { increment: 1 } },
          where: { id: `phase203-member-tutorial-${suffix}` }
        });
        const receipt = await transaction.memberTutorialMutationReceipt.create({
          data: {
            action: "UPDATE",
            idempotencyKey: `phase203-member-${suffix}`,
            organizationId: migratedTeamId,
            priorRevision: 1,
            progressSnapshot: { revision: updated.revision },
            releaseVersion: "phase-200",
            resultingRevision: updated.revision,
            userId: migratedMemberId
          }
        });
        const audit = await recordAuditLog({
          action: "interaction.help_used",
          actorUserId: migratedMemberId,
          metadata: { contractVersion: "1.0.0", route: "/member/graph" },
          targetId: memberAnalyticsId,
          targetType: "INTERACTION_ANALYTICS"
        }, transaction);
        return { audit, receipt, rows, updated };
      });
      expect(memberTutorialAfterRepair.rows).toHaveLength(1);
      expect(memberTutorialAfterRepair.updated).toEqual(expect.objectContaining({
        revision: 2,
        tenantId: migratedMember.tenantId,
        userId: migratedMemberId
      }));
      expect(memberTutorialAfterRepair.receipt).toEqual(expect.objectContaining({
        tenantId: migratedMember.tenantId,
        userId: migratedMemberId
      }));
      expect(memberTutorialAfterRepair.audit).toEqual(expect.objectContaining({
        action: "interaction.help_used",
        targetId: memberAnalyticsId,
        targetType: "INTERACTION_ANALYTICS"
      }));
      await expect(withTenantSession(api, {
        actionReason: "Prove the member analytics exception remains fail closed.",
        authSubject: migratedMemberId,
        tenantId: migratedMember.tenantId
      }, (transaction) => recordAuditLog({
        action: "interaction.unsupported",
        actorUserId: migratedMemberId,
        targetId: randomUUID(),
        targetType: "INTERACTION_ANALYTICS"
      }, transaction))).rejects.toThrow();
    } finally {
      await Promise.allSettled([
        api?.$disconnect(),
        owner?.$disconnect()
      ].filter(Boolean) as Promise<void>[]);
      if (databaseCreated) {
        await admin.$executeRawUnsafe(
          `SELECT pg_terminate_backend(pid) FROM pg_stat_activity `
          + `WHERE datname='${databaseName}' AND pid<>pg_backend_pid()`
        );
        await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
      }
      if (apiRoleCreated) {
        await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${apiRole}"`);
      }
      await admin.$disconnect();
      rmSync(stagedPrisma, { force: true, recursive: true });
    }
  }, 240_000);
});
