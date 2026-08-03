import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const expectedLifecycle = [
  "CATALOGUED",
  "DESIGNED",
  "IMPLEMENTED",
  "UNIT_VERIFIED",
  "INTEGRATION_VERIFIED",
  "CANARY_VERIFIED",
  "ACTIVE",
  "SELLABLE",
  "DEPRECATED",
  "RETIRED"
];

test("Phase 203 TaskPacket remains bounded to Capability Truth and exact release gates", async () => {
  const task = JSON.parse(await read(".entral/governor/tasks/P203-CAPABILITY-TRUTH-REGISTRY-001.json"));
  assert.equal(task.phase, 203);
  assert.equal(task.task_packet_id, "P203-CAPABILITY-TRUTH-REGISTRY-001");
  assert.match(task.objective, /Capability Truth Registry and Product Publication Gateway/);
  assert.ok(task.exclusions.some((value) => value.includes("No Phase 204")));
  assert.ok(task.exclusions.some((value) => value.includes("No new repository security scan")));
  assert.ok(task.release_requirements.some((value) => value.includes("protected main")));
  assert.ok(task.release_requirements.some((value) => value.includes("Phase 200 as immediate rollback")));
  assert.equal(task.policy.delegation.execution_model, "CODEX_5_6_SOL_XHIGH");
  assert.equal(task.policy.delegation.single_writer_boundary, "MUTABLE_FILE_MODULE_SCHEMA_CONTRACT_SCOPE");
});

test("Capability Truth contract exposes the exact lifecycle and fail-closed publication rule", async () => {
  const [contract, schema, publicationSchema] = await Promise.all([
    read("packages/contracts/src/capability-truth.ts"),
    read("packages/contracts/capability-truth-record.schema.json").then(JSON.parse),
    read("packages/contracts/capability-truth-publication.schema.json").then(JSON.parse)
  ]);
  const lifecycleBody = contract.match(/CAPABILITY_LIFECYCLE_STATES\s*=\s*\[([\s\S]*?)\]\s*as const/u)?.[1];
  assert.ok(lifecycleBody);
  assert.deepEqual([...lifecycleBody.matchAll(/"([A-Z_]+)"/gu)].map((match) => match[1]), expectedLifecycle);
  assert.deepEqual(schema.$defs.lifecycle.enum, expectedLifecycle);
  assert.equal(publicationSchema.properties.claims.items.properties.lifecycle_state.const, "SELLABLE");
  assert.equal(publicationSchema.properties.claims.items.properties.evidence_receipt_ids.minItems, 1);
  for (const blockedReadiness of ["UNVERIFIED", "SIMULATED", "PLACEHOLDER", "LOCAL_ONLY", "DISABLED"]) {
    assert.ok(contract.includes(`"${blockedReadiness}"`));
  }
  assert.match(contract, /only SELLABLE capabilities can be public-claim eligible/);
});

test("source import is exhaustive, immutable-source-backed, and conservatively non-public", async () => {
  const inventory = JSON.parse(await read("docs/evidence/phase203/capability-truth/SOURCE_INVENTORY.json"));
  assert.equal(inventory.entries.length, 56);
  assert.deepEqual([...new Set(inventory.entries.map((entry) => entry.kind))].sort(), [
    "AGENT",
    "CAPABILITY",
    "COMMANDER_PACK",
    "INTEGRATION",
    "WORKFLOW"
  ]);
  assert.ok(inventory.entries.every((entry) => entry.lifecycle_state === "CATALOGUED"));
  assert.deepEqual(inventory.import_policy.allowed_initial_lifecycle_states, ["CATALOGUED"]);
  assert.ok(inventory.entries.every((entry) => entry.public_claim_eligible === false));
  assert.ok(inventory.entries.every((entry) => entry.owner === "UNASSIGNED"));
  assert.ok(inventory.entries.every((entry) => entry.source_bindings.every(
    (binding) => binding.reference.startsWith(`${inventory.repository}@${inventory.source_commit}:`)
  )));
  assert.deepEqual(
    inventory.entries.filter((entry) => entry.kind === "INTEGRATION").map((entry) => entry.capability_key).sort(),
    inventory.entries.filter((entry) => entry.capability_key.startsWith("integration.")).map((entry) => entry.capability_key).sort()
  );
});

test("migration owns one durable registry, audited transitions, RLS, and an exact conservative seed", async () => {
  const migration = await read("prisma/migrations/20260803010000_phase_203_capability_truth_registry/migration.sql");
  for (const table of [
    "capability_records",
    "capability_dependencies",
    "capability_verification_receipts",
    "tenant_capability_installations",
    "product_claims",
    "capability_transition_audit",
    "publication_decision_audit"
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE entral\\.${table}\\b`, "u"));
    assert.match(migration, new RegExp(`ALTER TABLE entral\\.${table} ENABLE ROW LEVEL SECURITY`, "u"));
    assert.match(migration, new RegExp(`CREATE POLICY phase203_[a-z_]+ ON entral\\.${table}`, "u"));
  }
  for (const fn of [
    "phase203_record_capability_evidence",
    "phase203_transition_capability",
    "phase203_register_product_claim",
    "phase203_transition_product_claim",
    "phase203_publication_gate",
    "phase203_registry_revision",
    "phase203_admin_readback"
  ]) {
    assert.match(migration, new RegExp(`CREATE OR REPLACE FUNCTION entral\\.${fn}\\(`, "u"));
  }
  assert.match(migration, /REVOKE ALL ON FUNCTION %s FROM PUBLIC/);
  assert.match(migration, /Capability lifecycle mutation requires an audited Phase 203 transition/);
  assert.match(migration, /Product claim .* requires an audited Phase 203 transition/);
  assert.match(migration, /ARRAY\['UNIT_TEST'\]/);
  assert.match(migration, /ARRAY\['INTEGRATION_TEST'\]/);
  assert.match(migration, /ARRAY\['CANARY'\]/);
  assert.match(migration, /ARRAY\['PRODUCTION_READBACK'\]/);
  assert.match(migration, /'SUPPORT_READINESS','PRICING_APPROVAL','TUTORIAL','DOCUMENTATION','ROLLBACK'/);
  const seed = migration.match(/WITH seed\([\s\S]*?DO \$phase203_seed_assertion\$/u)?.[0];
  assert.ok(seed, "migration must contain one deterministic source seed");
  assert.equal([...seed.matchAll(/\('20300000-[0-9-]+'::uuid/gu)].length, 56);
  assert.equal([...seed.matchAll(/'UNASSIGNED'(?:,'PRODUCTION','GLOBAL')?,'CATALOGUED','UNSUPPORTED'/gu)].length, 56);
  assert.match(migration, /must seed exactly 56 records/i);
  assert.match(migration, /EXISTS \(SELECT 1 FROM entral\.product_claims\)/u);
  assert.match(migration, /EXISTS \(SELECT 1 FROM entral\.tenant_capability_installations\)/u);
});

test("role grants expose functions but no direct capability or claim mutation", async () => {
  const roles = await read("prisma/security/049_phase_203_roles_and_grants.sql");
  const apiGrant = roles.match(/GRANT EXECUTE ON FUNCTION[\s\S]*?TO entral_api;/u)?.[0];
  assert.ok(apiGrant, "API runtime must have one bounded grouped function grant");
  assert.match(apiGrant, /entral\.phase203_publication_gate\(text,text,uuid,uuid\)/);
  assert.match(apiGrant, /entral\.phase203_registry_revision\(\)/);
  assert.match(apiGrant, /entral\.phase203_admin_readback\(\)/);
  assert.doesNotMatch(roles, /GRANT\s+(?:INSERT|UPDATE|DELETE)[\s\S]{0,80}entral\.capability_records/iu);
  assert.doesNotMatch(roles, /GRANT\s+(?:INSERT|UPDATE|DELETE)[\s\S]{0,80}entral\.product_claims/iu);
  assert.match(roles, /REVOKE ALL ON (?:TABLE|FUNCTION)/);
});

test("typed API and OpenAPI expose only public-safe, member-scoped, and internal-admin surfaces", async () => {
  const [route, service, server, openapi] = await Promise.all([
    read("backend/src/routes/capabilityTruth.ts"),
    read("backend/src/services/capabilityTruth.ts"),
    read("backend/src/server.ts"),
    read("packages/contracts/openapi.yaml")
  ]);
  for (const path of [
    "/product-truth/claims",
    "/member/organizations/:organizationId/product-truth",
    "/admin/product-truth",
    "/admin/product-truth/capabilities/:capabilityId/evidence",
    "/admin/product-truth/capabilities/:capabilityId/transitions"
  ]) assert.ok(route.includes(path));
  assert.match(route, /preHandler: requireAdmin/);
  assert.match(route, /hasVerifiedMemberTeamAccess/);
  assert.match(route, /Capability Truth is temporarily unavailable/);
  assert.match(service, /assertPublicProductTruthProjection/);
  assert.match(service, /phase203_registry_revision/);
  assert.match(service, /withTenantSession/);
  assert.match(service, /withPersonalSession/);
  assert.match(server, /register\(capabilityTruthRoutes/);
  assert.match(openapi, /lifecycle_state: \{ type: string, const: SELLABLE \}/);
});
