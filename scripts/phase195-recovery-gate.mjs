import { createHash, randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  relative,
  resolve,
  sep
} from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const phaseMigration =
  "20260726190000_phase_195_graph_preferences_release_evidence_and_worker_readiness";
const gateLabel = "com.entral.phase195.recovery";
const runLabel = "com.entral.phase195.recovery-run";
const postgresImage = "postgres:18-alpine";
const redisImage = "redis:8.2-alpine";
const outputRoot = resolve(repoRoot, "test-results/phase195");
const maxCommandOutput = 128 * 1024 * 1024;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validateRecoveryRunId(runId) {
  if (!/^[a-f0-9]{12}$/.test(runId)) {
    throw new Error("INVALID_RECOVERY_RUN_ID");
  }
  return runId;
}

export function phase195BaselineMigrationNames(migrations) {
  const ordered = [...migrations].sort();
  if (!ordered.includes(phaseMigration)) {
    throw new Error("PHASE195_MIGRATION_MISSING");
  }
  return ordered.filter((name) => name < phaseMigration);
}

export function recoveryTargets(runId) {
  validateRecoveryRunId(runId);
  return {
    apiRole: `entral_p195_api_${runId}`,
    restoreAdmin: `entral_p195_dst_${runId}`,
    restoreContainer: `entral-phase195-pg-restore-${runId}`,
    restoreDatabase: `entral_phase195_restore_${runId}`,
    redisContainer: `entral-phase195-redis-${runId}`,
    sourceAdmin: `entral_p195_src_${runId}`,
    sourceContainer: `entral-phase195-pg-source-${runId}`,
    sourceDatabase: `entral_phase195_source_${runId}`,
    workerRole: `entral_p195_worker_${runId}`
  };
}

export function assertDisposableDatabaseName(databaseName) {
  if (
    !/^entral_phase195_(?:source|restore)_[a-f0-9]{12}$/.test(databaseName)
  ) {
    throw new Error("NON_DISPOSABLE_DATABASE_TARGET");
  }
  return databaseName;
}

export function assertSafeContainerIdentity(input) {
  const expectedName = input.expectedName;
  const actualName = input.actualName.replace(/^\//, "");
  if (
    actualName !== expectedName
    || input.actualId !== input.expectedId
    || input.gate !== "true"
    || input.runId !== input.expectedRunId
    || !expectedName.endsWith(`-${input.expectedRunId}`)
    || !expectedName.startsWith("entral-phase195-")
  ) {
    throw new Error("UNSAFE_CONTAINER_CLEANUP_TARGET");
  }
}

export function receiptContainsSecretMaterial(value) {
  const serialized = JSON.stringify(value);
  return (
    /postgres(?:ql)?:\/\/[^"\\\s]*@/i.test(serialized)
    || /redis:\/\/[^"\\\s]*@/i.test(serialized)
    || /(?:password|secret|token)\s*["':=]/i.test(serialized)
    || /SCRAM-SHA-256\$|md5[0-9a-f]{32}/i.test(serialized)
  );
}

function safeFailureCode(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[^A-Za-z0-9_]/g, "_").slice(0, 160)
    || "PHASE195_RECOVERY_GATE_FAILED";
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeGlobalsForPortableRestore(
  globalsSql,
  sourceAdmin,
  restoreAdmin
) {
  if (
    !/^entral_p195_src_[a-f0-9]{12}$/.test(sourceAdmin)
    || !/^entral_p195_dst_[a-f0-9]{12}$/.test(restoreAdmin)
  ) {
    throw new Error("GLOBALS_RESTORE_ADMIN_ROLE_INVALID");
  }
  const sourceGrantor = new RegExp(
    `GRANTED BY ${escapeRegExp(sourceAdmin)}(?=;)`,
    "g"
  );
  const matches = globalsSql.match(sourceGrantor) ?? [];
  if (matches.length < 1) {
    throw new Error("GLOBALS_SOURCE_GRANTOR_MISSING");
  }
  const normalized = globalsSql.replace(
    sourceGrantor,
    `GRANTED BY ${restoreAdmin}`
  );
  if (
    normalized.includes(`GRANTED BY ${sourceAdmin};`)
    || !normalized.includes(`CREATE ROLE ${sourceAdmin};`)
  ) {
    throw new Error("GLOBALS_RESTORE_NORMALIZATION_FAILED");
  }
  return {
    grantor_rebindings: matches.length,
    sql: normalized
  };
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: options.binary ? undefined : "utf8",
    env: options.env ?? process.env,
    input: options.input,
    maxBuffer: maxCommandOutput,
    windowsHide: true
  });
  if (result.error || result.status !== 0) {
    const diagnosticLines = options.sanitizedDiagnostic
      ? `${result.stderr ?? ""}\n${result.stdout ?? ""}`.split(/\r?\n/)
      : [];
    const diagnostic = diagnosticLines.find((line) =>
      /Database invariant failed:/i.test(line)
    ) ?? diagnosticLines.find((line) =>
      /Raw query failed/i.test(line)
    ) ?? diagnosticLines.find((line) =>
      /^\s*(?:Message|Error):/i.test(line)
    ) ?? diagnosticLines.find((line) =>
      /^\s*\{"error":/i.test(line)
    ) ?? "";
    const boundedDiagnostic = diagnostic
      ? `_${diagnostic.replace(/[^A-Za-z0-9]/g, "_").slice(0, 120)}`
      : "";
    throw new Error(
      `${options.failureCode ?? "RECOVERY_COMMAND_FAILED"}${boundedDiagnostic}`
    );
  }
  return result.stdout;
}

function restoreGlobals(containerName, adminRole, globalsBuffer) {
  const result = spawnSync("docker", [
    "exec",
    "-i",
    containerName,
    "psql",
    "-X",
    "--set=ON_ERROR_STOP=1",
    "-h",
    "127.0.0.1",
    "-U",
    adminRole,
    "-d",
    "postgres"
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    input: globalsBuffer,
    maxBuffer: maxCommandOutput,
    windowsHide: true
  });
  if (result.error || result.status !== 0) {
    const postgresError = (result.stderr ?? "")
      .split(/\r?\n/)
      .find((line) => /\b(?:ERROR|FATAL):/i.test(line));
    const boundedCode = postgresError
      ? postgresError.replace(/[^A-Za-z0-9]/g, "_").slice(0, 120)
      : "UNKNOWN";
    throw new Error(`GLOBALS_RESTORE_FAILED_${boundedCode}`);
  }
}

function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: maxCommandOutput,
    windowsHide: true
  });
  return {
    ok: !result.error && result.status === 0,
    stdout: result.stdout ?? ""
  };
}

function docker(args, options = {}) {
  return run("docker", args, options);
}

function progress(step) {
  process.stderr.write(`[phase195-recovery] ${step}\n`);
}

function sleep(milliseconds) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

async function waitForPostgres(containerName, adminRole) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (tryRun("docker", [
      "exec",
      containerName,
      "pg_isready",
      "-h",
      "127.0.0.1",
      "-U",
      adminRole,
      "-d",
      "postgres"
    ]).ok) return;
    await sleep(500);
  }
  throw new Error("POSTGRES_READINESS_TIMEOUT");
}

async function waitForRedis(containerName) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = tryRun("docker", [
      "exec",
      containerName,
      "redis-cli",
      "ping"
    ]);
    if (result.ok && result.stdout.trim() === "PONG") return;
    await sleep(500);
  }
  throw new Error("REDIS_READINESS_TIMEOUT");
}

function publishedPort(containerName, containerPort) {
  const output = docker(["port", containerName, `${containerPort}/tcp`], {
    failureCode: "DOCKER_PORT_READBACK_FAILED"
  }).trim();
  const match = output.match(/127\.0\.0\.1:(\d+)$/m);
  if (!match) throw new Error("NON_LOOPBACK_DOCKER_PORT");
  return Number(match[1]);
}

function databaseUrl(role, port, database) {
  assertDisposableDatabaseName(database);
  return `postgresql://${encodeURIComponent(role)}@127.0.0.1:${port}/${database}`;
}

function redisUrl(port) {
  return `redis://127.0.0.1:${port}`;
}

function migrationEnvironment(databaseUrlValue) {
  return {
    ...process.env,
    DATABASE_URL: databaseUrlValue,
    NODE_ENV: "test"
  };
}

function runPrisma(databaseUrlValue, args, failureCode) {
  const prismaCli = resolve(repoRoot, "node_modules/prisma/build/index.js");
  return run(process.execPath, [prismaCli, ...args], {
    env: migrationEnvironment(databaseUrlValue),
    failureCode
  });
}

function runRepositoryScript(
  databaseUrlValue,
  relativeScript,
  failureCode,
  sanitizedDiagnostic = false
) {
  return run(process.execPath, [resolve(repoRoot, relativeScript)], {
    env: migrationEnvironment(databaseUrlValue),
    failureCode,
    sanitizedDiagnostic
  });
}

function parseLastJson(output, failureCode) {
  for (const line of output.trim().split(/\r?\n/).reverse()) {
    try {
      return JSON.parse(line);
    } catch {
      // Continue until the last machine-readable line is found.
    }
  }
  throw new Error(failureCode);
}

function psql(containerName, adminRole, database, sql, failureCode) {
  return docker([
    "exec",
    containerName,
    "psql",
    "-X",
    "--set=ON_ERROR_STOP=1",
    "-U",
    adminRole,
    "-d",
    database,
    "-At",
    "-c",
    sql
  ], { failureCode }).trim();
}

function startContainer(args, name, runId, createdContainers) {
  const existing = tryRun("docker", [
    "inspect",
    "--format",
    "{{.Id}}",
    name
  ]);
  if (existing.ok) throw new Error("RECOVERY_CONTAINER_NAME_COLLISION");
  const id = docker([
    "run",
    "--rm",
    "-d",
    "--name",
    name,
    "--label",
    `${gateLabel}=true`,
    "--label",
    `${runLabel}=${runId}`,
    ...args
  ], { failureCode: "RECOVERY_CONTAINER_START_FAILED" }).trim();
  if (!/^[a-f0-9]{12,64}$/.test(id)) {
    throw new Error("RECOVERY_CONTAINER_ID_INVALID");
  }
  createdContainers.set(name, id);
  return id;
}

function inspectContainer(name) {
  const output = docker([
    "inspect",
    "--format",
    `{{.Id}}|{{.Name}}|{{index .Config.Labels "${gateLabel}"}}|{{index .Config.Labels "${runLabel}"}}`,
    name
  ], { failureCode: "RECOVERY_CONTAINER_INSPECTION_FAILED" }).trim();
  const [actualId, actualName, gate, runId] = output.split("|");
  return { actualId, actualName, gate, runId };
}

function verifiedContainerRestart(name, expectedId, runId) {
  const identity = inspectContainer(name);
  assertSafeContainerIdentity({
    ...identity,
    expectedId,
    expectedName: name,
    expectedRunId: runId
  });
  docker(["restart", name], {
    failureCode: "VERIFIED_CONTAINER_RESTART_FAILED"
  });
}

function verifiedContainerCleanup(name, expectedId, runId) {
  const current = tryRun("docker", ["inspect", "--format", "{{.Id}}", name]);
  if (!current.ok) return { name, removed: true };
  const identity = inspectContainer(name);
  assertSafeContainerIdentity({
    ...identity,
    expectedId,
    expectedName: name,
    expectedRunId: runId
  });
  docker(["stop", name], {
    failureCode: "VERIFIED_CONTAINER_CLEANUP_FAILED"
  });
  if (tryRun("docker", ["inspect", "--format", "{{.Id}}", name]).ok) {
    throw new Error("VERIFIED_CONTAINER_STILL_EXISTS");
  }
  return { name, removed: true };
}

async function buildBaselinePrismaTree(temporaryDirectory) {
  const sourceRoot = resolve(repoRoot, "prisma");
  const targetRoot = resolve(temporaryDirectory, "baseline-prisma");
  const targetMigrations = resolve(targetRoot, "migrations");
  await mkdir(targetMigrations, { recursive: true });
  await cp(
    resolve(sourceRoot, "schema.prisma"),
    resolve(targetRoot, "schema.prisma")
  );
  await cp(
    resolve(sourceRoot, "migrations/migration_lock.toml"),
    resolve(targetMigrations, "migration_lock.toml")
  );
  const migrations = (await readdir(resolve(sourceRoot, "migrations"), {
    withFileTypes: true
  }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const baselineMigrations = phase195BaselineMigrationNames(migrations);
  for (const migration of baselineMigrations) {
    await cp(
      resolve(sourceRoot, "migrations", migration),
      resolve(targetMigrations, migration),
      { recursive: true }
    );
  }
  return {
    baselineMigrationCount: baselineMigrations.length,
    migrationsPath: targetMigrations,
    schemaPath: resolve(targetRoot, "schema.prisma")
  };
}

async function safeRemoveTemporaryDirectory(temporaryDirectory) {
  const resolvedTemporary = resolve(temporaryDirectory);
  const resolvedRoot = `${resolve(tmpdir())}${sep}`;
  if (
    !resolvedTemporary.startsWith(resolvedRoot)
    || !basename(resolvedTemporary).startsWith("entral-phase195-recovery-")
  ) {
    throw new Error("UNSAFE_TEMPORARY_CLEANUP_TARGET");
  }
  await rm(resolvedTemporary, { recursive: true, force: true });
}

function migrationState(container, admin, database) {
  const output = psql(
    container,
    admin,
    database,
    `SELECT json_build_object(
      'count', count(*)::integer,
      'phase195_count', count(*) FILTER (
        WHERE migration_name = '${phaseMigration}'
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
      )::integer,
      'phase195_checksum', max(checksum) FILTER (
        WHERE migration_name = '${phaseMigration}'
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
      )
    )::text FROM public."_prisma_migrations";`,
    "MIGRATION_STATE_READBACK_FAILED"
  );
  return JSON.parse(output);
}

function restoredCanonicalState(container, admin, database) {
  const output = psql(
    container,
    admin,
    database,
    `SELECT json_build_object(
      'entral', count(*) FILTER (WHERE role = 'ENTRAL')::integer,
      'marshals', count(*) FILTER (WHERE role = 'MARSHAL')::integer,
      'generals', count(*) FILTER (WHERE role = 'GENERAL')::integer,
      'entities', count(*)::integer,
      'hierarchy_edges', count(*) FILTER (WHERE parent_id IS NOT NULL)::integer
    )::text
    FROM entral.entities
    WHERE status <> 'RETIRED';`,
    "CANONICAL_STATE_READBACK_FAILED"
  );
  return JSON.parse(output);
}

async function runRecoveryGate() {
  if (process.argv.slice(2).length > 0) {
    throw new Error("CLI_ARGUMENTS_FORBIDDEN");
  }
  if (
    process.env.PHASE195_RECOVERY_GATE_CONFIRM
    !== "DISPOSABLE_ONLY"
  ) {
    throw new Error("DISPOSABLE_CONFIRMATION_REQUIRED");
  }

  const runId = validateRecoveryRunId(
    process.env.PHASE195_RECOVERY_RUN_ID?.trim()
      || randomBytes(6).toString("hex")
  );
  const targets = recoveryTargets(runId);
  const receiptPath = resolve(
    outputRoot,
    `phase195-recovery-${runId}.json`
  );
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "entral-phase195-recovery-")
  );
  const createdContainers = new Map();
  const cleanup = [];
  const startedAt = new Date();
  let receipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    phase: 195,
    run_id: runId,
    status: "FAILED",
    started_at: startedAt.toISOString()
  };
  let failure;

  try {
    progress("verifying local Docker and preparing the Phase 190 migration tree");
    const dockerVersion = docker(["version", "--format", "{{.Server.Version}}"], {
      failureCode: "DOCKER_SERVER_REQUIRED"
    }).trim();
    const baseline = await buildBaselinePrismaTree(temporaryDirectory);
    const sourceId = startContainer([
      "-e",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "-e",
      `POSTGRES_USER=${targets.sourceAdmin}`,
      "-e",
      "POSTGRES_DB=postgres",
      "-p",
      "127.0.0.1::5432",
      postgresImage
    ], targets.sourceContainer, runId, createdContainers);
    const redisId = startContainer([
      "-p",
      "127.0.0.1::6379",
      redisImage
    ], targets.redisContainer, runId, createdContainers);
    await Promise.all([
      waitForPostgres(targets.sourceContainer, targets.sourceAdmin),
      waitForRedis(targets.redisContainer)
    ]);
    const sourcePort = publishedPort(targets.sourceContainer, 5432);
    const sourceUrl = databaseUrl(
      targets.sourceAdmin,
      sourcePort,
      targets.sourceDatabase
    );

    progress("creating and seeding the pre-Phase195 source database");
    docker([
      "exec",
      targets.sourceContainer,
      "createdb",
      "-U",
      targets.sourceAdmin,
      targets.sourceDatabase
    ], { failureCode: "SOURCE_DATABASE_CREATE_FAILED" });
    runPrisma(sourceUrl, [
      "migrate",
      "deploy",
      "--schema",
      baseline.schemaPath
    ], "BASELINE_MIGRATION_FAILED");
    runPrisma(sourceUrl, [
      "db",
      "execute",
      "--file",
      "prisma/security/046_roles_and_grants.sql",
      "--schema",
      baseline.schemaPath
    ], "BASELINE_ROLE_GRANT_FAILED");
    const sourceSeed = parseLastJson(
      runRepositoryScript(
        sourceUrl,
        "scripts/seed-canonical-taxonomy.mjs",
        "BASELINE_SEED_FAILED"
      ),
      "BASELINE_SEED_RECEIPT_MISSING"
    );
    const sourceMigrationState = migrationState(
      targets.sourceContainer,
      targets.sourceAdmin,
      targets.sourceDatabase
    );
    if (
      sourceMigrationState.count !== baseline.baselineMigrationCount
      || sourceMigrationState.phase195_count !== 0
    ) {
      throw new Error("BASELINE_MIGRATION_BOUNDARY_INVALID");
    }

    progress("creating and verifying custom-format and globals backups");
    const containerBackupPath = `/tmp/phase195-${runId}.dump`;
    const hostBackupPath = resolve(temporaryDirectory, "phase195-base.dump");
    const hostGlobalsPath = resolve(temporaryDirectory, "phase195-globals.sql");
    docker([
      "exec",
      targets.sourceContainer,
      "pg_dump",
      "-U",
      targets.sourceAdmin,
      "-d",
      targets.sourceDatabase,
      "--format=custom",
      "--no-owner",
      "--no-privileges",
      "--file",
      containerBackupPath
    ], { failureCode: "CUSTOM_BACKUP_FAILED" });
    const backupListing = docker([
      "exec",
      targets.sourceContainer,
      "pg_restore",
      "--list",
      containerBackupPath
    ], { failureCode: "CUSTOM_BACKUP_LIST_FAILED" });
    docker([
      "cp",
      `${targets.sourceContainer}:${containerBackupPath}`,
      hostBackupPath
    ], { failureCode: "CUSTOM_BACKUP_COPY_FAILED" });
    const globals = docker([
      "exec",
      targets.sourceContainer,
      "pg_dumpall",
      "-U",
      targets.sourceAdmin,
      "--globals-only",
      "--no-role-passwords"
    ], { failureCode: "GLOBALS_BACKUP_FAILED" });
    if (
      !globals.includes("CREATE ROLE entral_api")
      || !globals.includes("CREATE ROLE entral_worker")
      || /SCRAM-SHA-256\$|md5[0-9a-f]{32}|PASSWORD\s+'[^']+'/i.test(globals)
    ) {
      throw new Error("GLOBALS_BACKUP_UNSAFE_OR_INCOMPLETE");
    }
    await writeFile(hostGlobalsPath, globals, {
      encoding: "utf8",
      flag: "wx"
    });
    const [backupBuffer, backupStats, globalsBuffer, globalsStats] =
      await Promise.all([
        readFile(hostBackupPath),
        stat(hostBackupPath),
        readFile(hostGlobalsPath),
        stat(hostGlobalsPath)
      ]);
    const portableGlobals = normalizeGlobalsForPortableRestore(
      globalsBuffer.toString("utf8"),
      targets.sourceAdmin,
      targets.restoreAdmin
    );
    const listingEntries = backupListing
      .split(/\r?\n/)
      .filter((line) => /^\d+;/.test(line)).length;
    if (
      backupStats.size < 1_024
      || globalsStats.size < 100
      || listingEntries < 10
    ) {
      throw new Error("BACKUP_VERIFICATION_FAILED");
    }

    progress("restoring into a second isolated PostgreSQL 18 cluster");
    const restoreId = startContainer([
      "-e",
      "POSTGRES_HOST_AUTH_METHOD=trust",
      "-e",
      `POSTGRES_USER=${targets.restoreAdmin}`,
      "-e",
      "POSTGRES_DB=postgres",
      "-p",
      "127.0.0.1::5432",
      postgresImage
    ], targets.restoreContainer, runId, createdContainers);
    await waitForPostgres(targets.restoreContainer, targets.restoreAdmin);
    const restorePort = publishedPort(targets.restoreContainer, 5432);
    restoreGlobals(
      targets.restoreContainer,
      targets.restoreAdmin,
      portableGlobals.sql
    );
    docker([
      "exec",
      targets.restoreContainer,
      "createdb",
      "-U",
      targets.restoreAdmin,
      targets.restoreDatabase
    ], { failureCode: "RESTORE_DATABASE_CREATE_FAILED" });
    const restoredContainerBackup = `/tmp/phase195-${runId}.dump`;
    docker([
      "cp",
      hostBackupPath,
      `${targets.restoreContainer}:${restoredContainerBackup}`
    ], { failureCode: "RESTORE_BACKUP_COPY_FAILED" });
    docker([
      "exec",
      targets.restoreContainer,
      "pg_restore",
      "-U",
      targets.restoreAdmin,
      "-d",
      targets.restoreDatabase,
      "--no-owner",
      "--no-privileges",
      "--exit-on-error",
      restoredContainerBackup
    ], { failureCode: "CUSTOM_RESTORE_FAILED" });
    const restoredBaselineState = migrationState(
      targets.restoreContainer,
      targets.restoreAdmin,
      targets.restoreDatabase
    );
    if (
      restoredBaselineState.count !== sourceMigrationState.count
      || restoredBaselineState.phase195_count !== 0
    ) {
      throw new Error("RESTORED_BASELINE_MIGRATION_STATE_INVALID");
    }

    progress("applying Phase195 forward recovery, both grants files, and two idempotent seeds");
    await cp(
      resolve(repoRoot, "prisma/migrations", phaseMigration),
      resolve(baseline.migrationsPath, phaseMigration),
      { recursive: true }
    );
    const restoreOwnerUrl = databaseUrl(
      targets.restoreAdmin,
      restorePort,
      targets.restoreDatabase
    );
    runPrisma(restoreOwnerUrl, [
      "migrate",
      "deploy",
      "--schema",
      baseline.schemaPath
    ], "FORWARD_MIGRATION_FAILED");
    runRepositoryScript(
      restoreOwnerUrl,
      "scripts/apply-database-roles.mjs",
      "RESTORED_ROLE_GRANTS_FAILED"
    );
    const seedReceipts = [
      parseLastJson(
        runRepositoryScript(
          restoreOwnerUrl,
          "scripts/seed-canonical-taxonomy.mjs",
          "RESTORED_SEED_ONE_FAILED"
        ),
        "RESTORED_SEED_ONE_RECEIPT_MISSING"
      ),
      parseLastJson(
        runRepositoryScript(
          restoreOwnerUrl,
          "scripts/seed-canonical-taxonomy.mjs",
          "RESTORED_SEED_TWO_FAILED"
        ),
        "RESTORED_SEED_TWO_RECEIPT_MISSING"
      )
    ];
    if (
      seedReceipts.some((seed) => seed.status !== "seeded")
      || seedReceipts[0].fingerprint !== seedReceipts[1].fingerprint
    ) {
      throw new Error("RESTORED_SEED_IDEMPOTENCY_FAILED");
    }
    psql(
      targets.restoreContainer,
      targets.restoreAdmin,
      targets.restoreDatabase,
      `CREATE ROLE "${targets.apiRole}"
        LOGIN INHERIT NOSUPERUSER NOBYPASSRLS
        NOCREATEDB NOCREATEROLE NOREPLICATION;
       GRANT entral_api TO "${targets.apiRole}";
       CREATE ROLE "${targets.workerRole}"
        LOGIN INHERIT NOSUPERUSER NOBYPASSRLS
        NOCREATEDB NOCREATEROLE NOREPLICATION;
       GRANT entral_worker TO "${targets.workerRole}";`,
      "NON_SUPERUSER_ROLE_CREATE_FAILED"
    );

    const lifecyclePreRestart = parseLastJson(
      run(
        process.execPath,
        [
          resolve(repoRoot, "backend/node_modules/tsx/dist/cli.mjs"),
          resolve(
            repoRoot,
            "backend/src/cli/phase195LifecycleRecoveryProbe.ts"
          )
        ],
        {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl(
              targets.apiRole,
              restorePort,
              targets.restoreDatabase
            ),
            JWT_SECRET:
              "phase195-recovery-gate-jwt-secret-is-disposable-only",
            NODE_ENV: "test",
            PHASE195_RECOVERY_API_DATABASE_URL: databaseUrl(
              targets.apiRole,
              restorePort,
              targets.restoreDatabase
            ),
            PHASE195_RECOVERY_GATE_CONFIRM: "DISPOSABLE_ONLY",
            PHASE195_RECOVERY_LIFECYCLE_STAGE: "PRE_RESTART",
            PHASE195_RECOVERY_OWNER_DATABASE_URL: restoreOwnerUrl,
            PHASE195_RECOVERY_RUN_ID: runId
          },
          failureCode: "PRE_RESTART_LIFECYCLE_PROBE_FAILED",
          sanitizedDiagnostic: true
        }
      ),
      "PRE_RESTART_LIFECYCLE_RECEIPT_MISSING"
    );
    const lifecycleHandoff = JSON.stringify({
      auth_subject: lifecyclePreRestart.auth_subject,
      human_email: lifecyclePreRestart.human_email,
      pause_request: lifecyclePreRestart.pause_request,
      receipt: lifecyclePreRestart.receipt
    });
    if (Buffer.byteLength(lifecycleHandoff, "utf8") > 16_384) {
      throw new Error("LIFECYCLE_HANDOFF_TOO_LARGE");
    }

    progress("restarting restored PostgreSQL and Redis, then exercising API, worker, outbox, and readiness paths");
    verifiedContainerRestart(
      targets.restoreContainer,
      restoreId,
      runId
    );
    verifiedContainerRestart(
      targets.redisContainer,
      redisId,
      runId
    );
    await Promise.all([
      waitForPostgres(targets.restoreContainer, targets.restoreAdmin),
      waitForRedis(targets.redisContainer)
    ]);
    const restartedRestorePort = publishedPort(
      targets.restoreContainer,
      5432
    );
    const restartedRedisPort = publishedPort(targets.redisContainer, 6379);
    const restartedRestoreOwnerUrl = databaseUrl(
      targets.restoreAdmin,
      restartedRestorePort,
      targets.restoreDatabase
    );
    const lifecyclePostRestart = parseLastJson(
      run(
        process.execPath,
        [
          resolve(repoRoot, "backend/node_modules/tsx/dist/cli.mjs"),
          resolve(
            repoRoot,
            "backend/src/cli/phase195LifecycleRecoveryProbe.ts"
          )
        ],
        {
          env: {
            ...process.env,
            DATABASE_URL: databaseUrl(
              targets.apiRole,
              restartedRestorePort,
              targets.restoreDatabase
            ),
            JWT_SECRET:
              "phase195-recovery-gate-jwt-secret-is-disposable-only",
            NODE_ENV: "test",
            PHASE195_RECOVERY_API_DATABASE_URL: databaseUrl(
              targets.apiRole,
              restartedRestorePort,
              targets.restoreDatabase
            ),
            PHASE195_RECOVERY_GATE_CONFIRM: "DISPOSABLE_ONLY",
            PHASE195_RECOVERY_LIFECYCLE_HANDOFF: lifecycleHandoff,
            PHASE195_RECOVERY_LIFECYCLE_STAGE: "POST_RESTART",
            PHASE195_RECOVERY_OWNER_DATABASE_URL:
              restartedRestoreOwnerUrl,
            PHASE195_RECOVERY_RUN_ID: runId
          },
          failureCode: "POST_RESTART_LIFECYCLE_PROBE_FAILED",
          sanitizedDiagnostic: true
        }
      ),
      "POST_RESTART_LIFECYCLE_RECEIPT_MISSING"
    );
    const verification = parseLastJson(
      runRepositoryScript(
        restartedRestoreOwnerUrl,
        "scripts/verify-canonical-taxonomy.mjs",
        "RESTORED_TAXONOMY_VERIFICATION_FAILED",
        true
      ),
      "RESTORED_TAXONOMY_RECEIPT_MISSING"
    );
    const finalMigrationState = migrationState(
      targets.restoreContainer,
      targets.restoreAdmin,
      targets.restoreDatabase
    );
    const localMigrationBytes = await readFile(resolve(
      repoRoot,
      "prisma/migrations",
      phaseMigration,
      "migration.sql"
    ));
    const localMigrationChecksum = sha256(localMigrationBytes);
    if (
      finalMigrationState.phase195_count !== 1
      || finalMigrationState.count !== sourceMigrationState.count + 1
      || finalMigrationState.phase195_checksum !== localMigrationChecksum
    ) {
      throw new Error("FORWARD_MIGRATION_RECEIPT_INVALID");
    }
    const canonical = restoredCanonicalState(
      targets.restoreContainer,
      targets.restoreAdmin,
      targets.restoreDatabase
    );
    if (
      canonical.entral !== 1
      || canonical.marshals !== 8
      || canonical.generals !== 123
      || canonical.entities !== 132
      || canonical.hierarchy_edges !== 131
    ) {
      throw new Error("RESTORED_CANONICAL_COUNTS_INVALID");
    }

    const probeOutput = run(
      process.execPath,
      [
        resolve(repoRoot, "backend/node_modules/tsx/dist/cli.mjs"),
        resolve(repoRoot, "backend/src/cli/phase195RecoveryProbe.ts")
      ],
      {
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl(
            targets.workerRole,
            restartedRestorePort,
            targets.restoreDatabase
          ),
          JWT_SECRET:
            "phase195-recovery-gate-jwt-secret-is-disposable-only",
          NODE_ENV: "test",
          PHASE195_RECOVERY_API_DATABASE_URL: databaseUrl(
            targets.apiRole,
            restartedRestorePort,
            targets.restoreDatabase
          ),
          PHASE195_RECOVERY_GATE_CONFIRM: "DISPOSABLE_ONLY",
          PHASE195_RECOVERY_LIFECYCLE_ACTION_IDS: [
            lifecyclePostRestart.pause_action_id,
            lifecyclePostRestart.resume_action_id
          ].join(","),
          PHASE195_RECOVERY_OWNER_DATABASE_URL: restartedRestoreOwnerUrl,
          PHASE195_RECOVERY_REDIS_URL: redisUrl(restartedRedisPort),
          PHASE195_RECOVERY_RUN_ID: runId,
          PHASE195_RECOVERY_WORKER_DATABASE_URL: databaseUrl(
            targets.workerRole,
            restartedRestorePort,
            targets.restoreDatabase
          )
        },
        failureCode: "NON_SUPERUSER_RUNTIME_PROBE_FAILED",
        sanitizedDiagnostic: true
      }
    );
    const runtimeProbe = parseLastJson(
      probeOutput,
      "NON_SUPERUSER_RUNTIME_PROBE_RECEIPT_MISSING"
    );
    const postgresVersion = docker([
      "exec",
      targets.restoreContainer,
      "postgres",
      "--version"
    ], { failureCode: "POSTGRES_VERSION_READBACK_FAILED" }).trim();
    const redisVersion = docker([
      "exec",
      targets.redisContainer,
      "redis-server",
      "--version"
    ], { failureCode: "REDIS_VERSION_READBACK_FAILED" }).trim();
    const gitSha = run("git", ["rev-parse", "HEAD"], {
      failureCode: "GIT_SHA_READBACK_FAILED"
    }).trim();
    const workingTreeClean = run("git", ["status", "--porcelain"], {
      failureCode: "GIT_STATUS_READBACK_FAILED"
    }).trim().length === 0;

    receipt = {
      ...receipt,
      status: "PASSED",
      completed_at: new Date().toISOString(),
      source_revision: {
        git_commit_sha: gitSha,
        working_tree_clean: workingTreeClean
      },
      isolation: {
        confirmation: "DISPOSABLE_ONLY",
        docker_server_version: dockerVersion,
        loopback_only: true,
        postgres_image: postgresImage,
        redis_image: redisImage,
        loopback_ports_refreshed_after_restart: true,
        source_container_id: sourceId.slice(0, 12),
        source_database: targets.sourceDatabase,
        restore_container_id: restoreId.slice(0, 12),
        restore_database: targets.restoreDatabase,
        redis_container_id: redisId.slice(0, 12)
      },
      versions: {
        postgres: postgresVersion,
        redis: redisVersion
      },
      backup: {
        custom_format: {
          bytes: backupStats.size,
          listing_entries: listingEntries,
          retained: false,
          sha256: sha256(backupBuffer),
          verified: true
        },
        globals: {
          bytes: globalsStats.size,
          password_material_present: false,
          retained: false,
          restore_grantor_rebindings:
            portableGlobals.grantor_rebindings,
          sha256: sha256(globalsBuffer),
          verified: true
        }
      },
      recovery: {
        baseline_migration_count: sourceMigrationState.count,
        phase195_migration_applied_after_restore: true,
        phase195_migration_checksum: finalMigrationState.phase195_checksum,
        restored_baseline_migration_count: restoredBaselineState.count,
        final_migration_count: finalMigrationState.count,
        grants_applied_in_order: [
          "046_roles_and_grants.sql",
          "047_phase_195_roles_and_grants.sql"
        ],
        postgres_restarted: true,
        redis_restarted: true
      },
      lifecycle_restart: {
        api_identity: lifecyclePostRestart.api_identity,
        postgres_restarted_between_stages: true,
        pre_restart: lifecyclePreRestart.receipt,
        post_restart: {
          idempotent_pause_replay:
            lifecyclePostRestart.idempotent_pause_replay,
          pause_action_id: lifecyclePostRestart.pause_action_id,
          pause_canonical_event_id:
            lifecyclePostRestart.pause_canonical_event_id,
          persisted_status_after_restart:
            lifecyclePostRestart.persisted_status_after_restart,
          persisted_version_after_restart:
            lifecyclePostRestart.persisted_version_after_restart,
          restoration_of_action_id:
            lifecyclePostRestart.restoration_of_action_id,
          restored_active_status:
            lifecyclePostRestart.restored_active_status,
          restored_active_version:
            lifecyclePostRestart.restored_active_version,
          resume_action_id: lifecyclePostRestart.resume_action_id,
          stage: lifecyclePostRestart.stage,
          target_entity_id: lifecyclePostRestart.target_entity_id
        }
      },
      seed: {
        baseline: sourceSeed,
        restored_runs: seedReceipts,
        verification
      },
      canonical,
      runtime_probe: runtimeProbe
    };
  } catch (error) {
    failure = error;
    receipt = {
      ...receipt,
      completed_at: new Date().toISOString(),
      failure_code: safeFailureCode(error)
    };
  } finally {
    progress("cleaning only verified run-owned containers and temporary backup bytes");
    for (const [name, id] of [...createdContainers.entries()].reverse()) {
      try {
        cleanup.push(verifiedContainerCleanup(name, id, runId));
      } catch (error) {
        cleanup.push({
          error: safeFailureCode(error),
          name,
          removed: false
        });
        failure ??= error;
      }
    }
    try {
      await safeRemoveTemporaryDirectory(temporaryDirectory);
      cleanup.push({
        removed: true,
        target: "temporary_backup_directory"
      });
    } catch (error) {
      cleanup.push({
        error: safeFailureCode(error),
        removed: false,
        target: "temporary_backup_directory"
      });
      failure ??= error;
    }
    receipt = {
      ...receipt,
      cleanup,
      status: failure ? "FAILED" : receipt.status
    };
    if (receiptContainsSecretMaterial(receipt)) {
      receipt = {
        contract_version: "1.0.0",
        schema_version: 1,
        phase: 195,
        run_id: runId,
        status: "FAILED",
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString(),
        failure_code: "RECEIPT_SECRET_MATERIAL_REJECTED",
        cleanup
      };
      failure ??= new Error("RECEIPT_SECRET_MATERIAL_REJECTED");
    }
    await mkdir(outputRoot, { recursive: true });
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
  }

  process.stdout.write(`${JSON.stringify({
    receipt_path: relative(repoRoot, receiptPath).replaceAll("\\", "/"),
    run_id: runId,
    status: receipt.status
  })}\n`);
  if (failure) throw failure;
  return receipt;
}

const invokedDirectly =
  process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  runRecoveryGate().catch((error) => {
    process.stderr.write(`${JSON.stringify({
      error: safeFailureCode(error)
    })}\n`);
    process.exitCode = 1;
  });
}
