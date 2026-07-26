import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { databaseUrlFromEnvironment } from "./canonical-taxonomy-lib.mjs";

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "::1", "localhost"]);
const SAFE_DATABASE_PREFIXES = [
  "entral_acceptance_",
  "entral_local_",
  "entral_phase",
  "entral_test_"
];

export function assessResetTarget(environment = process.env) {
  const url = databaseUrlFromEnvironment(environment);
  const databaseName = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  const productionMarkers = [
    environment.NODE_ENV,
    environment.RAILWAY_ENVIRONMENT_NAME,
    environment.RAILWAY_ENVIRONMENT,
    environment.VERCEL_ENV
  ].filter(Boolean);
  const reasons = [];
  if (environment.ENTRAL_ALLOW_DATABASE_RESET !== "1") {
    reasons.push("ENTRAL_ALLOW_DATABASE_RESET=1 is required");
  }
  if (productionMarkers.some((value) => value.toLowerCase() === "production")) {
    reasons.push("a production environment marker is present");
  }
  if (!LOOPBACK_HOSTS.has(url.hostname.toLowerCase())) {
    reasons.push("database host is not loopback");
  }
  if (!SAFE_DATABASE_PREFIXES.some((prefix) => databaseName.startsWith(prefix))) {
    reasons.push("database name is not disposable");
  }
  return { allowed: reasons.length === 0, databaseName, reasons };
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const decision = assessResetTarget();
  if (!decision.allowed) {
    console.error(`Refusing database reset: ${decision.reasons.join("; ")}.`);
    process.exit(2);
  }

  const require = createRequire(import.meta.url);
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const prismaCli = require.resolve("prisma/build/index.js");
  const schemaPath = resolve(repoRoot, "prisma/schema.prisma");
  const reset = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "reset", "--force", "--skip-seed", "--schema", schemaPath],
    { cwd: repoRoot, env: process.env, stdio: "inherit" }
  );
  if (reset.status !== 0) {
    process.exit(reset.status ?? 1);
  }

  const seed = spawnSync(process.execPath, [resolve(repoRoot, "scripts/seed-canonical-taxonomy.mjs")], {
    cwd: repoRoot,
    env: process.env,
    stdio: "inherit"
  });
  process.exit(seed.status ?? 1);
}
