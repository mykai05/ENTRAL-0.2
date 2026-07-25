-- Phase 140 repository migration. Canonical source order is preserved inside a rollback-safe transaction.
BEGIN;
-- ENTRAL migration 001: extensions, schema, shared types, and utility functions.
-- PostgreSQL 16+ recommended. Run inside a controlled migration transaction.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS entral;
SET LOCAL search_path = entral, public;

DO $$ BEGIN
    CREATE TYPE entity_role AS ENUM ('ENTRAL', 'MARSHAL', 'GENERAL', 'COMMANDER', 'SOLDIER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE entity_status AS ENUM ('BUILDING', 'ACTIVE', 'PAUSED', 'DEGRADED', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE business_status AS ENUM ('BUILDING', 'OPERATING', 'PAUSED', 'DEGRADED', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE mission_status AS ENUM ('DRAFT', 'ROUTING', 'ACKNOWLEDGED', 'ACTIVE', 'BLOCKED', 'COMPLETED', 'FAILED', 'STOPPED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('NOT_STARTED', 'ACTIVE', 'BLOCKED', 'COMPLETED', 'FAILED', 'STOPPED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE actor_kind AS ENUM ('HUMAN', 'ENTITY', 'SYSTEM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE message_type AS ENUM (
        'MissionOrder', 'DoctrineUpdate', 'BudgetGrant', 'PermissionGrant', 'TaskOrder',
        'ExecutionReport', 'KPIReport', 'Exception', 'Escalation', 'Recommendation', 'CompletionReport',
        'Acknowledgement', 'Clarification'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM ('CREATED', 'DELIVERED', 'ACKNOWLEDGED', 'REJECTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE governance_action_type AS ENUM (
        'CREATE', 'EDIT', 'PAUSE', 'RESUME', 'RECONFIGURE', 'DUPLICATE', 'REASSIGN',
        'RETARGET', 'RETIRE', 'RESTORE', 'ROLLBACK', 'ISOLATE', 'REPAIR', 'BUDGET_CHANGE',
        'MODEL_CHANGE', 'TOOL_GRANT_CHANGE', 'POLICY_CHANGE', 'SCHEDULE_CHANGE'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE action_status AS ENUM ('PROPOSED', 'VALIDATING', 'AUTHORIZED', 'EXECUTING', 'VERIFYING', 'SUCCEEDED', 'FAILED', 'ROLLED_BACK', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE risk_class AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE scope_type AS ENUM ('SYSTEM', 'MARSHAL', 'GENERAL', 'BUSINESS', 'ENTITY', 'MISSION', 'USER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE memory_kind AS ENUM ('CANONICAL_FACT', 'DOCTRINE', 'EPISODIC', 'WORKING', 'DERIVED_SUMMARY', 'PROPOSED_KNOWLEDGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE validation_state AS ENUM ('UNVERIFIED', 'VERIFIED', 'REJECTED', 'SUPERSEDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE ai_run_status AS ENUM ('QUEUED', 'RUNNING', 'WAITING_FOR_TOOL', 'VERIFYING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE tool_call_status AS ENUM ('PROPOSED', 'AUTHORIZED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE health_state AS ENUM ('HEALTHY', 'WATCH', 'DEGRADED', 'CRITICAL', 'UNKNOWN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE recommendation_status AS ENUM ('OPEN', 'ACCEPTED', 'EXECUTING', 'COMPLETED', 'DISMISSED', 'EXPIRED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('PENDING', 'PASSED', 'FAILED', 'INCONCLUSIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE artifact_kind AS ENUM ('DOCUMENT', 'REPORT', 'DATASET', 'IMAGE', 'SCREENSHOT', 'LOG', 'EXPORT', 'EVIDENCE_BUNDLE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    CREATE TYPE schedule_status AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED', 'RETIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION forbid_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION '% is append-only; % is not permitted', TG_TABLE_NAME, TG_OP
        USING ERRCODE = '55000';
END $$;

CREATE OR REPLACE FUNCTION current_actor_kind()
RETURNS entral.actor_kind
LANGUAGE sql
STABLE
SET search_path = pg_catalog, entral
AS $$
    SELECT COALESCE(
        NULLIF(current_setting('app.actor_kind', true), '')::entral.actor_kind,
        'SYSTEM'::entral.actor_kind
    )
$$;

CREATE OR REPLACE FUNCTION current_actor_id()
RETURNS uuid LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.actor_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION current_action_reason()
RETURNS text LANGUAGE sql STABLE AS $$
    SELECT NULLIF(current_setting('app.action_reason', true), '')
$$;

COMMIT;
