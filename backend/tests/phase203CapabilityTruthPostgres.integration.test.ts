import { randomUUID } from "node:crypto";
import {
  cpSync,
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient, type PrismaClient as PrismaClientType } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NODE_ENV ??= "test";
  process.env.DATABASE_URL ??= "file:./phase203-capability-truth-skipped.db";
  process.env.JWT_SECRET ??= "phase203-capability-truth-test-secret";
});

import { withPersonalSession, withTenantSession } from "../src/db.js";

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

type CapabilityRecordJson = {
  capability_id: string;
  failure_state?: {
    code?: string;
    evidence_type?: string;
    prior_lifecycle_state?: string;
    receipt_id?: string;
  } | null;
  lifecycle_state: string;
  public_claim_eligible: boolean;
  record_version: number;
};

type ProductClaimJson = {
  claim_id: string;
  status: string;
  record_version: number;
};

describe.skipIf(!integrationEnabled)("Phase 203 migrated-account Capability Truth PostgreSQL boundary", () => {
  it("migrates conservative truth and publishes only an audited receipt-bound SELLABLE claim", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const databaseName = `entral_p203_truth_${suffix}`;
    const apiRole = `entral_p203_truth_api_${suffix}`;
    const apiPassword = randomUUID();
    const migratedUserId = `phase203-truth-owner-${suffix}`;
    const migratedTeamId = `phase203-truth-team-${suffix}`;
    const otherMigratedUserId = `phase203-truth-other-${suffix}`;
    const otherMigratedTeamId = `phase203-truth-other-team-${suffix}`;
    const rootId = randomUUID();
    const capabilityId = randomUUID();
    const claimId = randomUUID();
    const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
    const prismaCli = fileURLToPath(
      new URL("../../node_modules/prisma/build/index.js", import.meta.url)
    );
    const sourceMigrations = join(repositoryRoot, "prisma", "migrations");
    const stagedPrisma = mkdtempSync(join(tmpdir(), "entral-p203-capability-truth-"));
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
    let owner: PrismaClientType | null = null;
    let api: PrismaClientType | null = null;
    let databaseCreated = false;
    let apiRoleCreated = false;
    let serverVersionNumber = 0;

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
      const versionRows = await owner.$queryRaw<Array<{ versionNumber: number }>>`
        SELECT current_setting('server_version_num')::int AS "versionNumber"
      `;
      serverVersionNumber = versionRows[0]?.versionNumber ?? 0;
      await owner.$executeRaw`
        INSERT INTO public."User" (
          "id","name","email","passwordHash","role","internalAccess",
          "sessionVersion","createdAt","updatedAt"
        ) VALUES (
          ${migratedUserId},'Migrated Capability Owner',${`p203-truth-${suffix}@example.test`},
          'integration-password-hash','ADMIN',true,0,now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."Team" (
          "id","name","slug","memberAccessEnabled","memberSeatLimit","createdAt","updatedAt"
        ) VALUES (
          ${migratedTeamId},'Migrated Capability Organization',${`p203-truth-${suffix}`},true,5,now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."TeamMember" ("userId","teamId","role","joinedAt")
        VALUES (${migratedUserId},${migratedTeamId},'OWNER',now())
      `;
      await owner.$executeRaw`
        INSERT INTO public."User" (
          "id","name","email","passwordHash","role","internalAccess",
          "sessionVersion","createdAt","updatedAt"
        ) VALUES (
          ${otherMigratedUserId},'Other Migrated Owner',${`p203-truth-other-${suffix}@example.test`},
          'integration-password-hash','USER',false,0,now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."Team" (
          "id","name","slug","memberAccessEnabled","memberSeatLimit","createdAt","updatedAt"
        ) VALUES (
          ${otherMigratedTeamId},'Other Migrated Organization',${`p203-truth-other-${suffix}`},true,5,now(),now()
        )
      `;
      await owner.$executeRaw`
        INSERT INTO public."TeamMember" ("userId","teamId","role","joinedAt")
        VALUES (${otherMigratedUserId},${otherMigratedTeamId},'OWNER',now())
      `;
      await owner.$executeRaw`
        INSERT INTO entral.entities (id,stable_code,role,name,parent_id,status)
        VALUES (${rootId}::uuid,${`p203-truth-root-${suffix}`},'ENTRAL','ENTRAL',NULL,'ACTIVE')
      `;
      await owner.$disconnect();
      owner = null;

      for (const migration of [
        "20260802090000_phase_202_identity_tenancy_authority",
        "20260803000000_phase_203_graph_recovery"
      ]) {
        cpSync(join(sourceMigrations, migration), join(stagedMigrations, migration), { recursive: true });
        runPrisma(
          prismaCli,
          repositoryRoot,
          isolatedUrl.toString(),
          ["migrate", "deploy", "--schema", stagedSchema],
          `Migrated-account boundary ${migration}`
        );
      }
      for (const securityFile of [
        "prisma/security/046_roles_and_grants.sql",
        "prisma/security/047_phase_195_roles_and_grants.sql",
        "prisma/security/048_phase_202_roles_and_grants.sql"
      ]) {
        let executableSecurityFile = securityFile;
        if (securityFile.endsWith("046_roles_and_grants.sql") && serverVersionNumber < 160000) {
          const source = readFileSync(join(repositoryRoot, securityFile), "utf8");
          const normalized = source.replace(
            "GRANT entral_verifier TO entral_api WITH INHERIT FALSE, SET FALSE;",
            "GRANT entral_verifier TO entral_api;"
          );
          if (normalized === source) throw new Error("PostgreSQL 15 role normalization boundary drifted.");
          executableSecurityFile = join(stagedPrisma, "046_roles_and_grants.pg15.sql");
          writeFileSync(executableSecurityFile, normalized, "utf8");
        }
        runPrisma(
          prismaCli,
          repositoryRoot,
          isolatedUrl.toString(),
          ["db", "execute", "--file", executableSecurityFile, "--schema", stagedSchema],
          `Phase 203 prerequisite role deployment (${securityFile})`
        );
      }
      await admin.$executeRawUnsafe(
        `CREATE ROLE "${apiRole}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS `
        + `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${apiPassword}'`
      );
      apiRoleCreated = true;
      await admin.$executeRawUnsafe(`GRANT entral_api TO "${apiRole}"`);

      cpSync(
        join(sourceMigrations, "20260803010000_phase_203_capability_truth_registry"),
        join(stagedMigrations, "20260803010000_phase_203_capability_truth_registry"),
        { recursive: true }
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        isolatedUrl.toString(),
        ["migrate", "deploy", "--schema", stagedSchema],
        "Phase 203 Capability Truth migration"
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        isolatedUrl.toString(),
        ["db", "execute", "--file", "prisma/security/049_phase_203_roles_and_grants.sql", "--schema", stagedSchema],
        "Phase 203 Capability Truth role deployment"
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        isolatedUrl.toString(),
        ["migrate", "deploy", "--schema", stagedSchema],
        "Phase 203 idempotent migration retry"
      );

      owner = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
      api = new PrismaClient({
        datasources: { db: { url: loginUrl(isolatedUrl, apiRole, apiPassword) } }
      });
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
          AND assignment."status"='ACTIVE'
      `;
      expect(migratedScope).toHaveLength(1);
      const migrated = migratedScope[0]!;
      const otherMigratedScope = await owner.$queryRaw<Array<{
        actorId: string;
        organizationId: string;
        tenantId: string;
      }>>`
        SELECT assignment."actorId"::text AS "actorId",
               assignment."organizationId"::text AS "organizationId",
               assignment."tenantId"::text AS "tenantId"
        FROM public."TenantActorAssignment" assignment
        JOIN public."IdentityActor" actor ON actor."id"=assignment."actorId"
        WHERE actor."humanUserId"=${otherMigratedUserId}
          AND assignment."status"='ACTIVE'
      `;
      expect(otherMigratedScope).toHaveLength(1);
      const otherMigrated = otherMigratedScope[0]!;

      const conservativeImport = await owner.$queryRaw<Array<{
        activeOrSellable: number;
        catalogued: number;
        claims: number;
        installations: number;
        records: number;
        unassigned: number;
      }>>`
        SELECT
          (SELECT count(*)::int FROM entral.capability_records) AS "records",
          (SELECT count(*)::int FROM entral.capability_records WHERE lifecycle_state='CATALOGUED') AS "catalogued",
          (SELECT count(*)::int FROM entral.capability_records WHERE owner='UNASSIGNED') AS "unassigned",
          (SELECT count(*)::int FROM entral.capability_records WHERE lifecycle_state IN ('ACTIVE','SELLABLE')) AS "activeOrSellable",
          (SELECT count(*)::int FROM entral.product_claims) AS "claims",
          (SELECT count(*)::int FROM entral.tenant_capability_installations) AS "installations"
      `;
      expect(conservativeImport).toEqual([{
        activeOrSellable: 0,
        catalogued: 56,
        claims: 0,
        installations: 0,
        records: 56,
        unassigned: 56
      }]);

      await expect(api.$executeRaw`
        UPDATE entral.capability_records
        SET lifecycle_state='SELLABLE'
        WHERE capability_id='20300000-0001-4000-8000-000000000004'::uuid
      `).rejects.toThrow();

      await owner.$executeRaw`
        INSERT INTO entral.capability_records(
          capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
          data_classification,environment,scope,supported_scopes,lifecycle_state,audience_status,production_readiness,
          activation_requirements,public_claim_eligible,rollback_path,deactivation_path,
          source_reference,limitations
        ) VALUES (
          ${capabilityId}::uuid,${`capability.phase203.test.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Phase 203 isolated verification capability','Exercises the real registry in a disposable PostgreSQL database.',
          'CAPABILITY','Phase 203 integration test','INTERNAL','PRODUCTION','GLOBAL',ARRAY['GLOBAL']::text[],'CATALOGUED','CURRENT','REAL',
          '[]'::jsonb,false,'Remove the isolated test record.','Keep the isolated test record unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable database fixture only.']::text[]
        )
      `;

      const personalContext = {
        actionReason: "Verify the Phase 203 Capability Truth lifecycle.",
        authSubject: migratedUserId,
        requestId: randomUUID()
      };
      const adminQuery = async <T>(query: Prisma.Sql) => withPersonalSession(
        api!,
        { ...personalContext, requestId: randomUUID() },
        async (transaction, identity) => ({
          actorId: identity.actorId,
          rows: await transaction.$queryRaw<T[]>(query)
        }),
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      let recordVersion = 1;
      const evidenceTypes = [
        "UNIT_TEST",
        "INTEGRATION_TEST",
        "CANARY",
        "PRODUCTION_READBACK",
        "SUPPORT_READINESS",
        "PRICING_APPROVAL",
        "TUTORIAL",
        "DOCUMENTATION",
        "ROLLBACK"
      ] as const;
      const receiptIds: Record<(typeof evidenceTypes)[number], string> = Object.fromEntries(
        evidenceTypes.map((type) => [type, randomUUID()])
      ) as Record<(typeof evidenceTypes)[number], string>;

      for (const [index, evidenceType] of evidenceTypes.entries()) {
        const receipt = {
          receipt_id: receiptIds[evidenceType],
          evidence_type: evidenceType,
          environment: "PRODUCTION",
          status: "PASSED",
          reference: `mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/${evidenceType.toLowerCase()}.json`,
          content_sha256: (index + 1).toString(16).repeat(64),
          captured_at: "2026-08-03T05:00:00.000Z",
          expires_at: null
        };
        const idempotencyKey = `phase203-evidence-${evidenceType.toLowerCase()}-${suffix}`;
        const response = await adminQuery<CapabilityRecordJson>(Prisma.sql`
          SELECT entral.phase203_record_capability_evidence(
            ${capabilityId}::uuid,${recordVersion}::bigint,${JSON.stringify(receipt)}::jsonb,
            ${idempotencyKey}::text
          ) AS "value"
        `);
        const value = (response.rows[0] as unknown as { value: CapabilityRecordJson }).value;
        expect(value.record_version).toBe(recordVersion + 1);
        if (index === 0) {
          const replay = await adminQuery<CapabilityRecordJson>(Prisma.sql`
            SELECT entral.phase203_record_capability_evidence(
              ${capabilityId}::uuid,${recordVersion}::bigint,${JSON.stringify(receipt)}::jsonb,
              ${idempotencyKey}::text
            ) AS "value"
          `);
          expect((replay.rows[0] as unknown as { value: CapabilityRecordJson }).value.record_version)
            .toBe(value.record_version);
        }
        recordVersion = value.record_version;
      }

      let actorId = migrated.actorId;
      const transition = async (
        fromState: string,
        toState: string,
        evidenceReceiptIds: string[],
        key: string
      ) => {
        const request = {
          transition_id: randomUUID(),
          capability_id: capabilityId,
          from_state: fromState,
          to_state: toState,
          pricing_eligibility: toState === "SELLABLE" ? "INCLUDED" : "NOT_ELIGIBLE",
          expected_record_version: recordVersion,
          evidence_receipt_ids: evidenceReceiptIds,
          reason: `Verify ${fromState} to ${toState} in isolated PostgreSQL.`,
          actor_id: actorId,
          tenant_id: null,
          organization_id: null,
          business_id: null,
          correlation_id: randomUUID(),
          idempotency_key: `${key}-${suffix}`,
          release_version: "phase-203",
          requested_at: "2026-08-03T05:01:00.000Z"
        };
        const response = await adminQuery<CapabilityRecordJson>(Prisma.sql`
          SELECT entral.phase203_transition_capability(${JSON.stringify(request)}::jsonb) AS "value"
        `);
        actorId = response.actorId;
        const value = (response.rows[0] as unknown as { value: CapabilityRecordJson }).value;
        recordVersion = value.record_version;
        return { request, value };
      };

      const designed = await transition("CATALOGUED", "DESIGNED", [], "phase203-designed");
      await transition("DESIGNED", "IMPLEMENTED", [], "phase203-implemented");
      await expect(adminQuery(Prisma.sql`
        SELECT entral.phase203_transition_capability(${JSON.stringify({
          transition_id: randomUUID(),
          capability_id: capabilityId,
          from_state: "IMPLEMENTED",
          to_state: "UNIT_VERIFIED",
          pricing_eligibility: "NOT_ELIGIBLE",
          expected_record_version: recordVersion,
          evidence_receipt_ids: [],
          reason: "Prove UNIT_VERIFIED fails without its exact receipt.",
          actor_id: actorId,
          tenant_id: null,
          organization_id: null,
          business_id: null,
          correlation_id: randomUUID(),
          idempotency_key: `phase203-unit-negative-${suffix}`,
          release_version: "phase-203",
          requested_at: "2026-08-03T05:01:00.000Z"
        })}::jsonb) AS "value"
      `)).rejects.toThrow();
      await transition("IMPLEMENTED", "UNIT_VERIFIED", [receiptIds.UNIT_TEST], "phase203-unit");
      await transition("UNIT_VERIFIED", "INTEGRATION_VERIFIED", [receiptIds.INTEGRATION_TEST], "phase203-integration");
      await transition("INTEGRATION_VERIFIED", "CANARY_VERIFIED", [receiptIds.CANARY], "phase203-canary");
      await transition("CANARY_VERIFIED", "ACTIVE", [receiptIds.PRODUCTION_READBACK], "phase203-active");
      const sellable = await transition("ACTIVE", "SELLABLE", Object.values(receiptIds), "phase203-sellable");
      expect(sellable.value).toEqual(expect.objectContaining({
        lifecycle_state: "SELLABLE",
        public_claim_eligible: true
      }));
      await expect(owner.$executeRaw`
        UPDATE entral.capability_records
        SET pricing_eligibility='ADD_ON'
        WHERE capability_id=${capabilityId}::uuid
      `).rejects.toThrow();
      const delayedLifecycleReplay = await adminQuery<CapabilityRecordJson>(Prisma.sql`
        SELECT entral.phase203_transition_capability(${JSON.stringify(designed.request)}::jsonb) AS "value"
      `);
      expect((delayedLifecycleReplay.rows[0] as unknown as { value: CapabilityRecordJson }).value)
        .toEqual(designed.value);
      await expect(adminQuery(Prisma.sql`
        SELECT entral.phase203_transition_capability(${JSON.stringify({
          ...designed.request,
          reason: "A conflicting payload must never reuse an idempotency key."
        })}::jsonb) AS "value"
      `)).rejects.toThrow();

      await expect(owner.$executeRaw`
        INSERT INTO entral.capability_transition_audit(
          transition_id,capability_id,capability_version,from_state,to_state,pricing_eligibility,
          prior_record_version,resulting_record_version,evidence_receipt_ids,reason,actor_id,
          tenant_id,organization_id,business_id,correlation_id,idempotency_key,request_sha256,
          release_version,response_snapshot,requested_at
        ) VALUES (
          ${randomUUID()}::uuid,${capabilityId}::uuid,'1.0.0','SELLABLE','SELLABLE','INCLUDED',
          ${recordVersion - 1}::bigint,${recordVersion}::bigint,${Object.values(receiptIds)}::uuid[],
          'Prove the database rejects a transition audit snapshot whose tenant scope is mismatched.',
          ${actorId}::uuid,${migrated.tenantId}::uuid,${migrated.organizationId}::uuid,NULL,
          ${randomUUID()}::uuid,${`phase203-audit-scope-negative-${suffix}`}::text,${"b".repeat(64)},
          'phase-203',entral.phase203_capability_record_json(${capabilityId}::uuid),clock_timestamp()
        )
      `).rejects.toThrow();
      await expect(owner.$executeRaw`
        INSERT INTO entral.capability_transition_audit(
          transition_id,capability_id,capability_version,from_state,to_state,pricing_eligibility,
          prior_record_version,resulting_record_version,evidence_receipt_ids,reason,actor_id,
          tenant_id,organization_id,business_id,correlation_id,idempotency_key,request_sha256,
          release_version,response_snapshot,requested_at
        ) VALUES (
          ${randomUUID()}::uuid,${capabilityId}::uuid,'1.0.0','SELLABLE','SELLABLE','INCLUDED',
          ${recordVersion - 1}::bigint,${recordVersion}::bigint,${Object.values(receiptIds)}::uuid[],
          'Prove an audit snapshot missing an explicit tenant key fails closed.',${actorId}::uuid,
          NULL,NULL,NULL,${randomUUID()}::uuid,${`phase203-audit-key-negative-${suffix}`}::text,
          ${"d".repeat(64)},'phase-203',
          entral.phase203_capability_record_json(${capabilityId}::uuid)-'tenant_id',clock_timestamp()
        )
      `).rejects.toThrow();

      const claimRegistration = {
        claim_id: claimId,
        claim_key: `phase203.test.website.${suffix.replaceAll("_", "-")}`,
        capability_id: capabilityId,
        capability_version: "1.0.0",
        environment: "PRODUCTION",
        surface: "WEBSITE",
        approved_language: "This exact isolated claim is backed by the complete Phase 203 receipt set.",
        limitations: ["Disposable PostgreSQL verification only."],
        evidence_receipt_ids: Object.values(receiptIds),
        requires_tenant_installation: false
      };
      const registered = await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_register_product_claim(
          ${JSON.stringify(claimRegistration)}::jsonb,${`phase203-claim-register-${suffix}`}::text
        ) AS "value"
      `);
      expect((registered.rows[0] as unknown as { value: ProductClaimJson }).value.status).toBe("DRAFT");
      const claimTransition = {
        transition_id: randomUUID(),
        claim_id: claimId,
        from_status: "DRAFT",
        to_status: "APPROVED",
        expected_record_version: 1,
        evidence_receipt_ids: Object.values(receiptIds),
        reason: "Approve only the exact receipt-bound isolated claim.",
        actor_id: actorId,
        tenant_id: null,
        organization_id: null,
        business_id: null,
        correlation_id: randomUUID(),
        idempotency_key: `phase203-claim-approve-${suffix}`,
        release_version: "phase-203",
        requested_at: "2026-08-03T05:02:00.000Z"
      };
      const approved = await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_transition_product_claim(${JSON.stringify(claimTransition)}::jsonb) AS "value"
      `);
      const approvedSnapshot = (approved.rows[0] as unknown as { value: ProductClaimJson }).value;
      expect(approvedSnapshot.status).toBe("APPROVED");
      const blockClaimRequest = {
        transition_id: randomUUID(),
        claim_id: claimId,
        from_status: "APPROVED",
        to_status: "BLOCKED",
        expected_record_version: 2,
        evidence_receipt_ids: [],
        reason: "Exercise delayed claim-transition replay without publishing stale state.",
        actor_id: actorId,
        tenant_id: null,
        organization_id: null,
        business_id: null,
        correlation_id: randomUUID(),
        idempotency_key: `phase203-claim-block-${suffix}`,
        release_version: "phase-203",
        requested_at: "2026-08-03T05:02:10.000Z"
      };
      await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_transition_product_claim(${JSON.stringify(blockClaimRequest)}::jsonb) AS "value"
      `);
      const delayedClaimReplay = await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_transition_product_claim(${JSON.stringify(claimTransition)}::jsonb) AS "value"
      `);
      expect((delayedClaimReplay.rows[0] as unknown as { value: ProductClaimJson }).value)
        .toEqual(approvedSnapshot);
      const draftClaimRequest = {
        ...blockClaimRequest,
        transition_id: randomUUID(),
        from_status: "BLOCKED",
        to_status: "DRAFT",
        expected_record_version: 3,
        reason: "Return the disposable claim to draft after replay verification.",
        correlation_id: randomUUID(),
        idempotency_key: `phase203-claim-draft-${suffix}`,
        requested_at: "2026-08-03T05:02:20.000Z"
      };
      await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_transition_product_claim(${JSON.stringify(draftClaimRequest)}::jsonb) AS "value"
      `);
      await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_transition_product_claim(${JSON.stringify({
          ...claimTransition,
          transition_id: randomUUID(),
          expected_record_version: 4,
          correlation_id: randomUUID(),
          idempotency_key: `phase203-claim-reapprove-${suffix}`,
          requested_at: "2026-08-03T05:02:30.000Z"
        })}::jsonb) AS "value"
      `);

      const publicClaims = await api.$queryRaw<Array<{ claim: {
        approved_language: string;
        capability_id: string;
        evidence_receipt_ids: string[];
        lifecycle_state: string;
      } }>>(Prisma.sql`
        SELECT gate."claim" FROM entral.phase203_publication_gate(
          'WEBSITE','PRODUCTION',NULL::uuid,NULL::uuid
        ) gate
      `);
      expect(publicClaims).toEqual([{
        claim: expect.objectContaining({
          approved_language: claimRegistration.approved_language,
          capability_id: capabilityId,
          evidence_receipt_ids: expect.arrayContaining(Object.values(receiptIds)),
          lifecycle_state: "SELLABLE"
        })
      }]);

      const memberClaims = await withTenantSession(api, {
        actionReason: "Verify Product Truth under the migrated tenant session.",
        authSubject: migratedUserId,
        requestId: randomUUID(),
        tenantId: migrated.tenantId
      }, async (transaction, identity) => {
        expect(identity.organizationId).toBe(migrated.organizationId);
        return transaction.$queryRaw<Array<{ claim: unknown }>>(Prisma.sql`
          SELECT gate."claim" FROM entral.phase203_publication_gate(
            'WEBSITE','PRODUCTION',${identity.tenantId}::uuid,${identity.organizationId}::uuid
          ) gate
        `);
      });
      expect(memberClaims).toHaveLength(1);

      const tenantCapabilityId = randomUUID();
      const tenantClaimId = randomUUID();
      const tenantInstallationId = randomUUID();
      const tenantReceiptIds = Object.fromEntries(
        evidenceTypes.map((type) => [type, randomUUID()])
      ) as Record<(typeof evidenceTypes)[number], string>;
      await owner.$executeRaw`
        INSERT INTO entral.capability_records(
          capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
          data_classification,environment,scope,supported_scopes,tenant_id,organization_id,lifecycle_state,audience_status,
          production_readiness,activation_requirements,last_verified_at,public_claim_eligible,
          pricing_eligibility,rollback_path,deactivation_path,source_reference,limitations
        ) VALUES (
          ${tenantCapabilityId}::uuid,${`capability.phase203.tenant.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Tenant-scoped Phase 203 verification capability',
          'Exercises tenant installation and publication isolation in migrated state.',
          'CAPABILITY','Phase 203 integration test','INTERNAL','PRODUCTION','TENANT',ARRAY['TENANT']::text[],
          ${migrated.tenantId}::uuid,${migrated.organizationId}::uuid,
          'SELLABLE','CURRENT','REAL','[]'::jsonb,now(),true,'INCLUDED',
          'Remove the isolated tenant capability.','Keep the isolated tenant capability unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable tenant-isolation fixture only.']::text[]
        )
      `;
      for (const [index, evidenceType] of evidenceTypes.entries()) {
        await owner.$executeRaw`
          INSERT INTO entral.capability_verification_receipts(
            receipt_id,capability_id,capability_version,evidence_type,environment,status,
            reference,content_sha256,captured_at,expires_at,recorded_by_actor_id
          ) VALUES (
            ${tenantReceiptIds[evidenceType]}::uuid,${tenantCapabilityId}::uuid,'1.0.0',
            ${evidenceType},'PRODUCTION','PASSED',
            ${`mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/tenant-${evidenceType.toLowerCase()}.json`},
            ${(index + 1).toString(16).repeat(64)},now(),NULL,${actorId}::uuid
          )
        `;
      }
      await owner.$executeRaw`
        UPDATE entral.capability_records
        SET activation_requirements=${JSON.stringify([{
          requirement_code: "empty-evidence-negative",
          description: "A satisfied required requirement cannot omit evidence.",
          required: true,
          satisfied: true,
          evidence_receipt_ids: []
        }])}::jsonb
        WHERE capability_id=${tenantCapabilityId}::uuid
      `;
      const emptyRequirementHealth = await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_activation_requirements_healthy(
          ${tenantCapabilityId}::uuid,'1.0.0'
        ) AS "healthy"
      `;
      expect(emptyRequirementHealth).toEqual([{ healthy: false }]);
      await owner.$executeRaw`
        UPDATE entral.capability_records SET activation_requirements='[]'::jsonb
        WHERE capability_id=${tenantCapabilityId}::uuid
      `;
      const tenantClaimRegistration = {
        claim_id: tenantClaimId,
        claim_key: `phase203.tenant.tutorial.${suffix.replaceAll("_", "-")}`,
        capability_id: tenantCapabilityId,
        capability_version: "1.0.0",
        environment: "PRODUCTION",
        surface: "TUTORIAL",
        approved_language: "This tenant-scoped Tutorial claim requires the exact active installation.",
        limitations: ["Disposable migrated-account verification only."],
        evidence_receipt_ids: Object.values(tenantReceiptIds),
        requires_tenant_installation: true
      };
      await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_register_product_claim(
          ${JSON.stringify(tenantClaimRegistration)}::jsonb,
          ${`phase203-tenant-claim-register-${suffix}`}::text
        ) AS "value"
      `);
      await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_transition_product_claim(${JSON.stringify({
          transition_id: randomUUID(),
          claim_id: tenantClaimId,
          from_status: "DRAFT",
          to_status: "APPROVED",
          expected_record_version: 1,
          evidence_receipt_ids: Object.values(tenantReceiptIds),
          reason: "Approve the exact tenant-scoped claim for isolation verification.",
          actor_id: actorId,
          tenant_id: migrated.tenantId,
          organization_id: migrated.organizationId,
          business_id: null,
          correlation_id: randomUUID(),
          idempotency_key: `phase203-tenant-claim-approve-${suffix}`,
          release_version: "phase-203",
          requested_at: "2026-08-03T05:02:30.000Z"
        })}::jsonb) AS "value"
      `);

      const tenantClaimsFor = async (
        authSubject: string,
        tenantId: string,
        expectedOrganizationId: string
      ) => withTenantSession(api!, {
        actionReason: "Verify tenant-scoped Product Truth publication.",
        authSubject,
        requestId: randomUUID(),
        tenantId
      }, async (transaction, identity) => {
        expect(identity.organizationId).toBe(expectedOrganizationId);
        return transaction.$queryRaw<Array<{ claim: { claim_id: string } }>>(Prisma.sql`
          SELECT gate."claim" FROM entral.phase203_publication_gate(
            'TUTORIAL','PRODUCTION',${identity.tenantId}::uuid,${identity.organizationId}::uuid
          ) gate
        `);
      });

      expect(await tenantClaimsFor(migratedUserId, migrated.tenantId, migrated.organizationId)).toEqual([]);
      await owner.$executeRaw`
        INSERT INTO entral.tenant_capability_installations(
          installation_id,tenant_id,organization_id,capability_id,capability_version,
          state,plan_eligible,suspension_reason,activated_at,verification_receipt_ids
        ) VALUES (
          ${tenantInstallationId}::uuid,${migrated.tenantId}::uuid,${migrated.organizationId}::uuid,
          ${tenantCapabilityId}::uuid,'1.0.0','ACTIVE',false,NULL,now(),
          ${Object.values(tenantReceiptIds)}::uuid[]
        )
      `;
      expect(await tenantClaimsFor(migratedUserId, migrated.tenantId, migrated.organizationId)).toEqual([]);
      await owner.$executeRaw`
        UPDATE entral.tenant_capability_installations
        SET plan_eligible=true,record_version=record_version+1,updated_at=now()
        WHERE installation_id=${tenantInstallationId}::uuid
      `;
      expect(await tenantClaimsFor(migratedUserId, migrated.tenantId, migrated.organizationId))
        .toEqual([{ claim: expect.objectContaining({ claim_id: tenantClaimId }) }]);
      await owner.$executeRaw`
        UPDATE entral.tenant_capability_installations
        SET state='SUSPENDED',suspension_reason='Phase 203 isolation test',
            record_version=record_version+1,updated_at=now()
        WHERE installation_id=${tenantInstallationId}::uuid
      `;
      expect(await tenantClaimsFor(migratedUserId, migrated.tenantId, migrated.organizationId)).toEqual([]);
      await owner.$executeRaw`
        UPDATE entral.tenant_capability_installations
        SET state='ACTIVE',suspension_reason=NULL,record_version=record_version+1,updated_at=now()
        WHERE installation_id=${tenantInstallationId}::uuid
      `;
      expect(await tenantClaimsFor(migratedUserId, migrated.tenantId, migrated.organizationId))
        .toEqual([{ claim: expect.objectContaining({ claim_id: tenantClaimId }) }]);
      expect(await tenantClaimsFor(otherMigratedUserId, otherMigrated.tenantId, otherMigrated.organizationId)).toEqual([]);

      await expect(withTenantSession(api, {
        actionReason: "Prove members cannot bypass the publication gateway with direct table reads.",
        authSubject: migratedUserId,
        requestId: randomUUID(),
        tenantId: migrated.tenantId
      }, async (transaction) => transaction.$queryRaw`
        SELECT capability_id FROM entral.capability_records WHERE capability_id=${tenantCapabilityId}::uuid
      `)).rejects.toThrow();

      const simulatedCapabilityId = "20300000-0001-4000-8000-000000000004";
      const simulatedClaimId = randomUUID();
      const simulatedClaim = await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_register_product_claim(
          ${JSON.stringify({
            claim_id: simulatedClaimId,
            claim_key: `phase203.simulated.blocked.${suffix.replaceAll("_", "-")}`,
            capability_id: simulatedCapabilityId,
            capability_version: "1.0.0",
            environment: "PRODUCTION",
            surface: "WEBSITE",
            approved_language: "A simulated provider must never be published.",
            limitations: ["Source state is Mock Mode."],
            evidence_receipt_ids: [],
            requires_tenant_installation: false
          })}::jsonb,${`phase203-simulated-register-${suffix}`}::text
        ) AS "value"
      `);
      expect((simulatedClaim.rows[0] as unknown as { value: ProductClaimJson }).value.status).toBe("DRAFT");
      await expect(adminQuery(Prisma.sql`
        SELECT entral.phase203_transition_product_claim(${JSON.stringify({
          transition_id: randomUUID(),
          claim_id: simulatedClaimId,
          from_status: "DRAFT",
          to_status: "APPROVED",
          expected_record_version: 1,
          evidence_receipt_ids: [],
          reason: "Prove simulated provider publication is rejected.",
          actor_id: actorId,
          tenant_id: null,
          organization_id: null,
          business_id: null,
          correlation_id: randomUUID(),
          idempotency_key: `phase203-simulated-approve-${suffix}`,
          release_version: "phase-203",
          requested_at: "2026-08-03T05:03:00.000Z"
        })}::jsonb) AS "value"
      `)).rejects.toThrow();
      const finalPublicClaims = await api.$queryRaw<Array<{ claim: { claim_id: string } }>>(Prisma.sql`
        SELECT gate."claim" FROM entral.phase203_publication_gate(
          'WEBSITE','PRODUCTION',NULL::uuid,NULL::uuid
        ) gate
      `);
      expect(finalPublicClaims.map((row) => row.claim.claim_id)).toEqual([claimId]);

      const wrongKindIntegrationClaimId = randomUUID();
      await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_register_product_claim(
          ${JSON.stringify({
            claim_id: wrongKindIntegrationClaimId,
            claim_key: `phase203.non-integration-list.blocked.${suffix.replaceAll("_", "-")}`,
            capability_id: capabilityId,
            capability_version: "1.0.0",
            environment: "PRODUCTION",
            surface: "INTEGRATION_LIST",
            approved_language: "A non-integration capability must never appear in an integration list.",
            limitations: ["Disposable wrong-kind publication verification only."],
            evidence_receipt_ids: Object.values(receiptIds),
            requires_tenant_installation: false
          })}::jsonb,${`phase203-wrong-kind-register-${suffix}`}::text
        ) AS "value"
      `);
      await adminQuery<ProductClaimJson>(Prisma.sql`
        SELECT entral.phase203_transition_product_claim(${JSON.stringify({
          transition_id: randomUUID(),
          claim_id: wrongKindIntegrationClaimId,
          from_status: "DRAFT",
          to_status: "APPROVED",
          expected_record_version: 1,
          evidence_receipt_ids: Object.values(receiptIds),
          reason: "Prove INTEGRATION_LIST publication rejects a SELLABLE non-integration capability.",
          actor_id: actorId,
          tenant_id: null,
          organization_id: null,
          business_id: null,
          correlation_id: randomUUID(),
          idempotency_key: `phase203-wrong-kind-approve-${suffix}`,
          release_version: "phase-203",
          requested_at: "2026-08-03T05:03:30.000Z"
        })}::jsonb) AS "value"
      `);
      expect(await api.$queryRaw<Array<{ claim: { claim_id: string } }>>(Prisma.sql`
        SELECT gate."claim" FROM entral.phase203_publication_gate(
          'INTEGRATION_LIST','PRODUCTION',NULL::uuid,NULL::uuid
        ) gate
      `)).toEqual([]);

      const otherTenantDependencyId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.capability_records(
          capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
          data_classification,environment,scope,supported_scopes,tenant_id,organization_id,
          lifecycle_state,audience_status,production_readiness,activation_requirements,
          public_claim_eligible,pricing_eligibility,rollback_path,deactivation_path,source_reference,limitations
        ) VALUES (
          ${otherTenantDependencyId}::uuid,${`capability.phase203.other-tenant.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Other tenant dependency fixture','Proves another tenant cannot satisfy dependency health.',
          'CAPABILITY','Phase 203 integration test','INTERNAL','PRODUCTION','TENANT',ARRAY['TENANT']::text[],
          ${otherMigrated.tenantId}::uuid,${otherMigrated.organizationId}::uuid,
          'CATALOGUED','UNSUPPORTED','REAL','[]'::jsonb,false,'NOT_ELIGIBLE',
          'Delete the disposable fixture.','Keep the disposable fixture unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable cross-tenant dependency fixture only.']::text[]
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.capability_dependencies(
          capability_id,capability_version,dependency_capability_id,dependency_capability_version,
          minimum_lifecycle_state,required
        ) VALUES (
          ${tenantCapabilityId}::uuid,'1.0.0',${otherTenantDependencyId}::uuid,'1.0.0','CATALOGUED',true
        )
      `;
      const crossTenantHealth = await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_dependencies_healthy(${tenantCapabilityId}::uuid,'1.0.0') AS "healthy"
      `;
      expect(crossTenantHealth).toEqual([{ healthy: false }]);
      await owner.$executeRaw`
        DELETE FROM entral.capability_dependencies
        WHERE capability_id=${tenantCapabilityId}::uuid
          AND dependency_capability_id=${otherTenantDependencyId}::uuid
      `;
      const incompleteIntegrationId = randomUUID();
      const incompleteIntegrationUnitReceiptId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.capability_records(
          capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
          data_classification,environment,scope,supported_scopes,lifecycle_state,audience_status,
          production_readiness,required_evidence,activation_requirements,last_verified_at,
          public_claim_eligible,pricing_eligibility,rollback_path,deactivation_path,source_reference,limitations
        ) VALUES (
          ${incompleteIntegrationId}::uuid,${`integration.phase203.incomplete.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Incomplete Phase 203 integration fixture',
          'Proves ACTIVE integration dependencies require the complete seven-part provider evidence set.',
          'INTEGRATION','Phase 203 integration test','INTERNAL','PRODUCTION','GLOBAL',ARRAY['GLOBAL']::text[],
          'ACTIVE','CURRENT','REAL',ARRAY['UNIT_TEST']::text[],'[]'::jsonb,now(),false,'NOT_ELIGIBLE',
          'Remove the disposable incomplete integration.','Keep the disposable integration unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable integration evidence fixture only.']::text[]
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.capability_verification_receipts(
          receipt_id,capability_id,capability_version,evidence_type,environment,status,
          reference,content_sha256,captured_at,expires_at,recorded_by_actor_id
        ) VALUES (
          ${incompleteIntegrationUnitReceiptId}::uuid,${incompleteIntegrationId}::uuid,'1.0.0',
          'UNIT_TEST','PRODUCTION','PASSED',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/incomplete-integration-unit.json',
          ${"c".repeat(64)},clock_timestamp(),NULL,${actorId}::uuid
        )
      `;
      expect(await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_operational_evidence_healthy(
          ${incompleteIntegrationId}::uuid,'1.0.0','ACTIVE'
        ) AS "healthy"
      `).toEqual([{ healthy: false }]);
      await owner.$executeRaw`
        INSERT INTO entral.capability_dependencies(
          capability_id,capability_version,dependency_capability_id,dependency_capability_version,
          minimum_lifecycle_state,required
        ) VALUES (
          ${tenantCapabilityId}::uuid,'1.0.0',${incompleteIntegrationId}::uuid,'1.0.0','ACTIVE',true
        )
      `;
      expect(await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_dependencies_healthy(${tenantCapabilityId}::uuid,'1.0.0') AS "healthy"
      `).toEqual([{ healthy: false }]);
      await owner.$executeRaw`
        DELETE FROM entral.capability_dependencies
        WHERE capability_id=${tenantCapabilityId}::uuid
          AND dependency_capability_id=${incompleteIntegrationId}::uuid
      `;
      const narrowedActiveCapabilityId = randomUUID();
      const narrowedActiveUnitReceiptId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.capability_records(
          capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
          data_classification,environment,scope,supported_scopes,lifecycle_state,audience_status,
          production_readiness,required_evidence,activation_requirements,last_verified_at,
          public_claim_eligible,pricing_eligibility,rollback_path,deactivation_path,source_reference,limitations
        ) VALUES (
          ${narrowedActiveCapabilityId}::uuid,${`capability.phase203.narrowed-active.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Narrowed ACTIVE evidence fixture',
          'Proves ACTIVE health always requires production readback even when mutable required evidence is narrowed.',
          'CAPABILITY','Phase 203 integration test','INTERNAL','PRODUCTION','GLOBAL',ARRAY['GLOBAL']::text[],
          'ACTIVE','CURRENT','REAL',ARRAY['UNIT_TEST']::text[],'[]'::jsonb,now(),false,'NOT_ELIGIBLE',
          'Remove the disposable narrowed fixture.','Keep the disposable narrowed fixture unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable narrowed-evidence fixture only.']::text[]
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.capability_verification_receipts(
          receipt_id,capability_id,capability_version,evidence_type,environment,status,
          reference,content_sha256,captured_at,expires_at,recorded_by_actor_id
        ) VALUES (
          ${narrowedActiveUnitReceiptId}::uuid,${narrowedActiveCapabilityId}::uuid,'1.0.0',
          'UNIT_TEST','PRODUCTION','PASSED',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/narrowed-active-unit.json',
          ${"7".repeat(64)},clock_timestamp(),NULL,${actorId}::uuid
        )
      `;
      expect(await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_operational_evidence_healthy(
          ${narrowedActiveCapabilityId}::uuid,'1.0.0','ACTIVE'
        ) AS "healthy"
      `).toEqual([{ healthy: false }]);
      const cascadeCapabilityId = randomUUID();
      const cascadeSecondLevelId = randomUUID();
      const expiredDependencyId = randomUUID();
      const unrelatedUnhealthyId = randomUUID();
      const cascadeReceiptId = randomUUID();
      const cascadeProductionReadbackReceiptId = randomUUID();
      const expiredReceiptId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.capability_records(
          capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
          data_classification,environment,scope,supported_scopes,tenant_id,organization_id,
          lifecycle_state,audience_status,production_readiness,required_evidence,
          activation_requirements,last_verified_at,public_claim_eligible,pricing_eligibility,
          rollback_path,deactivation_path,source_reference,limitations
        ) VALUES
        (
          ${cascadeCapabilityId}::uuid,${`capability.phase203.cascade-one.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Phase 203 cascade level one','Proves a first-level reverse dependency downgrade.',
          'CAPABILITY','Phase 203 integration test','INTERNAL','PRODUCTION','TENANT',ARRAY['TENANT']::text[],
          ${migrated.tenantId}::uuid,${migrated.organizationId}::uuid,
          'ACTIVE','CURRENT','REAL',ARRAY['UNIT_TEST']::text[],'[]'::jsonb,now(),false,'NOT_ELIGIBLE',
          'Remove the disposable cascade fixture.','Keep the disposable cascade fixture unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable reverse-closure fixture only.']::text[]
        ),
        (
          ${cascadeSecondLevelId}::uuid,${`capability.phase203.cascade-two.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Phase 203 cascade level two','Proves a transitive reverse dependency downgrade.',
          'CAPABILITY','Phase 203 integration test','INTERNAL','PRODUCTION','TENANT',ARRAY['TENANT']::text[],
          ${migrated.tenantId}::uuid,${migrated.organizationId}::uuid,
          'ACTIVE','CURRENT','REAL',ARRAY['UNIT_TEST']::text[],'[]'::jsonb,now(),false,'NOT_ELIGIBLE',
          'Remove the disposable cascade fixture.','Keep the disposable cascade fixture unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable transitive reverse-closure fixture only.']::text[]
        ),
        (
          ${expiredDependencyId}::uuid,${`capability.phase203.expired-dependency.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Phase 203 expired dependency','Proves dependency evidence is evaluated at current time.',
          'CAPABILITY','Phase 203 integration test','INTERNAL','PRODUCTION','GLOBAL',ARRAY['GLOBAL']::text[],
          NULL,NULL,'ACTIVE','CURRENT','REAL',ARRAY['UNIT_TEST']::text[],'[]'::jsonb,
          now()-interval '2 hours',false,'NOT_ELIGIBLE',
          'Remove the disposable expiry fixture.','Keep the disposable expiry fixture unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable expired-evidence fixture only.']::text[]
        ),
        (
          ${unrelatedUnhealthyId}::uuid,${`capability.phase203.unrelated-unhealthy.${suffix.replaceAll("_", "-")}`},'1.0.0',
          'Phase 203 unrelated unhealthy dependent','Proves reconciliation does not mutate records outside the root reverse closure.',
          'CAPABILITY','Phase 203 integration test','INTERNAL','PRODUCTION','GLOBAL',ARRAY['GLOBAL']::text[],
          NULL,NULL,'SELLABLE','CURRENT','REAL',ARRAY['UNIT_TEST']::text[],'[]'::jsonb,now(),true,'INCLUDED',
          'Remove the disposable unrelated fixture.','Keep the disposable unrelated fixture unpublished.',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/tests/phase203CapabilityTruthPostgres.integration.test.ts',
          ARRAY['Disposable unrelated reconciliation fixture only.']::text[]
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.capability_verification_receipts(
          receipt_id,capability_id,capability_version,evidence_type,environment,status,
          reference,content_sha256,captured_at,expires_at,recorded_by_actor_id
        ) VALUES
        (
          ${cascadeReceiptId}::uuid,${cascadeCapabilityId}::uuid,'1.0.0','UNIT_TEST','PRODUCTION','PASSED',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/cascade-unit.json',
          ${"e".repeat(64)},now(),NULL,${actorId}::uuid
        ),
        (
          ${cascadeProductionReadbackReceiptId}::uuid,${cascadeCapabilityId}::uuid,'1.0.0',
          'PRODUCTION_READBACK','PRODUCTION','PASSED',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/cascade-production-readback.json',
          ${"6".repeat(64)},now(),NULL,${actorId}::uuid
        ),
        (
          ${expiredReceiptId}::uuid,${expiredDependencyId}::uuid,'1.0.0','UNIT_TEST','PRODUCTION','PASSED',
          'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/expired-unit.json',
          ${"f".repeat(64)},now()-interval '3 hours',now()-interval '1 hour',${actorId}::uuid
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.capability_dependencies(
          capability_id,capability_version,dependency_capability_id,dependency_capability_version,
          minimum_lifecycle_state,required
        ) VALUES
          (${tenantCapabilityId}::uuid,'1.0.0',${capabilityId}::uuid,'1.0.0','SELLABLE',true),
          (${cascadeCapabilityId}::uuid,'1.0.0',${tenantCapabilityId}::uuid,'1.0.0','ACTIVE',true),
          (${cascadeSecondLevelId}::uuid,'1.0.0',${cascadeCapabilityId}::uuid,'1.0.0','ACTIVE',true),
          (${unrelatedUnhealthyId}::uuid,'1.0.0',${expiredDependencyId}::uuid,'1.0.0','ACTIVE',true)
      `;
      expect(await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_dependencies_healthy(${tenantCapabilityId}::uuid,'1.0.0') AS "healthy"
      `).toEqual([{ healthy: true }]);
      expect(await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_dependencies_healthy(${cascadeCapabilityId}::uuid,'1.0.0') AS "healthy"
      `).toEqual([{ healthy: true }]);
      expect(await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_dependencies_healthy(${cascadeSecondLevelId}::uuid,'1.0.0') AS "healthy"
      `).toEqual([{ healthy: true }]);
      expect(await owner.$queryRaw<Array<{ healthy: boolean }>>`
        SELECT entral.phase203_dependencies_healthy(${unrelatedUnhealthyId}::uuid,'1.0.0') AS "healthy"
      `).toEqual([{ healthy: false }]);

      expect(await owner.$queryRaw<Array<{ passed: boolean }>>`
        SELECT entral.phase203_latest_evidence_passed(
          ${capabilityId}::uuid,'1.0.0','PRODUCTION_READBACK'
        ) AS "passed"
      `).toEqual([{ passed: true }]);

      const backdatedFailedReadback = {
        receipt_id: randomUUID(),
        evidence_type: "PRODUCTION_READBACK",
        environment: "PRODUCTION",
        status: "FAILED",
        reference: "mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/backdated-failed-production-readback.json",
        content_sha256: "8".repeat(64),
        captured_at: "2026-08-03T04:59:00.000Z",
        expires_at: null
      };
      const backdatedFailure = await adminQuery<CapabilityRecordJson>(Prisma.sql`
        SELECT entral.phase203_record_capability_evidence(
          ${capabilityId}::uuid,${recordVersion}::bigint,${JSON.stringify(backdatedFailedReadback)}::jsonb,
          ${`phase203-evidence-backdated-failure-${suffix}`}::text
        ) AS "value"
      `);
      const backdatedFailureSnapshot = (
        backdatedFailure.rows[0] as unknown as { value: CapabilityRecordJson }
      ).value;
      expect(backdatedFailureSnapshot).toEqual(expect.objectContaining({
        lifecycle_state: "SELLABLE",
        public_claim_eligible: true,
        failure_state: null
      }));
      recordVersion = backdatedFailureSnapshot.record_version;
      expect(await owner.$queryRaw<Array<{ passed: boolean }>>`
        SELECT entral.phase203_current_evidence_receipt_passed(
          ${receiptIds.PRODUCTION_READBACK}::uuid
        ) AS "passed"
      `).toEqual([{ passed: true }]);

      const failedReadback = {
        receipt_id: randomUUID(),
        evidence_type: "PRODUCTION_READBACK",
        environment: "PRODUCTION",
        status: "FAILED",
        reference: "mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/failed-production-readback.json",
        content_sha256: "9".repeat(64),
        captured_at: "2026-08-03T05:04:00.000Z",
        expires_at: null
      };
      const failureIdempotencyKey = `phase203-evidence-failure-${suffix}`;
      const failure = await adminQuery<CapabilityRecordJson>(Prisma.sql`
        SELECT entral.phase203_record_capability_evidence(
          ${capabilityId}::uuid,${recordVersion}::bigint,${JSON.stringify(failedReadback)}::jsonb,
          ${failureIdempotencyKey}::text
        ) AS "value"
      `);
      const failureSnapshot = (failure.rows[0] as unknown as { value: CapabilityRecordJson }).value;
      expect(failureSnapshot).toEqual(expect.objectContaining({
        lifecycle_state: "CANARY_VERIFIED",
        public_claim_eligible: false,
        failure_state: expect.objectContaining({
          code: "VERIFICATION_FAILED",
          evidence_type: "PRODUCTION_READBACK",
          receipt_id: failedReadback.receipt_id
        })
      }));
      recordVersion = failureSnapshot.record_version;
      const failureReplay = await adminQuery<CapabilityRecordJson>(Prisma.sql`
        SELECT entral.phase203_record_capability_evidence(
          ${capabilityId}::uuid,${recordVersion - 1}::bigint,${JSON.stringify(failedReadback)}::jsonb,
          ${failureIdempotencyKey}::text
        ) AS "value"
      `);
      expect((failureReplay.rows[0] as unknown as { value: CapabilityRecordJson }).value)
        .toEqual(failureSnapshot);
      expect(await owner.$queryRaw<Array<{ passed: boolean }>>`
        SELECT entral.phase203_latest_evidence_passed(
          ${capabilityId}::uuid,'1.0.0','PRODUCTION_READBACK'
        ) AS "passed"
      `).toEqual([{ passed: false }]);
      expect(await owner.$queryRaw<Array<{ passed: boolean }>>`
        SELECT entral.phase203_current_evidence_receipt_passed(
          ${receiptIds.PRODUCTION_READBACK}::uuid
        ) AS "passed"
      `).toEqual([{ passed: false }]);
      const failedSupportReadiness = {
        receipt_id: randomUUID(),
        evidence_type: "SUPPORT_READINESS",
        environment: "PRODUCTION",
        status: "FAILED",
        reference: "mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/failed-support-readiness.json",
        content_sha256: "1".repeat(64),
        captured_at: "2026-08-03T05:04:30.000Z",
        expires_at: null
      };
      const secondFailure = await adminQuery<CapabilityRecordJson>(Prisma.sql`
        SELECT entral.phase203_record_capability_evidence(
          ${capabilityId}::uuid,${recordVersion}::bigint,${JSON.stringify(failedSupportReadiness)}::jsonb,
          ${`phase203-evidence-second-failure-${suffix}`}::text
        ) AS "value"
      `);
      const secondFailureSnapshot = (
        secondFailure.rows[0] as unknown as { value: CapabilityRecordJson }
      ).value;
      expect(secondFailureSnapshot.failure_state).toEqual(expect.objectContaining({
        evidence_type: "SUPPORT_READINESS",
        receipt_id: failedSupportReadiness.receipt_id,
        prior_lifecycle_state: "SELLABLE"
      }));
      recordVersion = secondFailureSnapshot.record_version;
      const repairedSupportReadiness = {
        ...failedSupportReadiness,
        receipt_id: randomUUID(),
        status: "PASSED",
        reference: "mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/repaired-support-readiness.json",
        content_sha256: "2".repeat(64),
        captured_at: "2026-08-03T05:05:00.000Z"
      };
      const partialRepair = await adminQuery<CapabilityRecordJson>(Prisma.sql`
        SELECT entral.phase203_record_capability_evidence(
          ${capabilityId}::uuid,${recordVersion}::bigint,${JSON.stringify(repairedSupportReadiness)}::jsonb,
          ${`phase203-evidence-partial-repair-${suffix}`}::text
        ) AS "value"
      `);
      const partialRepairSnapshot = (
        partialRepair.rows[0] as unknown as { value: CapabilityRecordJson }
      ).value;
      expect(partialRepairSnapshot.failure_state).toEqual(expect.objectContaining({
        evidence_type: "PRODUCTION_READBACK",
        receipt_id: failedReadback.receipt_id,
        prior_lifecycle_state: "SELLABLE"
      }));
      expect(partialRepairSnapshot.lifecycle_state).toBe("CANARY_VERIFIED");
      recordVersion = partialRepairSnapshot.record_version;
      const dependencyReadback = await owner.$queryRaw<Array<{
        capabilityState: string;
        installationState: string;
        suspensionReason: string | null;
      }>>`
        SELECT capability.lifecycle_state AS "capabilityState",installation.state AS "installationState",
               installation.suspension_reason AS "suspensionReason"
        FROM entral.capability_records capability
        JOIN entral.tenant_capability_installations installation
          ON installation.capability_id=capability.capability_id
        WHERE capability.capability_id=${tenantCapabilityId}::uuid
      `;
      expect(dependencyReadback).toEqual([{
        capabilityState: "CANARY_VERIFIED",
        installationState: "SUSPENDED",
        suspensionReason: "Required capability dependency is unhealthy."
      }]);
      const cascadeReadback = await owner.$queryRaw<Array<{ capabilityId: string; lifecycleState: string }>>`
        SELECT capability_id::text AS "capabilityId",lifecycle_state AS "lifecycleState"
        FROM entral.capability_records
        WHERE capability_id IN (
          ${cascadeCapabilityId}::uuid,${cascadeSecondLevelId}::uuid,
          ${expiredDependencyId}::uuid,${unrelatedUnhealthyId}::uuid
        )
        ORDER BY capability_id
      `;
      const cascadeStates = new Map(cascadeReadback.map((record) => [record.capabilityId, record.lifecycleState]));
      expect(cascadeStates.get(cascadeCapabilityId)).toBe("CANARY_VERIFIED");
      expect(cascadeStates.get(cascadeSecondLevelId)).toBe("CANARY_VERIFIED");
      expect(cascadeStates.get(expiredDependencyId)).toBe("ACTIVE");
      expect(cascadeStates.get(unrelatedUnhealthyId)).toBe("SELLABLE");
      expect(await api.$queryRaw<Array<{ claim: { claim_id: string } }>>(Prisma.sql`
        SELECT gate."claim" FROM entral.phase203_publication_gate(
          'WEBSITE','PRODUCTION',NULL::uuid,NULL::uuid
        ) gate
      `)).toEqual([]);

      const repairedReadback = {
        ...failedReadback,
        receipt_id: randomUUID(),
        status: "PASSED",
        reference: "mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:docs/evidence/phase203/capability-truth/repaired-production-readback.json",
        content_sha256: "a".repeat(64),
        captured_at: "2026-08-03T05:06:00.000Z"
      };
      const repaired = await adminQuery<CapabilityRecordJson>(Prisma.sql`
        SELECT entral.phase203_record_capability_evidence(
          ${capabilityId}::uuid,${recordVersion}::bigint,${JSON.stringify(repairedReadback)}::jsonb,
          ${`phase203-evidence-repair-${suffix}`}::text
        ) AS "value"
      `);
      const repairedSnapshot = (repaired.rows[0] as unknown as { value: CapabilityRecordJson }).value;
      expect(repairedSnapshot.failure_state).toBeNull();
      expect(repairedSnapshot.lifecycle_state).toBe("CANARY_VERIFIED");
      expect(await owner.$queryRaw<Array<{ passed: boolean }>>`
        SELECT entral.phase203_latest_evidence_passed(
          ${capabilityId}::uuid,'1.0.0','PRODUCTION_READBACK'
        ) AS "passed"
      `).toEqual([{ passed: true }]);

      const auditReadback = await adminQuery<{ value: {
        claims: ProductClaimJson[];
        records: CapabilityRecordJson[];
        registry_revision: number;
        transition_audit: unknown[];
        installation_transition_audit: unknown[];
      } }>(Prisma.sql`SELECT entral.phase203_admin_readback() AS "value"`);
      const readback = auditReadback.rows[0]!.value;
      expect(readback.registry_revision).toBeGreaterThan(1);
      expect(readback.records).toHaveLength(65);
      expect(readback.claims).toHaveLength(4);
      expect(readback.transition_audit).toHaveLength(11);
      expect(readback.installation_transition_audit).toHaveLength(1);
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
      const resolvedStage = join(tmpdir(), stagedPrisma.slice(tmpdir().length + 1));
      if (resolvedStage === stagedPrisma && resolvedStage.startsWith(tmpdir())) {
        rmSync(resolvedStage, { force: true, recursive: true });
      }
    }
  }, 300_000);
});
