import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  applyDatabaseRoles,
  buildAtomicRoleSql,
  normalizeTransactionWrappedSql
} from "./apply-database-roles.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function projectFile(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function filesBelow(relativePath) {
  const base = path.join(root, relativePath);
  const found = [];

  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolute);
      } else if (entry.isFile()) {
        found.push(absolute);
      }
    }
  }

  await visit(base);
  return found;
}

function relative(absolutePath) {
  return path.relative(root, absolutePath).replaceAll("\\", "/");
}

test("database role grants execute once inside one outer transaction", async () => {
  const files = [
    "prisma/security/046_roles_and_grants.sql",
    "prisma/security/047_phase_195_roles_and_grants.sql"
  ];
  const sourceByPath = new Map(await Promise.all(files.map(async (file) => [
    file,
    await projectFile(file)
  ])));
  const calls = [];
  const environment = { DATABASE_URL: "postgresql://unit-test-placeholder" };
  const schema = path.join(root, "prisma/schema.prisma");
  const prismaCliPath = path.join(root, "node_modules/prisma/build/index.js");

  const status = applyDatabaseRoles({
    cwd: root,
    environment,
    executable: "node-for-unit-test",
    files,
    prismaCliPath,
    readFile(absolutePath, encoding) {
      assert.equal(encoding, "utf8");
      return sourceByPath.get(relative(absolutePath));
    },
    schema,
    spawn(command, arguments_, options) {
      calls.push({ arguments_, command, options });
      return { status: 0 };
    }
  });

  assert.equal(status, 0);
  assert.equal(calls.length, 1, "046 and 047 must share one Prisma process and database connection");
  assert.equal(calls[0].command, "node-for-unit-test");
  assert.deepEqual(calls[0].arguments_, [
    prismaCliPath,
    "db",
    "execute",
    "--stdin",
    "--schema",
    schema
  ]);
  assert.equal(calls[0].options.cwd, root);
  assert.equal(calls[0].options.env, environment);
  assert.equal(calls[0].options.encoding, "utf8");
  assert.deepEqual(calls[0].options.stdio, ["pipe", "inherit", "inherit"]);

  const combinedSql = calls[0].options.input;
  assert.equal(combinedSql.match(/^BEGIN;$/gm)?.length, 1);
  assert.equal(combinedSql.match(/^COMMIT;$/gm)?.length, 1);
  assert.ok(
    combinedSql.indexOf("-- ENTRAL production PostgreSQL roles and grants.")
      < combinedSql.indexOf("-- Phase 195 least-privilege grants."),
    "the base allowlist must precede the Phase 195 extension"
  );
  assert.doesNotThrow(() =>
    normalizeTransactionWrappedSql(combinedSql, "combined role transaction")
  );

  const rebuilt = buildAtomicRoleSql(files.map((sourceName) => ({
    sourceName,
    sql: sourceByPath.get(sourceName)
  })));
  assert.equal(rebuilt, combinedSql);
});

test("database role SQL normalization fails closed before execution", () => {
  const quotedTransactionWords = [
    "-- BEGIN; COMMIT; in a comment must not count",
    "BEGIN;",
    "DO $role_body$",
    "BEGIN",
    "  PERFORM 'COMMIT;';",
    "END",
    "$role_body$;",
    "SELECT 'BEGIN;';",
    "COMMIT;"
  ].join("\n");
  assert.doesNotThrow(() =>
    normalizeTransactionWrappedSql(quotedTransactionWords, "quoted transaction words")
  );

  const invalidSources = [
    {
      expected: /exactly one top-level BEGIN and one top-level COMMIT/,
      name: "missing BEGIN",
      sql: "SELECT 1;\nCOMMIT;"
    },
    {
      expected: /exactly one top-level BEGIN and one top-level COMMIT/,
      name: "missing COMMIT",
      sql: "BEGIN;\nSELECT 1;"
    },
    {
      expected: /exactly one top-level BEGIN and one top-level COMMIT/,
      name: "duplicate wrapper",
      sql: "BEGIN;\nBEGIN;\nSELECT 1;\nCOMMIT;"
    },
    {
      expected: /transaction wrappers must be the first and last/,
      name: "statement before wrapper",
      sql: "SELECT 0;\nBEGIN;\nSELECT 1;\nCOMMIT;"
    },
    {
      expected: /unsupported top-level transaction control/,
      name: "inner rollback",
      sql: "BEGIN;\nSELECT 1;\nROLLBACK;\nCOMMIT;"
    },
    {
      expected: /unsupported top-level transaction control/,
      name: "inner parameterized begin",
      sql: "BEGIN;\nBEGIN ISOLATION LEVEL SERIALIZABLE;\nSELECT 1;\nCOMMIT;"
    },
    {
      expected: /must contain role policy SQL between its transaction wrappers/,
      name: "empty policy",
      sql: "BEGIN;\n-- no policy statements\nCOMMIT;"
    },
    {
      expected: /unterminated \$body\$ block/,
      name: "unterminated dollar quote",
      sql: "BEGIN;\nDO $body$ BEGIN PERFORM 1;\nCOMMIT;"
    }
  ];
  for (const invalid of invalidSources) {
    assert.throws(
      () => normalizeTransactionWrappedSql(invalid.sql, invalid.name),
      invalid.expected
    );
  }

  let executions = 0;
  assert.throws(
    () => applyDatabaseRoles({
      cwd: root,
      files: [
        "prisma/security/046_roles_and_grants.sql",
        "prisma/security/047_phase_195_roles_and_grants.sql"
      ],
      readFile(absolutePath) {
        return relative(absolutePath).includes("046_")
          ? "BEGIN;\nSELECT 1;\nCOMMIT;"
          : "BEGIN;\nSELECT 2;";
      },
      spawn() {
        executions += 1;
        return { status: 0 };
      }
    }),
    /047_phase_195_roles_and_grants\.sql must contain exactly one top-level BEGIN and one top-level COMMIT/
  );
  assert.equal(executions, 0, "normalization must finish before Prisma is started");
});

test("canonical graph and release contracts are exported from the shared package", async () => {
  const contractFiles = await filesBelow("packages/contracts/src");
  const source = (await Promise.all(contractFiles.map((file) => readFile(file, "utf8")))).join("\n");

  for (const symbol of [
    "GraphProjection",
    "GraphEntity",
    "GraphEdge",
    "GraphSharedViewState",
    "GraphViewPreferences",
    "PhaseGateRecord",
    "CanonicalReleaseRecord",
    "MigrationFingerprint",
    "DeploymentEvidence",
    "PullRequestDisposition",
    "RuntimeModeRecord"
  ]) {
    assert.match(source, new RegExp(`\\b${symbol}\\b`), `${symbol} must have one shared contract definition`);
  }

  const index = await projectFile("packages/contracts/src/index.ts");
  assert.match(index, /graph/i, "the graph contract module must be exported");
  assert.match(index, /release/i, "the release-evidence contract module must be exported");
});

test("Phase 195 database preference and release evidence changes are present", async () => {
  const migrations = await readdir(path.join(root, "prisma/migrations"), { withFileTypes: true });
  const phaseMigration = migrations.find((entry) => entry.isDirectory() && /phase_195/i.test(entry.name));
  assert.ok(phaseMigration, "a Phase 195 migration directory is required");

  const migration = await projectFile(`prisma/migrations/${phaseMigration.name}/migration.sql`);
  assert.match(migration, /graph_view_preferences/i);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/i);
  assert.match(migration, /canonical\.(release|migration|deployment|phase_gate)\./i);
  for (const releaseField of [
    "deployment_role",
    "ci_run_id",
    "ci_artifact_ids",
    "authenticated_smoke_receipt_id",
    "rollback_recovery_reference"
  ]) {
    assert.match(migration, new RegExp(`\\b${releaseField}\\b`));
  }
  assert.match(migration, /reject_release_evidence_mutation/);
  for (const evidenceTable of [
    "canonical_releases",
    "migration_fingerprints",
    "deployment_evidence",
    "pull_request_dispositions",
    "runtime_mode_records",
    "phase_gate_records"
  ]) {
    assert.match(
      migration,
      new RegExp(
        `CREATE TRIGGER ${evidenceTable}_immutable[\\s\\S]*?` +
        `BEFORE UPDATE OR DELETE ON ${evidenceTable}`
      ),
      `${evidenceTable} must reject owner-level UPDATE and DELETE`
    );
    assert.match(
      migration,
      new RegExp(
        `CREATE TRIGGER ${evidenceTable}_no_truncate[\\s\\S]*?` +
        `BEFORE TRUNCATE ON ${evidenceTable}`
      ),
      `${evidenceTable} must reject owner-level TRUNCATE`
    );
  }

  const phaseSecurity = await projectFile("prisma/security/047_phase_195_roles_and_grants.sql");
  assert.match(phaseSecurity, /graph_view_preferences/i);

  const roleApply = await projectFile("scripts/apply-database-roles.mjs");
  const baseGrantIndex = roleApply.indexOf("prisma/security/046_roles_and_grants.sql");
  const phaseGrantIndex = roleApply.indexOf("prisma/security/047_phase_195_roles_and_grants.sql");
  assert.ok(baseGrantIndex >= 0, "the base database grants must be applied");
  assert.ok(
    phaseGrantIndex > baseGrantIndex,
    "the Phase 195 grants must be applied after the base grants"
  );
  assert.match(
    roleApply,
    /node_modules\/prisma\/build\/index\.js/,
    "the roles wrapper must invoke the installed pinned Prisma CLI directly"
  );
  assert.match(roleApply, /"--stdin"/, "the combined transaction must be sent through stdin");
  assert.doesNotMatch(roleApply, /"--file"/, "grant files must not execute in separate Prisma calls");
  assert.equal(
    roleApply.match(/\bspawn\(/g)?.length,
    1,
    "the roles wrapper must contain one Prisma execution"
  );

  assert.doesNotMatch(
    phaseSecurity,
    /GRANT\s+SELECT\s*,\s*INSERT\s*,\s*UPDATE[\s\S]*?TO\s+entral_verifier/i,
    "the verifier runtime role cannot mutate immutable release evidence"
  );
});

test("production release evidence has one read-only route and one guarded recorder", async () => {
  const route = await projectFile("backend/src/routes/releaseEvidence.ts");
  assert.match(route, /app\.get\(["']\/control-plane\/releases\/phases\/:phase\/evidence/);
  assert.doesNotMatch(route, /app\.(?:post|put|patch|delete)\s*\(/i);

  const recorder = await projectFile("backend/src/services/releaseEvidenceRecording.ts");
  for (const invariant of [
    /public\."_prisma_migrations"/,
    /MIGRATION_CHECKSUM_MISMATCH/,
    /IMMUTABLE_EVIDENCE_CONFLICT/,
    /TransactionIsolationLevel\.Serializable/,
    /FRONTEND/,
    /API/,
    /WORKER/,
    /authenticated_smoke/,
    /rollback/
  ]) {
    assert.match(recorder, invariant);
  }

  const command = await projectFile("backend/src/cli/releaseEvidenceRecorder.ts");
  for (const environmentVariable of [
    "RELEASE_EVIDENCE_MANIFEST_PATH",
    "RELEASE_EVIDENCE_DATABASE_URL",
    "RELEASE_EVIDENCE_WRITE"
  ]) {
    assert.match(command, new RegExp(environmentVariable));
  }
  assert.match(command, /CLI_ARGUMENTS_FORBIDDEN/);
  assert.match(command, /MANIFEST_TOO_LARGE/);

  const verification = await projectFile("docs/PHASE_195_VERIFICATION.md");
  assert.match(verification, /validate it without opening a\s+database connection/i);
  assert.match(
    verification,
    /does not authorize or perform the final production\s+recording/i
  );
});

test("production graph entry converges on the authorized member graph", async () => {
  const graphPage = await projectFile("frontend/app/graph/page.tsx");
  assert.match(graphPage, /redirect\(["']\/member\/graph["']\)/);
  assert.doesNotMatch(graphPage, /DashboardClient|NeuronsCommandCenter|createDefaultCommandHierarchy/);
});

test("dual graph retains deterministic visual and semantic regression evidence", async () => {
  const visualTest = await projectFile("frontend/tests/Phase195GraphSemanticsVisual.test.tsx");
  const visualGolden = await projectFile("frontend/tests/goldens/phase195-dual-graph-authority.svg");
  const twoDimensional = await projectFile("frontend/components/CanonicalUniverseGraph.tsx");
  const threeDimensional = await projectFile("frontend/components/CanonicalUniverse3DGraph.tsx");
  const webGlRenderer = await projectFile("frontend/components/NeuronsCommandCenter.tsx");
  const phaseCss = await projectFile("frontend/app/phase180.css");
  const attributes = await projectFile(".gitattributes");
  const browserSuite = await projectFile("e2e/entral.e2e.mjs");
  const workflow = await projectFile(".github/workflows/ci-cd.yml");

  assert.match(visualTest, /phase195-dual-graph-authority\.svg/);
  assert.match(visualTest, /Buffer\.from\(generated,\s*"utf8"\)/);
  assert.match(visualGolden, /Phase 195 deterministic dual graph visual golden/);
  assert.match(visualGolden, /data-dimension="2d"/);
  assert.match(visualGolden, /data-dimension="3d"/);
  assert.match(attributes, /frontend\/tests\/goldens\/\*\.svg text eol=lf/);
  assert.match(browserSuite, /phase195-\$\{profile\.name\}-dual-graph\.png/);
  assert.match(workflow, /test-results\/e2e\/phase195-\*\.png/);
  assert.match(twoDimensional, /<CanonicalGraphSemanticsOverlay\s+dimension="2D"/);
  assert.match(threeDimensional, /<CanonicalGraphSemanticsOverlay\s+dimension="3D"/);
  assert.match(twoDimensional, /id="canonical-2d-node-tooltip"/);
  assert.match(webGlRenderer, /id="command-center-node-tooltip"/);
  assert.match(phaseCss, /\.phase195-authority-rings/);
  assert.match(phaseCss, /\.phase180-embedded-3d > \.command-node-tooltip/);
});

test("production fallbacks fail closed", async () => {
  const backendEnv = await projectFile("backend/src/env.ts");
  for (const field of ["AI_LOCAL_FALLBACK", "AUTOMATION_LOCAL_FALLBACK"]) {
    const declaration = backendEnv
      .split(/\r?\n/)
      .find((line) => new RegExp(`^\\s*${field}\\s*:`).test(line));
    assert.ok(declaration, `${field} must be declared`);
    assert.match(
      declaration,
      /booleanFromEnv\.default\(false\),?\s*$/,
      `${field} must default off`
    );
  }

  for (const relativePath of [
    "backend/src/routes/connections.ts",
    "frontend/components/ConnectionCenter.tsx",
    "frontend/components/NeuronsCommandCenter.tsx"
  ]) {
    const source = await projectFile(relativePath);
    assert.doesNotMatch(
      source,
      /\bbuildMockToolExecution\s*\(/,
      `${relativePath} cannot return a success-shaped mock execution`
    );
  }

  const commandCenter = await projectFile("frontend/components/NeuronsCommandCenter.tsx");
  assert.doesNotMatch(
    commandCenter,
    /\bcreateDefaultCommandHierarchy\s*\(/,
    "the production command center cannot select a sample hierarchy"
  );
});

test("CI pins database, Redis, browser, evidence, and release gates", async () => {
  const workflow = await projectFile(".github/workflows/ci-cd.yml");
  const packageJson = JSON.parse(await projectFile("package.json"));
  const backendPackageJson = JSON.parse(await projectFile("backend/package.json"));
  const contractsPackageJson = JSON.parse(await projectFile("packages/contracts/package.json"));
  const workspace = await projectFile("pnpm-workspace.yaml");
  const browserSuite = await projectFile("e2e/entral.e2e.mjs");
  const licenseGate = await projectFile("scripts/phase195-license-compliance.mjs");
  const recoveryGate = await projectFile("scripts/phase195-recovery-gate.mjs");
  const verification = await projectFile("docs/PHASE_195_VERIFICATION.md");
  const deploymentGuide = await projectFile("DEPLOYMENT.md");

  for (const required of [
    "postgres:18-alpine",
    "redis:8.2-alpine",
    "actions/checkout@v7",
    "pnpm/action-setup@v6",
    "actions/setup-node@v7",
    "actions/upload-artifact@v7",
    "node-version: 20.19.0",
    "version: 9.12.3",
    "pnpm install --frozen-lockfile",
    "pnpm test:phase195:licenses",
    "pnpm test:phase195",
    "pnpm test:phase195:recovery",
    "pnpm test:e2e",
    "pnpm release:check"
  ]) {
    assert.match(workflow, new RegExp(required.replaceAll(".", "\\.")));
  }

  assert.match(
    workflow,
    /pnpm --filter @entral\/contracts build/,
    "CI must build the shared contracts package before filtered backend tests"
  );
  assert.match(
    workflow,
    /pnpm --filter @entral\/backend exec vitest run\s+tests\/phase195RuntimeSafety\.test\.ts\s+tests\/phase195GraphTelemetryRoutes\.test\.ts/,
    "Phase 195 runtime tests must execute in the backend workspace"
  );
  assert.match(
    workflow,
    /RUN_POSTGRES_INTEGRATION: "1"[\s\S]*pnpm --filter @entral\/backend exec vitest run[\s\S]*tests\/phase195CanonicalPersistencePostgres\.integration\.test\.ts/,
    "the Phase 195 PostgreSQL test must execute in the backend workspace with its integration gate"
  );
  assert.match(
    workflow,
    /PHASE195_RECOVERY_GATE_CONFIRM: DISPOSABLE_ONLY[\s\S]*run: pnpm test:phase195:recovery/,
    "the recovery command must remain explicitly restricted to disposable targets"
  );
  for (const vercelCommand of [
    "npx --yes vercel@56.5.0 pull --yes --environment=production",
    "npx --yes vercel@56.5.0 build --prod",
    "npx --yes vercel@56.5.0 deploy --prebuilt --prod"
  ]) {
    assert.ok(
      workflow.includes(vercelCommand),
      `the Vercel deploy job must use the provider-proven CLI pin: ${vercelCommand}`
    );
  }
  assert.doesNotMatch(
    workflow,
    /\bnpx\s+vercel(?:\s|$)/,
    "the deploy job cannot float to an unpinned Vercel CLI"
  );

  for (const artifactPath of [
    "test-results/e2e/phase195-*.json",
    "test-results/e2e/phase195-*.png",
    "test-results/phase195/**"
  ]) {
    assert.ok(workflow.includes(artifactPath), `CI must retain ${artifactPath}`);
  }

  assert.equal(packageJson.packageManager, "pnpm@9.12.3");
  assert.equal(packageJson.engines.node, "20.19.0");
  assert.equal(
    packageJson.scripts["test:phase195:licenses"],
    "node scripts/phase195-license-compliance.mjs"
  );
  assert.equal(
    packageJson.scripts["test:phase195:recovery"],
    "node scripts/phase195-recovery-gate.mjs"
  );
  assert.equal(packageJson.scripts["test:e2e"], "node e2e/entral.e2e.mjs");
  for (const staticGate of [
    "scripts/phase195-release-gates.test.mjs",
    "scripts/phase195-feature-matrix.test.mjs",
    "scripts/phase195-recovery-gate.test.mjs",
    "scripts/phase195-license-compliance.test.mjs"
  ]) {
    assert.ok(
      packageJson.scripts["test:phase195"].includes(staticGate),
      `the Phase 195 static suite must include ${staticGate}`
    );
    await projectFile(staticGate);
  }

  assert.equal(backendPackageJson.name, "@entral/backend");
  assert.equal(contractsPackageJson.name, "@entral/contracts");
  assert.match(workspace, /-\s+"backend"/);
  assert.match(workspace, /-\s+"packages\/\*"/);
  for (const backendTest of [
    "backend/tests/phase195RuntimeSafety.test.ts",
    "backend/tests/phase195GraphTelemetryRoutes.test.ts",
    "backend/tests/phase195CanonicalPersistencePostgres.integration.test.ts"
  ]) {
    await projectFile(backendTest);
  }

  for (const browserArtifact of [
    "phase195-dual-graph-browser-fixture.json",
    "phase195-all-eight-marshal-browser-fixture.json",
    "phase195-ac05-lifecycle-browser-fixture.json"
  ]) {
    assert.ok(browserSuite.includes(browserArtifact), `browser E2E must emit ${browserArtifact}`);
  }
  assert.match(browserSuite, /phase195-\$\{profile\.name\}-dual-graph\.png/);
  assert.match(
    licenseGate,
    /path\.join\(root, "test-results", "phase195"\)[\s\S]*production-license-inventory\.json[\s\S]*production-license-compliance\.json/,
    "the license gate must write both retained Phase 195 evidence files"
  );
  assert.match(
    recoveryGate,
    /resolve\(repoRoot, "test-results\/phase195"\)[\s\S]*`phase195-recovery-\$\{runId\}\.json`/,
    "the recovery gate must write a per-run retained Phase 195 receipt"
  );

  assert.match(verification, /Docker/);
  assert.match(verification, /pnpm test:phase195:licenses/);
  assert.match(verification, /Vercel CLI `56\.5\.0`/);
  assert.match(
    deploymentGuide,
    /authoritative complete Phase 195 gate[\s\S]*docs\/PHASE_195_VERIFICATION\.md[\s\S]*quick developer preflight[\s\S]*does not authorize a deployment/,
    "DEPLOYMENT.md must distinguish its quick preflight from the authoritative Phase 195 gate"
  );
});

test("all nineteen acceptance vectors retain honest local and production closure paths", async () => {
  const verification = await projectFile("docs/PHASE_195_VERIFICATION.md");
  const browserSuite = await projectFile("e2e/entral.e2e.mjs");
  const acceptanceRows = [...verification.matchAll(
    /^\|\s*(PHASE-195-AC-\d{2})\s*\|/gm
  )].map((match) => match[1]);
  const expectedRows = Array.from(
    { length: 19 },
    (_, index) => `PHASE-195-AC-${String(index + 1).padStart(2, "0")}`
  );

  assert.deepEqual(
    acceptanceRows,
    expectedRows,
    "the verification ledger must map each authoritative acceptance vector exactly once and in order"
  );
  assert.match(verification, /PHASE-195-AC-05 restart acceptance/);
  assert.match(verification, /Restart or roll both the Railway API and worker/);
  assert.match(verification, /restores_action_id/);
  assert.match(verification, /PHASE-195-AC-18 authenticated production smoke/);
  assert.match(verification, /no request\s+interception/i);
  assert.match(verification, /same accepted 40-character SHA/);
  assert.match(verification, /no more than\s+two CSS pixels/);
  assert.match(verification, /Select each of the eight production Marshals/);
  assert.match(browserSuite, /phase195-ac05-lifecycle-browser-fixture\.json/);
  assert.match(browserSuite, /phase195-all-eight-marshal-browser-fixture\.json/);
  assert.match(browserSuite, /phase195-dual-graph-browser-fixture\.json/);
  assert.match(browserSuite, /accepted_production_evidence:\s*false/);
  assert.match(browserSuite, /evidence_class:\s*"INTERCEPTED_BROWSER_FIXTURE"/);
  assert.match(browserSuite, /cannot_close:\s*\["PHASE-195-AC-18"\]/);
  assert.match(browserSuite, /phase195AllMarshalAcceptanceFixture\(\)/);
  assert.match(browserSuite, /hierarchy\.entities\.length !== 132/);
  assert.match(browserSuite, /expectedProjection\.edges\.length !== 131/);
  assert.match(browserSuite, /for \(const marshalCase of marshalCases\)/);
  assert.match(browserSuite, /reopenPersistedTarget\("Resume entity", 2\)/);
  assert.match(browserSuite, /reopenPersistedTarget\("Pause entity", 5\)/);
});

test("billing and Microsoft work cannot replace the canonical member graph release path", async () => {
  const packageJson = await projectFile("package.json");
  assert.doesNotMatch(packageJson, /stripe|billing|subscription/i, "billing remains locked until Phase 270");

  const protectedFiles = [
    "frontend/app/member/graph/page.tsx",
    "frontend/components/CanonicalMemberShell.tsx",
    "frontend/components/CanonicalGraphWorkspace.tsx",
    "frontend/components/CanonicalUniverseGraph.tsx",
    "frontend/components/CanonicalUniverse3DGraph.tsx",
    "backend/src/routes/member.ts",
    ".github/workflows/ci-cd.yml"
  ];
  for (const relativePath of protectedFiles) {
    const source = await projectFile(relativePath);
    assert.ok(source.length > 0, `${relativePath} must remain present`);
    assert.doesNotMatch(
      source,
      /@microsoft|graph\.microsoft|copilot|sharepoint/i,
      `${relativePath} must remain independent from Microsoft adapters`
    );
  }
});

test("tracked repository excludes secrets, caches, dependencies, and generated output", async () => {
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8"
  }).split("\0").filter(Boolean);

  const prohibitedPaths = tracked.filter((name) =>
    /(^|\/)(node_modules|\.next|dist|coverage|\.pnpm-store|\.tmp)(\/|$)/.test(name)
    || /(^|\/)\.env(\.|$)/.test(name) && !name.endsWith(".env.example")
  );
  assert.deepEqual(prohibitedPaths, []);

  const secretPatterns = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /gh[pousr]_[A-Za-z0-9]{20,}/,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  ];
  const textExtensions = new Set([".css", ".js", ".json", ".jsx", ".md", ".mjs", ".sql", ".ts", ".tsx", ".yaml", ".yml"]);
  const findings = [];

  for (const name of tracked) {
    if (name === "pnpm-lock.yaml" || !textExtensions.has(path.extname(name))) continue;
    const content = await projectFile(name);
    if (secretPatterns.some((pattern) => pattern.test(content))) findings.push(name);
  }

  assert.deepEqual(findings, []);
});

test("Phase 195 reconciliation and verification records are retained", async () => {
  const reconciliation = await projectFile("docs/PHASE_195_BRANCH_RECONCILIATION.md");
  const verification = await projectFile("docs/PHASE_195_VERIFICATION.md");
  assert.match(reconciliation, /PR #17|codex\/production-agent-launch/);
  assert.match(reconciliation, /#18 -> #19 -> #20/);
  assert.match(verification, /accepted Phase 195 (?:main commit|SHA)/i);
  assert.match(verification, /Phase 205/);
  assert.match(verification, /Phase 215 Microsoft separation/);
});
