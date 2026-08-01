import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const projectFile = (relative) => readFile(path.join(root, relative), "utf8");

test("Phase 196 retains exactly twenty-seven features and twenty-six acceptance gates", async () => {
  const contract = JSON.parse(await projectFile(".entral/governor/phases/196/PHASE_CONTRACT.v1.json"));
  assert.equal(contract.phase, 196);
  assert.equal(contract.review_policy, "CONDITIONAL");
  assert.deepEqual(contract.feature_ids, Array.from({ length: 27 }, (_, index) => `P196-F${String(index + 1).padStart(3, "0")}`));
  assert.equal(contract.acceptance_gate_ids.length, 26);
  assert.deepEqual(contract.acceptance_gate_ids.slice(-4), ["G196023", "G196024", "G196025", "G196026"]);
  assert.equal(new Set(contract.feature_ids).size, 27);
  assert.equal(new Set(contract.acceptance_gate_ids).size, 26);
});

test("Governor remains repository-local, single-process, and dependency-free", async () => {
  const packageJson = JSON.parse(await projectFile("package.json"));
  assert.equal(packageJson.scripts.governor, "node .entral/governor/bin/governor.mjs");
  assert.equal(packageJson.scripts["test:phase196"], "node --test .entral/governor/tests/governor.test.mjs scripts/phase196-release-gates.test.mjs");
  const runtimeFiles = await Promise.all([
    ".entral/governor/lib/contracts.mjs",
    ".entral/governor/lib/store.mjs",
    ".entral/governor/lib/governor.mjs",
    ".entral/governor/bin/governor.mjs"
  ].map(projectFile));
  const runtime = runtimeFiles.join("\n");
  assert.doesNotMatch(runtime, /from\s+["'](?:@anthropic|openai|@microsoft|playwright|puppeteer|kafkajs|bullmq|kubernetes)/i);
  assert.doesNotMatch(runtime, /chatgpt\.com|chat\.openai\.com|consumer.*browser.*autom/i);
  assert.doesNotMatch(JSON.stringify(packageJson.dependencies), /govern|orchestrat|sqlite|redis|queue/i);
});

test("program DAG is exact, sequential, and sparse-review only", async () => {
  const program = JSON.parse(await projectFile(".entral/governor/program/PHASE_DAG.v1.json"));
  assert.equal(program.program_version, "ENTRAL-V9-CODEX-XHIGH-GPT-PRO-REVIEW");
  assert.equal(program.execution_model, "CODEX_5_6_SOL_XHIGH");
  assert.deepEqual(program.mandatory_review_phases, [199, 212, 275, 420, 580, 590]);
  assert.equal(program.phases.length, 54);
  program.phases.forEach((phase, index) => {
    const expectedDependency = index === 0 ? 195 : program.phases[index - 1];
    assert.deepEqual(program.dependencies[String(phase)], [expectedDependency]);
  });
});

test("all required contracts are versioned and runtime validated", async () => {
  const schema = JSON.parse(await projectFile(".entral/governor/schemas/v1/governor.schema.json"));
  const contracts = [
    "ProgramState", "TaskPacket", "ExecutionResult", "ReviewRecord", "ReleaseManifest", "IncidentRecord",
    "OwnerEscalation", "ImprovementCandidate", "PhaseAmendment", "SessionCheckpoint", "GovernorEvent",
    "GPTProReviewRequest", "ProReviewVerdict"
  ];
  assert.deepEqual(Object.keys(schema.$defs).filter((name) => contracts.includes(name)).sort(), [...contracts].sort());
  const validators = await projectFile(".entral/governor/lib/contracts.mjs");
  for (const validator of [
    "validateTaskPacket", "validateExecutionResult", "validateSessionCheckpoint", "validateOwnerEscalation",
    "validateProgramState", "validateGovernorEvent", "validateReleaseManifest", "validateReviewRequest", "validateReviewVerdict", "validateNamedContract"
  ]) assert.match(validators, new RegExp(`export function ${validator}\\b`));
});

test("CLI exposes every required lifecycle command plus bounded review operations", async () => {
  const cli = await projectFile(".entral/governor/bin/governor.mjs");
  for (const command of [
    "initialize", "status", "activate-phase", "create-task", "claim-task", "record-result", "fail-task",
    "block", "unblock", "checkpoint", "resume", "certify-phase", "next", "heartbeat", "context", "verify",
    "create-review", "ingest-review", "complete-review-corrections", "add-review-trigger", "record-incident"
  ]) assert.match(cli, new RegExp(`case ["']${command}["']`));
  assert.match(cli, /UNAUTHORIZED_EXECUTION_MODEL|authorization\(args\)/);
  assert.match(cli, /DOCUMENT_OUTSIDE_REPOSITORY/);
});

test("lock, lease, event chain, retry stop, and crash reconstruction are enforced", async () => {
  const store = await projectFile(".entral/governor/lib/store.mjs");
  const governor = await projectFile(".entral/governor/lib/governor.mjs");
  for (const invariant of [
    /open\(lockPath, "wx"/,
    /ADVANCE_LOCK_HELD/,
    /EVENT_CHAIN_BROKEN/,
    /EVENT_PAYLOAD_TAMPERED/,
    /recoverStateFromEvents/,
    /state_after/
  ]) assert.match(store, invariant);
  for (const invariant of [
    /WRITE_LEASE_HELD/,
    /maximum_attempts/,
    /maximum_retries/,
    /stagnation_limit/,
    /task_deadline_at/,
    /Deterministic stop/,
    /usageCheckpointRequired/
  ]) assert.match(governor, invariant);
  for (const eventType of [
    "PHASE_ACTIVATED", "TASK_CLAIMED", "TASK_RESULT", "PROGRAM_BLOCKED", "RELEASE_RECORDED",
    "INCIDENT_RECORDED", "PHASE_CERTIFIED"
  ]) assert.match(governor, new RegExp(eventType));
});

test("context compiler selects only current task, phase, ADR, source, and recent release state", async () => {
  const governor = await projectFile(".entral/governor/lib/governor.mjs");
  assert.match(governor, /task_packet/);
  assert.match(governor, /phase_contract/);
  assert.match(governor, /relevant_adrs/);
  assert.match(governor, /relevant_source_paths/);
  assert.match(governor, /recent_release_state/);
  assert.match(governor, /future phase packages/);
  assert.match(governor, /hidden model memory/);
});

test("review gateway is owner-invoked, sparse, secret-free, and subordinate to deterministic gates", async () => {
  const governor = await projectFile(".entral/governor/lib/governor.mjs");
  const contracts = await projectFile(".entral/governor/lib/contracts.mjs");
  const reviewReadme = await projectFile(".entral/governor/pro-review/README.md");
  for (const artifact of ["PRO_REVIEW_REQUEST.json", "PRO_REVIEW_BRIEF.md", "EVIDENCE_INDEX.json", "PRO_REVIEW_VERDICT.md"]) assert.match(governor, new RegExp(artifact.replaceAll(".", "\\.")));
  assert.match(governor, /WAITING_FOR_GPT_PRO_REVIEW/);
  assert.match(governor, /GPT_PRO_REVIEW_REQUIRED/);
  assert.match(governor, /FAILED_RELEASE_GATE|validateReleaseManifest/);
  assert.match(contracts, /SECRET_IN_REVIEW_PACKET/);
  assert.match(contracts, /owner_attested/);
  assert.match(reviewReadme, /owner invokes review/i);
  assert.match(reviewReadme, /No API manager/);
  assert.match(reviewReadme, /browser automation/);
});

test("Phase 195 certified release remains the immutable bootstrap prerequisite", async () => {
  const release = JSON.parse(await projectFile(".entral/governor/releases/phase-195.json"));
  assert.equal(release.phase, 195);
  assert.equal(release.main_sha, "11058bffef238c1c7f917b2ea5bb3ff93800d35e");
  assert.equal(release.release_tag, "phase-195");
  assert.equal(release.manifest_sha256, "26a1e81bc99b8f6f1f2edb925e55474d78533f343d7726e07d33d8ba83917138");
  assert.equal(release.gate_status, "PASSED");
  assert.deepEqual(release.blockers, []);
  assert.equal(release.rollback_point.status, "RESTORE_VERIFIED");
});

test("operator documentation contains the exact restart and live-main sequence", async () => {
  const readme = await projectFile(".entral/governor/README.md");
  const verification = await projectFile("docs/PHASE_196_VERIFICATION.md");
  assert.match(readme, /Run `pnpm governor status` and then `pnpm governor next`/);
  assert.match(readme, /Execute only the emitted `TaskPacket`/);
  assert.match(verification, /pnpm install --frozen-lockfile/);
  assert.match(verification, /pnpm prisma:generate/);
  for (const command of ["pnpm test:phase196", "pnpm test:phase195", "pnpm contracts:verify", "pnpm lint", "pnpm test", "pnpm build", "pnpm release:check"]) assert.ok(verification.includes(command));
  assert.match(verification, /Merge through protected main and push immediately/);
  assert.match(verification, /Deploy the exact main SHA/);
  assert.match(verification, /authenticated production smoke/i);
  assert.match(verification, /certified release record is on main and production/i);
});

test("CI runs and retains the Phase 196 gate without weakening prior release gates", async () => {
  const workflow = await projectFile(".github/workflows/ci-cd.yml");
  assert.match(workflow, /pnpm test:phase195/);
  assert.match(workflow, /pnpm test:phase196/);
  assert.match(workflow, /phase-196-governor-evidence/);
  assert.match(workflow, /\.entral\/governor\/releases\/phase-196\.json/);
  assert.match(workflow, /git diff --exit-code/);
  assert.match(workflow, /refs\/heads\/main/);
});
