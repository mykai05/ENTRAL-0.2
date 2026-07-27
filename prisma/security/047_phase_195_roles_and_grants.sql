-- Phase 195 least-privilege grants.
-- Run as a database administrator after migration
-- 20260726190000_phase_195_graph_preferences_release_evidence_and_worker_readiness
-- and after the base 046_roles_and_grants.sql role provisioning.
BEGIN;

REVOKE ALL ON
    entral.graph_view_preferences,
    entral.graph_pinned_positions,
    entral.graph_preference_mutation_receipts,
    entral.canonical_releases,
    entral.migration_fingerprints,
    entral.deployment_evidence,
    entral.pull_request_dispositions,
    entral.runtime_mode_records,
    entral.phase_gate_records,
    entral.worker_readiness_heartbeats
FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;

REVOKE EXECUTE ON FUNCTION entral.session_can_access_organization(text)
FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;
REVOKE EXECUTE ON FUNCTION entral.record_graph_preference_change(
    uuid, text, text, bigint, bigint, integer, text[], integer
) FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;
REVOKE EXECUTE ON FUNCTION entral.release_evidence_access_allows(text)
FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;
REVOKE EXECUTE ON FUNCTION entral.public_worker_readiness()
FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;

-- Member preferences are mutable only through authenticated API transactions.
-- Pinned coordinates remain in a separate table from canonical layout defaults.
GRANT SELECT, INSERT, UPDATE, DELETE ON
    entral.graph_view_preferences,
    entral.graph_pinned_positions
TO entral_api;
GRANT SELECT, INSERT ON entral.graph_preference_mutation_receipts
TO entral_api;
GRANT EXECUTE ON FUNCTION entral.session_can_access_organization(text)
TO entral_api;
GRANT EXECUTE ON FUNCTION entral.record_graph_preference_change(
    uuid, text, text, bigint, bigint, integer, text[], integer
) TO entral_api;

-- Runtime identities receive readback only. Immutable release evidence is
-- recorded exclusively by the migration-only/database-owner CLI identity.
GRANT SELECT ON
    entral.canonical_releases,
    entral.migration_fingerprints,
    entral.deployment_evidence,
    entral.pull_request_dispositions,
    entral.runtime_mode_records,
    entral.phase_gate_records
TO entral_api, entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION entral.release_evidence_access_allows(text)
TO entral_api, entral_audit_reader, entral_verifier;

-- The worker can write only its own RLS-bound heartbeat. The API receives only
-- the sanitized aggregate returned by public_worker_readiness().
GRANT SELECT, INSERT, UPDATE ON entral.worker_readiness_heartbeats
TO entral_worker;
GRANT EXECUTE ON FUNCTION entral.session_app_user_id()
TO entral_worker;
GRANT EXECUTE ON FUNCTION entral.public_worker_readiness()
TO entral_api;

COMMIT;
