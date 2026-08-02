import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";

const repositoryRoot = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, repositoryRoot), "utf8");
const readJson = async (path) => JSON.parse(await read(path));
const contractsRequire = createRequire(new URL("packages/contracts/package.json", repositoryRoot));
const { parse: parseYaml } = contractsRequire("yaml");

const expectedFeatureIds = Array.from(
  { length: 20 },
  (_, index) => `P202-F${String(index + 1).padStart(3, "0")}`
);
const expectedGateIds = expectedFeatureIds.map((id) => `${id}-A`);

const identityPathMethods = Object.freeze({
  "/api/v1/identity/sessions": ["delete", "get"],
  "/api/v1/identity/sessions/{sessionId}": ["delete"],
  "/api/v1/identity/support-session": ["get"],
  "/api/v1/identity/support-session/tasks": ["get"],
  "/api/v1/identity/support-session/tasks/{taskId}": ["patch"],
  "/api/v1/identity/mfa/factors": ["get"],
  "/api/v1/identity/mfa/totp/enroll": ["post"],
  "/api/v1/identity/mfa/totp/confirm": ["post"],
  "/api/v1/identity/mfa/step-up": ["post"],
  "/api/v1/identity/mfa/recovery/regenerate": ["post"],
  "/api/v1/identity/mfa/{factorId}": ["delete"],
  "/api/v1/identity/memberships": ["get"],
  "/api/v1/identity/memberships/invitations": ["post"],
  "/api/v1/identity/memberships/invitations/accept": ["post"],
  "/api/v1/identity/memberships/{subjectUserId}": ["patch"],
  "/api/v1/identity/support-access": ["get", "post"],
  "/api/v1/identity/support-access/{grantId}/elevate": ["post"],
  "/api/v1/identity/support-access/{grantId}": ["delete"]
});

const requiredOwnershipFields = Object.freeze([
  "organizationId",
  "tenantId",
  "actorId",
  "ownedBy"
]);
const businessNotApplicable = new Set([
  "MemberTutorialMutationReceipt",
  "MemberTutorialProgress",
  "MemberWorkspaceSnapshot",
  "TeamMember"
]);

function assertIncludesAll(source, bindings, label) {
  for (const binding of bindings) {
    assert.ok(source.includes(binding), `${label} is missing ${binding}`);
  }
}

function parsePrismaModels(source) {
  const models = new Map();
  for (const match of source.matchAll(/^model\s+(\w+)\s+\{([\s\S]*?)^\}/gm)) {
    const fields = new Set();
    for (const rawLine of match[2].split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
      const field = /^(\w+)\s+/.exec(line)?.[1];
      if (field) fields.add(field);
    }
    models.set(match[1], fields);
  }
  return models;
}

function assertModelFields(models, model, fields) {
  assert.ok(models.has(model), `Prisma model ${model} is missing`);
  for (const field of fields) {
    assert.ok(models.get(model).has(field), `Prisma model ${model} is missing ${field}`);
  }
}

function parseSqlTextArray(source, variable) {
  const pattern = new RegExp(`${variable}\\s+text\\[\\]\\s*:=\\s*ARRAY\\[([\\s\\S]*?)\\]`, "g");
  return [...source.matchAll(pattern)].map((match) =>
    [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1])
  );
}

function phase202Functions(source) {
  return new Set(
    [...source.matchAll(/^CREATE OR REPLACE FUNCTION\s+entral\.(phase202_[a-z0-9_]+)\s*\(/gmi)]
      .map((match) => match[1])
  );
}

async function walkFiles(path) {
  const directory = new URL(path.endsWith("/") ? path : `${path}/`, repositoryRoot);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = `${path.replace(/\/$/, "")}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walkFiles(relative));
    else files.push(relative);
  }
  return files;
}

const sources = Promise.all([
  readJson(".entral/governor/phases/202/PHASE_CONTRACT.v1.json"),
  read("packages/contracts/src/identity-authority.ts"),
  read("packages/contracts/openapi.yaml").then(parseYaml),
  read("prisma/schema.prisma"),
  read("prisma/migrations/20260802090000_phase_202_identity_tenancy_authority/migration.sql"),
  read("prisma/security/048_phase_202_roles_and_grants.sql"),
  readJson("docs/PHASE_202_MODEL_SCOPE_LEDGER.json")
]).then(([phaseContract, identityContract, openApi, schema, migration, roles, modelScopeLedger]) => ({
  identityContract,
  migration,
  models: parsePrismaModels(schema),
  modelScopeLedger,
  openApi,
  phaseContract,
  roles,
  schema
}));

test("P202-F001-A binds all twenty gates and stable organization, tenant, business, environment, and residency boundaries", async () => {
  const { identityContract, models, openApi, phaseContract } = await sources;
  assert.equal(phaseContract.phase, 202);
  assert.equal(phaseContract.review_policy, "CONDITIONAL");
  assert.deepEqual(phaseContract.feature_ids, expectedFeatureIds);
  assert.deepEqual(phaseContract.acceptance_gate_ids, expectedGateIds);
  assertModelFields(models, "Team", ["organizationId", "tenantId", "environment", "dataResidency"]);
  assertModelFields(models, "TenantBoundary", ["id", "organizationId", "legacyTeamId", "environment", "dataResidency", "status", "version"]);
  assertModelFields(models, "BusinessBoundary", ["id", "organizationId", "tenantId", "stableCode", "environment", "dataResidency", "status", "version"]);
  assertIncludesAll(identityContract, [
    "readonly organization_id: string",
    "readonly tenant_id: string",
    "readonly business_id: string | null",
    'readonly environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION"',
    "readonly data_residency: string"
  ], "typed ownership contract");

  const actualIdentityPaths = Object.fromEntries(
    Object.entries(openApi.paths)
      .filter(([path]) => path.startsWith("/api/v1/identity/"))
      .map(([path, operations]) => [path, Object.keys(operations).sort()])
  );
  assert.deepEqual(actualIdentityPaths, identityPathMethods);
  const phaseSchemas = Object.entries(openApi.components.schemas)
    .filter(([name]) => name.startsWith("Phase202"));
  assert.ok(phaseSchemas.length >= 25, "OpenAPI must retain the complete typed Phase 202 schema family");
  for (const [name, schema] of phaseSchemas) {
    assert.equal(schema.type, "object", `${name} must be a typed object`);
    assert.equal(schema.additionalProperties, false, `${name} must reject undeclared fields`);
  }
});

test("P202-F002-A keeps identities non-confusable and personal authentication records exactly scoped", async () => {
  const { identityContract, migration, models, roles } = await sources;
  assertModelFields(models, "IdentityActor", ["actorType", "humanUserId", "serviceSubject", "agentId", "status"]);
  assertIncludesAll(identityContract, [
    'IDENTITY_ACTOR_TYPES = ["HUMAN", "SERVICE", "AGENT"]',
    "populated.length !== 1",
    'value.actor_type === "HUMAN"',
    'value.actor_type === "SERVICE"',
    'value.actor_type === "AGENT"',
    "IDENTITY_TYPE_CONFUSION"
  ], "identity actor contract");
  assertIncludesAll(migration, [
    '"actorType" text NOT NULL CHECK ("actorType" IN (\'HUMAN\', \'SERVICE\', \'AGENT\'))',
    'CONSTRAINT "IdentityActor_exact_subject_check"',
    '("humanUserId" IS NOT NULL)::int',
    '("serviceSubject" IS NOT NULL)::int',
    '("agentId" IS NOT NULL)::int'
  ], "identity actor migration");
  for (const model of ["MembershipMutationReceipt", "MfaMutationReceipt", "SecretAccessAudit", "SupportAccessAudit", "TenantRateLimitReceipt"]) {
    assertModelFields(models, model, ["actorId"]);
  }
  assertIncludesAll(migration, [
    'ALTER TABLE "User" FORCE ROW LEVEL SECURITY',
    'ALTER TABLE "EmailVerificationToken" FORCE ROW LEVEL SECURITY',
    'ALTER TABLE "PasswordResetToken" FORCE ROW LEVEL SECURITY',
    "phase202_user_read_allows",
    "phase202_auth_token_access_allows",
    "phase202_auth_token_active_allows",
    'recovery."consumedAt" IS NULL',
    'recovery."expiresAt">CURRENT_TIMESTAMP',
    "app.phase202_auth_subject",
    "app.phase202_auth_email",
    "app.phase202_recovery_token_hash",
    "phase202_resolve_membership_profile"
  ], "personal authentication RLS");
  assert.doesNotMatch(migration, /CREATE POLICY "phase202_select_user"[^;]*USING\s*\(true\)/s);
  assertIncludesAll(roles, [
    'GRANT UPDATE ("lastDashboardSeenAt","emailVerifiedAt","passwordHash","sessionVersion","updatedAt")',
    'GRANT UPDATE ("consumedAt") ON TABLE',
    "GRANT EXECUTE ON FUNCTION public.digest(bytea,text), public.digest(text,text)",
    'entral.phase202_resolve_membership_profile(text,uuid)'
  ], "personal authentication grants");
});

test("P202-F003-A exhaustively inventories customer records and binds applicable ownership provenance", async () => {
  const { migration, models, modelScopeLedger } = await sources;
  const { PHASE202_SOURCE_TABLES } = await import(new URL("phase202-ownership-reconcile.mjs", import.meta.url));
  assert.equal(modelScopeLedger.inventory_version, "phase202-model-scope-v2");
  assert.equal(models.size, 74);
  assert.equal(modelScopeLedger.entries.length, 74);
  assert.equal(modelScopeLedger.entries.length, models.size);
  assert.equal(new Set(modelScopeLedger.entries.map((entry) => entry.model)).size, models.size);
  assert.deepEqual(new Set(modelScopeLedger.entries.map((entry) => entry.model)), new Set(models.keys()));
  for (const entry of modelScopeLedger.entries) {
    assert.ok(entry.scope_class && entry.ownership_projection && entry.scope_source);
  }
  const mfaReceiptEntry = modelScopeLedger.entries.find((entry) => entry.model === "MfaMutationReceipt");
  assert.equal(mfaReceiptEntry?.scope_class, "PERSONAL_CONTROL");
  assert.equal(mfaReceiptEntry?.ownership_projection, "NOT_APPLICABLE");
  assert.equal(PHASE202_SOURCE_TABLES.length, 41);
  assert.equal(PHASE202_SOURCE_TABLES.includes("MfaMutationReceipt"), false);
  assert.equal(new Set(PHASE202_SOURCE_TABLES).size, PHASE202_SOURCE_TABLES.length);
  assert.deepEqual(
    PHASE202_SOURCE_TABLES,
    modelScopeLedger.entries.filter((entry) => entry.ownership_projection !== "NOT_APPLICABLE").map((entry) => entry.model)
  );
  for (const model of PHASE202_SOURCE_TABLES) {
    assertModelFields(models, model, requiredOwnershipFields);
    assertModelFields(models, model, [model === "Task" ? "createdByActorId" : "createdBy"]);
    if (!businessNotApplicable.has(model)) assertModelFields(models, model, ["businessId"]);
  }
  assertModelFields(models, "CustomerRecordOwnership", [
    "sourceTable", "sourceRecordId", "organizationId", "tenantId", "businessId",
    "actorId", "createdBy", "ownedBy", "mappingStrategy", "version"
  ]);
  assertModelFields(models, "AuditLog", ["scopeKind", "scopeResolution", "organizationId", "tenantId", "businessId", "actorId", "createdBy", "ownedBy"]);
  const ledgerHash = createHash("sha256").update(await read("docs/PHASE_202_MODEL_SCOPE_LEDGER.json")).digest("hex");
  assert.ok(migration.includes(`phase202-source-inventory-v2|model-ledger-sha256=${ledgerHash}`));
  const migrationInventories = parseSqlTextArray(migration, "source_tables");
  assert.ok(migrationInventories.length >= 2, "migration must retain blocker and live-hash inventories");
  for (const inventory of migrationInventories) {
    assert.deepEqual(new Set(inventory), new Set(PHASE202_SOURCE_TABLES));
  }
});

test("P202-F004-A enforces typed RBAC and ABAC over role, business, domain, classification, environment, and risk", async () => {
  const [{ identityContract, migration }, authority] = await Promise.all([
    sources,
    read("backend/src/services/phase202IdentityAuthority.ts")
  ]);
  assertIncludesAll(identityContract, [
    "readonly role: string",
    "readonly authority_domain: AuthorityDomain",
    "readonly data_classification: DataClassification",
    "readonly action_risk: ActionRisk",
    "assertTenantOwnershipContext(value.ownership)",
    "ownership.environment is invalid"
  ], "authority request contract");
  assertIncludesAll(authority, [
    "const rolePermissions",
    "request.authority_domain",
    "request.ownership.business_id",
    "request.data_classification",
    "request.action_risk",
    "ROLE_DOMAIN_DENIED",
    "RECENT_MFA_STEP_UP_REQUIRED",
    "RBAC_ABAC_ALLOW"
  ], "authority evaluator");
  assertIncludesAll(migration, [
    "phase202_human_access_allows",
    "authorityDomains",
    "authorized_business",
    "read:",
    "write:"
  ], "database RBAC and ABAC boundary");
});

test("P202-F005-A makes AutonomyEnvelope versioned, bounded, scoped, expiring, and append-only", async () => {
  const { identityContract, migration, models } = await sources;
  assertIncludesAll(identityContract, [
    "export interface AutonomyEnvelope",
    "readonly version: number",
    "readonly allowed_action_types",
    "readonly tool_scope",
    "readonly data_scope",
    "readonly budget",
    "readonly reversible",
    "readonly verification",
    "readonly escalation",
    "readonly expires_at",
    "EXPIRED_AUTONOMY_ENVELOPE"
  ], "AutonomyEnvelope contract");
  assertModelFields(models, "AutonomyEnvelopeRecord", [
    "envelopeId", "organizationId", "tenantId", "businessId", "actorId", "version",
    "allowedActionTypes", "toolScope", "dataScope", "budgetCurrency", "maximumMinorUnits",
    "reversible", "verification", "escalation", "expiresAt", "revokedAt"
  ]);
  assertIncludesAll(migration, [
    'UNIQUE ("envelopeId","version")',
    "phase202_enforce_append_only_envelope",
    '"AutonomyEnvelopeRecord_append_only_trigger"'
  ], "AutonomyEnvelope migration");
});

test("P202-F006-A stores durable server-side sessions with device, lifecycle, and audit provenance", async () => {
  const [{ identityContract, migration, models }, sessions, postgresTests] = await Promise.all([
    sources,
    read("backend/src/services/phase202SessionBroker.ts"),
    read("backend/tests/phase202IdentityTenancyPostgres.integration.test.ts")
  ]);
  assertModelFields(models, "AuthSession", [
    "id", "userId", "actorId", "organizationId", "tenantId", "sessionType",
    "accessTokenId", "accountSessionVersion", "refreshVersion", "deviceLabel",
    "userAgentHash", "ipAddressHash", "issuedAt", "lastUsedAt", "expiresAt",
    "revokedAt", "revokeReason", "stepUpAt", "auditProvenanceId"
  ]);
  assertIncludesAll(identityContract, [
    "export interface SessionInventoryItem",
    "readonly session_id",
    "readonly device_label",
    "readonly issued_at",
    "readonly last_used_at",
    "readonly expires_at",
    "readonly revoked_at"
  ], "session inventory contract");
  assertIncludesAll(sessions, [
    'action: "auth.session.issued"',
    "auditProvenanceId: audit.id",
    "safeDeviceLabel",
    'hashValue(metadata.userAgent ?? "unknown", "user-agent")',
    'hashValue(metadata.ipAddress ?? "unknown", "ip-address")'
  ], "session broker");
  assertIncludesAll(migration, [
    "phase202_member_auth_session_access_allows",
    "phase202_member_session_audit_insert_allows",
    'CREATE POLICY "phase202_member_auth_session"'
  ], "member session database authority");
  assertIncludesAll(postgresTests, [
    "persists session inventory, rotates refresh credentials, contains replay, and revokes one or all",
    "revokes member session families atomically across owner/admin lifecycle transitions and denies unrelated tenant sessions"
  ], "member session PostgreSQL acceptance");
});

test("P202-F007-A uses short-lived access credentials, hashed rotating refresh credentials, and replay containment", async () => {
  const [{ models }, auth, environment, sessions] = await Promise.all([
    sources,
    read("backend/src/auth.ts"),
    read("backend/src/env.ts"),
    read("backend/src/services/phase202SessionBroker.ts")
  ]);
  assertModelFields(models, "AuthRefreshCredential", [
    "sessionId", "version", "tokenHash", "issuedAt", "expiresAt", "consumedAt",
    "revokedAt", "replacementId"
  ]);
  assert.equal(models.get("AuthRefreshCredential").has("refreshToken"), false);
  assert.match(environment, /ACCESS_TOKEN_TTL_SECONDS:[\s\S]*?\.max\(3600\)/);
  assert.match(auth, /expiresIn:\s*env\.ACCESS_TOKEN_TTL_SECONDS/);
  assertIncludesAll(sessions, [
    "newRefreshToken",
    'hashValue(token, "refresh-token")',
    "rotateRefreshCredential",
    "nextVersion = session.refreshVersion + 1",
    "consumedAt: now, replacementId",
    'revokeReason: "REFRESH_REPLAY"',
    "containRefreshReplay",
    "REFRESH_REPLAY_DETECTED"
  ], "rotating session broker");
});

test("P202-F008-A exposes durable inventory, revoke-one, and revoke-all with fresh account readback", async () => {
  const [sessions, routes, accountUi] = await Promise.all([
    read("backend/src/services/phase202SessionBroker.ts"),
    read("backend/src/routes/phase202IdentityAuthority.ts"),
    read("frontend/components/AccountSecurityControls.tsx")
  ]);
  assertIncludesAll(sessions, ["listSessions", "revokeSession", "revokeAllSessions", 'revokeReason: "USER_REVOKED_ALL"']);
  assertIncludesAll(routes, [
    'app.get("/identity/sessions"',
    'app.delete("/identity/sessions/:sessionId"',
    'app.delete("/identity/sessions"'
  ], "identity session routes");
  assertIncludesAll(accountUi, [
    'apiFetch<unknown>("/identity/sessions"',
    "revokeSession(session.session_id)",
    "revokeAllSessions()",
    "fresh inventory readback"
  ], "account session controls");
});

test("P202-F009-A implements TOTP, one-time recovery, audited recent step-up, and actor-bound secret storage", async () => {
  const [{ identityContract, migration, models }, mfa, routes, accountUi, mfaTests] = await Promise.all([
    sources,
    read("backend/src/services/phase202Mfa.ts"),
    read("backend/src/routes/phase202IdentityAuthority.ts"),
    read("frontend/components/AccountSecurityControls.tsx"),
    read("backend/tests/phase202Mfa.test.ts")
  ]);
  assertModelFields(models, "MfaFactor", ["userId", "actorId", "factorType", "secretReferenceId", "status", "verifiedAt", "lastAcceptedTotpCounter", "version"]);
  assertModelFields(models, "MfaRecoveryCode", ["factorId", "codeHash", "consumedAt"]);
  assertModelFields(models, "MfaMutationReceipt", [
    "userId", "actorId", "sessionId", "factorId", "action", "requestId", "idempotencyKey",
    "requestFingerprint", "priorVersion", "resultingVersion", "resultPayload", "occurredAt"
  ]);
  assertIncludesAll(identityContract, [
    "export interface MfaTransitionReceipt extends IdentityTransitionSideEffects",
    'readonly transition: "TOTP_ENROLL" | "TOTP_CONFIRM" | "STEP_UP" | "RECOVERY_REGENERATE" | "FACTOR_REVOKE"',
    "readonly prior_version: number",
    "readonly resulting_version: number",
    'readonly reconciliation: "IDEMPOTENT_RECEIPT"',
    "assertMfaTransitionReceipt",
    "containsMfaSecretMaterial"
  ], "MFA transition receipt contract");
  assertIncludesAll(migration, [
    'CREATE TABLE "MfaMutationReceipt"',
    'CHECK ("priorVersion">=0 AND "resultingVersion"="priorVersion"+1)',
    '("resultPayload"->>\'release_version\') IS NOT DISTINCT FROM \'phase-202\'',
    'CREATE TRIGGER "MfaMutationReceipt_append_only"',
    'ALTER TABLE "MfaMutationReceipt" ENABLE ROW LEVEL SECURITY',
    'CREATE POLICY "phase202_personal_mfa_receipt_select"',
    'CREATE POLICY "phase202_personal_mfa_receipt_insert"'
  ], "MFA mutation receipt migration");
  assertIncludesAll(mfa, [
    "verifyTotpCode",
    'factorType: "TOTP"',
    "recoveryCodeHash",
    "consumedAt: null",
    "data: { stepUpAt: now }",
    'action: "auth.mfa.step_up"',
    "requireRecentStepUp",
    "MFA_STEP_UP_TTL_SECONDS",
    "createPersonalSecretReference",
    "mfaMutationReceipt.create",
    "mfaMutationReceipt.findUnique",
    "IDEMPOTENCY_KEY_REUSED",
    "replayed: true, enrollment: null, recovery_codes: null"
  ], "MFA service");
  assertIncludesAll(routes, [
    'app.post("/identity/mfa/totp/enroll"',
    'app.post("/identity/mfa/totp/confirm"',
    'app.post("/identity/mfa/step-up"',
    'app.post("/identity/mfa/recovery/regenerate"'
  ], "MFA routes");
  assertIncludesAll(accountUi, [
    "Save these recovery codes now",
    "does not save them in browser storage or include them in logs",
    "Regenerate recovery codes"
  ], "MFA account presentation");
  assertIncludesAll(mfaTests, [
    "returns one-time enrollment material once and replays only the raw-free receipt",
    "replays an exact step-up without consuming the proof or incrementing the factor twice",
    "IDEMPOTENCY_KEY_REUSED",
    "rejects immediate and concurrent reuse of one TOTP counter"
  ], "MFA receipt tests");
});

test("P202-F010-A makes membership lifecycle idempotent and couples encrypted delivery to durable notification evidence", async () => {
  const [{ identityContract, migration, models }, membership, notification, notificationTests] = await Promise.all([
    sources,
    read("backend/src/services/phase202Membership.ts"),
    read("backend/src/services/phase202NotificationDelivery.ts"),
    read("backend/tests/phase202NotificationDelivery.test.ts")
  ]);
  assertModelFields(models, "MembershipInvitation", ["tenantId", "tokenHash", "status", "idempotencyKey", "notificationEvidenceId"]);
  assertModelFields(models, "MembershipMutationReceipt", ["action", "priorVersion", "resultingVersion", "idempotencyKey", "requestFingerprint", "notificationEvidenceId", "resultPayload"]);
  assertModelFields(models, "NotificationEvidence", ["tenantId", "recipientHash", "templateId", "status", "occurredAt"]);
  assertModelFields(models, "NotificationDeliveryOutbox", ["tenantId", "notificationEvidenceId", "secretReferenceId", "status", "attempts", "deadlineAt"]);
  assertIncludesAll(identityContract, [
    '"INVITE" | "ACCEPT" | "ROLE_CHANGE" | "SUSPEND" | "REMOVE"',
    'readonly reconciliation: "IDEMPOTENT_RECEIPT"',
    'readonly failure_behavior: "NO_PARTIAL_WRITE"',
    "readonly notification_evidence_id"
  ], "membership receipt contract");
  assertIncludesAll(membership, [
    "hashMembershipInvitationToken",
    "enqueueMembershipEmail",
    "stringifySecretEnvelope(input.command, context)",
    'INSERT INTO "SecretReference"',
    "notificationDeliveryOutbox.create",
    "membershipMutationReceipt.findUnique",
    "acceptInvitationInBoundSession"
  ], "membership lifecycle service");
  assertIncludesAll(migration, [
    'CREATE POLICY "phase202_insert_membership_delivery_secret"',
    '"provider"=\'resend\'',
    '"purpose"=\'membership-email-delivery\'',
    "'write:NotificationDeliveryOutbox'"
  ], "membership delivery secret boundary");
  assertIncludesAll(notification, ["phase202_claim_notification_deliveries", "phase202_complete_notification_delivery", "phase202_fail_notification_delivery"]);
  assertIncludesAll(notificationTests, [
    "uses a stable UUID idempotency key",
    "never a token, recipient, ciphertext, or provider error body",
    "bounded exponential retry",
    "database deadline elapsed"
  ], "notification delivery tests");
});

test("P202-F011-A secret writes fail closed when encryption or key management is unavailable", async () => {
  const [broker, environment, brokerTests] = await Promise.all([
    read("backend/src/services/phase202SecretBroker.ts"),
    read("backend/src/env.ts"),
    read("backend/tests/phase202SecretBroker.test.ts")
  ]);
  assertIncludesAll(broker, [
    "export class Phase202SecretBrokerError",
    "createSecretReference",
    "createPersonalSecretReference",
    "stringifySecretEnvelope",
    "SECRET_BROKER_UNAVAILABLE",
    "SECRET_BROKER_KEY_UNAVAILABLE"
  ], "secret broker");
  assertIncludesAll(environment, [
    "Production requires DATA_ENCRYPTION_KEY",
    "plaintext secure JSON is forbidden"
  ], "production encryption environment gate");
  assertIncludesAll(brokerTests, [
    "blocks plaintext values without exposing their content",
    "fails closed when the active key is absent and never persists plaintext"
  ], "secret broker negative tests");
});

test("P202-F012-A binds envelope encryption to row AAD, key versions, environment, rotation, and access audit", async () => {
  const [{ migration, models }, broker, brokerTests] = await Promise.all([
    sources,
    read("backend/src/services/phase202SecretBroker.ts"),
    read("backend/tests/phase202SecretBroker.test.ts")
  ]);
  assertModelFields(models, "SecretReference", ["environment", "keyVersion", "encryptedValue", "version", "rotatedAt", "revokedAt"]);
  assertModelFields(models, "SecretAccessAudit", ["secretReferenceId", "actorId", "action", "purpose", "outcome", "requestId", "occurredAt"]);
  assertIncludesAll(broker, [
    "envelopeContext(row)",
    "personalEnvelopeContext(row)",
    "secretEnvelopeMetadata",
    "metadata.keyVersion !== row.keyVersion",
    "metadata.environment !== row.environment",
    "parseSecretEnvelope<unknown>(row.encryptedValue, envelopeContext(row))",
    "rotateSecretReference",
    "secretAccessAudit.create"
  ], "AAD-bound secret broker");
  assertIncludesAll(migration, [
    "phase202_secret_envelope_metadata_matches",
    "INVALID_SECRET_REFERENCE",
    "INVALID_PERSONAL_SECRET_REFERENCE"
  ], "database envelope validation");
  assertIncludesAll(brokerTests, [
    "rejects a valid ciphertext transplanted across its AAD-bound purpose",
    "rotates only after decrypting the retained old key and records that proof"
  ], "AAD and rotation tests");
});

test("P202-F013-A uses the complete source-backed credential-reference inventory and excludes raw secret material from runtime surfaces", async () => {
  const [
    { identityContract, migration, schema },
    broker,
    support,
    routes,
    workspace,
    inventory,
    phase199Inventory,
    reconciliation,
    reconciliationCli,
    shopifyConnections,
    shopifyOAuthContinuations
  ] = await Promise.all([
    sources,
    read("backend/src/services/phase202SecretBroker.ts"),
    read("backend/src/services/phase202SupportAccess.ts"),
    read("backend/src/routes/phase202IdentityAuthority.ts"),
    read("frontend/components/CanonicalGraphWorkspace.tsx"),
    readJson("docs/PHASE_202_CREDENTIAL_REFERENCE_INVENTORY.json"),
    readJson("docs/evidence/phase199/SECURE_JSON_COLUMN_INVENTORY.json"),
    read("backend/src/services/secureJsonReconciliation.ts"),
    read("backend/src/cli/reconcileSecureJson.ts"),
    read("backend/src/services/shopifyConnections.ts"),
    read("backend/src/services/shopifyOAuthContinuations.ts")
  ]);
  assert.equal(inventory.inventory_id, "phase202-credential-reference-inventory-v1");
  assert.equal(
    inventory.phase_199_source_inventory.reference,
    "mykai05/ENTRAL-0.2@f1e4ba62bc60986cb8e7366a35ac9a92aeda0abb:docs/evidence/phase199/SECURE_JSON_COLUMN_INVENTORY.json"
  );
  assert.equal(phase199Inventory.inventory_id, inventory.phase_199_source_inventory.inventory_id);
  const phase199ColumnKeys = phase199Inventory.columns.map(({ table, column }) => `${table}.${column}`);
  assert.equal(phase199ColumnKeys.length, 60);
  assert.deepEqual(inventory.secure_json_column_keys, phase199ColumnKeys);
  assert.equal(new Set(inventory.secure_json_column_keys).size, 60);
  const phase199CredentialKeys = phase199Inventory.columns
    .filter(({ credential_bearing }) => credential_bearing)
    .map(({ table, column }) => `${table}.${column}`);
  assert.deepEqual(phase199CredentialKeys, [
    "ShopifyConnection.credentialJson",
    "ShopifyOAuthContinuation.payloadJson"
  ]);
  assert.deepEqual(
    inventory.credential_reference_targets.map(({ source_key }) => source_key),
    phase199CredentialKeys
  );
  assert.equal(inventory.credential_reference_targets.length, 2);
  assert.equal(inventory.proof.unrelated_json_columns_migrated, 0);
  assert.equal(inventory.staged_legacy_boundary.generic_json_reconciliation_prohibited, true);
  assert.equal(inventory.staged_legacy_boundary.legacy_columns_are_not_runtime_read_or_write_targets, true);
  assert.equal(inventory.reconciliation_and_release_evidence.audit_requires_separate_fresh_invocation, true);
  assert.equal(inventory.reconciliation_and_release_evidence.audit_requires_prior_apply_receipt_hash, true);

  const runtimeByTable = new Map([
    ["ShopifyConnection", shopifyConnections],
    ["ShopifyOAuthContinuation", shopifyOAuthContinuations]
  ]);
  for (const target of inventory.credential_reference_targets) {
    const modelBlock = new RegExp(`^model\\s+${target.table}\\s+\\{([\\s\\S]*?)^\\}`, "m").exec(schema)?.[1];
    assert.ok(modelBlock, `${target.table} schema model is missing`);
    assert.match(
      modelBlock,
      new RegExp(`^\\s*${target.legacy_column}\\s+String\\?\\s*$`, "m"),
      `${target.source_key} must be nullable and reconciliation-only during the staged boundary`
    );
    assert.match(
      modelBlock,
      new RegExp(`^\\s*${target.reference_column}\\s+String\\?\\s+[^\\r\\n]*@db\\.Uuid\\s*$`, "m"),
      `${target.table}.${target.reference_column} must be a nullable staged SecretReference key`
    );
    assert.match(
      modelBlock,
      new RegExp(`fields:\\s*\\[${target.reference_column},\\s*tenantId,\\s*organizationId\\],\\s*references:\\s*\\[id,\\s*tenantId,\\s*organizationId\\]`),
      `${target.table}.${target.reference_column} must use the tenant-scoped SecretReference relation`
    );

    const runtime = runtimeByTable.get(target.table);
    assert.ok(runtime, `${target.table} runtime source is missing`);
    assertIncludesAll(runtime, [
      target.reference_column,
      target.reference_provider,
      target.reference_purpose,
      "readSecretValue"
    ], `${target.table} credential-reference runtime`);
    assert.doesNotMatch(runtime, new RegExp(`\\b${target.legacy_column}\\b`));
    assert.doesNotMatch(runtime, /\b(?:parseSecureJson|stringifySecureJson)\b/);
  }

  const reconciliationTargetBlock = /export const SECURE_JSON_RECONCILIATION_TARGETS\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(reconciliation)?.[1];
  assert.ok(reconciliationTargetBlock, "credential reconciliation target inventory is missing");
  for (const target of inventory.credential_reference_targets) {
    assertIncludesAll(reconciliationTargetBlock, [
      `tableName: "${target.table}"`,
      `columnName: "${target.legacy_column}"`,
      `referenceColumnName: "${target.reference_column}"`,
      `provider: "${target.reference_provider}"`,
      `purpose: "${target.reference_purpose}"`
    ], `${target.source_key} reconciliation target`);
  }
  assert.equal((reconciliationTargetBlock.match(/tableName:/g) ?? []).length, 2);
  assertIncludesAll(reconciliation, [
    "missing_reference_rows",
    "invalid_reference_rows",
    "prior_apply_receipt_sha256",
    "receipt_sha256",
    'mode === "APPLY"',
    'mode === "AUDIT"'
  ], "credential-reference reconciliation receipts");
  assertIncludesAll(reconciliationCli, [
    "ENTRAL_SECURE_JSON_PRIOR_APPLY_RECEIPT_SHA256",
    "Secure JSON apply mode is restricted to an explicit production reconciliation run.",
    'flag: "wx"'
  ], "credential reconciliation invocation boundary");
  assertIncludesAll(migration, inventory.credential_reference_targets.flatMap(({ release_blockers }) => release_blockers), "credential-reference release blockers");
  for (const target of inventory.credential_reference_targets) {
    assertIncludesAll(migration, [target.reference_column, target.reference_provider, target.reference_purpose], `${target.source_key} blocker binding`);
  }

  assertIncludesAll(identityContract, [
    "export interface SecretReferenceDescriptor",
    "readonly secret_reference_id",
    "readonly key_version",
    "readonly last_four"
  ], "secret descriptor contract");
  const descriptorSelect = /const descriptorSelect = \{([\s\S]*?)\n\}\s+as const;/.exec(broker)?.[1];
  assert.ok(descriptorSelect, "secret broker descriptor selection is missing");
  assert.doesNotMatch(descriptorSelect, /encryptedValue|secretValue|ciphertext/);
  assert.match(broker, /listSecretReferences[\s\S]*select:\s*descriptorSelect/);
  assert.doesNotMatch(support, /readSecretValue|readPersonalSecretValue|encryptedValue|secretValue/);
  assert.doesNotMatch(routes, /reply\.send\([^)]*(?:encryptedValue|secretValue)/s);
  assert.match(workspace, /function exportGraphData[\s\S]*activeProjection\.entities/);
  assert.doesNotMatch(workspace, /function exportGraphData[\s\S]{0,4000}(?:secretReference|encryptedValue|credentialJson)/i);
});

test("P202-F014-A support access is expiring, scoped, read-only by default, auditable, and passwordless", async () => {
  const [{ identityContract, migration, models }, support] = await Promise.all([
    sources,
    read("backend/src/services/phase202SupportAccess.ts")
  ]);
  assertModelFields(models, "SupportAccessGrant", ["tenantId", "supportActorId", "approvedByActorId", "purpose", "scopes", "accessMode", "ownerVisible", "issuedAt", "expiresAt", "revokedAt", "version"]);
  assertModelFields(models, "SupportAccessAudit", [
    "grantId", "tenantId", "actorId", "action", "targetType", "outcome", "requestId", "idempotencyKey",
    "requestFingerprint", "priorVersion", "resultingVersion", "resultPayload", "releaseVersion", "occurredAt"
  ]);
  assertIncludesAll(identityContract, [
    "export interface SupportAccessTransitionReceipt extends IdentityTransitionSideEffects",
    'readonly transition: "ISSUE_READ_ONLY" | "ELEVATE_WRITE" | "REVOKE"',
    'readonly access_mode: "READ_ONLY" | "WRITE_ELEVATED"',
    "readonly owner_visible: true",
    "readonly scopes",
    "readonly expires_at",
    "assertSupportAccessTransitionReceipt",
    "INVALID_SUPPORT_VERSION"
  ], "support access contract");
  assertIncludesAll(support, [
    "issueSupportAccess",
    'accessMode: "READ_ONLY"',
    "ownerVisible: true",
    "assertScopes(input.readScopes, \"read\")",
    "supportAccessAudit.create",
    "supportAccessAudit.findUnique",
    "IDEMPOTENCY_KEY_REUSED",
    "version: { increment: 1 }"
  ], "support access broker");
  assertIncludesAll(migration, [
    'CREATE TABLE "SupportAccessAudit"',
    'CHECK ("priorVersion">=0 AND "resultingVersion"="priorVersion"+1)',
    'CHECK ("releaseVersion"=\'phase-202\'',
    'CREATE TRIGGER "SupportAccessAudit_append_only"'
  ], "support access receipt migration");
  assert.doesNotMatch(support, /password|credentialJson|encryptedValue/i);
});

test("P202-F015-A write-capable support requires explicit recent step-up, allowlisted scope, purpose, expiry, and owner visibility", async () => {
  const [support, routes, integration] = await Promise.all([
    read("backend/src/services/phase202SupportAccess.ts"),
    read("backend/src/routes/phase202IdentityAuthority.ts"),
    read("backend/tests/phase202IdentityTenancyPostgres.integration.test.ts")
  ]);
  assertIncludesAll(support, [
    "elevateSupportAccess",
    "sessionId: string",
    "transaction.authSession.findFirst",
    "accountSessionVersion: true",
    "stepUpAt: true",
    "session.accountSessionVersion === session.User.sessionVersion",
    "stepUpAt <= now.getTime()",
    "env.MFA_STEP_UP_TTL_SECONDS",
    "assertPurpose(input.purpose)",
    'assertScopes(input.writeScopes, "write")',
    'accessMode: "WRITE_ELEVATED"',
    "const normalizedPurpose = input.purpose.trim()",
    "writeElevationPurpose: normalizedPurpose",
    "writeElevationExpiresAt: input.expiresAt",
    'transition: "ELEVATE_WRITE"',
    "persistSupportReceipt(transaction, identity, fingerprint, receipt)"
  ], "support elevation broker");
  assertIncludesAll(routes, [
    "sessionId: currentUser.sessionId",
    'app.post("/identity/support-access/:grantId/elevate"'
  ], "support elevation route");
  assertIncludesAll(integration, [
    "keeps support read-only by default, requires explicit allowlisted elevation, and expires closed",
    "issues owner-visible read-only support, gates write elevation, expires write closed, and retains immutable audit snapshots",
    "RECENT_MFA_STEP_UP_REQUIRED",
    "writeElevationExpiresAt",
    "ownerVisible"
  ], "live support boundary test");
});

test("P202-F016-A tenant-aware limits, audit context, and export/deidentification boundaries use authenticated scope", async () => {
  const [{ migration, models, roles }, support, routes, account, privacy, accountTests, workspace] = await Promise.all([
    sources,
    read("backend/src/services/phase202SupportAccess.ts"),
    read("backend/src/routes/phase202IdentityAuthority.ts"),
    read("backend/src/routes/account.ts"),
    read("backend/src/services/privacy.ts"),
    read("backend/tests/phase202AccountRoutes.test.ts"),
    read("frontend/components/CanonicalGraphWorkspace.tsx")
  ]);
  assertModelFields(models, "TenantRateLimitWindow", ["organizationId", "tenantId", "bucket", "windowStartedAt", "requestCount", "limit"]);
  assertModelFields(models, "TenantRateLimitReceipt", ["organizationId", "tenantId", "actorId", "bucket", "requestCount", "limit", "blocked", "requestId"]);
  assertIncludesAll(support, [
    "consumeTenantRateLimit",
    "TENANT_RATE_LIMIT_SCOPE_MISMATCH",
    "tenantRateLimitReceipt.create"
  ], "tenant rate-limit service");
  assertIncludesAll(routes, [
    "tenantRateLimitPolicies",
    'tenantRateLimitPolicies["account-security-read"]',
    "currentUser.tenantId",
    "TENANT_RATE_LIMIT_EXCEEDED"
  ], "tenant rate-limit route");
  assertIncludesAll(account, [
    'app.get("/account/export"',
    "sessionType: currentUser.session",
    "tenantId: currentUser.tenantId",
    'app.delete("/account"',
    "durableRecentStepUp(currentUser)",
    "sessionId: currentUser.sessionId!",
    "idempotencyKey(request)",
    "deidentifyAccount({",
    'tenant_records: "RETAINED"'
  ], "authenticated export and deidentification routes");
  assert.doesNotMatch(account, /account\.deletion_confirmed|deleteAccountAndWorkspace|Account and personal workspace data deleted/);
  assertIncludesAll(privacy, [
    "withTenantSession(database",
    'kind: "TENANT"',
    "secret_material_included: false",
    "phase202_prepare_account_deidentification",
    "phase202_complete_account_deidentification",
    "requireSensitiveAccountAuthority",
    'outcome: "ACCOUNT_DEIDENTIFIED"',
    'tenant_records: "RETAINED"',
    'retry_semantics: "TERMINAL_SESSION_REVOCATION"'
  ], "tenant-bound export and atomic deidentification service");
  assert.doesNotMatch(privacy, /parseSecureJson|team\.delete|task\.delete|user\.delete|deleteAccountAndWorkspace/);
  assertModelFields(models, "User", ["deletedAt", "deletionVersion"]);
  assertModelFields(models, "AccountDeidentificationReceipt", [
    "userId", "actorId", "requestId", "idempotencyKey", "outcome",
    "erasedFieldClasses", "retainedEvidenceClasses", "membershipReceiptIds", "receiptHash", "occurredAt"
  ]);
  assertIncludesAll(migration, [
    "phase202_prepare_account_deidentification",
    "phase202_complete_account_deidentification",
    "LAST_ACTIVE_OWNER_REQUIRED",
    "p_step_up_ttl_seconds integer",
    "make_interval(secs=>p_step_up_ttl_seconds)",
    'assignment."actorId"=current_actor_id AND assignment."status"<>\'REVOKED\'',
    "AccountDeidentificationReceipt_append_only",
    "Authenticated application subject does not exist or is deidentified",
    "DEIDENTIFIED_ACCOUNT_RECEIPT_MISSING"
  ], "database deidentification boundary");
  assertIncludesAll(roles, [
    'public."AccountDeidentificationReceipt"',
    "phase202_prepare_account_deidentification(uuid,integer,text,text)",
    "phase202_complete_account_deidentification(uuid,integer,text,text,uuid[],uuid[],uuid[],uuid[],text[],text[],text)"
  ], "deidentification least-privilege grants");
  assertIncludesAll(accountTests, [
    "requires a non-future recent step-up before sensitive export",
    "database no longer has an active MFA factor",
    "preserves the canonical last-owner conflict"
  ], "account route negative tests");
  assertIncludesAll(workspace, [
    "function exportGraphData",
    "organization_id: activeOrganizationId",
    "activeProjection.entities",
    "activeProjection.edges"
  ], "tenant-scoped graph export");
});

test("P202-F017-A critical tenant tables use database RLS and named least-privilege runtime grants", async () => {
  const { migration, roles } = await sources;
  const rlsTables = new Set(parseSqlTextArray(migration, "tenant_tables").flat());
  for (const table of [
    "Team", "BusinessBoundary", "AutonomyEnvelopeRecord", "MembershipInvitation",
    "SecretReference", "NotificationDeliveryOutbox", "SupportAccessGrant",
    "TenantRateLimitWindow", "AiUsageEvent", "AutomationJob", "Conversation", "Message"
  ]) assert.ok(rlsTables.has(table), `${table} must be in the tenant RLS inventory`);
  assertIncludesAll(migration, [
    'ALTER TABLE "User" ENABLE ROW LEVEL SECURITY',
    "phase202_personal_user_mutation_allows",
    'ALTER TABLE "MfaMutationReceipt" ENABLE ROW LEVEL SECURITY',
    'CREATE POLICY "phase202_personal_mfa_receipt_select"',
    'CREATE POLICY "phase202_personal_mfa_receipt_insert"',
    "ALTER TABLE %I ENABLE ROW LEVEL SECURITY",
    "phase202_tenant_access_allows",
    "phase202_personal_actor_access_allows",
    'ALTER TABLE "CustomerRecordOwnership" ENABLE ROW LEVEL SECURITY'
  ], "Phase 202 RLS migration");
  assertIncludesAll(roles, [
    "REVOKE ALL ON ALL TABLES IN SCHEMA public",
    "REVOKE ALL ON ALL SEQUENCES IN SCHEMA public",
    "REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public",
    "ALTER DEFAULT PRIVILEGES IN SCHEMA public",
    "FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier"
  ], "Phase 202 least-privilege role reconciliation");
  const migrationFunctions = phase202Functions(migration);
  const deniedFunctions = new Set(
    [...roles.matchAll(/entral\.(phase202_[a-z0-9_]+)\s*\(/gmi)].map((match) => match[1])
  );
  for (const functionName of migrationFunctions) {
    assert.ok(deniedFunctions.has(functionName), `${functionName} must be explicitly reconciled by 048`);
  }
  assert.doesNotMatch(roles, /GRANT\s+(?:ALL|EXECUTE)[\s\S]*?\bTO\s+PUBLIC\b/i);
});

test("P202-F018-A legacy ownership uses exhaustive APPLY then independent AUDIT receipts with repair and rollback evidence", async () => {
  const [{ models }, runner, runnerTests, runbook] = await Promise.all([
    sources,
    read("scripts/phase202-ownership-reconcile.mjs"),
    read("scripts/phase202-ownership-reconcile.test.mjs"),
    read("docs/PHASE_202_OWNERSHIP_RECONCILIATION.md")
  ]);
  assertModelFields(models, "OwnershipReconciliationRun", [
    "mode", "sourceInventoryHash", "sourceRows", "mappedRows", "duplicateRows",
    "ambiguousRows", "missingRows", "repairPlanReference", "rollbackReference",
    "receiptHash", "completedAt"
  ]);
  assertIncludesAll(runner, [
    "PHASE202_SOURCE_TABLES",
    "buildSourceMetricsSql",
    "buildSidecarMetricsSql",
    "aggregateReconciliationCounts",
    "phase202_live_source_inventory_hash",
    "phase202_live_ownership_blockers",
    "phase202_reconciliation_hash",
    "priorApplyReceiptHash",
    'mode === "AUDIT"'
  ], "ownership reconciliation runner");
  assertIncludesAll(runnerTests, [
    "fails closed on incomplete coverage and non-exhaustive source classification",
    "requires the retained clean APPLY hash for a separate AUDIT invocation"
  ], "ownership reconciliation negative tests");
  assertIncludesAll(runbook, [
    "a clean `APPLY` receipt exists",
    "later, separately invoked `AUDIT`",
    "repository@40-character-commit:path",
    "5c2f9d58c25dec82d4c3102f3b48a76797801594"
  ], "ownership reconciliation runbook");
});

test("P202-F019-A classifies and gates every cross-tenant API, job, event, search, export, and model/tool-context surface", async () => {
  const [{ migration, openApi }, postgresTest, workerTest, memberRoutes, memberTests, graphWorkspace] = await Promise.all([
    sources,
    read("backend/tests/phase202IdentityTenancyPostgres.integration.test.ts"),
    read("backend/tests/phase202TenantWorker.integration.test.ts"),
    read("backend/src/routes/member.ts"),
    read("backend/tests/memberRoutes.test.ts"),
    read("frontend/components/CanonicalGraphWorkspace.tsx")
  ]);
  const surfaceInventory = [
    {
      surface: "API",
      classification: "APPLICABLE",
      sources: [postgresTest, memberTests],
      bindings: ["prevents cross-tenant enumeration and mutation", "rejects cross-tenant identifiers before any organization data query"]
    },
    {
      surface: "BACKGROUND_JOB",
      classification: "APPLICABLE",
      sources: [workerTest, migration],
      bindings: ["binds worker authority to the real SERVICE actor and grant and fails closed otherwise", "phase202_worker_access_allows"]
    },
    {
      surface: "EVENT",
      classification: "APPLICABLE",
      sources: [memberRoutes, memberTests, migration],
      bindings: ['/member/organizations/:organizationId/events', "serves the RLS-scoped canonical portfolio and event cursor", "AiUsageEvent"]
    },
    {
      surface: "SEARCH",
      classification: "APPLICABLE_DERIVED_FROM_TENANT_SCOPED_PROJECTION",
      sources: [graphWorkspace, postgresTest],
      bindings: ["visibleGraphEntityIds(rendererProjection", "keeps canonical graph lineage tenant-bound for reads and writes"]
    },
    {
      surface: "EXPORT",
      classification: "APPLICABLE_DERIVED_FROM_TENANT_SCOPED_PROJECTION",
      sources: [graphWorkspace, postgresTest],
      bindings: ["function exportGraphData", "activeProjection.entities", "keeps canonical graph lineage tenant-bound for reads and writes"]
    },
    {
      surface: "MODEL_TOOL_CONTEXT",
      classification: "APPLICABLE",
      sources: [memberRoutes, memberTests, migration],
      bindings: ["Resolve canonical context for the member ENTRAL assistant", "rejects a graph entity hint that is outside the server-resolved member hierarchy", "Conversation"]
    }
  ];
  assert.deepEqual(surfaceInventory.map(({ surface }) => surface), [
    "API", "BACKGROUND_JOB", "EVENT", "SEARCH", "EXPORT", "MODEL_TOOL_CONTEXT"
  ]);
  for (const entry of surfaceInventory) {
    assert.match(entry.classification, /^APPLICABLE(?:_|$)/, `${entry.surface} classification must be explicit`);
    const combined = entry.sources.join("\n");
    assertIncludesAll(combined, entry.bindings, `${entry.surface} cross-tenant evidence`);
  }
  assert.ok(openApi.paths["/api/v1/member/organizations/{organizationId}/events"]);
  assert.ok(openApi.paths["/api/v1/member/organizations/{organizationId}/entral/assistant/messages"]);
});

test("P202-F020-A release blockers fail closed on ambiguous ownership or invalid credentials and exclude Phase 203 implementation", async () => {
  const { migration, phaseContract } = await sources;
  assertIncludesAll(migration, [
    "CREATE VIEW entral.phase202_release_blockers",
    "OWNERSHIP_APPLY_AUDIT_PAIR_MISSING",
    "OWNERSHIP_APPLY_FAILED",
    "OWNERSHIP_RECONCILIATION_FAILED",
    "OWNERSHIP_COLUMNS_MISSING",
    "OWNERSHIP_SIDECAR_MISSING_OR_MISMATCHED",
    "OWNERSHIP_SIDECAR_REVERSE_ORPHAN",
    "OWNERSHIP_SIDECAR_UNKNOWN_SOURCE",
    "CANONICAL_BUSINESS_MAPPING_INVALID",
    "INVALID_SECRET_REFERENCE",
    "INVALID_PERSONAL_SECRET_REFERENCE",
    "LEGACY_SHOPIFY_CONNECTION_CREDENTIAL",
    "LEGACY_SHOPIFY_OAUTH_CONTINUATION_CREDENTIAL",
    "MISSING_SHOPIFY_CONNECTION_CREDENTIAL_REFERENCE",
    "MISSING_SHOPIFY_OAUTH_CONTINUATION_CREDENTIAL_REFERENCE",
    "INVALID_SHOPIFY_CONNECTION_CREDENTIAL_REFERENCE",
    "INVALID_SHOPIFY_OAUTH_CONTINUATION_CREDENTIAL_REFERENCE"
  ], "Phase 202 release blocker view");
  assert.ok(phaseContract.out_of_scope.includes("PHASE_203_OR_LATER_IMPLEMENTATION"));
  assert.ok(phaseContract.out_of_scope.includes("MOCK_SAMPLE_PLACEHOLDER_FAKE_METRIC_NO_OP_OR_PRODUCTION_FALLBACK"));

  const productionRoots = ["backend/src", "frontend/app", "frontend/components", "packages/contracts/src"];
  const productionFiles = (await Promise.all(productionRoots.map(walkFiles))).flat();
  assert.equal(productionFiles.some((path) => /phase[_-]?203/i.test(path)), false);
  const phase202ProductionFiles = productionFiles.filter((path) =>
    /phase202/i.test(path)
    || /Account(?:SecurityControls|InvitationAcceptance)\.tsx$/.test(path)
    || /member\/invitations\/accept\/page\.tsx$/.test(path)
    || /api\/member\/invitations\/(?:accept|signup)\/route\.ts$/.test(path)
  );
  assert.ok(phase202ProductionFiles.length >= 10, "Phase 202 production implementation inventory is unexpectedly small");
  const productionSource = (await Promise.all(phase202ProductionFiles.map(read))).join("\n");
  assert.doesNotMatch(productionSource, /\b(?:mockImplementation|mockResolvedValue|sampleBacked|fakeMetric|noOpControl|staticGraphReplacement|plaintextFallback)\b/i);
  assert.doesNotMatch(productionSource, /\bP203-F\d{3}\b|phase[_-]?203/i);
});
