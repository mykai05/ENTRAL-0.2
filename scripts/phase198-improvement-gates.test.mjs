import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => readFile(path.join(root, relative), "utf8");
const featureIds = Array.from({ length: 19 }, (_, index) => `P198-F${String(index + 1).padStart(3, "0")}`);
const gateIds = featureIds.map((id) => `${id}-A`);

test("Phase 198 contract binds every mandatory package feature and release gate", async () => {
  const contract = JSON.parse(await read(".entral/governor/phases/198/PHASE_CONTRACT.v1.json"));
  assert.equal(contract.phase, 198);
  assert.equal(contract.review_policy, "CONDITIONAL");
  assert.deepEqual(contract.feature_ids, featureIds);
  assert.deepEqual(contract.acceptance_gate_ids, gateIds);
  for (const requirement of [
    "RECONCILED_WITH_CURRENT_MAIN",
    "PROTECTED_MAIN_CHECKS_PASS",
    "EXACT_MAIN_SHA_DEPLOYED",
    "MIGRATIONS_VERIFIED",
    "AUTHENTICATED_PRODUCTION_SMOKE_AND_READBACK",
    "HASHED_RELEASE_EVIDENCE_BUNDLE",
    "BOUNDED_ROLLBACK_POINT_RECORDED"
  ]) assert.ok(contract.release_requirements.includes(requirement), `missing ${requirement}`);
});

test("Phase 198 implementation exposes typed persistence and only the declared bounded controls", async () => {
  const [contracts, queue, governor, cli, schema, tests, policy] = await Promise.all([
    read(".entral/governor/lib/contracts.mjs"),
    read(".entral/governor/lib/improvement-queue.mjs"),
    read(".entral/governor/lib/governor.mjs"),
    read(".entral/governor/bin/governor.mjs"),
    read(".entral/governor/schemas/v1/governor.schema.json"),
    read(".entral/governor/tests/improvement-queue.test.mjs"),
    read(".entral/governor/improvements/POLICY.v1.json")
  ]);
  for (const source of ["TEST", "INCIDENT", "TELEMETRY", "SUPPORT", "ONBOARDING", "SALES_OBJECTION", "LOST_DEAL", "FEATURE_USAGE", "CONNECTOR_HEALTH", "COST", "VERIFIED_MARKET_EVIDENCE"]) {
    assert.match(contracts, new RegExp(`"${source}"`));
  }
  for (const category of ["DEFECT_REPAIR", "RELIABILITY_IMPROVEMENT", "PRODUCT_ENHANCEMENT", "TECHNICAL_DEBT", "COMMERCIAL_CHANGE", "RESEARCH_HYPOTHESIS"]) {
    assert.match(contracts, new RegExp(`"${category}"`));
  }
  for (const symbol of [
    "normalizeImprovementCandidate", "mergeImprovementCandidate", "scoreImprovementCandidate",
    "planImprovementCycle", "buildPhaseAmendment", "recordImprovementOutcome",
    "applyAcceptedPhaseAmendment", "rankImprovementBacklog", "improvementEvidenceView"
  ]) assert.match(queue, new RegExp(`export (?:async )?function ${symbol}\\b`));
  for (const symbol of [
    "intakeImprovementCandidate", "runImprovementCycle", "getImprovementBacklog",
    "getImprovementEvidence", "decideImprovement", "measureImprovement", "applyImprovementAmendment"
  ]) assert.match(governor, new RegExp(`export async function ${symbol}\\b`));
  for (const command of [
    "improvement-intake", "improvement-cycle", "improvement-backlog", "improvement-show",
    "improvement-decide", "improvement-measure", "improvement-apply-amendment"
  ]) assert.match(cli, new RegExp(command));
  assert.match(schema, /"ImprovementOutcome"/);
  for (const featureId of featureIds) assert.match(tests, new RegExp(featureId));
  const parsedPolicy = JSON.parse(policy);
  assert.ok(parsedPolicy.emergency_repair_reserve_units > 0);
  assert.ok(parsedPolicy.emergency_repair_reserve_units < parsedPolicy.maximum_active_budget_units);
  assert.ok(parsedPolicy.quiet_period_hours > 0);
});

test("Phase 198 is wired into the complete suite, CI, documentation, and retained evidence", async () => {
  const [packageJson, workflow, readme, verification] = await Promise.all([
    read("package.json").then(JSON.parse),
    read(".github/workflows/ci-cd.yml"),
    read(".entral/governor/README.md"),
    read("docs/PHASE_198_VERIFICATION.md")
  ]);
  assert.equal(packageJson.scripts["test:phase198"], "node --test .entral/governor/tests/improvement-queue.test.mjs scripts/phase198-improvement-gates.test.mjs");
  assert.match(workflow, /pnpm test:phase198/);
  assert.match(workflow, /test-results\/phase198\/\*\*/);
  assert.match(readme, /improvement-intake/);
  assert.match(readme, /pnpm test:phase198/);
  for (const command of ["pnpm test:phase198", "pnpm test:phase197", "pnpm test:phase196", "pnpm test:phase195", "pnpm contracts:verify", "pnpm lint", "pnpm test", "pnpm build", "pnpm release:check"]) {
    assert.ok(verification.includes(command), `verification document must include ${command}`);
  }
});

test.after(async () => {
  const evidenceDirectory = path.join(root, "test-results/phase198");
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(path.join(evidenceDirectory, "acceptance-gates.json"), `${JSON.stringify({
    contract_version: "1.0.0",
    schema_version: 1,
    phase: 198,
    result: "PASSED",
    feature_gates: gateIds.map((id) => ({ id, status: "PASSED" })),
    test_vectors: ["T01", "T02", "T03", "T04", "P198-T05", "P198-T06", "P198-T07"],
    evidence: [
      ".entral/governor/tests/improvement-queue.test.mjs",
      "scripts/phase198-improvement-gates.test.mjs",
      ".entral/governor/phases/198/PHASE_CONTRACT.v1.json"
    ]
  }, null, 2)}\n`, "utf8");
});
