-- ENTRAL production PostgreSQL roles and grants.
-- Run as a database administrator AFTER migrations 040-045.
-- These are NOLOGIN group roles. Create separate LOGIN roles and grant them one
-- of these groups; do not put passwords in this file.

BEGIN;

-- PostgreSQL roles and pg_authid are cluster-wide, while advisory locks are
-- database-scoped. Serialize the complete role mutation sequence through the
-- shared catalog so deployments against different databases cannot race.
-- This script already requires a cluster role administrator to create roles.
LOCK TABLE pg_authid IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
    target_role text;
BEGIN
    FOREACH target_role IN ARRAY ARRAY[
        'entral_api',
        'entral_worker',
        'entral_audit_reader',
        'entral_verifier'
    ]
    LOOP
        BEGIN
            EXECUTE format(
                'CREATE ROLE %I NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT',
                target_role
            );
        EXCEPTION
            -- CREATE ROLE has no IF NOT EXISTS. These are the two errors
            -- PostgreSQL can expose when another database creates the same
            -- cluster role between lookup and insertion.
            WHEN duplicate_object OR unique_violation THEN
                NULL;
        END;
    END LOOP;
END $$;

ALTER ROLE entral_api NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
ALTER ROLE entral_worker NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
ALTER ROLE entral_audit_reader NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
ALTER ROLE entral_verifier NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION;
ALTER ROLE entral_api SET search_path = pg_catalog, entral, public;
ALTER ROLE entral_worker SET search_path = pg_catalog, entral, public;
ALTER ROLE entral_audit_reader SET search_path = pg_catalog, entral;
ALTER ROLE entral_verifier SET search_path = pg_catalog, entral;
ALTER ROLE entral_api SET row_security = on;
ALTER ROLE entral_worker SET row_security = on;
ALTER ROLE entral_audit_reader SET row_security = on;
ALTER ROLE entral_verifier SET row_security = on;

REVOKE ALL ON SCHEMA entral FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA entral FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA entral FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA entral FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA entral FROM entral_api, entral_worker, entral_audit_reader, entral_verifier;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA entral FROM entral_api, entral_worker, entral_audit_reader, entral_verifier;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA entral FROM entral_api, entral_worker, entral_audit_reader, entral_verifier;

DO $$
BEGIN
    EXECUTE format('REVOKE TEMPORARY ON DATABASE %I FROM PUBLIC', current_database());
    EXECUTE format(
        'GRANT CONNECT ON DATABASE %I TO entral_api, entral_worker, entral_audit_reader, entral_verifier',
        current_database()
    );
END $$;

GRANT USAGE ON SCHEMA entral TO entral_api, entral_worker, entral_audit_reader, entral_verifier;

-- Reference/configuration records.
GRANT SELECT ON
    entral.taxonomy_versions,
    entral.model_profiles,
    entral.prompt_versions,
    entral.policy_versions,
    entral.authority_profiles,
    entral.tool_definitions,
    entral.metric_definitions
TO entral_api;

-- Existing Prisma application records in public remain available to the API.
-- The worker is limited to the durable queues, agents, policy reads, legacy
-- audit adapter, and Shopify automation records reached by backend/src/worker.ts.
-- Revoke first so reapplying this file removes historical wildcard grants.
GRANT USAGE ON SCHEMA public TO entral_api, entral_worker;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM entral_worker;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM entral_worker;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
TO entral_api;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
TO entral_api;

GRANT SELECT ON
    public."Agent",
    public."AgentTask",
    public."AgentSchedule",
    public."AgentLog",
    public."AgentMessage",
    public."AutomationJob",
    public."AutomationLog",
    public."ClientMerchStore",
    public."AuditLog",
    public."Policy",
    public."GrowthApprovalPacket",
    public."ShopifyConnection",
    public."ShopifyOAuthContinuation"
TO entral_worker;

GRANT INSERT ON
    public."AgentTask",
    public."AgentLog",
    public."AgentMessage",
    public."AutomationJob",
    public."AutomationLog",
    public."AuditLog",
    public."GrowthApprovalPacket",
    public."ShopifyOAuthContinuation"
TO entral_worker;

GRANT UPDATE ON
    public."Agent",
    public."AgentTask",
    public."AgentSchedule",
    public."AutomationJob",
    public."GrowthApprovalPacket",
    public."ShopifyOAuthContinuation"
TO entral_worker;

-- Canonical command/query records belong to authenticated API transactions.
-- The worker is intentionally omitted; its canonical surface is the outbox
-- allowlist below, while legacy automation uses the explicit public allowlist.
GRANT SELECT, INSERT, UPDATE ON
    entral.app_users,
    entral.scope_grants,
    entral.entities,
    entral.businesses,
    entral.business_profiles,
    entral.business_states,
    entral.missions,
    entral.tasks,
    entral.operational_messages,
    entral.governance_actions,
    entral.tool_grants,
    entral.credential_references,
    entral.schedules,
    entral.source_records,
    entral.artifacts,
    entral.memory_items,
    entral.context_manifests,
    entral.ai_runs,
    entral.recommendations,
    entral.experiments
TO entral_api;

-- Append-only records: ordinary roles may insert and read, but not update/delete.
GRANT SELECT, INSERT ON
    entral.financial_snapshots,
    entral.health_assessments,
    entral.decisions,
    entral.outcomes,
    entral.metric_observations,
    entral.cost_records,
    entral.resource_usage,
    entral.retrieval_logs
TO entral_api;

-- Internal orchestration records. These tables are not browser-facing and must
-- still pass service-level scope checks before use.
GRANT SELECT, INSERT, UPDATE ON
    entral.idempotency_keys,
    entral.governance_action_steps,
    entral.ai_steps,
    entral.tool_calls
TO entral_api;
GRANT SELECT, INSERT ON entral.verification_results TO entral_api;
GRANT SELECT, UPDATE ON entral.verification_results TO entral_verifier;
GRANT SELECT, INSERT ON
    entral.policy_checks,
    entral.evidence_links,
    entral.state_snapshots
TO entral_api;

-- Immutable histories and read models.
GRANT SELECT ON
    entral.entity_versions,
    entral.business_versions,
    entral.audit_entries,
    entral.canonical_events,
    entral.v_audit_timeline
TO entral_api, entral_audit_reader;
GRANT SELECT ON
    entral.v_entity_summary,
    entral.v_business_summary
TO entral_api;

-- The active worker publishes the canonical outbox. Consumer offsets remain
-- ungranted until a governed consumer process exists.
GRANT SELECT, UPDATE ON entral.transactional_outbox TO entral_worker;

-- RLS policy helpers.
GRANT EXECUTE ON FUNCTION entral.session_is_authenticated()
TO entral_api, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.session_is_human_authority()
TO entral_api, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.scope_grant_allows(entral.scope_type, uuid, text)
TO entral_api, entral_worker, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.can_access_business(uuid, text)
TO entral_api, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.can_access_entity(uuid, text)
TO entral_api, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.classification_access_allows(text, uuid, uuid)
TO entral_api, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.phase150_record_refs_access_allows(
    jsonb, uuid, entral.scope_type, uuid
) TO entral_api;
GRANT EXECUTE ON FUNCTION entral.phase150_record_refs_access_allows(
    jsonb, uuid, entral.scope_type, uuid
) TO entral_verifier;
GRANT EXECUTE ON FUNCTION entral.retrieval_log_refs_access_allows(uuid)
TO entral_api;
GRANT EXECUTE ON FUNCTION entral.history_record_access_allows(
    text, uuid, text, uuid, uuid
) TO entral_api, entral_audit_reader;
GRANT EXECUTE ON FUNCTION entral.can_access_mission(uuid, text)
TO entral_api;
GRANT EXECUTE ON FUNCTION entral.can_access_ai_run(uuid, text)
TO entral_api, entral_verifier;

GRANT EXECUTE ON FUNCTION entral.session_app_user_id()
TO entral_api, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.can_access_scope(entral.scope_type, uuid, text)
TO entral_api, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.can_access_task(uuid, text)
TO entral_api;
GRANT EXECUTE ON FUNCTION entral.can_access_governance_action(uuid, text)
TO entral_api;
GRANT EXECUTE ON FUNCTION entral.can_access_evidence_object(uuid, uuid, text)
TO entral_api;
GRANT EXECUTE ON FUNCTION entral.can_access_evidence_origin(text, uuid, text)
TO entral_api, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.can_access_verification_result(uuid, text)
TO entral_api, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.verification_refs_access_allows(text, uuid, jsonb)
TO entral_api, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.bind_authenticated_app_user(text)
TO entral_api;
GRANT EXECUTE ON FUNCTION entral.bind_service_app_user(uuid)
TO entral_worker, entral_audit_reader, entral_verifier;

-- Defaults/functions used by inserts and controlled application transactions.
GRANT EXECUTE ON FUNCTION entral.current_actor_kind()
TO entral_api, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.current_actor_id()
TO entral_api, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.current_action_reason()
TO entral_api, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.current_governance_action_id()
TO entral_api;

-- Provision environment-specific LOGIN roles through the deployment secret service.
-- Grant each login exactly one NOLOGIN group role defined above. Passwords,
-- certificates, and tokens must never be committed to this file.
-- Every request or worker transaction must SET LOCAL app.user_id to an active
-- entral.app_users row before reading RLS-protected data.

ALTER DEFAULT PRIVILEGES IN SCHEMA entral REVOKE ALL ON TABLES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA entral REVOKE ALL ON SEQUENCES FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA entral REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON TABLES FROM entral_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    REVOKE ALL ON SEQUENCES FROM entral_worker;
ALTER DEFAULT PRIVILEGES IN SCHEMA entral
    REVOKE ALL ON TABLES FROM entral_verifier;
ALTER DEFAULT PRIVILEGES IN SCHEMA entral
    REVOKE ALL ON SEQUENCES FROM entral_verifier;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO entral_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO entral_api;

COMMIT;
