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
  assert.deepEqual(publicationSchema.properties.claims.items.properties.pricing_eligibility.enum, ["INCLUDED", "ADD_ON"]);
  assert.equal(publicationSchema.properties.claims.items.properties.evidence_receipt_ids.minItems, 1);
  for (const field of [
    "data_classification",
    "supported_scopes",
    "required_evidence",
    "pricing_eligibility",
    "feature_flags",
    "limits",
    "installation_transition_audit"
  ]) assert.ok(contract.includes(field), `contract must bind ${field}`);
  assert.equal(schema.allOf[0].then.properties.supported_scopes.contains.const, "GLOBAL");
  assert.equal(schema.allOf[1].then.properties.supported_scopes.contains.const, "TENANT");
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
  assert.equal(inventory.import_policy.data_classification_default, "INTERNAL");
  assert.deepEqual(inventory.import_policy.supported_scopes_default, ["GLOBAL"]);
  assert.ok(inventory.import_policy.required_evidence_default.includes("PRODUCTION_READBACK"));
  assert.equal(inventory.import_policy.pricing_eligibility_default, "NOT_ELIGIBLE");
  assert.deepEqual(inventory.import_policy.tenant_feature_flags_default, {});
  assert.deepEqual(inventory.import_policy.tenant_limits_default, {});
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
    "product_claim_transition_audit",
    "tenant_capability_installation_audit",
    "capability_mutation_receipts",
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
    "phase203_current_evidence_receipt_passed",
    "phase203_latest_evidence_passed",
    "phase203_operational_evidence_healthy",
    "phase203_activation_requirements_healthy",
    "phase203_required_evidence_present",
    "phase203_dependencies_healthy",
    "phase203_reconcile_unhealthy_dependents",
    "phase203_publication_gate",
    "phase203_registry_revision",
    "phase203_admin_readback"
  ]) {
    assert.match(migration, new RegExp(`CREATE OR REPLACE FUNCTION entral\\.${fn}\\(`, "u"));
  }
  assert.match(migration, /REVOKE ALL ON FUNCTION %s FROM PUBLIC/);
  assert.match(migration, /Capability lifecycle mutation requires an audited Phase 203 transition/);
  assert.match(migration, /Product claim .* requires an audited Phase 203 transition/);
  assert.match(migration, /BEFORE UPDATE OF lifecycle_state,public_claim_eligible,pricing_eligibility/);
  assert.match(migration, /WITH RECURSIVE root AS/);
  assert.match(migration, /JOIN affected ON affected\.capability_id=dependency\.dependency_capability_id/);
  assert.match(migration, /NOT entral\.phase203_activation_requirements_healthy/);
  assert.match(migration, /NOT entral\.phase203_required_evidence_present/);
  assert.match(migration, /ARRAY\['PRODUCTION_READBACK'\]::text\[\]/);
  assert.match(migration, /response_snapshot \?& ARRAY\[/);
  assert.match(migration, /v_prior_lifecycle_state := COALESCE/);
  assert.match(migration, /v_remaining_failure_state/);
  assert.match(migration, /release_version='phase-203'/);
  assert.match(migration, /FOREIGN KEY \(business_id,tenant_id,organization_id\)/);
  assert.match(migration, /feature_flags jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
  assert.match(migration, /limits jsonb NOT NULL DEFAULT '\{\}'::jsonb/);
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
  assert.match(roles, /phase203_current_evidence_receipt_passed\(uuid\)/);
  assert.match(roles, /phase203_latest_evidence_passed\(uuid,text,text\)/);
  assert.match(roles, /phase203_operational_evidence_healthy\(uuid,text,text\)/);
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

test("every Product Truth consumer is exact-commit-bound and fail closed", async () => {
  const inventory = JSON.parse(await read(
    "docs/evidence/phase203/capability-truth/PUBLICATION_CONSUMER_INVENTORY.json"
  ));
  const expectedSurfaces = [
    "WEBSITE",
    "TUTORIAL",
    "PRICING",
    "CHECKOUT",
    "PROPOSAL",
    "ONBOARDING",
    "INTEGRATION_LIST",
    "MEMBER_APPLICATION",
    "SALES"
  ];
  assert.equal(inventory.phase, 203);
  assert.equal(inventory.gateway.implementation_commit, "7febcd072a29c3796caec4503d623c2d03da6f0e");
  assert.deepEqual(inventory.surfaces.map((entry) => entry.surface), expectedSurfaces);
  assert.ok(inventory.surfaces.every((entry) => entry.references.length >= 2));
  assert.ok(inventory.surfaces.flatMap((entry) => entry.references).every((reference) => (
    /^mykai05\/(?:ENTRAL-0\.2|Sovereign-Protocol)@[0-9a-f]{40}:[^\s]+$/u.test(reference)
  )));
  assert.match(inventory.seed_policy, /No production capability/);
  assert.match(inventory.seed_policy, /ACTIVE or SELLABLE/);
});
