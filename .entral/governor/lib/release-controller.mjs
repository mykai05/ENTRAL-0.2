import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  CONTRACT_VERSION,
  EXECUTION_MODEL,
  GovernorError,
  RELEASE_CONTROL_DECISIONS,
  RELEASE_RISK_TIERS,
  REPOSITORY_ROLES,
  SCHEMA_VERSION,
  assertExecutionActor,
  validateReleaseControlEvidence,
  validateReleaseControlPlan,
  validateReleaseEvidenceBundle
} from "./contracts.mjs";
import { governorPath, sha256, writeJsonAtomic } from "./store.mjs";

const RISK_GATES = Object.freeze({
  LOW: ["TARGETED_TESTS", "MANDATORY_PHASE_SUITES", "PROTECTED_MAIN", "EXACT_SHA_DEPLOYMENT", "AUTHENTICATED_SMOKE", "STATE_READBACK", "HEALTH"],
  MEDIUM: ["TARGETED_TESTS", "STAGING", "MANDATORY_PHASE_SUITES", "PROTECTED_MAIN", "EXACT_SHA_DEPLOYMENT", "AUTHENTICATED_SMOKE", "STATE_READBACK", "HEALTH"],
  HIGH: ["TARGETED_TESTS", "BACKUP_CHECKPOINT", "STAGING", "MIGRATION_COMPATIBILITY", "MANDATORY_PHASE_SUITES", "PROTECTED_MAIN", "EXACT_SHA_DEPLOYMENT", "AUTHENTICATED_SMOKE", "STATE_READBACK", "HEALTH"],
  CRITICAL: ["TARGETED_TESTS", "BACKUP_CHECKPOINT", "STAGING", "MIGRATION_COMPATIBILITY", "FAILURE_INJECTION_OR_ROLLBACK_REHEARSAL", "MANDATORY_PHASE_SUITES", "PROTECTED_MAIN", "EXACT_SHA_DEPLOYMENT", "AUTHENTICATED_SMOKE", "STATE_READBACK", "HEALTH"]
});

function requireAuthorization(auth, { mutation = false } = {}) {
  assertExecutionActor(auth?.actor);
  if (mutation && (typeof auth?.sessionId !== "string" || auth.sessionId.trim().length < 3)) {
    throw new GovernorError("MISSING_SESSION", "A stable Sol Extra High session ID is required for a release-controller mutation");
  }
}

function defaultRunner(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true
  });
  return {
    status: result.status ?? (result.error ? 1 : 0),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? result.error?.message ?? ""
  };
}

function checked(result, code, message) {
  if (result.status !== 0) {
    throw new GovernorError(code, message, {
      stderr: String(result.stderr ?? "").trim().slice(0, 2_000)
    });
  }
  return String(result.stdout ?? "").trim();
}

function runGit(runner, cwd, args, code, message) {
  return checked(runner("git", args, { cwd }), code, message);
}

function repository(plan, role) {
  const result = plan.repositories.find((candidate) => candidate.role === role);
  if (!result) throw new GovernorError("REPOSITORY_ROLE_MISSING", `Release plan has no ${role} repository`);
  return result;
}

function githubSlug(remote) {
  const normalized = remote.trim().replace(/\.git$/i, "");
  const match = normalized.match(/github\.com[/:]([^/]+\/[^/]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

function ensureExpectedOrigin(binding, observed) {
  const expectedSlug = githubSlug(binding.origin_url);
  const observedSlug = githubSlug(observed);
  if (!expectedSlug || !observedSlug || expectedSlug !== observedSlug) {
    throw new GovernorError("REPOSITORY_ORIGIN_MISMATCH", `${binding.role} origin does not match its declared GitHub repository`, {
      expected_repository: binding.repository,
      expected_slug: expectedSlug,
      observed_slug: observedSlug
    });
  }
  if (binding.repository.toLowerCase() !== expectedSlug) {
    throw new GovernorError("REPOSITORY_IDENTITY_MISMATCH", `${binding.role} repository slug does not match origin_url`);
  }
}

async function pathExists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

export function classifyReleaseRisk(plan) {
  validateReleaseControlPlan(plan);
  const profile = plan.risk_profile;
  const migrationKinds = new Set(plan.migrations.map((migration) => migration.kind));
  if (
    profile.data_migration === "DESTRUCTIVE"
    || migrationKinds.has("DESTRUCTIVE")
    || profile.customer_data_risk === "MATERIAL"
    || profile.rollback_complexity === "IRREVERSIBLE"
  ) return "CRITICAL";
  if (
    profile.data_migration === "ADDITIVE"
    || migrationKinds.has("ADDITIVE")
    || profile.identity_or_tenancy_change
    || profile.billing_or_economic_change
    || profile.rollback_complexity === "MULTI_SERVICE"
  ) return "HIGH";
  if (profile.public_contract_change || profile.provider_configuration_change) return "MEDIUM";
  return "LOW";
}

export function requiredGatesForRisk(riskTier) {
  if (!RELEASE_RISK_TIERS.includes(riskTier)) throw new GovernorError("INVALID_RELEASE_RISK", `Unsupported release risk ${riskTier}`);
  return [...RISK_GATES[riskTier]];
}

export function selectTargetedTests(changedFiles) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) throw new GovernorError("CHANGED_FILES_REQUIRED", "Targeted test selection requires changed files");
  const normalized = changedFiles.map((file) => String(file).replaceAll("\\", "/"));
  const selected = new Set(["pnpm test:phase197"]);
  const has = (pattern) => normalized.some((file) => pattern.test(file));
  if (has(/^\.entral\/governor\//)) selected.add("pnpm test:phase196");
  if (has(/^(?:prisma\/|backend\/src\/services\/releaseEvidence|packages\/contracts\/src\/release)/)) {
    selected.add("pnpm prisma:generate");
    selected.add("pnpm --filter @entral/backend test");
    selected.add("pnpm contracts:verify");
  }
  if (has(/^backend\//)) selected.add("pnpm --filter @entral/backend test");
  if (has(/^frontend\//)) {
    selected.add("pnpm --filter @entral/frontend test");
    selected.add("pnpm test:e2e");
  }
  if (has(/^(?:\.github\/workflows\/|package\.json$|pnpm-lock\.yaml$|railway(?:\.worker)?\.json$|vercel\.json$)/)) {
    selected.add("pnpm release:check");
  }
  return [...selected].sort();
}

export function inspectRepositories(plan, auth, { runner = defaultRunner } = {}) {
  validateReleaseControlPlan(plan);
  requireAuthorization(auth);
  return plan.repositories.map((binding) => {
    const topLevel = runGit(runner, binding.local_path, ["rev-parse", "--show-toplevel"], "REPOSITORY_UNAVAILABLE", `${binding.role} repository is unavailable`);
    const originUrl = runGit(runner, binding.local_path, ["remote", "get-url", "origin"], "REPOSITORY_ORIGIN_UNAVAILABLE", `${binding.role} origin is unavailable`);
    ensureExpectedOrigin(binding, originUrl);
    const headSha = runGit(runner, binding.local_path, ["rev-parse", "HEAD"], "REPOSITORY_HEAD_UNAVAILABLE", `${binding.role} HEAD is unavailable`);
    const originMainSha = runGit(runner, binding.local_path, ["rev-parse", "origin/main"], "ORIGIN_MAIN_UNAVAILABLE", `${binding.role} origin/main is unavailable`);
    const branch = runGit(runner, binding.local_path, ["branch", "--show-current"], "REPOSITORY_BRANCH_UNAVAILABLE", `${binding.role} branch is unavailable`);
    const status = runGit(runner, binding.local_path, ["status", "--porcelain=v1"], "REPOSITORY_STATUS_UNAVAILABLE", `${binding.role} status is unavailable`);
    return {
      role: binding.role,
      repository: binding.repository,
      top_level: path.resolve(topLevel),
      branch,
      head_sha: headSha,
      origin_main_sha: originMainSha,
      worktree_clean: status.length === 0,
      latest_verified_main_matches: originMainSha === binding.latest_verified_main_sha
    };
  });
}

export async function createIsolatedWorktree(plan, auth, role, {
  runner = defaultRunner,
  exists = pathExists
} = {}) {
  validateReleaseControlPlan(plan);
  requireAuthorization(auth, { mutation: true });
  const binding = repository(plan, role);
  const target = path.resolve(binding.local_path, "..", `${path.basename(binding.local_path)}-phase-${plan.phase}`);
  if (await exists(target)) throw new GovernorError("WORKTREE_TARGET_EXISTS", `Refusing to overwrite existing worktree target ${target}`);
  runGit(runner, binding.local_path, ["fetch", "--prune", "origin", "main"], "GIT_FETCH_FAILED", `${role} origin/main fetch failed`);
  const originMainSha = runGit(runner, binding.local_path, ["rev-parse", "origin/main"], "ORIGIN_MAIN_UNAVAILABLE", `${role} origin/main is unavailable after fetch`);
  if (originMainSha !== binding.latest_verified_main_sha) {
    throw new GovernorError("STALE_VERIFIED_MAIN", `${role} latest verified main is stale; reconcile the plan before creating a worktree`, {
      expected: binding.latest_verified_main_sha,
      current: originMainSha
    });
  }
  const branch = `${binding.branch_prefix}phase-${plan.phase}`;
  runGit(runner, binding.local_path, ["worktree", "add", "-b", branch, target, "origin/main"], "WORKTREE_CREATE_FAILED", `${role} isolated worktree creation failed`);
  return { role, repository: binding.repository, branch, worktree_path: target, base_sha: originMainSha };
}

export function reconcileRepository(plan, auth, role, { runner = defaultRunner } = {}) {
  validateReleaseControlPlan(plan);
  requireAuthorization(auth, { mutation: true });
  const binding = repository(plan, role);
  const status = runGit(runner, binding.local_path, ["status", "--porcelain=v1"], "REPOSITORY_STATUS_UNAVAILABLE", `${role} status is unavailable`);
  if (status) throw new GovernorError("DIRTY_RECONCILIATION_WORKTREE", `${role} worktree must be clean before current-main reconciliation`);
  runGit(runner, binding.local_path, ["fetch", "--prune", "origin", "main"], "GIT_FETCH_FAILED", `${role} origin/main fetch failed`);
  const originMainSha = runGit(runner, binding.local_path, ["rev-parse", "origin/main"], "ORIGIN_MAIN_UNAVAILABLE", `${role} origin/main is unavailable after fetch`);
  const ancestor = runner("git", ["merge-base", "--is-ancestor", "origin/main", "HEAD"], { cwd: binding.local_path });
  if (ancestor.status === 0) {
    return { role, status: "CURRENT", origin_main_sha: originMainSha, reconciled_commit_sha: runGit(runner, binding.local_path, ["rev-parse", "HEAD"], "REPOSITORY_HEAD_UNAVAILABLE", `${role} HEAD is unavailable`), affected_checks_must_rerun: true };
  }
  const merge = runner("git", ["merge", "--no-edit", "origin/main"], { cwd: binding.local_path });
  if (merge.status !== 0) {
    throw new GovernorError("RECONCILIATION_CONFLICT", `${role} current-main reconciliation requires bounded conflict resolution`, {
      origin_main_sha: originMainSha,
      stderr: String(merge.stderr ?? "").trim().slice(0, 2_000)
    });
  }
  return { role, status: "RECONCILED", origin_main_sha: originMainSha, reconciled_commit_sha: runGit(runner, binding.local_path, ["rev-parse", "HEAD"], "REPOSITORY_HEAD_UNAVAILABLE", `${role} HEAD is unavailable after reconciliation`), affected_checks_must_rerun: true };
}

function failedChecks(checks) {
  return checks.filter((check) => check.status !== "PASSED").map((check) => check.name);
}

function healthBlockers(plan, health) {
  const thresholds = plan.health_thresholds;
  const blockers = [];
  if (health.availability < thresholds.minimum_availability) blockers.push("Production availability is below threshold.");
  if (health.error_rate > thresholds.maximum_error_rate) blockers.push("Production error rate exceeds threshold.");
  if (health.p95_ms > thresholds.maximum_p95_ms) blockers.push("Production p95 latency exceeds threshold.");
  if (health.failed_jobs > thresholds.maximum_failed_jobs) blockers.push("Production failed jobs exceed threshold.");
  if (health.dead_letter_jobs > thresholds.maximum_dead_letter_jobs) blockers.push("Production dead-letter jobs exceed threshold.");
  if (!health.worker_ready) blockers.push("Production worker is not ready.");
  return blockers;
}

function rollbackIsBounded(plan, evidence) {
  return plan.rollback_point.status === "VERIFIED"
    && plan.rollback_point.integrity_status === "CERTAIN"
    && evidence.rollback_point.status === "VERIFIED"
    && evidence.rollback_point.receipt_sha256 === plan.rollback_point.receipt_sha256
    && plan.risk_profile.rollback_complexity !== "IRREVERSIBLE";
}

export function evaluateRelease(plan, evidence) {
  validateReleaseControlPlan(plan);
  validateReleaseControlEvidence(evidence);
  if (evidence.phase !== plan.phase) throw new GovernorError("RELEASE_PHASE_MISMATCH", "Release evidence phase does not match plan");
  const planSha256 = sha256(plan);
  if (evidence.plan_sha256 !== planSha256) throw new GovernorError("RELEASE_PLAN_DIGEST_MISMATCH", "Release evidence is not bound to the supplied plan");
  const riskTier = classifyReleaseRisk(plan);
  const requiredGates = requiredGatesForRisk(riskTier);
  const blockers = [];
  const evidenceRoles = new Set(evidence.repositories.map((entry) => entry.role));
  if (evidenceRoles.size !== 2 || REPOSITORY_ROLES.some((role) => !evidenceRoles.has(role))) blockers.push("Cross-repository evidence is incomplete.");
  for (const binding of plan.repositories) {
    const observed = evidence.repositories.find((entry) => entry.role === binding.role);
    if (!observed || !observed.compatible || observed.observed_contract_version !== binding.compatibility_contract_version) blockers.push(`${binding.role} contract compatibility is not verified.`);
  }
  if (!evidence.task.coherent_commit || !evidence.task.worktree_clean || evidence.task.commit_sha !== plan.task.commit_sha) blockers.push("A coherent clean task commit is required before integration.");
  if (evidence.reconciliation.reconciled_commit_sha !== evidence.task.commit_sha) blockers.push("Reconciled branch head must equal the coherent task commit.");
  const selectedTests = selectTargetedTests(plan.task.changed_files);
  const targetedByName = new Map(evidence.targeted_tests.map((check) => [check.name, check.status]));
  for (const command of selectedTests) if (targetedByName.get(command) !== "PASSED") blockers.push(`Targeted test did not pass: ${command}`);
  for (const failure of failedChecks(evidence.mandatory_suites)) blockers.push(`Mandatory phase suite did not pass: ${failure}`);
  for (const required of plan.task.mandatory_phase_suites) if (!evidence.mandatory_suites.some((check) => check.name === required && check.status === "PASSED")) blockers.push(`Mandatory phase suite evidence is missing: ${required}`);
  for (const failure of failedChecks(evidence.status_checks)) blockers.push(`Protected-main status check did not pass: ${failure}`);
  if (!["CURRENT", "RECONCILED"].includes(evidence.reconciliation.status) || !evidence.reconciliation.affected_checks_rerun) blockers.push("Current-main reconciliation and affected-check rerun are required.");
  if (evidence.stage === "INTEGRATION") {
    return {
      phase: plan.phase,
      risk_tier: riskTier,
      required_gates: requiredGates,
      selected_targeted_tests: selectedTests,
      decision: blockers.length === 0 ? "READY_FOR_MERGE" : "BLOCKED",
      blockers: [...new Set(blockers)]
    };
  }

  if (requiredGates.includes("STAGING") && evidence.staging.status !== "PASSED") blockers.push(`${riskTier} release requires a passed staging gate.`);
  if (!requiredGates.includes("STAGING") && !["PASSED", "NOT_REQUIRED"].includes(evidence.staging.status)) blockers.push("Staging evidence failed.");
  if (!["PASSED", "NO_SCHEMA_CHANGE"].includes(evidence.migration_verification.status) || !evidence.migration_verification.ordered || !evidence.migration_verification.fingerprints_match || !evidence.migration_verification.compatibility_verified) blockers.push("Migration planning, order, fingerprints, and compatibility are not verified.");
  const migrationEntries = new Map(evidence.migration_verification.entries.map((entry) => [`${entry.order}:${entry.name}`, entry]));
  for (const migration of plan.migrations) {
    const observed = migrationEntries.get(`${migration.order}:${migration.name}`);
    const allowedStatus = migration.kind === "NO_SCHEMA_CHANGE" ? "NO_SCHEMA_CHANGE" : "VERIFIED";
    if (!observed || observed.fingerprint_sha256 !== migration.fingerprint_sha256 || observed.status !== allowedStatus) blockers.push(`Migration readback is missing or mismatched: ${migration.name}`);
  }
  if (migrationEntries.size !== plan.migrations.length || evidence.migration_verification.entries.length !== plan.migrations.length) blockers.push("Migration readback contains entries outside the release plan.");
  if (requiredGates.includes("BACKUP_CHECKPOINT") && evidence.migration_verification.backup_status !== "VERIFIED") blockers.push(`${riskTier} release requires verified backup/checkpoint evidence.`);
  const productMainSha = evidence.repositories.find((entry) => entry.role === "PRODUCT")?.origin_main_sha;
  const readyDeployments = evidence.deployments.filter((deployment) => deployment.status === "READY" && deployment.deployed_commit_sha === productMainSha);
  const deploymentRoles = new Set(readyDeployments.map((deployment) => deployment.role));
  if (deploymentRoles.size !== 3 || ["FRONTEND", "API", "WORKER"].some((role) => !deploymentRoles.has(role))) blockers.push("Exact-main-SHA frontend, API, and worker deployments are required.");
  for (const surface of plan.changed_surfaces) {
    const smoke = evidence.authenticated_smokes.find((entry) => entry.surface === surface);
    if (!smoke || smoke.status !== "PASSED" || !smoke.authenticated) blockers.push(`Applicable production surface lacks authenticated smoke evidence: ${surface}`);
  }
  if (evidence.state_reconciliation.status !== "PASSED" || !evidence.state_reconciliation.side_effects_reconciled || evidence.state_reconciliation.main_sha !== productMainSha || evidence.state_reconciliation.blockers.length > 0) blockers.push("Production state readback and side-effect reconciliation did not pass for the exact main SHA.");
  blockers.push(...healthBlockers(plan, evidence.health));
  if (requiredGates.includes("FAILURE_INJECTION_OR_ROLLBACK_REHEARSAL") && evidence.rollback_rehearsal.status !== "PASSED") blockers.push("Critical release requires a passed failure injection or rollback rehearsal.");
  if (evidence.failure_proof.status !== "PASSED" || evidence.failure_proof.phase_advanced || !["REJECTED", "ROLLED_BACK"].includes(evidence.failure_proof.outcome)) blockers.push("Broken-deployment containment proof did not pass without phase advancement.");
  if (evidence.rollback_point.status !== "VERIFIED" || evidence.rollback_point.receipt_sha256 !== plan.rollback_point.receipt_sha256) blockers.push("Verified rollback point evidence is missing or mismatched.");

  const releaseFailure = evidence.deployments.some((deployment) => deployment.status === "FAILED")
    || evidence.authenticated_smokes.some((smoke) => smoke.status === "FAILED")
    || evidence.state_reconciliation.status === "FAILED"
    || healthBlockers(plan, evidence.health).length > 0;
  let decision = blockers.length === 0 ? "PASS" : "BLOCKED";
  if (releaseFailure) decision = rollbackIsBounded(plan, evidence) ? "ROLLBACK_REQUIRED" : "INCIDENT_REQUIRED";
  return {
    phase: plan.phase,
    risk_tier: riskTier,
    required_gates: requiredGates,
    selected_targeted_tests: selectedTests,
    decision,
    blockers: [...new Set(blockers)]
  };
}

export async function createReleaseEvidenceBundle(repositoryRoot, plan, evidence, auth, {
  output = null,
  now = new Date()
} = {}) {
  requireAuthorization(auth, { mutation: Boolean(output) });
  const evaluation = evaluateRelease(plan, evidence);
  const components = [
    ["repositories", evidence.repositories],
    ["task", evidence.task],
    ["targeted_tests", evidence.targeted_tests],
    ["mandatory_suites", evidence.mandatory_suites],
    ["protected_main_status_checks", evidence.status_checks],
    ["reconciliation", evidence.reconciliation],
    ["migrations", evidence.migration_verification],
    ["deployments", evidence.deployments],
    ["authenticated_smokes", evidence.authenticated_smokes],
    ["state_reconciliation", evidence.state_reconciliation],
    ["health", evidence.health],
    ["rollback_point", evidence.rollback_point],
    ["broken_deployment_proof", evidence.failure_proof]
  ].map(([name, value]) => ({ name, content_sha256: sha256(value) }));
  const core = {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    bundle_id: `phase-${plan.phase}-${evidence.evidence_id}`,
    phase: plan.phase,
    risk_tier: evaluation.risk_tier,
    decision: evaluation.decision,
    plan_sha256: sha256(plan),
    evidence_sha256: sha256(evidence),
    components,
    created_at: now.toISOString()
  };
  const bundle = { ...core, bundle_sha256: sha256(core) };
  validateReleaseEvidenceBundle(bundle);
  if (output) {
    const target = governorPath(repositoryRoot, output);
    const allowedRoot = governorPath(repositoryRoot, "release-control");
    if (!target.startsWith(`${allowedRoot}${path.sep}`)) throw new GovernorError("UNSAFE_BUNDLE_PATH", "Release bundle must be written below .entral/governor/release-control");
    await writeJsonAtomic(target, bundle);
  }
  return bundle;
}

export function mergeProtectedMain(plan, evidence, auth, pullRequestNumber, { runner = defaultRunner } = {}) {
  validateReleaseControlPlan(plan);
  validateReleaseControlEvidence(evidence);
  requireAuthorization(auth, { mutation: true });
  if (!Number.isSafeInteger(pullRequestNumber) || pullRequestNumber < 1) throw new GovernorError("INVALID_PULL_REQUEST", "Pull request number must be positive");
  const evaluation = evaluateRelease(plan, evidence);
  if (evaluation.decision !== "READY_FOR_MERGE") throw new GovernorError("INTEGRATION_GATES_FAILED", "Protected-main merge is forbidden until all binding integration gates pass", evaluation);
  const product = repository(plan, "PRODUCT");
  const checksRaw = checked(runner("gh", ["pr", "checks", String(pullRequestNumber), "--repo", product.repository, "--required", "--json", "name,state,bucket"], { cwd: product.local_path }), "REQUIRED_CHECKS_UNAVAILABLE", "Required protected-main checks could not be read");
  const checks = JSON.parse(checksRaw || "[]");
  if (!checks.length) throw new GovernorError("MISSING_REQUIRED_CHECKS", "Protected main must expose at least one required status check");
  const failing = checks.filter((check) => check.bucket !== "pass");
  if (failing.length) throw new GovernorError("REQUIRED_CHECKS_NOT_PASSED", "Protected-main required checks have not all passed", { checks: failing.map((check) => ({ name: check.name, state: check.state, bucket: check.bucket })) });
  const viewRaw = checked(runner("gh", ["pr", "view", String(pullRequestNumber), "--repo", product.repository, "--json", "headRefOid,state"], { cwd: product.local_path }), "PULL_REQUEST_UNAVAILABLE", "Pull request identity could not be read");
  const view = JSON.parse(viewRaw);
  if (view.state !== "OPEN" || view.headRefOid !== plan.task.commit_sha) throw new GovernorError("PULL_REQUEST_HEAD_MISMATCH", "Pull request must be open at the exact coherent task commit");
  checked(runner("gh", ["pr", "merge", String(pullRequestNumber), "--repo", product.repository, "--merge", "--match-head-commit", plan.task.commit_sha], { cwd: product.local_path }), "PROTECTED_MAIN_MERGE_FAILED", "Protected-main merge was rejected");
  return { status: "MERGE_REQUESTED", repository: product.repository, pull_request_number: pullRequestNumber, accepted_head_sha: plan.task.commit_sha, required_checks: checks.map((check) => check.name) };
}

function npxExecutable() {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

function defaultProviderClient({ runner = defaultRunner, fetchImpl = globalThis.fetch } = {}) {
  return {
    async rollback(deployment) {
      if (deployment.provider === "VERCEL") {
        const result = runner(npxExecutable(), ["--yes", "vercel@56.5.0", "rollback", deployment.deployment_id, "--yes", "--timeout", "3m"], { env: process.env });
        checked(result, "VERCEL_ROLLBACK_FAILED", "Vercel rollback failed");
        return { provider: "VERCEL", role: deployment.role, source_deployment_id: deployment.deployment_id, status: "VERIFIED" };
      }
      const token = process.env.RAILWAY_TOKEN;
      if (!token) throw new GovernorError("RAILWAY_CREDENTIAL_UNAVAILABLE", "RAILWAY_TOKEN is required through the environment for automatic Railway rollback");
      const response = await fetchImpl("https://backboard.railway.com/graphql/v2", {
        method: "POST",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        body: JSON.stringify({ query: "mutation DeploymentRedeploy($id: String!) { deploymentRedeploy(id: $id) { id } }", variables: { id: deployment.deployment_id } })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.errors?.length || !payload?.data?.deploymentRedeploy?.id) throw new GovernorError("RAILWAY_ROLLBACK_FAILED", `Railway ${deployment.role} rollback failed`);
      return { provider: "RAILWAY", role: deployment.role, source_deployment_id: deployment.deployment_id, rollback_deployment_id: payload.data.deploymentRedeploy.id, status: "REQUESTED" };
    }
  };
}

export async function executeBoundedRollback(plan, evidence, auth, {
  providerClient = defaultProviderClient(),
  now = new Date()
} = {}) {
  validateReleaseControlPlan(plan);
  validateReleaseControlEvidence(evidence);
  requireAuthorization(auth, { mutation: true });
  const evaluation = evaluateRelease(plan, evidence);
  if (evaluation.decision !== "ROLLBACK_REQUIRED") throw new GovernorError("ROLLBACK_NOT_AUTHORIZED", "Automatic rollback is allowed only for a bounded failed release", evaluation);
  if (!rollbackIsBounded(plan, evidence)) throw new GovernorError("ROLLBACK_NOT_BOUNDED", "Rollback requires certain data integrity and a verified reversible rollback point");
  const operations = [];
  try {
    for (const deployment of plan.rollback_point.deployments) {
      const operation = await providerClient.rollback(deployment);
      operations.push(operation);
      if (operation.status !== "VERIFIED") throw new GovernorError("ROLLBACK_READBACK_REQUIRED", `${deployment.role} rollback was requested but not verified`);
    }
  } catch (error) {
    return {
      status: "INCIDENT_REQUIRED",
      phase_advanced: false,
      operations,
      incident: {
        contract_version: CONTRACT_VERSION,
        schema_version: SCHEMA_VERSION,
        incident_id: `P${plan.phase}-ROLLBACK-${now.getTime()}`,
        phase: plan.phase,
        severity: "CRITICAL",
        summary: "Automatic rollback did not complete for every production deployment.",
        evidence: [error instanceof GovernorError ? error.code : "UNEXPECTED_ROLLBACK_FAILURE", ...operations.map((operation) => `${operation.provider}:${operation.role}:${operation.status}`)],
        status: "OPEN_CONTAINMENT_REQUIRED",
        created_at: now.toISOString()
      }
    };
  }
  return {
    status: "ROLLED_BACK",
    phase_advanced: false,
    operations,
    incident: {
      contract_version: CONTRACT_VERSION,
      schema_version: SCHEMA_VERSION,
      incident_id: `P${plan.phase}-ROLLBACK-${now.getTime()}`,
      phase: plan.phase,
      severity: "HIGH",
      summary: "Failed production release was automatically rolled back to the last certified release.",
      evidence: operations.map((operation) => `${operation.provider}:${operation.role}:${operation.status}`),
      status: "CONTAINED_READBACK_REQUIRED",
      created_at: now.toISOString()
    }
  };
}

export const releaseControllerConstants = Object.freeze({
  execution_model: EXECUTION_MODEL,
  repository_roles: REPOSITORY_ROLES,
  risk_tiers: RELEASE_RISK_TIERS,
  decisions: RELEASE_CONTROL_DECISIONS
});
