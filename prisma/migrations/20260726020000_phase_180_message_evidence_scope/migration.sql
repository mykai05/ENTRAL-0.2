BEGIN;

SET LOCAL search_path = entral, public;

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
            SELECT COALESCE(sender.business_id, recipient.business_id, task.business_id, mission.business_id)
            INTO origin_business
            FROM operational_messages message
            LEFT JOIN entities sender ON sender.id = message.sender_entity_id
            LEFT JOIN entities recipient ON recipient.id = message.recipient_entity_id
            LEFT JOIN tasks task ON task.id = message.task_id
            LEFT JOIN missions mission ON mission.id = message.mission_id
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

REVOKE ALL ON FUNCTION validate_evidence_link_scope() FROM PUBLIC;

COMMIT;
