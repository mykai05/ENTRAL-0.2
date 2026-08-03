BEGIN;

SET LOCAL search_path = pg_catalog, public, entral, pg_temp;

-- Phase 204 is a tenant-bound internal revenue activation.  It extends the
-- Phase 203 truth registry without changing any public product-claim rule.
ALTER TABLE entral.capability_transition_audit
  DROP CONSTRAINT capability_transition_audit_release_version_check,
  ADD CONSTRAINT capability_transition_audit_release_version_check
    CHECK (release_version IN ('phase-203','phase-204'));

ALTER TABLE entral.tenant_capability_installation_audit
  DROP CONSTRAINT tenant_capability_installation_audit_release_version_check,
  ADD CONSTRAINT tenant_capability_installation_audit_release_version_check
    CHECK (release_version IN ('phase-203','phase-204'));

CREATE TABLE entral.phase204_mutation_receipts (
  mutation_receipt_id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(),
  operation text NOT NULL CHECK (operation IN (
    'REGISTER_CAPABILITY','RECORD_CAPABILITY_EVIDENCE','BIND_CAPABILITY_REQUIREMENT','CAPABILITY_TRANSITION',
    'REGISTER_INSTALLATION','TRANSITION_INSTALLATION','ACTIVATE_INTERNAL_COMMERCE',
    'REGISTER_PRODUCT_EVIDENCE','REGISTER_PRODUCT_ASSET','RECORD_PRODUCT_GATE','RECORD_STOREFRONT_STATE',
    'OWNER_PUBLICATION_APPROVAL','RECORD_LISTING_STATE','INGEST_PROVIDER_FACT',
    'RECORD_METRIC_TRUTH','SET_COMMERCE_CONTROL'
  )),
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  capability_id uuid,
  installation_id uuid,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 12 AND 255),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  response_snapshot jsonb NOT NULL CHECK (jsonb_typeof(response_snapshot)='object'),
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  release_version text NOT NULL DEFAULT 'phase-204' CHECK (release_version='phase-204'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (operation,idempotency_key),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (capability_id) REFERENCES entral.capability_records(capability_id) ON DELETE RESTRICT,
  FOREIGN KEY (installation_id) REFERENCES entral.tenant_capability_installations(installation_id) ON DELETE RESTRICT
);

CREATE TABLE entral.phase204_capability_source_bindings (
  tenant_capability_id uuid NOT NULL,
  tenant_capability_version text NOT NULL,
  catalog_capability_id uuid NOT NULL,
  catalog_capability_version text NOT NULL,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  implementation_reference text NOT NULL CHECK (length(btrim(implementation_reference)) BETWEEN 1 AND 2000),
  created_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_capability_id,tenant_capability_version),
  UNIQUE (tenant_id,organization_id,catalog_capability_id,catalog_capability_version),
  FOREIGN KEY (tenant_capability_id,tenant_capability_version)
    REFERENCES entral.capability_records(capability_id,capability_version) ON DELETE RESTRICT,
  FOREIGN KEY (catalog_capability_id,catalog_capability_version)
    REFERENCES entral.capability_records(capability_id,capability_version) ON DELETE RESTRICT,
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  CHECK (tenant_capability_id<>catalog_capability_id)
);

CREATE TABLE entral.phase204_business_capability_installations (
  installation_id uuid PRIMARY KEY REFERENCES entral.tenant_capability_installations(installation_id) ON DELETE RESTRICT,
  business_boundary_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  created_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE TABLE entral.phase204_internal_commerce_activations (
  activation_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  canonical_business_id uuid NOT NULL REFERENCES entral.businesses(id) ON DELETE RESTRICT,
  commander_id uuid NOT NULL REFERENCES entral.entities(id) ON DELETE RESTRICT,
  marshal_id uuid NOT NULL REFERENCES entral.entities(id) ON DELETE RESTRICT,
  general_id uuid NOT NULL REFERENCES entral.entities(id) ON DELETE RESTRICT,
  launch_mission_id uuid NOT NULL REFERENCES entral.missions(id) ON DELETE RESTRICT,
  governance_action_id uuid NOT NULL REFERENCES entral.governance_actions(id) ON DELETE RESTRICT,
  source_record_id uuid NOT NULL REFERENCES entral.source_records(id) ON DELETE RESTRICT,
  evidence_artifact_id uuid NOT NULL REFERENCES entral.artifacts(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  idempotency_key text NOT NULL UNIQUE CHECK (length(idempotency_key) BETWEEN 12 AND 255),
  request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
  response_snapshot jsonb NOT NULL CHECK (jsonb_typeof(response_snapshot)='object'),
  release_version text NOT NULL DEFAULT 'phase-204' CHECK (release_version='phase-204'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE TABLE entral.phase204_internal_commerce_products (
  product_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  canonical_business_id uuid NOT NULL REFERENCES entral.businesses(id) ON DELETE RESTRICT,
  stable_code text NOT NULL UNIQUE,
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  product_kind text NOT NULL CHECK (product_kind IN ('PRODUCT','BUNDLE')),
  product_version text NOT NULL CHECK (product_version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'),
  initial_price numeric(12,2) NOT NULL CHECK (initial_price>0),
  product_code text GENERATED ALWAYS AS (stable_code) STORED,
  price_cents integer GENERATED ALWAYS AS ((initial_price*100)::integer) STORED,
  currency char(3) NOT NULL DEFAULT 'USD' CHECK (currency='USD'),
  created_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id,organization_id,stable_code),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT,
  CHECK ((stable_code,product_kind,(initial_price*100)::integer) IN (
    ('LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT','PRODUCT',2900),
    ('SCOPE_CHANGE_ORDER_CONTROL_PACK','PRODUCT',4900),
    ('BILLING_COLLECTIONS_ACCELERATOR','PRODUCT',4900),
    ('WEEKLY_OWNER_COMMAND_DASHBOARD','PRODUCT',3900),
    ('COMPLETE_CONTRACTOR_CONTROL_BUNDLE','BUNDLE',11900)
  ))
);

CREATE TABLE entral.phase204_product_bundle_items (
  bundle_product_id uuid NOT NULL REFERENCES entral.phase204_internal_commerce_products(product_id) ON DELETE RESTRICT,
  component_product_id uuid NOT NULL REFERENCES entral.phase204_internal_commerce_products(product_id) ON DELETE RESTRICT,
  ordinal smallint NOT NULL CHECK (ordinal BETWEEN 1 AND 32),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (bundle_product_id,component_product_id),
  UNIQUE (bundle_product_id,ordinal),
  CHECK (bundle_product_id<>component_product_id)
);

CREATE TABLE entral.phase204_product_assets (
  product_asset_id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES entral.phase204_internal_commerce_products(product_id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  artifact_id uuid NOT NULL REFERENCES entral.artifacts(id) ON DELETE RESTRICT,
  asset_role text NOT NULL CHECK (asset_role IN (
    'EDITABLE_SOURCE','FINAL_DELIVERY','INSTRUCTIONS','IMPLEMENTATION_GUIDANCE','EXAMPLE',
    'TRACKING_TOOL','VERSION_INFORMATION','SUPPORT_INSTRUCTIONS','LICENSE_TERMS'
  )),
  asset_version text NOT NULL CHECK (asset_version ~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  file_name text NOT NULL CHECK (length(btrim(file_name)) BETWEEN 1 AND 255),
  media_type text NOT NULL CHECK (media_type ~ '^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+$'),
  editable boolean NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size>0),
  source_reference text NOT NULL CHECK (source_reference ~ '^[^@[:space:]]+@[0-9a-f]{40}:.+'),
  readiness text NOT NULL CHECK (readiness='FINAL'),
  license_status text NOT NULL CHECK (license_status='CLEARED'),
  original_work boolean NOT NULL,
  delivery_ready boolean NOT NULL,
  created_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (product_id,asset_role,asset_version,content_sha256),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE INDEX phase204_product_assets_current_idx
  ON entral.phase204_product_assets(product_id,asset_role,created_at DESC);

CREATE TABLE entral.phase204_product_gate_receipts (
  gate_receipt_id uuid PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES entral.phase204_internal_commerce_products(product_id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  gate_type text NOT NULL CHECK (gate_type IN (
    'ORIGINALITY','LICENSING','CLAIMS','AI_DISCLOSURE','FILE_INTEGRITY','DELIVERY_READINESS'
  )),
  status text NOT NULL CHECK (status IN ('PASSED','FAILED')),
  evidence_source_record_id uuid REFERENCES entral.source_records(id) ON DELETE RESTRICT,
  evidence_artifact_id uuid REFERENCES entral.artifacts(id) ON DELETE RESTRICT,
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  assertion_summary text NOT NULL CHECK (length(btrim(assertion_summary)) BETWEEN 1 AND 2000),
  gate_payload jsonb NOT NULL CHECK (jsonb_typeof(gate_payload)='object'),
  evidence_ids uuid[] NOT NULL CHECK (cardinality(evidence_ids)>0),
  assessed_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  assessed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((evidence_source_record_id IS NOT NULL)::int+(evidence_artifact_id IS NOT NULL)::int=1),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE INDEX phase204_product_gate_current_idx
  ON entral.phase204_product_gate_receipts(product_id,gate_type,assessed_at DESC,gate_receipt_id DESC);

CREATE TABLE entral.phase204_storefronts (
  storefront_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  canonical_business_id uuid NOT NULL REFERENCES entral.businesses(id) ON DELETE RESTRICT,
  preferred_provider text NOT NULL DEFAULT 'ETSY' CHECK (preferred_provider='ETSY'),
  created_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (tenant_id,organization_id,canonical_business_id),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE TABLE entral.phase204_storefront_state_events (
  storefront_state_event_id uuid PRIMARY KEY,
  storefront_id uuid NOT NULL REFERENCES entral.phase204_storefronts(storefront_id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('ETSY','GUMROAD')),
  state text NOT NULL CHECK (state IN (
    'OWNER_ACTION_REQUIRED','BLOCKED','READY_FOR_OWNER_APPROVAL','PUBLISHED','PAUSED','DISABLED'
  )),
  public_brand text CHECK (public_brand IS NULL OR length(btrim(public_brand)) BETWEEN 1 AND 160),
  market_evidence_source_record_id uuid REFERENCES entral.source_records(id) ON DELETE RESTRICT,
  provider_policy_source_record_id uuid REFERENCES entral.source_records(id) ON DELETE RESTRICT,
  provider_policy_evidence_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  etsy_blocker_code text CHECK (etsy_blocker_code IS NULL OR etsy_blocker_code IN (
    'ACCOUNT_CREATION','ADDRESS_VERIFICATION','BANKING_VERIFICATION','IDENTITY_VERIFICATION','PROVIDER_RESTRICTION'
  )),
  etsy_blocker_evidence_source_record_id uuid REFERENCES entral.source_records(id) ON DELETE RESTRICT,
  state_reason text NOT NULL CHECK (length(btrim(state_reason)) BETWEEN 1 AND 2000),
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    provider<>'GUMROAD'
    OR (etsy_blocker_code IS NOT NULL AND etsy_blocker_evidence_source_record_id IS NOT NULL)
  ),
  CHECK (state NOT IN ('READY_FOR_OWNER_APPROVAL','PUBLISHED') OR (public_brand IS NOT NULL
    AND market_evidence_source_record_id IS NOT NULL AND provider_policy_source_record_id IS NOT NULL
    AND cardinality(provider_policy_evidence_ids)>0)),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE INDEX phase204_storefront_state_current_idx
  ON entral.phase204_storefront_state_events(storefront_id,occurred_at DESC,storefront_state_event_id DESC);

CREATE TABLE entral.phase204_publication_approval_envelopes (
  approval_id uuid PRIMARY KEY,
  storefront_id uuid NOT NULL REFERENCES entral.phase204_storefronts(storefront_id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('ETSY','GUMROAD')),
  public_brand text NOT NULL CHECK (length(btrim(public_brand)) BETWEEN 1 AND 160),
  product_manifest_sha256 text NOT NULL CHECK (product_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  asset_manifest_sha256 text NOT NULL CHECK (asset_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  claims_manifest_sha256 text NOT NULL CHECK (claims_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  license_manifest_sha256 text NOT NULL CHECK (license_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  ai_disclosure_manifest_sha256 text NOT NULL CHECK (ai_disclosure_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  maximum_setup_spend numeric(12,2) NOT NULL CHECK (maximum_setup_spend BETWEEN 0 AND 150),
  setup_spend_currency char(3) NOT NULL DEFAULT 'USD' CHECK (setup_spend_currency='USD'),
  paid_advertising_budget numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_advertising_budget=0),
  maximum_setup_spend_cents integer NOT NULL CHECK (maximum_setup_spend_cents BETWEEN 0 AND 15000),
  paid_advertising_budget_cents integer NOT NULL CHECK (paid_advertising_budget_cents=0),
  publication_envelope_sha256 text NOT NULL CHECK (publication_envelope_sha256 ~ '^[0-9a-f]{64}$'),
  supersedes_approval_id uuid REFERENCES entral.phase204_publication_approval_envelopes(approval_id) ON DELETE RESTRICT,
  approved_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  approved_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE INDEX phase204_publication_approval_current_idx
  ON entral.phase204_publication_approval_envelopes(storefront_id,approved_at DESC,approval_id DESC);

CREATE TABLE entral.phase204_provider_facts (
  provider_fact_id uuid PRIMARY KEY,
  storefront_id uuid NOT NULL REFERENCES entral.phase204_storefronts(storefront_id) ON DELETE RESTRICT,
  product_id uuid REFERENCES entral.phase204_internal_commerce_products(product_id) ON DELETE RESTRICT,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('ETSY','GUMROAD')),
  fact_type text NOT NULL CHECK (fact_type IN (
    'LISTING','ORDER','SALE','FEE','REFUND','DISPUTE','MESSAGE','DELIVERY','PAYOUT'
  )),
  fact_state text NOT NULL CHECK (fact_state IN ('OBSERVED','UNAVAILABLE')),
  outcome text NOT NULL CHECK (length(btrim(outcome)) BETWEEN 1 AND 120),
  provider_external_reference_sha256 text CHECK (
    provider_external_reference_sha256 IS NULL OR provider_external_reference_sha256 ~ '^[0-9a-f]{64}$'
  ),
  amount numeric(20,4) CHECK (amount IS NULL OR amount>=0),
  amount_cents bigint CHECK (amount_cents IS NULL OR amount_cents>=0),
  currency char(3) CHECK (currency IS NULL OR currency='USD'),
  quantity integer CHECK (quantity IS NULL OR quantity>=0),
  fee_category text CHECK (fee_category IS NULL OR fee_category IN ('PLATFORM','PAYMENT_PROCESSING','OTHER')),
  unavailable_reason text CHECK (unavailable_reason IS NULL OR length(btrim(unavailable_reason)) BETWEEN 1 AND 2000),
  evidence_source_record_id uuid REFERENCES entral.source_records(id) ON DELETE RESTRICT,
  evidence_artifact_id uuid REFERENCES entral.artifacts(id) ON DELETE RESTRICT,
  evidence_sha256 text NOT NULL CHECK (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL,
  captured_at timestamptz NOT NULL,
  recorded_by_actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((evidence_source_record_id IS NOT NULL)::int+(evidence_artifact_id IS NOT NULL)::int=1),
  CHECK (
    (fact_state='OBSERVED' AND provider_external_reference_sha256 IS NOT NULL AND unavailable_reason IS NULL)
    OR (fact_state='UNAVAILABLE' AND provider_external_reference_sha256 IS NULL AND unavailable_reason IS NOT NULL
        AND amount IS NULL AND amount_cents IS NULL AND currency IS NULL AND quantity IS NULL AND fee_category IS NULL)
  ),
  CHECK (fact_state<>'OBSERVED' OR fact_type NOT IN ('SALE','FEE','REFUND','PAYOUT') OR (amount_cents IS NOT NULL AND currency IS NOT NULL)),
  CHECK (amount IS NULL),
  CHECK (fact_type<>'LISTING' OR product_id IS NOT NULL),
  CHECK ((fact_state='OBSERVED' AND fact_type='FEE')=(fee_category IS NOT NULL)),
  UNIQUE (storefront_id,provider,fact_type,provider_external_reference_sha256),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE INDEX phase204_provider_facts_readback_idx
  ON entral.phase204_provider_facts(storefront_id,fact_type,fact_state,occurred_at DESC);

CREATE TABLE entral.phase204_commerce_control_events (
  control_event_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  canonical_business_id uuid NOT NULL REFERENCES entral.businesses(id) ON DELETE RESTRICT,
  state text NOT NULL CHECK (state IN ('ACTIVE','PAUSED','PUBLICATION_DISABLED','KILLED')),
  reason text CHECK (reason IS NULL OR length(btrim(reason)) BETWEEN 1 AND 2000),
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);

CREATE INDEX phase204_commerce_control_current_idx
  ON entral.phase204_commerce_control_events(business_boundary_id,occurred_at DESC,control_event_id DESC);

-- Exact per-product publication truth.  A storefront state is not a substitute
-- for the five provider listings, and a product approval is not transferable.
CREATE TABLE entral.phase204_storefront_listing_records (
  listing_record_id uuid PRIMARY KEY,
  storefront_id uuid NOT NULL REFERENCES entral.phase204_storefronts(storefront_id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES entral.phase204_internal_commerce_products(product_id) ON DELETE RESTRICT,
  product_code text NOT NULL,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('ETSY','GUMROAD')),
  provider_listing_id text CHECK (provider_listing_id IS NULL OR length(btrim(provider_listing_id)) BETWEEN 1 AND 300),
  provider_listing_id_sha256 text CHECK (
    provider_listing_id_sha256 IS NULL OR provider_listing_id_sha256 ~ '^[0-9a-f]{64}$'
  ),
  status text NOT NULL CHECK (status IN (
    'DRAFT','READY_FOR_OWNER_APPROVAL','PUBLISHED','PAUSED','DISABLED'
  )),
  price_cents integer NOT NULL CHECK (price_cents>0),
  delivery_manifest_sha256 text NOT NULL CHECK (delivery_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  claims_manifest_sha256 text NOT NULL CHECK (claims_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  approval_id uuid REFERENCES entral.phase204_publication_approval_envelopes(approval_id) ON DELETE RESTRICT,
  provider_evidence_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  published_at timestamptz,
  observed_at timestamptz,
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((status='PUBLISHED')=(provider_listing_id IS NOT NULL AND provider_listing_id_sha256 IS NOT NULL AND published_at IS NOT NULL
    AND observed_at IS NOT NULL AND approval_id IS NOT NULL AND cardinality(provider_evidence_ids)>0)),
  CHECK (status<>'PUBLISHED' OR observed_at>=published_at),
  CHECK ((product_code,price_cents) IN (
    ('LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT',2900),
    ('SCOPE_CHANGE_ORDER_CONTROL_PACK',4900),
    ('BILLING_COLLECTIONS_ACCELERATOR',4900),
    ('WEEKLY_OWNER_COMMAND_DASHBOARD',3900),
    ('COMPLETE_CONTRACTOR_CONTROL_BUNDLE',11900)
  )),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);
CREATE INDEX phase204_listing_current_idx
  ON entral.phase204_storefront_listing_records(storefront_id,product_id,created_at DESC,listing_record_id DESC);

CREATE TABLE entral.phase204_publication_product_approvals (
  product_approval_id uuid PRIMARY KEY DEFAULT public.gen_random_uuid(),
  approval_id uuid NOT NULL REFERENCES entral.phase204_publication_approval_envelopes(approval_id) ON DELETE RESTRICT,
  storefront_id uuid NOT NULL REFERENCES entral.phase204_storefronts(storefront_id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES entral.phase204_internal_commerce_products(product_id) ON DELETE RESTRICT,
  product_code text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents>0),
  delivery_manifest_sha256 text NOT NULL CHECK (delivery_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  claims_manifest_sha256 text NOT NULL CHECK (claims_manifest_sha256 ~ '^[0-9a-f]{64}$'),
  approved boolean NOT NULL CHECK (approved),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (approval_id,product_id),
  CHECK ((product_code,price_cents) IN (
    ('LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT',2900),
    ('SCOPE_CHANGE_ORDER_CONTROL_PACK',4900),
    ('BILLING_COLLECTIONS_ACCELERATOR',4900),
    ('WEEKLY_OWNER_COMMAND_DASHBOARD',3900),
    ('COMPLETE_CONTRACTOR_CONTROL_BUNDLE',11900)
  ))
);

-- The authoritative metric surface is an append-only 9 x 6 matrix.  Missing
-- provider truth remains UNAVAILABLE; it is never inferred as numeric zero.
CREATE TABLE entral.phase204_operational_metric_truth (
  metric_truth_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  storefront_id uuid NOT NULL REFERENCES entral.phase204_storefronts(storefront_id) ON DELETE RESTRICT,
  scope_type text NOT NULL CHECK (scope_type IN ('BUSINESS','PRODUCT')),
  scope_code text NOT NULL,
  product_id uuid REFERENCES entral.phase204_internal_commerce_products(product_id) ON DELETE RESTRICT,
  metric_code text NOT NULL CHECK (metric_code IN (
    'GROSS_SALES','PLATFORM_FEES','PAYMENT_PROCESSING_FEES','REFUNDS','NET_RECEIPTS',
    'CONTRIBUTION_MARGIN','CONVERSION','SUPPORT_VOLUME','PRODUCT_PERFORMANCE'
  )),
  truth_state text NOT NULL CHECK (truth_state IN ('OBSERVED','UNAVAILABLE')),
  value_numeric numeric(30,8),
  unit text NOT NULL CHECK (unit IN ('USD_CENTS','RATIO','COUNT','SCORE')),
  currency char(3),
  provider_record_id uuid REFERENCES entral.phase204_provider_facts(provider_fact_id) ON DELETE RESTRICT,
  source_type text CHECK (source_type IN (
    'PROVIDER_TRANSACTION','PROVIDER_FEE','PROVIDER_REFUND','PROVIDER_ANALYTICS',
    'PROVIDER_MESSAGE','CANONICAL_CALCULATION'
  )),
  evidence_id uuid REFERENCES entral.source_records(id) ON DELETE RESTRICT,
  observed_at timestamptz,
  unavailable_reason text,
  is_estimate boolean NOT NULL DEFAULT false CHECK (NOT is_estimate),
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((scope_type='BUSINESS' AND scope_code='SP-COMMERCE-001' AND product_id IS NULL)
      OR (scope_type='PRODUCT' AND product_id IS NOT NULL AND scope_code IN (
        'LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT','SCOPE_CHANGE_ORDER_CONTROL_PACK',
        'BILLING_COLLECTIONS_ACCELERATOR','WEEKLY_OWNER_COMMAND_DASHBOARD',
        'COMPLETE_CONTRACTOR_CONTROL_BUNDLE'
      ))),
  CHECK ((metric_code IN ('GROSS_SALES','PLATFORM_FEES','PAYMENT_PROCESSING_FEES','REFUNDS',
      'NET_RECEIPTS','CONTRIBUTION_MARGIN') AND unit='USD_CENTS' AND currency='USD')
    OR (metric_code='CONVERSION' AND unit='RATIO' AND currency IS NULL)
    OR (metric_code='SUPPORT_VOLUME' AND unit='COUNT' AND currency IS NULL)
    OR (metric_code='PRODUCT_PERFORMANCE' AND unit='SCORE' AND currency IS NULL)),
  CHECK (metric_code<>'CONVERSION' OR value_numeric IS NULL OR value_numeric BETWEEN 0 AND 1),
  CHECK (value_numeric IS NULL OR metric_code IN ('NET_RECEIPTS','CONTRIBUTION_MARGIN') OR value_numeric>=0),
  CHECK (value_numeric IS NULL OR metric_code NOT IN (
    'GROSS_SALES','PLATFORM_FEES','PAYMENT_PROCESSING_FEES','REFUNDS','NET_RECEIPTS',
    'CONTRIBUTION_MARGIN','SUPPORT_VOLUME'
  ) OR value_numeric=trunc(value_numeric)),
  CHECK ((truth_state='OBSERVED' AND value_numeric IS NOT NULL AND provider_record_id IS NOT NULL
      AND source_type IS NOT NULL AND evidence_id IS NOT NULL AND observed_at IS NOT NULL
      AND unavailable_reason IS NULL)
    OR (truth_state='UNAVAILABLE' AND value_numeric IS NULL AND provider_record_id IS NULL
      AND source_type IS NULL AND evidence_id IS NULL AND observed_at IS NULL
      AND length(btrim(unavailable_reason)) BETWEEN 1 AND 2000)),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);
CREATE INDEX phase204_metric_truth_current_idx
  ON entral.phase204_operational_metric_truth(storefront_id,scope_type,scope_code,metric_code,created_at DESC,metric_truth_id DESC);

-- Three controls have independent availability, state, evidence, and versions.
CREATE TABLE entral.phase204_commerce_controls (
  control_record_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  business_boundary_id uuid NOT NULL,
  canonical_business_id uuid NOT NULL REFERENCES entral.businesses(id) ON DELETE RESTRICT,
  control_code text NOT NULL CHECK (control_code IN (
    'PAUSE_BUSINESS','DISABLE_PUBLICATION','KILL_BUSINESS'
  )),
  availability text NOT NULL CHECK (availability='AVAILABLE'),
  control_state text NOT NULL CHECK (control_state IN ('ARMED','ENGAGED')),
  requires_owner_approval boolean NOT NULL,
  action_id uuid,
  reason text CHECK (reason IS NULL OR length(btrim(reason)) BETWEEN 1 AND 2000),
  evidence_ids uuid[] NOT NULL CHECK (cardinality(evidence_ids)>0),
  affected_entity_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  affected_mission_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  affected_task_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  verified_at timestamptz NOT NULL,
  version bigint NOT NULL CHECK (version>0),
  actor_id uuid NOT NULL REFERENCES public."IdentityActor"("id") ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((control_state='ENGAGED')=(action_id IS NOT NULL AND reason IS NOT NULL)),
  CHECK (control_state<>'ARMED' OR (action_id IS NULL AND reason IS NULL)),
  CHECK (control_code='PAUSE_BUSINESS' OR (
    cardinality(affected_entity_ids)=0
    AND cardinality(affected_mission_ids)=0
    AND cardinality(affected_task_ids)=0
  )),
  CHECK ((control_code='KILL_BUSINESS')=requires_owner_approval),
  FOREIGN KEY (tenant_id,organization_id)
    REFERENCES public."TenantBoundary"("id","organizationId") ON DELETE RESTRICT,
  FOREIGN KEY (business_boundary_id,tenant_id,organization_id)
    REFERENCES public."BusinessBoundary"("id","tenantId","organizationId") ON DELETE RESTRICT
);
CREATE INDEX phase204_commerce_controls_current_idx
  ON entral.phase204_commerce_controls(business_boundary_id,control_code,version DESC,created_at DESC);

-- Every Phase 204 operational fact and authorization record is append-only.
DO $phase204_append_only_triggers$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'phase204_mutation_receipts',
    'phase204_capability_source_bindings',
    'phase204_business_capability_installations',
    'phase204_internal_commerce_activations',
    'phase204_internal_commerce_products',
    'phase204_product_bundle_items',
    'phase204_product_assets',
    'phase204_product_gate_receipts',
    'phase204_storefronts',
    'phase204_storefront_state_events',
    'phase204_publication_approval_envelopes',
    'phase204_provider_facts',
    'phase204_commerce_control_events',
    'phase204_storefront_listing_records',
    'phase204_publication_product_approvals',
    'phase204_operational_metric_truth',
    'phase204_commerce_controls'
  ]::text[]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON entral.%I FOR EACH ROW EXECUTE FUNCTION entral.forbid_mutation()',
      table_name||'_append_only',table_name
    );
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE TRUNCATE ON entral.%I FOR EACH STATEMENT EXECUTE FUNCTION entral.forbid_mutation()',
      table_name||'_no_truncate',table_name
    );
  END LOOP;
END
$phase204_append_only_triggers$;

CREATE OR REPLACE FUNCTION entral.phase204_owner_access_allows(
  p_tenant_id uuid,p_organization_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_owner_access$
  SELECT p_tenant_id IS NOT NULL AND p_organization_id IS NOT NULL
    AND p_tenant_id=entral.phase202_current_tenant_id()
    AND p_organization_id=NULLIF(current_setting('app.organization_id',true),'')::uuid
    AND EXISTS (
      SELECT 1
      FROM entral.app_users canonical_user
      JOIN public."IdentityActor" actor
        ON actor."humanUserId"=canonical_user.auth_subject
       AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
       AND actor."id"=entral.phase202_current_actor_id()
      JOIN public."TenantActorAssignment" assignment
        ON assignment."actorId"=actor."id"
       AND assignment."tenantId"=p_tenant_id
       AND assignment."organizationId"=p_organization_id
       AND assignment."role"='OWNER' AND assignment."status"='ACTIVE'
       AND 'OPERATIONS'=ANY(assignment."authorityDomains")
      JOIN public."TenantBoundary" tenant
        ON tenant."id"=assignment."tenantId"
       AND tenant."organizationId"=assignment."organizationId"
       AND tenant."environment"='PRODUCTION' AND tenant."status"='ACTIVE'
      JOIN public."TeamMember" membership
        ON membership."teamId"=tenant."legacyTeamId"
       AND membership."userId"=actor."humanUserId"
       AND membership."role"='OWNER' AND membership."status"='ACTIVE'
      JOIN public."Team" organization
        ON organization."id"=membership."teamId"
       AND organization."tenantId"=p_tenant_id
       AND organization."organizationId"=p_organization_id
       AND organization."environment"='PRODUCTION'
       AND organization."memberAccessEnabled"
      WHERE canonical_user.id=entral.session_app_user_id()
        AND canonical_user.is_active
    )
$phase204_owner_access$;

CREATE OR REPLACE FUNCTION entral.phase204_operation_access_allows(
  p_tenant_id uuid,p_organization_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_operation_access$
  SELECT entral.phase204_owner_access_allows(p_tenant_id,p_organization_id)
    OR (
      p_tenant_id=entral.phase202_current_tenant_id()
      AND p_organization_id=NULLIF(current_setting('app.organization_id',true),'')::uuid
      AND EXISTS (
        SELECT 1
        FROM public."IdentityActor" actor
        JOIN public."TenantActorAssignment" assignment
          ON assignment."actorId"=actor."id"
         AND assignment."tenantId"=p_tenant_id
         AND assignment."organizationId"=p_organization_id
         AND assignment."role"='SERVICE' AND assignment."status"='ACTIVE'
         AND assignment."authorityDomains" && ARRAY['OPERATIONS','INTEGRATIONS']::text[]
        JOIN public."TenantBoundary" tenant
          ON tenant."id"=assignment."tenantId"
         AND tenant."organizationId"=assignment."organizationId"
         AND tenant."environment"='PRODUCTION' AND tenant."status"='ACTIVE'
        WHERE actor."id"=entral.phase202_current_actor_id()
          AND actor."actorType"='SERVICE' AND actor."status"='ACTIVE'
          AND actor."serviceSubject"='canonical-app-user:'||entral.session_app_user_id()::text
      )
    )
$phase204_operation_access$;

CREATE OR REPLACE FUNCTION entral.phase204_internal_read_allows(
  p_tenant_id uuid,p_organization_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_internal_read$
  SELECT entral.phase204_operation_access_allows(p_tenant_id,p_organization_id)
    OR pg_has_role(session_user,'entral_verifier','USAGE')
    OR pg_has_role(session_user,'entral_audit_reader','USAGE')
$phase204_internal_read$;

CREATE OR REPLACE FUNCTION entral.phase204_request_hash(p_request jsonb)
RETURNS text
LANGUAGE sql IMMUTABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_request_hash$
  SELECT encode(public.digest(convert_to(p_request::text,'UTF8'),'sha256'),'hex')
$phase204_request_hash$;

CREATE OR REPLACE FUNCTION entral.phase204_mutation_replay(
  p_operation text,p_idempotency_key text,p_request_sha256 text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_mutation_replay$
DECLARE prior entral.phase204_mutation_receipts%ROWTYPE;
BEGIN
  SELECT * INTO prior FROM entral.phase204_mutation_receipts receipt
  WHERE receipt.operation=p_operation AND receipt.idempotency_key=p_idempotency_key;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF prior.request_sha256<>p_request_sha256 THEN
    RAISE EXCEPTION 'Phase 204 idempotency key was reused with a different request'
      USING ERRCODE='23505';
  END IF;
  RETURN prior.response_snapshot;
END
$phase204_mutation_replay$;

CREATE OR REPLACE FUNCTION entral.phase204_record_mutation(
  p_operation text,p_tenant_id uuid,p_organization_id uuid,p_capability_id uuid,
  p_installation_id uuid,p_idempotency_key text,p_request_sha256 text,p_response jsonb,
  p_actor_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_record_mutation$
DECLARE
  resulting_id uuid;
  aggregate_id uuid;
  canonical_business_id uuid;
  aggregate_version bigint;
BEGIN
  INSERT INTO entral.phase204_mutation_receipts(
    operation,tenant_id,organization_id,capability_id,installation_id,
    idempotency_key,request_sha256,response_snapshot,actor_id
  ) VALUES (
    p_operation,p_tenant_id,p_organization_id,p_capability_id,p_installation_id,
    p_idempotency_key,p_request_sha256,p_response,p_actor_id
  ) RETURNING mutation_receipt_id INTO resulting_id;
  SELECT activation.canonical_business_id INTO canonical_business_id
  FROM entral.phase204_internal_commerce_activations activation
  WHERE activation.tenant_id=p_tenant_id AND activation.organization_id=p_organization_id
  ORDER BY activation.created_at DESC LIMIT 1;
  aggregate_id := COALESCE(canonical_business_id,p_capability_id,p_installation_id,resulting_id);
  aggregate_version := CASE
    WHEN COALESCE(p_response->>'record_version','') ~ '^[1-9][0-9]*$'
      THEN (p_response->>'record_version')::bigint
    ELSE 1
  END;
  PERFORM entral.emit_canonical_event(
    'PHASE204_'||p_operation,'PHASE204_INTERNAL_COMMERCE',aggregate_id,aggregate_version,
    canonical_business_id,NULL,entral.current_governance_action_id(),
    p_response||jsonb_build_object(
      'mutation_receipt_id',resulting_id,'operation',p_operation,
      'tenant_id',p_tenant_id,'organization_id',p_organization_id,
      'release_version','phase-204'
    ),'INTERNAL',resulting_id,NULL
  );
  RETURN resulting_id;
END
$phase204_record_mutation$;

CREATE OR REPLACE FUNCTION entral.phase204_source_provenance_allows(
  p_source_record_id uuid,p_expected_kind text,p_expected_provider text,
  p_canonical_business_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_source_provenance$
  SELECT EXISTS (
    SELECT 1
    FROM entral.source_records source
    WHERE source.id=p_source_record_id
      AND source.business_id=p_canonical_business_id
      AND source.source_type=p_expected_kind
      AND (p_expected_provider IS NULL OR source.provider=p_expected_provider)
      AND source.uri ~ '^https://[^[:space:]]+$'
      AND source.observed_at IS NOT NULL
      AND source.observed_at<=clock_timestamp()+interval '5 minutes'
      AND (
        p_expected_kind<>'PROVIDER_POLICY'
        OR (
          source.observed_at>=clock_timestamp()-interval '14 days'
          AND source.metadata->>'official_source'='true'
          AND source.metadata->>'fees_verified'='true'
          AND (
            (p_expected_provider='ETSY'
              AND source.uri ~ '^https://([[:alnum:]-]+\.)?etsy\.com([/:?#]|$)')
            OR (p_expected_provider='GUMROAD'
              AND source.uri ~ '^https://([[:alnum:]-]+\.)?gumroad\.com([/:?#]|$)')
          )
        )
      )
      AND source.trust_level IN ('HIGH','AUTHORITATIVE')
      AND COALESCE(source.content_sha256,'') ~ '^[0-9a-f]{64}$'
      AND jsonb_typeof(source.metadata)='object'
      AND COALESCE(source.metadata->>'capture_method','')<>''
  )
$phase204_source_provenance$;

-- These authority profiles are code-owned policy records.  No tenant identity,
-- provider credential, or public publication authority is embedded in them.
INSERT INTO entral.authority_profiles(
  id,stable_code,name,allowed_action_types,allowed_tool_risk,
  max_single_action_cost,max_daily_cost,requires_human_for,constraints,is_active
) VALUES
(
  '20400000-0001-4000-8000-000000000001'::uuid,
  'phase204.internal-commerce.commander.v1',
  'Phase 204 Internal Commerce Commander',
  ARRAY['CREATE','EDIT','PAUSE','RESUME','RECONFIGURE','ROLLBACK','REPAIR','BUDGET_CHANGE','TOOL_GRANT_CHANGE']::entral.governance_action_type[],
  'HIGH'::entral.risk_class,150,150,
  ARRAY['external_publication','provider_agreement','identity','banking','payment','credential','mfa','spend_outside_approved_envelope']::text[],
  jsonb_build_object(
    'maximum_setup_spend',150,'currency','USD','paid_advertising_budget',0,
    'etsy_first',true,'gumroad_requires_documented_etsy_blocker',true,
    'public_brand_requires_market_evidence',true
  ),true
),
(
  '20400000-0001-4000-8000-000000000002'::uuid,
  'phase204.internal-commerce.soldier.v1',
  'Phase 204 Internal Commerce Soldier',
  ARRAY['EDIT','PAUSE','RESUME','RECONFIGURE','REPAIR']::entral.governance_action_type[],
  'MEDIUM'::entral.risk_class,0,0,
  ARRAY['external_publication','spend','credential','mfa','unsupported_claim','unclear_licensing']::text[],
  jsonb_build_object(
    'external_publication',false,'spend_limit',0,'paid_advertising_budget',0,
    'requires_active_mission_and_task',true
  ),true
);

CREATE OR REPLACE FUNCTION entral.phase204_register_tenant_capability(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_register_capability$
DECLARE
  source_capability entral.capability_records%ROWTYPE;
  v_capability_id uuid;
  v_source_capability_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_actor_id uuid;
  v_requested_at timestamptz;
  v_idempotency_key text;
  v_request_hash text;
  v_required_evidence text[];
  v_activation_requirements jsonb;
  v_limitations text[];
  v_expected_dependencies integer;
  v_inserted_dependencies integer;
  prior_response jsonb;
  response jsonb;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'tenant_capability_id','catalog_capability_id','tenant_id','organization_id','owner',
       'purpose','required_evidence','activation_requirements','rollback_path','deactivation_path',
       'implementation_reference','limitations','idempotency_key','release_version','requested_at'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 tenant capability registration envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_capability_id := (p_request->>'tenant_capability_id')::uuid;
    v_source_capability_id := (p_request->>'catalog_capability_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_requested_at := (p_request->>'requested_at')::timestamptz;
    SELECT COALESCE(array_agg(value ORDER BY ordinal),ARRAY[]::text[])
      INTO v_required_evidence
    FROM jsonb_array_elements_text(COALESCE(p_request->'required_evidence','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
    SELECT COALESCE(array_agg(value ORDER BY ordinal),ARRAY[]::text[])
      INTO v_limitations
    FROM jsonb_array_elements_text(COALESCE(p_request->'limitations','[]'::jsonb))
      WITH ORDINALITY AS limitation(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 tenant capability registration envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  v_activation_requirements := COALESCE(p_request->'activation_requirements','[]'::jsonb);
  IF p_request->>'release_version'<>'phase-204'
     OR v_capability_id=v_source_capability_id
     OR v_requested_at IS NULL
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR COALESCE(length(btrim(p_request->>'owner')),0) NOT BETWEEN 1 AND 320
     OR COALESCE(length(btrim(p_request->>'purpose')),0) NOT BETWEEN 1 AND 2000
     OR COALESCE(length(btrim(p_request->>'rollback_path')),0) NOT BETWEEN 1 AND 2000
     OR COALESCE(length(btrim(p_request->>'deactivation_path')),0) NOT BETWEEN 1 AND 2000
     OR COALESCE(p_request->>'implementation_reference','') !~ '^[^@[:space:]]+@[0-9a-f]{40}:.+'
     OR cardinality(v_required_evidence)=0
     OR cardinality(v_required_evidence)<>(SELECT count(DISTINCT value) FROM unnest(v_required_evidence) value)
     OR NOT v_required_evidence<@ARRAY[
       'UNIT_TEST','INTEGRATION_TEST','CANARY','PRODUCTION_READBACK','AUTHENTICATION',
       'AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION','REFRESH_OR_WEBHOOK',
       'FAILURE_HANDLING','SUPPORT_READINESS','PRICING_APPROVAL','TUTORIAL','DOCUMENTATION','ROLLBACK'
     ]::text[]
     OR NOT v_required_evidence@>ARRAY[
       'UNIT_TEST','INTEGRATION_TEST','CANARY','PRODUCTION_READBACK',
       'AUTHORIZATION_SCOPE','FAILURE_HANDLING','DOCUMENTATION','ROLLBACK'
     ]::text[]
     OR jsonb_typeof(v_activation_requirements)<>'array'
     OR jsonb_array_length(v_activation_requirements)=0
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements(v_activation_requirements) requirement
       WHERE jsonb_typeof(requirement)<>'object'
          OR COALESCE(requirement->>'requirement_code','') !~ '^[A-Z0-9][A-Z0-9_]{2,79}$'
          OR COALESCE(length(btrim(requirement->>'description')),0) NOT BETWEEN 1 AND 1000
          OR COALESCE((requirement->>'required')::boolean,false) IS NOT TRUE
          OR COALESCE((requirement->>'satisfied')::boolean,false) IS NOT FALSE
          OR jsonb_typeof(COALESCE(requirement->'evidence_receipt_ids','[]'::jsonb))<>'array'
          OR jsonb_array_length(COALESCE(requirement->'evidence_receipt_ids','[]'::jsonb))<>0
          OR requirement-ARRAY['requirement_code','description','required','satisfied','evidence_receipt_ids']::text[]<>'{}'::jsonb
     )
     OR jsonb_array_length(v_activation_requirements)<>(
       SELECT count(DISTINCT requirement->>'requirement_code')
       FROM jsonb_array_elements(v_activation_requirements) requirement
     ) THEN
    RAISE EXCEPTION 'Phase 204 tenant capability registration violates the canonical contract'
      USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Phase 204 tenant capability registration requires current Human OWNER authority'
      USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:capability-registration:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('REGISTER_CAPABILITY',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;

  SELECT * INTO source_capability
  FROM entral.capability_records capability
  WHERE capability.capability_id=v_source_capability_id FOR SHARE;
  IF NOT FOUND
     OR source_capability.capability_id NOT IN (
       '20300000-0002-4000-8000-000000000108'::uuid,
       '20300000-0002-4000-8000-000000000107'::uuid,
       '20300000-0002-4000-8000-000000000106'::uuid,
       '20300000-0001-4000-8000-000000000012'::uuid
     )
     OR source_capability.scope<>'GLOBAL' OR source_capability.environment<>'PRODUCTION'
     OR source_capability.lifecycle_state<>'CATALOGUED'
     OR source_capability.public_claim_eligible
     OR source_capability.pricing_eligibility<>'NOT_ELIGIBLE' THEN
    RAISE EXCEPTION 'Phase 204 tenant capability requires an exact conservative Phase 203 catalogue source'
      USING ERRCODE='23514';
  END IF;
  IF source_capability.capability_id='20300000-0001-4000-8000-000000000012'::uuid
     AND NOT v_required_evidence@>ARRAY[
       'AUTHENTICATION','AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION',
       'REFRESH_OR_WEBHOOK','FAILURE_HANDLING'
     ]::text[] THEN
    RAISE EXCEPTION 'Etsy tenant runtime registration requires the complete provider evidence contract'
      USING ERRCODE='23514';
  END IF;

  INSERT INTO entral.capability_records(
    capability_id,capability_key,capability_version,display_name,purpose,kind,owner,
    data_classification,environment,scope,supported_scopes,tenant_id,organization_id,
    lifecycle_state,audience_status,production_readiness,required_evidence,
    activation_requirements,last_verified_at,failure_state,public_claim_eligible,
    pricing_eligibility,rollback_path,deactivation_path,source_reference,limitations
  ) VALUES (
    v_capability_id,source_capability.capability_key,source_capability.capability_version,
    left(source_capability.display_name||' - Sovereign Protocol internal runtime',200),
    btrim(p_request->>'purpose'),source_capability.kind,btrim(p_request->>'owner'),
    'INTERNAL','PRODUCTION','TENANT',ARRAY['TENANT']::text[],v_tenant_id,v_organization_id,
    'CATALOGUED','UNSUPPORTED','REAL',v_required_evidence,v_activation_requirements,
    NULL,NULL,false,'NOT_ELIGIBLE',btrim(p_request->>'rollback_path'),
    btrim(p_request->>'deactivation_path'),p_request->>'implementation_reference',
    v_limitations||ARRAY['Tenant-internal runtime; not public customer software and never public by existence.']::text[]
  );
  INSERT INTO entral.phase204_capability_source_bindings(
    tenant_capability_id,tenant_capability_version,catalog_capability_id,
    catalog_capability_version,tenant_id,organization_id,implementation_reference,created_by_actor_id
  ) VALUES (
    v_capability_id,source_capability.capability_version,source_capability.capability_id,
    source_capability.capability_version,v_tenant_id,v_organization_id,
    p_request->>'implementation_reference',v_actor_id
  );

  v_expected_dependencies := CASE source_capability.capability_id
    WHEN '20300000-0002-4000-8000-000000000108'::uuid THEN 0
    WHEN '20300000-0002-4000-8000-000000000107'::uuid THEN 1
    WHEN '20300000-0002-4000-8000-000000000106'::uuid THEN 2
    WHEN '20300000-0001-4000-8000-000000000012'::uuid THEN 3
  END;
  WITH required_sources(source_id) AS (
    SELECT source_id FROM (VALUES
      ('20300000-0002-4000-8000-000000000108'::uuid),
      ('20300000-0002-4000-8000-000000000107'::uuid),
      ('20300000-0002-4000-8000-000000000106'::uuid)
    ) required(source_id)
    WHERE (source_capability.capability_id='20300000-0002-4000-8000-000000000107'::uuid
           AND source_id='20300000-0002-4000-8000-000000000108'::uuid)
       OR (source_capability.capability_id='20300000-0002-4000-8000-000000000106'::uuid
           AND source_id IN (
             '20300000-0002-4000-8000-000000000108'::uuid,
             '20300000-0002-4000-8000-000000000107'::uuid
           ))
       OR source_capability.capability_id='20300000-0001-4000-8000-000000000012'::uuid
  ), inserted AS (
    INSERT INTO entral.capability_dependencies(
      capability_id,capability_version,dependency_capability_id,
      dependency_capability_version,minimum_lifecycle_state,required
    )
    SELECT v_capability_id,source_capability.capability_version,binding.tenant_capability_id,
      binding.tenant_capability_version,'ACTIVE',true
    FROM required_sources required
    JOIN entral.phase204_capability_source_bindings binding
      ON binding.catalog_capability_id=required.source_id
     AND binding.tenant_id=v_tenant_id AND binding.organization_id=v_organization_id
    RETURNING 1
  ) SELECT count(*)::integer INTO v_inserted_dependencies FROM inserted;
  IF v_inserted_dependencies<>v_expected_dependencies THEN
    RAISE EXCEPTION 'Phase 204 tenant capability dependencies are missing or out of order'
      USING ERRCODE='23514';
  END IF;
  PERFORM entral.phase203_bump_registry_revision();
  response := entral.phase203_capability_record_json(v_capability_id)||jsonb_build_object(
    'catalog_capability_id',source_capability.capability_id,
    'catalog_capability_version',source_capability.capability_version,
    'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'REGISTER_CAPABILITY',v_tenant_id,v_organization_id,v_capability_id,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_register_capability$;

CREATE OR REPLACE FUNCTION entral.phase204_record_capability_evidence(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_record_capability_evidence$
DECLARE
  capability entral.capability_records%ROWTYPE;
  installation entral.tenant_capability_installations%ROWTYPE;
  v_receipt_id uuid;
  v_capability_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_expected_version bigint;
  v_captured_at timestamptz;
  v_expires_at timestamptz;
  v_actor_id uuid;
  v_transition_id uuid;
  v_now timestamptz;
  v_failure_state jsonb;
  v_remaining_failure_state jsonb;
  v_snapshot jsonb;
  v_idempotency_key text;
  v_request_hash text;
  prior_response jsonb;
  response jsonb;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'receipt_id','capability_id','tenant_id','organization_id','expected_record_version',
       'evidence_type','environment','status','reference','content_sha256','captured_at',
       'expires_at','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 capability evidence envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_receipt_id := (p_request->>'receipt_id')::uuid;
    v_capability_id := (p_request->>'capability_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_expected_version := (p_request->>'expected_record_version')::bigint;
    v_captured_at := (p_request->>'captured_at')::timestamptz;
    v_expires_at := NULLIF(p_request->>'expires_at','')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 capability evidence envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204' OR v_expected_version<1
     OR p_request->>'environment'<>'PRODUCTION'
     OR p_request->>'status' NOT IN ('PASSED','FAILED')
     OR p_request->>'evidence_type' NOT IN (
       'UNIT_TEST','INTEGRATION_TEST','CANARY','PRODUCTION_READBACK','AUTHENTICATION',
       'AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION','REFRESH_OR_WEBHOOK',
       'FAILURE_HANDLING','SUPPORT_READINESS','PRICING_APPROVAL','TUTORIAL','DOCUMENTATION','ROLLBACK'
     ) OR length(btrim(COALESCE(p_request->>'reference',''))) NOT BETWEEN 1 AND 2000
     OR COALESCE(p_request->>'content_sha256','') !~ '^[0-9a-f]{64}$'
     OR v_captured_at IS NULL OR v_captured_at>clock_timestamp()+interval '5 minutes'
     OR v_expires_at IS NULL OR v_expires_at<=v_captured_at
     OR v_expires_at>v_captured_at+interval '180 days'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255 THEN
    RAISE EXCEPTION 'Phase 204 capability evidence violates the canonical contract' USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Capability evidence recording requires the exact current Human OWNER' USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:capability-evidence:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('RECORD_CAPABILITY_EVIDENCE',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO capability FROM entral.capability_records record
  WHERE record.capability_id=v_capability_id FOR UPDATE;
  IF NOT FOUND OR capability.scope<>'TENANT' OR capability.environment<>'PRODUCTION'
     OR capability.tenant_id IS DISTINCT FROM v_tenant_id
     OR capability.organization_id IS DISTINCT FROM v_organization_id
     OR capability.record_version<>v_expected_version
     OR NOT EXISTS (
       SELECT 1 FROM entral.phase204_capability_source_bindings binding
       WHERE binding.tenant_capability_id=capability.capability_id
         AND binding.tenant_capability_version=capability.capability_version
         AND binding.tenant_id=v_tenant_id AND binding.organization_id=v_organization_id
     ) THEN
    RAISE EXCEPTION 'Capability evidence scope or revision conflict' USING ERRCODE='40001';
  END IF;
  IF v_captured_at<capability.created_at THEN
    RAISE EXCEPTION 'Capability evidence cannot predate its tenant registration'
      USING ERRCODE='23514';
  END IF;
  INSERT INTO entral.capability_verification_receipts(
    receipt_id,capability_id,capability_version,evidence_type,environment,status,
    reference,content_sha256,captured_at,expires_at,recorded_by_actor_id
  ) VALUES (
    v_receipt_id,capability.capability_id,capability.capability_version,p_request->>'evidence_type',
    'PRODUCTION',p_request->>'status',p_request->>'reference',p_request->>'content_sha256',
    v_captured_at,v_expires_at,v_actor_id
  );
  v_now := clock_timestamp();
  SELECT jsonb_build_object(
    'code','VERIFICATION_FAILED','summary','The latest '||latest.evidence_type||' verification failed.',
    'observed_at',latest.captured_at,'retryable',true,'evidence_type',latest.evidence_type,
    'receipt_id',latest.receipt_id,'prior_lifecycle_state',capability.lifecycle_state
  ) INTO v_remaining_failure_state
  FROM (
    SELECT current_receipt.* FROM (
      SELECT DISTINCT ON (receipt.evidence_type)
        receipt.receipt_id,receipt.evidence_type,receipt.status,receipt.captured_at
      FROM entral.capability_verification_receipts receipt
      WHERE receipt.capability_id=capability.capability_id
        AND receipt.capability_version=capability.capability_version
        AND receipt.environment='PRODUCTION'
      ORDER BY receipt.evidence_type,receipt.captured_at DESC,receipt.receipt_id DESC
    ) current_receipt WHERE current_receipt.status='FAILED'
    ORDER BY current_receipt.captured_at DESC,current_receipt.receipt_id DESC LIMIT 1
  ) latest;
  v_failure_state := CASE
    WHEN v_remaining_failure_state IS NOT NULL THEN v_remaining_failure_state
    WHEN capability.failure_state IS NOT NULL
      AND capability.failure_state->>'code' IS DISTINCT FROM 'VERIFICATION_FAILED'
      THEN capability.failure_state
    ELSE NULL
  END;
  IF p_request->>'status'='FAILED' AND capability.lifecycle_state='ACTIVE'
     AND v_failure_state->>'receipt_id'=v_receipt_id::text THEN
    v_transition_id := public.gen_random_uuid();
    v_snapshot := entral.phase203_capability_record_json(capability.capability_id)||jsonb_build_object(
      'lifecycle_state','CANARY_VERIFIED','public_claim_eligible',false,'pricing_eligibility','NOT_ELIGIBLE',
      'failure_state',v_failure_state,'record_version',capability.record_version+1,'updated_at',v_now
    );
    INSERT INTO entral.capability_transition_audit(
      transition_id,capability_id,capability_version,from_state,to_state,pricing_eligibility,
      prior_record_version,resulting_record_version,evidence_receipt_ids,reason,actor_id,
      tenant_id,organization_id,business_id,correlation_id,idempotency_key,request_sha256,
      release_version,response_snapshot,requested_at
    ) VALUES (
      v_transition_id,capability.capability_id,capability.capability_version,'ACTIVE','CANARY_VERIFIED','NOT_ELIGIBLE',
      capability.record_version,capability.record_version+1,ARRAY[v_receipt_id]::uuid[],
      'Automatically downgraded because the latest tenant production verification failed.',v_actor_id,
      v_tenant_id,v_organization_id,NULL,v_receipt_id,'phase204:evidence-failure:'||v_receipt_id::text,
      v_request_hash,'phase-204',v_snapshot,v_now
    );
    PERFORM set_config('app.phase203_transition_id',v_transition_id::text,true);
    UPDATE entral.capability_records SET lifecycle_state='CANARY_VERIFIED',public_claim_eligible=false,
      pricing_eligibility='NOT_ELIGIBLE',failure_state=v_failure_state,
      record_version=record_version+1,updated_at=v_now
    WHERE capability_id=capability.capability_id;
    FOR installation IN SELECT * FROM entral.tenant_capability_installations record
      WHERE record.capability_id=capability.capability_id AND record.capability_version=capability.capability_version
        AND record.state='ACTIVE' ORDER BY record.installation_id FOR UPDATE
    LOOP
      INSERT INTO entral.tenant_capability_installation_audit(
        transition_id,installation_id,tenant_id,organization_id,business_id,capability_id,capability_version,
        from_state,to_state,prior_record_version,resulting_record_version,reason,actor_id,
        correlation_id,idempotency_key,release_version
      ) SELECT public.gen_random_uuid(),installation.installation_id,installation.tenant_id,installation.organization_id,
        binding.business_boundary_id,installation.capability_id,installation.capability_version,'ACTIVE','SUSPENDED',
        installation.record_version,installation.record_version+1,
        'Automatically suspended because the latest capability verification failed.',v_actor_id,v_receipt_id,
        'phase204:evidence-failure:'||v_receipt_id::text||':'||installation.installation_id::text,'phase-204'
      FROM entral.phase204_business_capability_installations binding
      WHERE binding.installation_id=installation.installation_id;
      UPDATE entral.tenant_capability_installations SET state='SUSPENDED',
        suspension_reason='Latest capability verification failed.',record_version=record_version+1,updated_at=v_now
      WHERE installation_id=installation.installation_id;
    END LOOP;
    PERFORM entral.phase204_reconcile_unhealthy_dependents(
      v_transition_id,v_actor_id,v_receipt_id,v_tenant_id,v_organization_id
    );
  ELSE
    UPDATE entral.capability_records SET
      last_verified_at=CASE WHEN p_request->>'status'='PASSED'
        THEN GREATEST(COALESCE(last_verified_at,v_captured_at),v_captured_at) ELSE last_verified_at END,
      failure_state=v_failure_state,record_version=record_version+1,updated_at=v_now
    WHERE capability_id=capability.capability_id;
  END IF;
  PERFORM entral.phase203_bump_registry_revision();
  response := entral.phase203_capability_record_json(capability.capability_id)||jsonb_build_object(
    'receipt_id',v_receipt_id,'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'RECORD_CAPABILITY_EVIDENCE',v_tenant_id,v_organization_id,v_capability_id,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_record_capability_evidence$;

CREATE OR REPLACE FUNCTION entral.phase204_bind_capability_requirement(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_bind_requirement$
DECLARE
  capability entral.capability_records%ROWTYPE;
  v_capability_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_expected_version bigint;
  v_requested_at timestamptz;
  v_requirement_code text;
  v_receipt_ids uuid[];
  v_idempotency_key text;
  v_request_hash text;
  v_actor_id uuid;
  prior_response jsonb;
  response jsonb;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'capability_id','tenant_id','organization_id','expected_record_version','requirement_code',
       'evidence_receipt_ids','idempotency_key','release_version','requested_at'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 capability requirement envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_capability_id := (p_request->>'capability_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_expected_version := (p_request->>'expected_record_version')::bigint;
    v_requested_at := (p_request->>'requested_at')::timestamptz;
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
      INTO v_receipt_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'evidence_receipt_ids','[]'::jsonb))
      WITH ORDINALITY AS receipt(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 capability requirement envelope' USING ERRCODE='22023';
  END;
  v_requirement_code := p_request->>'requirement_code';
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204' OR v_expected_version<1
     OR v_requested_at IS NULL OR v_requested_at>clock_timestamp()+interval '5 minutes'
     OR COALESCE(v_requirement_code,'') !~ '^[A-Z0-9][A-Z0-9_]{2,79}$'
     OR cardinality(v_receipt_ids)=0
     OR cardinality(v_receipt_ids)<>(SELECT count(DISTINCT value) FROM unnest(v_receipt_ids) value)
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255 THEN
    RAISE EXCEPTION 'Phase 204 capability requirement envelope violates the canonical contract'
      USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Capability requirement binding requires current Human OWNER authority'
      USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:capability-requirement:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('BIND_CAPABILITY_REQUIREMENT',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO capability FROM entral.capability_records record
  WHERE record.capability_id=v_capability_id FOR UPDATE;
  IF NOT FOUND OR capability.scope<>'TENANT'
     OR capability.tenant_id IS DISTINCT FROM v_tenant_id
     OR capability.organization_id IS DISTINCT FROM v_organization_id
     OR capability.record_version<>v_expected_version
     OR NOT EXISTS (
       SELECT 1 FROM entral.phase204_capability_source_bindings binding
       WHERE binding.tenant_capability_id=capability.capability_id
         AND binding.tenant_capability_version=capability.capability_version
         AND binding.tenant_id=v_tenant_id AND binding.organization_id=v_organization_id
     ) THEN
    RAISE EXCEPTION 'Capability requirement binding scope or revision does not match'
      USING ERRCODE='40001';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(capability.activation_requirements) requirement
      WHERE requirement->>'requirement_code'=v_requirement_code)<>1
     OR EXISTS (
       SELECT 1 FROM unnest(v_receipt_ids) requested_receipt_id
       WHERE NOT EXISTS (
         SELECT 1 FROM entral.capability_verification_receipts receipt
         WHERE receipt.receipt_id=requested_receipt_id
           AND receipt.capability_id=capability.capability_id
           AND receipt.capability_version=capability.capability_version
           AND receipt.environment=capability.environment
           AND receipt.captured_at>=capability.created_at
           AND receipt.captured_at<=v_requested_at
           AND receipt.expires_at IS NOT NULL AND receipt.expires_at>v_requested_at
           AND receipt.expires_at<=receipt.captured_at+interval '180 days'
           AND entral.phase203_current_evidence_receipt_passed(receipt.receipt_id)
       )
     ) THEN
    RAISE EXCEPTION 'Capability requirement evidence is missing, stale, failed, or mismatched'
      USING ERRCODE='23514';
  END IF;
  UPDATE entral.capability_records record
  SET activation_requirements=(
        SELECT jsonb_agg(
          CASE WHEN requirement->>'requirement_code'=v_requirement_code
            THEN requirement||jsonb_build_object('satisfied',true,'evidence_receipt_ids',to_jsonb(v_receipt_ids))
            ELSE requirement END
          ORDER BY ordinal
        )
        FROM jsonb_array_elements(record.activation_requirements) WITH ORDINALITY AS item(requirement,ordinal)
      ),
      record_version=record_version+1,updated_at=clock_timestamp()
  WHERE record.capability_id=capability.capability_id;
  PERFORM entral.phase203_bump_registry_revision();
  response := entral.phase203_capability_record_json(capability.capability_id)||jsonb_build_object('release_version','phase-204');
  PERFORM entral.phase204_record_mutation(
    'BIND_CAPABILITY_REQUIREMENT',v_tenant_id,v_organization_id,v_capability_id,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_bind_requirement$;

-- Preserve the complete Phase 203 transition implementation behind a wrapper.
-- Phase 204 requests receive their own immutable external idempotency receipt;
-- the original Phase 203 request contract remains byte-for-byte compatible.
ALTER FUNCTION entral.phase203_transition_capability(jsonb)
  RENAME TO phase203_transition_capability_v203;
ALTER FUNCTION entral.phase203_reconcile_unhealthy_dependents(uuid,uuid,uuid,text)
  RENAME TO phase203_reconcile_unhealthy_dependents_v203;

CREATE OR REPLACE FUNCTION entral.phase204_attribute_capability_release()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_attribute_capability_release$
DECLARE requested_release text := NULLIF(current_setting('app.phase204_capability_release',true),'');
BEGIN
  IF NEW.release_version NOT IN ('phase-203','phase-204')
     OR (requested_release IS NOT NULL AND requested_release NOT IN ('phase-203','phase-204')) THEN
    RAISE EXCEPTION 'Capability audit release version is not authorized' USING ERRCODE='23514';
  END IF;
  IF requested_release='phase-204' THEN
    IF NEW.tenant_id IS NULL OR NEW.organization_id IS NULL
       OR NOT entral.phase204_owner_access_allows(NEW.tenant_id,NEW.organization_id) THEN
      RAISE EXCEPTION 'Phase 204 capability audit attribution requires current tenant OWNER authority'
        USING ERRCODE='42501';
    END IF;
    NEW.release_version := 'phase-204';
  END IF;
  RETURN NEW;
END
$phase204_attribute_capability_release$;

CREATE TRIGGER phase204_capability_transition_release_guard
BEFORE INSERT ON entral.capability_transition_audit
FOR EACH ROW EXECUTE FUNCTION entral.phase204_attribute_capability_release();
CREATE TRIGGER phase204_installation_transition_release_guard
BEFORE INSERT ON entral.tenant_capability_installation_audit
FOR EACH ROW EXECUTE FUNCTION entral.phase204_attribute_capability_release();

CREATE OR REPLACE FUNCTION entral.phase203_reconcile_unhealthy_dependents(
  p_root_transition_id uuid,p_actor_id uuid,p_correlation_id uuid,p_release_version text
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_reconcile_wrapper$
BEGIN
  IF p_release_version IS DISTINCT FROM 'phase-203'
     OR NOT entral.phase203_admin_access_allows()
     OR p_actor_id IS DISTINCT FROM entral.phase202_current_actor_id() THEN
    RAISE EXCEPTION 'Dependency reconciliation requires bound Phase 203 administrator authority'
      USING ERRCODE='42501';
  END IF;
  RETURN entral.phase203_reconcile_unhealthy_dependents_v203(
    p_root_transition_id,p_actor_id,p_correlation_id,'phase-203'
  );
END
$phase203_reconcile_wrapper$;

CREATE OR REPLACE FUNCTION entral.phase204_reconcile_unhealthy_dependents(
  p_root_transition_id uuid,p_actor_id uuid,p_correlation_id uuid,
  p_tenant_id uuid,p_organization_id uuid
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_reconcile_dependencies$
DECLARE
  dependent entral.capability_records%ROWTYPE;
  installation entral.tenant_capability_installations%ROWTYPE;
  v_transition_id uuid;
  v_idempotency_key text;
  v_updated_at timestamptz;
  v_snapshot jsonb;
  v_business_boundary_id uuid;
  reconciled integer := 0;
BEGIN
  IF p_actor_id IS DISTINCT FROM entral.phase202_current_actor_id()
     OR NOT entral.phase204_owner_access_allows(p_tenant_id,p_organization_id)
     OR NOT EXISTS (
       SELECT 1 FROM entral.capability_transition_audit root
       JOIN entral.phase204_capability_source_bindings binding
         ON binding.tenant_capability_id=root.capability_id
        AND binding.tenant_capability_version=root.capability_version
       WHERE root.transition_id=p_root_transition_id AND root.release_version='phase-204'
         AND root.tenant_id=p_tenant_id AND root.organization_id=p_organization_id
         AND binding.tenant_id=p_tenant_id AND binding.organization_id=p_organization_id
     ) THEN
    RAISE EXCEPTION 'Phase 204 reconciliation requires the exact source-bound tenant OWNER scope'
      USING ERRCODE='42501';
  END IF;
  SELECT activation.business_boundary_id INTO v_business_boundary_id
  FROM entral.phase204_internal_commerce_activations activation
  WHERE activation.tenant_id=p_tenant_id AND activation.organization_id=p_organization_id
  ORDER BY activation.created_at DESC LIMIT 1;
  LOOP
    WITH RECURSIVE root AS (
      SELECT transition.capability_id,transition.capability_version
      FROM entral.capability_transition_audit transition
      WHERE transition.transition_id=p_root_transition_id
        AND transition.tenant_id=p_tenant_id AND transition.organization_id=p_organization_id
        AND transition.release_version='phase-204'
    ), affected(capability_id,capability_version) AS (
      SELECT dependency.capability_id,dependency.capability_version
      FROM entral.capability_dependencies dependency
      JOIN root ON root.capability_id=dependency.dependency_capability_id
        AND root.capability_version=dependency.dependency_capability_version
      WHERE dependency.required
      UNION
      SELECT dependency.capability_id,dependency.capability_version
      FROM entral.capability_dependencies dependency
      JOIN affected ON affected.capability_id=dependency.dependency_capability_id
        AND affected.capability_version=dependency.dependency_capability_version
      WHERE dependency.required
    )
    SELECT record.* INTO dependent
    FROM entral.capability_records record
    JOIN affected USING (capability_id,capability_version)
    JOIN entral.phase204_capability_source_bindings binding
      ON binding.tenant_capability_id=record.capability_id
     AND binding.tenant_capability_version=record.capability_version
     AND binding.tenant_id=p_tenant_id AND binding.organization_id=p_organization_id
    WHERE record.scope='TENANT' AND record.environment='PRODUCTION'
      AND record.tenant_id=p_tenant_id AND record.organization_id=p_organization_id
      AND record.lifecycle_state='ACTIVE'
      AND NOT entral.phase203_dependencies_healthy(record.capability_id,record.capability_version)
    ORDER BY record.capability_id LIMIT 1 FOR UPDATE OF record;
    EXIT WHEN NOT FOUND;

    v_transition_id := public.gen_random_uuid();
    v_idempotency_key := 'phase204:dependency-disable:'||p_root_transition_id::text||':'||dependent.capability_id::text;
    v_updated_at := clock_timestamp();
    v_snapshot := entral.phase203_capability_record_json(dependent.capability_id)||jsonb_build_object(
      'lifecycle_state','CANARY_VERIFIED','public_claim_eligible',false,
      'pricing_eligibility','NOT_ELIGIBLE','record_version',dependent.record_version+1,
      'updated_at',v_updated_at,'release_version','phase-204'
    );
    INSERT INTO entral.capability_transition_audit(
      transition_id,capability_id,capability_version,from_state,to_state,pricing_eligibility,
      prior_record_version,resulting_record_version,evidence_receipt_ids,reason,actor_id,
      tenant_id,organization_id,business_id,correlation_id,idempotency_key,request_sha256,
      release_version,response_snapshot,requested_at
    ) VALUES (
      v_transition_id,dependent.capability_id,dependent.capability_version,dependent.lifecycle_state,
      'CANARY_VERIFIED','NOT_ELIGIBLE',dependent.record_version,dependent.record_version+1,
      ARRAY[]::uuid[],'Automatically downgraded because a required tenant dependency became unhealthy.',
      p_actor_id,p_tenant_id,p_organization_id,v_business_boundary_id,p_correlation_id,v_idempotency_key,
      encode(public.digest(convert_to(v_idempotency_key,'UTF8'),'sha256'),'hex'),
      'phase-204',v_snapshot,v_updated_at
    );
    PERFORM set_config('app.phase203_transition_id',v_transition_id::text,true);
    UPDATE entral.capability_records SET lifecycle_state='CANARY_VERIFIED',
      public_claim_eligible=false,pricing_eligibility='NOT_ELIGIBLE',
      record_version=record_version+1,updated_at=v_updated_at
    WHERE capability_id=dependent.capability_id;

    FOR installation IN
      SELECT record.* FROM entral.tenant_capability_installations record
      JOIN entral.phase204_business_capability_installations binding
        ON binding.installation_id=record.installation_id
       AND binding.tenant_id=p_tenant_id AND binding.organization_id=p_organization_id
      WHERE record.capability_id=dependent.capability_id
        AND record.capability_version=dependent.capability_version
        AND record.tenant_id=p_tenant_id AND record.organization_id=p_organization_id
        AND record.state='ACTIVE'
      ORDER BY record.installation_id FOR UPDATE OF record
    LOOP
      INSERT INTO entral.tenant_capability_installation_audit(
        transition_id,installation_id,tenant_id,organization_id,business_id,
        capability_id,capability_version,from_state,to_state,prior_record_version,
        resulting_record_version,reason,actor_id,correlation_id,idempotency_key,release_version
      ) VALUES (
        public.gen_random_uuid(),installation.installation_id,p_tenant_id,p_organization_id,
        v_business_boundary_id,installation.capability_id,installation.capability_version,
        'ACTIVE','SUSPENDED',installation.record_version,installation.record_version+1,
        'Automatically suspended because a required tenant capability dependency became unhealthy.',
        p_actor_id,p_correlation_id,v_idempotency_key||':'||installation.installation_id::text,'phase-204'
      );
      UPDATE entral.tenant_capability_installations SET state='SUSPENDED',
        suspension_reason='Required tenant capability dependency is unhealthy.',
        record_version=record_version+1,updated_at=v_updated_at
      WHERE installation_id=installation.installation_id;
    END LOOP;
    PERFORM entral.phase203_bump_registry_revision();
    reconciled := reconciled+1;
  END LOOP;
  RETURN reconciled;
END
$phase204_reconcile_dependencies$;

CREATE OR REPLACE FUNCTION entral.phase203_transition_capability(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_transition_wrapper$
DECLARE
  capability entral.capability_records%ROWTYPE;
  requested_release text;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_capability_id uuid;
  v_transition_id uuid;
  v_actor_id uuid;
  v_business_id uuid;
  v_correlation_id uuid;
  v_requested_at timestamptz;
  v_expected_version bigint;
  v_from_state text;
  v_to_state text;
  v_reason text;
  v_idempotency_key text;
  v_request_hash text;
  v_receipt_ids uuid[];
  v_updated_at timestamptz;
  current_rank integer;
  target_rank integer;
  prior_response jsonb;
  response jsonb;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object' THEN
    RAISE EXCEPTION 'Invalid capability lifecycle request' USING ERRCODE='22023';
  END IF;
  requested_release := p_request->>'release_version';
  IF requested_release NOT IN ('phase-203','phase-204') THEN
    RAISE EXCEPTION 'Capability lifecycle release must be exactly phase-203 or phase-204'
      USING ERRCODE='22023';
  END IF;
  IF requested_release='phase-203' THEN
    RETURN entral.phase203_transition_capability_v203(p_request);
  END IF;
  BEGIN
    v_transition_id := (p_request->>'transition_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_capability_id := (p_request->>'capability_id')::uuid;
    v_actor_id := (p_request->>'actor_id')::uuid;
    v_business_id := NULLIF(p_request->>'business_id','')::uuid;
    v_correlation_id := (p_request->>'correlation_id')::uuid;
    v_requested_at := (p_request->>'requested_at')::timestamptz;
    v_expected_version := (p_request->>'expected_record_version')::bigint;
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
      INTO v_receipt_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'evidence_receipt_ids','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Phase 204 capability lifecycle scope is malformed' USING ERRCODE='22023';
  END;
  v_from_state := p_request->>'from_state';
  v_to_state := p_request->>'to_state';
  v_reason := p_request->>'reason';
  v_idempotency_key := p_request->>'idempotency_key';
  IF NOT (p_request ?& ARRAY[
       'transition_id','capability_id','actor_id','tenant_id','organization_id','business_id',
       'correlation_id','requested_at','expected_record_version','from_state','to_state',
       'pricing_eligibility','evidence_receipt_ids','reason','idempotency_key','release_version'
     ]::text[])
     OR p_request-ARRAY[
       'transition_id','capability_id','actor_id','tenant_id','organization_id','business_id',
       'correlation_id','requested_at','expected_record_version','from_state','to_state',
       'pricing_eligibility','evidence_receipt_ids','reason','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb
     OR v_actor_id IS DISTINCT FROM entral.phase202_current_actor_id()
     OR v_expected_version<1 OR v_requested_at IS NULL
     OR v_requested_at>clock_timestamp()+interval '5 minutes'
     OR v_from_state NOT IN ('CATALOGUED','DESIGNED','IMPLEMENTED','UNIT_VERIFIED','INTEGRATION_VERIFIED','CANARY_VERIFIED','ACTIVE','DEPRECATED','RETIRED')
     OR v_to_state NOT IN ('CATALOGUED','DESIGNED','IMPLEMENTED','UNIT_VERIFIED','INTEGRATION_VERIFIED','CANARY_VERIFIED','ACTIVE','DEPRECATED','RETIRED')
     OR v_from_state=v_to_state OR p_request->>'pricing_eligibility'<>'NOT_ELIGIBLE'
     OR COALESCE(length(btrim(v_reason)),0) NOT BETWEEN 1 AND 2000
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR cardinality(v_receipt_ids)<>(SELECT count(DISTINCT value) FROM unnest(v_receipt_ids) value) THEN
    RAISE EXCEPTION 'Phase 204 capability lifecycle request violates the tenant-only contract' USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id)
     OR NOT EXISTS (
       SELECT 1 FROM entral.phase204_capability_source_bindings binding
       WHERE binding.tenant_capability_id=v_capability_id
         AND binding.tenant_id=v_tenant_id AND binding.organization_id=v_organization_id
     ) THEN
    RAISE EXCEPTION 'Phase 204 capability transition requires a source-bound tenant capability and current OWNER'
      USING ERRCODE='42501';
  END IF;
  IF v_business_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public."BusinessBoundary" boundary
    WHERE boundary."id"=v_business_id AND boundary."tenantId"=v_tenant_id
      AND boundary."organizationId"=v_organization_id AND boundary."stableCode"='SP-COMMERCE-001'
  ) THEN RAISE EXCEPTION 'Phase 204 capability transition business scope is not canonical' USING ERRCODE='23514'; END IF;
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:capability-transition:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('CAPABILITY_TRANSITION',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO capability FROM entral.capability_records record
  WHERE record.capability_id=v_capability_id FOR UPDATE;
  IF NOT FOUND OR capability.scope<>'TENANT' OR capability.environment<>'PRODUCTION'
     OR capability.tenant_id IS DISTINCT FROM v_tenant_id
     OR capability.organization_id IS DISTINCT FROM v_organization_id
     OR capability.lifecycle_state<>v_from_state OR capability.record_version<>v_expected_version
     OR capability.public_claim_eligible OR capability.pricing_eligibility<>'NOT_ELIGIBLE' THEN
    RAISE EXCEPTION 'Phase 204 capability lifecycle scope or revision conflict' USING ERRCODE='40001';
  END IF;
  current_rank := entral.phase203_lifecycle_rank(v_from_state);
  target_rank := entral.phase203_lifecycle_rank(v_to_state);
  IF NOT (target_rank=current_rank+1
      OR (v_to_state='DEPRECATED' AND v_from_state<>'RETIRED')
      OR (v_to_state='RETIRED' AND v_from_state='DEPRECATED')) THEN
    RAISE EXCEPTION 'Invalid Phase 204 tenant capability lifecycle transition' USING ERRCODE='22023';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_receipt_ids) requested_receipt_id
    WHERE NOT EXISTS (
      SELECT 1 FROM entral.capability_verification_receipts receipt
      WHERE receipt.receipt_id=requested_receipt_id
        AND receipt.capability_id=capability.capability_id
        AND receipt.capability_version=capability.capability_version
        AND receipt.captured_at>=capability.created_at
        AND receipt.captured_at<=v_requested_at
        AND receipt.expires_at IS NOT NULL
        AND receipt.expires_at>v_requested_at
        AND receipt.expires_at<=receipt.captured_at+interval '180 days'
        AND entral.phase203_current_evidence_receipt_passed(receipt.receipt_id)
    )
  ) THEN RAISE EXCEPTION 'Lifecycle evidence is missing, failed, stale, or mismatched' USING ERRCODE='23514'; END IF;
  IF v_to_state='UNIT_VERIFIED' AND NOT entral.phase203_transition_evidence_includes(
      capability.capability_id,capability.capability_version,v_receipt_ids,ARRAY['UNIT_TEST']::text[]
    ) THEN RAISE EXCEPTION 'UNIT_VERIFIED requires a fresh UNIT_TEST receipt' USING ERRCODE='23514'; END IF;
  IF v_to_state='INTEGRATION_VERIFIED' AND NOT entral.phase203_transition_evidence_includes(
      capability.capability_id,capability.capability_version,v_receipt_ids,ARRAY['INTEGRATION_TEST']::text[]
    ) THEN RAISE EXCEPTION 'INTEGRATION_VERIFIED requires a fresh INTEGRATION_TEST receipt' USING ERRCODE='23514'; END IF;
  IF v_to_state='CANARY_VERIFIED' AND NOT entral.phase203_transition_evidence_includes(
      capability.capability_id,capability.capability_version,v_receipt_ids,ARRAY['CANARY']::text[]
    ) THEN RAISE EXCEPTION 'CANARY_VERIFIED requires a fresh CANARY receipt' USING ERRCODE='23514'; END IF;
  IF v_to_state='ACTIVE' AND (
       NOT entral.phase203_transition_evidence_includes(
         capability.capability_id,capability.capability_version,v_receipt_ids,ARRAY['PRODUCTION_READBACK']::text[]
       ) OR capability.production_readiness<>'REAL' OR capability.failure_state IS NOT NULL
       OR capability.last_verified_at IS NULL
       OR NOT entral.phase203_dependencies_healthy(capability.capability_id,capability.capability_version)
       OR NOT entral.phase203_activation_requirements_healthy(capability.capability_id,capability.capability_version)
       OR NOT entral.phase203_required_evidence_present(
         capability.capability_id,capability.capability_version,capability.required_evidence
       ) OR (capability.kind='INTEGRATION' AND NOT entral.phase203_transition_evidence_includes(
         capability.capability_id,capability.capability_version,v_receipt_ids,
         ARRAY['AUTHENTICATION','AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION','REFRESH_OR_WEBHOOK','FAILURE_HANDLING']::text[]
       ))
     ) THEN RAISE EXCEPTION 'ACTIVE requires complete fresh evidence and healthy tenant capability truth' USING ERRCODE='23514'; END IF;
  v_updated_at := clock_timestamp();
  response := entral.phase203_capability_record_json(capability.capability_id)||jsonb_build_object(
    'lifecycle_state',v_to_state,'public_claim_eligible',false,'pricing_eligibility','NOT_ELIGIBLE',
    'record_version',capability.record_version+1,'updated_at',v_updated_at,'release_version','phase-204'
  );
  INSERT INTO entral.capability_transition_audit(
    transition_id,capability_id,capability_version,from_state,to_state,pricing_eligibility,
    prior_record_version,resulting_record_version,evidence_receipt_ids,reason,actor_id,
    tenant_id,organization_id,business_id,correlation_id,idempotency_key,request_sha256,
    release_version,response_snapshot,requested_at
  ) VALUES (
    v_transition_id,capability.capability_id,capability.capability_version,v_from_state,v_to_state,'NOT_ELIGIBLE',
    capability.record_version,capability.record_version+1,v_receipt_ids,btrim(v_reason),v_actor_id,
    v_tenant_id,v_organization_id,v_business_id,v_correlation_id,
    'phase204:transition:'||v_transition_id::text,v_request_hash,'phase-204',response,v_requested_at
  );
  PERFORM set_config('app.phase203_transition_id',v_transition_id::text,true);
  UPDATE entral.capability_records SET lifecycle_state=v_to_state,public_claim_eligible=false,
    pricing_eligibility='NOT_ELIGIBLE',record_version=record_version+1,updated_at=v_updated_at
  WHERE capability_id=capability.capability_id;
  PERFORM entral.phase203_bump_registry_revision();
  PERFORM entral.phase204_reconcile_unhealthy_dependents(
    v_transition_id,v_actor_id,v_correlation_id,v_tenant_id,v_organization_id
  );
  PERFORM entral.phase204_record_mutation(
    'CAPABILITY_TRANSITION',v_tenant_id,v_organization_id,v_capability_id,NULL,
    v_idempotency_key,v_request_hash,response,entral.phase202_current_actor_id()
  );
  RETURN response;
END
$phase204_transition_wrapper$;

CREATE OR REPLACE FUNCTION entral.phase204_register_capability_installation(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_register_installation$
DECLARE
  capability entral.capability_records%ROWTYPE;
  boundary public."BusinessBoundary"%ROWTYPE;
  v_installation_id uuid;
  v_capability_id uuid;
  v_business_boundary_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  v_actor_id uuid;
  prior_response jsonb;
  response jsonb;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'installation_id','capability_id','business_boundary_id','tenant_id','organization_id',
       'idempotency_key','release_version','requested_at'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 installation registration envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_installation_id := (p_request->>'installation_id')::uuid;
    v_capability_id := (p_request->>'capability_id')::uuid;
    v_business_boundary_id := (p_request->>'business_boundary_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    PERFORM (p_request->>'requested_at')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 installation registration envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255 THEN
    RAISE EXCEPTION 'Phase 204 installation registration violates the canonical contract'
      USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Installation registration requires current Human OWNER authority'
      USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:installation-registration:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('REGISTER_INSTALLATION',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO capability FROM entral.capability_records record
  WHERE record.capability_id=v_capability_id FOR SHARE;
  SELECT * INTO boundary FROM public."BusinessBoundary" business
  WHERE business."id"=v_business_boundary_id FOR SHARE;
  IF capability.capability_id IS NULL OR capability.scope<>'TENANT'
     OR capability.tenant_id IS DISTINCT FROM v_tenant_id
     OR capability.organization_id IS DISTINCT FROM v_organization_id
     OR capability.environment<>'PRODUCTION'
     OR entral.phase203_lifecycle_rank(capability.lifecycle_state)<entral.phase203_lifecycle_rank('IMPLEMENTED')
     OR boundary."id" IS NULL OR boundary."tenantId"<>v_tenant_id
     OR boundary."organizationId"<>v_organization_id OR boundary."status"<>'ACTIVE'
     OR boundary."canonicalBusinessId" IS NULL
     OR NOT EXISTS (
       SELECT 1 FROM entral.businesses business
       WHERE business.id=boundary."canonicalBusinessId" AND business.stable_code='SP-COMMERCE-001'
     )
     OR NOT EXISTS (
       SELECT 1 FROM entral.phase204_capability_source_bindings binding
       WHERE binding.tenant_capability_id=capability.capability_id
         AND binding.tenant_capability_version=capability.capability_version
         AND binding.tenant_id=v_tenant_id AND binding.organization_id=v_organization_id
     ) THEN
    RAISE EXCEPTION 'Installation capability or internal business scope is not eligible'
      USING ERRCODE='23514';
  END IF;
  INSERT INTO entral.tenant_capability_installations(
    installation_id,tenant_id,organization_id,capability_id,capability_version,
    state,plan_eligible,feature_flags,limits,verification_receipt_ids
  ) VALUES (
    v_installation_id,v_tenant_id,v_organization_id,capability.capability_id,
    capability.capability_version,'AVAILABLE',false,'{}'::jsonb,'{}'::jsonb,ARRAY[]::uuid[]
  );
  INSERT INTO entral.phase204_business_capability_installations(
    installation_id,business_boundary_id,tenant_id,organization_id,created_by_actor_id
  ) VALUES (v_installation_id,v_business_boundary_id,v_tenant_id,v_organization_id,v_actor_id);
  PERFORM entral.phase203_bump_registry_revision();
  response := jsonb_build_object(
    'installation_id',v_installation_id,'tenant_id',v_tenant_id,'organization_id',v_organization_id,
    'business_boundary_id',v_business_boundary_id,'capability_id',capability.capability_id,
    'capability_version',capability.capability_version,'state','AVAILABLE','plan_eligible',false,
    'feature_flags','{}'::jsonb,'limits','{}'::jsonb,'suspension_reason',NULL,
    'activated_at',NULL,'verification_receipt_ids','[]'::jsonb,'record_version',1,
    'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'REGISTER_INSTALLATION',v_tenant_id,v_organization_id,v_capability_id,v_installation_id,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_register_installation$;

CREATE OR REPLACE FUNCTION entral.phase204_transition_capability_installation(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_transition_installation$
DECLARE
  installation entral.tenant_capability_installations%ROWTYPE;
  capability entral.capability_records%ROWTYPE;
  business_binding entral.phase204_business_capability_installations%ROWTYPE;
  v_installation_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_transition_id uuid;
  v_actor_id uuid;
  v_correlation_id uuid;
  v_expected_version bigint;
  v_requested_at timestamptz;
  v_from_state text;
  v_to_state text;
  v_reason text;
  v_idempotency_key text;
  v_request_hash text;
  v_receipt_ids uuid[];
  v_now timestamptz;
  prior_response jsonb;
  response jsonb;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'transition_id','installation_id','tenant_id','organization_id','from_state','to_state',
       'expected_record_version','evidence_receipt_ids','reason','correlation_id','idempotency_key',
       'release_version','requested_at'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 installation transition envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_transition_id := (p_request->>'transition_id')::uuid;
    v_installation_id := (p_request->>'installation_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_correlation_id := (p_request->>'correlation_id')::uuid;
    v_expected_version := (p_request->>'expected_record_version')::bigint;
    v_requested_at := (p_request->>'requested_at')::timestamptz;
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
      INTO v_receipt_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'evidence_receipt_ids','[]'::jsonb))
      WITH ORDINALITY AS receipt(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 installation transition envelope' USING ERRCODE='22023';
  END;
  v_from_state := p_request->>'from_state';
  v_to_state := p_request->>'to_state';
  v_reason := p_request->>'reason';
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204' OR v_expected_version<1
     OR v_requested_at IS NULL OR v_requested_at>clock_timestamp()+interval '5 minutes'
     OR v_from_state NOT IN ('AVAILABLE','ACTIVATING','ACTIVE','SUSPENDED','DEACTIVATED')
     OR v_to_state NOT IN ('AVAILABLE','ACTIVATING','ACTIVE','SUSPENDED','DEACTIVATED')
     OR NOT (
       (v_from_state='AVAILABLE' AND v_to_state='ACTIVATING')
       OR (v_from_state='ACTIVATING' AND v_to_state='ACTIVE')
       OR (v_from_state='ACTIVE' AND v_to_state IN ('SUSPENDED','DEACTIVATED'))
       OR (v_from_state='SUSPENDED' AND v_to_state IN ('ACTIVATING','DEACTIVATED'))
       OR (v_from_state='DEACTIVATED' AND v_to_state='ACTIVATING')
     )
     OR COALESCE(length(btrim(v_reason)),0) NOT BETWEEN 1 AND 2000
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR cardinality(v_receipt_ids)<>(SELECT count(DISTINCT value) FROM unnest(v_receipt_ids) value) THEN
    RAISE EXCEPTION 'Phase 204 installation transition violates the canonical contract'
      USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Installation transition requires current Human OWNER authority'
      USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:installation-transition:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('TRANSITION_INSTALLATION',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO installation FROM entral.tenant_capability_installations record
  WHERE record.installation_id=v_installation_id FOR UPDATE;
  SELECT * INTO business_binding FROM entral.phase204_business_capability_installations binding
  WHERE binding.installation_id=v_installation_id;
  IF NOT FOUND OR installation.tenant_id<>v_tenant_id OR installation.organization_id<>v_organization_id
     OR installation.state<>v_from_state OR installation.record_version<>v_expected_version
     OR installation.plan_eligible
     OR business_binding.tenant_id<>v_tenant_id OR business_binding.organization_id<>v_organization_id THEN
    RAISE EXCEPTION 'Installation transition scope or revision conflict' USING ERRCODE='40001';
  END IF;
  SELECT * INTO capability FROM entral.capability_records record
  WHERE record.capability_id=installation.capability_id
    AND record.capability_version=installation.capability_version FOR SHARE;
  IF capability.capability_id IS NULL OR capability.scope<>'TENANT'
     OR capability.tenant_id<>v_tenant_id OR capability.organization_id<>v_organization_id
     OR capability.public_claim_eligible OR capability.pricing_eligibility<>'NOT_ELIGIBLE'
     OR NOT EXISTS (
       SELECT 1 FROM entral.phase204_capability_source_bindings binding
       WHERE binding.tenant_capability_id=capability.capability_id
         AND binding.tenant_capability_version=capability.capability_version
     ) THEN
    RAISE EXCEPTION 'Installation is not bound to a conservative tenant capability'
      USING ERRCODE='23514';
  END IF;
  IF v_to_state='ACTIVE' AND (
       capability.lifecycle_state<>'ACTIVE'
       OR capability.production_readiness<>'REAL' OR capability.failure_state IS NOT NULL
       OR NOT entral.phase203_dependencies_healthy(capability.capability_id,capability.capability_version)
       OR NOT entral.phase203_activation_requirements_healthy(capability.capability_id,capability.capability_version)
       OR NOT entral.phase203_required_evidence_present(
         capability.capability_id,capability.capability_version,capability.required_evidence
       )
       OR NOT entral.phase203_transition_evidence_includes(
         capability.capability_id,capability.capability_version,v_receipt_ids,capability.required_evidence
       )
       OR EXISTS (SELECT 1 FROM unnest(v_receipt_ids) requested_receipt_id
         WHERE NOT EXISTS (SELECT 1 FROM entral.capability_verification_receipts receipt
           WHERE receipt.receipt_id=requested_receipt_id
             AND receipt.capability_id=capability.capability_id
             AND receipt.capability_version=capability.capability_version
             AND receipt.captured_at>=capability.created_at
             AND receipt.captured_at<=v_requested_at
             AND receipt.expires_at IS NOT NULL AND receipt.expires_at>v_requested_at
             AND receipt.expires_at<=receipt.captured_at+interval '180 days'
             AND entral.phase203_current_evidence_receipt_passed(receipt.receipt_id)))
       OR (capability.kind='INTEGRATION' AND NOT entral.phase203_transition_evidence_includes(
         capability.capability_id,capability.capability_version,v_receipt_ids,
         ARRAY['AUTHENTICATION','AUTHORIZATION_SCOPE','OPERATION','READBACK','RECONCILIATION','REFRESH_OR_WEBHOOK','FAILURE_HANDLING']::text[]
       ))
     ) THEN
    RAISE EXCEPTION 'ACTIVE installation requires exact fresh evidence and healthy capability truth'
      USING ERRCODE='23514';
  END IF;
  IF v_to_state<>'ACTIVE' AND cardinality(v_receipt_ids)>0 THEN
    RAISE EXCEPTION 'Only ACTIVE installation transition may bind verification receipts'
      USING ERRCODE='23514';
  END IF;
  v_now := clock_timestamp();
  INSERT INTO entral.tenant_capability_installation_audit(
    transition_id,installation_id,tenant_id,organization_id,business_id,
    capability_id,capability_version,from_state,to_state,prior_record_version,
    resulting_record_version,reason,actor_id,correlation_id,idempotency_key,release_version
  ) VALUES (
    v_transition_id,installation.installation_id,v_tenant_id,v_organization_id,
    business_binding.business_boundary_id,installation.capability_id,installation.capability_version,
    v_from_state,v_to_state,installation.record_version,installation.record_version+1,btrim(v_reason),
    v_actor_id,v_correlation_id,v_idempotency_key,'phase-204'
  );
  UPDATE entral.tenant_capability_installations record
  SET state=v_to_state,
      plan_eligible=false,
      suspension_reason=CASE WHEN v_to_state='SUSPENDED' THEN btrim(v_reason) ELSE NULL END,
      activated_at=CASE WHEN v_to_state='ACTIVE' THEN v_now ELSE record.activated_at END,
      verification_receipt_ids=CASE WHEN v_to_state='ACTIVE' THEN v_receipt_ids ELSE record.verification_receipt_ids END,
      record_version=record.record_version+1,updated_at=v_now
  WHERE record.installation_id=installation.installation_id;
  PERFORM entral.phase203_bump_registry_revision();
  response := jsonb_build_object(
    'installation_id',installation.installation_id,'tenant_id',v_tenant_id,
    'organization_id',v_organization_id,'business_boundary_id',business_binding.business_boundary_id,
    'capability_id',installation.capability_id,'capability_version',installation.capability_version,
    'state',v_to_state,'plan_eligible',false,
    'feature_flags',installation.feature_flags,'limits',installation.limits,
    'suspension_reason',CASE WHEN v_to_state='SUSPENDED' THEN btrim(v_reason) ELSE NULL END,
    'activated_at',CASE WHEN v_to_state='ACTIVE' THEN v_now ELSE installation.activated_at END,
    'verification_receipt_ids',to_jsonb(CASE WHEN v_to_state='ACTIVE' THEN v_receipt_ids ELSE installation.verification_receipt_ids END),
    'record_version',installation.record_version+1,'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'TRANSITION_INSTALLATION',v_tenant_id,v_organization_id,installation.capability_id,
    installation.installation_id,v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_transition_installation$;

CREATE OR REPLACE FUNCTION entral.phase204_tenant_capability_readback(
  p_tenant_id uuid,p_organization_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_capability_readback$
DECLARE response jsonb;
BEGIN
  IF NOT entral.phase204_internal_read_allows(p_tenant_id,p_organization_id) THEN
    RAISE EXCEPTION 'Tenant capability readback is outside the exact internal tenant scope'
      USING ERRCODE='42501';
  END IF;
  SELECT jsonb_build_object(
    'contract_version','1.0.0','schema_version',1,'release_version','phase-204',
    'tenant_id',p_tenant_id,'organization_id',p_organization_id,
    'registry_revision',entral.phase203_registry_revision(),
    'capabilities',COALESCE((
      SELECT jsonb_agg(
        entral.phase203_capability_record_json(binding.tenant_capability_id)||jsonb_build_object(
          'catalog_capability_id',binding.catalog_capability_id,
          'catalog_capability_version',binding.catalog_capability_version,
          'implementation_reference',binding.implementation_reference
        ) ORDER BY capability.capability_key,capability.capability_id
      )
      FROM entral.phase204_capability_source_bindings binding
      JOIN entral.capability_records capability
        ON capability.capability_id=binding.tenant_capability_id
       AND capability.capability_version=binding.tenant_capability_version
      WHERE binding.tenant_id=p_tenant_id AND binding.organization_id=p_organization_id
    ),'[]'::jsonb),
    'installations',COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'installation_id',installation.installation_id,
        'business_boundary_id',business_binding.business_boundary_id,
        'capability_id',installation.capability_id,
        'capability_version',installation.capability_version,
        'state',installation.state,'plan_eligible',installation.plan_eligible,
        'feature_flags',installation.feature_flags,'limits',installation.limits,
        'suspension_reason',installation.suspension_reason,'activated_at',installation.activated_at,
        'verification_receipt_ids',to_jsonb(installation.verification_receipt_ids),
        'record_version',installation.record_version,'created_at',installation.created_at,
        'updated_at',installation.updated_at
      ) ORDER BY installation.installation_id)
      FROM entral.tenant_capability_installations installation
      JOIN entral.phase204_business_capability_installations business_binding
        ON business_binding.installation_id=installation.installation_id
      WHERE installation.tenant_id=p_tenant_id AND installation.organization_id=p_organization_id
    ),'[]'::jsonb),
    'generated_at',clock_timestamp()
  ) INTO response;
  RETURN response;
END
$phase204_capability_readback$;

CREATE OR REPLACE FUNCTION entral.phase204_activate_internal_commerce(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_activate_internal_commerce$
DECLARE
  c_root_id constant uuid := '45638366-d6f0-5b27-91bf-d2362df27922'::uuid;
  c_marshal_id constant uuid := 'a50b1493-ffe1-5373-ad1b-96bb393a0c6f'::uuid;
  c_general_id constant uuid := '9ce85809-e772-5a8f-be8d-34e01a9448a8'::uuid;
  v_activation_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_source_record_id uuid;
  v_artifact_id uuid;
  v_actor_id uuid;
  v_app_user_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  v_requested_at timestamptz;
  v_business_id uuid := public.gen_random_uuid();
  v_boundary_id uuid := public.gen_random_uuid();
  v_commander_id uuid := public.gen_random_uuid();
  v_mission_id uuid := public.gen_random_uuid();
  v_governance_action_id uuid := public.gen_random_uuid();
  v_verification_result_id uuid := public.gen_random_uuid();
  v_storefront_id uuid := public.gen_random_uuid();
  v_soldier_ids uuid[] := ARRAY[public.gen_random_uuid(),public.gen_random_uuid(),public.gen_random_uuid()];
  v_provision_task_ids uuid[] := ARRAY[public.gen_random_uuid(),public.gen_random_uuid(),public.gen_random_uuid()];
  v_operation_task_ids uuid[] := ARRAY[public.gen_random_uuid(),public.gen_random_uuid(),public.gen_random_uuid()];
  v_product_ids uuid[] := ARRAY[
    public.gen_random_uuid(),public.gen_random_uuid(),public.gen_random_uuid(),
    public.gen_random_uuid(),public.gen_random_uuid()
  ];
  v_now timestamptz;
  v_root_count integer;
  v_environment text;
  v_data_residency text;
  v_canonical_idempotency_key text;
  prior_response jsonb;
  v_response jsonb;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'activation_id','tenant_id','organization_id','source_record_id','evidence_artifact_id',
       'repository_reference','release_commit_sha','content_sha256','artifact_storage_uri',
       'idempotency_key','release_version','requested_at'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 internal commerce activation envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_activation_id := (p_request->>'activation_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_source_record_id := (p_request->>'source_record_id')::uuid;
    v_artifact_id := (p_request->>'evidence_artifact_id')::uuid;
    v_requested_at := (p_request->>'requested_at')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 internal commerce activation envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_requested_at IS NULL
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR COALESCE(p_request->>'release_commit_sha','') !~ '^[0-9a-f]{40}$'
     OR COALESCE(p_request->>'content_sha256','') !~ '^[0-9a-f]{64}$'
     OR COALESCE(p_request->>'repository_reference','') !~ '^[^@[:space:]]+@[0-9a-f]{40}:.+'
     OR COALESCE(p_request->>'artifact_storage_uri','') !~ '^[^@[:space:]]+@[0-9a-f]{40}:.+'
     OR p_request->>'repository_reference' NOT LIKE '%@'||(p_request->>'release_commit_sha')||':%'
     OR p_request->>'artifact_storage_uri' NOT LIKE '%@'||(p_request->>'release_commit_sha')||':%' THEN
    RAISE EXCEPTION 'Phase 204 internal commerce activation violates the canonical contract'
      USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Internal commerce activation requires current Human OWNER authority'
      USING ERRCODE='42501';
  END IF;
  IF NOT entral.scope_grant_allows('SYSTEM',NULL,'record_verification') THEN
    RAISE EXCEPTION 'Internal commerce activation requires a trusted deterministic verification grant'
      USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_app_user_id := entral.session_app_user_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:internal-commerce:'||v_idempotency_key,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:business:SP-COMMERCE-001',0));
  prior_response := entral.phase204_mutation_replay('ACTIVATE_INTERNAL_COMMERCE',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;

  SELECT tenant."environment",tenant."dataResidency"
    INTO v_environment,v_data_residency
  FROM public."TenantBoundary" tenant
  WHERE tenant."id"=v_tenant_id AND tenant."organizationId"=v_organization_id
    AND tenant."status"='ACTIVE' FOR SHARE;
  IF v_environment IS DISTINCT FROM 'PRODUCTION' THEN
    RAISE EXCEPTION 'Internal commerce activation requires an active production tenant'
      USING ERRCODE='23514';
  END IF;
  SELECT count(*)::integer INTO v_root_count
  FROM entral.entities entity
  WHERE entity.role='ENTRAL' AND entity.parent_id IS NULL
    AND entity.business_id IS NULL AND entity.status<>'RETIRED';
  IF v_root_count<>1
     OR NOT EXISTS (
       SELECT 1 FROM entral.entities root
       WHERE root.id=c_root_id AND root.stable_code='ENTRAL' AND root.role='ENTRAL'
         AND root.name='ENTRAL' AND root.parent_id IS NULL AND root.business_id IS NULL
         AND root.status='ACTIVE'
     )
     OR NOT EXISTS (
       SELECT 1 FROM entral.entities marshal
       WHERE marshal.id=c_marshal_id AND marshal.stable_code='M02' AND marshal.role='MARSHAL'
         AND marshal.name='Digital and Software Marshal' AND marshal.parent_id=c_root_id
         AND marshal.business_id IS NULL AND marshal.status='ACTIVE'
     )
     OR NOT EXISTS (
       SELECT 1 FROM entral.entities general
       WHERE general.id=c_general_id AND general.stable_code='G-M02-07' AND general.role='GENERAL'
         AND general.name='Digital Products General' AND general.parent_id=c_marshal_id
         AND general.business_id IS NULL AND general.status='ACTIVE'
     ) THEN
    RAISE EXCEPTION 'Canonical ENTRAL, M02, and G-M02-07 authority lineage is not exact'
      USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM entral.businesses WHERE stable_code='SP-COMMERCE-001')
     OR EXISTS (SELECT 1 FROM public."BusinessBoundary" WHERE "stableCode"='SP-COMMERCE-001')
     OR EXISTS (SELECT 1 FROM entral.entities WHERE stable_code IN (
       'C-SP-COMMERCE-001','S-SP-COMMERCE-001-01','S-SP-COMMERCE-001-02','S-SP-COMMERCE-001-03'
     )) THEN
    RAISE EXCEPTION 'SP-COMMERCE-001 or its exact hierarchy already exists outside this activation receipt'
      USING ERRCODE='23505';
  END IF;

  PERFORM set_config('app.correlation_id',v_activation_id::text,true);
  PERFORM set_config('app.action_reason','Phase 204 owner-authorized canonical internal commerce activation.',true);
  INSERT INTO entral.entities(
    id,stable_code,role,name,parent_id,status,definition,source_version,
    authority_profile_id,configuration,created_by_user_id
  ) VALUES (
    v_commander_id,'C-SP-COMMERCE-001','COMMANDER','Contractor Operations Products Commander',
    c_general_id,'ACTIVE','Commands the bounded Sovereign Protocol internal contractor-products business.',
    'phase-204','20400000-0001-4000-8000-000000000001'::uuid,
    jsonb_build_object(
      'internal_code','SP-COMMERCE-001','external_publication_authority',false,
      'maximum_setup_spend',150,'paid_advertising_budget',0,'provider_preference','ETSY'
    ),v_app_user_id
  );
  INSERT INTO entral.businesses(
    id,stable_code,name,legal_name,brand_name,commander_id,general_id,marshal_id,
    status,primary_objective,currency,timezone,metadata
  ) VALUES (
    v_business_id,'SP-COMMERCE-001','Contractor Operations Products',NULL,NULL,
    v_commander_id,c_general_id,c_marshal_id,'BUILDING',
    'Produce and operate evidence-bound contractor operations products without unsupported claims.','USD',
    'America/Los_Angeles',jsonb_build_object(
      'internal_business',true,'phase',204,'activation_id',v_activation_id,
      'public_brand_selected',false,'storefront_preference','ETSY'
    )
  );
  INSERT INTO public."BusinessBoundary"(
    "id","organizationId","tenantId","canonicalBusinessId","stableCode",
    "environment","dataResidency","status"
  ) VALUES (
    v_boundary_id,v_organization_id,v_tenant_id,v_business_id,'SP-COMMERCE-001',
    v_environment,v_data_residency,'ACTIVE'
  );

  v_canonical_idempotency_key := 'phase204:canonical:'||v_activation_id::text;
  INSERT INTO entral.idempotency_keys(
    key,operation,scope_type,scope_id,request_sha256,status,locked_until
  ) VALUES (
    v_canonical_idempotency_key,'phase204.internal-commerce.activate','BUSINESS',v_business_id,
    v_request_hash,'IN_PROGRESS',clock_timestamp()+interval '5 minutes'
  );
  INSERT INTO entral.governance_actions(
    id,action_type,status,initiated_by_kind,initiated_by_user_id,target_type,target_id,
    business_id,requested_outcome,reason,authority_basis,risk_class,confidence,
    proposed_changes,expected_version,before_state,rollback_plan,verification_plan,
    idempotency_key,correlation_id
  ) VALUES (
    v_governance_action_id,'CREATE','PROPOSED','HUMAN',v_app_user_id,'BUSINESS',v_business_id,
    v_business_id,'Activate one tenant-isolated internal commerce business with bounded work and evidence.',
    'Owner-approved Phase 204 TaskPacket P204-INTERNAL-COMMERCE-ACTIVATION-001.',
    jsonb_build_object('actor_id',v_actor_id,'tenant_id',v_tenant_id,'organization_id',v_organization_id,'role','OWNER'),
    'HIGH',1.0000,jsonb_build_object(
      'business_code','SP-COMMERCE-001','maximum_setup_spend',150,
      'paid_advertising_budget',0,'first_provider','ETSY','external_publication',false
    ),1,NULL,
    jsonb_build_object(
      'action','Set commerce control to KILLED or PUBLICATION_DISABLED, pause entities, preserve immutable evidence.'
    ),
    jsonb_build_object(
      'lineage',true,'tenant_boundary',true,'mission_tasks',true,'evidence',true,
      'events_outbox',true,'no_financial_snapshot',true
    ),v_canonical_idempotency_key,v_activation_id
  );
  UPDATE entral.governance_actions SET status='VALIDATING'
  WHERE id=v_governance_action_id;
  INSERT INTO entral.policy_checks(governance_action_id,check_name,passed,decision,evidence)
  VALUES
    (v_governance_action_id,'EXACT_COMMERCE_AUTHORITY_LINEAGE',true,'ALLOW',jsonb_build_object('root_id',c_root_id,'marshal_id',c_marshal_id,'general_id',c_general_id)),
    (v_governance_action_id,'EXACT_TENANT_OWNER_BOUNDARY',true,'ALLOW',jsonb_build_object('tenant_id',v_tenant_id,'organization_id',v_organization_id,'actor_id',v_actor_id)),
    (v_governance_action_id,'NO_EXTERNAL_PUBLICATION_OR_SPEND',true,'ALLOW',jsonb_build_object('publication',false,'maximum_setup_spend',150,'paid_advertising_budget',0));
  UPDATE entral.governance_actions
  SET status='AUTHORIZED',authorized_at=clock_timestamp()
  WHERE id=v_governance_action_id;
  UPDATE entral.governance_actions
  SET status='EXECUTING',started_at=clock_timestamp()
  WHERE id=v_governance_action_id;
  PERFORM set_config('app.governance_action_id',v_governance_action_id::text,true);

  INSERT INTO entral.missions(
    id,stable_code,objective,context,issuer_user_id,owner_entity_id,business_id,
    constraints,budget,required_outputs,success_criteria,status,priority,acknowledged_at,started_at
  ) VALUES (
    v_mission_id,'SP-COMMERCE-001-LAUNCH-M01',
    'Create the bounded internal commerce operating line and prepare its evidence-bound first storefront.',
    jsonb_build_object('phase',204,'activation_id',v_activation_id,'task_packet','P204-INTERNAL-COMMERCE-ACTIVATION-001'),
    v_app_user_id,v_commander_id,v_business_id,
    jsonb_build_object(
      'external_publication_requires_owner_approval',true,'provider_credentials_forbidden',true,
      'unsupported_claims_forbidden',true,'second_store_forbidden',true,'paid_advertising_forbidden',true
    ),
    jsonb_build_object('maximum_setup_spend',150,'currency','USD','paid_advertising_budget',0),
    jsonb_build_array('four finished products','one bundle','verified asset gates','owner publication envelope','provider readback'),
    jsonb_build_array('canonical business visible','three bounded Soldiers own active work','no publication before exact approval'),
    'ACTIVE',100,clock_timestamp(),clock_timestamp()
  );
  INSERT INTO entral.tasks(
    id,stable_code,mission_id,owner_entity_id,business_id,objective,inputs,constraints,
    required_outputs,status,priority,max_retries,started_at
  ) VALUES
    (v_provision_task_ids[1],'SP-COMMERCE-001-PROVISION-S01',v_mission_id,v_commander_id,v_business_id,
     'Provision the Product Integrity Soldier under the exact business Commander.',
     jsonb_build_object('soldier_id',v_soldier_ids[1]),jsonb_build_object('permanent_idle_fleet',false),
     jsonb_build_array('canonical Soldier','active bounded task'),'ACTIVE',100,0,clock_timestamp()),
    (v_provision_task_ids[2],'SP-COMMERCE-001-PROVISION-S02',v_mission_id,v_commander_id,v_business_id,
     'Provision the Storefront Operations Soldier under the exact business Commander.',
     jsonb_build_object('soldier_id',v_soldier_ids[2]),jsonb_build_object('permanent_idle_fleet',false),
     jsonb_build_array('canonical Soldier','active bounded task'),'ACTIVE',100,0,clock_timestamp()),
    (v_provision_task_ids[3],'SP-COMMERCE-001-PROVISION-S03',v_mission_id,v_commander_id,v_business_id,
     'Provision the Commerce Reconciliation Soldier under the exact business Commander.',
     jsonb_build_object('soldier_id',v_soldier_ids[3]),jsonb_build_object('permanent_idle_fleet',false),
     jsonb_build_array('canonical Soldier','active bounded task'),'ACTIVE',100,0,clock_timestamp());
  INSERT INTO entral.entities(
    id,stable_code,role,name,parent_id,business_id,status,definition,source_version,
    authority_profile_id,configuration,created_by_user_id
  ) VALUES
    (v_soldier_ids[1],'S-SP-COMMERCE-001-01','SOLDIER','Product Integrity Soldier',v_commander_id,v_business_id,'BUILDING',
     'Owns product originality, licensing, claims, disclosure, integrity, and delivery gates.',
     'phase-204','20400000-0001-4000-8000-000000000002'::uuid,
     jsonb_build_object('created_by_mission_id',v_mission_id,'created_by_task_id',v_provision_task_ids[1],'bounded_role','PRODUCT_INTEGRITY'),v_app_user_id),
    (v_soldier_ids[2],'S-SP-COMMERCE-001-02','SOLDIER','Storefront Operations Soldier',v_commander_id,v_business_id,'BUILDING',
     'Owns provider preparation and approved listing maintenance without independent publication authority.',
     'phase-204','20400000-0001-4000-8000-000000000002'::uuid,
     jsonb_build_object('created_by_mission_id',v_mission_id,'created_by_task_id',v_provision_task_ids[2],'bounded_role','STOREFRONT_OPERATIONS'),v_app_user_id),
    (v_soldier_ids[3],'S-SP-COMMERCE-001-03','SOLDIER','Commerce Reconciliation Soldier',v_commander_id,v_business_id,'BUILDING',
     'Owns observed provider facts, economics reconciliation, and unavailable-data labeling.',
     'phase-204','20400000-0001-4000-8000-000000000002'::uuid,
     jsonb_build_object('created_by_mission_id',v_mission_id,'created_by_task_id',v_provision_task_ids[3],'bounded_role','COMMERCE_RECONCILIATION'),v_app_user_id);
  UPDATE entral.tasks task SET
    status='COMPLETED',completed_at=clock_timestamp(),
    result=jsonb_build_object('created_soldier_id',CASE task.id
      WHEN v_provision_task_ids[1] THEN v_soldier_ids[1]
      WHEN v_provision_task_ids[2] THEN v_soldier_ids[2]
      ELSE v_soldier_ids[3] END,'verified',true)
  WHERE task.id=ANY(v_provision_task_ids);
  UPDATE entral.entities SET status='ACTIVE'
  WHERE id=v_commander_id OR id=ANY(v_soldier_ids);
  INSERT INTO entral.tasks(
    id,stable_code,mission_id,owner_entity_id,business_id,objective,inputs,constraints,
    required_outputs,status,priority,max_retries,started_at
  ) VALUES
    (v_operation_task_ids[1],'SP-COMMERCE-001-OPERATE-S01',v_mission_id,v_soldier_ids[1],v_business_id,
     'Verify every product asset and product-specific release gate.',
     '{}'::jsonb,jsonb_build_object('unsupported_claims',false,'unresolved_licenses',false),
     jsonb_build_array('five complete gate sets','file integrity receipts'),'ACTIVE',90,3,clock_timestamp()),
    (v_operation_task_ids[2],'SP-COMMERCE-001-OPERATE-S02',v_mission_id,v_soldier_ids[2],v_business_id,
     'Prepare Etsy first and stop at exact owner/provider authorization boundaries.',
     '{}'::jsonb,jsonb_build_object('owner_approval_required',true,'gumroad_requires_etsy_blocker',true),
     jsonb_build_array('storefront readiness','owner publication envelope','listing readback'),'ACTIVE',90,3,clock_timestamp()),
    (v_operation_task_ids[3],'SP-COMMERCE-001-OPERATE-S03',v_mission_id,v_soldier_ids[3],v_business_id,
     'Reconcile observed listings, orders, fees, refunds, delivery, and payouts without estimates.',
     '{}'::jsonb,jsonb_build_object('estimated_provider_fees',false,'unavailable_data_must_be_labeled',true),
     jsonb_build_array('observed provider facts','real economics or unavailable labels'),'ACTIVE',90,3,clock_timestamp());

  INSERT INTO entral.phase204_internal_commerce_products(
    product_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,
    stable_code,title,product_kind,product_version,initial_price,currency,created_by_actor_id
  ) VALUES
    (v_product_ids[1],v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
     'LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT','Lead Response and Estimate Follow-Up Kit','PRODUCT','1.0.0',29,'USD',v_actor_id),
    (v_product_ids[2],v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
     'SCOPE_CHANGE_ORDER_CONTROL_PACK','Scope and Change-Order Control Pack','PRODUCT','1.0.0',49,'USD',v_actor_id),
    (v_product_ids[3],v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
     'BILLING_COLLECTIONS_ACCELERATOR','Billing and Collections Accelerator','PRODUCT','1.0.0',49,'USD',v_actor_id),
    (v_product_ids[4],v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
     'WEEKLY_OWNER_COMMAND_DASHBOARD','Weekly Owner Command Dashboard','PRODUCT','1.0.0',39,'USD',v_actor_id),
    (v_product_ids[5],v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
     'COMPLETE_CONTRACTOR_CONTROL_BUNDLE','Complete Contractor Control Bundle','BUNDLE','1.0.0',119,'USD',v_actor_id);
  INSERT INTO entral.phase204_product_bundle_items(bundle_product_id,component_product_id,ordinal)
  VALUES
    (v_product_ids[5],v_product_ids[1],1),
    (v_product_ids[5],v_product_ids[2],2),
    (v_product_ids[5],v_product_ids[3],3),
    (v_product_ids[5],v_product_ids[4],4);
  INSERT INTO entral.phase204_storefronts(
    storefront_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,
    preferred_provider,created_by_actor_id
  ) VALUES (v_storefront_id,v_tenant_id,v_organization_id,v_boundary_id,v_business_id,'ETSY',v_actor_id);
  INSERT INTO entral.phase204_storefront_state_events(
    storefront_state_event_id,storefront_id,tenant_id,organization_id,business_boundary_id,
    provider,state,public_brand,market_evidence_source_record_id,etsy_blocker_code,
    etsy_blocker_evidence_source_record_id,state_reason,actor_id,occurred_at
  ) VALUES (
    public.gen_random_uuid(),v_storefront_id,v_tenant_id,v_organization_id,v_boundary_id,
    'ETSY','OWNER_ACTION_REQUIRED',NULL,NULL,NULL,NULL,
    'Etsy is first; public brand, account authorization, asset gates, and owner publication approval are not yet complete.',
    v_actor_id,clock_timestamp()
  );
  INSERT INTO entral.phase204_commerce_control_events(
    control_event_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,
    state,reason,actor_id,occurred_at
  ) VALUES (
    public.gen_random_uuid(),v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
    'PUBLICATION_DISABLED','Initial fail-closed state pending finished assets, market-backed brand, provider readiness, and exact owner approval.',
    v_actor_id,clock_timestamp()
  );
  INSERT INTO entral.phase204_storefront_listing_records(
    listing_record_id,storefront_id,product_id,product_code,tenant_id,organization_id,
    business_boundary_id,provider,status,price_cents,delivery_manifest_sha256,
    claims_manifest_sha256,provider_evidence_ids,actor_id
  ) SELECT public.gen_random_uuid(),v_storefront_id,product.product_id,product.product_code,
      v_tenant_id,v_organization_id,v_boundary_id,'ETSY','DRAFT',product.price_cents,
      encode(public.digest('','sha256'),'hex'),encode(public.digest('','sha256'),'hex'),
      ARRAY[]::uuid[],v_actor_id
    FROM entral.phase204_internal_commerce_products product
    WHERE product.canonical_business_id=v_business_id;
  INSERT INTO entral.phase204_commerce_controls(
    control_record_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,
    control_code,availability,control_state,requires_owner_approval,action_id,reason,
    evidence_ids,verified_at,version,actor_id
  ) VALUES
    (public.gen_random_uuid(),v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
     'PAUSE_BUSINESS','AVAILABLE','ARMED',false,NULL,
     NULL,ARRAY[v_artifact_id]::uuid[],
     clock_timestamp(),1,v_actor_id),
    (public.gen_random_uuid(),v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
     'DISABLE_PUBLICATION','AVAILABLE','ENGAGED',false,v_governance_action_id,
     'Publication starts fail closed pending evidence-bound owner approval.',ARRAY[v_artifact_id]::uuid[],
     clock_timestamp(),1,v_actor_id),
    (public.gen_random_uuid(),v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
     'KILL_BUSINESS','AVAILABLE','ARMED',true,NULL,
     NULL,ARRAY[v_artifact_id]::uuid[],
     clock_timestamp(),1,v_actor_id);
  INSERT INTO entral.phase204_operational_metric_truth(
    metric_truth_id,tenant_id,organization_id,business_boundary_id,storefront_id,
    scope_type,scope_code,product_id,metric_code,truth_state,unit,currency,
    unavailable_reason,is_estimate,actor_id
  )
  SELECT public.gen_random_uuid(),v_tenant_id,v_organization_id,v_boundary_id,v_storefront_id,
    scope.scope_type,scope.scope_code,scope.product_id,metric.metric_code,'UNAVAILABLE',
    CASE WHEN metric.metric_code IN ('GROSS_SALES','PLATFORM_FEES','PAYMENT_PROCESSING_FEES',
      'REFUNDS','NET_RECEIPTS','CONTRIBUTION_MARGIN') THEN 'USD_CENTS'
      WHEN metric.metric_code='CONVERSION' THEN 'RATIO'
      WHEN metric.metric_code='SUPPORT_VOLUME' THEN 'COUNT' ELSE 'SCORE' END,
    CASE WHEN metric.metric_code IN ('GROSS_SALES','PLATFORM_FEES','PAYMENT_PROCESSING_FEES',
      'REFUNDS','NET_RECEIPTS','CONTRIBUTION_MARGIN') THEN 'USD'::char(3) ELSE NULL END,
    'No provider observation exists yet; no numeric value is inferred.',false,v_actor_id
  FROM (
    SELECT 'BUSINESS'::text AS scope_type,'SP-COMMERCE-001'::text AS scope_code,NULL::uuid AS product_id
    UNION ALL
    SELECT 'PRODUCT',product.product_code,product.product_id
    FROM entral.phase204_internal_commerce_products product
    WHERE product.canonical_business_id=v_business_id
  ) scope
  CROSS JOIN unnest(ARRAY[
    'GROSS_SALES','PLATFORM_FEES','PAYMENT_PROCESSING_FEES','REFUNDS','NET_RECEIPTS',
    'CONTRIBUTION_MARGIN','CONVERSION','SUPPORT_VOLUME','PRODUCT_PERFORMANCE'
  ]::text[]) metric(metric_code);

  INSERT INTO entral.business_profiles(
    business_id,offer,target_customer,channels,operating_plan,assets,constraints
  ) VALUES (
    v_business_id,
    jsonb_build_object(
      'working_name','Contractor Operations Products','public_brand',NULL,
      'products',jsonb_build_array(
        jsonb_build_object('product_id',v_product_ids[1],'title','Lead Response and Estimate Follow-Up Kit','initial_price',29,'currency','USD'),
        jsonb_build_object('product_id',v_product_ids[2],'title','Scope and Change-Order Control Pack','initial_price',49,'currency','USD'),
        jsonb_build_object('product_id',v_product_ids[3],'title','Billing and Collections Accelerator','initial_price',49,'currency','USD'),
        jsonb_build_object('product_id',v_product_ids[4],'title','Weekly Owner Command Dashboard','initial_price',39,'currency','USD'),
        jsonb_build_object('product_id',v_product_ids[5],'title','Complete Contractor Control Bundle','initial_price',119,'currency','USD')
      )
    ),
    jsonb_build_object('market_hypothesis','specialty contractors and field-service businesses','verification_state','UNVERIFIED'),
    jsonb_build_array(jsonb_build_object('provider','ETSY','state','OWNER_ACTION_REQUIRED')),
    jsonb_build_object('launch_mission_id',v_mission_id,'storefront_id',v_storefront_id,'phase',204),
    '[]'::jsonb,
    jsonb_build_object(
      'maximum_setup_spend',150,'currency','USD','paid_advertising_budget',0,
      'external_publication_requires_owner_approval',true,'second_store',false,
      'unsupported_claims',false,'unresolved_licensing',false
    )
  );
  INSERT INTO entral.business_states(
    business_id,health_state,health_score,health_drivers,current_phase,primary_objective,
    top_exception,current_work,source_freshness,last_material_change_at
  ) VALUES (
    v_business_id,'UNKNOWN',NULL,'[]'::jsonb,'PHASE_204_INTERNAL_COMMERCE',
    'Complete product evidence and the owner-approved Etsy-first publication envelope.',
    'External publication is disabled until exact owner/provider actions and approval are complete.',
    jsonb_build_array(
      jsonb_build_object('mission_id',v_mission_id,'task_id',v_operation_task_ids[1],'owner_entity_id',v_soldier_ids[1],'status','ACTIVE'),
      jsonb_build_object('mission_id',v_mission_id,'task_id',v_operation_task_ids[2],'owner_entity_id',v_soldier_ids[2],'status','ACTIVE'),
      jsonb_build_object('mission_id',v_mission_id,'task_id',v_operation_task_ids[3],'owner_entity_id',v_soldier_ids[3],'status','ACTIVE')
    ),
    jsonb_build_object('provider_data','UNAVAILABLE','financial_data','UNAVAILABLE'),clock_timestamp()
  );

  INSERT INTO entral.source_records(
    id,source_type,provider,external_id,business_id,entity_id,uri,content_sha256,
    observed_at,trust_level,metadata
  ) VALUES (
    v_source_record_id,'REPOSITORY_RELEASE','GITHUB',p_request->>'release_commit_sha',
    v_business_id,v_commander_id,p_request->>'repository_reference',p_request->>'content_sha256',
    v_requested_at,'AUTHORITATIVE',jsonb_build_object(
      'release_version','phase-204','task_packet','P204-INTERNAL-COMMERCE-ACTIVATION-001',
      'activation_id',v_activation_id
    )
  );
  INSERT INTO entral.artifacts(
    id,artifact_kind,stable_code,name,business_id,entity_id,mission_id,storage_uri,
    media_type,content_sha256,source_record_id,classification,retention_policy,metadata
  ) VALUES (
    v_artifact_id,'EVIDENCE_BUNDLE','SP-COMMERCE-001-ACTIVATION-EVIDENCE',
    'SP-COMMERCE-001 canonical activation evidence',v_business_id,v_commander_id,v_mission_id,
    p_request->>'artifact_storage_uri','application/json',p_request->>'content_sha256',
    v_source_record_id,'INTERNAL',jsonb_build_object('retention','PERMANENT'),
    jsonb_build_object('release_version','phase-204','activation_id',v_activation_id)
  );
  INSERT INTO entral.evidence_links(from_type,from_id,artifact_id,evidence_role,claim,locator)
  SELECT 'MISSION',v_mission_id,v_artifact_id,'ACTIVATION_EVIDENCE',
    'Canonical internal commerce activation is source-bound and tenant-scoped.',
    jsonb_build_object('activation_id',v_activation_id)
  UNION ALL
  SELECT 'TASK',task_id,v_artifact_id,'ENTITY_CREATION_EVIDENCE',
    'Mission task created one bounded Soldier and retained an active owned operation.',
    jsonb_build_object('task_id',task_id)
  FROM unnest(v_provision_task_ids) task_id
  UNION ALL
  SELECT 'TASK',task_id,v_artifact_id,'OPERATION_SCOPE_EVIDENCE',
    'Operational work is bounded by Phase 204 authority and publication controls.',
    jsonb_build_object('task_id',task_id)
  FROM unnest(v_operation_task_ids) task_id;

  v_now := clock_timestamp();
  INSERT INTO entral.governance_action_steps(
    id,governance_action_id,step_number,name,status,input,output,started_at,completed_at
  ) VALUES
    (public.gen_random_uuid(),v_governance_action_id,1,'Create exact tenant-bound canonical hierarchy','SUCCEEDED',
     jsonb_build_object('marshal_id',c_marshal_id,'general_id',c_general_id),
     jsonb_build_object('business_id',v_business_id,'commander_id',v_commander_id,'soldier_ids',to_jsonb(v_soldier_ids)),v_now,v_now),
    (public.gen_random_uuid(),v_governance_action_id,2,'Create bounded mission, completed provisioning, and active owned work','SUCCEEDED',
     jsonb_build_object('mission_id',v_mission_id),
     jsonb_build_object('completed_provision_task_ids',to_jsonb(v_provision_task_ids),'active_operation_task_ids',to_jsonb(v_operation_task_ids)),v_now,v_now),
    (public.gen_random_uuid(),v_governance_action_id,3,'Bind evidence and fail-closed commerce controls','SUCCEEDED',
     jsonb_build_object('source_record_id',v_source_record_id,'artifact_id',v_artifact_id),
     jsonb_build_object('storefront_id',v_storefront_id,'control_state','PUBLICATION_DISABLED','product_count',5),v_now,v_now);
  INSERT INTO entral.policy_checks(governance_action_id,check_name,passed,decision,evidence)
  VALUES
    (v_governance_action_id,'NO_FAKE_FINANCIAL_SNAPSHOT',true,'ALLOW',jsonb_build_object('financial_snapshot_count',0)),
    (v_governance_action_id,'MISSION_CREATED_SOLDIERS_HAVE_ACTIVE_WORK',true,'ALLOW',jsonb_build_object('soldier_count',3,'active_owned_task_count',3)),
    (v_governance_action_id,'PUBLICATION_FAIL_CLOSED',true,'ALLOW',jsonb_build_object('control_state','PUBLICATION_DISABLED','owner_approval_count',0));

  UPDATE entral.businesses business
  SET status='OPERATING',metadata=business.metadata||jsonb_build_object(
    'governance_action_id',v_governance_action_id,'launch_mission_id',v_mission_id,
    'storefront_id',v_storefront_id,'product_count',5,'soldier_count',3
  )
  WHERE business.id=v_business_id;
  UPDATE entral.governance_actions
  SET status='VERIFYING',after_state=jsonb_build_object(
    'business_id',v_business_id,'business_boundary_id',v_boundary_id,
    'commander_id',v_commander_id,'soldier_ids',to_jsonb(v_soldier_ids),
    'launch_mission_id',v_mission_id,'product_ids',to_jsonb(v_product_ids),
    'storefront_id',v_storefront_id,'publication_state','PUBLICATION_DISABLED'
  )
  WHERE id=v_governance_action_id;

  IF (SELECT count(*) FROM entral.entities WHERE id=ANY(v_soldier_ids) AND role='SOLDIER'
      AND parent_id=v_commander_id AND business_id=v_business_id AND status='ACTIVE')<>3
     OR (SELECT count(*) FROM entral.tasks WHERE id=ANY(v_provision_task_ids) AND status='COMPLETED')<>3
     OR (SELECT count(*) FROM entral.tasks WHERE id=ANY(v_operation_task_ids) AND status='ACTIVE'
         AND owner_entity_id=ANY(v_soldier_ids))<>3
     OR (SELECT count(*) FROM entral.phase204_internal_commerce_products WHERE canonical_business_id=v_business_id)<>5
     OR (SELECT count(*) FROM entral.phase204_product_bundle_items WHERE bundle_product_id=v_product_ids[5])<>4
     OR (SELECT count(*) FROM entral.phase204_storefront_listing_records
         WHERE storefront_id=v_storefront_id AND status='DRAFT')<>5
     OR (SELECT count(*) FROM entral.phase204_operational_metric_truth
         WHERE storefront_id=v_storefront_id AND truth_state='UNAVAILABLE')<>54
     OR (SELECT count(DISTINCT control_code) FROM entral.phase204_commerce_controls
         WHERE business_boundary_id=v_boundary_id AND availability='AVAILABLE')<>3
     OR NOT EXISTS (
       SELECT 1 FROM public."BusinessBoundary" boundary
       WHERE boundary."id"=v_boundary_id AND boundary."canonicalBusinessId"=v_business_id
         AND boundary."tenantId"=v_tenant_id AND boundary."organizationId"=v_organization_id
         AND boundary."status"='ACTIVE'
     )
     OR EXISTS (SELECT 1 FROM entral.financial_snapshots WHERE business_id=v_business_id)
     OR EXISTS (SELECT 1 FROM entral.businesses WHERE id=v_business_id AND brand_name IS NOT NULL)
     OR NOT EXISTS (SELECT 1 FROM entral.canonical_events WHERE aggregate_type='BUSINESSES' AND aggregate_id=v_business_id)
     OR NOT EXISTS (SELECT 1 FROM entral.transactional_outbox outbox
       JOIN entral.canonical_events event ON event.id=outbox.event_id
       WHERE event.aggregate_id=v_business_id) THEN
    RAISE EXCEPTION 'Phase 204 canonical internal commerce activation verification failed'
     USING ERRCODE='23514';
  END IF;
  v_now := clock_timestamp();
  INSERT INTO entral.verification_results(
    id,subject_type,subject_id,status,verification_method,assertions,
    observed_state,expected_state,evidence_refs,started_at,completed_at
  ) VALUES (
    v_verification_result_id,'GOVERNANCE_ACTION',v_governance_action_id,'PASSED',
    'phase204-internal-commerce-deterministic-readback-v1',
    jsonb_build_object('checks',jsonb_build_array(
      'exact canonical hierarchy and tenant boundary',
      'three mission-created Soldiers with active owned work',
      'exact five-product line and bundle composition',
      'five draft listings and fifty-four unavailable metric truth cells',
      'three independent controls with publication fail closed',
      'canonical event and transactional outbox evidence'
    )),
    jsonb_build_object(
      'business_id',v_business_id,'business_boundary_id',v_boundary_id,
      'soldier_count',3,'product_count',5,'draft_listing_count',5,
      'unavailable_metric_count',54,'control_count',3,'publication_state','PUBLICATION_DISABLED'
    ),
    jsonb_build_object(
      'business_code','SP-COMMERCE-001','soldier_count',3,'product_count',5,
      'draft_listing_count',5,'unavailable_metric_count',54,'control_count',3,
      'publication_state','PUBLICATION_DISABLED'
    ),
    '[]'::jsonb,v_now,v_now
  );
  UPDATE entral.governance_actions
  SET verification_result_id=v_verification_result_id
  WHERE id=v_governance_action_id;
  UPDATE entral.governance_actions
  SET status='SUCCEEDED',completed_at=clock_timestamp()
  WHERE id=v_governance_action_id;

  v_response := jsonb_build_object(
    'activation_id',v_activation_id,'tenant_id',v_tenant_id,'organization_id',v_organization_id,
    'business_boundary_id',v_boundary_id,'canonical_business_id',v_business_id,
    'business_code','SP-COMMERCE-001','working_name','Contractor Operations Products',
    'commander_id',v_commander_id,'marshal_id',c_marshal_id,'general_id',c_general_id,
    'launch_mission_id',v_mission_id,'governance_action_id',v_governance_action_id,
    'soldier_ids',to_jsonb(v_soldier_ids),'completed_provision_task_ids',to_jsonb(v_provision_task_ids),
    'active_operation_task_ids',to_jsonb(v_operation_task_ids),'product_ids',to_jsonb(v_product_ids),
    'storefront_id',v_storefront_id,'preferred_provider','ETSY',
    'commerce_control_state','PUBLICATION_DISABLED','public_brand',NULL,
    'source_record_id',v_source_record_id,'evidence_artifact_id',v_artifact_id,
    'release_version','phase-204'
  );
  INSERT INTO entral.phase204_internal_commerce_activations(
    activation_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,
    commander_id,marshal_id,general_id,launch_mission_id,governance_action_id,
    source_record_id,evidence_artifact_id,actor_id,idempotency_key,request_sha256,response_snapshot
  ) VALUES (
    v_activation_id,v_tenant_id,v_organization_id,v_boundary_id,v_business_id,
    v_commander_id,c_marshal_id,c_general_id,v_mission_id,v_governance_action_id,
    v_source_record_id,v_artifact_id,v_actor_id,v_idempotency_key,v_request_hash,v_response
  );
  PERFORM entral.phase204_record_mutation(
    'ACTIVATE_INTERNAL_COMMERCE',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,v_response,v_actor_id
  );
  UPDATE entral.idempotency_keys
  SET status='SUCCEEDED',response=v_response,locked_until=NULL,completed_at=clock_timestamp()
  WHERE key=v_canonical_idempotency_key;
  RETURN v_response;
END
$phase204_activate_internal_commerce$;

-- Product files and their verification receipts must first exist as canonical,
-- repository-backed evidence in the same business. This narrow function is the
-- only Phase 204 path that creates those prerequisite source/artifact records.
CREATE OR REPLACE FUNCTION entral.phase204_register_product_evidence(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_register_product_evidence$
DECLARE
  v_source_record_id uuid;
  v_artifact_id uuid;
  v_product_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_captured_at timestamptz;
  v_actor_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  v_artifact_kind entral.artifact_kind;
  v_external_id text;
  prior_response jsonb;
  response jsonb;
  product entral.phase204_internal_commerce_products%ROWTYPE;
  activation entral.phase204_internal_commerce_activations%ROWTYPE;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'source_record_id','artifact_id','product_id','tenant_id','organization_id',
       'evidence_kind','evidence_code','file_name','media_type','byte_size',
       'content_sha256','source_reference','captured_at','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 product evidence envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_source_record_id := (p_request->>'source_record_id')::uuid;
    v_artifact_id := (p_request->>'artifact_id')::uuid;
    v_product_id := (p_request->>'product_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_captured_at := (p_request->>'captured_at')::timestamptz;
    PERFORM (p_request->>'byte_size')::bigint;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 product evidence envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR p_request->>'evidence_kind' NOT IN ('PRODUCT_ASSET','PRODUCT_GATE')
     OR COALESCE(p_request->>'evidence_code','') !~ '^[A-Z][A-Z0-9_]{1,63}$'
     OR length(btrim(COALESCE(p_request->>'file_name',''))) NOT BETWEEN 1 AND 255
     OR COALESCE(p_request->>'media_type','') !~ '^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+$'
     OR (p_request->>'byte_size')::bigint<=0
     OR COALESCE(p_request->>'content_sha256','') !~ '^[0-9a-f]{64}$'
     OR COALESCE(p_request->>'source_reference','') !~ '^[^@[:space:]]+@[0-9a-f]{40}:.+'
     OR v_captured_at IS NULL OR v_captured_at>clock_timestamp()+interval '5 minutes' THEN
    RAISE EXCEPTION 'Phase 204 product evidence violates the source contract' USING ERRCODE='22023';
  END IF;
  v_artifact_kind := CASE
    WHEN p_request->>'media_type'='application/pdf' THEN 'DOCUMENT'::entral.artifact_kind
    WHEN p_request->>'media_type' IN (
      'text/csv','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) THEN 'DATASET'::entral.artifact_kind
    WHEN p_request->>'media_type'='application/zip' THEN 'EXPORT'::entral.artifact_kind
    WHEN p_request->>'media_type'='application/json' THEN 'REPORT'::entral.artifact_kind
    ELSE 'OTHER'::entral.artifact_kind
  END;
  IF NOT entral.phase204_operation_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Product evidence recording requires exact tenant operations authority'
      USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:product-evidence:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay(
    'REGISTER_PRODUCT_EVIDENCE',v_idempotency_key,v_request_hash
  );
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;

  SELECT * INTO product FROM entral.phase204_internal_commerce_products
  WHERE product_id=v_product_id AND tenant_id=v_tenant_id AND organization_id=v_organization_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product evidence is outside the exact Phase 204 tenant scope'
      USING ERRCODE='23503';
  END IF;
  SELECT * INTO activation FROM entral.phase204_internal_commerce_activations
  WHERE business_boundary_id=product.business_boundary_id
    AND tenant_id=v_tenant_id AND organization_id=v_organization_id
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product evidence has no canonical Phase 204 activation'
      USING ERRCODE='23503';
  END IF;
  v_external_id := 'phase-204:'||product.product_code||':'||
    (p_request->>'evidence_kind')||':'||(p_request->>'evidence_code')||':'||
    (p_request->>'content_sha256');
  INSERT INTO entral.source_records(
    id,source_type,provider,external_id,business_id,entity_id,uri,content_sha256,
    observed_at,trust_level,metadata
  ) VALUES (
    v_source_record_id,'REPOSITORY_RELEASE','GITHUB',v_external_id,
    product.canonical_business_id,activation.commander_id,p_request->>'source_reference',
    p_request->>'content_sha256',v_captured_at,'AUTHORITATIVE',jsonb_build_object(
      'release_version','phase-204','product_id',v_product_id,
      'product_code',product.product_code,'evidence_kind',p_request->>'evidence_kind',
      'evidence_code',p_request->>'evidence_code'
    )
  );
  INSERT INTO entral.artifacts(
    id,artifact_kind,stable_code,name,business_id,entity_id,mission_id,storage_uri,
    media_type,content_sha256,size_bytes,source_record_id,classification,retention_policy,metadata
  ) VALUES (
    v_artifact_id,v_artifact_kind,
    'SP-COMMERCE-001-'||product.product_code||'-'||(p_request->>'evidence_kind')||'-'||
      (p_request->>'evidence_code'),
    p_request->>'file_name',product.canonical_business_id,activation.commander_id,
    activation.launch_mission_id,p_request->>'source_reference',p_request->>'media_type',
    p_request->>'content_sha256',(p_request->>'byte_size')::bigint,v_source_record_id,
    'INTERNAL',jsonb_build_object('retention','PERMANENT'),jsonb_build_object(
      'release_version','phase-204','product_id',v_product_id,
      'product_code',product.product_code,'evidence_kind',p_request->>'evidence_kind',
      'evidence_code',p_request->>'evidence_code'
    )
  );
  INSERT INTO entral.evidence_links(
    from_type,from_id,artifact_id,evidence_role,claim,locator
  ) VALUES (
    'MISSION',activation.launch_mission_id,v_artifact_id,p_request->>'evidence_kind',
    'Phase 204 product evidence is bound to an exact repository artifact and canonical business.',
    jsonb_build_object('product_id',v_product_id,'product_code',product.product_code,
      'evidence_code',p_request->>'evidence_code')
  );
  response := jsonb_build_object(
    'source_record_id',v_source_record_id,'artifact_id',v_artifact_id,
    'product_id',v_product_id,'evidence_kind',p_request->>'evidence_kind',
    'evidence_code',p_request->>'evidence_code','file_name',p_request->>'file_name',
    'media_type',p_request->>'media_type','byte_size',(p_request->>'byte_size')::bigint,
    'content_sha256',p_request->>'content_sha256','source_reference',p_request->>'source_reference',
    'captured_at',v_captured_at,'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'REGISTER_PRODUCT_EVIDENCE',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_register_product_evidence$;

CREATE OR REPLACE FUNCTION entral.phase204_product_evidence_identity_matches(
  p_evidence_id uuid,
  p_product_code text,
  p_business_id uuid,
  p_allowed_kinds text[]
)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_product_evidence_identity_matches$
  SELECT EXISTS (
    SELECT 1
    FROM entral.source_records source
    WHERE source.id=p_evidence_id
      AND source.business_id=p_business_id
      AND source.source_type='REPOSITORY_RELEASE'
      AND source.provider='GITHUB'
      AND split_part(source.external_id,':',1)='phase-204'
      AND split_part(source.external_id,':',2)=p_product_code
      AND split_part(source.external_id,':',3)=ANY(p_allowed_kinds)
      AND split_part(source.external_id,':',4)~'^[A-Z][A-Z0-9_]{1,63}$'
      AND source.external_id='phase-204:'||p_product_code||':'||
        split_part(source.external_id,':',3)||':'||split_part(source.external_id,':',4)||':'||
        source.content_sha256
      AND source.content_sha256~'^[0-9a-f]{64}$'
    UNION ALL
    SELECT 1
    FROM entral.artifacts artifact
    JOIN entral.source_records source ON source.id=artifact.source_record_id
    WHERE artifact.id=p_evidence_id
      AND artifact.business_id=p_business_id
      AND source.business_id=p_business_id
      AND source.source_type='REPOSITORY_RELEASE'
      AND source.provider='GITHUB'
      AND split_part(source.external_id,':',1)='phase-204'
      AND split_part(source.external_id,':',2)=p_product_code
      AND split_part(source.external_id,':',3)=ANY(p_allowed_kinds)
      AND split_part(source.external_id,':',4)~'^[A-Z][A-Z0-9_]{1,63}$'
      AND source.external_id='phase-204:'||p_product_code||':'||
        split_part(source.external_id,':',3)||':'||split_part(source.external_id,':',4)||':'||
        source.content_sha256
      AND artifact.stable_code='SP-COMMERCE-001-'||p_product_code||'-'||
        split_part(source.external_id,':',3)||'-'||split_part(source.external_id,':',4)
      AND artifact.content_sha256=source.content_sha256
      AND artifact.storage_uri=source.uri
  )
$phase204_product_evidence_identity_matches$;

REVOKE ALL ON FUNCTION entral.phase204_product_evidence_identity_matches(uuid,text,uuid,text[]) FROM PUBLIC;

CREATE OR REPLACE FUNCTION entral.phase204_register_product_asset(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_register_product_asset$
DECLARE
  v_asset_id uuid;
  v_product_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_artifact_id uuid;
  v_actor_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  prior_response jsonb;
  response jsonb;
  product entral.phase204_internal_commerce_products%ROWTYPE;
  artifact_record entral.artifacts%ROWTYPE;
  source_record entral.source_records%ROWTYPE;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'product_asset_id','product_id','tenant_id','organization_id','artifact_id','asset_role',
       'asset_version','file_name','media_type','editable','byte_size','content_sha256',
       'source_reference','readiness','license_status','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 product asset envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_asset_id := (p_request->>'product_asset_id')::uuid;
    v_product_id := (p_request->>'product_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_artifact_id := (p_request->>'artifact_id')::uuid;
    PERFORM (p_request->>'byte_size')::bigint;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'Malformed Phase 204 product asset envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR COALESCE(p_request->>'content_sha256','') !~ '^[0-9a-f]{64}$'
     OR COALESCE(p_request->>'asset_version','') !~ '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
     OR COALESCE(p_request->>'source_reference','') !~ '^[^@[:space:]]+@[0-9a-f]{40}:.+'
     OR length(btrim(COALESCE(p_request->>'file_name',''))) NOT BETWEEN 1 AND 255
     OR COALESCE(p_request->>'media_type','') !~ '^[A-Za-z0-9!#$&^_.+-]+/[A-Za-z0-9!#$&^_.+-]+$'
     OR (p_request->>'byte_size')::bigint<=0
     OR jsonb_typeof(p_request->'editable')<>'boolean'
     OR p_request->>'readiness'<>'FINAL' OR p_request->>'license_status'<>'CLEARED'
     OR p_request->>'asset_role' NOT IN (
       'EDITABLE_SOURCE','FINAL_DELIVERY','INSTRUCTIONS','IMPLEMENTATION_GUIDANCE','EXAMPLE',
       'TRACKING_TOOL','VERSION_INFORMATION','SUPPORT_INSTRUCTIONS','LICENSE_TERMS'
     ) OR (p_request->>'asset_role'='EDITABLE_SOURCE' AND (p_request->>'editable')::boolean IS NOT TRUE) THEN
    RAISE EXCEPTION 'Phase 204 product asset violates the evidence contract' USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_operation_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Product asset recording requires exact tenant operations authority' USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:asset:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('REGISTER_PRODUCT_ASSET',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO product FROM entral.phase204_internal_commerce_products
  WHERE product_id=v_product_id AND tenant_id=v_tenant_id AND organization_id=v_organization_id
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product is outside the exact Phase 204 tenant scope' USING ERRCODE='23503'; END IF;
  SELECT * INTO artifact_record FROM entral.artifacts
  WHERE id=v_artifact_id AND business_id=product.canonical_business_id FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product asset must bind the current exact product repository artifact'
      USING ERRCODE='23514';
  END IF;
  SELECT * INTO source_record FROM entral.source_records
  WHERE id=artifact_record.source_record_id FOR SHARE;
  IF NOT FOUND OR artifact_record.content_sha256 IS DISTINCT FROM p_request->>'content_sha256'
     OR artifact_record.media_type IS DISTINCT FROM p_request->>'media_type'
     OR artifact_record.name IS DISTINCT FROM p_request->>'file_name'
     OR artifact_record.size_bytes IS DISTINCT FROM (p_request->>'byte_size')::bigint
     OR artifact_record.storage_uri IS DISTINCT FROM p_request->>'source_reference'
     OR source_record.business_id IS DISTINCT FROM product.canonical_business_id
     OR source_record.content_sha256 IS DISTINCT FROM artifact_record.content_sha256
     OR source_record.uri IS DISTINCT FROM artifact_record.storage_uri
     OR NOT entral.phase204_product_evidence_identity_matches(
       v_artifact_id,product.product_code,product.canonical_business_id,ARRAY['PRODUCT_ASSET']::text[]
     )
     OR p_request->>'asset_version' IS DISTINCT FROM product.product_version THEN
    RAISE EXCEPTION 'Product asset must bind the current exact product repository artifact'
      USING ERRCODE='23514';
  END IF;
  INSERT INTO entral.phase204_product_assets(
    product_asset_id,product_id,tenant_id,organization_id,business_boundary_id,artifact_id,
    asset_role,asset_version,content_sha256,file_name,media_type,editable,byte_size,
    source_reference,readiness,license_status,original_work,delivery_ready,created_by_actor_id
  ) VALUES (
    v_asset_id,v_product_id,v_tenant_id,v_organization_id,product.business_boundary_id,v_artifact_id,
    p_request->>'asset_role',p_request->>'asset_version',p_request->>'content_sha256',
    p_request->>'file_name',p_request->>'media_type',(p_request->>'editable')::boolean,
    (p_request->>'byte_size')::bigint,p_request->>'source_reference','FINAL','CLEARED',true,true,v_actor_id
  );
  response := jsonb_build_object(
    'product_asset_id',v_asset_id,'product_id',v_product_id,'asset_role',p_request->>'asset_role',
    'asset_version',p_request->>'asset_version','file_name',p_request->>'file_name',
    'media_type',p_request->>'media_type','editable',(p_request->>'editable')::boolean,
    'byte_size',(p_request->>'byte_size')::bigint,'content_sha256',p_request->>'content_sha256',
    'source_reference',p_request->>'source_reference','readiness','FINAL','license_status','CLEARED',
    'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'REGISTER_PRODUCT_ASSET',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_register_product_asset$;

CREATE OR REPLACE FUNCTION entral.phase204_product_manifest_hashes(p_product_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_product_manifest_hashes$
  WITH current_assets AS (
    SELECT DISTINCT ON (asset.asset_role) asset.*
    FROM entral.phase204_product_assets asset
    WHERE asset.product_id=p_product_id
    ORDER BY asset.asset_role,asset.created_at DESC,asset.product_asset_id DESC
  ), current_claims AS (
    SELECT gate.gate_payload->>'claims_sha256' AS claims_sha256
    FROM entral.phase204_product_gate_receipts gate
    WHERE gate.product_id=p_product_id AND gate.gate_type='CLAIMS'
    ORDER BY gate.assessed_at DESC,gate.gate_receipt_id DESC LIMIT 1
  )
  SELECT jsonb_build_object(
    'delivery_manifest_sha256',encode(public.digest(COALESCE((
      SELECT string_agg(asset_role||':'||artifact_id::text||':'||asset_version||':'||file_name||':'||
        media_type||':'||byte_size::text||':'||content_sha256||':'||source_reference,E'\n' ORDER BY asset_role)
      FROM current_assets
    ),''),'sha256'),'hex'),
    'claims_manifest_sha256',COALESCE((SELECT claims_sha256 FROM current_claims),
      encode(public.digest('','sha256'),'hex'))
  )
$phase204_product_manifest_hashes$;

CREATE OR REPLACE FUNCTION entral.phase204_record_product_gate(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_record_product_gate$
DECLARE
  v_gate_receipt_id uuid;
  v_product_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_source_record_id uuid;
  v_artifact_id uuid;
  v_assessed_at timestamptz;
  v_actor_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  prior_response jsonb;
  response jsonb;
  product entral.phase204_internal_commerce_products%ROWTYPE;
  v_evidence_hash text;
  v_evidence_business_id uuid;
  v_gate_payload jsonb;
  v_evidence_ids uuid[];
  v_checked_at timestamptz;
  v_current_manifests jsonb;
  v_permitted_asset_id uuid;
  evidence_source entral.source_records%ROWTYPE;
  evidence_artifact entral.artifacts%ROWTYPE;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'gate_receipt_id','product_id','tenant_id','organization_id','gate_type','status',
       'evidence_source_record_id','evidence_artifact_id','evidence_sha256','assertion_summary',
       'gate_payload','evidence_ids','assessed_at','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 product gate envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_gate_receipt_id := (p_request->>'gate_receipt_id')::uuid;
    v_product_id := (p_request->>'product_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_source_record_id := NULLIF(p_request->>'evidence_source_record_id','')::uuid;
    v_artifact_id := NULLIF(p_request->>'evidence_artifact_id','')::uuid;
    v_assessed_at := (p_request->>'assessed_at')::timestamptz;
    v_gate_payload := p_request->'gate_payload';
    v_checked_at := (v_gate_payload->>'checked_at')::timestamptz;
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
      INTO v_evidence_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'evidence_ids','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 product gate envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR COALESCE(p_request->>'evidence_sha256','') !~ '^[0-9a-f]{64}$'
     OR (v_source_record_id IS NOT NULL)::int+(v_artifact_id IS NOT NULL)::int<>1
     OR p_request->>'gate_type' NOT IN ('ORIGINALITY','LICENSING','CLAIMS','AI_DISCLOSURE','FILE_INTEGRITY','DELIVERY_READINESS')
     OR p_request->>'status' NOT IN ('PASSED','FAILED')
     OR length(btrim(COALESCE(p_request->>'assertion_summary',''))) NOT BETWEEN 1 AND 2000
     OR jsonb_typeof(v_gate_payload)<>'object' OR cardinality(v_evidence_ids)=0
     OR cardinality(v_evidence_ids)<>(SELECT count(DISTINCT value) FROM unnest(v_evidence_ids) value)
     OR v_assessed_at IS NULL OR v_assessed_at>clock_timestamp()+interval '5 minutes'
     OR v_checked_at IS NULL OR v_checked_at>v_assessed_at OR v_checked_at<v_assessed_at-interval '24 hours' THEN
    RAISE EXCEPTION 'Phase 204 product gate violates the evidence contract' USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_operation_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Product gate recording requires exact tenant operations authority' USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:gate:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('RECORD_PRODUCT_GATE',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO product FROM entral.phase204_internal_commerce_products
  WHERE product_id=v_product_id AND tenant_id=v_tenant_id AND organization_id=v_organization_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Product is outside the exact Phase 204 tenant scope' USING ERRCODE='23503'; END IF;
  IF v_source_record_id IS NOT NULL THEN
    SELECT * INTO evidence_source FROM entral.source_records
    WHERE id=v_source_record_id FOR SHARE;
    IF FOUND THEN
      v_evidence_hash := evidence_source.content_sha256;
      v_evidence_business_id := evidence_source.business_id;
    END IF;
  ELSE
    SELECT * INTO evidence_artifact FROM entral.artifacts
    WHERE id=v_artifact_id FOR SHARE;
    IF FOUND THEN
      SELECT * INTO evidence_source FROM entral.source_records
      WHERE id=evidence_artifact.source_record_id FOR SHARE;
      v_evidence_hash := evidence_artifact.content_sha256;
      v_evidence_business_id := evidence_artifact.business_id;
    END IF;
  END IF;
  IF NOT FOUND OR v_evidence_hash IS DISTINCT FROM p_request->>'evidence_sha256'
     OR v_evidence_business_id IS DISTINCT FROM product.canonical_business_id
     OR evidence_source.business_id IS DISTINCT FROM product.canonical_business_id
     OR evidence_source.content_sha256 IS DISTINCT FROM v_evidence_hash
     OR NOT entral.phase204_product_evidence_identity_matches(
       COALESCE(v_source_record_id,v_artifact_id),product.product_code,
       product.canonical_business_id,ARRAY['PRODUCT_GATE']::text[]
     )
     OR (v_artifact_id IS NOT NULL AND (
       evidence_artifact.source_record_id IS DISTINCT FROM evidence_source.id
       OR evidence_artifact.storage_uri IS DISTINCT FROM evidence_source.uri
     )) THEN
    RAISE EXCEPTION 'Product gate must bind exact product-specific canonical evidence'
      USING ERRCODE='23514';
  END IF;
  IF COALESCE(v_source_record_id,v_artifact_id)<>ALL(v_evidence_ids) THEN
    RAISE EXCEPTION 'Primary gate evidence must be present in the exact evidence identifier set'
      USING ERRCODE='23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_evidence_ids) evidence_id
    WHERE NOT entral.phase204_product_evidence_identity_matches(
      evidence_id,product.product_code,product.canonical_business_id,
      ARRAY['PRODUCT_GATE','PRODUCT_ASSET']::text[]
    )
  ) THEN
    RAISE EXCEPTION 'Every gate evidence identifier must resolve to current same-product evidence'
      USING ERRCODE='23514';
  END IF;
  IF EXISTS (SELECT 1 FROM entral.phase204_product_assets asset
      WHERE asset.product_id=v_product_id AND asset.created_at>v_assessed_at) THEN
    RAISE EXCEPTION 'A product gate cannot predate the product assets it certifies' USING ERRCODE='23514';
  END IF;
  v_current_manifests := entral.phase204_product_manifest_hashes(v_product_id);
  CASE p_request->>'gate_type'
    WHEN 'ORIGINALITY' THEN
      IF NOT (v_gate_payload ?& ARRAY['status','original_work','copied_content','generic_prompt_collection','evidence_ids','checked_at']::text[])
         OR v_gate_payload-ARRAY['status','original_work','copied_content','generic_prompt_collection','evidence_ids','checked_at']::text[]<>'{}'::jsonb
         OR v_gate_payload->>'status'<>p_request->>'status'
         OR jsonb_typeof(v_gate_payload->'original_work')<>'boolean'
         OR jsonb_typeof(v_gate_payload->'copied_content')<>'boolean'
         OR jsonb_typeof(v_gate_payload->'generic_prompt_collection')<>'boolean'
         OR (p_request->>'status'='PASSED' AND ((v_gate_payload->>'original_work')::boolean IS NOT TRUE
           OR (v_gate_payload->>'copied_content')::boolean OR (v_gate_payload->>'generic_prompt_collection')::boolean)) THEN
        RAISE EXCEPTION 'Originality gate payload is not truthful and complete' USING ERRCODE='23514';
      END IF;
    WHEN 'LICENSING' THEN
      BEGIN v_permitted_asset_id := (v_gate_payload->>'permitted_use_terms_asset_id')::uuid;
      EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Licensing gate permitted-use asset is malformed' USING ERRCODE='22023'; END;
      IF NOT (v_gate_payload ?& ARRAY['status','unresolved_rights','permitted_use_terms_asset_id','evidence_ids','checked_at']::text[])
         OR v_gate_payload-ARRAY['status','unresolved_rights','permitted_use_terms_asset_id','evidence_ids','checked_at']::text[]<>'{}'::jsonb
         OR v_gate_payload->>'status'<>p_request->>'status'
         OR jsonb_typeof(v_gate_payload->'unresolved_rights')<>'boolean'
         OR (p_request->>'status'='PASSED' AND (v_gate_payload->>'unresolved_rights')::boolean)
         OR NOT EXISTS (SELECT 1 FROM (
           SELECT DISTINCT ON (asset_role) * FROM entral.phase204_product_assets
           WHERE product_id=v_product_id ORDER BY asset_role,created_at DESC,product_asset_id DESC
         ) current_asset WHERE current_asset.asset_role='LICENSE_TERMS'
             AND current_asset.product_asset_id=v_permitted_asset_id) THEN
        RAISE EXCEPTION 'Licensing gate is not bound to the current cleared permitted-use terms'
          USING ERRCODE='23514';
      END IF;
    WHEN 'CLAIMS' THEN
      IF NOT (v_gate_payload ?& ARRAY['status','unsupported_claim_count','claims_sha256','evidence_ids','checked_at']::text[])
         OR v_gate_payload-ARRAY['status','unsupported_claim_count','claims_sha256','evidence_ids','checked_at']::text[]<>'{}'::jsonb
         OR v_gate_payload->>'status'<>p_request->>'status'
         OR COALESCE(v_gate_payload->>'claims_sha256','') !~ '^[0-9a-f]{64}$'
         OR COALESCE(v_gate_payload->>'unsupported_claim_count','') !~ '^[0-9]+$'
         OR (p_request->>'status'='PASSED' AND v_gate_payload->>'unsupported_claim_count'<>'0')
         OR v_gate_payload->>'claims_sha256'<>p_request->>'evidence_sha256' THEN
        RAISE EXCEPTION 'Claims gate must bind the current zero-unsupported-claims evidence hash'
          USING ERRCODE='23514';
      END IF;
    WHEN 'AI_DISCLOSURE' THEN
      IF NOT (v_gate_payload ?& ARRAY['status','ai_assisted','disclosure_included','disclosure_text','evidence_ids','checked_at']::text[])
         OR v_gate_payload-ARRAY['status','ai_assisted','disclosure_included','disclosure_text','evidence_ids','checked_at']::text[]<>'{}'::jsonb
         OR v_gate_payload->>'status'<>p_request->>'status'
         OR jsonb_typeof(v_gate_payload->'ai_assisted')<>'boolean'
         OR jsonb_typeof(v_gate_payload->'disclosure_included')<>'boolean'
         OR (p_request->>'status'='PASSED' AND ((v_gate_payload->>'disclosure_included')::boolean IS NOT TRUE
           OR length(btrim(COALESCE(v_gate_payload->>'disclosure_text','')))=0)) THEN
        RAISE EXCEPTION 'AI disclosure gate payload is incomplete' USING ERRCODE='23514';
      END IF;
    WHEN 'FILE_INTEGRITY' THEN
      IF NOT (v_gate_payload ?& ARRAY['status','invalid_file_count','delivery_manifest_sha256','evidence_ids','checked_at']::text[])
         OR v_gate_payload-ARRAY['status','invalid_file_count','delivery_manifest_sha256','evidence_ids','checked_at']::text[]<>'{}'::jsonb
         OR v_gate_payload->>'status'<>p_request->>'status'
         OR COALESCE(v_gate_payload->>'delivery_manifest_sha256','') !~ '^[0-9a-f]{64}$'
         OR COALESCE(v_gate_payload->>'invalid_file_count','') !~ '^[0-9]+$'
         OR (p_request->>'status'='PASSED' AND v_gate_payload->>'invalid_file_count'<>'0')
         OR v_gate_payload->>'delivery_manifest_sha256'<>v_current_manifests->>'delivery_manifest_sha256' THEN
        RAISE EXCEPTION 'File-integrity gate must bind the current delivery manifest'
          USING ERRCODE='23514';
      END IF;
    WHEN 'DELIVERY_READINESS' THEN
      IF NOT (v_gate_payload ?& ARRAY['status','missing_asset_roles','customer_delivery_tested','support_ready','evidence_ids','checked_at']::text[])
         OR v_gate_payload-ARRAY['status','missing_asset_roles','customer_delivery_tested','support_ready','evidence_ids','checked_at']::text[]<>'{}'::jsonb
         OR v_gate_payload->>'status'<>p_request->>'status'
         OR jsonb_typeof(v_gate_payload->'missing_asset_roles')<>'array'
         OR jsonb_typeof(v_gate_payload->'customer_delivery_tested')<>'boolean'
         OR jsonb_typeof(v_gate_payload->'support_ready')<>'boolean'
         OR (p_request->>'status'='PASSED' AND (jsonb_array_length(v_gate_payload->'missing_asset_roles')<>0
           OR (v_gate_payload->>'customer_delivery_tested')::boolean IS NOT TRUE
           OR (v_gate_payload->>'support_ready')::boolean IS NOT TRUE)) THEN
        RAISE EXCEPTION 'Delivery-readiness gate payload is incomplete' USING ERRCODE='23514';
      END IF;
  END CASE;
  IF jsonb_typeof(v_gate_payload->'evidence_ids')<>'array'
     OR v_gate_payload->'evidence_ids'<>to_jsonb(v_evidence_ids) THEN
    RAISE EXCEPTION 'Gate payload evidence identifiers do not match the bound evidence set'
      USING ERRCODE='23514';
  END IF;
  INSERT INTO entral.phase204_product_gate_receipts(
    gate_receipt_id,product_id,tenant_id,organization_id,business_boundary_id,gate_type,status,
    evidence_source_record_id,evidence_artifact_id,evidence_sha256,assertion_summary,
    gate_payload,evidence_ids,assessed_by_actor_id,assessed_at
  ) VALUES (
    v_gate_receipt_id,v_product_id,v_tenant_id,v_organization_id,product.business_boundary_id,
    p_request->>'gate_type',p_request->>'status',v_source_record_id,v_artifact_id,p_request->>'evidence_sha256',
    p_request->>'assertion_summary',v_gate_payload,v_evidence_ids,v_actor_id,v_assessed_at
  );
  response := jsonb_build_object(
    'gate_receipt_id',v_gate_receipt_id,'product_id',v_product_id,'gate_type',p_request->>'gate_type',
    'status',p_request->>'status','evidence_sha256',p_request->>'evidence_sha256',
    'gate_payload',v_gate_payload,'evidence_ids',to_jsonb(v_evidence_ids),
    'assessed_at',v_assessed_at,'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'RECORD_PRODUCT_GATE',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_record_product_gate$;

CREATE OR REPLACE FUNCTION entral.phase204_product_is_ready(p_product_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_product_ready$
  WITH current_assets AS (
    SELECT DISTINCT ON (asset_role) asset.*
    FROM entral.phase204_product_assets asset WHERE asset.product_id=p_product_id
    ORDER BY asset_role,created_at DESC,product_asset_id DESC
  ), latest_gates AS (
    SELECT DISTINCT ON (gate_type) gate.*
    FROM entral.phase204_product_gate_receipts gate WHERE gate.product_id=p_product_id
    ORDER BY gate_type,assessed_at DESC,gate_receipt_id DESC
  ), asset_state AS (
    SELECT count(*) AS role_count,count(DISTINCT artifact_id) AS artifact_count,max(created_at) AS newest_asset
    FROM current_assets
    WHERE original_work AND delivery_ready AND readiness='FINAL' AND license_status='CLEARED'
  )
  SELECT EXISTS (SELECT 1 FROM entral.phase204_internal_commerce_products WHERE product_id=p_product_id)
    AND (SELECT role_count=9 AND artifact_count>=3 FROM asset_state)
    AND (SELECT count(*)=6 AND bool_and(status='PASSED')
         AND min(assessed_at)>=(SELECT newest_asset FROM asset_state) FROM latest_gates)
$phase204_product_ready$;

CREATE OR REPLACE FUNCTION entral.phase204_storefront_manifest_hashes(p_storefront_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_manifest_hashes$
  WITH storefront AS (
    SELECT * FROM entral.phase204_storefronts WHERE storefront_id=p_storefront_id
  ), products AS (
    SELECT product.* FROM entral.phase204_internal_commerce_products product
    JOIN storefront ON storefront.business_boundary_id=product.business_boundary_id
  ), current_assets AS (
    SELECT DISTINCT ON (asset.product_id,asset.asset_role) asset.*
    FROM entral.phase204_product_assets asset JOIN products USING (product_id)
    ORDER BY asset.product_id,asset.asset_role,asset.created_at DESC,asset.product_asset_id DESC
  ), latest_gates AS (
    SELECT DISTINCT ON (gate.product_id,gate.gate_type)
      gate.product_id,gate.gate_type,gate.status,gate.evidence_sha256,gate.assessed_at,gate.gate_receipt_id
    FROM entral.phase204_product_gate_receipts gate JOIN products USING (product_id)
    ORDER BY gate.product_id,gate.gate_type,gate.assessed_at DESC,gate.gate_receipt_id DESC
  )
  SELECT jsonb_build_object(
    'product_manifest_sha256',encode(public.digest(COALESCE((
      SELECT string_agg(product_id::text||':'||product_code||':'||title||':'||product_kind||':'||product_version||':'||price_cents::text||':'||currency, E'\n' ORDER BY product_code)
      FROM products
    ),''),'sha256'),'hex'),
    'asset_manifest_sha256',encode(public.digest(COALESCE((
      SELECT string_agg(asset.product_id::text||':'||asset.asset_role||':'||asset.asset_version||':'||asset.file_name||':'||asset.media_type||':'||asset.byte_size::text||':'||asset.content_sha256||':'||asset.source_reference, E'\n' ORDER BY product.product_code,asset.asset_role)
      FROM current_assets asset JOIN products product USING (product_id)
    ),''),'sha256'),'hex'),
    'claims_manifest_sha256',encode(public.digest(COALESCE((SELECT string_agg(product_id::text||':'||status||':'||evidence_sha256,E'\n' ORDER BY product_id) FROM latest_gates WHERE gate_type='CLAIMS'),''),'sha256'),'hex'),
    'license_manifest_sha256',encode(public.digest(COALESCE((SELECT string_agg(product_id::text||':'||status||':'||evidence_sha256,E'\n' ORDER BY product_id) FROM latest_gates WHERE gate_type='LICENSING'),''),'sha256'),'hex'),
    'ai_disclosure_manifest_sha256',encode(public.digest(COALESCE((SELECT string_agg(product_id::text||':'||status||':'||evidence_sha256,E'\n' ORDER BY product_id) FROM latest_gates WHERE gate_type='AI_DISCLOSURE'),''),'sha256'),'hex')
  )
$phase204_manifest_hashes$;

CREATE OR REPLACE FUNCTION entral.phase204_record_storefront_state(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_record_storefront_state$
DECLARE
  v_event_id uuid;
  v_storefront_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_market_source_id uuid;
  v_provider_policy_source_id uuid;
  v_provider_policy_evidence_ids uuid[];
  v_blocker_source_id uuid;
  v_occurred_at timestamptz;
  v_actor_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  prior_response jsonb;
  response jsonb;
  storefront entral.phase204_storefronts%ROWTYPE;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'storefront_state_event_id','storefront_id','tenant_id','organization_id','provider','state',
       'public_brand','market_evidence_source_record_id','etsy_blocker_code',
       'provider_policy_evidence_ids','etsy_blocker_evidence_source_record_id',
       'state_reason','occurred_at','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 storefront state envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_event_id := (p_request->>'storefront_state_event_id')::uuid;
    v_storefront_id := (p_request->>'storefront_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_market_source_id := NULLIF(p_request->>'market_evidence_source_record_id','')::uuid;
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
      INTO v_provider_policy_evidence_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'provider_policy_evidence_ids','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
    v_provider_policy_source_id := v_provider_policy_evidence_ids[1];
    v_blocker_source_id := NULLIF(p_request->>'etsy_blocker_evidence_source_record_id','')::uuid;
    v_occurred_at := (p_request->>'occurred_at')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 storefront state envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR p_request->>'provider' NOT IN ('ETSY','GUMROAD')
     OR p_request->>'state' NOT IN ('OWNER_ACTION_REQUIRED','BLOCKED','READY_FOR_OWNER_APPROVAL','PUBLISHED','PAUSED','DISABLED')
     OR length(btrim(COALESCE(p_request->>'state_reason',''))) NOT BETWEEN 1 AND 2000
     OR v_occurred_at IS NULL OR v_occurred_at>clock_timestamp()+interval '5 minutes' THEN
    RAISE EXCEPTION 'Phase 204 storefront state violates the bounded contract' USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_operation_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Storefront state recording requires exact tenant operations authority' USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:storefront-state:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('RECORD_STOREFRONT_STATE',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO storefront FROM entral.phase204_storefronts
  WHERE storefront_id=v_storefront_id AND tenant_id=v_tenant_id AND organization_id=v_organization_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Storefront is outside the exact Phase 204 tenant scope' USING ERRCODE='23503'; END IF;
  IF v_market_source_id IS NOT NULL AND NOT entral.phase204_source_provenance_allows(
       v_market_source_id,'MARKET_RESEARCH',NULL,storefront.canonical_business_id
     ) THEN RAISE EXCEPTION 'Market evidence provenance is not authoritative and current' USING ERRCODE='23514'; END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_provider_policy_evidence_ids) evidence_id
    WHERE NOT entral.phase204_source_provenance_allows(
      evidence_id,'PROVIDER_POLICY',p_request->>'provider',storefront.canonical_business_id
    )
  ) OR cardinality(v_provider_policy_evidence_ids)<>
       (SELECT count(DISTINCT value) FROM unnest(v_provider_policy_evidence_ids) value) THEN
    RAISE EXCEPTION 'Provider policy evidence provenance is not authoritative, current, and unique'
      USING ERRCODE='23514';
  END IF;
  IF v_blocker_source_id IS NOT NULL AND NOT entral.phase204_source_provenance_allows(
       v_blocker_source_id,'PROVIDER_ONBOARDING','ETSY',storefront.canonical_business_id
     ) THEN RAISE EXCEPTION 'Etsy blocker evidence provenance is not authoritative and current' USING ERRCODE='23514'; END IF;
  IF p_request->>'provider'='ETSY' AND p_request->>'state'='BLOCKED'
     AND (NULLIF(p_request->>'etsy_blocker_code','') IS NULL OR v_blocker_source_id IS NULL) THEN
    RAISE EXCEPTION 'Blocked Etsy state requires an exact supported blocker code and evidence' USING ERRCODE='23514';
  END IF;
  IF p_request->>'provider'='GUMROAD' AND NOT EXISTS (
    SELECT 1 FROM entral.phase204_storefront_state_events prior
    WHERE prior.storefront_id=v_storefront_id AND prior.provider='ETSY' AND prior.state='BLOCKED'
      AND prior.etsy_blocker_code=p_request->>'etsy_blocker_code'
      AND prior.etsy_blocker_evidence_source_record_id=v_blocker_source_id
  ) THEN
    RAISE EXCEPTION 'Gumroad fallback requires an exact, previously recorded Etsy blocker' USING ERRCODE='23514';
  END IF;
  IF p_request->>'state'='READY_FOR_OWNER_APPROVAL' AND (
    COALESCE(p_request->>'public_brand','')=''
    OR v_market_source_id IS NULL
    OR v_provider_policy_source_id IS NULL
    OR 5<>(SELECT count(*) FROM entral.phase204_internal_commerce_products WHERE business_boundary_id=storefront.business_boundary_id)
    OR EXISTS (
      SELECT 1 FROM entral.phase204_internal_commerce_products product
      WHERE product.business_boundary_id=storefront.business_boundary_id
        AND NOT entral.phase204_product_is_ready(product.product_id)
    )
  ) THEN RAISE EXCEPTION 'Storefront is not ready for the exact owner publication review' USING ERRCODE='23514'; END IF;
  IF p_request->>'state'='PUBLISHED' AND (
    NOT entral.phase204_publication_allowed(v_storefront_id)
    OR NOT EXISTS (SELECT 1 FROM entral.phase204_storefront_state_events prior
      WHERE prior.storefront_id=v_storefront_id
        AND prior.storefront_state_event_id=(SELECT current.storefront_state_event_id
          FROM entral.phase204_storefront_state_events current
          WHERE current.storefront_id=v_storefront_id
          ORDER BY current.occurred_at DESC,current.storefront_state_event_id DESC LIMIT 1)
        AND prior.state IN ('READY_FOR_OWNER_APPROVAL','PUBLISHED')
        AND prior.provider=p_request->>'provider'
        AND prior.public_brand=p_request->>'public_brand'
        AND prior.market_evidence_source_record_id=v_market_source_id
        AND prior.provider_policy_evidence_ids=v_provider_policy_evidence_ids)
    OR 5<>(SELECT count(*) FROM (
      SELECT DISTINCT ON (listing.product_id) listing.status,listing.provider
      FROM entral.phase204_storefront_listing_records listing
      WHERE listing.storefront_id=v_storefront_id
      ORDER BY listing.product_id,listing.created_at DESC,listing.listing_record_id DESC
    ) current_listing WHERE status='PUBLISHED' AND provider=p_request->>'provider')
  ) THEN RAISE EXCEPTION 'Published state requires owner approval and observed listing evidence' USING ERRCODE='23514'; END IF;
  INSERT INTO entral.phase204_storefront_state_events(
    storefront_state_event_id,storefront_id,tenant_id,organization_id,business_boundary_id,
    provider,state,public_brand,market_evidence_source_record_id,provider_policy_source_record_id,etsy_blocker_code,
    provider_policy_evidence_ids,etsy_blocker_evidence_source_record_id,state_reason,actor_id,occurred_at
  ) VALUES (
    v_event_id,v_storefront_id,v_tenant_id,v_organization_id,storefront.business_boundary_id,
    p_request->>'provider',p_request->>'state',NULLIF(p_request->>'public_brand',''),v_market_source_id,
    v_provider_policy_source_id,NULLIF(p_request->>'etsy_blocker_code',''),v_provider_policy_evidence_ids,v_blocker_source_id,
    p_request->>'state_reason',v_actor_id,v_occurred_at
  );
  response := jsonb_build_object(
    'storefront_state_event_id',v_event_id,'storefront_id',v_storefront_id,'provider',p_request->>'provider',
    'state',p_request->>'state','public_brand',NULLIF(p_request->>'public_brand',''),
    'occurred_at',v_occurred_at,'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'RECORD_STOREFRONT_STATE',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_record_storefront_state$;

CREATE OR REPLACE FUNCTION entral.phase204_approve_publication(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_approve_publication$
DECLARE
  v_approval_id uuid;
  v_storefront_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_approved_at timestamptz;
  v_actor_id uuid;
  v_setup_spend_limit_cents integer;
  v_idempotency_key text;
  v_request_hash text;
  prior_response jsonb;
  response jsonb;
  storefront entral.phase204_storefronts%ROWTYPE;
  latest_state entral.phase204_storefront_state_events%ROWTYPE;
  manifest jsonb;
  item jsonb;
  product entral.phase204_internal_commerce_products%ROWTYPE;
  product_manifest jsonb;
  v_control_version bigint;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'approval_id','authority','approved','owner_actor_id','approved_at','selected_provider',
       'storefront_id','tenant_id','organization_id','public_brand_name','product_approvals',
       'setup_spend_limit_cents','advertising_budget_cents','envelope_sha256','revoked_at',
       'idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 publication approval envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_approval_id := (p_request->>'approval_id')::uuid;
    v_storefront_id := (p_request->>'storefront_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_approved_at := (p_request->>'approved_at')::timestamptz;
    v_setup_spend_limit_cents := (p_request->>'setup_spend_limit_cents')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 publication approval envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR p_request->>'authority'<>'FIRST_EXTERNAL_PUBLICATION'
     OR jsonb_typeof(p_request->'approved')<>'boolean' OR (p_request->>'approved')::boolean IS NOT TRUE
     OR p_request->>'owner_actor_id' IS DISTINCT FROM entral.phase202_current_actor_id()::text
     OR p_request->>'selected_provider' NOT IN ('ETSY','GUMROAD')
     OR length(btrim(COALESCE(p_request->>'public_brand_name',''))) NOT BETWEEN 1 AND 160
     OR v_setup_spend_limit_cents NOT BETWEEN 0 AND 15000
     OR COALESCE(p_request->>'advertising_budget_cents','')<>'0'
     OR COALESCE(p_request->>'envelope_sha256','') !~ '^[0-9a-f]{64}$'
     OR p_request->'revoked_at'<>'null'::jsonb
     OR jsonb_typeof(p_request->'product_approvals')<>'array'
     OR jsonb_array_length(p_request->'product_approvals')<>5
     OR v_approved_at IS NULL OR v_approved_at>clock_timestamp()+interval '5 minutes'
     OR 5<>(SELECT count(DISTINCT approval->>'product_code')
             FROM jsonb_array_elements(p_request->'product_approvals') approval) THEN
    RAISE EXCEPTION 'Phase 204 publication approval violates the owner envelope' USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Publication approval requires the exact current Human OWNER' USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:publication-approval:'||v_idempotency_key,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:storefront:'||v_storefront_id::text,0));
  prior_response := entral.phase204_mutation_replay('OWNER_PUBLICATION_APPROVAL',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO storefront FROM entral.phase204_storefronts
  WHERE storefront_id=v_storefront_id AND tenant_id=v_tenant_id AND organization_id=v_organization_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Storefront is outside the exact Phase 204 tenant scope' USING ERRCODE='23503'; END IF;
  SELECT * INTO latest_state FROM entral.phase204_storefront_state_events
  WHERE storefront_id=v_storefront_id ORDER BY occurred_at DESC,storefront_state_event_id DESC LIMIT 1;
  IF latest_state.state<>'READY_FOR_OWNER_APPROVAL' OR latest_state.provider<>p_request->>'selected_provider'
     OR latest_state.public_brand IS DISTINCT FROM p_request->>'public_brand_name'
     OR latest_state.market_evidence_source_record_id IS NULL
     OR latest_state.provider_policy_source_record_id IS NULL
     OR cardinality(latest_state.provider_policy_evidence_ids)=0
     OR EXISTS (
       SELECT 1 FROM unnest(latest_state.provider_policy_evidence_ids) evidence_id
       WHERE NOT entral.phase204_source_provenance_allows(
         evidence_id,'PROVIDER_POLICY',latest_state.provider,storefront.canonical_business_id
       )
     ) THEN
    RAISE EXCEPTION 'Owner approval requires the exact market-backed ready storefront state' USING ERRCODE='23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT DISTINCT ON (control_code) control_code,control_state
      FROM entral.phase204_commerce_controls
      WHERE business_boundary_id=storefront.business_boundary_id
      ORDER BY control_code,version DESC,created_at DESC
    ) current_control WHERE control_code IN ('PAUSE_BUSINESS','KILL_BUSINESS') AND control_state='ENGAGED'
  ) OR NOT EXISTS (
    SELECT 1 FROM entral.businesses business
    WHERE business.id=storefront.canonical_business_id AND business.status='OPERATING'
  ) THEN
    RAISE EXCEPTION 'Paused, killed, or non-operating commerce business cannot approve publication' USING ERRCODE='23514';
  END IF;
  IF 5<>(SELECT count(*) FROM entral.phase204_internal_commerce_products WHERE business_boundary_id=storefront.business_boundary_id)
     OR EXISTS (
       SELECT 1 FROM entral.phase204_internal_commerce_products product
       WHERE product.business_boundary_id=storefront.business_boundary_id
         AND NOT entral.phase204_product_is_ready(product.product_id)
     ) THEN RAISE EXCEPTION 'All five exact products must pass asset and product gates before owner approval' USING ERRCODE='23514'; END IF;
  manifest := entral.phase204_storefront_manifest_hashes(v_storefront_id);
  FOR item IN SELECT value FROM jsonb_array_elements(p_request->'product_approvals') LOOP
    IF jsonb_typeof(item)<>'object'
       OR item-ARRAY['product_code','price_cents','delivery_manifest_sha256','claims_sha256','approved']::text[]<>'{}'::jsonb
       OR jsonb_typeof(item->'approved')<>'boolean' OR (item->>'approved')::boolean IS NOT TRUE
       OR COALESCE(item->>'delivery_manifest_sha256','') !~ '^[0-9a-f]{64}$'
       OR COALESCE(item->>'claims_sha256','') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'Product publication approval is malformed' USING ERRCODE='22023';
    END IF;
    SELECT * INTO product FROM entral.phase204_internal_commerce_products candidate
    WHERE candidate.business_boundary_id=storefront.business_boundary_id
      AND candidate.product_code=item->>'product_code' FOR SHARE;
    BEGIN
      IF NOT FOUND OR (item->>'price_cents')::integer<>product.price_cents THEN
        RAISE EXCEPTION 'Product approval price or code does not match the exact product line'
          USING ERRCODE='23514';
      END IF;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'Product approval price is malformed' USING ERRCODE='22023';
    END;
    product_manifest := entral.phase204_product_manifest_hashes(product.product_id);
    IF product_manifest->>'delivery_manifest_sha256'<>item->>'delivery_manifest_sha256'
       OR product_manifest->>'claims_manifest_sha256'<>item->>'claims_sha256'
       OR NOT EXISTS (SELECT 1 FROM (
         SELECT DISTINCT ON (listing.product_id) listing.*
         FROM entral.phase204_storefront_listing_records listing
         WHERE listing.storefront_id=v_storefront_id AND listing.product_id=product.product_id
         ORDER BY listing.product_id,listing.created_at DESC,listing.listing_record_id DESC
       ) current_listing WHERE current_listing.status IN ('READY_FOR_OWNER_APPROVAL','PUBLISHED')
           AND current_listing.price_cents=product.price_cents
           AND current_listing.delivery_manifest_sha256=item->>'delivery_manifest_sha256'
           AND current_listing.claims_manifest_sha256=item->>'claims_sha256') THEN
      RAISE EXCEPTION 'Product approval does not bind the current ready listing, files, and claims'
        USING ERRCODE='23514';
    END IF;
  END LOOP;
  INSERT INTO entral.phase204_publication_approval_envelopes(
    approval_id,storefront_id,tenant_id,organization_id,business_boundary_id,provider,public_brand,
    product_manifest_sha256,asset_manifest_sha256,claims_manifest_sha256,license_manifest_sha256,
    ai_disclosure_manifest_sha256,maximum_setup_spend,setup_spend_currency,paid_advertising_budget,
    maximum_setup_spend_cents,paid_advertising_budget_cents,publication_envelope_sha256,
    supersedes_approval_id,approved_by_actor_id,approved_at
  ) VALUES (
    v_approval_id,v_storefront_id,v_tenant_id,v_organization_id,storefront.business_boundary_id,
    p_request->>'selected_provider',p_request->>'public_brand_name',manifest->>'product_manifest_sha256',
    manifest->>'asset_manifest_sha256',manifest->>'claims_manifest_sha256',
    manifest->>'license_manifest_sha256',manifest->>'ai_disclosure_manifest_sha256',
    v_setup_spend_limit_cents/100.0,'USD',0,v_setup_spend_limit_cents,0,
    p_request->>'envelope_sha256',NULL,v_actor_id,v_approved_at
  );
  INSERT INTO entral.phase204_publication_product_approvals(
    approval_id,storefront_id,product_id,product_code,price_cents,
    delivery_manifest_sha256,claims_manifest_sha256,approved
  ) SELECT v_approval_id,v_storefront_id,product.product_id,approved_item.item->>'product_code',
      (approved_item.item->>'price_cents')::integer,approved_item.item->>'delivery_manifest_sha256',
      approved_item.item->>'claims_sha256',true
    FROM jsonb_array_elements(p_request->'product_approvals') AS approved_item(item)
    JOIN entral.phase204_internal_commerce_products product
      ON product.business_boundary_id=storefront.business_boundary_id
     AND product.product_code=approved_item.item->>'product_code';
  SELECT COALESCE(max(version),0)+1 INTO v_control_version
  FROM entral.phase204_commerce_controls
  WHERE business_boundary_id=storefront.business_boundary_id AND control_code='DISABLE_PUBLICATION';
  INSERT INTO entral.phase204_commerce_controls(
    control_record_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,
    control_code,availability,control_state,requires_owner_approval,action_id,reason,
    evidence_ids,verified_at,version,actor_id
  ) VALUES (
    public.gen_random_uuid(),v_tenant_id,v_organization_id,storefront.business_boundary_id,
    storefront.canonical_business_id,'DISABLE_PUBLICATION','AVAILABLE','ARMED',false,NULL,
    NULL,
    ARRAY[v_approval_id]::uuid[],v_approved_at,v_control_version,v_actor_id
  );
  INSERT INTO entral.phase204_commerce_control_events(
    control_event_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,state,reason,actor_id,occurred_at
  ) VALUES (
    public.gen_random_uuid(),v_tenant_id,v_organization_id,storefront.business_boundary_id,storefront.canonical_business_id,
    'ACTIVE','Owner approved the exact evidence-bound first-publication envelope; no external publication was performed by this function.',
    v_actor_id,v_approved_at
  );
  response := jsonb_build_object(
    'approval_id',v_approval_id,'authority','FIRST_EXTERNAL_PUBLICATION','approved',true,
    'owner_actor_id',v_actor_id,'approved_at',v_approved_at,'selected_provider',p_request->>'selected_provider',
    'storefront_id',v_storefront_id,'public_brand_name',p_request->>'public_brand_name',
    'product_approvals',p_request->'product_approvals','setup_spend_limit_cents',v_setup_spend_limit_cents,
    'advertising_budget_cents',0,'envelope_sha256',p_request->>'envelope_sha256','revoked_at',NULL,
    'external_publication_performed',false,'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'OWNER_PUBLICATION_APPROVAL',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_approve_publication$;

CREATE OR REPLACE FUNCTION entral.phase204_publication_allowed(p_storefront_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_publication_allowed$
DECLARE
  storefront entral.phase204_storefronts%ROWTYPE;
  latest_state entral.phase204_storefront_state_events%ROWTYPE;
  latest_approval entral.phase204_publication_approval_envelopes%ROWTYPE;
  manifest jsonb;
  v_required_capability_count integer;
  v_active_capability_count integer;
BEGIN
  SELECT * INTO storefront FROM entral.phase204_storefronts WHERE storefront_id=p_storefront_id;
  IF NOT FOUND OR NOT entral.phase204_internal_read_allows(storefront.tenant_id,storefront.organization_id) THEN RETURN false; END IF;
  SELECT * INTO latest_state FROM entral.phase204_storefront_state_events
  WHERE storefront_id=p_storefront_id ORDER BY occurred_at DESC,storefront_state_event_id DESC LIMIT 1;
  SELECT * INTO latest_approval FROM entral.phase204_publication_approval_envelopes
  WHERE storefront_id=p_storefront_id ORDER BY approved_at DESC,approval_id DESC LIMIT 1;
  IF latest_state.state NOT IN ('READY_FOR_OWNER_APPROVAL','PUBLISHED')
     OR latest_approval.approval_id IS NULL
     OR latest_state.provider<>latest_approval.provider OR latest_state.public_brand<>latest_approval.public_brand
     OR latest_state.provider_policy_source_record_id IS NULL
     OR cardinality(latest_state.provider_policy_evidence_ids)=0
     OR EXISTS (
       SELECT 1 FROM unnest(latest_state.provider_policy_evidence_ids) evidence_id
       WHERE NOT entral.phase204_source_provenance_allows(
         evidence_id,'PROVIDER_POLICY',latest_state.provider,storefront.canonical_business_id
       )
     )
     OR NOT EXISTS (SELECT 1 FROM entral.businesses business
       WHERE business.id=storefront.canonical_business_id AND business.status='OPERATING')
     OR NOT EXISTS (SELECT 1 FROM public."BusinessBoundary" boundary
       WHERE boundary."id"=storefront.business_boundary_id AND boundary."tenantId"=storefront.tenant_id
         AND boundary."organizationId"=storefront.organization_id AND boundary."status"='ACTIVE')
     OR 3<>(SELECT count(*) FROM (
       SELECT DISTINCT ON (control_code) control_code,availability,control_state
       FROM entral.phase204_commerce_controls
       WHERE business_boundary_id=storefront.business_boundary_id
       ORDER BY control_code,version DESC,created_at DESC
     ) control WHERE availability='AVAILABLE' AND control_state='ARMED')
     OR 5<>(SELECT count(*) FROM entral.phase204_internal_commerce_products WHERE business_boundary_id=storefront.business_boundary_id)
     OR EXISTS (
       SELECT 1 FROM entral.phase204_internal_commerce_products product
       WHERE product.business_boundary_id=storefront.business_boundary_id
         AND NOT entral.phase204_product_is_ready(product.product_id)
     ) THEN RETURN false; END IF;
  manifest := entral.phase204_storefront_manifest_hashes(p_storefront_id);
  IF manifest->>'product_manifest_sha256'<>latest_approval.product_manifest_sha256
     OR manifest->>'asset_manifest_sha256'<>latest_approval.asset_manifest_sha256
     OR manifest->>'claims_manifest_sha256'<>latest_approval.claims_manifest_sha256
     OR manifest->>'license_manifest_sha256'<>latest_approval.license_manifest_sha256
     OR manifest->>'ai_disclosure_manifest_sha256'<>latest_approval.ai_disclosure_manifest_sha256 THEN RETURN false; END IF;
  IF 5<>(SELECT count(*) FROM (
      SELECT DISTINCT ON (listing.product_id) listing.*
      FROM entral.phase204_storefront_listing_records listing
      WHERE listing.storefront_id=p_storefront_id
      ORDER BY listing.product_id,listing.created_at DESC,listing.listing_record_id DESC
    ) current_listing
    JOIN entral.phase204_publication_product_approvals approval
      ON approval.approval_id=latest_approval.approval_id
     AND approval.product_id=current_listing.product_id
     AND approval.product_code=current_listing.product_code
     AND approval.price_cents=current_listing.price_cents
     AND approval.delivery_manifest_sha256=current_listing.delivery_manifest_sha256
     AND approval.claims_manifest_sha256=current_listing.claims_manifest_sha256
    WHERE current_listing.status IN ('READY_FOR_OWNER_APPROVAL','PUBLISHED')
      AND current_listing.provider=latest_state.provider
  ) THEN RETURN false; END IF;
  v_required_capability_count := CASE latest_state.provider WHEN 'ETSY' THEN 4 ELSE 3 END;
  SELECT count(DISTINCT binding.catalog_capability_id)::integer INTO v_active_capability_count
  FROM entral.phase204_capability_source_bindings binding
  JOIN entral.capability_records capability
    ON capability.capability_id=binding.tenant_capability_id
   AND capability.capability_version=binding.tenant_capability_version
   AND capability.lifecycle_state='ACTIVE' AND capability.environment='PRODUCTION'
   AND capability.tenant_id=storefront.tenant_id AND capability.organization_id=storefront.organization_id
  JOIN entral.tenant_capability_installations installation
    ON installation.capability_id=capability.capability_id
   AND installation.capability_version=capability.capability_version AND installation.state='ACTIVE'
  JOIN entral.phase204_business_capability_installations business_binding
    ON business_binding.installation_id=installation.installation_id
   AND business_binding.business_boundary_id=storefront.business_boundary_id
  WHERE binding.catalog_capability_id IN (
    '20300000-0002-4000-8000-000000000108'::uuid,
    '20300000-0002-4000-8000-000000000107'::uuid,
    '20300000-0002-4000-8000-000000000106'::uuid,
    '20300000-0001-4000-8000-000000000012'::uuid
  ) AND (latest_state.provider='ETSY' OR binding.catalog_capability_id<>'20300000-0001-4000-8000-000000000012'::uuid);
  RETURN v_active_capability_count=v_required_capability_count;
END
$phase204_publication_allowed$;

CREATE OR REPLACE FUNCTION entral.phase204_record_listing_state(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_record_listing_state$
DECLARE
  v_listing_record_id uuid;
  v_storefront_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_price_cents integer;
  v_published_at timestamptz;
  v_evidence_ids uuid[];
  v_actor_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  v_provider text;
  v_provider_listing_hash text;
  prior_response jsonb;
  response jsonb;
  storefront entral.phase204_storefronts%ROWTYPE;
  product entral.phase204_internal_commerce_products%ROWTYPE;
  latest_state entral.phase204_storefront_state_events%ROWTYPE;
  latest_approval entral.phase204_publication_approval_envelopes%ROWTYPE;
  product_manifest jsonb;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'listing_record_id','storefront_id','tenant_id','organization_id','product_code',
       'provider_listing_id','status','price_cents','delivery_manifest_sha256','published_at',
       'provider_evidence_ids','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 provider listing envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_listing_record_id := (p_request->>'listing_record_id')::uuid;
    v_storefront_id := (p_request->>'storefront_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_price_cents := (p_request->>'price_cents')::integer;
    v_published_at := NULLIF(p_request->>'published_at','')::timestamptz;
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
      INTO v_evidence_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'provider_evidence_ids','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 provider listing envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR p_request->>'status' NOT IN ('DRAFT','READY_FOR_OWNER_APPROVAL','PUBLISHED','PAUSED','DISABLED')
     OR COALESCE(p_request->>'delivery_manifest_sha256','') !~ '^[0-9a-f]{64}$'
     OR cardinality(v_evidence_ids)<>(SELECT count(DISTINCT value) FROM unnest(v_evidence_ids) value)
     OR (p_request->>'status'='PUBLISHED') IS DISTINCT FROM
        (NULLIF(p_request->>'provider_listing_id','') IS NOT NULL AND v_published_at IS NOT NULL
         AND cardinality(v_evidence_ids)>0)
     OR (p_request->>'status'<>'PUBLISHED' AND v_published_at IS NOT NULL)
     OR v_published_at>clock_timestamp()+interval '5 minutes' THEN
    RAISE EXCEPTION 'Phase 204 provider listing violates the exact listing contract' USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_operation_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Provider listing recording requires exact tenant operations authority'
      USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:listing:'||v_idempotency_key,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:storefront:'||v_storefront_id::text,0));
  prior_response := entral.phase204_mutation_replay('RECORD_LISTING_STATE',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO storefront FROM entral.phase204_storefronts
  WHERE storefront_id=v_storefront_id AND tenant_id=v_tenant_id AND organization_id=v_organization_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing storefront is outside the exact tenant scope' USING ERRCODE='23503'; END IF;
  SELECT * INTO latest_state FROM entral.phase204_storefront_state_events
  WHERE storefront_id=v_storefront_id ORDER BY occurred_at DESC,storefront_state_event_id DESC LIMIT 1;
  v_provider := latest_state.provider;
  SELECT * INTO product FROM entral.phase204_internal_commerce_products candidate
  WHERE candidate.business_boundary_id=storefront.business_boundary_id
    AND candidate.product_code=p_request->>'product_code' FOR SHARE;
  IF NOT FOUND OR product.price_cents<>v_price_cents THEN
    RAISE EXCEPTION 'Listing product code and price do not match the exact product line'
      USING ERRCODE='23514';
  END IF;
  product_manifest := entral.phase204_product_manifest_hashes(product.product_id);
  IF product_manifest->>'delivery_manifest_sha256'<>p_request->>'delivery_manifest_sha256'
     OR (p_request->>'status' IN ('READY_FOR_OWNER_APPROVAL','PUBLISHED')
       AND NOT entral.phase204_product_is_ready(product.product_id)) THEN
    RAISE EXCEPTION 'Listing does not bind the current ready product delivery manifest'
      USING ERRCODE='23514';
  END IF;
  IF p_request->>'status'='PUBLISHED' THEN
    SELECT * INTO latest_approval FROM entral.phase204_publication_approval_envelopes approval
    WHERE approval.storefront_id=v_storefront_id
    ORDER BY approval.approved_at DESC,approval.approval_id DESC LIMIT 1;
    IF latest_approval.approval_id IS NULL OR NOT entral.phase204_publication_allowed(v_storefront_id)
       OR NOT EXISTS (SELECT 1 FROM entral.phase204_publication_product_approvals approval
         WHERE approval.approval_id=latest_approval.approval_id AND approval.product_id=product.product_id
           AND approval.product_code=product.product_code AND approval.price_cents=product.price_cents
           AND approval.delivery_manifest_sha256=p_request->>'delivery_manifest_sha256'
           AND approval.claims_manifest_sha256=product_manifest->>'claims_manifest_sha256')
       OR EXISTS (
         SELECT 1 FROM unnest(v_evidence_ids) evidence_id
         WHERE NOT entral.phase204_source_provenance_allows(
           evidence_id,'PROVIDER_READBACK',v_provider,storefront.canonical_business_id
         )
       ) THEN
      RAISE EXCEPTION 'Published listing requires exact owner approval and authoritative provider readback'
        USING ERRCODE='23514';
    END IF;
  END IF;
  v_provider_listing_hash := CASE WHEN NULLIF(p_request->>'provider_listing_id','') IS NULL THEN NULL
    ELSE encode(public.digest(convert_to(p_request->>'provider_listing_id','UTF8'),'sha256'),'hex') END;
  INSERT INTO entral.phase204_storefront_listing_records(
    listing_record_id,storefront_id,product_id,product_code,tenant_id,organization_id,
    business_boundary_id,provider,provider_listing_id,provider_listing_id_sha256,status,price_cents,
    delivery_manifest_sha256,claims_manifest_sha256,approval_id,provider_evidence_ids,
    published_at,observed_at,actor_id
  ) VALUES (
    v_listing_record_id,v_storefront_id,product.product_id,product.product_code,v_tenant_id,v_organization_id,
    storefront.business_boundary_id,v_provider,NULLIF(p_request->>'provider_listing_id',''),
    v_provider_listing_hash,p_request->>'status',v_price_cents,
    p_request->>'delivery_manifest_sha256',product_manifest->>'claims_manifest_sha256',
    CASE WHEN p_request->>'status'='PUBLISHED' THEN latest_approval.approval_id ELSE NULL END,
    v_evidence_ids,v_published_at,v_published_at,v_actor_id
  );
  response := jsonb_build_object(
    'listing_record_id',v_listing_record_id,'storefront_id',v_storefront_id,
    'product_code',product.product_code,'provider_listing_id',NULLIF(p_request->>'provider_listing_id',''),
    'status',p_request->>'status','price_cents',v_price_cents,
    'delivery_manifest_sha256',p_request->>'delivery_manifest_sha256','published_at',v_published_at,
    'provider_evidence_ids',to_jsonb(v_evidence_ids),'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'RECORD_LISTING_STATE',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_record_listing_state$;

CREATE OR REPLACE FUNCTION entral.phase204_ingest_provider_fact(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_ingest_provider_fact$
DECLARE
  v_fact_id uuid;
  v_storefront_id uuid;
  v_product_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_source_record_id uuid;
  v_artifact_id uuid;
  v_occurred_at timestamptz;
  v_captured_at timestamptz;
  v_amount_cents bigint;
  v_quantity integer;
  v_actor_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  prior_response jsonb;
  response jsonb;
  storefront entral.phase204_storefronts%ROWTYPE;
  latest_state entral.phase204_storefront_state_events%ROWTYPE;
  v_evidence_hash text;
  v_evidence_business_id uuid;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'provider_fact_id','storefront_id','product_id','tenant_id','organization_id','provider',
       'fact_type','fact_state','outcome','provider_external_reference_sha256','amount_cents','currency',
       'quantity','fee_category','unavailable_reason','evidence_source_record_id','evidence_artifact_id',
       'evidence_sha256','occurred_at','captured_at','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 provider fact envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_fact_id := (p_request->>'provider_fact_id')::uuid;
    v_storefront_id := (p_request->>'storefront_id')::uuid;
    v_product_id := NULLIF(p_request->>'product_id','')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_source_record_id := NULLIF(p_request->>'evidence_source_record_id','')::uuid;
    v_artifact_id := NULLIF(p_request->>'evidence_artifact_id','')::uuid;
    v_occurred_at := (p_request->>'occurred_at')::timestamptz;
    v_captured_at := (p_request->>'captured_at')::timestamptz;
    v_amount_cents := NULLIF(p_request->>'amount_cents','')::bigint;
    v_quantity := NULLIF(p_request->>'quantity','')::integer;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 provider fact envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR p_request->>'provider' NOT IN ('ETSY','GUMROAD')
     OR p_request->>'fact_type' NOT IN ('LISTING','ORDER','SALE','FEE','REFUND','DISPUTE','MESSAGE','DELIVERY','PAYOUT')
     OR p_request->>'fact_state' NOT IN ('OBSERVED','UNAVAILABLE')
     OR length(btrim(COALESCE(p_request->>'outcome',''))) NOT BETWEEN 1 AND 120
     OR COALESCE(p_request->>'evidence_sha256','') !~ '^[0-9a-f]{64}$'
     OR (v_source_record_id IS NOT NULL)::int+(v_artifact_id IS NOT NULL)::int<>1
     OR v_occurred_at IS NULL OR v_captured_at IS NULL OR v_captured_at>clock_timestamp()+interval '5 minutes'
     OR v_captured_at<v_occurred_at
     OR (p_request->>'fact_type'='LISTING' AND v_product_id IS NULL)
     OR (p_request->>'fact_state'='OBSERVED' AND (
       COALESCE(p_request->>'provider_external_reference_sha256','') !~ '^[0-9a-f]{64}$'
       OR NULLIF(p_request->>'unavailable_reason','') IS NOT NULL
       OR (p_request->>'fact_type' IN ('SALE','FEE','REFUND','PAYOUT')
         AND (v_amount_cents IS NULL OR p_request->>'currency'<>'USD'))
       OR ((p_request->>'fact_type'='FEE') IS DISTINCT FROM (NULLIF(p_request->>'fee_category','') IS NOT NULL))
     ))
     OR (p_request->>'fact_state'='UNAVAILABLE' AND (
       NULLIF(p_request->>'provider_external_reference_sha256','') IS NOT NULL
       OR v_amount_cents IS NOT NULL OR NULLIF(p_request->>'currency','') IS NOT NULL
       OR v_quantity IS NOT NULL OR NULLIF(p_request->>'fee_category','') IS NOT NULL
       OR length(btrim(COALESCE(p_request->>'unavailable_reason',''))) NOT BETWEEN 1 AND 2000
     )) THEN
    RAISE EXCEPTION 'Phase 204 provider fact violates the evidence contract' USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_operation_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Provider fact recording requires exact tenant operations authority' USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:provider-fact:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('INGEST_PROVIDER_FACT',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO storefront FROM entral.phase204_storefronts
  WHERE storefront_id=v_storefront_id AND tenant_id=v_tenant_id AND organization_id=v_organization_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Storefront is outside the exact Phase 204 tenant scope' USING ERRCODE='23503'; END IF;
  SELECT * INTO latest_state FROM entral.phase204_storefront_state_events
  WHERE storefront_id=v_storefront_id ORDER BY occurred_at DESC,storefront_state_event_id DESC LIMIT 1;
  IF latest_state.provider<>p_request->>'provider' THEN
    RAISE EXCEPTION 'Provider fact does not match the current evidenced storefront provider' USING ERRCODE='23514';
  END IF;
  IF v_product_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM entral.phase204_internal_commerce_products
    WHERE product_id=v_product_id AND business_boundary_id=storefront.business_boundary_id
  ) THEN RAISE EXCEPTION 'Provider fact product is outside the exact commerce business' USING ERRCODE='23503'; END IF;
  IF v_source_record_id IS NOT NULL THEN
    SELECT content_sha256,business_id INTO v_evidence_hash,v_evidence_business_id FROM entral.source_records WHERE id=v_source_record_id FOR SHARE;
  ELSE
    SELECT content_sha256,business_id INTO v_evidence_hash,v_evidence_business_id FROM entral.artifacts WHERE id=v_artifact_id FOR SHARE;
  END IF;
  IF NOT FOUND OR v_evidence_hash IS DISTINCT FROM p_request->>'evidence_sha256'
     OR v_evidence_business_id IS DISTINCT FROM storefront.canonical_business_id THEN
    RAISE EXCEPTION 'Provider fact must bind exact same-business evidence' USING ERRCODE='23514';
  END IF;
  IF p_request->>'fact_state'='OBSERVED' AND (
    v_source_record_id IS NULL OR NOT entral.phase204_source_provenance_allows(
      v_source_record_id,'PROVIDER_READBACK',p_request->>'provider',storefront.canonical_business_id
    )
  ) THEN
    RAISE EXCEPTION 'Observed provider fact requires authoritative provider readback provenance'
      USING ERRCODE='23514';
  END IF;
  IF p_request->>'fact_state'='OBSERVED' AND p_request->>'fact_type'='LISTING'
     AND NOT entral.phase204_publication_allowed(v_storefront_id) THEN
    RAISE EXCEPTION 'Observed listing is rejected unless the fail-closed publication gate currently passes' USING ERRCODE='23514';
  END IF;
  IF p_request->>'fact_state'='OBSERVED' AND p_request->>'fact_type'<>'LISTING'
     AND latest_state.state<>'PUBLISHED' THEN
    RAISE EXCEPTION 'Observed live commerce facts require an evidenced PUBLISHED storefront' USING ERRCODE='23514';
  END IF;
  INSERT INTO entral.phase204_provider_facts(
    provider_fact_id,storefront_id,product_id,tenant_id,organization_id,business_boundary_id,
    provider,fact_type,fact_state,outcome,provider_external_reference_sha256,amount,amount_cents,currency,
    quantity,fee_category,unavailable_reason,evidence_source_record_id,evidence_artifact_id,
    evidence_sha256,occurred_at,captured_at,recorded_by_actor_id
  ) VALUES (
    v_fact_id,v_storefront_id,v_product_id,v_tenant_id,v_organization_id,storefront.business_boundary_id,
    p_request->>'provider',p_request->>'fact_type',p_request->>'fact_state',p_request->>'outcome',
    NULLIF(p_request->>'provider_external_reference_sha256',''),NULL,v_amount_cents,
    NULLIF(p_request->>'currency','')::char(3),v_quantity,
    NULLIF(p_request->>'fee_category',''),NULLIF(p_request->>'unavailable_reason',''),
    v_source_record_id,v_artifact_id,p_request->>'evidence_sha256',v_occurred_at,v_captured_at,v_actor_id
  );
  response := jsonb_build_object(
    'provider_fact_id',v_fact_id,'storefront_id',v_storefront_id,'product_id',v_product_id,
    'provider',p_request->>'provider','fact_type',p_request->>'fact_type','fact_state',p_request->>'fact_state',
    'outcome',p_request->>'outcome','amount_cents',v_amount_cents,
    'occurred_at',v_occurred_at,'captured_at',v_captured_at,
    'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'INGEST_PROVIDER_FACT',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_ingest_provider_fact$;

CREATE OR REPLACE FUNCTION entral.phase204_record_metric_truth(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_record_metric_truth$
DECLARE
  v_metric_id uuid;
  v_storefront_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_product_id uuid;
  v_provider_record_id uuid;
  v_evidence_id uuid;
  v_value numeric(30,8);
  v_observed_at timestamptz;
  v_actor_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  v_scope_type text;
  v_scope_code text;
  prior_response jsonb;
  response jsonb;
  storefront entral.phase204_storefronts%ROWTYPE;
  provider_fact entral.phase204_provider_facts%ROWTYPE;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'metric_id','storefront_id','tenant_id','organization_id','metric_code','scope',
       'truth_state','value','unit','currency','provider_record_id','source_type','evidence_id',
       'observed_at','unavailable_reason','is_estimate','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb
     OR jsonb_typeof(p_request->'scope')<>'object'
     OR (p_request->'scope')-ARRAY['scope_type','scope_code']::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 operational metric envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_metric_id := (p_request->>'metric_id')::uuid;
    v_storefront_id := (p_request->>'storefront_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_provider_record_id := NULLIF(p_request->>'provider_record_id','')::uuid;
    v_evidence_id := NULLIF(p_request->>'evidence_id','')::uuid;
    v_value := NULLIF(p_request->>'value','')::numeric(30,8);
    v_observed_at := NULLIF(p_request->>'observed_at','')::timestamptz;
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 operational metric envelope' USING ERRCODE='22023';
  END;
  v_scope_type := p_request->'scope'->>'scope_type';
  v_scope_code := p_request->'scope'->>'scope_code';
  v_idempotency_key := p_request->>'idempotency_key';
  IF p_request->>'release_version'<>'phase-204'
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR p_request->>'metric_code' NOT IN (
       'GROSS_SALES','PLATFORM_FEES','PAYMENT_PROCESSING_FEES','REFUNDS','NET_RECEIPTS',
       'CONTRIBUTION_MARGIN','CONVERSION','SUPPORT_VOLUME','PRODUCT_PERFORMANCE'
     ) OR p_request->>'truth_state' NOT IN ('OBSERVED','UNAVAILABLE')
     OR jsonb_typeof(p_request->'is_estimate')<>'boolean' OR (p_request->>'is_estimate')::boolean
     OR (v_scope_type='BUSINESS' AND v_scope_code<>'SP-COMMERCE-001')
     OR (v_scope_type='PRODUCT' AND v_scope_code NOT IN (
       'LEAD_RESPONSE_ESTIMATE_FOLLOW_UP_KIT','SCOPE_CHANGE_ORDER_CONTROL_PACK',
       'BILLING_COLLECTIONS_ACCELERATOR','WEEKLY_OWNER_COMMAND_DASHBOARD',
       'COMPLETE_CONTRACTOR_CONTROL_BUNDLE'
     )) OR v_scope_type NOT IN ('BUSINESS','PRODUCT')
     OR (p_request->>'metric_code' IN ('GROSS_SALES','PLATFORM_FEES','PAYMENT_PROCESSING_FEES',
       'REFUNDS','NET_RECEIPTS','CONTRIBUTION_MARGIN')
       AND (p_request->>'unit'<>'USD_CENTS' OR p_request->>'currency'<>'USD'))
     OR (p_request->>'metric_code'='CONVERSION'
       AND (p_request->>'unit'<>'RATIO' OR p_request->'currency'<>'null'::jsonb))
     OR (p_request->>'metric_code'='SUPPORT_VOLUME'
       AND (p_request->>'unit'<>'COUNT' OR p_request->'currency'<>'null'::jsonb))
     OR (p_request->>'metric_code'='PRODUCT_PERFORMANCE'
       AND (p_request->>'unit'<>'SCORE' OR p_request->'currency'<>'null'::jsonb))
     OR (p_request->>'truth_state'='OBSERVED' AND (
       v_value IS NULL OR v_provider_record_id IS NULL OR v_evidence_id IS NULL OR v_observed_at IS NULL
       OR p_request->>'source_type' NOT IN ('PROVIDER_TRANSACTION','PROVIDER_FEE','PROVIDER_REFUND',
         'PROVIDER_ANALYTICS','PROVIDER_MESSAGE','CANONICAL_CALCULATION')
       OR p_request->'unavailable_reason'<>'null'::jsonb
       OR (p_request->>'metric_code' NOT IN ('NET_RECEIPTS','CONTRIBUTION_MARGIN') AND v_value<0)
       OR (p_request->>'metric_code'='CONVERSION' AND v_value NOT BETWEEN 0 AND 1)
     ))
     OR (p_request->>'truth_state'='UNAVAILABLE' AND (
       p_request->'value'<>'null'::jsonb OR p_request->'provider_record_id'<>'null'::jsonb
       OR p_request->'source_type'<>'null'::jsonb OR p_request->'evidence_id'<>'null'::jsonb
       OR p_request->'observed_at'<>'null'::jsonb
       OR length(btrim(COALESCE(p_request->>'unavailable_reason',''))) NOT BETWEEN 1 AND 1000
     )) THEN
    RAISE EXCEPTION 'Phase 204 operational metric violates the exact truth matrix contract'
      USING ERRCODE='22023';
  END IF;
  IF NOT entral.phase204_operation_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Operational metric recording requires exact tenant operations authority'
      USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:metric:'||v_idempotency_key,0));
  prior_response := entral.phase204_mutation_replay('RECORD_METRIC_TRUTH',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO storefront FROM entral.phase204_storefronts
  WHERE storefront_id=v_storefront_id AND tenant_id=v_tenant_id AND organization_id=v_organization_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Metric storefront is outside the exact tenant scope' USING ERRCODE='23503'; END IF;
  IF v_scope_type='PRODUCT' THEN
    SELECT product_id INTO v_product_id FROM entral.phase204_internal_commerce_products
    WHERE business_boundary_id=storefront.business_boundary_id AND product_code=v_scope_code;
    IF NOT FOUND THEN RAISE EXCEPTION 'Metric product scope is not canonical' USING ERRCODE='23503'; END IF;
  END IF;
  IF p_request->>'truth_state'='OBSERVED' THEN
    SELECT * INTO provider_fact FROM entral.phase204_provider_facts fact
    WHERE fact.provider_fact_id=v_provider_record_id AND fact.storefront_id=v_storefront_id
      AND fact.fact_state='OBSERVED'
      AND ((v_product_id IS NULL AND fact.product_id IS NULL) OR fact.product_id=v_product_id)
      FOR SHARE;
    IF NOT FOUND OR provider_fact.captured_at<>v_observed_at
       OR provider_fact.evidence_source_record_id IS DISTINCT FROM v_evidence_id
       OR NOT entral.phase204_source_provenance_allows(
         v_evidence_id,'PROVIDER_READBACK',provider_fact.provider,storefront.canonical_business_id
       )
       OR (p_request->>'metric_code'='GROSS_SALES'
         AND (p_request->>'source_type'<>'PROVIDER_TRANSACTION' OR provider_fact.fact_type<>'SALE'
           OR provider_fact.amount_cents::numeric<>v_value))
       OR (p_request->>'metric_code'='PLATFORM_FEES'
         AND (p_request->>'source_type'<>'PROVIDER_FEE' OR provider_fact.fact_type<>'FEE'
           OR provider_fact.fee_category<>'PLATFORM' OR provider_fact.amount_cents::numeric<>v_value))
       OR (p_request->>'metric_code'='PAYMENT_PROCESSING_FEES'
         AND (p_request->>'source_type'<>'PROVIDER_FEE' OR provider_fact.fact_type<>'FEE'
           OR provider_fact.fee_category<>'PAYMENT_PROCESSING' OR provider_fact.amount_cents::numeric<>v_value))
       OR (p_request->>'metric_code'='REFUNDS'
         AND (p_request->>'source_type'<>'PROVIDER_REFUND' OR provider_fact.fact_type<>'REFUND'
           OR provider_fact.amount_cents::numeric<>v_value))
       OR (p_request->>'metric_code'='NET_RECEIPTS'
         AND (p_request->>'source_type'<>'PROVIDER_TRANSACTION' OR provider_fact.fact_type<>'PAYOUT'
           OR provider_fact.amount_cents::numeric<>v_value))
       OR p_request->>'metric_code' IN ('CONTRIBUTION_MARGIN','CONVERSION','PRODUCT_PERFORMANCE')
       OR (p_request->>'metric_code'='SUPPORT_VOLUME'
         AND (p_request->>'source_type'<>'PROVIDER_MESSAGE' OR provider_fact.fact_type<>'MESSAGE'
           OR provider_fact.quantity IS NULL OR provider_fact.quantity::numeric<>v_value)) THEN
      RAISE EXCEPTION 'Observed metric is not bound to an authoritative current provider fact'
        USING ERRCODE='23514';
    END IF;
  END IF;
  INSERT INTO entral.phase204_operational_metric_truth(
    metric_truth_id,tenant_id,organization_id,business_boundary_id,storefront_id,
    scope_type,scope_code,product_id,metric_code,truth_state,value_numeric,unit,currency,
    provider_record_id,source_type,evidence_id,observed_at,unavailable_reason,is_estimate,actor_id
  ) VALUES (
    v_metric_id,v_tenant_id,v_organization_id,storefront.business_boundary_id,v_storefront_id,
    v_scope_type,v_scope_code,v_product_id,p_request->>'metric_code',p_request->>'truth_state',v_value,
    p_request->>'unit',NULLIF(p_request->>'currency','')::char(3),v_provider_record_id,
    NULLIF(p_request->>'source_type',''),v_evidence_id,v_observed_at,
    NULLIF(p_request->>'unavailable_reason',''),false,v_actor_id
  );
  response := jsonb_build_object(
    'metric_id',v_metric_id,'metric_code',p_request->>'metric_code',
    'scope',p_request->'scope','truth_state',p_request->>'truth_state','value',v_value,
    'unit',p_request->>'unit','currency',NULLIF(p_request->>'currency',''),
    'provider_record_id',v_provider_record_id,'source_type',NULLIF(p_request->>'source_type',''),
    'evidence_id',v_evidence_id,'observed_at',v_observed_at,
    'unavailable_reason',NULLIF(p_request->>'unavailable_reason',''),'is_estimate',false,
    'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'RECORD_METRIC_TRUTH',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_record_metric_truth$;

CREATE OR REPLACE FUNCTION entral.phase204_set_commerce_control(p_request jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_set_commerce_control$
DECLARE
  v_event_id uuid;
  v_tenant_id uuid;
  v_organization_id uuid;
  v_business_boundary_id uuid;
  v_occurred_at timestamptz;
  v_actor_id uuid;
  v_state text;
  v_control_code text;
  v_control_state text;
  v_version bigint;
  v_evidence_ids uuid[];
  v_affected_entity_ids uuid[] := ARRAY[]::uuid[];
  v_affected_mission_ids uuid[] := ARRAY[]::uuid[];
  v_affected_task_ids uuid[] := ARRAY[]::uuid[];
  v_transition_id uuid;
  v_idempotency_key text;
  v_request_hash text;
  prior_response jsonb;
  response jsonb;
  boundary public."BusinessBoundary"%ROWTYPE;
  activation entral.phase204_internal_commerce_activations%ROWTYPE;
  capability entral.capability_records%ROWTYPE;
  installation entral.tenant_capability_installations%ROWTYPE;
BEGIN
  IF p_request IS NULL OR jsonb_typeof(p_request)<>'object'
     OR p_request-ARRAY[
       'control_event_id','tenant_id','organization_id','business_boundary_id','action',
       'reason','evidence_ids','occurred_at','idempotency_key','release_version'
     ]::text[]<>'{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid Phase 204 commerce control envelope' USING ERRCODE='22023';
  END IF;
  BEGIN
    v_event_id := (p_request->>'control_event_id')::uuid;
    v_tenant_id := (p_request->>'tenant_id')::uuid;
    v_organization_id := (p_request->>'organization_id')::uuid;
    v_business_boundary_id := (p_request->>'business_boundary_id')::uuid;
    v_occurred_at := (p_request->>'occurred_at')::timestamptz;
    SELECT COALESCE(array_agg(value::uuid ORDER BY ordinal),ARRAY[]::uuid[])
      INTO v_evidence_ids
    FROM jsonb_array_elements_text(COALESCE(p_request->'evidence_ids','[]'::jsonb))
      WITH ORDINALITY AS evidence(value,ordinal);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Malformed Phase 204 commerce control envelope' USING ERRCODE='22023';
  END;
  v_idempotency_key := p_request->>'idempotency_key';
  v_state := CASE p_request->>'action'
    WHEN 'PAUSE_BUSINESS' THEN 'PAUSED'
    WHEN 'RESUME_BUSINESS' THEN 'ACTIVE'
    WHEN 'DISABLE_PUBLICATION' THEN 'PUBLICATION_DISABLED'
    WHEN 'ENABLE_PUBLICATION' THEN 'ACTIVE'
    WHEN 'KILL_BUSINESS' THEN 'KILLED'
    ELSE NULL END;
  v_control_code := CASE p_request->>'action'
    WHEN 'PAUSE_BUSINESS' THEN 'PAUSE_BUSINESS' WHEN 'RESUME_BUSINESS' THEN 'PAUSE_BUSINESS'
    WHEN 'DISABLE_PUBLICATION' THEN 'DISABLE_PUBLICATION' WHEN 'ENABLE_PUBLICATION' THEN 'DISABLE_PUBLICATION'
    WHEN 'KILL_BUSINESS' THEN 'KILL_BUSINESS' END;
  v_control_state := CASE WHEN p_request->>'action' IN ('RESUME_BUSINESS','ENABLE_PUBLICATION')
    THEN 'ARMED' ELSE 'ENGAGED' END;
  IF p_request->>'release_version'<>'phase-204' OR v_state IS NULL
     OR v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 12 AND 255
     OR length(btrim(COALESCE(p_request->>'reason',''))) NOT BETWEEN 1 AND 2000
     OR cardinality(v_evidence_ids)=0
     OR cardinality(v_evidence_ids)<>(SELECT count(DISTINCT value) FROM unnest(v_evidence_ids) value)
     OR v_occurred_at IS NULL OR v_occurred_at>clock_timestamp()+interval '5 minutes' THEN
    RAISE EXCEPTION 'Phase 204 commerce control violates the bounded contract' USING ERRCODE='22023';
  END IF;
  IF p_request->>'action' IN ('KILL_BUSINESS','RESUME_BUSINESS','ENABLE_PUBLICATION') THEN
    IF NOT entral.phase204_owner_access_allows(v_tenant_id,v_organization_id) THEN
      RAISE EXCEPTION 'Kill, resume, and publication re-enable require the exact current Human OWNER'
        USING ERRCODE='42501';
    END IF;
  ELSIF NOT entral.phase204_operation_access_allows(v_tenant_id,v_organization_id) THEN
    RAISE EXCEPTION 'Commerce control requires exact tenant operations authority' USING ERRCODE='42501';
  END IF;
  v_actor_id := entral.phase202_current_actor_id();
  v_request_hash := entral.phase204_request_hash(p_request);
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:commerce-control:'||v_idempotency_key,0));
  PERFORM pg_advisory_xact_lock(hashtextextended('phase204:business-boundary:'||v_business_boundary_id::text,0));
  prior_response := entral.phase204_mutation_replay('SET_COMMERCE_CONTROL',v_idempotency_key,v_request_hash);
  IF prior_response IS NOT NULL THEN RETURN prior_response; END IF;
  SELECT * INTO boundary FROM public."BusinessBoundary"
  WHERE "id"=v_business_boundary_id AND "tenantId"=v_tenant_id AND "organizationId"=v_organization_id
    AND "stableCode"='SP-COMMERCE-001' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commerce control is outside the canonical Phase 204 business' USING ERRCODE='23503'; END IF;
  SELECT * INTO activation FROM entral.phase204_internal_commerce_activations
  WHERE business_boundary_id=v_business_boundary_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Canonical Phase 204 activation receipt is missing' USING ERRCODE='23514'; END IF;
  IF EXISTS (SELECT 1 FROM (
      SELECT DISTINCT ON (control_code) control_code,control_state
      FROM entral.phase204_commerce_controls WHERE business_boundary_id=v_business_boundary_id
      ORDER BY control_code,version DESC,created_at DESC
  ) current_control WHERE control_code='KILL_BUSINESS' AND control_state='ENGAGED') THEN
    RAISE EXCEPTION 'Killed commerce business cannot be mutated' USING ERRCODE='55000';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT DISTINCT ON (control_code) control_code,control_state
      FROM entral.phase204_commerce_controls
      WHERE business_boundary_id=v_business_boundary_id AND control_code=v_control_code
      ORDER BY control_code,version DESC,created_at DESC
    ) current_control
    WHERE current_control.control_state=CASE
      WHEN p_request->>'action' IN ('RESUME_BUSINESS','ENABLE_PUBLICATION') THEN 'ENGAGED'
      ELSE 'ARMED'
    END
  ) THEN
    RAISE EXCEPTION 'Commerce control transition does not match the current control state'
      USING ERRCODE='55000';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_evidence_ids) evidence_id
    WHERE NOT EXISTS (SELECT 1 FROM entral.source_records source
      WHERE source.id=evidence_id AND source.business_id=boundary."canonicalBusinessId")
      AND NOT EXISTS (SELECT 1 FROM entral.artifacts artifact
        WHERE artifact.id=evidence_id AND artifact.business_id=boundary."canonicalBusinessId")
  ) THEN RAISE EXCEPTION 'Commerce control evidence is outside the canonical business' USING ERRCODE='23514'; END IF;
  IF p_request->>'action'='PAUSE_BUSINESS' THEN
    SELECT COALESCE(array_agg(id ORDER BY stable_code),ARRAY[]::uuid[])
      INTO v_affected_entity_ids
    FROM entral.entities
    WHERE business_id=boundary."canonicalBusinessId" AND status='ACTIVE';
    SELECT COALESCE(array_agg(id ORDER BY stable_code),ARRAY[]::uuid[])
      INTO v_affected_mission_ids
    FROM entral.missions
    WHERE business_id=boundary."canonicalBusinessId" AND status='ACTIVE';
    SELECT COALESCE(array_agg(id ORDER BY stable_code),ARRAY[]::uuid[])
      INTO v_affected_task_ids
    FROM entral.tasks
    WHERE business_id=boundary."canonicalBusinessId" AND status='ACTIVE';
  ELSIF p_request->>'action'='RESUME_BUSINESS' THEN
    SELECT affected_entity_ids,affected_mission_ids,affected_task_ids
      INTO v_affected_entity_ids,v_affected_mission_ids,v_affected_task_ids
    FROM entral.phase204_commerce_controls
    WHERE business_boundary_id=v_business_boundary_id
      AND control_code='PAUSE_BUSINESS' AND control_state='ENGAGED'
    ORDER BY version DESC,created_at DESC LIMIT 1;
  END IF;
  SELECT COALESCE(max(version),0)+1 INTO v_version FROM entral.phase204_commerce_controls
  WHERE business_boundary_id=v_business_boundary_id AND control_code=v_control_code;
  INSERT INTO entral.phase204_commerce_controls(
    control_record_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,
    control_code,availability,control_state,requires_owner_approval,action_id,reason,
    evidence_ids,affected_entity_ids,affected_mission_ids,affected_task_ids,
    verified_at,version,actor_id
  ) VALUES (
    v_event_id,v_tenant_id,v_organization_id,v_business_boundary_id,boundary."canonicalBusinessId",
    v_control_code,'AVAILABLE',v_control_state,v_control_code='KILL_BUSINESS',
    CASE WHEN v_control_state='ENGAGED' THEN v_event_id ELSE NULL END,
    CASE WHEN v_control_state='ENGAGED' THEN p_request->>'reason' ELSE NULL END,
    v_evidence_ids,v_affected_entity_ids,v_affected_mission_ids,v_affected_task_ids,
    v_occurred_at,v_version,v_actor_id
  );
  INSERT INTO entral.phase204_commerce_control_events(
    control_event_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,state,reason,actor_id,occurred_at
  ) VALUES (
    v_event_id,v_tenant_id,v_organization_id,v_business_boundary_id,boundary."canonicalBusinessId",
    v_state,p_request->>'reason',v_actor_id,v_occurred_at
  );
  IF p_request->>'action' IN ('PAUSE_BUSINESS','DISABLE_PUBLICATION','KILL_BUSINESS') THEN
    INSERT INTO entral.phase204_storefront_state_events(
      storefront_state_event_id,storefront_id,tenant_id,organization_id,business_boundary_id,
      provider,state,public_brand,market_evidence_source_record_id,provider_policy_source_record_id,
      provider_policy_evidence_ids,etsy_blocker_code,etsy_blocker_evidence_source_record_id,
      state_reason,actor_id,occurred_at
    ) SELECT public.gen_random_uuid(),storefront.storefront_id,v_tenant_id,v_organization_id,
      v_business_boundary_id,current_state.provider,
      CASE WHEN p_request->>'action'='PAUSE_BUSINESS' THEN 'PAUSED' ELSE 'DISABLED' END,
      current_state.public_brand,current_state.market_evidence_source_record_id,
      current_state.provider_policy_source_record_id,current_state.provider_policy_evidence_ids,
      current_state.etsy_blocker_code,current_state.etsy_blocker_evidence_source_record_id,
      p_request->>'reason',v_actor_id,v_occurred_at
    FROM entral.phase204_storefronts storefront
    CROSS JOIN LATERAL (
      SELECT state.* FROM entral.phase204_storefront_state_events state
      WHERE state.storefront_id=storefront.storefront_id
      ORDER BY state.occurred_at DESC,state.storefront_state_event_id DESC LIMIT 1
    ) current_state
    WHERE storefront.business_boundary_id=v_business_boundary_id;
  ELSIF p_request->>'action' IN ('RESUME_BUSINESS','ENABLE_PUBLICATION') THEN
    INSERT INTO entral.phase204_storefront_state_events(
      storefront_state_event_id,storefront_id,tenant_id,organization_id,business_boundary_id,
      provider,state,public_brand,market_evidence_source_record_id,provider_policy_source_record_id,
      provider_policy_evidence_ids,etsy_blocker_code,etsy_blocker_evidence_source_record_id,
      state_reason,actor_id,occurred_at
    ) SELECT public.gen_random_uuid(),storefront.storefront_id,v_tenant_id,v_organization_id,
      v_business_boundary_id,base_state.provider,
      CASE
        WHEN p_request->>'action'='RESUME_BUSINESS' AND EXISTS (
          SELECT 1 FROM (
            SELECT DISTINCT ON (control_code) control_code,control_state
            FROM entral.phase204_commerce_controls
            WHERE business_boundary_id=v_business_boundary_id
            ORDER BY control_code,version DESC,created_at DESC
          ) current_control
          WHERE control_code='DISABLE_PUBLICATION' AND control_state='ENGAGED'
        ) THEN 'DISABLED'
        WHEN p_request->>'action'='ENABLE_PUBLICATION' AND EXISTS (
          SELECT 1 FROM (
            SELECT DISTINCT ON (control_code) control_code,control_state
            FROM entral.phase204_commerce_controls
            WHERE business_boundary_id=v_business_boundary_id
            ORDER BY control_code,version DESC,created_at DESC
          ) current_control
          WHERE control_code='PAUSE_BUSINESS' AND control_state='ENGAGED'
        ) THEN 'PAUSED'
        ELSE base_state.state
      END,
      base_state.public_brand,base_state.market_evidence_source_record_id,
      base_state.provider_policy_source_record_id,base_state.provider_policy_evidence_ids,
      base_state.etsy_blocker_code,base_state.etsy_blocker_evidence_source_record_id,
      p_request->>'reason',v_actor_id,v_occurred_at
    FROM entral.phase204_storefronts storefront
    CROSS JOIN LATERAL (
      SELECT state.* FROM entral.phase204_storefront_state_events state
      WHERE state.storefront_id=storefront.storefront_id
        AND state.state NOT IN ('PAUSED','DISABLED')
      ORDER BY state.occurred_at DESC,state.storefront_state_event_id DESC LIMIT 1
    ) base_state
    WHERE storefront.business_boundary_id=v_business_boundary_id;
  END IF;
  IF v_state='PAUSED' THEN
    UPDATE entral.businesses SET status='PAUSED' WHERE id=boundary."canonicalBusinessId" AND status<>'RETIRED';
    UPDATE public."BusinessBoundary" SET "status"='SUSPENDED',"version"="version"+1,"updatedAt"=clock_timestamp()
    WHERE "id"=v_business_boundary_id AND "status"='ACTIVE';
    UPDATE entral.entities SET status='PAUSED' WHERE id=ANY(v_affected_entity_ids) AND status='ACTIVE';
    UPDATE entral.missions SET status='BLOCKED' WHERE id=ANY(v_affected_mission_ids) AND status='ACTIVE';
    UPDATE entral.tasks SET status='BLOCKED' WHERE id=ANY(v_affected_task_ids) AND status='ACTIVE';
  ELSIF p_request->>'action'='RESUME_BUSINESS' THEN
    UPDATE public."BusinessBoundary" SET "status"='ACTIVE',"version"="version"+1,"updatedAt"=clock_timestamp()
    WHERE "id"=v_business_boundary_id AND "status"='SUSPENDED';
    UPDATE entral.businesses SET status='OPERATING' WHERE id=boundary."canonicalBusinessId" AND status='PAUSED';
    UPDATE entral.entities SET status='ACTIVE' WHERE id=ANY(v_affected_entity_ids) AND status='PAUSED';
    UPDATE entral.missions SET status='ACTIVE' WHERE id=ANY(v_affected_mission_ids) AND status='BLOCKED';
    UPDATE entral.tasks SET status='ACTIVE' WHERE id=ANY(v_affected_task_ids) AND status='BLOCKED';
  ELSIF v_state='KILLED' THEN
    -- Kill also independently engages publication-disable and pause controls.
    INSERT INTO entral.phase204_commerce_controls(
      control_record_id,tenant_id,organization_id,business_boundary_id,canonical_business_id,
      control_code,availability,control_state,requires_owner_approval,action_id,reason,
      evidence_ids,verified_at,version,actor_id
    ) SELECT public.gen_random_uuid(),v_tenant_id,v_organization_id,v_business_boundary_id,
      boundary."canonicalBusinessId",control_codes.control_code,'AVAILABLE','ENGAGED',false,v_event_id,
      p_request->>'reason',v_evidence_ids,v_occurred_at,
      COALESCE((SELECT max(version) FROM entral.phase204_commerce_controls prior
        WHERE prior.business_boundary_id=v_business_boundary_id
          AND prior.control_code=control_codes.control_code),0)+1,
      v_actor_id
    FROM unnest(ARRAY['PAUSE_BUSINESS','DISABLE_PUBLICATION']::text[]) AS control_codes(control_code);
    UPDATE public."BusinessBoundary" SET "status"='CLOSED',"version"="version"+1,"updatedAt"=clock_timestamp()
    WHERE "id"=v_business_boundary_id;
    UPDATE entral.businesses SET status='RETIRED',retired_at=clock_timestamp() WHERE id=boundary."canonicalBusinessId";
    UPDATE entral.entities SET status='RETIRED',retired_at=clock_timestamp() WHERE business_id=boundary."canonicalBusinessId";
    UPDATE entral.missions SET status='STOPPED',completed_at=clock_timestamp()
    WHERE business_id=boundary."canonicalBusinessId" AND status IN ('DRAFT','ROUTING','ACKNOWLEDGED','ACTIVE','BLOCKED');
    UPDATE entral.tasks SET status='STOPPED',completed_at=clock_timestamp()
    WHERE business_id=boundary."canonicalBusinessId" AND status IN ('NOT_STARTED','ACTIVE','BLOCKED');
    FOR installation IN
      SELECT record.* FROM entral.tenant_capability_installations record
      JOIN entral.phase204_business_capability_installations binding
        ON binding.installation_id=record.installation_id
       AND binding.business_boundary_id=v_business_boundary_id
      WHERE record.state IN ('AVAILABLE','ACTIVATING','ACTIVE') ORDER BY record.installation_id FOR UPDATE OF record
    LOOP
      INSERT INTO entral.tenant_capability_installation_audit(
        transition_id,installation_id,tenant_id,organization_id,business_id,
        capability_id,capability_version,from_state,to_state,prior_record_version,
        resulting_record_version,reason,actor_id,correlation_id,idempotency_key,release_version
      ) VALUES (
        public.gen_random_uuid(),installation.installation_id,v_tenant_id,v_organization_id,
        v_business_boundary_id,installation.capability_id,installation.capability_version,
        installation.state,'SUSPENDED',installation.record_version,installation.record_version+1,
        'Business kill suspended the tenant capability installation.',v_actor_id,v_event_id,
        'phase204:kill-installation:'||v_event_id::text||':'||installation.installation_id::text,'phase-204'
      );
      UPDATE entral.tenant_capability_installations SET state='SUSPENDED',
        suspension_reason='SP-COMMERCE-001 was killed by its OWNER.',
        record_version=record_version+1,updated_at=v_occurred_at
      WHERE installation_id=installation.installation_id;
    END LOOP;
    FOR capability IN
      SELECT record.* FROM entral.capability_records record
      JOIN entral.phase204_capability_source_bindings binding
        ON binding.tenant_capability_id=record.capability_id
       AND binding.tenant_capability_version=record.capability_version
       AND binding.tenant_id=v_tenant_id AND binding.organization_id=v_organization_id
      WHERE record.lifecycle_state='ACTIVE' ORDER BY record.capability_id FOR UPDATE OF record
    LOOP
      v_transition_id := public.gen_random_uuid();
      INSERT INTO entral.capability_transition_audit(
        transition_id,capability_id,capability_version,from_state,to_state,pricing_eligibility,
        prior_record_version,resulting_record_version,evidence_receipt_ids,reason,actor_id,
        tenant_id,organization_id,business_id,correlation_id,idempotency_key,request_sha256,
        release_version,response_snapshot,requested_at
      ) VALUES (
        v_transition_id,capability.capability_id,capability.capability_version,'ACTIVE','CANARY_VERIFIED',
        'NOT_ELIGIBLE',capability.record_version,capability.record_version+1,ARRAY[]::uuid[],
        'Business kill deactivated the internal tenant capability.',v_actor_id,v_tenant_id,
        v_organization_id,v_business_boundary_id,v_event_id,
        'phase204:kill-capability:'||v_event_id::text||':'||capability.capability_id::text,
        encode(public.digest(convert_to(v_event_id::text||capability.capability_id::text,'UTF8'),'sha256'),'hex'),
        'phase-204',entral.phase203_capability_record_json(capability.capability_id)||jsonb_build_object(
          'lifecycle_state','CANARY_VERIFIED','public_claim_eligible',false,
          'pricing_eligibility','NOT_ELIGIBLE','record_version',capability.record_version+1
        ),v_occurred_at
      );
      PERFORM set_config('app.phase203_transition_id',v_transition_id::text,true);
      UPDATE entral.capability_records SET lifecycle_state='CANARY_VERIFIED',
        public_claim_eligible=false,pricing_eligibility='NOT_ELIGIBLE',
        record_version=record_version+1,updated_at=v_occurred_at
      WHERE capability_id=capability.capability_id;
    END LOOP;
    PERFORM entral.phase203_bump_registry_revision();
  END IF;
  response := jsonb_build_object(
    'control_id',v_event_id,'business_boundary_id',v_business_boundary_id,
    'canonical_business_id',boundary."canonicalBusinessId",'action',p_request->>'action',
    'control_code',v_control_code,'availability','AVAILABLE','state',v_control_state,
    'requires_owner_approval',v_control_code='KILL_BUSINESS',
    'last_action_id',CASE WHEN v_control_state='ENGAGED' THEN v_event_id ELSE NULL END,
    'reason',CASE WHEN v_control_state='ENGAGED' THEN p_request->>'reason' ELSE NULL END,
    'evidence_ids',to_jsonb(v_evidence_ids),'verified_at',v_occurred_at,'version',v_version,
    'affected_entity_ids',to_jsonb(v_affected_entity_ids),
    'affected_mission_ids',to_jsonb(v_affected_mission_ids),
    'affected_task_ids',to_jsonb(v_affected_task_ids),
    'external_provider_mutation_performed',false,'occurred_at',v_occurred_at,'release_version','phase-204'
  );
  PERFORM entral.phase204_record_mutation(
    'SET_COMMERCE_CONTROL',v_tenant_id,v_organization_id,NULL,NULL,
    v_idempotency_key,v_request_hash,response,v_actor_id
  );
  RETURN response;
END
$phase204_set_commerce_control$;

-- The final readback is sourced only from current append-only truth records.
-- It intentionally does not derive absent provider economics as zero.
CREATE OR REPLACE FUNCTION entral.phase204_internal_commerce_readback(
  p_tenant_id uuid,p_organization_id uuid
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public,entral,pg_temp
AS $phase204_internal_commerce_truth_readback$
DECLARE
  activation entral.phase204_internal_commerce_activations%ROWTYPE;
  storefront entral.phase204_storefronts%ROWTYPE;
  latest_state entral.phase204_storefront_state_events%ROWTYPE;
  latest_approval entral.phase204_publication_approval_envelopes%ROWTYPE;
  v_products jsonb;
  v_capabilities jsonb;
  v_listings jsonb;
  v_metrics jsonb;
  v_controls jsonb;
  v_manifest jsonb;
BEGIN
  IF NOT entral.phase204_internal_read_allows(p_tenant_id,p_organization_id) THEN
    RAISE EXCEPTION 'Phase 204 internal commerce readback is outside the exact tenant scope'
      USING ERRCODE='42501';
  END IF;
  SELECT * INTO activation FROM entral.phase204_internal_commerce_activations
  WHERE tenant_id=p_tenant_id AND organization_id=p_organization_id
  ORDER BY created_at DESC,activation_id DESC LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('tenant_id',p_tenant_id,'organization_id',p_organization_id,
      'business',NULL,'state','NOT_ACTIVATED','release_version','phase-204');
  END IF;
  SELECT * INTO storefront FROM entral.phase204_storefronts
  WHERE business_boundary_id=activation.business_boundary_id;
  SELECT * INTO latest_state FROM entral.phase204_storefront_state_events
  WHERE storefront_id=storefront.storefront_id
  ORDER BY occurred_at DESC,storefront_state_event_id DESC LIMIT 1;
  SELECT * INTO latest_approval FROM entral.phase204_publication_approval_envelopes
  WHERE storefront_id=storefront.storefront_id ORDER BY approved_at DESC,approval_id DESC LIMIT 1;
  v_manifest := entral.phase204_storefront_manifest_hashes(storefront.storefront_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'product_id',product.product_id,'product_code',product.product_code,'title',product.title,
    'product_kind',product.product_kind,'product_version',product.product_version,
    'price_cents',product.price_cents,'currency',product.currency,
    'delivery_manifest_sha256',manifest_values.manifests->>'delivery_manifest_sha256',
    'claims_sha256',manifest_values.manifests->>'claims_manifest_sha256',
    'asset_role_count',(SELECT count(*) FROM (
      SELECT DISTINCT ON (asset_role) asset_role FROM entral.phase204_product_assets asset
      WHERE asset.product_id=product.product_id ORDER BY asset_role,created_at DESC,product_asset_id DESC
    ) current_assets),
    'latest_passed_gate_count',(SELECT count(*) FROM (
      SELECT DISTINCT ON (gate_type) gate_type,status FROM entral.phase204_product_gate_receipts gate
      WHERE gate.product_id=product.product_id ORDER BY gate_type,assessed_at DESC,gate_receipt_id DESC
    ) current_gates WHERE status='PASSED'),
    'ready',entral.phase204_product_is_ready(product.product_id)
  ) ORDER BY product.product_code),'[]'::jsonb) INTO v_products
  FROM entral.phase204_internal_commerce_products product
  CROSS JOIN LATERAL entral.phase204_product_manifest_hashes(product.product_id)
    AS manifest_values(manifests)
  WHERE product.business_boundary_id=activation.business_boundary_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'tenant_capability_id',capability.capability_id,'catalog_capability_id',binding.catalog_capability_id,
    'name',capability.display_name,'lifecycle_state',capability.lifecycle_state,
    'installation_id',installation.installation_id,'installation_state',installation.state,
    'public_claim_eligible',capability.public_claim_eligible,'scope',capability.scope,
    'environment',capability.environment
  ) ORDER BY capability.display_name),'[]'::jsonb) INTO v_capabilities
  FROM entral.phase204_capability_source_bindings binding
  JOIN entral.capability_records capability ON capability.capability_id=binding.tenant_capability_id
    AND capability.capability_version=binding.tenant_capability_version
  LEFT JOIN entral.tenant_capability_installations installation
    ON installation.capability_id=capability.capability_id
   AND installation.capability_version=capability.capability_version
   AND installation.tenant_id=p_tenant_id AND installation.organization_id=p_organization_id
  LEFT JOIN entral.phase204_business_capability_installations business_binding
    ON business_binding.installation_id=installation.installation_id
   AND business_binding.business_boundary_id=activation.business_boundary_id
  WHERE binding.tenant_id=p_tenant_id AND binding.organization_id=p_organization_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'listing_record_id',listing_record_id,'product_code',product_code,
    'provider_listing_id',provider_listing_id,
    'provider_listing_reference_sha256',provider_listing_id_sha256,'status',status,
    'price_cents',price_cents,'delivery_manifest_sha256',delivery_manifest_sha256,
    'claims_manifest_sha256',claims_manifest_sha256,'published_at',published_at,
    'provider_evidence_ids',to_jsonb(provider_evidence_ids)
  ) ORDER BY product_code),'[]'::jsonb) INTO v_listings
  FROM (
    SELECT DISTINCT ON (listing.product_id) listing.*
    FROM entral.phase204_storefront_listing_records listing
    WHERE listing.storefront_id=storefront.storefront_id
    ORDER BY listing.product_id,listing.created_at DESC,listing.listing_record_id DESC
  ) current_listing;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'metric_id',metric_truth_id,'metric_code',metric_code,
    'scope',jsonb_build_object('scope_type',scope_type,'scope_code',scope_code),
    'truth_state',truth_state,'value',value_numeric,'unit',unit,'currency',currency,
    'provider_record_id',provider_record_id,'source_type',source_type,'evidence_id',evidence_id,
    'observed_at',observed_at,'unavailable_reason',unavailable_reason,'is_estimate',false
  ) ORDER BY scope_type,scope_code,metric_code),'[]'::jsonb) INTO v_metrics
  FROM (
    SELECT DISTINCT ON (scope_type,scope_code,metric_code) metric.*
    FROM entral.phase204_operational_metric_truth metric
    WHERE metric.storefront_id=storefront.storefront_id
    ORDER BY scope_type,scope_code,metric_code,created_at DESC,metric_truth_id DESC
  ) current_metric;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'control_id',control_record_id,'control_code',control_code,'availability',availability,
    'state',control_state,'requires_owner_approval',requires_owner_approval,
    'last_action_id',action_id,'reason',reason,'evidence_ids',to_jsonb(evidence_ids),
    'verified_at',verified_at,'version',version
  ) ORDER BY control_code),'[]'::jsonb) INTO v_controls
  FROM (
    SELECT DISTINCT ON (control_code) control.*
    FROM entral.phase204_commerce_controls control
    WHERE control.business_boundary_id=activation.business_boundary_id
    ORDER BY control_code,version DESC,created_at DESC
  ) current_control;

  RETURN jsonb_build_object(
    'tenant_id',p_tenant_id,'organization_id',p_organization_id,'release_version','phase-204',
    'business',jsonb_build_object(
      'business_boundary_id',activation.business_boundary_id,
      'canonical_business_id',activation.canonical_business_id,
      'internal_code','SP-COMMERCE-001','working_name','Contractor Operations Products',
      'status',(SELECT status FROM entral.businesses WHERE id=activation.canonical_business_id),
      'boundary_status',(SELECT "status" FROM public."BusinessBoundary" WHERE "id"=activation.business_boundary_id),
      'commander_id',activation.commander_id,'marshal_id',activation.marshal_id,
      'general_id',activation.general_id,'launch_mission_id',activation.launch_mission_id
    ),
    'capabilities',v_capabilities,'products',v_products,
    'storefront',jsonb_build_object(
      'storefront_id',storefront.storefront_id,'preferred_provider',storefront.preferred_provider,
      'provider',latest_state.provider,'state',latest_state.state,'public_brand',latest_state.public_brand,
      'provider_policy_source_record_id',latest_state.provider_policy_source_record_id,
      'provider_policy_evidence_ids',to_jsonb(latest_state.provider_policy_evidence_ids),
      'state_reason',latest_state.state_reason,'owner_approval_id',latest_approval.approval_id,
      'publication_allowed',entral.phase204_publication_allowed(storefront.storefront_id),
      'listings',v_listings,'external_provider_mutation_available',false
    ),
    'controls',v_controls,
    'readiness',jsonb_build_object(
      'exact_product_count',(SELECT count(*) FROM entral.phase204_internal_commerce_products
        WHERE business_boundary_id=activation.business_boundary_id),
      'exact_listing_count',jsonb_array_length(v_listings),
      'exact_metric_truth_count',jsonb_array_length(v_metrics),
      'exact_control_count',jsonb_array_length(v_controls),
      'all_products_ready',NOT EXISTS (
        SELECT 1 FROM entral.phase204_internal_commerce_products product
        WHERE product.business_boundary_id=activation.business_boundary_id
          AND NOT entral.phase204_product_is_ready(product.product_id)
      ),'manifest_hashes',v_manifest,'owner_approval_present',latest_approval.approval_id IS NOT NULL
    ),
    'operational_metrics',v_metrics,
    'daily_operating_summary',jsonb_build_object(
      'period_start',clock_timestamp()-interval '24 hours','period_end',clock_timestamp(),
      'observed_provider_fact_count',(SELECT count(*) FROM entral.phase204_provider_facts fact
        WHERE fact.storefront_id=storefront.storefront_id AND fact.fact_state='OBSERVED'
          AND fact.captured_at>=clock_timestamp()-interval '24 hours'),
      'unavailable_provider_fact_count',(SELECT count(*) FROM entral.phase204_provider_facts fact
        WHERE fact.storefront_id=storefront.storefront_id AND fact.fact_state='UNAVAILABLE'
          AND fact.captured_at>=clock_timestamp()-interval '24 hours'),
      'operational_metrics',v_metrics,'estimated_values_included',false
    ),'generated_at',clock_timestamp()
  );
END
$phase204_internal_commerce_truth_readback$;

-- FORCE RLS is safe here because every internal mutation still has an exact
-- tenant-scoped INSERT policy; no runtime role receives direct table writes.
DO $phase204_rls$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'phase204_mutation_receipts','phase204_capability_source_bindings',
    'phase204_business_capability_installations','phase204_internal_commerce_activations',
    'phase204_internal_commerce_products','phase204_product_assets',
    'phase204_product_gate_receipts','phase204_storefronts','phase204_storefront_state_events',
    'phase204_publication_approval_envelopes','phase204_provider_facts','phase204_commerce_control_events',
    'phase204_storefront_listing_records','phase204_operational_metric_truth','phase204_commerce_controls'
  ]::text[] LOOP
    EXECUTE format('ALTER TABLE entral.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE entral.%I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format(
      'CREATE POLICY %I ON entral.%I FOR SELECT USING (entral.phase204_internal_read_allows(tenant_id,organization_id))',
      table_name||'_select',table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON entral.%I FOR INSERT WITH CHECK (entral.phase204_operation_access_allows(tenant_id,organization_id))',
      table_name||'_insert',table_name
    );
  END LOOP;
  ALTER TABLE entral.phase204_product_bundle_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE entral.phase204_product_bundle_items FORCE ROW LEVEL SECURITY;
  CREATE POLICY phase204_product_bundle_items_select ON entral.phase204_product_bundle_items
    FOR SELECT USING (EXISTS (
      SELECT 1 FROM entral.phase204_internal_commerce_products product
      WHERE product.product_id=bundle_product_id
        AND entral.phase204_internal_read_allows(product.tenant_id,product.organization_id)
    ));
  CREATE POLICY phase204_product_bundle_items_insert ON entral.phase204_product_bundle_items
    FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM entral.phase204_internal_commerce_products product
      WHERE product.product_id=bundle_product_id
        AND entral.phase204_operation_access_allows(product.tenant_id,product.organization_id)
    ));
  ALTER TABLE entral.phase204_publication_product_approvals ENABLE ROW LEVEL SECURITY;
  ALTER TABLE entral.phase204_publication_product_approvals FORCE ROW LEVEL SECURITY;
  CREATE POLICY phase204_publication_product_approvals_select
    ON entral.phase204_publication_product_approvals FOR SELECT USING (EXISTS (
      SELECT 1 FROM entral.phase204_storefronts storefront
      WHERE storefront.storefront_id=phase204_publication_product_approvals.storefront_id
        AND entral.phase204_internal_read_allows(storefront.tenant_id,storefront.organization_id)
    ));
  CREATE POLICY phase204_publication_product_approvals_insert
    ON entral.phase204_publication_product_approvals FOR INSERT WITH CHECK (EXISTS (
      SELECT 1 FROM entral.phase204_storefronts storefront
      WHERE storefront.storefront_id=phase204_publication_product_approvals.storefront_id
        AND entral.phase204_operation_access_allows(storefront.tenant_id,storefront.organization_id)
    ));
END
$phase204_rls$;

DO $phase204_privileges$
DECLARE
  function_record record;
  role_name text;
  table_name text;
BEGIN
  FOR function_record IN
    SELECT proc.oid::regprocedure AS identity
    FROM pg_proc proc JOIN pg_namespace namespace ON namespace.oid=proc.pronamespace
    WHERE namespace.nspname='entral'
      AND (proc.proname LIKE 'phase204\_%' ESCAPE '\'
        OR proc.proname IN (
          'phase203_transition_capability','phase203_reconcile_unhealthy_dependents',
          'phase203_transition_capability_v203','phase203_reconcile_unhealthy_dependents_v203'
        ))
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',function_record.identity);
    FOREACH role_name IN ARRAY ARRAY['entral_api','entral_worker','entral_verifier','entral_audit_reader']::text[] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',function_record.identity,role_name);
      END IF;
    END LOOP;
  END LOOP;
  FOREACH table_name IN ARRAY ARRAY[
    'phase204_mutation_receipts','phase204_capability_source_bindings',
    'phase204_business_capability_installations','phase204_internal_commerce_activations',
    'phase204_internal_commerce_products','phase204_product_bundle_items','phase204_product_assets',
    'phase204_product_gate_receipts','phase204_storefronts','phase204_storefront_state_events',
    'phase204_publication_approval_envelopes','phase204_provider_facts','phase204_commerce_control_events',
    'phase204_storefront_listing_records','phase204_publication_product_approvals',
    'phase204_operational_metric_truth','phase204_commerce_controls'
  ]::text[] LOOP
    EXECUTE format('REVOKE ALL ON TABLE entral.%I FROM PUBLIC',table_name);
    FOREACH role_name IN ARRAY ARRAY['entral_api','entral_worker','entral_verifier','entral_audit_reader']::text[] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=role_name) THEN
        EXECUTE format('REVOKE ALL ON TABLE entral.%I FROM %I',table_name,role_name);
      END IF;
    END LOOP;
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='entral_api') THEN
    GRANT EXECUTE ON FUNCTION entral.phase203_transition_capability(jsonb),
      entral.phase204_register_tenant_capability(jsonb),entral.phase204_record_capability_evidence(jsonb),
      entral.phase204_bind_capability_requirement(jsonb),
      entral.phase204_register_capability_installation(jsonb),entral.phase204_transition_capability_installation(jsonb),
      entral.phase204_tenant_capability_readback(uuid,uuid),entral.phase204_activate_internal_commerce(jsonb),
      entral.phase204_register_product_evidence(jsonb),entral.phase204_register_product_asset(jsonb),
      entral.phase204_record_product_gate(jsonb),
      entral.phase204_record_storefront_state(jsonb),entral.phase204_approve_publication(jsonb),
      entral.phase204_publication_allowed(uuid),entral.phase204_ingest_provider_fact(jsonb),
      entral.phase204_record_listing_state(jsonb),entral.phase204_record_metric_truth(jsonb),
      entral.phase204_set_commerce_control(jsonb),entral.phase204_internal_commerce_readback(uuid,uuid)
    TO entral_api;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='entral_worker') THEN
    GRANT EXECUTE ON FUNCTION entral.phase204_register_product_asset(jsonb),entral.phase204_record_product_gate(jsonb),
      entral.phase204_record_storefront_state(jsonb),entral.phase204_publication_allowed(uuid),
      entral.phase204_record_listing_state(jsonb),entral.phase204_ingest_provider_fact(jsonb),
      entral.phase204_record_metric_truth(jsonb),entral.phase204_set_commerce_control(jsonb),
      entral.phase204_internal_commerce_readback(uuid,uuid)
    TO entral_worker;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='entral_verifier') THEN
    GRANT SELECT ON TABLE
      entral.phase204_mutation_receipts,entral.phase204_capability_source_bindings,
      entral.phase204_business_capability_installations,entral.phase204_internal_commerce_activations,
      entral.phase204_internal_commerce_products,entral.phase204_product_bundle_items,
      entral.phase204_product_assets,entral.phase204_product_gate_receipts,entral.phase204_storefronts,
      entral.phase204_storefront_state_events,entral.phase204_publication_approval_envelopes,
      entral.phase204_provider_facts,entral.phase204_commerce_control_events,
      entral.phase204_storefront_listing_records,entral.phase204_publication_product_approvals,
      entral.phase204_operational_metric_truth,entral.phase204_commerce_controls
    TO entral_verifier;
    GRANT EXECUTE ON FUNCTION entral.phase204_tenant_capability_readback(uuid,uuid),
      entral.phase204_internal_commerce_readback(uuid,uuid),entral.phase204_storefront_manifest_hashes(uuid),
      entral.phase204_product_is_ready(uuid),entral.phase204_internal_read_allows(uuid,uuid)
    TO entral_verifier;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='entral_audit_reader') THEN
    GRANT SELECT ON TABLE
      entral.phase204_mutation_receipts,entral.phase204_capability_source_bindings,
      entral.phase204_business_capability_installations,entral.phase204_internal_commerce_activations,
      entral.phase204_internal_commerce_products,entral.phase204_product_bundle_items,
      entral.phase204_product_assets,entral.phase204_product_gate_receipts,entral.phase204_storefronts,
      entral.phase204_storefront_state_events,entral.phase204_publication_approval_envelopes,
      entral.phase204_provider_facts,entral.phase204_commerce_control_events,
      entral.phase204_storefront_listing_records,entral.phase204_publication_product_approvals,
      entral.phase204_operational_metric_truth,entral.phase204_commerce_controls
    TO entral_audit_reader;
    GRANT EXECUTE ON FUNCTION entral.phase204_tenant_capability_readback(uuid,uuid),
      entral.phase204_internal_commerce_readback(uuid,uuid),entral.phase204_storefront_manifest_hashes(uuid),
      entral.phase204_product_is_ready(uuid),entral.phase204_internal_read_allows(uuid,uuid)
    TO entral_audit_reader;
  END IF;
END
$phase204_privileges$;

COMMENT ON TABLE entral.phase204_internal_commerce_activations IS
  'Immutable receipt for initial fail-closed provisioning of canonical SP-COMMERCE-001; it is not a publication or finished-line certification.';
COMMENT ON TABLE entral.phase204_provider_facts IS
  'Credential-free observed provider facts or explicit UNAVAILABLE evidence; raw provider payloads are prohibited by the typed schema.';
COMMENT ON TABLE entral.phase204_storefront_listing_records IS
  'Immutable exact per-product listing truth; all five current listings must be provider-observed before the storefront can be PUBLISHED.';
COMMENT ON TABLE entral.phase204_operational_metric_truth IS
  'Authoritative append-only 54-cell business/product metric matrix; missing values remain explicitly UNAVAILABLE and never become zero.';
COMMENT ON TABLE entral.phase204_commerce_controls IS
  'Independent versioned pause, publication-disable, and owner-kill controls with current evidence and fail-closed state.';
COMMENT ON FUNCTION entral.phase204_activate_internal_commerce(jsonb) IS
  'Owner-only, idempotent narrow provisioning of one tenant-bound canonical commerce business and bounded mission-owned agent hierarchy.';
COMMENT ON FUNCTION entral.phase204_register_product_evidence(jsonb) IS
  'Tenant-operations-only canonical registration of exact repository product files and gate evidence before product readiness mutations.';
COMMENT ON FUNCTION entral.phase204_approve_publication(jsonb) IS
  'Owner-only approval of exact current product, asset, claim, license, AI-disclosure, price, brand, provider, and spend manifests; performs no provider mutation.';
COMMENT ON FUNCTION entral.phase204_publication_allowed(uuid) IS
  'Fail-closed internal publication decision requiring current owner envelope, five exact current listings, three ARMED controls, an operating business/active boundary, exact product readiness, and tenant ACTIVE capability installations.';
COMMENT ON FUNCTION entral.phase204_ingest_provider_fact(jsonb) IS
  'Credential-free idempotent ingestion of observed provider facts or explicit unavailable states; does not call or mutate an external provider.';
COMMENT ON FUNCTION entral.phase204_set_commerce_control(jsonb) IS
  'Versioned tenant operations pause/disable controls, owner-only safe resume/re-enable, and owner-only irreversible kill for SP-COMMERCE-001.';
COMMENT ON FUNCTION entral.phase204_internal_commerce_readback(uuid,uuid) IS
  'Truthful tenant-scoped readiness and daily operating readback; unavailable economics remain explicitly unavailable and generated activity is never revenue.';

COMMIT;
