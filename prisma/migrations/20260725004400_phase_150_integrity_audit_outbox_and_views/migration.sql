-- Phase 150 repository migration. Integrity objects are installed atomically.
BEGIN;
-- ENTRAL migration 044: canonical events, immutable audit, outbox, snapshots, and read models.
SET LOCAL search_path = entral, public;

CREATE OR REPLACE FUNCTION current_governance_action_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.governance_action_id', true), '')::uuid
$$;

CREATE TABLE canonical_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    event_type text NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    aggregate_version bigint,
    business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
    entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
    governance_action_id uuid REFERENCES governance_actions(id) ON DELETE SET NULL,
    actor_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    actor_id uuid DEFAULT current_actor_id(),
    correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    causation_id uuid,
    payload jsonb NOT NULL,
    access_classification text NOT NULL DEFAULT 'INTERNAL'
        CHECK (access_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (
        (actor_kind = 'SYSTEM' AND actor_id IS NULL)
        OR (actor_kind IN ('HUMAN','ENTITY') AND actor_id IS NOT NULL)
    )
);
CREATE INDEX canonical_events_aggregate_idx
    ON canonical_events(aggregate_type, aggregate_id, sequence_number);
CREATE INDEX canonical_events_business_idx
    ON canonical_events(business_id, sequence_number);
CREATE INDEX canonical_events_correlation_idx
    ON canonical_events(correlation_id);

CREATE TABLE audit_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
    actor_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    actor_id uuid DEFAULT current_actor_id(),
    action text NOT NULL,
    reason text,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
    entity_id uuid REFERENCES entities(id) ON DELETE SET NULL,
    governance_action_id uuid REFERENCES governance_actions(id) ON DELETE SET NULL,
    before_state jsonb,
    after_state jsonb,
    result text NOT NULL DEFAULT 'SUCCEEDED',
    rollback_point jsonb,
    evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    access_classification text NOT NULL DEFAULT 'INTERNAL'
        CHECK (access_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (
        (actor_kind = 'SYSTEM' AND actor_id IS NULL)
        OR (actor_kind IN ('HUMAN','ENTITY') AND actor_id IS NOT NULL)
    )
);
CREATE INDEX audit_entries_target_idx
    ON audit_entries(target_type, target_id, sequence_number DESC);
CREATE INDEX audit_entries_business_idx
    ON audit_entries(business_id, sequence_number DESC);
CREATE INDEX audit_entries_action_idx
    ON audit_entries(governance_action_id, sequence_number DESC);

CREATE TABLE transactional_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL UNIQUE REFERENCES canonical_events(id) ON DELETE RESTRICT,
    topic text NOT NULL,
    partition_key text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','PUBLISHING','PUBLISHED','FAILED','DEAD_LETTER')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    locked_by text,
    locked_until timestamptz,
    last_error text,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    published_at timestamptz,
    CHECK ((locked_by IS NULL) = (locked_until IS NULL)),
    CHECK ((status = 'PUBLISHED') = (published_at IS NOT NULL))
);
CREATE INDEX transactional_outbox_due_idx
    ON transactional_outbox(status, available_at)
    WHERE status IN ('PENDING','FAILED');

CREATE TABLE state_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    aggregate_version bigint,
    snapshot jsonb NOT NULL,
    reason text NOT NULL,
    governance_action_id uuid REFERENCES governance_actions(id) ON DELETE SET NULL,
    created_by_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    created_by_id uuid DEFAULT current_actor_id(),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (
        (created_by_kind = 'SYSTEM' AND created_by_id IS NULL)
        OR (created_by_kind IN ('HUMAN','ENTITY') AND created_by_id IS NOT NULL)
    )
);
CREATE INDEX state_snapshots_aggregate_idx
    ON state_snapshots(aggregate_type, aggregate_id, created_at DESC);

CREATE TABLE event_consumer_offsets (
    consumer_name text PRIMARY KEY,
    last_sequence_number bigint NOT NULL DEFAULT 0 CHECK (last_sequence_number >= 0),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER event_consumer_offsets_updated_at
BEFORE UPDATE ON event_consumer_offsets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER canonical_events_immutable
BEFORE UPDATE OR DELETE ON canonical_events FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER audit_entries_immutable
BEFORE UPDATE OR DELETE ON audit_entries FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER entity_versions_immutable
BEFORE UPDATE OR DELETE ON entity_versions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
CREATE TRIGGER business_versions_immutable
BEFORE UPDATE OR DELETE ON business_versions FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE OR REPLACE FUNCTION forbid_outbox_delete()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'transactional_outbox rows cannot be deleted; mark them published or dead-lettered'
        USING ERRCODE = '55000';
END $$;
CREATE TRIGGER transactional_outbox_no_delete
BEFORE DELETE ON transactional_outbox FOR EACH ROW EXECUTE FUNCTION forbid_outbox_delete();

CREATE OR REPLACE FUNCTION validate_outbox_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY[
        'status','attempts','available_at','locked_by','locked_until',
        'last_error','published_at'
    ]::text[]
       IS DISTINCT FROM to_jsonb(OLD) - ARRAY[
        'status','attempts','available_at','locked_by','locked_until',
        'last_error','published_at'
    ]::text[] THEN
        RAISE EXCEPTION 'Outbox event identity, topic, partition key, and payload are immutable';
    END IF;
    IF OLD.status = 'PUBLISHED' AND NEW.status <> 'PUBLISHED' THEN
        RAISE EXCEPTION 'Published outbox records cannot return to a pending state';
    END IF;
    IF OLD.status = 'DEAD_LETTER' AND NEW.status <> 'DEAD_LETTER' THEN
        RAISE EXCEPTION 'Dead-letter outbox records are terminal';
    END IF;
    IF OLD.status = 'FAILED' AND NEW.status NOT IN ('FAILED','PUBLISHING','DEAD_LETTER') THEN
        RAISE EXCEPTION 'Failed outbox records must be retried through PUBLISHING or dead-lettered';
    END IF;
    IF OLD.status = 'PENDING' AND NEW.status NOT IN ('PENDING','PUBLISHING','FAILED','DEAD_LETTER') THEN
        RAISE EXCEPTION 'Pending outbox records must be claimed before publication';
    END IF;
    IF OLD.status = 'PUBLISHING' AND NEW.status NOT IN ('PUBLISHING','PUBLISHED','FAILED','DEAD_LETTER') THEN
        RAISE EXCEPTION 'Publishing outbox records have an invalid state transition';
    END IF;
    IF NEW.attempts < OLD.attempts THEN
        RAISE EXCEPTION 'Outbox attempt count cannot decrease';
    END IF;
    IF NEW.status = 'PUBLISHING' AND (NEW.locked_by IS NULL OR NEW.locked_until IS NULL) THEN
        RAISE EXCEPTION 'Publishing outbox records require an active worker lock';
    END IF;
    IF NEW.status <> 'PUBLISHING' AND (NEW.locked_by IS NOT NULL OR NEW.locked_until IS NOT NULL) THEN
        RAISE EXCEPTION 'Only publishing outbox records may retain a worker lock';
    END IF;
    IF NEW.status = 'PUBLISHED' AND NEW.published_at IS NULL THEN
        RAISE EXCEPTION 'Published outbox records require published_at';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER transactional_outbox_validate_update
BEFORE UPDATE ON transactional_outbox
FOR EACH ROW EXECUTE FUNCTION validate_outbox_update();

CREATE OR REPLACE FUNCTION emit_canonical_event(
    p_event_type text,
    p_aggregate_type text,
    p_aggregate_id uuid,
    p_aggregate_version bigint,
    p_business_id uuid,
    p_entity_id uuid,
    p_governance_action_id uuid,
    p_payload jsonb,
    p_access_classification text DEFAULT 'INTERNAL',
    p_correlation_id uuid DEFAULT NULL,
    p_causation_id uuid DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    emitted_id uuid;
    effective_correlation uuid := COALESCE(p_correlation_id, gen_random_uuid());
BEGIN
    INSERT INTO canonical_events(
        event_type, aggregate_type, aggregate_id, aggregate_version,
        business_id, entity_id, governance_action_id,
        correlation_id, causation_id, payload, access_classification
    ) VALUES (
        p_event_type, p_aggregate_type, p_aggregate_id, p_aggregate_version,
        p_business_id, p_entity_id, p_governance_action_id,
        effective_correlation, p_causation_id, p_payload, p_access_classification
    ) RETURNING id INTO emitted_id;

    INSERT INTO transactional_outbox(event_id, topic, partition_key, payload)
    SELECT
        id,
        'entral.canonical-events',
        p_aggregate_type || ':' || p_aggregate_id::text,
        jsonb_build_object(
            'event_id', id,
            'sequence_number', sequence_number,
            'event_type', event_type,
            'aggregate_type', aggregate_type,
            'aggregate_id', aggregate_id,
            'aggregate_version', aggregate_version,
            'business_id', business_id,
            'entity_id', entity_id,
            'governance_action_id', governance_action_id,
            'actor_kind', actor_kind,
            'actor_id', actor_id,
            'correlation_id', correlation_id,
            'causation_id', causation_id,
            'access_classification', access_classification,
            'payload', payload,
            'occurred_at', occurred_at
        )
    FROM canonical_events WHERE id = emitted_id;

    RETURN emitted_id;
END $$;

CREATE OR REPLACE FUNCTION maximum_access_classification(
    p_left text,
    p_right text
) RETURNS text
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
    SELECT CASE GREATEST(
        CASE COALESCE(p_left, 'PUBLIC')
            WHEN 'PUBLIC' THEN 0 WHEN 'INTERNAL' THEN 1
            WHEN 'CONFIDENTIAL' THEN 2 ELSE 3 END,
        CASE COALESCE(p_right, 'PUBLIC')
            WHEN 'PUBLIC' THEN 0 WHEN 'INTERNAL' THEN 1
            WHEN 'CONFIDENTIAL' THEN 2 ELSE 3 END
    )
        WHEN 0 THEN 'PUBLIC'
        WHEN 1 THEN 'INTERNAL'
        WHEN 2 THEN 'CONFIDENTIAL'
        ELSE 'RESTRICTED'
    END
$$;

CREATE OR REPLACE FUNCTION audit_row_access_classification(
    p_table_name text,
    p_row jsonb
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    linked_classification text;
    linked_refs jsonb;
    subject_classification text;
BEGIN
    IF p_row IS NULL THEN
        RETURN 'PUBLIC';
    END IF;
    IF p_table_name = 'artifacts' THEN
        RETURN COALESCE(p_row->>'classification', 'RESTRICTED');
    ELSIF p_table_name = 'memory_items' THEN
        RETURN COALESCE(p_row->>'access_classification', 'RESTRICTED');
    ELSIF p_table_name = 'context_manifests' THEN
        RETURN phase150_record_refs_max_classification(p_row->'included_record_refs');
    ELSIF p_table_name = 'retrieval_logs' THEN
        RETURN maximum_access_classification(
            phase150_record_refs_max_classification(p_row->'selected_refs'),
            phase150_record_refs_max_classification(p_row->'excluded_refs')
        );
    ELSIF p_table_name = 'evidence_links' THEN
        SELECT classification INTO linked_classification
        FROM artifacts
        WHERE id = NULLIF(p_row->>'artifact_id', '')::uuid;
        RETURN COALESCE(linked_classification, 'RESTRICTED');
    ELSIF p_table_name = 'ai_runs' THEN
        SELECT included_record_refs INTO linked_refs
        FROM context_manifests
        WHERE id = NULLIF(p_row->>'context_manifest_id', '')::uuid;
        RETURN CASE WHEN FOUND
            THEN phase150_record_refs_max_classification(linked_refs)
            ELSE 'RESTRICTED'
        END;
    ELSIF p_table_name IN ('ai_steps','tool_calls') THEN
        SELECT manifest.included_record_refs INTO linked_refs
        FROM ai_runs run
        JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
        WHERE run.id = NULLIF(p_row->>'ai_run_id', '')::uuid;
        RETURN CASE WHEN FOUND
            THEN phase150_record_refs_max_classification(linked_refs)
            ELSE 'RESTRICTED'
        END;
    ELSIF p_table_name IN ('health_assessments','recommendations') THEN
        SELECT manifest.included_record_refs INTO linked_refs
        FROM ai_runs run
        JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
        WHERE run.id = NULLIF(p_row->>'ai_run_id', '')::uuid;
        linked_classification := CASE WHEN FOUND
            THEN phase150_record_refs_max_classification(linked_refs)
            WHEN NULLIF(p_row->>'ai_run_id', '') IS NULL THEN 'PUBLIC'
            ELSE 'RESTRICTED'
        END;
        RETURN maximum_access_classification(
            linked_classification,
            phase150_record_refs_max_classification(p_row->'evidence_refs')
        );
    ELSIF p_table_name = 'verification_results' THEN
        subject_classification := 'INTERNAL';
        CASE p_row->>'subject_type'
            WHEN 'AI_RUN' THEN
                SELECT manifest.included_record_refs INTO linked_refs
                FROM ai_runs run
                JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
                WHERE run.id = NULLIF(p_row->>'subject_id', '')::uuid;
            WHEN 'AI_STEP' THEN
                SELECT manifest.included_record_refs INTO linked_refs
                FROM ai_steps step
                JOIN ai_runs run ON run.id = step.ai_run_id
                JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
                WHERE step.id = NULLIF(p_row->>'subject_id', '')::uuid;
            WHEN 'TOOL_CALL' THEN
                SELECT manifest.included_record_refs INTO linked_refs
                FROM tool_calls call
                JOIN ai_runs run ON run.id = call.ai_run_id
                JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
                WHERE call.id = NULLIF(p_row->>'subject_id', '')::uuid;
            WHEN 'HEALTH_ASSESSMENT' THEN
                SELECT
                    CASE WHEN health.ai_run_id IS NULL THEN '[]'::jsonb
                        ELSE manifest.included_record_refs END
                INTO linked_refs
                FROM health_assessments health
                LEFT JOIN ai_runs run ON run.id = health.ai_run_id
                LEFT JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
                WHERE health.id = NULLIF(p_row->>'subject_id', '')::uuid;
            WHEN 'RECOMMENDATION' THEN
                SELECT
                    CASE WHEN recommendation.ai_run_id IS NULL THEN '[]'::jsonb
                        ELSE manifest.included_record_refs END
                INTO linked_refs
                FROM recommendations recommendation
                LEFT JOIN ai_runs run ON run.id = recommendation.ai_run_id
                LEFT JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
                WHERE recommendation.id = NULLIF(p_row->>'subject_id', '')::uuid;
            ELSE
                linked_refs := '[]'::jsonb;
        END CASE;
        IF linked_refs IS NULL AND p_row->>'subject_type' IN (
            'AI_RUN','AI_STEP','TOOL_CALL','HEALTH_ASSESSMENT','RECOMMENDATION'
        ) THEN
            subject_classification := 'RESTRICTED';
        ELSE
            subject_classification := phase150_record_refs_max_classification(linked_refs);
        END IF;
        RETURN maximum_access_classification(
            subject_classification,
            phase150_record_refs_max_classification(p_row->'evidence_refs')
        );
    END IF;
    RETURN 'INTERNAL';
EXCEPTION WHEN invalid_text_representation THEN
    RETURN 'RESTRICTED';
END $$;

CREATE OR REPLACE FUNCTION audit_and_emit_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    before_json jsonb;
    after_json jsonb;
    effective_json jsonb;
    aggregate_id uuid;
    aggregate_version bigint;
    business_scope uuid;
    entity_scope uuid;
    governance_id uuid := current_governance_action_id();
    event_id uuid;
    effective_classification text;
    target_type text := upper(TG_TABLE_NAME);
    action_name text := TG_TABLE_NAME || '.' || lower(TG_OP);
    correlation uuid := COALESCE(
        NULLIF(current_setting('app.correlation_id', true), '')::uuid,
        gen_random_uuid()
    );
BEGIN
    IF TG_OP = 'INSERT' THEN
        after_json := to_jsonb(NEW);
        effective_json := after_json;
    ELSIF TG_OP = 'UPDATE' THEN
        before_json := to_jsonb(OLD);
        after_json := to_jsonb(NEW);
        effective_json := after_json;
    ELSE
        before_json := to_jsonb(OLD);
        effective_json := before_json;
    END IF;

    IF TG_TABLE_NAME IN ('business_profiles', 'business_states') THEN
        aggregate_id := NULLIF(effective_json->>'business_id', '')::uuid;
    ELSE
        aggregate_id := NULLIF(effective_json->>'id', '')::uuid;
    END IF;

    IF aggregate_id IS NULL THEN
        IF TG_TABLE_NAME = 'idempotency_keys' THEN
            aggregate_id := md5(effective_json->>'key')::uuid;
        ELSE
            RAISE EXCEPTION 'Automatic event trigger cannot resolve aggregate ID for table %', TG_TABLE_NAME;
        END IF;
    END IF;

    aggregate_version := NULLIF(effective_json->>'version', '')::bigint;

    IF TG_TABLE_NAME = 'operational_messages' THEN
        SELECT COALESCE(sender.business_id, recipient.business_id)
        INTO business_scope
        FROM (SELECT 1) anchor
        LEFT JOIN entities sender
          ON sender.id = NULLIF(effective_json->>'sender_entity_id', '')::uuid
        LEFT JOIN entities recipient
          ON recipient.id = NULLIF(effective_json->>'recipient_entity_id', '')::uuid;
    ELSIF effective_json ? 'business_id' THEN
        business_scope := NULLIF(effective_json->>'business_id', '')::uuid;
    ELSIF TG_TABLE_NAME = 'idempotency_keys' THEN
        CASE effective_json->>'scope_type'
            WHEN 'BUSINESS' THEN
                business_scope := NULLIF(effective_json->>'scope_id', '')::uuid;
            WHEN 'ENTITY' THEN
                SELECT business_id INTO business_scope
                FROM entities
                WHERE id = NULLIF(effective_json->>'scope_id', '')::uuid;
            WHEN 'MISSION' THEN
                SELECT business_id INTO business_scope
                FROM missions
                WHERE id = NULLIF(effective_json->>'scope_id', '')::uuid;
            ELSE
                business_scope := NULL;
        END CASE;
    ELSIF TG_TABLE_NAME = 'businesses' OR TG_TABLE_NAME = 'business_states' THEN
        business_scope := aggregate_id;
    END IF;

    IF TG_TABLE_NAME = 'operational_messages' THEN
        entity_scope := COALESCE(
            NULLIF(effective_json->>'sender_entity_id', '')::uuid,
            NULLIF(effective_json->>'recipient_entity_id', '')::uuid
        );
    ELSIF TG_TABLE_NAME = 'entities' THEN
        entity_scope := aggregate_id;
    ELSIF TG_TABLE_NAME = 'idempotency_keys'
       AND effective_json->>'scope_type' = 'ENTITY' THEN
        entity_scope := NULLIF(effective_json->>'scope_id', '')::uuid;
    ELSIF effective_json ? 'entity_id' THEN
        entity_scope := NULLIF(effective_json->>'entity_id', '')::uuid;
    ELSIF effective_json ? 'owner_entity_id' THEN
        entity_scope := NULLIF(effective_json->>'owner_entity_id', '')::uuid;
    END IF;

    IF TG_TABLE_NAME = 'governance_actions' THEN
        governance_id := aggregate_id;
    END IF;

    effective_classification := maximum_access_classification(
        audit_row_access_classification(TG_TABLE_NAME, before_json),
        audit_row_access_classification(TG_TABLE_NAME, after_json)
    );

    INSERT INTO audit_entries(
        action, reason, target_type, target_id, business_id, entity_id,
        governance_action_id, before_state, after_state,
        access_classification, correlation_id
    ) VALUES (
        action_name, current_action_reason(), target_type, aggregate_id, business_scope, entity_scope,
        governance_id, before_json, after_json, effective_classification, correlation
    );

    event_id := emit_canonical_event(
        action_name,
        target_type,
        aggregate_id,
        aggregate_version,
        business_scope,
        entity_scope,
        governance_id,
        jsonb_build_object(
            'operation', TG_OP,
            'before', before_json,
            'after', after_json
        ),
        effective_classification,
        correlation,
        NULL
    );

    RETURN COALESCE(NEW, OLD);
END $$;

REVOKE ALL ON FUNCTION emit_canonical_event(
    text, text, uuid, bigint, uuid, uuid, uuid, jsonb, text, uuid, uuid
) FROM PUBLIC;
REVOKE ALL ON FUNCTION maximum_access_classification(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION audit_row_access_classification(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION audit_and_emit_row_change() FROM PUBLIC;

CREATE TRIGGER entities_audit_event
AFTER INSERT OR UPDATE OR DELETE ON entities
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER businesses_audit_event
AFTER INSERT OR UPDATE OR DELETE ON businesses
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER business_states_audit_event
AFTER INSERT OR UPDATE OR DELETE ON business_states
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER missions_audit_event
AFTER INSERT OR UPDATE OR DELETE ON missions
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER tasks_audit_event
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER operational_messages_audit_event
AFTER INSERT OR UPDATE OR DELETE ON operational_messages
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER governance_actions_audit_event
AFTER INSERT OR UPDATE OR DELETE ON governance_actions
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER model_profiles_audit_event
AFTER INSERT OR UPDATE OR DELETE ON model_profiles
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER tool_definitions_audit_event
AFTER INSERT OR UPDATE OR DELETE ON tool_definitions
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER tool_grants_audit_event
AFTER INSERT OR UPDATE OR DELETE ON tool_grants
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER idempotency_keys_audit_event
AFTER INSERT OR UPDATE OR DELETE ON idempotency_keys
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER schedules_audit_event
AFTER INSERT OR UPDATE OR DELETE ON schedules
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER health_assessments_audit_event
AFTER INSERT OR UPDATE OR DELETE ON health_assessments
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER recommendations_audit_event
AFTER INSERT OR UPDATE OR DELETE ON recommendations
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER decisions_audit_event
AFTER INSERT OR UPDATE OR DELETE ON decisions
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER app_users_audit_event
AFTER INSERT OR UPDATE OR DELETE ON app_users
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER scope_grants_audit_event
AFTER INSERT OR UPDATE OR DELETE ON scope_grants
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER taxonomy_versions_audit_event
AFTER INSERT OR UPDATE OR DELETE ON taxonomy_versions
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER business_profiles_audit_event
AFTER INSERT OR UPDATE OR DELETE ON business_profiles
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER financial_snapshots_audit_event
AFTER INSERT OR UPDATE OR DELETE ON financial_snapshots
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER prompt_versions_audit_event
AFTER INSERT OR UPDATE OR DELETE ON prompt_versions
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER policy_versions_audit_event
AFTER INSERT OR UPDATE OR DELETE ON policy_versions
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER authority_profiles_audit_event
AFTER INSERT OR UPDATE OR DELETE ON authority_profiles
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER credential_references_audit_event
AFTER INSERT OR UPDATE OR DELETE ON credential_references
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER governance_action_steps_audit_event
AFTER INSERT OR UPDATE OR DELETE ON governance_action_steps
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER policy_checks_audit_event
AFTER INSERT OR UPDATE OR DELETE ON policy_checks
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER source_records_audit_event
AFTER INSERT OR UPDATE OR DELETE ON source_records
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER artifacts_audit_event
AFTER INSERT OR UPDATE OR DELETE ON artifacts
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER memory_items_audit_event
AFTER INSERT OR UPDATE OR DELETE ON memory_items
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER context_manifests_audit_event
AFTER INSERT OR UPDATE OR DELETE ON context_manifests
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER ai_runs_audit_event
AFTER INSERT OR UPDATE OR DELETE ON ai_runs
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER ai_steps_audit_event
AFTER INSERT OR UPDATE OR DELETE ON ai_steps
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER tool_calls_audit_event
AFTER INSERT OR UPDATE OR DELETE ON tool_calls
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER verification_results_audit_event
AFTER INSERT OR UPDATE OR DELETE ON verification_results
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER evidence_links_audit_event
AFTER INSERT OR UPDATE OR DELETE ON evidence_links
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER experiments_audit_event
AFTER INSERT OR UPDATE OR DELETE ON experiments
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER outcomes_audit_event
AFTER INSERT OR UPDATE OR DELETE ON outcomes
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER metric_definitions_audit_event
AFTER INSERT OR UPDATE OR DELETE ON metric_definitions
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER metric_observations_audit_event
AFTER INSERT OR UPDATE OR DELETE ON metric_observations
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER cost_records_audit_event
AFTER INSERT OR UPDATE OR DELETE ON cost_records
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER resource_usage_audit_event
AFTER INSERT OR UPDATE OR DELETE ON resource_usage
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER retrieval_logs_audit_event
AFTER INSERT OR UPDATE OR DELETE ON retrieval_logs
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();
CREATE TRIGGER state_snapshots_audit_event
AFTER INSERT OR UPDATE OR DELETE ON state_snapshots
FOR EACH ROW EXECUTE FUNCTION audit_and_emit_row_change();

CREATE OR REPLACE VIEW v_entity_summary WITH (security_invoker = true) AS
SELECT
    e.id AS entity_id,
    e.stable_code,
    e.role AS entity_type,
    e.name,
    e.status,
    CASE
        WHEN bs.health_state IS NOT NULL THEN bs.health_state::text
        WHEN e.status = 'DEGRADED' THEN 'DEGRADED'
        WHEN e.status = 'PAUSED' THEN 'WATCH'
        WHEN e.status = 'ACTIVE' THEN 'HEALTHY'
        ELSE 'UNKNOWN'
    END AS health,
    e.parent_id,
    (SELECT count(*) FROM entities c WHERE c.parent_id = e.id AND c.status <> 'RETIRED') AS child_count,
    e.business_id AS assigned_business_id,
    mp.model_name AS model_class,
    mp.compute_tier,
    (
        SELECT m.objective FROM missions m
        WHERE m.owner_entity_id = e.id AND m.status IN ('ROUTING','ACKNOWLEDGED','ACTIVE','BLOCKED')
        ORDER BY m.priority DESC, m.created_at DESC LIMIT 1
    ) AS current_mission,
    (
        SELECT count(*) FROM tasks t
        WHERE t.owner_entity_id = e.id AND t.status IN ('NOT_STARTED','ACTIVE','BLOCKED')
    ) AS active_task_count,
    (
        SELECT t.result FROM tasks t
        WHERE t.owner_entity_id = e.id AND t.result IS NOT NULL
        ORDER BY t.completed_at DESC NULLS LAST, t.updated_at DESC LIMIT 1
    ) AS latest_material_result,
    CASE
        WHEN e.status = 'DEGRADED' THEN 'Entity is degraded'
        WHEN e.status = 'PAUSED' THEN 'Entity is paused'
        ELSE bs.top_exception
    END AS active_alert,
    e.version,
    e.updated_at
FROM entities e
LEFT JOIN businesses b ON b.id = e.business_id
LEFT JOIN business_states bs ON bs.business_id = b.id
LEFT JOIN model_profiles mp ON mp.id = e.model_profile_id;

CREATE OR REPLACE VIEW v_business_summary WITH (security_invoker = true) AS
SELECT
    b.id AS business_id,
    b.stable_code,
    b.name AS business_name,
    b.commander_id,
    b.marshal_id,
    marshal.name AS marshal_name,
    b.general_id,
    general.name AS general_name,
    b.status,
    bs.health_state,
    bs.health_score,
    bs.health_drivers,
    fs.period_start AS revenue_period_start,
    fs.period_end AS revenue_period_end,
    fs.gross_revenue,
    fs.net_contribution,
    fs.capital_available,
    fs.currency,
    (
        SELECT count(*) FROM entities e
        WHERE e.business_id = b.id AND e.status <> 'RETIRED'
    ) AS agent_count,
    (
        SELECT count(DISTINCT tg.tool_id) FROM tool_grants tg
        WHERE tg.business_id = b.id
          AND (tg.expires_at IS NULL OR tg.expires_at > clock_timestamp())
    ) AS tool_count,
    (
        SELECT count(*) FROM schedules s
        WHERE s.business_id = b.id AND s.status = 'ACTIVE'
    ) AS automation_count,
    (
        SELECT count(*) FROM credential_references cr
        WHERE cr.owning_business_id = b.id AND cr.status = 'ACTIVE'
    ) AS integration_count,
    (
        SELECT count(*) FROM missions m
        WHERE m.business_id = b.id AND m.status IN ('ROUTING','ACKNOWLEDGED','ACTIVE','BLOCKED')
    ) AS active_mission_count,
    (
        SELECT count(*) FROM tasks t
        WHERE t.business_id = b.id AND t.status IN ('NOT_STARTED','ACTIVE','BLOCKED')
    ) AS active_task_count,
    COALESCE(bs.primary_objective, b.primary_objective) AS primary_objective,
    bs.top_exception,
    rec.objective AS top_recommendation,
    b.version,
    b.updated_at,
    bs.source_freshness
FROM businesses b
JOIN entities marshal ON marshal.id = b.marshal_id
JOIN entities general ON general.id = b.general_id
LEFT JOIN business_states bs ON bs.business_id = b.id
LEFT JOIN LATERAL (
    SELECT f.* FROM financial_snapshots f
    WHERE f.business_id = b.id
    ORDER BY f.period_end DESC, f.observed_at DESC
    LIMIT 1
) fs ON true
LEFT JOIN LATERAL (
    SELECT r.objective FROM recommendations r
    WHERE r.business_id = b.id
      AND r.status = 'OPEN'
      AND (r.expires_at IS NULL OR r.expires_at > clock_timestamp())
    ORDER BY r.confidence DESC NULLS LAST, r.created_at DESC
    LIMIT 1
) rec ON true;

CREATE OR REPLACE VIEW v_audit_timeline WITH (security_invoker = true) AS
SELECT
    ae.sequence_number,
    ae.occurred_at,
    ae.actor_kind,
    ae.actor_id,
    ae.action,
    ae.reason,
    ae.target_type,
    ae.target_id,
    ae.business_id,
    ae.entity_id,
    ae.governance_action_id,
    ae.result,
    ae.before_state,
    ae.after_state,
    ae.evidence_refs,
    ae.correlation_id
FROM audit_entries ae;

COMMIT;
