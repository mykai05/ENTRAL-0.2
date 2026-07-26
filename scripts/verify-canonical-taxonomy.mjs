import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import {
  CANONICAL_TAXONOMY_ID,
  EXPECTED_CANONICAL_FINGERPRINT,
  canonicalFingerprint,
  databaseUrlFromEnvironment,
  loadCanonicalDocument,
  validateCanonicalDocument
} from "./canonical-taxonomy-lib.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
databaseUrlFromEnvironment();
const expected = validateCanonicalDocument(
  loadCanonicalDocument(resolve(repoRoot, "prisma/seeds/047_canonical_taxonomy.v1.json"))
);
const prisma = new PrismaClient();

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Database invariant failed: ${message}`);
  }
}

async function count(query) {
  const rows = await prisma.$queryRawUnsafe(query);
  return Number(rows[0].count);
}

try {
  const ownership = await prisma.$queryRawUnsafe(`
    SELECT
      current_user AS "currentUser",
      current_user = pg_get_userbyid(c.relowner) AS "ownsEntities"
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'entral' AND c.relname = 'entities'
  `);
  assert(ownership[0]?.ownsEntities === true, "verification must run as the entral.entities owner");

  const actualRows = await prisma.$queryRawUnsafe(
    `SELECT
       id::text AS id,
       stable_code AS "stable_code",
       role::text AS role,
       name,
       parent_id::text AS "parent_id",
       definition,
       source_version AS "taxonomy_version"
     FROM entral.entities
     WHERE taxonomy_version_id = $1::uuid AND status <> 'RETIRED'
     ORDER BY stable_code COLLATE "C"`,
    CANONICAL_TAXONOMY_ID
  );
  assert(actualRows.length === expected.rows.length, `expected 132 canonical rows, got ${actualRows.length}`);
  const normalizeRow = (row) => ({
    definition: row.definition,
    id: row.id,
    name: row.name,
    parent_id: row.parent_id,
    role: row.role,
    stable_code: row.stable_code,
    taxonomy_version: row.taxonomy_version
  });
  assert(
    JSON.stringify(actualRows.map(normalizeRow)) ===
      JSON.stringify(
        [...expected.rows]
          .sort((left, right) =>
            left.stable_code < right.stable_code ? -1 : left.stable_code > right.stable_code ? 1 : 0
          )
          .map(normalizeRow)
      ),
    "database rows differ from the canonical JSON"
  );
  const fingerprint = canonicalFingerprint(actualRows);
  assert(fingerprint === EXPECTED_CANONICAL_FINGERPRINT, `fingerprint drift: ${fingerprint}`);

  const counts = await prisma.$queryRawUnsafe(
    `SELECT role::text AS role, count(*)::integer AS count
     FROM entral.entities
     WHERE taxonomy_version_id = $1::uuid AND status <> 'RETIRED'
     GROUP BY role`,
    CANONICAL_TAXONOMY_ID
  );
  const byRole = Object.fromEntries(counts.map((row) => [row.role, row.count]));
  assert(byRole.ENTRAL === 1 && byRole.MARSHAL === 8 && byRole.GENERAL === 123, "canonical counts drift");
  assert(
    (await count(`SELECT count(*)::integer AS count FROM entral.entities
      WHERE role = 'ENTRAL' AND status <> 'RETIRED'`)) === 1,
    "global active ENTRAL count is not exactly one"
  );
  assert(
    (await count(`SELECT count(*)::integer AS count FROM entral.taxonomy_versions
      WHERE is_active AND id = '${CANONICAL_TAXONOMY_ID}'::uuid`)) === 1,
    "canonical taxonomy version is not the sole active target"
  );

  const zeroCountChecks = [
    ["invalid hierarchy parent", `SELECT count(*)::integer AS count FROM entral.entities e
      LEFT JOIN entral.entities p ON p.id = e.parent_id WHERE
      (e.role = 'ENTRAL' AND e.parent_id IS NOT NULL)
      OR (e.role = 'MARSHAL' AND p.role IS DISTINCT FROM 'ENTRAL')
      OR (e.role = 'GENERAL' AND p.role IS DISTINCT FROM 'MARSHAL')
      OR (e.role = 'COMMANDER' AND p.role IS DISTINCT FROM 'GENERAL')
      OR (e.role = 'SOLDIER' AND p.role IS DISTINCT FROM 'COMMANDER')`],
    ["hierarchy cycle", `WITH RECURSIVE walk AS (
      SELECT id AS origin_id, id, parent_id, ARRAY[id] AS path, false AS cycle FROM entral.entities
      UNION ALL SELECT w.origin_id, e.id, e.parent_id, w.path || e.id, e.id = ANY(w.path)
      FROM walk w JOIN entral.entities e ON e.id = w.parent_id WHERE NOT w.cycle
    ) SELECT count(DISTINCT origin_id)::integer AS count FROM walk WHERE cycle`],
    ["business ownership mismatch", `SELECT count(*)::integer AS count FROM entral.businesses b
      JOIN entral.entities commander ON commander.id = b.commander_id
      JOIN entral.entities general ON general.id = b.general_id
      WHERE commander.role <> 'COMMANDER' OR commander.parent_id <> b.general_id
      OR general.role <> 'GENERAL' OR general.parent_id <> b.marshal_id
      OR commander.business_id <> b.id`],
    ["Soldier business mismatch", `SELECT count(*)::integer AS count FROM entral.entities soldier
      JOIN entral.entities commander ON commander.id = soldier.parent_id
      WHERE soldier.role = 'SOLDIER'
      AND soldier.business_id IS DISTINCT FROM commander.business_id`],
    ["invalid route delivery", `SELECT count(*)::integer AS count FROM entral.operational_messages
      WHERE NOT route_valid AND
      (status <> 'REJECTED' OR delivered_at IS NOT NULL OR acknowledged_at IS NOT NULL)`],
    ["invalid governance initiator", `SELECT count(*)::integer AS count FROM entral.governance_actions ga
      JOIN entral.entities e ON e.id = ga.initiated_by_entity_id
      WHERE ga.initiated_by_kind = 'ENTITY' AND e.role <> 'ENTRAL'`],
    ["tool grant business mismatch", `SELECT count(*)::integer AS count FROM entral.tool_grants tg
      JOIN entral.entities e ON e.id = tg.entity_id
      WHERE e.business_id IS NOT NULL AND tg.business_id IS DISTINCT FROM e.business_id
      AND (tg.expires_at IS NULL OR tg.expires_at > clock_timestamp())`],
    ["credential business mismatch", `SELECT count(*)::integer AS count FROM entral.tool_grants tg
      JOIN entral.credential_references cr ON cr.id = tg.credential_reference_id
      WHERE cr.owning_business_id IS NOT NULL
      AND tg.business_id IS DISTINCT FROM cr.owning_business_id`],
    ["event without outbox", `SELECT count(*)::integer AS count FROM entral.canonical_events ce
      LEFT JOIN entral.transactional_outbox o ON o.event_id = ce.id WHERE o.id IS NULL`],
    ["successful unverified action", `SELECT count(*)::integer AS count FROM entral.governance_actions ga
      LEFT JOIN entral.verification_results vr ON vr.id = ga.verification_result_id
      WHERE ga.status = 'SUCCEEDED' AND (vr.id IS NULL OR vr.status <> 'PASSED')`],
    ["incomplete terminal AI run", `SELECT count(*)::integer AS count FROM entral.ai_runs
      WHERE status IN ('SUCCEEDED','FAILED')
      AND (model_profile_id IS NULL OR context_manifest_id IS NULL OR completed_at IS NULL)`],
    ["untraceable verified memory", `SELECT count(*)::integer AS count FROM entral.memory_items
      WHERE (validation_state = 'VERIFIED' OR memory_kind = 'DERIVED_SUMMARY')
      AND source_record_id IS NULL AND source_artifact_id IS NULL AND provenance = '{}'::jsonb`],
    ["stale recommendation", `SELECT count(*)::integer AS count FROM entral.recommendations
      WHERE status = 'OPEN' AND expires_at IS NOT NULL AND expires_at <= clock_timestamp()`]
  ];
  for (const [name, query] of zeroCountChecks) {
    assert((await count(query)) === 0, name);
  }

  console.log(
    JSON.stringify({
      checks: zeroCountChecks.length + 5,
      counts: byRole,
      fingerprint,
      status: "passed",
      verified_as: ownership[0].currentUser
    })
  );
} finally {
  await prisma.$disconnect();
}
