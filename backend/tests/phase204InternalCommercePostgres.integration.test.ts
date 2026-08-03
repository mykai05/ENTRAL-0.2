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
  process.env.DATABASE_URL ??= "file:./phase204-internal-commerce-skipped.db";
  process.env.JWT_SECRET ??= "phase204-internal-commerce-test-secret";
});

import { withPersonalSession } from "../src/db.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(
  testDatabaseUrl
  && process.env.RUN_POSTGRES_INTEGRATION === "1"
);

const catalogCapabilityIds = [
  "20300000-0002-4000-8000-000000000108",
  "20300000-0002-4000-8000-000000000107",
  "20300000-0002-4000-8000-000000000106",
  "20300000-0001-4000-8000-000000000012"
] as const;

const productTruth = [
  ["BILLING_COLLECTIONS_ACCELERATOR", "Billing and Collections Accelerator", 4_900],
  ["COMPLETE_CONTRACTOR_CONTROL_BUNDLE", "Complete Contractor Control Bundle", 11_900],
  ["LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT", "Lead Response and Estimate Follow-Up Kit", 2_900],
  ["SCOPE_CHANGE_ORDER_CONTROL_PACK", "Scope and Change-Order Control Pack", 4_900],
  ["WEEKLY_OWNER_COMMAND_DASHBOARD", "Weekly Owner Command Dashboard", 3_900]
] as const;

const requiredEvidenceTypes = [
  "UNIT_TEST",
  "INTEGRATION_TEST",
  "CANARY",
  "PRODUCTION_READBACK",
  "AUTHENTICATION",
  "AUTHORIZATION_SCOPE",
  "OPERATION",
  "READBACK",
  "RECONCILIATION",
  "REFRESH_OR_WEBHOOK",
  "FAILURE_HANDLING",
  "DOCUMENTATION",
  "ROLLBACK"
] as const;

type JsonRecord = Record<string, unknown>;

type OwnerInvocation<T> = {
  actorId: string;
  value: T;
};

type Activation = {
  activation_id: string;
  business_boundary_id: string;
  canonical_business_id: string;
  commander_id: string;
  evidence_artifact_id: string;
  general_id: string;
  launch_mission_id: string;
  marshal_id: string;
  product_ids: string[];
  soldier_ids: string[];
  storefront_id: string;
};

type ActivationInvocation = OwnerInvocation<Activation> & {
  databaseName: string;
  inTransactionState: string;
};

type CapabilitySnapshot = {
  capability_id: string;
  lifecycle_state: string;
  pricing_eligibility: string;
  public_claim_eligible: boolean;
  record_version: number;
};

type InstallationSnapshot = {
  installation_id: string;
  plan_eligible: boolean;
  record_version: number;
  state: string;
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

function runNode(
  repositoryRoot: string,
  databaseUrl: string,
  script: string,
  operation: string
) {
  const result = spawnSync(process.execPath, [script], {
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

function evidenceReference(commit: string, suffix: string, evidenceType: string) {
  return `mykai05/ENTRAL-0.2@${commit}:docs/evidence/phase204/tests/${suffix}/${evidenceType.toLowerCase()}.json`;
}

describe.skipIf(!integrationEnabled)("Phase 204 migrated-account internal commerce PostgreSQL boundary", () => {
  it("activates exact canonical commerce and keeps publication and global Capability Truth fail closed", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const databaseName = `entral_p204_commerce_${suffix}`;
    const apiRole = `entral_p204_commerce_api_${suffix}`;
    const apiPassword = randomUUID();
    const migratedUserId = `phase204-commerce-owner-${suffix}`;
    const migratedTeamId = `phase204-commerce-team-${suffix}`;
    const otherUserId = `phase204-commerce-other-${suffix}`;
    const otherTeamId = `phase204-commerce-other-team-${suffix}`;
    const releaseCommit = "438e1b0546532efa48cd156e08af12168f4283d1";
    const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
    const prismaCli = fileURLToPath(
      new URL("../../node_modules/prisma/build/index.js", import.meta.url)
    );
    const seedScript = fileURLToPath(
      new URL("../../scripts/seed-canonical-taxonomy.mjs", import.meta.url)
    );
    const sourceMigrations = join(repositoryRoot, "prisma", "migrations");
    const stagedPrisma = mkdtempSync(join(tmpdir(), "entral-p204-internal-commerce-"));
    const stagedMigrations = join(stagedPrisma, "migrations");
    const stagedSchema = join(stagedPrisma, "schema.prisma");
    mkdirSync(stagedMigrations);
    copyFileSync(join(repositoryRoot, "prisma", "schema.prisma"), stagedSchema);
    cpSync(
      join(sourceMigrations, "migration_lock.toml"),
      join(stagedMigrations, "migration_lock.toml"),
      { recursive: true }
    );
    for (const migration of readdirSync(sourceMigrations)) {
      if (migration <= "20260802023000_phase_200_interaction_layer") {
        cpSync(join(sourceMigrations, migration), join(stagedMigrations, migration), {
          recursive: true
        });
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
        ) VALUES
          (${migratedUserId},'Migrated Commerce Owner',${`p204-commerce-${suffix}@example.test`},
           'integration-password-hash','ADMIN',true,0,now(),now()),
          (${otherUserId},'Other Commerce Owner',${`p204-commerce-other-${suffix}@example.test`},
           'integration-password-hash','USER',false,0,now(),now())
      `;
      await owner.$executeRaw`
        INSERT INTO public."Team" (
          "id","name","slug","memberAccessEnabled","memberSeatLimit","createdAt","updatedAt"
        ) VALUES
          (${migratedTeamId},'Migrated Commerce Organization',${`p204-commerce-${suffix}`},true,5,now(),now()),
          (${otherTeamId},'Other Commerce Organization',${`p204-commerce-other-${suffix}`},true,5,now(),now())
      `;
      await owner.$executeRaw`
        INSERT INTO public."TeamMember" ("userId","teamId","role","joinedAt") VALUES
          (${migratedUserId},${migratedTeamId},'OWNER',now()),
          (${otherUserId},${otherTeamId},'OWNER',now())
      `;
      await owner.$disconnect();
      owner = null;

      runNode(
        repositoryRoot,
        isolatedUrl.toString(),
        seedScript,
        "Canonical ENTRAL hierarchy seed"
      );

      for (const migration of [
        "20260802090000_phase_202_identity_tenancy_authority",
        "20260803000000_phase_203_graph_recovery"
      ]) {
        cpSync(join(sourceMigrations, migration), join(stagedMigrations, migration), {
          recursive: true
        });
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
        if (securityFile.endsWith("046_roles_and_grants.sql") && serverVersionNumber < 160_000) {
          const source = readFileSync(join(repositoryRoot, securityFile), "utf8");
          const normalized = source.replace(
            "GRANT entral_verifier TO entral_api WITH INHERIT FALSE, SET FALSE;",
            "GRANT entral_verifier TO entral_api;"
          );
          if (normalized === source) {
            throw new Error("PostgreSQL 15 role normalization boundary drifted.");
          }
          executableSecurityFile = join(stagedPrisma, "046_roles_and_grants.pg15.sql");
          writeFileSync(executableSecurityFile, normalized, "utf8");
        }
        runPrisma(
          prismaCli,
          repositoryRoot,
          isolatedUrl.toString(),
          ["db", "execute", "--file", executableSecurityFile, "--schema", stagedSchema],
          `Phase 202 prerequisite role deployment (${securityFile})`
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
        [
          "db",
          "execute",
          "--file",
          "prisma/security/049_phase_203_roles_and_grants.sql",
          "--schema",
          stagedSchema
        ],
        "Phase 203 Capability Truth role deployment"
      );

      owner = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
      const prePhase204 = await owner.$queryRaw<Array<{
        activeOrSellable: number;
        catalogued: number;
        globalRecords: number;
        installations: number;
      }>>`
        SELECT
          (SELECT count(*)::int FROM entral.capability_records WHERE scope='GLOBAL') AS "globalRecords",
          (SELECT count(*)::int FROM entral.capability_records
            WHERE scope='GLOBAL' AND lifecycle_state='CATALOGUED') AS "catalogued",
          (SELECT count(*)::int FROM entral.capability_records
            WHERE lifecycle_state IN ('ACTIVE','SELLABLE')) AS "activeOrSellable",
          (SELECT count(*)::int FROM entral.tenant_capability_installations) AS "installations"
      `;
      expect(prePhase204).toEqual([{
        activeOrSellable: 0,
        catalogued: 56,
        globalRecords: 56,
        installations: 0
      }]);
      expect(await owner.$queryRaw<Array<{ count: number }>>`
        SELECT count(*)::int AS count
        FROM entral.entities
        WHERE (id='45638366-d6f0-5b27-91bf-d2362df27922'::uuid AND stable_code='ENTRAL'
          AND role='ENTRAL' AND parent_id IS NULL AND name='ENTRAL')
           OR (id='a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid AND stable_code='M02'
          AND role='MARSHAL' AND parent_id='45638366-d6f0-5b27-91bf-d2362df27922'::uuid
          AND name='Digital and Software Marshal')
           OR (id='9ce85809-e772-5a8f-be8d-34e01a9448a8'::uuid AND stable_code='G-M02-07'
          AND role='GENERAL' AND parent_id='a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid
          AND name='Digital Products General')
      `).toEqual([{ count: 3 }]);
      await owner.$disconnect();
      owner = null;

      cpSync(
        join(sourceMigrations, "20260803020000_phase_204_internal_commerce"),
        join(stagedMigrations, "20260803020000_phase_204_internal_commerce"),
        { recursive: true }
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        isolatedUrl.toString(),
        ["migrate", "deploy", "--schema", stagedSchema],
        "Phase 204 internal commerce migration"
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        isolatedUrl.toString(),
        ["migrate", "deploy", "--schema", stagedSchema],
        "Phase 204 idempotent migration retry"
      );

      owner = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
      api = new PrismaClient({
        datasources: { db: { url: loginUrl(isolatedUrl, apiRole, apiPassword) } }
      });

      const migratedScopes = await owner.$queryRaw<Array<{
        actorId: string;
        organizationId: string;
        tenantId: string;
        userId: string;
      }>>`
        SELECT actor."humanUserId" AS "userId",assignment."actorId"::text AS "actorId",
               assignment."organizationId"::text AS "organizationId",
               assignment."tenantId"::text AS "tenantId"
        FROM public."TenantActorAssignment" assignment
        JOIN public."IdentityActor" actor ON actor."id"=assignment."actorId"
        WHERE actor."humanUserId" IN (${migratedUserId},${otherUserId})
          AND assignment."status"='ACTIVE'
        ORDER BY actor."humanUserId"
      `;
      expect(migratedScopes).toHaveLength(2);
      const migrated = migratedScopes.find((scope) => scope.userId === migratedUserId)!;
      const other = migratedScopes.find((scope) => scope.userId === otherUserId)!;

      const verifierAppUserId = await withPersonalSession(
        api,
        {
          actionReason: "Bind the migrated owner to the trusted deterministic verification scope.",
          authSubject: migratedUserId,
          requestId: randomUUID()
        },
        async (_transaction, identity) => identity.appUserId,
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      await owner.$executeRaw`
        INSERT INTO entral.scope_grants (user_id,scope_type,scope_id,permissions)
        VALUES (
          ${verifierAppUserId}::uuid,'SYSTEM',NULL,
          ARRAY['record_verification']::text[]
        )
      `;

      const ownerQuery = async <T>(query: Prisma.Sql): Promise<OwnerInvocation<T>> =>
        withPersonalSession(
          api!,
          {
            actionReason: "Verify the Phase 204 internal commerce PostgreSQL boundary.",
            authSubject: migratedUserId,
            requestId: randomUUID()
          },
          async (transaction, identity) => {
            const rows = await transaction.$queryRaw<Array<{ value: T }>>(query);
            return { actorId: identity.actorId, value: rows[0]!.value };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

      const activationId = randomUUID();
      const sourceRecordId = randomUUID();
      const evidenceArtifactId = randomUUID();
      const activationRequest = {
        activation_id: activationId,
        tenant_id: migrated.tenantId,
        organization_id: migrated.organizationId,
        source_record_id: sourceRecordId,
        evidence_artifact_id: evidenceArtifactId,
        repository_reference: `mykai05/ENTRAL-0.2@${releaseCommit}:backend/tests/phase204InternalCommercePostgres.integration.test.ts`,
        release_commit_sha: releaseCommit,
        content_sha256: "a".repeat(64),
        artifact_storage_uri: `mykai05/ENTRAL-0.2@${releaseCommit}:docs/evidence/phase204/tests/internal-commerce.json`,
        idempotency_key: `phase204-activate-${suffix}`,
        release_version: "phase-204",
        requested_at: new Date().toISOString()
      };
      const activated = await withPersonalSession(
        api,
        {
          actionReason: "Verify canonical Phase 204 commerce activation persistence.",
          authSubject: migratedUserId,
          requestId: randomUUID()
        },
        async (transaction, identity): Promise<ActivationInvocation> => {
          const activationRows = await transaction.$queryRaw<Array<{ value: Activation }>>`
            SELECT entral.phase204_activate_internal_commerce(
              ${JSON.stringify(activationRequest)}::jsonb
            ) AS "value"
          `;
          const readbackRows = await transaction.$queryRaw<Array<{
            databaseName: string;
            value: { storefront: { state: string } };
          }>>`
            SELECT current_database() AS "databaseName",
                   entral.phase204_internal_commerce_readback(
                     ${migrated.tenantId}::uuid,${migrated.organizationId}::uuid
                   ) AS "value"
          `;
          return {
            actorId: identity.actorId,
            databaseName: readbackRows[0]!.databaseName,
            inTransactionState: readbackRows[0]!.value.storefront.state,
            value: activationRows[0]!.value
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      expect(activated.actorId).toBe(migrated.actorId);
      expect(activated.databaseName).toBe(databaseName);
      expect(activated.inTransactionState).toBe("OWNER_ACTION_REQUIRED");
      expect(activated.value).toEqual(expect.objectContaining({
        activation_id: activationId,
        business_code: "SP-COMMERCE-001",
        commerce_control_state: "PUBLICATION_DISABLED",
        evidence_artifact_id: evidenceArtifactId,
        general_id: "9ce85809-e772-5a8f-be8d-34e01a9448a8",
        marshal_id: "a50b1493-ffe1-5373-ad1b-96bb393a0c6f",
        preferred_provider: "ETSY",
        public_brand: null,
        release_version: "phase-204",
        source_record_id: sourceRecordId,
        working_name: "Contractor Operations Products"
      }));
      expect(activated.value.product_ids).toHaveLength(5);
      expect(activated.value.soldier_ids).toHaveLength(3);

      const persistedActivation = await owner.$queryRaw<Array<{
        activationCount: number;
        mutationCount: number;
        responseSnapshot: Activation | null;
        storedBusinessId: string | null;
      }>>`
        SELECT
          (SELECT count(*)::int FROM entral.phase204_internal_commerce_activations
            WHERE activation_id=${activationId}::uuid) AS "activationCount",
          (SELECT count(*)::int FROM entral.phase204_mutation_receipts
            WHERE operation='ACTIVATE_INTERNAL_COMMERCE'
              AND idempotency_key=${activationRequest.idempotency_key}) AS "mutationCount",
          (SELECT canonical_business_id::text FROM entral.phase204_internal_commerce_activations
            WHERE activation_id=${activationId}::uuid) AS "storedBusinessId",
          (SELECT response_snapshot FROM entral.phase204_mutation_receipts
            WHERE operation='ACTIVATE_INTERNAL_COMMERCE'
              AND idempotency_key=${activationRequest.idempotency_key}) AS "responseSnapshot"
      `;
      expect(persistedActivation).toEqual([{
        activationCount: 1,
        mutationCount: 1,
        responseSnapshot: activated.value,
        storedBusinessId: activated.value.canonical_business_id
      }]);

      const replay = await ownerQuery<Activation>(Prisma.sql`
        SELECT entral.phase204_activate_internal_commerce(
          ${JSON.stringify(activationRequest)}::jsonb
        ) AS "value"
      `);
      expect(replay.value).toEqual(activated.value);
      await expect(ownerQuery(Prisma.sql`
        SELECT entral.phase204_activate_internal_commerce(
          ${JSON.stringify({ ...activationRequest, content_sha256: "b".repeat(64) })}::jsonb
        ) AS "value"
      `)).rejects.toThrow();

      const businessTruth = await owner.$queryRaw<Array<{
        activeOperationTasks: number;
        businessCount: number;
        commanderCount: number;
        completedProvisionTasks: number;
        eventCount: number;
        missionCount: number;
        outboxCount: number;
        soldierCount: number;
        verificationCount: number;
      }>>`
        SELECT
          (SELECT count(*)::int FROM entral.businesses WHERE stable_code='SP-COMMERCE-001'
            AND name='Contractor Operations Products' AND status='OPERATING') AS "businessCount",
          (SELECT count(*)::int FROM entral.entities WHERE id=${activated.value.commander_id}::uuid
            AND stable_code='C-SP-COMMERCE-001' AND role='COMMANDER'
            AND parent_id='9ce85809-e772-5a8f-be8d-34e01a9448a8'::uuid
            AND business_id=${activated.value.canonical_business_id}::uuid AND status='ACTIVE') AS "commanderCount",
          (SELECT count(*)::int FROM entral.entities WHERE id=ANY(${activated.value.soldier_ids}::uuid[])
            AND role='SOLDIER' AND parent_id=${activated.value.commander_id}::uuid
            AND business_id=${activated.value.canonical_business_id}::uuid AND status='ACTIVE') AS "soldierCount",
          (SELECT count(*)::int FROM entral.missions WHERE id=${activated.value.launch_mission_id}::uuid
            AND stable_code='SP-COMMERCE-001-LAUNCH-M01' AND status='ACTIVE') AS "missionCount",
          (SELECT count(*)::int FROM entral.tasks WHERE mission_id=${activated.value.launch_mission_id}::uuid
            AND stable_code LIKE 'SP-COMMERCE-001-PROVISION-%' AND status='COMPLETED') AS "completedProvisionTasks",
          (SELECT count(*)::int FROM entral.tasks WHERE mission_id=${activated.value.launch_mission_id}::uuid
            AND stable_code LIKE 'SP-COMMERCE-001-OPERATE-%' AND status='ACTIVE'
            AND owner_entity_id=ANY(${activated.value.soldier_ids}::uuid[])) AS "activeOperationTasks",
          (SELECT count(*)::int FROM entral.canonical_events
            WHERE aggregate_type='BUSINESSES' AND aggregate_id=${activated.value.canonical_business_id}::uuid) AS "eventCount",
          (SELECT count(*)::int FROM entral.transactional_outbox outbox
            JOIN entral.canonical_events event ON event.id=outbox.event_id
            WHERE event.aggregate_type='BUSINESSES'
              AND event.aggregate_id=${activated.value.canonical_business_id}::uuid) AS "outboxCount",
          (SELECT count(*)::int FROM entral.verification_results verification
            JOIN entral.governance_actions action
              ON action.verification_result_id=verification.id
            WHERE action.id=${activated.value.governance_action_id}::uuid
              AND action.status='SUCCEEDED'
              AND verification.subject_type='GOVERNANCE_ACTION'
              AND verification.subject_id=action.id
              AND verification.status='PASSED'
              AND verification.trusted_provenance) AS "verificationCount"
      `;
      expect(businessTruth[0]).toEqual({
        activeOperationTasks: 3,
        businessCount: 1,
        commanderCount: 1,
        completedProvisionTasks: 3,
        eventCount: expect.any(Number),
        missionCount: 1,
        outboxCount: expect.any(Number),
        soldierCount: 3,
        verificationCount: 1
      });
      expect(businessTruth[0]!.eventCount).toBeGreaterThan(0);
      expect(businessTruth[0]!.outboxCount).toBe(businessTruth[0]!.eventCount);

      const products = await owner.$queryRaw<Array<{
        currency: string;
        productCode: string;
        productKind: string;
        priceCents: number;
        title: string;
      }>>`
        SELECT product_code AS "productCode",title,product_kind AS "productKind",
               price_cents AS "priceCents",currency::text AS currency
        FROM entral.phase204_internal_commerce_products
        WHERE business_boundary_id=${activated.value.business_boundary_id}::uuid
        ORDER BY product_code
      `;
      expect(products.map((product) => [product.productCode, product.title, product.priceCents]))
        .toEqual(productTruth);
      expect(products.filter((product) => product.productKind === "PRODUCT")).toHaveLength(4);
      expect(products.filter((product) => product.productKind === "BUNDLE")).toHaveLength(1);
      expect(products.every((product) => product.currency === "USD")).toBe(true);
      expect(await owner.$queryRaw<Array<{ count: number }>>`
        SELECT count(*)::int AS count FROM entral.phase204_product_bundle_items
        WHERE bundle_product_id=(SELECT product_id FROM entral.phase204_internal_commerce_products
          WHERE product_code='COMPLETE_CONTRACTOR_CONTROL_BUNDLE')
      `).toEqual([{ count: 4 }]);

      const metricTruth = await owner.$queryRaw<Array<{
        fakeZeroCount: number;
        metricCount: number;
        reasonCount: number;
        scopeCount: number;
        unavailableCount: number;
      }>>`
        SELECT count(*)::int AS "metricCount",
               count(*) FILTER (WHERE truth_state='UNAVAILABLE')::int AS "unavailableCount",
               count(*) FILTER (WHERE unavailable_reason IS NOT NULL)::int AS "reasonCount",
               count(DISTINCT (scope_type,scope_code))::int AS "scopeCount",
               count(*) FILTER (WHERE value_numeric=0 OR value_numeric IS NOT NULL)::int AS "fakeZeroCount"
        FROM entral.phase204_operational_metric_truth
        WHERE business_boundary_id=${activated.value.business_boundary_id}::uuid
      `;
      expect(metricTruth).toEqual([{
        fakeZeroCount: 0,
        metricCount: 54,
        reasonCount: 54,
        scopeCount: 6,
        unavailableCount: 54
      }]);

      const controls = await owner.$queryRaw<Array<{
        availability: string;
        controlCode: string;
        controlState: string;
        ownerApproval: boolean;
      }>>`
        SELECT control_code AS "controlCode",availability,control_state AS "controlState",
               requires_owner_approval AS "ownerApproval"
        FROM entral.phase204_commerce_controls
        WHERE business_boundary_id=${activated.value.business_boundary_id}::uuid
        ORDER BY control_code,version DESC
      `;
      expect(controls).toEqual([
        {
          availability: "AVAILABLE",
          controlCode: "DISABLE_PUBLICATION",
          controlState: "ENGAGED",
          ownerApproval: false
        },
        {
          availability: "AVAILABLE",
          controlCode: "KILL_BUSINESS",
          controlState: "ARMED",
          ownerApproval: true
        },
        {
          availability: "AVAILABLE",
          controlCode: "PAUSE_BUSINESS",
          controlState: "ARMED",
          ownerApproval: false
        }
      ]);

      const tenantCapabilityIds = catalogCapabilityIds.map(() => randomUUID());
      for (const [index, catalogCapabilityId] of catalogCapabilityIds.entries()) {
        const tenantCapabilityId = tenantCapabilityIds[index]!;
        const registrationRequest = {
          tenant_capability_id: tenantCapabilityId,
          catalog_capability_id: catalogCapabilityId,
          tenant_id: migrated.tenantId,
          organization_id: migrated.organizationId,
          owner: "Sovereign Protocol internal commerce owner",
          purpose: "Operate only the bounded internal contractor-products business.",
          required_evidence: requiredEvidenceTypes,
          activation_requirements: [{
            requirement_code: "INTERNAL_COMMERCE_RELEASE",
            description: "The exact internal commerce release evidence must pass.",
            required: true,
            satisfied: false,
            evidence_receipt_ids: []
          }],
          rollback_path: "Suspend the tenant installation and return to the prior lifecycle state.",
          deactivation_path: "Deactivate only this tenant-scoped internal installation.",
          implementation_reference: `mykai05/ENTRAL-0.2@${releaseCommit}:prisma/migrations/20260803020000_phase_204_internal_commerce/migration.sql`,
          limitations: ["Internal tenant runtime only; no customer-software claim."],
          idempotency_key: `phase204-register-${index}-${suffix}`,
          release_version: "phase-204",
          requested_at: new Date().toISOString()
        };
        const registered = await ownerQuery<CapabilitySnapshot>(Prisma.sql`
          SELECT entral.phase204_register_tenant_capability(
            ${JSON.stringify(registrationRequest)}::jsonb
          ) AS "value"
        `);
        expect(registered.value).toEqual(expect.objectContaining({
          capability_id: tenantCapabilityId,
          lifecycle_state: "CATALOGUED",
          pricing_eligibility: "NOT_ELIGIBLE",
          public_claim_eligible: false
        }));

        let recordVersion = registered.value.record_version;
        const receiptIds: string[] = [];
        const capturedAt = new Date(Date.now() + 1_000);
        const expiresAt = new Date(capturedAt.getTime() + 30 * 24 * 60 * 60 * 1_000);
        for (const [evidenceIndex, evidenceType] of requiredEvidenceTypes.entries()) {
          const receiptId = randomUUID();
          const evidenceRequest = {
            receipt_id: receiptId,
            capability_id: tenantCapabilityId,
            tenant_id: migrated.tenantId,
            organization_id: migrated.organizationId,
            expected_record_version: recordVersion,
            evidence_type: evidenceType,
            environment: "PRODUCTION",
            status: "PASSED",
            reference: evidenceReference(releaseCommit, suffix, `${index}-${evidenceType}`),
            content_sha256: (evidenceIndex + index + 1).toString(16).slice(-1).repeat(64),
            captured_at: capturedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            idempotency_key: `phase204-evidence-${index}-${evidenceIndex}-${suffix}`,
            release_version: "phase-204"
          };
          const recorded = await ownerQuery<CapabilitySnapshot>(Prisma.sql`
            SELECT entral.phase204_record_capability_evidence(
              ${JSON.stringify(evidenceRequest)}::jsonb
            ) AS "value"
          `);
          recordVersion = recorded.value.record_version;
          receiptIds.push(receiptId);
        }
        const lifecycleTime = new Date(Date.now() + 2_000).toISOString();
        const requirement = await ownerQuery<CapabilitySnapshot>(Prisma.sql`
          SELECT entral.phase204_bind_capability_requirement(${JSON.stringify({
            capability_id: tenantCapabilityId,
            tenant_id: migrated.tenantId,
            organization_id: migrated.organizationId,
            expected_record_version: recordVersion,
            requirement_code: "INTERNAL_COMMERCE_RELEASE",
            evidence_receipt_ids: receiptIds,
            idempotency_key: `phase204-requirement-${index}-${suffix}`,
            release_version: "phase-204",
            requested_at: lifecycleTime
          })}::jsonb) AS "value"
        `);
        recordVersion = requirement.value.record_version;

        const transition = async (
          fromState: string,
          toState: string,
          evidenceReceiptIds: string[],
          step: string
        ) => {
          const transitioned = await ownerQuery<CapabilitySnapshot>(Prisma.sql`
            SELECT entral.phase203_transition_capability(${JSON.stringify({
              transition_id: randomUUID(),
              capability_id: tenantCapabilityId,
              actor_id: migrated.actorId,
              tenant_id: migrated.tenantId,
              organization_id: migrated.organizationId,
              business_id: activated.value.business_boundary_id,
              correlation_id: activationId,
              requested_at: lifecycleTime,
              expected_record_version: recordVersion,
              from_state: fromState,
              to_state: toState,
              pricing_eligibility: "NOT_ELIGIBLE",
              evidence_receipt_ids: evidenceReceiptIds,
              reason: `Verify the tenant-only ${fromState} to ${toState} lifecycle step.`,
              idempotency_key: `phase204-transition-${index}-${step}-${suffix}`,
              release_version: "phase-204"
            })}::jsonb) AS "value"
          `);
          recordVersion = transitioned.value.record_version;
          return transitioned.value;
        };

        await transition("CATALOGUED", "DESIGNED", [], "designed");
        await transition("DESIGNED", "IMPLEMENTED", [], "implemented");
        await transition("IMPLEMENTED", "UNIT_VERIFIED", [receiptIds[0]!], "unit");
        await transition("UNIT_VERIFIED", "INTEGRATION_VERIFIED", [receiptIds[1]!], "integration");
        await transition("INTEGRATION_VERIFIED", "CANARY_VERIFIED", [receiptIds[2]!], "canary");
        const active = await transition("CANARY_VERIFIED", "ACTIVE", receiptIds, "active");
        expect(active).toEqual(expect.objectContaining({
          lifecycle_state: "ACTIVE",
          pricing_eligibility: "NOT_ELIGIBLE",
          public_claim_eligible: false
        }));

        const installationId = randomUUID();
        const installed = await ownerQuery<InstallationSnapshot>(Prisma.sql`
          SELECT entral.phase204_register_capability_installation(${JSON.stringify({
            installation_id: installationId,
            capability_id: tenantCapabilityId,
            business_boundary_id: activated.value.business_boundary_id,
            tenant_id: migrated.tenantId,
            organization_id: migrated.organizationId,
            idempotency_key: `phase204-install-${index}-${suffix}`,
            release_version: "phase-204",
            requested_at: lifecycleTime
          })}::jsonb) AS "value"
        `);
        expect(installed.value).toEqual(expect.objectContaining({
          plan_eligible: false,
          state: "AVAILABLE"
        }));
        let installationVersion = installed.value.record_version;
        const transitionInstallation = async (
          fromState: string,
          toState: string,
          evidenceReceiptIds: string[],
          step: string
        ) => {
          const transitioned = await ownerQuery<InstallationSnapshot>(Prisma.sql`
            SELECT entral.phase204_transition_capability_installation(${JSON.stringify({
              transition_id: randomUUID(),
              installation_id: installationId,
              tenant_id: migrated.tenantId,
              organization_id: migrated.organizationId,
              from_state: fromState,
              to_state: toState,
              expected_record_version: installationVersion,
              evidence_receipt_ids: evidenceReceiptIds,
              reason: `Verify the ${fromState} to ${toState} tenant installation step.`,
              correlation_id: activationId,
              idempotency_key: `phase204-install-transition-${index}-${step}-${suffix}`,
              release_version: "phase-204",
              requested_at: lifecycleTime
            })}::jsonb) AS "value"
          `);
          installationVersion = transitioned.value.record_version;
          return transitioned.value;
        };
        await transitionInstallation("AVAILABLE", "ACTIVATING", [], "activating");
        const activeInstallation = await transitionInstallation(
          "ACTIVATING",
          "ACTIVE",
          receiptIds,
          "active"
        );
        expect(activeInstallation).toEqual(expect.objectContaining({
          plan_eligible: false,
          state: "ACTIVE"
        }));
      }

      const capabilityTruth = await owner.$queryRaw<Array<{
        activeTenant: number;
        globalCatalogued: number;
        globalRecords: number;
        globalSellable: number;
        installationActive: number;
        installationPlanEligible: number;
        tenantPublic: number;
        tenantRecords: number;
        tenantSellable: number;
      }>>`
        SELECT
          (SELECT count(*)::int FROM entral.capability_records WHERE scope='GLOBAL') AS "globalRecords",
          (SELECT count(*)::int FROM entral.capability_records
            WHERE scope='GLOBAL' AND lifecycle_state='CATALOGUED') AS "globalCatalogued",
          (SELECT count(*)::int FROM entral.capability_records
            WHERE scope='GLOBAL' AND lifecycle_state='SELLABLE') AS "globalSellable",
          (SELECT count(*)::int FROM entral.capability_records
            WHERE scope='TENANT' AND tenant_id=${migrated.tenantId}::uuid) AS "tenantRecords",
          (SELECT count(*)::int FROM entral.capability_records
            WHERE scope='TENANT' AND tenant_id=${migrated.tenantId}::uuid
              AND lifecycle_state='ACTIVE') AS "activeTenant",
          (SELECT count(*)::int FROM entral.capability_records
            WHERE scope='TENANT' AND tenant_id=${migrated.tenantId}::uuid
              AND lifecycle_state='SELLABLE') AS "tenantSellable",
          (SELECT count(*)::int FROM entral.capability_records
            WHERE scope='TENANT' AND tenant_id=${migrated.tenantId}::uuid
              AND public_claim_eligible) AS "tenantPublic",
          (SELECT count(*)::int FROM entral.tenant_capability_installations
            WHERE tenant_id=${migrated.tenantId}::uuid AND state='ACTIVE') AS "installationActive",
          (SELECT count(*)::int FROM entral.tenant_capability_installations
            WHERE tenant_id=${migrated.tenantId}::uuid AND plan_eligible) AS "installationPlanEligible"
      `;
      expect(capabilityTruth).toEqual([{
        activeTenant: 4,
        globalCatalogued: 56,
        globalRecords: 56,
        globalSellable: 0,
        installationActive: 4,
        installationPlanEligible: 0,
        tenantPublic: 0,
        tenantRecords: 4,
        tenantSellable: 0
      }]);
      const sourceBindings = await owner.$queryRaw<Array<{ catalogCapabilityId: string }>>`
        SELECT catalog_capability_id::text AS "catalogCapabilityId"
        FROM entral.phase204_capability_source_bindings
        WHERE tenant_id=${migrated.tenantId}::uuid
          AND organization_id=${migrated.organizationId}::uuid
        ORDER BY catalog_capability_id
      `;
      expect(new Set(sourceBindings.map((binding) => binding.catalogCapabilityId)))
        .toEqual(new Set(catalogCapabilityIds));

      const storefrontReadback = await ownerQuery<JsonRecord>(Prisma.sql`
        SELECT entral.phase204_internal_commerce_readback(
          ${migrated.tenantId}::uuid,${migrated.organizationId}::uuid
        ) AS "value"
      `);
      expect(storefrontReadback.value).toEqual(expect.objectContaining({
        business: expect.objectContaining({
          internal_code: "SP-COMMERCE-001",
          status: "OPERATING"
        }),
        readiness: expect.objectContaining({
          all_products_ready: false,
          exact_control_count: 3,
          exact_metric_truth_count: 54,
          exact_product_count: 5,
          owner_approval_present: false
        }),
        storefront: expect.objectContaining({
          owner_approval_id: null,
          preferred_provider: "ETSY",
          provider: "ETSY",
          publication_allowed: false,
          public_brand: null,
          state: "OWNER_ACTION_REQUIRED"
        })
      }));
      expect((storefrontReadback.value.capabilities as unknown[])).toHaveLength(4);
      expect((storefrontReadback.value.operational_metrics as Array<JsonRecord>)).toHaveLength(54);
      expect((storefrontReadback.value.operational_metrics as Array<JsonRecord>).every((metric) =>
        metric.truth_state === "UNAVAILABLE"
        && metric.value === null
        && typeof metric.unavailable_reason === "string"
        && metric.is_estimate === false
      )).toBe(true);

      await expect(ownerQuery(Prisma.sql`
        SELECT entral.phase204_record_storefront_state(${JSON.stringify({
          storefront_state_event_id: randomUUID(),
          storefront_id: activated.value.storefront_id,
          tenant_id: migrated.tenantId,
          organization_id: migrated.organizationId,
          provider: "ETSY",
          state: "READY_FOR_OWNER_APPROVAL",
          public_brand: "Synthetic Test Brand",
          market_evidence_source_record_id: null,
          provider_policy_evidence_ids: [],
          etsy_blocker_code: null,
          etsy_blocker_evidence_source_record_id: null,
          state_reason: "A negative test must not bypass missing market, policy, asset, and gate evidence.",
          occurred_at: new Date().toISOString(),
          idempotency_key: `phase204-storefront-negative-${suffix}`,
          release_version: "phase-204"
        })}::jsonb) AS "value"
      `)).rejects.toThrow();

      const approvalProducts = products.map((product) => ({
        product_code: product.productCode,
        price_cents: product.priceCents,
        delivery_manifest_sha256: "0".repeat(64),
        claims_sha256: "0".repeat(64),
        approved: true
      }));
      await expect(ownerQuery(Prisma.sql`
        SELECT entral.phase204_approve_publication(${JSON.stringify({
          approval_id: randomUUID(),
          authority: "FIRST_EXTERNAL_PUBLICATION",
          approved: true,
          owner_actor_id: migrated.actorId,
          approved_at: new Date().toISOString(),
          selected_provider: "ETSY",
          storefront_id: activated.value.storefront_id,
          tenant_id: migrated.tenantId,
          organization_id: migrated.organizationId,
          public_brand_name: "Synthetic Test Brand",
          product_approvals: approvalProducts,
          setup_spend_limit_cents: 15_000,
          advertising_budget_cents: 0,
          envelope_sha256: "c".repeat(64),
          revoked_at: null,
          idempotency_key: `phase204-approval-negative-${suffix}`,
          release_version: "phase-204"
        })}::jsonb) AS "value"
      `)).rejects.toThrow();

      const leadManifest = await owner.$queryRaw<Array<{ manifest: JsonRecord }>>`
        SELECT entral.phase204_product_manifest_hashes(product_id) AS manifest
        FROM entral.phase204_internal_commerce_products
        WHERE product_code='LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT'
      `;
      await expect(ownerQuery(Prisma.sql`
        SELECT entral.phase204_record_listing_state(${JSON.stringify({
          listing_record_id: randomUUID(),
          storefront_id: activated.value.storefront_id,
          tenant_id: migrated.tenantId,
          organization_id: migrated.organizationId,
          product_code: "LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT",
          provider_listing_id: null,
          status: "READY_FOR_OWNER_APPROVAL",
          price_cents: 2_900,
          delivery_manifest_sha256: leadManifest[0]!.manifest.delivery_manifest_sha256,
          published_at: null,
          provider_evidence_ids: [],
          idempotency_key: `phase204-listing-negative-${suffix}`,
          release_version: "phase-204"
        })}::jsonb) AS "value"
      `)).rejects.toThrow();

      const failClosed = await owner.$queryRaw<Array<{
        approvalCount: number;
        nonDraftListings: number;
        publicationAllowed: boolean;
        publishedStateCount: number;
      }>>`
        SELECT entral.phase204_publication_allowed(${activated.value.storefront_id}::uuid)
                 AS "publicationAllowed",
               (SELECT count(*)::int FROM entral.phase204_publication_approval_envelopes
                 WHERE storefront_id=${activated.value.storefront_id}::uuid) AS "approvalCount",
               (SELECT count(*)::int FROM entral.phase204_storefront_listing_records
                 WHERE storefront_id=${activated.value.storefront_id}::uuid
                   AND status<>'DRAFT') AS "nonDraftListings",
               (SELECT count(*)::int FROM entral.phase204_storefront_state_events
                 WHERE storefront_id=${activated.value.storefront_id}::uuid
                   AND state='PUBLISHED') AS "publishedStateCount"
      `;
      expect(failClosed).toEqual([{
        approvalCount: 0,
        nonDraftListings: 0,
        publicationAllowed: false,
        publishedStateCount: 0
      }]);

      await expect(withPersonalSession(
        api,
        {
          actionReason: "Prove cross-tenant Phase 204 rows remain invisible.",
          authSubject: otherUserId,
          requestId: randomUUID()
        },
        async (transaction) => transaction.$queryRaw<Array<{ count: number }>>`
          SELECT count(*)::int AS count FROM entral.phase204_internal_commerce_products
        `,
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )).rejects.toThrow();
      await expect(withPersonalSession(
        api,
        {
          actionReason: "Prove cross-tenant Phase 204 readback is denied.",
          authSubject: otherUserId,
          requestId: randomUUID()
        },
        async (transaction) => transaction.$queryRaw`
          SELECT entral.phase204_internal_commerce_readback(
            ${migrated.tenantId}::uuid,${migrated.organizationId}::uuid
          )
        `,
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )).rejects.toThrow();
      const otherTenantReadback = await withPersonalSession(
        api,
        {
          actionReason: "Verify the other tenant has no synthetic commerce activation.",
          authSubject: otherUserId,
          requestId: randomUUID()
        },
        async (transaction) => transaction.$queryRaw<Array<{ value: JsonRecord }>>`
          SELECT entral.phase204_internal_commerce_readback(
            ${other.tenantId}::uuid,${other.organizationId}::uuid
          ) AS "value"
        `,
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
      expect(otherTenantReadback).toEqual([{
        value: expect.objectContaining({
          business: null,
          state: "NOT_ACTIVATED"
        })
      }]);
      expect(other.tenantId).not.toBe(migrated.tenantId);

      const auditTruth = await owner.$queryRaw<Array<{
        activationMutations: number;
        capabilityTransitions: number;
        installationTransitions: number;
        releaseMismatch: number;
      }>>`
        SELECT
          (SELECT count(*)::int FROM entral.phase204_mutation_receipts
            WHERE operation='ACTIVATE_INTERNAL_COMMERCE') AS "activationMutations",
          (SELECT count(*)::int FROM entral.capability_transition_audit
            WHERE capability_id=ANY(${tenantCapabilityIds}::uuid[])
              AND release_version='phase-204') AS "capabilityTransitions",
          (SELECT count(*)::int FROM entral.tenant_capability_installation_audit audit
            JOIN entral.tenant_capability_installations installation
              ON installation.installation_id=audit.installation_id
            WHERE installation.capability_id=ANY(${tenantCapabilityIds}::uuid[])
              AND audit.release_version='phase-204') AS "installationTransitions",
          (SELECT count(*)::int FROM entral.capability_transition_audit
            WHERE capability_id=ANY(${tenantCapabilityIds}::uuid[])
              AND release_version<>'phase-204') AS "releaseMismatch"
      `;
      expect(auditTruth).toEqual([{
        activationMutations: 1,
        capabilityTransitions: 24,
        installationTransitions: 8,
        releaseMismatch: 0
      }]);
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
