import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const projectFile = (relative) => readFile(path.join(root, relative), "utf8");

test("Phase 197 retains exactly twenty-four features and acceptance gates", async () => {
  const contract = JSON.parse(await projectFile(".entral/governor/phases/197/PHASE_CONTRACT.v1.json"));
  assert.equal(contract.phase, 197);
  assert.equal(contract.review_policy, "CONDITIONAL");
  const expected = Array.from({ length: 24 }, (_, index) => `P197-F${String(index + 1).padStart(3, "0")}`);
  assert.deepEqual(contract.feature_ids, expected);
  assert.deepEqual(contract.acceptance_gate_ids, expected.map((feature) => `${feature}-A`));
  assert.deepEqual(Object.keys(contract.risk_paths), ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
});

test("controller remains repository-local and uses existing GitHub and deployment providers", async () => {
  const controller = await projectFile(".entral/governor/lib/release-controller.mjs");
  const packageJson = JSON.parse(await projectFile("package.json"));
  assert.equal(packageJson.scripts["test:phase197"], "node --test .entral/governor/tests/release-controller.test.mjs scripts/phase197-release-gates.test.mjs");
  assert.match(controller, /spawnSync/);
  assert.match(controller, /runner\("git", args/);
  assert.match(controller, /"gh", \["pr", "checks"/);
  assert.match(controller, /vercel@56\.5\.0/);
  assert.match(controller, /deploymentRedeploy/);
  assert.doesNotMatch(controller, /@anthropic|openai|copilot|kafkajs|bullmq|kubernetes/i);
  assert.doesNotMatch(JSON.stringify(packageJson.dependencies), /orchestrat|kafkajs|bullmq|kubernetes/i);
});

test("typed plan, evidence, bundle, and cross-repository ReleaseManifest are runtime-enforced", async () => {
  const schema = JSON.parse(await projectFile(".entral/governor/schemas/v1/governor.schema.json"));
  for (const contract of ["ReleaseControlPlan", "ReleaseControlEvidence", "ReleaseEvidenceBundle"]) assert.ok(schema.$defs[contract]);
  const validators = await projectFile(".entral/governor/lib/contracts.mjs");
  for (const validator of ["validateReleaseControlPlan", "validateReleaseControlEvidence", "validateReleaseEvidenceBundle"]) assert.match(validators, new RegExp(`export function ${validator}\\b`));
  assert.match(validators, /INCOMPLETE_REPOSITORY_SET/);
  assert.match(validators, /PRODUCT_RELEASE_MISMATCH/);
  assert.match(validators, /release_controller\.evidence_bundle_sha256/);
});

test("branch, worktree, coherent commit, current-main, and protected checks are fail-closed", async () => {
  const controller = await projectFile(".entral/governor/lib/release-controller.mjs");
  for (const invariant of [
    /worktree", "add", "-b"/,
    /STALE_VERIFIED_MAIN/,
    /DIRTY_RECONCILIATION_WORKTREE/,
    /RECONCILIATION_CONFLICT/,
    /coherent_commit/,
    /--required/,
    /--match-head-commit/,
    /INTEGRATION_GATES_FAILED/
  ]) assert.match(controller, invariant);
});

test("risk paths gate migrations, backups, staging, health, exact SHA, and rollback rehearsal", async () => {
  const controller = await projectFile(".entral/governor/lib/release-controller.mjs");
  for (const invariant of [
    /LOW:/,
    /MEDIUM:/,
    /HIGH:/,
    /CRITICAL:/,
    /BACKUP_CHECKPOINT/,
    /MIGRATION_COMPATIBILITY/,
    /FAILURE_INJECTION_OR_ROLLBACK_REHEARSAL/,
    /source_freshness|deployed_commit_sha/,
    /minimum_availability/,
    /maximum_error_rate/,
    /maximum_p95_ms/
  ]) assert.match(controller, invariant);
});

test("production failure is contained by bounded rollback or a durable incident without advancement", async () => {
  const controller = await projectFile(".entral/governor/lib/release-controller.mjs");
  assert.match(controller, /ROLLBACK_REQUIRED/);
  assert.match(controller, /INCIDENT_REQUIRED/);
  assert.match(controller, /phase_advanced: false/);
  assert.match(controller, /integrity_status === "CERTAIN"/);
  assert.match(controller, /CONTAINED_READBACK_REQUIRED/);
  assert.match(controller, /OPEN_CONTAINMENT_REQUIRED/);
});

test("evidence bundle hashes tests, migration, deployments, readback, health, and rollback point", async () => {
  const controller = await projectFile(".entral/governor/lib/release-controller.mjs");
  for (const component of [
    "targeted_tests",
    "mandatory_suites",
    "protected_main_status_checks",
    "migrations",
    "deployments",
    "authenticated_smokes",
    "state_reconciliation",
    "health",
    "rollback_point",
    "broken_deployment_proof"
  ]) assert.ok(controller.includes(`["${component}"`) || controller.includes(`"${component}"`));
  assert.match(controller, /bundle_sha256: sha256\(core\)/);
  assert.match(controller, /UNSAFE_BUNDLE_PATH/);
});

test("CLI exposes bounded release-controller operations under the sole authorized actor", async () => {
  const cli = await projectFile(".entral/governor/bin/governor.mjs");
  for (const command of [
    "release-inspect",
    "release-create-worktree",
    "release-reconcile",
    "release-evaluate",
    "release-bundle",
    "release-merge",
    "release-rollback",
    "release-select-tests"
  ]) assert.match(cli, new RegExp(`case ["']${command}["']`));
  const contracts = await projectFile(".entral/governor/lib/contracts.mjs");
  assert.match(contracts, /CODEX_5_6_SOL_XHIGH/);
  assert.doesNotMatch(cli, /RAILWAY_TOKEN|VERCEL_TOKEN|PASSWORD|API_KEY/);
});

test("CI runs Phase 197 before full repository verification and retains controller evidence", async () => {
  const workflow = await projectFile(".github/workflows/ci-cd.yml");
  assert.match(workflow, /pnpm test:phase196/);
  assert.match(workflow, /pnpm test:phase197/);
  assert.match(workflow, /phase-197-release-controller-evidence/);
  assert.match(workflow, /\.entral\/governor\/release-control\/phase-197/);
  assert.match(workflow, /git diff --exit-code/);
});

test("operator documentation maps all Phase 197 gates and the live-main release sequence", async () => {
  const verification = await projectFile("docs/PHASE_197_VERIFICATION.md");
  for (const command of ["pnpm test:phase197", "pnpm test:phase196", "pnpm test:phase195", "pnpm contracts:verify", "pnpm lint", "pnpm test", "pnpm build", "pnpm release:check"]) assert.ok(verification.includes(command));
  for (const term of ["PRODUCT", "CONTROL_WEBSITE", "protected main", "exact main SHA", "authenticated production smoke", "state readback", "rollback", "Phase 198"]) assert.match(verification, new RegExp(term, "i"));
});
