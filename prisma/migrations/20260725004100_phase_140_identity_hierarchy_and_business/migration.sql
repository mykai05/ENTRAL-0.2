-- Phase 140 repository migration. Canonical source order is preserved inside a rollback-safe transaction.
BEGIN;
-- ENTRAL migration 002: identity, canonical hierarchy, businesses, and versioning.
SET LOCAL search_path = entral, public;

CREATE TABLE app_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL UNIQUE,
    display_name text NOT NULL,
    is_human_authority boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER app_users_updated_at
BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE taxonomy_versions (
    id uuid PRIMARY KEY,
    name text NOT NULL,
    semantic_version text NOT NULL UNIQUE,
    source_edition text NOT NULL,
    source_sha256 jsonb NOT NULL DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT false,
    published_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX taxonomy_one_active_idx ON taxonomy_versions ((is_active)) WHERE is_active;

CREATE TABLE entities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    role entity_role NOT NULL,
    name text NOT NULL,
    parent_id uuid NULL REFERENCES entities(id) DEFERRABLE INITIALLY IMMEDIATE,
    business_id uuid NULL,
    status entity_status NOT NULL DEFAULT 'BUILDING',
    definition text,
    taxonomy_version_id uuid NULL REFERENCES taxonomy_versions(id),
    source_version text,
    model_profile_id uuid NULL,
    authority_profile_id uuid NULL,
    configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    created_by_user_id uuid NULL REFERENCES app_users(id),
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    retired_at timestamptz NULL,
    CHECK (id IS DISTINCT FROM parent_id),
    CHECK ((status = 'RETIRED') = (retired_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_nonretired_entral_idx
    ON entities ((role)) WHERE role = 'ENTRAL' AND status <> 'RETIRED';
CREATE INDEX entities_parent_idx ON entities(parent_id);
CREATE INDEX entities_role_status_idx ON entities(role, status);
CREATE INDEX entities_business_idx ON entities(business_id);

CREATE OR REPLACE FUNCTION validate_entity_hierarchy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    parent_role entity_role;
    parent_business_id uuid;
    cycle_found boolean;
BEGIN
    IF NEW.role = 'ENTRAL' THEN
        IF NEW.parent_id IS NOT NULL THEN RAISE EXCEPTION 'ENTRAL cannot have a parent'; END IF;
        IF NEW.business_id IS NOT NULL THEN RAISE EXCEPTION 'ENTRAL cannot be scoped to a business'; END IF;
    ELSE
        IF NEW.parent_id IS NULL THEN RAISE EXCEPTION '% must have a parent', NEW.role; END IF;
        SELECT role INTO parent_role FROM entities WHERE id = NEW.parent_id;
        IF parent_role IS NULL THEN RAISE EXCEPTION 'Parent entity % does not exist', NEW.parent_id; END IF;
        IF (NEW.role = 'MARSHAL' AND parent_role <> 'ENTRAL') OR
           (NEW.role = 'GENERAL' AND parent_role <> 'MARSHAL') OR
           (NEW.role = 'COMMANDER' AND parent_role <> 'GENERAL') OR
           (NEW.role = 'SOLDIER' AND parent_role <> 'COMMANDER') THEN
            RAISE EXCEPTION 'Invalid parent role: % cannot report to %', NEW.role, parent_role;
        END IF;
        IF NEW.role IN ('MARSHAL', 'GENERAL') AND NEW.business_id IS NOT NULL THEN
            RAISE EXCEPTION '% cannot be scoped to a business', NEW.role;
        END IF;
    END IF;

    IF NEW.parent_id IS NOT NULL THEN
        WITH RECURSIVE ancestors AS (
            SELECT e.id, e.parent_id FROM entities e WHERE e.id = NEW.parent_id
            UNION ALL
            SELECT e.id, e.parent_id FROM entities e JOIN ancestors a ON e.id = a.parent_id
        )
        SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id) INTO cycle_found;
        IF cycle_found THEN RAISE EXCEPTION 'Hierarchy cycle detected for entity %', NEW.id; END IF;
    END IF;

    IF NEW.role = 'SOLDIER' THEN
        SELECT business_id INTO parent_business_id FROM entities WHERE id = NEW.parent_id;
        IF parent_business_id IS NULL THEN
            RAISE EXCEPTION 'Soldier parent Commander must already belong to a business';
        END IF;
        NEW.business_id := parent_business_id;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER validate_entity_hierarchy_trigger
BEFORE INSERT OR UPDATE OF role, parent_id, business_id ON entities
FOR EACH ROW EXECUTE FUNCTION validate_entity_hierarchy();

CREATE OR REPLACE FUNCTION increment_entity_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY['version','updated_at']::text[]
       IS DISTINCT FROM to_jsonb(OLD) - ARRAY['version','updated_at']::text[] THEN
        NEW.version := OLD.version + 1;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER entities_increment_version
BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION increment_entity_version();
CREATE TRIGGER entities_updated_at
BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE entity_versions (
    entity_id uuid NOT NULL REFERENCES entities(id),
    version bigint NOT NULL,
    snapshot jsonb NOT NULL,
    actor_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    actor_id uuid NULL DEFAULT current_actor_id(),
    reason text NULL DEFAULT current_action_reason(),
    recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (entity_id, version)
);
CREATE OR REPLACE FUNCTION capture_entity_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
BEGIN
    INSERT INTO entity_versions(entity_id, version, snapshot)
    VALUES (NEW.id, NEW.version, to_jsonb(NEW))
    ON CONFLICT (entity_id, version) DO NOTHING;
    RETURN NEW;
END $$;
CREATE TRIGGER capture_entity_version_trigger
AFTER INSERT OR UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION capture_entity_version();

CREATE TABLE businesses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stable_code text NOT NULL UNIQUE,
    name text NOT NULL,
    legal_name text,
    brand_name text,
    commander_id uuid NOT NULL UNIQUE REFERENCES entities(id) DEFERRABLE INITIALLY DEFERRED,
    general_id uuid NOT NULL REFERENCES entities(id),
    marshal_id uuid NOT NULL REFERENCES entities(id),
    status business_status NOT NULL DEFAULT 'BUILDING',
    primary_objective text,
    currency char(3) NOT NULL DEFAULT 'USD',
    timezone text NOT NULL DEFAULT 'UTC',
    version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    retired_at timestamptz NULL,
    CHECK ((status = 'RETIRED') = (retired_at IS NOT NULL))
);
ALTER TABLE entities ADD CONSTRAINT entities_business_fk
    FOREIGN KEY (business_id) REFERENCES businesses(id) DEFERRABLE INITIALLY DEFERRED;

CREATE OR REPLACE FUNCTION validate_business_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    commander_role entity_role; commander_parent uuid;
    general_role entity_role; general_parent uuid;
    marshal_role entity_role;
BEGIN
    SELECT role, parent_id INTO commander_role, commander_parent FROM entities WHERE id = NEW.commander_id;
    SELECT role, parent_id INTO general_role, general_parent FROM entities WHERE id = NEW.general_id;
    SELECT role INTO marshal_role FROM entities WHERE id = NEW.marshal_id;
    IF commander_role <> 'COMMANDER' THEN RAISE EXCEPTION 'Business commander_id must reference a COMMANDER'; END IF;
    IF general_role <> 'GENERAL' OR marshal_role <> 'MARSHAL' THEN
        RAISE EXCEPTION 'Business general_id/marshal_id roles are invalid';
    END IF;
    IF commander_parent <> NEW.general_id THEN RAISE EXCEPTION 'Business Commander must report to the selected General'; END IF;
    IF general_parent <> NEW.marshal_id THEN RAISE EXCEPTION 'Business General must report to the selected Marshal'; END IF;
    RETURN NEW;
END $$;
CREATE CONSTRAINT TRIGGER validate_business_ownership_trigger
AFTER INSERT OR UPDATE OF commander_id, general_id, marshal_id ON businesses
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_business_ownership();

CREATE OR REPLACE FUNCTION bind_commander_to_business()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.commander_id IS DISTINCT FROM NEW.commander_id THEN
        IF EXISTS (SELECT 1 FROM entities WHERE parent_id = OLD.commander_id) THEN
            RAISE EXCEPTION
                'Reassign or retire every Soldier before changing a business Commander';
        END IF;

        UPDATE entities
        SET business_id = NULL
        WHERE id = OLD.commander_id
          AND business_id = OLD.id;
    END IF;

    UPDATE entities
    SET business_id = NEW.id
    WHERE id = NEW.commander_id
      AND business_id IS DISTINCT FROM NEW.id;

    RETURN NEW;
END $$;
CREATE TRIGGER bind_commander_to_business_trigger
AFTER INSERT OR UPDATE OF commander_id ON businesses
FOR EACH ROW EXECUTE FUNCTION bind_commander_to_business();

CREATE OR REPLACE FUNCTION validate_bound_entity_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    effective_id uuid := NEW.id;
    effective_role entity_role := NEW.role;
    effective_parent uuid := NEW.parent_id;
    effective_business uuid := NEW.business_id;
    business_commander uuid;
    business_general uuid;
    parent_business uuid;
BEGIN
    IF effective_role = 'COMMANDER' AND effective_business IS NOT NULL THEN
        SELECT commander_id, general_id
        INTO business_commander, business_general
        FROM businesses
        WHERE id = effective_business;

        IF business_commander IS NULL THEN
            RAISE EXCEPTION 'Commander business binding references a missing business';
        END IF;
        IF business_commander <> effective_id THEN
            RAISE EXCEPTION 'Business % is not owned by Commander %', effective_business, effective_id;
        END IF;
        IF business_general <> effective_parent THEN
            RAISE EXCEPTION 'Bound Commander parent must match the business General';
        END IF;
    ELSIF effective_role = 'GENERAL' THEN
        IF EXISTS (
            SELECT 1
            FROM businesses
            WHERE general_id = effective_id
              AND marshal_id IS DISTINCT FROM effective_parent
        ) THEN
            RAISE EXCEPTION 'General parent must match every governed business Marshal';
        END IF;
    ELSIF effective_role = 'SOLDIER' THEN
        SELECT business_id INTO parent_business
        FROM entities
        WHERE id = effective_parent AND role = 'COMMANDER';

        IF parent_business IS NULL OR effective_business IS DISTINCT FROM parent_business THEN
            RAISE EXCEPTION 'Soldier business scope must match its Commander';
        END IF;
    END IF;

    RETURN NEW;
END $$;

CREATE CONSTRAINT TRIGGER validate_bound_entity_ownership_trigger
AFTER INSERT OR UPDATE OF role, parent_id, business_id ON entities
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION validate_bound_entity_ownership();

CREATE OR REPLACE FUNCTION increment_business_version()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF to_jsonb(NEW) - ARRAY['version','updated_at']::text[]
       IS DISTINCT FROM to_jsonb(OLD) - ARRAY['version','updated_at']::text[] THEN
        NEW.version := OLD.version + 1;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER businesses_increment_version
BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION increment_business_version();
CREATE TRIGGER businesses_updated_at
BEFORE UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE business_versions (
    business_id uuid NOT NULL REFERENCES businesses(id),
    version bigint NOT NULL,
    snapshot jsonb NOT NULL,
    actor_kind actor_kind NOT NULL DEFAULT current_actor_kind(),
    actor_id uuid NULL DEFAULT current_actor_id(),
    reason text NULL DEFAULT current_action_reason(),
    recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (business_id, version)
);
CREATE OR REPLACE FUNCTION capture_business_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
BEGIN
    INSERT INTO business_versions(business_id, version, snapshot)
    VALUES (NEW.id, NEW.version, to_jsonb(NEW))
    ON CONFLICT (business_id, version) DO NOTHING;
    RETURN NEW;
END $$;
CREATE TRIGGER capture_business_version_trigger
AFTER INSERT OR UPDATE ON businesses FOR EACH ROW EXECUTE FUNCTION capture_business_version();

REVOKE ALL ON FUNCTION validate_entity_hierarchy() FROM PUBLIC;
REVOKE ALL ON FUNCTION capture_entity_version() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_business_ownership() FROM PUBLIC;
REVOKE ALL ON FUNCTION bind_commander_to_business() FROM PUBLIC;
REVOKE ALL ON FUNCTION validate_bound_entity_ownership() FROM PUBLIC;
REVOKE ALL ON FUNCTION capture_business_version() FROM PUBLIC;

CREATE TABLE business_profiles (
    business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    offer jsonb NOT NULL DEFAULT '{}'::jsonb,
    target_customer jsonb NOT NULL DEFAULT '{}'::jsonb,
    channels jsonb NOT NULL DEFAULT '[]'::jsonb,
    operating_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
    assets jsonb NOT NULL DEFAULT '[]'::jsonb,
    constraints jsonb NOT NULL DEFAULT '{}'::jsonb,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER business_profiles_updated_at
BEFORE UPDATE ON business_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE business_states (
    business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
    health_state health_state NOT NULL DEFAULT 'UNKNOWN',
    health_score numeric(5,2) NULL CHECK (health_score BETWEEN 0 AND 100),
    health_drivers jsonb NOT NULL DEFAULT '[]'::jsonb,
    current_phase text,
    primary_objective text,
    top_exception text,
    current_work jsonb NOT NULL DEFAULT '[]'::jsonb,
    source_freshness jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_material_change_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER business_states_updated_at
BEFORE UPDATE ON business_states FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE financial_snapshots (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    period_start date NOT NULL,
    period_end date NOT NULL,
    gross_revenue numeric(20,4),
    net_contribution numeric(20,4),
    operating_cost numeric(20,4),
    spend numeric(20,4),
    capital_available numeric(20,4),
    currency char(3) NOT NULL,
    source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    observed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK (period_end >= period_start),
    UNIQUE (business_id, period_start, period_end, currency)
);
CREATE INDEX financial_snapshots_latest_idx
    ON financial_snapshots(business_id, period_end DESC, observed_at DESC);

CREATE TABLE scope_grants (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    scope_type scope_type NOT NULL,
    scope_id uuid NULL,
    permissions text[] NOT NULL DEFAULT ARRAY['read']::text[],
    granted_by_user_id uuid NULL REFERENCES app_users(id),
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    CHECK ((scope_type = 'SYSTEM' AND scope_id IS NULL) OR (scope_type <> 'SYSTEM' AND scope_id IS NOT NULL))
);
CREATE UNIQUE INDEX scope_grants_unique_scope_idx
    ON scope_grants(user_id, scope_type, COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid));

COMMIT;
