import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  databaseUrlFromEnvironment,
  loadCanonicalDocument,
  validateCanonicalDocument
} from "./canonical-taxonomy-lib.mjs";

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const taxonomyPath = resolve(repoRoot, "prisma/seeds/047_canonical_taxonomy.v1.json");
const seedPath = resolve(repoRoot, "prisma/seeds/048_canonical_hierarchy.sql");
const schemaPath = resolve(repoRoot, "prisma/schema.prisma");

databaseUrlFromEnvironment();
const validation = validateCanonicalDocument(loadCanonicalDocument(taxonomyPath));
const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(
  process.execPath,
  [prismaCli, "db", "execute", "--file", seedPath, "--schema", schemaPath],
  { cwd: repoRoot, env: process.env, stdio: "inherit" }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
console.log(
  JSON.stringify({
    counts: validation.counts,
    fingerprint: validation.fingerprint,
    status: "seeded",
    taxonomy_version: "1.0.0"
  })
);
