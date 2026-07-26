-- ENTRAL database invariant checks.
-- Every query marked EXPECT ZERO must return no rows.
SET search_path = entral, public;

-- EXPECT exactly 1.
SELECT count(*) AS nonretired_entral_count
FROM entities
WHERE role = 'ENTRAL' AND status <> 'RETIRED';

-- EXPECT exactly: ENTRAL 1, MARSHAL 8, GENERAL 123 for canonical taxonomy.
SELECT role, count(*)
FROM entities
WHERE taxonomy_version_id = 'd10d945f-fdde-5cb2-aee5-7be737fa52f1'::uuid
  AND status <> 'RETIRED'
GROUP BY role
ORDER BY role;

-- EXPECT ZERO: invalid parent role.
SELECT e.id, e.stable_code, e.role, p.role AS parent_role
FROM entities e
LEFT JOIN entities p ON p.id = e.parent_id
WHERE
    (e.role = 'ENTRAL' AND e.parent_id IS NOT NULL)
 OR (e.role = 'MARSHAL' AND p.role IS DISTINCT FROM 'ENTRAL')
 OR (e.role = 'GENERAL' AND p.role IS DISTINCT FROM 'MARSHAL')
 OR (e.role = 'COMMANDER' AND p.role IS DISTINCT FROM 'GENERAL')
 OR (e.role = 'SOLDIER' AND p.role IS DISTINCT FROM 'COMMANDER');

-- EXPECT ZERO: hierarchy cycle.
WITH RECURSIVE walk AS (
    SELECT id AS origin_id, id, parent_id, ARRAY[id] AS path, false AS cycle
    FROM entities
    UNION ALL
    SELECT w.origin_id, e.id, e.parent_id, w.path || e.id, e.id = ANY(w.path)
    FROM walk w
    JOIN entities e ON e.id = w.parent_id
    WHERE NOT w.cycle
)
SELECT DISTINCT origin_id FROM walk WHERE cycle;

-- EXPECT ZERO: business ownership mismatch.
SELECT
    b.id AS business_id,
    b.commander_id,
    commander.role AS commander_role,
    commander.parent_id AS commander_parent,
    b.general_id,
    general.parent_id AS general_parent,
    b.marshal_id
FROM businesses b
JOIN entities commander ON commander.id = b.commander_id
JOIN entities general ON general.id = b.general_id
WHERE commander.role <> 'COMMANDER'
   OR commander.parent_id <> b.general_id
   OR general.role <> 'GENERAL'
   OR general.parent_id <> b.marshal_id
   OR commander.business_id <> b.id;

-- EXPECT ZERO: Soldier is not bound to its Commander's business.
SELECT soldier.id, soldier.business_id, commander.business_id AS commander_business_id
FROM entities soldier
JOIN entities commander ON commander.id = soldier.parent_id
WHERE soldier.role = 'SOLDIER'
  AND soldier.business_id IS DISTINCT FROM commander.business_id;

-- EXPECT ZERO: rejected route marked delivered or acknowledged.
SELECT id, route_error, status, delivered_at, acknowledged_at
FROM operational_messages
WHERE NOT route_valid
  AND (
      status <> 'REJECTED'
      OR delivered_at IS NOT NULL
      OR acknowledged_at IS NOT NULL
  );

-- EXPECT ZERO: sovereign action initiated by an entity other than ENTRAL.
SELECT ga.id, ga.initiated_by_entity_id, e.role
FROM governance_actions ga
JOIN entities e ON e.id = ga.initiated_by_entity_id
WHERE ga.initiated_by_kind = 'ENTITY' AND e.role <> 'ENTRAL';

-- EXPECT ZERO: active tool grant crosses entity/business scope.
SELECT tg.id, tg.business_id, e.business_id AS entity_business_id
FROM tool_grants tg
JOIN entities e ON e.id = tg.entity_id
WHERE e.business_id IS NOT NULL
  AND tg.business_id IS DISTINCT FROM e.business_id
  AND (tg.expires_at IS NULL OR tg.expires_at > clock_timestamp());

-- EXPECT ZERO: business credential production used by another business.
SELECT tg.id, tg.business_id, cr.owning_business_id
FROM tool_grants tg
JOIN credential_references cr ON cr.id = tg.credential_reference_id
WHERE cr.owning_business_id IS NOT NULL
  AND tg.business_id IS DISTINCT FROM cr.owning_business_id;

-- EXPECT ZERO: canonical event missing outbox record.
SELECT ce.id, ce.sequence_number
FROM canonical_events ce
LEFT JOIN transactional_outbox o ON o.event_id = ce.id
WHERE o.id IS NULL;

-- EXPECT ZERO: successful action without verification result.
SELECT ga.id, ga.action_type, ga.completed_at
FROM governance_actions ga
LEFT JOIN verification_results vr ON vr.id = ga.verification_result_id
WHERE ga.status = 'SUCCEEDED'
  AND (vr.id IS NULL OR vr.status <> 'PASSED');

-- EXPECT ZERO: production AI run missing model, context, or completion accounting.
SELECT ar.id, ar.status, ar.model_profile_id, ar.context_manifest_id
FROM ai_runs ar
WHERE ar.status IN ('SUCCEEDED','FAILED')
  AND (
      ar.model_profile_id IS NULL
      OR ar.context_manifest_id IS NULL
      OR ar.completed_at IS NULL
  );

-- EXPECT ZERO: verified or derived memory without traceable provenance.
SELECT mi.id, mi.memory_kind, mi.validation_state
FROM memory_items mi
WHERE (
        mi.validation_state = 'VERIFIED'
        OR mi.memory_kind = 'DERIVED_SUMMARY'
      )
  AND mi.source_record_id IS NULL
  AND mi.source_artifact_id IS NULL
  AND mi.provenance = '{}'::jsonb;

-- EXPECT ZERO: stale OPEN recommendation.
SELECT id, objective, expires_at
FROM recommendations
WHERE status = 'OPEN'
  AND expires_at IS NOT NULL
  AND expires_at <= clock_timestamp();
