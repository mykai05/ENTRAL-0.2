-- Phase 150 repository migration. Canonical source order is preserved inside a rollback-safe transaction.
BEGIN;
-- ENTRAL migration 043: evidence, memory, AI execution, intelligence outputs, and metrics.
SET LOCAL search_path = entral, public;

CREATE TABLE source_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type text NOT NULL,
    provider text,
    external_id text,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
    uri text,
    content_sha256 text,
    observed_at timestamptz,
    ingested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    freshness_expires_at timestamptz,
    trust_level text NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (trust_level IN ('UNVERIFIED','LOW','MEDIUM','HIGH','AUTHORITATIVE')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    UNIQUE NULLS NOT DISTINCT (source_type, provider, external_id, business_id)
);
CREATE INDEX source_records_business_idx ON source_records(business_id, ingested_at DESC);

CREATE TABLE artifacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_kind artifact_kind NOT NULL,
    stable_code text,
    name text NOT NULL,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
    mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
    task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
    storage_uri text NOT NULL,
    media_type text NOT NULL,
    content_sha256 text NOT NULL,
    size_bytes bigint CHECK (size_bytes IS NULL OR size_bytes >= 0),
    source_record_id uuid REFERENCES source_records(id),
    classification text NOT NULL DEFAULT 'INTERNAL'
        CHECK (classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    retention_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    created_by_id uuid DEFAULT current_actor_id(),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (content_sha256, storage_uri),
    CHECK (
        (created_by_kind = 'SYSTEM' AND created_by_id IS NULL)
        OR (created_by_kind IN ('HUMAN','ENTITY') AND created_by_id IS NOT NULL)
    )
);
CREATE INDEX artifacts_business_idx ON artifacts(business_id, created_at DESC);
CREATE INDEX artifacts_mission_idx ON artifacts(mission_id, created_at DESC);

CREATE TABLE memory_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_kind memory_kind NOT NULL,
    scope_type scope_type NOT NULL,
    scope_id uuid,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    entity_id uuid REFERENCES entities(id) ON DELETE CASCADE,
    title text NOT NULL,
    content jsonb NOT NULL,
    content_sha256 text NOT NULL,
    source_record_id uuid REFERENCES source_records(id),
    source_artifact_id uuid REFERENCES artifacts(id),
    provenance jsonb NOT NULL,
    confidence numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    validation_state validation_state NOT NULL DEFAULT 'UNVERIFIED',
    supersedes_memory_id uuid REFERENCES memory_items(id),
    semantic_index_ref text,
    access_classification text NOT NULL DEFAULT 'INTERNAL'
        CHECK (access_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    retain_until timestamptz,
    created_by_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    created_by_id uuid DEFAULT current_actor_id(),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    validated_at timestamptz,
    CHECK (
        (created_by_kind = 'SYSTEM' AND created_by_id IS NULL)
        OR (created_by_kind IN ('HUMAN','ENTITY') AND created_by_id IS NOT NULL)
    ),
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL)),
    CHECK (business_id IS NULL OR scope_type IN ('BUSINESS','ENTITY','MISSION')),
    CHECK (scope_type <> 'BUSINESS' OR business_id IS NOT DISTINCT FROM scope_id),
    CHECK (scope_type <> 'ENTITY' OR entity_id IS NOT DISTINCT FROM scope_id),
    CHECK (source_record_id IS NOT NULL OR source_artifact_id IS NOT NULL OR provenance <> '{}'::jsonb)
);
CREATE INDEX memory_items_scope_idx ON memory_items(scope_type, scope_id, created_at DESC);
CREATE INDEX memory_items_business_idx ON memory_items(business_id, memory_kind, created_at DESC);
CREATE INDEX memory_items_validation_idx ON memory_items(validation_state, created_at DESC);

CREATE TABLE evidence_links (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    from_type text NOT NULL CHECK (from_type IN (
        'MISSION','TASK','MESSAGE','GOVERNANCE_ACTION','AI_RUN','AI_STEP','TOOL_CALL',
        'HEALTH_ASSESSMENT','RECOMMENDATION','DECISION','EXPERIMENT','OUTCOME','MEMORY'
    )),
    from_id uuid NOT NULL,
    artifact_id uuid REFERENCES artifacts(id) ON DELETE CASCADE,
    source_record_id uuid REFERENCES source_records(id) ON DELETE CASCADE,
    evidence_role text NOT NULL,
    claim text,
    locator jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((artifact_id IS NOT NULL)::int + (source_record_id IS NOT NULL)::int = 1)
);
CREATE INDEX evidence_links_from_idx ON evidence_links(from_type, from_id);
CREATE INDEX evidence_links_artifact_idx ON evidence_links(artifact_id);

CREATE TABLE context_manifests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type scope_type NOT NULL,
    scope_id uuid,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    request_intent text NOT NULL,
    context_order text[] NOT NULL,
    structured_query_manifest jsonb NOT NULL,
    memory_query_manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
    included_record_refs jsonb NOT NULL,
    excluded_record_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    source_freshness jsonb NOT NULL DEFAULT '{}'::jsonb,
    token_budget integer CHECK (token_budget IS NULL OR token_budget > 0),
    compiled_content_sha256 text NOT NULL,
    compiler_version text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL)),
    CHECK (scope_type <> 'BUSINESS' OR business_id IS NOT DISTINCT FROM scope_id)
);
CREATE INDEX context_manifests_scope_idx ON context_manifests(scope_type, scope_id, created_at DESC);

CREATE TABLE ai_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type text NOT NULL,
    status ai_run_status NOT NULL DEFAULT 'QUEUED',
    scope_type scope_type NOT NULL,
    scope_id uuid,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
    mission_id uuid REFERENCES missions(id) ON DELETE SET NULL,
    task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
    governance_action_id uuid REFERENCES governance_actions(id) ON DELETE SET NULL,
    model_profile_id uuid NOT NULL REFERENCES model_profiles(id),
    prompt_version_id uuid REFERENCES prompt_versions(id),
    policy_version_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
    context_manifest_id uuid NOT NULL REFERENCES context_manifests(id),
    requested_by_kind actor_kind NOT NULL,
    requested_by_id uuid,
    input jsonb NOT NULL,
    output jsonb,
    input_tokens bigint CHECK (input_tokens IS NULL OR input_tokens >= 0),
    output_tokens bigint CHECK (output_tokens IS NULL OR output_tokens >= 0),
    estimated_cost numeric(20,8) CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    latency_ms bigint CHECK (latency_ms IS NULL OR latency_ms >= 0),
    error jsonb,
    correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL)),
    CHECK (scope_type <> 'BUSINESS' OR business_id IS NOT DISTINCT FROM scope_id),
    CHECK (scope_type <> 'ENTITY' OR entity_id IS NOT DISTINCT FROM scope_id),
    CHECK (
        (requested_by_kind = 'SYSTEM' AND requested_by_id IS NULL)
        OR (requested_by_kind IN ('HUMAN','ENTITY') AND requested_by_id IS NOT NULL)
    ),
    CHECK (status NOT IN ('SUCCEEDED','FAILED','CANCELLED') OR completed_at IS NOT NULL)
);
CREATE INDEX ai_runs_scope_idx ON ai_runs(scope_type, scope_id, created_at DESC);
CREATE INDEX ai_runs_business_idx ON ai_runs(business_id, created_at DESC);
CREATE INDEX ai_runs_status_idx ON ai_runs(status, created_at);

CREATE TABLE ai_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_run_id uuid NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
    step_number integer NOT NULL CHECK (step_number > 0),
    step_type text NOT NULL CHECK (step_type IN (
        'SCOPE_RESOLUTION','CONTEXT_COMPILATION','ANALYSIS','PLANNING','POLICY_CHECK',
        'TOOL_SELECTION','EXECUTION','VERIFICATION','SYNTHESIS'
    )),
    status ai_run_status NOT NULL DEFAULT 'QUEUED',
    model_profile_id uuid REFERENCES model_profiles(id),
    prompt_version_id uuid REFERENCES prompt_versions(id),
    input jsonb NOT NULL DEFAULT '{}'::jsonb,
    output jsonb,
    rationale_summary text,
    error jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    UNIQUE (ai_run_id, step_number)
);

CREATE OR REPLACE FUNCTION validate_ai_run_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status <> 'QUEUED' THEN
        RAISE EXCEPTION 'AI runs must be inserted in QUEUED state';
    ELSIF TG_OP = 'UPDATE' THEN
        IF to_jsonb(NEW) - ARRAY[
            'status','output','input_tokens','output_tokens','estimated_cost',
            'latency_ms','error','started_at','completed_at'
        ]::text[] IS DISTINCT FROM
           to_jsonb(OLD) - ARRAY[
            'status','output','input_tokens','output_tokens','estimated_cost',
            'latency_ms','error','started_at','completed_at'
        ]::text[] THEN
            RAISE EXCEPTION 'AI run scope, version bindings, requester, and input are immutable';
        END IF;
        IF OLD.status IN ('SUCCEEDED','FAILED','CANCELLED') THEN
            RAISE EXCEPTION 'Terminal AI runs are immutable';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
            (OLD.status = 'QUEUED' AND NEW.status IN ('RUNNING','CANCELLED'))
            OR (OLD.status = 'RUNNING' AND NEW.status IN (
                'WAITING_FOR_TOOL','VERIFYING','SUCCEEDED','FAILED','CANCELLED'
            ))
            OR (OLD.status = 'WAITING_FOR_TOOL' AND NEW.status IN (
                'RUNNING','VERIFYING','FAILED','CANCELLED'
            ))
            OR (OLD.status = 'VERIFYING' AND NEW.status IN (
                'RUNNING','SUCCEEDED','FAILED','CANCELLED'
            ))
        ) THEN
            RAISE EXCEPTION 'Invalid AI run status transition % to %', OLD.status, NEW.status;
        END IF;
        IF OLD.input_tokens IS NOT NULL
           AND NEW.input_tokens IS DISTINCT FROM OLD.input_tokens THEN
            RAISE EXCEPTION 'Recorded AI run input tokens are immutable';
        END IF;
        IF OLD.output_tokens IS NOT NULL
           AND NEW.output_tokens IS DISTINCT FROM OLD.output_tokens THEN
            RAISE EXCEPTION 'Recorded AI run output tokens are immutable';
        END IF;
        IF OLD.estimated_cost IS NOT NULL
           AND NEW.estimated_cost IS DISTINCT FROM OLD.estimated_cost THEN
            RAISE EXCEPTION 'Recorded AI run cost is immutable';
        END IF;
    END IF;

    IF NEW.status IN ('RUNNING','WAITING_FOR_TOOL','VERIFYING','SUCCEEDED','FAILED')
       AND NEW.started_at IS NULL THEN
        RAISE EXCEPTION 'Started AI run states require started_at';
    END IF;
    IF NEW.status IN ('SUCCEEDED','FAILED','CANCELLED')
       AND EXISTS (
           SELECT 1 FROM ai_steps
           WHERE ai_run_id = NEW.id
             AND status NOT IN ('SUCCEEDED','FAILED','CANCELLED')
    ) THEN
        RAISE EXCEPTION 'Terminal AI runs require every recorded step to be terminal';
    END IF;
    IF NEW.status IN ('SUCCEEDED','FAILED','CANCELLED')
       AND EXISTS (
           SELECT 1 FROM tool_calls
           WHERE ai_run_id = NEW.id
             AND status NOT IN ('SUCCEEDED','FAILED','REJECTED')
       ) THEN
        RAISE EXCEPTION 'Terminal AI runs require every recorded tool call to be terminal';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER ai_runs_validate_lifecycle
BEFORE INSERT OR UPDATE ON ai_runs
FOR EACH ROW EXECUTE FUNCTION validate_ai_run_lifecycle();

CREATE OR REPLACE FUNCTION validate_ai_step_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    parent_status ai_run_status;
BEGIN
    SELECT status INTO parent_status FROM ai_runs WHERE id = NEW.ai_run_id FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'AI step parent run does not exist';
    END IF;
    IF parent_status IN ('SUCCEEDED','FAILED','CANCELLED') THEN
        RAISE EXCEPTION 'Terminal AI runs cannot accept step mutations';
    END IF;
    IF TG_OP = 'INSERT' AND NEW.status <> 'QUEUED' THEN
        RAISE EXCEPTION 'AI steps must be inserted in QUEUED state';
    ELSIF TG_OP = 'UPDATE' THEN
        IF to_jsonb(NEW) - ARRAY[
            'status','output','rationale_summary','error','started_at','completed_at'
        ]::text[] IS DISTINCT FROM
           to_jsonb(OLD) - ARRAY[
            'status','output','rationale_summary','error','started_at','completed_at'
        ]::text[] THEN
            RAISE EXCEPTION 'AI step run binding, order, type, model, prompt, and input are immutable';
        END IF;
        IF OLD.status IN ('SUCCEEDED','FAILED','CANCELLED') THEN
            RAISE EXCEPTION 'Terminal AI steps are immutable';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
            (OLD.status = 'QUEUED' AND NEW.status IN ('RUNNING','CANCELLED'))
            OR (OLD.status = 'RUNNING' AND NEW.status IN (
                'WAITING_FOR_TOOL','VERIFYING','SUCCEEDED','FAILED','CANCELLED'
            ))
            OR (OLD.status = 'WAITING_FOR_TOOL' AND NEW.status IN (
                'RUNNING','VERIFYING','FAILED','CANCELLED'
            ))
            OR (OLD.status = 'VERIFYING' AND NEW.status IN (
                'RUNNING','SUCCEEDED','FAILED','CANCELLED'
            ))
        ) THEN
            RAISE EXCEPTION 'Invalid AI step status transition % to %', OLD.status, NEW.status;
        END IF;
    END IF;
    IF NEW.status IN ('RUNNING','WAITING_FOR_TOOL','VERIFYING','SUCCEEDED','FAILED')
       AND NEW.started_at IS NULL THEN
        RAISE EXCEPTION 'Started AI step states require started_at';
    END IF;
    IF NEW.status IN ('SUCCEEDED','FAILED','CANCELLED')
       AND NEW.completed_at IS NULL THEN
        RAISE EXCEPTION 'Terminal AI step states require completed_at';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER ai_steps_validate_lifecycle
BEFORE INSERT OR UPDATE ON ai_steps
FOR EACH ROW EXECUTE FUNCTION validate_ai_step_lifecycle();

CREATE TABLE tool_calls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_run_id uuid NOT NULL REFERENCES ai_runs(id) ON DELETE CASCADE,
    ai_step_id uuid REFERENCES ai_steps(id) ON DELETE SET NULL,
    tool_id uuid NOT NULL REFERENCES tool_definitions(id),
    tool_version bigint NOT NULL,
    tool_grant_id uuid NOT NULL REFERENCES tool_grants(id),
    requested_action text NOT NULL,
    credential_reference_id uuid REFERENCES credential_references(id),
    governance_action_id uuid REFERENCES governance_actions(id) ON DELETE SET NULL,
    status tool_call_status NOT NULL DEFAULT 'PROPOSED',
    input jsonb NOT NULL,
    output jsonb,
    input_sha256 text NOT NULL,
    idempotency_key text REFERENCES idempotency_keys(key),
    authorization_evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
    verification_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
    error jsonb,
    cost numeric(20,8) CHECK (cost IS NULL OR cost >= 0),
    latency_ms bigint CHECK (latency_ms IS NULL OR latency_ms >= 0),
    proposed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    authorized_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    CHECK (status NOT IN ('SUCCEEDED','FAILED','REJECTED') OR completed_at IS NOT NULL)
);
CREATE OR REPLACE FUNCTION validate_tool_call_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    run_business uuid;
    run_entity uuid;
    run_scope_type scope_type;
    run_scope_id uuid;
    run_status ai_run_status;
    run_step uuid;
    grant_tool uuid;
    grant_entity uuid;
    grant_business uuid;
    grant_credential uuid;
    grant_actions text[];
    grant_data_scope jsonb;
    grant_spend_limit numeric(20,4);
    grant_call_limit integer;
    grant_valid_from timestamptz;
    grant_expires_at timestamptz;
    definition_version bigint;
    definition_active boolean;
    definition_idempotency_supported boolean;
    credential_status text;
    credential_business uuid;
    credential_tool uuid;
    credential_expires_at timestamptz;
    credential_actions text[];
    governance_business uuid;
    governance_status action_status;
    idempotency_operation text;
    idempotency_scope_type scope_type;
    idempotency_scope_id uuid;
    idempotency_request_sha256 text;
    idempotency_status text;
    prior_call_count bigint;
    prior_spend numeric;
    estimated_spend numeric;
    requested_spend numeric;
BEGIN
    IF NEW.input_sha256 IS DISTINCT FROM encode(
        pg_catalog.sha256(convert_to(NEW.input::text, 'UTF8')),
        'hex'
    ) THEN
        RAISE EXCEPTION 'Tool call input hash does not match the canonical input';
    END IF;

    IF TG_OP = 'INSERT' AND NEW.status <> 'PROPOSED' THEN
        RAISE EXCEPTION 'Tool calls must be inserted in PROPOSED state';
    ELSIF TG_OP = 'UPDATE' THEN
        IF to_jsonb(NEW) - ARRAY[
            'status','output','error','cost','latency_ms',
            'authorized_at','started_at','completed_at'
        ]::text[] IS DISTINCT FROM
           to_jsonb(OLD) - ARRAY[
            'status','output','error','cost','latency_ms',
            'authorized_at','started_at','completed_at'
        ]::text[] THEN
            RAISE EXCEPTION 'Tool call authorization and input evidence are immutable';
        END IF;
        IF OLD.status IN ('SUCCEEDED','FAILED','REJECTED') THEN
            RAISE EXCEPTION 'Terminal tool calls are immutable';
        END IF;
        IF NEW.status IS DISTINCT FROM OLD.status THEN
            IF NOT (
                (OLD.status = 'PROPOSED' AND NEW.status IN ('AUTHORIZED','REJECTED'))
                OR (OLD.status = 'AUTHORIZED' AND NEW.status IN ('RUNNING','REJECTED'))
                OR (OLD.status = 'RUNNING' AND NEW.status IN ('SUCCEEDED','FAILED'))
            ) THEN
                RAISE EXCEPTION 'Invalid tool call status transition % to %', OLD.status, NEW.status;
            END IF;
        END IF;
        IF OLD.cost IS NOT NULL AND NEW.cost IS DISTINCT FROM OLD.cost THEN
            RAISE EXCEPTION 'Recorded tool call cost is immutable';
        END IF;
    END IF;

    IF NEW.status IN ('AUTHORIZED','RUNNING','SUCCEEDED','FAILED')
       AND NEW.authorized_at IS NULL THEN
        RAISE EXCEPTION 'Authorized tool call states require authorized_at';
    END IF;
    IF NEW.status IN ('RUNNING','SUCCEEDED','FAILED')
       AND NEW.started_at IS NULL THEN
        RAISE EXCEPTION 'Running tool call states require started_at';
    END IF;

    SELECT business_id, entity_id, scope_type, scope_id, status
    INTO run_business, run_entity, run_scope_type, run_scope_id, run_status
    FROM ai_runs
    WHERE id = NEW.ai_run_id
    FOR SHARE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tool call AI run does not exist';
    END IF;
    IF run_status NOT IN ('RUNNING','WAITING_FOR_TOOL') THEN
        RAISE EXCEPTION 'Tool calls require a running AI run';
    END IF;

    IF NEW.ai_step_id IS NOT NULL THEN
        SELECT ai_run_id INTO run_step FROM ai_steps WHERE id = NEW.ai_step_id;
        IF run_step IS DISTINCT FROM NEW.ai_run_id THEN
            RAISE EXCEPTION 'Tool call step must belong to the same AI run';
        END IF;
    END IF;

    SELECT
        tool_id, entity_id, business_id, credential_reference_id,
        allowed_actions, data_scope, spend_limit, call_limit, valid_from, expires_at
    INTO
        grant_tool, grant_entity, grant_business, grant_credential,
        grant_actions, grant_data_scope, grant_spend_limit, grant_call_limit,
        grant_valid_from, grant_expires_at
    FROM tool_grants
    WHERE id = NEW.tool_grant_id
    FOR UPDATE;

    SELECT version, is_active, idempotency_supported
    INTO definition_version, definition_active, definition_idempotency_supported
    FROM tool_definitions
    WHERE id = NEW.tool_id
    FOR SHARE;

    IF grant_tool IS DISTINCT FROM NEW.tool_id THEN
        RAISE EXCEPTION 'Tool call tool must match the authorized tool grant';
    END IF;
    IF definition_active IS DISTINCT FROM true THEN
        RAISE EXCEPTION 'Tool call references an inactive or missing tool definition';
    END IF;
    IF NEW.tool_version IS DISTINCT FROM definition_version THEN
        RAISE EXCEPTION 'Tool call must record the current tool definition version';
    END IF;
    IF NOT (NEW.requested_action = ANY(grant_actions) OR '*' = ANY(grant_actions)) THEN
        RAISE EXCEPTION 'Tool call action is outside the authorized tool grant';
    END IF;
    IF grant_entity IS DISTINCT FROM run_entity THEN
        RAISE EXCEPTION 'Tool call grant is outside the AI run entity scope';
    END IF;
    IF grant_business IS DISTINCT FROM run_business THEN
        RAISE EXCEPTION 'Tool call grant is outside the AI run business scope';
    END IF;
    IF grant_data_scope <> '{}'::jsonb THEN
        IF NEW.authorization_evidence->'data_scope' IS DISTINCT FROM grant_data_scope THEN
            RAISE EXCEPTION 'Tool call must record the exact authorized data scope';
        END IF;
        IF NOT (NEW.input ? 'data_scope')
           OR NOT (grant_data_scope @> (NEW.input->'data_scope')) THEN
            RAISE EXCEPTION 'Tool call input is outside the authorized data scope';
        END IF;
    END IF;
    IF definition_idempotency_supported
       AND NEW.idempotency_key IS NULL THEN
        RAISE EXCEPTION 'Idempotent tool calls require an idempotency key';
    END IF;
    IF NEW.idempotency_key IS NOT NULL THEN
        SELECT operation, scope_type, scope_id, request_sha256, status
        INTO
            idempotency_operation, idempotency_scope_type,
            idempotency_scope_id, idempotency_request_sha256, idempotency_status
        FROM idempotency_keys
        WHERE key = NEW.idempotency_key
        FOR UPDATE;
        IF TG_OP = 'INSERT' AND idempotency_status IS DISTINCT FROM 'IN_PROGRESS' THEN
            RAISE EXCEPTION 'New tool calls require an IN_PROGRESS idempotency key';
        END IF;
        IF idempotency_operation IS DISTINCT FROM (
            'TOOL_CALL:' || NEW.tool_id::text || ':' || NEW.requested_action
        ) THEN
            RAISE EXCEPTION 'Tool call idempotency operation does not match the selected tool action';
        END IF;
        IF idempotency_scope_type IS DISTINCT FROM run_scope_type
           OR idempotency_scope_id IS DISTINCT FROM run_scope_id THEN
            RAISE EXCEPTION 'Tool call idempotency key is outside the AI run scope';
        END IF;
        IF idempotency_request_sha256 IS DISTINCT FROM NEW.input_sha256 THEN
            RAISE EXCEPTION 'Tool call idempotency request hash does not match the canonical input';
        END IF;
    END IF;
    IF grant_call_limit IS NOT NULL AND NEW.status <> 'REJECTED' THEN
        SELECT count(*) INTO prior_call_count
        FROM tool_calls
        WHERE tool_grant_id = NEW.tool_grant_id
          AND id IS DISTINCT FROM NEW.id
          AND status <> 'REJECTED';
        IF prior_call_count >= grant_call_limit THEN
            RAISE EXCEPTION 'Tool call limit has been exhausted';
        END IF;
    END IF;
    IF grant_spend_limit IS NOT NULL AND NEW.status <> 'REJECTED' THEN
        BEGIN
            estimated_spend := NULLIF(
                NEW.authorization_evidence->>'estimated_cost',
                ''
            )::numeric;
        EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
            RAISE EXCEPTION 'Tool call estimated cost is invalid';
        END;
        IF estimated_spend IS NULL OR estimated_spend < 0 THEN
            RAISE EXCEPTION 'Bounded tool grants require a nonnegative estimated cost';
        END IF;
        requested_spend := GREATEST(COALESCE(NEW.cost, 0), estimated_spend);
        SELECT COALESCE(sum(GREATEST(
            COALESCE(cost, 0),
            COALESCE(NULLIF(authorization_evidence->>'estimated_cost', '')::numeric, 0)
        )), 0)
        INTO prior_spend
        FROM tool_calls
        WHERE tool_grant_id = NEW.tool_grant_id
          AND id IS DISTINCT FROM NEW.id
          AND status <> 'REJECTED';
        IF prior_spend + requested_spend > grant_spend_limit THEN
            RAISE EXCEPTION 'Tool call spend limit would be exceeded';
        END IF;
    END IF;
    IF NEW.credential_reference_id IS DISTINCT FROM grant_credential THEN
        RAISE EXCEPTION 'Tool call credential must match the authorized tool grant';
    END IF;
    IF grant_valid_from > CURRENT_TIMESTAMP
       OR (grant_expires_at IS NOT NULL AND grant_expires_at <= CURRENT_TIMESTAMP) THEN
        RAISE EXCEPTION 'Tool call grant is not currently valid';
    END IF;

    IF NEW.credential_reference_id IS NOT NULL THEN
        SELECT status, owning_business_id, allowed_tool_id, expires_at, allowed_actions
        INTO
            credential_status, credential_business, credential_tool,
            credential_expires_at, credential_actions
        FROM credential_references
        WHERE id = NEW.credential_reference_id
        FOR SHARE;
        IF credential_status IS DISTINCT FROM 'ACTIVE'
           OR (credential_expires_at IS NOT NULL AND credential_expires_at <= CURRENT_TIMESTAMP) THEN
            RAISE EXCEPTION 'Tool call credential is not active';
        END IF;
        IF credential_business IS DISTINCT FROM run_business
           OR credential_business IS DISTINCT FROM grant_business THEN
            RAISE EXCEPTION 'Tool call credential is outside the AI run business scope';
        END IF;
        IF credential_tool IS DISTINCT FROM NEW.tool_id THEN
            RAISE EXCEPTION 'Tool call credential is not authorized for the selected tool';
        END IF;
        IF cardinality(credential_actions) > 0
           AND NOT (NEW.requested_action = ANY(credential_actions) OR '*' = ANY(credential_actions)) THEN
            RAISE EXCEPTION 'Tool call action is outside the credential authorization';
        END IF;
    END IF;

    IF NEW.governance_action_id IS NOT NULL THEN
        SELECT business_id, status
        INTO governance_business, governance_status
        FROM governance_actions
        WHERE id = NEW.governance_action_id
        FOR SHARE;
        IF governance_status NOT IN ('AUTHORIZED','EXECUTING','VERIFYING','SUCCEEDED') THEN
            RAISE EXCEPTION 'Tool call governance action is not authorized';
        END IF;
        IF governance_business IS DISTINCT FROM run_business THEN
            RAISE EXCEPTION 'Tool call governance action is outside the AI run business scope';
        END IF;
    END IF;

    RETURN NEW;
END $$;
CREATE TRIGGER validate_tool_call_scope_trigger
BEFORE INSERT OR UPDATE ON tool_calls
FOR EACH ROW EXECUTE FUNCTION validate_tool_call_scope();

CREATE INDEX tool_calls_ai_run_idx ON tool_calls(ai_run_id, proposed_at);
CREATE INDEX tool_calls_action_idx ON tool_calls(governance_action_id, proposed_at);
CREATE UNIQUE INDEX tool_calls_idempotency_key_idx
    ON tool_calls(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE TABLE verification_results (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type text NOT NULL CHECK (subject_type IN (
        'GOVERNANCE_ACTION','AI_RUN','TOOL_CALL','MISSION','TASK',
        'HEALTH_ASSESSMENT','RECOMMENDATION','REPAIR'
    )),
    subject_id uuid NOT NULL,
    status verification_status NOT NULL DEFAULT 'PENDING',
    verification_method text NOT NULL,
    assertions jsonb NOT NULL,
    observed_state jsonb NOT NULL DEFAULT '{}'::jsonb,
    expected_state jsonb NOT NULL DEFAULT '{}'::jsonb,
    evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    verified_by_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    verified_by_id uuid DEFAULT current_actor_id(),
    trusted_provenance boolean NOT NULL DEFAULT false,
    verified_by_app_user_id uuid REFERENCES app_users(id),
    verified_by_db_role text,
    started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    completed_at timestamptz,
    failure_detail text,
    CHECK (
        (verified_by_kind = 'SYSTEM' AND verified_by_id IS NULL)
        OR (verified_by_kind IN ('HUMAN','ENTITY') AND verified_by_id IS NOT NULL)
    ),
    CHECK (
        NOT trusted_provenance
        OR (verified_by_app_user_id IS NOT NULL AND verified_by_db_role IS NOT NULL)
    ),
    CHECK (status = 'PENDING' OR completed_at IS NOT NULL)
);
CREATE INDEX verification_results_subject_idx
    ON verification_results(subject_type, subject_id, status, started_at DESC);

CREATE OR REPLACE FUNCTION verification_session_is_trusted()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    verifier_role_oid oid;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = session_user
          AND rolsuper
    ) THEN
        RETURN true;
    END IF;

    SELECT oid INTO verifier_role_oid
    FROM pg_roles
    WHERE rolname = 'entral_verifier';

    RETURN verifier_role_oid IS NOT NULL
       AND pg_has_role(session_user, verifier_role_oid, 'member')
       AND session_is_authenticated()
       AND scope_grant_allows('SYSTEM', NULL, 'record_verification');
END $$;

CREATE OR REPLACE FUNCTION validate_verification_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    actor_kind actor_kind := current_actor_kind();
    actor_id uuid := current_actor_id();
    trusted_session boolean := verification_session_is_trusted();
BEGIN
    IF NEW.status <> 'PENDING' AND NOT trusted_session THEN
        RAISE EXCEPTION 'Completed verification results require a trusted verifier session';
    END IF;

    IF trusted_session AND NEW.status <> 'PENDING' THEN
        IF session_is_human_authority() THEN
            NEW.verified_by_kind := 'HUMAN';
            NEW.verified_by_id := session_app_user_id();
        ELSE
            NEW.verified_by_kind := 'SYSTEM';
            NEW.verified_by_id := NULL;
        END IF;
        NEW.trusted_provenance := true;
        NEW.verified_by_app_user_id := session_app_user_id();
        NEW.verified_by_db_role := session_user;
    ELSIF NEW.verified_by_kind IS DISTINCT FROM actor_kind
       OR NEW.verified_by_id IS DISTINCT FROM actor_id THEN
        RAISE EXCEPTION 'Pending verification provenance must match the current session actor';
    ELSE
        NEW.trusted_provenance := false;
        NEW.verified_by_app_user_id := session_app_user_id();
        NEW.verified_by_db_role := session_user;
    END IF;

    IF NOT verification_refs_access_allows(
        NEW.subject_type,
        NEW.subject_id,
        NEW.evidence_refs
    ) THEN
        RAISE EXCEPTION 'Verification evidence references are invalid, inaccessible, or outside the subject scope';
    END IF;

    RETURN NEW;
END $$;
CREATE TRIGGER verification_results_validate_provenance
BEFORE INSERT OR UPDATE ON verification_results
FOR EACH ROW EXECUTE FUNCTION validate_verification_provenance();

CREATE OR REPLACE FUNCTION validate_tool_call_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
BEGIN
    IF NEW.status = 'SUCCEEDED'
       AND NOT EXISTS (
           SELECT 1
           FROM verification_results
           WHERE subject_type = 'TOOL_CALL'
             AND subject_id = NEW.id
             AND status = 'PASSED'
             AND trusted_provenance
       ) THEN
        RAISE EXCEPTION 'Succeeded tool calls require a PASSED verification bound to the same call';
    END IF;
    RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER validate_tool_call_completion_trigger
AFTER INSERT OR UPDATE OF status ON tool_calls
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_tool_call_completion();

CREATE OR REPLACE FUNCTION validate_ai_run_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
BEGIN
    IF NEW.status = 'SUCCEEDED'
       AND NOT EXISTS (
           SELECT 1
           FROM verification_results
           WHERE subject_type = 'AI_RUN'
             AND subject_id = NEW.id
             AND status = 'PASSED'
             AND trusted_provenance
       ) THEN
        RAISE EXCEPTION 'Succeeded AI runs require a PASSED verification bound to the same run';
    END IF;
    RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER validate_ai_run_completion_trigger
AFTER INSERT OR UPDATE OF status ON ai_runs
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_ai_run_completion();

CREATE UNIQUE INDEX governance_actions_idempotency_key_idx
    ON governance_actions(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

CREATE OR REPLACE FUNCTION validate_idempotency_key_lifecycle()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.status <> 'IN_PROGRESS'
           OR NEW.response IS NOT NULL
           OR NEW.completed_at IS NOT NULL THEN
            RAISE EXCEPTION 'Idempotency keys must be inserted in an incomplete IN_PROGRESS state';
        END IF;
    ELSE
        IF NEW.key IS DISTINCT FROM OLD.key
           OR NEW.operation IS DISTINCT FROM OLD.operation
           OR NEW.scope_type IS DISTINCT FROM OLD.scope_type
           OR NEW.scope_id IS DISTINCT FROM OLD.scope_id
           OR NEW.request_sha256 IS DISTINCT FROM OLD.request_sha256
           OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
            RAISE EXCEPTION 'Idempotency key identity, scope, and request binding are immutable';
        END IF;
        IF OLD.status IN ('SUCCEEDED','FAILED') THEN
            RAISE EXCEPTION 'Completed idempotency keys are immutable';
        END IF;
        IF NEW.status NOT IN ('IN_PROGRESS','SUCCEEDED','FAILED') THEN
            RAISE EXCEPTION 'Invalid idempotency key status transition';
        END IF;
    END IF;

    IF NEW.status = 'IN_PROGRESS' THEN
        IF NEW.response IS NOT NULL OR NEW.completed_at IS NOT NULL THEN
            RAISE EXCEPTION 'In-progress idempotency keys cannot contain a response or completion time';
        END IF;
    ELSE
        IF NEW.completed_at IS NULL OR NEW.locked_until IS NOT NULL THEN
            RAISE EXCEPTION 'Completed idempotency keys require completed_at and no active lock';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER idempotency_keys_validate_lifecycle
BEFORE INSERT OR UPDATE ON idempotency_keys
FOR EACH ROW EXECUTE FUNCTION validate_idempotency_key_lifecycle();

CREATE OR REPLACE FUNCTION validate_tool_call_idempotency_pair()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    pair_key text;
    key_operation text;
    key_status text;
    key_response jsonb;
    call_id uuid;
    call_tool_id uuid;
    call_action text;
    call_status tool_call_status;
    call_output jsonb;
    call_error jsonb;
BEGIN
    IF TG_TABLE_NAME = 'tool_calls' THEN
        pair_key := CASE WHEN TG_OP = 'DELETE'
            THEN OLD.idempotency_key ELSE NEW.idempotency_key END;
    ELSE
        pair_key := CASE WHEN TG_OP = 'DELETE'
            THEN OLD.key ELSE NEW.key END;
    END IF;
    IF pair_key IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT operation, status, response
    INTO key_operation, key_status, key_response
    FROM idempotency_keys
    WHERE key = pair_key;
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    SELECT id, tool_id, requested_action, status, output, error
    INTO call_id, call_tool_id, call_action, call_status, call_output, call_error
    FROM tool_calls
    WHERE idempotency_key = pair_key;

    IF call_id IS NULL THEN
        IF key_operation LIKE 'TOOL_CALL:%' AND key_status <> 'IN_PROGRESS' THEN
            RAISE EXCEPTION 'Completed tool-call idempotency keys require a bound terminal tool call';
        END IF;
        RETURN NULL;
    END IF;

    IF key_operation IS DISTINCT FROM (
        'TOOL_CALL:' || call_tool_id::text || ':' || call_action
    ) THEN
        RAISE EXCEPTION 'Tool call and idempotency key operations are inconsistent';
    END IF;

    IF call_status IN ('PROPOSED','AUTHORIZED','RUNNING') THEN
        IF key_status IS DISTINCT FROM 'IN_PROGRESS' THEN
            RAISE EXCEPTION 'Nonterminal tool calls require an IN_PROGRESS idempotency key';
        END IF;
    ELSIF call_status = 'SUCCEEDED' THEN
        IF key_status IS DISTINCT FROM 'SUCCEEDED' THEN
            RAISE EXCEPTION 'Succeeded tool calls require a SUCCEEDED idempotency key';
        END IF;
        IF call_output IS NULL OR key_response IS DISTINCT FROM call_output THEN
            RAISE EXCEPTION 'Succeeded tool-call replay data must exactly match the recorded output';
        END IF;
    ELSE
        IF key_status IS DISTINCT FROM 'FAILED' THEN
            RAISE EXCEPTION 'Failed or rejected tool calls require a FAILED idempotency key';
        END IF;
        IF call_error IS NULL OR key_response IS DISTINCT FROM call_error THEN
            RAISE EXCEPTION 'Failed tool-call replay data must exactly match the recorded error';
        END IF;
    END IF;

    RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER validate_tool_call_idempotency_pair_from_call
AFTER INSERT OR UPDATE OR DELETE ON tool_calls
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_tool_call_idempotency_pair();
CREATE CONSTRAINT TRIGGER validate_tool_call_idempotency_pair_from_key
AFTER INSERT OR UPDATE ON idempotency_keys
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_tool_call_idempotency_pair();

ALTER TABLE governance_actions
    ADD COLUMN verification_result_id uuid REFERENCES verification_results(id);

CREATE OR REPLACE FUNCTION validate_governance_action_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    verification_state verification_status;
    verification_subject_type text;
    verification_subject_id uuid;
BEGIN
    IF NEW.status = 'SUCCEEDED' THEN
        IF NEW.completed_at IS NULL OR NEW.verification_result_id IS NULL THEN
            RAISE EXCEPTION 'A succeeded governance action requires completion time and verification';
        END IF;
        SELECT status, subject_type, subject_id
        INTO verification_state, verification_subject_type, verification_subject_id
        FROM verification_results
        WHERE id = NEW.verification_result_id;
        IF verification_state IS DISTINCT FROM 'PASSED' THEN
            RAISE EXCEPTION 'A succeeded governance action requires PASSED verification';
        END IF;
        IF verification_subject_type IS DISTINCT FROM 'GOVERNANCE_ACTION'
           OR verification_subject_id IS DISTINCT FROM NEW.id THEN
            RAISE EXCEPTION 'Governance action verification must be bound to the same action';
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM verification_results
            WHERE id = NEW.verification_result_id
              AND trusted_provenance
        ) THEN
            RAISE EXCEPTION 'Governance action verification requires trusted provenance';
        END IF;
    ELSIF NEW.status = 'ROLLED_BACK' AND NEW.rolled_back_at IS NULL THEN
        RAISE EXCEPTION 'A rolled-back governance action requires rolled_back_at';
    END IF;
    RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER validate_governance_action_completion_trigger
AFTER INSERT OR UPDATE OF status, completed_at, rolled_back_at, verification_result_id
ON governance_actions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_governance_action_completion();

REVOKE ALL ON FUNCTION validate_tool_call_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_tool_call_completion() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_ai_run_completion() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_idempotency_key_lifecycle() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_tool_call_idempotency_pair() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_governance_action_completion() FROM PUBLIC;
REVOKE ALL ON FUNCTION verification_session_is_trusted() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_verification_provenance() FROM PUBLIC;

CREATE TABLE health_assessments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type scope_type NOT NULL,
    scope_id uuid,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    health_state health_state NOT NULL,
    health_score numeric(5,2) CHECK (health_score IS NULL OR health_score BETWEEN 0 AND 100),
    driver_records jsonb NOT NULL,
    evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    source_freshness jsonb NOT NULL,
    confidence numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    calculation_version text,
    model_profile_id uuid REFERENCES model_profiles(id),
    ai_run_id uuid REFERENCES ai_runs(id),
    computed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    expires_at timestamptz,
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL)),
    CHECK (scope_type <> 'BUSINESS' OR business_id IS NOT DISTINCT FROM scope_id),
    CHECK (expires_at IS NULL OR expires_at > computed_at)
);
CREATE INDEX health_assessments_scope_idx
    ON health_assessments(scope_type, scope_id, computed_at DESC);
CREATE INDEX health_assessments_business_idx
    ON health_assessments(business_id, computed_at DESC);

CREATE TABLE recommendations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type scope_type NOT NULL,
    scope_id uuid,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    objective text NOT NULL,
    diagnosis text NOT NULL,
    proposed_actions jsonb NOT NULL,
    expected_value jsonb NOT NULL,
    estimated_cost jsonb NOT NULL DEFAULT '{}'::jsonb,
    risk_class risk_class NOT NULL,
    confidence numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    authority_required jsonb NOT NULL,
    rollback_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
    verification_plan jsonb NOT NULL,
    evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    status recommendation_status NOT NULL DEFAULT 'OPEN',
    ai_run_id uuid REFERENCES ai_runs(id),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    expires_at timestamptz,
    completed_at timestamptz,
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL)),
    CHECK (scope_type <> 'BUSINESS' OR business_id IS NOT DISTINCT FROM scope_id),
    CHECK (expires_at IS NULL OR expires_at > created_at)
);
CREATE INDEX recommendations_scope_status_idx
    ON recommendations(scope_type, scope_id, status, created_at DESC);
CREATE INDEX recommendations_business_status_idx
    ON recommendations(business_id, status, created_at DESC);

CREATE TABLE decisions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type scope_type NOT NULL,
    scope_id uuid,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    decision text NOT NULL,
    rationale text NOT NULL,
    options_considered jsonb NOT NULL DEFAULT '[]'::jsonb,
    evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    decided_by_kind actor_kind NOT NULL,
    decided_by_id uuid,
    recommendation_id uuid REFERENCES recommendations(id),
    governance_action_id uuid REFERENCES governance_actions(id),
    reversible boolean NOT NULL DEFAULT true,
    effective_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL)),
    CHECK (scope_type <> 'BUSINESS' OR business_id IS NOT DISTINCT FROM scope_id),
    CHECK (
        (decided_by_kind = 'SYSTEM' AND decided_by_id IS NULL)
        OR (decided_by_kind IN ('HUMAN','ENTITY') AND decided_by_id IS NOT NULL)
    )
);

CREATE TABLE experiments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    stable_code text NOT NULL UNIQUE,
    hypothesis text NOT NULL,
    success_criteria jsonb NOT NULL,
    operating_constraints jsonb NOT NULL,
    allocation jsonb NOT NULL,
    status text NOT NULL DEFAULT 'PLANNED'
        CHECK (status IN ('PLANNED','RUNNING','PAUSED','COMPLETED','STOPPED','FAILED')),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE outcomes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type scope_type NOT NULL,
    scope_id uuid,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    recommendation_id uuid REFERENCES recommendations(id),
    governance_action_id uuid REFERENCES governance_actions(id),
    experiment_id uuid REFERENCES experiments(id),
    outcome_type text NOT NULL,
    expected jsonb NOT NULL DEFAULT '{}'::jsonb,
    actual jsonb NOT NULL,
    value_delta jsonb NOT NULL DEFAULT '{}'::jsonb,
    evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    attribution_confidence numeric(5,4)
        CHECK (attribution_confidence IS NULL OR attribution_confidence BETWEEN 0 AND 1),
    observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL)),
    CHECK (scope_type <> 'BUSINESS' OR business_id IS NOT DISTINCT FROM scope_id)
);
CREATE INDEX outcomes_business_idx ON outcomes(business_id, observed_at DESC);

CREATE TABLE metric_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    name text NOT NULL,
    description text NOT NULL,
    unit text NOT NULL,
    value_type text NOT NULL CHECK (value_type IN ('NUMBER','CURRENCY','PERCENT','COUNT','DURATION','BOOLEAN','TEXT','JSON')),
    aggregation text NOT NULL CHECK (aggregation IN ('SUM','AVERAGE','MIN','MAX','LAST','COUNT','CUSTOM')),
    scope_types scope_type[] NOT NULL,
    calculation_version text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE metric_observations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_definition_id uuid NOT NULL REFERENCES metric_definitions(id),
    scope_type scope_type NOT NULL,
    scope_id uuid,
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    numeric_value numeric(30,8),
    text_value text,
    json_value jsonb,
    currency char(3),
    source_record_id uuid REFERENCES source_records(id),
    observed_at timestamptz NOT NULL,
    ingested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    confidence numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    CHECK ((numeric_value IS NOT NULL)::int + (text_value IS NOT NULL)::int + (json_value IS NOT NULL)::int = 1),
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL)),
    CHECK (scope_type <> 'BUSINESS' OR business_id IS NOT DISTINCT FROM scope_id)
);
CREATE INDEX metric_observations_scope_time_idx
    ON metric_observations(scope_type, scope_id, observed_at DESC);
CREATE INDEX metric_observations_business_time_idx
    ON metric_observations(business_id, observed_at DESC);

CREATE TABLE cost_records (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
    ai_run_id uuid REFERENCES ai_runs(id) ON DELETE SET NULL,
    tool_call_id uuid REFERENCES tool_calls(id) ON DELETE SET NULL,
    cost_type text NOT NULL,
    amount numeric(20,8) NOT NULL CHECK (amount >= 0),
    currency char(3) NOT NULL DEFAULT 'USD',
    quantity numeric(20,8),
    unit text,
    provider text,
    incurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX cost_records_business_time_idx ON cost_records(business_id, incurred_at DESC);

CREATE TABLE resource_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
    resource_type text NOT NULL,
    quantity numeric(30,8) NOT NULL CHECK (quantity >= 0),
    unit text NOT NULL,
    period_start timestamptz NOT NULL,
    period_end timestamptz NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CHECK (period_end >= period_start)
);
CREATE INDEX resource_usage_business_period_idx
    ON resource_usage(business_id, period_end DESC);

CREATE TABLE retrieval_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_run_id uuid REFERENCES ai_runs(id) ON DELETE CASCADE,
    context_manifest_id uuid REFERENCES context_manifests(id) ON DELETE CASCADE,
    scope_type scope_type NOT NULL,
    scope_id uuid,
    query_type text NOT NULL CHECK (query_type IN ('RELATIONAL','SEMANTIC','ARTIFACT','POLICY','DOCTRINE')),
    query_summary text NOT NULL,
    filters jsonb NOT NULL DEFAULT '{}'::jsonb,
    candidate_count integer CHECK (candidate_count IS NULL OR candidate_count >= 0),
    selected_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    excluded_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    latency_ms bigint CHECK (latency_ms IS NULL OR latency_ms >= 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL))
);

CREATE OR REPLACE FUNCTION validate_evidence_link_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    origin_business uuid;
    object_business uuid;
BEGIN
    CASE NEW.from_type
        WHEN 'MISSION' THEN
            SELECT business_id INTO origin_business FROM missions WHERE id = NEW.from_id;
        WHEN 'TASK' THEN
            SELECT business_id INTO origin_business FROM tasks WHERE id = NEW.from_id;
        WHEN 'MESSAGE' THEN
            SELECT COALESCE(sender.business_id, recipient.business_id)
            INTO origin_business
            FROM operational_messages message
            LEFT JOIN entities sender ON sender.id = message.sender_entity_id
            LEFT JOIN entities recipient ON recipient.id = message.recipient_entity_id
            WHERE message.id = NEW.from_id;
        WHEN 'GOVERNANCE_ACTION' THEN
            SELECT business_id INTO origin_business FROM governance_actions WHERE id = NEW.from_id;
        WHEN 'AI_RUN' THEN
            SELECT business_id INTO origin_business FROM ai_runs WHERE id = NEW.from_id;
        WHEN 'AI_STEP' THEN
            SELECT run.business_id INTO origin_business
            FROM ai_steps step JOIN ai_runs run ON run.id = step.ai_run_id
            WHERE step.id = NEW.from_id;
        WHEN 'TOOL_CALL' THEN
            SELECT run.business_id INTO origin_business
            FROM tool_calls call JOIN ai_runs run ON run.id = call.ai_run_id
            WHERE call.id = NEW.from_id;
        WHEN 'HEALTH_ASSESSMENT' THEN
            SELECT business_id INTO origin_business FROM health_assessments WHERE id = NEW.from_id;
        WHEN 'RECOMMENDATION' THEN
            SELECT business_id INTO origin_business FROM recommendations WHERE id = NEW.from_id;
        WHEN 'DECISION' THEN
            SELECT business_id INTO origin_business FROM decisions WHERE id = NEW.from_id;
        WHEN 'EXPERIMENT' THEN
            SELECT business_id INTO origin_business FROM experiments WHERE id = NEW.from_id;
        WHEN 'OUTCOME' THEN
            SELECT business_id INTO origin_business FROM outcomes WHERE id = NEW.from_id;
        WHEN 'MEMORY' THEN
            SELECT business_id INTO origin_business FROM memory_items WHERE id = NEW.from_id;
        ELSE
            RAISE EXCEPTION 'Unsupported evidence origin type %', NEW.from_type;
    END CASE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evidence origin does not exist';
    END IF;

    IF NEW.artifact_id IS NOT NULL THEN
        SELECT business_id INTO object_business FROM artifacts WHERE id = NEW.artifact_id;
    ELSE
        SELECT business_id INTO object_business FROM source_records WHERE id = NEW.source_record_id;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Evidence object does not exist';
    END IF;
    IF origin_business IS DISTINCT FROM object_business THEN
        RAISE EXCEPTION 'Evidence origin and object must share the same business scope';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER evidence_links_validate_scope
BEFORE INSERT OR UPDATE ON evidence_links
FOR EACH ROW EXECUTE FUNCTION validate_evidence_link_scope();

CREATE OR REPLACE FUNCTION entity_business_scope_matches(
    p_entity_id uuid,
    p_business_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    entity_role_value entity_role;
    entity_business_value uuid;
BEGIN
    SELECT role, business_id
    INTO entity_role_value, entity_business_value
    FROM entities
    WHERE id = p_entity_id;
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    IF entity_business_value IS NOT NULL THEN
        RETURN p_business_id IS NOT DISTINCT FROM entity_business_value;
    END IF;
    IF p_business_id IS NULL THEN
        RETURN true;
    END IF;
    RETURN CASE entity_role_value
        WHEN 'ENTRAL' THEN true
        WHEN 'MARSHAL' THEN EXISTS (
            SELECT 1 FROM businesses WHERE id = p_business_id AND marshal_id = p_entity_id
        )
        WHEN 'GENERAL' THEN EXISTS (
            SELECT 1 FROM businesses WHERE id = p_business_id AND general_id = p_entity_id
        )
        ELSE false
    END;
END $$;

CREATE OR REPLACE FUNCTION validate_tool_grant_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    credential_business uuid;
    credential_tool uuid;
    credential_status text;
    credential_expires_at timestamptz;
BEGIN
    IF NOT entity_business_scope_matches(NEW.entity_id, NEW.business_id) THEN
        RAISE EXCEPTION 'Tool grant entity is outside the selected business scope';
    END IF;
    IF NEW.credential_reference_id IS NOT NULL THEN
        SELECT owning_business_id, allowed_tool_id, status, expires_at
        INTO credential_business, credential_tool, credential_status, credential_expires_at
        FROM credential_references
        WHERE id = NEW.credential_reference_id;
        IF credential_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM credential_business THEN
            RAISE EXCEPTION 'Credential reference is outside the tool grant business scope';
        END IF;
        IF credential_tool IS NOT NULL AND credential_tool <> NEW.tool_id THEN
            RAISE EXCEPTION 'Credential reference is not approved for the selected tool';
        END IF;
        IF credential_status IS DISTINCT FROM 'ACTIVE'
           OR (credential_expires_at IS NOT NULL AND credential_expires_at <= CURRENT_TIMESTAMP) THEN
            RAISE EXCEPTION 'Credential reference is not active';
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION validate_mission_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    parent_business uuid;
BEGIN
    IF NOT entity_business_scope_matches(NEW.owner_entity_id, NEW.business_id) THEN
        RAISE EXCEPTION 'Mission owner is outside the selected business scope';
    END IF;
    IF NEW.parent_mission_id IS NOT NULL THEN
        SELECT business_id INTO parent_business FROM missions WHERE id = NEW.parent_mission_id;
        IF parent_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM parent_business THEN
            RAISE EXCEPTION 'Child mission business scope must match the parent mission';
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION validate_task_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    mission_business uuid;
    parent_mission uuid;
    parent_business uuid;
BEGIN
    SELECT business_id INTO mission_business FROM missions WHERE id = NEW.mission_id;
    IF mission_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM mission_business THEN
        RAISE EXCEPTION 'Task business scope must match its mission';
    END IF;
    IF NOT entity_business_scope_matches(NEW.owner_entity_id, NEW.business_id) THEN
        RAISE EXCEPTION 'Task owner is outside the selected business scope';
    END IF;
    IF NEW.parent_task_id IS NOT NULL THEN
        SELECT mission_id, business_id INTO parent_mission, parent_business
        FROM tasks WHERE id = NEW.parent_task_id;
        IF parent_mission IS DISTINCT FROM NEW.mission_id THEN
            RAISE EXCEPTION 'Parent and child tasks must belong to the same mission';
        END IF;
        IF parent_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM parent_business THEN
            RAISE EXCEPTION 'Child task business scope must match its parent task';
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION validate_schedule_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
BEGIN
    IF NOT entity_business_scope_matches(NEW.owner_entity_id, NEW.business_id) THEN
        RAISE EXCEPTION 'Schedule owner is outside the selected business scope';
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION validate_phase150_scope_consistency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    row_data jsonb := to_jsonb(NEW);
    row_business uuid := NULLIF(row_data->>'business_id', '')::uuid;
    row_entity uuid := NULLIF(row_data->>'entity_id', '')::uuid;
    row_mission uuid := NULLIF(row_data->>'mission_id', '')::uuid;
    row_task uuid := NULLIF(row_data->>'task_id', '')::uuid;
    row_scope_type text := row_data->>'scope_type';
    row_scope_id uuid := NULLIF(row_data->>'scope_id', '')::uuid;
    referenced_business uuid;
    referenced_role entity_role;
BEGIN
    IF row_business IS NULL THEN
        IF row_entity IS NOT NULL THEN
            SELECT role, business_id
            INTO referenced_role, referenced_business
            FROM entities
            WHERE id = row_entity;
            IF referenced_business IS NOT NULL THEN
                RAISE EXCEPTION 'Business-scoped entity requires a matching record business';
            END IF;
        END IF;

        IF row_mission IS NOT NULL THEN
            SELECT business_id INTO referenced_business FROM missions WHERE id = row_mission;
            IF referenced_business IS NOT NULL THEN
                RAISE EXCEPTION 'Business-scoped mission requires a matching record business';
            END IF;
        END IF;

        IF row_task IS NOT NULL THEN
            SELECT business_id INTO referenced_business FROM tasks WHERE id = row_task;
            IF referenced_business IS NOT NULL THEN
                RAISE EXCEPTION 'Business-scoped task requires a matching record business';
            END IF;
        END IF;

        IF row_scope_type = 'BUSINESS' THEN
            RAISE EXCEPTION 'Business scope requires a matching record business';
        ELSIF row_scope_type = 'ENTITY' AND row_scope_id IS NOT NULL THEN
            SELECT role, business_id
            INTO referenced_role, referenced_business
            FROM entities
            WHERE id = row_scope_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Scoped entity does not exist';
            END IF;
            IF referenced_business IS NOT NULL THEN
                RAISE EXCEPTION 'Business-scoped entity scope requires a matching record business';
            END IF;
        ELSIF row_scope_type = 'MISSION' AND row_scope_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business FROM missions WHERE id = row_scope_id;
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Scoped mission does not exist';
            END IF;
            IF referenced_business IS NOT NULL THEN
                RAISE EXCEPTION 'Business-scoped mission scope requires a matching record business';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    IF row_entity IS NOT NULL THEN
        SELECT role, business_id
        INTO referenced_role, referenced_business
        FROM entities
        WHERE id = row_entity;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Scoped entity does not exist';
        END IF;
        IF referenced_business IS NOT NULL AND referenced_business IS DISTINCT FROM row_business THEN
            RAISE EXCEPTION 'Entity and record business scopes do not match';
        END IF;
        IF referenced_business IS NULL
           AND referenced_role = 'GENERAL'
           AND NOT EXISTS (SELECT 1 FROM businesses WHERE id = row_business AND general_id = row_entity) THEN
            RAISE EXCEPTION 'General does not govern the record business';
        END IF;
        IF referenced_business IS NULL
           AND referenced_role = 'MARSHAL'
           AND NOT EXISTS (SELECT 1 FROM businesses WHERE id = row_business AND marshal_id = row_entity) THEN
            RAISE EXCEPTION 'Marshal does not govern the record business';
        END IF;
    END IF;

    IF row_mission IS NOT NULL THEN
        SELECT business_id INTO referenced_business FROM missions WHERE id = row_mission;
        IF referenced_business IS NOT NULL AND referenced_business IS DISTINCT FROM row_business THEN
            RAISE EXCEPTION 'Mission and record business scopes do not match';
        END IF;
    END IF;

    IF row_task IS NOT NULL THEN
        SELECT business_id INTO referenced_business FROM tasks WHERE id = row_task;
        IF referenced_business IS NOT NULL AND referenced_business IS DISTINCT FROM row_business THEN
            RAISE EXCEPTION 'Task and record business scopes do not match';
        END IF;
    END IF;

    IF row_scope_type = 'ENTITY' AND row_scope_id IS DISTINCT FROM row_entity THEN
        SELECT role, business_id
        INTO referenced_role, referenced_business
        FROM entities
        WHERE id = row_scope_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Scoped entity does not exist';
        END IF;
        IF referenced_business IS NOT NULL AND referenced_business IS DISTINCT FROM row_business THEN
            RAISE EXCEPTION 'Entity scope and record business do not match';
        END IF;
        IF referenced_business IS NULL
           AND referenced_role = 'GENERAL'
           AND NOT EXISTS (SELECT 1 FROM businesses WHERE id = row_business AND general_id = row_scope_id) THEN
            RAISE EXCEPTION 'General scope does not govern the record business';
        END IF;
        IF referenced_business IS NULL
           AND referenced_role = 'MARSHAL'
           AND NOT EXISTS (SELECT 1 FROM businesses WHERE id = row_business AND marshal_id = row_scope_id) THEN
            RAISE EXCEPTION 'Marshal scope does not govern the record business';
        END IF;
    ELSIF row_scope_type = 'MISSION' THEN
        SELECT business_id INTO referenced_business FROM missions WHERE id = row_scope_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Scoped mission does not exist';
        END IF;
        IF referenced_business IS DISTINCT FROM row_business THEN
            RAISE EXCEPTION 'Mission scope and record business do not match';
        END IF;
    END IF;

    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION phase150_record_refs_max_classification(
    p_record_refs jsonb
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    record_ref jsonb;
    record_type text;
    record_id uuid;
    record_classification text;
    maximum_rank integer := 0;
BEGIN
    IF jsonb_typeof(p_record_refs) IS DISTINCT FROM 'array' THEN
        RETURN 'RESTRICTED';
    END IF;
    FOR record_ref IN SELECT value FROM jsonb_array_elements(p_record_refs)
    LOOP
        IF jsonb_typeof(record_ref) IS DISTINCT FROM 'object'
           OR jsonb_typeof(record_ref->'type') IS DISTINCT FROM 'string'
           OR jsonb_typeof(record_ref->'id') IS DISTINCT FROM 'string' THEN
            RETURN 'RESTRICTED';
        END IF;
        record_type := record_ref->>'type';
        BEGIN
            record_id := (record_ref->>'id')::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            RETURN 'RESTRICTED';
        END;

        record_classification := 'INTERNAL';
        IF record_type = 'ARTIFACT' THEN
            SELECT classification INTO record_classification
            FROM artifacts WHERE id = record_id;
            IF NOT FOUND THEN
                RETURN 'RESTRICTED';
            END IF;
        ELSIF record_type = 'MEMORY' THEN
            SELECT access_classification INTO record_classification
            FROM memory_items WHERE id = record_id;
            IF NOT FOUND THEN
                RETURN 'RESTRICTED';
            END IF;
        ELSIF record_type NOT IN (
            'SOURCE_RECORD','METRIC_OBSERVATION','DECISION',
            'GOVERNANCE_ACTION','POLICY_VERSION'
        ) THEN
            RETURN 'RESTRICTED';
        END IF;

        maximum_rank := GREATEST(maximum_rank, CASE record_classification
            WHEN 'PUBLIC' THEN 0
            WHEN 'INTERNAL' THEN 1
            WHEN 'CONFIDENTIAL' THEN 2
            WHEN 'RESTRICTED' THEN 3
            ELSE 3
        END);
    END LOOP;

    RETURN CASE maximum_rank
        WHEN 0 THEN 'PUBLIC'
        WHEN 1 THEN 'INTERNAL'
        WHEN 2 THEN 'CONFIDENTIAL'
        ELSE 'RESTRICTED'
    END;
END $$;

CREATE OR REPLACE FUNCTION phase150_record_refs_access_allows(
    p_record_refs jsonb,
    p_business_id uuid,
    p_scope_type scope_type,
    p_scope_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    record_ref jsonb;
    record_type text;
    record_id uuid;
    referenced_business uuid;
    referenced_entity uuid;
    record_classification text;
BEGIN
    IF jsonb_typeof(p_record_refs) IS DISTINCT FROM 'array' THEN
        RETURN false;
    END IF;
    FOR record_ref IN SELECT value FROM jsonb_array_elements(p_record_refs)
    LOOP
        IF jsonb_typeof(record_ref) IS DISTINCT FROM 'object'
           OR jsonb_typeof(record_ref->'type') IS DISTINCT FROM 'string'
           OR jsonb_typeof(record_ref->'id') IS DISTINCT FROM 'string' THEN
            RETURN false;
        END IF;
        record_type := record_ref->>'type';
        BEGIN
            record_id := (record_ref->>'id')::uuid;
        EXCEPTION WHEN invalid_text_representation THEN
            RETURN false;
        END;

        referenced_business := NULL;
        referenced_entity := NULL;
        record_classification := NULL;
        CASE record_type
            WHEN 'SOURCE_RECORD' THEN
                SELECT business_id, entity_id
                INTO referenced_business, referenced_entity
                FROM source_records WHERE id = record_id;
            WHEN 'ARTIFACT' THEN
                SELECT business_id, entity_id, classification
                INTO referenced_business, referenced_entity, record_classification
                FROM artifacts WHERE id = record_id;
            WHEN 'MEMORY' THEN
                SELECT business_id, entity_id, access_classification
                INTO referenced_business, referenced_entity, record_classification
                FROM memory_items WHERE id = record_id;
            WHEN 'METRIC_OBSERVATION' THEN
                SELECT business_id, entity_id
                INTO referenced_business, referenced_entity
                FROM metric_observations WHERE id = record_id;
            WHEN 'DECISION' THEN
                SELECT business_id INTO referenced_business
                FROM decisions WHERE id = record_id;
            WHEN 'GOVERNANCE_ACTION' THEN
                SELECT business_id INTO referenced_business
                FROM governance_actions WHERE id = record_id;
            WHEN 'POLICY_VERSION' THEN
                PERFORM 1 FROM policy_versions WHERE id = record_id;
                referenced_business := p_business_id;
            ELSE
                RETURN false;
        END CASE;

        IF NOT FOUND OR referenced_business IS DISTINCT FROM p_business_id THEN
            RETURN false;
        END IF;
        IF record_classification IS NOT NULL
           AND NOT classification_access_allows(
               record_classification,
               referenced_business,
               COALESCE(
                   referenced_entity,
                   CASE WHEN p_scope_type = 'ENTITY' THEN p_scope_id ELSE NULL END
               )
           ) THEN
            RETURN false;
        END IF;
    END LOOP;
    RETURN true;
END $$;

REVOKE ALL ON FUNCTION phase150_record_refs_max_classification(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION phase150_record_refs_access_allows(jsonb, uuid, scope_type, uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION validate_phase150_provenance_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    referenced_business uuid;
    second_business uuid;
    referenced_ai_run uuid;
    referenced_scope_type scope_type;
    referenced_scope_id uuid;
    record_ref jsonb;
    record_type text;
    record_id uuid;
    record_classification text;
BEGIN
    IF TG_TABLE_NAME = 'context_manifests' THEN
        IF NOT phase150_record_refs_access_allows(
            NEW.included_record_refs,
            NEW.business_id,
            NEW.scope_type,
            NEW.scope_id
        ) THEN
            RAISE EXCEPTION 'Context manifest contains an invalid, out-of-scope, or inaccessible record reference';
        END IF;
    ELSIF TG_TABLE_NAME = 'artifacts' THEN
        IF NEW.source_record_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM source_records WHERE id = NEW.source_record_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Artifact source record is outside the artifact business scope';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'memory_items' THEN
        IF NEW.source_record_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM source_records WHERE id = NEW.source_record_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Memory source record is outside the memory business scope';
            END IF;
        END IF;
        IF NEW.source_artifact_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM artifacts WHERE id = NEW.source_artifact_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Memory source artifact is outside the memory business scope';
            END IF;
        END IF;
        IF NEW.supersedes_memory_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM memory_items WHERE id = NEW.supersedes_memory_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Superseded memory is outside the memory business scope';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'metric_observations' THEN
        IF NEW.source_record_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM source_records WHERE id = NEW.source_record_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Metric source record is outside the metric business scope';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'ai_runs' THEN
        SELECT business_id, scope_type, scope_id
        INTO referenced_business, referenced_scope_type, referenced_scope_id
        FROM context_manifests WHERE id = NEW.context_manifest_id
        FOR SHARE;
        IF referenced_business IS DISTINCT FROM NEW.business_id
           OR referenced_scope_type IS DISTINCT FROM NEW.scope_type
           OR referenced_scope_id IS DISTINCT FROM NEW.scope_id THEN
            RAISE EXCEPTION 'AI run context manifest is outside the run scope';
        END IF;
        IF NOT phase150_record_refs_access_allows(
            (SELECT included_record_refs FROM context_manifests WHERE id = NEW.context_manifest_id),
            NEW.business_id,
            NEW.scope_type,
            NEW.scope_id
        ) THEN
            RAISE EXCEPTION 'AI run context manifest contains inaccessible record references';
        END IF;
        IF NEW.governance_action_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM governance_actions WHERE id = NEW.governance_action_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'AI run governance action is outside the run business scope';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'health_assessments'
       OR TG_TABLE_NAME = 'recommendations' THEN
        IF NEW.ai_run_id IS NOT NULL THEN
            SELECT business_id, scope_type, scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM ai_runs WHERE id = NEW.ai_run_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id
               OR referenced_scope_type IS DISTINCT FROM NEW.scope_type
               OR referenced_scope_id IS DISTINCT FROM NEW.scope_id THEN
                RAISE EXCEPTION '% AI run is outside the intelligence record scope', TG_TABLE_NAME;
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'decisions' THEN
        IF NEW.recommendation_id IS NOT NULL THEN
            SELECT business_id, scope_type, scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM recommendations WHERE id = NEW.recommendation_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id
               OR referenced_scope_type IS DISTINCT FROM NEW.scope_type
               OR referenced_scope_id IS DISTINCT FROM NEW.scope_id THEN
                RAISE EXCEPTION 'Decision recommendation is outside the decision scope';
            END IF;
        END IF;
        IF NEW.governance_action_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM governance_actions WHERE id = NEW.governance_action_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Decision governance action is outside the decision business scope';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'outcomes' THEN
        IF NEW.recommendation_id IS NOT NULL THEN
            SELECT business_id, scope_type, scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM recommendations WHERE id = NEW.recommendation_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id
               OR referenced_scope_type IS DISTINCT FROM NEW.scope_type
               OR referenced_scope_id IS DISTINCT FROM NEW.scope_id THEN
                RAISE EXCEPTION 'Outcome recommendation is outside the outcome scope';
            END IF;
        END IF;
        IF NEW.governance_action_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM governance_actions WHERE id = NEW.governance_action_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Outcome governance action is outside the outcome business scope';
            END IF;
        END IF;
        IF NEW.experiment_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM experiments WHERE id = NEW.experiment_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Outcome experiment is outside the outcome business scope';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'cost_records' THEN
        IF NEW.ai_run_id IS NOT NULL THEN
            SELECT business_id INTO referenced_business
            FROM ai_runs WHERE id = NEW.ai_run_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Cost AI run is outside the cost business scope';
            END IF;
        END IF;
        IF NEW.tool_call_id IS NOT NULL THEN
            SELECT run.id, run.business_id INTO referenced_ai_run, referenced_business
            FROM tool_calls call
            JOIN ai_runs run ON run.id = call.ai_run_id
            WHERE call.id = NEW.tool_call_id;
            IF referenced_business IS DISTINCT FROM NEW.business_id THEN
                RAISE EXCEPTION 'Cost tool call is outside the cost business scope';
            END IF;
            IF NEW.ai_run_id IS NOT NULL
               AND referenced_ai_run IS DISTINCT FROM NEW.ai_run_id THEN
                RAISE EXCEPTION 'Cost tool call does not belong to the selected AI run';
            END IF;
        END IF;
    ELSIF TG_TABLE_NAME = 'retrieval_logs' THEN
        IF NEW.ai_run_id IS NOT NULL THEN
            SELECT business_id, scope_type, scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM ai_runs WHERE id = NEW.ai_run_id;
            IF referenced_scope_type IS DISTINCT FROM NEW.scope_type
               OR referenced_scope_id IS DISTINCT FROM NEW.scope_id THEN
                RAISE EXCEPTION 'Retrieval log is outside the AI run scope';
            END IF;
        END IF;
        IF NEW.context_manifest_id IS NOT NULL THEN
            SELECT business_id, scope_type, scope_id
            INTO second_business, referenced_scope_type, referenced_scope_id
            FROM context_manifests WHERE id = NEW.context_manifest_id;
            IF referenced_scope_type IS DISTINCT FROM NEW.scope_type
               OR referenced_scope_id IS DISTINCT FROM NEW.scope_id THEN
                RAISE EXCEPTION 'Retrieval log is outside the context manifest scope';
            END IF;
            IF NEW.ai_run_id IS NOT NULL
               AND second_business IS DISTINCT FROM referenced_business THEN
                RAISE EXCEPTION 'Retrieval AI run and context manifest business scopes do not match';
            END IF;
            referenced_business := second_business;
        END IF;
        IF referenced_business IS NULL THEN
            CASE NEW.scope_type
                WHEN 'BUSINESS' THEN
                    referenced_business := NEW.scope_id;
                WHEN 'ENTITY' THEN
                    SELECT business_id INTO referenced_business
                    FROM entities WHERE id = NEW.scope_id;
                WHEN 'MISSION' THEN
                    SELECT business_id INTO referenced_business
                    FROM missions WHERE id = NEW.scope_id;
                ELSE
                    referenced_business := NULL;
            END CASE;
        END IF;
        IF NOT phase150_record_refs_access_allows(
            NEW.selected_refs, referenced_business, NEW.scope_type, NEW.scope_id
        ) OR NOT phase150_record_refs_access_allows(
            NEW.excluded_refs, referenced_business, NEW.scope_type, NEW.scope_id
        ) THEN
            RAISE EXCEPTION 'Retrieval log contains an invalid, out-of-scope, or inaccessible record reference';
        END IF;
    END IF;

    RETURN NEW;
END $$;

CREATE TRIGGER artifacts_provenance_scope
BEFORE INSERT OR UPDATE OF source_record_id, business_id ON artifacts
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER context_manifests_provenance_scope
BEFORE INSERT OR UPDATE OF included_record_refs, business_id, scope_type, scope_id ON context_manifests
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER memory_items_provenance_scope
BEFORE INSERT OR UPDATE OF source_record_id, source_artifact_id, supersedes_memory_id, business_id ON memory_items
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER metric_observations_provenance_scope
BEFORE INSERT OR UPDATE OF source_record_id, business_id ON metric_observations
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER ai_runs_provenance_scope
BEFORE INSERT OR UPDATE OF context_manifest_id, governance_action_id, business_id, scope_type, scope_id ON ai_runs
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER health_assessments_provenance_scope
BEFORE INSERT OR UPDATE OF ai_run_id, business_id, scope_type, scope_id ON health_assessments
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER recommendations_provenance_scope
BEFORE INSERT OR UPDATE OF ai_run_id, business_id, scope_type, scope_id ON recommendations
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER decisions_provenance_scope
BEFORE INSERT OR UPDATE OF recommendation_id, governance_action_id, business_id, scope_type, scope_id ON decisions
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER outcomes_provenance_scope
BEFORE INSERT OR UPDATE OF recommendation_id, governance_action_id, experiment_id, business_id, scope_type, scope_id ON outcomes
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER cost_records_provenance_scope
BEFORE INSERT OR UPDATE OF ai_run_id, tool_call_id, business_id ON cost_records
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();
CREATE TRIGGER retrieval_logs_provenance_scope
BEFORE INSERT OR UPDATE OF
    ai_run_id, context_manifest_id, scope_type, scope_id, selected_refs, excluded_refs
ON retrieval_logs
FOR EACH ROW EXECUTE FUNCTION validate_phase150_provenance_scope();

CREATE TRIGGER source_records_scope_consistency
BEFORE INSERT OR UPDATE ON source_records
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER artifacts_scope_consistency
BEFORE INSERT OR UPDATE ON artifacts
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER memory_items_scope_consistency
BEFORE INSERT OR UPDATE ON memory_items
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER context_manifests_scope_consistency
BEFORE INSERT OR UPDATE ON context_manifests
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER ai_runs_scope_consistency
BEFORE INSERT OR UPDATE ON ai_runs
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER health_assessments_scope_consistency
BEFORE INSERT OR UPDATE ON health_assessments
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER recommendations_scope_consistency
BEFORE INSERT OR UPDATE ON recommendations
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER decisions_scope_consistency
BEFORE INSERT OR UPDATE ON decisions
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER outcomes_scope_consistency
BEFORE INSERT OR UPDATE ON outcomes
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER metric_observations_scope_consistency
BEFORE INSERT OR UPDATE ON metric_observations
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER cost_records_scope_consistency
BEFORE INSERT OR UPDATE ON cost_records
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();
CREATE TRIGGER resource_usage_scope_consistency
BEFORE INSERT OR UPDATE ON resource_usage
FOR EACH ROW EXECUTE FUNCTION validate_phase150_scope_consistency();

CREATE OR REPLACE FUNCTION protect_source_record_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY['trust_level','freshness_expires_at','metadata']::text[]
       IS DISTINCT FROM
       to_jsonb(OLD) - ARRAY['trust_level','freshness_expires_at','metadata']::text[] THEN
        RAISE EXCEPTION 'Source identity and content are immutable; ingest a superseding source record';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER source_records_protect_content
BEFORE UPDATE ON source_records
FOR EACH ROW EXECUTE FUNCTION protect_source_record_content();

CREATE OR REPLACE FUNCTION protect_artifact_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY['classification','retention_policy','metadata']::text[]
       IS DISTINCT FROM
       to_jsonb(OLD) - ARRAY['classification','retention_policy','metadata']::text[] THEN
        RAISE EXCEPTION 'Artifact identity and content are immutable; create a superseding artifact';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER artifacts_protect_content
BEFORE UPDATE ON artifacts
FOR EACH ROW EXECUTE FUNCTION protect_artifact_content();

CREATE OR REPLACE FUNCTION protect_memory_content()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY[
        'validation_state','semantic_index_ref','access_classification',
        'retain_until','validated_at'
    ]::text[]
       IS DISTINCT FROM
       to_jsonb(OLD) - ARRAY[
        'validation_state','semantic_index_ref','access_classification',
        'retain_until','validated_at'
    ]::text[] THEN
        RAISE EXCEPTION 'Memory content and provenance are immutable; use supersedes_memory_id';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER memory_items_protect_content
BEFORE UPDATE ON memory_items
FOR EACH ROW EXECUTE FUNCTION protect_memory_content();

CREATE OR REPLACE FUNCTION protect_verification_result()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Completed verification results are immutable';
    END IF;
    IF NEW.subject_type IS DISTINCT FROM OLD.subject_type
       OR NEW.subject_id IS DISTINCT FROM OLD.subject_id
       OR NEW.verification_method IS DISTINCT FROM OLD.verification_method
       OR NEW.assertions IS DISTINCT FROM OLD.assertions
       OR NEW.expected_state IS DISTINCT FROM OLD.expected_state
       OR NEW.evidence_refs IS DISTINCT FROM OLD.evidence_refs THEN
        RAISE EXCEPTION 'Verification subject, contract, and evidence bindings are immutable';
    END IF;
    IF NEW.status = 'PENDING' AND NEW.completed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Pending verification cannot have a completion time';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER verification_results_protect_terminal
BEFORE UPDATE ON verification_results
FOR EACH ROW EXECUTE FUNCTION protect_verification_result();

COMMIT;
