-- Phase 140 repository migration. Canonical source order is preserved inside a rollback-safe transaction.
BEGIN;
-- ENTRAL migration 003: authority, models, tools, missions, schedules, messages, and governance actions.
SET LOCAL search_path = entral, public;

CREATE OR REPLACE FUNCTION increment_row_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY['version','updated_at']::text[]
       IS DISTINCT FROM to_jsonb(OLD) - ARRAY['version','updated_at']::text[] THEN
        NEW.version := OLD.version + 1;
    END IF;
    RETURN NEW;
END $$;

CREATE TABLE model_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    provider text NOT NULL,
    model_name text NOT NULL,
    model_version text,
    compute_tier text NOT NULL DEFAULT 'standard',
    context_limit_tokens integer CHECK (context_limit_tokens IS NULL OR context_limit_tokens > 0),
    input_cost_per_million numeric(20,8),
    output_cost_per_million numeric(20,8),
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER model_profiles_updated_at
BEFORE UPDATE ON model_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE prompt_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL,
    semantic_version text NOT NULL,
    role entity_role,
    purpose text NOT NULL,
    content_sha256 text NOT NULL,
    content_uri text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (stable_code, semantic_version)
);

CREATE TABLE policy_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL,
    semantic_version text NOT NULL,
    policy_type text NOT NULL,
    content jsonb NOT NULL,
    content_sha256 text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    effective_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    retired_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (stable_code, semantic_version),
    CHECK ((is_active AND retired_at IS NULL) OR (NOT is_active))
);

CREATE TABLE authority_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    name text NOT NULL,
    allowed_action_types governance_action_type[] NOT NULL DEFAULT '{}'::governance_action_type[],
    allowed_tool_risk risk_class NOT NULL DEFAULT 'LOW',
    max_single_action_cost numeric(20,4),
    max_daily_cost numeric(20,4),
    confidence_floor numeric(5,4) CHECK (confidence_floor IS NULL OR confidence_floor BETWEEN 0 AND 1),
    requires_human_for text[] NOT NULL DEFAULT '{}'::text[],
    policy_version_id uuid REFERENCES policy_versions(id),
    constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER authority_profiles_updated_at
BEFORE UPDATE ON authority_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE entities
    ADD CONSTRAINT entities_model_profile_fk
    FOREIGN KEY (model_profile_id) REFERENCES model_profiles(id);
ALTER TABLE entities
    ADD CONSTRAINT entities_authority_profile_fk
    FOREIGN KEY (authority_profile_id) REFERENCES authority_profiles(id);

CREATE TABLE tool_definitions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    name text NOT NULL,
    provider text NOT NULL,
    description text NOT NULL,
    risk_class risk_class NOT NULL DEFAULT 'LOW',
    input_schema jsonb NOT NULL,
    output_schema jsonb NOT NULL,
    adapter_ref text NOT NULL,
    idempotency_supported boolean NOT NULL DEFAULT false,
    rollback_supported boolean NOT NULL DEFAULT false,
    verification_contract jsonb NOT NULL DEFAULT '{}'::jsonb,
    rate_limits jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER tool_definitions_increment_version
BEFORE UPDATE ON tool_definitions FOR EACH ROW EXECUTE FUNCTION increment_row_version();
CREATE TRIGGER tool_definitions_updated_at
BEFORE UPDATE ON tool_definitions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE credential_references (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    provider text NOT NULL,
    secret_manager text NOT NULL,
    secret_reference text NOT NULL,
    owning_business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    allowed_tool_id uuid REFERENCES tool_definitions(id),
    allowed_actions text[] NOT NULL DEFAULT '{}'::text[],
    expires_at timestamptz,
    rotation_due_at timestamptz,
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED','EXPIRED','REVOKED')),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (secret_reference <> '')
);
CREATE TRIGGER credential_references_updated_at
BEFORE UPDATE ON credential_references FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE tool_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    tool_id uuid NOT NULL REFERENCES tool_definitions(id),
    business_id uuid REFERENCES businesses(id) ON DELETE CASCADE,
    credential_reference_id uuid REFERENCES credential_references(id),
    allowed_actions text[] NOT NULL,
    data_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
    spend_limit numeric(20,4),
    call_limit integer,
    valid_from timestamptz NOT NULL DEFAULT clock_timestamp(),
    expires_at timestamptz,
    granted_by_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    granted_by_id uuid DEFAULT current_actor_id(),
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (call_limit IS NULL OR call_limit >= 0),
    CHECK (spend_limit IS NULL OR spend_limit >= 0),
    CHECK (expires_at IS NULL OR expires_at > valid_from),
    UNIQUE NULLS NOT DISTINCT (entity_id, tool_id, business_id)
);
CREATE INDEX tool_grants_business_idx ON tool_grants(business_id);
CREATE INDEX tool_grants_entity_idx ON tool_grants(entity_id);
CREATE TRIGGER tool_grants_increment_version
BEFORE UPDATE ON tool_grants FOR EACH ROW EXECUTE FUNCTION increment_row_version();
CREATE TRIGGER tool_grants_updated_at
BEFORE UPDATE ON tool_grants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_tool_grant_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    entity_business uuid;
    credential_business uuid;
    credential_tool uuid;
    credential_status text;
    credential_expires_at timestamptz;
BEGIN
    SELECT business_id INTO entity_business FROM entities WHERE id = NEW.entity_id;
    IF entity_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM entity_business THEN
        RAISE EXCEPTION 'Tool grant business % must match entity business %', NEW.business_id, entity_business;
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
        IF credential_status <> 'ACTIVE'
           OR (credential_expires_at IS NOT NULL AND credential_expires_at <= CURRENT_TIMESTAMP) THEN
            RAISE EXCEPTION 'Credential reference is not active';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_tool_grant_scope_trigger
BEFORE INSERT OR UPDATE ON tool_grants
FOR EACH ROW EXECUTE FUNCTION validate_tool_grant_scope();

CREATE TABLE missions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    parent_mission_id uuid REFERENCES missions(id) DEFERRABLE INITIALLY DEFERRED,
    objective text NOT NULL,
    context jsonb NOT NULL DEFAULT '{}'::jsonb,
    issuer_user_id uuid REFERENCES app_users(id),
    issuer_entity_id uuid REFERENCES entities(id),
    owner_entity_id uuid NOT NULL REFERENCES entities(id),
    business_id uuid REFERENCES businesses(id),
    constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
    budget jsonb NOT NULL DEFAULT '{}'::jsonb,
    required_outputs jsonb NOT NULL DEFAULT '[]'::jsonb,
    success_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
    status mission_status NOT NULL DEFAULT 'DRAFT',
    priority smallint NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
    deadline timestamptz,
    acknowledged_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    version bigint NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((issuer_user_id IS NOT NULL)::int + (issuer_entity_id IS NOT NULL)::int = 1)
);
CREATE INDEX missions_owner_status_idx ON missions(owner_entity_id, status);
CREATE INDEX missions_business_status_idx ON missions(business_id, status);
CREATE TRIGGER missions_increment_version
BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION increment_row_version();
CREATE TRIGGER missions_updated_at
BEFORE UPDATE ON missions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_mission_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    owner_business uuid;
    parent_business uuid;
BEGIN
    SELECT business_id INTO owner_business FROM entities WHERE id = NEW.owner_entity_id;
    IF owner_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM owner_business THEN
        RAISE EXCEPTION 'Mission business scope must match its owner entity';
    END IF;

    IF NEW.parent_mission_id IS NOT NULL THEN
        SELECT business_id INTO parent_business FROM missions WHERE id = NEW.parent_mission_id;
        IF parent_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM parent_business THEN
            RAISE EXCEPTION 'Child mission business scope must match the parent mission';
        END IF;
    END IF;

    RETURN NEW;
END $$;
CREATE TRIGGER validate_mission_scope_trigger
BEFORE INSERT OR UPDATE OF parent_mission_id, owner_entity_id, business_id ON missions
FOR EACH ROW EXECUTE FUNCTION validate_mission_scope();

CREATE TABLE tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    mission_id uuid NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
    parent_task_id uuid REFERENCES tasks(id) DEFERRABLE INITIALLY DEFERRED,
    owner_entity_id uuid NOT NULL REFERENCES entities(id),
    business_id uuid REFERENCES businesses(id),
    objective text NOT NULL,
    inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
    constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
    required_outputs jsonb NOT NULL DEFAULT '[]'::jsonb,
    status task_status NOT NULL DEFAULT 'NOT_STARTED',
    priority smallint NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
    retry_count integer NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    max_retries integer NOT NULL DEFAULT 3 CHECK (max_retries >= 0),
    deadline timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    result jsonb,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX tasks_mission_status_idx ON tasks(mission_id, status);
CREATE INDEX tasks_owner_status_idx ON tasks(owner_entity_id, status);
CREATE INDEX tasks_business_status_idx ON tasks(business_id, status);
CREATE TRIGGER tasks_increment_version
BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION increment_row_version();
CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_task_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    mission_business uuid;
    owner_business uuid;
    parent_mission uuid;
    parent_business uuid;
BEGIN
    SELECT business_id INTO mission_business FROM missions WHERE id = NEW.mission_id;
    SELECT business_id INTO owner_business FROM entities WHERE id = NEW.owner_entity_id;

    IF mission_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM mission_business THEN
        RAISE EXCEPTION 'Task business scope must match its mission';
    END IF;
    IF owner_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM owner_business THEN
        RAISE EXCEPTION 'Task business scope must match its owner entity';
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
CREATE TRIGGER validate_task_scope_trigger
BEFORE INSERT OR UPDATE OF mission_id, parent_task_id, owner_entity_id, business_id ON tasks
FOR EACH ROW EXECUTE FUNCTION validate_task_scope();

CREATE TABLE operational_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mission_id uuid REFERENCES missions(id),
    task_id uuid REFERENCES tasks(id),
    sender_user_id uuid REFERENCES app_users(id),
    sender_entity_id uuid REFERENCES entities(id),
    recipient_user_id uuid REFERENCES app_users(id),
    recipient_entity_id uuid REFERENCES entities(id),
    message_type message_type NOT NULL,
    priority smallint NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
    payload jsonb NOT NULL,
    evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    confidence numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    status message_status NOT NULL DEFAULT 'CREATED',
    route_valid boolean NOT NULL DEFAULT false,
    route_error text,
    correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    causation_id uuid,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    delivered_at timestamptz,
    acknowledged_at timestamptz,
    CHECK ((sender_user_id IS NOT NULL)::int + (sender_entity_id IS NOT NULL)::int = 1),
    CHECK ((recipient_user_id IS NOT NULL)::int + (recipient_entity_id IS NOT NULL)::int = 1),
    CHECK (NOT (sender_user_id IS NOT NULL AND recipient_user_id IS NOT NULL)),
    CHECK (
        route_valid
        OR (status = 'REJECTED' AND delivered_at IS NULL AND acknowledged_at IS NULL)
    )
);
CREATE INDEX operational_messages_mission_idx ON operational_messages(mission_id, created_at);
CREATE INDEX operational_messages_sender_entity_idx ON operational_messages(sender_entity_id, created_at);
CREATE INDEX operational_messages_recipient_entity_idx ON operational_messages(recipient_entity_id, created_at);

CREATE OR REPLACE FUNCTION classify_message_direction(
    p_sender_user uuid,
    p_sender_entity uuid,
    p_recipient_user uuid,
    p_recipient_entity uuid
) RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    sender_role entity_role;
    recipient_role entity_role;
    sender_parent uuid;
    recipient_parent uuid;
    sender_human_authority boolean;
    recipient_human_authority boolean;
BEGIN
    IF p_sender_user IS NOT NULL THEN
        SELECT is_human_authority INTO sender_human_authority
        FROM app_users
        WHERE id = p_sender_user AND is_active;
        SELECT role INTO recipient_role FROM entities WHERE id = p_recipient_entity;
        IF COALESCE(sender_human_authority, false) AND recipient_role = 'ENTRAL' THEN RETURN 'DOWN'; END IF;
        RETURN 'INVALID';
    END IF;
    IF p_recipient_user IS NOT NULL THEN
        SELECT is_human_authority INTO recipient_human_authority
        FROM app_users
        WHERE id = p_recipient_user AND is_active;
        SELECT role INTO sender_role FROM entities WHERE id = p_sender_entity;
        IF COALESCE(recipient_human_authority, false) AND sender_role = 'ENTRAL' THEN RETURN 'UP'; END IF;
        RETURN 'INVALID';
    END IF;

    SELECT role, parent_id INTO sender_role, sender_parent FROM entities WHERE id = p_sender_entity;
    SELECT role, parent_id INTO recipient_role, recipient_parent FROM entities WHERE id = p_recipient_entity;
    IF sender_role IS NULL OR recipient_role IS NULL THEN RETURN 'INVALID'; END IF;
    IF recipient_parent = p_sender_entity THEN RETURN 'DOWN'; END IF;
    IF sender_parent = p_recipient_entity THEN RETURN 'UP'; END IF;
    RETURN 'INVALID';
END $$;

CREATE OR REPLACE FUNCTION validate_operational_message_route()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    direction text;
    downward_types message_type[] := ARRAY[
        'MissionOrder','DoctrineUpdate','BudgetGrant','PermissionGrant','TaskOrder'
    ]::message_type[];
    upward_types message_type[] := ARRAY[
        'ExecutionReport','KPIReport','Exception','Escalation','Recommendation','CompletionReport'
    ]::message_type[];
BEGIN
    direction := classify_message_direction(
        NEW.sender_user_id, NEW.sender_entity_id, NEW.recipient_user_id, NEW.recipient_entity_id
    );

    NEW.route_valid := true;
    NEW.route_error := NULL;

    IF direction = 'INVALID' THEN
        NEW.route_valid := false;
        NEW.route_error := 'Skipped-layer, peer-to-peer, or invalid Human boundary route';
    ELSIF NEW.message_type = ANY(downward_types) AND direction <> 'DOWN' THEN
        NEW.route_valid := false;
        NEW.route_error := 'Downward message type used on a non-downward route';
    ELSIF NEW.message_type = ANY(upward_types) AND direction <> 'UP' THEN
        NEW.route_valid := false;
        NEW.route_error := 'Upward message type used on a non-upward route';
    END IF;

    IF NOT NEW.route_valid THEN
        NEW.status := 'REJECTED';
        NEW.delivered_at := NULL;
        NEW.acknowledged_at := NULL;
    ELSIF NEW.status <> 'CREATED' OR NEW.delivered_at IS NOT NULL OR NEW.acknowledged_at IS NOT NULL THEN
        RAISE EXCEPTION 'A valid operational message must be inserted in CREATED state';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_operational_message_route_trigger
BEFORE INSERT ON operational_messages
FOR EACH ROW EXECUTE FUNCTION validate_operational_message_route();

CREATE OR REPLACE FUNCTION enforce_operational_message_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY['status','delivered_at','acknowledged_at']::text[]
       IS DISTINCT FROM to_jsonb(OLD) - ARRAY['status','delivered_at','acknowledged_at']::text[] THEN
        RAISE EXCEPTION 'Operational message envelope is immutable after insertion';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status = 'CREATED' AND NEW.status IN ('DELIVERED','EXPIRED'))
        OR (OLD.status = 'DELIVERED' AND NEW.status IN ('ACKNOWLEDGED','EXPIRED'))
    ) THEN
        RAISE EXCEPTION 'Invalid operational message status transition: % -> %', OLD.status, NEW.status;
    END IF;
    IF OLD.status IN ('ACKNOWLEDGED','REJECTED','EXPIRED') AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Terminal operational message status cannot change';
    END IF;
    IF OLD.delivered_at IS NOT NULL AND NEW.delivered_at IS NULL THEN
        RAISE EXCEPTION 'delivered_at cannot be cleared';
    END IF;
    IF OLD.acknowledged_at IS NOT NULL AND NEW.acknowledged_at IS NULL THEN
        RAISE EXCEPTION 'acknowledged_at cannot be cleared';
    END IF;
    IF NEW.status IN ('DELIVERED','ACKNOWLEDGED') AND NEW.delivered_at IS NULL THEN
        RAISE EXCEPTION 'Delivered or acknowledged messages require delivered_at';
    END IF;
    IF NEW.status = 'ACKNOWLEDGED' AND NEW.acknowledged_at IS NULL THEN
        RAISE EXCEPTION 'Acknowledged messages require acknowledged_at';
    END IF;
    IF NEW.acknowledged_at IS NOT NULL AND NEW.delivered_at IS NULL THEN
        RAISE EXCEPTION 'A message cannot be acknowledged before delivery';
    END IF;

    RETURN NEW;
END $$;
CREATE TRIGGER enforce_operational_message_update_trigger
BEFORE UPDATE ON operational_messages
FOR EACH ROW EXECUTE FUNCTION enforce_operational_message_update();
CREATE TRIGGER operational_messages_no_delete
BEFORE DELETE ON operational_messages
FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TABLE schedules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    owner_entity_id uuid NOT NULL REFERENCES entities(id),
    business_id uuid REFERENCES businesses(id),
    mission_template jsonb NOT NULL,
    cron_expression text,
    event_trigger jsonb,
    timezone text NOT NULL DEFAULT 'UTC',
    status schedule_status NOT NULL DEFAULT 'ACTIVE',
    concurrency_limit integer NOT NULL DEFAULT 1 CHECK (concurrency_limit > 0),
    retry_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
    next_run_at timestamptz,
    last_run_at timestamptz,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((cron_expression IS NOT NULL)::int + (event_trigger IS NOT NULL)::int = 1)
);
CREATE INDEX schedules_due_idx ON schedules(status, next_run_at) WHERE status = 'ACTIVE';
CREATE TRIGGER schedules_increment_version
BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION increment_row_version();
CREATE TRIGGER schedules_updated_at
BEFORE UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_schedule_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    owner_business uuid;
BEGIN
    SELECT business_id INTO owner_business FROM entities WHERE id = NEW.owner_entity_id;
    IF owner_business IS NOT NULL AND NEW.business_id IS DISTINCT FROM owner_business THEN
        RAISE EXCEPTION 'Schedule business scope must match its owner entity';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_schedule_scope_trigger
BEFORE INSERT OR UPDATE OF owner_entity_id, business_id ON schedules
FOR EACH ROW EXECUTE FUNCTION validate_schedule_scope();

CREATE TABLE idempotency_keys (
    key text PRIMARY KEY,
    operation text NOT NULL,
    scope_type scope_type NOT NULL,
    scope_id uuid,
    request_sha256 text NOT NULL,
    status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','SUCCEEDED','FAILED')),
    response jsonb,
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    completed_at timestamptz,
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL))
);

CREATE TABLE governance_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type governance_action_type NOT NULL,
    status action_status NOT NULL DEFAULT 'PROPOSED',
    initiated_by_kind actor_kind NOT NULL,
    initiated_by_user_id uuid REFERENCES app_users(id),
    initiated_by_entity_id uuid REFERENCES entities(id),
    target_type text NOT NULL CHECK (target_type IN (
        'ENTITY','BUSINESS','MISSION','TASK','TOOL_GRANT','SCHEDULE','POLICY',
        'GOVERNANCE_ACTION','SYSTEM'
    )),
    target_id uuid,
    business_id uuid REFERENCES businesses(id),
    requested_outcome text NOT NULL,
    reason text NOT NULL,
    authority_basis jsonb NOT NULL,
    risk_class risk_class NOT NULL,
    confidence numeric(5,4) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    proposed_changes jsonb NOT NULL,
    expected_version bigint NOT NULL CHECK (expected_version >= 0),
    before_state jsonb,
    after_state jsonb,
    rollback_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
    verification_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
    idempotency_key text REFERENCES idempotency_keys(key),
    correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
    causation_id uuid,
    failure_code text,
    failure_detail text,
    requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    authorized_at timestamptz,
    started_at timestamptz,
    completed_at timestamptz,
    rolled_back_at timestamptz,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (
        (initiated_by_kind = 'HUMAN' AND initiated_by_user_id IS NOT NULL AND initiated_by_entity_id IS NULL) OR
        (initiated_by_kind = 'ENTITY' AND initiated_by_user_id IS NULL AND initiated_by_entity_id IS NOT NULL) OR
        (initiated_by_kind = 'SYSTEM' AND initiated_by_user_id IS NULL AND initiated_by_entity_id IS NULL)
    ),
    CHECK ((target_type = 'SYSTEM' AND target_id IS NULL) OR (target_type <> 'SYSTEM' AND target_id IS NOT NULL)),
    CHECK (status NOT IN ('SUCCEEDED','FAILED','REJECTED') OR completed_at IS NOT NULL),
    CHECK (status <> 'ROLLED_BACK' OR rolled_back_at IS NOT NULL)
);
CREATE INDEX governance_actions_target_idx ON governance_actions(target_type, target_id, requested_at DESC);
CREATE INDEX governance_actions_business_idx ON governance_actions(business_id, requested_at DESC);
CREATE INDEX governance_actions_status_idx ON governance_actions(status, requested_at);
CREATE TRIGGER governance_actions_increment_version
BEFORE UPDATE ON governance_actions FOR EACH ROW EXECUTE FUNCTION increment_row_version();
CREATE TRIGGER governance_actions_updated_at
BEFORE UPDATE ON governance_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION validate_governance_initiator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    initiator_role entity_role;
    human_authority boolean;
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status <> 'PROPOSED' THEN
        RAISE EXCEPTION 'Governance actions must be inserted in PROPOSED state';
    END IF;

    IF NEW.initiated_by_kind = 'HUMAN' THEN
        SELECT is_human_authority INTO human_authority FROM app_users WHERE id = NEW.initiated_by_user_id;
        IF COALESCE(human_authority, false) IS NOT TRUE THEN
            RAISE EXCEPTION 'Governance action Human initiator must hold human authority';
        END IF;
    ELSIF NEW.initiated_by_kind = 'ENTITY' THEN
        SELECT role INTO initiator_role FROM entities WHERE id = NEW.initiated_by_entity_id;
        IF initiator_role <> 'ENTRAL' THEN
            RAISE EXCEPTION 'Only ENTRAL may initiate sovereign entity governance actions';
        END IF;
    ELSIF NEW.initiated_by_kind = 'SYSTEM' THEN
        RAISE EXCEPTION 'SYSTEM cannot initiate sovereign governance actions';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_governance_initiator_trigger
BEFORE INSERT OR UPDATE OF initiated_by_kind, initiated_by_user_id, initiated_by_entity_id
ON governance_actions
FOR EACH ROW EXECUTE FUNCTION validate_governance_initiator();

CREATE OR REPLACE FUNCTION validate_governance_target()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    resolved_business uuid;
    target_exists boolean := false;
BEGIN
    CASE NEW.target_type
        WHEN 'SYSTEM' THEN
            target_exists := NEW.target_id IS NULL;
            IF NEW.business_id IS NOT NULL THEN
                RAISE EXCEPTION 'SYSTEM governance actions cannot be business-scoped';
            END IF;
        WHEN 'ENTITY' THEN
            SELECT true, business_id INTO target_exists, resolved_business
            FROM entities WHERE id = NEW.target_id;
        WHEN 'BUSINESS' THEN
            SELECT true, id INTO target_exists, resolved_business
            FROM businesses WHERE id = NEW.target_id;
        WHEN 'MISSION' THEN
            SELECT true, business_id INTO target_exists, resolved_business
            FROM missions WHERE id = NEW.target_id;
        WHEN 'TASK' THEN
            SELECT true, business_id INTO target_exists, resolved_business
            FROM tasks WHERE id = NEW.target_id;
        WHEN 'TOOL_GRANT' THEN
            SELECT true, business_id INTO target_exists, resolved_business
            FROM tool_grants WHERE id = NEW.target_id;
        WHEN 'SCHEDULE' THEN
            SELECT true, business_id INTO target_exists, resolved_business
            FROM schedules WHERE id = NEW.target_id;
        WHEN 'POLICY' THEN
            SELECT true INTO target_exists
            FROM policy_versions WHERE id = NEW.target_id;
            IF NEW.business_id IS NOT NULL THEN
                RAISE EXCEPTION 'Global policy governance actions cannot be business-scoped';
            END IF;
        WHEN 'GOVERNANCE_ACTION' THEN
            SELECT true, business_id INTO target_exists, resolved_business
            FROM governance_actions WHERE id = NEW.target_id;
        ELSE
            target_exists := false;
    END CASE;

    IF COALESCE(target_exists, false) IS NOT TRUE THEN
        RAISE EXCEPTION 'Governance target % % does not exist', NEW.target_type, NEW.target_id;
    END IF;
    IF NEW.target_type = 'GOVERNANCE_ACTION' AND NEW.target_id = NEW.id THEN
        RAISE EXCEPTION 'A governance action cannot target itself';
    END IF;

    IF NEW.target_type IN (
        'ENTITY','BUSINESS','MISSION','TASK','TOOL_GRANT','SCHEDULE','GOVERNANCE_ACTION'
    ) AND NEW.business_id IS DISTINCT FROM resolved_business THEN
        RAISE EXCEPTION 'Governance action business scope must exactly match its target business scope';
    END IF;

    RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER validate_governance_target_trigger
AFTER INSERT OR UPDATE OF target_type, target_id, business_id
ON governance_actions
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_governance_target();

CREATE OR REPLACE FUNCTION enforce_governance_action_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY[
        'status','before_state','after_state','failure_code','failure_detail',
        'authorized_at','started_at','completed_at','rolled_back_at',
        'verification_result_id','version','updated_at'
    ]::text[]
       IS DISTINCT FROM to_jsonb(OLD) - ARRAY[
        'status','before_state','after_state','failure_code','failure_detail',
        'authorized_at','started_at','completed_at','rolled_back_at',
        'verification_result_id','version','updated_at'
    ]::text[] THEN
        RAISE EXCEPTION 'Governance action request envelope is immutable after insertion';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status = 'PROPOSED' AND NEW.status IN ('VALIDATING','REJECTED'))
        OR (OLD.status = 'VALIDATING' AND NEW.status IN ('AUTHORIZED','REJECTED','FAILED'))
        OR (OLD.status = 'AUTHORIZED' AND NEW.status IN ('EXECUTING','REJECTED','FAILED'))
        OR (OLD.status = 'EXECUTING' AND NEW.status IN ('VERIFYING','FAILED'))
        OR (OLD.status = 'VERIFYING' AND NEW.status IN ('SUCCEEDED','FAILED'))
        OR (OLD.status IN ('SUCCEEDED','FAILED') AND NEW.status = 'ROLLED_BACK')
    ) THEN
        RAISE EXCEPTION 'Invalid governance action status transition: % -> %', OLD.status, NEW.status;
    END IF;

    IF OLD.status IN ('ROLLED_BACK','REJECTED') AND NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'Terminal governance action status cannot change';
    END IF;
    IF NEW.status IN ('AUTHORIZED','EXECUTING','VERIFYING','SUCCEEDED','ROLLED_BACK')
       AND NEW.authorized_at IS NULL THEN
        RAISE EXCEPTION 'Authorized or later governance states require authorized_at';
    END IF;
    IF NEW.status IN ('EXECUTING','VERIFYING','SUCCEEDED','ROLLED_BACK')
       AND NEW.started_at IS NULL THEN
        RAISE EXCEPTION 'Execution or later governance states require started_at';
    END IF;
    IF OLD.authorized_at IS NOT NULL AND NEW.authorized_at IS NULL THEN
        RAISE EXCEPTION 'authorized_at cannot be cleared';
    END IF;
    IF OLD.started_at IS NOT NULL AND NEW.started_at IS NULL THEN
        RAISE EXCEPTION 'started_at cannot be cleared';
    END IF;
    IF OLD.completed_at IS NOT NULL AND NEW.completed_at IS NULL THEN
        RAISE EXCEPTION 'completed_at cannot be cleared';
    END IF;
    IF OLD.rolled_back_at IS NOT NULL AND NEW.rolled_back_at IS NULL THEN
        RAISE EXCEPTION 'rolled_back_at cannot be cleared';
    END IF;

    RETURN NEW;
END $$;
CREATE TRIGGER enforce_governance_action_update_trigger
BEFORE UPDATE ON governance_actions
FOR EACH ROW EXECUTE FUNCTION enforce_governance_action_update();

REVOKE ALL ON FUNCTION validate_tool_grant_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_mission_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_task_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION classify_message_direction(uuid, uuid, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_operational_message_route() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_schedule_scope() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_governance_initiator() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_governance_target() FROM PUBLIC;
REVOKE ALL ON FUNCTION enforce_governance_action_update() FROM PUBLIC;

CREATE TABLE governance_action_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    governance_action_id uuid NOT NULL REFERENCES governance_actions(id) ON DELETE CASCADE,
    step_number integer NOT NULL CHECK (step_number > 0),
    name text NOT NULL,
    status action_status NOT NULL DEFAULT 'PROPOSED',
    input jsonb NOT NULL DEFAULT '{}'::jsonb,
    output jsonb,
    error jsonb,
    started_at timestamptz,
    completed_at timestamptz,
    UNIQUE (governance_action_id, step_number)
);

CREATE TABLE policy_checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    governance_action_id uuid NOT NULL REFERENCES governance_actions(id) ON DELETE CASCADE,
    policy_version_id uuid REFERENCES policy_versions(id),
    check_name text NOT NULL,
    passed boolean NOT NULL,
    decision text NOT NULL,
    evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
    evaluated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

COMMIT;
