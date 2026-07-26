import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(testDatabaseUrl && process.env.RUN_POSTGRES_INTEGRATION === "1");

type LoginRole = {
  group: "entral_api" | "entral_audit_reader" | "entral_verifier" | "entral_worker";
  name: string;
  password: string;
};

type RoleFacts = {
  canBypassRls: boolean;
  canCreateRole: boolean;
  canLogin: boolean;
  canTemp: boolean;
  name: string;
  ownsDatabase: boolean;
  ownsEntralRelations: boolean;
  superuser: boolean;
};

type Seed = {
  apiSubject: string;
  apiUserId: string;
  artifactA: string;
  artifactB: string;
  auditUserId: string;
  businessA: string;
  businessB: string;
  commanderA: string;
  commanderB: string;
  contextManifestA: string;
  contextManifestB: string;
  contextManifestMissionA: string;
  credentialA: string;
  credentialB: string;
  evidenceA: string;
  evidenceB: string;
  memoryA: string;
  memoryB: string;
  metricDefinitionId: string;
  missionA: string;
  modelProfileId: string;
  sourceA: string;
  sourceB: string;
  toolId: string;
  toolGrantA: string;
  toolGrantB: string;
  verifierUserId: string;
  workerUserId: string;
};

type MaterialCounts = {
  audit: number;
  events: number;
  outbox: number;
  versions: number;
};

function loginUrl(databaseUrl: URL, role: LoginRole) {
  const url = new URL(databaseUrl);
  url.username = role.name;
  url.password = role.password;
  url.searchParams.set("connection_limit", "1");
  return url.toString();
}

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

async function withApiContext<T>(
  client: PrismaClient,
  authSubject: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  reason = "Phase 150 API identity integration test."
) {
  return client.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT
        entral.bind_authenticated_app_user(${authSubject}),
        set_config('app.action_reason', ${reason}, true)
    `;
    return operation(tx);
  });
}

async function withServiceContext<T>(
  client: PrismaClient,
  appUserId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  reason = "Phase 150 service identity integration test."
) {
  return client.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT
        entral.bind_service_app_user(${appUserId}::uuid),
        set_config('app.action_reason', ${reason}, true)
    `;
    return operation(tx);
  });
}

async function expectApiDenied(
  client: PrismaClient,
  authSubject: string,
  operation: (tx: Prisma.TransactionClient) => Promise<unknown>
) {
  await expect(withApiContext(client, authSubject, operation)).rejects.toThrow();
}

async function expectServiceDenied(
  client: PrismaClient,
  appUserId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<unknown>
) {
  await expect(withServiceContext(client, appUserId, operation)).rejects.toThrow();
}

async function roleFacts(client: PrismaClient): Promise<RoleFacts> {
  const rows = await client.$queryRaw<RoleFacts[]>`
    SELECT
      current_user AS name,
      role.rolcanlogin AS "canLogin",
      role.rolsuper AS superuser,
      role.rolbypassrls AS "canBypassRls",
      role.rolcreaterole AS "canCreateRole",
      current_user = pg_get_userbyid(database.datdba) AS "ownsDatabase",
      EXISTS (
        SELECT 1
        FROM pg_class relation
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE namespace.nspname = 'entral'
          AND relation.relowner = role.oid
      ) AS "ownsEntralRelations",
      has_database_privilege(current_user, current_database(), 'TEMP') AS "canTemp"
    FROM pg_roles role
    JOIN pg_database database ON database.datname = current_database()
    WHERE role.rolname = current_user
  `;
  return rows[0]!;
}

async function visibleId(
  client: PrismaClient | Prisma.TransactionClient,
  table:
    | "artifacts"
    | "credential_references"
    | "evidence_links"
    | "memory_items"
    | "source_records"
    | "tool_grants",
  id: string
) {
  return client.$queryRawUnsafe<Array<{ id: string }>>(
    `SELECT id::text AS id FROM entral.${table} WHERE id = $1::uuid`,
    id
  );
}

async function materialCounts(owner: PrismaClient, entityId: string): Promise<MaterialCounts> {
  const rows = await owner.$queryRaw<MaterialCounts[]>`
    SELECT
      (SELECT count(*)::integer FROM entral.entity_versions
       WHERE entity_id = ${entityId}::uuid) AS versions,
      (SELECT count(*)::integer FROM entral.audit_entries
       WHERE target_type = 'ENTITIES' AND target_id = ${entityId}::uuid
         AND action = 'entities.update') AS audit,
      (SELECT count(*)::integer FROM entral.canonical_events
       WHERE aggregate_type = 'ENTITIES' AND aggregate_id = ${entityId}::uuid
         AND event_type = 'entities.update') AS events,
      (SELECT count(*)::integer
       FROM entral.transactional_outbox outbox
       JOIN entral.canonical_events event ON event.id = outbox.event_id
       WHERE event.aggregate_type = 'ENTITIES'
         AND event.aggregate_id = ${entityId}::uuid
         AND event.event_type = 'entities.update') AS outbox
  `;
  return rows[0]!;
}

async function seedCanonicalData(owner: PrismaClient, suffix: string): Promise<Seed> {
  const seed: Seed = {
    apiSubject: `phase150-api-${suffix}`,
    apiUserId: randomUUID(),
    artifactA: randomUUID(),
    artifactB: randomUUID(),
    auditUserId: randomUUID(),
    businessA: randomUUID(),
    businessB: randomUUID(),
    commanderA: randomUUID(),
    commanderB: randomUUID(),
    contextManifestA: randomUUID(),
    contextManifestB: randomUUID(),
    contextManifestMissionA: randomUUID(),
    credentialA: randomUUID(),
    credentialB: randomUUID(),
    evidenceA: randomUUID(),
    evidenceB: randomUUID(),
    memoryA: randomUUID(),
    memoryB: randomUUID(),
    metricDefinitionId: randomUUID(),
    missionA: randomUUID(),
    modelProfileId: randomUUID(),
    sourceA: randomUUID(),
    sourceB: randomUUID(),
    toolId: randomUUID(),
    toolGrantA: randomUUID(),
    toolGrantB: randomUUID(),
    verifierUserId: randomUUID(),
    workerUserId: randomUUID()
  };

  await owner.user.create({
    data: {
      email: `phase150-api-${suffix}@example.test`,
      id: seed.apiSubject,
      name: "Phase 150 API User",
      passwordHash: "integration-test-only",
      role: "USER"
    }
  });
  await owner.$executeRaw`
    INSERT INTO entral.app_users (
      id, email, display_name, is_human_authority, is_active, auth_subject
    )
    VALUES
      (
        ${seed.apiUserId}::uuid,
        ${`phase150-api-${suffix}@example.test`},
        'Phase 150 API User',
        false,
        true,
        ${seed.apiSubject}
      ),
      (
        ${seed.workerUserId}::uuid,
        ${`phase150-worker-${suffix}@example.test`},
        'Phase 150 Worker',
        false,
        true,
        NULL
      ),
      (
        ${seed.auditUserId}::uuid,
        ${`phase150-audit-${suffix}@example.test`},
        'Phase 150 Audit Reader',
        false,
        true,
        NULL
      ),
      (
        ${seed.verifierUserId}::uuid,
        ${`phase150-verifier-${suffix}@example.test`},
        'Phase 150 Trusted Verifier',
        false,
        true,
        NULL
      )
  `;

  const entralId = randomUUID();
  const marshalA = randomUUID();
  const marshalB = randomUUID();
  const generalA = randomUUID();
  const generalB = randomUUID();

  await owner.$executeRaw`
    INSERT INTO entral.entities (id, stable_code, role, name, status)
    VALUES (
      ${entralId}::uuid,
      ${`ENTRAL-${suffix}`},
      'ENTRAL',
      'ENTRAL',
      'ACTIVE'
    )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
    VALUES
      (
        ${marshalA}::uuid,
        ${`M-A-${suffix}`},
        'MARSHAL',
        'Marshal A',
        ${entralId}::uuid,
        'ACTIVE'
      ),
      (
        ${marshalB}::uuid,
        ${`M-B-${suffix}`},
        'MARSHAL',
        'Marshal B',
        ${entralId}::uuid,
        'ACTIVE'
      )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
    VALUES
      (
        ${generalA}::uuid,
        ${`G-A-${suffix}`},
        'GENERAL',
        'General A',
        ${marshalA}::uuid,
        'ACTIVE'
      ),
      (
        ${generalB}::uuid,
        ${`G-B-${suffix}`},
        'GENERAL',
        'General B',
        ${marshalB}::uuid,
        'ACTIVE'
      )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
    VALUES
      (
        ${seed.commanderA}::uuid,
        ${`C-A-${suffix}`},
        'COMMANDER',
        'Commander A',
        ${generalA}::uuid,
        'ACTIVE'
      ),
      (
        ${seed.commanderB}::uuid,
        ${`C-B-${suffix}`},
        'COMMANDER',
        'Commander B',
        ${generalB}::uuid,
        'ACTIVE'
      )
  `;
  await owner.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO entral.businesses (
        id, stable_code, name, commander_id, general_id, marshal_id, status
      )
      VALUES
        (
          ${seed.businessA}::uuid,
          ${`BIZ-A-${suffix}`},
          'Business A',
          ${seed.commanderA}::uuid,
          ${generalA}::uuid,
          ${marshalA}::uuid,
          'OPERATING'
        ),
        (
          ${seed.businessB}::uuid,
          ${`BIZ-B-${suffix}`},
          'Business B',
          ${seed.commanderB}::uuid,
          ${generalB}::uuid,
          ${marshalB}::uuid,
          'OPERATING'
        )
    `;
    await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
  });

  await owner.$executeRaw`
    INSERT INTO entral.scope_grants (user_id, scope_type, scope_id, permissions)
    VALUES
      (
        ${seed.apiUserId}::uuid,
        'BUSINESS',
        ${seed.businessA}::uuid,
        ARRAY[
          'read', 'manage', 'manage_data', 'manage_memory', 'manage_tools',
          'manage_credentials', 'read_audit', 'read_events',
          'read_confidential', 'read_restricted', 'read_ai', 'run_ai',
          'manage_ai', 'manage_metrics'
        ]::text[]
      ),
      (
        ${seed.workerUserId}::uuid,
        'SYSTEM',
        NULL,
        ARRAY['publish_events']::text[]
      ),
      (
        ${seed.auditUserId}::uuid,
        'SYSTEM',
        NULL,
        ARRAY['read_audit', 'read_events']::text[]
      ),
      (
        ${seed.verifierUserId}::uuid,
        'SYSTEM',
        NULL,
        ARRAY['record_verification']::text[]
      ),
      (
        ${seed.verifierUserId}::uuid,
        'BUSINESS',
        ${seed.businessA}::uuid,
        ARRAY['read_ai', 'run_ai', 'read_restricted']::text[]
      )
  `;

  await owner.$executeRaw`
    INSERT INTO entral.missions (
      id, stable_code, objective, issuer_user_id, owner_entity_id, business_id
    )
    VALUES (
      ${seed.missionA}::uuid,
      ${`MISSION-A-${suffix}`},
      'Exercise Phase 150 business-scoped AI safeguards.',
      ${seed.apiUserId}::uuid,
      ${seed.commanderA}::uuid,
      ${seed.businessA}::uuid
    )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.model_profiles (
      id, stable_code, provider, model_name
    )
    VALUES (
      ${seed.modelProfileId}::uuid,
      ${`MODEL-${suffix}`},
      'internal',
      'phase150-integration'
    )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.context_manifests (
      id, scope_type, scope_id, business_id, request_intent, context_order,
      structured_query_manifest, included_record_refs, compiled_content_sha256,
      compiler_version
    )
    VALUES
      (
        ${seed.contextManifestA}::uuid,
        'ENTITY',
        ${seed.commanderA}::uuid,
        ${seed.businessA}::uuid,
        'Business A integration context',
        ARRAY['structured']::text[],
        '{}'::jsonb,
        '[]'::jsonb,
        ${"7".repeat(64)},
        'phase150-test'
      ),
      (
        ${seed.contextManifestB}::uuid,
        'ENTITY',
        ${seed.commanderB}::uuid,
        ${seed.businessB}::uuid,
        'Business B integration context',
        ARRAY['structured']::text[],
        '{}'::jsonb,
        '[]'::jsonb,
        ${"8".repeat(64)},
        'phase150-test'
      ),
      (
        ${seed.contextManifestMissionA}::uuid,
        'MISSION',
        ${seed.missionA}::uuid,
        ${seed.businessA}::uuid,
        'Business A mission integration context',
        ARRAY['structured']::text[],
        '{}'::jsonb,
        '[]'::jsonb,
        ${"6".repeat(64)},
        'phase150-test'
      )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.metric_definitions (
      id, stable_code, name, description, unit, value_type, aggregation, scope_types
    )
    VALUES (
      ${seed.metricDefinitionId}::uuid,
      ${`METRIC-${suffix}`},
      'Phase 150 metric',
      'Integration-only metric definition.',
      'count',
      'COUNT',
      'SUM',
      ARRAY['BUSINESS']::entral.scope_type[]
    )
  `;

  await owner.$executeRaw`
    INSERT INTO entral.source_records (
      id, source_type, provider, external_id, business_id, entity_id,
      uri, content_sha256, trust_level
    )
    VALUES
      (
        ${seed.sourceA}::uuid, 'INTEGRATION', 'phase150', ${`source-a-${suffix}`},
        ${seed.businessA}::uuid, ${seed.commanderA}::uuid,
        'https://example.test/source-a', ${"a".repeat(64)}, 'AUTHORITATIVE'
      ),
      (
        ${seed.sourceB}::uuid, 'INTEGRATION', 'phase150', ${`source-b-${suffix}`},
        ${seed.businessB}::uuid, ${seed.commanderB}::uuid,
        'https://example.test/source-b', ${"b".repeat(64)}, 'AUTHORITATIVE'
      )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.artifacts (
      id, artifact_kind, stable_code, name, business_id, entity_id,
      storage_uri, media_type, content_sha256, source_record_id
    )
    VALUES
      (
        ${seed.artifactA}::uuid, 'DOCUMENT', ${`ART-A-${suffix}`}, 'Artifact A',
        ${seed.businessA}::uuid, ${seed.commanderA}::uuid,
        ${`s3://phase150/${suffix}/artifact-a`}, 'text/plain',
        ${"c".repeat(64)}, ${seed.sourceA}::uuid
      ),
      (
        ${seed.artifactB}::uuid, 'DOCUMENT', ${`ART-B-${suffix}`}, 'Artifact B',
        ${seed.businessB}::uuid, ${seed.commanderB}::uuid,
        ${`s3://phase150/${suffix}/artifact-b`}, 'text/plain',
        ${"d".repeat(64)}, ${seed.sourceB}::uuid
      )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.memory_items (
      id, memory_kind, scope_type, scope_id, business_id, entity_id,
      title, content, content_sha256, source_record_id, provenance
    )
    VALUES
      (
        ${seed.memoryA}::uuid, 'CANONICAL_FACT', 'BUSINESS',
        ${seed.businessA}::uuid, ${seed.businessA}::uuid, ${seed.commanderA}::uuid,
        'Memory A', '{"business":"A"}'::jsonb, ${"e".repeat(64)},
        ${seed.sourceA}::uuid, '{"test":"phase150"}'::jsonb
      ),
      (
        ${seed.memoryB}::uuid, 'CANONICAL_FACT', 'BUSINESS',
        ${seed.businessB}::uuid, ${seed.businessB}::uuid, ${seed.commanderB}::uuid,
        'Memory B', '{"business":"B"}'::jsonb, ${"f".repeat(64)},
        ${seed.sourceB}::uuid, '{"test":"phase150"}'::jsonb
      )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.evidence_links (
      id, from_type, from_id, artifact_id, evidence_role, claim
    )
    VALUES
      (
        ${seed.evidenceA}::uuid, 'MEMORY', ${seed.memoryA}::uuid,
        ${seed.artifactA}::uuid, 'SUPPORTS', 'Business A evidence'
      ),
      (
        ${seed.evidenceB}::uuid, 'MEMORY', ${seed.memoryB}::uuid,
        ${seed.artifactB}::uuid, 'SUPPORTS', 'Business B evidence'
      )
  `;

  await owner.$executeRaw`
    INSERT INTO entral.tool_definitions (
      id, stable_code, name, provider, description,
      input_schema, output_schema, adapter_ref
    )
    VALUES (
      ${seed.toolId}::uuid, ${`TOOL-${suffix}`}, 'Phase 150 Tool', 'internal',
      'Integration-only tool.', '{}'::jsonb, '{}'::jsonb, 'internal:phase150'
    )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.credential_references (
      id, stable_code, provider, secret_manager, secret_reference,
      owning_business_id, allowed_tool_id, allowed_actions
    )
    VALUES
      (
        ${seed.credentialA}::uuid, ${`CRED-A-${suffix}`}, 'internal', 'test',
        ${`phase150/${suffix}/credential-a`}, ${seed.businessA}::uuid,
        ${seed.toolId}::uuid, ARRAY['read']::text[]
      ),
      (
        ${seed.credentialB}::uuid, ${`CRED-B-${suffix}`}, 'internal', 'test',
        ${`phase150/${suffix}/credential-b`}, ${seed.businessB}::uuid,
        ${seed.toolId}::uuid, ARRAY['read']::text[]
      )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.tool_grants (
      id, entity_id, tool_id, business_id, credential_reference_id, allowed_actions
    )
    VALUES
      (
        ${seed.toolGrantA}::uuid, ${seed.commanderA}::uuid, ${seed.toolId}::uuid,
        ${seed.businessA}::uuid, ${seed.credentialA}::uuid, ARRAY['read']::text[]
      ),
      (
        ${seed.toolGrantB}::uuid, ${seed.commanderB}::uuid, ${seed.toolId}::uuid,
        ${seed.businessB}::uuid, ${seed.credentialB}::uuid, ARRAY['read']::text[]
      )
  `;

  return seed;
}

describe.skipIf(!integrationEnabled)("Phase 150 PostgreSQL identity, integrity, and access gate", () => {
  it("enforces real login boundaries, RLS isolation, immutability, and atomic outbox writes", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const databaseName = `entral_phase150_${suffix}`;
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const databaseUrl = new URL(baseUrl);
    databaseUrl.pathname = `/${databaseName}`;
    databaseUrl.searchParams.delete("schema");
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    const roleSuffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const roles: LoginRole[] = [
      { group: "entral_api", name: `entral_api_test_${roleSuffix}`, password: randomUUID() },
      { group: "entral_worker", name: `entral_worker_test_${roleSuffix}`, password: randomUUID() },
      { group: "entral_audit_reader", name: `entral_audit_test_${roleSuffix}`, password: randomUUID() },
      { group: "entral_verifier", name: `entral_verifier_test_${roleSuffix}`, password: randomUUID() }
    ];
    let owner: PrismaClient | null = null;
    let api: PrismaClient | null = null;
    let worker: PrismaClient | null = null;
    let audit: PrismaClient | null = null;
    let verifier: PrismaClient | null = null;

    try {
      const versions = await admin.$queryRaw<Array<{ serverVersion: number }>>`
        SELECT current_setting('server_version_num')::integer AS "serverVersion"
      `;
      expect(versions[0]!.serverVersion).toBeGreaterThanOrEqual(180000);

      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
      const prismaCli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));
      const identityMigration = readFileSync(
        fileURLToPath(new URL(
          "../../prisma/migrations/20260725004500_phase_150_rls_policies/migration.sql",
          import.meta.url
        )),
        "utf8"
      );
      expect(identityMigration).toContain(
        "ADD COLUMN auth_link_eligible boolean NOT NULL DEFAULT false"
      );
      expect(identityMigration).not.toContain(
        "ADD COLUMN auth_link_eligible boolean NOT NULL DEFAULT true"
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        ["migrate", "deploy", "--schema", "prisma/schema.prisma"],
        "Disposable PostgreSQL migration"
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
        "Phase 150 role and grant deployment"
      );

      for (const role of roles) {
        await admin.$executeRawUnsafe(
          `CREATE ROLE "${role.name}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS ` +
          `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${role.password}'`
        );
        await admin.$executeRawUnsafe(`GRANT ${role.group} TO "${role.name}"`);
      }

      owner = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
      const seed = await seedCanonicalData(owner, suffix);
      const limitedSubject = `phase150-limited-${suffix}`;
      const limitedUserId = randomUUID();
      const spoofedAuthorityUserId = randomUUID();
      await owner.user.create({
        data: {
          email: `phase150-limited-${suffix}@example.test`,
          id: limitedSubject,
          name: "Phase 150 Limited Reader",
          passwordHash: "integration-test-only",
          role: "USER"
        }
      });
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active, auth_subject
        )
        VALUES (
          ${limitedUserId}::uuid,
          ${`phase150-limited-${suffix}@example.test`},
          'Phase 150 Limited Reader',
          false,
          true,
          ${limitedSubject}
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active,
          auth_subject, auth_link_eligible
        )
        VALUES (
          ${spoofedAuthorityUserId}::uuid,
          ${`phase150-spoofed-authority-${suffix}@example.test`},
          'Phase 150 Spoof Target Authority',
          true,
          true,
          NULL,
          false
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.scope_grants (user_id, scope_type, scope_id, permissions)
        VALUES (
          ${limitedUserId}::uuid,
          'BUSINESS',
          ${seed.businessA}::uuid,
          ARRAY[
            'read', 'manage_data', 'manage_memory', 'manage_ai', 'run_ai',
            'read_audit', 'read_events'
          ]::text[]
        )
      `;
      await owner.$executeRaw`
        UPDATE entral.artifacts
        SET classification = 'RESTRICTED'
        WHERE id = ${seed.artifactA}::uuid
      `;
      await owner.$executeRaw`
        UPDATE entral.memory_items
        SET access_classification = 'RESTRICTED'
        WHERE id = ${seed.memoryA}::uuid
      `;
      const restrictedContextManifestId = randomUUID();
      const apiRole = roles.find((role) => role.group === "entral_api")!;
      const workerRole = roles.find((role) => role.group === "entral_worker")!;
      const auditRole = roles.find((role) => role.group === "entral_audit_reader")!;
      const verifierRole = roles.find((role) => role.group === "entral_verifier")!;
      api = new PrismaClient({ datasources: { db: { url: loginUrl(databaseUrl, apiRole) } } });
      worker = new PrismaClient({ datasources: { db: { url: loginUrl(databaseUrl, workerRole) } } });
      audit = new PrismaClient({ datasources: { db: { url: loginUrl(databaseUrl, auditRole) } } });
      verifier = new PrismaClient({
        datasources: { db: { url: loginUrl(databaseUrl, verifierRole) } }
      });
      await withApiContext(api, seed.apiSubject, (tx) => tx.$executeRaw`
        INSERT INTO entral.context_manifests (
          id, scope_type, scope_id, business_id, request_intent,
          context_order, structured_query_manifest, included_record_refs,
          compiled_content_sha256, compiler_version
        )
        VALUES (
          ${restrictedContextManifestId}::uuid,
          'ENTITY',
          ${seed.commanderA}::uuid,
          ${seed.businessA}::uuid,
          'Restricted artifact context produced by a higher-clearance authority',
          ARRAY['structured']::text[],
          '{}'::jsonb,
          jsonb_build_array(jsonb_build_object(
            'type', 'ARTIFACT',
            'id', ${seed.artifactA}
          )),
          ${"93".repeat(32)},
          'phase150-test'
        )
      `);

      const identityFacts = await Promise.all([
        roleFacts(api),
        roleFacts(worker),
        roleFacts(audit),
        roleFacts(verifier)
      ]);
      expect(new Set(identityFacts.map((facts) => facts.name))).toHaveLength(4);
      for (const facts of identityFacts) {
        expect(facts).toMatchObject({
          canBypassRls: false,
          canCreateRole: false,
          canLogin: true,
          canTemp: false,
          ownsDatabase: false,
          ownsEntralRelations: false,
          superuser: false
        });
      }
      for (const [index, role] of roles.entries()) {
        const clients = [api, worker, audit, verifier] as const;
        const memberships = await clients[index].$queryRaw<Array<{ member: boolean }>>`
          SELECT pg_has_role(current_user, ${role.group}, 'MEMBER') AS member
        `;
        expect(memberships[0]?.member).toBe(true);
      }
      await expect(api.$queryRaw`
        SELECT id FROM public."User" WHERE id = ${seed.apiSubject}
      `).resolves.toHaveLength(1);
      await expect(worker.$queryRaw`
        SELECT id FROM public."User" WHERE id = ${seed.apiSubject}
      `).rejects.toThrow();
      await expect(worker.$executeRaw`
        DELETE FROM public."User" WHERE id = ${seed.apiSubject}
      `).rejects.toThrow();
      await expect(worker.$queryRaw`
        SELECT id FROM public."PasswordResetToken" LIMIT 1
      `).rejects.toThrow();
      await expect(worker.$queryRaw`
        SELECT id FROM entral.source_records LIMIT 1
      `).rejects.toThrow();
      await expect(api.$executeRawUnsafe("CREATE TEMP TABLE phase150_api_temp(id integer)")).rejects.toThrow();
      await expect(worker.$executeRawUnsafe("CREATE TEMP TABLE phase150_worker_temp(id integer)")).rejects.toThrow();
      await expect(audit.$executeRawUnsafe("CREATE TEMP TABLE phase150_audit_temp(id integer)")).rejects.toThrow();
      await expect(verifier.$executeRawUnsafe(
        "CREATE TEMP TABLE phase150_verifier_temp(id integer)"
      )).rejects.toThrow();

      const isolatedTables = [
        ["source_records", seed.sourceA, seed.sourceB],
        ["artifacts", seed.artifactA, seed.artifactB],
        ["memory_items", seed.memoryA, seed.memoryB],
        ["evidence_links", seed.evidenceA, seed.evidenceB],
        ["tool_grants", seed.toolGrantA, seed.toolGrantB],
        ["credential_references", seed.credentialA, seed.credentialB]
      ] as const;
      for (const [table, allowedId, deniedId] of isolatedTables) {
        await expect(visibleId(api, table, allowedId)).resolves.toHaveLength(0);
        await expect(visibleId(api, table, deniedId)).resolves.toHaveLength(0);
      }
      await expect(api.$executeRaw`
        INSERT INTO entral.source_records (source_type, business_id, content_sha256)
        VALUES ('NO_CONTEXT', ${seed.businessA}::uuid, ${"0".repeat(64)})
      `).rejects.toThrow();

      await withApiContext(api, seed.apiSubject, async (tx) => {
        for (const [table, allowedId, deniedId] of isolatedTables) {
          await expect(visibleId(tx, table, allowedId)).resolves.toEqual([{ id: allowedId }]);
          await expect(visibleId(tx, table, deniedId)).resolves.toHaveLength(0);
        }
      });
      await withApiContext(api, limitedSubject, async (tx) => {
        await expect(visibleId(tx, "source_records", seed.sourceA)).resolves.toEqual([
          { id: seed.sourceA }
        ]);
        await expect(visibleId(tx, "artifacts", seed.artifactA)).resolves.toHaveLength(0);
        await expect(visibleId(tx, "memory_items", seed.memoryA)).resolves.toHaveLength(0);
        await expect(visibleId(tx, "evidence_links", seed.evidenceA)).resolves.toHaveLength(0);
      });
      const restrictedHistoryForLimited = await withApiContext(
        api,
        limitedSubject,
        async (tx) => {
          const auditRows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT target_id::text AS id
            FROM entral.audit_entries
            WHERE target_id IN (
              ${seed.artifactA}::uuid, ${seed.memoryA}::uuid, ${seed.evidenceA}::uuid
            )
          `;
          const eventRows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT aggregate_id::text AS id
            FROM entral.canonical_events
            WHERE aggregate_id IN (
              ${seed.artifactA}::uuid, ${seed.memoryA}::uuid, ${seed.evidenceA}::uuid
            )
          `;
          const timelineRows = await tx.$queryRaw<Array<{ id: string }>>`
            SELECT target_id::text AS id
            FROM entral.v_audit_timeline
            WHERE target_id IN (
              ${seed.artifactA}::uuid, ${seed.memoryA}::uuid, ${seed.evidenceA}::uuid
            )
          `;
          return { auditRows, eventRows, timelineRows };
        }
      );
      expect(restrictedHistoryForLimited).toEqual({
        auditRows: [],
        eventRows: [],
        timelineRows: []
      });
      const restrictedHistoryForAuthorized = await withApiContext(
        api,
        seed.apiSubject,
        async (tx) => {
          const auditRows = await tx.$queryRaw<Array<{ count: number }>>`
            SELECT count(*)::integer AS count
            FROM entral.audit_entries
            WHERE target_id IN (
              ${seed.artifactA}::uuid, ${seed.memoryA}::uuid, ${seed.evidenceA}::uuid
            )
          `;
          const eventRows = await tx.$queryRaw<Array<{ count: number }>>`
            SELECT count(*)::integer AS count
            FROM entral.canonical_events
            WHERE aggregate_id IN (
              ${seed.artifactA}::uuid, ${seed.memoryA}::uuid, ${seed.evidenceA}::uuid
            )
          `;
          return {
            audit: auditRows[0]!.count,
            events: eventRows[0]!.count
          };
        }
      );
      expect(restrictedHistoryForAuthorized.audit).toBeGreaterThan(0);
      expect(restrictedHistoryForAuthorized.events).toBeGreaterThan(0);
      const restrictedDowngrades = await withApiContext(api, limitedSubject, async (tx) => {
        const artifacts = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE entral.artifacts
          SET classification = 'INTERNAL'
          WHERE id = ${seed.artifactA}::uuid
          RETURNING id::text AS id
        `;
        const memory = await tx.$queryRaw<Array<{ id: string }>>`
          UPDATE entral.memory_items
          SET access_classification = 'INTERNAL'
          WHERE id = ${seed.memoryA}::uuid
          RETURNING id::text AS id
        `;
        return { artifacts, memory };
      });
      expect(restrictedDowngrades).toEqual({ artifacts: [], memory: [] });
      const retainedClassifications = await owner.$queryRaw<Array<{
        artifactClassification: string;
        memoryClassification: string;
      }>>`
        SELECT
          artifact.classification AS "artifactClassification",
          memory.access_classification AS "memoryClassification"
        FROM entral.artifacts artifact
        JOIN entral.memory_items memory ON memory.id = ${seed.memoryA}::uuid
        WHERE artifact.id = ${seed.artifactA}::uuid
      `;
      expect(retainedClassifications).toEqual([{
        artifactClassification: "RESTRICTED",
        memoryClassification: "RESTRICTED"
      }]);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.context_manifests (
            id, scope_type, scope_id, business_id, request_intent,
            context_order, structured_query_manifest, included_record_refs,
            compiled_content_sha256, compiler_version
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            'Cross-business injected context',
            ARRAY['structured']::text[],
            '{}'::jsonb,
            jsonb_build_array(jsonb_build_object(
              'type', 'SOURCE_RECORD',
              'id', ${seed.sourceB}
            )),
            ${"91".repeat(32)},
            'phase150-test'
          )
        `);
      await expectApiDenied(api, limitedSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.context_manifests (
            id, scope_type, scope_id, business_id, request_intent,
            context_order, structured_query_manifest, included_record_refs,
            compiled_content_sha256, compiler_version
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            'Restricted artifact injected context',
            ARRAY['structured']::text[],
            '{}'::jsonb,
            jsonb_build_array(jsonb_build_object(
              'type', 'ARTIFACT',
              'id', ${seed.artifactA}
            )),
            ${"92".repeat(32)},
            'phase150-test'
          )
        `);
      const restrictedManifestRows = await withApiContext(
        api,
        limitedSubject,
        (tx) => tx.$queryRaw<Array<{ id: string }>>`
          SELECT id::text AS id
          FROM entral.context_manifests
          WHERE id = ${restrictedContextManifestId}::uuid
        `
      );
      expect(restrictedManifestRows).toHaveLength(0);
      await expectApiDenied(api, limitedSubject, (tx) => tx.$executeRaw`
        INSERT INTO entral.ai_runs (
          id, run_type, scope_type, scope_id, business_id, entity_id,
          model_profile_id, context_manifest_id, requested_by_kind,
          requested_by_id, input
        )
        VALUES (
          ${randomUUID()}::uuid,
          'RESTRICTED_CONTEXT_REUSE',
          'ENTITY',
          ${seed.commanderA}::uuid,
          ${seed.businessA}::uuid,
          ${seed.commanderA}::uuid,
          ${seed.modelProfileId}::uuid,
          ${restrictedContextManifestId}::uuid,
          'HUMAN',
          ${limitedUserId}::uuid,
          '{}'::jsonb
        )
      `);

      const restrictedAiRunId = randomUUID();
      const restrictedHealthId = randomUUID();
      const restrictedRecommendationId = randomUUID();
      const restrictedVerificationId = randomUUID();
      await withApiContext(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          INSERT INTO entral.ai_runs (
            id, run_type, scope_type, scope_id, business_id, entity_id,
            model_profile_id, context_manifest_id, requested_by_kind,
            requested_by_id, input
          )
          VALUES (
            ${restrictedAiRunId}::uuid,
            'RESTRICTED_DERIVED_INTELLIGENCE',
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            ${seed.commanderA}::uuid,
            ${seed.modelProfileId}::uuid,
            ${restrictedContextManifestId}::uuid,
            'HUMAN',
            ${seed.apiUserId}::uuid,
            '{}'::jsonb
          )
        `;
        await tx.$executeRaw`
          INSERT INTO entral.health_assessments (
            id, scope_type, scope_id, business_id, health_state,
            driver_records, source_freshness, ai_run_id
          )
          VALUES (
            ${restrictedHealthId}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            'WATCH',
            '{"restricted_driver":"sentinel-health"}'::jsonb,
            '{}'::jsonb,
            ${restrictedAiRunId}::uuid
          )
        `;
        await tx.$executeRaw`
          INSERT INTO entral.recommendations (
            id, scope_type, scope_id, business_id, objective, diagnosis,
            proposed_actions, expected_value, risk_class, authority_required,
            verification_plan, ai_run_id
          )
          VALUES (
            ${restrictedRecommendationId}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            'Restricted objective sentinel',
            'Restricted diagnosis sentinel',
            '[]'::jsonb,
            '{}'::jsonb,
            'LOW',
            '{}'::jsonb,
            '{}'::jsonb,
            ${restrictedAiRunId}::uuid
          )
        `;
        await tx.$executeRaw`
          INSERT INTO entral.verification_results (
            id, subject_type, subject_id, verification_method, assertions,
            expected_state
          )
          VALUES (
            ${restrictedVerificationId}::uuid,
            'AI_RUN',
            ${restrictedAiRunId}::uuid,
            'RESTRICTED_RUN_CHECK',
            '{"assertion":"restricted run evidence remains isolated"}'::jsonb,
            '{"isolated":true}'::jsonb
          )
        `;
      });
      await withServiceContext(verifier, seed.verifierUserId, (tx) => tx.$executeRaw`
        UPDATE entral.verification_results
        SET
          status = 'PASSED',
          observed_state = '{"isolated":true}'::jsonb,
          completed_at = clock_timestamp()
        WHERE id = ${restrictedVerificationId}::uuid
      `);
      const restrictedDerivedVisibility = await withApiContext(
        api,
        limitedSubject,
        async (tx) => ({
          health: await tx.$queryRaw`
            SELECT id FROM entral.health_assessments
            WHERE id = ${restrictedHealthId}::uuid
          `,
          recommendation: await tx.$queryRaw`
            SELECT id FROM entral.recommendations
            WHERE id = ${restrictedRecommendationId}::uuid
          `,
          verification: await tx.$queryRaw`
            SELECT id FROM entral.verification_results
            WHERE id = ${restrictedVerificationId}::uuid
          `,
          audit: await tx.$queryRaw`
            SELECT id FROM entral.audit_entries
            WHERE target_id IN (
              ${restrictedHealthId}::uuid,
              ${restrictedRecommendationId}::uuid,
              ${restrictedVerificationId}::uuid
            )
          `,
          events: await tx.$queryRaw`
            SELECT id FROM entral.canonical_events
            WHERE aggregate_id IN (
              ${restrictedHealthId}::uuid,
              ${restrictedRecommendationId}::uuid,
              ${restrictedVerificationId}::uuid
            )
          `
        })
      );
      expect(restrictedDerivedVisibility).toEqual({
        audit: [],
        events: [],
        health: [],
        recommendation: [],
        verification: []
      });
      const restrictedDerivedAuthorized = await withApiContext(
        api,
        seed.apiSubject,
        async (tx) => ({
          health: await tx.$queryRaw`
            SELECT id FROM entral.health_assessments
            WHERE id = ${restrictedHealthId}::uuid
          `,
          recommendation: await tx.$queryRaw`
            SELECT id FROM entral.recommendations
            WHERE id = ${restrictedRecommendationId}::uuid
          `,
          verification: await tx.$queryRaw`
            SELECT id FROM entral.verification_results
            WHERE id = ${restrictedVerificationId}::uuid
          `
        })
      );
      expect(restrictedDerivedAuthorized.health).toHaveLength(1);
      expect(restrictedDerivedAuthorized.recommendation).toHaveLength(1);
      expect(restrictedDerivedAuthorized.verification).toHaveLength(1);

      const runOnlyAiRunId = randomUUID();
      const runOnlyAiStepId = randomUUID();
      await withApiContext(api, limitedSubject, async (tx) => {
        await tx.$executeRaw`
          INSERT INTO entral.ai_runs (
            id, run_type, scope_type, scope_id, business_id, entity_id,
            model_profile_id, context_manifest_id, requested_by_kind,
            requested_by_id, input
          )
          VALUES (
            ${runOnlyAiRunId}::uuid,
            'RUN_AI_WITHOUT_READ_AI',
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            ${seed.commanderA}::uuid,
            ${seed.modelProfileId}::uuid,
            ${seed.contextManifestA}::uuid,
            'HUMAN',
            ${limitedUserId}::uuid,
            '{}'::jsonb
          )
        `;
        await tx.$executeRaw`
          INSERT INTO entral.ai_steps (
            id, ai_run_id, step_number, step_type, input
          )
          VALUES (
            ${runOnlyAiStepId}::uuid,
            ${runOnlyAiRunId}::uuid,
            1,
            'ANALYSIS',
            '{}'::jsonb
          )
        `;
      });
      const runOnlyMutationCount = await withApiContext(
        api,
        limitedSubject,
        (tx) => tx.$executeRaw`
        UPDATE entral.ai_runs
        SET status = 'RUNNING', started_at = clock_timestamp()
        WHERE id = ${runOnlyAiRunId}::uuid
        `
      );
      expect(runOnlyMutationCount).toBe(1);
      const runOnlyStepMutationCount = await withApiContext(
        api,
        limitedSubject,
        (tx) => tx.$executeRaw`
          UPDATE entral.ai_steps
          SET status = 'RUNNING', started_at = clock_timestamp()
          WHERE id = ${runOnlyAiStepId}::uuid
        `
      );
      expect(runOnlyStepMutationCount).toBe(1);
      await expectApiDenied(api, limitedSubject, (tx) => tx.$executeRaw`
        UPDATE entral.ai_runs
        SET status = 'CANCELLED', completed_at = clock_timestamp()
        WHERE id = ${runOnlyAiRunId}::uuid
      `);
      const lifecycleFunctionSecurity = await owner.$queryRaw<Array<{
        name: string;
        securityDefiner: boolean;
      }>>`
        SELECT
          proname AS name,
          prosecdef AS "securityDefiner"
        FROM pg_proc
        WHERE pronamespace = 'entral'::regnamespace
          AND proname IN ('validate_ai_run_lifecycle', 'validate_ai_step_lifecycle')
        ORDER BY proname
      `;
      expect(lifecycleFunctionSecurity).toEqual([
        { name: "validate_ai_run_lifecycle", securityDefiner: true },
        { name: "validate_ai_step_lifecycle", securityDefiner: true }
      ]);
      await withApiContext(api, limitedSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.ai_steps
          SET status = 'CANCELLED', completed_at = clock_timestamp()
          WHERE id = ${runOnlyAiStepId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.ai_runs
          SET status = 'CANCELLED', completed_at = clock_timestamp()
          WHERE id = ${runOnlyAiRunId}::uuid
        `;
      });

      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.source_records (
            source_type, provider, external_id, business_id, entity_id, content_sha256
          )
          VALUES (
            'CROSS_BUSINESS', 'phase150', ${`denied-${suffix}`},
            ${seed.businessB}::uuid, ${seed.commanderB}::uuid, ${"1".repeat(64)}
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.evidence_links (
            from_type, from_id, artifact_id, evidence_role
          )
          VALUES (
            'MEMORY', ${seed.memoryA}::uuid, ${seed.artifactB}::uuid, 'CROSS_SCOPE'
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.artifacts (
            id, artifact_kind, stable_code, name, business_id, entity_id,
            storage_uri, media_type, content_sha256, source_record_id
          )
          VALUES (
            ${randomUUID()}::uuid,
            'DOCUMENT',
            ${`CROSS-SOURCE-ARTIFACT-${suffix}`},
            'Cross-business source artifact',
            ${seed.businessA}::uuid,
            ${seed.commanderA}::uuid,
            ${`s3://phase150/${suffix}/cross-source-artifact`},
            'text/plain',
            ${"9".repeat(64)},
            ${seed.sourceB}::uuid
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.memory_items (
            id, memory_kind, scope_type, scope_id, business_id, entity_id,
            title, content, content_sha256, source_artifact_id, provenance
          )
          VALUES (
            ${randomUUID()}::uuid,
            'CANONICAL_FACT',
            'BUSINESS',
            ${seed.businessA}::uuid,
            ${seed.businessA}::uuid,
            ${seed.commanderA}::uuid,
            'Cross-business artifact memory',
            '{"denied":true}'::jsonb,
            ${"a1".repeat(32)},
            ${seed.artifactB}::uuid,
            '{"test":"cross-business"}'::jsonb
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.metric_observations (
            id, metric_definition_id, scope_type, scope_id, business_id,
            numeric_value, source_record_id, observed_at
          )
          VALUES (
            ${randomUUID()}::uuid,
            ${seed.metricDefinitionId}::uuid,
            'BUSINESS',
            ${seed.businessA}::uuid,
            ${seed.businessA}::uuid,
            1,
            ${seed.sourceB}::uuid,
            CURRENT_TIMESTAMP
          )
        `);

      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.ai_runs (
            id, run_type, scope_type, scope_id, business_id, entity_id,
            model_profile_id, context_manifest_id, requested_by_kind,
            requested_by_id, input
          )
          VALUES (
            ${randomUUID()}::uuid,
            'NULL_BUSINESS_ENTITY',
            'ENTITY',
            ${seed.commanderA}::uuid,
            NULL,
            ${seed.commanderA}::uuid,
            ${seed.modelProfileId}::uuid,
            ${seed.contextManifestA}::uuid,
            'HUMAN',
            ${seed.apiUserId}::uuid,
            '{}'::jsonb
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.ai_runs (
            id, run_type, scope_type, scope_id, business_id, mission_id,
            model_profile_id, context_manifest_id, requested_by_kind,
            requested_by_id, input
          )
          VALUES (
            ${randomUUID()}::uuid,
            'NULL_BUSINESS_MISSION',
            'MISSION',
            ${seed.missionA}::uuid,
            NULL,
            ${seed.missionA}::uuid,
            ${seed.modelProfileId}::uuid,
            ${seed.contextManifestMissionA}::uuid,
            'HUMAN',
            ${seed.apiUserId}::uuid,
            '{}'::jsonb
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.ai_runs (
            id, run_type, scope_type, scope_id, business_id, entity_id,
            model_profile_id, context_manifest_id, requested_by_kind,
            requested_by_id, input
          )
          VALUES (
            ${randomUUID()}::uuid,
            'CROSS_BUSINESS_CONTEXT',
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            ${seed.commanderA}::uuid,
            ${seed.modelProfileId}::uuid,
            ${seed.contextManifestB}::uuid,
            'HUMAN',
            ${seed.apiUserId}::uuid,
            '{}'::jsonb
          )
        `);

      const validAiRunId = randomUUID();
      await withApiContext(api, seed.apiSubject, (tx) => tx.$executeRaw`
        INSERT INTO entral.ai_runs (
          id, run_type, scope_type, scope_id, business_id, entity_id,
          model_profile_id, context_manifest_id, requested_by_kind,
          requested_by_id, input
        )
        VALUES (
          ${validAiRunId}::uuid,
          'BUSINESS_A_TOOL_SCOPE',
          'ENTITY',
          ${seed.commanderA}::uuid,
          ${seed.businessA}::uuid,
          ${seed.commanderA}::uuid,
          ${seed.modelProfileId}::uuid,
          ${seed.contextManifestA}::uuid,
          'HUMAN',
          ${seed.apiUserId}::uuid,
          '{}'::jsonb
        )
      `);
      const validAiStepId = randomUUID();
      await withApiContext(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.ai_runs
          SET status = 'RUNNING', started_at = clock_timestamp()
          WHERE id = ${validAiRunId}::uuid
        `;
        await tx.$executeRaw`
          INSERT INTO entral.ai_steps (
            id, ai_run_id, step_number, step_type, model_profile_id, input
          )
          VALUES (
            ${validAiStepId}::uuid,
            ${validAiRunId}::uuid,
            1,
            'ANALYSIS',
            ${seed.modelProfileId}::uuid,
            '{"step":"bounded-tool"}'::jsonb
          )
        `;
        await tx.$executeRaw`
          UPDATE entral.ai_steps
          SET status = 'RUNNING', started_at = clock_timestamp()
          WHERE id = ${validAiStepId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.ai_steps
          SET
            status = 'SUCCEEDED',
            output = '{"ready":true}'::jsonb,
            completed_at = clock_timestamp()
          WHERE id = ${validAiStepId}::uuid
        `;
      });
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.ai_steps
          SET input = '{"step":"rewritten"}'::jsonb
          WHERE id = ${validAiStepId}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
        INSERT INTO entral.retrieval_logs (
          id, ai_run_id, context_manifest_id, scope_type, scope_id,
          query_type, query_summary, selected_refs
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${validAiRunId}::uuid,
          ${seed.contextManifestA}::uuid,
          'ENTITY',
          ${seed.commanderA}::uuid,
          'RELATIONAL',
          'Attempted cross-business retrieval result injection',
          jsonb_build_array(jsonb_build_object(
            'type', 'SOURCE_RECORD',
            'id', ${seed.sourceB}
          ))
        )
      `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.tool_calls (
            id, ai_run_id, tool_id, tool_version, tool_grant_id,
            requested_action, credential_reference_id, input, input_sha256
          )
          VALUES (
            ${randomUUID()}::uuid,
            ${validAiRunId}::uuid,
            ${seed.toolId}::uuid,
            1,
            ${seed.toolGrantB}::uuid,
            'read',
            ${seed.credentialB}::uuid,
            '{}'::jsonb,
            encode(digest(convert_to('{}'::jsonb::text, 'UTF8'), 'sha256'), 'hex')
          )
        `);

      const boundedIdempotencyKey = `phase150-bounded-${suffix}`;
      const secondIdempotencyKey = `phase150-bounded-second-${suffix}`;
      const thirdIdempotencyKey = `phase150-bounded-third-${suffix}`;
      await owner.$executeRaw`
        UPDATE entral.tool_grants
        SET
          data_scope = '{"customer_ids":["customer-a"]}'::jsonb,
          spend_limit = 10,
          call_limit = 1
        WHERE id = ${seed.toolGrantA}::uuid
      `;
      await owner.$executeRaw`
        UPDATE entral.tool_definitions
        SET idempotency_supported = true
        WHERE id = ${seed.toolId}::uuid
      `;
      await owner.$executeRaw`
        INSERT INTO entral.idempotency_keys (
          key, operation, scope_type, scope_id, request_sha256
        )
        VALUES
          (
            ${boundedIdempotencyKey}, ${`TOOL_CALL:${seed.toolId}:read`}, 'ENTITY',
            ${seed.commanderA}::uuid,
            encode(digest(convert_to(
              '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb::text,
              'UTF8'
            ), 'sha256'), 'hex')
          ),
          (
            ${secondIdempotencyKey}, ${`TOOL_CALL:${seed.toolId}:read`}, 'ENTITY',
            ${seed.commanderA}::uuid,
            encode(digest(convert_to(
              '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb::text,
              'UTF8'
            ), 'sha256'), 'hex')
          ),
          (
            ${thirdIdempotencyKey}, ${`TOOL_CALL:${seed.toolId}:read`}, 'ENTITY',
            ${seed.commanderA}::uuid,
            encode(digest(convert_to(
              '{"data_scope":{"customer_ids":["customer-b"]}}'::jsonb::text,
              'UTF8'
            ), 'sha256'), 'hex')
          )
      `;
      const boundedToolCallId = randomUUID();
      const boundedToolVerificationId = randomUUID();
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.tool_calls (
            id, ai_run_id, tool_id, tool_version, tool_grant_id,
            requested_action, credential_reference_id, input, input_sha256,
            authorization_evidence, idempotency_key
          )
          VALUES (
            ${randomUUID()}::uuid,
            ${validAiRunId}::uuid,
            ${seed.toolId}::uuid,
            2,
            ${seed.toolGrantA}::uuid,
            'read',
            ${seed.credentialA}::uuid,
            '{"data_scope":{"customer_ids":["customer-b"]}}'::jsonb,
            encode(digest(convert_to(
              '{"data_scope":{"customer_ids":["customer-b"]}}'::jsonb::text,
              'UTF8'
            ), 'sha256'), 'hex'),
            '{"data_scope":{"customer_ids":["customer-a"]},"estimated_cost":1}'::jsonb,
            ${thirdIdempotencyKey}
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.tool_calls (
            id, ai_run_id, tool_id, tool_version, tool_grant_id,
            requested_action, credential_reference_id, input, input_sha256,
            authorization_evidence, idempotency_key
          )
          VALUES (
            ${randomUUID()}::uuid,
            ${validAiRunId}::uuid,
            ${seed.toolId}::uuid,
            2,
            ${seed.toolGrantA}::uuid,
            'read',
            ${seed.credentialA}::uuid,
            '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb,
            encode(digest(convert_to(
              '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb::text,
              'UTF8'
            ), 'sha256'), 'hex'),
            '{"data_scope":{"customer_ids":["customer-a"]},"estimated_cost":11}'::jsonb,
            ${secondIdempotencyKey}
          )
        `);
      await withApiContext(api, seed.apiSubject, (tx) => tx.$executeRaw`
        INSERT INTO entral.tool_calls (
          id, ai_run_id, tool_id, tool_version, tool_grant_id,
          requested_action, credential_reference_id, input, input_sha256,
          authorization_evidence, idempotency_key
        )
        VALUES (
          ${boundedToolCallId}::uuid,
          ${validAiRunId}::uuid,
          ${seed.toolId}::uuid,
          2,
          ${seed.toolGrantA}::uuid,
          'read',
          ${seed.credentialA}::uuid,
          '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb,
          encode(digest(convert_to(
            '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb::text,
            'UTF8'
          ), 'sha256'), 'hex'),
          '{"data_scope":{"customer_ids":["customer-a"]},"estimated_cost":6}'::jsonb,
          ${boundedIdempotencyKey}
        )
      `);
      await expectApiDenied(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.idempotency_keys
          SET
            status = 'SUCCEEDED',
            response = '{"premature":true}'::jsonb,
            locked_until = NULL,
            completed_at = clock_timestamp()
          WHERE key = ${boundedIdempotencyKey}
        `;
        await tx.$executeRawUnsafe(
          "SET CONSTRAINTS validate_tool_call_idempotency_pair_from_key IMMEDIATE"
        );
      });
      await expectApiDenied(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.idempotency_keys
          SET
            status = 'SUCCEEDED',
            response = '{"unbound":true}'::jsonb,
            locked_until = NULL,
            completed_at = clock_timestamp()
          WHERE key = ${secondIdempotencyKey}
        `;
        await tx.$executeRawUnsafe(
          "SET CONSTRAINTS validate_tool_call_idempotency_pair_from_key IMMEDIATE"
        );
      });
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
        UPDATE entral.ai_runs
        SET status = 'SUCCEEDED', completed_at = clock_timestamp()
        WHERE id = ${validAiRunId}::uuid
      `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.tool_calls (
            id, ai_run_id, tool_id, tool_version, tool_grant_id,
            requested_action, credential_reference_id, input, input_sha256,
            authorization_evidence, idempotency_key
          )
          VALUES (
            ${randomUUID()}::uuid,
            ${validAiRunId}::uuid,
            ${seed.toolId}::uuid,
            2,
            ${seed.toolGrantA}::uuid,
            'read',
            ${seed.credentialA}::uuid,
            '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb,
            encode(digest(convert_to(
              '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb::text,
              'UTF8'
            ), 'sha256'), 'hex'),
            '{"data_scope":{"customer_ids":["customer-a"]},"estimated_cost":1}'::jsonb,
            ${secondIdempotencyKey}
          )
        `);
      await owner.$executeRaw`
        UPDATE entral.tool_grants
        SET call_limit = 3, spend_limit = 100
        WHERE id = ${seed.toolGrantA}::uuid
      `;
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.tool_calls (
            id, ai_run_id, tool_id, tool_version, tool_grant_id,
            requested_action, credential_reference_id, input, input_sha256,
            authorization_evidence, idempotency_key
          )
          VALUES (
            ${randomUUID()}::uuid,
            ${validAiRunId}::uuid,
            ${seed.toolId}::uuid,
            2,
            ${seed.toolGrantA}::uuid,
            'read',
            ${seed.credentialA}::uuid,
            '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb,
            encode(digest(convert_to(
              '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb::text,
              'UTF8'
            ), 'sha256'), 'hex'),
            '{"data_scope":{"customer_ids":["customer-a"]},"estimated_cost":1}'::jsonb,
            ${boundedIdempotencyKey}
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.tool_calls
          SET authorization_evidence =
            '{"data_scope":{"customer_ids":["customer-a"]},"estimated_cost":0}'::jsonb
          WHERE idempotency_key = ${boundedIdempotencyKey}
        `);
      await expectApiDenied(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'AUTHORIZED', authorized_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'RUNNING', started_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'SUCCEEDED', completed_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRawUnsafe(
          "SET CONSTRAINTS validate_tool_call_completion_trigger IMMEDIATE"
        );
      });
      await expectApiDenied(api, seed.apiSubject, async (tx) => {
        await tx.$queryRaw`
          SELECT
            set_config('app.user_id', ${spoofedAuthorityUserId}, true),
            set_config('app.actor_kind', 'HUMAN', true),
            set_config('app.actor_id', ${spoofedAuthorityUserId}, true)
        `;
        await tx.$executeRaw`
          INSERT INTO entral.verification_results (
            subject_type, subject_id, status, verification_method,
            assertions, observed_state, expected_state, completed_at
          )
          VALUES (
            'TOOL_CALL',
            ${boundedToolCallId}::uuid,
            'PASSED',
            'FORGED_SYSTEM_VERIFICATION',
            '{"assertion":"ordinary run_ai caller cannot self-attest"}'::jsonb,
            '{"ok":true}'::jsonb,
            '{"ok":true}'::jsonb,
            clock_timestamp()
          )
        `;
      });
      await withApiContext(api, seed.apiSubject, (tx) => tx.$executeRaw`
        INSERT INTO entral.verification_results (
          id, subject_type, subject_id, verification_method, assertions,
          expected_state
        )
        VALUES (
          ${boundedToolVerificationId}::uuid,
          'TOOL_CALL',
          ${boundedToolCallId}::uuid,
          'DETERMINISTIC_OUTPUT_MATCH',
          '{"assertion":"tool output matches the expected contract"}'::jsonb,
          '{"ok":true}'::jsonb
        )
      `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
        UPDATE entral.verification_results
        SET
          status = 'PASSED',
          observed_state = '{"ok":true}'::jsonb,
          completed_at = clock_timestamp()
        WHERE id = ${boundedToolVerificationId}::uuid
      `);
      await expect(verifier.$executeRaw`
        UPDATE entral.verification_results
        SET
          status = 'PASSED',
          observed_state = '{"ok":true}'::jsonb,
          completed_at = clock_timestamp()
        WHERE id = ${boundedToolVerificationId}::uuid
      `).resolves.toBe(0);
      await withServiceContext(verifier, seed.verifierUserId, (tx) => tx.$executeRaw`
        UPDATE entral.verification_results
        SET
          status = 'PASSED',
          observed_state = '{"ok":true}'::jsonb,
          completed_at = clock_timestamp()
        WHERE id = ${boundedToolVerificationId}::uuid
      `);
      const trustedVerificationProvenance = await owner.$queryRaw<Array<{
        appUserId: string;
        databaseRole: string;
        status: string;
        trusted: boolean;
        verifiedById: string | null;
        verifiedByKind: string;
      }>>`
        SELECT
          verified_by_app_user_id::text AS "appUserId",
          verified_by_db_role AS "databaseRole",
          status::text AS status,
          trusted_provenance AS trusted,
          verified_by_id::text AS "verifiedById",
          verified_by_kind::text AS "verifiedByKind"
        FROM entral.verification_results
        WHERE id = ${boundedToolVerificationId}::uuid
      `;
      expect(trustedVerificationProvenance).toEqual([{
        appUserId: seed.verifierUserId,
        databaseRole: verifierRole.name,
        status: "PASSED",
        trusted: true,
        verifiedById: null,
        verifiedByKind: "SYSTEM"
      }]);
      await expectApiDenied(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'AUTHORIZED', authorized_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'RUNNING', started_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET
            status = 'SUCCEEDED',
            output = '{"ok":true}'::jsonb,
            completed_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRawUnsafe(
          "SET CONSTRAINTS validate_tool_call_idempotency_pair_from_call IMMEDIATE"
        );
      });
      await expectApiDenied(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'AUTHORIZED', authorized_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'RUNNING', started_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET
            status = 'SUCCEEDED',
            output = '{"ok":true}'::jsonb,
            completed_at = clock_timestamp()
          WHERE id = ${boundedToolCallId}::uuid
        `;
        await tx.$executeRaw`
          UPDATE entral.idempotency_keys
          SET
            status = 'SUCCEEDED',
            response = '{"different":true}'::jsonb,
            locked_until = NULL,
            completed_at = clock_timestamp()
          WHERE key = ${boundedIdempotencyKey}
        `;
        await tx.$executeRawUnsafe(
          "SET CONSTRAINTS validate_tool_call_idempotency_pair_from_call IMMEDIATE"
        );
      });
      await withApiContext(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'AUTHORIZED', authorized_at = clock_timestamp()
          WHERE idempotency_key = ${boundedIdempotencyKey}
        `;
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'RUNNING', started_at = clock_timestamp()
          WHERE idempotency_key = ${boundedIdempotencyKey}
        `;
        await tx.$executeRaw`
          UPDATE entral.tool_calls
          SET
            status = 'SUCCEEDED',
            output = '{"ok":true}'::jsonb,
            cost = 7,
            completed_at = clock_timestamp()
          WHERE idempotency_key = ${boundedIdempotencyKey}
        `;
        await tx.$executeRaw`
          UPDATE entral.idempotency_keys
          SET
            status = 'SUCCEEDED',
            response = '{"ok":true}'::jsonb,
            locked_until = NULL,
            completed_at = clock_timestamp()
          WHERE key = ${boundedIdempotencyKey}
        `;
      });
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
        INSERT INTO entral.tool_calls (
          id, ai_run_id, tool_id, tool_version, tool_grant_id,
          requested_action, credential_reference_id, input, input_sha256,
          authorization_evidence, idempotency_key
        )
        VALUES (
          ${randomUUID()}::uuid,
          ${validAiRunId}::uuid,
          ${seed.toolId}::uuid,
          2,
          ${seed.toolGrantA}::uuid,
          'read',
          ${seed.credentialA}::uuid,
          '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb,
          encode(digest(convert_to(
            '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb::text,
            'UTF8'
          ), 'sha256'), 'hex'),
          '{"data_scope":{"customer_ids":["customer-a"]},"estimated_cost":1}'::jsonb,
          ${boundedIdempotencyKey}
        )
      `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
        UPDATE entral.idempotency_keys
        SET operation = 'REWRITTEN_OPERATION'
        WHERE key = ${boundedIdempotencyKey}
      `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.tool_calls
          SET status = 'REJECTED'
          WHERE idempotency_key = ${boundedIdempotencyKey}
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.tool_calls
          SET cost = 0
          WHERE idempotency_key = ${boundedIdempotencyKey}
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.tool_calls
          SET output = '{"rewritten":true}'::jsonb
          WHERE idempotency_key = ${boundedIdempotencyKey}
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.tool_calls
          SET idempotency_key = ${thirdIdempotencyKey}
          WHERE idempotency_key = ${boundedIdempotencyKey}
        `);
      await owner.$executeRaw`
        UPDATE entral.tool_grants
        SET call_limit = 1, spend_limit = 7
        WHERE id = ${seed.toolGrantA}::uuid
      `;
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.tool_calls (
            id, ai_run_id, tool_id, tool_version, tool_grant_id,
            requested_action, credential_reference_id, input, input_sha256,
            authorization_evidence, idempotency_key
          )
          VALUES (
            ${randomUUID()}::uuid,
            ${validAiRunId}::uuid,
            ${seed.toolId}::uuid,
            2,
            ${seed.toolGrantA}::uuid,
            'read',
            ${seed.credentialA}::uuid,
            '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb,
            encode(digest(convert_to(
              '{"data_scope":{"customer_ids":["customer-a"]}}'::jsonb::text,
              'UTF8'
            ), 'sha256'), 'hex'),
            '{"data_scope":{"customer_ids":["customer-a"]},"estimated_cost":1}'::jsonb,
            ${secondIdempotencyKey}
          )
        `);
      await withApiContext(api, seed.apiSubject, (tx) => tx.$executeRaw`
        UPDATE entral.ai_runs
        SET status = 'VERIFYING'
        WHERE id = ${validAiRunId}::uuid
      `);
      await expectApiDenied(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.ai_runs
          SET
            status = 'SUCCEEDED',
            output = '{"verified":true}'::jsonb,
            input_tokens = 10,
            output_tokens = 5,
            estimated_cost = 7,
            completed_at = clock_timestamp()
          WHERE id = ${validAiRunId}::uuid
        `;
        await tx.$executeRawUnsafe(
          "SET CONSTRAINTS validate_ai_run_completion_trigger IMMEDIATE"
        );
      });
      const aiRunVerificationId = randomUUID();
      await withApiContext(api, seed.apiSubject, (tx) => tx.$executeRaw`
        INSERT INTO entral.verification_results (
          id, subject_type, subject_id, verification_method, assertions,
          expected_state
        )
        VALUES (
          ${aiRunVerificationId}::uuid,
          'AI_RUN',
          ${validAiRunId}::uuid,
          'DETERMINISTIC_RUN_OUTPUT_MATCH',
          '{"assertion":"run output and terminal state satisfies the contract"}'::jsonb,
          '{"verified":true}'::jsonb
        )
      `);
      await withServiceContext(verifier, seed.verifierUserId, (tx) => tx.$executeRaw`
        UPDATE entral.verification_results
        SET
          status = 'PASSED',
          observed_state = '{"verified":true}'::jsonb,
          completed_at = clock_timestamp()
        WHERE id = ${aiRunVerificationId}::uuid
      `);
      await withApiContext(api, seed.apiSubject, (tx) => tx.$executeRaw`
        UPDATE entral.ai_runs
        SET
          status = 'SUCCEEDED',
          output = '{"verified":true}'::jsonb,
          input_tokens = 10,
          output_tokens = 5,
          estimated_cost = 7,
          completed_at = clock_timestamp()
        WHERE id = ${validAiRunId}::uuid
      `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.ai_runs
          SET status = 'RUNNING', completed_at = NULL
          WHERE id = ${validAiRunId}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.ai_runs
          SET input = '{"rewritten":true}'::jsonb
          WHERE id = ${validAiRunId}::uuid
        `);

      const aiRunBId = randomUUID();
      const recommendationBId = randomUUID();
      const governanceActionBId = randomUUID();
      const experimentBId = randomUUID();
      const governanceAuthorityId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active,
          auth_subject, auth_link_eligible
        )
        VALUES (
          ${governanceAuthorityId}::uuid,
          ${`phase150-governance-${suffix}@example.test`},
          'Phase 150 Governance Authority',
          true,
          true,
          NULL,
          false
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.ai_runs (
          id, run_type, scope_type, scope_id, business_id, entity_id,
          model_profile_id, context_manifest_id, requested_by_kind, input
        )
        VALUES (
          ${aiRunBId}::uuid,
          'BUSINESS_B_PROVENANCE',
          'ENTITY',
          ${seed.commanderB}::uuid,
          ${seed.businessB}::uuid,
          ${seed.commanderB}::uuid,
          ${seed.modelProfileId}::uuid,
          ${seed.contextManifestB}::uuid,
          'SYSTEM',
          '{}'::jsonb
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.recommendations (
          id, scope_type, scope_id, business_id, objective, diagnosis,
          proposed_actions, expected_value, risk_class, authority_required,
          verification_plan, ai_run_id
        )
        VALUES (
          ${recommendationBId}::uuid,
          'ENTITY',
          ${seed.commanderB}::uuid,
          ${seed.businessB}::uuid,
          'Business B recommendation',
          'Business B diagnosis',
          '[]'::jsonb,
          '{}'::jsonb,
          'LOW',
          '{}'::jsonb,
          '{}'::jsonb,
          ${aiRunBId}::uuid
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.governance_actions (
          id, action_type, initiated_by_kind, initiated_by_user_id,
          target_type, target_id, business_id, requested_outcome, reason,
          authority_basis, risk_class, proposed_changes, expected_version
        )
        VALUES (
          ${governanceActionBId}::uuid,
          'EDIT',
          'HUMAN',
          ${governanceAuthorityId}::uuid,
          'BUSINESS',
          ${seed.businessB}::uuid,
          ${seed.businessB}::uuid,
          'Business B governance provenance',
          'Create a cross-business denial fixture.',
          '{}'::jsonb,
          'LOW',
          '{}'::jsonb,
          1
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.experiments (
          id, business_id, stable_code, hypothesis, success_criteria,
          operating_constraints, allocation
        )
        VALUES (
          ${experimentBId}::uuid,
          ${seed.businessB}::uuid,
          ${`EXP-B-${suffix}`},
          'Business B experiment',
          '{}'::jsonb,
          '{}'::jsonb,
          '{}'::jsonb
        )
      `;
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.health_assessments (
            id, scope_type, scope_id, business_id, health_state,
            driver_records, source_freshness, ai_run_id
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            'HEALTHY',
            '{}'::jsonb,
            '{}'::jsonb,
            ${aiRunBId}::uuid
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.recommendations (
            id, scope_type, scope_id, business_id, objective, diagnosis,
            proposed_actions, expected_value, risk_class, authority_required,
            verification_plan, ai_run_id
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            'Cross-business recommendation',
            'Denied provenance',
            '[]'::jsonb,
            '{}'::jsonb,
            'LOW',
            '{}'::jsonb,
            '{}'::jsonb,
            ${aiRunBId}::uuid
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.decisions (
            id, scope_type, scope_id, business_id, decision, rationale,
            decided_by_kind, decided_by_id, recommendation_id
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            'Cross-business recommendation decision',
            'Denied provenance',
            'HUMAN',
            ${seed.apiUserId}::uuid,
            ${recommendationBId}::uuid
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.decisions (
            id, scope_type, scope_id, business_id, decision, rationale,
            decided_by_kind, decided_by_id, governance_action_id
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            'Cross-business governance decision',
            'Denied provenance',
            'HUMAN',
            ${seed.apiUserId}::uuid,
            ${governanceActionBId}::uuid
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.outcomes (
            id, scope_type, scope_id, business_id, recommendation_id,
            outcome_type, actual
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            ${recommendationBId}::uuid,
            'CROSS_BUSINESS_RECOMMENDATION',
            '{}'::jsonb
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.outcomes (
            id, scope_type, scope_id, business_id, governance_action_id,
            outcome_type, actual
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            ${governanceActionBId}::uuid,
            'CROSS_BUSINESS_GOVERNANCE',
            '{}'::jsonb
          )
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          INSERT INTO entral.outcomes (
            id, scope_type, scope_id, business_id, experiment_id,
            outcome_type, actual
          )
          VALUES (
            ${randomUUID()}::uuid,
            'ENTITY',
            ${seed.commanderA}::uuid,
            ${seed.businessA}::uuid,
            ${experimentBId}::uuid,
            'CROSS_BUSINESS_EXPERIMENT',
            '{}'::jsonb
          )
        `);

      const retiredSubject = `phase150-retired-${suffix}`;
      const recreatedSubject = `phase150-recreated-${suffix}`;
      const retiredCanonicalUserId = randomUUID();
      const recycledEmail = `phase150-recycled-${suffix}@example.test`;
      await owner.user.create({
        data: {
          email: recycledEmail,
          id: retiredSubject,
          name: "Retired Phase 150 User",
          passwordHash: "integration-test-only",
          role: "USER"
        }
      });
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active,
          auth_subject, auth_link_eligible
        )
        VALUES (
          ${retiredCanonicalUserId}::uuid,
          ${recycledEmail},
          'Retired Phase 150 User',
          false,
          true,
          ${retiredSubject},
          false
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.scope_grants (user_id, scope_type, scope_id, permissions)
        VALUES (
          ${retiredCanonicalUserId}::uuid,
          'BUSINESS',
          ${seed.businessB}::uuid,
          ARRAY['read']::text[]
        )
      `;
      await owner.user.delete({ where: { id: retiredSubject } });
      await owner.user.create({
        data: {
          email: recycledEmail,
          id: recreatedSubject,
          name: "Recreated Phase 150 User",
          passwordHash: "integration-test-only",
          role: "USER"
        }
      });
      await expectApiDenied(api, recreatedSubject, (tx) =>
        visibleId(tx, "source_records", seed.sourceB)
      );

      const serviceCollisionSubject = `phase150-service-collision-${suffix}`;
      const workerEmail = `phase150-worker-${suffix}@example.test`;
      await owner.user.create({
        data: {
          email: workerEmail,
          id: serviceCollisionSubject,
          name: "Service Email Collision",
          passwordHash: "integration-test-only",
          role: "USER"
        }
      });
      await expectApiDenied(api, serviceCollisionSubject, (tx) =>
        visibleId(tx, "source_records", seed.sourceA)
      );

      const reviewedLegacySubject = `phase150-reviewed-legacy-${suffix}`;
      const reviewedLegacyUserId = randomUUID();
      const reviewedLegacyEmail = `phase150-reviewed-legacy-${suffix}@example.test`;
      await owner.user.create({
        data: {
          email: reviewedLegacyEmail,
          id: reviewedLegacySubject,
          name: "Reviewed Legacy Phase 150 User",
          passwordHash: "integration-test-only",
          role: "USER"
        }
      });
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active,
          auth_subject, auth_link_eligible
        )
        VALUES (
          ${reviewedLegacyUserId}::uuid,
          ${reviewedLegacyEmail},
          'Reviewed Legacy Phase 150 User',
          false,
          true,
          NULL,
          true
        )
      `;
      const reviewedLegacyBinding = await withApiContext(
        api,
        reviewedLegacySubject,
        (tx) => tx.$queryRaw<Array<{ id: string }>>`
          SELECT entral.session_app_user_id()::text AS id
        `
      );
      expect(reviewedLegacyBinding).toEqual([{ id: reviewedLegacyUserId }]);
      const linkedLegacyIdentity = await owner.$queryRaw<Array<{
        authLinkEligible: boolean;
        authSubject: string | null;
      }>>`
        SELECT
          auth_subject AS "authSubject",
          auth_link_eligible AS "authLinkEligible"
        FROM entral.app_users
        WHERE id = ${reviewedLegacyUserId}::uuid
      `;
      expect(linkedLegacyIdentity).toEqual([{
        authLinkEligible: false,
        authSubject: reviewedLegacySubject
      }]);

      const inactiveLegacySubject = `phase150-inactive-legacy-${suffix}`;
      const inactiveLegacyUserId = randomUUID();
      const inactiveLegacyEmail = `phase150-inactive-legacy-${suffix}@example.test`;
      await owner.user.create({
        data: {
          email: inactiveLegacyEmail,
          id: inactiveLegacySubject,
          name: "Inactive Legacy Phase 150 User",
          passwordHash: "integration-test-only",
          role: "USER"
        }
      });
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active,
          auth_subject, auth_link_eligible
        )
        VALUES (
          ${inactiveLegacyUserId}::uuid,
          ${inactiveLegacyEmail},
          'Inactive Legacy Phase 150 User',
          false,
          false,
          NULL,
          true
        )
      `;
      await expectApiDenied(api, inactiveLegacySubject, (tx) =>
        visibleId(tx, "source_records", seed.sourceA)
      );
      const inactiveLegacyIdentity = await owner.$queryRaw<Array<{
        authLinkEligible: boolean;
        authSubject: string | null;
        isActive: boolean;
      }>>`
        SELECT
          auth_subject AS "authSubject",
          auth_link_eligible AS "authLinkEligible",
          is_active AS "isActive"
        FROM entral.app_users
        WHERE id = ${inactiveLegacyUserId}::uuid
      `;
      expect(inactiveLegacyIdentity).toEqual([{
        authLinkEligible: true,
        authSubject: null,
        isActive: false
      }]);

      await owner.$executeRaw`
        UPDATE entral.app_users
        SET is_active = false
        WHERE id = ${seed.apiUserId}::uuid
      `;
      await expectApiDenied(api, seed.apiSubject, (tx) =>
        visibleId(tx, "source_records", seed.sourceA)
      );
      const inactiveIdentity = await owner.$queryRaw<Array<{ isActive: boolean }>>`
        SELECT is_active AS "isActive"
        FROM entral.app_users
        WHERE id = ${seed.apiUserId}::uuid
      `;
      expect(inactiveIdentity).toEqual([{ isActive: false }]);
      await owner.$executeRaw`
        UPDATE entral.app_users
        SET is_active = true
        WHERE id = ${seed.apiUserId}::uuid
      `;

      const preservedIdentityBindings = await owner.$queryRaw<Array<{
        authLinkEligible: boolean;
        authSubject: string | null;
        id: string;
      }>>`
        SELECT
          id::text AS id,
          auth_subject AS "authSubject",
          auth_link_eligible AS "authLinkEligible"
        FROM entral.app_users
        WHERE id IN (${retiredCanonicalUserId}::uuid, ${seed.workerUserId}::uuid)
        ORDER BY id
      `;
      expect(preservedIdentityBindings).toEqual(expect.arrayContaining([
        {
          authLinkEligible: false,
          authSubject: retiredSubject,
          id: retiredCanonicalUserId
        },
        {
          authLinkEligible: false,
          authSubject: null,
          id: seed.workerUserId
        }
      ]));

      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.source_records
          SET content_sha256 = ${"2".repeat(64)}
          WHERE id = ${seed.sourceA}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.artifacts
          SET content_sha256 = ${"3".repeat(64)}
          WHERE id = ${seed.artifactA}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.memory_items
          SET content = '{"mutated":true}'::jsonb
          WHERE id = ${seed.memoryA}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.evidence_links
          SET claim = 'mutated'
          WHERE id = ${seed.evidenceA}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          DELETE FROM entral.evidence_links
          WHERE id = ${seed.evidenceA}::uuid
        `);

      const beforeCommit = await materialCounts(owner, seed.commanderA);
      await withApiContext(api, seed.apiSubject, async (tx) => {
        const updated = await tx.$queryRaw<Array<{ status: string; version: number }>>`
          UPDATE entral.entities
          SET status = 'PAUSED'
          WHERE id = ${seed.commanderA}::uuid
          RETURNING status::text AS status, version::integer AS version
        `;
        expect(updated[0]?.status).toBe("PAUSED");
      }, "Verify atomic state, version, audit, event, and outbox persistence.");
      const afterCommit = await materialCounts(owner, seed.commanderA);
      expect(afterCommit).toEqual({
        audit: beforeCommit.audit + 1,
        events: beforeCommit.events + 1,
        outbox: beforeCommit.outbox + 1,
        versions: beforeCommit.versions + 1
      });

      await expect(withApiContext(api, seed.apiSubject, async (tx) => {
        await tx.$executeRaw`
          UPDATE entral.entities
          SET status = 'DEGRADED'
          WHERE id = ${seed.commanderA}::uuid
        `;
        throw new Error("force Phase 150 rollback");
      }, "Verify material-write rollback.")).rejects.toThrow("force Phase 150 rollback");
      await expect(materialCounts(owner, seed.commanderA)).resolves.toEqual(afterCommit);
      const persistedState = await owner.$queryRaw<Array<{ status: string }>>`
        SELECT status::text AS status
        FROM entral.entities
        WHERE id = ${seed.commanderA}::uuid
      `;
      expect(persistedState[0]?.status).toBe("PAUSED");

      const materialEvent = await owner.$queryRaw<Array<{ eventId: string }>>`
        SELECT id::text AS "eventId"
        FROM entral.canonical_events
        WHERE aggregate_type = 'ENTITIES'
          AND aggregate_id = ${seed.commanderA}::uuid
          AND event_type = 'entities.update'
        ORDER BY sequence_number DESC
        LIMIT 1
      `;
      const eventId = materialEvent[0]!.eventId;
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$queryRaw`
          SELECT id FROM entral.transactional_outbox WHERE event_id = ${eventId}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.audit_entries SET reason = 'mutated'
          WHERE target_id = ${seed.commanderA}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.canonical_events SET event_type = 'mutated'
          WHERE id = ${eventId}::uuid
        `);
      await expectApiDenied(api, seed.apiSubject, (tx) => tx.$executeRaw`
          UPDATE entral.entity_versions SET snapshot = '{}'::jsonb
          WHERE entity_id = ${seed.commanderA}::uuid
        `);
      await expect(owner.$executeRaw`
        UPDATE entral.canonical_events SET event_type = 'owner-mutation'
        WHERE id = ${eventId}::uuid
      `).rejects.toThrow();
      await expect(owner.$executeRaw`
        UPDATE entral.audit_entries SET reason = 'owner-mutation'
        WHERE target_type = 'ENTITIES' AND target_id = ${seed.commanderA}::uuid
      `).rejects.toThrow();
      await expect(owner.$executeRaw`
        UPDATE entral.entity_versions SET snapshot = '{}'::jsonb
        WHERE entity_id = ${seed.commanderA}::uuid
      `).rejects.toThrow();

      await expect(worker.$queryRaw`
        SELECT id FROM entral.transactional_outbox WHERE event_id = ${eventId}::uuid
      `).resolves.toHaveLength(0);
      await expectServiceDenied(worker, seed.workerUserId, (tx) => tx.$queryRaw`
        SELECT entral.emit_canonical_event(
          'forbidden', 'TEST', ${randomUUID()}::uuid, 1, NULL, NULL, NULL, '{}'::jsonb
        )
      `);
      await withServiceContext(worker, seed.workerUserId, async (tx) => {
        const claimed = await tx.$queryRaw<Array<{ status: string }>>`
          UPDATE entral.transactional_outbox
          SET
            status = 'PUBLISHING',
            attempts = attempts + 1,
            locked_by = 'phase150-integration-worker',
            locked_until = clock_timestamp() + interval '5 minutes'
          WHERE event_id = ${eventId}::uuid
          RETURNING status
        `;
        expect(claimed).toEqual([{ status: "PUBLISHING" }]);
        const published = await tx.$queryRaw<Array<{ status: string }>>`
          UPDATE entral.transactional_outbox
          SET
            status = 'PUBLISHED',
            locked_by = NULL,
            locked_until = NULL,
            published_at = clock_timestamp()
          WHERE event_id = ${eventId}::uuid
          RETURNING status
        `;
        expect(published).toEqual([{ status: "PUBLISHED" }]);
      });
      const outboxState = await owner.$queryRaw<Array<{ attempts: number; status: string }>>`
        SELECT attempts, status
        FROM entral.transactional_outbox
        WHERE event_id = ${eventId}::uuid
      `;
      expect(outboxState).toEqual([{ attempts: 1, status: "PUBLISHED" }]);

      const auditRows = await withServiceContext(audit, seed.auditUserId, (tx) => tx.$queryRaw<
        Array<{ count: number }>
      >`
        SELECT count(*)::integer AS count FROM entral.audit_entries
      `);
      expect(auditRows[0]!.count).toBeGreaterThan(0);
      const eventRows = await withServiceContext(audit, seed.auditUserId, (tx) => tx.$queryRaw<
        Array<{ count: number }>
      >`
        SELECT count(*)::integer AS count FROM entral.canonical_events
      `);
      expect(eventRows[0]!.count).toBeGreaterThan(0);
      const restrictedAuditRows = await withServiceContext(
        audit,
        seed.auditUserId,
        (tx) => tx.$queryRaw<Array<{ id: string }>>`
          SELECT target_id::text AS id
          FROM entral.audit_entries
          WHERE target_id IN (
            ${seed.artifactA}::uuid, ${seed.memoryA}::uuid, ${seed.evidenceA}::uuid
          )
        `
      );
      expect(restrictedAuditRows).toHaveLength(0);
      const restrictedEventRows = await withServiceContext(
        audit,
        seed.auditUserId,
        (tx) => tx.$queryRaw<Array<{ id: string }>>`
          SELECT aggregate_id::text AS id
          FROM entral.canonical_events
          WHERE aggregate_id IN (
            ${seed.artifactA}::uuid, ${seed.memoryA}::uuid, ${seed.evidenceA}::uuid
          )
        `
      );
      expect(restrictedEventRows).toHaveLength(0);
      await expectServiceDenied(audit, seed.auditUserId, (tx) =>
        tx.$queryRaw`SELECT id FROM entral.source_records`
      );
      await expectServiceDenied(audit, seed.auditUserId, (tx) => tx.$executeRaw`
          DELETE FROM entral.audit_entries WHERE target_id = ${seed.commanderA}::uuid
        `);

      const boundRows = await withApiContext(api, seed.apiSubject, (tx) =>
        visibleId(tx, "source_records", seed.sourceA)
      );
      expect(boundRows).toEqual([{ id: seed.sourceA }]);
      await expect(visibleId(api, "source_records", seed.sourceA)).resolves.toHaveLength(0);
      await api.$disconnect();
      api = new PrismaClient({ datasources: { db: { url: loginUrl(databaseUrl, apiRole) } } });
      await expect(visibleId(api, "source_records", seed.sourceA)).resolves.toHaveLength(0);
      await expect(withApiContext(api, seed.apiSubject, (tx) =>
        visibleId(tx, "source_records", seed.sourceA)
      )).resolves.toEqual([{ id: seed.sourceA }]);
      await expect(visibleId(api, "source_records", seed.sourceA)).resolves.toHaveLength(0);
    } finally {
      await Promise.allSettled([
        api?.$disconnect(),
        worker?.$disconnect(),
        audit?.$disconnect(),
        verifier?.$disconnect(),
        owner?.$disconnect()
      ]);
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity ` +
        `WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
      ).catch(() => undefined);
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined);
      for (const role of roles) {
        await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${role.name}"`).catch(() => undefined);
      }
      await admin.$disconnect();
    }
  }, 180_000);
});
