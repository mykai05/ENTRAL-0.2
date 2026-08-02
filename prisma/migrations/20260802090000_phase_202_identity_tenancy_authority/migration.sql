-- Phase 202: Identity, tenancy, sessions, authority, secret broker, and support access.
-- Forward-only migration. Legacy user ownership is preserved and projected into
-- explicit organization/tenant/actor ownership before later customer releases.
BEGIN;
SET LOCAL search_path = public, entral, pg_catalog, pg_temp;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "User"
  ADD COLUMN "deletedAt" timestamptz,
  ADD COLUMN "deletionVersion" integer NOT NULL DEFAULT 0,
  ADD CONSTRAINT "User_deletion_version_check" CHECK ("deletionVersion">=0),
  ADD CONSTRAINT "User_deleted_version_consistency_check" CHECK (
    ("deletedAt" IS NULL AND "deletionVersion"=0)
    OR ("deletedAt" IS NOT NULL AND "deletionVersion">0)
  );
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

CREATE OR REPLACE FUNCTION entral.bind_authenticated_app_user(p_auth_subject text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=entral,public,pg_catalog,pg_temp
AS $phase202_bind_authenticated_app_user$
DECLARE source_user record; bound_user_id uuid; bound_user_active boolean;
BEGIN
  PERFORM set_config('app.phase202_auth_subject',p_auth_subject,true);
  SELECT account."id",account."email",account."name",account."role",account."deletedAt"
  INTO source_user
  FROM public."User" account
  WHERE account."id"=p_auth_subject;
  IF NOT FOUND OR source_user."deletedAt" IS NOT NULL THEN
    RAISE EXCEPTION 'Authenticated application subject does not exist or is deidentified'
      USING ERRCODE='28000';
  END IF;

  SELECT canonical_user.id,canonical_user.is_active INTO bound_user_id,bound_user_active
  FROM entral.app_users canonical_user
  WHERE canonical_user.auth_subject=source_user.id
  FOR UPDATE;
  IF bound_user_id IS NOT NULL AND NOT bound_user_active THEN
    RAISE EXCEPTION 'Authenticated application subject is inactive' USING ERRCODE='28000';
  END IF;
  IF bound_user_id IS NULL THEN
    SELECT canonical_user.id INTO bound_user_id
    FROM entral.app_users canonical_user
    WHERE canonical_user.email=source_user.email AND canonical_user.auth_subject IS NULL
      AND canonical_user.auth_link_eligible AND canonical_user.is_active
    FOR UPDATE;
  END IF;
  IF bound_user_id IS NULL THEN
    INSERT INTO entral.app_users(email,display_name,is_human_authority,is_active,auth_subject)
    VALUES (source_user.email,source_user.name,source_user.role='ADMIN',true,source_user.id)
    ON CONFLICT (email) DO NOTHING RETURNING id INTO bound_user_id;
    IF bound_user_id IS NULL THEN
      SELECT canonical_user.id INTO bound_user_id
      FROM entral.app_users canonical_user
      WHERE canonical_user.email=source_user.email AND canonical_user.auth_subject IS NULL
        AND canonical_user.auth_link_eligible AND canonical_user.is_active
      FOR UPDATE;
    END IF;
  END IF;
  IF bound_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated application subject conflicts with an existing canonical identity'
      USING ERRCODE='28000';
  END IF;

  PERFORM set_config('app.user_id',bound_user_id::text,true);
  PERFORM set_config('app.actor_kind','HUMAN',true);
  PERFORM set_config('app.actor_id',bound_user_id::text,true);
  UPDATE entral.app_users canonical_user
  SET email=source_user.email,display_name=source_user.name,
      is_human_authority=source_user.role='ADMIN',is_active=true,
      auth_subject=source_user.id,auth_link_eligible=false
  WHERE canonical_user.id=bound_user_id AND canonical_user.is_active
    AND (canonical_user.email,canonical_user.display_name,canonical_user.is_human_authority,
         canonical_user.is_active,canonical_user.auth_subject,canonical_user.auth_link_eligible)
      IS DISTINCT FROM
        (source_user.email,source_user.name,source_user.role='ADMIN',true,source_user.id,false);
  RETURN bound_user_id;
END $phase202_bind_authenticated_app_user$;

ALTER TABLE "Team"
  ADD COLUMN "organizationId" uuid DEFAULT gen_random_uuid(),
  ADD COLUMN "tenantId" uuid DEFAULT gen_random_uuid(),
  ADD COLUMN "environment" text NOT NULL DEFAULT 'PRODUCTION',
  ADD COLUMN "dataResidency" text NOT NULL DEFAULT 'US',
  ADD COLUMN "ownershipVersion" integer NOT NULL DEFAULT 1;

UPDATE "Team"
SET "organizationId" = gen_random_uuid(), "tenantId" = gen_random_uuid()
WHERE "organizationId" IS NULL OR "tenantId" IS NULL;

ALTER TABLE "Team"
  ALTER COLUMN "organizationId" SET NOT NULL,
  ALTER COLUMN "tenantId" SET NOT NULL,
  ADD CONSTRAINT "Team_environment_check" CHECK ("environment" IN ('DEVELOPMENT', 'STAGING', 'PRODUCTION')),
  ADD CONSTRAINT "Team_ownership_version_check" CHECK ("ownershipVersion" >= 1);
CREATE UNIQUE INDEX "Team_organizationId_key" ON "Team"("organizationId");
CREATE UNIQUE INDEX "Team_tenantId_key" ON "Team"("tenantId");

ALTER TABLE "TeamMember"
  ADD COLUMN "status" text NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "version" integer NOT NULL DEFAULT 1,
  ADD COLUMN "suspendedAt" timestamptz,
  ADD COLUMN "removedAt" timestamptz,
  ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT "TeamMember_status_check" CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'REMOVED')),
  ADD CONSTRAINT "TeamMember_version_check" CHECK ("version" >= 1);
CREATE INDEX "TeamMember_teamId_status_idx" ON "TeamMember"("teamId", "status");

CREATE OR REPLACE FUNCTION public."enforceEntralBaseMemberSeat"()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp
AS $$
DECLARE access_enabled boolean; seat_limit integer; current_members integer;
BEGIN
  IF NEW."status"='REMOVED' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD."teamId"=NEW."teamId" AND OLD."status"<>'REMOVED' THEN RETURN NEW; END IF;
  SELECT "memberAccessEnabled","memberSeatLimit" INTO access_enabled,seat_limit
  FROM "Team" WHERE "id"=NEW."teamId" FOR UPDATE;
  IF access_enabled THEN
    SELECT count(*) INTO current_members FROM "TeamMember"
    WHERE "teamId"=NEW."teamId" AND "status"<>'REMOVED';
    IF current_members>=seat_limit THEN
      RAISE EXCEPTION 'Entral Base member seat limit reached' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS "TeamMember_entralBaseSeatLimit" ON "TeamMember";
CREATE TRIGGER "TeamMember_entralBaseSeatLimit"
  BEFORE INSERT OR UPDATE OF "teamId","status" ON "TeamMember"
  FOR EACH ROW EXECUTE FUNCTION public."enforceEntralBaseMemberSeat"();

CREATE OR REPLACE FUNCTION public."enforceEntralBaseAccessSeatLimit"()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public,pg_temp
AS $$
DECLARE current_members integer;
BEGIN
  IF NEW."memberAccessEnabled" THEN
    SELECT count(*) INTO current_members FROM "TeamMember"
    WHERE "teamId"=NEW."id" AND "status"<>'REMOVED';
    IF current_members>NEW."memberSeatLimit" THEN
      RAISE EXCEPTION 'Entral Base member seat limit exceeded' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TABLE "TenantBoundary" (
  "id" uuid PRIMARY KEY,
  "organizationId" uuid NOT NULL UNIQUE,
  "legacyTeamId" text NOT NULL UNIQUE REFERENCES "Team"("id") ON DELETE RESTRICT,
  "environment" text NOT NULL CHECK ("environment" IN ('DEVELOPMENT', 'STAGING', 'PRODUCTION')),
  "dataResidency" text NOT NULL,
  "status" text NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" >= 1),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "TenantBoundary_environment_status_idx" ON "TenantBoundary"("environment", "status");
CREATE INDEX "TenantBoundary_dataResidency_idx" ON "TenantBoundary"("dataResidency");
ALTER TABLE "TenantBoundary" ADD CONSTRAINT "TenantBoundary_id_organizationId_key" UNIQUE ("id","organizationId");

INSERT INTO "TenantBoundary" ("id", "organizationId", "legacyTeamId", "environment", "dataResidency")
SELECT "tenantId", "organizationId", "id", "environment", "dataResidency"
FROM "Team";

CREATE TABLE "BusinessBoundary" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL REFERENCES "Team"("organizationId") ON DELETE RESTRICT,
  "tenantId" uuid NOT NULL REFERENCES "TenantBoundary"("id") ON DELETE RESTRICT,
  "legacyStoreId" text UNIQUE,
  "canonicalBusinessId" uuid UNIQUE,
  "stableCode" text NOT NULL,
  "environment" text NOT NULL CHECK ("environment" IN ('DEVELOPMENT', 'STAGING', 'PRODUCTION')),
  "dataResidency" text NOT NULL,
  "status" text NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" >= 1),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId", "stableCode"),
  UNIQUE ("id", "tenantId", "organizationId"),
  FOREIGN KEY ("tenantId", "organizationId") REFERENCES "TenantBoundary"("id", "organizationId") ON DELETE RESTRICT
);
CREATE INDEX "BusinessBoundary_organizationId_status_idx" ON "BusinessBoundary"("organizationId", "status");
CREATE INDEX "BusinessBoundary_tenantId_status_idx" ON "BusinessBoundary"("tenantId", "status");

CREATE OR REPLACE FUNCTION entral.phase202_validate_canonical_business_reference()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
BEGIN
  IF NEW."canonicalBusinessId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM entral.businesses WHERE id=NEW."canonicalBusinessId") THEN
    RAISE EXCEPTION 'Canonical business reference does not exist' USING ERRCODE='23503';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "BusinessBoundary_canonical_business_reference_trigger"
BEFORE INSERT OR UPDATE OF "canonicalBusinessId" ON "BusinessBoundary"
FOR EACH ROW EXECUTE FUNCTION entral.phase202_validate_canonical_business_reference();

CREATE OR REPLACE FUNCTION entral.phase202_restrict_canonical_business_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "BusinessBoundary" WHERE "canonicalBusinessId"=OLD.id) THEN
    RAISE EXCEPTION 'Canonical business is tenant-bound and cannot be deleted' USING ERRCODE='23503';
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER phase202_tenant_boundary_delete_restrict
BEFORE DELETE ON entral.businesses FOR EACH ROW EXECUTE FUNCTION entral.phase202_restrict_canonical_business_delete();

CREATE TABLE "IdentityActor" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorType" text NOT NULL CHECK ("actorType" IN ('HUMAN', 'SERVICE', 'AGENT')),
  "humanUserId" text UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
  "serviceSubject" text UNIQUE,
  "agentId" text UNIQUE REFERENCES "Agent"("id") ON DELETE CASCADE,
  "status" text NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE', 'SUSPENDED', 'REVOKED')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "IdentityActor_exact_subject_check" CHECK (
    (("actorType" = 'HUMAN')::int + ("actorType" = 'SERVICE')::int + ("actorType" = 'AGENT')::int) = 1
    AND (("humanUserId" IS NOT NULL)::int + ("serviceSubject" IS NOT NULL)::int + ("agentId" IS NOT NULL)::int) = 1
    AND ("actorType" <> 'HUMAN' OR "humanUserId" IS NOT NULL)
    AND ("actorType" <> 'SERVICE' OR "serviceSubject" IS NOT NULL)
    AND ("actorType" <> 'AGENT' OR "agentId" IS NOT NULL)
  )
);
CREATE INDEX "IdentityActor_actorType_status_idx" ON "IdentityActor"("actorType", "status");
ALTER TABLE "IdentityActor" ADD CONSTRAINT "IdentityActor_id_humanUserId_key" UNIQUE ("id","humanUserId");

INSERT INTO "IdentityActor" ("actorType", "humanUserId") SELECT 'HUMAN', u."id" FROM "User" u;
INSERT INTO "IdentityActor" ("actorType", "agentId") SELECT 'AGENT', a."id" FROM "Agent" a;

INSERT INTO "IdentityActor" ("actorType", "serviceSubject")
SELECT 'SERVICE', 'canonical-app-user:' || au.id::text
FROM entral.app_users au
WHERE au.auth_subject IS NULL
  AND au.is_active
  AND NOT au.is_human_authority
  AND NOT au.auth_link_eligible;

CREATE TABLE "TenantActorAssignment" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "actorId" uuid NOT NULL REFERENCES "IdentityActor"("id") ON DELETE CASCADE,
  "organizationId" uuid NOT NULL,
  "tenantId" uuid NOT NULL,
  "role" text NOT NULL,
  "authorityDomains" text[] NOT NULL DEFAULT '{}',
  "status" text NOT NULL DEFAULT 'ACTIVE' CHECK ("status" IN ('ACTIVE','SUSPENDED','REVOKED')),
  "version" integer NOT NULL DEFAULT 1 CHECK ("version">=1),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("actorId","tenantId"),
  UNIQUE ("actorId","tenantId","organizationId"),
  FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT
);
CREATE INDEX "TenantActorAssignment_tenantId_role_status_idx" ON "TenantActorAssignment"("tenantId","role","status");
CREATE INDEX "TenantActorAssignment_organizationId_status_idx" ON "TenantActorAssignment"("organizationId","status");

INSERT INTO "TenantActorAssignment" ("actorId","organizationId","tenantId","role","authorityDomains","status")
SELECT actor."id", team."organizationId", team."tenantId", tm."role",
  CASE WHEN tm."role"='OWNER' THEN ARRAY['IDENTITY','TENANCY','OPERATIONS','FINANCE','INTEGRATIONS','SUPPORT']::text[]
       ELSE ARRAY['OPERATIONS']::text[] END,
  CASE WHEN tm."status"='ACTIVE' THEN 'ACTIVE' WHEN tm."status"='REMOVED' THEN 'REVOKED' ELSE 'SUSPENDED' END
FROM "TeamMember" tm
JOIN "Team" team ON team."id"=tm."teamId"
JOIN "IdentityActor" actor ON actor."humanUserId"=tm."userId";

INSERT INTO "TenantActorAssignment" ("actorId","organizationId","tenantId","role","authorityDomains")
SELECT agent_actor."id", assignment."organizationId", assignment."tenantId", 'AGENT', ARRAY['OPERATIONS']::text[]
FROM "Agent" agent
JOIN "IdentityActor" agent_actor ON agent_actor."agentId"=agent."id"
JOIN "IdentityActor" human_actor ON human_actor."humanUserId"=agent."userId"
JOIN "TenantActorAssignment" assignment ON assignment."actorId"=human_actor."id" AND assignment."status"='ACTIVE';

-- A service identity receives tenant assignment only from an unexpired
-- canonical Phase 150 SYSTEM scope grant. A service credential without that
-- explicit grant remains unable to choose any tenant.
INSERT INTO "TenantActorAssignment" ("actorId","organizationId","tenantId","role","authorityDomains")
SELECT service_actor."id", tenant."organizationId", tenant."id", 'SERVICE', ARRAY['OPERATIONS']::text[]
FROM "IdentityActor" service_actor
JOIN entral.scope_grants service_grant
  ON service_grant.user_id=split_part(service_actor."serviceSubject",':',2)::uuid
 AND service_grant.scope_type='SYSTEM' AND service_grant.scope_id IS NULL
 AND (service_grant.expires_at IS NULL OR service_grant.expires_at>now())
 AND service_grant.permissions && ARRAY['read','write','manage','run','publish_events','worker','worker.read','worker.write','*']::text[]
CROSS JOIN "TenantBoundary" tenant
WHERE service_actor."actorType"='SERVICE' AND service_actor."status"='ACTIVE'
ON CONFLICT ("actorId","tenantId") DO NOTHING;

CREATE OR REPLACE FUNCTION entral.phase202_assign_service_actors_to_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
BEGIN
  INSERT INTO "TenantActorAssignment" ("actorId","organizationId","tenantId","role","authorityDomains")
  SELECT actor."id", NEW."organizationId", NEW."id", 'SERVICE', ARRAY['OPERATIONS']::text[]
  FROM "IdentityActor" actor
  JOIN entral.scope_grants service_grant
    ON service_grant.user_id=split_part(actor."serviceSubject",':',2)::uuid
   AND service_grant.scope_type='SYSTEM' AND service_grant.scope_id IS NULL
   AND (service_grant.expires_at IS NULL OR service_grant.expires_at>now())
   AND service_grant.permissions && ARRAY['read','write','manage','run','publish_events','worker','worker.read','worker.write','*']::text[]
  WHERE actor."actorType"='SERVICE' AND actor."status"='ACTIVE'
  ON CONFLICT ("actorId","tenantId") DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER "TenantBoundary_service_assignment_trigger"
AFTER INSERT ON "TenantBoundary" FOR EACH ROW EXECUTE FUNCTION entral.phase202_assign_service_actors_to_tenant();

INSERT INTO "BusinessBoundary" (
  "organizationId", "tenantId", "legacyStoreId", "stableCode", "environment", "dataResidency"
)
SELECT team."organizationId", team."tenantId", store."id", 'legacy-store:' || store."id", team."environment", team."dataResidency"
FROM "ClientMerchStore" store
JOIN LATERAL (
  SELECT tm."teamId" FROM "TeamMember" tm
  WHERE tm."userId"=store."userId" AND tm."role"='OWNER' AND tm."status"='ACTIVE'
  GROUP BY tm."teamId" HAVING (SELECT count(*) FROM "TeamMember" own WHERE own."userId"=store."userId" AND own."role"='OWNER' AND own."status"='ACTIVE')=1
) owner_membership ON true
JOIN "Team" team ON team."id"=owner_membership."teamId";

-- Canonical Phase 140 businesses can be inherited only when exactly one tenant
-- exists. Multiple-tenant deployments must explicitly map them before release.
INSERT INTO "BusinessBoundary" ("organizationId","tenantId","canonicalBusinessId","stableCode","environment","dataResidency")
SELECT tenant."organizationId", tenant."id", business.id, business.stable_code, tenant."environment", tenant."dataResidency"
FROM entral.businesses business
CROSS JOIN "TenantBoundary" tenant
WHERE (SELECT count(*) FROM "TenantBoundary")=1;

-- BUSINESS grants authorize a service only for the tenant that owns the
-- canonical business. They never expand to unrelated tenant boundaries.
INSERT INTO "TenantActorAssignment" ("actorId","organizationId","tenantId","role","authorityDomains")
SELECT service_actor."id", boundary."organizationId", boundary."tenantId", 'SERVICE', ARRAY['OPERATIONS']::text[]
FROM "IdentityActor" service_actor
JOIN entral.scope_grants service_grant
  ON service_grant.user_id=split_part(service_actor."serviceSubject",':',2)::uuid
 AND service_grant.scope_type='BUSINESS'
 AND (service_grant.expires_at IS NULL OR service_grant.expires_at>now())
 AND service_grant.permissions && ARRAY['read','write','manage','run','publish_events','worker','worker.read','worker.write','*']::text[]
JOIN "BusinessBoundary" boundary ON boundary."canonicalBusinessId"=service_grant.scope_id
WHERE service_actor."actorType"='SERVICE' AND service_actor."status"='ACTIVE'
ON CONFLICT ("actorId","tenantId") DO NOTHING;

CREATE TABLE "CustomerRecordOwnership" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sourceTable" text NOT NULL,
  "sourceRecordId" text NOT NULL,
  "organizationId" uuid NOT NULL,
  "tenantId" uuid NOT NULL,
  "businessId" uuid,
  "actorId" uuid NOT NULL,
  "createdBy" uuid NOT NULL,
  "ownedBy" uuid NOT NULL,
  "mappingStrategy" text NOT NULL,
  "sourceUserId" text,
  "version" integer NOT NULL DEFAULT 1 CHECK ("version" >= 1),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("sourceTable", "sourceRecordId"),
  FOREIGN KEY ("tenantId", "organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("businessId", "tenantId", "organizationId") REFERENCES "BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("actorId", "tenantId", "organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("createdBy", "tenantId", "organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("ownedBy", "tenantId", "organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT
);
CREATE INDEX "CustomerRecordOwnership_tenantId_sourceTable_idx" ON "CustomerRecordOwnership"("tenantId", "sourceTable");
CREATE INDEX "CustomerRecordOwnership_organizationId_sourceTable_idx" ON "CustomerRecordOwnership"("organizationId", "sourceTable");
CREATE INDEX "CustomerRecordOwnership_businessId_sourceTable_idx" ON "CustomerRecordOwnership"("businessId", "sourceTable");

-- AuditLog is a mixed-scope evidence table. Tenant rows participate in the
-- customer-ownership inventory; personal and platform rows remain explicitly
-- classified, while ambiguous legacy provenance blocks release.
ALTER TABLE "AuditLog"
  ADD COLUMN "scopeKind" text,
  ADD COLUMN "scopeResolution" text,
  ADD COLUMN "organizationId" uuid,
  ADD COLUMN "tenantId" uuid,
  ADD COLUMN "businessId" uuid,
  ADD COLUMN "actorId" uuid,
  ADD COLUMN "createdBy" uuid,
  ADD COLUMN "ownedBy" uuid;

UPDATE "AuditLog" audit
SET "scopeKind"=CASE
      WHEN resolved.assignment_count=1 THEN 'TENANT'
      WHEN resolved.assignment_count=0 THEN 'PERSONAL'
      ELSE 'UNRESOLVED'
    END,
    "scopeResolution"=CASE
      WHEN resolved.assignment_count=1 THEN 'LEGACY_SINGLE_ASSIGNMENT_V1'
      WHEN resolved.assignment_count=0 THEN 'LEGACY_PERSONAL_ACTOR_V1'
      ELSE 'LEGACY_MULTI_ASSIGNMENT_UNRESOLVED_V1'
    END,
    "organizationId"=CASE WHEN resolved.assignment_count=1 THEN resolved.organization_id END,
    "tenantId"=CASE WHEN resolved.assignment_count=1 THEN resolved.tenant_id END,
    "actorId"=actor."id",
    "createdBy"=actor."id",
    "ownedBy"=actor."id"
FROM "IdentityActor" actor
CROSS JOIN LATERAL (
  SELECT count(*)::integer AS assignment_count,
         (array_agg(assignment."organizationId" ORDER BY assignment."createdAt",assignment."id"))[1] AS organization_id,
         (array_agg(assignment."tenantId" ORDER BY assignment."createdAt",assignment."id"))[1] AS tenant_id
  FROM "TenantActorAssignment" assignment
  WHERE assignment."actorId"=actor."id"
) resolved
WHERE audit."actorUserId"=actor."humanUserId" AND actor."actorType"='HUMAN';

UPDATE "AuditLog" SET
  "scopeKind"='PLATFORM',"scopeResolution"='PLATFORM_NO_ACTOR_V1'
WHERE "actorUserId" IS NULL AND "scopeKind" IS NULL;
UPDATE "AuditLog" SET
  "scopeKind"='UNRESOLVED',"scopeResolution"='LEGACY_ACTOR_UNRESOLVED_V1'
WHERE "actorUserId" IS NOT NULL AND "scopeKind" IS NULL;

ALTER TABLE "AuditLog"
  ALTER COLUMN "scopeKind" SET DEFAULT 'PLATFORM',
  ALTER COLUMN "scopeKind" SET NOT NULL,
  ALTER COLUMN "scopeResolution" SET DEFAULT 'PLATFORM_NO_ACTOR_V1',
  ALTER COLUMN "scopeResolution" SET NOT NULL,
  DROP CONSTRAINT "AuditLog_actorUserId_fkey",
  ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  ADD CONSTRAINT "AuditLog_phase202_tenant_org_fkey" FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "AuditLog_phase202_business_scope_fkey" FOREIGN KEY ("businessId","tenantId","organizationId") REFERENCES "BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "AuditLog_phase202_actor_scope_fkey" FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "AuditLog_phase202_created_by_scope_fkey" FOREIGN KEY ("createdBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "AuditLog_phase202_owned_by_scope_fkey" FOREIGN KEY ("ownedBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "AuditLog_phase202_scope_kind_check" CHECK ("scopeKind" IN ('TENANT','PERSONAL','PLATFORM','UNRESOLVED')),
  ADD CONSTRAINT "AuditLog_phase202_scope_tuple_check" CHECK (
    ("scopeKind"='TENANT' AND "organizationId" IS NOT NULL AND "tenantId" IS NOT NULL
      AND "actorId" IS NOT NULL AND "createdBy" IS NOT NULL AND "ownedBy" IS NOT NULL)
    OR ("scopeKind"='PERSONAL' AND "organizationId" IS NULL AND "tenantId" IS NULL AND "businessId" IS NULL
      AND "actorId" IS NOT NULL AND "createdBy" IS NOT NULL AND "ownedBy" IS NOT NULL)
    OR ("scopeKind"='PLATFORM' AND "organizationId" IS NULL AND "tenantId" IS NULL AND "businessId" IS NULL
      AND (("actorId" IS NULL AND "createdBy" IS NULL AND "ownedBy" IS NULL)
        OR ("actorId" IS NOT NULL AND "createdBy" IS NOT NULL AND "ownedBy" IS NOT NULL)))
    OR ("scopeKind"='UNRESOLVED' AND "organizationId" IS NULL AND "tenantId" IS NULL AND "businessId" IS NULL)
  );
CREATE INDEX "AuditLog_phase202_tenant_idx" ON "AuditLog"("tenantId","organizationId","createdAt");
CREATE INDEX "AuditLog_phase202_scope_idx" ON "AuditLog"("scopeKind","createdAt");

INSERT INTO "CustomerRecordOwnership" (
  "sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy",
  "mappingStrategy","sourceUserId"
)
SELECT 'AuditLog',audit."id",audit."organizationId",audit."tenantId",audit."businessId",
       audit."actorId",audit."createdBy",audit."ownedBy",'AUDIT_SCOPE_V1',audit."actorUserId"
FROM "AuditLog" audit
WHERE audit."scopeKind"='TENANT';

CREATE OR REPLACE FUNCTION entral.phase202_effective_actor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('app.phase202_actor_id',true),'')::uuid,
    (
      SELECT actor."id"
      FROM entral.app_users canonical_user
      JOIN "IdentityActor" actor
        ON actor."actorType"='SERVICE' AND actor."status"='ACTIVE'
       AND actor."serviceSubject"='canonical-app-user:'||canonical_user.id::text
      WHERE pg_has_role(session_user,'entral_worker','USAGE')
        AND canonical_user.id=NULLIF(current_setting('app.phase202_worker_app_user_id',true),'')::uuid
        AND canonical_user.auth_subject IS NULL AND canonical_user.is_active
      LIMIT 1
    )
  )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_classify_audit_log()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_audit_classify$
DECLARE
  requested_tenant uuid := NULLIF(current_setting('app.tenant_id',true),'')::uuid;
  connected_actor uuid := entral.phase202_effective_actor_id();
  worker_bound boolean := NULLIF(current_setting('app.phase202_actor_id',true),'') IS NULL
    AND pg_has_role(session_user,'entral_worker','USAGE')
    AND NULLIF(current_setting('app.phase202_worker_app_user_id',true),'') IS NOT NULL;
  resolved_actor record;
  resolved_assignment record;
  assignment_count integer;
BEGIN
  IF requested_tenant IS NULL AND worker_bound THEN
    SELECT (array_agg(assignment."tenantId" ORDER BY assignment."tenantId"))[1] INTO requested_tenant
    FROM "TenantActorAssignment" assignment
    WHERE assignment."actorId"=connected_actor AND assignment."status"='ACTIVE'
    HAVING count(*)=1;
  END IF;
  NEW."organizationId" := NULL; NEW."tenantId" := NULL; NEW."businessId" := NULL;
  NEW."actorId" := NULL; NEW."createdBy" := NULL; NEW."ownedBy" := NULL;
  IF requested_tenant IS NOT NULL THEN
    IF connected_actor IS NULL THEN RAISE EXCEPTION 'Verified audit actor context is required' USING ERRCODE='28000'; END IF;
    SELECT actor."actorType",actor."humanUserId",assignment."organizationId",assignment."tenantId"
      INTO resolved_actor
    FROM "IdentityActor" actor
    JOIN "TenantActorAssignment" assignment ON assignment."actorId"=actor."id"
    WHERE actor."id"=connected_actor AND actor."status"='ACTIVE'
      AND assignment."tenantId"=requested_tenant AND assignment."status"='ACTIVE';
    IF resolved_actor."tenantId" IS NULL THEN RAISE EXCEPTION 'Active audit tenant assignment is required' USING ERRCODE='42501'; END IF;
    IF resolved_actor."actorType"='HUMAN' AND NEW."actorUserId" IS DISTINCT FROM resolved_actor."humanUserId" THEN
      RAISE EXCEPTION 'Audit human actor binding mismatch' USING ERRCODE='42501';
    END IF;
    IF resolved_actor."actorType" IN ('SERVICE','AGENT') AND NEW."actorUserId" IS NOT NULL THEN
      IF worker_bound THEN NEW."actorUserId":=NULL;
      ELSE RAISE EXCEPTION 'Non-human audit actors cannot claim a human subject' USING ERRCODE='42501';
      END IF;
    END IF;
    NEW."scopeKind":='TENANT'; NEW."scopeResolution":='BOUND_TENANT_SESSION_V1';
    NEW."organizationId":=resolved_actor."organizationId"; NEW."tenantId":=resolved_actor."tenantId";
    NEW."actorId":=connected_actor; NEW."createdBy":=connected_actor; NEW."ownedBy":=connected_actor;
    RETURN NEW;
  END IF;

  IF connected_actor IS NOT NULL THEN
    SELECT "actorType","humanUserId" INTO resolved_actor FROM "IdentityActor"
    WHERE "id"=connected_actor AND "status"='ACTIVE';
    IF resolved_actor."actorType" IS NULL THEN RAISE EXCEPTION 'Active audit actor is required' USING ERRCODE='28000'; END IF;
    IF resolved_actor."actorType"='HUMAN' THEN
      IF NEW."actorUserId" IS DISTINCT FROM resolved_actor."humanUserId" THEN
        RAISE EXCEPTION 'Audit personal actor binding mismatch' USING ERRCODE='42501';
      END IF;
      NEW."scopeKind":='PERSONAL'; NEW."scopeResolution":='BOUND_PERSONAL_SESSION_V1';
    ELSE
      IF NEW."actorUserId" IS NOT NULL THEN RAISE EXCEPTION 'Non-human audit actors cannot claim a human subject' USING ERRCODE='42501'; END IF;
      NEW."scopeKind":='PLATFORM'; NEW."scopeResolution":='BOUND_PLATFORM_ACTOR_V1';
    END IF;
    NEW."actorId":=connected_actor; NEW."createdBy":=connected_actor; NEW."ownedBy":=connected_actor;
    RETURN NEW;
  END IF;

  IF NEW."actorUserId" IS NULL THEN
    NEW."scopeKind":='PLATFORM'; NEW."scopeResolution":='PLATFORM_NO_ACTOR_V1';
    RETURN NEW;
  END IF;
  SELECT "id" INTO connected_actor FROM "IdentityActor"
  WHERE "humanUserId"=NEW."actorUserId" AND "actorType"='HUMAN' AND "status"='ACTIVE';
  IF connected_actor IS NULL THEN RAISE EXCEPTION 'Active audit human actor is required' USING ERRCODE='28000'; END IF;
  SELECT count(*)::integer INTO assignment_count FROM "TenantActorAssignment"
  WHERE "actorId"=connected_actor AND "status"='ACTIVE';
  IF assignment_count>1 THEN RAISE EXCEPTION 'Audit tenant scope is ambiguous' USING ERRCODE='42501'; END IF;
  IF assignment_count=1 THEN
    SELECT "organizationId","tenantId" INTO resolved_assignment FROM "TenantActorAssignment"
    WHERE "actorId"=connected_actor AND "status"='ACTIVE';
    NEW."scopeKind":='TENANT'; NEW."scopeResolution":='LEGACY_SINGLE_ACTIVE_ASSIGNMENT_V1';
    NEW."organizationId":=resolved_assignment."organizationId"; NEW."tenantId":=resolved_assignment."tenantId";
  ELSE
    NEW."scopeKind":='PERSONAL'; NEW."scopeResolution":='LEGACY_PERSONAL_ACTOR_V1';
  END IF;
  NEW."actorId":=connected_actor; NEW."createdBy":=connected_actor; NEW."ownedBy":=connected_actor;
  RETURN NEW;
END $phase202_audit_classify$;
CREATE TRIGGER "AuditLog_phase202_classify_trigger" BEFORE INSERT ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION entral.phase202_classify_audit_log();

CREATE OR REPLACE FUNCTION entral.phase202_sync_audit_ownership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_audit_sync$
BEGIN
  IF NEW."scopeKind"='TENANT' THEN
    INSERT INTO "CustomerRecordOwnership" (
      "sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy",
      "mappingStrategy","sourceUserId","updatedAt"
    ) VALUES ('AuditLog',NEW."id",NEW."organizationId",NEW."tenantId",NEW."businessId",NEW."actorId",NEW."createdBy",NEW."ownedBy",'AUDIT_SCOPE_V1',NEW."actorUserId",now());
  END IF;
  RETURN NEW;
END $phase202_audit_sync$;
CREATE TRIGGER "AuditLog_phase202_ownership_sync_trigger" AFTER INSERT ON "AuditLog"
FOR EACH ROW EXECUTE FUNCTION entral.phase202_sync_audit_ownership();

-- Direct legacy shared records receive ownership columns on the source rows.
-- A row is migrated only when its user has exactly one active OWNER tenant;
-- ambiguity remains visible and blocks release instead of being guessed.
DO $phase202_ownership$
DECLARE
  target_table text;
  has_store_id boolean;
  target_tables text[] := ARRAY[
    'ClientMerchStore','ShopifyConnection',
    'ShopifyOAuthContinuation','RevenueOpportunity','GrowthApprovalPacket',
    'RevenuePerformanceSnapshot','RevenueAssetControlRecord','RevenueMoneyArmyBatchRun',
    'FinancialSplitPolicy','FinancialLedgerEntry','FinancialPayoutIntent',
    'FinancialBudgetReleasePacket','FinancialScalingBudgetPacket','FinancialScalingSpendPacket',
    'FinancialScalingExecutionEntry','FinancialReconciliationReport','FacelessContentBrief',
    'FacelessContentPerformanceSnapshot','PortfolioCommandAction','RevenueLaunchHandoffPacket',
    'RevenueSignalConnectorApproval','RevenueSignalImportJob','Agent','AgentTask','AgentSchedule',
    'CommandOSSnapshot','CommandOSReport','Conversation','AiUsageEvent','AutomationJob'
  ];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    EXECUTE format(
      'ALTER TABLE %I ADD COLUMN "organizationId" uuid, ADD COLUMN "tenantId" uuid, ADD COLUMN "businessId" uuid, ADD COLUMN "actorId" uuid, ADD COLUMN "createdBy" uuid, ADD COLUMN "ownedBy" uuid',
      target_table
    );
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = target_table AND column_name = 'storeId'
    ) INTO has_store_id;

    EXECUTE format($sql$
      UPDATE %I source
      SET "organizationId"=resolved."organizationId", "tenantId"=resolved."tenantId",
          "businessId"=%s, "actorId"=resolved."actorId", "createdBy"=resolved."actorId", "ownedBy"=resolved."actorId"
      FROM (
        SELECT app_user."id" AS "userId", actor."id" AS "actorId", team."organizationId", team."tenantId"
        FROM "User" app_user
        JOIN "IdentityActor" actor ON actor."humanUserId"=app_user."id"
        JOIN "TeamMember" membership ON membership."userId"=app_user."id" AND membership."role"='OWNER' AND membership."status"='ACTIVE'
        JOIN "Team" team ON team."id"=membership."teamId"
        WHERE (SELECT count(*) FROM "TeamMember" owner_count WHERE owner_count."userId"=app_user."id" AND owner_count."role"='OWNER' AND owner_count."status"='ACTIVE')=1
      ) resolved
      WHERE source."userId"=resolved."userId";

      INSERT INTO "CustomerRecordOwnership" (
        "sourceTable", "sourceRecordId", "organizationId", "tenantId", "businessId",
        "actorId", "createdBy", "ownedBy", "mappingStrategy", "sourceUserId"
      )
      SELECT %L, source."id"::text, source."organizationId", source."tenantId", source."businessId",
             source."actorId", source."createdBy", source."ownedBy", 'DIRECT_SOURCE_COLUMNS_V1', source."userId"
      FROM %I source
      WHERE source."organizationId" IS NOT NULL AND source."tenantId" IS NOT NULL AND source."actorId" IS NOT NULL
      ON CONFLICT ("sourceTable", "sourceRecordId") DO NOTHING
    $sql$,
      target_table,
      CASE
        WHEN target_table = 'ClientMerchStore' THEN '(SELECT b."id" FROM "BusinessBoundary" b WHERE b."legacyStoreId" = source."id")'
        WHEN has_store_id THEN '(SELECT b."id" FROM "BusinessBoundary" b WHERE b."legacyStoreId" = source."storeId")'
        ELSE 'NULL::uuid'
      END,
      target_table,
      target_table
    );

    EXECUTE format('CREATE INDEX %I ON %I ("tenantId","organizationId")', target_table || '_phase202_tenant_idx', target_table);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT, ADD CONSTRAINT %I FOREIGN KEY ("businessId","tenantId","organizationId") REFERENCES "BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT, ADD CONSTRAINT %I FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT, ADD CONSTRAINT %I FOREIGN KEY ("createdBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT, ADD CONSTRAINT %I FOREIGN KEY ("ownedBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT',
      target_table,
      target_table || '_phase202_tenant_org_fkey',
      target_table || '_phase202_business_scope_fkey',
      target_table || '_phase202_actor_scope_fkey',
      target_table || '_phase202_created_by_scope_fkey',
      target_table || '_phase202_owned_by_scope_fkey'
    );
  END LOOP;
END $phase202_ownership$;

CREATE OR REPLACE FUNCTION entral.phase202_assign_shared_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_assign$
DECLARE
  resolved record;
  requested_tenant uuid := NULLIF(current_setting('app.tenant_id', true),'')::uuid;
  connected_actor uuid := entral.phase202_effective_actor_id();
  store_id text := CASE WHEN TG_TABLE_NAME='ClientMerchStore' THEN NEW."id"::text ELSE to_jsonb(NEW)->>'storeId' END;
  resolved_business uuid;
BEGIN
  SELECT actor."id" AS actor_id, team."organizationId" AS organization_id, team."tenantId" AS tenant_id,
         team."environment", team."dataResidency"
  INTO resolved
  FROM "IdentityActor" actor
  JOIN "TeamMember" membership ON membership."userId"=actor."humanUserId" AND membership."status"='ACTIVE'
  JOIN "Team" team ON team."id"=membership."teamId"
  WHERE actor."humanUserId"=NEW."userId"
    AND actor."status"='ACTIVE'
    AND (
      (requested_tenant IS NOT NULL AND team."tenantId"=requested_tenant)
      OR (requested_tenant IS NULL AND membership."role"='OWNER' AND
          (SELECT count(*) FROM "TeamMember" own WHERE own."userId"=NEW."userId" AND own."role"='OWNER' AND own."status"='ACTIVE')=1)
    )
  LIMIT 1;
  IF resolved.actor_id IS NULL THEN
    RAISE EXCEPTION 'Phase 202 ownership is ambiguous or unauthorized for source user' USING ERRCODE='42501';
  END IF;
  IF requested_tenant IS NOT NULL AND connected_actor IS NULL THEN
    RAISE EXCEPTION 'Verified Phase 202 actor context is required' USING ERRCODE='28000';
  END IF;
  IF connected_actor IS NOT NULL AND connected_actor IS DISTINCT FROM resolved.actor_id
     AND NOT EXISTS (
       SELECT 1 FROM "TenantActorAssignment" connected
       JOIN "IdentityActor" connected_identity ON connected_identity."id"=connected."actorId" AND connected_identity."status"='ACTIVE'
       WHERE connected."actorId"=connected_actor AND connected."tenantId"=resolved.tenant_id
         AND connected."organizationId"=resolved.organization_id AND connected."status"='ACTIVE'
         AND (connected."role" IN ('OWNER','TENANT_ADMIN') OR (connected_identity."actorType"='SERVICE' AND 'OPERATIONS'=ANY(connected."authorityDomains")))
     ) THEN
    RAISE EXCEPTION 'Connected actor cannot write for the source owner' USING ERRCODE='42501';
  END IF;
  IF NEW."tenantId" IS NOT NULL AND NEW."tenantId" IS DISTINCT FROM resolved.tenant_id THEN
    RAISE EXCEPTION 'Tenant ownership mismatch' USING ERRCODE='42501';
  END IF;
  IF NEW."organizationId" IS NOT NULL AND NEW."organizationId" IS DISTINCT FROM resolved.organization_id THEN
    RAISE EXCEPTION 'Organization ownership mismatch' USING ERRCODE='42501';
  END IF;
  IF store_id IS NOT NULL THEN
    INSERT INTO "BusinessBoundary" ("organizationId","tenantId","legacyStoreId","stableCode","environment","dataResidency")
    VALUES (resolved.organization_id,resolved.tenant_id,store_id,'legacy-store:'||store_id,resolved.environment,resolved."dataResidency")
    ON CONFLICT ("legacyStoreId") DO NOTHING;
    SELECT "id" INTO resolved_business FROM "BusinessBoundary"
    WHERE "legacyStoreId"=store_id AND "tenantId"=resolved.tenant_id AND "organizationId"=resolved.organization_id;
    IF resolved_business IS NULL THEN
      RAISE EXCEPTION 'Business ownership conflicts with tenant boundary' USING ERRCODE='23514';
    END IF;
  ELSIF NEW."businessId" IS NOT NULL THEN
    SELECT "id" INTO resolved_business FROM "BusinessBoundary"
    WHERE "id"=NEW."businessId" AND "tenantId"=resolved.tenant_id
      AND "organizationId"=resolved.organization_id AND "status"='ACTIVE';
    IF resolved_business IS NULL THEN
      RAISE EXCEPTION 'Explicit business ownership conflicts with tenant boundary' USING ERRCODE='23514';
    END IF;
  END IF;
  NEW."organizationId" := resolved.organization_id;
  NEW."tenantId" := resolved.tenant_id;
  NEW."businessId" := resolved_business;
  IF TG_OP='INSERT' THEN
    NEW."actorId" := COALESCE(connected_actor,resolved.actor_id);
    NEW."createdBy" := COALESCE(connected_actor,resolved.actor_id);
    NEW."ownedBy" := resolved.actor_id;
  ELSE
    NEW."actorId" := OLD."actorId";
    NEW."createdBy" := OLD."createdBy";
    NEW."ownedBy" := OLD."ownedBy";
  END IF;
  RETURN NEW;
END $phase202_assign$;

DO $phase202_source_triggers$
DECLARE
  target_table text;
  target_tables text[] := ARRAY[
    'ClientMerchStore','ShopifyConnection','ShopifyOAuthContinuation','RevenueOpportunity','GrowthApprovalPacket',
    'RevenuePerformanceSnapshot','RevenueAssetControlRecord','RevenueMoneyArmyBatchRun','FinancialSplitPolicy',
    'FinancialLedgerEntry','FinancialPayoutIntent','FinancialBudgetReleasePacket','FinancialScalingBudgetPacket',
    'FinancialScalingSpendPacket','FinancialScalingExecutionEntry','FinancialReconciliationReport','FacelessContentBrief',
    'FacelessContentPerformanceSnapshot','PortfolioCommandAction','RevenueLaunchHandoffPacket','RevenueSignalConnectorApproval',
    'RevenueSignalImportJob','Agent','AgentTask','AgentSchedule','CommandOSSnapshot','CommandOSReport','Conversation','AiUsageEvent','AutomationJob'
  ];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF "userId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy" ON %I FOR EACH ROW EXECUTE FUNCTION entral.phase202_assign_shared_ownership()',
      target_table || '_phase202_ownership_trigger', target_table);
  END LOOP;
END $phase202_source_triggers$;

CREATE OR REPLACE FUNCTION entral.phase202_sync_source_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_sync$
DECLARE
  source jsonb := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  record_id text := source->>'id';
BEGIN
  IF TG_OP='DELETE' THEN
    DELETE FROM "CustomerRecordOwnership" WHERE "sourceTable"=TG_TABLE_NAME AND "sourceRecordId"=record_id;
    RETURN OLD;
  END IF;
  INSERT INTO "CustomerRecordOwnership" (
    "sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy",
    "mappingStrategy","sourceUserId","updatedAt"
  ) VALUES (
    TG_TABLE_NAME, record_id, (source->>'organizationId')::uuid, (source->>'tenantId')::uuid,
    NULLIF(source->>'businessId','')::uuid, (source->>'actorId')::uuid, (source->>'createdBy')::uuid,
    (source->>'ownedBy')::uuid, 'DIRECT_SOURCE_COLUMNS_V1', source->>'userId', now()
  )
  ON CONFLICT ("sourceTable","sourceRecordId") DO UPDATE SET
    "organizationId"=EXCLUDED."organizationId", "tenantId"=EXCLUDED."tenantId", "businessId"=EXCLUDED."businessId",
    "actorId"=EXCLUDED."actorId", "createdBy"=EXCLUDED."createdBy", "ownedBy"=EXCLUDED."ownedBy",
    "mappingStrategy"=EXCLUDED."mappingStrategy", "sourceUserId"=EXCLUDED."sourceUserId", "updatedAt"=now();
  RETURN NEW;
END $phase202_sync$;

DO $phase202_source_sync_triggers$
DECLARE
  target_table text;
  target_tables text[] := ARRAY[
    'ClientMerchStore','ShopifyConnection','ShopifyOAuthContinuation','RevenueOpportunity','GrowthApprovalPacket',
    'RevenuePerformanceSnapshot','RevenueAssetControlRecord','RevenueMoneyArmyBatchRun','FinancialSplitPolicy',
    'FinancialLedgerEntry','FinancialPayoutIntent','FinancialBudgetReleasePacket','FinancialScalingBudgetPacket',
    'FinancialScalingSpendPacket','FinancialScalingExecutionEntry','FinancialReconciliationReport','FacelessContentBrief',
    'FacelessContentPerformanceSnapshot','PortfolioCommandAction','RevenueLaunchHandoffPacket','RevenueSignalConnectorApproval',
    'RevenueSignalImportJob','Agent','AgentTask','AgentSchedule','CommandOSSnapshot','CommandOSReport','Conversation','AiUsageEvent','AutomationJob'
  ];
BEGIN
  FOREACH target_table IN ARRAY target_tables LOOP
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION entral.phase202_sync_source_ownership()',
      target_table || '_phase202_ownership_sync_trigger', target_table);
  END LOOP;
END $phase202_source_sync_triggers$;

-- Personal authentication artifacts remain actor-scoped and are never projected
-- into an arbitrary tenant when a user belongs to more than one organization.
ALTER TABLE "EmailVerificationToken"
  ADD COLUMN "actorId" uuid REFERENCES "IdentityActor"("id") ON DELETE RESTRICT,
  ADD COLUMN "createdBy" uuid REFERENCES "IdentityActor"("id") ON DELETE RESTRICT,
  ADD COLUMN "ownedBy" uuid REFERENCES "IdentityActor"("id") ON DELETE RESTRICT;
ALTER TABLE "PasswordResetToken"
  ADD COLUMN "actorId" uuid REFERENCES "IdentityActor"("id") ON DELETE RESTRICT,
  ADD COLUMN "createdBy" uuid REFERENCES "IdentityActor"("id") ON DELETE RESTRICT,
  ADD COLUMN "ownedBy" uuid REFERENCES "IdentityActor"("id") ON DELETE RESTRICT;

UPDATE "EmailVerificationToken" token
SET "actorId"=actor."id", "createdBy"=actor."id", "ownedBy"=actor."id"
FROM "IdentityActor" actor WHERE actor."humanUserId"=token."userId";
UPDATE "PasswordResetToken" token
SET "actorId"=actor."id", "createdBy"=actor."id", "ownedBy"=actor."id"
FROM "IdentityActor" actor WHERE actor."humanUserId"=token."userId";

CREATE OR REPLACE FUNCTION entral.phase202_assign_personal_actor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_personal$
DECLARE resolved_actor uuid;
BEGIN
  SELECT "id" INTO resolved_actor FROM "IdentityActor"
  WHERE "humanUserId"=NEW."userId" AND "actorType"='HUMAN' AND "status"='ACTIVE';
  IF resolved_actor IS NULL THEN RAISE EXCEPTION 'Active personal identity actor required' USING ERRCODE='28000'; END IF;
  NEW."actorId" := resolved_actor;
  NEW."createdBy" := COALESCE(NEW."createdBy", resolved_actor);
  NEW."ownedBy" := resolved_actor;
  RETURN NEW;
END $phase202_personal$;
CREATE TRIGGER "EmailVerificationToken_phase202_actor_trigger" BEFORE INSERT OR UPDATE OF "userId","actorId","createdBy","ownedBy"
ON "EmailVerificationToken" FOR EACH ROW EXECUTE FUNCTION entral.phase202_assign_personal_actor();
CREATE TRIGGER "PasswordResetToken_phase202_actor_trigger" BEFORE INSERT OR UPDATE OF "userId","actorId","createdBy","ownedBy"
ON "PasswordResetToken" FOR EACH ROW EXECUTE FUNCTION entral.phase202_assign_personal_actor();

-- Child records inherit the complete, constrained ownership tuple from their
-- authoritative parent; callers cannot provide a conflicting tenant tuple.
DO $phase202_child_columns$
DECLARE target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['PodProduct','AgentLog','AgentMessage','Message','AutomationLog'] LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN "organizationId" uuid, ADD COLUMN "tenantId" uuid, ADD COLUMN "businessId" uuid, ADD COLUMN "actorId" uuid, ADD COLUMN "createdBy" uuid, ADD COLUMN "ownedBy" uuid', target_table);
    EXECUTE format('CREATE INDEX %I ON %I ("tenantId","organizationId")', target_table || '_phase202_tenant_idx', target_table);
    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT, ADD CONSTRAINT %I FOREIGN KEY ("businessId","tenantId","organizationId") REFERENCES "BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT, ADD CONSTRAINT %I FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT, ADD CONSTRAINT %I FOREIGN KEY ("createdBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT, ADD CONSTRAINT %I FOREIGN KEY ("ownedBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT',
      target_table, target_table || '_phase202_tenant_org_fkey', target_table || '_phase202_business_scope_fkey',
      target_table || '_phase202_actor_scope_fkey', target_table || '_phase202_created_by_scope_fkey', target_table || '_phase202_owned_by_scope_fkey');
  END LOOP;
END $phase202_child_columns$;

UPDATE "PodProduct" child SET "organizationId"=parent."organizationId", "tenantId"=parent."tenantId", "businessId"=parent."businessId", "actorId"=parent."actorId", "createdBy"=parent."createdBy", "ownedBy"=parent."ownedBy"
FROM "ClientMerchStore" parent WHERE parent."id"=child."storeId";
UPDATE "AgentLog" child SET "organizationId"=parent."organizationId", "tenantId"=parent."tenantId", "businessId"=parent."businessId", "actorId"=parent."actorId", "createdBy"=parent."createdBy", "ownedBy"=parent."ownedBy"
FROM "Agent" parent WHERE parent."id"=child."agentId";
UPDATE "AgentMessage" child SET "organizationId"=parent."organizationId", "tenantId"=parent."tenantId", "businessId"=parent."businessId", "actorId"=parent."actorId", "createdBy"=parent."createdBy", "ownedBy"=parent."ownedBy"
FROM "Agent" parent WHERE parent."id"=child."agentId";
UPDATE "Message" child SET "organizationId"=parent."organizationId", "tenantId"=parent."tenantId", "businessId"=parent."businessId", "actorId"=parent."actorId", "createdBy"=parent."createdBy", "ownedBy"=parent."ownedBy"
FROM "Conversation" parent WHERE parent."id"=child."conversationId";
UPDATE "AutomationLog" child SET "organizationId"=parent."organizationId", "tenantId"=parent."tenantId", "businessId"=parent."businessId", "actorId"=parent."actorId", "createdBy"=parent."createdBy", "ownedBy"=parent."ownedBy"
FROM "AutomationJob" parent WHERE parent."id"=child."jobId";

CREATE OR REPLACE FUNCTION entral.phase202_assign_inherited_ownership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_inherited$
DECLARE parent_row record; parent_id text;
BEGIN
  parent_id := CASE TG_TABLE_NAME
    WHEN 'PodProduct' THEN NEW."storeId"
    WHEN 'AgentLog' THEN NEW."agentId"
    WHEN 'AgentMessage' THEN NEW."agentId"
    WHEN 'Message' THEN NEW."conversationId"
    WHEN 'AutomationLog' THEN NEW."jobId" END;
  CASE TG_TABLE_NAME
    WHEN 'PodProduct' THEN SELECT "organizationId","tenantId","businessId","actorId","createdBy","ownedBy" INTO parent_row FROM "ClientMerchStore" WHERE "id"=parent_id;
    WHEN 'AgentLog' THEN SELECT "organizationId","tenantId","businessId","actorId","createdBy","ownedBy" INTO parent_row FROM "Agent" WHERE "id"=parent_id;
    WHEN 'AgentMessage' THEN SELECT "organizationId","tenantId","businessId","actorId","createdBy","ownedBy" INTO parent_row FROM "Agent" WHERE "id"=parent_id;
    WHEN 'Message' THEN SELECT "organizationId","tenantId","businessId","actorId","createdBy","ownedBy" INTO parent_row FROM "Conversation" WHERE "id"=parent_id;
    WHEN 'AutomationLog' THEN SELECT "organizationId","tenantId","businessId","actorId","createdBy","ownedBy" INTO parent_row FROM "AutomationJob" WHERE "id"=parent_id;
  END CASE;
  IF parent_row."tenantId" IS NULL THEN RAISE EXCEPTION 'Owned parent record required' USING ERRCODE='23503'; END IF;
  NEW."organizationId":=parent_row."organizationId"; NEW."tenantId":=parent_row."tenantId"; NEW."businessId":=parent_row."businessId";
  NEW."actorId":=parent_row."actorId"; NEW."createdBy":=parent_row."createdBy"; NEW."ownedBy":=parent_row."ownedBy";
  RETURN NEW;
END $phase202_inherited$;

DO $phase202_child_triggers$
DECLARE target_table text; parent_column text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['PodProduct','AgentLog','AgentMessage','Message','AutomationLog'] LOOP
    parent_column := CASE target_table WHEN 'PodProduct' THEN 'storeId' WHEN 'AgentLog' THEN 'agentId' WHEN 'AgentMessage' THEN 'agentId' WHEN 'Message' THEN 'conversationId' ELSE 'jobId' END;
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE OF %I,"organizationId","tenantId","businessId","actorId","createdBy","ownedBy" ON %I FOR EACH ROW EXECUTE FUNCTION entral.phase202_assign_inherited_ownership()', target_table || '_phase202_inherited_trigger', parent_column, target_table);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION entral.phase202_sync_source_ownership()', target_table || '_phase202_ownership_sync_trigger', target_table);
  END LOOP;
END $phase202_child_triggers$;

-- Exact-team records bind to the referenced Team rather than a user default.
ALTER TABLE "TeamMember" ADD COLUMN "organizationId" uuid, ADD COLUMN "tenantId" uuid, ADD COLUMN "actorId" uuid, ADD COLUMN "createdBy" uuid, ADD COLUMN "ownedBy" uuid;
ALTER TABLE "MemberWorkspaceSnapshot" ADD COLUMN "organizationId" uuid, ADD COLUMN "tenantId" uuid, ADD COLUMN "actorId" uuid, ADD COLUMN "createdBy" uuid, ADD COLUMN "ownedBy" uuid;
ALTER TABLE "MemberTutorialProgress" ADD COLUMN "tenantId" uuid, ADD COLUMN "actorId" uuid, ADD COLUMN "createdBy" uuid, ADD COLUMN "ownedBy" uuid;
ALTER TABLE "MemberTutorialMutationReceipt" ADD COLUMN "tenantId" uuid, ADD COLUMN "actorId" uuid, ADD COLUMN "createdBy" uuid, ADD COLUMN "ownedBy" uuid;
ALTER TABLE "Task" ADD COLUMN "organizationId" uuid, ADD COLUMN "tenantId" uuid, ADD COLUMN "businessId" uuid, ADD COLUMN "actorId" uuid, ADD COLUMN "createdByActorId" uuid, ADD COLUMN "ownedBy" uuid;

UPDATE "TeamMember" row SET "organizationId"=team."organizationId", "tenantId"=team."tenantId", "actorId"=subject."id", "createdBy"=subject."id", "ownedBy"=owner_actor."id"
FROM "Team" team, "IdentityActor" subject, LATERAL (
  SELECT actor."id" FROM "TeamMember" owner JOIN "IdentityActor" actor ON actor."humanUserId"=owner."userId"
  WHERE owner."teamId"=team."id" AND owner."role"='OWNER' AND owner."status"='ACTIVE' ORDER BY owner."joinedAt",owner."userId" LIMIT 1
) owner_actor WHERE team."id"=row."teamId" AND subject."humanUserId"=row."userId";
UPDATE "MemberWorkspaceSnapshot" row SET "organizationId"=team."organizationId", "tenantId"=team."tenantId", "actorId"=actor."id", "createdBy"=actor."id", "ownedBy"=actor."id"
FROM "Team" team, "IdentityActor" actor WHERE team."id"=row."teamId" AND actor."humanUserId"=COALESCE(row."publishedById",(SELECT "userId" FROM "TeamMember" WHERE "teamId"=team."id" AND "role"='OWNER' AND "status"='ACTIVE' ORDER BY "joinedAt","userId" LIMIT 1));
UPDATE "MemberTutorialProgress" row SET "tenantId"=team."tenantId", "actorId"=actor."id", "createdBy"=actor."id", "ownedBy"=actor."id"
FROM "Team" team, "IdentityActor" actor WHERE team."id"=row."organizationId" AND actor."humanUserId"=row."userId";
UPDATE "MemberTutorialMutationReceipt" row SET "tenantId"=team."tenantId", "actorId"=actor."id", "createdBy"=actor."id", "ownedBy"=actor."id"
FROM "Team" team, "IdentityActor" actor WHERE team."id"=row."organizationId" AND actor."humanUserId"=row."userId";
UPDATE "Task" row SET "organizationId"=team."organizationId", "tenantId"=team."tenantId", "actorId"=actor."id", "createdByActorId"=actor."id", "ownedBy"=actor."id"
FROM "Team" team, "IdentityActor" actor WHERE team."id"=row."teamId" AND actor."humanUserId"=row."createdById";

ALTER TABLE "TeamMember"
  ADD CONSTRAINT "TeamMember_phase202_tenant_org_fkey" FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "TeamMember_phase202_actor_scope_fkey" FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "TeamMember_phase202_created_by_scope_fkey" FOREIGN KEY ("createdBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "TeamMember_phase202_owned_by_scope_fkey" FOREIGN KEY ("ownedBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT;
ALTER TABLE "MemberWorkspaceSnapshot"
  ADD CONSTRAINT "MemberWorkspaceSnapshot_phase202_tenant_org_fkey" FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberWorkspaceSnapshot_phase202_actor_scope_fkey" FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberWorkspaceSnapshot_phase202_created_by_scope_fkey" FOREIGN KEY ("createdBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberWorkspaceSnapshot_phase202_owned_by_scope_fkey" FOREIGN KEY ("ownedBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT;
ALTER TABLE "MemberTutorialProgress"
  ADD CONSTRAINT "MemberTutorialProgress_phase202_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "TenantBoundary"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberTutorialProgress_phase202_actor_tenant_fkey" FOREIGN KEY ("actorId","tenantId") REFERENCES "TenantActorAssignment"("actorId","tenantId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberTutorialProgress_phase202_created_by_tenant_fkey" FOREIGN KEY ("createdBy","tenantId") REFERENCES "TenantActorAssignment"("actorId","tenantId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberTutorialProgress_phase202_owned_by_tenant_fkey" FOREIGN KEY ("ownedBy","tenantId") REFERENCES "TenantActorAssignment"("actorId","tenantId") ON DELETE RESTRICT;
ALTER TABLE "MemberTutorialMutationReceipt"
  ADD CONSTRAINT "MemberTutorialMutationReceipt_phase202_tenant_fkey" FOREIGN KEY ("tenantId") REFERENCES "TenantBoundary"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberTutorialMutationReceipt_phase202_actor_tenant_fkey" FOREIGN KEY ("actorId","tenantId") REFERENCES "TenantActorAssignment"("actorId","tenantId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberTutorialMutationReceipt_phase202_created_by_tenant_fkey" FOREIGN KEY ("createdBy","tenantId") REFERENCES "TenantActorAssignment"("actorId","tenantId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MemberTutorialMutationReceipt_phase202_owned_by_tenant_fkey" FOREIGN KEY ("ownedBy","tenantId") REFERENCES "TenantActorAssignment"("actorId","tenantId") ON DELETE RESTRICT;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_phase202_tenant_org_fkey" FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "Task_phase202_business_scope_fkey" FOREIGN KEY ("businessId","tenantId","organizationId") REFERENCES "BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "Task_phase202_actor_scope_fkey" FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "Task_phase202_created_by_scope_fkey" FOREIGN KEY ("createdByActorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "Task_phase202_owned_by_scope_fkey" FOREIGN KEY ("ownedBy","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT;

CREATE OR REPLACE FUNCTION entral.phase202_assign_exact_team_ownership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_exact$
DECLARE team_row record; subject_actor uuid; owner_actor uuid; connected_actor uuid := entral.phase202_effective_actor_id();
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'TeamMember' THEN
      SELECT * INTO team_row FROM "Team" WHERE "id"=NEW."teamId";
      SELECT "id" INTO subject_actor FROM "IdentityActor" WHERE "humanUserId"=NEW."userId" AND "status"='ACTIVE';
      SELECT actor."id" INTO owner_actor FROM "TeamMember" owner JOIN "IdentityActor" actor ON actor."humanUserId"=owner."userId"
      WHERE owner."teamId"=NEW."teamId" AND owner."role"='OWNER' AND owner."status"='ACTIVE' ORDER BY owner."joinedAt",owner."userId" LIMIT 1;
      owner_actor := COALESCE(owner_actor, CASE WHEN NEW."role"='OWNER' THEN subject_actor END);
      NEW."actorId":=subject_actor; NEW."createdBy":=CASE WHEN TG_OP='INSERT' THEN COALESCE(connected_actor,subject_actor) ELSE OLD."createdBy" END; NEW."ownedBy":=owner_actor;
    WHEN 'MemberWorkspaceSnapshot' THEN
      SELECT * INTO team_row FROM "Team" WHERE "id"=NEW."teamId";
      SELECT "id" INTO subject_actor FROM "IdentityActor" WHERE "humanUserId"=COALESCE(NEW."publishedById",(SELECT "userId" FROM "TeamMember" WHERE "teamId"=NEW."teamId" AND "role"='OWNER' AND "status"='ACTIVE' ORDER BY "joinedAt","userId" LIMIT 1));
      NEW."actorId":=subject_actor; NEW."createdBy":=CASE WHEN TG_OP='INSERT' THEN COALESCE(connected_actor,subject_actor) ELSE OLD."createdBy" END; NEW."ownedBy":=CASE WHEN TG_OP='INSERT' THEN subject_actor ELSE OLD."ownedBy" END;
    WHEN 'MemberTutorialProgress' THEN
      SELECT * INTO team_row FROM "Team" WHERE "id"=NEW."organizationId";
      SELECT "id" INTO subject_actor FROM "IdentityActor" WHERE "humanUserId"=NEW."userId" AND "status"='ACTIVE';
      NEW."actorId":=subject_actor; NEW."createdBy":=CASE WHEN TG_OP='INSERT' THEN subject_actor ELSE OLD."createdBy" END; NEW."ownedBy":=subject_actor;
    WHEN 'MemberTutorialMutationReceipt' THEN
      SELECT * INTO team_row FROM "Team" WHERE "id"=NEW."organizationId";
      SELECT "id" INTO subject_actor FROM "IdentityActor" WHERE "humanUserId"=NEW."userId" AND "status"='ACTIVE';
      NEW."actorId":=subject_actor; NEW."createdBy":=CASE WHEN TG_OP='INSERT' THEN subject_actor ELSE OLD."createdBy" END; NEW."ownedBy":=subject_actor;
    WHEN 'Task' THEN
      SELECT * INTO team_row FROM "Team" WHERE "id"=NEW."teamId";
      SELECT "id" INTO subject_actor FROM "IdentityActor" WHERE "humanUserId"=NEW."createdById" AND "status"='ACTIVE';
      NEW."actorId":=COALESCE(connected_actor,subject_actor); NEW."createdByActorId":=CASE WHEN TG_OP='INSERT' THEN subject_actor ELSE OLD."createdByActorId" END; NEW."ownedBy":=CASE WHEN TG_OP='INSERT' THEN subject_actor ELSE OLD."ownedBy" END;
  END CASE;
  IF team_row."tenantId" IS NULL OR subject_actor IS NULL THEN RAISE EXCEPTION 'Exact team ownership could not be resolved' USING ERRCODE='23503'; END IF;
  NEW."tenantId":=team_row."tenantId";
  IF TG_TABLE_NAME NOT IN ('MemberTutorialProgress','MemberTutorialMutationReceipt') THEN NEW."organizationId":=team_row."organizationId"; END IF;
  RETURN NEW;
END $phase202_exact$;

CREATE OR REPLACE FUNCTION entral.phase202_sync_exact_ownership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_exact_sync$
DECLARE source jsonb := CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END; record_id text; legacy_team_id text; team_row record; creator_key text;
BEGIN
  record_id := CASE WHEN TG_TABLE_NAME='TeamMember' THEN (source->>'userId')||':'||(source->>'teamId') ELSE source->>'id' END;
  IF TG_OP='DELETE' THEN DELETE FROM "CustomerRecordOwnership" WHERE "sourceTable"=TG_TABLE_NAME AND "sourceRecordId"=record_id; RETURN OLD; END IF;
  legacy_team_id := CASE WHEN TG_TABLE_NAME IN ('TeamMember','MemberWorkspaceSnapshot','Task') THEN COALESCE(source->>'teamId',source->>'organizationId') ELSE source->>'organizationId' END;
  SELECT * INTO team_row FROM "Team" WHERE "id"=legacy_team_id;
  creator_key := CASE WHEN TG_TABLE_NAME='Task' THEN 'createdByActorId' ELSE 'createdBy' END;
  INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId","updatedAt")
  VALUES (TG_TABLE_NAME,record_id,team_row."organizationId",team_row."tenantId",NULLIF(source->>'businessId','')::uuid,(source->>'actorId')::uuid,(source->>creator_key)::uuid,(source->>'ownedBy')::uuid,'EXACT_TEAM_SOURCE_COLUMNS_V1',COALESCE(source->>'userId',source->>'createdById',source->>'publishedById'),now())
  ON CONFLICT ("sourceTable","sourceRecordId") DO UPDATE SET "organizationId"=EXCLUDED."organizationId","tenantId"=EXCLUDED."tenantId","businessId"=EXCLUDED."businessId","actorId"=EXCLUDED."actorId","createdBy"=EXCLUDED."createdBy","ownedBy"=EXCLUDED."ownedBy","sourceUserId"=EXCLUDED."sourceUserId","updatedAt"=now();
  RETURN NEW;
END $phase202_exact_sync$;

DO $phase202_exact_triggers$
DECLARE target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY['TeamMember','MemberWorkspaceSnapshot','MemberTutorialProgress','MemberTutorialMutationReceipt','Task'] LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION entral.phase202_assign_exact_team_ownership()',target_table || '_phase202_exact_trigger',target_table);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION entral.phase202_sync_exact_ownership()',target_table || '_phase202_exact_sync_trigger',target_table);
  END LOOP;
END $phase202_exact_triggers$;

-- Customer records whose ownership is inherited through a parent record.
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'PodProduct', p."id", o."organizationId", o."tenantId", o."businessId", o."actorId", o."createdBy", o."ownedBy", 'PARENT_STORE_V1', o."sourceUserId"
FROM "PodProduct" p JOIN "CustomerRecordOwnership" o ON o."sourceTable"='ClientMerchStore' AND o."sourceRecordId"=p."storeId";
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'AgentLog', l."id", o."organizationId", o."tenantId", o."businessId", o."actorId", o."createdBy", o."ownedBy", 'PARENT_AGENT_V1', o."sourceUserId"
FROM "AgentLog" l JOIN "CustomerRecordOwnership" o ON o."sourceTable"='Agent' AND o."sourceRecordId"=l."agentId";
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'AgentMessage', m."id", o."organizationId", o."tenantId", o."businessId", o."actorId", o."createdBy", o."ownedBy", 'PARENT_AGENT_V1', o."sourceUserId"
FROM "AgentMessage" m JOIN "CustomerRecordOwnership" o ON o."sourceTable"='Agent' AND o."sourceRecordId"=m."agentId";
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'Message', m."id", o."organizationId", o."tenantId", o."businessId", o."actorId", o."createdBy", o."ownedBy", 'PARENT_CONVERSATION_V1', o."sourceUserId"
FROM "Message" m JOIN "CustomerRecordOwnership" o ON o."sourceTable"='Conversation' AND o."sourceRecordId"=m."conversationId";
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'AutomationLog', l."id", o."organizationId", o."tenantId", o."businessId", o."actorId", o."createdBy", o."ownedBy", 'PARENT_AUTOMATION_JOB_V1', o."sourceUserId"
FROM "AutomationLog" l JOIN "CustomerRecordOwnership" o ON o."sourceTable"='AutomationJob' AND o."sourceRecordId"=l."jobId";

-- Team-owned/member records use the exact referenced organization, not a user default.
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'TeamMember', tm."userId" || ':' || tm."teamId", t."organizationId", t."tenantId", NULL, a."id", a."id", owner_actor."id", 'EXACT_TEAM_MEMBERSHIP_V1', tm."userId"
FROM "TeamMember" tm
JOIN "Team" t ON t."id"=tm."teamId"
JOIN "IdentityActor" a ON a."humanUserId"=tm."userId"
JOIN LATERAL (
  SELECT ia."id" FROM "TeamMember" own
  JOIN "IdentityActor" ia ON ia."humanUserId"=own."userId"
  WHERE own."teamId"=tm."teamId" AND own."role"='OWNER' AND own."status"='ACTIVE'
  ORDER BY own."joinedAt", own."userId" LIMIT 1
) owner_actor ON true;
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'Task', task."id", t."organizationId", t."tenantId", NULL,
       task."actorId", task."createdByActorId", task."ownedBy", 'EXACT_TEAM_TASK_V1', task."createdById"
FROM "Task" task
JOIN "Team" t ON t."id"=task."teamId"
WHERE task."actorId" IS NOT NULL AND task."createdByActorId" IS NOT NULL AND task."ownedBy" IS NOT NULL;
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'MemberWorkspaceSnapshot', w."id", t."organizationId", t."tenantId", NULL, actor."id", actor."id", actor."id", 'EXACT_TEAM_WORKSPACE_V1', w."publishedById"
FROM "MemberWorkspaceSnapshot" w JOIN "Team" t ON t."id"=w."teamId"
JOIN "IdentityActor" actor ON actor."humanUserId"=COALESCE(w."publishedById", (SELECT tm."userId" FROM "TeamMember" tm WHERE tm."teamId"=w."teamId" AND tm."role"='OWNER' AND tm."status"='ACTIVE' ORDER BY tm."joinedAt",tm."userId" LIMIT 1));
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'MemberTutorialProgress', p."id", t."organizationId", t."tenantId", NULL, actor."id", actor."id", actor."id", 'EXACT_PHASE200_ORGANIZATION_V1', p."userId"
FROM "MemberTutorialProgress" p JOIN "Team" t ON t."id"=p."organizationId" JOIN "IdentityActor" actor ON actor."humanUserId"=p."userId";
INSERT INTO "CustomerRecordOwnership" ("sourceTable","sourceRecordId","organizationId","tenantId","businessId","actorId","createdBy","ownedBy","mappingStrategy","sourceUserId")
SELECT 'MemberTutorialMutationReceipt', p."id", t."organizationId", t."tenantId", NULL, actor."id", actor."id", actor."id", 'EXACT_PHASE200_ORGANIZATION_V1', p."userId"
FROM "MemberTutorialMutationReceipt" p JOIN "Team" t ON t."id"=p."organizationId" JOIN "IdentityActor" actor ON actor."humanUserId"=p."userId";

CREATE TABLE "AutonomyEnvelopeRecord" (
  "recordId" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "envelopeId" uuid NOT NULL, "organizationId" uuid NOT NULL, "tenantId" uuid NOT NULL,
  "businessId" uuid, "actorId" uuid NOT NULL, "version" integer NOT NULL,
  "allowedActionTypes" text[] NOT NULL DEFAULT '{}', "toolScope" text[] NOT NULL DEFAULT '{}', "dataScope" text[] NOT NULL DEFAULT '{}',
  "budgetCurrency" text NOT NULL, "maximumMinorUnits" bigint NOT NULL DEFAULT 0, "reversible" boolean NOT NULL,
  "verification" text NOT NULL, "escalation" text NOT NULL, "expiresAt" timestamptz NOT NULL,
  "revokedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("envelopeId","version"),
  FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId"),
  FOREIGN KEY ("businessId","tenantId","organizationId") REFERENCES "BusinessBoundary"("id","tenantId","organizationId"),
  FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId"),
  CHECK ("version">=1), CHECK ("maximumMinorUnits">=0), CHECK ("expiresAt">"createdAt")
);
CREATE INDEX "AutonomyEnvelopeRecord_tenantId_actorId_expiresAt_idx" ON "AutonomyEnvelopeRecord"("tenantId","actorId","expiresAt");

CREATE OR REPLACE FUNCTION entral.phase202_enforce_append_only_envelope()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'AutonomyEnvelopeRecord is append-only' USING ERRCODE='55000'; END $$;
CREATE TRIGGER "AutonomyEnvelopeRecord_append_only_trigger" BEFORE UPDATE OR DELETE ON "AutonomyEnvelopeRecord"
FOR EACH ROW EXECUTE FUNCTION entral.phase202_enforce_append_only_envelope();

CREATE TABLE "AuthSession" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "actorId" uuid NOT NULL REFERENCES "IdentityActor"("id") ON DELETE RESTRICT,
  "organizationId" uuid REFERENCES "Team"("organizationId") ON DELETE RESTRICT,
  "tenantId" uuid REFERENCES "TenantBoundary"("id") ON DELETE RESTRICT,
  "supportGrantId" uuid,
  "sessionType" text NOT NULL CHECK ("sessionType" IN ('INTERNAL','MEMBER','SUPPORT')),
  "accessTokenId" uuid NOT NULL UNIQUE, "accountSessionVersion" integer NOT NULL, "refreshVersion" integer NOT NULL DEFAULT 1,
  "version" integer NOT NULL DEFAULT 1,
  "deviceLabel" text NOT NULL, "userAgentHash" text NOT NULL, "ipAddressHash" text NOT NULL,
  "issuedAt" timestamptz NOT NULL DEFAULT now(), "lastUsedAt" timestamptz NOT NULL DEFAULT now(), "expiresAt" timestamptz NOT NULL,
  "revokedAt" timestamptz, "revokeReason" text, "stepUpAt" timestamptz,
  "auditProvenanceId" text NOT NULL REFERENCES "AuditLog"("id") ON DELETE RESTRICT,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("id","userId","actorId"),
  CHECK ("refreshVersion">=1), CHECK ("version">=1), CHECK ("expiresAt">"issuedAt"),
  CHECK (
    ("sessionType"='INTERNAL' AND "organizationId" IS NULL AND "tenantId" IS NULL AND "supportGrantId" IS NULL)
    OR ("sessionType"='MEMBER' AND "organizationId" IS NOT NULL AND "tenantId" IS NOT NULL AND "supportGrantId" IS NULL)
    OR ("sessionType"='SUPPORT' AND "organizationId" IS NOT NULL AND "tenantId" IS NOT NULL AND "supportGrantId" IS NOT NULL)
  ),
  FOREIGN KEY ("actorId","userId") REFERENCES "IdentityActor"("id","humanUserId") ON DELETE RESTRICT,
  FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT
);
CREATE INDEX "AuthSession_userId_revokedAt_lastUsedAt_idx" ON "AuthSession"("userId","revokedAt","lastUsedAt");
CREATE INDEX "AuthSession_tenantId_revokedAt_idx" ON "AuthSession"("tenantId","revokedAt");

CREATE TABLE "SessionMutationReceipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
  "actorId" uuid NOT NULL,
  "transition" text NOT NULL,
  "subjectSessionId" uuid,
  "priorVersion" integer NOT NULL,
  "resultingVersion" integer NOT NULL,
  "revokedCount" integer NOT NULL,
  "idempotencyKey" text NOT NULL,
  "requestFingerprint" text NOT NULL,
  "requestId" text NOT NULL,
  "resultPayload" jsonb NOT NULL,
  "releaseVersion" text NOT NULL,
  "occurredAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("actorId","idempotencyKey"),
  CHECK ("transition" IN ('REVOKE_ONE','REVOKE_ALL')),
  CHECK ("priorVersion">=0 AND "resultingVersion"="priorVersion"+1),
  CHECK ("revokedCount">=0),
  CHECK (length("idempotencyKey") BETWEEN 12 AND 255),
  CHECK ("requestFingerprint" ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof("resultPayload")='object'),
  CHECK ("releaseVersion"='phase-202'),
  CHECK (
    ("transition"='REVOKE_ONE' AND "subjectSessionId" IS NOT NULL AND "revokedCount"=1)
    OR ("transition"='REVOKE_ALL' AND "subjectSessionId" IS NULL)
  ),
  CHECK (
    ("resultPayload"->>'transition_id') IS NOT DISTINCT FROM "id"::text
    AND ("resultPayload"->>'transition') IS NOT DISTINCT FROM "transition"
    AND ("resultPayload"->>'request_id') IS NOT DISTINCT FROM "requestId"
    AND ("resultPayload"->>'idempotency_key') IS NOT DISTINCT FROM "idempotencyKey"
    AND ("resultPayload"#>>'{actor,actor_id}') IS NOT DISTINCT FROM "actorId"::text
    AND ("resultPayload"->>'release_version') IS NOT DISTINCT FROM "releaseVersion"
    AND ("resultPayload"->>'prior_version')::integer IS NOT DISTINCT FROM "priorVersion"
    AND ("resultPayload"->>'resulting_version')::integer IS NOT DISTINCT FROM "resultingVersion"
    AND ("resultPayload"->>'revoked_count')::integer IS NOT DISTINCT FROM "revokedCount"
  ),
  FOREIGN KEY ("actorId","userId") REFERENCES "IdentityActor"("id","humanUserId") ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY ("subjectSessionId","userId","actorId") REFERENCES "AuthSession"("id","userId","actorId") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX "SessionMutationReceipt_actorId_occurredAt_idx" ON "SessionMutationReceipt"("actorId","occurredAt");
CREATE INDEX "SessionMutationReceipt_subjectSessionId_occurredAt_idx" ON "SessionMutationReceipt"("subjectSessionId","occurredAt");

CREATE TABLE "AuthRefreshCredential" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "sessionId" uuid NOT NULL REFERENCES "AuthSession"("id") ON DELETE CASCADE,
  "version" integer NOT NULL, "tokenHash" text NOT NULL UNIQUE, "issuedAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz NOT NULL, "consumedAt" timestamptz, "revokedAt" timestamptz, "replacementId" uuid,
  UNIQUE ("sessionId","version"), CHECK ("version">=1), CHECK ("expiresAt">"issuedAt")
);
CREATE INDEX "AuthRefreshCredential_sessionId_consumedAt_revokedAt_idx" ON "AuthRefreshCredential"("sessionId","consumedAt","revokedAt");
CREATE INDEX "AuthRefreshCredential_expiresAt_idx" ON "AuthRefreshCredential"("expiresAt");
ALTER TABLE "AuthRefreshCredential" ADD CONSTRAINT "AuthRefreshCredential_replacementId_fkey"
  FOREIGN KEY ("replacementId") REFERENCES "AuthRefreshCredential"("id") ON DELETE RESTRICT;

CREATE TABLE "PersonalSecretReference" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "actorId" uuid NOT NULL REFERENCES "IdentityActor"("id") ON DELETE RESTRICT,
  "provider" text NOT NULL, "purpose" text NOT NULL, "environment" text NOT NULL CHECK ("environment" IN ('DEVELOPMENT','STAGING','PRODUCTION')),
  "keyVersion" text NOT NULL, "encryptedValue" text NOT NULL, "lastFour" text, "version" integer NOT NULL DEFAULT 1,
  "revokedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CHECK ("version">=1), CHECK ("encryptedValue" LIKE '%"__entralEncrypted":true%')
);
CREATE INDEX "PersonalSecretReference_actorId_provider_purpose_idx" ON "PersonalSecretReference"("actorId","provider","purpose");
ALTER TABLE "PersonalSecretReference" ADD CONSTRAINT "PersonalSecretReference_id_actorId_key" UNIQUE ("id","actorId");

CREATE TABLE "PersonalSecretAccessAudit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "secretReferenceId" uuid NOT NULL REFERENCES "PersonalSecretReference"("id") ON DELETE RESTRICT,
  "actorId" uuid NOT NULL REFERENCES "IdentityActor"("id") ON DELETE RESTRICT, "action" text NOT NULL, "purpose" text NOT NULL,
  "outcome" text NOT NULL, "requestId" text NOT NULL, "occurredAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "PersonalSecretAccessAudit_actorId_occurredAt_idx" ON "PersonalSecretAccessAudit"("actorId","occurredAt");
CREATE INDEX "PersonalSecretAccessAudit_secretReferenceId_occurredAt_idx" ON "PersonalSecretAccessAudit"("secretReferenceId","occurredAt");

CREATE TABLE "MfaFactor" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "actorId" uuid NOT NULL REFERENCES "IdentityActor"("id") ON DELETE RESTRICT, "factorType" text NOT NULL CHECK ("factorType"='TOTP'),
  "secretReferenceId" uuid NOT NULL, "status" text NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','ACTIVE','REVOKED')),
  "version" integer NOT NULL DEFAULT 1, "verifiedAt" timestamptz, "lastAcceptedTotpCounter" bigint,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("id","userId","actorId"), CHECK ("version">=1)
);
CREATE INDEX "MfaFactor_userId_status_idx" ON "MfaFactor"("userId","status");
CREATE UNIQUE INDEX "MfaFactor_one_live_totp_per_user_idx" ON "MfaFactor"("userId")
WHERE "factorType"='TOTP' AND "status" IN ('PENDING','ACTIVE');
ALTER TABLE "MfaFactor" ADD CONSTRAINT "MfaFactor_actorId_userId_fkey"
  FOREIGN KEY ("actorId","userId") REFERENCES "IdentityActor"("id","humanUserId") ON DELETE RESTRICT;
CREATE TABLE "MfaRecoveryCode" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "factorId" uuid NOT NULL REFERENCES "MfaFactor"("id") ON DELETE CASCADE,
  "codeHash" text NOT NULL UNIQUE, "createdAt" timestamptz NOT NULL DEFAULT now(), "consumedAt" timestamptz
);
CREATE INDEX "MfaRecoveryCode_factorId_consumedAt_idx" ON "MfaRecoveryCode"("factorId","consumedAt");

CREATE TABLE "MfaMutationReceipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" text NOT NULL, "actorId" uuid NOT NULL,
  "sessionId" uuid NOT NULL, "factorId" uuid NOT NULL, "action" text NOT NULL,
  "requestId" text NOT NULL, "idempotencyKey" text NOT NULL, "requestFingerprint" text NOT NULL,
  "priorVersion" integer NOT NULL, "resultingVersion" integer NOT NULL, "resultPayload" jsonb NOT NULL,
  "occurredAt" timestamptz NOT NULL DEFAULT now(), UNIQUE ("actorId","idempotencyKey"),
  CHECK ("action" IN ('TOTP_ENROLL','TOTP_CONFIRM','STEP_UP','RECOVERY_REGENERATE','FACTOR_REVOKE')),
  CHECK ("requestFingerprint" ~ '^[0-9a-f]{64}$'), CHECK (length("idempotencyKey") BETWEEN 12 AND 255),
  CHECK ("priorVersion">=0 AND "resultingVersion"="priorVersion"+1), CHECK (jsonb_typeof("resultPayload")='object'),
  CHECK (("resultPayload"->>'transition_id') IS NOT DISTINCT FROM "id"::text
    AND ("resultPayload"->>'transition') IS NOT DISTINCT FROM "action"
    AND ("resultPayload"->>'request_id') IS NOT DISTINCT FROM "requestId"
    AND ("resultPayload"->>'idempotency_key') IS NOT DISTINCT FROM "idempotencyKey"
    AND ("resultPayload"->>'session_id') IS NOT DISTINCT FROM "sessionId"::text
    AND ("resultPayload"->>'factor_id') IS NOT DISTINCT FROM "factorId"::text
    AND ("resultPayload"#>>'{actor,actor_id}') IS NOT DISTINCT FROM "actorId"::text
    AND ("resultPayload"->>'release_version') IS NOT DISTINCT FROM 'phase-202'),
  CHECK (("resultPayload"->>'prior_version')::integer IS NOT DISTINCT FROM "priorVersion"
    AND ("resultPayload"->>'resulting_version')::integer IS NOT DISTINCT FROM "resultingVersion"),
  FOREIGN KEY ("sessionId","userId","actorId") REFERENCES "AuthSession"("id","userId","actorId") ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY ("factorId","userId","actorId") REFERENCES "MfaFactor"("id","userId","actorId") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX "MfaMutationReceipt_actorId_occurredAt_idx" ON "MfaMutationReceipt"("actorId","occurredAt");
CREATE INDEX "MfaMutationReceipt_factorId_occurredAt_idx" ON "MfaMutationReceipt"("factorId","occurredAt");

CREATE TABLE "MembershipInvitation" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL REFERENCES "Team"("organizationId"),
  "tenantId" uuid NOT NULL REFERENCES "TenantBoundary"("id"), "email" text NOT NULL, "role" text NOT NULL,
  "status" text NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','ACCEPTED','REVOKED','EXPIRED')),
  "tokenHash" text NOT NULL UNIQUE, "idempotencyKey" text NOT NULL, "invitedByActorId" uuid NOT NULL REFERENCES "IdentityActor"("id"),
  "notificationEvidenceId" uuid NOT NULL, "expiresAt" timestamptz NOT NULL, "acceptedAt" timestamptz,
  "revokedAt" timestamptz, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId","idempotencyKey")
);
CREATE INDEX "MembershipInvitation_tenantId_status_expiresAt_idx" ON "MembershipInvitation"("tenantId","status","expiresAt");
CREATE INDEX "MembershipInvitation_email_status_idx" ON "MembershipInvitation"("email","status");

CREATE TABLE "NotificationEvidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL REFERENCES "Team"("organizationId"),
  "tenantId" uuid NOT NULL REFERENCES "TenantBoundary"("id"), "channel" text NOT NULL, "recipientHash" text NOT NULL,
  "templateId" text NOT NULL, "providerMessageId" text, "status" text NOT NULL, "occurredAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "NotificationEvidence_tenantId_occurredAt_idx" ON "NotificationEvidence"("tenantId","occurredAt");
ALTER TABLE "NotificationEvidence" ADD CONSTRAINT "NotificationEvidence_id_tenantId_organizationId_key" UNIQUE ("id","tenantId","organizationId");
ALTER TABLE "NotificationEvidence" ADD CONSTRAINT "NotificationEvidence_tenantId_organizationId_fkey"
  FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT;
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_notificationEvidenceId_fkey"
  FOREIGN KEY ("notificationEvidenceId") REFERENCES "NotificationEvidence"("id") ON DELETE RESTRICT;
ALTER TABLE "MembershipInvitation"
  ADD CONSTRAINT "MembershipInvitation_tenantId_organizationId_fkey" FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MembershipInvitation_invitedByActorId_tenantId_organizationId_fkey" FOREIGN KEY ("invitedByActorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MembershipInvitation_notification_scope_fkey" FOREIGN KEY ("notificationEvidenceId","tenantId","organizationId") REFERENCES "NotificationEvidence"("id","tenantId","organizationId") ON DELETE RESTRICT;

CREATE TABLE "MembershipMutationReceipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL REFERENCES "Team"("organizationId"),
  "tenantId" uuid NOT NULL REFERENCES "TenantBoundary"("id"), "actorId" uuid NOT NULL REFERENCES "IdentityActor"("id"),
  "subjectUserId" text, "subjectEmailHash" text, "action" text NOT NULL, "priorVersion" integer NOT NULL, "resultingVersion" integer NOT NULL,
  "idempotencyKey" text NOT NULL, "requestFingerprint" text NOT NULL, "requestId" text NOT NULL, "notificationEvidenceId" uuid NOT NULL REFERENCES "NotificationEvidence"("id"),
  "resultPayload" jsonb NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(), UNIQUE ("tenantId","idempotencyKey"),
  CHECK ("resultingVersion"="priorVersion"+1),
  CHECK ("requestFingerprint" ~ '^[0-9a-f]{64}$'),
  CHECK ((("subjectUserId" IS NOT NULL)::int + ("subjectEmailHash" IS NOT NULL)::int)=1)
);
CREATE INDEX "MembershipMutationReceipt_tenantId_subjectUserId_createdAt_idx" ON "MembershipMutationReceipt"("tenantId","subjectUserId","createdAt");
ALTER TABLE "MembershipMutationReceipt"
  ADD CONSTRAINT "MembershipMutationReceipt_tenantId_organizationId_fkey" FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MembershipMutationReceipt_actor_scope_fkey" FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "MembershipMutationReceipt_notification_scope_fkey" FOREIGN KEY ("notificationEvidenceId","tenantId","organizationId") REFERENCES "NotificationEvidence"("id","tenantId","organizationId") ON DELETE RESTRICT;

CREATE TABLE "SecretReference" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL REFERENCES "Team"("organizationId"),
  "tenantId" uuid NOT NULL REFERENCES "TenantBoundary"("id"), "businessId" uuid REFERENCES "BusinessBoundary"("id"),
  "provider" text NOT NULL, "purpose" text NOT NULL, "environment" text NOT NULL CHECK ("environment" IN ('DEVELOPMENT','STAGING','PRODUCTION')),
  "keyVersion" text NOT NULL, "encryptedValue" text NOT NULL, "lastFour" text, "version" integer NOT NULL DEFAULT 1,
  "rotatedAt" timestamptz, "revokedAt" timestamptz, "createdByActorId" uuid NOT NULL REFERENCES "IdentityActor"("id"),
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("id","tenantId","organizationId"),
  CHECK ("version">=1), CHECK ("encryptedValue" LIKE '%"__entralEncrypted":true%')
);
CREATE INDEX "SecretReference_tenantId_provider_purpose_idx" ON "SecretReference"("tenantId","provider","purpose");
CREATE INDEX "SecretReference_businessId_provider_idx" ON "SecretReference"("businessId","provider");
ALTER TABLE "MfaFactor" ADD CONSTRAINT "MfaFactor_secretReferenceId_fkey" FOREIGN KEY ("secretReferenceId") REFERENCES "PersonalSecretReference"("id") ON DELETE RESTRICT;
ALTER TABLE "MfaFactor" ADD CONSTRAINT "MfaFactor_secret_actor_scope_fkey"
  FOREIGN KEY ("secretReferenceId","actorId") REFERENCES "PersonalSecretReference"("id","actorId") ON DELETE RESTRICT;
ALTER TABLE "SecretReference"
  ADD CONSTRAINT "SecretReference_tenantId_organizationId_fkey" FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "SecretReference_business_scope_fkey" FOREIGN KEY ("businessId","tenantId","organizationId") REFERENCES "BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "SecretReference_creator_scope_fkey" FOREIGN KEY ("createdByActorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT;

CREATE TABLE "SecretAccessAudit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "secretReferenceId" uuid NOT NULL,
  "organizationId" uuid NOT NULL, "tenantId" uuid NOT NULL, "actorId" uuid NOT NULL,
  "action" text NOT NULL, "purpose" text NOT NULL, "outcome" text NOT NULL, "requestId" text NOT NULL,
  "occurredAt" timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY ("secretReferenceId","tenantId","organizationId") REFERENCES "SecretReference"("id","tenantId","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT ON UPDATE NO ACTION
);
CREATE INDEX "SecretAccessAudit_tenantId_occurredAt_idx" ON "SecretAccessAudit"("tenantId","occurredAt");
CREATE INDEX "SecretAccessAudit_secretReferenceId_occurredAt_idx" ON "SecretAccessAudit"("secretReferenceId","occurredAt");

CREATE TABLE "SecretMutationReceipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "secretReferenceId" uuid NOT NULL,
  "organizationId" uuid NOT NULL,
  "tenantId" uuid NOT NULL,
  "businessId" uuid,
  "actorId" uuid NOT NULL,
  "transition" text NOT NULL,
  "priorVersion" integer NOT NULL,
  "resultingVersion" integer NOT NULL,
  "idempotencyKey" text NOT NULL,
  "requestFingerprint" text NOT NULL,
  "requestId" text NOT NULL,
  "resultPayload" jsonb NOT NULL,
  "releaseVersion" text NOT NULL,
  "occurredAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId","idempotencyKey"),
  CHECK ("transition" IN ('CREATE','ROTATE','REVOKE')),
  CHECK ("priorVersion">=0 AND "resultingVersion"="priorVersion"+1),
  CHECK (("transition"='CREATE' AND "priorVersion"=0 AND "resultingVersion"=1) OR "transition"<>'CREATE'),
  CHECK (length("idempotencyKey") BETWEEN 12 AND 255),
  CHECK ("requestFingerprint" ~ '^[0-9a-f]{64}$'),
  CHECK (jsonb_typeof("resultPayload")='object'),
  CHECK ("releaseVersion"='phase-202'),
  CHECK (
    ("resultPayload"->>'transition_id') IS NOT DISTINCT FROM "id"::text
    AND ("resultPayload"->>'transition') IS NOT DISTINCT FROM "transition"
    AND ("resultPayload"->>'request_id') IS NOT DISTINCT FROM "requestId"
    AND ("resultPayload"->>'idempotency_key') IS NOT DISTINCT FROM "idempotencyKey"
    AND ("resultPayload"#>>'{actor,actor_id}') IS NOT DISTINCT FROM "actorId"::text
    AND ("resultPayload"#>>'{ownership,organization_id}') IS NOT DISTINCT FROM "organizationId"::text
    AND ("resultPayload"#>>'{ownership,tenant_id}') IS NOT DISTINCT FROM "tenantId"::text
    AND ("resultPayload"#>>'{ownership,business_id}') IS NOT DISTINCT FROM "businessId"::text
    AND ("resultPayload"->>'secret_reference_id') IS NOT DISTINCT FROM "secretReferenceId"::text
    AND ("resultPayload"->>'release_version') IS NOT DISTINCT FROM "releaseVersion"
    AND ("resultPayload"->>'prior_version')::integer IS NOT DISTINCT FROM "priorVersion"
    AND ("resultPayload"->>'resulting_version')::integer IS NOT DISTINCT FROM "resultingVersion"
  ),
  FOREIGN KEY ("secretReferenceId","tenantId","organizationId") REFERENCES "SecretReference"("id","tenantId","organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION,
  FOREIGN KEY ("businessId","tenantId","organizationId") REFERENCES "BusinessBoundary"("id","tenantId","organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX "SecretMutationReceipt_tenantId_occurredAt_idx" ON "SecretMutationReceipt"("tenantId","occurredAt");
CREATE INDEX "SecretMutationReceipt_secretReferenceId_occurredAt_idx" ON "SecretMutationReceipt"("secretReferenceId","occurredAt");

-- The committed credential inventory proves these are the only two persisted
-- credential-bearing secure-JSON targets. Legacy columns remain nullable for a
-- bounded rollback window, while runtime writes are reference-only.
ALTER TABLE "ShopifyConnection"
  ALTER COLUMN "credentialJson" DROP NOT NULL,
  ADD COLUMN "credentialSecretReferenceId" uuid;
ALTER TABLE "ShopifyOAuthContinuation"
  ALTER COLUMN "payloadJson" DROP NOT NULL,
  ADD COLUMN "payloadSecretReferenceId" uuid;

ALTER TABLE "ShopifyConnection"
  ADD CONSTRAINT "ShopifyConnection_credentialSecretReferenceId_key" UNIQUE ("credentialSecretReferenceId"),
  ADD CONSTRAINT "ShopifyConnection_credentialSecretReferenceId_tenantId_orga_key" UNIQUE ("credentialSecretReferenceId","tenantId","organizationId"),
  ADD CONSTRAINT "ShopifyConnection_credential_secret_scope_fkey"
    FOREIGN KEY ("credentialSecretReferenceId","tenantId","organizationId")
    REFERENCES "SecretReference"("id","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "ShopifyConnection_credential_reference_xor_check"
    CHECK (("credentialJson" IS NOT NULL)::integer + ("credentialSecretReferenceId" IS NOT NULL)::integer = 1) NOT VALID;
ALTER TABLE "ShopifyOAuthContinuation"
  ADD CONSTRAINT "ShopifyOAuthContinuation_payloadSecretReferenceId_key" UNIQUE ("payloadSecretReferenceId"),
  ADD CONSTRAINT "ShopifyOAuthContinuation_payloadSecretReferenceId_tenantId__key" UNIQUE ("payloadSecretReferenceId","tenantId","organizationId"),
  ADD CONSTRAINT "ShopifyOAuthContinuation_payload_secret_scope_fkey"
    FOREIGN KEY ("payloadSecretReferenceId","tenantId","organizationId")
    REFERENCES "SecretReference"("id","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "ShopifyOAuthContinuation_payload_reference_xor_check"
    CHECK (("payloadJson" IS NOT NULL)::integer + ("payloadSecretReferenceId" IS NOT NULL)::integer = 1) NOT VALID;

CREATE OR REPLACE FUNCTION entral.phase202_guard_legacy_credential_write()
RETURNS trigger LANGUAGE plpgsql AS $phase202_credential_guard$
DECLARE legacy_column text := TG_ARGV[0]; reference_column text := TG_ARGV[1];
  old_row jsonb; new_row jsonb; old_legacy text; new_legacy text;
  old_reference text; new_reference text;
BEGIN
  new_row:=to_jsonb(NEW);
  new_legacy:=new_row->>legacy_column;
  new_reference:=NULLIF(new_row->>reference_column,'');
  IF NEW."tenantId" IS NULL OR NEW."organizationId" IS NULL THEN
    RAISE EXCEPTION 'Credential reference requires an exact tenant and organization scope' USING ERRCODE='23514';
  END IF;
  IF TG_OP='INSERT' THEN
    IF new_legacy IS NOT NULL OR new_reference IS NULL THEN
      RAISE EXCEPTION '% is reconciliation-only; new credentials require %',legacy_column,reference_column USING ERRCODE='55000';
    END IF;
    RETURN NEW;
  END IF;
  old_row:=to_jsonb(OLD);
  old_legacy:=old_row->>legacy_column;
  old_reference:=NULLIF(old_row->>reference_column,'');
  IF old_legacy IS NOT NULL AND old_reference IS NULL THEN
    IF new_legacy IS NOT DISTINCT FROM old_legacy AND new_reference IS NULL THEN
      RETURN NEW;
    END IF;
    IF new_legacy IS NULL AND new_reference IS NOT NULL THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION '% may only remain unchanged or convert once to %',legacy_column,reference_column USING ERRCODE='55000';
  END IF;
  IF old_legacy IS NULL AND old_reference IS NOT NULL
     AND new_legacy IS NULL AND new_reference IS NOT NULL THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid credential storage transition for %.%',TG_TABLE_NAME,legacy_column USING ERRCODE='55000';
END $phase202_credential_guard$;

CREATE TRIGGER "ShopifyConnection_phase202_credential_guard"
BEFORE INSERT OR UPDATE OF "credentialJson","credentialSecretReferenceId","tenantId","organizationId"
ON "ShopifyConnection" FOR EACH ROW
EXECUTE FUNCTION entral.phase202_guard_legacy_credential_write('credentialJson','credentialSecretReferenceId');
CREATE TRIGGER "ShopifyOAuthContinuation_phase202_payload_guard"
BEFORE INSERT OR UPDATE OF "payloadJson","payloadSecretReferenceId","tenantId","organizationId"
ON "ShopifyOAuthContinuation" FOR EACH ROW
EXECUTE FUNCTION entral.phase202_guard_legacy_credential_write('payloadJson','payloadSecretReferenceId');

CREATE TABLE "NotificationDeliveryOutbox" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" uuid NOT NULL,
  "tenantId" uuid NOT NULL,
  "notificationEvidenceId" uuid NOT NULL UNIQUE,
  "secretReferenceId" uuid NOT NULL UNIQUE,
  "deliveryKind" text NOT NULL CHECK ("deliveryKind" IN ('INVITATION','CHANGE')),
  "status" text NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','PROCESSING','PROVIDER_ACCEPTED','FAILED','DEAD_LETTER','NONPRODUCTION_RECORDED')),
  "attempts" integer NOT NULL DEFAULT 0 CHECK ("attempts">=0),
  "availableAt" timestamptz NOT NULL DEFAULT now(),
  "deadlineAt" timestamptz NOT NULL,
  "lockedBy" text,
  "lockedUntil" timestamptz,
  "providerMessageId" text,
  "lastErrorCode" text,
  "providerAcceptedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("id","tenantId","organizationId"),
  UNIQUE ("notificationEvidenceId","tenantId","organizationId"),
  UNIQUE ("secretReferenceId","tenantId","organizationId"),
  FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("notificationEvidenceId","tenantId","organizationId") REFERENCES "NotificationEvidence"("id","tenantId","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("secretReferenceId","tenantId","organizationId") REFERENCES "SecretReference"("id","tenantId","organizationId") ON DELETE RESTRICT,
  CHECK ("deadlineAt">"createdAt" AND "deadlineAt"<="createdAt"+interval '23 hours'),
  CHECK (("lockedBy" IS NULL)=("lockedUntil" IS NULL)),
  CHECK ("lastErrorCode" IS NULL OR "lastErrorCode" ~ '^[A-Z0-9_]{1,80}$'),
  CHECK (
    ("status"='PROCESSING' AND "lockedBy" IS NOT NULL)
    OR ("status"<>'PROCESSING' AND "lockedBy" IS NULL)
  ),
  CHECK (
    ("status" IN ('PROVIDER_ACCEPTED','NONPRODUCTION_RECORDED') AND "providerAcceptedAt" IS NOT NULL)
    OR ("status" NOT IN ('PROVIDER_ACCEPTED','NONPRODUCTION_RECORDED') AND "providerAcceptedAt" IS NULL)
  )
);
CREATE INDEX "NotificationDeliveryOutbox_due_idx"
  ON "NotificationDeliveryOutbox"("status","availableAt","deadlineAt","createdAt");
CREATE INDEX "NotificationDeliveryOutbox_tenantId_createdAt_idx"
  ON "NotificationDeliveryOutbox"("tenantId","createdAt");

CREATE TABLE "SupportAccessGrant" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL REFERENCES "Team"("organizationId"),
  "tenantId" uuid NOT NULL REFERENCES "TenantBoundary"("id"), "supportActorId" uuid NOT NULL REFERENCES "IdentityActor"("id"),
  "approvedByActorId" uuid NOT NULL REFERENCES "IdentityActor"("id"), "purpose" text NOT NULL, "scopes" text[] NOT NULL DEFAULT '{}',
  "accessMode" text NOT NULL DEFAULT 'READ_ONLY' CHECK ("accessMode" IN ('READ_ONLY','WRITE_ELEVATED')),
  "ownerVisible" boolean NOT NULL DEFAULT true CHECK ("ownerVisible"), "version" integer NOT NULL DEFAULT 1,
  "writeElevatedAt" timestamptz,
  "writeElevatedByActorId" uuid REFERENCES "IdentityActor"("id"), "writeElevationPurpose" text, "writeElevationExpiresAt" timestamptz,
  "issuedAt" timestamptz NOT NULL DEFAULT now(), "expiresAt" timestamptz NOT NULL, "revokedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("id","tenantId","organizationId"),
  CHECK ("expiresAt">"issuedAt"), CHECK ("version">=1),
  CHECK ("accessMode"='READ_ONLY' OR ("writeElevatedAt" IS NOT NULL AND "writeElevatedByActorId" IS NOT NULL AND "writeElevationPurpose" IS NOT NULL AND "writeElevationExpiresAt">"writeElevatedAt" AND "writeElevationExpiresAt"<="expiresAt"))
);
CREATE INDEX "SupportAccessGrant_tenantId_expiresAt_revokedAt_idx" ON "SupportAccessGrant"("tenantId","expiresAt","revokedAt");
CREATE INDEX "SupportAccessGrant_supportActorId_expiresAt_idx" ON "SupportAccessGrant"("supportActorId","expiresAt");
ALTER TABLE "SupportAccessGrant"
  ADD CONSTRAINT "SupportAccessGrant_tenantId_organizationId_fkey" FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "SupportAccessGrant_support_actor_scope_fkey" FOREIGN KEY ("supportActorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT,
  ADD CONSTRAINT "SupportAccessGrant_approver_scope_fkey" FOREIGN KEY ("approvedByActorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT;
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_support_grant_scope_fkey"
  FOREIGN KEY ("supportGrantId","tenantId","organizationId")
  REFERENCES "SupportAccessGrant"("id","tenantId","organizationId") ON DELETE RESTRICT;

CREATE TABLE "SupportAccessAudit" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "grantId" uuid NOT NULL,
  "organizationId" uuid NOT NULL, "tenantId" uuid NOT NULL, "actorId" uuid NOT NULL,
  "action" text NOT NULL, "targetType" text NOT NULL, "targetId" text, "outcome" text NOT NULL,
  "requestId" text NOT NULL, "idempotencyKey" text NOT NULL, "requestFingerprint" text NOT NULL,
  "priorVersion" integer NOT NULL, "resultingVersion" integer NOT NULL, "resultPayload" jsonb NOT NULL,
  "releaseVersion" text NOT NULL, "purpose" text NOT NULL, "scopes" text[] NOT NULL DEFAULT '{}',
  "accessMode" text NOT NULL CHECK ("accessMode" IN ('READ_ONLY','WRITE_ELEVATED')),
  "effectiveExpiresAt" timestamptz NOT NULL, "occurredAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("tenantId","idempotencyKey"),
  CHECK ("action" IN ('ISSUE_READ_ONLY','ELEVATE_WRITE','REVOKE')),
  CHECK ("requestFingerprint" ~ '^[0-9a-f]{64}$'), CHECK (length("idempotencyKey") BETWEEN 12 AND 255),
  CHECK ("priorVersion">=0 AND "resultingVersion"="priorVersion"+1), CHECK (jsonb_typeof("resultPayload")='object'),
  CHECK ("releaseVersion"='phase-202'
    AND ("resultPayload"->>'transition_id') IS NOT DISTINCT FROM "id"::text
    AND ("resultPayload"->>'transition') IS NOT DISTINCT FROM "action"
    AND ("resultPayload"->>'request_id') IS NOT DISTINCT FROM "requestId"
    AND ("resultPayload"->>'idempotency_key') IS NOT DISTINCT FROM "idempotencyKey"
    AND ("resultPayload"->>'grant_id') IS NOT DISTINCT FROM "grantId"::text
    AND ("resultPayload"#>>'{actor,actor_id}') IS NOT DISTINCT FROM "actorId"::text
    AND ("resultPayload"#>>'{ownership,organization_id}') IS NOT DISTINCT FROM "organizationId"::text
    AND ("resultPayload"#>>'{ownership,tenant_id}') IS NOT DISTINCT FROM "tenantId"::text
    AND ("resultPayload"->>'release_version') IS NOT DISTINCT FROM "releaseVersion"),
  CHECK (("resultPayload"->>'prior_version')::integer IS NOT DISTINCT FROM "priorVersion"
    AND ("resultPayload"->>'resulting_version')::integer IS NOT DISTINCT FROM "resultingVersion"),
  FOREIGN KEY ("grantId","tenantId","organizationId") REFERENCES "SupportAccessGrant"("id","tenantId","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE RESTRICT
);
CREATE INDEX "SupportAccessAudit_tenantId_occurredAt_idx" ON "SupportAccessAudit"("tenantId","occurredAt");
CREATE INDEX "SupportAccessAudit_grantId_occurredAt_idx" ON "SupportAccessAudit"("grantId","occurredAt");

CREATE TABLE "TenantRateLimitReceipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "organizationId" uuid NOT NULL, "tenantId" uuid NOT NULL,
  "actorId" uuid NOT NULL, "bucket" text NOT NULL, "windowStartedAt" timestamptz NOT NULL,
  "requestCount" integer NOT NULL, "limit" integer NOT NULL, "blocked" boolean NOT NULL, "requestId" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(), UNIQUE ("tenantId","bucket","windowStartedAt","requestId"),
  CHECK ("requestCount">=0), CHECK ("limit">0),
  FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY ("actorId","tenantId","organizationId") REFERENCES "TenantActorAssignment"("actorId","tenantId","organizationId") ON DELETE NO ACTION ON UPDATE NO ACTION
);
CREATE INDEX "TenantRateLimitReceipt_tenantId_bucket_windowStartedAt_idx" ON "TenantRateLimitReceipt"("tenantId","bucket","windowStartedAt");

CREATE TABLE "TenantRateLimitWindow" (
  "organizationId" uuid NOT NULL, "tenantId" uuid NOT NULL,
  "bucket" text NOT NULL, "windowStartedAt" timestamptz NOT NULL, "requestCount" integer NOT NULL DEFAULT 0,
  "limit" integer NOT NULL, "updatedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("tenantId","bucket","windowStartedAt"), CHECK ("requestCount">=0), CHECK ("limit">0),
  FOREIGN KEY ("tenantId","organizationId") REFERENCES "TenantBoundary"("id","organizationId") ON DELETE RESTRICT
);
CREATE INDEX "TenantRateLimitWindow_windowStartedAt_idx" ON "TenantRateLimitWindow"("windowStartedAt");

CREATE TABLE "OwnershipReconciliationRun" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "mode" text NOT NULL CHECK ("mode" IN ('APPLY','AUDIT')),
  "sourceInventoryHash" text NOT NULL, "sourceRows" integer NOT NULL, "mappedRows" integer NOT NULL,
  "duplicateRows" integer NOT NULL, "ambiguousRows" integer NOT NULL, "missingRows" integer NOT NULL,
  "repairPlanReference" text NOT NULL, "rollbackReference" text NOT NULL, "receiptHash" text NOT NULL UNIQUE,
  "completedAt" timestamptz NOT NULL, "createdAt" timestamptz NOT NULL DEFAULT now(),
  CHECK ("sourceRows">=0 AND "mappedRows">=0 AND "duplicateRows">=0 AND "ambiguousRows">=0 AND "missingRows">=0),
  CHECK ("sourceInventoryHash" ~ '^[a-f0-9]{64}$'),
  CHECK ("repairPlanReference" ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[a-f0-9]{40}:.+$'),
  CHECK ("rollbackReference" ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[a-f0-9]{40}:.+$'),
  CHECK ("receiptHash" ~ '^[a-f0-9]{64}$')
);
CREATE INDEX "OwnershipReconciliationRun_completedAt_idx" ON "OwnershipReconciliationRun"("completedAt");

CREATE TABLE "CredentialReferenceReconciliationRun" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "mode" text NOT NULL CHECK ("mode" IN ('APPLY','AUDIT')),
  "inventoryId" text NOT NULL CHECK ("inventoryId"='phase202-credential-reference-inventory-v1'),
  "inventoryHash" text NOT NULL CHECK ("inventoryHash" ~ '^[a-f0-9]{64}$'),
  "targetCount" integer NOT NULL CHECK ("targetCount"=2),
  "sourceStateHash" text NOT NULL CHECK ("sourceStateHash" ~ '^[a-f0-9]{64}$'),
  "sourceRows" integer NOT NULL CHECK ("sourceRows">=0),
  "referencedRows" integer NOT NULL CHECK ("referencedRows">=0),
  "legacyRows" integer NOT NULL CHECK ("legacyRows">=0),
  "missingReferenceRows" integer NOT NULL CHECK ("missingReferenceRows">=0),
  "invalidReferenceRows" integer NOT NULL CHECK ("invalidReferenceRows">=0),
  "rowIdentityHash" text NOT NULL CHECK ("rowIdentityHash" ~ '^[a-f0-9]{64}$'),
  "priorApplyReceiptHash" text,
  "repairPlanReference" text NOT NULL,
  "rollbackReference" text NOT NULL,
  "receiptHash" text NOT NULL UNIQUE CHECK ("receiptHash" ~ '^[a-f0-9]{64}$'),
  "completedAt" timestamptz NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CHECK ("referencedRows"<="sourceRows"),
  CHECK ("legacyRows"<="sourceRows"),
  CHECK ("missingReferenceRows"<="sourceRows"),
  CHECK ("invalidReferenceRows"<="sourceRows"),
  CHECK (
    ("mode"='APPLY' AND "priorApplyReceiptHash" IS NULL)
    OR ("mode"='AUDIT' AND "priorApplyReceiptHash" ~ '^[a-f0-9]{64}$')
  ),
  CHECK ("repairPlanReference" ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[a-f0-9]{40}:.+$'),
  CHECK ("rollbackReference" ~ '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@[a-f0-9]{40}:.+$')
);
CREATE INDEX "CredentialReferenceReconciliationRun_mode_completedAt_idx"
  ON "CredentialReferenceReconciliationRun"("mode","completedAt");

CREATE TABLE "AccountDeidentificationReceipt" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
  "actorId" uuid NOT NULL REFERENCES "IdentityActor"("id") ON DELETE RESTRICT,
  "requestId" text NOT NULL,
  "idempotencyKey" text NOT NULL,
  "outcome" text NOT NULL CHECK ("outcome"='ACCOUNT_DEIDENTIFIED'),
  "erasedFieldClasses" text[] NOT NULL,
  "retainedEvidenceClasses" text[] NOT NULL,
  "membershipReceiptIds" uuid[] NOT NULL,
  "receiptHash" text NOT NULL UNIQUE CHECK ("receiptHash" ~ '^[a-f0-9]{64}$'),
  "occurredAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("userId","idempotencyKey"),
  UNIQUE ("id","userId","actorId")
);
CREATE INDEX "AccountDeidentificationReceipt_actorId_occurredAt_idx"
  ON "AccountDeidentificationReceipt"("actorId","occurredAt");

CREATE OR REPLACE FUNCTION entral.phase202_provision_tenant_owner(
  p_user_id text,p_name text,p_email text,p_password_hash text,
  p_team_id text,p_team_name text,p_team_slug text,
  p_organization_id uuid,p_tenant_id uuid,p_actor_id uuid
) RETURNS TABLE("userId" text,"teamId" text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
BEGIN
  IF p_name='' OR p_email='' OR p_password_hash='' OR p_team_name='' OR p_team_slug='' THEN
    RAISE EXCEPTION 'Tenant owner provisioning input is incomplete' USING ERRCODE='22023';
  END IF;
  INSERT INTO "User" ("id","name","email","passwordHash","role","internalAccess","sessionVersion","createdAt","updatedAt")
  VALUES (p_user_id,p_name,lower(p_email),p_password_hash,'USER',false,0,now(),now());
  INSERT INTO "Team" ("id","organizationId","tenantId","name","slug","environment","dataResidency","ownershipVersion","memberAccessEnabled","memberSeatLimit","createdAt","updatedAt")
  VALUES (p_team_id,p_organization_id,p_tenant_id,p_team_name,p_team_slug,'PRODUCTION','US',1,false,5,now(),now());
  INSERT INTO "TenantBoundary" ("id","organizationId","legacyTeamId","environment","dataResidency")
  VALUES (p_tenant_id,p_organization_id,p_team_id,'PRODUCTION','US');
  INSERT INTO "IdentityActor" ("id","actorType","humanUserId") VALUES (p_actor_id,'HUMAN',p_user_id);
  INSERT INTO "TenantActorAssignment" ("actorId","organizationId","tenantId","role","authorityDomains")
  VALUES (p_actor_id,p_organization_id,p_tenant_id,'OWNER',ARRAY['IDENTITY','TENANCY','OPERATIONS','FINANCE','INTEGRATIONS','SUPPORT']::text[]);
  INSERT INTO "TeamMember" ("userId","teamId","role","status","version","organizationId","tenantId","actorId","createdBy","ownedBy","joinedAt","updatedAt")
  VALUES (p_user_id,p_team_id,'OWNER','ACTIVE',1,p_organization_id,p_tenant_id,p_actor_id,p_actor_id,p_actor_id,now(),now());
  PERFORM entral.bind_authenticated_app_user(p_user_id);
  RETURN QUERY SELECT p_user_id,p_team_id;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_register_invited_identity(
  p_token_hash text,p_email text,p_name text,p_password_hash text,p_user_id text,p_actor_id uuid
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
DECLARE invitation_id uuid; invitation_status text; registered_user_id text;
BEGIN
  IF p_token_hash='' OR p_email='' OR p_name='' OR p_password_hash='' OR p_user_id='' THEN
    RAISE EXCEPTION 'Invited identity input is incomplete' USING ERRCODE='22023';
  END IF;
  SELECT invitation."id",invitation."status" INTO invitation_id,invitation_status FROM "MembershipInvitation" invitation
  WHERE invitation."tokenHash"=p_token_hash AND lower(invitation."email")=lower(p_email)
    AND (
      (invitation."status"='PENDING' AND invitation."expiresAt">now())
      OR invitation."status"='ACCEPTED'
    )
  FOR UPDATE;
  IF invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation' USING ERRCODE='42501';
  END IF;
  IF invitation_status='ACCEPTED' THEN
    SELECT app_user."id" INTO registered_user_id FROM "User" app_user
    JOIN "IdentityActor" actor
      ON actor."humanUserId"=app_user."id" AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
    WHERE lower(app_user."email")=lower(p_email);
    IF registered_user_id IS NULL THEN
      RAISE EXCEPTION 'Accepted invitation identity is missing' USING ERRCODE='23503';
    END IF;
    PERFORM entral.bind_authenticated_app_user(registered_user_id);
    RETURN registered_user_id;
  END IF;
  IF EXISTS (SELECT 1 FROM "User" WHERE lower("email")=lower(p_email)) THEN
    RAISE EXCEPTION 'Email already exists' USING ERRCODE='23505';
  END IF;
  INSERT INTO "User"("id","name","email","passwordHash","role","internalAccess","sessionVersion","createdAt","updatedAt")
  VALUES (p_user_id,p_name,lower(p_email),p_password_hash,'USER',false,0,now(),now());
  INSERT INTO "IdentityActor"("id","actorType","humanUserId") VALUES (p_actor_id,'HUMAN',p_user_id);
  PERFORM entral.bind_authenticated_app_user(p_user_id);
  RETURN p_user_id;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_provision_agent_actor()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
DECLARE new_actor_id uuid;
BEGIN
  INSERT INTO "IdentityActor" ("actorType","agentId") VALUES ('AGENT',NEW."id")
  ON CONFLICT ("agentId") DO UPDATE SET "status"='ACTIVE',"updatedAt"=now()
  RETURNING "id" INTO new_actor_id;
  INSERT INTO "TenantActorAssignment" ("actorId","organizationId","tenantId","role","authorityDomains")
  VALUES (new_actor_id,NEW."organizationId",NEW."tenantId",'AGENT',ARRAY['OPERATIONS']::text[])
  ON CONFLICT ("actorId","tenantId") DO UPDATE SET "status"='ACTIVE',"version"="TenantActorAssignment"."version"+1,"updatedAt"=now();
  RETURN NEW;
END $$;
CREATE TRIGGER "Agent_phase202_actor_provision_trigger" AFTER INSERT ON "Agent"
FOR EACH ROW EXECUTE FUNCTION entral.phase202_provision_agent_actor();

-- Tenant context is transaction-local and is authoritative only after the
-- canonical Phase 150 binder and Phase 202 assignment checks both succeed.
CREATE OR REPLACE FUNCTION entral.phase202_current_tenant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION entral.phase202_current_actor_id()
RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.phase202_actor_id', true), '')::uuid $$;
CREATE OR REPLACE FUNCTION entral.phase202_current_support_grant_id()
RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.phase202_support_grant_id', true), '')::uuid $$;

CREATE OR REPLACE FUNCTION entral.phase202_resolve_human_actor(p_auth_subject text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$ SELECT "id" FROM "IdentityActor" WHERE "actorType"='HUMAN' AND "humanUserId"=p_auth_subject AND "status"='ACTIVE' LIMIT 1 $$;
CREATE OR REPLACE FUNCTION entral.phase202_resolve_service_actor(p_app_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$ SELECT "id" FROM "IdentityActor" WHERE "actorType"='SERVICE' AND "serviceSubject"='canonical-app-user:'||p_app_user_id::text AND "status"='ACTIVE' LIMIT 1 $$;
CREATE OR REPLACE FUNCTION entral.phase202_resolve_support_session(
  p_actor_id uuid,p_support_grant_id uuid,p_app_user_id uuid
) RETURNS TABLE(
  "actorId" uuid,"organizationId" uuid,"tenantId" uuid,"role" text,
  "supportGrantId" uuid,"grantExpiresAt" timestamptz,"accessMode" text,
  "scopes" text[],"writeElevationExpiresAt" timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_support_session$
  SELECT actor."id",support_grant."organizationId",support_grant."tenantId",assignment."role",
         support_grant."id",support_grant."expiresAt",
         CASE
           WHEN support_grant."accessMode"='WRITE_ELEVATED'
            AND support_grant."writeElevatedAt" IS NOT NULL
            AND support_grant."writeElevatedByActorId" IS NOT NULL
            AND support_grant."writeElevationPurpose" IS NOT NULL
            AND support_grant."writeElevationExpiresAt">now()
            AND support_grant."writeElevationExpiresAt"<=support_grant."expiresAt"
           THEN 'WRITE_ELEVATED' ELSE 'READ_ONLY'
         END,
         CASE
           WHEN support_grant."accessMode"='WRITE_ELEVATED'
            AND support_grant."writeElevatedAt" IS NOT NULL
            AND support_grant."writeElevatedByActorId" IS NOT NULL
            AND support_grant."writeElevationPurpose" IS NOT NULL
            AND support_grant."writeElevationExpiresAt">now()
            AND support_grant."writeElevationExpiresAt"<=support_grant."expiresAt"
           THEN support_grant."scopes"
           ELSE ARRAY(SELECT scope FROM unnest(support_grant."scopes") scope WHERE scope NOT LIKE '%:write')
         END,
         CASE
           WHEN support_grant."accessMode"='WRITE_ELEVATED'
            AND support_grant."writeElevatedAt" IS NOT NULL
            AND support_grant."writeElevatedByActorId" IS NOT NULL
            AND support_grant."writeElevationPurpose" IS NOT NULL
            AND support_grant."writeElevationExpiresAt">now()
            AND support_grant."writeElevationExpiresAt"<=support_grant."expiresAt"
           THEN support_grant."writeElevationExpiresAt" ELSE NULL
         END
  FROM entral.app_users canonical_user
  JOIN "IdentityActor" actor
    ON actor."id"=p_actor_id AND actor."actorType"='HUMAN'
   AND actor."humanUserId"=canonical_user.auth_subject AND actor."status"='ACTIVE'
  JOIN "SupportAccessGrant" support_grant
    ON support_grant."id"=p_support_grant_id AND support_grant."supportActorId"=actor."id"
   AND support_grant."ownerVisible" AND support_grant."revokedAt" IS NULL AND support_grant."expiresAt">now()
  JOIN "TenantActorAssignment" assignment
    ON assignment."actorId"=actor."id" AND assignment."tenantId"=support_grant."tenantId"
   AND assignment."organizationId"=support_grant."organizationId" AND assignment."role"='SUPPORT'
   AND assignment."status"='ACTIVE' AND 'SUPPORT'=ANY(assignment."authorityDomains")
  JOIN "TenantBoundary" boundary
    ON boundary."id"=support_grant."tenantId" AND boundary."organizationId"=support_grant."organizationId"
   AND boundary."status"='ACTIVE'
  WHERE canonical_user.id=p_app_user_id AND canonical_user.id=entral.session_app_user_id()
    AND canonical_user.is_active
    AND p_actor_id=entral.phase202_current_actor_id()
    AND p_support_grant_id=entral.phase202_current_support_grant_id()
    AND cardinality(support_grant."scopes")>0
$phase202_support_session$;

CREATE OR REPLACE FUNCTION entral.phase202_support_auth_session_access_allows(
  p_actor_id uuid,p_tenant_id uuid,p_organization_id uuid,p_support_grant_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_support_auth_session_access$
  SELECT p_actor_id=entral.phase202_current_actor_id()
    AND p_tenant_id=entral.phase202_current_tenant_id()
    AND p_support_grant_id=entral.phase202_current_support_grant_id()
    AND EXISTS (
      SELECT 1
      FROM entral.app_users canonical_user
      JOIN "IdentityActor" actor
        ON actor."id"=p_actor_id AND actor."actorType"='HUMAN'
       AND actor."humanUserId"=canonical_user.auth_subject AND actor."status"='ACTIVE'
      JOIN "TenantActorAssignment" assignment
        ON assignment."actorId"=actor."id" AND assignment."tenantId"=p_tenant_id
       AND assignment."organizationId"=p_organization_id AND assignment."role"='SUPPORT'
       AND assignment."status"='ACTIVE' AND 'SUPPORT'=ANY(assignment."authorityDomains")
      JOIN "SupportAccessGrant" support_grant
        ON support_grant."id"=p_support_grant_id AND support_grant."supportActorId"=actor."id"
       AND support_grant."tenantId"=assignment."tenantId" AND support_grant."organizationId"=assignment."organizationId"
       AND support_grant."ownerVisible" AND support_grant."revokedAt" IS NULL AND support_grant."expiresAt">now()
       AND cardinality(support_grant."scopes")>0
      JOIN "TenantBoundary" boundary
        ON boundary."id"=support_grant."tenantId" AND boundary."organizationId"=support_grant."organizationId"
       AND boundary."status"='ACTIVE'
      WHERE canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active
    )
$phase202_support_auth_session_access$;

CREATE OR REPLACE FUNCTION entral.phase202_support_session_audit_insert_allows(
  p_scope_kind text,p_organization_id uuid,p_tenant_id uuid,p_business_id uuid,
  p_actor_id uuid,p_created_by uuid,p_owned_by uuid,p_actor_user_id text,
  p_action text,p_target_type text,p_target_id text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_support_session_audit$
  SELECT p_scope_kind='TENANT'
    AND p_actor_id=entral.phase202_current_actor_id()
    AND p_tenant_id=entral.phase202_current_tenant_id()
    AND p_action IN ('auth.session.issued','auth.session.refreshed')
    AND p_target_type='auth_session' AND NULLIF(p_target_id,'') IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM "IdentityActor" actor
      JOIN "TenantActorAssignment" assignment
        ON assignment."actorId"=actor."id" AND assignment."tenantId"=p_tenant_id
       AND assignment."organizationId"=p_organization_id AND assignment."role"='SUPPORT'
       AND assignment."status"='ACTIVE' AND 'SUPPORT'=ANY(assignment."authorityDomains")
      JOIN "SupportAccessGrant" support_grant
        ON support_grant."id"=entral.phase202_current_support_grant_id()
       AND support_grant."supportActorId"=actor."id"
       AND support_grant."tenantId"=assignment."tenantId"
       AND support_grant."organizationId"=assignment."organizationId"
       AND support_grant."ownerVisible" AND support_grant."revokedAt" IS NULL
       AND support_grant."expiresAt">now() AND cardinality(support_grant."scopes")>0
      JOIN "TenantBoundary" boundary
        ON boundary."id"=assignment."tenantId" AND boundary."organizationId"=assignment."organizationId"
       AND boundary."status"='ACTIVE'
      WHERE actor."id"=p_actor_id AND actor."actorType"='HUMAN'
       AND actor."humanUserId"=p_actor_user_id AND actor."status"='ACTIVE'
    )
    AND (
      p_action='auth.session.issued'
      OR EXISTS (
        SELECT 1 FROM "AuthSession" session
        WHERE session."id"=p_target_id::uuid AND session."sessionType"='SUPPORT'
          AND session."actorId"=p_actor_id AND session."tenantId"=p_tenant_id
          AND session."organizationId"=p_organization_id
          AND session."supportGrantId"=entral.phase202_current_support_grant_id()
          AND session."revokedAt" IS NULL AND session."expiresAt">now()
      )
    )
$phase202_support_session_audit$;

CREATE OR REPLACE FUNCTION entral.phase202_member_auth_session_access_allows(
  p_actor_id uuid,p_tenant_id uuid,p_organization_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_member_auth_session_access$
  SELECT p_actor_id IS NOT NULL AND p_tenant_id IS NOT NULL AND p_organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM entral.app_users canonical_user
      JOIN "IdentityActor" actor
        ON actor."id"=p_actor_id AND actor."humanUserId"=canonical_user.auth_subject
       AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
      JOIN "TenantActorAssignment" assignment
        ON assignment."actorId"=actor."id" AND assignment."tenantId"=p_tenant_id
       AND assignment."organizationId"=p_organization_id AND assignment."status"='ACTIVE'
       AND assignment."role" NOT IN ('SUPPORT','SERVICE','AGENT')
      JOIN "TenantBoundary" boundary
        ON boundary."id"=assignment."tenantId" AND boundary."organizationId"=assignment."organizationId"
       AND boundary."status"='ACTIVE'
      JOIN "Team" team
        ON team."tenantId"=assignment."tenantId" AND team."organizationId"=assignment."organizationId"
      JOIN "TeamMember" membership
        ON membership."teamId"=team."id" AND membership."userId"=actor."humanUserId"
       AND membership."status"='ACTIVE'
      WHERE canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active
    )
$phase202_member_auth_session_access$;

CREATE OR REPLACE FUNCTION entral.phase202_member_session_audit_insert_allows(
  p_scope_kind text,p_organization_id uuid,p_tenant_id uuid,
  p_actor_id uuid,p_created_by uuid,p_owned_by uuid,p_actor_user_id text,
  p_action text,p_target_type text,p_target_id text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_member_session_audit$
  SELECT p_scope_kind='TENANT'
    AND p_organization_id=NULLIF(current_setting('app.organization_id',true),'')::uuid
    AND p_tenant_id=entral.phase202_current_tenant_id()
    AND p_actor_id=entral.phase202_current_actor_id()
    AND p_created_by=p_actor_id AND p_owned_by=p_actor_id
    AND p_action IN ('auth.session.issued','auth.session.refreshed')
    AND p_target_type='auth_session' AND NULLIF(p_target_id,'') IS NOT NULL
    AND entral.phase202_member_auth_session_access_allows(
      p_actor_id,p_tenant_id,p_organization_id
    )
    AND EXISTS (
      SELECT 1 FROM "IdentityActor" actor
      WHERE actor."id"=p_actor_id AND actor."humanUserId"=p_actor_user_id
        AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
    )
    AND (
      p_action='auth.session.issued'
      OR EXISTS (
        SELECT 1 FROM "AuthSession" session
        WHERE session."id"=p_target_id::uuid AND session."sessionType"='MEMBER'
          AND session."actorId"=p_actor_id AND session."tenantId"=p_tenant_id
          AND session."organizationId"=p_organization_id
          AND session."supportGrantId" IS NULL
          AND session."revokedAt" IS NULL AND session."expiresAt">now()
      )
    )
$phase202_member_session_audit$;
CREATE OR REPLACE FUNCTION entral.phase202_resolve_tenant_assignment(p_actor_id uuid,p_tenant_id uuid,p_app_user_id uuid)
RETURNS TABLE("actorId" uuid,"organizationId" uuid,"tenantId" uuid,"role" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT actor."id",assignment."organizationId",assignment."tenantId",assignment."role"
  FROM entral.app_users canonical_user
  JOIN "IdentityActor" actor ON actor."id"=p_actor_id AND actor."status"='ACTIVE'
  JOIN "TenantActorAssignment" assignment
    ON assignment."actorId"=actor."id" AND assignment."tenantId"=p_tenant_id AND assignment."status"='ACTIVE'
  JOIN "TenantBoundary" boundary
    ON boundary."id"=assignment."tenantId" AND boundary."organizationId"=assignment."organizationId" AND boundary."status"='ACTIVE'
  WHERE canonical_user.id=p_app_user_id AND canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active
    AND (
      (
        actor."actorType"='HUMAN' AND actor."humanUserId"=canonical_user.auth_subject
        AND (
          assignment."role"='SUPPORT'
          OR EXISTS (
            SELECT 1 FROM "TeamMember" membership
            JOIN "Team" team ON team."id"=membership."teamId"
            WHERE membership."userId"=actor."humanUserId" AND membership."status"='ACTIVE'
              AND team."tenantId"=assignment."tenantId" AND team."organizationId"=assignment."organizationId"
          )
        )
      )
      OR (
        actor."actorType"='SERVICE' AND actor."serviceSubject"='canonical-app-user:'||canonical_user.id::text
        AND EXISTS (
          SELECT 1 FROM entral.scope_grants service_grant
          WHERE service_grant.user_id=canonical_user.id
            AND (service_grant.expires_at IS NULL OR service_grant.expires_at>now())
            AND (
              (service_grant.scope_type='SYSTEM' AND service_grant.scope_id IS NULL)
              OR (
                service_grant.scope_type='BUSINESS'
                AND EXISTS (
                  SELECT 1 FROM "BusinessBoundary" business
                  WHERE business."canonicalBusinessId"=service_grant.scope_id
                    AND business."tenantId"=assignment."tenantId"
                    AND business."organizationId"=assignment."organizationId"
                    AND business."status"='ACTIVE'
                )
              )
            )
        )
      )
    )
  LIMIT 1
$$;
CREATE OR REPLACE FUNCTION entral.phase202_resolve_single_tenant_assignment(p_actor_id uuid,p_app_user_id uuid)
RETURNS TABLE("organizationId" uuid,"tenantId" uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  WITH eligible AS (
    SELECT assignment."organizationId",assignment."tenantId"
    FROM entral.app_users canonical_user
    JOIN "IdentityActor" actor
      ON actor."id"=p_actor_id AND actor."actorType"='HUMAN'
     AND actor."humanUserId"=canonical_user.auth_subject AND actor."status"='ACTIVE'
    JOIN "TenantActorAssignment" assignment
      ON assignment."actorId"=actor."id" AND assignment."status"='ACTIVE'
     AND assignment."role" NOT IN ('SUPPORT','SERVICE','AGENT')
    JOIN "TenantBoundary" boundary
      ON boundary."id"=assignment."tenantId"
     AND boundary."organizationId"=assignment."organizationId" AND boundary."status"='ACTIVE'
    JOIN "TeamMember" membership
      ON membership."userId"=actor."humanUserId" AND membership."status"='ACTIVE'
    JOIN "Team" team
      ON team."id"=membership."teamId" AND team."tenantId"=assignment."tenantId"
     AND team."organizationId"=assignment."organizationId"
    WHERE canonical_user.id=p_app_user_id
      AND canonical_user.id=entral.session_app_user_id()
      AND canonical_user.is_active
  )
  SELECT min(eligible."organizationId"::text)::uuid,min(eligible."tenantId"::text)::uuid
  FROM eligible
  HAVING count(*)=1
$$;
CREATE OR REPLACE FUNCTION entral.phase202_resolve_refresh_subject(p_token_hash text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT session."userId" FROM "AuthRefreshCredential" credential
  JOIN "AuthSession" session ON session."id"=credential."sessionId"
  WHERE credential."tokenHash"=p_token_hash LIMIT 1
$$;
CREATE OR REPLACE FUNCTION entral.phase202_resolve_refresh_context(p_token_hash text)
RETURNS TABLE("userId" text,"organizationId" uuid,"tenantId" uuid,"supportGrantId" uuid,"sessionType" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT session."userId",session."organizationId",session."tenantId",session."supportGrantId",session."sessionType"
  FROM "AuthRefreshCredential" credential
  JOIN "AuthSession" session ON session."id"=credential."sessionId"
  WHERE credential."tokenHash"=p_token_hash
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION entral.phase202_resolve_invitation_context(p_token_hash text,p_auth_subject text)
RETURNS TABLE("invitationId" uuid,"tenantId" uuid,"organizationId" uuid,"teamId" text,"actorId" uuid,"role" text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT invitation."id",invitation."tenantId",invitation."organizationId",team."id",actor."id",invitation."role"
  FROM "MembershipInvitation" invitation
  JOIN "Team" team ON team."tenantId"=invitation."tenantId" AND team."organizationId"=invitation."organizationId"
  JOIN "User" app_user ON app_user."id"=p_auth_subject AND lower(app_user."email")=lower(invitation."email")
  JOIN "IdentityActor" actor ON actor."humanUserId"=app_user."id" AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
  WHERE invitation."tokenHash"=p_token_hash
    AND (
      (invitation."status"='PENDING' AND invitation."expiresAt">now())
      OR (invitation."status"='ACCEPTED' AND invitation."acceptedAt" IS NOT NULL)
    )
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION entral.phase202_invitation_acceptance_allows(
  p_tenant_id uuid,p_organization_id uuid,p_actor_id uuid,p_user_id text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "MembershipInvitation" invitation
    JOIN "User" app_user ON app_user."id"=p_user_id AND lower(app_user."email")=lower(invitation."email")
    JOIN "IdentityActor" actor ON actor."id"=p_actor_id AND actor."humanUserId"=app_user."id" AND actor."status"='ACTIVE'
    JOIN entral.app_users canonical_user ON canonical_user.auth_subject=app_user."id" AND canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active
    WHERE invitation."id"=NULLIF(current_setting('app.phase202_invitation_id',true),'')::uuid
      AND invitation."tokenHash"=NULLIF(current_setting('app.phase202_invitation_token_hash',true),'')
      AND invitation."tenantId"=p_tenant_id AND invitation."organizationId"=p_organization_id
      AND invitation."status"='PENDING' AND invitation."expiresAt">now()
      AND actor."id"=entral.phase202_current_actor_id()
  )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_invitation_row_access_allows(
  p_invitation_id uuid,p_token_hash text,p_tenant_id uuid,p_organization_id uuid,
  p_email text,p_actor_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT p_invitation_id=NULLIF(current_setting('app.phase202_invitation_id',true),'')::uuid
    AND p_token_hash=NULLIF(current_setting('app.phase202_invitation_token_hash',true),'')
    AND p_tenant_id=NULLIF(current_setting('app.tenant_id',true),'')::uuid
    AND p_organization_id=NULLIF(current_setting('app.organization_id',true),'')::uuid
    AND p_actor_id=entral.phase202_current_actor_id()
    AND EXISTS (
      SELECT 1 FROM entral.app_users canonical_user
      JOIN "User" app_user
        ON app_user."id"=canonical_user.auth_subject AND lower(app_user."email")=lower(p_email)
      JOIN "IdentityActor" actor
        ON actor."id"=p_actor_id AND actor."humanUserId"=app_user."id"
       AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
      WHERE canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_invitation_receipt_read_allows(
  p_tenant_id uuid,p_organization_id uuid,p_actor_id uuid,p_subject_user_id text,p_result_payload jsonb
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT p_actor_id=entral.phase202_current_actor_id()
    AND p_subject_user_id=(SELECT "humanUserId" FROM "IdentityActor" WHERE "id"=p_actor_id)
    AND p_result_payload->>'transition'='ACCEPT'
    AND p_result_payload->>'transition_id'=current_setting('app.phase202_invitation_id',true)
    AND EXISTS (
      SELECT 1 FROM "MembershipInvitation" invitation
      JOIN "User" app_user
        ON app_user."id"=p_subject_user_id AND lower(app_user."email")=lower(invitation."email")
      WHERE invitation."id"=NULLIF(current_setting('app.phase202_invitation_id',true),'')::uuid
        AND invitation."tokenHash"=NULLIF(current_setting('app.phase202_invitation_token_hash',true),'')
        AND invitation."tenantId"=p_tenant_id AND invitation."organizationId"=p_organization_id
        AND invitation."status" IN ('PENDING','ACCEPTED')
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_accept_invitation_membership(
  p_invitation_id uuid,p_user_id text
) RETURNS TABLE("priorVersion" integer,"resultingVersion" integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
DECLARE invitation_record "MembershipInvitation"%ROWTYPE;
  team_record "Team"%ROWTYPE;
  actor_record "IdentityActor"%ROWTYPE;
  prior_version integer;
  resulting_version integer;
  domains text[];
BEGIN
  SELECT invitation.* INTO invitation_record
  FROM "MembershipInvitation" invitation
  JOIN "User" app_user ON app_user."id"=p_user_id AND lower(app_user."email")=lower(invitation."email")
  JOIN entral.app_users canonical_user
    ON canonical_user.auth_subject=app_user."id"
   AND canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active
  WHERE invitation."id"=p_invitation_id
    AND invitation."id"=NULLIF(current_setting('app.phase202_invitation_id',true),'')::uuid
    AND invitation."tokenHash"=NULLIF(current_setting('app.phase202_invitation_token_hash',true),'')
    AND invitation."status"='PENDING' AND invitation."expiresAt">now()
  FOR UPDATE OF invitation;
  IF invitation_record."id" IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation' USING ERRCODE='42501';
  END IF;

  SELECT * INTO actor_record FROM "IdentityActor"
  WHERE "id"=entral.phase202_current_actor_id()
    AND "humanUserId"=p_user_id AND "actorType"='HUMAN' AND "status"='ACTIVE';
  IF actor_record."id" IS NULL THEN
    RAISE EXCEPTION 'Invitation actor mismatch' USING ERRCODE='42501';
  END IF;

  SELECT * INTO team_record FROM "Team"
  WHERE "tenantId"=invitation_record."tenantId"
    AND "organizationId"=invitation_record."organizationId"
  FOR UPDATE;
  IF team_record."id" IS NULL THEN
    RAISE EXCEPTION 'Invitation tenant is unavailable' USING ERRCODE='23503';
  END IF;

  SELECT membership."version" INTO prior_version FROM "TeamMember" membership
  WHERE membership."userId"=p_user_id AND membership."teamId"=team_record."id"
  FOR UPDATE;
  prior_version:=coalesce(prior_version,0);
  domains:=CASE invitation_record."role"
    WHEN 'OWNER' THEN ARRAY['IDENTITY','TENANCY','OPERATIONS','FINANCE','INTEGRATIONS','SUPPORT']::text[]
    WHEN 'TENANT_ADMIN' THEN ARRAY['IDENTITY','TENANCY','OPERATIONS','INTEGRATIONS','SUPPORT']::text[]
    ELSE ARRAY['OPERATIONS']::text[]
  END;

  INSERT INTO "TenantActorAssignment"(
    "actorId","organizationId","tenantId","role","authorityDomains","status","version","createdAt","updatedAt"
  ) VALUES (
    actor_record."id",invitation_record."organizationId",invitation_record."tenantId",
    invitation_record."role",domains,'ACTIVE',1,now(),now()
  ) ON CONFLICT ("actorId","tenantId") DO UPDATE SET
    "role"=EXCLUDED."role","authorityDomains"=EXCLUDED."authorityDomains",
    "status"='ACTIVE',"version"="TenantActorAssignment"."version"+1,"updatedAt"=now();

  INSERT INTO "TeamMember"("userId","teamId","role","status","version","joinedAt","updatedAt")
  VALUES (p_user_id,team_record."id",invitation_record."role",'ACTIVE',1,now(),now())
  ON CONFLICT ("userId","teamId") DO UPDATE SET
    "role"=EXCLUDED."role","status"='ACTIVE',"suspendedAt"=NULL,"removedAt"=NULL,
    "version"="TeamMember"."version"+1,"updatedAt"=now()
  RETURNING "version" INTO resulting_version;

  IF resulting_version<>prior_version+1 THEN
    RAISE EXCEPTION 'Membership version transition invalid' USING ERRCODE='40001';
  END IF;
  RETURN QUERY SELECT prior_version,resulting_version;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_resolve_autonomy_target(
  p_target_actor_id uuid,p_tenant_id uuid,p_organization_id uuid
) RETURNS TABLE(
  "actorId" uuid,"actorType" text,"humanUserId" text,"serviceSubject" text,
  "agentId" text,"role" text,"status" text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT target."id",target."actorType",target."humanUserId",target."serviceSubject",
         target."agentId",target_assignment."role",target_assignment."status"
  FROM "IdentityActor" target
  JOIN "TenantActorAssignment" target_assignment
    ON target_assignment."actorId"=target."id"
   AND target_assignment."tenantId"=p_tenant_id
   AND target_assignment."organizationId"=p_organization_id
   AND target_assignment."status"='ACTIVE'
  JOIN "TenantBoundary" boundary
    ON boundary."id"=target_assignment."tenantId"
   AND boundary."organizationId"=target_assignment."organizationId"
   AND boundary."status"='ACTIVE'
  WHERE target."id"=p_target_actor_id AND target."status"='ACTIVE'
    AND target."actorType" IN ('SERVICE','AGENT')
    AND EXISTS (
      SELECT 1
      FROM entral.app_users canonical_user
      JOIN "IdentityActor" caller
        ON caller."humanUserId"=canonical_user.auth_subject
       AND caller."actorType"='HUMAN' AND caller."status"='ACTIVE'
      JOIN "TenantActorAssignment" caller_assignment
        ON caller_assignment."actorId"=caller."id"
       AND caller_assignment."tenantId"=p_tenant_id
       AND caller_assignment."organizationId"=p_organization_id
       AND caller_assignment."role"='OWNER' AND caller_assignment."status"='ACTIVE'
      WHERE canonical_user.id=entral.session_app_user_id()
        AND canonical_user.is_active
        AND caller."id"=entral.phase202_current_actor_id()
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_worker_access_allows(
  p_tenant_id uuid,p_organization_id uuid,p_permission text,p_business_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT pg_has_role(session_user,'entral_worker','USAGE')
    AND split_part(p_permission,':',2)=ANY(ARRAY[
      'Agent','AgentTask','AgentSchedule','AgentLog','AgentMessage','AutomationJob','AutomationLog',
      'AiUsageEvent','ClientMerchStore','GrowthApprovalPacket','ShopifyConnection','ShopifyOAuthContinuation',
      'NotificationDeliveryOutbox','SecretReference','SecretAccessAudit','AuditLog'
    ]::text[])
    AND (
      split_part(p_permission,':',1)='read'
      OR split_part(p_permission,':',2)=ANY(ARRAY[
        'Agent','AgentTask','AgentSchedule','AgentLog','AgentMessage','AutomationJob','AutomationLog',
        'AiUsageEvent','GrowthApprovalPacket','ShopifyOAuthContinuation','NotificationDeliveryOutbox','SecretAccessAudit','AuditLog'
      ]::text[])
    )
    AND EXISTS (
      SELECT 1
      FROM entral.app_users canonical_user
      JOIN "IdentityActor" actor
        ON actor."actorType"='SERVICE' AND actor."status"='ACTIVE'
       AND actor."serviceSubject"='canonical-app-user:'||canonical_user.id::text
      JOIN "TenantActorAssignment" assignment
        ON assignment."actorId"=actor."id" AND assignment."role"='SERVICE'
       AND assignment."status"='ACTIVE' AND 'OPERATIONS'=ANY(assignment."authorityDomains")
       AND assignment."tenantId"=p_tenant_id AND assignment."organizationId"=p_organization_id
      JOIN "TenantBoundary" tenant
        ON tenant."id"=assignment."tenantId" AND tenant."organizationId"=assignment."organizationId"
       AND tenant."status"='ACTIVE'
      JOIN entral.scope_grants scope_grant
        ON scope_grant.user_id=canonical_user.id
       AND scope_grant.scope_type='SYSTEM' AND scope_grant.scope_id IS NULL
       AND (scope_grant.expires_at IS NULL OR scope_grant.expires_at>now())
       AND scope_grant.permissions && CASE split_part(p_permission,':',1)
         WHEN 'read' THEN ARRAY['read','write','manage','run','publish_events','worker','worker.read','worker.write','*']::text[]
         ELSE ARRAY['write','manage','run','publish_events','worker','worker.write','*']::text[]
       END
      WHERE canonical_user.id=NULLIF(current_setting('app.phase202_worker_app_user_id',true),'')::uuid
        AND canonical_user.auth_subject IS NULL AND canonical_user.is_active
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_worker_runtime_ready()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT pg_has_role(session_user,'entral_worker','USAGE') AND EXISTS (
    SELECT 1
    FROM entral.app_users canonical_user
    JOIN "IdentityActor" actor
      ON actor."actorType"='SERVICE' AND actor."status"='ACTIVE'
     AND actor."serviceSubject"='canonical-app-user:'||canonical_user.id::text
    JOIN "TenantActorAssignment" assignment
      ON assignment."actorId"=actor."id" AND assignment."role"='SERVICE'
     AND assignment."status"='ACTIVE' AND 'OPERATIONS'=ANY(assignment."authorityDomains")
    JOIN "TenantBoundary" tenant
      ON tenant."id"=assignment."tenantId" AND tenant."organizationId"=assignment."organizationId"
     AND tenant."status"='ACTIVE'
    JOIN entral.scope_grants scope_grant
      ON scope_grant.user_id=canonical_user.id
     AND scope_grant.scope_type='SYSTEM' AND scope_grant.scope_id IS NULL
     AND (scope_grant.expires_at IS NULL OR scope_grant.expires_at>now())
     AND scope_grant.permissions && ARRAY['worker','worker.read','worker.write','run','manage','*']::text[]
    WHERE canonical_user.id=NULLIF(current_setting('app.phase202_worker_app_user_id',true),'')::uuid
      AND canonical_user.auth_subject IS NULL AND canonical_user.is_active
  )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_human_access_allows(
  p_role text,p_authority_domains text[],p_permission text
) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  WITH requested AS (
    SELECT split_part(p_permission,':',1) AS action,split_part(p_permission,':',2) AS table_name
  ), classified AS (
    SELECT action,table_name,
      table_name=ANY(ARRAY[
        'Team','TenantBoundary','TenantActorAssignment','TeamMember','MembershipInvitation',
        'MembershipMutationReceipt','NotificationEvidence','NotificationDeliveryOutbox','AuthSession'
      ]::text[]) AS identity_table,
      table_name=ANY(ARRAY[
        'BusinessBoundary','CustomerRecordOwnership','AutonomyEnvelopeRecord','ClientMerchStore',
        'RevenueOpportunity','RevenuePerformanceSnapshot','RevenueAssetControlRecord','RevenueMoneyArmyBatchRun',
        'FacelessContentBrief','FacelessContentPerformanceSnapshot','PortfolioCommandAction',
        'RevenueLaunchHandoffPacket','RevenueSignalConnectorApproval','RevenueSignalImportJob',
        'Agent','AgentTask','AgentSchedule','CommandOSSnapshot','CommandOSReport','Conversation',
        'AutomationJob','PodProduct','AgentLog','AgentMessage','Message','AutomationLog',
        'MemberWorkspaceSnapshot','Task','AuditLog'
      ]::text[]) AS operations_table,
      table_name=ANY(ARRAY[
        'FinancialSplitPolicy','FinancialLedgerEntry','FinancialPayoutIntent','FinancialBudgetReleasePacket',
        'FinancialScalingBudgetPacket','FinancialScalingSpendPacket','FinancialScalingExecutionEntry',
        'FinancialReconciliationReport'
      ]::text[]) AS finance_table,
      table_name=ANY(ARRAY['SecretReference','SecretAccessAudit','SecretMutationReceipt','ShopifyConnection','ShopifyOAuthContinuation','GrowthApprovalPacket']::text[]) AS integrations_table,
      table_name=ANY(ARRAY['SupportAccessGrant','SupportAccessAudit']::text[]) AS support_table,
      table_name=ANY(ARRAY['TenantRateLimitWindow','TenantRateLimitReceipt']::text[]) AS rate_limit_table,
      table_name='AiUsageEvent' AS ai_usage_table
    FROM requested
  )
  SELECT action IN ('read','write') AND CASE
    WHEN p_role='OWNER' THEN
      identity_table OR operations_table OR finance_table OR integrations_table
      OR support_table OR rate_limit_table OR ai_usage_table
    WHEN p_role='TENANT_ADMIN' THEN
      (
        identity_table
        AND (p_authority_domains && ARRAY['IDENTITY','TENANCY']::text[])
      )
      OR (
        operations_table
        AND 'OPERATIONS'=ANY(p_authority_domains)
      )
      OR (
        finance_table
        AND 'FINANCE'=ANY(p_authority_domains)
      )
      OR (
        integrations_table
        AND 'INTEGRATIONS'=ANY(p_authority_domains)
      )
      OR (
        support_table
        AND action='read'
        AND 'SUPPORT'=ANY(p_authority_domains)
      )
      OR rate_limit_table
      OR (
        ai_usage_table
        AND action='read'
        AND 'OPERATIONS'=ANY(p_authority_domains)
      )
    WHEN p_role='MEMBER' THEN
      action='read'
      AND 'OPERATIONS'=ANY(p_authority_domains)
      AND (
        operations_table
        OR table_name=ANY(ARRAY['Team','TenantBoundary','TeamMember']::text[])
      )
    ELSE false
  END
  FROM classified
$$;

CREATE OR REPLACE FUNCTION entral.phase202_tenant_access_allows(
  p_tenant_id uuid, p_organization_id uuid, p_permission text DEFAULT 'read', p_business_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT entral.phase202_worker_access_allows(p_tenant_id,p_organization_id,p_permission,p_business_id)
    OR (
      p_tenant_id=entral.phase202_current_tenant_id()
      AND EXISTS (
      SELECT 1
      FROM entral.app_users canonical_user
      JOIN "IdentityActor" actor ON actor."status"='ACTIVE' AND (
        (canonical_user.auth_subject IS NOT NULL AND actor."actorType"='HUMAN' AND actor."humanUserId"=canonical_user.auth_subject)
        OR (canonical_user.auth_subject IS NULL AND actor."actorType"='SERVICE' AND actor."serviceSubject"='canonical-app-user:'||canonical_user.id::text)
      )
      JOIN "TenantActorAssignment" assignment
        ON assignment."actorId"=actor."id" AND assignment."tenantId"=p_tenant_id
       AND assignment."organizationId"=p_organization_id AND assignment."status"='ACTIVE'
      JOIN "TenantBoundary" tenant_boundary
        ON tenant_boundary."id"=assignment."tenantId"
       AND tenant_boundary."organizationId"=assignment."organizationId"
       AND tenant_boundary."status"='ACTIVE'
      WHERE canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active
        AND actor."id"=entral.phase202_current_actor_id()
        AND (
          (
            assignment."role" NOT IN ('SUPPORT','SERVICE')
            AND actor."actorType"='HUMAN'
            AND entral.phase202_human_access_allows(
              assignment."role",assignment."authorityDomains",p_permission
            )
          )
          OR (
            assignment."role"='SERVICE'
            AND actor."actorType"='SERVICE'
            AND 'OPERATIONS'=ANY(assignment."authorityDomains")
            AND EXISTS (
              SELECT 1 FROM entral.scope_grants service_grant
              WHERE service_grant.user_id=canonical_user.id
                AND (service_grant.expires_at IS NULL OR service_grant.expires_at>now())
                AND service_grant.permissions && CASE split_part(p_permission,':',1)
                  WHEN 'read' THEN ARRAY['read','write','manage','run','publish_events','worker','worker.read','worker.write','*']::text[]
                  ELSE ARRAY['write','manage','run','publish_events','worker','worker.write','*']::text[]
                END
                AND (
                  (service_grant.scope_type='SYSTEM' AND service_grant.scope_id IS NULL)
                  OR (
                    service_grant.scope_type='BUSINESS'
                    AND p_business_id IS NOT NULL
                    AND EXISTS (
                      SELECT 1 FROM "BusinessBoundary" authorized_business
                      WHERE authorized_business."canonicalBusinessId"=service_grant.scope_id
                        AND authorized_business."id"=p_business_id
                        AND authorized_business."tenantId"=p_tenant_id
                        AND authorized_business."organizationId"=p_organization_id
                        AND authorized_business."status"='ACTIVE'
                    )
                  )
                )
            )
            AND split_part(p_permission,':',2)=ANY(ARRAY[
              'Agent','AgentTask','AgentSchedule','AgentLog','AgentMessage',
              'AutomationJob','AutomationLog','AiUsageEvent','ClientMerchStore',
              'ShopifyConnection','ShopifyOAuthContinuation','GrowthApprovalPacket','AuditLog'
            ]::text[])
            AND (
              split_part(p_permission,':',1)='read'
              OR split_part(p_permission,':',2)=ANY(ARRAY[
                'Agent','AgentTask','AgentSchedule','AgentLog','AgentMessage',
                'AutomationJob','AutomationLog','AiUsageEvent','GrowthApprovalPacket','ShopifyOAuthContinuation','AuditLog'
              ]::text[])
            )
          )
          OR (
            assignment."role"='SUPPORT'
            AND actor."actorType"='HUMAN'
            AND 'SUPPORT'=ANY(assignment."authorityDomains")
            AND entral.phase202_current_support_grant_id() IS NOT NULL
            AND split_part(p_permission,':',2)=ANY(ARRAY[
              'Agent','AgentLog','AgentMessage','AgentSchedule','AgentTask','AiUsageEvent',
              'AutomationJob','AutomationLog','BusinessBoundary','ClientMerchStore','CommandOSReport',
              'CommandOSSnapshot','Conversation','CustomerRecordOwnership','FacelessContentBrief',
              'FacelessContentPerformanceSnapshot','FinancialBudgetReleasePacket','FinancialLedgerEntry',
              'FinancialPayoutIntent','FinancialReconciliationReport','FinancialScalingBudgetPacket',
              'FinancialScalingExecutionEntry','FinancialScalingSpendPacket','FinancialSplitPolicy',
              'GrowthApprovalPacket','MemberWorkspaceSnapshot','Message','PodProduct','PortfolioCommandAction',
              'RevenueAssetControlRecord','RevenueLaunchHandoffPacket','RevenueMoneyArmyBatchRun',
              'RevenueOpportunity','RevenuePerformanceSnapshot','RevenueSignalConnectorApproval',
              'RevenueSignalImportJob','ShopifyConnection','ShopifyOAuthContinuation','Task','Team'
            ]::text[])
            AND (
              split_part(p_permission,':',1)='read'
              OR split_part(p_permission,':',2)=ANY(ARRAY[
                'Agent','AgentLog','AgentMessage','AgentSchedule','AgentTask','AutomationJob','AutomationLog',
                'CommandOSReport','CommandOSSnapshot','Conversation','GrowthApprovalPacket','MemberWorkspaceSnapshot',
                'Message','PortfolioCommandAction','RevenueSignalImportJob','ShopifyOAuthContinuation','Task'
              ]::text[])
            )
            AND EXISTS (
              SELECT 1 FROM "SupportAccessGrant" support_grant
              WHERE support_grant."id"=entral.phase202_current_support_grant_id()
                AND support_grant."supportActorId"=actor."id"
                AND support_grant."tenantId"=p_tenant_id
                AND support_grant."organizationId"=p_organization_id
                AND support_grant."ownerVisible"
                AND support_grant."revokedAt" IS NULL
                AND support_grant."expiresAt">now()
                AND cardinality(support_grant."scopes")>0
                AND (
                  (
                    split_part(p_permission,':',1)='read'
                    AND support_grant."accessMode" IN ('READ_ONLY','WRITE_ELEVATED')
                    AND ('table:'||split_part(p_permission,':',2)||':read')=ANY(support_grant."scopes")
                  )
                  OR (
                    split_part(p_permission,':',1)='write'
                    AND support_grant."accessMode"='WRITE_ELEVATED'
                    AND support_grant."writeElevatedAt" IS NOT NULL
                    AND support_grant."writeElevatedByActorId" IS NOT NULL
                    AND support_grant."writeElevationPurpose" IS NOT NULL
                    AND support_grant."writeElevationExpiresAt">now()
                    AND support_grant."writeElevationExpiresAt"<=support_grant."expiresAt"
                    AND ('table:'||split_part(p_permission,':',2)||':write')=ANY(support_grant."scopes")
                  )
                )
            )
          )
        )
      )
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_resolve_tenant_human_actor(p_user_id text,p_tenant_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT actor."id" FROM "IdentityActor" actor
  JOIN "TenantActorAssignment" assignment
    ON assignment."actorId"=actor."id" AND assignment."tenantId"=p_tenant_id
  WHERE actor."actorType"='HUMAN' AND actor."humanUserId"=p_user_id
    AND entral.phase202_tenant_access_allows(assignment."tenantId",assignment."organizationId",'write:TenantActorAssignment')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION entral.phase202_revoke_tenant_user_sessions(p_user_id text,p_tenant_id uuid,p_reason text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
DECLARE affected integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "TenantBoundary" boundary
    WHERE boundary."id"=p_tenant_id
      AND entral.phase202_tenant_access_allows(boundary."id",boundary."organizationId",'write:AuthSession')
  ) THEN
    RAISE EXCEPTION 'Tenant session revocation denied' USING ERRCODE='42501';
  END IF;
  UPDATE "AuthSession" SET "revokedAt"=now(),"revokeReason"=p_reason,"stepUpAt"=NULL
  WHERE "userId"=p_user_id AND "tenantId"=p_tenant_id AND "revokedAt" IS NULL;
  GET DIAGNOSTICS affected=ROW_COUNT;
  UPDATE "AuthRefreshCredential" credential SET "revokedAt"=now()
  FROM "AuthSession" session
  WHERE session."id"=credential."sessionId" AND session."userId"=p_user_id
    AND session."tenantId"=p_tenant_id AND credential."revokedAt" IS NULL;
  RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_revoke_support_grant_sessions(
  p_grant_id uuid,p_owner_actor_id uuid,p_tenant_id uuid,p_organization_id uuid,p_revoked_at timestamptz
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_revoke_support_sessions$
DECLARE affected integer;
BEGIN
  IF p_revoked_at IS NULL THEN RAISE EXCEPTION 'Exact support revocation time is required' USING ERRCODE='22023'; END IF;
  IF p_owner_actor_id IS DISTINCT FROM entral.phase202_current_actor_id() THEN
    RAISE EXCEPTION 'Exact owner actor is required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "TenantActorAssignment" owner_assignment
    WHERE owner_assignment."actorId"=p_owner_actor_id
      AND owner_assignment."tenantId"=p_tenant_id
      AND owner_assignment."organizationId"=p_organization_id
      AND owner_assignment."role"='OWNER' AND owner_assignment."status"='ACTIVE'
      AND 'SUPPORT'=ANY(owner_assignment."authorityDomains")
  ) THEN
    RAISE EXCEPTION 'Active tenant owner authority is required' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "SupportAccessGrant" support_grant
    WHERE support_grant."id"=p_grant_id AND support_grant."tenantId"=p_tenant_id
      AND support_grant."organizationId"=p_organization_id AND support_grant."revokedAt"=p_revoked_at
  ) THEN
    RAISE EXCEPTION 'Exact revoked support grant is required' USING ERRCODE='42501';
  END IF;
  IF NOT entral.phase202_tenant_access_allows(
    p_tenant_id,p_organization_id,'write:SupportAccessGrant',NULL::uuid
  ) THEN
    RAISE EXCEPTION 'Support session revocation denied' USING ERRCODE='42501';
  END IF;
  UPDATE "AuthSession"
  SET "revokedAt"=p_revoked_at,"revokeReason"='SUPPORT_GRANT_REVOKED',"stepUpAt"=NULL,
      "version"="version"+1,"updatedAt"=p_revoked_at
  WHERE "supportGrantId"=p_grant_id AND "tenantId"=p_tenant_id
    AND "organizationId"=p_organization_id AND "sessionType"='SUPPORT'
    AND "revokedAt" IS NULL;
  GET DIAGNOSTICS affected=ROW_COUNT;
  UPDATE "AuthRefreshCredential" credential SET "revokedAt"=p_revoked_at
  FROM "AuthSession" session
  WHERE session."id"=credential."sessionId"
    AND session."supportGrantId"=p_grant_id
    AND session."tenantId"=p_tenant_id
    AND session."organizationId"=p_organization_id
    AND session."sessionType"='SUPPORT'
    AND credential."revokedAt" IS NULL;
  RETURN affected;
END $phase202_revoke_support_sessions$;

CREATE OR REPLACE FUNCTION entral.phase202_invalidate_support_grant_sessions()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_support_revoke_trigger$
BEGIN
  PERFORM entral.phase202_revoke_support_grant_sessions(
    NEW."id",entral.phase202_current_actor_id(),NEW."tenantId",NEW."organizationId",NEW."revokedAt"
  );
  RETURN NEW;
END $phase202_support_revoke_trigger$;
CREATE TRIGGER "SupportAccessGrant_phase202_revoke_sessions"
AFTER UPDATE OF "revokedAt" ON "SupportAccessGrant"
FOR EACH ROW WHEN (OLD."revokedAt" IS NULL AND NEW."revokedAt" IS NOT NULL)
EXECUTE FUNCTION entral.phase202_invalidate_support_grant_sessions();

CREATE OR REPLACE FUNCTION entral.phase202_revoke_password_reset_sessions(
  p_token_id text,p_user_id text,p_token_hash text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
DECLARE affected integer; claimed_at timestamptz;
BEGIN
  SELECT token."consumedAt" INTO claimed_at FROM "PasswordResetToken" token
  WHERE token."id"=p_token_id AND token."userId"=p_user_id AND token."tokenHash"=p_token_hash
    AND token."consumedAt" IS NOT NULL AND token."expiresAt">token."consumedAt"
  FOR SHARE;
  IF claimed_at IS NULL OR claimed_at<now()-interval '5 minutes' OR claimed_at>now()+interval '5 seconds' THEN
    RAISE EXCEPTION 'Password reset session revocation requires the exact freshly claimed token' USING ERRCODE='42501';
  END IF;
  UPDATE "AuthSession" SET "revokedAt"=now(),"revokeReason"='PASSWORD_RESET',"stepUpAt"=NULL
  WHERE "userId"=p_user_id AND "revokedAt" IS NULL;
  GET DIAGNOSTICS affected=ROW_COUNT;
  UPDATE "AuthRefreshCredential" credential SET "revokedAt"=now()
  FROM "AuthSession" session
  WHERE session."id"=credential."sessionId" AND session."userId"=p_user_id
    AND credential."revokedAt" IS NULL;
  RETURN affected;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_assign_support_actor(
  p_actor_id uuid,p_tenant_id uuid,p_organization_id uuid
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
DECLARE existing_role text;
BEGIN
  IF NOT entral.phase202_tenant_access_allows(
    p_tenant_id,p_organization_id,'write:TenantActorAssignment',NULL::uuid
  ) THEN
    RAISE EXCEPTION 'Support assignment denied' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM "IdentityActor"
    WHERE "id"=p_actor_id AND "actorType"='HUMAN' AND "status"='ACTIVE'
  ) THEN RETURN false; END IF;
  SELECT "role" INTO existing_role FROM "TenantActorAssignment"
  WHERE "actorId"=p_actor_id AND "tenantId"=p_tenant_id FOR UPDATE;
  IF existing_role IS NOT NULL AND existing_role<>'SUPPORT' THEN
    RAISE EXCEPTION 'Existing tenant actors cannot be converted to support authority' USING ERRCODE='23514';
  END IF;
  INSERT INTO "TenantActorAssignment"(
    "actorId","tenantId","organizationId","role","authorityDomains","status","version","createdAt","updatedAt"
  ) VALUES (
    p_actor_id,p_tenant_id,p_organization_id,'SUPPORT',ARRAY['SUPPORT']::text[],'ACTIVE',1,now(),now()
  ) ON CONFLICT ("actorId","tenantId") DO UPDATE SET
    "organizationId"=EXCLUDED."organizationId","authorityDomains"=ARRAY['SUPPORT']::text[],
    "status"='ACTIVE',"version"="TenantActorAssignment"."version"+1,"updatedAt"=now();
  RETURN true;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_personal_actor_access_allows(p_actor_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT p_actor_id=entral.phase202_current_actor_id() AND EXISTS (
    SELECT 1 FROM entral.app_users canonical_user
    JOIN "IdentityActor" actor ON actor."humanUserId"=canonical_user.auth_subject AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
    WHERE canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active AND actor."id"=p_actor_id
  )
$$;

-- Preserve Phase 150 authority evaluation as an internal input, then add the
-- selected Phase 202 tenant boundary to the canonical RLS functions whose OIDs
-- are already referenced by the Phase 150 policies.
CREATE OR REPLACE FUNCTION entral.phase202_legacy_can_access_business(
  p_business_id uuid,p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT entral.session_is_human_authority()
    OR entral.scope_grant_allows('SYSTEM',NULL,p_permission)
    OR entral.scope_grant_allows('BUSINESS',p_business_id,p_permission)
    OR EXISTS (
      SELECT 1 FROM entral.businesses business
      WHERE business.id=p_business_id
        AND (
          entral.scope_grant_allows('GENERAL',business.general_id,p_permission)
          OR entral.scope_grant_allows('MARSHAL',business.marshal_id,p_permission)
          OR entral.scope_grant_allows('ENTITY',business.commander_id,p_permission)
        )
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_canonical_business_in_session_tenant(p_business_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT NULLIF(current_setting('app.tenant_id',true),'') IS NULL
    OR EXISTS (
      SELECT 1 FROM "BusinessBoundary" boundary
      JOIN "TenantBoundary" tenant
        ON tenant."id"=boundary."tenantId"
       AND tenant."organizationId"=boundary."organizationId"
       AND tenant."status"='ACTIVE'
      WHERE boundary."canonicalBusinessId"=p_business_id
        AND boundary."tenantId"=NULLIF(current_setting('app.tenant_id',true),'')::uuid
        AND boundary."organizationId"=NULLIF(current_setting('app.organization_id',true),'')::uuid
        AND boundary."status"='ACTIVE'
    )
$$;

CREATE OR REPLACE FUNCTION entral.can_access_business(
  p_business_id uuid,p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT entral.phase202_legacy_can_access_business(p_business_id,p_permission)
    AND entral.phase202_canonical_business_in_session_tenant(p_business_id)
$$;

CREATE OR REPLACE FUNCTION entral.phase202_legacy_can_access_entity(
  p_entity_id uuid,p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT entral.session_is_human_authority()
    OR entral.scope_grant_allows('SYSTEM',NULL,p_permission)
    OR entral.scope_grant_allows('ENTITY',p_entity_id,p_permission)
    OR EXISTS (
      SELECT 1 FROM entral.entities entity
      WHERE entity.id=p_entity_id
        AND (
          (entity.business_id IS NOT NULL AND entral.phase202_legacy_can_access_business(entity.business_id,p_permission))
          OR (entity.role='MARSHAL' AND entral.scope_grant_allows('MARSHAL',entity.id,p_permission))
          OR (entity.role='GENERAL' AND entral.scope_grant_allows('GENERAL',entity.id,p_permission))
          OR (entity.role='MARSHAL' AND EXISTS (
            SELECT 1 FROM entral.businesses business
            WHERE business.marshal_id=entity.id
              AND entral.phase202_legacy_can_access_business(business.id,p_permission)
          ))
          OR (entity.role='GENERAL' AND EXISTS (
            SELECT 1 FROM entral.businesses business
            WHERE business.general_id=entity.id
              AND entral.phase202_legacy_can_access_business(business.id,p_permission)
          ))
          OR (entity.role='ENTRAL' AND EXISTS (
            SELECT 1 FROM entral.businesses business
            WHERE entral.phase202_legacy_can_access_business(business.id,p_permission)
          ))
        )
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_canonical_entity_in_session_tenant(p_entity_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT NULLIF(current_setting('app.tenant_id',true),'') IS NULL
    OR EXISTS (
      WITH RECURSIVE mapped_businesses AS (
        SELECT business.id,business.commander_id,business.marshal_id,business.general_id
        FROM entral.businesses business
        JOIN "BusinessBoundary" boundary ON boundary."canonicalBusinessId"=business.id
        JOIN "TenantBoundary" tenant
          ON tenant."id"=boundary."tenantId"
         AND tenant."organizationId"=boundary."organizationId"
         AND tenant."status"='ACTIVE'
        WHERE boundary."tenantId"=NULLIF(current_setting('app.tenant_id',true),'')::uuid
          AND boundary."organizationId"=NULLIF(current_setting('app.organization_id',true),'')::uuid
          AND boundary."status"='ACTIVE'
      ), required_lineage(id) AS (
        SELECT commander_id FROM mapped_businesses
        UNION SELECT marshal_id FROM mapped_businesses
        UNION SELECT general_id FROM mapped_businesses
        UNION
        SELECT parent.parent_id
        FROM entral.entities parent
        JOIN required_lineage lineage ON parent.id=lineage.id
        WHERE parent.parent_id IS NOT NULL
      )
      SELECT 1 FROM entral.entities entity
      WHERE entity.id=p_entity_id
        AND (
          entity.business_id IN (SELECT id FROM mapped_businesses)
          OR entity.id IN (SELECT id FROM required_lineage)
        )
    )
$$;

CREATE OR REPLACE FUNCTION entral.can_access_entity(
  p_entity_id uuid,p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT entral.phase202_legacy_can_access_entity(p_entity_id,p_permission)
    AND entral.phase202_canonical_entity_in_session_tenant(p_entity_id)
$$;

CREATE OR REPLACE FUNCTION entral.session_can_access_organization(p_organization_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM entral.app_users canonical_user
    JOIN "IdentityActor" actor
      ON actor."humanUserId"=canonical_user.auth_subject
     AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
     AND actor."id"=entral.phase202_current_actor_id()
    JOIN "TeamMember" membership
      ON membership."userId"=canonical_user.auth_subject
     AND membership."status"='ACTIVE'
    JOIN "Team" organization
      ON organization."id"=membership."teamId"
     AND organization."memberAccessEnabled"
    JOIN "TenantActorAssignment" assignment
      ON assignment."actorId"=actor."id"
     AND assignment."tenantId"=organization."tenantId"
     AND assignment."organizationId"=organization."organizationId"
     AND assignment."status"='ACTIVE'
    JOIN "TenantBoundary" tenant
      ON tenant."id"=assignment."tenantId"
     AND tenant."organizationId"=assignment."organizationId"
     AND tenant."status"='ACTIVE'
    WHERE canonical_user.id=entral.session_app_user_id()
      AND canonical_user.is_active
      AND organization."id"=p_organization_id
      AND organization."tenantId"=NULLIF(current_setting('app.tenant_id',true),'')::uuid
      AND organization."organizationId"=NULLIF(current_setting('app.organization_id',true),'')::uuid
  )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_personal_user_mutation_allows(p_user_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM entral.app_users canonical_user
    JOIN "IdentityActor" actor
      ON actor."humanUserId"=canonical_user.auth_subject
     AND actor."actorType"='HUMAN'
     AND actor."status"='ACTIVE'
     AND actor."id"=entral.phase202_current_actor_id()
    WHERE canonical_user.id=entral.session_app_user_id()
      AND canonical_user.auth_subject=p_user_id
      AND canonical_user.is_active
  )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_user_read_allows(p_user_id text,p_email text)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT entral.phase202_personal_user_mutation_allows(p_user_id)
    OR p_user_id=NULLIF(current_setting('app.phase202_auth_subject',true),'')
    OR lower(p_email)=lower(NULLIF(current_setting('app.phase202_auth_email',true),''))
    OR (
      current_setting('app.phase202_recovery_token_kind',true)='EMAIL_VERIFICATION'
      AND EXISTS (
        SELECT 1 FROM "EmailVerificationToken" recovery
        WHERE recovery."userId"=p_user_id
          AND recovery."tokenHash"=NULLIF(current_setting('app.phase202_recovery_token_hash',true),'')
          AND recovery."consumedAt" IS NULL
          AND recovery."expiresAt">CURRENT_TIMESTAMP
      )
    )
    OR (
      current_setting('app.phase202_recovery_token_kind',true)='PASSWORD_RESET'
      AND EXISTS (
        SELECT 1 FROM "PasswordResetToken" recovery
        WHERE recovery."userId"=p_user_id
          AND recovery."tokenHash"=NULLIF(current_setting('app.phase202_recovery_token_hash',true),'')
          AND recovery."consumedAt" IS NULL
          AND recovery."expiresAt">CURRENT_TIMESTAMP
      )
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_auth_token_access_allows(
  p_token_kind text,p_user_id text,p_token_hash text
)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT entral.phase202_personal_user_mutation_allows(p_user_id)
    OR p_user_id=NULLIF(current_setting('app.phase202_auth_user_id',true),'')
    OR (
      p_token_kind=current_setting('app.phase202_recovery_token_kind',true)
      AND p_token_hash=NULLIF(current_setting('app.phase202_recovery_token_hash',true),'')
    )
$$;

CREATE OR REPLACE FUNCTION entral.phase202_auth_token_active_allows(
  p_token_kind text,p_user_id text,p_token_hash text,p_consumed_at timestamptz,p_expires_at timestamptz
)
RETURNS boolean
LANGUAGE sql STABLE
SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT entral.phase202_auth_token_access_allows(p_token_kind,p_user_id,p_token_hash)
    AND (
      entral.phase202_personal_user_mutation_allows(p_user_id)
      OR p_user_id=NULLIF(current_setting('app.phase202_auth_user_id',true),'')
      OR (p_consumed_at IS NULL AND p_expires_at>CURRENT_TIMESTAMP)
    )
$$;

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_user" ON "User" FOR SELECT
  USING (entral.phase202_user_read_allows("id","email"));
CREATE POLICY "phase202_insert_user" ON "User" FOR INSERT
  WITH CHECK (lower("email")=lower(NULLIF(current_setting('app.phase202_auth_email',true),'')));
CREATE POLICY "phase202_update_personal_user" ON "User" FOR UPDATE
  USING (entral.phase202_personal_user_mutation_allows("id"))
  WITH CHECK (entral.phase202_personal_user_mutation_allows("id"));

ALTER TABLE "EmailVerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerificationToken" FORCE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_emailverificationtoken" ON "EmailVerificationToken" FOR SELECT
  USING (entral.phase202_auth_token_active_allows(
    'EMAIL_VERIFICATION',"userId","tokenHash","consumedAt","expiresAt"
  ));
CREATE POLICY "phase202_insert_emailverificationtoken" ON "EmailVerificationToken" FOR INSERT
  WITH CHECK (entral.phase202_auth_token_access_allows('EMAIL_VERIFICATION',"userId","tokenHash"));
CREATE POLICY "phase202_update_emailverificationtoken" ON "EmailVerificationToken" FOR UPDATE
  USING (entral.phase202_auth_token_active_allows(
    'EMAIL_VERIFICATION',"userId","tokenHash","consumedAt","expiresAt"
  ))
  WITH CHECK (entral.phase202_auth_token_access_allows('EMAIL_VERIFICATION',"userId","tokenHash"));

ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" FORCE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_passwordresettoken" ON "PasswordResetToken" FOR SELECT
  USING (entral.phase202_auth_token_active_allows(
    'PASSWORD_RESET',"userId","tokenHash","consumedAt","expiresAt"
  ));
CREATE POLICY "phase202_insert_passwordresettoken" ON "PasswordResetToken" FOR INSERT
  WITH CHECK (entral.phase202_auth_token_access_allows('PASSWORD_RESET',"userId","tokenHash"));
CREATE POLICY "phase202_update_passwordresettoken" ON "PasswordResetToken" FOR UPDATE
  USING (entral.phase202_auth_token_active_allows(
    'PASSWORD_RESET',"userId","tokenHash","consumedAt","expiresAt"
  ))
  WITH CHECK (entral.phase202_auth_token_access_allows('PASSWORD_RESET',"userId","tokenHash"));

CREATE OR REPLACE FUNCTION entral.phase202_resolve_membership_profile(p_user_id text,p_tenant_id uuid)
RETURNS TABLE("userId" text,"email" text,"name" text)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_membership_profile$
DECLARE prior_subject text := current_setting('app.phase202_auth_subject',true);
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "TeamMember" membership
    WHERE membership."userId"=p_user_id
      AND membership."tenantId"=p_tenant_id
      AND membership."status"<>'REMOVED'
      AND entral.phase202_tenant_access_allows(
        membership."tenantId",membership."organizationId",'read:TeamMember'
      )
  ) THEN
    RETURN;
  END IF;
  PERFORM set_config('app.phase202_auth_subject',p_user_id,true);
  RETURN QUERY
    SELECT account."id",account."email",account."name"
    FROM "User" account
    WHERE account."id"=p_user_id AND account."deletedAt" IS NULL;
  PERFORM set_config('app.phase202_auth_subject',COALESCE(prior_subject,''),true);
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.phase202_auth_subject',COALESCE(prior_subject,''),true);
  RAISE;
END $phase202_membership_profile$;

CREATE OR REPLACE FUNCTION entral.phase202_membership_target_exists(p_user_id text,p_team_id text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_membership_target_exists$
DECLARE prior_subject text := current_setting('app.phase202_auth_subject',true); target_exists boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM "Team" team
    JOIN "TenantActorAssignment" assignment
      ON assignment."tenantId"=team."tenantId"
     AND assignment."organizationId"=team."organizationId"
     AND assignment."actorId"=entral.phase202_current_actor_id()
     AND assignment."status"='ACTIVE'
     AND assignment."role" IN ('OWNER','TENANT_ADMIN')
    WHERE team."id"=p_team_id
  ) THEN
    RETURN false;
  END IF;
  PERFORM set_config('app.phase202_auth_subject',p_user_id,true);
  SELECT EXISTS (
    SELECT 1 FROM "User" account WHERE account."id"=p_user_id AND account."deletedAt" IS NULL
  ) INTO target_exists;
  PERFORM set_config('app.phase202_auth_subject',COALESCE(prior_subject,''),true);
  RETURN target_exists;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.phase202_auth_subject',COALESCE(prior_subject,''),true);
  RAISE;
END $phase202_membership_target_exists$;

DO $phase202_rls$
DECLARE target_table text; business_argument text;
  tenant_tables text[] := ARRAY[
    'Team','BusinessBoundary','AutonomyEnvelopeRecord',
    'MembershipInvitation','SecretReference','NotificationDeliveryOutbox',
    'SupportAccessGrant','TenantRateLimitWindow',
    'ClientMerchStore','ShopifyConnection','ShopifyOAuthContinuation','RevenueOpportunity','GrowthApprovalPacket',
    'RevenuePerformanceSnapshot','RevenueAssetControlRecord','RevenueMoneyArmyBatchRun','FinancialSplitPolicy',
    'FinancialLedgerEntry','FinancialPayoutIntent','FinancialBudgetReleasePacket','FinancialScalingBudgetPacket',
    'FinancialScalingSpendPacket','FinancialScalingExecutionEntry','FinancialReconciliationReport','FacelessContentBrief',
    'FacelessContentPerformanceSnapshot','PortfolioCommandAction','RevenueLaunchHandoffPacket','RevenueSignalConnectorApproval',
    'RevenueSignalImportJob','Agent','AgentTask','AgentSchedule','CommandOSSnapshot','CommandOSReport','Conversation',
    'AiUsageEvent','AutomationJob','PodProduct','AgentLog','AgentMessage','Message','AutomationLog',
    'MemberWorkspaceSnapshot','Task'
  ];
BEGIN
  FOREACH target_table IN ARRAY tenant_tables LOOP
    SELECT CASE WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=target_table AND column_name='businessId'
    ) THEN '"businessId"' ELSE 'NULL::uuid' END INTO business_argument;
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target_table);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT USING (entral.phase202_tenant_access_allows("tenantId","organizationId",%L,%s))', 'phase202_select_'||lower(target_table), target_table, 'read:'||target_table, business_argument);
    EXECUTE format('CREATE POLICY %I ON %I FOR INSERT WITH CHECK (entral.phase202_tenant_access_allows("tenantId","organizationId",%L,%s))', 'phase202_insert_'||lower(target_table), target_table, 'write:'||target_table, business_argument);
    EXECUTE format('CREATE POLICY %I ON %I FOR UPDATE USING (entral.phase202_tenant_access_allows("tenantId","organizationId",%L,%s)) WITH CHECK (entral.phase202_tenant_access_allows("tenantId","organizationId",%L,%s))', 'phase202_update_'||lower(target_table), target_table, 'write:'||target_table, business_argument, 'write:'||target_table, business_argument);
    EXECUTE format('CREATE POLICY %I ON %I FOR DELETE USING (entral.phase202_tenant_access_allows("tenantId","organizationId",%L,%s))', 'phase202_delete_'||lower(target_table), target_table, 'write:'||target_table, business_argument);
  END LOOP;
END $phase202_rls$;

-- Membership administrators need to enqueue encrypted membership mail without
-- receiving generic integration-secret authority. This permissive policy is
-- deliberately limited to the delivery purpose, exact actor, and the same
-- identity-domain permission that gates NotificationDeliveryOutbox writes.
CREATE POLICY "phase202_insert_membership_delivery_secret" ON "SecretReference" FOR INSERT
  WITH CHECK (
    "businessId" IS NULL
    AND "provider"='resend'
    AND "purpose"='membership-email-delivery'
    AND "createdByActorId"=entral.phase202_current_actor_id()
    AND entral.phase202_tenant_access_allows(
      "tenantId","organizationId",'write:NotificationDeliveryOutbox',NULL::uuid
    )
  );

CREATE POLICY "phase202_support_own_grant_select" ON "SupportAccessGrant" FOR SELECT
  USING (
    "id"=entral.phase202_current_support_grant_id()
    AND "supportActorId"=entral.phase202_current_actor_id()
    AND "tenantId"=entral.phase202_current_tenant_id()
    AND "organizationId"=NULLIF(current_setting('app.organization_id',true),'')::uuid
    AND "ownerVisible"
  );

-- Source-ownership and mutation evidence are never directly mutable by an
-- application actor. Trigger-owned sidecar synchronization runs under its
-- hardened definer; evidence rows are selectable and insertable only.
ALTER TABLE "CustomerRecordOwnership" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_customerrecordownership" ON "CustomerRecordOwnership" FOR SELECT
  USING (entral.phase202_tenant_access_allows("tenantId","organizationId",'read:CustomerRecordOwnership',"businessId"));

DO $phase202_evidence_rls$
DECLARE target_table text;
  evidence_tables text[] := ARRAY[
    'MembershipMutationReceipt','SecretAccessAudit','SecretMutationReceipt','SupportAccessAudit','TenantRateLimitReceipt'
  ];
BEGIN
  FOREACH target_table IN ARRAY evidence_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',target_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (entral.phase202_tenant_access_allows("tenantId","organizationId",%L,NULL::uuid))',
      'phase202_select_'||lower(target_table),target_table,'read:'||target_table
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (entral.phase202_tenant_access_allows("tenantId","organizationId",%L,NULL::uuid))',
      'phase202_insert_'||lower(target_table),target_table,'write:'||target_table
    );
  END LOOP;
END $phase202_evidence_rls$;

CREATE POLICY "phase202_accept_membershipmutationreceipt" ON "MembershipMutationReceipt" FOR INSERT
  WITH CHECK (
    "actorId"=entral.phase202_current_actor_id()
    AND "subjectUserId"=(SELECT "humanUserId" FROM "IdentityActor" WHERE "id"=entral.phase202_current_actor_id())
    AND entral.phase202_invitation_acceptance_allows(
      "tenantId","organizationId","actorId","subjectUserId"
    )
  );
CREATE POLICY "phase202_accept_membershipmutationreceipt_select" ON "MembershipMutationReceipt" FOR SELECT
  USING (
    entral.phase202_invitation_receipt_read_allows(
      "tenantId","organizationId","actorId","subjectUserId","resultPayload"
    )
  );

CREATE OR REPLACE FUNCTION entral.phase202_block_evidence_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$ BEGIN RAISE EXCEPTION '% is append-only',TG_TABLE_NAME USING ERRCODE='55000'; END $$;
CREATE TRIGGER "AuditLog_append_only" BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "MembershipMutationReceipt_append_only" BEFORE UPDATE OR DELETE ON "MembershipMutationReceipt"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "SecretAccessAudit_append_only" BEFORE UPDATE OR DELETE ON "SecretAccessAudit"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "SecretMutationReceipt_append_only" BEFORE UPDATE OR DELETE ON "SecretMutationReceipt"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "SessionMutationReceipt_append_only" BEFORE UPDATE OR DELETE ON "SessionMutationReceipt"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "MfaMutationReceipt_append_only" BEFORE UPDATE OR DELETE ON "MfaMutationReceipt"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "SupportAccessAudit_append_only" BEFORE UPDATE OR DELETE ON "SupportAccessAudit"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "TenantRateLimitReceipt_append_only" BEFORE UPDATE OR DELETE ON "TenantRateLimitReceipt"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "AccountDeidentificationReceipt_append_only" BEFORE UPDATE OR DELETE ON "AccountDeidentificationReceipt"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();

CREATE OR REPLACE FUNCTION entral.phase202_platform_audit_read_allows()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT pg_has_role(current_user,'entral_audit_reader','member')
    OR pg_has_role(current_user,'entral_verifier','member')
    OR EXISTS (
      SELECT 1 FROM entral.app_users app_user
      JOIN public."User" account ON account."id"=app_user.auth_subject
      WHERE app_user.id=entral.session_app_user_id() AND app_user.is_active
        AND account."role"='ADMIN' AND account."deletedAt" IS NULL
    )
$$;
REVOKE EXECUTE ON FUNCTION entral.phase202_platform_audit_read_allows() FROM PUBLIC;

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" FORCE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_auditlog" ON "AuditLog" FOR SELECT USING (
  ("scopeKind"='TENANT' AND entral.phase202_tenant_access_allows("tenantId","organizationId",'read:AuditLog',"businessId"))
  OR entral.phase202_support_session_audit_insert_allows(
    "scopeKind","organizationId","tenantId","businessId","actorId","createdBy","ownedBy",
    "actorUserId","action","targetType","targetId"
  )
  OR ("scopeKind"='PERSONAL' AND entral.phase202_personal_actor_access_allows("actorId"))
  OR ("scopeKind" IN ('PLATFORM','UNRESOLVED') AND entral.phase202_platform_audit_read_allows())
);
CREATE POLICY "phase202_insert_auditlog" ON "AuditLog" FOR INSERT WITH CHECK (
  ("scopeKind"='TENANT' AND entral.phase202_tenant_access_allows("tenantId","organizationId",'write:AuditLog',"businessId"))
  OR entral.phase202_member_session_audit_insert_allows(
    "scopeKind","organizationId","tenantId","actorId","createdBy","ownedBy",
    "actorUserId","action","targetType","targetId"
  )
  OR entral.phase202_support_session_audit_insert_allows(
    'TENANT',NULLIF(current_setting('app.organization_id',true),'')::uuid,
    entral.phase202_current_tenant_id(),NULL::uuid,
    entral.phase202_current_actor_id(),entral.phase202_current_actor_id(),entral.phase202_current_actor_id(),
    "actorUserId","action","targetType","targetId"
  )
  OR ("scopeKind"='PERSONAL' AND entral.phase202_personal_actor_access_allows("actorId"))
  OR ("scopeKind"='PLATFORM' AND (
    pg_has_role(current_user,'entral_api','member') OR pg_has_role(current_user,'entral_worker','member')
  ))
);

ALTER TABLE "AccountDeidentificationReceipt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_account_deidentification_receipt_select"
  ON "AccountDeidentificationReceipt" FOR SELECT
  USING (
    "actorId"=entral.phase202_current_actor_id()
    AND "userId"=(SELECT actor."humanUserId" FROM "IdentityActor" actor WHERE actor."id"="actorId")
  );
CREATE POLICY "phase202_personal_account_deidentification_receipt_insert"
  ON "AccountDeidentificationReceipt" FOR INSERT
  WITH CHECK (
    "actorId"=entral.phase202_current_actor_id()
    AND "userId"=(SELECT actor."humanUserId" FROM "IdentityActor" actor WHERE actor."id"="actorId")
  );

ALTER TABLE "NotificationEvidence" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_notificationevidence" ON "NotificationEvidence" FOR SELECT
  USING (entral.phase202_tenant_access_allows("tenantId","organizationId",'read:NotificationEvidence'));
CREATE POLICY "phase202_insert_notificationevidence" ON "NotificationEvidence" FOR INSERT
  WITH CHECK (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:NotificationEvidence'));
CREATE POLICY "phase202_accept_notificationevidence" ON "NotificationEvidence" FOR INSERT
  WITH CHECK (
    entral.phase202_invitation_acceptance_allows(
      "tenantId","organizationId",entral.phase202_current_actor_id(),
      (SELECT "humanUserId" FROM "IdentityActor" WHERE "id"=entral.phase202_current_actor_id())
    )
  );
CREATE POLICY "phase202_update_notificationevidence" ON "NotificationEvidence" FOR UPDATE
  USING (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:NotificationEvidence'))
  WITH CHECK (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:NotificationEvidence'));
CREATE OR REPLACE FUNCTION entral.phase202_guard_notification_evidence_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
BEGIN
  IF NEW."id"<>OLD."id" OR NEW."tenantId"<>OLD."tenantId" OR NEW."organizationId"<>OLD."organizationId"
    OR NEW."channel"<>OLD."channel" OR NEW."recipientHash"<>OLD."recipientHash"
    OR NEW."templateId"<>OLD."templateId" OR NEW."occurredAt"<>OLD."occurredAt"
    OR NEW."createdAt"<>OLD."createdAt" THEN
    RAISE EXCEPTION 'Notification evidence provenance is immutable' USING ERRCODE='55000';
  END IF;
  IF OLD."status"<>'PENDING' OR NEW."status" NOT IN ('PROVIDER_ACCEPTED','NONPRODUCTION_RECORDED','FAILED') THEN
    RAISE EXCEPTION 'Invalid notification evidence transition' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "NotificationEvidence_guarded_update" BEFORE UPDATE ON "NotificationEvidence"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_guard_notification_evidence_update();

CREATE TRIGGER "OwnershipReconciliationRun_append_only" BEFORE UPDATE OR DELETE ON "OwnershipReconciliationRun"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();
CREATE TRIGGER "CredentialReferenceReconciliationRun_append_only" BEFORE UPDATE OR DELETE ON "CredentialReferenceReconciliationRun"
  FOR EACH ROW EXECUTE FUNCTION entral.phase202_block_evidence_mutation();

-- Invitations are otherwise tenant-admin managed. The invited human may make
-- only the exact PENDING -> ACCEPTED transition under the token-bound session.
CREATE POLICY "phase202_accept_membershipinvitation_select" ON "MembershipInvitation" FOR SELECT
  USING (
    ("status"='PENDING' OR ("status"='ACCEPTED' AND "acceptedAt" IS NOT NULL AND "revokedAt" IS NULL))
    AND entral.phase202_invitation_row_access_allows(
      "id","tokenHash","tenantId","organizationId","email",entral.phase202_current_actor_id()
    )
  );
CREATE POLICY "phase202_accept_membershipinvitation" ON "MembershipInvitation" FOR UPDATE
  USING (
    "status"='PENDING'
    AND entral.phase202_invitation_acceptance_allows(
      "tenantId","organizationId",entral.phase202_current_actor_id(),
      (SELECT "humanUserId" FROM "IdentityActor" WHERE "id"=entral.phase202_current_actor_id())
    )
  )
  WITH CHECK (
    "status"='ACCEPTED' AND "acceptedAt" IS NOT NULL AND "revokedAt" IS NULL
    AND "id"=NULLIF(current_setting('app.phase202_invitation_id',true),'')::uuid
    AND "tokenHash"=NULLIF(current_setting('app.phase202_invitation_token_hash',true),'')
  );

ALTER TABLE "IdentityActor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_identity_actor" ON "IdentityActor" FOR SELECT USING (entral.phase202_personal_actor_access_allows("id"));
ALTER TABLE "PersonalSecretReference" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_secret_reference" ON "PersonalSecretReference" FOR ALL USING (entral.phase202_personal_actor_access_allows("actorId")) WITH CHECK (entral.phase202_personal_actor_access_allows("actorId"));
ALTER TABLE "PersonalSecretAccessAudit" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_secret_access_audit" ON "PersonalSecretAccessAudit" FOR SELECT USING (entral.phase202_personal_actor_access_allows("actorId"));
CREATE POLICY "phase202_personal_secret_access_audit_insert" ON "PersonalSecretAccessAudit" FOR INSERT WITH CHECK (entral.phase202_personal_actor_access_allows("actorId"));
ALTER TABLE "MfaFactor" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_mfa_factor" ON "MfaFactor" FOR ALL USING (entral.phase202_personal_actor_access_allows("actorId")) WITH CHECK (entral.phase202_personal_actor_access_allows("actorId"));
ALTER TABLE "MfaRecoveryCode" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_mfa_recovery" ON "MfaRecoveryCode" FOR ALL
  USING (EXISTS (SELECT 1 FROM "MfaFactor" factor WHERE factor."id"="MfaRecoveryCode"."factorId" AND entral.phase202_personal_actor_access_allows(factor."actorId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "MfaFactor" factor WHERE factor."id"="MfaRecoveryCode"."factorId" AND entral.phase202_personal_actor_access_allows(factor."actorId")));
ALTER TABLE "MfaMutationReceipt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_mfa_receipt_select" ON "MfaMutationReceipt" FOR SELECT
  USING (entral.phase202_personal_actor_access_allows("actorId"));
CREATE POLICY "phase202_personal_mfa_receipt_insert" ON "MfaMutationReceipt" FOR INSERT
  WITH CHECK (
    entral.phase202_personal_actor_access_allows("actorId")
    AND "userId"=(SELECT actor."humanUserId" FROM "IdentityActor" actor WHERE actor."id"="actorId")
  );
ALTER TABLE "AuthSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_auth_session" ON "AuthSession" FOR ALL
  USING (
    "sessionType"='INTERNAL' AND "organizationId" IS NULL AND "tenantId" IS NULL AND "supportGrantId" IS NULL
    AND entral.phase202_personal_actor_access_allows("actorId")
  )
  WITH CHECK (
    "sessionType"='INTERNAL' AND "organizationId" IS NULL AND "tenantId" IS NULL AND "supportGrantId" IS NULL
    AND entral.phase202_personal_actor_access_allows("actorId")
  );
CREATE POLICY "phase202_member_auth_session" ON "AuthSession" FOR ALL
  USING (
    "sessionType"='MEMBER' AND "organizationId" IS NOT NULL AND "tenantId" IS NOT NULL AND "supportGrantId" IS NULL
    AND entral.phase202_member_auth_session_access_allows(
      "actorId","tenantId","organizationId"
    )
  )
  WITH CHECK (
    "sessionType"='MEMBER' AND "organizationId" IS NOT NULL AND "tenantId" IS NOT NULL AND "supportGrantId" IS NULL
    AND entral.phase202_member_auth_session_access_allows(
      "actorId","tenantId","organizationId"
    )
  );
CREATE POLICY "phase202_support_auth_session_select" ON "AuthSession" FOR SELECT
  USING (
    "sessionType"='SUPPORT'
    AND entral.phase202_support_auth_session_access_allows(
      "actorId","tenantId","organizationId","supportGrantId"
    )
  );
CREATE POLICY "phase202_support_auth_session_insert" ON "AuthSession" FOR INSERT
  WITH CHECK (
    "sessionType"='SUPPORT'
    AND entral.phase202_support_auth_session_access_allows(
      "actorId","tenantId","organizationId","supportGrantId"
    )
  );
CREATE POLICY "phase202_support_auth_session_update" ON "AuthSession" FOR UPDATE
  USING (
    "sessionType"='SUPPORT'
    AND entral.phase202_support_auth_session_access_allows(
      "actorId","tenantId","organizationId","supportGrantId"
    )
  )
  WITH CHECK (
    "sessionType"='SUPPORT'
    AND entral.phase202_support_auth_session_access_allows(
      "actorId","tenantId","organizationId","supportGrantId"
    )
  );
ALTER TABLE "SessionMutationReceipt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_session_receipt_select" ON "SessionMutationReceipt" FOR SELECT
  USING (
    entral.phase202_personal_actor_access_allows("actorId")
    AND "userId"=(SELECT actor."humanUserId" FROM "IdentityActor" actor WHERE actor."id"="actorId")
  );
CREATE POLICY "phase202_personal_session_receipt_insert" ON "SessionMutationReceipt" FOR INSERT
  WITH CHECK (
    entral.phase202_personal_actor_access_allows("actorId")
    AND "userId"=(SELECT actor."humanUserId" FROM "IdentityActor" actor WHERE actor."id"="actorId")
  );
ALTER TABLE "AuthRefreshCredential" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_personal_auth_refresh" ON "AuthRefreshCredential" FOR ALL
  USING (EXISTS (SELECT 1 FROM "AuthSession" session WHERE session."id"="AuthRefreshCredential"."sessionId" AND entral.phase202_personal_actor_access_allows(session."actorId")))
  WITH CHECK (EXISTS (SELECT 1 FROM "AuthSession" session WHERE session."id"="AuthRefreshCredential"."sessionId" AND entral.phase202_personal_actor_access_allows(session."actorId")));

ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_teammember" ON "TeamMember" FOR SELECT USING (
  entral.phase202_tenant_access_allows("tenantId","organizationId",'read:TeamMember')
  OR EXISTS (SELECT 1 FROM entral.app_users app_user WHERE app_user.id=entral.session_app_user_id() AND app_user.auth_subject="TeamMember"."userId" AND app_user.is_active)
);
CREATE POLICY "phase202_insert_teammember" ON "TeamMember" FOR INSERT WITH CHECK (
  entral.phase202_tenant_access_allows("tenantId","organizationId",'write:TeamMember')
  OR entral.phase202_invitation_acceptance_allows("tenantId","organizationId","actorId","userId")
);
CREATE POLICY "phase202_update_teammember" ON "TeamMember" FOR UPDATE USING (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:TeamMember')) WITH CHECK (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:TeamMember'));
CREATE POLICY "phase202_delete_teammember" ON "TeamMember" FOR DELETE USING (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:TeamMember'));

-- TenantBoundary has the tenant key in id, while Phase 200 tutorial records
-- retain their legacy Team id in organizationId and therefore require an
-- explicit Team join in their policies.
ALTER TABLE "TenantBoundary" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_tenantboundary" ON "TenantBoundary" FOR SELECT USING (entral.phase202_tenant_access_allows("id","organizationId",'read:TenantBoundary'));
CREATE POLICY "phase202_write_tenantboundary" ON "TenantBoundary" FOR ALL USING (entral.phase202_tenant_access_allows("id","organizationId",'write:TenantBoundary')) WITH CHECK (entral.phase202_tenant_access_allows("id","organizationId",'write:TenantBoundary'));
ALTER TABLE "TenantActorAssignment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_tenantactorassignment" ON "TenantActorAssignment" FOR SELECT USING (entral.phase202_tenant_access_allows("tenantId","organizationId",'read:TenantActorAssignment'));
CREATE POLICY "phase202_insert_tenantactorassignment" ON "TenantActorAssignment" FOR INSERT WITH CHECK (
  entral.phase202_tenant_access_allows("tenantId","organizationId",'write:TenantActorAssignment')
  OR entral.phase202_invitation_acceptance_allows("tenantId","organizationId","actorId",(SELECT "humanUserId" FROM "IdentityActor" WHERE "id"="TenantActorAssignment"."actorId"))
);
CREATE POLICY "phase202_update_tenantactorassignment" ON "TenantActorAssignment" FOR UPDATE USING (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:TenantActorAssignment')) WITH CHECK (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:TenantActorAssignment'));
CREATE POLICY "phase202_delete_tenantactorassignment" ON "TenantActorAssignment" FOR DELETE USING (entral.phase202_tenant_access_allows("tenantId","organizationId",'write:TenantActorAssignment'));

CREATE OR REPLACE FUNCTION entral.phase202_tutorial_subject_access_allows(p_user_id text,p_team_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "Team" team
    JOIN entral.app_users canonical_user
      ON canonical_user.id=entral.session_app_user_id()
     AND canonical_user.auth_subject=p_user_id
     AND canonical_user.is_active
    JOIN "IdentityActor" actor
      ON actor."humanUserId"=p_user_id AND actor."actorType"='HUMAN'
     AND actor."status"='ACTIVE' AND actor."id"=entral.phase202_current_actor_id()
    WHERE team."id"=p_team_id
      AND entral.phase202_tenant_access_allows(team."tenantId",team."organizationId",'read:MemberTutorialProgress')
  )
$$;
ALTER TABLE "MemberTutorialProgress" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_membertutorialprogress" ON "MemberTutorialProgress" FOR SELECT
  USING (entral.phase202_tutorial_subject_access_allows("userId","organizationId"));
CREATE POLICY "phase202_insert_membertutorialprogress" ON "MemberTutorialProgress" FOR INSERT
  WITH CHECK (entral.phase202_tutorial_subject_access_allows("userId","organizationId"));
CREATE POLICY "phase202_update_membertutorialprogress" ON "MemberTutorialProgress" FOR UPDATE
  USING (entral.phase202_tutorial_subject_access_allows("userId","organizationId"))
  WITH CHECK (entral.phase202_tutorial_subject_access_allows("userId","organizationId"));
ALTER TABLE "MemberTutorialMutationReceipt" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "phase202_select_membertutorialmutationreceipt" ON "MemberTutorialMutationReceipt" FOR SELECT
  USING (entral.phase202_tutorial_subject_access_allows("userId","organizationId"));
CREATE POLICY "phase202_insert_membertutorialmutationreceipt" ON "MemberTutorialMutationReceipt" FOR INSERT
  WITH CHECK (entral.phase202_tutorial_subject_access_allows("userId","organizationId"));

CREATE OR REPLACE FUNCTION entral.phase202_reconciliation_hash(
  p_mode text,p_inventory text,p_source integer,p_mapped integer,p_duplicate integer,p_ambiguous integer,p_missing integer,
  p_repair text,p_rollback text,p_completed timestamptz
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(concat_ws('|',p_mode,p_inventory,p_source::text,p_mapped::text,p_duplicate::text,p_ambiguous::text,p_missing::text,p_repair,p_rollback,to_char(p_completed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'sha256'),'hex')
$$;
ALTER TABLE "OwnershipReconciliationRun" ADD CONSTRAINT "OwnershipReconciliationRun_receipt_hash_check" CHECK (
  "receiptHash"=entral.phase202_reconciliation_hash("mode","sourceInventoryHash","sourceRows","mappedRows","duplicateRows","ambiguousRows","missingRows","repairPlanReference","rollbackReference","completedAt")
);

CREATE OR REPLACE FUNCTION entral.phase202_credential_inventory_hash()
RETURNS text LANGUAGE sql IMMUTABLE
AS $$
  SELECT encode(digest(
    'phase202-credential-reference-inventory-v1|2|ShopifyConnection.credentialJson->credentialSecretReferenceId:shopify:shopify-admin-token|ShopifyOAuthContinuation.payloadJson->payloadSecretReferenceId:shopify:shopify-oauth-continuation',
    'sha256'
  ),'hex')
$$;

CREATE OR REPLACE FUNCTION entral.phase202_live_credential_reference_state_hash()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_credential_state$
  WITH credential_rows AS (
    SELECT
      'ShopifyConnection'::text AS target,connection."id"::text AS source_id,
      connection."tenantId" AS tenant_id,connection."organizationId" AS organization_id,connection."businessId" AS business_id,
      connection."credentialJson" IS NOT NULL AS has_legacy,
      connection."credentialSecretReferenceId" AS reference_id,
      connection."status" AS source_status,
      secret."provider",secret."purpose",secret."environment",secret."keyVersion" AS key_version,secret."version",secret."revokedAt" AS revoked_at
    FROM "ShopifyConnection" connection
    LEFT JOIN "SecretReference" secret ON secret."id"=connection."credentialSecretReferenceId"
    UNION ALL
    SELECT
      'ShopifyOAuthContinuation'::text,continuation."id"::text,
      continuation."tenantId",continuation."organizationId",continuation."businessId",
      continuation."payloadJson" IS NOT NULL,
      continuation."payloadSecretReferenceId",
      continuation."status",
      secret."provider",secret."purpose",secret."environment",secret."keyVersion",secret."version",secret."revokedAt"
    FROM "ShopifyOAuthContinuation" continuation
    LEFT JOIN "SecretReference" secret ON secret."id"=continuation."payloadSecretReferenceId"
  )
  SELECT encode(digest(COALESCE(string_agg(
    concat_ws('|',target,source_id,tenant_id::text,organization_id::text,business_id::text,
      has_legacy::text,reference_id::text,source_status,provider,purpose,environment,key_version,version::text,revoked_at::text),
    E'\n' ORDER BY target,source_id
  ),''),'sha256'),'hex') FROM credential_rows
$phase202_credential_state$;

CREATE OR REPLACE FUNCTION entral.phase202_credential_reconciliation_hash(
  p_mode text,p_inventory_id text,p_inventory_hash text,p_target_count integer,
  p_source_state_hash text,p_source_rows integer,p_referenced_rows integer,p_legacy_rows integer,
  p_missing_reference_rows integer,p_invalid_reference_rows integer,p_row_identity_hash text,
  p_prior_apply_receipt_hash text,p_repair text,p_rollback text,p_completed timestamptz
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(digest(concat_ws('|',p_mode,p_inventory_id,p_inventory_hash,p_target_count::text,
    p_source_state_hash,p_source_rows::text,p_referenced_rows::text,p_legacy_rows::text,
    p_missing_reference_rows::text,p_invalid_reference_rows::text,p_row_identity_hash,
    COALESCE(p_prior_apply_receipt_hash,''),p_repair,p_rollback,
    to_char(p_completed AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),'sha256'),'hex')
$$;
ALTER TABLE "CredentialReferenceReconciliationRun"
  ADD CONSTRAINT "CredentialReferenceReconciliationRun_receipt_hash_check" CHECK (
    "receiptHash"=entral.phase202_credential_reconciliation_hash(
      "mode","inventoryId","inventoryHash","targetCount","sourceStateHash","sourceRows",
      "referencedRows","legacyRows","missingReferenceRows","invalidReferenceRows","rowIdentityHash",
      "priorApplyReceiptHash","repairPlanReference","rollbackReference","completedAt"
    )
  );

CREATE OR REPLACE FUNCTION entral.phase202_valid_secret_envelope(p_value text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE payload jsonb;
BEGIN
  payload:=p_value::jsonb;
  RETURN payload->>'__entralEncrypted'='true' AND payload->>'v'='2' AND payload->>'alg'='aes-256-gcm'
    AND coalesce(payload->>'keyVersion','')<>'' AND coalesce(payload->>'environment','')<>''
    AND coalesce(payload->>'iv','')<>'' AND coalesce(payload->>'tag','')<>'' AND coalesce(payload->>'data','')<>'';
EXCEPTION WHEN others THEN RETURN false;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_secret_envelope_metadata_matches(
  p_value text,
  p_environment text,
  p_key_version text
)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE payload jsonb;
BEGIN
  payload:=p_value::jsonb;
  RETURN entral.phase202_valid_secret_envelope(p_value)
    AND payload->>'environment'=p_environment
    AND payload->>'keyVersion'=p_key_version;
EXCEPTION WHEN others THEN RETURN false;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_valid_legacy_secure_envelope(p_value text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE payload jsonb;
BEGIN
  payload:=p_value::jsonb;
  RETURN payload->>'__entralEncrypted'='true'
    AND payload->>'v'='1'
    AND payload->>'alg'='aes-256-gcm'
    AND coalesce(payload->>'iv','')<>''
    AND coalesce(payload->>'tag','')<>''
    AND coalesce(payload->>'data','')<>'';
EXCEPTION WHEN others THEN RETURN false;
END $$;

CREATE OR REPLACE FUNCTION entral.phase202_claim_notification_deliveries(
  p_worker_id text,
  p_limit integer,
  p_lock_duration_ms integer
)
RETURNS TABLE(
  "deliveryId" uuid,
  "organizationId" uuid,
  "tenantId" uuid,
  "notificationEvidenceId" uuid,
  "secretReferenceId" uuid,
  "deliveryKind" text,
  "attempts" integer,
  "deadlineAt" timestamptz,
  "encryptedValue" text,
  "provider" text,
  "purpose" text,
  "environment" text,
  "keyVersion" text,
  "recordVersion" integer,
  "createdByActorId" uuid
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_claim_delivery$
DECLARE service_actor_id uuid;
BEGIN
  IF NOT pg_has_role(session_user,'entral_worker','USAGE')
    OR p_worker_id IS NULL OR length(p_worker_id)<1 OR length(p_worker_id)>255
    OR p_limit<1 OR p_limit>100
    OR p_lock_duration_ms<5000 OR p_lock_duration_ms>900000 THEN
    RAISE EXCEPTION 'Notification delivery claim is not authorized' USING ERRCODE='42501';
  END IF;
  SELECT actor."id" INTO service_actor_id
  FROM entral.app_users canonical_user
  JOIN "IdentityActor" actor
    ON actor."actorType"='SERVICE' AND actor."status"='ACTIVE'
   AND actor."serviceSubject"='canonical-app-user:'||canonical_user.id::text
  WHERE canonical_user.id=NULLIF(current_setting('app.phase202_worker_app_user_id',true),'')::uuid
    AND canonical_user.auth_subject IS NULL AND canonical_user.is_active;
  IF service_actor_id IS NULL THEN
    RAISE EXCEPTION 'Notification delivery service actor is unavailable' USING ERRCODE='42501';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT delivery."id"
    FROM "NotificationDeliveryOutbox" delivery
    JOIN "SecretReference" secret
      ON secret."id"=delivery."secretReferenceId"
     AND secret."tenantId"=delivery."tenantId"
     AND secret."organizationId"=delivery."organizationId"
     AND secret."revokedAt" IS NULL
     AND secret."provider"='resend'
     AND secret."purpose"='membership-email-delivery'
     AND entral.phase202_secret_envelope_metadata_matches(secret."encryptedValue",secret."environment",secret."keyVersion")
    WHERE delivery."availableAt"<=clock_timestamp()
      AND delivery."deadlineAt">clock_timestamp()
      AND (
        delivery."status" IN ('PENDING','FAILED')
        OR (delivery."status"='PROCESSING' AND delivery."lockedUntil"<=clock_timestamp())
      )
      AND entral.phase202_worker_access_allows(
        delivery."tenantId",delivery."organizationId",'write:NotificationDeliveryOutbox'
      )
    ORDER BY delivery."availableAt",delivery."createdAt",delivery."id"
    FOR UPDATE OF delivery SKIP LOCKED
    LIMIT p_limit
  ), claimed AS (
    UPDATE "NotificationDeliveryOutbox" delivery
    SET "status"='PROCESSING',"attempts"=delivery."attempts"+1,
        "lockedBy"=p_worker_id,
        "lockedUntil"=clock_timestamp()+(p_lock_duration_ms*interval '1 millisecond'),
        "lastErrorCode"=NULL,"updatedAt"=clock_timestamp()
    FROM candidates
    WHERE delivery."id"=candidates."id"
    RETURNING delivery.*
  ), audited AS (
    INSERT INTO "SecretAccessAudit" AS access_audit(
      "secretReferenceId","organizationId","tenantId","actorId",
      "action","purpose","outcome","requestId","occurredAt"
    )
    SELECT claimed."secretReferenceId",claimed."organizationId",claimed."tenantId",service_actor_id,
           'READ','membership-email-delivery','CLAIMED','notification-delivery:'||claimed."id"::text,clock_timestamp()
    FROM claimed
    RETURNING access_audit."secretReferenceId" AS "auditSecretReferenceId"
  )
  SELECT claimed."id",claimed."organizationId",claimed."tenantId",
         claimed."notificationEvidenceId",claimed."secretReferenceId",claimed."deliveryKind",
         claimed."attempts",claimed."deadlineAt",secret."encryptedValue",secret."provider",
         secret."purpose",secret."environment",secret."keyVersion",secret."version",secret."createdByActorId"
  FROM claimed
  JOIN "SecretReference" secret ON secret."id"=claimed."secretReferenceId"
  JOIN audited ON audited."auditSecretReferenceId"=secret."id";
END $phase202_claim_delivery$;

CREATE OR REPLACE FUNCTION entral.phase202_complete_notification_delivery(
  p_delivery_id uuid,
  p_worker_id text,
  p_outcome text,
  p_provider_message_id text
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_complete_delivery$
DECLARE delivery_record "NotificationDeliveryOutbox"%ROWTYPE;
BEGIN
  IF NOT pg_has_role(session_user,'entral_worker','USAGE')
    OR p_outcome NOT IN ('PROVIDER_ACCEPTED','NONPRODUCTION_RECORDED')
    OR (p_outcome='PROVIDER_ACCEPTED' AND coalesce(p_provider_message_id,'')='') THEN
    RAISE EXCEPTION 'Notification delivery completion is not authorized' USING ERRCODE='42501';
  END IF;
  SELECT * INTO delivery_record FROM "NotificationDeliveryOutbox"
  WHERE "id"=p_delivery_id AND "status"='PROCESSING' AND "lockedBy"=p_worker_id
    AND "lockedUntil">clock_timestamp()
    AND entral.phase202_worker_access_allows("tenantId","organizationId",'write:NotificationDeliveryOutbox')
  FOR UPDATE;
  IF delivery_record."id" IS NULL THEN
    RAISE EXCEPTION 'Notification delivery lock is unavailable' USING ERRCODE='40001';
  END IF;
  UPDATE "NotificationEvidence"
  SET "status"=p_outcome,"providerMessageId"=p_provider_message_id
  WHERE "id"=delivery_record."notificationEvidenceId" AND "status"='PENDING';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification evidence cannot be completed' USING ERRCODE='40001';
  END IF;
  UPDATE "SecretReference" SET "revokedAt"=clock_timestamp(),"updatedAt"=clock_timestamp()
  WHERE "id"=delivery_record."secretReferenceId" AND "revokedAt" IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification delivery secret cannot be revoked' USING ERRCODE='40001';
  END IF;
  UPDATE "NotificationDeliveryOutbox"
  SET "status"=p_outcome,"providerMessageId"=p_provider_message_id,
      "providerAcceptedAt"=clock_timestamp(),"lockedBy"=NULL,"lockedUntil"=NULL,
      "lastErrorCode"=NULL,"updatedAt"=clock_timestamp()
  WHERE "id"=delivery_record."id";
  RETURN true;
END $phase202_complete_delivery$;

CREATE OR REPLACE FUNCTION entral.phase202_fail_notification_delivery(
  p_delivery_id uuid,
  p_worker_id text,
  p_error_code text,
  p_max_attempts integer,
  p_retry_delay_ms integer
)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_fail_delivery$
DECLARE delivery_record "NotificationDeliveryOutbox"%ROWTYPE; terminal boolean; next_status text;
BEGIN
  IF NOT pg_has_role(session_user,'entral_worker','USAGE')
    OR p_error_code !~ '^[A-Z0-9_]{1,80}$'
    OR p_max_attempts<1 OR p_max_attempts>1000
    OR p_retry_delay_ms<250 OR p_retry_delay_ms>3600000 THEN
    RAISE EXCEPTION 'Notification delivery failure is not authorized' USING ERRCODE='42501';
  END IF;
  SELECT * INTO delivery_record FROM "NotificationDeliveryOutbox"
  WHERE "id"=p_delivery_id AND "status"='PROCESSING' AND "lockedBy"=p_worker_id
    AND entral.phase202_worker_access_allows("tenantId","organizationId",'write:NotificationDeliveryOutbox')
  FOR UPDATE;
  IF delivery_record."id" IS NULL THEN
    RAISE EXCEPTION 'Notification delivery lock is unavailable' USING ERRCODE='40001';
  END IF;
  terminal:=delivery_record."attempts">=p_max_attempts
    OR clock_timestamp()+(p_retry_delay_ms*interval '1 millisecond')>=delivery_record."deadlineAt";
  next_status:=CASE WHEN terminal THEN 'DEAD_LETTER' ELSE 'FAILED' END;
  UPDATE "NotificationDeliveryOutbox"
  SET "status"=next_status,
      "availableAt"=CASE WHEN terminal THEN "availableAt" ELSE clock_timestamp()+(p_retry_delay_ms*interval '1 millisecond') END,
      "lockedBy"=NULL,"lockedUntil"=NULL,"lastErrorCode"=p_error_code,"updatedAt"=clock_timestamp()
  WHERE "id"=delivery_record."id";
  IF terminal THEN
    UPDATE "NotificationEvidence" SET "status"='FAILED'
    WHERE "id"=delivery_record."notificationEvidenceId" AND "status"='PENDING';
    UPDATE "SecretReference" SET "revokedAt"=clock_timestamp(),"updatedAt"=clock_timestamp()
    WHERE "id"=delivery_record."secretReferenceId" AND "revokedAt" IS NULL;
  END IF;
  RETURN next_status;
END $phase202_fail_delivery$;

CREATE OR REPLACE FUNCTION entral.phase202_prepare_account_deidentification(
  p_session_id uuid,
  p_step_up_ttl_seconds integer,
  p_request_id text,
  p_idempotency_key text
)
RETURNS TABLE(
  "organizationId" uuid,
  "tenantId" uuid,
  "teamId" text,
  "teamName" text,
  "environment" text,
  "actorId" uuid,
  "userId" text,
  "email" text,
  "role" text,
  "status" text,
  "priorVersion" integer
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_prepare_account_deidentification$
DECLARE app_user_id text; current_actor_id uuid; step_up_after timestamptz;
BEGIN
  SELECT canonical_user.auth_subject INTO app_user_id
  FROM entral.app_users canonical_user
  WHERE canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active;
  current_actor_id := entral.phase202_current_actor_id();
  IF app_user_id IS NULL OR current_actor_id IS NULL
    OR p_request_id IS NULL OR length(btrim(p_request_id)) NOT BETWEEN 1 AND 255
    OR p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 128
    OR p_step_up_ttl_seconds IS NULL OR p_step_up_ttl_seconds NOT BETWEEN 60 AND 3600 THEN
    RAISE EXCEPTION 'Account deidentification context is invalid' USING ERRCODE='22023';
  END IF;
  step_up_after := clock_timestamp()-make_interval(secs=>p_step_up_ttl_seconds);

  PERFORM 1 FROM "User" account
  WHERE account."id"=app_user_id AND account."deletedAt" IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_UNAVAILABLE' USING ERRCODE='P0001';
  END IF;

  PERFORM 1
  FROM "IdentityActor" actor
  WHERE actor."id"=current_actor_id AND actor."humanUserId"=app_user_id
    AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_ACTOR_INVALID' USING ERRCODE='42501';
  END IF;

  PERFORM 1
  FROM "AuthSession" session
  JOIN "User" account ON account."id"=session."userId"
  WHERE session."id"=p_session_id AND session."userId"=app_user_id
    AND session."actorId"=current_actor_id AND session."revokedAt" IS NULL
    AND session."expiresAt">clock_timestamp()
    AND session."accountSessionVersion"=account."sessionVersion"
    AND session."stepUpAt" BETWEEN step_up_after AND clock_timestamp();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'RECENT_MFA_STEP_UP_REQUIRED' USING ERRCODE='42501';
  END IF;
  PERFORM 1 FROM "MfaFactor" factor
  WHERE factor."userId"=app_user_id AND factor."factorType"='TOTP' AND factor."status"='ACTIVE';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'MFA_FACTOR_REQUIRED' USING ERRCODE='42501';
  END IF;

  PERFORM team."id"
  FROM "Team" team
  JOIN "TeamMember" member ON member."teamId"=team."id"
  WHERE member."userId"=app_user_id AND member."status"<>'REMOVED'
  ORDER BY team."id"
  FOR UPDATE OF team;

  PERFORM 1
  FROM "TeamMember" member
  WHERE member."userId"=app_user_id AND member."status"<>'REMOVED'
    AND member."role"='OWNER'
    AND NOT EXISTS (
      SELECT 1
      FROM "TeamMember" successor
      JOIN "User" successor_account
        ON successor_account."id"=successor."userId"
       AND successor_account."deletedAt" IS NULL
      JOIN "IdentityActor" successor_actor
        ON successor_actor."id"=successor."actorId"
       AND successor_actor."humanUserId"=successor."userId"
       AND successor_actor."actorType"='HUMAN'
       AND successor_actor."status"='ACTIVE'
      JOIN "TenantActorAssignment" successor_assignment
        ON successor_assignment."actorId"=successor_actor."id"
       AND successor_assignment."tenantId"=successor."tenantId"
       AND successor_assignment."organizationId"=successor."organizationId"
       AND successor_assignment."role"='OWNER'
       AND successor_assignment."status"='ACTIVE'
      WHERE successor."teamId"=member."teamId" AND successor."userId"<>app_user_id
        AND successor."role"='OWNER' AND successor."status"='ACTIVE'
    );
  IF FOUND THEN
    RAISE EXCEPTION 'LAST_ACTIVE_OWNER_REQUIRED' USING ERRCODE='P0001';
  END IF;

  RETURN QUERY
  SELECT team."organizationId",team."tenantId",team."id",team."name",team."environment",
         current_actor_id,account."id",account."email",member."role",member."status",member."version"
  FROM "TeamMember" member
  JOIN "Team" team ON team."id"=member."teamId"
  JOIN "User" account ON account."id"=member."userId"
  WHERE member."userId"=app_user_id AND member."status"<>'REMOVED'
  ORDER BY team."tenantId",team."id"
  FOR UPDATE OF member;
END $phase202_prepare_account_deidentification$;

CREATE OR REPLACE FUNCTION entral.phase202_complete_account_deidentification(
  p_session_id uuid,
  p_step_up_ttl_seconds integer,
  p_request_id text,
  p_idempotency_key text,
  p_membership_receipt_ids uuid[],
  p_notification_ids uuid[],
  p_secret_reference_ids uuid[],
  p_delivery_ids uuid[],
  p_recipient_hashes text[],
  p_encrypted_values text[],
  p_key_version text
)
RETURNS TABLE(
  "receiptId" uuid,
  "receiptHash" text,
  "occurredAt" timestamptz,
  "membershipReceiptIds" uuid[]
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_complete_account_deidentification$
DECLARE
  app_user_id text;
  current_actor_id uuid;
  membership_record record;
  membership_count integer;
  item_index integer := 0;
  next_version integer;
  completed_at timestamptz := clock_timestamp();
  completed_receipt_id uuid := gen_random_uuid();
  completed_receipt_hash text;
  tombstone_email text;
  erased_classes text[] := ARRAY[
    'PROFILE_NAME','LOGIN_EMAIL','PASSWORD_CREDENTIAL','EMAIL_VERIFICATION_AND_RESET_TOKENS',
    'DURABLE_SESSIONS_AND_REFRESH_CREDENTIALS','MFA_FACTORS_AND_RECOVERY_CODES','PERSONAL_SECRET_REFERENCES'
  ]::text[];
  retained_classes text[] := ARRAY[
    'TENANT_RECORDS','OWNERSHIP_AND_CREATOR_PROVENANCE','MEMBERSHIP_TRANSITION_RECEIPTS',
    'SECURITY_AND_SECRET_ACCESS_AUDIT','NOTIFICATION_EVIDENCE','ACCOUNT_DEIDENTIFICATION_RECEIPT'
  ]::text[];
BEGIN
  SELECT canonical_user.auth_subject INTO app_user_id
  FROM entral.app_users canonical_user
  WHERE canonical_user.id=entral.session_app_user_id() AND canonical_user.is_active;
  current_actor_id := entral.phase202_current_actor_id();
  SELECT count(*)::integer INTO membership_count
  FROM entral.phase202_prepare_account_deidentification(
    p_session_id,p_step_up_ttl_seconds,p_request_id,p_idempotency_key
  );

  IF p_key_version IS NULL OR p_key_version!~'^[A-Za-z0-9._-]{1,40}$'
    OR coalesce(array_length(p_membership_receipt_ids,1),0)<>membership_count
    OR coalesce(array_length(p_notification_ids,1),0)<>membership_count
    OR coalesce(array_length(p_secret_reference_ids,1),0)<>membership_count
    OR coalesce(array_length(p_delivery_ids,1),0)<>membership_count
    OR coalesce(array_length(p_recipient_hashes,1),0)<>membership_count
    OR coalesce(array_length(p_encrypted_values,1),0)<>membership_count THEN
    RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_DELIVERY_SET_INVALID' USING ERRCODE='22023';
  END IF;

  FOR membership_record IN
    SELECT * FROM entral.phase202_prepare_account_deidentification(
      p_session_id,p_step_up_ttl_seconds,p_request_id,p_idempotency_key
    ) ORDER BY "tenantId","teamId"
  LOOP
    item_index := item_index+1;
    IF p_membership_receipt_ids[item_index] IS NULL OR p_notification_ids[item_index] IS NULL
      OR p_secret_reference_ids[item_index] IS NULL OR p_delivery_ids[item_index] IS NULL
      OR p_recipient_hashes[item_index] IS NULL OR p_recipient_hashes[item_index]!~'^[a-f0-9]{64}$'
      OR NOT entral.phase202_secret_envelope_metadata_matches(
        p_encrypted_values[item_index],membership_record."environment",p_key_version
      ) THEN
      RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_DELIVERY_ITEM_INVALID' USING ERRCODE='22023';
    END IF;

    UPDATE "TeamMember" member
    SET "status"='REMOVED',"removedAt"=completed_at,"suspendedAt"=NULL,
        "version"=member."version"+1,"updatedAt"=completed_at
    WHERE member."userId"=app_user_id AND member."teamId"=membership_record."teamId"
      AND member."status"<>'REMOVED' AND member."version"=membership_record."priorVersion"
    RETURNING member."version" INTO next_version;
    IF next_version IS NULL OR next_version<>membership_record."priorVersion"+1 THEN
      RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_MEMBERSHIP_CONFLICT' USING ERRCODE='40001';
    END IF;

    INSERT INTO "NotificationEvidence"(
      "id","organizationId","tenantId","channel","recipientHash","templateId","status","occurredAt"
    ) VALUES (
      p_notification_ids[item_index],membership_record."organizationId",membership_record."tenantId",
      'EMAIL',p_recipient_hashes[item_index],'phase202-account-membership-removed-v1','PENDING',completed_at
    );
    INSERT INTO "SecretReference"(
      "id","organizationId","tenantId","businessId","provider","purpose","environment",
      "keyVersion","encryptedValue","lastFour","version","createdByActorId","createdAt","updatedAt"
    ) VALUES (
      p_secret_reference_ids[item_index],membership_record."organizationId",membership_record."tenantId",NULL,
      'resend','membership-email-delivery',membership_record."environment",p_key_version,
      p_encrypted_values[item_index],NULL,1,current_actor_id,completed_at,completed_at
    );
    INSERT INTO "NotificationDeliveryOutbox"(
      "id","organizationId","tenantId","notificationEvidenceId","secretReferenceId","deliveryKind",
      "status","attempts","availableAt","deadlineAt","createdAt","updatedAt"
    ) VALUES (
      p_delivery_ids[item_index],membership_record."organizationId",membership_record."tenantId",
      p_notification_ids[item_index],p_secret_reference_ids[item_index],'CHANGE','PENDING',0,
      completed_at,completed_at+interval '22 hours',completed_at,completed_at
    );
    INSERT INTO "MembershipMutationReceipt"(
      "id","organizationId","tenantId","actorId","subjectUserId","subjectEmailHash","action",
      "priorVersion","resultingVersion","idempotencyKey","requestFingerprint","requestId","notificationEvidenceId","resultPayload","createdAt"
    ) VALUES (
      p_membership_receipt_ids[item_index],membership_record."organizationId",membership_record."tenantId",
      current_actor_id,app_user_id,NULL,'REMOVE',membership_record."priorVersion",next_version,
      p_idempotency_key||':'||membership_record."tenantId"::text,
      encode(digest(convert_to(jsonb_build_array('ACCOUNT_DEIDENTIFICATION',app_user_id,membership_record."tenantId"::text)::text,'UTF8'),'sha256'),'hex'),
      p_request_id,p_notification_ids[item_index],
      jsonb_build_object(
        'contract_version','1.0.0','schema_version',1,'transition_id',p_membership_receipt_ids[item_index]::text,
        'transition','REMOVE','ownership',jsonb_build_object(
          'organization_id',membership_record."organizationId"::text,'tenant_id',membership_record."tenantId"::text,
          'business_id',NULL,'environment',membership_record."environment",'data_residency','RETAINED'
        ),'actor',jsonb_build_object(
          'actor_id',current_actor_id::text,'actor_type','HUMAN','human_user_id',app_user_id,
          'service_subject',NULL,'agent_id',NULL
        ),'subject_user_id',app_user_id,'subject_email_hash',NULL,'request_id',p_request_id,
        'idempotency_key',p_idempotency_key||':'||membership_record."tenantId"::text,
        'prior_version',membership_record."priorVersion",'resulting_version',next_version,
        'authorization','ACCOUNT_DEIDENTIFICATION','budget',jsonb_build_object('kind','NO_EXTERNAL_SPEND','amount_minor_units',0),
        'reversible',false,'verification','TRANSACTIONAL_READBACK','reconciliation','IDEMPOTENT_RECEIPT',
        'failure_behavior','NO_PARTIAL_WRITE','evidence',jsonb_build_array(
          'tenant-assignment:'||membership_record."tenantId"::text,
          'notification:'||p_notification_ids[item_index]::text
        ),'notification_evidence_id',p_notification_ids[item_index]::text,
        'occurred_at',completed_at,'release_version','phase-202'
      ),completed_at
    );
  END LOOP;

  UPDATE "TenantActorAssignment" assignment
  SET "status"='REVOKED',"version"=assignment."version"+1,"updatedAt"=completed_at
  WHERE assignment."actorId"=current_actor_id AND assignment."status"<>'REVOKED';
  IF EXISTS (
    SELECT 1 FROM "TenantActorAssignment" assignment
    WHERE assignment."actorId"=current_actor_id AND assignment."status"<>'REVOKED'
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_ASSIGNMENT_CONFLICT' USING ERRCODE='40001';
  END IF;

  UPDATE "AuthRefreshCredential" credential
  SET "revokedAt"=coalesce(credential."revokedAt",completed_at)
  FROM "AuthSession" session
  WHERE credential."sessionId"=session."id" AND session."userId"=app_user_id;
  UPDATE "AuthSession" session
  SET "revokedAt"=coalesce(session."revokedAt",completed_at),"revokeReason"='ACCOUNT_DEIDENTIFIED',
      "updatedAt"=completed_at
  WHERE session."userId"=app_user_id;
  UPDATE "MfaRecoveryCode" recovery SET "consumedAt"=coalesce(recovery."consumedAt",completed_at)
  FROM "MfaFactor" factor WHERE recovery."factorId"=factor."id" AND factor."userId"=app_user_id;
  UPDATE "MfaFactor" SET "status"='REVOKED',"updatedAt"=completed_at WHERE "userId"=app_user_id;
  UPDATE "PersonalSecretReference" SET "revokedAt"=coalesce("revokedAt",completed_at),"updatedAt"=completed_at
    WHERE "actorId"=current_actor_id;
  DELETE FROM "EmailVerificationToken" WHERE "userId"=app_user_id;
  DELETE FROM "PasswordResetToken" WHERE "userId"=app_user_id;

  tombstone_email := 'deleted+'||encode(digest(current_actor_id::text||':'||p_idempotency_key,'sha256'),'hex')||'@deleted.invalid';
  UPDATE "User" account
  SET "name"='Deidentified account',
      "email"=tombstone_email,
      "passwordHash"='!deidentified!'||encode(digest(gen_random_bytes(32),'sha256'),'hex'),
      "emailVerifiedAt"=NULL,"lastDashboardSeenAt"=NULL,"internalAccess"=false,
      "sessionVersion"=account."sessionVersion"+1,"deletedAt"=completed_at,
      "deletionVersion"=account."deletionVersion"+1,"updatedAt"=completed_at
  WHERE account."id"=app_user_id AND account."deletedAt" IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_CONFLICT' USING ERRCODE='40001';
  END IF;
  UPDATE entral.app_users canonical_user
  SET email=tombstone_email,display_name='Deidentified account',is_human_authority=false,
      is_active=false,auth_link_eligible=false,updated_at=completed_at
  WHERE canonical_user.auth_subject=app_user_id AND canonical_user.id=entral.session_app_user_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_CANONICAL_IDENTITY_MISSING' USING ERRCODE='40001';
  END IF;

  completed_receipt_hash := encode(digest(
    completed_receipt_id::text||':'||app_user_id||':'||current_actor_id::text||':'||p_request_id||':'||
    p_idempotency_key||':'||array_to_string(p_membership_receipt_ids,',')||':'||completed_at::text,
    'sha256'
  ),'hex');
  INSERT INTO "AccountDeidentificationReceipt"(
    "id","userId","actorId","requestId","idempotencyKey","outcome","erasedFieldClasses",
    "retainedEvidenceClasses","membershipReceiptIds","receiptHash","occurredAt"
  ) VALUES (
    completed_receipt_id,app_user_id,current_actor_id,p_request_id,p_idempotency_key,'ACCOUNT_DEIDENTIFIED',
    erased_classes,retained_classes,p_membership_receipt_ids,completed_receipt_hash,completed_at
  );
  UPDATE "IdentityActor" SET "status"='REVOKED',"updatedAt"=completed_at
    WHERE "id"=current_actor_id AND "humanUserId"=app_user_id AND "status"='ACTIVE';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ACCOUNT_DEIDENTIFICATION_ACTOR_CONFLICT' USING ERRCODE='40001';
  END IF;

  RETURN QUERY SELECT completed_receipt_id,completed_receipt_hash,completed_at,p_membership_receipt_ids;
END $phase202_complete_account_deidentification$;

CREATE OR REPLACE FUNCTION entral.phase202_live_ownership_blockers()
RETURNS TABLE(blocker text, subject text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_blockers$
DECLARE target_table text; missing_count bigint; orphan_count bigint;
  source_record_expression text; source_organization_expression text;
  source_business_expression text; creator_column text;
  source_tables text[] := ARRAY[
    'ClientMerchStore','ShopifyConnection','ShopifyOAuthContinuation','RevenueOpportunity','GrowthApprovalPacket','RevenuePerformanceSnapshot',
    'RevenueAssetControlRecord','RevenueMoneyArmyBatchRun','FinancialSplitPolicy','FinancialLedgerEntry','FinancialPayoutIntent',
    'FinancialBudgetReleasePacket','FinancialScalingBudgetPacket','FinancialScalingSpendPacket','FinancialScalingExecutionEntry',
    'FinancialReconciliationReport','FacelessContentBrief','FacelessContentPerformanceSnapshot','PortfolioCommandAction',
    'RevenueLaunchHandoffPacket','RevenueSignalConnectorApproval','RevenueSignalImportJob','Agent','AgentTask','AgentSchedule',
    'CommandOSSnapshot','CommandOSReport','Conversation','AiUsageEvent','AutomationJob','PodProduct','AgentLog','AgentMessage','Message','AutomationLog',
    'MemberWorkspaceSnapshot','MemberTutorialProgress','MemberTutorialMutationReceipt','TeamMember','Task','AuditLog'
  ];
BEGIN
  FOREACH target_table IN ARRAY source_tables LOOP
    IF target_table='AuditLog' THEN
      SELECT count(*) INTO missing_count FROM "AuditLog" WHERE "scopeKind"='UNRESOLVED';
      IF missing_count>0 THEN blocker:='AUDIT_LOG_SCOPE_UNRESOLVED'; subject:=missing_count::text; RETURN NEXT; END IF;
      SELECT count(*) INTO missing_count FROM "AuditLog"
      WHERE "scopeKind"='TENANT' AND ("organizationId" IS NULL OR "tenantId" IS NULL OR "actorId" IS NULL OR "createdBy" IS NULL OR "ownedBy" IS NULL);
      IF missing_count>0 THEN blocker:='AUDIT_LOG_SCOPE_TUPLE_INVALID'; subject:=missing_count::text; RETURN NEXT; END IF;
      SELECT count(*) INTO orphan_count FROM "AuditLog" source
      LEFT JOIN "CustomerRecordOwnership" ownership
        ON ownership."sourceTable"='AuditLog' AND ownership."sourceRecordId"=source."id"
      WHERE source."scopeKind"='TENANT' AND (
        ownership."id" IS NULL OR ownership."organizationId" IS DISTINCT FROM source."organizationId"
        OR ownership."tenantId" IS DISTINCT FROM source."tenantId"
        OR ownership."businessId" IS DISTINCT FROM source."businessId"
        OR ownership."actorId" IS DISTINCT FROM source."actorId"
        OR ownership."createdBy" IS DISTINCT FROM source."createdBy"
        OR ownership."ownedBy" IS DISTINCT FROM source."ownedBy"
      );
      IF orphan_count>0 THEN blocker:='OWNERSHIP_SIDECAR_MISSING_OR_MISMATCHED'; subject:='AuditLog:'||orphan_count::text; RETURN NEXT; END IF;
      SELECT count(*) INTO orphan_count FROM "CustomerRecordOwnership" ownership
      WHERE ownership."sourceTable"='AuditLog' AND NOT EXISTS (
        SELECT 1 FROM "AuditLog" source WHERE source."id"=ownership."sourceRecordId" AND source."scopeKind"='TENANT'
      );
      IF orphan_count>0 THEN blocker:='OWNERSHIP_SIDECAR_REVERSE_ORPHAN'; subject:='AuditLog:'||orphan_count::text; RETURN NEXT; END IF;
      CONTINUE;
    END IF;
    source_record_expression := CASE
      WHEN target_table='TeamMember' THEN 'source."userId"||'':''||source."teamId"'
      ELSE 'source."id"::text'
    END;
    source_business_expression := CASE
      WHEN target_table IN ('TeamMember','MemberWorkspaceSnapshot','MemberTutorialProgress','MemberTutorialMutationReceipt') THEN 'NULL::uuid'
      ELSE 'source."businessId"'
    END;
    source_organization_expression := CASE
      WHEN target_table IN ('MemberTutorialProgress','MemberTutorialMutationReceipt') THEN '(SELECT team."organizationId" FROM "Team" team WHERE team."id"=source."organizationId")'
      ELSE 'source."organizationId"'
    END;
    creator_column := CASE WHEN target_table='Task' THEN 'createdByActorId' ELSE 'createdBy' END;
    EXECUTE format('SELECT count(*) FROM %I WHERE "organizationId" IS NULL OR "tenantId" IS NULL OR "actorId" IS NULL OR %I IS NULL OR "ownedBy" IS NULL',target_table,creator_column) INTO missing_count;
    IF missing_count>0 THEN blocker:='OWNERSHIP_COLUMNS_MISSING'; subject:=target_table||':'||missing_count::text; RETURN NEXT; END IF;
    EXECUTE format(
      'SELECT count(*) FROM %I source LEFT JOIN "CustomerRecordOwnership" ownership ON ownership."sourceTable"=%L AND ownership."sourceRecordId"=%s WHERE ownership."id" IS NULL OR ownership."organizationId" IS DISTINCT FROM %s OR ownership."tenantId" IS DISTINCT FROM source."tenantId" OR ownership."businessId" IS DISTINCT FROM %s OR ownership."actorId" IS DISTINCT FROM source."actorId" OR ownership."createdBy" IS DISTINCT FROM source.%I OR ownership."ownedBy" IS DISTINCT FROM source."ownedBy"',
      target_table,target_table,source_record_expression,source_organization_expression,source_business_expression,creator_column
    ) INTO orphan_count;
    IF orphan_count>0 THEN blocker:='OWNERSHIP_SIDECAR_MISSING_OR_MISMATCHED'; subject:=target_table||':'||orphan_count::text; RETURN NEXT; END IF;
    EXECUTE format(
      'SELECT count(*) FROM "CustomerRecordOwnership" ownership WHERE ownership."sourceTable"=%L AND NOT EXISTS (SELECT 1 FROM %I source WHERE %s=ownership."sourceRecordId")',
      target_table,target_table,source_record_expression
    ) INTO orphan_count;
    IF orphan_count>0 THEN blocker:='OWNERSHIP_SIDECAR_REVERSE_ORPHAN'; subject:=target_table||':'||orphan_count::text; RETURN NEXT; END IF;
  END LOOP;
  SELECT count(*) INTO orphan_count FROM "CustomerRecordOwnership" ownership
  WHERE NOT (ownership."sourceTable"=ANY(source_tables));
  IF orphan_count>0 THEN blocker:='OWNERSHIP_SIDECAR_UNKNOWN_SOURCE'; subject:=orphan_count::text; RETURN NEXT; END IF;
  SELECT count(*) INTO missing_count
  FROM entral.businesses business
  LEFT JOIN "BusinessBoundary" boundary ON boundary."canonicalBusinessId"=business.id
  LEFT JOIN "TenantBoundary" tenant
    ON tenant."id"=boundary."tenantId" AND tenant."organizationId"=boundary."organizationId"
  WHERE boundary."id" IS NULL OR boundary."status"<>'ACTIVE'
    OR boundary."stableCode"<>business.stable_code
    OR tenant."id" IS NULL OR tenant."status"<>'ACTIVE'
    OR boundary."environment"<>tenant."environment"
    OR boundary."dataResidency"<>tenant."dataResidency";
  IF missing_count>0 THEN blocker:='CANONICAL_BUSINESS_MAPPING_INVALID'; subject:=missing_count::text; RETURN NEXT; END IF;
  RETURN;
END $phase202_blockers$;

CREATE OR REPLACE FUNCTION entral.phase202_live_source_inventory_hash()
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_inventory$
DECLARE target_table text; table_count bigint; table_hash text;
  inventory text := 'phase202-source-inventory-v2|model-ledger-sha256=4e1508e3dde2c246febca6e4e07e1ce5044f48317c49609f51dc2825882f0951';
  source_record_expression text;
  source_tables text[] := ARRAY[
    'ClientMerchStore','ShopifyConnection','ShopifyOAuthContinuation','RevenueOpportunity','GrowthApprovalPacket','RevenuePerformanceSnapshot',
    'RevenueAssetControlRecord','RevenueMoneyArmyBatchRun','FinancialSplitPolicy','FinancialLedgerEntry','FinancialPayoutIntent',
    'FinancialBudgetReleasePacket','FinancialScalingBudgetPacket','FinancialScalingSpendPacket','FinancialScalingExecutionEntry',
    'FinancialReconciliationReport','FacelessContentBrief','FacelessContentPerformanceSnapshot','PortfolioCommandAction',
    'RevenueLaunchHandoffPacket','RevenueSignalConnectorApproval','RevenueSignalImportJob','Agent','AgentTask','AgentSchedule',
    'CommandOSSnapshot','CommandOSReport','Conversation','AiUsageEvent','AutomationJob','PodProduct','AgentLog','AgentMessage','Message','AutomationLog',
    'MemberWorkspaceSnapshot','MemberTutorialProgress','MemberTutorialMutationReceipt','TeamMember','Task','AuditLog'
  ];
BEGIN
  FOREACH target_table IN ARRAY source_tables LOOP
    source_record_expression := CASE
      WHEN target_table='TeamMember' THEN 'source."userId"||'':''||source."teamId"'
      ELSE 'source."id"::text'
    END;
    EXECUTE format(
      'SELECT count(*),encode(digest(coalesce(string_agg(concat_ws(''|'',record_id,coalesce(row_json->>''scopeKind'',''''),coalesce(row_json->>''organizationId'',''''),coalesce(row_json->>''tenantId'',''''),coalesce(row_json->>''businessId'',''''),coalesce(row_json->>''actorId'',''''),coalesce(row_json->>''createdBy'',row_json->>''createdByActorId'',''''),coalesce(row_json->>''ownedBy'','''')),E''\\n'' ORDER BY record_id),''''),''sha256''),''hex'') FROM (SELECT %s AS record_id,to_jsonb(source) AS row_json FROM %I source WHERE %s) inventory_rows',
      source_record_expression,target_table,
      CASE WHEN target_table='AuditLog' THEN 'source."scopeKind" IN (''TENANT'',''UNRESOLVED'')' ELSE 'TRUE' END
    ) INTO table_count,table_hash;
    inventory:=inventory||E'\n'||target_table||'|'||table_count::text||'|'||table_hash;
  END LOOP;
  RETURN encode(digest(inventory,'sha256'),'hex');
END $phase202_inventory$;

CREATE OR REPLACE FUNCTION entral.phase202_live_credential_reference_blockers()
RETURNS TABLE(blocker text,subject text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase202_credential_blockers$
  SELECT 'LEGACY_SHOPIFY_CONNECTION_CREDENTIAL'::text,connection."id"::text
  FROM "ShopifyConnection" connection
  WHERE connection."credentialJson" IS NOT NULL
  UNION ALL
  SELECT 'LEGACY_SHOPIFY_OAUTH_CONTINUATION_CREDENTIAL',continuation."id"::text
  FROM "ShopifyOAuthContinuation" continuation
  WHERE continuation."payloadJson" IS NOT NULL
  UNION ALL
  SELECT 'MISSING_SHOPIFY_CONNECTION_CREDENTIAL_REFERENCE',connection."id"::text
  FROM "ShopifyConnection" connection
  WHERE connection."credentialSecretReferenceId" IS NULL
  UNION ALL
  SELECT 'MISSING_SHOPIFY_OAUTH_CONTINUATION_CREDENTIAL_REFERENCE',continuation."id"::text
  FROM "ShopifyOAuthContinuation" continuation
  WHERE continuation."payloadSecretReferenceId" IS NULL
  UNION ALL
  SELECT 'INVALID_SHOPIFY_CONNECTION_CREDENTIAL_REFERENCE',connection."id"::text
  FROM "ShopifyConnection" connection
  LEFT JOIN "SecretReference" secret ON secret."id"=connection."credentialSecretReferenceId"
  LEFT JOIN "TenantBoundary" boundary
    ON boundary."id"=connection."tenantId" AND boundary."organizationId"=connection."organizationId"
  WHERE connection."credentialSecretReferenceId" IS NOT NULL AND (
    secret."id" IS NULL
    OR secret."tenantId" IS DISTINCT FROM connection."tenantId"
    OR secret."organizationId" IS DISTINCT FROM connection."organizationId"
    OR secret."businessId" IS DISTINCT FROM connection."businessId"
    OR secret."provider"<>'shopify'
    OR secret."purpose"<>'shopify-admin-token'
    OR boundary."id" IS NULL OR boundary."status"<>'ACTIVE'
    OR secret."environment" IS DISTINCT FROM boundary."environment"
    OR NOT entral.phase202_secret_envelope_metadata_matches(secret."encryptedValue",secret."environment",secret."keyVersion")
    OR (connection."status"='active' AND secret."revokedAt" IS NOT NULL)
  )
  UNION ALL
  SELECT 'INVALID_SHOPIFY_OAUTH_CONTINUATION_CREDENTIAL_REFERENCE',continuation."id"::text
  FROM "ShopifyOAuthContinuation" continuation
  LEFT JOIN "SecretReference" secret ON secret."id"=continuation."payloadSecretReferenceId"
  LEFT JOIN "TenantBoundary" boundary
    ON boundary."id"=continuation."tenantId" AND boundary."organizationId"=continuation."organizationId"
  WHERE continuation."payloadSecretReferenceId" IS NOT NULL AND (
    secret."id" IS NULL
    OR secret."tenantId" IS DISTINCT FROM continuation."tenantId"
    OR secret."organizationId" IS DISTINCT FROM continuation."organizationId"
    OR secret."businessId" IS DISTINCT FROM continuation."businessId"
    OR secret."provider"<>'shopify'
    OR secret."purpose"<>'shopify-oauth-continuation'
    OR boundary."id" IS NULL OR boundary."status"<>'ACTIVE'
    OR secret."environment" IS DISTINCT FROM boundary."environment"
    OR NOT entral.phase202_secret_envelope_metadata_matches(secret."encryptedValue",secret."environment",secret."keyVersion")
    OR (continuation."status"='pending' AND secret."revokedAt" IS NOT NULL)
  )
$phase202_credential_blockers$;

CREATE VIEW entral.phase202_release_blockers AS
WITH current_inventory AS (SELECT entral.phase202_live_source_inventory_hash() AS inventory_hash),
latest_audit AS (
  SELECT audit.* FROM "OwnershipReconciliationRun" audit,current_inventory current
  WHERE audit."mode"='AUDIT' AND audit."sourceInventoryHash"=current.inventory_hash
  ORDER BY audit."completedAt" DESC,audit."id" DESC LIMIT 1
),
latest_apply AS (
  SELECT apply.* FROM "OwnershipReconciliationRun" apply,latest_audit audit
  WHERE apply."mode"='APPLY' AND apply."completedAt"<audit."completedAt"
    AND apply."sourceInventoryHash"=audit."sourceInventoryHash"
  ORDER BY apply."completedAt" DESC,apply."id" DESC LIMIT 1
),
credential_current AS (
  SELECT entral.phase202_credential_inventory_hash() AS inventory_hash,
         entral.phase202_live_credential_reference_state_hash() AS source_state_hash
),
latest_credential_audit AS (
  SELECT audit.* FROM "CredentialReferenceReconciliationRun" audit,credential_current current
  WHERE audit."mode"='AUDIT'
    AND audit."inventoryId"='phase202-credential-reference-inventory-v1'
    AND audit."inventoryHash"=current.inventory_hash
    AND audit."sourceStateHash"=current.source_state_hash
  ORDER BY audit."completedAt" DESC,audit."id" DESC LIMIT 1
),
latest_credential_apply AS (
  SELECT apply.*
  FROM "CredentialReferenceReconciliationRun" apply
  JOIN latest_credential_audit audit
    ON audit."priorApplyReceiptHash"=apply."receiptHash"
   AND apply."mode"='APPLY'
   AND apply."completedAt"<audit."completedAt"
   AND apply."inventoryId"=audit."inventoryId"
   AND apply."inventoryHash"=audit."inventoryHash"
   AND apply."sourceStateHash"=audit."sourceStateHash"
  ORDER BY apply."completedAt" DESC,apply."id" DESC LIMIT 1
)
SELECT 'OWNERSHIP_APPLY_AUDIT_PAIR_MISSING'::text AS blocker,NULL::text AS subject WHERE NOT EXISTS(SELECT 1 FROM latest_audit) OR NOT EXISTS(SELECT 1 FROM latest_apply)
UNION ALL SELECT 'OWNERSHIP_APPLY_FAILED',apply."id"::text FROM latest_apply apply WHERE apply."duplicateRows">0 OR apply."ambiguousRows">0 OR apply."missingRows">0 OR apply."sourceRows"<>apply."mappedRows"
UNION ALL SELECT 'OWNERSHIP_RECONCILIATION_FAILED',audit."id"::text FROM latest_audit audit WHERE audit."duplicateRows">0 OR audit."ambiguousRows">0 OR audit."missingRows">0 OR audit."sourceRows"<>audit."mappedRows"
UNION ALL SELECT 'CREDENTIAL_REFERENCE_APPLY_AUDIT_PAIR_MISSING',NULL::text
  WHERE NOT EXISTS(SELECT 1 FROM latest_credential_audit) OR NOT EXISTS(SELECT 1 FROM latest_credential_apply)
UNION ALL SELECT 'CREDENTIAL_REFERENCE_APPLY_FAILED',apply."id"::text
  FROM latest_credential_apply apply
  WHERE apply."targetCount"<>2 OR apply."legacyRows">0 OR apply."missingReferenceRows">0
    OR apply."invalidReferenceRows">0 OR apply."sourceRows"<>apply."referencedRows"
UNION ALL SELECT 'CREDENTIAL_REFERENCE_AUDIT_FAILED',audit."id"::text
  FROM latest_credential_audit audit
  WHERE audit."targetCount"<>2 OR audit."legacyRows">0 OR audit."missingReferenceRows">0
    OR audit."invalidReferenceRows">0 OR audit."sourceRows"<>audit."referencedRows"
UNION ALL SELECT * FROM entral.phase202_live_ownership_blockers()
UNION ALL SELECT * FROM entral.phase202_live_credential_reference_blockers()
UNION ALL SELECT 'INVALID_SECRET_REFERENCE',"id"::text FROM "SecretReference" WHERE NOT entral.phase202_secret_envelope_metadata_matches("encryptedValue","environment","keyVersion")
UNION ALL SELECT 'INVALID_PERSONAL_SECRET_REFERENCE',"id"::text FROM "PersonalSecretReference" WHERE NOT entral.phase202_secret_envelope_metadata_matches("encryptedValue","environment","keyVersion")
UNION ALL SELECT 'NOTIFICATION_DELIVERY_UNRESOLVED',"id"::text FROM "NotificationDeliveryOutbox" WHERE "status"<>'PROVIDER_ACCEPTED'
UNION ALL SELECT 'NOTIFICATION_DELIVERY_SECRET_INVALID',delivery."id"::text
  FROM "NotificationDeliveryOutbox" delivery
  JOIN "SecretReference" secret ON secret."id"=delivery."secretReferenceId"
  WHERE secret."provider"<>'resend' OR secret."purpose"<>'membership-email-delivery'
    OR (delivery."status" NOT IN ('PROVIDER_ACCEPTED','DEAD_LETTER') AND secret."revokedAt" IS NOT NULL)
UNION ALL SELECT 'DEIDENTIFIED_ACCOUNT_ACTOR_ACTIVE',account."id"
  FROM "User" account JOIN "IdentityActor" actor ON actor."humanUserId"=account."id"
  WHERE account."deletedAt" IS NOT NULL AND actor."status"<>'REVOKED'
UNION ALL SELECT 'DEIDENTIFIED_ACCOUNT_MEMBERSHIP_ACTIVE',account."id"||':'||member."teamId"
  FROM "User" account JOIN "TeamMember" member ON member."userId"=account."id"
  WHERE account."deletedAt" IS NOT NULL AND member."status"<>'REMOVED'
UNION ALL SELECT 'DEIDENTIFIED_ACCOUNT_ASSIGNMENT_ACTIVE',account."id"||':'||assignment."tenantId"::text
  FROM "User" account JOIN "IdentityActor" actor ON actor."humanUserId"=account."id"
  JOIN "TenantActorAssignment" assignment ON assignment."actorId"=actor."id"
  WHERE account."deletedAt" IS NOT NULL AND assignment."status"<>'REVOKED'
UNION ALL SELECT 'DEIDENTIFIED_ACCOUNT_SESSION_ACTIVE',session."id"::text
  FROM "User" account JOIN "AuthSession" session ON session."userId"=account."id"
  WHERE account."deletedAt" IS NOT NULL AND session."revokedAt" IS NULL
UNION ALL SELECT 'DEIDENTIFIED_ACCOUNT_RECEIPT_MISSING',account."id"
  FROM "User" account WHERE account."deletedAt" IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM "AccountDeidentificationReceipt" receipt WHERE receipt."userId"=account."id")
;

-- Runtime privileges are maintained in the committed Phase 202 allowlist.
-- Never reintroduce wildcard public-table grants here.
DO $phase202_revoke_public_execute$
DECLARE phase_function record;
BEGIN
  FOR phase_function IN
    SELECT namespace.nspname AS schema_name,function.proname AS function_name,
           pg_get_function_identity_arguments(function.oid) AS identity_arguments
    FROM pg_proc function
    JOIN pg_namespace namespace ON namespace.oid=function.pronamespace
    WHERE namespace.nspname='entral' AND function.proname LIKE 'phase202\_%' ESCAPE '\'
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC',
      phase_function.schema_name,phase_function.function_name,phase_function.identity_arguments
    );
  END LOOP;
  REVOKE EXECUTE ON FUNCTION entral.can_access_business(uuid,text) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION entral.can_access_entity(uuid,text) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION entral.session_can_access_organization(text) FROM PUBLIC;
END $phase202_revoke_public_execute$;

DO $phase202_grants$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='entral_api') THEN
    GRANT EXECUTE ON FUNCTION entral.phase202_current_tenant_id(), entral.phase202_current_actor_id(), entral.phase202_current_support_grant_id(), entral.phase202_tenant_access_allows(uuid,uuid,text,uuid) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_personal_actor_access_allows(uuid) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_resolve_human_actor(text) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_support_auth_session_access_allows(uuid,uuid,uuid,uuid) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_support_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_member_auth_session_access_allows(uuid,uuid,uuid) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_member_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,text,text,text,text) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_provision_tenant_owner(text,text,text,text,text,text,text,uuid,uuid,uuid) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_register_invited_identity(text,text,text,text,text,uuid) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_resolve_tenant_assignment(uuid,uuid,uuid), entral.phase202_resolve_single_tenant_assignment(uuid,uuid) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_resolve_tenant_human_actor(text,uuid), entral.phase202_resolve_support_session(uuid,uuid,uuid), entral.phase202_revoke_tenant_user_sessions(text,uuid,text), entral.phase202_revoke_support_grant_sessions(uuid,uuid,uuid,uuid,timestamptz), entral.phase202_revoke_password_reset_sessions(text,text,text), entral.phase202_assign_support_actor(uuid,uuid,uuid) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_resolve_refresh_subject(text), entral.phase202_resolve_refresh_context(text) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_resolve_invitation_context(text,text), entral.phase202_invitation_acceptance_allows(uuid,uuid,uuid,text), entral.phase202_accept_invitation_membership(uuid,text) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_tutorial_subject_access_allows(text,text) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_prepare_account_deidentification(uuid,integer,text,text) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_complete_account_deidentification(
      uuid,integer,text,text,uuid[],uuid[],uuid[],uuid[],text[],text[],text
    ) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_personal_user_mutation_allows(text) TO entral_api;
    GRANT EXECUTE ON FUNCTION entral.phase202_platform_audit_read_allows() TO entral_api;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='entral_worker') THEN
    GRANT EXECUTE ON FUNCTION entral.phase202_current_tenant_id(), entral.phase202_current_actor_id(), entral.phase202_tenant_access_allows(uuid,uuid,text,uuid) TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_personal_actor_access_allows(uuid) TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_support_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text) TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_member_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,text,text,text,text) TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_platform_audit_read_allows() TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_resolve_service_actor(uuid) TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_resolve_tenant_assignment(uuid,uuid,uuid) TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_worker_runtime_ready() TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_claim_notification_deliveries(text,integer,integer) TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_complete_notification_delivery(uuid,text,text,text) TO entral_worker;
    GRANT EXECUTE ON FUNCTION entral.phase202_fail_notification_delivery(uuid,text,text,integer,integer) TO entral_worker;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='entral_audit_reader') THEN
    GRANT EXECUTE ON FUNCTION entral.phase202_platform_audit_read_allows() TO entral_audit_reader;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='entral_verifier') THEN
    GRANT EXECUTE ON FUNCTION entral.phase202_platform_audit_read_allows() TO entral_verifier;
    GRANT EXECUTE ON FUNCTION entral.phase202_live_ownership_blockers(), entral.phase202_live_source_inventory_hash(), entral.phase202_credential_inventory_hash(), entral.phase202_live_credential_reference_state_hash(), entral.phase202_live_credential_reference_blockers() TO entral_verifier;
  END IF;
END $phase202_grants$;

COMMIT;
