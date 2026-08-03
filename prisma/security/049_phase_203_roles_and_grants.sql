-- Phase 203 Capability Truth Registry least-privilege reconciliation.
BEGIN;

REVOKE ALL ON TABLE
  entral.capability_registry_revision,
  entral.capability_records,
  entral.capability_dependencies,
  entral.capability_verification_receipts,
  entral.tenant_capability_installations,
  entral.product_claims,
  entral.product_claim_evidence_receipts,
  entral.capability_transition_audit,
  entral.product_claim_transition_audit,
  entral.capability_mutation_receipts,
  entral.publication_decision_audit
FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;

REVOKE EXECUTE ON FUNCTION
  entral.phase203_admin_access_allows(),
  entral.phase203_lifecycle_rank(text),
  entral.phase203_dependencies_healthy(uuid,text),
  entral.phase203_activation_requirements_healthy(uuid,text),
  entral.phase203_required_evidence_present(uuid,text,text[]),
  entral.phase203_transition_evidence_includes(uuid,text,uuid[],text[]),
  entral.phase203_capability_record_json(uuid),
  entral.phase203_bump_registry_revision(),
  entral.phase203_registry_revision(),
  entral.phase203_block_append_only_mutation(),
  entral.phase203_guard_capability_transition(),
  entral.phase203_guard_claim_transition(),
  entral.phase203_block_claim_core_mutation(),
  entral.phase203_guard_claim_evidence_binding(),
  entral.phase203_record_capability_evidence(uuid,bigint,jsonb,text),
  entral.phase203_transition_capability(jsonb),
  entral.phase203_register_product_claim(jsonb,text),
  entral.phase203_transition_product_claim(jsonb),
  entral.phase203_publication_gate(text,text,uuid,uuid),
  entral.phase203_admin_readback(),
  entral.phase203_internal_read_allows()
FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;

-- Direct writes are intentionally absent. Security-definer functions own
-- evidence recording, lifecycle changes, claim approvals, publication audits,
-- revision increments, and idempotency receipts.
GRANT SELECT ON TABLE
  entral.capability_registry_revision,
  entral.capability_records,
  entral.capability_dependencies,
  entral.capability_verification_receipts,
  entral.tenant_capability_installations,
  entral.product_claims,
  entral.product_claim_evidence_receipts,
  entral.capability_transition_audit,
  entral.product_claim_transition_audit,
  entral.capability_mutation_receipts,
  entral.publication_decision_audit
TO entral_verifier;

GRANT SELECT ON TABLE
  entral.capability_transition_audit,
  entral.product_claim_transition_audit,
  entral.capability_mutation_receipts,
  entral.publication_decision_audit
TO entral_audit_reader;

-- Policy predicates are callable but reveal no row data themselves.
GRANT EXECUTE ON FUNCTION
  entral.phase203_admin_access_allows(),
  entral.phase203_internal_read_allows()
TO entral_audit_reader, entral_verifier;

-- The API runtime exposes public truth only through the fail-closed gateway;
-- internal mutation/readback functions still require exact human administrator
-- identity inside their function bodies.
GRANT EXECUTE ON FUNCTION
  entral.phase203_publication_gate(text,text,uuid,uuid),
  entral.phase203_registry_revision(),
  entral.phase203_admin_readback(),
  entral.phase203_record_capability_evidence(uuid,bigint,jsonb,text),
  entral.phase203_transition_capability(jsonb),
  entral.phase203_register_product_claim(jsonb,text),
  entral.phase203_transition_product_claim(jsonb)
TO entral_api;

COMMIT;
