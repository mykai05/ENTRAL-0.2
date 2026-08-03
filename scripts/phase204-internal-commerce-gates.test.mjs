import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFile(resolve(repositoryRoot, path), "utf8");

test("Phase 204 runtime exposes only tenant-bound internal commerce entry points", async () => {
  const [server, routes, service] = await Promise.all([
    read("backend/src/server.ts"),
    read("backend/src/routes/phase204InternalCommerce.ts"),
    read("backend/src/services/phase204InternalCommerce.ts")
  ]);
  assert.match(server, /register\(phase204InternalCommerceRoutes, \{ prefix: "\/api\/v1" \}\)/u);
  assert.match(routes, /hasVerifiedMemberTeamAccess/u);
  assert.match(routes, /session_authority:[\s\S]*recent_mfa_verified: member\.context\.recentMfaVerified/u);
  assert.match(routes, /RECENT_MFA_STEP_UP_REQUIRED/u);
  assert.match(service, /withTenantSession/u);
  assert.match(service, /TransactionIsolationLevel\.Serializable/u);
  assert.match(service, /pricing_eligibility: "NOT_ELIGIBLE"/u);
  assert.doesNotMatch(service, /external_provider_mutation_available:\s*true/u);
});

test("Phase 204 evidence identity and roles remain fail closed", async () => {
  const [migration, policy, roleRunner] = await Promise.all([
    read("prisma/migrations/20260803020000_phase_204_internal_commerce/migration.sql"),
    read("prisma/security/050_phase_204_internal_commerce_roles_and_grants.sql"),
    read("scripts/apply-database-roles.mjs")
  ]);
  assert.match(migration, /phase204_product_evidence_identity_matches/u);
  assert.match(migration, /source\.source_type='REPOSITORY_RELEASE'/u);
  assert.match(migration, /source\.provider='GITHUB'/u);
  assert.match(migration, /artifact\.stable_code='SP-COMMERCE-001-'/u);
  assert.match(migration, /artifact_record\.name IS DISTINCT FROM p_request->>'file_name'/u);
  assert.match(policy, /REVOKE ALL ON TABLE[\s\S]*phase204_internal_commerce_activations/u);
  assert.match(policy, /phase204_internal_commerce_readback\(uuid,uuid\)[\s\S]*TO entral_api/u);
  assert.doesNotMatch(policy, /GRANT\s+(?:INSERT|UPDATE|DELETE)[\s\S]*TO entral_(?:api|worker)/u);
  assert.match(roleRunner, /050_phase_204_internal_commerce_roles_and_grants\.sql/u);
});

test("Phase 204 member truth is attached only to the canonical commerce business", async () => {
  const [dashboard, clientTruth] = await Promise.all([
    read("frontend/components/CanonicalPortfolioDashboard.tsx"),
    read("frontend/lib/phase204-internal-commerce.ts")
  ]);
  assert.match(dashboard, /summary\.stable_code === PHASE204_INTERNAL_BUSINESS_CODE/u);
  assert.match(dashboard, /loadPhase204InternalCommerce\(organizationId/u);
  assert.match(clientTruth, /PHASE204_INTERNAL_BUSINESS_CODE = "SP-COMMERCE-001"/u);
  assert.match(clientTruth, /external_provider_mutation_available/u);
  assert.match(clientTruth, /public_claim_eligible === false/u);
  assert.match(clientTruth, /unverified Etsy capability was activated/u);
});

test("authenticated release acceptance binds the real commerce record and both graph renderers", async () => {
  const journey = await read("e2e/production-member-journey.mjs");
  assert.match(journey, /P204-INTERNAL-COMMERCE-PRODUCTION-JOURNEY-001/u);
  assert.match(journey, /commerceBusinesses\.length !== 1/u);
  assert.match(journey, /\/internal-commerce/u);
  assert.match(journey, /PHASE204_ENTITY_CODES/u);
  assert.match(journey, /requiredEntityIds: new Set\(commerceEntityIds\)/u);
  assert.match(journey, /Canonical business scope/u);
  assert.match(journey, /Products and readiness/u);
  assert.match(journey, /const widths = \[360, 390, 412, 430, 1440, 1920\]/u);
  assert.match(journey, /UNIVERSE_2D/u);
  assert.match(journey, /UNIVERSE_3D/u);
});
