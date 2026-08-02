import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Prisma, PrismaClient } from "@prisma/client";
import { assertSupportSessionReadback } from "@entral/contracts";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NODE_ENV ??= "test";
  process.env.DATABASE_URL ??= "file:./phase202-identity-tenancy-skipped.db";
  process.env.JWT_SECRET ??= "phase202-identity-tenancy-test-secret";
});

import { verifyAuthToken } from "../src/auth.js";
import {
  withPersonalSession,
  withPreAuthEmailSession,
  withRecoveryTokenSession,
  withSupportSession,
  withTenantSession
} from "../src/db.js";
import { recordAuditLog } from "../src/services/audit.js";
import { CanonicalControlPlaneRepository } from "../src/services/canonicalControlPlane.js";
import { createAutonomyEnvelope } from "../src/services/phase202IdentityAuthority.js";
import {
  recordPhase202ShopifyOAuthCallbackAudit,
  resolvePhase202ShopifyOAuthCallbackStore
} from "../src/services/phase202ShopifyOAuthCallback.js";
import { transitionMember } from "../src/services/phase202Membership.js";
import {
  issueDurableSession,
  listSessions,
  readSupportSession,
  revokeAllSessions,
  revokeSession,
  rotateRefreshCredential
} from "../src/services/phase202SessionBroker.js";
import {
  consumeTenantRateLimit,
  elevateSupportAccess,
  issueSupportAccess,
  listSupportAccess,
  revokeSupportAccess
} from "../src/services/phase202SupportAccess.js";
import {
  listSupportTasks,
  updateSupportTaskStatus
} from "../src/services/phase202SupportOperations.js";
import { buildAccountExport } from "../src/services/privacy.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(
  testDatabaseUrl
  && process.env.RUN_POSTGRES_INTEGRATION === "1"
);

function runPrisma(
  prismaCli: string,
  repositoryRoot: string,
  databaseUrl: string,
  args: string[],
  operation: string
) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
  if (result.status !== 0) {
    throw new Error(`${operation} failed: ${result.stderr || result.stdout}`);
  }
}

function loginUrl(databaseUrl: URL, role: string, password: string) {
  const url = new URL(databaseUrl);
  url.username = role;
  url.password = password;
  url.searchParams.set("connection_limit", "4");
  return url.toString();
}

type TenantFixture = {
  actorId: string;
  businessBoundaryId: string;
  businessId: string;
  commanderId: string;
  customerOwnershipId: string;
  evidenceId: string;
  generalId: string;
  grantId: string;
  invitationId: string;
  invitationNotificationId: string;
  marshalId: string;
  membershipNotificationId: string;
  membershipReceiptId: string;
  organizationId: string;
  secretId: string;
  sessionId: string;
  taskId: string;
  teamId: string;
  tenantId: string;
  userId: string;
};

const suffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
const databaseName = `entral_p202_tenant_${suffix}`;
const apiRole = `entral_p202_tenant_api_${suffix}`;
const apiPassword = randomUUID();
const rootEntityId = randomUUID();
const supportUserId = `phase202-support-${suffix}`;
const supportActorId = randomUUID();
const supportAppUserId = randomUUID();
const inviteeUserId = `phase202-invitee-${suffix}`;
const inviteeActorId = randomUUID();
const inviteeAppUserId = randomUUID();
const wrongInviteeUserId = `phase202-wrong-invitee-${suffix}`;
const wrongInviteeActorId = randomUUID();
const wrongInviteeAppUserId = randomUUID();
const invitationTokenHash = `phase202-invitation-token-${suffix}`;
const conversationAId = `phase202-conversation-a-${suffix}`;
const conversationBId = `phase202-conversation-b-${suffix}`;
const mfaActorId = randomUUID();
const mfaAppUserId = randomUUID();
const mfaSessionAuditId = `phase202-mfa-session-audit-${suffix}`;
const mfaSessionId = randomUUID();
const mfaUserId = `phase202-mfa-${suffix}`;
const privacyMfaFactorId = randomUUID();
const privacySecretId = randomUUID();
const successorActorId = randomUUID();
const successorAppUserId = randomUUID();
const successorUserId = `phase202-successor-${suffix}`;
const lifecycleAdminActorId = randomUUID();
const lifecycleAdminAppUserId = randomUUID();
const lifecycleAdminUserId = `phase202-lifecycle-admin-${suffix}`;
const lifecycleMemberActorId = randomUUID();
const lifecycleMemberAppUserId = randomUUID();
const lifecycleMemberUserId = `phase202-lifecycle-member-${suffix}`;
const tenantAEmail = `phase202-owner-a-${suffix}@example.test`;
const tenantBEmail = `phase202-owner-b-${suffix}@example.test`;
const verificationHashA = createHash("sha256").update(`verify-a-${suffix}`).digest("hex");
const verificationHashB = createHash("sha256").update(`verify-b-${suffix}`).digest("hex");
const verificationExpiredHashA = createHash("sha256").update(`verify-expired-a-${suffix}`).digest("hex");
const resetHashA = createHash("sha256").update(`reset-a-${suffix}`).digest("hex");
const resetSiblingHashA = createHash("sha256").update(`reset-a-sibling-${suffix}`).digest("hex");
const resetHashB = createHash("sha256").update(`reset-b-${suffix}`).digest("hex");

function tenant(label: "a" | "b"): TenantFixture {
  return {
    actorId: randomUUID(),
    businessBoundaryId: randomUUID(),
    businessId: randomUUID(),
    commanderId: randomUUID(),
    customerOwnershipId: randomUUID(),
    evidenceId: randomUUID(),
    generalId: randomUUID(),
    grantId: randomUUID(),
    invitationId: randomUUID(),
    invitationNotificationId: randomUUID(),
    marshalId: randomUUID(),
    membershipNotificationId: randomUUID(),
    membershipReceiptId: randomUUID(),
    organizationId: randomUUID(),
    secretId: randomUUID(),
    sessionId: randomUUID(),
    taskId: `phase202-task-${label}-${suffix}`,
    teamId: `phase202-team-${label}-${suffix}`,
    tenantId: randomUUID(),
    userId: `phase202-owner-${label}-${suffix}`
  };
}

const tenantA = tenant("a");
const tenantB = tenant("b");

let admin: PrismaClient | null = null;
let owner: PrismaClient | null = null;
let api: PrismaClient | null = null;
let databaseCreated = false;
let apiRoleCreated = false;
let isolatedApiDatabaseUrl: string | null = null;

function secretEnvelope() {
  return JSON.stringify({
    __entralEncrypted: true,
    alg: "aes-256-gcm",
    data: "integration-ciphertext",
    environment: "PRODUCTION",
    iv: "integration-iv",
    keyVersion: "integration-v1",
    tag: "integration-tag",
    v: 2
  });
}

async function tenantSession<T>(
  fixture: TenantFixture,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  authSubject = fixture.userId
) {
  if (!api) throw new Error("Phase 202 disposable API client is unavailable.");
  return withTenantSession(api, {
    actionReason: "Phase 202 isolated PostgreSQL integration verification.",
    authSubject,
    requestId: randomUUID(),
    tenantId: fixture.tenantId
  }, operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function withExactSupportSession<T>(
  fixture: TenantFixture,
  supportGrantId: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  if (!api) throw new Error("Phase 202 disposable API client is unavailable.");
  return withSupportSession(api, {
    actionReason: "Phase 202 exact-grant support integration verification.",
    authSubject: supportUserId,
    requestId: randomUUID(),
    supportGrantId
  }, async (transaction, identity) => {
    expect(identity.tenantId).toBe(fixture.tenantId);
    expect(identity.organizationId).toBe(fixture.organizationId);
    return operation(transaction);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function provisionTenant(fixture: TenantFixture, label: string) {
  if (!owner) throw new Error("Phase 202 disposable owner client is unavailable.");
  await owner.$queryRaw`
    SELECT * FROM entral.phase202_provision_tenant_owner(
      ${fixture.userId},
      ${`Phase 202 Owner ${label}`},
      ${label === "A" ? tenantAEmail : tenantBEmail},
      'integration-password-hash',
      ${fixture.teamId},
      ${`Phase 202 Tenant ${label}`},
      ${`phase202-tenant-${label}-${suffix}`},
      ${fixture.organizationId}::uuid,
      ${fixture.tenantId}::uuid,
      ${fixture.actorId}::uuid
    )
  `;
}

async function seedCanonicalGraph(fixture: TenantFixture, label: string) {
  if (!owner) throw new Error("Phase 202 disposable owner client is unavailable.");
  await owner.$executeRaw`
    INSERT INTO entral.entities (id,stable_code,role,name,parent_id,status)
    VALUES
      (${fixture.marshalId}::uuid,${`p202-${label}-marshal-${suffix}`},'MARSHAL',${`Marshal ${label}`},${rootEntityId}::uuid,'ACTIVE'),
      (${fixture.generalId}::uuid,${`p202-${label}-general-${suffix}`},'GENERAL',${`General ${label}`},${fixture.marshalId}::uuid,'ACTIVE'),
      (${fixture.commanderId}::uuid,${`p202-${label}-commander-${suffix}`},'COMMANDER',${`Commander ${label}`},${fixture.generalId}::uuid,'ACTIVE')
  `;
  await owner.$executeRaw`
    INSERT INTO entral.businesses (
      id,stable_code,name,commander_id,general_id,marshal_id,status
    ) VALUES (
      ${fixture.businessId}::uuid,${`p202-${label}-business-${suffix}`},
      ${`Business ${label}`},${fixture.commanderId}::uuid,
      ${fixture.generalId}::uuid,${fixture.marshalId}::uuid,'OPERATING'
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."BusinessBoundary" (
      "id","organizationId","tenantId","canonicalBusinessId","stableCode",
      "environment","dataResidency","status"
    ) VALUES (
      ${fixture.businessBoundaryId}::uuid,${fixture.organizationId}::uuid,
      ${fixture.tenantId}::uuid,${fixture.businessId}::uuid,
      ${`p202-${label}-boundary-${suffix}`},'PRODUCTION','US','ACTIVE'
    )
  `;
  await owner.$executeRaw`
    INSERT INTO entral.scope_grants (user_id,scope_type,scope_id,permissions)
    SELECT canonical_user.id,'BUSINESS',${fixture.businessId}::uuid,
           ARRAY['read','manage','read_events']::text[]
    FROM entral.app_users canonical_user
    WHERE canonical_user.auth_subject=${fixture.userId}
  `;
}

async function seedTenantRecords(fixture: TenantFixture, label: string) {
  if (!owner) throw new Error("Phase 202 disposable owner client is unavailable.");
  const sessionAuditId = `phase202-session-audit-${label}-${suffix}`;
  await owner.$executeRaw`
    INSERT INTO public."AuditLog" (
      "id","actorUserId","action","targetType","targetId","outcome","severity","entryJson","entryHash"
    ) VALUES (
      ${sessionAuditId},${fixture.userId},'auth.session.issued','auth_session',${fixture.sessionId},
      'success','medium','{}',${"a".repeat(64)}
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."AuthSession" (
      "id","userId","actorId","organizationId","tenantId","sessionType",
      "accessTokenId","accountSessionVersion","refreshVersion","deviceLabel",
      "userAgentHash","ipAddressHash","expiresAt","auditProvenanceId","updatedAt"
    ) VALUES (
      ${fixture.sessionId}::uuid,${fixture.userId},${fixture.actorId}::uuid,
      ${fixture.organizationId}::uuid,${fixture.tenantId}::uuid,'MEMBER',
      ${randomUUID()}::uuid,0,1,${`Device ${label}`},
      ${`agent-hash-${label}`},${`ip-hash-${label}`},now()+interval '1 day',${sessionAuditId},now()
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."SecretReference" (
      "id","organizationId","tenantId","provider","purpose","environment",
      "keyVersion","encryptedValue","version","createdByActorId","updatedAt"
    ) VALUES (
      ${fixture.secretId}::uuid,${fixture.organizationId}::uuid,
      ${fixture.tenantId}::uuid,'integration',${`tenant-${label}`},'PRODUCTION',
      'integration-v1',${secretEnvelope()},1,${fixture.actorId}::uuid,now()
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."NotificationEvidence" (
      "id","organizationId","tenantId","channel","recipientHash",
      "templateId","status","occurredAt"
    ) VALUES
      (
        ${fixture.membershipNotificationId}::uuid,${fixture.organizationId}::uuid,
        ${fixture.tenantId}::uuid,'IN_APP',${`member-${label}`},
        'phase202-integration-membership','RECORDED',now()
      ),
      (
        ${fixture.invitationNotificationId}::uuid,${fixture.organizationId}::uuid,
        ${fixture.tenantId}::uuid,'EMAIL',${`invite-${label}`},
        'phase202-integration-invitation','PENDING',now()
      )
  `;
  await owner.$executeRaw`
    INSERT INTO public."MembershipMutationReceipt" (
      "id","organizationId","tenantId","actorId","subjectUserId","action",
      "priorVersion","resultingVersion","idempotencyKey","requestFingerprint","requestId",
      "notificationEvidenceId","resultPayload"
    ) VALUES (
      ${fixture.membershipReceiptId}::uuid,${fixture.organizationId}::uuid,
      ${fixture.tenantId}::uuid,${fixture.actorId}::uuid,${fixture.userId},'ROLE_CHANGE',
      1,2,${`membership-${label}-${suffix}`},${createHash("sha256").update(`membership-${label}-${suffix}`).digest("hex")},${randomUUID()},
      ${fixture.membershipNotificationId}::uuid,
      ${JSON.stringify({ tenant: label, transition: "ROLE_CHANGE" })}::jsonb
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."SecretAccessAudit" (
      "id","secretReferenceId","organizationId","tenantId","actorId",
      "action","purpose","outcome","requestId"
    ) VALUES (
      ${fixture.evidenceId}::uuid,${fixture.secretId}::uuid,
      ${fixture.organizationId}::uuid,${fixture.tenantId}::uuid,
      ${fixture.actorId}::uuid,'READ','integration isolation','SUCCEEDED',${randomUUID()}
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."Task" (
      "id","organizationId","tenantId","actorId","createdByActorId","ownedBy",
      "title","status","teamId","createdById","updatedAt"
    ) VALUES (
      ${fixture.taskId},${fixture.organizationId}::uuid,${fixture.tenantId}::uuid,
      ${fixture.actorId}::uuid,${fixture.actorId}::uuid,${fixture.actorId}::uuid,
      ${`Tenant ${label} task`},'TODO',${fixture.teamId},${fixture.userId},now()
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."CustomerRecordOwnership" (
      "id","sourceTable","sourceRecordId","organizationId","tenantId",
      "actorId","createdBy","ownedBy","mappingStrategy","sourceUserId"
    ) VALUES (
      ${fixture.customerOwnershipId}::uuid,'IntegrationCustomer',${`customer-${label}-${suffix}`},
      ${fixture.organizationId}::uuid,${fixture.tenantId}::uuid,
      ${fixture.actorId}::uuid,${fixture.actorId}::uuid,${fixture.actorId}::uuid,
      'INTEGRATION_FIXTURE',${fixture.userId}
    )
  `;
}

async function createHumanIdentity(input: {
  actorId: string;
  appUserId: string;
  email: string;
  name: string;
  userId: string;
}) {
  if (!owner) throw new Error("Phase 202 disposable owner client is unavailable.");
  await owner.$executeRaw`
    INSERT INTO public."User" (
      "id","name","email","passwordHash","role","internalAccess",
      "sessionVersion","createdAt","updatedAt"
    ) VALUES (
      ${input.userId},${input.name},${input.email},'integration-password-hash',
      'USER',false,0,now(),now()
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."IdentityActor" ("id","actorType","humanUserId","status")
    VALUES (${input.actorId}::uuid,'HUMAN',${input.userId},'ACTIVE')
  `;
  await owner.$executeRaw`
    INSERT INTO entral.app_users (
      id,email,display_name,is_human_authority,is_active,auth_subject,auth_link_eligible
    ) VALUES (
      ${input.appUserId}::uuid,${input.email},${input.name},false,true,${input.userId},false
    )
  `;
}

async function seedOwnerPrivacyAuthority() {
  if (!owner) throw new Error("Phase 202 disposable owner client is unavailable.");
  await owner.$executeRaw`
    UPDATE public."AuthSession"
    SET "stepUpAt"=now(),"updatedAt"=now()
    WHERE "id"=${tenantA.sessionId}::uuid
  `;
  await owner.$executeRaw`
    INSERT INTO public."PersonalSecretReference" (
      "id","actorId","provider","purpose","environment","keyVersion","encryptedValue","updatedAt"
    ) VALUES (
      ${privacySecretId}::uuid,${tenantA.actorId}::uuid,'internal','mfa-totp','PRODUCTION',
      'integration-v1',${secretEnvelope()},now()
    ) ON CONFLICT ("id") DO NOTHING
  `;
  await owner.$executeRaw`
    INSERT INTO public."MfaFactor" (
      "id","userId","actorId","factorType","secretReferenceId","status","verifiedAt","updatedAt"
    ) VALUES (
      ${privacyMfaFactorId}::uuid,${tenantA.userId},${tenantA.actorId}::uuid,
      'TOTP',${privacySecretId}::uuid,'ACTIVE',now(),now()
    ) ON CONFLICT ("id") DO UPDATE
      SET "status"='ACTIVE',"verifiedAt"=now(),"updatedAt"=now()
  `;
}

async function seedPersonalMfaAuthority() {
  if (!owner) throw new Error("Phase 202 disposable owner client is unavailable.");
  await createHumanIdentity({
    actorId: mfaActorId,
    appUserId: mfaAppUserId,
    email: `phase202-mfa-${suffix}@example.test`,
    name: "Phase 202 MFA Integration",
    userId: mfaUserId
  });
  await owner.$executeRaw`
    INSERT INTO public."AuditLog" (
      "id","actorUserId","action","targetType","targetId","outcome","severity","entryJson","entryHash"
    ) VALUES (
      ${mfaSessionAuditId},${mfaUserId},'auth.session.issued','auth_session',${mfaSessionId},
      'success','medium','{}',${"b".repeat(64)}
    )
  `;
  await owner.$executeRaw`
    INSERT INTO public."AuthSession" (
      "id","userId","actorId","sessionType","accessTokenId","accountSessionVersion",
      "refreshVersion","deviceLabel","userAgentHash","ipAddressHash","expiresAt",
      "auditProvenanceId","updatedAt"
    ) VALUES (
      ${mfaSessionId}::uuid,${mfaUserId},${mfaActorId}::uuid,'INTERNAL',${randomUUID()}::uuid,0,
      1,'MFA integration device','mfa-integration-agent','mfa-integration-ip',
      now()+interval '1 day',${mfaSessionAuditId},now()
    )
  `;
}

describe.skipIf(!integrationEnabled)("Phase 202 identity and tenancy PostgreSQL boundary", () => {
beforeAll(async () => {
  const baseUrl = new URL(testDatabaseUrl!);
  if (!baseUrl.protocol.startsWith("postgres")) {
    throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
  }
  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = "/postgres";
  adminUrl.searchParams.delete("schema");
  const isolatedUrl = new URL(baseUrl);
  isolatedUrl.pathname = `/${databaseName}`;
  isolatedUrl.searchParams.delete("schema");
  admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
  const prismaCli = fileURLToPath(
    new URL("../../node_modules/prisma/build/index.js", import.meta.url)
  );
  runPrisma(
    prismaCli,
    repositoryRoot,
    isolatedUrl.toString(),
    ["migrate", "deploy", "--schema", "prisma/schema.prisma"],
    "Phase 202 identity/tenancy disposable migration"
  );
  for (const securityFile of [
    "prisma/security/046_roles_and_grants.sql",
    "prisma/security/047_phase_195_roles_and_grants.sql",
    "prisma/security/048_phase_202_roles_and_grants.sql"
  ]) {
    runPrisma(
      prismaCli,
      repositoryRoot,
      isolatedUrl.toString(),
      ["db", "execute", "--file", securityFile, "--schema", "prisma/schema.prisma"],
      `Phase 202 identity/tenancy role deployment (${securityFile})`
    );
  }
  await admin.$executeRawUnsafe(
    `CREATE ROLE "${apiRole}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS `
    + `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${apiPassword}'`
  );
  apiRoleCreated = true;
  await admin.$executeRawUnsafe(`GRANT entral_api TO "${apiRole}"`);

  owner = new PrismaClient({ datasources: { db: { url: isolatedUrl.toString() } } });
  api = new PrismaClient({
    datasources: { db: { url: loginUrl(isolatedUrl, apiRole, apiPassword) } }
  });
  isolatedApiDatabaseUrl = loginUrl(isolatedUrl, apiRole, apiPassword);
  await provisionTenant(tenantA, "A");
  await provisionTenant(tenantB, "B");
  await owner.$executeRaw`
    INSERT INTO entral.entities (id,stable_code,role,name,status)
    VALUES (${rootEntityId}::uuid,${`p202-entral-${suffix}`},'ENTRAL','ENTRAL','ACTIVE')
  `;
  await seedCanonicalGraph(tenantA, "a");
  await seedCanonicalGraph(tenantB, "b");
  await seedTenantRecords(tenantA, "a");
  await seedTenantRecords(tenantB, "b");

  await createHumanIdentity({
    actorId: supportActorId,
    appUserId: supportAppUserId,
    email: `phase202-support-${suffix}@example.test`,
    name: "Phase 202 Support",
    userId: supportUserId
  });
  await createHumanIdentity({
    actorId: inviteeActorId,
    appUserId: inviteeAppUserId,
    email: `phase202-invitee-${suffix}@example.test`,
    name: "Phase 202 Invitee",
    userId: inviteeUserId
  });
  await createHumanIdentity({
    actorId: wrongInviteeActorId,
    appUserId: wrongInviteeAppUserId,
    email: `phase202-wrong-invitee-${suffix}@example.test`,
    name: "Phase 202 Wrong Invitee",
    userId: wrongInviteeUserId
  });
  await seedPersonalMfaAuthority();

  await tenantSession(tenantA, async (transaction) => {
    await transaction.$queryRaw`
      SELECT entral.phase202_assign_support_actor(
        ${supportActorId}::uuid,${tenantA.tenantId}::uuid,${tenantA.organizationId}::uuid
      )
    `;
  });
  await tenantSession(tenantB, async (transaction) => {
    await transaction.$queryRaw`
      SELECT entral.phase202_assign_support_actor(
        ${supportActorId}::uuid,${tenantB.tenantId}::uuid,${tenantB.organizationId}::uuid
      )
    `;
  });
  await tenantSession(tenantA, async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO public."SupportAccessGrant" (
        "id","organizationId","tenantId","supportActorId","approvedByActorId",
        "purpose","scopes","accessMode","ownerVisible","issuedAt","expiresAt","updatedAt"
      ) VALUES (
        ${tenantA.grantId}::uuid,${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
        ${supportActorId}::uuid,${tenantA.actorId}::uuid,'bounded integration support',
        ARRAY['table:Team:read','table:Task:read','table:Task:write']::text[],'READ_ONLY',true,
        now()-interval '1 hour',now()+interval '1 hour',now()
      )
    `;
    await transaction.$executeRaw`
      INSERT INTO public."MembershipInvitation" (
        "id","organizationId","tenantId","email","role","status","tokenHash",
        "idempotencyKey","invitedByActorId","notificationEvidenceId","expiresAt","updatedAt"
      ) VALUES (
        ${tenantA.invitationId}::uuid,${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
        ${`phase202-invitee-${suffix}@example.test`},'MEMBER','PENDING',${invitationTokenHash},
        ${`invite-a-${suffix}`},${tenantA.actorId}::uuid,
        ${tenantA.invitationNotificationId}::uuid,now()+interval '1 day',now()
      )
    `;
  });
  await tenantSession(tenantB, async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO public."SupportAccessGrant" (
        "id","organizationId","tenantId","supportActorId","approvedByActorId",
        "purpose","scopes","accessMode","ownerVisible","issuedAt","expiresAt","updatedAt"
      ) VALUES (
        ${tenantB.grantId}::uuid,${tenantB.organizationId}::uuid,${tenantB.tenantId}::uuid,
        ${supportActorId}::uuid,${tenantB.actorId}::uuid,'tenant b integration support',
        ARRAY['table:Team:read']::text[],'READ_ONLY',true,
        now()-interval '1 hour',now()+interval '1 hour',now()
      )
    `;
  });
}, 180_000);

afterAll(async () => {
  await Promise.allSettled([api?.$disconnect(), owner?.$disconnect()].filter(Boolean) as Promise<void>[]);
  if (admin && databaseCreated) {
    await admin.$executeRawUnsafe(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity `
      + `WHERE datname='${databaseName}' AND pid<>pg_backend_pid()`
    );
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`);
  }
  if (admin && apiRoleCreated) {
    await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${apiRole}"`);
  }
  await admin?.$disconnect();
}, 60_000);

  it("resolves and audits an unauthenticated signed Shopify callback through the tenant-bound API role", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    const storeId = `phase202-oauth-callback-${suffix}`;
    await owner.clientMerchStore.create({
      data: {
        actorId: tenantA.actorId,
        audience: "Phase 202 integration audience",
        brandStyle: "Phase 202 integration brand",
        businessId: tenantA.businessBoundaryId,
        businessName: "Phase 202 OAuth Store",
        clientName: "Phase 202 OAuth Client",
        contactName: "Phase 202 OAuth Owner",
        createdBy: tenantA.actorId,
        email: tenantAEmail,
        id: storeId,
        industry: "Integration",
        organizationId: tenantA.organizationId,
        ownedBy: tenantA.actorId,
        storePlatform: "SHOPIFY",
        tenantId: tenantA.tenantId,
        userId: tenantA.userId
      }
    });
    const callbackPrincipal = {
      authSubject: tenantA.userId,
      requestId: randomUUID(),
      storeId,
      tenantId: tenantA.tenantId,
      userId: tenantA.userId
    };
    const store = await resolvePhase202ShopifyOAuthCallbackStore(callbackPrincipal, api);

    expect(store).toMatchObject({
      actorId: tenantA.actorId,
      id: storeId,
      organizationId: tenantA.organizationId,
      tenantId: tenantA.tenantId,
      userId: tenantA.userId
    });
    expect(store?.products).toEqual([]);

    const audit = await recordPhase202ShopifyOAuthCallbackAudit(callbackPrincipal, {
      action: "shopify.oauth.callback.integration_verified",
      actorUserId: tenantA.userId,
      outcome: "success",
      severity: "medium",
      targetId: storeId,
      targetType: "shopify_oauth"
    }, api);
    expect(audit).toMatchObject({
      action: "shopify.oauth.callback.integration_verified",
      actorId: tenantA.actorId,
      organizationId: tenantA.organizationId,
      tenantId: tenantA.tenantId
    });

    await expect(resolvePhase202ShopifyOAuthCallbackStore({
      ...callbackPrincipal,
      authSubject: tenantB.userId,
      userId: tenantB.userId
    }, api)).rejects.toThrow(/ACTIVE_TENANT_ASSIGNMENT_REQUIRED/);
    await expect(resolvePhase202ShopifyOAuthCallbackStore({
      ...callbackPrincipal,
      authSubject: tenantB.userId,
      tenantId: tenantB.tenantId,
      userId: tenantB.userId
    }, api)).resolves.toBeNull();
  });

  it("prevents cross-tenant enumeration and mutation of membership, sessions, secrets, support, and evidence", async () => {
    const observed = await tenantSession(tenantA, async (transaction) => {
      const memberships = await transaction.$queryRaw<Array<{ tenantId: string }>>`
        SELECT "tenantId"::text AS "tenantId" FROM public."TeamMember" ORDER BY "tenantId"
      `;
      const sessions = await transaction.$queryRaw<Array<{ tenantId: string }>>`
        SELECT "tenantId"::text AS "tenantId" FROM public."AuthSession" ORDER BY "tenantId"
      `;
      const secrets = await transaction.$queryRaw<Array<{ tenantId: string }>>`
        SELECT "tenantId"::text AS "tenantId" FROM public."SecretReference" ORDER BY "tenantId"
      `;
      const grants = await transaction.$queryRaw<Array<{ tenantId: string }>>`
        SELECT "tenantId"::text AS "tenantId" FROM public."SupportAccessGrant" ORDER BY "tenantId"
      `;
      const evidence = await transaction.$queryRaw<Array<{ tenantId: string }>>`
        SELECT "tenantId"::text AS "tenantId" FROM public."SecretAccessAudit" ORDER BY "tenantId"
      `;
      const membershipWrites = await transaction.$queryRaw<Array<{ userId: string }>>`
        UPDATE public."TeamMember" SET "role"='TENANT_ADMIN'
        WHERE "tenantId"=${tenantB.tenantId}::uuid RETURNING "userId"
      `;
      const sessionWrites = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."AuthSession" SET "revokeReason"='CROSS_TENANT_ATTEMPT'
        WHERE "tenantId"=${tenantB.tenantId}::uuid RETURNING "id"::text AS "id"
      `;
      const secretWrites = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."SecretReference" SET "purpose"='cross-tenant-attempt'
        WHERE "tenantId"=${tenantB.tenantId}::uuid RETURNING "id"::text AS "id"
      `;
      const supportWrites = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."SupportAccessGrant" SET "purpose"='cross-tenant-attempt'
        WHERE "tenantId"=${tenantB.tenantId}::uuid RETURNING "id"::text AS "id"
      `;
      return {
        evidence,
        grants,
        memberships,
        membershipWrites,
        secrets,
        secretWrites,
        sessions,
        sessionWrites,
        supportWrites
      };
    });

    for (const rows of [
      observed.memberships,
      observed.sessions,
      observed.secrets,
      observed.grants,
      observed.evidence
    ]) {
      expect(rows.length).toBeGreaterThan(0);
      expect(new Set(rows.map((row) => row.tenantId))).toEqual(new Set([tenantA.tenantId]));
    }
    expect(observed.membershipWrites).toEqual([]);
    expect(observed.sessionWrites).toEqual([]);
    expect(observed.secretWrites).toEqual([]);
    expect(observed.supportWrites).toEqual([]);
  });

  it("revokes member session families atomically across owner/admin lifecycle transitions and denies unrelated tenant sessions", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    await createHumanIdentity({
      actorId: lifecycleAdminActorId,
      appUserId: lifecycleAdminAppUserId,
      email: `phase202-lifecycle-admin-${suffix}@example.test`,
      name: "Phase 202 Lifecycle Admin",
      userId: lifecycleAdminUserId
    });
    await createHumanIdentity({
      actorId: lifecycleMemberActorId,
      appUserId: lifecycleMemberAppUserId,
      email: `phase202-lifecycle-member-${suffix}@example.test`,
      name: "Phase 202 Lifecycle Member",
      userId: lifecycleMemberUserId
    });
    await owner.$executeRaw`
      INSERT INTO public."TenantActorAssignment" (
        "actorId","organizationId","tenantId","role","authorityDomains","status","version","updatedAt"
      ) VALUES
        (
          ${lifecycleAdminActorId}::uuid,${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
          'TENANT_ADMIN',ARRAY['IDENTITY','TENANCY']::text[],'ACTIVE',1,now()
        ),
        (
          ${lifecycleMemberActorId}::uuid,${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
          'MEMBER',ARRAY['OPERATIONS']::text[],'ACTIVE',1,now()
        )
    `;
    await owner.$executeRaw`
      INSERT INTO public."TeamMember" (
        "userId","teamId","role","status","version","organizationId","tenantId",
        "actorId","createdBy","ownedBy","joinedAt","updatedAt"
      ) VALUES
        (
          ${lifecycleAdminUserId},${tenantA.teamId},'TENANT_ADMIN','ACTIVE',1,
          ${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
          ${lifecycleAdminActorId}::uuid,${tenantA.actorId}::uuid,${tenantA.actorId}::uuid,now(),now()
        ),
        (
          ${lifecycleMemberUserId},${tenantA.teamId},'MEMBER','ACTIVE',1,
          ${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
          ${lifecycleMemberActorId}::uuid,${tenantA.actorId}::uuid,${tenantA.actorId}::uuid,now(),now()
        )
    `;

    const lifecycleUser = await owner.user.findUniqueOrThrow({ where: { id: lifecycleMemberUserId } });
    const lifecycleSession = await issueDurableSession(lifecycleUser, "member", {
      ipAddress: "192.0.2.202",
      requestId: randomUUID(),
      requestedTenantId: tenantA.tenantId,
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/140.0"
    }, api);
    const lifecycleCredential = await owner.authRefreshCredential.findFirstOrThrow({
      where: { sessionId: lifecycleSession.sessionId }
    });

    await expect(tenantSession(tenantB, async (transaction) => transaction.$executeRaw`
      INSERT INTO public."AuthSession" (
        "id","userId","actorId","organizationId","tenantId","sessionType",
        "accessTokenId","accountSessionVersion","refreshVersion","deviceLabel",
        "userAgentHash","ipAddressHash","expiresAt","auditProvenanceId","updatedAt"
      ) VALUES (
        ${randomUUID()}::uuid,${lifecycleMemberUserId},${lifecycleMemberActorId}::uuid,
        ${tenantB.organizationId}::uuid,${tenantB.tenantId}::uuid,'MEMBER',
        ${randomUUID()}::uuid,0,1,'Unrelated tenant device','unrelated-agent','unrelated-ip',
        now()+interval '1 day',
        (SELECT "auditProvenanceId" FROM public."AuthSession" WHERE "id"=${tenantB.sessionId}::uuid),now()
      )
    `)).rejects.toThrow();
    expect(await owner.authSession.count({
      where: {
        actorId: lifecycleMemberActorId,
        tenantId: tenantB.tenantId
      }
    })).toBe(0);

    const deniedInput = {
      action: "SUSPEND" as const,
      authSubject: lifecycleMemberUserId,
      idempotencyKey: `membership-unauthorized-${suffix}`,
      requestId: randomUUID(),
      subjectUserId: lifecycleAdminUserId,
      tenantId: tenantA.tenantId
    };
    await expect(transitionMember(deniedInput, api)).rejects.toThrow(/MEMBERSHIP_ADMIN_REQUIRED/u);
    await expect(transitionMember({
      ...deniedInput,
      authSubject: tenantB.userId,
      idempotencyKey: `membership-cross-tenant-${suffix}`,
      requestId: randomUUID(),
      subjectUserId: lifecycleMemberUserId,
      tenantId: tenantB.tenantId
    }, api)).rejects.toThrow(/MEMBERSHIP_NOT_FOUND/u);
    expect(await owner.teamMember.findUniqueOrThrow({
      where: { userId_teamId: { userId: lifecycleMemberUserId, teamId: tenantA.teamId } }
    })).toMatchObject({ status: "ACTIVE", version: 1 });
    expect(await owner.authSession.findUniqueOrThrow({ where: { id: lifecycleSession.sessionId } }))
      .toMatchObject({ revokedAt: null, revokeReason: null });
    expect(await owner.authRefreshCredential.findUniqueOrThrow({ where: { id: lifecycleCredential.id } }))
      .toMatchObject({ revokedAt: null });

    const suspendInput = {
      action: "SUSPEND" as const,
      authSubject: tenantA.userId,
      idempotencyKey: `membership-suspend-${suffix}`,
      requestId: randomUUID(),
      subjectUserId: lifecycleMemberUserId,
      tenantId: tenantA.tenantId
    };
    const suspended = await transitionMember(suspendInput, api);
    expect(suspended).toMatchObject({
      authorization: "OWNER",
      idempotency_key: suspendInput.idempotencyKey,
      prior_version: 1,
      resulting_version: 2,
      subject_user_id: lifecycleMemberUserId,
      transition: "SUSPEND"
    });
    const suspendedReplay = await transitionMember({ ...suspendInput, requestId: randomUUID() }, api);
    expect(suspendedReplay).toEqual(suspended);
    expect(await owner.teamMember.findUniqueOrThrow({
      where: { userId_teamId: { userId: lifecycleMemberUserId, teamId: tenantA.teamId } }
    })).toMatchObject({ status: "SUSPENDED", version: 2 });
    expect(await owner.tenantActorAssignment.findUniqueOrThrow({
      where: { actorId_tenantId: { actorId: lifecycleMemberActorId, tenantId: tenantA.tenantId } }
    })).toMatchObject({ status: "SUSPENDED", version: 2 });
    expect(await owner.authSession.findUniqueOrThrow({ where: { id: lifecycleSession.sessionId } }))
      .toMatchObject({ revokeReason: "MEMBERSHIP_SUSPENDED", revokedAt: expect.any(Date) });
    expect(await owner.authRefreshCredential.findUniqueOrThrow({ where: { id: lifecycleCredential.id } }))
      .toMatchObject({ revokedAt: expect.any(Date) });

    const removeInput = {
      action: "REMOVE" as const,
      authSubject: lifecycleAdminUserId,
      idempotencyKey: `membership-remove-${suffix}`,
      requestId: randomUUID(),
      subjectUserId: lifecycleMemberUserId,
      tenantId: tenantA.tenantId
    };
    const removed = await transitionMember(removeInput, api);
    expect(removed).toMatchObject({
      authorization: "TENANT_ADMIN",
      idempotency_key: removeInput.idempotencyKey,
      prior_version: 2,
      resulting_version: 3,
      subject_user_id: lifecycleMemberUserId,
      transition: "REMOVE"
    });
    const removedReplay = await transitionMember({ ...removeInput, requestId: randomUUID() }, api);
    expect(removedReplay).toEqual(removed);
    expect(await owner.teamMember.findUniqueOrThrow({
      where: { userId_teamId: { userId: lifecycleMemberUserId, teamId: tenantA.teamId } }
    })).toMatchObject({ status: "REMOVED", version: 3 });
    expect(await owner.tenantActorAssignment.findUniqueOrThrow({
      where: { actorId_tenantId: { actorId: lifecycleMemberActorId, tenantId: tenantA.tenantId } }
    })).toMatchObject({ status: "REVOKED", version: 3 });
  });

  it("keeps canonical graph lineage tenant-bound for reads and writes", async () => {
    const graph = await tenantSession(tenantA, async (transaction) => {
      const projection = await transaction.$queryRaw<Array<{ id: string; name: string; stableCode: string }>>`
        SELECT id::text AS "id",name,stable_code AS "stableCode"
        FROM entral.entities ORDER BY stable_code
      `;
      const own = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id::text AS "id" FROM entral.entities WHERE id=${tenantA.commanderId}::uuid
      `;
      const foreign = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT id::text AS "id" FROM entral.entities WHERE id=${tenantB.commanderId}::uuid
      `;
      const foreignWrite = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE entral.entities SET name='cross-tenant-attempt'
        WHERE id=${tenantB.commanderId}::uuid RETURNING id::text AS "id"
      `;
      const ownWrite = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE entral.entities SET name='Tenant A Commander Verified'
        WHERE id=${tenantA.commanderId}::uuid RETURNING id::text AS "id"
      `;
      return { foreign, foreignWrite, own, ownWrite, projection };
    });

    expect(graph.own).toEqual([{ id: tenantA.commanderId }]);
    expect(graph.foreign).toEqual([]);
    expect(graph.foreignWrite).toEqual([]);
    expect(graph.ownWrite).toEqual([{ id: tenantA.commanderId }]);
    expect(JSON.stringify(graph.projection)).toContain(`p202-a-commander-${suffix}`);
    expect(JSON.stringify(graph.projection)).not.toContain(`p202-b-commander-${suffix}`);
    expect(JSON.stringify(graph.projection)).not.toContain("Commander b");
  });

  it("keeps event, graph-search, and model-context surfaces on the same A/B tenant boundary", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    const eventAId = randomUUID();
    const eventBId = randomUUID();
    const modelRequestId = `phase202-model-context-${suffix}`;
    const blockedMessage = `blocked-cross-tenant-model-context-${suffix}`;
    await owner.$executeRaw`
      INSERT INTO entral.canonical_events (
        id,event_type,aggregate_type,aggregate_id,aggregate_version,business_id,
        actor_kind,actor_id,correlation_id,payload,access_classification
      ) VALUES
        (
          ${eventAId}::uuid,'phase202.integration.a','BUSINESS',${tenantA.businessId}::uuid,1,
          ${tenantA.businessId}::uuid,'SYSTEM',NULL,${randomUUID()}::uuid,
          ${JSON.stringify({ tenant: "a" })}::jsonb,'INTERNAL'
        ),
        (
          ${eventBId}::uuid,'phase202.integration.b','BUSINESS',${tenantB.businessId}::uuid,1,
          ${tenantB.businessId}::uuid,'SYSTEM',NULL,${randomUUID()}::uuid,
          ${JSON.stringify({ tenant: "b" })}::jsonb,'INTERNAL'
        )
    `;
    await owner.$executeRaw`
      INSERT INTO public."Conversation" (
        "id","title","userId","updatedAt","organizationId","tenantId","businessId",
        "actorId","createdBy","ownedBy"
      ) VALUES
        (
          ${conversationAId},'Tenant A model context',${tenantA.userId},now(),
          ${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,${tenantA.businessBoundaryId}::uuid,
          ${tenantA.actorId}::uuid,${tenantA.actorId}::uuid,${tenantA.actorId}::uuid
        ),
        (
          ${conversationBId},'Tenant B model context',${tenantB.userId},now(),
          ${tenantB.organizationId}::uuid,${tenantB.tenantId}::uuid,${tenantB.businessBoundaryId}::uuid,
          ${tenantB.actorId}::uuid,${tenantB.actorId}::uuid,${tenantB.actorId}::uuid
        )
    `;

    const repository = new CanonicalControlPlaneRepository(api);
    const eventProjection = await repository.listPortfolioEvents(0, {
      actionReason: "Phase 202 A/B canonical-event integration verification.",
      authSubject: tenantA.userId,
      organizationId: tenantA.organizationId,
      tenantId: tenantA.tenantId
    });
    expect(eventProjection.events.map((event) => event.event_id)).toContain(eventAId);
    expect(eventProjection.events.map((event) => event.event_id)).not.toContain(eventBId);

    const conversations = await tenantSession(tenantA, (transaction) => transaction.conversation.findMany({
      orderBy: { id: "asc" },
      select: { id: true, businessId: true, organizationId: true, tenantId: true }
    }));
    expect(conversations).toContainEqual(expect.objectContaining({
      businessId: tenantA.businessBoundaryId,
      id: conversationAId,
      organizationId: tenantA.organizationId,
      tenantId: tenantA.tenantId
    }));
    expect(conversations.some((conversation) => conversation.id === conversationBId)).toBe(false);

    await expect(tenantSession(tenantA, async (transaction) => {
      await transaction.message.create({
        data: {
          actorId: tenantA.actorId,
          businessId: tenantA.businessBoundaryId,
          content: blockedMessage,
          conversationId: conversationBId,
          createdBy: tenantA.actorId,
          organizationId: tenantA.organizationId,
          ownedBy: tenantA.actorId,
          role: "user",
          tenantId: tenantA.tenantId
        }
      });
      await transaction.aiUsageEvent.create({
        data: {
          actorId: tenantA.actorId,
          businessId: tenantA.businessBoundaryId,
          createdBy: tenantA.actorId,
          estimatedCostCents: 1,
          modelName: "blocked-before-provider",
          organizationId: tenantA.organizationId,
          ownedBy: tenantA.actorId,
          providerName: "blocked-before-provider",
          requestId: modelRequestId,
          requestKind: "member_entral_chat",
          tenantId: tenantA.tenantId,
          userId: tenantA.userId
        }
      });
      await recordAuditLog({
        action: "member.entral.assistant.completed",
        actorUserId: tenantA.userId,
        requestId: modelRequestId,
        targetId: conversationBId,
        targetType: "member_entral_conversation"
      }, transaction);
    })).rejects.toThrow();
    expect(await owner.message.count({ where: { content: blockedMessage } })).toBe(0);
    expect(await owner.aiUsageEvent.count({ where: { requestId: modelRequestId } })).toBe(0);
    const modelAuditCount = await owner.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*) AS "count" FROM public."AuditLog"
      WHERE "entryJson"::jsonb->>'requestId'=${modelRequestId}
    `;
    expect(modelAuditCount).toEqual([{ count: 0n }]);
  });

  it("exposes only the selected tenant customer-ownership sidecar and never permits direct mutation", async () => {
    const ownership = await tenantSession(tenantA, async (transaction) => transaction.$queryRaw<Array<{
      id: string;
      tenantId: string;
    }>>`
      SELECT "id"::text AS "id","tenantId"::text AS "tenantId"
      FROM public."CustomerRecordOwnership" ORDER BY "tenantId"
    `);
    expect(ownership.length).toBeGreaterThan(0);
    expect(new Set(ownership.map((row) => row.tenantId))).toEqual(new Set([tenantA.tenantId]));
    expect(ownership).toContainEqual({
      id: tenantA.customerOwnershipId,
      tenantId: tenantA.tenantId
    });

    await expect(tenantSession(tenantA, async (transaction) => transaction.$executeRaw`
      UPDATE public."CustomerRecordOwnership" SET "mappingStrategy"='cross-tenant-attempt'
      WHERE "tenantId"=${tenantB.tenantId}::uuid
    `)).rejects.toThrow();
  });

  it("binds invitation acceptance to the exact token and exact human", async () => {
    if (!api) throw new Error("Phase 202 disposable API client is unavailable.");
    const resolve = (authSubject: string, tokenHash: string) => api!.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT entral.bind_authenticated_app_user(${authSubject})
      `;
      return transaction.$queryRaw<Array<{
        actorId: string;
        invitationId: string;
        tenantId: string;
      }>>`
        SELECT "actorId"::text AS "actorId","invitationId"::text AS "invitationId",
               "tenantId"::text AS "tenantId"
        FROM entral.phase202_resolve_invitation_context(${tokenHash},${authSubject})
      `;
    });
    await expect(resolve(inviteeUserId, "wrong-token-hash")).resolves.toEqual([]);
    await expect(resolve(wrongInviteeUserId, invitationTokenHash)).resolves.toEqual([]);
    await expect(resolve(inviteeUserId, invitationTokenHash)).resolves.toEqual([{
      actorId: inviteeActorId,
      invitationId: tenantA.invitationId,
      tenantId: tenantA.tenantId
    }]);

    const forgedHuman = await api.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT entral.bind_authenticated_app_user(${wrongInviteeUserId})
      `;
      await transaction.$queryRaw`
        SELECT set_config('app.tenant_id',${tenantA.tenantId},true),
               set_config('app.organization_id',${tenantA.organizationId},true),
               set_config('app.phase202_actor_id',${wrongInviteeActorId},true),
               set_config('app.phase202_invitation_id',${tenantA.invitationId},true),
               set_config('app.phase202_invitation_token_hash',${invitationTokenHash},true)
      `;
      return transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."MembershipInvitation" SET "status"='ACCEPTED',"acceptedAt"=now()
        WHERE "id"=${tenantA.invitationId}::uuid RETURNING "id"::text AS "id"
      `;
    });
    expect(forgedHuman).toEqual([]);

    const forgedToken = await api.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT entral.bind_authenticated_app_user(${inviteeUserId})
      `;
      await transaction.$queryRaw`
        SELECT set_config('app.tenant_id',${tenantA.tenantId},true),
               set_config('app.organization_id',${tenantA.organizationId},true),
               set_config('app.phase202_actor_id',${inviteeActorId},true),
               set_config('app.phase202_invitation_id',${tenantA.invitationId},true),
               set_config('app.phase202_invitation_token_hash','wrong-token-hash',true)
      `;
      return transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."MembershipInvitation" SET "status"='ACCEPTED',"acceptedAt"=now()
        WHERE "id"=${tenantA.invitationId}::uuid RETURNING "id"::text AS "id"
      `;
    });
    expect(forgedToken).toEqual([]);

    const accepted = await api.$transaction(async (transaction) => {
      await transaction.$queryRaw`
        SELECT entral.bind_authenticated_app_user(${inviteeUserId})
      `;
      const context = await transaction.$queryRaw<Array<{
        actorId: string;
        invitationId: string;
        organizationId: string;
        tenantId: string;
      }>>`
        SELECT "actorId"::text AS "actorId","invitationId"::text AS "invitationId",
               "organizationId"::text AS "organizationId","tenantId"::text AS "tenantId"
        FROM entral.phase202_resolve_invitation_context(${invitationTokenHash},${inviteeUserId})
      `;
      const bound = context[0]!;
      await transaction.$queryRaw`
        SELECT set_config('app.tenant_id',${bound.tenantId},true),
               set_config('app.organization_id',${bound.organizationId},true),
               set_config('app.phase202_actor_id',${bound.actorId},true),
               set_config('app.phase202_invitation_id',${bound.invitationId},true),
               set_config('app.phase202_invitation_token_hash',${invitationTokenHash},true)
      `;
      return transaction.$queryRaw<Array<{ id: string; status: string }>>`
        UPDATE public."MembershipInvitation" SET "status"='ACCEPTED',"acceptedAt"=now()
        WHERE "id"=${tenantA.invitationId}::uuid
        RETURNING "id"::text AS "id","status"
      `;
    });
    expect(accepted).toEqual([{ id: tenantA.invitationId, status: "ACCEPTED" }]);
    await expect(resolve(inviteeUserId, invitationTokenHash)).resolves.toEqual([{
      actorId: inviteeActorId,
      invitationId: tenantA.invitationId,
      tenantId: tenantA.tenantId
    }]);
  });

  it("keeps support read-only by default, requires explicit allowlisted elevation, and expires closed", async () => {
    const readOnly = await withExactSupportSession(tenantA, tenantA.grantId, async (transaction) => {
      const teams = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM public."Team" ORDER BY "id"
      `;
      const writes = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."Task" SET "status"='SUPPORT_WRITE'
        WHERE "id"=${tenantA.taskId} RETURNING "id"
      `;
      return { teams, writes };
    });
    expect(readOnly.teams).toEqual([{ id: tenantA.teamId }]);
    expect(readOnly.writes).toEqual([]);

    await tenantSession(tenantA, async (transaction) => {
      await transaction.$executeRaw`
        UPDATE public."SupportAccessGrant" SET
          "accessMode"='WRITE_ELEVATED',
          "writeElevatedAt"=now(),
          "writeElevatedByActorId"=${tenantA.actorId}::uuid,
          "writeElevationPurpose"='allowlisted integration repair',
          "writeElevationExpiresAt"=now()+interval '30 minutes',
          "updatedAt"=now()
        WHERE "id"=${tenantA.grantId}::uuid
      `;
    });
    const elevated = await withExactSupportSession(tenantA, tenantA.grantId, async (transaction) => {
      const ownWrite = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."Task" SET "status"='SUPPORT_WRITE'
        WHERE "id"=${tenantA.taskId} RETURNING "id"
      `;
      const foreignWrite = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."Task" SET "status"='CROSS_TENANT_SUPPORT_WRITE'
        WHERE "id"=${tenantB.taskId} RETURNING "id"
      `;
      const unallowlistedWrite = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."Team" SET "name"='Unallowlisted Support Write'
        WHERE "id"=${tenantA.teamId} RETURNING "id"
      `;
      return { foreignWrite, ownWrite, unallowlistedWrite };
    });
    expect(elevated.ownWrite).toEqual([{ id: tenantA.taskId }]);
    expect(elevated.foreignWrite).toEqual([]);
    expect(elevated.unallowlistedWrite).toEqual([]);

    await tenantSession(tenantA, async (transaction) => {
      await transaction.$executeRaw`
        UPDATE public."SupportAccessGrant" SET
          "accessMode"='READ_ONLY',
          "writeElevatedAt"=NULL,
          "writeElevatedByActorId"=NULL,
          "writeElevationPurpose"=NULL,
          "writeElevationExpiresAt"=NULL,
          "expiresAt"=now()-interval '1 minute',
          "updatedAt"=now()
        WHERE "id"=${tenantA.grantId}::uuid
      `;
    });
    await expect(withExactSupportSession(tenantA, tenantA.grantId, async (transaction) => transaction.$queryRaw`
      SELECT "id" FROM public."Team" ORDER BY "id"
    `)).rejects.toThrow(/ACTIVE_SUPPORT_GRANT_REQUIRED/u);
  });

  it("keeps evidence append-only even for same-tenant API and migration-owner identities", async () => {
    await expect(tenantSession(tenantA, async (transaction) => transaction.$executeRaw`
      UPDATE public."SecretAccessAudit" SET "outcome"='MUTATED'
      WHERE "id"=${tenantA.evidenceId}::uuid
    `)).rejects.toThrow();
    if (!owner) throw new Error("Phase 202 disposable owner client is unavailable.");
    await expect(owner.$executeRaw`
      UPDATE public."SecretAccessAudit" SET "outcome"='MUTATED'
      WHERE "id"=${tenantA.evidenceId}::uuid
    `).rejects.toThrow(/append-only/i);
    await expect(owner.$executeRaw`
      DELETE FROM public."MembershipMutationReceipt"
      WHERE "id"=${tenantA.membershipReceiptId}::uuid
    `).rejects.toThrow(/append-only/i);
  });

  it("classifies mixed audit evidence, projects only tenant rows, rejects ambiguity, and isolates tenant readback", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    const tenantAudit = await tenantSession(tenantA, (transaction) => recordAuditLog({
      action: "phase202.audit.tenant",
      actorUserId: tenantA.userId,
      requestId: randomUUID(),
      targetId: tenantA.taskId,
      targetType: "task"
    }, transaction));
    const tenantReadback = await owner.auditLog.findUniqueOrThrow({ where: { id: tenantAudit.id } });
    expect(tenantReadback).toMatchObject({
      actorId: tenantA.actorId,
      createdBy: tenantA.actorId,
      organizationId: tenantA.organizationId,
      ownedBy: tenantA.actorId,
      scopeKind: "TENANT",
      scopeResolution: "BOUND_TENANT_SESSION_V1",
      tenantId: tenantA.tenantId
    });
    expect(await owner.customerRecordOwnership.findUnique({
      where: { sourceTable_sourceRecordId: { sourceTable: "AuditLog", sourceRecordId: tenantAudit.id } }
    })).toMatchObject({ mappingStrategy: "AUDIT_SCOPE_V1", tenantId: tenantA.tenantId });

    const personalAudit = await owner.auditLog.create({
      data: {
        action: "phase202.audit.personal",
        actorUserId: wrongInviteeUserId,
        entryHash: "b".repeat(64),
        entryJson: "{}",
        outcome: "success",
        targetType: "account"
      }
    });
    expect(personalAudit).toMatchObject({
      actorId: wrongInviteeActorId,
      organizationId: null,
      scopeKind: "PERSONAL",
      tenantId: null
    });
    expect(await owner.customerRecordOwnership.findUnique({
      where: { sourceTable_sourceRecordId: { sourceTable: "AuditLog", sourceRecordId: personalAudit.id } }
    })).toBeNull();

    const platformAudit = await owner.auditLog.create({
      data: {
        action: "phase202.audit.platform",
        entryHash: "c".repeat(64),
        entryJson: "{}",
        outcome: "success",
        targetType: "worker"
      }
    });
    expect(platformAudit).toMatchObject({ actorId: null, scopeKind: "PLATFORM", tenantId: null });
    await expect(owner.auditLog.create({
      data: {
        action: "phase202.audit.ambiguous",
        actorUserId: supportUserId,
        entryHash: "d".repeat(64),
        entryJson: "{}",
        outcome: "success",
        targetType: "support"
      }
    })).rejects.toThrow(/ambiguous/i);

    const foreignVisibility = await tenantSession(tenantB, (transaction) => transaction.auditLog.findMany({
      where: { id: tenantAudit.id }, select: { id: true }
    }));
    expect(foreignVisibility).toEqual([]);
    await expect(tenantSession(tenantA, (transaction) => transaction.auditLog.update({
      where: { id: tenantAudit.id }, data: { severity: "critical" }
    }))).rejects.toThrow(/append-only|permission denied/i);
  });

  it("creates an exact-scope autonomy envelope and rejects mismatched or mutable records", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    const envelopeId = randomUUID();
    const targetActorId = randomUUID();
    const targetServiceSubject = `phase202-autonomy-service-${suffix}`;
    await owner.$executeRaw`
      INSERT INTO public."IdentityActor" ("id","actorType","serviceSubject","status")
      VALUES (${targetActorId}::uuid,'SERVICE',${targetServiceSubject},'ACTIVE')
    `;
    await owner.$executeRaw`
      INSERT INTO public."TenantActorAssignment" (
        "actorId","organizationId","tenantId","role","authorityDomains","status"
      ) VALUES (
        ${targetActorId}::uuid,${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
        'SERVICE',ARRAY['OPERATIONS']::text[],'ACTIVE'
      )
    `;
    const baseEnvelope = {
      contract_version: "1.0.0" as const,
      schema_version: 1 as const,
      envelope_id: envelopeId,
      version: 1,
      ownership: {
        organization_id: tenantA.organizationId,
        tenant_id: tenantA.tenantId,
        business_id: tenantA.businessBoundaryId,
        environment: "PRODUCTION" as const,
        data_residency: "US"
      },
      actor: {
        actor_id: targetActorId,
        actor_type: "SERVICE" as const,
        human_user_id: null,
        service_subject: targetServiceSubject,
        agent_id: null
      },
      allowed_action_types: ["task.create"],
      tool_scope: ["task.write"],
      data_scope: [`business:${tenantA.businessBoundaryId}`],
      budget: { currency: "USD", maximum_minor_units: 0 },
      reversible: true,
      verification: "Read the task through the same tenant authority.",
      escalation: "Escalate denied actions to the tenant owner.",
      created_at: new Date(Date.now() - 60_000).toISOString(),
      expires_at: new Date(Date.now() + 3_600_000).toISOString()
    };

    await expect(createAutonomyEnvelope({
      ...baseEnvelope,
      ownership: { ...baseEnvelope.ownership, environment: "STAGING" as const }
    }, randomUUID(), tenantA.userId, api)).rejects.toThrow(/AUTONOMY_ENVELOPE_TENANT_SCOPE_MISMATCH/);

    const record = await createAutonomyEnvelope(baseEnvelope, randomUUID(), tenantA.userId, api);
    expect(record).toMatchObject({
      actorId: targetActorId,
      businessId: tenantA.businessBoundaryId,
      envelopeId,
      organizationId: tenantA.organizationId,
      tenantId: tenantA.tenantId,
      version: 1
    });

    await expect(owner.$executeRaw`
      UPDATE public."AutonomyEnvelopeRecord" SET "revokedAt"=now()
      WHERE "recordId"=${record.recordId}::uuid
    `).rejects.toThrow(/append-only/i);
    await expect(owner.$executeRaw`
      DELETE FROM public."AutonomyEnvelopeRecord" WHERE "recordId"=${record.recordId}::uuid
    `).rejects.toThrow(/append-only/i);
    const readback = await owner.autonomyEnvelopeRecord.findMany({ where: { envelopeId } });
    expect(readback).toHaveLength(1);
  });

  it("persists idempotent MFA receipts, suppresses one-time material on replay, and isolates immutable readback", async () => {
    if (!isolatedApiDatabaseUrl || !owner) {
      throw new Error("Phase 202 disposable MFA database authority is unavailable.");
    }
    const originalDatabaseUrl = process.env.DATABASE_URL;
    const originalEncryptionKey = process.env.DATA_ENCRYPTION_KEY;
    const originalEncryptionKeyVersion = process.env.DATA_ENCRYPTION_KEY_VERSION;
    process.env.DATABASE_URL = isolatedApiDatabaseUrl;
    process.env.DATA_ENCRYPTION_KEY = `phase202-integration-encryption-key-${suffix}`;
    process.env.DATA_ENCRYPTION_KEY_VERSION = "phase202-integration";
    vi.resetModules();
    const [mfaModule, isolatedDbModule] = await Promise.all([
      import("../src/services/phase202Mfa.js"),
      import("../src/db.js")
    ]);
    try {
      const firstInput = {
        email: `phase202-mfa-${suffix}@example.test`,
        idempotencyKey: `mfa-enroll-first-${suffix}`,
        requestId: randomUUID(),
        sessionId: mfaSessionId,
        userId: mfaUserId
      };
      const first = await mfaModule.beginTotpEnrollment(firstInput);
      expect(first).toMatchObject({
        replayed: false,
        receipt: {
          factor_status: "PENDING",
          idempotency_key: firstInput.idempotencyKey,
          prior_version: 0,
          resulting_version: 1,
          transition: "TOTP_ENROLL"
        }
      });
      expect(first.enrollment).toMatchObject({
        factor_id: first.receipt.factor_id,
        otpauth_uri: expect.stringContaining("otpauth://totp/"),
        secret: expect.any(String)
      });

      const replay = await mfaModule.beginTotpEnrollment({
        ...firstInput,
        requestId: randomUUID()
      });
      expect(replay).toEqual({
        enrollment: null,
        receipt: first.receipt,
        recovery_codes: null,
        replayed: true
      });
      await expect(mfaModule.beginTotpEnrollment({
        ...firstInput,
        email: `phase202-mfa-conflict-${suffix}@example.test`,
        requestId: randomUUID()
      })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", statusCode: 409 });

      const restarted = await mfaModule.beginTotpEnrollment({
        ...firstInput,
        idempotencyKey: `mfa-enroll-restart-${suffix}`,
        requestId: randomUUID()
      });
      expect(restarted).toMatchObject({
        replayed: false,
        receipt: {
          factor_id: first.receipt.factor_id,
          prior_version: 1,
          resulting_version: 2,
          transition: "TOTP_ENROLL"
        }
      });
      expect(restarted.enrollment?.secret).not.toBe(first.enrollment?.secret);

      const receipts = await owner.mfaMutationReceipt.findMany({
        orderBy: { occurredAt: "asc" },
        where: { actorId: mfaActorId }
      });
      expect(receipts).toHaveLength(2);
      expect(receipts.map((receipt) => receipt.resultingVersion)).toEqual([1, 2]);
      expect(JSON.stringify(receipts.map((receipt) => receipt.resultPayload)))
        .not.toContain(first.enrollment!.secret);
      expect(JSON.stringify(receipts.map((receipt) => receipt.resultPayload)))
        .not.toContain(restarted.enrollment!.secret);
      const factors = await owner.mfaFactor.findMany({ where: { actorId: mfaActorId } });
      expect(factors).toEqual([expect.objectContaining({
        actorId: mfaActorId,
        id: first.receipt.factor_id,
        status: "PENDING",
        version: 2
      })]);
      const secretRows = await owner.personalSecretReference.findMany({
        orderBy: { createdAt: "asc" },
        where: { actorId: mfaActorId }
      });
      expect(secretRows).toHaveLength(2);
      expect(secretRows.filter((secret) => secret.revokedAt !== null)).toHaveLength(1);
      expect(secretRows.every((secret) => secret.encryptedValue.includes('"__entralEncrypted":true'))).toBe(true);

      const foreignVisibility = await isolatedDbModule.withPersonalSession(
        isolatedDbModule.prisma,
        {
          actionReason: "Phase 202 foreign MFA receipt visibility denial.",
          authSubject: tenantB.userId,
          requestId: randomUUID()
        },
        (transaction) => transaction.mfaMutationReceipt.findMany({
          where: { actorId: mfaActorId },
          select: { id: true }
        })
      );
      expect(foreignVisibility).toEqual([]);
      await expect(owner.mfaMutationReceipt.update({
        data: { action: "STEP_UP" },
        where: { id: receipts[0]!.id }
      })).rejects.toThrow(/append-only/u);
      await expect(owner.mfaMutationReceipt.delete({
        where: { id: receipts[0]!.id }
      })).rejects.toThrow(/append-only/u);
    } finally {
      await isolatedDbModule.prisma.$disconnect();
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
      if (originalEncryptionKey === undefined) delete process.env.DATA_ENCRYPTION_KEY;
      else process.env.DATA_ENCRYPTION_KEY = originalEncryptionKey;
      if (originalEncryptionKeyVersion === undefined) delete process.env.DATA_ENCRYPTION_KEY_VERSION;
      else process.env.DATA_ENCRYPTION_KEY_VERSION = originalEncryptionKeyVersion;
      vi.resetModules();
    }
  });

  it("persists session inventory, rotates refresh credentials, contains replay, and revokes one or all", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    const user = await owner.user.findUniqueOrThrow({ where: { id: tenantB.userId } });
    const first = await issueDurableSession(user, "member", {
      ipAddress: "192.0.2.10",
      requestId: randomUUID(),
      requestedTenantId: tenantB.tenantId,
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/140.0"
    }, api);
    const issued = await owner.authSession.findUniqueOrThrow({ where: { id: first.sessionId } });
    expect(issued).toMatchObject({
      accountSessionVersion: user.sessionVersion,
      actorId: tenantB.actorId,
      deviceLabel: "Chrome on Windows",
      organizationId: tenantB.organizationId,
      refreshVersion: 1,
      sessionType: "MEMBER",
      tenantId: tenantB.tenantId
    });
    expect(issued.auditProvenanceId).toEqual(expect.any(String));
    expect(issued.userAgentHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(issued.ipAddressHash).toMatch(/^[a-f0-9]{64}$/u);

    const rotated = await rotateRefreshCredential(first.refreshToken, {
      ipAddress: "192.0.2.11",
      requestId: randomUUID(),
      userAgent: "Mozilla/5.0 (Linux) Firefox/141.0"
    }, api);
    expect(rotated.sessionId).toBe(first.sessionId);
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    const afterRotation = await owner.authSession.findUniqueOrThrow({ where: { id: first.sessionId } });
    expect(afterRotation.refreshVersion).toBe(2);
    expect(afterRotation.deviceLabel).toBe("Firefox on Linux");

    await expect(rotateRefreshCredential(first.refreshToken, {
      requestId: randomUUID(),
      userAgent: "Replay client"
    }, api)).rejects.toThrow(/REFRESH_REPLAY_DETECTED/);
    const replayed = await owner.authSession.findUniqueOrThrow({ where: { id: first.sessionId } });
    expect(replayed.revokeReason).toBe("REFRESH_REPLAY");
    expect(replayed.revokedAt).toEqual(expect.any(Date));
    const family = await owner.authRefreshCredential.findMany({ where: { sessionId: first.sessionId } });
    expect(family).toHaveLength(2);
    expect(family.every((credential) => credential.revokedAt !== null || credential.consumedAt !== null)).toBe(true);

    const second = await issueDurableSession(user, "member", {
      requestId: randomUUID(),
      requestedTenantId: tenantB.tenantId,
      userAgent: "Mozilla/5.0 (Mac OS) Safari/18.0"
    }, api);
    const third = await issueDurableSession(user, "member", {
      requestId: randomUUID(),
      requestedTenantId: tenantB.tenantId,
      userAgent: "Mozilla/5.0 (Android) Chrome/140.0"
    }, api);
    const inventory = await listSessions(tenantB.userId, second.sessionId, api);
    expect(inventory.find((session) => session.session_id === second.sessionId)).toMatchObject({
      current: true,
      revoked_at: null,
      session_type: "MEMBER"
    });
    const revokeOneKey = `session-revoke-one-${suffix}`;
    const revokedOne = await revokeSession(
      tenantB.userId,
      second.sessionId,
      randomUUID(),
      revokeOneKey,
      api
    );
    expect(revokedOne).toMatchObject({
      replayed: false,
      receipt: {
        transition: "REVOKE_ONE",
        idempotency_key: revokeOneKey,
        prior_version: 1,
        resulting_version: 2,
        revoked_count: 1,
        subject_session_id: second.sessionId
      }
    });
    const revokeOneReplay = await revokeSession(
      tenantB.userId,
      second.sessionId,
      randomUUID(),
      revokeOneKey,
      api
    );
    expect(revokeOneReplay).toEqual({ receipt: revokedOne.receipt, replayed: true });
    await expect(revokeSession(
      tenantB.userId,
      randomUUID(),
      randomUUID(),
      revokeOneKey,
      api
    )).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", statusCode: 409 });

    const revokeAllKey = `session-revoke-all-${suffix}`;
    const revokedAll = await revokeAllSessions(tenantB.userId, randomUUID(), revokeAllKey, api);
    expect(revokedAll).toMatchObject({
      replayed: false,
      receipt: {
        transition: "REVOKE_ALL",
        idempotency_key: revokeAllKey,
        prior_version: user.sessionVersion,
        resulting_version: user.sessionVersion + 1,
        revoked_count: expect.any(Number),
        subject_session_id: null
      }
    });
    expect(revokedAll.receipt.revoked_count).toBeGreaterThanOrEqual(1);
    const revokedAllReplay = await revokeAllSessions(tenantB.userId, randomUUID(), revokeAllKey, api);
    expect(revokedAllReplay).toEqual({ receipt: revokedAll.receipt, replayed: true });
    const thirdReadback = await owner.authSession.findUniqueOrThrow({ where: { id: third.sessionId } });
    expect(thirdReadback).toMatchObject({ revokeReason: "USER_REVOKED_ALL", revokedAt: expect.any(Date) });
    const userReadback = await owner.user.findUniqueOrThrow({ where: { id: tenantB.userId } });
    expect(userReadback.sessionVersion).toBe(user.sessionVersion + 1);
    const sessionReceipts = await owner.sessionMutationReceipt.findMany({
      orderBy: { occurredAt: "asc" },
      where: { actorId: tenantB.actorId }
    });
    expect(sessionReceipts.map((receipt) => receipt.transition)).toEqual(["REVOKE_ONE", "REVOKE_ALL"]);
    expect(sessionReceipts.map((receipt) => receipt.idempotencyKey)).toEqual([revokeOneKey, revokeAllKey]);
    expect(JSON.stringify(sessionReceipts.map((receipt) => receipt.resultPayload))).not.toMatch(/access_token|refresh_token|password/iu);
    await expect(owner.sessionMutationReceipt.update({
      data: { requestId: "mutated" },
      where: { id: sessionReceipts[0]!.id }
    })).rejects.toThrow(/append-only/u);
    await expect(owner.sessionMutationReceipt.delete({
      where: { id: sessionReceipts[0]!.id }
    })).rejects.toThrow(/append-only/u);
  });

  it("issues owner-visible read-only support, gates write elevation, expires write closed, and retains immutable audit snapshots", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    const issueInput = {
      authSubject: tenantA.userId,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      idempotencyKey: `support-issue-${suffix}`,
      purpose: "diagnose tenant-owned task state",
      readScopes: ["table:Team:read", "table:Task:read"],
      requestId: randomUUID(),
      supportActorId,
      tenantId: tenantA.tenantId
    };
    const issued = await issueSupportAccess(issueInput, api);
    expect(issued).toMatchObject({
      replayed: false,
      receipt: {
        authorization: "OWNER",
        idempotency_key: issueInput.idempotencyKey,
        prior_version: 0,
        resulting_version: 1,
        transition: "ISSUE_READ_ONLY",
        grant: {
          access_mode: "READ_ONLY",
          organization_id: tenantA.organizationId,
          owner_visible: true,
          scopes: ["table:Task:read", "table:Team:read"],
          support_actor_id: supportActorId,
          tenant_id: tenantA.tenantId,
          write_elevation_expires_at: null,
          write_elevation_purpose: null
        }
      }
    });
    const issueReplay = await issueSupportAccess({ ...issueInput, requestId: randomUUID() }, api);
    expect(issueReplay).toEqual({ receipt: issued.receipt, replayed: true });
    await expect(issueSupportAccess({
      ...issueInput,
      purpose: "different support purpose",
      requestId: randomUUID()
    }, api)).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", statusCode: 409 });
    const grant = issued.receipt.grant;
    const supportAuditPolicy = await withExactSupportSession(tenantA, grant.grant_id, (transaction) => transaction.$queryRaw<Array<{
      allowed: boolean;
      actorId: string;
      supportGrantId: string;
      tenantId: string;
    }>>`
      SELECT entral.phase202_support_session_audit_insert_allows(
        'TENANT',${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,NULL::uuid,
        ${supportActorId}::uuid,${supportActorId}::uuid,${supportActorId}::uuid,
        ${supportUserId},'auth.session.issued','auth_session',${randomUUID()}::text
      ) AS "allowed",
      entral.phase202_current_actor_id()::text AS "actorId",
      entral.phase202_current_support_grant_id()::text AS "supportGrantId",
      entral.phase202_current_tenant_id()::text AS "tenantId"
    `);
    expect(supportAuditPolicy).toEqual([{
      allowed: true,
      actorId: supportActorId,
      supportGrantId: grant.grant_id,
      tenantId: tenantA.tenantId
    }]);
    const supportUser = await owner.user.findUniqueOrThrow({ where: { id: supportUserId } });
    const supportSession = await issueDurableSession(supportUser, "support", {
      ipAddress: "192.0.2.50",
      requestId: randomUUID(),
      supportGrantId: grant.grant_id,
      userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/140.0"
    }, api);
    const supportToken = verifyAuthToken(supportSession.accessToken);
    expect(supportToken).toMatchObject({
      actorId: supportActorId,
      organizationId: tenantA.organizationId,
      session: "support",
      supportGrantId: grant.grant_id,
      tenantId: tenantA.tenantId
    });
    const supportSessionRow = await owner.authSession.findUniqueOrThrow({ where: { id: supportSession.sessionId } });
    expect(supportSessionRow).toMatchObject({
      actorId: supportActorId,
      organizationId: tenantA.organizationId,
      sessionType: "SUPPORT",
      supportGrantId: grant.grant_id,
      tenantId: tenantA.tenantId
    });
    expect(supportSessionRow.expiresAt.getTime()).toBeLessThanOrEqual(new Date(grant.expires_at).getTime());
    const supportReadback = await readSupportSession({
      requestId: randomUUID(),
      sessionId: supportSession.sessionId,
      supportGrantId: grant.grant_id,
      userId: supportUserId
    }, api);
    expect(() => assertSupportSessionReadback(supportReadback)).not.toThrow();
    expect(supportReadback).toMatchObject({
      session: {
        organization_id: tenantA.organizationId,
        session_id: supportSession.sessionId,
        support_grant_id: grant.grant_id,
        tenant_id: tenantA.tenantId
      },
      support_grant: {
        access_mode: "READ_ONLY",
        grant_id: grant.grant_id,
        support_actor_id: supportActorId
      }
    });
    const defaultSupportTasks = await listSupportTasks({
      authSubject: supportUserId,
      limit: 50,
      requestId: randomUUID(),
      supportGrantId: grant.grant_id
    }, api);
    expect(defaultSupportTasks.tasks).toEqual([
      expect.objectContaining({ task_id: tenantA.taskId })
    ]);
    expect(defaultSupportTasks.tasks.some((task) => task.task_id === tenantB.taskId)).toBe(false);
    await expect(updateSupportTaskStatus({
      authSubject: supportUserId,
      requestId: randomUUID(),
      status: "IN_PROGRESS",
      supportGrantId: grant.grant_id,
      taskId: tenantA.taskId
    }, api)).rejects.toMatchObject({ code: "SUPPORT_SCOPE_DENIED", statusCode: 403 });
    const refreshedSupportSession = await rotateRefreshCredential(supportSession.refreshToken, {
      requestId: randomUUID(),
      userAgent: "Mozilla/5.0 (Linux) Firefox/141.0"
    }, api);
    expect(verifyAuthToken(refreshedSupportSession.accessToken)).toMatchObject({
      session: "support",
      supportGrantId: grant.grant_id
    });

    const elevationInput = {
      authSubject: tenantA.userId,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      grantId: grant.grant_id,
      idempotencyKey: `support-elevate-${suffix}`,
      purpose: "repair one allowlisted task",
      requestId: randomUUID(),
      sessionId: tenantA.sessionId,
      tenantId: tenantA.tenantId,
      writeScopes: ["table:Task:write"]
    };
    await expect(elevateSupportAccess(elevationInput, api))
      .rejects.toMatchObject({ code: "RECENT_MFA_STEP_UP_REQUIRED" });
    await owner.authSession.update({
      where: { id: tenantA.sessionId },
      data: { stepUpAt: new Date() }
    });
    const elevated = await elevateSupportAccess(elevationInput, api);
    expect(elevated).toMatchObject({
      replayed: false,
      receipt: {
        authorization: "OWNER_RECENT_MFA_STEP_UP",
        prior_version: 1,
        resulting_version: 2,
        transition: "ELEVATE_WRITE",
        grant: {
          access_mode: "WRITE_ELEVATED",
          scopes: ["table:Task:read", "table:Team:read", "table:Task:write"],
          write_elevation_purpose: "repair one allowlisted task",
          write_elevation_expires_at: expect.any(String)
        }
      }
    });
    const elevatedTaskUpdate = await updateSupportTaskStatus({
      authSubject: supportUserId,
      requestId: randomUUID(),
      status: "IN_PROGRESS",
      supportGrantId: grant.grant_id,
      taskId: tenantA.taskId
    }, api);
    expect(elevatedTaskUpdate).toMatchObject({
      changed: true,
      task: { status: "IN_PROGRESS", task_id: tenantA.taskId }
    });
    await expect(updateSupportTaskStatus({
      authSubject: supportUserId,
      requestId: randomUUID(),
      status: "DONE",
      supportGrantId: grant.grant_id,
      taskId: tenantB.taskId
    }, api)).rejects.toMatchObject({ code: "SUPPORT_TASK_NOT_FOUND", statusCode: 404 });
    const unallowlistedWrite = await withExactSupportSession(tenantA, grant.grant_id, (transaction) => transaction.$queryRaw<Array<{ id: string }>>`
      UPDATE public."Team" SET "name"='Unallowlisted support service write'
      WHERE "id"=${tenantA.teamId} RETURNING "id"
    `);
    expect(unallowlistedWrite).toEqual([]);
    await owner.authSession.update({
      where: { id: tenantA.sessionId },
      data: { stepUpAt: null }
    });
    const elevationReplay = await elevateSupportAccess({ ...elevationInput, requestId: randomUUID() }, api);
    expect(elevationReplay).toEqual({ receipt: elevated.receipt, replayed: true });
    await expect(elevateSupportAccess({
      ...elevationInput,
      purpose: "different elevation purpose",
      requestId: randomUUID()
    }, api)).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", statusCode: 409 });

    const audits = await owner.supportAccessAudit.findMany({
      where: { grantId: grant.grant_id },
      orderBy: { occurredAt: "asc" }
    });
    expect(audits).toEqual([
      expect.objectContaining({
        accessMode: "READ_ONLY",
        action: "ISSUE_READ_ONLY",
        priorVersion: 0,
        purpose: "diagnose tenant-owned task state",
        resultingVersion: 1,
        scopes: ["table:Task:read", "table:Team:read"]
      }),
      expect.objectContaining({
        accessMode: "WRITE_ELEVATED",
        action: "ELEVATE_WRITE",
        priorVersion: 1,
        purpose: "repair one allowlisted task",
        resultingVersion: 2,
        scopes: ["table:Task:read", "table:Team:read", "table:Task:write"]
      })
    ]);
    expect(audits.map((audit) => audit.idempotencyKey)).toEqual([
      issueInput.idempotencyKey,
      elevationInput.idempotencyKey
    ]);
    expect(JSON.stringify(audits.map((audit) => audit.resultPayload))).not.toMatch(/token|secret|password/iu);
    const foreignAuditVisibility = await tenantSession(tenantB, (transaction) => transaction.supportAccessAudit.findMany({
      select: { id: true },
      where: { grantId: grant.grant_id }
    }));
    expect(foreignAuditVisibility).toEqual([]);

    await owner.supportAccessGrant.update({
      where: { id: grant.grant_id },
      data: {
        writeElevatedAt: new Date(Date.now() - 2 * 60_000),
        writeElevationExpiresAt: new Date(Date.now() - 60_000)
      }
    });
    const [expiredElevation] = await listSupportAccess(tenantA.userId, tenantA.tenantId, api);
    expect(expiredElevation).toMatchObject({
      access_mode: "READ_ONLY",
      grant_id: grant.grant_id,
      scopes: ["table:Task:read", "table:Team:read"],
      write_elevation_purpose: "repair one allowlisted task"
    });
    await expect(updateSupportTaskStatus({
      authSubject: supportUserId,
      requestId: randomUUID(),
      status: "DONE",
      supportGrantId: grant.grant_id,
      taskId: tenantA.taskId
    }, api)).rejects.toMatchObject({ code: "SUPPORT_SCOPE_DENIED", statusCode: 403 });
    const expiredAccess = await withExactSupportSession(tenantA, grant.grant_id, async (transaction) => {
      const reads = await transaction.$queryRaw<Array<{ id: string }>>`
        SELECT "id" FROM public."Team" WHERE "id"=${tenantA.teamId}
      `;
      const writes = await transaction.$queryRaw<Array<{ id: string }>>`
        UPDATE public."Task" SET "status"='EXPIRED_ELEVATION_WRITE'
        WHERE "id"=${tenantA.taskId} RETURNING "id"
      `;
      return { reads, writes };
    });
    expect(expiredAccess.reads).toEqual([{ id: tenantA.teamId }]);
    expect(expiredAccess.writes).toEqual([]);
    await owner.supportAccessGrant.update({
      where: { id: grant.grant_id },
      data: {
        accessMode: "READ_ONLY",
        scopes: ["table:Task:read", "table:Team:read"],
        writeElevatedAt: null,
        writeElevatedByActorId: null,
        writeElevationExpiresAt: null,
        writeElevationPurpose: null
      }
    });
    const revokeInput = {
      authSubject: tenantA.userId,
      grantId: grant.grant_id,
      idempotencyKey: `support-revoke-${suffix}`,
      requestId: randomUUID(),
      tenantId: tenantA.tenantId
    };
    const revoked = await revokeSupportAccess(revokeInput, api);
    expect(revoked).toMatchObject({
      replayed: false,
      receipt: {
        prior_version: 2,
        resulting_version: 3,
        transition: "REVOKE",
        grant: { revoked_at: expect.any(String) }
      }
    });
    const revokedSupportSession = await owner.authSession.findUniqueOrThrow({ where: { id: supportSession.sessionId } });
    expect(revokedSupportSession).toMatchObject({
      revokeReason: "SUPPORT_GRANT_REVOKED",
      revokedAt: expect.any(Date)
    });
    const revokedSupportCredentials = await owner.authRefreshCredential.findMany({
      where: { sessionId: supportSession.sessionId }
    });
    expect(revokedSupportCredentials.length).toBeGreaterThanOrEqual(2);
    expect(revokedSupportCredentials.every((credential) => credential.revokedAt !== null || credential.consumedAt !== null)).toBe(true);
    await expect(rotateRefreshCredential(refreshedSupportSession.refreshToken, {
      requestId: randomUUID(),
      userAgent: "post-revocation client"
    }, api)).rejects.toThrow(/REFRESH_CREDENTIAL_EXPIRED/u);
    const revokeReplay = await revokeSupportAccess({ ...revokeInput, requestId: randomUUID() }, api);
    expect(revokeReplay).toEqual({ receipt: revoked.receipt, replayed: true });
    await expect(revokeSupportAccess({
      ...revokeInput,
      grantId: tenantA.grantId,
      requestId: randomUUID()
    }, api)).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED", statusCode: 409 });
    const finalAudits = await owner.supportAccessAudit.findMany({
      orderBy: { occurredAt: "asc" },
      where: { grantId: grant.grant_id }
    });
    expect(finalAudits).toHaveLength(3);
    expect(finalAudits.map((audit) => [audit.action, audit.priorVersion, audit.resultingVersion])).toEqual([
      ["ISSUE_READ_ONLY", 0, 1],
      ["ELEVATE_WRITE", 1, 2],
      ["REVOKE", 2, 3]
    ]);
    await expect(owner.supportAccessAudit.update({
      data: { outcome: "MUTATED" },
      where: { id: finalAudits[0]!.id }
    })).rejects.toThrow(/append-only/u);
    await expect(owner.supportAccessAudit.delete({
      where: { id: finalAudits[0]!.id }
    })).rejects.toThrow(/append-only/u);
  });

  it("exports only the authenticated tenant projection and rejects an A/B scope mismatch", async () => {
    if (!api) throw new Error("Phase 202 disposable API client is unavailable.");
    await seedOwnerPrivacyAuthority();
    const exported = await buildAccountExport({
      authSubject: tenantA.userId,
      requestId: randomUUID(),
      sessionId: tenantA.sessionId,
      sessionType: "member",
      tenantId: tenantA.tenantId
    }, api);
    expect(exported).toMatchObject({
      scope: {
        external_providers_contacted: false,
        kind: "TENANT",
        organization_id: tenantA.organizationId,
        secret_material_included: false,
        tenant_id: tenantA.tenantId
      },
      summary: { teams: 1 },
      tenant: {
        id: tenantA.tenantId,
        organization_id: tenantA.organizationId,
        team_id: tenantA.teamId
      }
    });
    expect(exported.tasks.map((task) => task.id)).toContain(tenantA.taskId);
    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain(tenantB.taskId);
    expect(serialized).not.toContain(tenantB.tenantId);
    expect(serialized).not.toMatch(/encryptedValue|passwordHash|tokenHash|secretReference|refreshToken/u);
    await expect(buildAccountExport({
      authSubject: tenantA.userId,
      requestId: randomUUID(),
      sessionId: tenantA.sessionId,
      sessionType: "member",
      tenantId: tenantB.tenantId
    }, api)).rejects.toThrow();
  });

  it("enforces tenant-scoped rate limits with idempotent receipts and independent tenant windows", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    const bucket = `phase202.integration.${suffix}`;
    const requestOne = randomUUID();
    const policy = { bucket, limit: 2, windowSeconds: 300 };
    const first = await consumeTenantRateLimit({
      ...policy,
      authSubject: tenantA.userId,
      requestId: requestOne,
      tenantId: tenantA.tenantId
    }, api);
    const replay = await consumeTenantRateLimit({
      ...policy,
      authSubject: tenantA.userId,
      requestId: requestOne,
      tenantId: tenantA.tenantId
    }, api);
    const second = await consumeTenantRateLimit({
      ...policy,
      authSubject: tenantA.userId,
      requestId: randomUUID(),
      tenantId: tenantA.tenantId
    }, api);
    const blocked = await consumeTenantRateLimit({
      ...policy,
      authSubject: tenantA.userId,
      requestId: randomUUID(),
      tenantId: tenantA.tenantId
    }, api);
    const tenantBFirst = await consumeTenantRateLimit({
      ...policy,
      authSubject: tenantB.userId,
      requestId: randomUUID(),
      tenantId: tenantB.tenantId
    }, api);

    expect(first).toMatchObject({ blocked: false, limit: 2, requestCount: 1 });
    expect(replay).toEqual(first);
    expect(second).toMatchObject({ blocked: false, requestCount: 2 });
    expect(blocked).toMatchObject({ blocked: true, requestCount: 3 });
    expect(tenantBFirst).toMatchObject({ blocked: false, requestCount: 1 });
    const receipts = await owner.tenantRateLimitReceipt.findMany({ where: { bucket } });
    expect(receipts).toHaveLength(4);
    expect(receipts.filter((receipt) => receipt.tenantId === tenantA.tenantId)).toHaveLength(3);
    expect(receipts.filter((receipt) => receipt.tenantId === tenantB.tenantId)).toHaveLength(1);
    expect(receipts.every((receipt) => receipt.actorId !== null)).toBe(true);
  });

  it("forces exact personal, email, and recovery-token isolation for authentication records", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    await owner.$executeRaw`
      INSERT INTO public."EmailVerificationToken" (
        "id","userId","tokenHash","expiresAt","flow"
      ) VALUES
        (${`verification-a-${suffix}`},${tenantA.userId},${verificationHashA},now()+interval '1 day','member'),
        (${`verification-b-${suffix}`},${tenantB.userId},${verificationHashB},now()+interval '1 day','member'),
        (${`verification-expired-a-${suffix}`},${tenantA.userId},${verificationExpiredHashA},now()-interval '1 day','member')
    `;
    await owner.$executeRaw`
      INSERT INTO public."PasswordResetToken" (
        "id","userId","tokenHash","expiresAt","flow"
      ) VALUES
        (${`reset-a-${suffix}`},${tenantA.userId},${resetHashA},now()+interval '1 day','member'),
        (${`reset-a-sibling-${suffix}`},${tenantA.userId},${resetSiblingHashA},now()+interval '1 day','member'),
        (${`reset-b-${suffix}`},${tenantB.userId},${resetHashB},now()+interval '1 day','member')
    `;

    const forced = await owner.$queryRaw<Array<{
      forced: boolean;
      rowSecurity: boolean;
      tableName: string;
    }>>`
      SELECT relname AS "tableName",relrowsecurity AS "rowSecurity",relforcerowsecurity AS forced
      FROM pg_class
      WHERE oid IN (
        'public."User"'::regclass,
        'public."EmailVerificationToken"'::regclass,
        'public."PasswordResetToken"'::regclass
      )
      ORDER BY relname
    `;
    expect(forced).toEqual([
      { forced: true, rowSecurity: true, tableName: "EmailVerificationToken" },
      { forced: true, rowSecurity: true, tableName: "PasswordResetToken" },
      { forced: true, rowSecurity: true, tableName: "User" }
    ]);

    const readCounts = () => api!.$queryRaw<Array<{
      resetTokens: number;
      users: number;
      verificationTokens: number;
    }>>`
      SELECT
        (SELECT count(*)::integer FROM public."User") AS users,
        (SELECT count(*)::integer FROM public."EmailVerificationToken") AS "verificationTokens",
        (SELECT count(*)::integer FROM public."PasswordResetToken") AS "resetTokens"
    `;
    expect(await readCounts()).toEqual([{ resetTokens: 0, users: 0, verificationTokens: 0 }]);

    const emailScoped = await withPreAuthEmailSession(api, {
      actionReason: "phase202.integration.auth.email-scope",
      email: tenantAEmail,
      requestId: randomUUID()
    }, async (transaction, identity) => ({
      identity,
      resetUsers: await transaction.$queryRaw<Array<{ userId: string }>>`
        SELECT DISTINCT "userId" FROM public."PasswordResetToken" ORDER BY "userId"
      `,
      users: await transaction.$queryRaw<Array<{ email: string; id: string }>>`
        SELECT "id","email" FROM public."User" ORDER BY "id"
      `,
      verificationUsers: await transaction.$queryRaw<Array<{ userId: string }>>`
        SELECT DISTINCT "userId" FROM public."EmailVerificationToken" ORDER BY "userId"
      `
    }));
    expect(emailScoped).toEqual({
      identity: { email: tenantAEmail, userId: tenantA.userId },
      resetUsers: [{ userId: tenantA.userId }],
      users: [{ email: tenantAEmail, id: tenantA.userId }],
      verificationUsers: [{ userId: tenantA.userId }]
    });
    expect(await readCounts()).toEqual([{ resetTokens: 0, users: 0, verificationTokens: 0 }]);

    const verificationScoped = await withRecoveryTokenSession(api, {
      actionReason: "phase202.integration.auth.verification-token",
      requestId: randomUUID(),
      tokenHash: verificationHashA,
      tokenKind: "EMAIL_VERIFICATION"
    }, async (transaction) => ({
      resets: await transaction.passwordResetToken.count(),
      users: await transaction.user.findMany({ select: { id: true } }),
      verifications: await transaction.emailVerificationToken.findMany({
        select: { tokenHash: true, userId: true }
      })
    }));
    expect(verificationScoped).toEqual({
      resets: 0,
      users: [{ id: tenantA.userId }],
      verifications: [{ tokenHash: verificationHashA, userId: tenantA.userId }]
    });
    await owner.emailVerificationToken.update({
      data: { consumedAt: new Date() },
      where: { tokenHash: verificationHashA }
    });
    const consumedVerificationScope = await withRecoveryTokenSession(api, {
      actionReason: "phase202.integration.auth.consumed-verification-token",
      requestId: randomUUID(),
      tokenHash: verificationHashA,
      tokenKind: "EMAIL_VERIFICATION"
    }, async (transaction) => ({
      users: await transaction.user.count(),
      verifications: await transaction.emailVerificationToken.count()
    }));
    expect(consumedVerificationScope).toEqual({ users: 0, verifications: 0 });
    const expiredVerificationScope = await withRecoveryTokenSession(api, {
      actionReason: "phase202.integration.auth.expired-verification-token",
      requestId: randomUUID(),
      tokenHash: verificationExpiredHashA,
      tokenKind: "EMAIL_VERIFICATION"
    }, async (transaction) => ({
      users: await transaction.user.count(),
      verifications: await transaction.emailVerificationToken.count()
    }));
    expect(expiredVerificationScope).toEqual({ users: 0, verifications: 0 });
    const wrongHashScope = await withRecoveryTokenSession(api, {
      actionReason: "phase202.integration.auth.wrong-token-hash",
      requestId: randomUUID(),
      tokenHash: createHash("sha256").update(`wrong-${suffix}`).digest("hex"),
      tokenKind: "EMAIL_VERIFICATION"
    }, async (transaction) => ({
      resets: await transaction.passwordResetToken.count(),
      users: await transaction.user.count(),
      verifications: await transaction.emailVerificationToken.count()
    }));
    expect(wrongHashScope).toEqual({ resets: 0, users: 0, verifications: 0 });
    const wrongKindScope = await withRecoveryTokenSession(api, {
      actionReason: "phase202.integration.auth.wrong-token-kind",
      requestId: randomUUID(),
      tokenHash: verificationHashB,
      tokenKind: "PASSWORD_RESET"
    }, async (transaction) => ({
      resets: await transaction.passwordResetToken.count(),
      users: await transaction.user.count(),
      verifications: await transaction.emailVerificationToken.count()
    }));
    expect(wrongKindScope).toEqual({ resets: 0, users: 0, verifications: 0 });

    const consumedForA = await withRecoveryTokenSession(api, {
      actionReason: "phase202.integration.auth.password-reset",
      requestId: randomUUID(),
      tokenHash: resetHashA,
      tokenKind: "PASSWORD_RESET"
    }, async (transaction) => {
      const beforeClaim = {
        resets: await transaction.passwordResetToken.findMany({
          select: { tokenHash: true, userId: true }
        }),
        users: await transaction.user.findMany({ select: { id: true } }),
        verifications: await transaction.emailVerificationToken.count()
      };
      const identity = await transaction.$queryRaw<Array<{ appUserId: string }>>`
        SELECT entral.bind_authenticated_app_user(${tenantA.userId}) AS "appUserId"
      `;
      await transaction.$queryRaw`
        SELECT set_config(
          'app.phase202_actor_id',
          entral.phase202_resolve_human_actor(${tenantA.userId})::text,
          true
        )
      `;
      const consumed = await transaction.passwordResetToken.updateMany({
        data: { consumedAt: new Date() },
        where: { consumedAt: null, userId: tenantA.userId }
      });
      return { beforeClaim, consumed: consumed.count, identity };
    });
    expect(consumedForA).toEqual({
      beforeClaim: {
        resets: [{ tokenHash: resetHashA, userId: tenantA.userId }],
        users: [{ id: tenantA.userId }],
        verifications: 0
      },
      consumed: 2,
      identity: [{ appUserId: expect.any(String) }]
    });
    const resetReadback = await owner.passwordResetToken.findMany({
      orderBy: { id: "asc" },
      select: { consumedAt: true, id: true, userId: true },
      where: { id: { in: [`reset-a-${suffix}`, `reset-a-sibling-${suffix}`, `reset-b-${suffix}`] } }
    });
    expect(resetReadback).toEqual([
      { consumedAt: expect.any(Date), id: `reset-a-${suffix}`, userId: tenantA.userId },
      { consumedAt: expect.any(Date), id: `reset-a-sibling-${suffix}`, userId: tenantA.userId },
      { consumedAt: null, id: `reset-b-${suffix}`, userId: tenantB.userId }
    ]);

    const personalScoped = await withPersonalSession(api, {
      actionReason: "phase202.integration.auth.personal-scope",
      authSubject: tenantA.userId,
      requestId: randomUUID()
    }, async (transaction) => ({
      foreignResetUpdates: await transaction.passwordResetToken.updateMany({
        data: { consumedAt: new Date() },
        where: { userId: tenantB.userId }
      }),
      resetUsers: await transaction.passwordResetToken.findMany({
        distinct: ["userId"],
        select: { userId: true }
      }),
      users: await transaction.user.findMany({ select: { id: true } }),
      verificationUsers: await transaction.emailVerificationToken.findMany({
        distinct: ["userId"],
        select: { userId: true }
      })
    }));
    expect(personalScoped).toEqual({
      foreignResetUpdates: { count: 0 },
      resetUsers: [{ userId: tenantA.userId }],
      users: [{ id: tenantA.userId }],
      verificationUsers: [{ userId: tenantA.userId }]
    });
    await expect(withPersonalSession(api, {
      actionReason: "phase202.integration.auth.forbidden-user-column",
      authSubject: tenantA.userId,
      requestId: randomUUID()
    }, (transaction) => transaction.$executeRaw`
      UPDATE public."User" SET "role"='ADMIN' WHERE "id"=${tenantA.userId}
    `)).rejects.toThrow();
    await expect(withPersonalSession(api, {
      actionReason: "phase202.integration.auth.forbidden-token-column",
      authSubject: tenantA.userId,
      requestId: randomUUID()
    }, (transaction) => transaction.$executeRaw`
      UPDATE public."PasswordResetToken"
      SET "tokenHash"=${resetHashB}
      WHERE "id"=${`reset-a-${suffix}`}
    `)).rejects.toThrow();
    expect(await readCounts()).toEqual([{ resetTokens: 0, users: 0, verificationTokens: 0 }]);
  });

  it("denies unbound direct API-role account mutation and physical deletion", async () => {
    if (!api) throw new Error("Phase 202 disposable API client is unavailable.");
    await expect(api.$executeRaw`
      UPDATE public."User" SET "name"="name" WHERE "id"=${tenantA.userId}
    `).rejects.toThrow();
    await expect(api.$executeRaw`
      DELETE FROM public."User" WHERE "id"=${tenantA.userId}
    `).rejects.toThrow();
  });

  it("rejects account deidentification atomically while the account is the last active owner", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    await seedOwnerPrivacyAuthority();
    await expect(withPersonalSession(api, {
      actionReason: "privacy.integration.last-owner",
      authSubject: tenantA.userId,
      requestId: randomUUID()
    }, async (transaction) => transaction.$queryRaw`
      SELECT * FROM entral.phase202_prepare_account_deidentification(
        ${tenantA.sessionId}::uuid,600,${randomUUID()},${`last-owner-${suffix}`}
      )
    `, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }))
      .rejects.toThrow(/LAST_ACTIVE_OWNER_REQUIRED/);

    const unchanged = await owner.$queryRaw<Array<{
      actorStatus: string;
      assignmentStatus: string;
      deletedAt: Date | null;
      membershipStatus: string;
      receiptCount: bigint;
      revokedAt: Date | null;
    }>>`
      SELECT account."deletedAt" AS "deletedAt",actor."status" AS "actorStatus",
             assignment."status" AS "assignmentStatus",member."status" AS "membershipStatus",
             session."revokedAt" AS "revokedAt",
             (SELECT count(*) FROM public."AccountDeidentificationReceipt" receipt
              WHERE receipt."userId"=${tenantA.userId}) AS "receiptCount"
      FROM public."User" account
      JOIN public."IdentityActor" actor ON actor."humanUserId"=account."id"
      JOIN public."TenantActorAssignment" assignment
        ON assignment."actorId"=actor."id" AND assignment."tenantId"=${tenantA.tenantId}::uuid
      JOIN public."TeamMember" member
        ON member."userId"=account."id" AND member."teamId"=${tenantA.teamId}
      JOIN public."AuthSession" session ON session."id"=${tenantA.sessionId}::uuid
      WHERE account."id"=${tenantA.userId}
    `;
    expect(unchanged).toEqual([expect.objectContaining({
      actorStatus: "ACTIVE",
      assignmentStatus: "ACTIVE",
      deletedAt: null,
      membershipStatus: "ACTIVE",
      receiptCount: 0n,
      revokedAt: null
    })]);
  });

  it("deidentifies only the departing account after a genuine successor owner is active", async () => {
    if (!api || !owner) throw new Error("Phase 202 disposable database clients are unavailable.");
    await seedOwnerPrivacyAuthority();
    await createHumanIdentity({
      actorId: successorActorId,
      appUserId: successorAppUserId,
      email: `phase202-successor-${suffix}@example.test`,
      name: "Phase 202 Successor Owner",
      userId: successorUserId
    });
    await owner.$executeRaw`
      INSERT INTO public."TenantActorAssignment" (
        "actorId","organizationId","tenantId","role","authorityDomains","status","version","updatedAt"
      ) VALUES (
        ${successorActorId}::uuid,${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
        'OWNER',ARRAY['IDENTITY','TENANCY']::text[],'ACTIVE',1,now()
      )
    `;
    await owner.$executeRaw`
      INSERT INTO public."TeamMember" (
        "userId","teamId","role","status","version","organizationId","tenantId",
        "actorId","createdBy","ownedBy","joinedAt","updatedAt"
      ) VALUES (
        ${successorUserId},${tenantA.teamId},'OWNER','ACTIVE',1,
        ${tenantA.organizationId}::uuid,${tenantA.tenantId}::uuid,
        ${successorActorId}::uuid,${successorActorId}::uuid,${successorActorId}::uuid,now(),now()
      )
    `;

    const membershipReceiptId = randomUUID();
    const notificationId = randomUUID();
    const deliverySecretId = randomUUID();
    const deliveryId = randomUUID();
    const requestId = randomUUID();
    const idempotencyKey = `deidentify-success-${suffix}`;
    const invoke = () => withPersonalSession(api!, {
      actionReason: "privacy.integration.success",
      authSubject: tenantA.userId,
      requestId
    }, async (transaction) => transaction.$queryRaw<Array<{
      membershipReceiptIds: string[];
      receiptHash: string;
      receiptId: string;
    }>>`
      SELECT "receiptId"::text AS "receiptId","receiptHash",
             "membershipReceiptIds"::text[] AS "membershipReceiptIds"
      FROM entral.phase202_complete_account_deidentification(
        ${tenantA.sessionId}::uuid,600,${requestId},${idempotencyKey},
        ARRAY[${membershipReceiptId}::uuid]::uuid[],ARRAY[${notificationId}::uuid]::uuid[],
        ARRAY[${deliverySecretId}::uuid]::uuid[],ARRAY[${deliveryId}::uuid]::uuid[],
        ARRAY[${"a".repeat(64)}]::text[],ARRAY[${secretEnvelope()}]::text[],'integration-v1'
      )
    `, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const concurrent = await Promise.allSettled([invoke(), invoke()]);
    expect(concurrent.filter((entry) => entry.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((entry) => entry.status === "rejected")).toHaveLength(1);
    const receipts = concurrent.find((entry) => entry.status === "fulfilled")!.value;

    expect(receipts).toEqual([expect.objectContaining({
      membershipReceiptIds: [membershipReceiptId],
      receiptHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      receiptId: expect.any(String)
    })]);

    const postState = await owner.$queryRaw<Array<{
      actorStatus: string;
      assignmentStatus: string;
      deletedAt: Date;
      deletionVersion: number;
      deliveryCount: bigint;
      memberReceiptCount: bigint;
      membershipStatus: string;
      notificationCount: bigint;
      personalSecretRevokedAt: Date;
      privacyReceiptCount: bigint;
      sessionRevokeReason: string;
      successorStatus: string;
      taskCount: bigint;
      teamCount: bigint;
    }>>`
      SELECT account."deletedAt" AS "deletedAt",account."deletionVersion" AS "deletionVersion",
             actor."status" AS "actorStatus",assignment."status" AS "assignmentStatus",
             member."status" AS "membershipStatus",successor."status" AS "successorStatus",
             session."revokeReason" AS "sessionRevokeReason",personal_secret."revokedAt" AS "personalSecretRevokedAt",
             (SELECT count(*) FROM public."AccountDeidentificationReceipt" receipt
              WHERE receipt."userId"=${tenantA.userId}) AS "privacyReceiptCount",
             (SELECT count(*) FROM public."MembershipMutationReceipt" receipt
              WHERE receipt."id"=${membershipReceiptId}::uuid) AS "memberReceiptCount",
             (SELECT count(*) FROM public."NotificationEvidence" evidence
              WHERE evidence."id"=${notificationId}::uuid) AS "notificationCount",
             (SELECT count(*) FROM public."NotificationDeliveryOutbox" delivery
              WHERE delivery."id"=${deliveryId}::uuid) AS "deliveryCount",
             (SELECT count(*) FROM public."Team" team WHERE team."id"=${tenantA.teamId}) AS "teamCount",
             (SELECT count(*) FROM public."Task" task WHERE task."id"=${tenantA.taskId}) AS "taskCount"
      FROM public."User" account
      JOIN public."IdentityActor" actor ON actor."humanUserId"=account."id"
      JOIN public."TenantActorAssignment" assignment
        ON assignment."actorId"=actor."id" AND assignment."tenantId"=${tenantA.tenantId}::uuid
      JOIN public."TeamMember" member
        ON member."userId"=account."id" AND member."teamId"=${tenantA.teamId}
      JOIN public."TeamMember" successor
        ON successor."userId"=${successorUserId} AND successor."teamId"=${tenantA.teamId}
      JOIN public."AuthSession" session ON session."id"=${tenantA.sessionId}::uuid
      JOIN public."PersonalSecretReference" personal_secret ON personal_secret."id"=${privacySecretId}::uuid
      WHERE account."id"=${tenantA.userId}
    `;
    expect(postState).toEqual([expect.objectContaining({
      actorStatus: "REVOKED",
      assignmentStatus: "REVOKED",
      deletedAt: expect.any(Date),
      deletionVersion: 1,
      deliveryCount: 1n,
      memberReceiptCount: 1n,
      membershipStatus: "REMOVED",
      notificationCount: 1n,
      personalSecretRevokedAt: expect.any(Date),
      privacyReceiptCount: 1n,
      sessionRevokeReason: "ACCOUNT_DEIDENTIFIED",
      successorStatus: "ACTIVE",
      taskCount: 1n,
      teamCount: 1n
    })]);

    await expect(api.$transaction((transaction) => transaction.$queryRaw`
      SELECT entral.bind_authenticated_app_user(${tenantA.userId})
    `)).rejects.toThrow(/deidentified/i);
    await expect(api.$executeRaw`
      UPDATE public."IdentityActor" SET "status"='ACTIVE' WHERE "id"=${tenantA.actorId}::uuid
    `).rejects.toThrow();

    const foreignReceiptVisibility = await withPersonalSession(api, {
      actionReason: "privacy.integration.receipt-isolation",
      authSubject: tenantB.userId,
      requestId: randomUUID()
    }, (transaction) => transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"::text AS "id" FROM public."AccountDeidentificationReceipt"
      WHERE "userId"=${tenantA.userId}
    `);
    expect(foreignReceiptVisibility).toEqual([]);
  });
});
