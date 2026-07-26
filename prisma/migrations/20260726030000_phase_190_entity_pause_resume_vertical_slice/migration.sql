-- Phase 190: durable entity pause/resume leasing invariants.
BEGIN;
SET LOCAL search_path = entral, public;

-- This is the one reusable scheduler/worker guard for the vertical slice.
-- A paused ancestor blocks new work throughout its branch without rewriting
-- descendant status or interrupting work that was already in flight.
CREATE OR REPLACE FUNCTION entity_accepts_new_work(p_entity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
    WITH RECURSIVE command_chain AS (
        SELECT entity.id, entity.parent_id, entity.status
        FROM entral.entities entity
        WHERE entity.id = p_entity_id
        UNION ALL
        SELECT parent.id, parent.parent_id, parent.status
        FROM entral.entities parent
        JOIN command_chain child ON child.parent_id = parent.id
    )
    SELECT
        EXISTS (SELECT 1 FROM command_chain)
        AND COALESCE(bool_and(status = 'ACTIVE'), false)
    FROM command_chain
$$;

CREATE OR REPLACE FUNCTION enforce_entity_accepts_new_work()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    owner_id uuid;
    activating boolean;
BEGIN
    owner_id := NEW.owner_entity_id;
    IF TG_OP = 'INSERT' THEN
        activating := NEW.status::text = 'ACTIVE';
    ELSE
        activating := NEW.status::text = 'ACTIVE'
            AND (
                OLD.status::text IS DISTINCT FROM NEW.status::text
                OR OLD.owner_entity_id IS DISTINCT FROM NEW.owner_entity_id
            );
    END IF;

    IF activating AND NOT entral.entity_accepts_new_work(owner_id) THEN
        RAISE EXCEPTION 'Entity % or its command chain is not eligible to lease new work', owner_id
            USING ERRCODE = '55000';
    END IF;
    RETURN NEW;
END
$$;

-- The API role must prove the atomic event/audit/outbox receipt without gaining
-- general visibility into the worker-owned transactional outbox.
CREATE OR REPLACE FUNCTION entity_lifecycle_receipt_counts(
    p_governance_action_id uuid,
    p_entity_id uuid
)
RETURNS TABLE(event_count bigint, audit_count bigint, outbox_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
    SELECT
        (
            SELECT count(*)
            FROM entral.canonical_events event
            WHERE event.governance_action_id = p_governance_action_id
              AND event.aggregate_type = 'ENTITIES'
              AND event.aggregate_id = p_entity_id
              AND event.event_type = 'entities.update'
        ),
        (
            SELECT count(*)
            FROM entral.audit_entries audit
            WHERE audit.governance_action_id = p_governance_action_id
              AND audit.target_type = 'ENTITIES'
              AND audit.target_id = p_entity_id
        ),
        (
            SELECT count(*)
            FROM entral.transactional_outbox outbox
            JOIN entral.canonical_events event ON event.id = outbox.event_id
            WHERE event.governance_action_id = p_governance_action_id
              AND event.aggregate_type = 'ENTITIES'
              AND event.aggregate_id = p_entity_id
              AND event.event_type = 'entities.update'
              AND outbox.status = 'PENDING'
        )
    WHERE entral.session_is_authenticated()
      AND p_governance_action_id = entral.current_governance_action_id()
$$;

CREATE TRIGGER tasks_entity_lifecycle_lease_guard
BEFORE INSERT OR UPDATE OF status, owner_entity_id ON tasks
FOR EACH ROW EXECUTE FUNCTION enforce_entity_accepts_new_work();

CREATE TRIGGER schedules_entity_lifecycle_lease_guard
BEFORE INSERT OR UPDATE OF status, owner_entity_id ON schedules
FOR EACH ROW EXECUTE FUNCTION enforce_entity_accepts_new_work();

COMMENT ON FUNCTION entity_accepts_new_work(uuid) IS
    'Phase 190 canonical new-work lease guard. Returns false when the entity or any ancestor is not ACTIVE.';
COMMENT ON FUNCTION enforce_entity_accepts_new_work() IS
    'Blocks new ACTIVE task/schedule leasing while preserving already-active in-flight work.';
COMMENT ON FUNCTION entity_lifecycle_receipt_counts(uuid, uuid) IS
    'Returns the current action entity event, audit, and pending outbox receipt counts without exposing outbox rows.';

REVOKE ALL ON FUNCTION entity_accepts_new_work(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION enforce_entity_accepts_new_work() FROM PUBLIC;
REVOKE ALL ON FUNCTION entity_lifecycle_receipt_counts(uuid, uuid) FROM PUBLIC;

COMMIT;
