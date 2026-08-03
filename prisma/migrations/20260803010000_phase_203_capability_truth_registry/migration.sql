BEGIN;

SET LOCAL search_path = pg_catalog, public, entral, pg_temp;

-- Phase 203 Capability Truth Registry. The registry is intentionally separate
-- from runtime Agent, workflow, and provider tables. Existing source-backed
-- items are catalogued conservatively below; no seed is ACTIVE or SELLABLE.
CREATE TABLE entral.capability_registry_revision (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision >= 1),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO entral.capability_registry_revision(singleton,revision) VALUES (true,1);

CREATE TABLE entral.capability_records (
  capability_id uuid PRIMARY KEY,
  capability_key text NOT NULL CHECK (capability_key ~ '^[a-z0-9][a-z0-9._-]{2,159}$'),
  capability_version text NOT NULL CHECK (capability_version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$'),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 1 AND 200),
  purpose text NOT NULL CHECK (length(btrim(purpose)) BETWEEN 1 AND 2000),
  kind text NOT NULL CHECK (kind IN ('CAPABILITY','INTEGRATION','AGENT','WORKFLOW','COMMANDER_PACK')),
  owner text NOT NULL CHECK (length(btrim(owner)) BETWEEN 1 AND 320),
  environment text NOT NULL CHECK (environment IN ('DEVELOPMENT','TEST','STAGING','CANARY','PRODUCTION')),
  scope text NOT NULL CHECK (scope IN ('GLOBAL','TENANT')),
  tenant_id uuid,
  organization_id uuid,
  lifecycle_state text NOT NULL DEFAULT 'CATALOGUED' CHECK (lifecycle_state IN (
    'CATALOGUED','DESIGNED','IMPLEMENTED','UNIT_VERIFIED','INTEGRATION_VERIFIED',
    'CANARY_VERIFIED','ACTIVE','SELLABLE','DEPRECATED','RETIRED'
  )),
  audience_status text NOT NULL DEFAULT 'UNSUPPORTED' CHECK (audience_status IN (
    'CURRENT','LIMITED_BETA','DESIGN_PARTNER','ROADMAP','UNSUPPORTED'
  )),
  production_readiness text NOT NULL DEFAULT 'UNVERIFIED' CHECK (production_readiness IN (
    'REAL','UNVERIFIED','SIMULATED','PLACEHOLDER','LOCAL_ONLY','DISABLED'
  )),
  activation_requirements jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(activation_requirements)='array'),
  last_verified_at timestamptz,
  failure_state jsonb CHECK (failure_state IS NULL OR jsonb_typeof(failure_state)='object'),
  public_claim_eligible boolean NOT NULL DEFAULT false,
  rollback_path text NOT NULL CHECK (length(btrim(rollback_path)) BETWEEN 1 AND 2000),
  deactivation_path text NOT NULL CHECK (length(btrim(deactivation_path)) BETWEEN 1 AND 2000),
  source_reference text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 1 AND 2000),
  limitations text[] NOT NULL DEFAULT ARRAY[]::text[],
  record_version bigint NOT NULL DEFAULT 1 CHECK (record_version >= 1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (capability_id,capability_version),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  CHECK (
    (scope='GLOBAL' AND tenant_id IS NULL AND organization_id IS NULL)
    OR (scope='TENANT' AND tenant_id IS NOT NULL AND organization_id IS NOT NULL)
  ),
  CHECK (NOT public_claim_eligible OR lifecycle_state='SELLABLE'),
  CHECK (lifecycle_state NOT IN ('ACTIVE','SELLABLE') OR (
    production_readiness='REAL' AND failure_state IS NULL AND last_verified_at IS NOT NULL
  )),
  CHECK (lifecycle_state<>'SELLABLE' OR (
    environment='PRODUCTION' AND audience_status='CURRENT' AND public_claim_eligible
  ))
);
CREATE UNIQUE INDEX capability_records_natural_key
  ON entral.capability_records(
    capability_key,capability_version,environment,scope,
    COALESCE(tenant_id,'00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(organization_id,'00000000-0000-0000-0000-000000000000'::uuid)
  );
CREATE INDEX capability_records_publication_idx
  ON entral.capability_records(environment,lifecycle_state,public_claim_eligible,production_readiness);

CREATE TABLE entral.capability_dependencies (
  capability_id uuid NOT NULL,
  capability_version text NOT NULL,
  dependency_capability_id uuid NOT NULL,
  dependency_capability_version text NOT NULL,
  minimum_lifecycle_state text NOT NULL CHECK (minimum_lifecycle_state IN (
    'CATALOGUED','DESIGNED','IMPLEMENTED','UNIT_VERIFIED','INTEGRATION_VERIFIED',
    'CANARY_VERIFIED','ACTIVE','SELLABLE','DEPRECATED','RETIRED'
  )),
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (capability_id,capability_version,dependency_capability_id,dependency_capability_version),
  FOREIGN KEY (capability_id,capability_version)
    REFERENCES entral.capability_records(capability_id,capability_version) ON DELETE CASCADE,
  FOREIGN KEY (dependency_capability_id,dependency_capability_version)
    REFERENCES entral.capability_records(capability_id,capability_version) ON DELETE RESTRICT,
  CHECK (capability_id<>dependency_capability_id)
);
CREATE INDEX capability_dependencies_required_idx
  ON entral.capability_dependencies(dependency_capability_id,dependency_capability_version)
  WHERE required;

CREATE TABLE entral.capability_verification_receipts (
  receipt_id uuid PRIMARY KEY,
  capability_id uuid NOT NULL,
  capability_version text NOT NULL,
  evidence_type text NOT NULL CHECK (evidence_type IN (
    'UNIT_TEST','INTEGRATION_TEST','CANARY','PRODUCTION_READBACK','AUTHENTICATION',
    'AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION','REFRESH_OR_WEBHOOK',
    'FAILURE_HANDLING','SUPPORT_READINESS','PRICING_APPROVAL','TUTORIAL','DOCUMENTATION','ROLLBACK'
  )),
  environment text NOT NULL CHECK (environment IN ('DEVELOPMENT','TEST','STAGING','CANARY','PRODUCTION')),
  status text NOT NULL CHECK (status IN ('PASSED','FAILED')),
  reference text NOT NULL CHECK (length(btrim(reference)) BETWEEN 1 AND 2000),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  captured_at timestamptz NOT NULL,
  expires_at timestamptz,
  recorded_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (capability_id,capability_version)
    REFERENCES entral.capability_records(capability_id,capability_version) ON DELETE RESTRICT,
  CHECK (expires_at IS NULL OR expires_at>captured_at)
);
CREATE INDEX capability_verification_receipts_capability_idx
  ON entral.capability_verification_receipts(capability_id,capability_version,evidence_type,captured_at DESC);

CREATE TABLE entral.tenant_capability_installations (
  installation_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  capability_id uuid NOT NULL,
  capability_version text NOT NULL,
  state text NOT NULL DEFAULT 'AVAILABLE' CHECK (state IN ('AVAILABLE','ACTIVATING','ACTIVE','SUSPENDED','DEACTIVATED')),
  plan_eligible boolean NOT NULL DEFAULT false,
  suspension_reason text,
  activated_at timestamptz,
  verification_receipt_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  record_version bigint NOT NULL DEFAULT 1 CHECK (record_version>=1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id,organization_id,capability_id,capability_version),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (capability_id,capability_version)
    REFERENCES entral.capability_records(capability_id,capability_version) ON DELETE RESTRICT,
  CHECK ((state='SUSPENDED')=(suspension_reason IS NOT NULL)),
  CHECK (state<>'ACTIVE' OR activated_at IS NOT NULL)
);
CREATE INDEX tenant_capability_installations_scope_idx
  ON entral.tenant_capability_installations(tenant_id,organization_id,state);

CREATE TABLE entral.product_claims (
  claim_id uuid PRIMARY KEY,
  claim_key text NOT NULL CHECK (claim_key ~ '^[a-z0-9][a-z0-9._-]{2,159}$'),
  capability_id uuid NOT NULL,
  capability_version text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('DEVELOPMENT','TEST','STAGING','CANARY','PRODUCTION')),
  surface text NOT NULL CHECK (surface IN (
    'WEBSITE','TUTORIAL','PRICING','CHECKOUT','PROPOSAL','ONBOARDING',
    'INTEGRATION_LIST','MEMBER_APPLICATION','SALES'
  )),
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','BLOCKED','RETIRED')),
  approved_language text NOT NULL CHECK (length(btrim(approved_language)) BETWEEN 1 AND 4000),
  limitations text[] NOT NULL DEFAULT ARRAY[]::text[],
  requires_tenant_installation boolean NOT NULL DEFAULT false,
  approved_by_actor_id uuid REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  approved_at timestamptz,
  record_version bigint NOT NULL DEFAULT 1 CHECK (record_version>=1),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (claim_key,environment,surface,capability_id,capability_version),
  UNIQUE (claim_id,capability_id,capability_version),
  FOREIGN KEY (capability_id,capability_version)
    REFERENCES entral.capability_records(capability_id,capability_version) ON DELETE RESTRICT,
  CHECK (
    (status='APPROVED' AND approved_by_actor_id IS NOT NULL AND approved_at IS NOT NULL)
    OR (status<>'APPROVED' AND approved_by_actor_id IS NULL AND approved_at IS NULL)
  )
);
CREATE INDEX product_claims_publication_idx
  ON entral.product_claims(environment,surface,status,capability_id,capability_version);

CREATE TABLE entral.product_claim_evidence_receipts (
  claim_id uuid NOT NULL REFERENCES entral.product_claims(claim_id) ON DELETE CASCADE,
  receipt_id uuid NOT NULL REFERENCES entral.capability_verification_receipts(receipt_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (claim_id,receipt_id)
);

CREATE TABLE entral.capability_transition_audit (
  transition_id uuid PRIMARY KEY,
  capability_id uuid NOT NULL,
  capability_version text NOT NULL,
  from_state text NOT NULL,
  to_state text NOT NULL,
  prior_record_version bigint NOT NULL CHECK (prior_record_version>=1),
  resulting_record_version bigint NOT NULL CHECK (resulting_record_version=prior_record_version+1),
  evidence_receipt_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  correlation_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 12 AND 255),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  requested_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (idempotency_key),
  FOREIGN KEY (capability_id,capability_version)
    REFERENCES entral.capability_records(capability_id,capability_version) ON DELETE RESTRICT
);

CREATE TABLE entral.product_claim_transition_audit (
  transition_id uuid PRIMARY KEY,
  claim_id uuid NOT NULL REFERENCES entral.product_claims(claim_id) ON DELETE RESTRICT,
  from_status text NOT NULL CHECK (from_status IN ('DRAFT','APPROVED','BLOCKED','RETIRED')),
  to_status text NOT NULL CHECK (to_status IN ('DRAFT','APPROVED','BLOCKED','RETIRED')),
  prior_record_version bigint NOT NULL CHECK (prior_record_version>=1),
  resulting_record_version bigint NOT NULL CHECK (resulting_record_version=prior_record_version+1),
  evidence_receipt_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 2000),
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  correlation_id uuid NOT NULL,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 12 AND 255),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  requested_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (idempotency_key)
);

CREATE TABLE entral.capability_mutation_receipts (
  mutation_receipt_id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(),
  operation text NOT NULL CHECK (operation IN ('RECORD_EVIDENCE','REGISTER_CLAIM')),
  capability_id uuid NOT NULL REFERENCES entral.capability_records(capability_id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 12 AND 255),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  response_snapshot jsonb NOT NULL CHECK (jsonb_typeof(response_snapshot)='object'),
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (operation,idempotency_key)
);

CREATE TABLE entral.publication_decision_audit (
  decision_id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(),
  surface text NOT NULL,
  environment text NOT NULL,
  tenant_id uuid,
  organization_id uuid,
  decision text NOT NULL CHECK (decision IN ('ALLOWED','DENIED')),
  reason_code text NOT NULL,
  allowed_claim_count integer NOT NULL DEFAULT 0 CHECK (allowed_claim_count>=0),
  registry_revision bigint NOT NULL CHECK (registry_revision>=1),
  actor_id uuid REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  correlation_id uuid NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((tenant_id IS NULL)=(organization_id IS NULL))
);
CREATE INDEX publication_decision_audit_evaluated_idx
  ON entral.publication_decision_audit(evaluated_at DESC,surface,environment);

CREATE OR REPLACE FUNCTION entral.phase203_admin_access_allows()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_admin$
  SELECT EXISTS (
    SELECT 1
    FROM entral.app_users canonical_user
    JOIN public."User" account
      ON account."id"=canonical_user.auth_subject
     AND account."role"='ADMIN' AND account."deletedAt" IS NULL
    JOIN public."IdentityActor" actor
      ON actor."humanUserId"=account."id"
     AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
    WHERE canonical_user.id=entral.session_app_user_id()
      AND canonical_user.is_active
      AND actor."id"=entral.phase202_current_actor_id()
  )
$phase203_admin$;

CREATE OR REPLACE FUNCTION entral.phase203_lifecycle_rank(p_state text)
RETURNS integer
LANGUAGE sql IMMUTABLE
SET search_path=pg_catalog,entral
AS $phase203_rank$
  SELECT CASE p_state
    WHEN 'CATALOGUED' THEN 1 WHEN 'DESIGNED' THEN 2 WHEN 'IMPLEMENTED' THEN 3
    WHEN 'UNIT_VERIFIED' THEN 4 WHEN 'INTEGRATION_VERIFIED' THEN 5
    WHEN 'CANARY_VERIFIED' THEN 6 WHEN 'ACTIVE' THEN 7 WHEN 'SELLABLE' THEN 8
    ELSE 0 END
$phase203_rank$;

CREATE OR REPLACE FUNCTION entral.phase203_dependencies_healthy(
  p_capability_id uuid,p_capability_version text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_dependencies$
  SELECT NOT EXISTS (
    SELECT 1
    FROM entral.capability_dependencies dependency
    LEFT JOIN entral.capability_records required_capability
      ON required_capability.capability_id=dependency.dependency_capability_id
     AND required_capability.capability_version=dependency.dependency_capability_version
    WHERE dependency.capability_id=p_capability_id
      AND dependency.capability_version=p_capability_version
      AND dependency.required
      AND (
        required_capability.capability_id IS NULL
        OR required_capability.failure_state IS NOT NULL
        OR required_capability.production_readiness<>'REAL'
        OR entral.phase203_lifecycle_rank(required_capability.lifecycle_state)
           < entral.phase203_lifecycle_rank(dependency.minimum_lifecycle_state)
      )
  )
$phase203_dependencies$;

CREATE OR REPLACE FUNCTION entral.phase203_activation_requirements_healthy(
  p_capability_id uuid,p_capability_version text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_requirements$
  SELECT COALESCE(bool_and(
    COALESCE((requirement->>'required')::boolean,false)=false
    OR (
      COALESCE((requirement->>'satisfied')::boolean,false)
      AND jsonb_typeof(COALESCE(requirement->'evidence_receipt_ids','[]'::jsonb))='array'
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(COALESCE(requirement->'evidence_receipt_ids','[]'::jsonb)) receipt_id
        WHERE NOT EXISTS (
          SELECT 1 FROM entral.capability_verification_receipts receipt
          WHERE receipt.receipt_id=receipt_id::uuid
            AND receipt.capability_id=p_capability_id
            AND receipt.capability_version=p_capability_version
            AND receipt.status='PASSED'
            AND (receipt.expires_at IS NULL OR receipt.expires_at>clock_timestamp())
        )
      )
    )
  ),true)
  FROM entral.capability_records capability
  LEFT JOIN LATERAL jsonb_array_elements(capability.activation_requirements) requirement ON true
  WHERE capability.capability_id=p_capability_id
    AND capability.capability_version=p_capability_version
$phase203_requirements$;

CREATE OR REPLACE FUNCTION entral.phase203_required_evidence_present(
  p_capability_id uuid,p_capability_version text,p_evidence_types text[]
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_required_evidence$
  SELECT NOT EXISTS (
    SELECT 1 FROM unnest(p_evidence_types) required_type
    WHERE NOT EXISTS (
      SELECT 1 FROM entral.capability_verification_receipts receipt
      JOIN entral.capability_records capability
        ON capability.capability_id=receipt.capability_id
       AND capability.capability_version=receipt.capability_version
      WHERE receipt.capability_id=p_capability_id
        AND receipt.capability_version=p_capability_version
        AND receipt.evidence_type=required_type
        AND receipt.environment=capability.environment
        AND receipt.status='PASSED'
        AND (receipt.expires_at IS NULL OR receipt.expires_at>clock_timestamp())
    )
  )
$phase203_required_evidence$;

CREATE OR REPLACE FUNCTION entral.phase203_transition_evidence_includes(
  p_capability_id uuid,p_capability_version text,p_receipt_ids uuid[],p_evidence_types text[]
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_transition_evidence$
  SELECT NOT EXISTS (
    SELECT 1 FROM unnest(p_evidence_types) required_type
    WHERE NOT EXISTS (
      SELECT 1
      FROM entral.capability_verification_receipts receipt
      JOIN entral.capability_records capability
        ON capability.capability_id=receipt.capability_id
       AND capability.capability_version=receipt.capability_version
      WHERE receipt.receipt_id=ANY(p_receipt_ids)
        AND receipt.capability_id=p_capability_id
        AND receipt.capability_version=p_capability_version
        AND receipt.evidence_type=required_type
        AND receipt.environment=capability.environment
        AND receipt.status='PASSED'
        AND (receipt.expires_at IS NULL OR receipt.expires_at>clock_timestamp())
    )
  )
$phase203_transition_evidence$;

CREATE OR REPLACE FUNCTION entral.phase203_capability_record_json(p_capability_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_record_json$
  SELECT jsonb_build_object(
    'capability_id',capability.capability_id,
    'capability_key',capability.capability_key,
    'capability_version',capability.capability_version,
    'display_name',capability.display_name,
    'purpose',capability.purpose,
    'kind',capability.kind,
    'owner',capability.owner,
    'environment',capability.environment,
    'scope',capability.scope,
    'tenant_id',capability.tenant_id,
    'organization_id',capability.organization_id,
    'lifecycle_state',capability.lifecycle_state,
    'audience_status',capability.audience_status,
    'production_readiness',capability.production_readiness,
    'dependencies',COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'capability_id',dependency.dependency_capability_id,
        'capability_version',dependency.dependency_capability_version,
        'minimum_lifecycle_state',dependency.minimum_lifecycle_state,
        'required',dependency.required
      ) ORDER BY dependency.dependency_capability_id,dependency.dependency_capability_version)
      FROM entral.capability_dependencies dependency
      WHERE dependency.capability_id=capability.capability_id
        AND dependency.capability_version=capability.capability_version
    ),'[]'::jsonb),
    'activation_requirements',capability.activation_requirements,
    'verification_receipts',COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'receipt_id',receipt.receipt_id,
        'evidence_type',receipt.evidence_type,
        'environment',receipt.environment,
        'status',receipt.status,
        'reference',receipt.reference,
        'content_sha256',receipt.content_sha256,
        'captured_at',receipt.captured_at,
        'expires_at',receipt.expires_at
      ) ORDER BY receipt.captured_at,receipt.receipt_id)
      FROM entral.capability_verification_receipts receipt
      WHERE receipt.capability_id=capability.capability_id
        AND receipt.capability_version=capability.capability_version
    ),'[]'::jsonb),
    'last_verified_at',capability.last_verified_at,
    'failure_state',capability.failure_state,
    'public_claim_eligible',capability.public_claim_eligible,
    'rollback_path',capability.rollback_path,
    'deactivation_path',capability.deactivation_path,
    'source_reference',capability.source_reference,
    'limitations',to_jsonb(capability.limitations),
    'record_version',capability.record_version,
    'created_at',capability.created_at,
    'updated_at',capability.updated_at
  )
  FROM entral.capability_records capability
  WHERE capability.capability_id=p_capability_id
$phase203_record_json$;

CREATE OR REPLACE FUNCTION entral.phase203_bump_registry_revision()
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_bump$
DECLARE resulting_revision bigint;
BEGIN
  UPDATE entral.capability_registry_revision
  SET revision=revision+1,updated_at=clock_timestamp()
  WHERE singleton
  RETURNING revision INTO resulting_revision;
  RETURN resulting_revision;
END
$phase203_bump$;

CREATE OR REPLACE FUNCTION entral.phase203_registry_revision()
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_registry_revision$
  SELECT revision FROM entral.capability_registry_revision WHERE singleton
$phase203_registry_revision$;

CREATE OR REPLACE FUNCTION entral.phase203_block_append_only_mutation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_append_only$
BEGIN
  RAISE EXCEPTION '% is append-only; % is not permitted',TG_TABLE_NAME,TG_OP
    USING ERRCODE='55000';
END
$phase203_append_only$;

CREATE TRIGGER capability_verification_receipts_append_only
BEFORE UPDATE OR DELETE ON entral.capability_verification_receipts
FOR EACH ROW EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER capability_verification_receipts_no_truncate
BEFORE TRUNCATE ON entral.capability_verification_receipts
FOR EACH STATEMENT EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER capability_transition_audit_append_only
BEFORE UPDATE OR DELETE ON entral.capability_transition_audit
FOR EACH ROW EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER capability_transition_audit_no_truncate
BEFORE TRUNCATE ON entral.capability_transition_audit
FOR EACH STATEMENT EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER product_claim_transition_audit_append_only
BEFORE UPDATE OR DELETE ON entral.product_claim_transition_audit
FOR EACH ROW EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER product_claim_transition_audit_no_truncate
BEFORE TRUNCATE ON entral.product_claim_transition_audit
FOR EACH STATEMENT EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER capability_mutation_receipts_append_only
BEFORE UPDATE OR DELETE ON entral.capability_mutation_receipts
FOR EACH ROW EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER capability_mutation_receipts_no_truncate
BEFORE TRUNCATE ON entral.capability_mutation_receipts
FOR EACH STATEMENT EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER publication_decision_audit_append_only
BEFORE UPDATE OR DELETE ON entral.publication_decision_audit
FOR EACH ROW EXECUTE FUNCTION entral.phase203_block_append_only_mutation();
CREATE TRIGGER publication_decision_audit_no_truncate
BEFORE TRUNCATE ON entral.publication_decision_audit
FOR EACH STATEMENT EXECUTE FUNCTION entral.phase203_block_append_only_mutation();

CREATE OR REPLACE FUNCTION entral.phase203_guard_capability_transition()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_guard_capability$
DECLARE v_transition_id uuid;
BEGIN
  IF NEW.lifecycle_state IS NOT DISTINCT FROM OLD.lifecycle_state
     AND NEW.public_claim_eligible IS NOT DISTINCT FROM OLD.public_claim_eligible THEN
    RETURN NEW;
  END IF;
  v_transition_id := NULLIF(current_setting('app.phase203_transition_id',true),'')::uuid;
  IF v_transition_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM entral.capability_transition_audit transition
    WHERE transition.transition_id=v_transition_id
      AND transition.capability_id=OLD.capability_id
      AND transition.capability_version=OLD.capability_version
      AND transition.from_state=OLD.lifecycle_state
      AND transition.to_state=NEW.lifecycle_state
      AND transition.prior_record_version=OLD.record_version
      AND transition.resulting_record_version=NEW.record_version
  ) THEN
    RAISE EXCEPTION 'Capability lifecycle mutation requires an audited Phase 203 transition'
      USING ERRCODE='42501';
  END IF;
  IF NEW.public_claim_eligible IS DISTINCT FROM (NEW.lifecycle_state='SELLABLE') THEN
    RAISE EXCEPTION 'Public claim eligibility must exactly follow SELLABLE lifecycle state'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END
$phase203_guard_capability$;
CREATE TRIGGER capability_records_transition_guard
BEFORE UPDATE OF lifecycle_state,public_claim_eligible ON entral.capability_records
FOR EACH ROW EXECUTE FUNCTION entral.phase203_guard_capability_transition();

CREATE OR REPLACE FUNCTION entral.phase203_guard_claim_transition()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_guard_claim$
DECLARE v_transition_id uuid;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NEW.status<>'DRAFT' OR NEW.approved_by_actor_id IS NOT NULL OR NEW.approved_at IS NOT NULL THEN
      RAISE EXCEPTION 'New product claims must begin in DRAFT'
        USING ERRCODE='42501';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.approved_by_actor_id IS NOT DISTINCT FROM OLD.approved_by_actor_id
     AND NEW.approved_at IS NOT DISTINCT FROM OLD.approved_at THEN
    RETURN NEW;
  END IF;
  v_transition_id := NULLIF(current_setting('app.phase203_claim_transition_id',true),'')::uuid;
  IF v_transition_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM entral.product_claim_transition_audit transition
    WHERE transition.transition_id=v_transition_id
      AND transition.claim_id=OLD.claim_id
      AND transition.from_status=OLD.status
      AND transition.to_status=NEW.status
      AND transition.prior_record_version=OLD.record_version
      AND transition.resulting_record_version=NEW.record_version
  ) THEN
    RAISE EXCEPTION 'Product claim approval mutation requires an audited Phase 203 transition'
      USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END
$phase203_guard_claim$;
CREATE TRIGGER product_claims_transition_guard
BEFORE INSERT OR UPDATE OF status,approved_by_actor_id,approved_at ON entral.product_claims
FOR EACH ROW EXECUTE FUNCTION entral.phase203_guard_claim_transition();

CREATE OR REPLACE FUNCTION entral.phase203_block_claim_core_mutation()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_block_claim_core$
BEGIN
  RAISE EXCEPTION 'Approved language, capability version, surface, and claim core are immutable; create a new claim version'
    USING ERRCODE='55000';
END
$phase203_block_claim_core$;
CREATE TRIGGER product_claims_core_immutable
BEFORE UPDATE OF claim_key,capability_id,capability_version,environment,surface,
  approved_language,limitations,requires_tenant_installation
ON entral.product_claims
FOR EACH ROW EXECUTE FUNCTION entral.phase203_block_claim_core_mutation();

CREATE OR REPLACE FUNCTION entral.phase203_guard_claim_evidence_binding()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_guard_claim_evidence$
DECLARE
  target_claim_id uuid := CASE WHEN TG_OP='DELETE' THEN OLD.claim_id ELSE NEW.claim_id END;
  registration_claim_id uuid := NULLIF(current_setting('app.phase203_claim_registration_id',true),'')::uuid;
  v_transition_id uuid := NULLIF(current_setting('app.phase203_claim_transition_id',true),'')::uuid;
BEGIN
  IF (
    registration_claim_id=target_claim_id
    AND entral.phase203_admin_access_allows()
    AND EXISTS (
      SELECT 1 FROM entral.product_claims claim
      WHERE claim.claim_id=target_claim_id AND claim.status='DRAFT'
    )
  ) OR (
    v_transition_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM entral.product_claim_transition_audit transition
      WHERE transition.transition_id=v_transition_id AND transition.claim_id=target_claim_id
    )
  ) THEN
    RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
  END IF;
  RAISE EXCEPTION 'Product claim evidence bindings require an audited Phase 203 claim mutation'
    USING ERRCODE='42501';
END
$phase203_guard_claim_evidence$;
CREATE TRIGGER product_claim_evidence_binding_guard
BEFORE INSERT OR DELETE ON entral.product_claim_evidence_receipts
FOR EACH ROW EXECUTE FUNCTION entral.phase203_guard_claim_evidence_binding();

CREATE OR REPLACE FUNCTION entral.phase203_record_capability_evidence(
  p_capability_id uuid,p_expected_revision bigint,p_receipt jsonb,p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_record_evidence$
DECLARE
  capability entral.capability_records%ROWTYPE;
  current_actor_id uuid;
  receipt_id uuid;
  receipt_environment text;
  receipt_status text;
  receipt_type text;
  captured_at timestamptz;
  expires_at timestamptz;
  request_hash text;
  prior_receipt entral.capability_mutation_receipts%ROWTYPE;
  response jsonb;
BEGIN
  IF NOT entral.phase203_admin_access_allows() THEN
    RAISE EXCEPTION 'Phase 203 evidence recording requires active human administrator authority'
      USING ERRCODE='42501';
  END IF;
  current_actor_id := entral.phase202_current_actor_id();
  IF p_receipt IS NULL OR jsonb_typeof(p_receipt)<>'object'
     OR p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 12 AND 255 THEN
    RAISE EXCEPTION 'Invalid Phase 203 evidence request' USING ERRCODE='22023';
  END IF;
  request_hash := encode(public.digest(
    convert_to(p_capability_id::text||'|'||p_expected_revision::text||'|'||p_receipt::text,'UTF8'),'sha256'
  ),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('phase203:evidence:'||p_idempotency_key,0));
  SELECT * INTO prior_receipt FROM entral.capability_mutation_receipts
  WHERE operation='RECORD_EVIDENCE' AND idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF prior_receipt.request_sha256<>request_hash THEN
      RAISE EXCEPTION 'Phase 203 evidence idempotency key was reused with a different request'
        USING ERRCODE='23505';
    END IF;
    RETURN prior_receipt.response_snapshot;
  END IF;

  SELECT * INTO capability FROM entral.capability_records
  WHERE capability_id=p_capability_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Capability record does not exist' USING ERRCODE='P0002'; END IF;
  IF capability.record_version<>p_expected_revision THEN
    RAISE EXCEPTION 'Capability revision conflict' USING ERRCODE='40001';
  END IF;

  BEGIN
    receipt_id := (p_receipt->>'receipt_id')::uuid;
    receipt_environment := p_receipt->>'environment';
    receipt_status := p_receipt->>'status';
    receipt_type := p_receipt->>'evidence_type';
    captured_at := (p_receipt->>'captured_at')::timestamptz;
    expires_at := NULLIF(p_receipt->>'expires_at','')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 203 evidence receipt' USING ERRCODE='22023';
  END;
  IF receipt_environment<>capability.environment
     OR receipt_environment NOT IN ('DEVELOPMENT','TEST','STAGING','CANARY','PRODUCTION')
     OR receipt_status NOT IN ('PASSED','FAILED')
     OR receipt_type NOT IN (
       'UNIT_TEST','INTEGRATION_TEST','CANARY','PRODUCTION_READBACK','AUTHENTICATION',
       'AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION','REFRESH_OR_WEBHOOK',
       'FAILURE_HANDLING','SUPPORT_READINESS','PRICING_APPROVAL','TUTORIAL','DOCUMENTATION','ROLLBACK'
     )
     OR COALESCE(p_receipt->>'reference','')=''
     OR COALESCE(p_receipt->>'content_sha256','') !~ '^[0-9a-f]{64}$'
     OR captured_at IS NULL OR (expires_at IS NOT NULL AND expires_at<=captured_at) THEN
    RAISE EXCEPTION 'Phase 203 evidence receipt violates the canonical contract'
      USING ERRCODE='22023';
  END IF;

  INSERT INTO entral.capability_verification_receipts(
    receipt_id,capability_id,capability_version,evidence_type,environment,status,
    reference,content_sha256,captured_at,expires_at,recorded_by_actor_id
  ) VALUES (
    receipt_id,capability.capability_id,capability.capability_version,receipt_type,
    receipt_environment,receipt_status,p_receipt->>'reference',p_receipt->>'content_sha256',
    captured_at,expires_at,current_actor_id
  );
  UPDATE entral.capability_records
  SET last_verified_at=CASE WHEN receipt_status='PASSED'
        THEN GREATEST(COALESCE(last_verified_at,captured_at),captured_at) ELSE last_verified_at END,
      record_version=record_version+1,updated_at=clock_timestamp()
  WHERE capability_id=p_capability_id;
  PERFORM entral.phase203_bump_registry_revision();
  response := entral.phase203_capability_record_json(p_capability_id);
  INSERT INTO entral.capability_mutation_receipts(
    operation,capability_id,idempotency_key,request_sha256,response_snapshot,actor_id
  ) VALUES ('RECORD_EVIDENCE',p_capability_id,p_idempotency_key,request_hash,response,current_actor_id);
  RETURN response;
END
$phase203_record_evidence$;

CREATE OR REPLACE FUNCTION entral.phase203_transition_capability(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_transition$
DECLARE
  capability entral.capability_records%ROWTYPE;
  prior_transition entral.capability_transition_audit%ROWTYPE;
  v_transition_id uuid;
  v_capability_id uuid;
  v_actor_id uuid;
  v_correlation_id uuid;
  v_requested_at timestamptz;
  v_expected_record_version bigint;
  v_from_state text;
  v_to_state text;
  v_idempotency_key text;
  v_reason text;
  v_evidence_receipt_ids uuid[];
  request_hash text;
  current_rank integer;
  target_rank integer;
BEGIN
  IF NOT entral.phase203_admin_access_allows() THEN
    RAISE EXCEPTION 'Phase 203 lifecycle transition requires active human administrator authority'
      USING ERRCODE='42501';
  END IF;
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object' THEN
    RAISE EXCEPTION 'Invalid Phase 203 lifecycle request' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_transition_id := (p_request->>'transition_id')::uuid;
    v_capability_id := (p_request->>'capability_id')::uuid;
    v_actor_id := (p_request->>'actor_id')::uuid;
    v_correlation_id := (p_request->>'correlation_id')::uuid;
    v_requested_at := (p_request->>'requested_at')::timestamptz;
    v_expected_record_version := (p_request->>'expected_record_version')::bigint;
    v_from_state := p_request->>'from_state';
    v_to_state := p_request->>'to_state';
    v_idempotency_key := p_request->>'idempotency_key';
    v_reason := p_request->>'reason';
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
    INTO v_evidence_receipt_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'evidence_receipt_ids','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 203 lifecycle request' USING ERRCODE='22023';
  END;
  IF v_actor_id IS DISTINCT FROM entral.phase202_current_actor_id()
     OR v_from_state NOT IN ('CATALOGUED','DESIGNED','IMPLEMENTED','UNIT_VERIFIED','INTEGRATION_VERIFIED','CANARY_VERIFIED','ACTIVE','SELLABLE','DEPRECATED','RETIRED')
     OR v_to_state NOT IN ('CATALOGUED','DESIGNED','IMPLEMENTED','UNIT_VERIFIED','INTEGRATION_VERIFIED','CANARY_VERIFIED','ACTIVE','SELLABLE','DEPRECATED','RETIRED')
     OR v_from_state=v_to_state OR v_expected_record_version<1
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR v_reason IS NULL OR length(btrim(v_reason)) NOT BETWEEN 1 AND 2000
     OR v_requested_at IS NULL THEN
    RAISE EXCEPTION 'Phase 203 lifecycle request violates the canonical contract'
      USING ERRCODE='22023';
  END IF;
  request_hash := encode(public.digest(convert_to(p_request::text,'UTF8'),'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('phase203:capability-transition:'||v_idempotency_key,0));
  SELECT * INTO prior_transition FROM entral.capability_transition_audit transition
  WHERE transition.idempotency_key=v_idempotency_key;
  IF FOUND THEN
    IF prior_transition.request_sha256<>request_hash THEN
      RAISE EXCEPTION 'Phase 203 lifecycle idempotency key was reused with a different request'
        USING ERRCODE='23505';
    END IF;
    RETURN entral.phase203_capability_record_json(prior_transition.capability_id);
  END IF;

  SELECT * INTO capability FROM entral.capability_records record
  WHERE record.capability_id=v_capability_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Capability record does not exist' USING ERRCODE='P0002'; END IF;
  IF capability.lifecycle_state<>v_from_state OR capability.record_version<>v_expected_record_version THEN
    RAISE EXCEPTION 'Capability lifecycle revision conflict' USING ERRCODE='40001';
  END IF;
  current_rank := entral.phase203_lifecycle_rank(v_from_state);
  target_rank := entral.phase203_lifecycle_rank(v_to_state);
  IF NOT (
    target_rank=current_rank+1
    OR (v_to_state='DEPRECATED' AND v_from_state<>'RETIRED')
    OR (v_to_state='RETIRED' AND v_from_state='DEPRECATED')
  ) THEN
    RAISE EXCEPTION 'Invalid Phase 203 lifecycle transition' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_evidence_receipt_ids) requested_receipt_id
    WHERE NOT EXISTS (
      SELECT 1 FROM entral.capability_verification_receipts receipt
      WHERE receipt.receipt_id=requested_receipt_id
        AND receipt.capability_id=capability.capability_id
        AND receipt.capability_version=capability.capability_version
        AND receipt.status='PASSED'
        AND (receipt.expires_at IS NULL OR receipt.expires_at>clock_timestamp())
    )
  ) THEN
    RAISE EXCEPTION 'Lifecycle transition evidence is missing, failed, expired, or version-mismatched'
      USING ERRCODE='23514';
  END IF;
  IF v_to_state='UNIT_VERIFIED' AND NOT entral.phase203_transition_evidence_includes(
      capability.capability_id,capability.capability_version,v_evidence_receipt_ids,ARRAY['UNIT_TEST']::text[]
    ) THEN
    RAISE EXCEPTION 'UNIT_VERIFIED requires a fresh passed UNIT_TEST receipt in this transition request'
      USING ERRCODE='23514';
  END IF;
  IF v_to_state='INTEGRATION_VERIFIED' AND NOT entral.phase203_transition_evidence_includes(
      capability.capability_id,capability.capability_version,v_evidence_receipt_ids,ARRAY['INTEGRATION_TEST']::text[]
    ) THEN
    RAISE EXCEPTION 'INTEGRATION_VERIFIED requires a fresh passed INTEGRATION_TEST receipt in this transition request'
      USING ERRCODE='23514';
  END IF;
  IF v_to_state='CANARY_VERIFIED' AND NOT entral.phase203_transition_evidence_includes(
      capability.capability_id,capability.capability_version,v_evidence_receipt_ids,ARRAY['CANARY']::text[]
    ) THEN
    RAISE EXCEPTION 'CANARY_VERIFIED requires a fresh passed CANARY receipt in this transition request'
      USING ERRCODE='23514';
  END IF;
  IF v_to_state='ACTIVE' AND NOT entral.phase203_transition_evidence_includes(
      capability.capability_id,capability.capability_version,v_evidence_receipt_ids,ARRAY['PRODUCTION_READBACK']::text[]
    ) THEN
    RAISE EXCEPTION 'ACTIVE requires a fresh passed PRODUCTION_READBACK receipt in this transition request'
      USING ERRCODE='23514';
  END IF;
  IF v_to_state IN ('ACTIVE','SELLABLE') AND (
    capability.production_readiness<>'REAL' OR capability.failure_state IS NOT NULL
    OR capability.last_verified_at IS NULL
    OR NOT entral.phase203_dependencies_healthy(capability.capability_id,capability.capability_version)
    OR NOT entral.phase203_activation_requirements_healthy(capability.capability_id,capability.capability_version)
  ) THEN
    RAISE EXCEPTION 'Capability activation prerequisites are not healthy' USING ERRCODE='23514';
  END IF;
  IF v_to_state IN ('ACTIVE','SELLABLE') AND capability.kind='INTEGRATION'
     AND (
       NOT entral.phase203_required_evidence_present(
       capability.capability_id,capability.capability_version,
       ARRAY['AUTHENTICATION','AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION','REFRESH_OR_WEBHOOK','FAILURE_HANDLING']::text[]
       )
       OR NOT entral.phase203_transition_evidence_includes(
         capability.capability_id,capability.capability_version,v_evidence_receipt_ids,
         ARRAY['AUTHENTICATION','AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION','REFRESH_OR_WEBHOOK','FAILURE_HANDLING']::text[]
       )
     ) THEN
    RAISE EXCEPTION 'Integration activation evidence is incomplete' USING ERRCODE='23514';
  END IF;
  IF v_to_state='SELLABLE' AND (
    capability.environment<>'PRODUCTION' OR capability.audience_status<>'CURRENT'
    OR NOT entral.phase203_required_evidence_present(
      capability.capability_id,capability.capability_version,
      ARRAY['UNIT_TEST','INTEGRATION_TEST','CANARY','PRODUCTION_READBACK','SUPPORT_READINESS','PRICING_APPROVAL','TUTORIAL','DOCUMENTATION','ROLLBACK']::text[]
    )
    OR NOT entral.phase203_transition_evidence_includes(
      capability.capability_id,capability.capability_version,v_evidence_receipt_ids,
      ARRAY['UNIT_TEST','INTEGRATION_TEST','CANARY','PRODUCTION_READBACK','SUPPORT_READINESS','PRICING_APPROVAL','TUTORIAL','DOCUMENTATION','ROLLBACK']::text[]
    )
  ) THEN
    RAISE EXCEPTION 'SELLABLE evidence and public authority are incomplete' USING ERRCODE='23514';
  END IF;

  INSERT INTO entral.capability_transition_audit(
    transition_id,capability_id,capability_version,from_state,to_state,
    prior_record_version,resulting_record_version,evidence_receipt_ids,reason,
    actor_id,correlation_id,idempotency_key,request_sha256,requested_at
  ) VALUES (
    v_transition_id,capability.capability_id,capability.capability_version,v_from_state,v_to_state,
    capability.record_version,capability.record_version+1,v_evidence_receipt_ids,v_reason,
    v_actor_id,v_correlation_id,v_idempotency_key,request_hash,v_requested_at
  );
  PERFORM set_config('app.phase203_transition_id',v_transition_id::text,true);
  UPDATE entral.capability_records
  SET lifecycle_state=v_to_state,
      public_claim_eligible=(v_to_state='SELLABLE'),
      record_version=record_version+1,
      updated_at=clock_timestamp()
  WHERE capability_id=capability.capability_id;
  PERFORM entral.phase203_bump_registry_revision();
  RETURN entral.phase203_capability_record_json(capability.capability_id);
END
$phase203_transition$;

CREATE OR REPLACE FUNCTION entral.phase203_register_product_claim(
  p_request jsonb,p_idempotency_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_register_claim$
DECLARE
  capability entral.capability_records%ROWTYPE;
  existing_receipt entral.capability_mutation_receipts%ROWTYPE;
  v_claim_id uuid;
  v_capability_id uuid;
  v_capability_version text;
  v_evidence_receipt_ids uuid[];
  request_hash text;
  response jsonb;
BEGIN
  IF NOT entral.phase203_admin_access_allows() THEN
    RAISE EXCEPTION 'Phase 203 product claim registration requires active human administrator authority'
      USING ERRCODE='42501';
  END IF;
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 12 AND 255 THEN
    RAISE EXCEPTION 'Invalid Phase 203 product claim request' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_claim_id := (p_request->>'claim_id')::uuid;
    v_capability_id := (p_request->>'capability_id')::uuid;
    v_capability_version := p_request->>'capability_version';
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
    INTO v_evidence_receipt_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'evidence_receipt_ids','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Malformed Phase 203 product claim request' USING ERRCODE='22023';
  END;
  request_hash := encode(public.digest(
    convert_to(p_request::text||'|'||p_idempotency_key,'UTF8'),'sha256'
  ),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('phase203:claim-registration:'||p_idempotency_key,0));
  SELECT * INTO existing_receipt FROM entral.capability_mutation_receipts receipt
  WHERE receipt.operation='REGISTER_CLAIM' AND receipt.idempotency_key=p_idempotency_key;
  IF FOUND THEN
    IF existing_receipt.request_sha256<>request_hash THEN
      RAISE EXCEPTION 'Product claim idempotency key was reused with a different request'
        USING ERRCODE='23505';
    END IF;
    RETURN existing_receipt.response_snapshot;
  END IF;
  SELECT * INTO capability FROM entral.capability_records record
  WHERE record.capability_id=v_capability_id
    AND record.capability_version=v_capability_version FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Capability version does not exist' USING ERRCODE='P0002'; END IF;
  IF COALESCE(p_request->>'claim_key','') !~ '^[a-z0-9][a-z0-9._-]{2,159}$'
     OR p_request->>'environment' IS DISTINCT FROM capability.environment
     OR p_request->>'surface' NOT IN ('WEBSITE','TUTORIAL','PRICING','CHECKOUT','PROPOSAL','ONBOARDING','INTEGRATION_LIST','MEMBER_APPLICATION','SALES')
     OR length(btrim(COALESCE(p_request->>'approved_language',''))) NOT BETWEEN 1 AND 4000
     OR jsonb_typeof(COALESCE(p_request->'limitations','[]'::jsonb))<>'array'
     OR jsonb_typeof(COALESCE(p_request->'evidence_receipt_ids','[]'::jsonb))<>'array' THEN
    RAISE EXCEPTION 'Product claim request violates the canonical contract' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_evidence_receipt_ids) requested_receipt_id
    WHERE NOT EXISTS (
      SELECT 1 FROM entral.capability_verification_receipts receipt
      WHERE receipt.receipt_id=requested_receipt_id
        AND receipt.capability_id=capability.capability_id
        AND receipt.capability_version=capability.capability_version
    )
  ) THEN
    RAISE EXCEPTION 'Product claim evidence is not bound to the exact capability version'
      USING ERRCODE='23514';
  END IF;
  INSERT INTO entral.product_claims(
    claim_id,claim_key,capability_id,capability_version,environment,surface,status,
    approved_language,limitations,requires_tenant_installation
  ) VALUES (
    v_claim_id,p_request->>'claim_key',capability.capability_id,capability.capability_version,
    capability.environment,p_request->>'surface','DRAFT',p_request->>'approved_language',
    ARRAY(SELECT jsonb_array_elements_text(COALESCE(p_request->'limitations','[]'::jsonb))),
    COALESCE((p_request->>'requires_tenant_installation')::boolean,false)
  );
  PERFORM set_config('app.phase203_claim_registration_id',v_claim_id::text,true);
  INSERT INTO entral.product_claim_evidence_receipts(claim_id,receipt_id)
  SELECT v_claim_id,receipt_id FROM unnest(v_evidence_receipt_ids) receipt_id;
  response := (
    SELECT jsonb_build_object(
      'claim_id',claim.claim_id,'claim_key',claim.claim_key,
      'capability_id',claim.capability_id,'capability_version',claim.capability_version,
      'environment',claim.environment,'surface',claim.surface,'status',claim.status,
      'approved_language',claim.approved_language,'limitations',to_jsonb(claim.limitations),
      'evidence_receipt_ids',COALESCE((SELECT jsonb_agg(link.receipt_id ORDER BY link.receipt_id)
        FROM entral.product_claim_evidence_receipts link WHERE link.claim_id=claim.claim_id),'[]'::jsonb),
      'requires_tenant_installation',claim.requires_tenant_installation,
      'approved_by_actor_id',claim.approved_by_actor_id,'approved_at',claim.approved_at,
      'record_version',claim.record_version,'created_at',claim.created_at,'updated_at',claim.updated_at
    ) FROM entral.product_claims claim WHERE claim.claim_id=v_claim_id
  );
  INSERT INTO entral.capability_mutation_receipts(
    operation,capability_id,idempotency_key,request_sha256,response_snapshot,actor_id
  ) VALUES (
    'REGISTER_CLAIM',capability.capability_id,p_idempotency_key,request_hash,response,
    entral.phase202_current_actor_id()
  );
  PERFORM entral.phase203_bump_registry_revision();
  RETURN response;
END
$phase203_register_claim$;

CREATE OR REPLACE FUNCTION entral.phase203_transition_product_claim(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_transition_claim$
DECLARE
  claim entral.product_claims%ROWTYPE;
  capability entral.capability_records%ROWTYPE;
  prior_transition entral.product_claim_transition_audit%ROWTYPE;
  v_transition_id uuid;
  v_claim_id uuid;
  v_actor_id uuid;
  v_correlation_id uuid;
  v_expected_record_version bigint;
  v_from_status text;
  v_to_status text;
  v_idempotency_key text;
  v_reason text;
  v_requested_at timestamptz;
  v_evidence_receipt_ids uuid[];
  request_hash text;
  response jsonb;
BEGIN
  IF NOT entral.phase203_admin_access_allows() THEN
    RAISE EXCEPTION 'Product claim transition requires active human administrator authority'
      USING ERRCODE='42501';
  END IF;
  BEGIN
    v_transition_id := (p_request->>'transition_id')::uuid;
    v_claim_id := (p_request->>'claim_id')::uuid;
    v_actor_id := (p_request->>'actor_id')::uuid;
    v_correlation_id := (p_request->>'correlation_id')::uuid;
    v_expected_record_version := (p_request->>'expected_record_version')::bigint;
    v_from_status := p_request->>'from_status';
    v_to_status := p_request->>'to_status';
    v_idempotency_key := p_request->>'idempotency_key';
    v_reason := p_request->>'reason';
    v_requested_at := (p_request->>'requested_at')::timestamptz;
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
    INTO v_evidence_receipt_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'evidence_receipt_ids','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed product claim transition request' USING ERRCODE='22023';
  END;
  IF v_actor_id IS DISTINCT FROM entral.phase202_current_actor_id()
     OR v_from_status NOT IN ('DRAFT','APPROVED','BLOCKED','RETIRED')
     OR v_to_status NOT IN ('DRAFT','APPROVED','BLOCKED','RETIRED')
     OR v_from_status=v_to_status OR v_expected_record_version<1
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR v_reason IS NULL OR length(btrim(v_reason)) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Product claim transition violates the canonical contract' USING ERRCODE='22023';
  END IF;
  request_hash := encode(public.digest(convert_to(p_request::text,'UTF8'),'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended('phase203:claim-transition:'||v_idempotency_key,0));
  SELECT * INTO prior_transition FROM entral.product_claim_transition_audit transition
  WHERE transition.idempotency_key=v_idempotency_key;
  IF FOUND THEN
    IF prior_transition.request_sha256<>request_hash THEN
      RAISE EXCEPTION 'Product claim idempotency key was reused with a different request'
        USING ERRCODE='23505';
    END IF;
    v_claim_id := prior_transition.claim_id;
  ELSE
    SELECT * INTO claim FROM entral.product_claims record
    WHERE record.claim_id=v_claim_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product claim does not exist' USING ERRCODE='P0002'; END IF;
    IF claim.status<>v_from_status OR claim.record_version<>v_expected_record_version THEN
      RAISE EXCEPTION 'Product claim revision conflict' USING ERRCODE='40001';
    END IF;
    IF NOT (
      (v_from_status='DRAFT' AND v_to_status IN ('APPROVED','BLOCKED','RETIRED'))
      OR (v_from_status='APPROVED' AND v_to_status IN ('BLOCKED','RETIRED'))
      OR (v_from_status='BLOCKED' AND v_to_status IN ('DRAFT','RETIRED'))
    ) THEN
      RAISE EXCEPTION 'Unsupported product claim transition' USING ERRCODE='22023';
    END IF;
    SELECT * INTO capability FROM entral.capability_records record
    WHERE record.capability_id=claim.capability_id
      AND record.capability_version=claim.capability_version;
    IF v_to_status='APPROVED' AND (
      capability.lifecycle_state<>'SELLABLE' OR capability.production_readiness<>'REAL'
      OR NOT capability.public_claim_eligible OR capability.failure_state IS NOT NULL
      OR cardinality(v_evidence_receipt_ids)=0
      OR EXISTS (
        SELECT 1 FROM unnest(v_evidence_receipt_ids) requested_receipt_id
        WHERE NOT EXISTS (
          SELECT 1 FROM entral.capability_verification_receipts receipt
          WHERE receipt.receipt_id=requested_receipt_id
            AND receipt.capability_id=claim.capability_id
            AND receipt.capability_version=claim.capability_version
            AND receipt.status='PASSED'
            AND (receipt.expires_at IS NULL OR receipt.expires_at>clock_timestamp())
        )
      )
    ) THEN
      RAISE EXCEPTION 'Product claim cannot be approved without exact SELLABLE evidence'
        USING ERRCODE='23514';
    END IF;
    INSERT INTO entral.product_claim_transition_audit(
      transition_id,claim_id,from_status,to_status,prior_record_version,resulting_record_version,
      evidence_receipt_ids,reason,actor_id,correlation_id,idempotency_key,request_sha256,requested_at
    ) VALUES (
      v_transition_id,claim.claim_id,v_from_status,v_to_status,claim.record_version,claim.record_version+1,
      v_evidence_receipt_ids,v_reason,v_actor_id,v_correlation_id,v_idempotency_key,request_hash,v_requested_at
    );
    PERFORM set_config('app.phase203_claim_transition_id',v_transition_id::text,true);
    DELETE FROM entral.product_claim_evidence_receipts WHERE product_claim_evidence_receipts.claim_id=claim.claim_id;
    INSERT INTO entral.product_claim_evidence_receipts(claim_id,receipt_id)
    SELECT claim.claim_id,receipt_id FROM unnest(v_evidence_receipt_ids) receipt_id;
    UPDATE entral.product_claims
    SET status=v_to_status,
        approved_by_actor_id=CASE WHEN v_to_status='APPROVED' THEN v_actor_id ELSE NULL END,
        approved_at=CASE WHEN v_to_status='APPROVED' THEN clock_timestamp() ELSE NULL END,
        record_version=record_version+1,updated_at=clock_timestamp()
    WHERE product_claims.claim_id=claim.claim_id;
    PERFORM entral.phase203_bump_registry_revision();
  END IF;
  SELECT jsonb_build_object(
    'claim_id',record.claim_id,'claim_key',record.claim_key,
    'capability_id',record.capability_id,'capability_version',record.capability_version,
    'environment',record.environment,'surface',record.surface,'status',record.status,
    'approved_language',record.approved_language,'limitations',to_jsonb(record.limitations),
    'evidence_receipt_ids',COALESCE((SELECT jsonb_agg(link.receipt_id ORDER BY link.receipt_id)
      FROM entral.product_claim_evidence_receipts link WHERE link.claim_id=record.claim_id),'[]'::jsonb),
    'requires_tenant_installation',record.requires_tenant_installation,
    'approved_by_actor_id',record.approved_by_actor_id,'approved_at',record.approved_at,
    'record_version',record.record_version,'created_at',record.created_at,'updated_at',record.updated_at
  ) INTO response FROM entral.product_claims record WHERE record.claim_id=v_claim_id;
  RETURN response;
END
$phase203_transition_claim$;

CREATE OR REPLACE FUNCTION entral.phase203_publication_gate(
  p_surface text,p_environment text,p_tenant_id uuid DEFAULT NULL,p_organization_id uuid DEFAULT NULL
) RETURNS TABLE("claim" jsonb)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_publication_gate$
DECLARE
  allowed_count integer := 0;
  current_revision bigint;
  correlation_id uuid := COALESCE(
    NULLIF(current_setting('app.correlation_id',true),'')::uuid,public.gen_random_uuid()
  );
  request_valid boolean;
BEGIN
  SELECT revision INTO current_revision FROM entral.capability_registry_revision WHERE singleton;
  request_valid := p_surface IN (
      'WEBSITE','TUTORIAL','PRICING','CHECKOUT','PROPOSAL','ONBOARDING',
      'INTEGRATION_LIST','MEMBER_APPLICATION','SALES'
    )
    AND p_environment IN ('DEVELOPMENT','TEST','STAGING','CANARY','PRODUCTION')
    AND ((p_tenant_id IS NULL AND p_organization_id IS NULL) OR (
      p_tenant_id IS NOT NULL AND p_organization_id IS NOT NULL
      AND entral.phase202_tenant_access_allows(
        p_tenant_id,p_organization_id,'read:TenantBoundary',NULL::uuid
      )
    ));
  IF request_valid THEN
    RETURN QUERY
    SELECT jsonb_build_object(
      'claim_id',product_claim.claim_id,
      'claim_key',product_claim.claim_key,
      'capability_id',capability.capability_id,
      'capability_key',capability.capability_key,
      'capability_version',capability.capability_version,
      'display_name',capability.display_name,
      'lifecycle_state','SELLABLE',
      'approved_language',product_claim.approved_language,
      'limitations',to_jsonb(product_claim.limitations),
      'evidence_receipt_ids',(
        SELECT jsonb_agg(link.receipt_id ORDER BY link.receipt_id)
        FROM entral.product_claim_evidence_receipts link
        WHERE link.claim_id=product_claim.claim_id
      ),
      'claim_record_version',product_claim.record_version,
      'capability_record_version',capability.record_version
    )
    FROM entral.product_claims product_claim
    JOIN entral.capability_records capability
      ON capability.capability_id=product_claim.capability_id
     AND capability.capability_version=product_claim.capability_version
    WHERE product_claim.surface=p_surface
      AND product_claim.environment=p_environment
      AND product_claim.status='APPROVED'
      AND capability.environment=p_environment
      AND capability.lifecycle_state='SELLABLE'
      AND capability.production_readiness='REAL'
      AND capability.public_claim_eligible
      AND capability.audience_status='CURRENT'
      AND capability.failure_state IS NULL
      AND capability.last_verified_at IS NOT NULL
      AND entral.phase203_dependencies_healthy(capability.capability_id,capability.capability_version)
      AND entral.phase203_activation_requirements_healthy(capability.capability_id,capability.capability_version)
      AND entral.phase203_required_evidence_present(
        capability.capability_id,capability.capability_version,
        ARRAY['UNIT_TEST','INTEGRATION_TEST','CANARY','PRODUCTION_READBACK','SUPPORT_READINESS','PRICING_APPROVAL','TUTORIAL','DOCUMENTATION','ROLLBACK']::text[]
      )
      AND (
        (capability.scope='GLOBAL' AND capability.tenant_id IS NULL AND capability.organization_id IS NULL)
        OR (capability.scope='TENANT' AND capability.tenant_id=p_tenant_id AND capability.organization_id=p_organization_id)
      )
      AND EXISTS (
        SELECT 1 FROM entral.product_claim_evidence_receipts link
        WHERE link.claim_id=product_claim.claim_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM entral.product_claim_evidence_receipts link
        LEFT JOIN entral.capability_verification_receipts receipt
          ON receipt.receipt_id=link.receipt_id
         AND receipt.capability_id=capability.capability_id
         AND receipt.capability_version=capability.capability_version
         AND receipt.environment=capability.environment
         AND receipt.status='PASSED'
         AND (receipt.expires_at IS NULL OR receipt.expires_at>clock_timestamp())
        WHERE link.claim_id=product_claim.claim_id AND receipt.receipt_id IS NULL
      )
      AND (
        NOT product_claim.requires_tenant_installation AND capability.scope='GLOBAL'
        OR EXISTS (
          SELECT 1 FROM entral.tenant_capability_installations installation
          WHERE installation.tenant_id=p_tenant_id
            AND installation.organization_id=p_organization_id
            AND installation.capability_id=capability.capability_id
            AND installation.capability_version=capability.capability_version
            AND installation.state='ACTIVE' AND installation.plan_eligible
            AND installation.suspension_reason IS NULL
        )
      )
    ORDER BY product_claim.claim_key,product_claim.claim_id;
    GET DIAGNOSTICS allowed_count = ROW_COUNT;
  END IF;
  INSERT INTO entral.publication_decision_audit(
    surface,environment,tenant_id,organization_id,decision,reason_code,
    allowed_claim_count,registry_revision,actor_id,correlation_id
  ) VALUES (
    COALESCE(p_surface,'<null>'),COALESCE(p_environment,'<null>'),p_tenant_id,p_organization_id,
    CASE WHEN allowed_count>0 THEN 'ALLOWED' ELSE 'DENIED' END,
    CASE WHEN NOT request_valid THEN 'MALFORMED_OR_UNAUTHORIZED_REQUEST'
         WHEN allowed_count=0 THEN 'NO_EFFECTIVE_SELLABLE_CLAIMS'
         ELSE 'SELLABLE_VERIFIED' END,
    allowed_count,current_revision,entral.phase202_current_actor_id(),correlation_id
  );
END
$phase203_publication_gate$;

CREATE OR REPLACE FUNCTION entral.phase203_admin_readback()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_admin_readback$
DECLARE response jsonb;
BEGIN
  IF NOT entral.phase203_admin_access_allows() THEN
    RAISE EXCEPTION 'Phase 203 readback requires active human administrator authority'
      USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'contract_version','1.0.0',
    'schema_version',1,
    'registry_revision',(SELECT revision FROM entral.capability_registry_revision WHERE singleton),
    'generated_at',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'records',COALESCE((SELECT jsonb_agg(entral.phase203_capability_record_json(record.capability_id)
      ORDER BY record.capability_key,record.capability_version,record.capability_id)
      FROM entral.capability_records record),'[]'::jsonb),
    'claims',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'claim_id',product_claim.claim_id,'claim_key',product_claim.claim_key,
      'capability_id',product_claim.capability_id,'capability_version',product_claim.capability_version,
      'environment',product_claim.environment,'surface',product_claim.surface,'status',product_claim.status,
      'approved_language',product_claim.approved_language,'limitations',to_jsonb(product_claim.limitations),
      'evidence_receipt_ids',COALESCE((SELECT jsonb_agg(link.receipt_id ORDER BY link.receipt_id)
        FROM entral.product_claim_evidence_receipts link WHERE link.claim_id=product_claim.claim_id),'[]'::jsonb),
      'requires_tenant_installation',product_claim.requires_tenant_installation,
      'approved_by_actor_id',product_claim.approved_by_actor_id,'approved_at',product_claim.approved_at,
      'record_version',product_claim.record_version,'created_at',product_claim.created_at,'updated_at',product_claim.updated_at
    ) ORDER BY product_claim.claim_key,product_claim.claim_id) FROM entral.product_claims product_claim),'[]'::jsonb),
    'installations',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'installation_id',installation.installation_id,'tenant_id',installation.tenant_id,
      'organization_id',installation.organization_id,'capability_id',installation.capability_id,
      'capability_version',installation.capability_version,'state',installation.state,
      'plan_eligible',installation.plan_eligible,'suspension_reason',installation.suspension_reason,
      'activated_at',installation.activated_at,'verification_receipt_ids',to_jsonb(installation.verification_receipt_ids),
      'record_version',installation.record_version,'created_at',installation.created_at,'updated_at',installation.updated_at
    ) ORDER BY installation.tenant_id,installation.capability_id) FROM entral.tenant_capability_installations installation),'[]'::jsonb),
    'verification_receipts',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'receipt_id',receipt.receipt_id,'capability_id',receipt.capability_id,
      'capability_version',receipt.capability_version,'evidence_type',receipt.evidence_type,
      'environment',receipt.environment,'status',receipt.status,'reference',receipt.reference,
      'content_sha256',receipt.content_sha256,'captured_at',receipt.captured_at,'expires_at',receipt.expires_at
    ) ORDER BY receipt.capability_id,receipt.captured_at,receipt.receipt_id)
      FROM entral.capability_verification_receipts receipt),'[]'::jsonb),
    'dependencies',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'capability_id',dependency.capability_id,'capability_version',dependency.capability_version,
      'dependency_capability_id',dependency.dependency_capability_id,
      'dependency_capability_version',dependency.dependency_capability_version,
      'minimum_lifecycle_state',dependency.minimum_lifecycle_state,'required',dependency.required
    ) ORDER BY dependency.capability_id,dependency.dependency_capability_id)
      FROM entral.capability_dependencies dependency),'[]'::jsonb),
    'transition_audit',COALESCE((SELECT jsonb_agg(to_jsonb(transition)
      ORDER BY transition.recorded_at,transition.transition_id)
      FROM entral.capability_transition_audit transition),'[]'::jsonb)
  ) INTO response;
  RETURN response;
END
$phase203_admin_readback$;

-- Conservative, source-backed import. These entries describe only artifacts
-- that exist in the accepted source tree. They carry no verification receipts,
-- product claims, tenant activations, or public eligibility.
WITH seed(
  capability_id,capability_key,capability_version,display_name,purpose,kind,owner,lifecycle_state,
  audience_status,production_readiness,source_reference,limitations
) AS (VALUES
  ('20300000-0001-4000-8000-000000000001'::uuid,'integration.tool.openai','1.0.0','OpenAI','Primary AI provider blueprint for command reasoning and vision analysis.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/openai',ARRAY['Connection state is environment-dependent and has no Phase 203 verification receipt.']::text[]),
  ('20300000-0001-4000-8000-000000000002'::uuid,'integration.tool.anthropic','1.0.0','Anthropic','Future alternate AI provider abstraction.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/anthropic',ARRAY['Source status is Coming Soon.']::text[]),
  ('20300000-0001-4000-8000-000000000003'::uuid,'integration.tool.local-llm','1.0.0','Local LLM placeholder','Future offline reasoning placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/local-llm',ARRAY['Source explicitly identifies this item as a placeholder.']::text[]),
  ('20300000-0001-4000-8000-000000000004'::uuid,'integration.tool.codex','1.0.0','Codex','Development operator blueprint for controlled code work.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','SIMULATED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/codex',ARRAY['Source status is Mock Mode.']::text[]),
  ('20300000-0001-4000-8000-000000000005'::uuid,'integration.tool.github','1.0.0','GitHub','Read-only repository status blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/github',ARRAY['Source defaults to Mock Mode and write actions are not represented as active.']::text[]),
  ('20300000-0001-4000-8000-000000000006'::uuid,'integration.tool.vercel','1.0.0','Vercel','Read-only deployment status blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/vercel',ARRAY['Source defaults to Mock Mode and has no Phase 203 verification receipt.']::text[]),
  ('20300000-0001-4000-8000-000000000007'::uuid,'integration.tool.gmail','1.0.0','Gmail','Future outbound email connection blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/gmail',ARRAY['Outbound communication remains approval-gated and unverified.']::text[]),
  ('20300000-0001-4000-8000-000000000008'::uuid,'integration.tool.outlook-mail','1.0.0','Outlook placeholder','Future Outlook mail placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/outlook-mail',ARRAY['Source status is Coming Soon.']::text[]),
  ('20300000-0001-4000-8000-000000000009'::uuid,'integration.tool.google-calendar','1.0.0','Google Calendar','Future scheduling connection blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/google-calendar',ARRAY['Scheduling actions are not Phase 203 verified.']::text[]),
  ('20300000-0001-4000-8000-000000000010'::uuid,'integration.tool.printify','1.0.0','Printify','POD product drafting and publishing blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','SIMULATED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/printify',ARRAY['Source status is Mock Mode; publishing is not verified.']::text[]),
  ('20300000-0001-4000-8000-000000000011'::uuid,'integration.tool.printful','1.0.0','Printful','POD production connection blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/printful',ARRAY['No Phase 203 provider verification receipt exists.']::text[]),
  ('20300000-0001-4000-8000-000000000012'::uuid,'integration.tool.etsy','1.0.0','Etsy','Marketplace listing operations blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','SIMULATED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/etsy',ARRAY['Source status is Mock Mode; publishing is not verified.']::text[]),
  ('20300000-0001-4000-8000-000000000013'::uuid,'integration.tool.shopify','1.0.0','Shopify','Governed OAuth and draft storefront connector blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/shopify',ARRAY['Runtime connection state is tenant-specific and no Phase 203 activation evidence is attached.']::text[]),
  ('20300000-0001-4000-8000-000000000014'::uuid,'integration.tool.canva','1.0.0','Canva placeholder','Future design draft handoff placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/canva',ARRAY['Source status is Coming Soon and explicitly names a placeholder.']::text[]),
  ('20300000-0001-4000-8000-000000000015'::uuid,'integration.tool.kittl','1.0.0','Kittl placeholder','Future merch design operations placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/kittl',ARRAY['Source status is Coming Soon and explicitly names a placeholder.']::text[]),
  ('20300000-0001-4000-8000-000000000016'::uuid,'integration.tool.hostinger','1.0.0','Hostinger placeholder','Future website operations placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/hostinger',ARRAY['Source status is Coming Soon and explicitly names a placeholder.']::text[]),
  ('20300000-0001-4000-8000-000000000017'::uuid,'integration.tool.domain-provider','1.0.0','Domain provider placeholder','Future DNS and domain operations placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/domain-provider',ARRAY['Source status is Coming Soon and explicitly names a placeholder.']::text[]),
  ('20300000-0001-4000-8000-000000000018'::uuid,'integration.tool.web-search','1.0.0','Web Search','Future governed search connection blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','SIMULATED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/web-search',ARRAY['Source status is Mock Mode.']::text[]),
  ('20300000-0001-4000-8000-000000000019'::uuid,'integration.tool.competitor-research','1.0.0','Competitor Research placeholder','Future competitor research placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/competitor-research',ARRAY['Source status is Coming Soon and explicitly names a placeholder.']::text[]),
  ('20300000-0001-4000-8000-000000000020'::uuid,'integration.tool.google-drive','1.0.0','Google Drive','Future document storage connection blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/google-drive',ARRAY['File write behavior is not Phase 203 verified.']::text[]),
  ('20300000-0001-4000-8000-000000000021'::uuid,'integration.tool.local-uploads','1.0.0','Local Uploads','User-provided local upload handling blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','SIMULATED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/local-uploads',ARRAY['Source status is Mock Mode.']::text[]),
  ('20300000-0001-4000-8000-000000000022'::uuid,'integration.tool.stripe','1.0.0','Stripe placeholder','Disabled money-moving integration placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/stripe',ARRAY['Source status is Coming Soon; money-moving actions remain disabled.']::text[]),
  ('20300000-0001-4000-8000-000000000023'::uuid,'integration.tool.paypal','1.0.0','PayPal placeholder','Disabled money-moving integration placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/paypal',ARRAY['Source status is Coming Soon; money-moving actions remain disabled.']::text[]),
  ('20300000-0001-4000-8000-000000000024'::uuid,'integration.tool.social-publisher','1.0.0','Social Media Publisher placeholder','Future approval-gated social publishing placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/social-publisher',ARRAY['Source status is Coming Soon; posting is not active.']::text[]),
  ('20300000-0001-4000-8000-000000000025'::uuid,'integration.tool.browser-automation','1.0.0','Browser Automation','Future governed browser action blueprint.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','SIMULATED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/browser-automation',ARRAY['Source status is Mock Mode; browser actions are not active.']::text[]),
  ('20300000-0001-4000-8000-000000000026'::uuid,'integration.tool.analytics','1.0.0','Analytics placeholder','Future performance reporting placeholder.','INTEGRATION','UNASSIGNED','CATALOGUED','UNSUPPORTED','PLACEHOLDER','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/toolRegistry.ts#toolBlueprints/analytics',ARRAY['Source status is Coming Soon and explicitly names a placeholder.']::text[]),

  ('20300000-0002-4000-8000-000000000101'::uuid,'capability.agent-blueprint.public-research','1.0.0','Public web research','Designed public research agent capability blueprint.','CAPABILITY','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/agentCapabilities.ts#public-research',ARRAY['Required controls are designed but not Phase 203 verified.']::text[]),
  ('20300000-0002-4000-8000-000000000102'::uuid,'capability.agent-blueprint.restricted-network-research','1.0.0','Restricted network research','Policy-gated restricted research planning blueprint.','CAPABILITY','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/agentCapabilities.ts#restricted-network-research',ARRAY['Source states this is planning, not an unrestricted crawler.']::text[]),
  ('20300000-0002-4000-8000-000000000103'::uuid,'capability.agent-blueprint.business-discovery','1.0.0','Business discovery','Designed lead discovery and compliant outreach routing blueprint.','CAPABILITY','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/agentCapabilities.ts#business-discovery',ARRAY['Contact policy, allowlist, and quota controls are not Phase 203 verified.']::text[]),
  ('20300000-0002-4000-8000-000000000104'::uuid,'capability.agent-blueprint.shopify-operations','1.0.0','Shopify operations','Designed approval-gated commerce operations blueprint.','CAPABILITY','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/agentCapabilities.ts#shopify-operations',ARRAY['Credential, approval, and rollback controls require evidence before activation.']::text[]),
  ('20300000-0002-4000-8000-000000000105'::uuid,'capability.agent-blueprint.app-builder','1.0.0','App builder','Designed application build delegation blueprint.','CAPABILITY','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/agentCapabilities.ts#app-builder',ARRAY['Deployment and test gates have no capability-specific Phase 203 receipt.']::text[]),
  ('20300000-0002-4000-8000-000000000106'::uuid,'capability.agent-blueprint.brand-operations','1.0.0','Brand operations','Designed brand and commerce coordination blueprint.','CAPABILITY','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/agentCapabilities.ts#brand-operations',ARRAY['Supplier, brand safety, and spend controls are unverified.']::text[]),
  ('20300000-0002-4000-8000-000000000107'::uuid,'capability.agent-blueprint.tool-orchestration','1.0.0','Tool orchestration','Designed governed tool orchestration blueprint.','CAPABILITY','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/agentCapabilities.ts#tool-orchestration',ARRAY['Execution controls are not capability-certified.']::text[]),
  ('20300000-0002-4000-8000-000000000108'::uuid,'capability.agent-blueprint.governance','1.0.0','Governance layer','Designed policy, quota, audit, and safe-execution blueprint.','CAPABILITY','UNASSIGNED','CATALOGUED','UNSUPPORTED','UNVERIFIED','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:backend/src/services/agentCapabilities.ts#governance',ARRAY['Blueprint existence is not active runtime verification.']::text[]),

  ('20300000-0003-4000-8000-000000000201'::uuid,'agent.preset.price-scraper','1.0.0','Price Scraper','Guided policy-gated agent template for public price monitoring.','AGENT','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/AgentTemplateGallery.tsx#Price-Scraper',ARRAY['Frontend template only; no execution receipt.']::text[]),
  ('20300000-0003-4000-8000-000000000202'::uuid,'agent.preset.daily-research-brief','1.0.0','Daily Research Brief','Guided agent template for recurring public research briefs.','AGENT','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/AgentTemplateGallery.tsx#Daily-Research-Brief',ARRAY['Frontend template only; no execution receipt.']::text[]),
  ('20300000-0003-4000-8000-000000000203'::uuid,'agent.preset.linkedin-poster','1.0.0','LinkedIn Poster','Guided agent template for drafting social posts.','AGENT','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/AgentTemplateGallery.tsx#LinkedIn-Poster',ARRAY['Draft template only; no publishing capability is active.']::text[]),
  ('20300000-0003-4000-8000-000000000204'::uuid,'agent.preset.conversation-auditor','1.0.0','Conversation Auditor','Guided agent template for summaries and follow-up extraction.','AGENT','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/AgentTemplateGallery.tsx#Conversation-Auditor',ARRAY['Frontend template only; no capability verification receipt.']::text[]),
  ('20300000-0003-4000-8000-000000000205'::uuid,'agent.preset.account-qualifier','1.0.0','Account Qualifier','Guided agent template for public account qualification.','AGENT','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/AgentTemplateGallery.tsx#Account-Qualifier',ARRAY['Frontend template only; no capability verification receipt.']::text[]),
  ('20300000-0003-4000-8000-000000000206'::uuid,'agent.preset.qa-runner','1.0.0','QA Runner','Guided agent template for browser workflow QA.','AGENT','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/AgentTemplateGallery.tsx#QA-Runner',ARRAY['Frontend template only; browser execution is not activated by the registry.']::text[]),
  ('20300000-0003-4000-8000-000000000207'::uuid,'agent.preset.queue-triage','1.0.0','Queue Triage','Guided agent template for classifying and routing work.','AGENT','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/AgentTemplateGallery.tsx#Queue-Triage',ARRAY['Frontend template only; no capability verification receipt.']::text[]),
  ('20300000-0003-4000-8000-000000000208'::uuid,'agent.preset.security-watch','1.0.0','Security Watch','Guided agent template for reviewing governance logs.','AGENT','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/AgentTemplateGallery.tsx#Security-Watch',ARRAY['Frontend template only; it is not a security scan or active monitor.']::text[]),

  ('20300000-0004-4000-8000-000000000301'::uuid,'commander-pack.local.pod-merch-store','1.0.0','POD / Merch Business','Client-side hierarchy template for a POD or merch business.','COMMANDER_PACK','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/NeuronsCommandCenter.tsx#businessTemplates/pod-merch-store',ARRAY['Client-side template; provider execution and publishing are not implied.']::text[]),
  ('20300000-0004-4000-8000-000000000302'::uuid,'commander-pack.local.website-agency','1.0.0','Website Agency','Client-side hierarchy template for website agency operations.','COMMANDER_PACK','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/NeuronsCommandCenter.tsx#businessTemplates/website-agency',ARRAY['Client-side template; deployment is not implied.']::text[]),
  ('20300000-0004-4000-8000-000000000303'::uuid,'commander-pack.local.content-agency','1.0.0','Content Agency','Client-side hierarchy template for content operations.','COMMANDER_PACK','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/NeuronsCommandCenter.tsx#businessTemplates/content-agency',ARRAY['Client-side template; publishing is not implied.']::text[]),
  ('20300000-0004-4000-8000-000000000304'::uuid,'commander-pack.local.ecommerce-brand','1.0.0','E-commerce Brand','Client-side hierarchy template for e-commerce brand operations.','COMMANDER_PACK','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/NeuronsCommandCenter.tsx#businessTemplates/ecommerce-brand',ARRAY['Client-side template; checkout and provider activation are not implied.']::text[]),
  ('20300000-0004-4000-8000-000000000305'::uuid,'commander-pack.local.saas-startup','1.0.0','SaaS Startup','Client-side hierarchy template for SaaS planning.','COMMANDER_PACK','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/NeuronsCommandCenter.tsx#businessTemplates/saas-startup',ARRAY['Client-side planning template; build or deployment is not implied.']::text[]),
  ('20300000-0004-4000-8000-000000000306'::uuid,'commander-pack.local.local-service-business','1.0.0','Local Service Business','Client-side hierarchy template for local service operations.','COMMANDER_PACK','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/NeuronsCommandCenter.tsx#businessTemplates/local-service-business',ARRAY['Client-side planning template; lead and SEO provider execution are not implied.']::text[]),
  ('20300000-0004-4000-8000-000000000307'::uuid,'commander-pack.local.custom-blank-structure','1.0.0','Custom Blank Structure','Minimal client-side editable business hierarchy template.','COMMANDER_PACK','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/NeuronsCommandCenter.tsx#businessTemplates/custom-blank-structure',ARRAY['Client-side editable structure only.']::text[]),
  ('20300000-0005-4000-8000-000000000401'::uuid,'workflow.local.client-merch-store-launch','1.0.0','Client Merch Store Launch','Fourteen-step client-side merch launch task planning workflow.','WORKFLOW','UNASSIGNED','CATALOGUED','UNSUPPORTED','LOCAL_ONLY','mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/lib/merch-workflow.ts#merchLaunchWorkflowSteps',ARRAY['Source records workflow tasks locally and explicitly states backend execution evidence is pending.']::text[])
)
INSERT INTO entral.capability_records(
  capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
  environment,scope,lifecycle_state,audience_status,production_readiness,
  activation_requirements,public_claim_eligible,rollback_path,deactivation_path,
  source_reference,limitations
)
SELECT capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
  'PRODUCTION','GLOBAL',lifecycle_state,audience_status,production_readiness,
  '[]'::jsonb,false,
  'Retain the prior registry revision and remove no source/runtime capability automatically.',
  'Keep unpublished, deactivate any tenant installation, then transition through DEPRECATED to RETIRED.',
  source_reference,limitations
FROM seed;

INSERT INTO entral.capability_records(
  capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
  environment,scope,lifecycle_state,audience_status,production_readiness,
  activation_requirements,public_claim_eligible,rollback_path,deactivation_path,
  source_reference,limitations
) VALUES
  ('20300000-0001-4000-8000-000000000027'::uuid,'integration.tool.outlook-calendar','1.0.0','Outlook Calendar placeholder',
   'Legacy frontend-only Outlook Calendar integration catalogue entry.','INTEGRATION','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','PLACEHOLDER','[]'::jsonb,false,
   'Retain the prior registry revision and remove no source/runtime capability automatically.',
   'Keep unpublished, deactivate any tenant installation, then transition through DEPRECATED to RETIRED.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/lib/tool-registry.ts#outlook-calendar',
   ARRAY['This identifier exists only in the legacy frontend static registry and has no backend tool blueprint.','The source identifies it as coming soon; no provider operation or verification receipt exists.']::text[]),
  ('20300000-0006-4000-8000-000000000501'::uuid,'capability.tutorial.module.command-guide','200.0.0','Command','Phase 200 Tutorial Command module source.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#command-guide',ARRAY['Source presence only; Phase 200 release receipts are not imported.','Tutorial presence does not establish public claim eligibility.']::text[]),
  ('20300000-0006-4000-8000-000000000502'::uuid,'capability.tutorial.module.business-guide','200.0.0','Businesses','Phase 200 Tutorial Businesses module source.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#business-guide',ARRAY['Source presence only; Phase 200 release receipts are not imported.','Tutorial presence does not establish public claim eligibility.']::text[]),
  ('20300000-0006-4000-8000-000000000503'::uuid,'capability.tutorial.module.hierarchy-guide','200.0.0','Universe','Phase 200 Tutorial Universe module source.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#hierarchy-guide',ARRAY['Source presence only; Phase 200 release receipts are not imported.','Tutorial presence does not establish public claim eligibility.']::text[]),
  ('20300000-0006-4000-8000-000000000504'::uuid,'capability.tutorial.module.operations-guide','200.0.0','Records and help','Phase 200 Tutorial Records and help module source.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#operations-guide',ARRAY['Source presence only; Phase 200 release receipts are not imported.','Tutorial presence does not establish public claim eligibility.']::text[]),
  ('20300000-0006-4000-8000-000000000505'::uuid,'capability.tutorial.step.command-overview','200.0.0','Start from Command','Phase 200 Tutorial Command overview step and contract anchor.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#command-overview',ARRAY['UI and contract anchor presence does not import production journey or persistence receipts.','Tutorial step presence does not establish public claim eligibility.']::text[]),
  ('20300000-0006-4000-8000-000000000506'::uuid,'capability.tutorial.step.businesses-overview','200.0.0','Review canonical businesses','Phase 200 Tutorial Businesses overview step and contract anchor.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#businesses-overview',ARRAY['UI and contract anchor presence does not import production journey or persistence receipts.','Tutorial step presence does not establish public claim eligibility.']::text[]),
  ('20300000-0006-4000-8000-000000000507'::uuid,'capability.tutorial.step.universe-navigation','200.0.0','Navigate Universe','Phase 200 Tutorial Universe navigation step and contract anchor.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#universe-navigation',ARRAY['UI and contract anchor presence does not import production journey or persistence receipts.','Tutorial step presence does not establish public claim eligibility.']::text[]),
  ('20300000-0006-4000-8000-000000000508'::uuid,'capability.tutorial.step.infrastructure-records','200.0.0','Inspect source records','Phase 200 Tutorial Infrastructure records step and contract anchor.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#infrastructure-records',ARRAY['UI and contract anchor presence does not import production journey or persistence receipts.','Tutorial step presence does not establish public claim eligibility.']::text[]),
  ('20300000-0006-4000-8000-000000000509'::uuid,'capability.tutorial.step.entral-assistant','200.0.0','Use contextual ENTRAL help','Phase 200 Tutorial contextual assistant step and contract anchor.','CAPABILITY','UNASSIGNED','PRODUCTION','GLOBAL','CATALOGUED','UNSUPPORTED','UNVERIFIED','[]'::jsonb,false,
   'Retain the prior registry revision and the certified Phase 200 Tutorial implementation.','Keep unpublished and transition through DEPRECATED to RETIRED only with replacement evidence.',
   'mykai05/ENTRAL-0.2@bdceb245ab7d94530f31e4293536497adcad4542:frontend/components/OnboardingTour.tsx#entral-assistant',ARRAY['UI and contract anchor presence does not import production journey or persistence receipts.','Tutorial step presence does not establish public claim eligibility.']::text[]);

DO $phase203_seed_assertion$
DECLARE seeded_count integer;
BEGIN
  SELECT count(*) INTO seeded_count FROM entral.capability_records;
  IF seeded_count<>60 THEN
    RAISE EXCEPTION 'Phase 203 conservative source inventory must seed exactly 60 records, found %',seeded_count;
  END IF;
  IF EXISTS (
    SELECT 1 FROM entral.capability_records
    WHERE lifecycle_state<>'CATALOGUED' OR owner<>'UNASSIGNED'
      OR audience_status<>'UNSUPPORTED'
      OR public_claim_eligible OR lifecycle_state IN ('ACTIVE','SELLABLE')
  ) OR EXISTS (SELECT 1 FROM entral.product_claims)
    OR EXISTS (SELECT 1 FROM entral.tenant_capability_installations) THEN
    RAISE EXCEPTION 'Phase 203 source inventory seed attempted an unsupported promotion or public claim';
  END IF;
END
$phase203_seed_assertion$;

CREATE OR REPLACE FUNCTION entral.phase203_internal_read_allows()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_internal_read$
  SELECT entral.phase203_admin_access_allows()
    OR pg_has_role(session_user,'entral_verifier','USAGE')
    OR pg_has_role(session_user,'entral_audit_reader','USAGE')
$phase203_internal_read$;

ALTER TABLE entral.capability_registry_revision ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.capability_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.capability_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.capability_verification_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.tenant_capability_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.product_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.product_claim_evidence_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.capability_transition_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.product_claim_transition_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.capability_mutation_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE entral.publication_decision_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY phase203_internal_revision_select ON entral.capability_registry_revision
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_capability_select ON entral.capability_records
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_dependency_select ON entral.capability_dependencies
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_receipt_select ON entral.capability_verification_receipts
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_installation_select ON entral.tenant_capability_installations
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_claim_select ON entral.product_claims
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_claim_evidence_select ON entral.product_claim_evidence_receipts
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_transition_select ON entral.capability_transition_audit
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_claim_transition_select ON entral.product_claim_transition_audit
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_mutation_receipt_select ON entral.capability_mutation_receipts
  FOR SELECT USING (entral.phase203_internal_read_allows());
CREATE POLICY phase203_internal_publication_audit_select ON entral.publication_decision_audit
  FOR SELECT USING (entral.phase203_internal_read_allows());

DO $phase203_revoke_public_execute$
DECLARE function_record record;
BEGIN
  FOR function_record IN
    SELECT function.oid::regprocedure AS identity
    FROM pg_proc function
    JOIN pg_namespace namespace ON namespace.oid=function.pronamespace
    WHERE namespace.nspname='entral' AND function.proname LIKE 'phase203\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',function_record.identity);
  END LOOP;
END
$phase203_revoke_public_execute$;

COMMENT ON TABLE entral.capability_records IS
  'Phase 203 canonical capability truth records. Seeds are conservative and never public by existence alone.';
COMMENT ON FUNCTION entral.phase203_publication_gate(text,text,uuid,uuid) IS
  'Fail-closed Product Publication Gateway; emits only effective SELLABLE claims after fresh evidence, dependency, and tenant checks.';
COMMENT ON FUNCTION entral.phase203_transition_capability(jsonb) IS
  'Expected-revision, idempotent, evidence-bound capability lifecycle transition authority.';
COMMENT ON FUNCTION entral.phase203_record_capability_evidence(uuid,bigint,jsonb,text) IS
  'Append-only, idempotent Phase 203 verification receipt recorder.';

COMMIT;
