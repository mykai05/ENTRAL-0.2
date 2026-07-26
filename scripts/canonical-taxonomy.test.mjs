import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  EXPECTED_CANONICAL_FINGERPRINT,
  canonicalRows,
  loadCanonicalDocument,
  validateCanonicalDocument
} from "./canonical-taxonomy-lib.mjs";
import { assessResetTarget } from "./reset-canonical-database.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const taxonomyPath = resolve(repoRoot, "prisma/seeds/047_canonical_taxonomy.v1.json");
const seedPath = resolve(repoRoot, "prisma/seeds/048_canonical_hierarchy.sql");
const invariantPath = resolve(repoRoot, "prisma/acceptance/092_database_invariant_queries.sql");

test("canonical JSON is structurally exact and has the locked fingerprint", () => {
  const result = validateCanonicalDocument(loadCanonicalDocument(taxonomyPath));
  assert.deepEqual(result.counts, { entral: 1, generals: 123, marshals: 8 });
  assert.equal(result.fingerprint, EXPECTED_CANONICAL_FINGERPRINT);
});

test("repository SQL carries every canonical ID, code, name, parent, and definition", () => {
  const document = loadCanonicalDocument(taxonomyPath);
  const sql = readFileSync(seedPath, "utf8");
  for (const row of canonicalRows(document)) {
    for (const value of [
      row.id,
      row.stable_code,
      row.role,
      row.name.replaceAll("'", "''"),
      row.parent_id,
      row.definition.replaceAll("'", "''")
    ].filter(Boolean)) {
      assert.ok(sql.includes(value), `${row.stable_code} is missing SQL value ${value}`);
    }
  }
  assert.doesNotMatch(sql, /app\.suppress_automatic_events/);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /ON CONFLICT \(id\) DO UPDATE SET[\s\S]+WHERE \(/);
  assert.match(sql, /WHERE NOT EXISTS \([\s\S]+event_type = 'taxonomy\.seeded'/);
});

test("capsule invariant catalog is retained as executable SQL", () => {
  const sql = readFileSync(invariantPath, "utf8");
  assert.equal((sql.match(/^-- EXPECT ZERO:/gm) ?? []).length, 13);
  for (const surface of [
    "business ownership mismatch",
    "canonical event missing outbox record",
    "rejected route marked delivered",
    "Soldier is not bound",
    "business credential production used by another business"
  ]) {
    assert.ok(sql.includes(surface), `missing invariant surface: ${surface}`);
  }
});

test("reset guard permits only explicitly opted-in loopback disposable databases", () => {
  assert.equal(
    assessResetTarget({
      DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/entral_acceptance_example",
      ENTRAL_ALLOW_DATABASE_RESET: "1"
    }).allowed,
    true
  );
  for (const environment of [
    {
      DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/entral_acceptance_example"
    },
    {
      DATABASE_URL: "postgresql://user:secret@remote.example:5432/entral_acceptance_example",
      ENTRAL_ALLOW_DATABASE_RESET: "1"
    },
    {
      DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/production",
      ENTRAL_ALLOW_DATABASE_RESET: "1"
    },
    {
      DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/entral_acceptance_example",
      ENTRAL_ALLOW_DATABASE_RESET: "1",
      NODE_ENV: "production"
    }
  ]) {
    const decision = assessResetTarget(environment);
    assert.equal(decision.allowed, false);
    assert.ok(decision.reasons.length > 0);
  }
});
