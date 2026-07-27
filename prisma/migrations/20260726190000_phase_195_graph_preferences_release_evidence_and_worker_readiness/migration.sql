-- Phase 195 graph preferences, canonical release evidence, and worker readiness.
BEGIN;
SET LOCAL search_path = entral, public;

-- Phase 195 invalidates already-issued sessions and deferred work whenever a
-- principal's security-relevant account state changes. Existing rows begin at
-- version zero so the migration is backward compatible until the first change.
ALTER TABLE public."User"
    ADD COLUMN "sessionVersion" integer NOT NULL DEFAULT 0;
ALTER TABLE public."AutomationJob"
    ADD COLUMN "authorizationVersion" integer NOT NULL DEFAULT 0,
    ADD COLUMN "recoveryClaimedAt" timestamp(3),
    ADD COLUMN "recoveryClaimToken" text,
    ADD COLUMN "sourceOperationKey" text;
CREATE INDEX "AutomationJob_status_recoveryClaimedAt_idx"
    ON public."AutomationJob"(status, "recoveryClaimedAt");
CREATE UNIQUE INDEX "AutomationJob_sourceOperationKey_key"
    ON public."AutomationJob"("sourceOperationKey");
ALTER TABLE public."AgentTask"
    ADD COLUMN "authorizationVersion" integer NOT NULL DEFAULT 0;
ALTER TABLE public."AgentSchedule"
    ADD COLUMN "authorizationVersion" integer NOT NULL DEFAULT 0;
ALTER TABLE public."Agent"
    ADD COLUMN "executionLeaseToken" text,
    ADD COLUMN "executionLeaseTaskId" text,
    ADD COLUMN "executionLeaseAcquiredAt" timestamp(3);
CREATE INDEX "Agent_executionLeaseTaskId_idx"
    ON public."Agent"("executionLeaseTaskId");
ALTER TABLE public."ShopifyOAuthContinuation"
    ADD COLUMN "authorizationVersion" integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.bump_user_session_version()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF NEW."passwordHash" IS DISTINCT FROM OLD."passwordHash"
       OR NEW.email IS DISTINCT FROM OLD.email
       OR NEW.role IS DISTINCT FROM OLD.role
       OR NEW."internalAccess" IS DISTINCT FROM OLD."internalAccess" THEN
        NEW."sessionVersion" := OLD."sessionVersion" + 1;
    ELSIF NEW."sessionVersion" < OLD."sessionVersion" THEN
        RAISE EXCEPTION 'User session version cannot decrease'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER user_bump_session_version
BEFORE UPDATE ON public."User"
FOR EACH ROW EXECUTE FUNCTION public.bump_user_session_version();

ALTER TABLE public."AiUsageEvent"
    ADD COLUMN "providerRequestId" text,
    ADD COLUMN status text NOT NULL DEFAULT 'settled',
    ADD COLUMN "settledAt" timestamp(3),
    ADD COLUMN "failedAt" timestamp(3);
UPDATE public."AiUsageEvent"
SET "settledAt" = "createdAt"
WHERE "settledAt" IS NULL;
ALTER TABLE public."AiUsageEvent"
    ADD CONSTRAINT ai_usage_event_status_valid
        CHECK (status IN ('reserved', 'settled', 'failed')),
    ADD CONSTRAINT ai_usage_event_terminal_timestamps_valid
        CHECK (
            (status = 'reserved' AND "settledAt" IS NULL AND "failedAt" IS NULL)
            OR (status = 'settled' AND "settledAt" IS NOT NULL AND "failedAt" IS NULL)
            OR (status = 'failed' AND "settledAt" IS NULL AND "failedAt" IS NOT NULL)
        );
-- Legacy callers could reuse request IDs before Phase 195 made them
-- idempotency keys. Preserve every historical row while deterministically
-- rekeying only the second and later duplicate in each user scope.
WITH duplicate_requests AS (
    SELECT
        id,
        row_number() OVER (
            PARTITION BY "userId", "requestId"
            ORDER BY "createdAt", id
        ) AS duplicate_ordinal
    FROM public."AiUsageEvent"
    WHERE "requestId" IS NOT NULL
)
UPDATE public."AiUsageEvent" usage_event
SET "requestId" = left(usage_event."requestId", 150)
    || ':legacy-duplicate:'
    || usage_event.id
FROM duplicate_requests duplicate
WHERE duplicate.id = usage_event.id
  AND duplicate.duplicate_ordinal > 1;

CREATE UNIQUE INDEX "AiUsageEvent_userId_requestId_key"
    ON public."AiUsageEvent"("userId", "requestId");
CREATE INDEX "AiUsageEvent_userId_status_createdAt_idx"
    ON public."AiUsageEvent"("userId", status, "createdAt");

-- A member organization remains a legacy public.Team boundary, while the
-- authenticated actor is always the canonical entral.app_users identity.
CREATE OR REPLACE FUNCTION session_can_access_organization(p_organization_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM entral.app_users canonical_user
        JOIN public."TeamMember" membership
          ON membership."userId" = canonical_user.auth_subject
        JOIN public."Team" organization
          ON organization.id = membership."teamId"
        WHERE canonical_user.id = entral.session_app_user_id()
          AND canonical_user.is_active
          AND organization.id = p_organization_id
          AND organization."memberAccessEnabled"
    )
$$;
REVOKE ALL ON FUNCTION session_can_access_organization(text) FROM PUBLIC;

CREATE TABLE graph_view_preferences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    organization_id text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE,
    contract_version text NOT NULL DEFAULT '1.0.0'
        CHECK (contract_version = '1.0.0'),
    schema_version integer NOT NULL DEFAULT 2
        CHECK (schema_version BETWEEN 1 AND 2),
    migrated_from_schema_version integer
        CHECK (
            migrated_from_schema_version IS NULL
            OR (
                migrated_from_schema_version >= 1
                AND migrated_from_schema_version < schema_version
            )
        ),
    simple_settings jsonb NOT NULL
        CHECK (jsonb_typeof(simple_settings) = 'object'),
    advanced_shared_settings jsonb NOT NULL
        CHECK (jsonb_typeof(advanced_shared_settings) = 'object'),
    advanced_2d_settings jsonb NOT NULL
        CHECK (jsonb_typeof(advanced_2d_settings) = 'object'),
    advanced_3d_settings jsonb NOT NULL
        CHECK (jsonb_typeof(advanced_3d_settings) = 'object'),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (user_id, organization_id)
);
CREATE INDEX graph_view_preferences_organization_idx
    ON graph_view_preferences(organization_id, updated_at DESC);
CREATE TRIGGER graph_view_preferences_increment_version
BEFORE UPDATE ON graph_view_preferences
FOR EACH ROW EXECUTE FUNCTION increment_row_version();
CREATE TRIGGER graph_view_preferences_updated_at
BEFORE UPDATE ON graph_view_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE graph_pinned_positions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    organization_id text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE,
    entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    renderer text NOT NULL CHECK (renderer IN ('2D', '3D')),
    position_x numeric(16,4) NOT NULL
        CHECK (position_x BETWEEN -1000000 AND 1000000),
    position_y numeric(16,4) NOT NULL
        CHECK (position_y BETWEEN -1000000 AND 1000000),
    position_z numeric(16,4)
        CHECK (position_z IS NULL OR position_z BETWEEN -1000000 AND 1000000),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (
        (renderer = '2D' AND position_z IS NULL)
        OR (renderer = '3D' AND position_z IS NOT NULL)
    ),
    UNIQUE (user_id, organization_id, renderer, entity_id)
);
CREATE INDEX graph_pinned_positions_scope_idx
    ON graph_pinned_positions(user_id, organization_id, renderer);
CREATE TRIGGER graph_pinned_positions_updated_at
BEFORE UPDATE ON graph_pinned_positions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE graph_preference_mutation_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    organization_id text NOT NULL REFERENCES public."Team"(id) ON DELETE CASCADE,
    idempotency_key text NOT NULL,
    request_sha256 text NOT NULL CHECK (request_sha256 ~ '^[0-9a-f]{64}$'),
    operation text NOT NULL CHECK (operation IN ('UPDATE', 'RESET')),
    response_snapshot jsonb NOT NULL
        CHECK (jsonb_typeof(response_snapshot) = 'object'),
    event_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    retention_until timestamptz NOT NULL DEFAULT (clock_timestamp() + interval '90 days'),
    CHECK (char_length(idempotency_key) BETWEEN 12 AND 255),
    CHECK (retention_until > created_at),
    UNIQUE (user_id, organization_id, idempotency_key)
);
CREATE INDEX graph_preference_mutation_receipts_retention_idx
    ON graph_preference_mutation_receipts(retention_until);

ALTER TABLE graph_view_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY graph_view_preferences_select_policy ON graph_view_preferences
FOR SELECT USING (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
);
CREATE POLICY graph_view_preferences_insert_policy ON graph_view_preferences
FOR INSERT WITH CHECK (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
);
CREATE POLICY graph_view_preferences_update_policy ON graph_view_preferences
FOR UPDATE USING (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
)
WITH CHECK (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
);
CREATE POLICY graph_view_preferences_delete_policy ON graph_view_preferences
FOR DELETE USING (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
);

ALTER TABLE graph_pinned_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY graph_pinned_positions_select_policy ON graph_pinned_positions
FOR SELECT USING (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
    AND can_access_entity(entity_id, 'read')
);
CREATE POLICY graph_pinned_positions_insert_policy ON graph_pinned_positions
FOR INSERT WITH CHECK (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
    AND can_access_entity(entity_id, 'read')
);
CREATE POLICY graph_pinned_positions_update_policy ON graph_pinned_positions
FOR UPDATE USING (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
    AND can_access_entity(entity_id, 'read')
)
WITH CHECK (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
    AND can_access_entity(entity_id, 'read')
);
CREATE POLICY graph_pinned_positions_delete_policy ON graph_pinned_positions
FOR DELETE USING (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
    AND can_access_entity(entity_id, 'read')
);

ALTER TABLE graph_preference_mutation_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY graph_preference_receipts_select_policy ON graph_preference_mutation_receipts
FOR SELECT USING (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
);
CREATE POLICY graph_preference_receipts_insert_policy ON graph_preference_mutation_receipts
FOR INSERT WITH CHECK (
    user_id = session_app_user_id()
    AND session_can_access_organization(organization_id)
);

-- Graph preference audit/event payloads intentionally omit search strings,
-- filters, entity identifiers, coordinates, and the settings document.
CREATE OR REPLACE FUNCTION record_graph_preference_change(
    p_preference_id uuid,
    p_organization_id text,
    p_operation text,
    p_previous_version bigint,
    p_resulting_version bigint,
    p_schema_version integer,
    p_changed_sections text[],
    p_pinned_position_count integer
) RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public, pg_temp
AS $$
DECLARE
    event_ids uuid[] := ARRAY[]::uuid[];
    emitted_id uuid;
    actor_user_id uuid := session_app_user_id();
    correlation uuid := COALESCE(
        NULLIF(current_setting('app.correlation_id', true), '')::uuid,
        gen_random_uuid()
    );
    safe_summary jsonb;
BEGIN
    IF actor_user_id IS NULL OR NOT session_can_access_organization(p_organization_id) THEN
        RAISE EXCEPTION 'Authenticated organization access is required'
            USING ERRCODE = '42501';
    END IF;
    IF p_operation NOT IN ('UPDATE', 'RESET') THEN
        RAISE EXCEPTION 'Unsupported graph preference operation'
            USING ERRCODE = '22023';
    END IF;
    IF p_previous_version < 0 OR p_resulting_version < 0 OR p_schema_version <> 2 THEN
        RAISE EXCEPTION 'Invalid graph preference version metadata'
            USING ERRCODE = '22023';
    END IF;
    IF p_pinned_position_count < 0 THEN
        RAISE EXCEPTION 'Pinned position count cannot be negative'
            USING ERRCODE = '22023';
    END IF;
    IF p_changed_sections IS NULL
       OR p_changed_sections <@ ARRAY[
           'SIMPLE', 'ADVANCED_SHARED', 'VIEW_2D', 'VIEW_3D',
           'ARRANGEMENT', 'PINNED_POSITIONS', 'ALL'
       ]::text[] IS NOT TRUE THEN
        RAISE EXCEPTION 'Unsupported graph preference change section'
            USING ERRCODE = '22023';
    END IF;

    safe_summary := jsonb_build_object(
        'operation', p_operation,
        'organization_scope_present', true,
        'previous_version', p_previous_version,
        'resulting_version', p_resulting_version,
        'schema_version', p_schema_version,
        'changed_sections', p_changed_sections,
        'pinned_position_count', p_pinned_position_count
    );

    INSERT INTO audit_entries(
        action,
        reason,
        target_type,
        target_id,
        before_state,
        after_state,
        result,
        evidence_refs,
        access_classification,
        correlation_id
    ) VALUES (
        CASE p_operation
            WHEN 'RESET' THEN 'graph.preferences.reset'
            ELSE 'graph.preferences.update'
        END,
        current_action_reason(),
        'GRAPH_VIEW_PREFERENCE',
        p_preference_id,
        jsonb_build_object('version', p_previous_version),
        safe_summary,
        'SUCCEEDED',
        '[]'::jsonb,
        'INTERNAL',
        correlation
    );

    emitted_id := emit_canonical_event(
        CASE p_operation
            WHEN 'RESET' THEN 'graph.preferences.reset'
            ELSE 'graph.preferences.updated'
        END,
        'GRAPH_VIEW_PREFERENCE',
        p_preference_id,
        p_resulting_version,
        NULL,
        NULL,
        NULL,
        safe_summary,
        'INTERNAL',
        correlation,
        NULL
    );
    event_ids := array_append(event_ids, emitted_id);

    IF 'ARRANGEMENT' = ANY(p_changed_sections) THEN
        emitted_id := emit_canonical_event(
            'graph.arrangement.changed',
            'GRAPH_VIEW_PREFERENCE',
            p_preference_id,
            p_resulting_version,
            NULL,
            NULL,
            NULL,
            safe_summary,
            'INTERNAL',
            correlation,
            event_ids[1]
        );
        event_ids := array_append(event_ids, emitted_id);
    END IF;

    IF 'PINNED_POSITIONS' = ANY(p_changed_sections) THEN
        emitted_id := emit_canonical_event(
            'graph.pinned_positions.changed',
            'GRAPH_VIEW_PREFERENCE',
            p_preference_id,
            p_resulting_version,
            NULL,
            NULL,
            NULL,
            safe_summary,
            'INTERNAL',
            correlation,
            event_ids[1]
        );
        event_ids := array_append(event_ids, emitted_id);
    END IF;

    RETURN event_ids;
END $$;
REVOKE ALL ON FUNCTION record_graph_preference_change(
    uuid, text, text, bigint, bigint, integer, text[], integer
) FROM PUBLIC;

-- Release-domain records are structured evidence. No provider secret, token,
-- request header, or arbitrary metadata column exists on this surface.
CREATE TABLE canonical_releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_version text NOT NULL DEFAULT '1.0.0' CHECK (contract_version = '1.0.0'),
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
    phase integer NOT NULL CHECK (phase > 0),
    organization_id text REFERENCES public."Team"(id) ON DELETE SET NULL,
    business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
    environment text NOT NULL CHECK (environment IN ('development', 'preview', 'staging', 'production')),
    actor_type text NOT NULL CHECK (actor_type IN ('HUMAN', 'SERVICE', 'SYSTEM')),
    actor_id text NOT NULL,
    idempotency_key text NOT NULL,
    verification_state text NOT NULL DEFAULT 'PENDING'
        CHECK (verification_state IN ('PENDING', 'VERIFIED', 'FAILED', 'BLOCKED')),
    evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(evidence_references) = 'array'),
    repository text NOT NULL,
    git_commit_sha text NOT NULL CHECK (git_commit_sha ~ '^[0-9a-f]{40}$'),
    release_tag text NOT NULL,
    release_status text NOT NULL DEFAULT 'CANDIDATE'
        CHECK (release_status IN ('CANDIDATE', 'ACCEPTED', 'DEPLOYED', 'ROLLED_BACK')),
    accepted_at timestamptz,
    rollback_status text NOT NULL DEFAULT 'NOT_REQUIRED'
        CHECK (rollback_status IN ('NOT_REQUIRED', 'AVAILABLE', 'EXECUTED', 'UNAVAILABLE')),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (char_length(idempotency_key) BETWEEN 12 AND 255),
    CHECK (
        release_status NOT IN ('ACCEPTED', 'DEPLOYED')
        OR (verification_state = 'VERIFIED' AND accepted_at IS NOT NULL)
    ),
    UNIQUE (phase, environment),
    UNIQUE (idempotency_key)
);

CREATE TABLE migration_fingerprints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id uuid NOT NULL REFERENCES canonical_releases(id) ON DELETE RESTRICT,
    contract_version text NOT NULL DEFAULT '1.0.0' CHECK (contract_version = '1.0.0'),
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
    phase integer NOT NULL CHECK (phase > 0),
    organization_id text REFERENCES public."Team"(id) ON DELETE SET NULL,
    business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
    environment text NOT NULL CHECK (environment IN ('development', 'preview', 'staging', 'production')),
    actor_type text NOT NULL CHECK (actor_type IN ('HUMAN', 'SERVICE', 'SYSTEM')),
    actor_id text NOT NULL,
    idempotency_key text NOT NULL,
    verification_state text NOT NULL DEFAULT 'PENDING'
        CHECK (verification_state IN ('PENDING', 'VERIFIED', 'FAILED', 'BLOCKED')),
    evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(evidence_references) = 'array'),
    migration_name text NOT NULL,
    checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
    applied_at timestamptz,
    verified_at timestamptz,
    recovery_status text NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (recovery_status IN ('UNVERIFIED', 'FORWARD_RECOVERY_VERIFIED', 'RESTORE_VERIFIED')),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (char_length(idempotency_key) BETWEEN 12 AND 255),
    CHECK (
        verification_state <> 'VERIFIED'
        OR (applied_at IS NOT NULL AND verified_at IS NOT NULL)
    ),
    CONSTRAINT migration_fingerprints_phase_195_name_check CHECK (
        phase <> 195
        OR migration_name =
            '20260726190000_phase_195_graph_preferences_release_evidence_and_worker_readiness'
    ),
    CONSTRAINT migration_fingerprints_readback_timing_check CHECK (
        applied_at IS NULL
        OR verified_at IS NULL
        OR verified_at >= applied_at
    ),
    UNIQUE (release_id, migration_name),
    UNIQUE (idempotency_key)
);
CREATE INDEX migration_fingerprints_release_idx ON migration_fingerprints(release_id, migration_name);

CREATE TABLE deployment_evidence (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id uuid NOT NULL REFERENCES canonical_releases(id) ON DELETE RESTRICT,
    contract_version text NOT NULL DEFAULT '1.0.0' CHECK (contract_version = '1.0.0'),
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
    phase integer NOT NULL CHECK (phase > 0),
    organization_id text REFERENCES public."Team"(id) ON DELETE SET NULL,
    business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
    environment text NOT NULL CHECK (environment IN ('development', 'preview', 'staging', 'production')),
    actor_type text NOT NULL CHECK (actor_type IN ('HUMAN', 'SERVICE', 'SYSTEM')),
    actor_id text NOT NULL,
    idempotency_key text NOT NULL,
    verification_state text NOT NULL DEFAULT 'PENDING'
        CHECK (verification_state IN ('PENDING', 'VERIFIED', 'FAILED', 'BLOCKED')),
    evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(evidence_references) = 'array'),
    deployment_role text NOT NULL
        CHECK (deployment_role IN ('FRONTEND', 'API', 'WORKER')),
    service_name text NOT NULL,
    provider text NOT NULL,
    deployment_id text NOT NULL,
    deployed_commit_sha text NOT NULL CHECK (deployed_commit_sha ~ '^[0-9a-f]{40}$'),
    public_url text,
    deployment_status text NOT NULL DEFAULT 'PENDING'
        CHECK (deployment_status IN ('PENDING', 'READY', 'FAILED', 'ROLLED_BACK')),
    deployed_at timestamptz,
    checked_at timestamptz NOT NULL,
    source_freshness_seconds numeric(14,3) NOT NULL CHECK (source_freshness_seconds >= 0),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (char_length(idempotency_key) BETWEEN 12 AND 255),
    CHECK (
        verification_state <> 'VERIFIED'
        OR (deployment_status = 'READY' AND deployed_at IS NOT NULL)
    ),
    UNIQUE (release_id, deployment_role),
    UNIQUE (release_id, service_name, provider, deployment_id),
    UNIQUE (idempotency_key)
);
CREATE INDEX deployment_evidence_release_idx ON deployment_evidence(release_id, service_name);

CREATE TABLE pull_request_dispositions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id uuid NOT NULL REFERENCES canonical_releases(id) ON DELETE RESTRICT,
    contract_version text NOT NULL DEFAULT '1.0.0' CHECK (contract_version = '1.0.0'),
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
    phase integer NOT NULL CHECK (phase > 0),
    organization_id text REFERENCES public."Team"(id) ON DELETE SET NULL,
    business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
    environment text NOT NULL CHECK (environment IN ('development', 'preview', 'staging', 'production')),
    actor_type text NOT NULL CHECK (actor_type IN ('HUMAN', 'SERVICE', 'SYSTEM')),
    actor_id text NOT NULL,
    idempotency_key text NOT NULL,
    verification_state text NOT NULL DEFAULT 'PENDING'
        CHECK (verification_state IN ('PENDING', 'VERIFIED', 'FAILED', 'BLOCKED')),
    evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(evidence_references) = 'array'),
    repository text NOT NULL,
    pull_request_number integer NOT NULL CHECK (pull_request_number > 0),
    head_commit_sha text NOT NULL CHECK (head_commit_sha ~ '^[0-9a-f]{40}$'),
    disposition text NOT NULL
        CHECK (disposition IN ('MERGED', 'SUPERSEDED', 'REJECTED', 'OPEN_BLOCKER')),
    rationale text NOT NULL,
    decided_at timestamptz NOT NULL,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (char_length(idempotency_key) BETWEEN 12 AND 255),
    UNIQUE (release_id, repository, pull_request_number),
    UNIQUE (idempotency_key)
);
CREATE INDEX pull_request_dispositions_release_idx ON pull_request_dispositions(release_id, disposition);

CREATE TABLE runtime_mode_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id uuid NOT NULL REFERENCES canonical_releases(id) ON DELETE RESTRICT,
    contract_version text NOT NULL DEFAULT '1.0.0' CHECK (contract_version = '1.0.0'),
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
    phase integer NOT NULL CHECK (phase > 0),
    organization_id text REFERENCES public."Team"(id) ON DELETE SET NULL,
    business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
    environment text NOT NULL CHECK (environment IN ('development', 'preview', 'staging', 'production')),
    actor_type text NOT NULL CHECK (actor_type IN ('HUMAN', 'SERVICE', 'SYSTEM')),
    actor_id text NOT NULL,
    idempotency_key text NOT NULL,
    verification_state text NOT NULL DEFAULT 'PENDING'
        CHECK (verification_state IN ('PENDING', 'VERIFIED', 'FAILED', 'BLOCKED')),
    evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(evidence_references) = 'array'),
    service_name text NOT NULL,
    process_role text NOT NULL CHECK (process_role IN ('API', 'WORKER', 'COMBINED')),
    runtime_mode text NOT NULL CHECK (runtime_mode IN ('DEVELOPMENT', 'TEST', 'PRODUCTION')),
    observed_commit_sha text NOT NULL CHECK (observed_commit_sha ~ '^[0-9a-f]{40}$'),
    in_memory_canonical_state_reachable boolean NOT NULL,
    deterministic_fallback_reachable boolean NOT NULL,
    sample_data_reachable boolean NOT NULL,
    observed_at timestamptz NOT NULL,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (char_length(idempotency_key) BETWEEN 12 AND 255),
    CHECK (
        environment <> 'production'
        OR verification_state <> 'VERIFIED'
        OR (
            runtime_mode = 'PRODUCTION'
            AND process_role <> 'COMBINED'
            AND NOT in_memory_canonical_state_reachable
            AND NOT deterministic_fallback_reachable
            AND NOT sample_data_reachable
        )
    ),
    UNIQUE (release_id, service_name, process_role),
    UNIQUE (idempotency_key)
);
CREATE INDEX runtime_mode_records_release_idx ON runtime_mode_records(release_id, service_name);

CREATE OR REPLACE FUNCTION release_uuid_array_is_unique(p_values uuid[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
    SELECT cardinality(p_values) = (
        SELECT count(DISTINCT value)
        FROM unnest(p_values) AS values_list(value)
    )
$$;

CREATE OR REPLACE FUNCTION release_text_array_is_unique(p_values text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = pg_catalog
AS $$
    SELECT cardinality(p_values) = (
        SELECT count(DISTINCT value)
        FROM unnest(p_values) AS values_list(value)
    )
$$;

CREATE TABLE phase_gate_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    release_id uuid NOT NULL REFERENCES canonical_releases(id) ON DELETE RESTRICT,
    contract_version text NOT NULL DEFAULT '1.0.0' CHECK (contract_version = '1.0.0'),
    schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version = 1),
    phase integer NOT NULL CHECK (phase > 0),
    organization_id text REFERENCES public."Team"(id) ON DELETE SET NULL,
    business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
    environment text NOT NULL CHECK (environment IN ('development', 'preview', 'staging', 'production')),
    actor_type text NOT NULL CHECK (actor_type IN ('HUMAN', 'SERVICE', 'SYSTEM')),
    actor_id text NOT NULL,
    idempotency_key text NOT NULL,
    verification_state text NOT NULL DEFAULT 'PENDING'
        CHECK (verification_state IN ('PENDING', 'VERIFIED', 'FAILED', 'BLOCKED')),
    evidence_references jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(evidence_references) = 'array'),
    gate_id text NOT NULL,
    gate_status text NOT NULL DEFAULT 'OPEN'
        CHECK (gate_status IN ('OPEN', 'PASSED', 'FAILED', 'BLOCKED')),
    expected_release_version bigint NOT NULL CHECK (expected_release_version > 0),
    migration_fingerprint_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    deployment_evidence_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    pull_request_disposition_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    runtime_mode_record_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    test_evidence_references text[] NOT NULL DEFAULT ARRAY[]::text[],
    ci_provider text,
    ci_repository text CHECK (
        ci_repository IS NULL
        OR char_length(ci_repository) BETWEEN 1 AND 300
    ),
    ci_workflow text CHECK (
        ci_workflow IS NULL
        OR char_length(ci_workflow) BETWEEN 1 AND 300
    ),
    ci_git_commit_sha text CHECK (
        ci_git_commit_sha IS NULL
        OR ci_git_commit_sha ~ '^[0-9a-f]{40}$'
    ),
    ci_run_id text CHECK (
        ci_run_id IS NULL
        OR NULLIF(btrim(ci_run_id), '') IS NOT NULL
    ),
    ci_run_url text,
    ci_result text NOT NULL DEFAULT 'PENDING'
        CHECK (ci_result IN ('PENDING', 'SUCCESS', 'FAILED')),
    ci_artifact_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
    authenticated_smoke_receipt_id text,
    authenticated_smoke_target_url text,
    authenticated_smoke_status text NOT NULL DEFAULT 'PENDING'
        CHECK (authenticated_smoke_status IN ('PENDING', 'PASSED', 'FAILED')),
    rollback_recovery_reference text,
    remaining_external_boundaries text[] NOT NULL DEFAULT ARRAY[]::text[],
    closed_at timestamptz,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (char_length(idempotency_key) BETWEEN 12 AND 255),
    CONSTRAINT phase_gate_unique_migration_ids CHECK (
        release_uuid_array_is_unique(migration_fingerprint_ids)
    ),
    CONSTRAINT phase_gate_unique_deployment_ids CHECK (
        release_uuid_array_is_unique(deployment_evidence_ids)
    ),
    CONSTRAINT phase_gate_unique_pull_request_ids CHECK (
        release_uuid_array_is_unique(pull_request_disposition_ids)
    ),
    CONSTRAINT phase_gate_unique_runtime_ids CHECK (
        release_uuid_array_is_unique(runtime_mode_record_ids)
    ),
    CONSTRAINT phase_gate_unique_test_references CHECK (
        release_text_array_is_unique(test_evidence_references)
    ),
    CONSTRAINT phase_gate_unique_ci_artifact_ids CHECK (
        release_text_array_is_unique(ci_artifact_ids)
    ),
    CONSTRAINT phase_gate_unique_remaining_boundaries CHECK (
        release_text_array_is_unique(remaining_external_boundaries)
    ),
    CONSTRAINT phase_gate_passed_evidence_complete CHECK (
        gate_status <> 'PASSED'
        OR (
            verification_state = 'VERIFIED'
            AND closed_at IS NOT NULL
            AND cardinality(migration_fingerprint_ids) > 0
            AND cardinality(deployment_evidence_ids) = 3
            AND cardinality(pull_request_disposition_ids) > 0
            AND cardinality(runtime_mode_record_ids) = 2
            AND cardinality(test_evidence_references) > 0
            AND ci_provider IS NOT NULL
            AND (
                phase <> 195
                OR ci_provider = 'GITHUB_ACTIONS'
            )
            AND NULLIF(btrim(ci_repository), '') IS NOT NULL
            AND NULLIF(btrim(ci_workflow), '') IS NOT NULL
            AND (
                phase <> 195
                OR ci_workflow = '.github/workflows/ci-cd.yml'
            )
            AND ci_git_commit_sha IS NOT NULL
            AND ci_git_commit_sha ~ '^[0-9a-f]{40}$'
            AND ci_run_id IS NOT NULL
            AND ci_run_url IS NOT NULL
            AND ci_run_url ~ '^https://'
            AND (
                ci_provider <> 'GITHUB_ACTIONS'
                OR ci_run_url =
                    'https://github.com/' || ci_repository ||
                    '/actions/runs/' || ci_run_id
            )
            AND ci_result = 'SUCCESS'
            AND cardinality(ci_artifact_ids) > 0
            AND authenticated_smoke_receipt_id IS NOT NULL
            AND authenticated_smoke_target_url IS NOT NULL
            AND authenticated_smoke_target_url ~ '^https://'
            AND authenticated_smoke_status = 'PASSED'
            AND rollback_recovery_reference IS NOT NULL
            AND cardinality(remaining_external_boundaries) = 0
        )
    ),
    UNIQUE (phase, environment),
    UNIQUE (gate_id),
    UNIQUE (idempotency_key)
);
CREATE INDEX phase_gate_records_release_idx ON phase_gate_records(release_id, gate_status);

CREATE OR REPLACE FUNCTION enforce_release_phase_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    canonical_release_phase integer;
    canonical_release_environment text;
    canonical_release_repository text;
    canonical_release_git_commit_sha text;
    canonical_release_verification_state text;
    canonical_release_status text;
    canonical_release_version bigint;
    referenced_count integer;
    total_count integer;
    referenced_roles text[];
BEGIN
    PERFORM pg_advisory_xact_lock(
        hashtextextended(NEW.release_id::text, 195)
    );
    SELECT
        canonical.phase,
        canonical.environment,
        canonical.repository,
        canonical.git_commit_sha,
        canonical.verification_state,
        canonical.release_status,
        canonical.version
    INTO
        canonical_release_phase,
        canonical_release_environment,
        canonical_release_repository,
        canonical_release_git_commit_sha,
        canonical_release_verification_state,
        canonical_release_status,
        canonical_release_version
    FROM entral.canonical_releases AS canonical
    WHERE canonical.id = NEW.release_id;
    IF canonical_release_phase IS NULL
       OR NEW.phase <> canonical_release_phase
       OR NEW.environment <> canonical_release_environment THEN
        RAISE EXCEPTION 'Release evidence phase and environment must match its canonical release'
            USING ERRCODE = '23514';
    END IF;

    IF TG_TABLE_NAME = 'phase_gate_records' THEN
      IF NEW.gate_status = 'PASSED' THEN
        IF canonical_release_verification_state <> 'VERIFIED'
           OR canonical_release_status <> 'DEPLOYED'
           OR NEW.expected_release_version <> canonical_release_version THEN
            RAISE EXCEPTION
                'Passed phase gate requires the verified deployed canonical release version'
                USING ERRCODE = '23514';
        END IF;
        IF NEW.phase = 195
           AND NEW.ci_workflow IS DISTINCT FROM
                '.github/workflows/ci-cd.yml' THEN
            RAISE EXCEPTION
                'Phase 195 gate must bind the canonical CI workflow path'
                USING ERRCODE = '23514';
        END IF;
        IF NEW.ci_repository IS DISTINCT FROM canonical_release_repository
           OR NEW.ci_git_commit_sha IS DISTINCT FROM canonical_release_git_commit_sha THEN
            RAISE EXCEPTION
                'Phase gate CI repository and commit must match the canonical release'
                USING ERRCODE = '23514';
        END IF;

        SELECT count(*)::integer
        INTO referenced_count
        FROM entral.migration_fingerprints
        WHERE release_id = NEW.release_id
          AND id = ANY(NEW.migration_fingerprint_ids)
          AND verification_state = 'VERIFIED'
          AND recovery_status = 'RESTORE_VERIFIED';
        SELECT count(*)::integer
        INTO total_count
        FROM entral.migration_fingerprints
        WHERE release_id = NEW.release_id;
        IF referenced_count <> cardinality(NEW.migration_fingerprint_ids)
           OR total_count <> referenced_count THEN
            RAISE EXCEPTION
                'Phase gate migration IDs must resolve to the canonical release'
                USING ERRCODE = '23514';
        END IF;

        SELECT
            count(*)::integer,
            array_agg(deployment_role ORDER BY deployment_role)
        INTO referenced_count, referenced_roles
        FROM entral.deployment_evidence
        WHERE release_id = NEW.release_id
          AND id = ANY(NEW.deployment_evidence_ids)
          AND verification_state = 'VERIFIED'
          AND deployment_status = 'READY'
          AND deployed_commit_sha = canonical_release_git_commit_sha;
        SELECT count(*)::integer
        INTO total_count
        FROM entral.deployment_evidence
        WHERE release_id = NEW.release_id;
        IF referenced_count <> cardinality(NEW.deployment_evidence_ids)
           OR total_count <> referenced_count
           OR referenced_roles IS DISTINCT FROM
                ARRAY['API', 'FRONTEND', 'WORKER']::text[] THEN
            RAISE EXCEPTION
                'Phase gate must bind exactly one frontend, API, and worker deployment'
                USING ERRCODE = '23514';
        END IF;

        SELECT count(*)::integer
        INTO referenced_count
        FROM entral.pull_request_dispositions
        WHERE release_id = NEW.release_id
          AND id = ANY(NEW.pull_request_disposition_ids)
          AND verification_state = 'VERIFIED'
          AND disposition IN ('MERGED', 'SUPERSEDED', 'REJECTED');
        SELECT count(*)::integer
        INTO total_count
        FROM entral.pull_request_dispositions
        WHERE release_id = NEW.release_id;
        IF referenced_count <> cardinality(NEW.pull_request_disposition_ids)
           OR total_count <> referenced_count THEN
            RAISE EXCEPTION
                'Phase gate pull-request IDs must resolve to the canonical release'
                USING ERRCODE = '23514';
        END IF;
        SELECT count(*)::integer
        INTO referenced_count
        FROM entral.pull_request_dispositions
        WHERE release_id = NEW.release_id
          AND id = ANY(NEW.pull_request_disposition_ids)
          AND verification_state = 'VERIFIED'
          AND repository = canonical_release_repository
          AND disposition = 'MERGED'
          AND head_commit_sha = canonical_release_git_commit_sha;
        IF referenced_count <> 1 THEN
            RAISE EXCEPTION
                'Phase gate requires exactly one verified merged pull request at the canonical commit'
                USING ERRCODE = '23514';
        END IF;
        IF EXISTS (
            SELECT 1
            FROM entral.pull_request_dispositions
            WHERE release_id = NEW.release_id
              AND id = ANY(NEW.pull_request_disposition_ids)
              AND verification_state = 'VERIFIED'
              AND disposition <> 'MERGED'
              AND head_commit_sha = canonical_release_git_commit_sha
        ) THEN
            RAISE EXCEPTION
                'Non-merged pull requests cannot reuse the canonical release commit'
                USING ERRCODE = '23514';
        END IF;

        SELECT
            count(*)::integer,
            array_agg(process_role ORDER BY process_role)
        INTO referenced_count, referenced_roles
        FROM entral.runtime_mode_records
        WHERE release_id = NEW.release_id
          AND id = ANY(NEW.runtime_mode_record_ids)
          AND verification_state = 'VERIFIED'
          AND runtime_mode = 'PRODUCTION'
          AND observed_commit_sha = canonical_release_git_commit_sha
          AND NOT in_memory_canonical_state_reachable
          AND NOT deterministic_fallback_reachable
          AND NOT sample_data_reachable;
        SELECT count(*)::integer
        INTO total_count
        FROM entral.runtime_mode_records
        WHERE release_id = NEW.release_id;
        IF referenced_count <> cardinality(NEW.runtime_mode_record_ids)
           OR total_count <> referenced_count
           OR referenced_roles IS DISTINCT FROM ARRAY['API', 'WORKER']::text[] THEN
            RAISE EXCEPTION
                'Phase gate must bind exactly one API and worker runtime'
                USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION prevent_release_evidence_after_passed_gate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, entral
AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(
        hashtextextended(NEW.release_id::text, 195)
    );
    IF EXISTS (
        SELECT 1
        FROM entral.phase_gate_records
        WHERE release_id = NEW.release_id
          AND gate_status = 'PASSED'
    ) THEN
        RAISE EXCEPTION
            'Release evidence is immutable after the phase gate passes'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER migration_fingerprints_open_gate
AFTER INSERT ON migration_fingerprints
FOR EACH ROW EXECUTE FUNCTION prevent_release_evidence_after_passed_gate();
CREATE TRIGGER deployment_evidence_open_gate
AFTER INSERT ON deployment_evidence
FOR EACH ROW EXECUTE FUNCTION prevent_release_evidence_after_passed_gate();
CREATE TRIGGER pull_request_dispositions_open_gate
AFTER INSERT ON pull_request_dispositions
FOR EACH ROW EXECUTE FUNCTION prevent_release_evidence_after_passed_gate();
CREATE TRIGGER runtime_mode_records_open_gate
AFTER INSERT ON runtime_mode_records
FOR EACH ROW EXECUTE FUNCTION prevent_release_evidence_after_passed_gate();

CREATE TRIGGER migration_fingerprints_release_match
BEFORE INSERT ON migration_fingerprints
FOR EACH ROW EXECUTE FUNCTION enforce_release_phase_match();
CREATE TRIGGER deployment_evidence_release_match
BEFORE INSERT ON deployment_evidence
FOR EACH ROW EXECUTE FUNCTION enforce_release_phase_match();
CREATE TRIGGER pull_request_dispositions_release_match
BEFORE INSERT ON pull_request_dispositions
FOR EACH ROW EXECUTE FUNCTION enforce_release_phase_match();
CREATE TRIGGER runtime_mode_records_release_match
BEFORE INSERT ON runtime_mode_records
FOR EACH ROW EXECUTE FUNCTION enforce_release_phase_match();
CREATE TRIGGER phase_gate_records_release_match
BEFORE INSERT ON phase_gate_records
FOR EACH ROW EXECUTE FUNCTION enforce_release_phase_match();

-- Release evidence is inserted only after every external gate is complete.
-- The migration/deployment identity may insert the final rows, but even the
-- table owner cannot rewrite or delete an accepted historical receipt through
-- ordinary DML. Corrections require a new release/evidence identity.
CREATE OR REPLACE FUNCTION reject_release_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    RAISE EXCEPTION 'Release evidence is immutable after insertion'
        USING ERRCODE = '55000';
END $$;
REVOKE ALL ON FUNCTION reject_release_evidence_mutation() FROM PUBLIC;

CREATE TRIGGER canonical_releases_immutable
BEFORE UPDATE OR DELETE ON canonical_releases
FOR EACH ROW EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER migration_fingerprints_immutable
BEFORE UPDATE OR DELETE ON migration_fingerprints
FOR EACH ROW EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER deployment_evidence_immutable
BEFORE UPDATE OR DELETE ON deployment_evidence
FOR EACH ROW EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER pull_request_dispositions_immutable
BEFORE UPDATE OR DELETE ON pull_request_dispositions
FOR EACH ROW EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER runtime_mode_records_immutable
BEFORE UPDATE OR DELETE ON runtime_mode_records
FOR EACH ROW EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER phase_gate_records_immutable
BEFORE UPDATE OR DELETE ON phase_gate_records
FOR EACH ROW EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER canonical_releases_no_truncate
BEFORE TRUNCATE ON canonical_releases
FOR EACH STATEMENT EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER migration_fingerprints_no_truncate
BEFORE TRUNCATE ON migration_fingerprints
FOR EACH STATEMENT EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER deployment_evidence_no_truncate
BEFORE TRUNCATE ON deployment_evidence
FOR EACH STATEMENT EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER pull_request_dispositions_no_truncate
BEFORE TRUNCATE ON pull_request_dispositions
FOR EACH STATEMENT EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER runtime_mode_records_no_truncate
BEFORE TRUNCATE ON runtime_mode_records
FOR EACH STATEMENT EXECUTE FUNCTION reject_release_evidence_mutation();
CREATE TRIGGER phase_gate_records_no_truncate
BEFORE TRUNCATE ON phase_gate_records
FOR EACH STATEMENT EXECUTE FUNCTION reject_release_evidence_mutation();

CREATE OR REPLACE FUNCTION release_evidence_access_allows(p_mode text DEFAULT 'read')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, public, pg_temp
AS $$
    SELECT
        session_is_human_authority()
        OR scope_grant_allows(
            'SYSTEM',
            NULL,
            CASE WHEN p_mode = 'write' THEN 'record_verification' ELSE 'read_governance' END
        )
        OR scope_grant_allows('SYSTEM', NULL, 'record_verification')
$$;
REVOKE ALL ON FUNCTION release_evidence_access_allows(text) FROM PUBLIC;

ALTER TABLE canonical_releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY canonical_releases_select_policy ON canonical_releases
FOR SELECT USING (release_evidence_access_allows('read'));
CREATE POLICY canonical_releases_insert_policy ON canonical_releases
FOR INSERT WITH CHECK (release_evidence_access_allows('write'));

ALTER TABLE migration_fingerprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY migration_fingerprints_select_policy ON migration_fingerprints
FOR SELECT USING (release_evidence_access_allows('read'));
CREATE POLICY migration_fingerprints_insert_policy ON migration_fingerprints
FOR INSERT WITH CHECK (release_evidence_access_allows('write'));

ALTER TABLE deployment_evidence ENABLE ROW LEVEL SECURITY;
CREATE POLICY deployment_evidence_select_policy ON deployment_evidence
FOR SELECT USING (release_evidence_access_allows('read'));
CREATE POLICY deployment_evidence_insert_policy ON deployment_evidence
FOR INSERT WITH CHECK (release_evidence_access_allows('write'));

ALTER TABLE pull_request_dispositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY pull_request_dispositions_select_policy ON pull_request_dispositions
FOR SELECT USING (release_evidence_access_allows('read'));
CREATE POLICY pull_request_dispositions_insert_policy ON pull_request_dispositions
FOR INSERT WITH CHECK (release_evidence_access_allows('write'));

ALTER TABLE runtime_mode_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY runtime_mode_records_select_policy ON runtime_mode_records
FOR SELECT USING (release_evidence_access_allows('read'));
CREATE POLICY runtime_mode_records_insert_policy ON runtime_mode_records
FOR INSERT WITH CHECK (release_evidence_access_allows('write'));

ALTER TABLE phase_gate_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY phase_gate_records_select_policy ON phase_gate_records
FOR SELECT USING (release_evidence_access_allows('read'));
CREATE POLICY phase_gate_records_insert_policy ON phase_gate_records
FOR INSERT WITH CHECK (release_evidence_access_allows('write'));

-- Every immutable release insertion is audited with a bounded structural
-- summary. Verified rows additionally emit the required canonical events.
CREATE OR REPLACE FUNCTION audit_release_evidence_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public, pg_temp
AS $$
DECLARE
    before_row jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
    after_row jsonb := to_jsonb(NEW);
    before_summary jsonb;
    after_summary jsonb;
    correlation uuid := COALESCE(
        NULLIF(current_setting('app.correlation_id', true), '')::uuid,
        gen_random_uuid()
    );
    required_event_type text;
BEGIN
    before_summary := CASE WHEN before_row IS NULL THEN NULL ELSE jsonb_build_object(
        'record_type', TG_TABLE_NAME,
        'phase', before_row->'phase',
        'environment', before_row->'environment',
        'verification_state', before_row->'verification_state',
        'version', before_row->'version'
    ) END;
    after_summary := jsonb_build_object(
        'record_type', TG_TABLE_NAME,
        'phase', after_row->'phase',
        'environment', after_row->'environment',
        'verification_state', after_row->'verification_state',
        'version', after_row->'version',
        'release_status', after_row->'release_status',
        'deployment_status', after_row->'deployment_status',
        'gate_status', after_row->'gate_status'
    );

    INSERT INTO audit_entries(
        action,
        reason,
        target_type,
        target_id,
        business_id,
        before_state,
        after_state,
        result,
        evidence_refs,
        access_classification,
        correlation_id
    ) VALUES (
        TG_TABLE_NAME || '.' || lower(TG_OP),
        current_action_reason(),
        upper(TG_TABLE_NAME),
        NEW.id,
        NEW.business_id,
        before_summary,
        after_summary,
        CASE NEW.verification_state
            WHEN 'FAILED' THEN 'FAILED'
            WHEN 'BLOCKED' THEN 'FAILED'
            ELSE 'SUCCEEDED'
        END,
        NEW.evidence_references,
        'INTERNAL',
        correlation
    );

    IF NEW.verification_state = 'VERIFIED'
       AND (
           TG_OP = 'INSERT'
           OR OLD.verification_state IS DISTINCT FROM NEW.verification_state
           OR OLD.version IS DISTINCT FROM NEW.version
       ) THEN
        required_event_type := CASE TG_TABLE_NAME
            WHEN 'canonical_releases' THEN
                CASE WHEN after_row->>'release_status' IN ('ACCEPTED', 'DEPLOYED')
                    THEN 'canonical.release.verified' END
            WHEN 'migration_fingerprints' THEN 'canonical.migration.verified'
            WHEN 'deployment_evidence' THEN
                CASE WHEN after_row->>'deployment_status' = 'READY'
                    THEN 'canonical.deployment.verified' END
            WHEN 'phase_gate_records' THEN
                CASE WHEN after_row->>'gate_status' = 'PASSED'
                    THEN 'canonical.phase_gate.closed' END
            ELSE NULL
        END;
        IF required_event_type IS NOT NULL THEN
            PERFORM emit_canonical_event(
                required_event_type,
                upper(TG_TABLE_NAME),
                NEW.id,
                NEW.version,
                NEW.business_id,
                NULL,
                NULL,
                after_summary,
                'INTERNAL',
                correlation,
                NULL
            );
        END IF;
    END IF;
    RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION audit_release_evidence_change() FROM PUBLIC;

CREATE TRIGGER canonical_releases_audit_event
AFTER INSERT ON canonical_releases
FOR EACH ROW EXECUTE FUNCTION audit_release_evidence_change();
CREATE TRIGGER migration_fingerprints_audit_event
AFTER INSERT ON migration_fingerprints
FOR EACH ROW EXECUTE FUNCTION audit_release_evidence_change();
CREATE TRIGGER deployment_evidence_audit_event
AFTER INSERT ON deployment_evidence
FOR EACH ROW EXECUTE FUNCTION audit_release_evidence_change();
CREATE TRIGGER pull_request_dispositions_audit_event
AFTER INSERT ON pull_request_dispositions
FOR EACH ROW EXECUTE FUNCTION audit_release_evidence_change();
CREATE TRIGGER runtime_mode_records_audit_event
AFTER INSERT ON runtime_mode_records
FOR EACH ROW EXECUTE FUNCTION audit_release_evidence_change();
CREATE TRIGGER phase_gate_records_audit_event
AFTER INSERT ON phase_gate_records
FOR EACH ROW EXECUTE FUNCTION audit_release_evidence_change();

CREATE TABLE worker_readiness_heartbeats (
    instance_id text PRIMARY KEY,
    service_app_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
    service_name text NOT NULL DEFAULT 'entral-worker',
    process_role text NOT NULL CHECK (process_role = 'WORKER'),
    status text NOT NULL CHECK (status IN ('READY', 'DEGRADED', 'STOPPING')),
    components jsonb NOT NULL CHECK (jsonb_typeof(components) = 'object'),
    started_at timestamptz NOT NULL,
    heartbeat_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    stopped_at timestamptz,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    CHECK (
        (status = 'STOPPING' AND stopped_at IS NOT NULL)
        OR (status <> 'STOPPING' AND stopped_at IS NULL)
    )
);
CREATE INDEX worker_readiness_heartbeats_latest_idx
    ON worker_readiness_heartbeats(heartbeat_at DESC);
CREATE TRIGGER worker_readiness_heartbeats_increment_version
BEFORE UPDATE ON worker_readiness_heartbeats
FOR EACH ROW EXECUTE FUNCTION increment_row_version();

ALTER TABLE worker_readiness_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_readiness_heartbeats_select_policy ON worker_readiness_heartbeats
FOR SELECT USING (
    service_app_user_id = session_app_user_id()
    AND scope_grant_allows('SYSTEM', NULL, 'publish_events')
);
CREATE POLICY worker_readiness_heartbeats_insert_policy ON worker_readiness_heartbeats
FOR INSERT WITH CHECK (
    service_app_user_id = session_app_user_id()
    AND scope_grant_allows('SYSTEM', NULL, 'publish_events')
);
CREATE POLICY worker_readiness_heartbeats_update_policy ON worker_readiness_heartbeats
FOR UPDATE USING (
    service_app_user_id = session_app_user_id()
    AND scope_grant_allows('SYSTEM', NULL, 'publish_events')
)
WITH CHECK (
    service_app_user_id = session_app_user_id()
    AND scope_grant_allows('SYSTEM', NULL, 'publish_events')
);

-- Deliberately sanitized SECURITY DEFINER readback for the public API health
-- response. Instance IDs, service identities, lock owners, payloads, and errors
-- are never returned.
CREATE OR REPLACE FUNCTION public_worker_readiness()
RETURNS TABLE (
    readiness_status text,
    observed_at timestamptz,
    age_seconds numeric,
    components jsonb,
    queue_pending bigint,
    queue_publishing bigint,
    queue_failed bigint,
    queue_dead_letter bigint,
    queue_published_last_24h bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, public, pg_temp
AS $$
    WITH latest AS (
        SELECT status, components, heartbeat_at
        FROM entral.worker_readiness_heartbeats
        ORDER BY heartbeat_at DESC
        LIMIT 1
    ),
    queue AS (
        SELECT
            count(*) FILTER (WHERE status = 'PENDING') AS pending,
            count(*) FILTER (WHERE status = 'PUBLISHING') AS publishing,
            count(*) FILTER (WHERE status = 'FAILED') AS failed,
            count(*) FILTER (WHERE status = 'DEAD_LETTER') AS dead_letter,
            count(*) FILTER (
                WHERE status = 'PUBLISHED'
                  AND published_at >= clock_timestamp() - interval '24 hours'
            ) AS published_last_24h
        FROM entral.transactional_outbox
    )
    SELECT
        CASE
            WHEN latest.heartbeat_at IS NULL THEN 'UNAVAILABLE'
            WHEN clock_timestamp() - latest.heartbeat_at > interval '90 seconds' THEN 'STALE'
            WHEN latest.status <> 'READY' THEN 'DEGRADED'
            WHEN queue.failed > 0 OR queue.dead_letter > 0 THEN 'DEGRADED'
            ELSE 'READY'
        END,
        latest.heartbeat_at,
        CASE WHEN latest.heartbeat_at IS NULL THEN NULL
             ELSE extract(epoch FROM clock_timestamp() - latest.heartbeat_at) END,
        COALESCE(latest.components, '{}'::jsonb),
        queue.pending,
        queue.publishing,
        queue.failed,
        queue.dead_letter,
        queue.published_last_24h
    FROM queue
    LEFT JOIN latest ON true
$$;
REVOKE ALL ON FUNCTION public_worker_readiness() FROM PUBLIC;

COMMIT;
