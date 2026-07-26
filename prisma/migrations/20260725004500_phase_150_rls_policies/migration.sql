-- Phase 150 repository migration. Access controls are installed atomically.
BEGIN;
-- ENTRAL migration 045: production row-level security policies.
-- PostgreSQL 18. Apply after migrations 040-044.
--
-- Every API/worker transaction must set app.user_id from the authenticated,
-- active app_users row. The connection role must not be a table owner or superuser.
--
-- Tables omitted here are internal service tables. Do not grant them directly to
-- browser/client roles; expose them through governed service methods or add
-- equivalent policies during repository integration.
SET LOCAL search_path = entral, public;

ALTER TABLE app_users
    ADD COLUMN auth_subject text,
    ADD COLUMN auth_link_eligible boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX app_users_auth_subject_idx
    ON app_users(auth_subject) WHERE auth_subject IS NOT NULL;

CREATE OR REPLACE FUNCTION session_app_user_id()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION bind_authenticated_app_user(p_auth_subject text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    source_user record;
    bound_user_id uuid;
    bound_user_active boolean;
BEGIN
    SELECT id, email, name, role
    INTO source_user
    FROM public."User"
    WHERE id = p_auth_subject;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Authenticated application subject does not exist'
            USING ERRCODE = '28000';
    END IF;

    SELECT id, is_active INTO bound_user_id, bound_user_active
    FROM app_users
    WHERE auth_subject = source_user.id
    FOR UPDATE;

    IF bound_user_id IS NOT NULL AND NOT bound_user_active THEN
        RAISE EXCEPTION 'Authenticated application subject is inactive'
            USING ERRCODE = '28000';
    END IF;

    IF bound_user_id IS NULL THEN
        SELECT id INTO bound_user_id
        FROM app_users
        WHERE email = source_user.email
          AND auth_subject IS NULL
          AND auth_link_eligible
          AND is_active
        FOR UPDATE;
    END IF;

    IF bound_user_id IS NULL THEN
        INSERT INTO app_users(email, display_name, is_human_authority, is_active, auth_subject)
        VALUES (
            source_user.email,
            source_user.name,
            source_user.role = 'ADMIN',
            true,
            source_user.id
        )
        ON CONFLICT (email) DO NOTHING
        RETURNING id INTO bound_user_id;

        IF bound_user_id IS NULL THEN
            SELECT id INTO bound_user_id
            FROM app_users
            WHERE email = source_user.email
              AND auth_subject IS NULL
              AND auth_link_eligible
              AND is_active
            FOR UPDATE;
        END IF;
    END IF;

    IF bound_user_id IS NULL THEN
        RAISE EXCEPTION 'Authenticated application subject conflicts with an existing canonical identity'
            USING ERRCODE = '28000';
    END IF;

    PERFORM set_config('app.user_id', bound_user_id::text, true);
    PERFORM set_config('app.actor_kind', 'HUMAN', true);
    PERFORM set_config('app.actor_id', bound_user_id::text, true);

    UPDATE app_users
    SET
        email = source_user.email,
        display_name = source_user.name,
        is_human_authority = source_user.role = 'ADMIN',
        is_active = true,
        auth_subject = source_user.id,
        auth_link_eligible = false
    WHERE id = bound_user_id
      AND is_active
      AND (
          email,
          display_name,
          is_human_authority,
          is_active,
          auth_subject,
          auth_link_eligible
      ) IS DISTINCT FROM (
          source_user.email,
          source_user.name,
          source_user.role = 'ADMIN',
          true,
          source_user.id,
          false
      );

    RETURN bound_user_id;
END $$;

CREATE OR REPLACE FUNCTION bind_service_app_user(p_app_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = entral, public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM app_users
        WHERE id = p_app_user_id
          AND is_active
          AND NOT is_human_authority
          AND auth_subject IS NULL
          AND NOT auth_link_eligible
    ) THEN
        RAISE EXCEPTION 'Service application user is missing, inactive, or interactive'
            USING ERRCODE = '28000';
    END IF;

    PERFORM set_config('app.user_id', p_app_user_id::text, true);
    PERFORM set_config('app.actor_kind', 'SYSTEM', true);
    PERFORM set_config('app.actor_id', '', true);
    RETURN p_app_user_id;
END $$;

CREATE OR REPLACE FUNCTION session_is_authenticated()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM app_users u
        WHERE u.id = session_app_user_id()
          AND u.is_active
    )
$$;

CREATE OR REPLACE FUNCTION session_is_human_authority()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM app_users u
        WHERE u.id = session_app_user_id()
          AND u.is_active
          AND u.is_human_authority
    )
$$;

CREATE OR REPLACE FUNCTION scope_grant_allows(
    p_scope_type scope_type,
    p_scope_id uuid,
    p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM scope_grants sg
        JOIN app_users u ON u.id = sg.user_id AND u.is_active
        WHERE sg.user_id = session_app_user_id()
          AND sg.scope_type = p_scope_type
          AND sg.scope_id IS NOT DISTINCT FROM p_scope_id
          AND (sg.expires_at IS NULL OR sg.expires_at > CURRENT_TIMESTAMP)
          AND (sg.permissions && ARRAY[p_permission, '*']::text[])
    )
$$;

CREATE OR REPLACE FUNCTION can_access_business(
    p_business_id uuid,
    p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, p_permission)
        OR scope_grant_allows('BUSINESS', p_business_id, p_permission)
        OR EXISTS (
            SELECT 1
            FROM businesses b
            WHERE b.id = p_business_id
              AND (
                  scope_grant_allows('GENERAL', b.general_id, p_permission)
                  OR scope_grant_allows('MARSHAL', b.marshal_id, p_permission)
                  OR scope_grant_allows('ENTITY', b.commander_id, p_permission)
              )
        )
$$;

CREATE OR REPLACE FUNCTION can_access_entity(
    p_entity_id uuid,
    p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, p_permission)
        OR scope_grant_allows('ENTITY', p_entity_id, p_permission)
        OR EXISTS (
            SELECT 1
            FROM entities e
            WHERE e.id = p_entity_id
              AND (
                  (e.business_id IS NOT NULL AND can_access_business(e.business_id, p_permission))
                  OR (e.role = 'MARSHAL' AND scope_grant_allows('MARSHAL', e.id, p_permission))
                  OR (e.role = 'GENERAL' AND scope_grant_allows('GENERAL', e.id, p_permission))
                  OR (
                      e.role = 'MARSHAL'
                      AND EXISTS (
                          SELECT 1 FROM businesses b
                          WHERE b.marshal_id = e.id
                            AND can_access_business(b.id, p_permission)
                      )
                  )
                  OR (
                      e.role = 'GENERAL'
                      AND EXISTS (
                          SELECT 1 FROM businesses b
                          WHERE b.general_id = e.id
                            AND can_access_business(b.id, p_permission)
                      )
                  )
                  OR (
                      e.role = 'ENTRAL'
                      AND EXISTS (
                          SELECT 1 FROM businesses b
                          WHERE can_access_business(b.id, p_permission)
                      )
                  )
              )
        )
$$;

CREATE OR REPLACE FUNCTION classification_access_allows(
    p_classification text,
    p_business_id uuid,
    p_entity_id uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
    SELECT CASE p_classification
        WHEN 'PUBLIC' THEN true
        WHEN 'INTERNAL' THEN true
        WHEN 'CONFIDENTIAL' THEN
            session_is_human_authority()
            OR scope_grant_allows('SYSTEM', NULL, 'read_confidential')
            OR (
                (p_business_id IS NOT NULL OR p_entity_id IS NOT NULL)
                AND (p_business_id IS NULL OR can_access_business(p_business_id, 'read_confidential'))
                AND (p_entity_id IS NULL OR can_access_entity(p_entity_id, 'read_confidential'))
            )
        WHEN 'RESTRICTED' THEN
            session_is_human_authority()
            OR scope_grant_allows('SYSTEM', NULL, 'read_restricted')
            OR (
                (p_business_id IS NOT NULL OR p_entity_id IS NOT NULL)
                AND (p_business_id IS NULL OR can_access_business(p_business_id, 'read_restricted'))
                AND (p_entity_id IS NULL OR can_access_entity(p_entity_id, 'read_restricted'))
            )
        ELSE false
    END
$$;

CREATE OR REPLACE FUNCTION retrieval_log_refs_access_allows(
    p_retrieval_log_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    retrieval_row retrieval_logs%ROWTYPE;
    referenced_business uuid;
BEGIN
    SELECT * INTO retrieval_row
    FROM retrieval_logs
    WHERE id = p_retrieval_log_id;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF retrieval_row.ai_run_id IS NOT NULL THEN
        SELECT business_id INTO referenced_business
        FROM ai_runs WHERE id = retrieval_row.ai_run_id;
    ELSIF retrieval_row.context_manifest_id IS NOT NULL THEN
        SELECT business_id INTO referenced_business
        FROM context_manifests WHERE id = retrieval_row.context_manifest_id;
    ELSE
        CASE retrieval_row.scope_type
            WHEN 'BUSINESS' THEN
                referenced_business := retrieval_row.scope_id;
            WHEN 'ENTITY' THEN
                SELECT business_id INTO referenced_business
                FROM entities WHERE id = retrieval_row.scope_id;
            WHEN 'MISSION' THEN
                SELECT business_id INTO referenced_business
                FROM missions WHERE id = retrieval_row.scope_id;
            ELSE
                referenced_business := NULL;
        END CASE;
    END IF;

    RETURN phase150_record_refs_access_allows(
        retrieval_row.selected_refs,
        referenced_business,
        retrieval_row.scope_type,
        retrieval_row.scope_id
    ) AND phase150_record_refs_access_allows(
        retrieval_row.excluded_refs,
        referenced_business,
        retrieval_row.scope_type,
        retrieval_row.scope_id
    );
END $$;

CREATE OR REPLACE FUNCTION history_record_access_allows(
    p_target_type text,
    p_target_id uuid,
    p_stored_classification text,
    p_business_id uuid,
    p_entity_id uuid
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    current_classification text;
    referenced_business uuid;
    referenced_scope_type scope_type;
    referenced_scope_id uuid;
    referenced_refs jsonb;
BEGIN
    current_classification := COALESCE(p_stored_classification, 'RESTRICTED');

    CASE p_target_type
        WHEN 'ARTIFACTS' THEN
            SELECT classification INTO current_classification
            FROM artifacts WHERE id = p_target_id;
            IF NOT FOUND THEN current_classification := 'RESTRICTED'; END IF;
        WHEN 'MEMORY_ITEMS' THEN
            SELECT access_classification INTO current_classification
            FROM memory_items WHERE id = p_target_id;
            IF NOT FOUND THEN current_classification := 'RESTRICTED'; END IF;
        WHEN 'EVIDENCE_LINKS' THEN
            SELECT artifact.classification INTO current_classification
            FROM evidence_links evidence
            JOIN artifacts artifact ON artifact.id = evidence.artifact_id
            WHERE evidence.id = p_target_id;
            IF NOT FOUND THEN current_classification := 'RESTRICTED'; END IF;
        WHEN 'CONTEXT_MANIFESTS' THEN
            SELECT included_record_refs, business_id, scope_type, scope_id
            INTO referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            FROM context_manifests WHERE id = p_target_id;
            IF NOT FOUND OR NOT phase150_record_refs_access_allows(
                referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            ) THEN
                RETURN false;
            END IF;
        WHEN 'AI_RUNS' THEN
            SELECT manifest.included_record_refs, run.business_id, run.scope_type, run.scope_id
            INTO referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            FROM ai_runs run
            JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
            WHERE run.id = p_target_id;
            IF NOT FOUND OR NOT phase150_record_refs_access_allows(
                referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            ) THEN
                RETURN false;
            END IF;
        WHEN 'AI_STEPS' THEN
            SELECT manifest.included_record_refs, run.business_id, run.scope_type, run.scope_id
            INTO referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            FROM ai_steps step
            JOIN ai_runs run ON run.id = step.ai_run_id
            JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
            WHERE step.id = p_target_id;
            IF NOT FOUND OR NOT phase150_record_refs_access_allows(
                referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            ) THEN
                RETURN false;
            END IF;
        WHEN 'TOOL_CALLS' THEN
            SELECT manifest.included_record_refs, run.business_id, run.scope_type, run.scope_id
            INTO referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            FROM tool_calls call
            JOIN ai_runs run ON run.id = call.ai_run_id
            JOIN context_manifests manifest ON manifest.id = run.context_manifest_id
            WHERE call.id = p_target_id;
            IF NOT FOUND OR NOT phase150_record_refs_access_allows(
                referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            ) THEN
                RETURN false;
            END IF;
        WHEN 'HEALTH_ASSESSMENTS' THEN
            SELECT
                health.evidence_refs,
                health.business_id,
                health.scope_type,
                health.scope_id
            INTO referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            FROM health_assessments health
            WHERE health.id = p_target_id;
            IF NOT FOUND OR NOT phase150_record_refs_access_allows(
                referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            ) THEN
                RETURN false;
            END IF;
            IF EXISTS (
                SELECT 1 FROM health_assessments health
                WHERE health.id = p_target_id
                  AND health.ai_run_id IS NOT NULL
                  AND NOT can_access_ai_run(health.ai_run_id, 'read_ai')
            ) THEN
                RETURN false;
            END IF;
        WHEN 'RECOMMENDATIONS' THEN
            SELECT
                recommendation.evidence_refs,
                recommendation.business_id,
                recommendation.scope_type,
                recommendation.scope_id
            INTO referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            FROM recommendations recommendation
            WHERE recommendation.id = p_target_id;
            IF NOT FOUND OR NOT phase150_record_refs_access_allows(
                referenced_refs, referenced_business, referenced_scope_type, referenced_scope_id
            ) THEN
                RETURN false;
            END IF;
            IF EXISTS (
                SELECT 1 FROM recommendations recommendation
                WHERE recommendation.id = p_target_id
                  AND recommendation.ai_run_id IS NOT NULL
                  AND NOT can_access_ai_run(recommendation.ai_run_id, 'read_ai')
            ) THEN
                RETURN false;
            END IF;
        WHEN 'VERIFICATION_RESULTS' THEN
            IF NOT EXISTS (
                SELECT 1 FROM verification_results verification
                WHERE verification.id = p_target_id
                  AND can_access_evidence_origin(
                      verification.subject_type,
                      verification.subject_id,
                      'read'
                  )
                  AND verification_refs_access_allows(
                      verification.subject_type,
                      verification.subject_id,
                      verification.evidence_refs
                  )
            ) THEN
                RETURN false;
            END IF;
        WHEN 'RETRIEVAL_LOGS' THEN
            IF NOT retrieval_log_refs_access_allows(p_target_id) THEN
                RETURN false;
            END IF;
        ELSE
            NULL;
    END CASE;

    RETURN classification_access_allows(
        maximum_access_classification(p_stored_classification, current_classification),
        p_business_id,
        p_entity_id
    );
END $$;

CREATE OR REPLACE FUNCTION can_access_mission(
    p_mission_id uuid,
    p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM missions m
        WHERE m.id = p_mission_id
          AND (
              (m.business_id IS NOT NULL AND can_access_business(m.business_id, p_permission))
              OR can_access_entity(m.owner_entity_id, p_permission)
          )
    )
$$;

CREATE OR REPLACE FUNCTION can_access_ai_run(
    p_ai_run_id uuid,
    p_permission text DEFAULT 'read_ai'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM ai_runs ar
        JOIN context_manifests manifest ON manifest.id = ar.context_manifest_id
        WHERE ar.id = p_ai_run_id
          AND (
              session_is_human_authority()
              OR scope_grant_allows('SYSTEM', NULL, p_permission)
              OR (
                  (ar.business_id IS NULL OR can_access_business(ar.business_id, p_permission))
                  AND (ar.entity_id IS NULL OR can_access_entity(ar.entity_id, p_permission))
                  AND CASE ar.scope_type
                      WHEN 'SYSTEM' THEN scope_grant_allows('SYSTEM', NULL, p_permission)
                      WHEN 'BUSINESS' THEN can_access_business(ar.scope_id, p_permission)
                      WHEN 'ENTITY' THEN can_access_entity(ar.scope_id, p_permission)
                      WHEN 'MISSION' THEN can_access_mission(ar.scope_id, p_permission)
                      WHEN 'MARSHAL' THEN can_access_entity(ar.scope_id, p_permission)
                      WHEN 'GENERAL' THEN can_access_entity(ar.scope_id, p_permission)
                      WHEN 'USER' THEN ar.scope_id = session_app_user_id()
                      ELSE false
                  END
              )
          )
          AND phase150_record_refs_access_allows(
              manifest.included_record_refs,
              ar.business_id,
              ar.scope_type,
              ar.scope_id
          )
    )
$$;

CREATE OR REPLACE FUNCTION can_access_scope(
    p_scope_type scope_type,
    p_scope_id uuid,
    p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
BEGIN
    CASE p_scope_type
        WHEN 'SYSTEM' THEN
            RETURN session_is_human_authority()
                OR scope_grant_allows('SYSTEM', NULL, p_permission);
        WHEN 'BUSINESS' THEN
            RETURN can_access_business(p_scope_id, p_permission);
        WHEN 'ENTITY' THEN
            RETURN can_access_entity(p_scope_id, p_permission);
        WHEN 'MISSION' THEN
            RETURN can_access_mission(p_scope_id, p_permission);
        WHEN 'MARSHAL', 'GENERAL' THEN
            RETURN can_access_entity(p_scope_id, p_permission);
        WHEN 'USER' THEN
            RETURN (session_is_authenticated() AND p_scope_id = session_app_user_id())
                OR session_is_human_authority()
                OR scope_grant_allows('SYSTEM', NULL, 'manage_identity');
        ELSE
            RETURN false;
    END CASE;
END $$;

CREATE OR REPLACE FUNCTION can_access_task(
    p_task_id uuid,
    p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM tasks t
        WHERE t.id = p_task_id
          AND (
              (t.business_id IS NOT NULL AND can_access_business(t.business_id, p_permission))
              OR can_access_entity(t.owner_entity_id, p_permission)
              OR can_access_mission(t.mission_id, p_permission)
          )
    )
$$;

CREATE OR REPLACE FUNCTION can_access_governance_action(
    p_action_id uuid,
    p_permission text DEFAULT 'read_governance'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM governance_actions ga
        WHERE ga.id = p_action_id
          AND (
              session_is_human_authority()
              OR scope_grant_allows('SYSTEM', NULL, p_permission)
              OR (ga.business_id IS NOT NULL AND can_access_business(ga.business_id, p_permission))
          )
    )
$$;

CREATE OR REPLACE FUNCTION can_access_evidence_object(
    p_artifact_id uuid,
    p_source_record_id uuid,
    p_mode text DEFAULT 'read'
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    v_business uuid;
    v_entity uuid;
    v_classification text;
    v_permission text := CASE WHEN p_mode = 'write' THEN 'manage_data' ELSE 'read' END;
BEGIN
    IF (p_artifact_id IS NOT NULL)::int + (p_source_record_id IS NOT NULL)::int <> 1 THEN
        RETURN false;
    END IF;

    IF p_artifact_id IS NOT NULL THEN
        SELECT business_id, entity_id, classification
        INTO v_business, v_entity, v_classification
        FROM artifacts WHERE id = p_artifact_id;
    ELSE
        SELECT business_id, entity_id, NULL::text
        INTO v_business, v_entity, v_classification
        FROM source_records WHERE id = p_source_record_id;
    END IF;

    IF NOT FOUND THEN
        RETURN false;
    END IF;

    RETURN (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, v_permission)
        OR (
            (v_business IS NOT NULL OR v_entity IS NOT NULL)
            AND (v_business IS NULL OR can_access_business(v_business, v_permission))
            AND (v_entity IS NULL OR can_access_entity(v_entity, v_permission))
        )
    ) AND (
        v_classification IS NULL
        OR classification_access_allows(v_classification, v_business, v_entity)
    );
END $$;

CREATE OR REPLACE FUNCTION can_access_evidence_origin(
    p_from_type text,
    p_from_id uuid,
    p_mode text DEFAULT 'read'
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
DECLARE
    v_read boolean := p_mode <> 'write';
BEGIN
    CASE p_from_type
        WHEN 'MISSION' THEN
            RETURN can_access_mission(p_from_id, CASE WHEN v_read THEN 'read' ELSE 'manage' END);
        WHEN 'TASK' THEN
            RETURN can_access_task(p_from_id, CASE WHEN v_read THEN 'read' ELSE 'manage' END);
        WHEN 'MESSAGE' THEN
            RETURN EXISTS (
                SELECT 1 FROM operational_messages om
                WHERE om.id = p_from_id
                  AND (
                      session_is_human_authority()
                      OR om.sender_user_id = session_app_user_id()
                      OR om.recipient_user_id = session_app_user_id()
                      OR (om.sender_entity_id IS NOT NULL AND can_access_entity(om.sender_entity_id, CASE WHEN v_read THEN 'read' ELSE 'manage' END))
                      OR (om.recipient_entity_id IS NOT NULL AND can_access_entity(om.recipient_entity_id, CASE WHEN v_read THEN 'read' ELSE 'manage' END))
                  )
            );
        WHEN 'GOVERNANCE_ACTION' THEN
            RETURN can_access_governance_action(
                p_from_id,
                CASE WHEN v_read THEN 'read_governance' ELSE 'manage_governance' END
            );
        WHEN 'AI_RUN' THEN
            RETURN can_access_ai_run(p_from_id, CASE WHEN v_read THEN 'read_ai' ELSE 'run_ai' END);
        WHEN 'AI_STEP' THEN
            RETURN EXISTS (
                SELECT 1 FROM ai_steps s
                WHERE s.id = p_from_id
                  AND can_access_ai_run(s.ai_run_id, CASE WHEN v_read THEN 'read_ai' ELSE 'run_ai' END)
            );
        WHEN 'TOOL_CALL' THEN
            RETURN EXISTS (
                SELECT 1 FROM tool_calls tc
                WHERE tc.id = p_from_id
                  AND can_access_ai_run(tc.ai_run_id, CASE WHEN v_read THEN 'read_ai' ELSE 'run_ai' END)
            );
        WHEN 'HEALTH_ASSESSMENT' THEN
            RETURN EXISTS (
                SELECT 1 FROM health_assessments h
                WHERE h.id = p_from_id
                  AND (
                      session_is_human_authority()
                      OR scope_grant_allows('SYSTEM', NULL, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END)
                      OR (
                           (h.business_id IS NULL OR can_access_business(h.business_id, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END))
                           AND can_access_scope(h.scope_type, h.scope_id, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END)
                       )
                   )
                  AND (
                      h.ai_run_id IS NULL
                      OR can_access_ai_run(
                          h.ai_run_id,
                          CASE WHEN v_read THEN 'read_ai' ELSE 'run_ai' END
                      )
                  )
                  AND phase150_record_refs_access_allows(
                      h.evidence_refs, h.business_id, h.scope_type, h.scope_id
                  )
            );
        WHEN 'RECOMMENDATION' THEN
            RETURN EXISTS (
                SELECT 1 FROM recommendations r
                WHERE r.id = p_from_id
                  AND (
                      session_is_human_authority()
                      OR scope_grant_allows('SYSTEM', NULL, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END)
                      OR (
                           (r.business_id IS NULL OR can_access_business(r.business_id, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END))
                           AND can_access_scope(r.scope_type, r.scope_id, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END)
                       )
                   )
                  AND (
                      r.ai_run_id IS NULL
                      OR can_access_ai_run(
                          r.ai_run_id,
                          CASE WHEN v_read THEN 'read_ai' ELSE 'run_ai' END
                      )
                  )
                  AND phase150_record_refs_access_allows(
                      r.evidence_refs, r.business_id, r.scope_type, r.scope_id
                  )
            );
        WHEN 'DECISION' THEN
            RETURN EXISTS (
                SELECT 1 FROM decisions d
                WHERE d.id = p_from_id
                  AND (
                      session_is_human_authority()
                      OR scope_grant_allows('SYSTEM', NULL, CASE WHEN v_read THEN 'read' ELSE 'manage' END)
                      OR (
                          (d.business_id IS NULL OR can_access_business(d.business_id, CASE WHEN v_read THEN 'read' ELSE 'manage' END))
                          AND can_access_scope(d.scope_type, d.scope_id, CASE WHEN v_read THEN 'read' ELSE 'manage' END)
                      )
                  )
            );
        WHEN 'EXPERIMENT' THEN
            RETURN EXISTS (
                SELECT 1 FROM experiments e
                WHERE e.id = p_from_id
                  AND can_access_business(e.business_id, CASE WHEN v_read THEN 'read' ELSE 'manage' END)
            );
        WHEN 'OUTCOME' THEN
            RETURN EXISTS (
                SELECT 1 FROM outcomes o
                WHERE o.id = p_from_id
                  AND (
                      session_is_human_authority()
                      OR scope_grant_allows('SYSTEM', NULL, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END)
                      OR (
                          (o.business_id IS NULL OR can_access_business(o.business_id, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END))
                          AND can_access_scope(o.scope_type, o.scope_id, CASE WHEN v_read THEN 'read' ELSE 'manage_ai' END)
                      )
                  )
            );
        WHEN 'MEMORY' THEN
            RETURN EXISTS (
                SELECT 1 FROM memory_items m
                WHERE m.id = p_from_id
                  AND classification_access_allows(
                      m.access_classification,
                      m.business_id,
                      m.entity_id
                  )
                  AND (
                      session_is_human_authority()
                      OR scope_grant_allows('SYSTEM', NULL, CASE WHEN v_read THEN 'read' ELSE 'manage_memory' END)
                      OR (
                          (m.business_id IS NULL OR can_access_business(m.business_id, CASE WHEN v_read THEN 'read' ELSE 'manage_memory' END))
                          AND (m.entity_id IS NULL OR can_access_entity(m.entity_id, CASE WHEN v_read THEN 'read' ELSE 'manage_memory' END))
                          AND can_access_scope(m.scope_type, m.scope_id, CASE WHEN v_read THEN 'read' ELSE 'manage_memory' END)
                      )
                  )
            );
        ELSE
            RETURN false;
    END CASE;
END $$;

CREATE OR REPLACE FUNCTION verification_refs_access_allows(
    p_subject_type text,
    p_subject_id uuid,
    p_evidence_refs jsonb
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, entral, pg_temp
AS $$
DECLARE
    referenced_business uuid;
    referenced_scope_type scope_type;
    referenced_scope_id uuid;
BEGIN
    IF p_evidence_refs IS NULL
       OR jsonb_typeof(p_evidence_refs) <> 'array' THEN
        RETURN false;
    END IF;
    IF jsonb_array_length(p_evidence_refs) = 0 THEN
        RETURN true;
    END IF;

    CASE p_subject_type
        WHEN 'AI_RUN' THEN
            SELECT business_id, scope_type, scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM ai_runs WHERE id = p_subject_id;
        WHEN 'AI_STEP' THEN
            SELECT run.business_id, run.scope_type, run.scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM ai_steps step
            JOIN ai_runs run ON run.id = step.ai_run_id
            WHERE step.id = p_subject_id;
        WHEN 'TOOL_CALL' THEN
            SELECT run.business_id, run.scope_type, run.scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM tool_calls call
            JOIN ai_runs run ON run.id = call.ai_run_id
            WHERE call.id = p_subject_id;
        WHEN 'HEALTH_ASSESSMENT' THEN
            SELECT business_id, scope_type, scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM health_assessments WHERE id = p_subject_id;
        WHEN 'RECOMMENDATION' THEN
            SELECT business_id, scope_type, scope_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM recommendations WHERE id = p_subject_id;
        WHEN 'GOVERNANCE_ACTION' THEN
            SELECT
                business_id,
                CASE WHEN business_id IS NULL THEN 'SYSTEM'::scope_type ELSE 'BUSINESS'::scope_type END,
                business_id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM governance_actions WHERE id = p_subject_id;
        WHEN 'MISSION' THEN
            SELECT business_id, 'MISSION'::scope_type, id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM missions WHERE id = p_subject_id;
        WHEN 'TASK' THEN
            SELECT mission.business_id, 'MISSION'::scope_type, mission.id
            INTO referenced_business, referenced_scope_type, referenced_scope_id
            FROM tasks task
            JOIN missions mission ON mission.id = task.mission_id
            WHERE task.id = p_subject_id;
        ELSE
            RETURN false;
    END CASE;

    IF NOT FOUND THEN
        RETURN false;
    END IF;
    RETURN phase150_record_refs_access_allows(
        p_evidence_refs,
        referenced_business,
        referenced_scope_type,
        referenced_scope_id
    );
END $$;

CREATE OR REPLACE FUNCTION can_access_verification_result(
    p_verification_id uuid,
    p_mode text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = entral, public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM verification_results vr
        WHERE vr.id = p_verification_id
          AND (
              (vr.subject_type <> 'REPAIR' AND can_access_evidence_origin(vr.subject_type, vr.subject_id, p_mode))
              OR (vr.subject_type = 'REPAIR' AND (
                  session_is_human_authority()
                  OR scope_grant_allows('SYSTEM', NULL, CASE WHEN p_mode = 'write' THEN 'manage_governance' ELSE 'read_governance' END)
              ))
          )
          AND verification_refs_access_allows(
              vr.subject_type,
              vr.subject_id,
              vr.evidence_refs
          )
    )
$$;

-- Identity and grant administration.
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_users_select_policy ON app_users
FOR SELECT USING (
    (session_is_authenticated() AND id = session_app_user_id())
    OR session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_identity')
);
CREATE POLICY app_users_insert_policy ON app_users
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_identity')
);
CREATE POLICY app_users_update_policy ON app_users
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_identity')
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_identity')
);

ALTER TABLE scope_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY scope_grants_select_policy ON scope_grants
FOR SELECT USING (
    (session_is_authenticated() AND user_id = session_app_user_id())
    OR session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_access')
);
CREATE POLICY scope_grants_insert_policy ON scope_grants
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_access')
);
CREATE POLICY scope_grants_update_policy ON scope_grants
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_access')
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_access')
);

-- Hierarchy and businesses. Hard deletes are intentionally not authorized.
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY businesses_select_policy ON businesses
FOR SELECT USING (can_access_business(id, 'read'));
CREATE POLICY businesses_insert_policy ON businesses
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR scope_grant_allows('GENERAL', general_id, 'manage')
    OR scope_grant_allows('MARSHAL', marshal_id, 'manage')
);
CREATE POLICY businesses_update_policy ON businesses
FOR UPDATE USING (can_access_business(id, 'manage'))
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR scope_grant_allows('GENERAL', general_id, 'manage')
    OR scope_grant_allows('MARSHAL', marshal_id, 'manage')
    OR scope_grant_allows('ENTITY', commander_id, 'manage')
);

ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY entities_select_policy ON entities
FOR SELECT USING (can_access_entity(id, 'read'));
CREATE POLICY entities_insert_policy ON entities
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR (parent_id IS NOT NULL AND can_access_entity(parent_id, 'manage'))
    OR (business_id IS NOT NULL AND can_access_business(business_id, 'manage'))
);
CREATE POLICY entities_update_policy ON entities
FOR UPDATE USING (can_access_entity(id, 'manage'))
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR scope_grant_allows('ENTITY', id, 'manage')
    OR (parent_id IS NOT NULL AND can_access_entity(parent_id, 'manage'))
    OR (business_id IS NOT NULL AND can_access_business(business_id, 'manage'))
);

ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_profiles_select_policy ON business_profiles
FOR SELECT USING (can_access_business(business_id, 'read'));
CREATE POLICY business_profiles_insert_policy ON business_profiles
FOR INSERT WITH CHECK (can_access_business(business_id, 'manage'));
CREATE POLICY business_profiles_update_policy ON business_profiles
FOR UPDATE USING (can_access_business(business_id, 'manage'))
WITH CHECK (can_access_business(business_id, 'manage'));

ALTER TABLE business_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_states_select_policy ON business_states
FOR SELECT USING (can_access_business(business_id, 'read'));
CREATE POLICY business_states_insert_policy ON business_states
FOR INSERT WITH CHECK (can_access_business(business_id, 'manage'));
CREATE POLICY business_states_update_policy ON business_states
FOR UPDATE USING (can_access_business(business_id, 'manage'))
WITH CHECK (can_access_business(business_id, 'manage'));

ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY financial_snapshots_select_policy ON financial_snapshots
FOR SELECT USING (can_access_business(business_id, 'read'));
CREATE POLICY financial_snapshots_insert_policy ON financial_snapshots
FOR INSERT WITH CHECK (can_access_business(business_id, 'manage_financials'));

-- Work and operational communication. Missions/tasks are soft-closed, not deleted.
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY missions_select_policy ON missions
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND can_access_entity(owner_entity_id, 'read')
    )
);
CREATE POLICY missions_insert_policy ON missions
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage'))
        AND can_access_entity(owner_entity_id, 'manage')
    )
);
CREATE POLICY missions_update_policy ON missions
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage'))
        AND can_access_entity(owner_entity_id, 'manage')
    )
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage'))
        AND can_access_entity(owner_entity_id, 'manage')
    )
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_select_policy ON tasks
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND can_access_entity(owner_entity_id, 'read')
        AND can_access_mission(mission_id, 'read')
    )
);
CREATE POLICY tasks_insert_policy ON tasks
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR (
        can_access_mission(mission_id, 'manage')
        AND (business_id IS NULL OR can_access_business(business_id, 'manage'))
        AND can_access_entity(owner_entity_id, 'manage')
    )
);
CREATE POLICY tasks_update_policy ON tasks
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage'))
        AND can_access_entity(owner_entity_id, 'manage')
        AND can_access_mission(mission_id, 'manage')
    )
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR (
        can_access_mission(mission_id, 'manage')
        AND (business_id IS NULL OR can_access_business(business_id, 'manage'))
        AND can_access_entity(owner_entity_id, 'manage')
    )
);

ALTER TABLE operational_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY operational_messages_select_policy ON operational_messages
FOR SELECT USING (
    session_is_human_authority()
    OR (
        session_is_authenticated()
        AND (
            sender_user_id = session_app_user_id()
            OR recipient_user_id = session_app_user_id()
        )
    )
    OR (sender_entity_id IS NOT NULL AND can_access_entity(sender_entity_id, 'read'))
    OR (recipient_entity_id IS NOT NULL AND can_access_entity(recipient_entity_id, 'read'))
);
CREATE POLICY operational_messages_insert_policy ON operational_messages
FOR INSERT WITH CHECK (
    (session_is_authenticated() AND sender_user_id = session_app_user_id())
    OR (sender_entity_id IS NOT NULL AND can_access_entity(sender_entity_id, 'manage'))
);
CREATE POLICY operational_messages_update_policy ON operational_messages
FOR UPDATE USING (
    session_is_human_authority()
    OR (
        session_is_authenticated()
        AND (
            sender_user_id = session_app_user_id()
            OR recipient_user_id = session_app_user_id()
        )
    )
    OR (sender_entity_id IS NOT NULL AND can_access_entity(sender_entity_id, 'manage'))
    OR (recipient_entity_id IS NOT NULL AND can_access_entity(recipient_entity_id, 'manage'))
)
WITH CHECK (
    session_is_human_authority()
    OR (
        session_is_authenticated()
        AND (
            sender_user_id = session_app_user_id()
            OR recipient_user_id = session_app_user_id()
        )
    )
    OR (sender_entity_id IS NOT NULL AND can_access_entity(sender_entity_id, 'manage'))
    OR (recipient_entity_id IS NOT NULL AND can_access_entity(recipient_entity_id, 'manage'))
);

-- Governance and runtime configuration.
ALTER TABLE governance_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY governance_actions_select_policy ON governance_actions
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read_governance')
    OR (business_id IS NOT NULL AND can_access_business(business_id, 'read_governance'))
);
CREATE POLICY governance_actions_insert_policy ON governance_actions
FOR INSERT WITH CHECK (
    (
        initiated_by_kind = 'HUMAN'
        AND initiated_by_user_id = session_app_user_id()
        AND session_is_human_authority()
    )
    OR (
        initiated_by_kind IN ('ENTITY','SYSTEM')
        AND scope_grant_allows('SYSTEM', NULL, 'manage_governance')
    )
);
CREATE POLICY governance_actions_update_policy ON governance_actions
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_governance')
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_governance')
);

ALTER TABLE tool_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tool_grants_select_policy ON tool_grants
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND can_access_entity(entity_id, 'read')
    )
);
CREATE POLICY tool_grants_insert_policy ON tool_grants
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_tools')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_tools'))
        AND can_access_entity(entity_id, 'manage_tools')
    )
);
CREATE POLICY tool_grants_update_policy ON tool_grants
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_tools')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_tools'))
        AND can_access_entity(entity_id, 'manage_tools')
    )
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_tools')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_tools'))
        AND can_access_entity(entity_id, 'manage_tools')
    )
);

ALTER TABLE credential_references ENABLE ROW LEVEL SECURITY;
CREATE POLICY credential_references_select_policy ON credential_references
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_credentials')
    OR (owning_business_id IS NOT NULL AND can_access_business(owning_business_id, 'manage_credentials'))
);
CREATE POLICY credential_references_insert_policy ON credential_references
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_credentials')
    OR (owning_business_id IS NOT NULL AND can_access_business(owning_business_id, 'manage_credentials'))
);
CREATE POLICY credential_references_update_policy ON credential_references
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_credentials')
    OR (owning_business_id IS NOT NULL AND can_access_business(owning_business_id, 'manage_credentials'))
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_credentials')
    OR (owning_business_id IS NOT NULL AND can_access_business(owning_business_id, 'manage_credentials'))
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY schedules_select_policy ON schedules
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND can_access_entity(owner_entity_id, 'read')
    )
);
CREATE POLICY schedules_insert_policy ON schedules
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_schedule')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_schedule'))
        AND can_access_entity(owner_entity_id, 'manage_schedule')
    )
);
CREATE POLICY schedules_update_policy ON schedules
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_schedule')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_schedule'))
        AND can_access_entity(owner_entity_id, 'manage_schedule')
    )
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_schedule')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_schedule'))
        AND can_access_entity(owner_entity_id, 'manage_schedule')
    )
);

-- Evidence and memory. Retention deletion runs through a separately governed role.
ALTER TABLE source_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY source_records_select_policy ON source_records
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'read'))
    )
);
CREATE POLICY source_records_insert_policy ON source_records
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_data')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'manage_data'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_data'))
    )
);
CREATE POLICY source_records_update_policy ON source_records
FOR UPDATE USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_data')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'manage_data'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_data'))
    )
)
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_data')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'manage_data'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_data'))
    )
);

ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY artifacts_select_policy ON artifacts
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read_restricted')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL OR mission_id IS NOT NULL OR task_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'read'))
        AND (mission_id IS NULL OR can_access_mission(mission_id, 'read'))
        AND (task_id IS NULL OR can_access_task(task_id, 'read'))
        AND classification_access_allows(classification, business_id, entity_id)
    )
);
CREATE POLICY artifacts_insert_policy ON artifacts
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_data')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL OR mission_id IS NOT NULL OR task_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'manage_data'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_data'))
        AND (mission_id IS NULL OR can_access_mission(mission_id, 'manage'))
        AND (task_id IS NULL OR can_access_task(task_id, 'manage'))
    )
);
CREATE POLICY artifacts_update_policy ON artifacts
FOR UPDATE USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'manage_data')
        OR (
            (business_id IS NOT NULL OR entity_id IS NOT NULL OR mission_id IS NOT NULL OR task_id IS NOT NULL)
            AND (business_id IS NULL OR can_access_business(business_id, 'manage_data'))
            AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_data'))
            AND (mission_id IS NULL OR can_access_mission(mission_id, 'manage'))
            AND (task_id IS NULL OR can_access_task(task_id, 'manage'))
        )
    )
    AND classification_access_allows(classification, business_id, entity_id)
)
WITH CHECK (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'manage_data')
        OR (
            (business_id IS NOT NULL OR entity_id IS NOT NULL OR mission_id IS NOT NULL OR task_id IS NOT NULL)
            AND (business_id IS NULL OR can_access_business(business_id, 'manage_data'))
            AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_data'))
            AND (mission_id IS NULL OR can_access_mission(mission_id, 'manage'))
            AND (task_id IS NULL OR can_access_task(task_id, 'manage'))
        )
    )
    AND classification_access_allows(classification, business_id, entity_id)
);

ALTER TABLE memory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY memory_items_select_policy ON memory_items
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read_restricted')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'read'))
        AND can_access_scope(scope_type, scope_id, 'read')
        AND classification_access_allows(access_classification, business_id, entity_id)
    )
);
CREATE POLICY memory_items_insert_policy ON memory_items
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_memory')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_memory'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_memory'))
        AND can_access_scope(scope_type, scope_id, 'manage_memory')
    )
);
CREATE POLICY memory_items_update_policy ON memory_items
FOR UPDATE USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'manage_memory')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'manage_memory'))
            AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_memory'))
            AND can_access_scope(scope_type, scope_id, 'manage_memory')
        )
    )
    AND classification_access_allows(access_classification, business_id, entity_id)
)
WITH CHECK (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'manage_memory')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'manage_memory'))
            AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_memory'))
            AND can_access_scope(scope_type, scope_id, 'manage_memory')
        )
    )
    AND classification_access_allows(access_classification, business_id, entity_id)
);

-- AI manifests, runs, health, and recommendations.
ALTER TABLE context_manifests ENABLE ROW LEVEL SECURITY;
CREATE POLICY context_manifests_select_policy ON context_manifests
FOR SELECT USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'read_ai')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'read_ai'))
            AND can_access_scope(scope_type, scope_id, 'read_ai')
        )
    )
    AND phase150_record_refs_access_allows(
        included_record_refs, business_id, scope_type, scope_id
    )
);
CREATE POLICY context_manifests_insert_policy ON context_manifests
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'run_ai')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'run_ai'))
        AND can_access_scope(scope_type, scope_id, 'run_ai')
    )
);

ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_runs_select_policy ON ai_runs
FOR SELECT USING (
    can_access_ai_run(id, 'read_ai')
    OR can_access_ai_run(id, 'run_ai')
);
CREATE POLICY ai_runs_insert_policy ON ai_runs
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'run_ai')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'run_ai'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'run_ai'))
        AND can_access_scope(scope_type, scope_id, 'run_ai')
    )
);
CREATE POLICY ai_runs_update_policy ON ai_runs
FOR UPDATE USING (can_access_ai_run(id, 'run_ai'))
WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'run_ai')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'run_ai'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'run_ai'))
        AND can_access_scope(scope_type, scope_id, 'run_ai')
    )
);

ALTER TABLE health_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY health_assessments_select_policy ON health_assessments
FOR SELECT USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'read')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'read'))
            AND can_access_scope(scope_type, scope_id, 'read')
        )
    )
    AND (ai_run_id IS NULL OR can_access_ai_run(ai_run_id, 'read_ai'))
    AND phase150_record_refs_access_allows(
        evidence_refs, business_id, scope_type, scope_id
    )
);
CREATE POLICY health_assessments_insert_policy ON health_assessments
FOR INSERT WITH CHECK (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'manage_ai')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'manage_ai'))
            AND can_access_scope(scope_type, scope_id, 'manage_ai')
        )
    )
    AND (ai_run_id IS NULL OR can_access_ai_run(ai_run_id, 'run_ai'))
    AND phase150_record_refs_access_allows(
        evidence_refs, business_id, scope_type, scope_id
    )
);

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY recommendations_select_policy ON recommendations
FOR SELECT USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'read')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'read'))
            AND can_access_scope(scope_type, scope_id, 'read')
        )
    )
    AND (ai_run_id IS NULL OR can_access_ai_run(ai_run_id, 'read_ai'))
    AND phase150_record_refs_access_allows(
        evidence_refs, business_id, scope_type, scope_id
    )
);
CREATE POLICY recommendations_insert_policy ON recommendations
FOR INSERT WITH CHECK (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'manage_ai')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'manage_ai'))
            AND can_access_scope(scope_type, scope_id, 'manage_ai')
        )
    )
    AND (ai_run_id IS NULL OR can_access_ai_run(ai_run_id, 'run_ai'))
    AND phase150_record_refs_access_allows(
        evidence_refs, business_id, scope_type, scope_id
    )
);
CREATE POLICY recommendations_update_policy ON recommendations
FOR UPDATE USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'manage_ai')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'manage_ai'))
            AND can_access_scope(scope_type, scope_id, 'manage_ai')
        )
    )
    AND (ai_run_id IS NULL OR can_access_ai_run(ai_run_id, 'run_ai'))
    AND phase150_record_refs_access_allows(
        evidence_refs, business_id, scope_type, scope_id
    )
)
WITH CHECK (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'manage_ai')
        OR (
            (business_id IS NULL OR can_access_business(business_id, 'manage_ai'))
            AND can_access_scope(scope_type, scope_id, 'manage_ai')
        )
    )
    AND (ai_run_id IS NULL OR can_access_ai_run(ai_run_id, 'run_ai'))
    AND phase150_record_refs_access_allows(
        evidence_refs, business_id, scope_type, scope_id
    )
);

-- Intelligence outcomes and measurements.
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY decisions_select_policy ON decisions
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND can_access_scope(scope_type, scope_id, 'read')
    )
);
CREATE POLICY decisions_insert_policy ON decisions
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage'))
        AND can_access_scope(scope_type, scope_id, 'manage')
    )
);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;
CREATE POLICY experiments_select_policy ON experiments
FOR SELECT USING (can_access_business(business_id, 'read'));
CREATE POLICY experiments_insert_policy ON experiments
FOR INSERT WITH CHECK (can_access_business(business_id, 'manage'));
CREATE POLICY experiments_update_policy ON experiments
FOR UPDATE USING (can_access_business(business_id, 'manage'))
WITH CHECK (can_access_business(business_id, 'manage'));

ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY outcomes_select_policy ON outcomes
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND can_access_scope(scope_type, scope_id, 'read')
    )
);
CREATE POLICY outcomes_insert_policy ON outcomes
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_ai')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_ai'))
        AND can_access_scope(scope_type, scope_id, 'manage_ai')
    )
);

ALTER TABLE metric_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY metric_observations_select_policy ON metric_observations
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND can_access_scope(scope_type, scope_id, 'read')
    )
);
CREATE POLICY metric_observations_insert_policy ON metric_observations
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_metrics')
    OR (
        (business_id IS NULL OR can_access_business(business_id, 'manage_metrics'))
        AND can_access_scope(scope_type, scope_id, 'manage_metrics')
    )
);

ALTER TABLE cost_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY cost_records_select_policy ON cost_records
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read_financials')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'read_financials'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'read_financials'))
    )
);
CREATE POLICY cost_records_insert_policy ON cost_records
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_financials')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'manage_financials'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_financials'))
    )
);

ALTER TABLE resource_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY resource_usage_select_policy ON resource_usage
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'read'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'read'))
    )
);
CREATE POLICY resource_usage_insert_policy ON resource_usage
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_metrics')
    OR (
        (business_id IS NOT NULL OR entity_id IS NOT NULL)
        AND (business_id IS NULL OR can_access_business(business_id, 'manage_metrics'))
        AND (entity_id IS NULL OR can_access_entity(entity_id, 'manage_metrics'))
    )
);

ALTER TABLE retrieval_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY retrieval_logs_select_policy ON retrieval_logs
FOR SELECT USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'read_ai')
        OR (
            (ai_run_id IS NULL OR can_access_ai_run(ai_run_id, 'read_ai'))
            AND can_access_scope(scope_type, scope_id, 'read_ai')
        )
    )
    AND retrieval_log_refs_access_allows(id)
);
CREATE POLICY retrieval_logs_insert_policy ON retrieval_logs
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'run_ai')
    OR (
        (ai_run_id IS NULL OR can_access_ai_run(ai_run_id, 'run_ai'))
        AND can_access_scope(scope_type, scope_id, 'run_ai')
    )
);

-- Version histories and internal orchestration records.
ALTER TABLE entity_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY entity_versions_select_policy ON entity_versions
FOR SELECT USING (can_access_entity(entity_id, 'read'));

ALTER TABLE business_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY business_versions_select_policy ON business_versions
FOR SELECT USING (can_access_business(business_id, 'read'));

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY idempotency_keys_select_policy ON idempotency_keys
FOR SELECT USING (can_access_scope(scope_type, scope_id, 'manage'));
CREATE POLICY idempotency_keys_insert_policy ON idempotency_keys
FOR INSERT WITH CHECK (can_access_scope(scope_type, scope_id, 'manage'));
CREATE POLICY idempotency_keys_update_policy ON idempotency_keys
FOR UPDATE USING (can_access_scope(scope_type, scope_id, 'manage'))
WITH CHECK (can_access_scope(scope_type, scope_id, 'manage'));

ALTER TABLE governance_action_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY governance_action_steps_select_policy ON governance_action_steps
FOR SELECT USING (can_access_governance_action(governance_action_id, 'read_governance'));
CREATE POLICY governance_action_steps_insert_policy ON governance_action_steps
FOR INSERT WITH CHECK (can_access_governance_action(governance_action_id, 'manage_governance'));
CREATE POLICY governance_action_steps_update_policy ON governance_action_steps
FOR UPDATE USING (can_access_governance_action(governance_action_id, 'manage_governance'))
WITH CHECK (can_access_governance_action(governance_action_id, 'manage_governance'));

ALTER TABLE policy_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY policy_checks_select_policy ON policy_checks
FOR SELECT USING (can_access_governance_action(governance_action_id, 'read_governance'));
CREATE POLICY policy_checks_insert_policy ON policy_checks
FOR INSERT WITH CHECK (can_access_governance_action(governance_action_id, 'manage_governance'));

ALTER TABLE ai_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_steps_select_policy ON ai_steps
FOR SELECT USING (
    can_access_ai_run(ai_run_id, 'read_ai')
    OR can_access_ai_run(ai_run_id, 'run_ai')
);
CREATE POLICY ai_steps_insert_policy ON ai_steps
FOR INSERT WITH CHECK (can_access_ai_run(ai_run_id, 'run_ai'));
CREATE POLICY ai_steps_update_policy ON ai_steps
FOR UPDATE USING (can_access_ai_run(ai_run_id, 'run_ai'))
WITH CHECK (can_access_ai_run(ai_run_id, 'run_ai'));

ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY tool_calls_select_policy ON tool_calls
FOR SELECT USING (
    can_access_ai_run(ai_run_id, 'read_ai')
    OR can_access_ai_run(ai_run_id, 'run_ai')
);
CREATE POLICY tool_calls_insert_policy ON tool_calls
FOR INSERT WITH CHECK (can_access_ai_run(ai_run_id, 'run_ai'));
CREATE POLICY tool_calls_update_policy ON tool_calls
FOR UPDATE USING (can_access_ai_run(ai_run_id, 'run_ai'))
WITH CHECK (can_access_ai_run(ai_run_id, 'run_ai'));

ALTER TABLE verification_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY verification_results_select_policy ON verification_results
FOR SELECT USING (
    can_access_verification_result(id, 'read')
    OR can_access_verification_result(id, 'write')
);
CREATE POLICY verification_results_insert_policy ON verification_results
FOR INSERT WITH CHECK (
    can_access_evidence_origin(subject_type, subject_id, 'write')
    OR (
        subject_type = 'REPAIR'
        AND (
            session_is_human_authority()
            OR scope_grant_allows('SYSTEM', NULL, 'manage_governance')
        )
    )
);
CREATE POLICY verification_results_update_policy ON verification_results
FOR UPDATE USING (can_access_verification_result(id, 'write'))
WITH CHECK (
    can_access_evidence_origin(subject_type, subject_id, 'write')
    OR (
        subject_type = 'REPAIR'
        AND (
            session_is_human_authority()
            OR scope_grant_allows('SYSTEM', NULL, 'manage_governance')
        )
    )
);

ALTER TABLE evidence_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY evidence_links_select_policy ON evidence_links
FOR SELECT USING (
    can_access_evidence_origin(from_type, from_id, 'read')
    AND can_access_evidence_object(artifact_id, source_record_id, 'read')
);
CREATE POLICY evidence_links_insert_policy ON evidence_links
FOR INSERT WITH CHECK (
    can_access_evidence_origin(from_type, from_id, 'write')
    AND can_access_evidence_object(artifact_id, source_record_id, 'write')
);

ALTER TABLE state_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY state_snapshots_select_policy ON state_snapshots
FOR SELECT USING (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'read_governance')
);
CREATE POLICY state_snapshots_insert_policy ON state_snapshots
FOR INSERT WITH CHECK (
    session_is_human_authority()
    OR scope_grant_allows('SYSTEM', NULL, 'manage_governance')
);

ALTER TABLE transactional_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY transactional_outbox_select_policy ON transactional_outbox
FOR SELECT USING (scope_grant_allows('SYSTEM', NULL, 'publish_events'));
CREATE POLICY transactional_outbox_update_policy ON transactional_outbox
FOR UPDATE USING (scope_grant_allows('SYSTEM', NULL, 'publish_events'))
WITH CHECK (scope_grant_allows('SYSTEM', NULL, 'publish_events'));

ALTER TABLE event_consumer_offsets ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_consumer_offsets_select_policy ON event_consumer_offsets
FOR SELECT USING (scope_grant_allows('SYSTEM', NULL, 'publish_events'));
CREATE POLICY event_consumer_offsets_insert_policy ON event_consumer_offsets
FOR INSERT WITH CHECK (scope_grant_allows('SYSTEM', NULL, 'publish_events'));
CREATE POLICY event_consumer_offsets_update_policy ON event_consumer_offsets
FOR UPDATE USING (scope_grant_allows('SYSTEM', NULL, 'publish_events'))
WITH CHECK (scope_grant_allows('SYSTEM', NULL, 'publish_events'));

-- Immutable evidence streams are read-only through ordinary application roles.
ALTER TABLE audit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_entries_select_policy ON audit_entries
FOR SELECT USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'read_audit')
        OR (
            (business_id IS NOT NULL OR entity_id IS NOT NULL)
            AND (business_id IS NULL OR can_access_business(business_id, 'read_audit'))
            AND (entity_id IS NULL OR can_access_entity(entity_id, 'read_audit'))
        )
    )
    AND history_record_access_allows(
        target_type, target_id, access_classification, business_id, entity_id
    )
);

ALTER TABLE canonical_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY canonical_events_select_policy ON canonical_events
FOR SELECT USING (
    (
        session_is_human_authority()
        OR scope_grant_allows('SYSTEM', NULL, 'read_events')
        OR (
            (business_id IS NOT NULL OR entity_id IS NOT NULL)
            AND (business_id IS NULL OR can_access_business(business_id, 'read_events'))
            AND (entity_id IS NULL OR can_access_entity(entity_id, 'read_events'))
        )
    )
    AND history_record_access_allows(
        aggregate_type, aggregate_id, access_classification, business_id, entity_id
    )
);

-- Security-definer helper functions are intentionally callable only by roles
-- granted explicit EXECUTE during deployment.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA entral FROM PUBLIC;
REVOKE ALL ON FUNCTION session_is_authenticated() FROM PUBLIC;
REVOKE ALL ON FUNCTION session_is_human_authority() FROM PUBLIC;
REVOKE ALL ON FUNCTION scope_grant_allows(scope_type, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_business(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_entity(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_mission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_ai_run(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_scope(scope_type, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_task(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_governance_action(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_evidence_object(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_evidence_origin(text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION can_access_verification_result(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION verification_refs_access_allows(text, uuid, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION session_app_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION classification_access_allows(text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION retrieval_log_refs_access_allows(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION history_record_access_allows(text, uuid, text, uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION phase150_record_refs_access_allows(jsonb, uuid, scope_type, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION phase150_record_refs_max_classification(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION bind_authenticated_app_user(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION bind_service_app_user(uuid) FROM PUBLIC;

-- Lock every canonical SECURITY DEFINER function, including the functions
-- installed by Phases 140 and 150, against temporary-schema shadowing.
DO $$
DECLARE
    secured_function record;
BEGIN
    FOR secured_function IN
        SELECT p.oid::regprocedure AS signature
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'entral'
          AND p.prosecdef
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %s SET search_path TO pg_catalog, entral, pg_temp',
            secured_function.signature
        );
    END LOOP;
END $$;

COMMIT;
