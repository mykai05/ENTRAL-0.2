-- Phase 204 internal-commerce least-privilege reconciliation.
BEGIN;

REVOKE ALL ON TABLE
  entral.phase204_mutation_receipts,
  entral.phase204_capability_source_bindings,
  entral.phase204_business_capability_installations,
  entral.phase204_internal_commerce_activations,
  entral.phase204_internal_commerce_products,
  entral.phase204_product_bundle_items,
  entral.phase204_product_assets,
  entral.phase204_product_gate_receipts,
  entral.phase204_storefronts,
  entral.phase204_storefront_state_events,
  entral.phase204_publication_approval_envelopes,
  entral.phase204_provider_facts,
  entral.phase204_commerce_control_events,
  entral.phase204_storefront_listing_records,
  entral.phase204_publication_product_approvals,
  entral.phase204_operational_metric_truth,
  entral.phase204_commerce_controls
FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;

DO $phase204_revoke_functions$
DECLARE function_record record;
DECLARE role_name text;
BEGIN
  FOR function_record IN
    SELECT proc.oid::regprocedure AS identity
    FROM pg_proc proc
    JOIN pg_namespace namespace ON namespace.oid=proc.pronamespace
    WHERE namespace.nspname='entral'
      AND proc.proname LIKE 'phase204\_%' ESCAPE '\'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',function_record.identity);
    FOREACH role_name IN ARRAY ARRAY[
      'entral_api','entral_worker','entral_verifier','entral_audit_reader'
    ]::text[] LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM %I',function_record.identity,role_name);
    END LOOP;
  END LOOP;
END
$phase204_revoke_functions$;

-- Runtime roles never receive direct Phase 204 table writes. Every mutation is
-- tenant/actor checked, idempotent, and audit-bound inside a SECURITY DEFINER
-- entry point with an explicit safe search_path.
GRANT EXECUTE ON FUNCTION
  entral.phase204_register_tenant_capability(jsonb),
  entral.phase204_record_capability_evidence(jsonb),
  entral.phase204_bind_capability_requirement(jsonb),
  entral.phase204_register_capability_installation(jsonb),
  entral.phase204_transition_capability_installation(jsonb),
  entral.phase204_tenant_capability_readback(uuid,uuid),
  entral.phase204_activate_internal_commerce(jsonb),
  entral.phase204_register_product_evidence(jsonb),
  entral.phase204_register_product_asset(jsonb),
  entral.phase204_record_product_gate(jsonb),
  entral.phase204_record_storefront_state(jsonb),
  entral.phase204_approve_publication(jsonb),
  entral.phase204_publication_allowed(uuid),
  entral.phase204_ingest_provider_fact(jsonb),
  entral.phase204_record_listing_state(jsonb),
  entral.phase204_record_metric_truth(jsonb),
  entral.phase204_set_commerce_control(jsonb),
  entral.phase204_internal_commerce_readback(uuid,uuid)
TO entral_api;

GRANT EXECUTE ON FUNCTION
  entral.phase204_register_product_asset(jsonb),
  entral.phase204_record_product_gate(jsonb),
  entral.phase204_record_storefront_state(jsonb),
  entral.phase204_publication_allowed(uuid),
  entral.phase204_record_listing_state(jsonb),
  entral.phase204_ingest_provider_fact(jsonb),
  entral.phase204_record_metric_truth(jsonb),
  entral.phase204_set_commerce_control(jsonb),
  entral.phase204_internal_commerce_readback(uuid,uuid)
TO entral_worker;

GRANT SELECT ON TABLE
  entral.phase204_mutation_receipts,
  entral.phase204_capability_source_bindings,
  entral.phase204_business_capability_installations,
  entral.phase204_internal_commerce_activations,
  entral.phase204_internal_commerce_products,
  entral.phase204_product_bundle_items,
  entral.phase204_product_assets,
  entral.phase204_product_gate_receipts,
  entral.phase204_storefronts,
  entral.phase204_storefront_state_events,
  entral.phase204_publication_approval_envelopes,
  entral.phase204_provider_facts,
  entral.phase204_commerce_control_events,
  entral.phase204_storefront_listing_records,
  entral.phase204_publication_product_approvals,
  entral.phase204_operational_metric_truth,
  entral.phase204_commerce_controls
TO entral_verifier;

GRANT EXECUTE ON FUNCTION
  entral.phase204_tenant_capability_readback(uuid,uuid),
  entral.phase204_internal_commerce_readback(uuid,uuid),
  entral.phase204_storefront_manifest_hashes(uuid),
  entral.phase204_product_is_ready(uuid),
  entral.phase204_internal_read_allows(uuid,uuid)
TO entral_verifier;

GRANT SELECT ON TABLE
  entral.phase204_mutation_receipts,
  entral.phase204_capability_source_bindings,
  entral.phase204_business_capability_installations,
  entral.phase204_internal_commerce_activations,
  entral.phase204_internal_commerce_products,
  entral.phase204_product_bundle_items,
  entral.phase204_product_assets,
  entral.phase204_product_gate_receipts,
  entral.phase204_storefronts,
  entral.phase204_storefront_state_events,
  entral.phase204_publication_approval_envelopes,
  entral.phase204_provider_facts,
  entral.phase204_commerce_control_events,
  entral.phase204_storefront_listing_records,
  entral.phase204_publication_product_approvals,
  entral.phase204_operational_metric_truth,
  entral.phase204_commerce_controls
TO entral_audit_reader;

GRANT EXECUTE ON FUNCTION
  entral.phase204_tenant_capability_readback(uuid,uuid),
  entral.phase204_internal_commerce_readback(uuid,uuid),
  entral.phase204_storefront_manifest_hashes(uuid),
  entral.phase204_product_is_ready(uuid),
  entral.phase204_internal_read_allows(uuid,uuid)
TO entral_audit_reader;

COMMIT;
