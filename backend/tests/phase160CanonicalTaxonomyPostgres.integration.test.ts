import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(testDatabaseUrl && process.env.RUN_POSTGRES_INTEGRATION === "1");
const taxonomyId = "d10d945f-fdde-5cb2-aee5-7be737fa52f1";
const expectedFingerprint = "f070396c703bf6b96b1ab020f819f915a85b37d2ec41b82b454f7d9d9f946ecb";
const entralId = "45638366-d6f0-5b27-91bf-d2362df27922";
const marshalId = "39ba1ebb-f916-5115-937a-225419f42175";
const generalAId = "39ed11de-7346-5cb0-b06c-751d7f306bad";
const generalBId = "d11cf902-1ca3-532d-9651-1503b369afd7";
const humanId = "11111111-1111-4111-8111-111111111111";

type CanonicalRow = {
  definition: string;
  id: string;
  name: string;
  parent_id: string | null;
  role: string;
  stable_code: string;
  taxonomy_version: string;
};

type VectorEndpoint = {
  id: string;
  kind: "ENTITY" | "HUMAN";
  role?: string;
};

type RouteVector = {
  expected: { direction?: string; route_valid: boolean; status?: string };
  id: string;
  message_type: string;
  recipient: VectorEndpoint;
  sender: VectorEndpoint;
};

type AcceptanceVectors = {
  governance_actions: Array<{
    action_type: string;
    expected: string;
    id: string;
    initiator: string;
    must_not_create_operational_message?: boolean;
    target: string;
  }>;
  hierarchy: Array<{
    child_role: string;
    expected: "ACCEPT" | "REJECT";
    id: string;
    parent_role: string;
  }>;
  operational_routes: RouteVector[];
};

type Fixture = {
  businessA: string;
  businessB: string;
  commanderA: string;
  commanderB: string;
  credentialA: string;
  credentialB: string;
  soldierA: string;
  tool: string;
};

function runCommand(
  command: string,
  args: string[],
  repositoryRoot: string,
  databaseUrl: string,
  operation: string
) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
  if (result.status !== 0) {
    throw new Error(`${operation} failed: ${result.stderr || result.stdout}`);
  }
}

function fingerprint(rows: CanonicalRow[]) {
  const normalized = [...rows]
    .sort((left, right) =>
      left.stable_code < right.stable_code ? -1 : left.stable_code > right.stable_code ? 1 : 0
    )
    .map((row) =>
      [
        row.id,
        row.stable_code,
        row.role,
        row.name,
        row.parent_id ?? "",
        row.definition,
        row.taxonomy_version
      ].join("\t")
    )
    .join("\n")
    .concat("\n");
  return createHash("sha256").update(normalized).digest("hex");
}

async function canonicalRows(client: PrismaClient) {
  return client.$queryRawUnsafe<CanonicalRow[]>(
    `SELECT id::text AS id, stable_code, role::text AS role, name,
       parent_id::text AS parent_id, definition, source_version AS taxonomy_version
     FROM entral.entities
     WHERE taxonomy_version_id = $1::uuid AND status <> 'RETIRED'
     ORDER BY stable_code COLLATE "C"`,
    taxonomyId
  );
}

async function materialCounts(client: PrismaClient) {
  const rows = await client.$queryRawUnsafe<
    Array<{ audit: number; events: number; outbox: number; versions: number }>
  >(`SELECT
      (SELECT count(*)::integer FROM entral.audit_entries) AS audit,
      (SELECT count(*)::integer FROM entral.canonical_events) AS events,
      (SELECT count(*)::integer FROM entral.transactional_outbox) AS outbox,
      (SELECT count(*)::integer FROM entral.entity_versions) AS versions`);
  return rows[0]!;
}

async function invariantViolationCounts(client: PrismaClient) {
  const rows = await client.$queryRawUnsafe<
    Array<{
      business: number;
      credential: number;
      eventOutbox: number;
      hierarchy: number;
      rejectedRoute: number;
      soldier: number;
      tool: number;
    }>
  >(`SELECT
      (SELECT count(*)::integer FROM entral.entities e
       LEFT JOIN entral.entities p ON p.id = e.parent_id WHERE
       (e.role = 'ENTRAL' AND e.parent_id IS NOT NULL)
       OR (e.role = 'MARSHAL' AND p.role IS DISTINCT FROM 'ENTRAL')
       OR (e.role = 'GENERAL' AND p.role IS DISTINCT FROM 'MARSHAL')
       OR (e.role = 'COMMANDER' AND p.role IS DISTINCT FROM 'GENERAL')
       OR (e.role = 'SOLDIER' AND p.role IS DISTINCT FROM 'COMMANDER')) AS hierarchy,
      (SELECT count(*)::integer FROM entral.businesses b
       JOIN entral.entities c ON c.id = b.commander_id
       JOIN entral.entities g ON g.id = b.general_id
       WHERE c.role <> 'COMMANDER' OR c.parent_id <> b.general_id
       OR g.role <> 'GENERAL' OR g.parent_id <> b.marshal_id OR c.business_id <> b.id) AS business,
      (SELECT count(*)::integer FROM entral.entities s
       JOIN entral.entities c ON c.id = s.parent_id
       WHERE s.role = 'SOLDIER' AND s.business_id IS DISTINCT FROM c.business_id) AS soldier,
      (SELECT count(*)::integer FROM entral.operational_messages
       WHERE NOT route_valid AND
       (status <> 'REJECTED' OR delivered_at IS NOT NULL OR acknowledged_at IS NOT NULL)) AS "rejectedRoute",
      (SELECT count(*)::integer FROM entral.tool_grants tg
       JOIN entral.entities e ON e.id = tg.entity_id
       WHERE e.business_id IS NOT NULL AND tg.business_id IS DISTINCT FROM e.business_id
       AND (tg.expires_at IS NULL OR tg.expires_at > clock_timestamp())) AS tool,
      (SELECT count(*)::integer FROM entral.tool_grants tg
       JOIN entral.credential_references cr ON cr.id = tg.credential_reference_id
       WHERE cr.owning_business_id IS NOT NULL
       AND tg.business_id IS DISTINCT FROM cr.owning_business_id) AS credential,
      (SELECT count(*)::integer FROM entral.canonical_events ce
       LEFT JOIN entral.transactional_outbox o ON o.event_id = ce.id
       WHERE o.id IS NULL) AS "eventOutbox"`);
  return rows[0]!;
}

async function seedFixtures(client: PrismaClient): Promise<Fixture> {
  const fixture: Fixture = {
    businessA: randomUUID(),
    businessB: randomUUID(),
    commanderA: randomUUID(),
    commanderB: randomUUID(),
    credentialA: randomUUID(),
    credentialB: randomUUID(),
    soldierA: randomUUID(),
    tool: randomUUID()
  };
  await client.$executeRawUnsafe(
    `INSERT INTO entral.app_users
       (id, email, display_name, is_human_authority, is_active)
     VALUES ($1::uuid, 'phase160-human@example.test', 'Phase 160 Human', true, true)`,
    humanId
  );
  await client.$executeRawUnsafe(
    `INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
     VALUES
       ($1::uuid, 'C-G-M01-01-001', 'COMMANDER', 'Acceptance Commander A', $2::uuid, 'ACTIVE'),
       ($3::uuid, 'C-G-M01-02-001', 'COMMANDER', 'Acceptance Commander B', $4::uuid, 'ACTIVE')`,
    fixture.commanderA,
    generalAId,
    fixture.commanderB,
    generalBId
  );
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      `INSERT INTO entral.businesses
         (id, stable_code, name, commander_id, general_id, marshal_id, status)
       VALUES
         ($1::uuid, 'BIZ-PHASE160-A', 'Acceptance Business A', $2::uuid, $3::uuid, $4::uuid, 'OPERATING'),
         ($5::uuid, 'BIZ-PHASE160-B', 'Acceptance Business B', $6::uuid, $7::uuid, $4::uuid, 'OPERATING')`,
      fixture.businessA,
      fixture.commanderA,
      generalAId,
      marshalId,
      fixture.businessB,
      fixture.commanderB,
      generalBId
    );
    await tx.$executeRawUnsafe("SET CONSTRAINTS ALL IMMEDIATE");
  });
  await client.$executeRawUnsafe(
    `INSERT INTO entral.entities (id, stable_code, role, name, parent_id, status)
     VALUES ($1::uuid, 'S-C-G-M01-01-001-01', 'SOLDIER', 'Acceptance Soldier', $2::uuid, 'ACTIVE')`,
    fixture.soldierA,
    fixture.commanderA
  );
  await client.$executeRawUnsafe(
    `INSERT INTO entral.tool_definitions
       (id, stable_code, name, provider, description, input_schema, output_schema, adapter_ref)
     VALUES ($1::uuid, 'TOOL-PHASE160', 'Phase 160 Tool', 'internal', 'Acceptance only',
       '{}'::jsonb, '{}'::jsonb, 'internal:phase160')`,
    fixture.tool
  );
  await client.$executeRawUnsafe(
    `INSERT INTO entral.credential_references
       (id, stable_code, provider, secret_manager, secret_reference,
        owning_business_id, allowed_tool_id, allowed_actions)
     VALUES
       ($1::uuid, 'CRED-PHASE160-A', 'internal', 'test', 'phase160/a',
        $2::uuid, $3::uuid, ARRAY['read']::text[]),
       ($4::uuid, 'CRED-PHASE160-B', 'internal', 'test', 'phase160/b',
        $5::uuid, $3::uuid, ARRAY['read']::text[])`,
    fixture.credentialA,
    fixture.businessA,
    fixture.tool,
    fixture.credentialB,
    fixture.businessB
  );
  await client.$executeRawUnsafe(
    `INSERT INTO entral.tool_grants
       (entity_id, tool_id, business_id, credential_reference_id, allowed_actions)
     VALUES
       ($1::uuid, $2::uuid, $3::uuid, $4::uuid, ARRAY['read']::text[]),
       ($5::uuid, $2::uuid, $6::uuid, $7::uuid, ARRAY['read']::text[])`,
    fixture.commanderA,
    fixture.tool,
    fixture.businessA,
    fixture.credentialA,
    fixture.commanderB,
    fixture.businessB,
    fixture.credentialB
  );
  return fixture;
}

describe.skipIf(!integrationEnabled)("Phase 160 canonical taxonomy PostgreSQL gate", () => {
  it("seeds deterministically, reruns without side effects, and enforces every acceptance vector", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }
    const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
    const prismaCli = fileURLToPath(new URL("../../node_modules/prisma/build/index.js", import.meta.url));
    const seedScript = fileURLToPath(new URL("../../scripts/seed-canonical-taxonomy.mjs", import.meta.url));
    const verifyScript = fileURLToPath(
      new URL("../../scripts/verify-canonical-taxonomy.mjs", import.meta.url)
    );
    const taxonomy = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../../prisma/seeds/047_canonical_taxonomy.v1.json", import.meta.url)),
        "utf8"
      )
    ) as {
      entral: CanonicalRow;
      generals: CanonicalRow[];
      marshals: CanonicalRow[];
    };
    const expectedRows = [taxonomy.entral, ...taxonomy.marshals, ...taxonomy.generals].map((row) => ({
      definition: row.definition,
      id: row.id,
      name: row.name,
      parent_id: row.parent_id,
      role: row.role,
      stable_code: row.stable_code,
      taxonomy_version: row.taxonomy_version
    }));
    const vectors = JSON.parse(
      readFileSync(
        fileURLToPath(new URL("../../prisma/acceptance/093_acceptance_test_vectors.json", import.meta.url)),
        "utf8"
      )
    ) as AcceptanceVectors;

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const names = [`entral_phase160_a_${suffix}`, `entral_phase160_b_${suffix}`];
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
    const clients: PrismaClient[] = [];

    try {
      const version = await admin.$queryRawUnsafe<Array<{ version: string }>>(
        "SELECT current_setting('server_version') AS version"
      );
      expect(Number.parseInt(version[0]!.version, 10)).toBeGreaterThanOrEqual(18);

      const fingerprints: string[] = [];
      for (const databaseName of names) {
        await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
        const databaseUrl = new URL(baseUrl);
        databaseUrl.pathname = `/${databaseName}`;
        databaseUrl.searchParams.delete("schema");
        runCommand(
          process.execPath,
          [prismaCli, "migrate", "deploy", "--schema", "prisma/schema.prisma"],
          repositoryRoot,
          databaseUrl.toString(),
          "Phase 160 migration"
        );
        runCommand(
          process.execPath,
          [seedScript],
          repositoryRoot,
          databaseUrl.toString(),
          "Phase 160 canonical seed"
        );
        const client = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
        clients.push(client);
        const firstRows = await canonicalRows(client);
        expect(firstRows).toEqual(
          [...expectedRows].sort((left, right) =>
            left.stable_code < right.stable_code ? -1 : left.stable_code > right.stable_code ? 1 : 0
          )
        );
        const firstFingerprint = fingerprint(firstRows);
        expect(firstFingerprint).toBe(expectedFingerprint);
        fingerprints.push(firstFingerprint);

        const beforeRerun = await materialCounts(client);
        runCommand(
          process.execPath,
          [seedScript],
          repositoryRoot,
          databaseUrl.toString(),
          "Phase 160 canonical seed rerun"
        );
        expect(await materialCounts(client)).toEqual(beforeRerun);
        expect(fingerprint(await canonicalRows(client))).toBe(firstFingerprint);

        await client.$disconnect();
        const reconnected = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
        clients.push(reconnected);
        expect(fingerprint(await canonicalRows(reconnected))).toBe(firstFingerprint);
      }
      expect(fingerprints[0]).toBe(fingerprints[1]);

      const primary = clients[1]!;
      const fixture = await seedFixtures(primary);

      for (const vector of vectors.hierarchy) {
        if (vector.expected === "ACCEPT") {
          const child = await primary.$queryRawUnsafe<Array<{ count: number }>>(
            `SELECT count(*)::integer AS count FROM entral.entities child
             JOIN entral.entities parent ON parent.id = child.parent_id
             WHERE child.role::text = $1 AND parent.role::text = $2`,
            vector.child_role,
            vector.parent_role
          );
          expect(child[0]!.count, vector.id).toBeGreaterThan(0);
        } else {
          const parentId = vector.parent_role === "ENTRAL" ? entralId : generalAId;
          await expect(
            primary.$executeRawUnsafe(
              `INSERT INTO entral.entities
                 (id, stable_code, role, name, parent_id, status)
               VALUES ($1::uuid, $2, $3::entral.entity_role, $2, $4::uuid, 'ACTIVE')`,
              randomUUID(),
              `INVALID-${vector.id}`,
              vector.child_role,
              parentId
            )
          ).rejects.toThrow();
        }
      }

      for (const vector of vectors.operational_routes) {
        const senderUser = vector.sender.kind === "HUMAN" ? vector.sender.id : null;
        const senderEntity = vector.sender.kind === "ENTITY" ? vector.sender.id : null;
        const recipientUser = vector.recipient.kind === "HUMAN" ? vector.recipient.id : null;
        const recipientEntity = vector.recipient.kind === "ENTITY" ? vector.recipient.id : null;
        const rows = await primary.$queryRawUnsafe<
          Array<{ direction: string; routeValid: boolean; status: string }>
        >(
          `WITH inserted AS (
             INSERT INTO entral.operational_messages
               (sender_user_id, sender_entity_id, recipient_user_id, recipient_entity_id,
                message_type, payload)
             VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid,
               $5::entral.message_type, jsonb_build_object('vector_id', $6::text))
             RETURNING *
           )
           SELECT route_valid AS "routeValid", status::text AS status,
             entral.classify_message_direction(
               sender_user_id, sender_entity_id, recipient_user_id, recipient_entity_id
             ) AS direction
           FROM inserted`,
          senderUser,
          senderEntity,
          recipientUser,
          recipientEntity,
          vector.message_type,
          vector.id
        );
        expect(rows[0]!.routeValid, vector.id).toBe(vector.expected.route_valid);
        if (vector.expected.direction) {
          expect(rows[0]!.direction, vector.id).toBe(vector.expected.direction);
        }
        if (vector.expected.status) {
          expect(rows[0]!.status, vector.id).toBe(vector.expected.status);
        }
      }

      const messagesBeforeGovernance = await primary.$queryRawUnsafe<Array<{ count: number }>>(
        "SELECT count(*)::integer AS count FROM entral.operational_messages"
      );
      for (const vector of vectors.governance_actions) {
        const initiatorKind =
          vector.initiator === "HUMAN_AUTHORITY" ? "HUMAN" : "ENTITY";
        const initiatorUser = initiatorKind === "HUMAN" ? humanId : null;
        const initiatorEntity =
          vector.initiator === "ENTRAL"
            ? entralId
            : vector.initiator === "MARSHAL"
              ? marshalId
              : null;
        const targetId = vector.target === "SOLDIER" ? fixture.soldierA : fixture.commanderA;
        const action = primary.$executeRawUnsafe(
          `INSERT INTO entral.governance_actions (
             action_type, initiated_by_kind, initiated_by_user_id, initiated_by_entity_id,
             target_type, target_id, business_id, requested_outcome, reason,
             authority_basis, risk_class, proposed_changes, expected_version
           ) VALUES (
             $1::entral.governance_action_type, $2::entral.actor_kind, $3::uuid, $4::uuid,
             'ENTITY', $5::uuid, $6::uuid, $7, 'Phase 160 acceptance vector',
             jsonb_build_object('vector_id', $7::text), 'LOW', '{}'::jsonb, 0
           )`,
          vector.action_type,
          initiatorKind,
          initiatorUser,
          initiatorEntity,
          targetId,
          fixture.businessA,
          vector.id
        );
        if (vector.expected === "REJECT") {
          await expect(action, vector.id).rejects.toThrow();
        } else {
          await expect(action, vector.id).resolves.toBe(1);
        }
      }
      const messagesAfterGovernance = await primary.$queryRawUnsafe<Array<{ count: number }>>(
        "SELECT count(*)::integer AS count FROM entral.operational_messages"
      );
      expect(messagesAfterGovernance).toEqual(messagesBeforeGovernance);

      await expect(
        primary.$executeRawUnsafe(
          `INSERT INTO entral.tool_grants
             (entity_id, tool_id, business_id, credential_reference_id, allowed_actions)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, ARRAY['read']::text[])`,
          fixture.commanderA,
          fixture.tool,
          fixture.businessA,
          fixture.credentialB
        )
      ).rejects.toThrow();

      const nonVacuous = await primary.$queryRawUnsafe<
        Array<{ businesses: number; credentials: number; soldiers: number; tools: number }>
      >(`SELECT
          (SELECT count(*)::integer FROM entral.businesses) AS businesses,
          (SELECT count(*)::integer FROM entral.entities WHERE role = 'SOLDIER') AS soldiers,
          (SELECT count(*)::integer FROM entral.tool_grants) AS tools,
          (SELECT count(*)::integer FROM entral.credential_references) AS credentials`);
      expect(nonVacuous[0]!.businesses).toBeGreaterThanOrEqual(2);
      expect(nonVacuous[0]!.soldiers).toBeGreaterThanOrEqual(1);
      expect(nonVacuous[0]!.tools).toBeGreaterThanOrEqual(2);
      expect(nonVacuous[0]!.credentials).toBeGreaterThanOrEqual(2);
      expect(await invariantViolationCounts(primary)).toEqual({
        business: 0,
        credential: 0,
        eventOutbox: 0,
        hierarchy: 0,
        rejectedRoute: 0,
        soldier: 0,
        tool: 0
      });
      const primaryDatabaseUrl = new URL(baseUrl);
      primaryDatabaseUrl.pathname = `/${names[0]}`;
      primaryDatabaseUrl.searchParams.delete("schema");
      runCommand(
        process.execPath,
        [verifyScript],
        repositoryRoot,
        primaryDatabaseUrl.toString(),
        "Phase 160 owner-visible invariant verifier"
      );
    } finally {
      await Promise.allSettled(clients.map((client) => client.$disconnect()));
      for (const databaseName of names) {
        await admin
          .$executeRawUnsafe(
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
             WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
          )
          .catch(() => undefined);
        await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`).catch(() => undefined);
      }
      await admin.$disconnect();
    }
  }, 240_000);
});
