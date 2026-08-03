BEGIN;

SET LOCAL search_path = pg_catalog, public, entral, pg_temp;

-- Phase 202 intentionally intersected the legacy entity authority predicate with
-- the active tenant boundary. Migrated organizations that predate business
-- boundaries still share the canonical ENTRAL -> MARSHAL -> GENERAL taxonomy,
-- however, so a tenant with no businesses could no longer see even the single
-- canonical root. Keep every legacy authority check and business-boundary rule,
-- and add only a read-only shared-taxonomy projection. A malformed graph with
-- anything other than one parentless ENTRAL root remains fail closed.
CREATE OR REPLACE FUNCTION entral.can_access_entity(
  p_entity_id uuid,p_permission text DEFAULT 'read'
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  WITH RECURSIVE canonical_root(id) AS (
    SELECT (array_agg(entity.id ORDER BY entity.id))[1]
    FROM entral.entities entity
    WHERE entity.role='ENTRAL'
      AND entity.parent_id IS NULL
      AND entity.business_id IS NULL
      AND entity.status<>'RETIRED'
    HAVING count(*)=1
  ), shared_taxonomy(id) AS (
    SELECT id FROM canonical_root
    UNION
    SELECT child.id
    FROM entral.entities child
    JOIN shared_taxonomy parent ON parent.id=child.parent_id
    WHERE child.business_id IS NULL
      AND child.role IN ('MARSHAL','GENERAL')
      AND child.status<>'RETIRED'
  )
  SELECT entral.phase202_legacy_can_access_entity(p_entity_id,p_permission)
    AND (
      entral.phase202_canonical_entity_in_session_tenant(p_entity_id)
      OR (
        p_permission='read'
        AND p_entity_id IN (SELECT id FROM shared_taxonomy)
        AND entral.phase202_tenant_access_allows(
          entral.phase202_current_tenant_id(),
          NULLIF(current_setting('app.organization_id',true),'')::uuid,
          'read:TenantBoundary',
          NULL
        )
      )
    )
$$;

-- Phase 200 tutorial rows already carry an exact user/team subject predicate.
-- Phase 202 omitted the two tutorial table names from the human authorization
-- classifier, causing that exact predicate to deny every migrated human. Add
-- only those tables; the subject, tenant, organization, actor, and role checks
-- remain unchanged.
CREATE OR REPLACE FUNCTION entral.phase202_human_access_allows(
  p_role text,p_authority_domains text[],p_permission text
) RETURNS boolean
LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $$
  WITH requested AS (
    SELECT split_part(p_permission,':',1) AS action,split_part(p_permission,':',2) AS table_name
  ), classified AS (
    SELECT action,table_name,
      table_name=ANY(ARRAY[
        'Team','TenantBoundary','TenantActorAssignment','TeamMember','MembershipInvitation',
        'MembershipMutationReceipt','NotificationEvidence','NotificationDeliveryOutbox','AuthSession'
      ]::text[]) AS identity_table,
      table_name=ANY(ARRAY[
        'BusinessBoundary','CustomerRecordOwnership','AutonomyEnvelopeRecord','ClientMerchStore',
        'RevenueOpportunity','RevenuePerformanceSnapshot','RevenueAssetControlRecord','RevenueMoneyArmyBatchRun',
        'FacelessContentBrief','FacelessContentPerformanceSnapshot','PortfolioCommandAction',
        'RevenueLaunchHandoffPacket','RevenueSignalConnectorApproval','RevenueSignalImportJob',
        'Agent','AgentTask','AgentSchedule','CommandOSSnapshot','CommandOSReport','Conversation',
        'AutomationJob','PodProduct','AgentLog','AgentMessage','Message','AutomationLog',
        'MemberWorkspaceSnapshot','MemberTutorialProgress','MemberTutorialMutationReceipt',
        'Task','AuditLog'
      ]::text[]) AS operations_table,
      table_name=ANY(ARRAY[
        'FinancialSplitPolicy','FinancialLedgerEntry','FinancialPayoutIntent','FinancialBudgetReleasePacket',
        'FinancialScalingBudgetPacket','FinancialScalingSpendPacket','FinancialScalingExecutionEntry',
        'FinancialReconciliationReport'
      ]::text[]) AS finance_table,
      table_name=ANY(ARRAY['SecretReference','SecretAccessAudit','SecretMutationReceipt','ShopifyConnection','ShopifyOAuthContinuation','GrowthApprovalPacket']::text[]) AS integrations_table,
      table_name=ANY(ARRAY['SupportAccessGrant','SupportAccessAudit']::text[]) AS support_table,
      table_name=ANY(ARRAY['TenantRateLimitWindow','TenantRateLimitReceipt']::text[]) AS rate_limit_table,
      table_name='AiUsageEvent' AS ai_usage_table
    FROM requested
  )
  SELECT action IN ('read','write') AND CASE
    WHEN p_role='OWNER' THEN
      identity_table OR operations_table OR finance_table OR integrations_table
      OR support_table OR rate_limit_table OR ai_usage_table
    WHEN p_role='TENANT_ADMIN' THEN
      (
        identity_table
        AND (p_authority_domains && ARRAY['IDENTITY','TENANCY']::text[])
      )
      OR (
        operations_table
        AND 'OPERATIONS'=ANY(p_authority_domains)
      )
      OR (
        finance_table
        AND 'FINANCE'=ANY(p_authority_domains)
      )
      OR (
        integrations_table
        AND 'INTEGRATIONS'=ANY(p_authority_domains)
      )
      OR (
        support_table
        AND action='read'
        AND 'SUPPORT'=ANY(p_authority_domains)
      )
      OR rate_limit_table
      OR (
        ai_usage_table
        AND action='read'
        AND 'OPERATIONS'=ANY(p_authority_domains)
      )
    WHEN p_role='MEMBER' THEN
      action='read'
      AND 'OPERATIONS'=ANY(p_authority_domains)
      AND (
        operations_table
        OR table_name=ANY(ARRAY['Team','TenantBoundary','TeamMember']::text[])
      )
    ELSE false
  END
  FROM classified
$$;

-- Phase 200 interaction analytics is an append-only, content-free member event.
-- Preserve the Phase 202 AuditLog write boundary and extend its member-session
-- exception only to the four released interaction actions, their exact target
-- type, and a UUID event id under the current human actor/tenant/organization.
CREATE OR REPLACE FUNCTION entral.phase202_member_session_audit_insert_allows(
  p_scope_kind text,p_organization_id uuid,p_tenant_id uuid,
  p_actor_id uuid,p_created_by uuid,p_owned_by uuid,p_actor_user_id text,
  p_action text,p_target_type text,p_target_id text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,entral,pg_temp
AS $phase203_member_audit$
  SELECT p_scope_kind='TENANT'
    AND p_organization_id=NULLIF(current_setting('app.organization_id',true),'')::uuid
    AND p_tenant_id=entral.phase202_current_tenant_id()
    AND p_actor_id=entral.phase202_current_actor_id()
    AND p_created_by=p_actor_id AND p_owned_by=p_actor_id
    AND entral.phase202_member_auth_session_access_allows(
      p_actor_id,p_tenant_id,p_organization_id
    )
    AND EXISTS (
      SELECT 1 FROM "IdentityActor" actor
      WHERE actor."id"=p_actor_id AND actor."humanUserId"=p_actor_user_id
        AND actor."actorType"='HUMAN' AND actor."status"='ACTIVE'
    )
    AND (
      (
        p_action IN ('auth.session.issued','auth.session.refreshed')
        AND p_target_type='auth_session' AND NULLIF(p_target_id,'') IS NOT NULL
        AND (
          p_action='auth.session.issued'
          OR EXISTS (
            SELECT 1 FROM "AuthSession" session
            WHERE session."id"=p_target_id::uuid AND session."sessionType"='MEMBER'
              AND session."actorId"=p_actor_id AND session."tenantId"=p_tenant_id
              AND session."organizationId"=p_organization_id
              AND session."supportGrantId" IS NULL
              AND session."revokedAt" IS NULL AND session."expiresAt">now()
          )
        )
      )
      OR (
        p_action IN (
          'interaction.route_failure','interaction.tutorial_abandoned',
          'interaction.help_used','interaction.control_failed'
        )
        AND p_target_type='INTERACTION_ANALYTICS'
        AND p_target_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    )
$phase203_member_audit$;

COMMENT ON FUNCTION entral.can_access_entity(uuid,text) IS
  'Phase 203 graph recovery: legacy authority plus tenant business lineage or read-only shared canonical ENTRAL taxonomy.';
COMMENT ON FUNCTION entral.phase202_human_access_allows(text,text[],text) IS
  'Phase 202 human authority classifier with exact-subject Phase 200 tutorial storage restored in Phase 203 preflight.';
COMMENT ON FUNCTION entral.phase202_member_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,text,text,text,text) IS
  'Phase 202 member session audit boundary with exact Phase 200 interaction analytics events restored in Phase 203 preflight.';

COMMIT;
