-- Phase 202 authoritative public-schema role reconciliation.
--
-- This packet deliberately replaces the historical public-schema wildcard grants
-- from 046 with named runtime allowlists. The Phase 195 entral.graph_view_preferences
-- grants remain governed by 047_phase_195_roles_and_grants.sql and are not changed here.

BEGIN;

-- Fail closed for every public object that could have inherited the historical
-- wildcard/default grants. Migration ownership remains with the deployment role.
REVOKE ALL ON ALL TABLES IN SCHEMA public
  FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public
  FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;

-- Do not allow a later migration created by this deployment principal to
-- silently restore broad application privileges.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES
  FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES
  FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS
  FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;

GRANT USAGE ON SCHEMA public TO entral_api, entral_worker;
GRANT USAGE ON SCHEMA public, entral TO entral_audit_reader, entral_verifier;
GRANT EXECUTE ON FUNCTION public.gen_random_uuid() TO entral_api, entral_worker;
-- Canonical Phase 150 tool-call writes compute their bounded request digest in
-- PostgreSQL; expose only the pure pgcrypto hash overloads to the API role.
GRANT EXECUTE ON FUNCTION public.digest(bytea,text), public.digest(text,text)
TO entral_api;

-- API read surface used by the application. Internal Prisma migration state and
-- Phase 202 reconciliation-only tables are intentionally absent.
GRANT SELECT ON TABLE
  public."User",
  public."EmailVerificationToken",
  public."PasswordResetToken",
  public."ClientMerchStore",
  public."ShopifyConnection",
  public."ShopifyOAuthContinuation",
  public."RevenueOpportunity",
  public."GrowthApprovalPacket",
  public."PodProduct",
  public."RevenuePerformanceSnapshot",
  public."RevenueAssetControlRecord",
  public."RevenueMoneyArmyBatchRun",
  public."FinancialSplitPolicy",
  public."FinancialLedgerEntry",
  public."FinancialPayoutIntent",
  public."FinancialBudgetReleasePacket",
  public."FinancialScalingBudgetPacket",
  public."FinancialScalingSpendPacket",
  public."FinancialScalingExecutionEntry",
  public."FinancialReconciliationReport",
  public."FacelessContentBrief",
  public."FacelessContentPerformanceSnapshot",
  public."PortfolioCommandAction",
  public."RevenueLaunchHandoffPacket",
  public."RevenueSignalConnectorApproval",
  public."RevenueSignalImportJob",
  public."Agent",
  public."AgentTask",
  public."AgentSchedule",
  public."Policy",
  public."AuditLog",
  public."CommandOSSnapshot",
  public."CommandOSReport",
  public."AgentLog",
  public."AgentMessage",
  public."Conversation",
  public."Message",
  public."AiUsageEvent",
  public."AutomationJob",
  public."AutomationLog",
  public."Team",
  public."MemberTutorialProgress",
  public."MemberTutorialMutationReceipt",
  public."MemberWorkspaceSnapshot",
  public."TeamMember",
  public."Task"
TO entral_api;

-- Existing mutable application surface, named rather than schema-wide. The
-- Phase 202 identity, credential, support, rate-limit, and evidence tables use
-- the narrower operation-specific grants below.
GRANT INSERT, UPDATE, DELETE ON TABLE
  public."ClientMerchStore",
  public."RevenueOpportunity",
  public."PodProduct",
  public."RevenuePerformanceSnapshot",
  public."RevenueAssetControlRecord",
  public."FinancialSplitPolicy",
  public."FinancialLedgerEntry",
  public."FinancialPayoutIntent",
  public."FinancialScalingExecutionEntry",
  public."FinancialReconciliationReport",
  public."FacelessContentBrief",
  public."FacelessContentPerformanceSnapshot",
  public."PortfolioCommandAction",
  public."Agent",
  public."AgentTask",
  public."AgentSchedule",
  public."Policy",
  public."AgentLog",
  public."AgentMessage",
  public."Conversation",
  public."Message",
  public."AiUsageEvent",
  public."AutomationJob",
  public."AutomationLog",
  public."Task"
TO entral_api;

GRANT INSERT ON TABLE
  public."EmailVerificationToken",
  public."PasswordResetToken"
TO entral_api;

GRANT INSERT, UPDATE ON TABLE
  public."ShopifyConnection",
  public."ShopifyOAuthContinuation",
  public."GrowthApprovalPacket",
  public."RevenueMoneyArmyBatchRun",
  public."FinancialBudgetReleasePacket",
  public."FinancialScalingBudgetPacket",
  public."FinancialScalingSpendPacket",
  public."RevenueLaunchHandoffPacket",
  public."RevenueSignalConnectorApproval",
  public."RevenueSignalImportJob",
  public."CommandOSSnapshot",
  public."CommandOSReport",
  public."MemberTutorialProgress",
  public."MemberWorkspaceSnapshot",
  public."TeamMember"
TO entral_api;

GRANT INSERT ON TABLE public."AuditLog" TO entral_api;
GRANT SELECT ON TABLE public."AuditLog" TO entral_audit_reader, entral_verifier;

GRANT UPDATE ("lastDashboardSeenAt","emailVerifiedAt","passwordHash","sessionVersion","updatedAt")
ON TABLE public."User" TO entral_api;
GRANT UPDATE ("consumedAt") ON TABLE
  public."EmailVerificationToken",
  public."PasswordResetToken"
TO entral_api;
GRANT UPDATE, DELETE ON TABLE public."Team" TO entral_api;
GRANT INSERT ON TABLE public."MemberTutorialMutationReceipt" TO entral_api;

-- Phase 202 authority and credential surface. These are the only central tables
-- reached directly by the API; all remaining central tables are function/trigger
-- owned or release-reconciliation-only.
GRANT SELECT ON TABLE
  public."TenantBoundary",
  public."BusinessBoundary",
  public."IdentityActor",
  public."TenantActorAssignment",
  public."CustomerRecordOwnership",
  public."AutonomyEnvelopeRecord",
  public."AuthSession",
  public."SessionMutationReceipt",
  public."AuthRefreshCredential",
  public."MfaFactor",
  public."MfaRecoveryCode",
  public."MfaMutationReceipt",
  public."MembershipInvitation",
  public."MembershipMutationReceipt",
  public."NotificationEvidence",
  public."NotificationDeliveryOutbox",
  public."SecretReference",
  public."PersonalSecretReference",
  public."PersonalSecretAccessAudit",
  public."SecretAccessAudit",
  public."SecretMutationReceipt",
  public."SupportAccessGrant",
  public."SupportAccessAudit",
  public."TenantRateLimitWindow",
  public."TenantRateLimitReceipt",
  public."AccountDeidentificationReceipt"
TO entral_api;

GRANT INSERT, UPDATE ON TABLE
  public."TenantActorAssignment",
  public."AuthSession",
  public."AuthRefreshCredential",
  public."MfaFactor",
  public."MembershipInvitation",
  public."NotificationEvidence",
  public."SecretReference",
  public."PersonalSecretReference",
  public."SupportAccessGrant",
  public."TenantRateLimitWindow"
TO entral_api;

GRANT INSERT ON TABLE public."NotificationDeliveryOutbox" TO entral_api;

GRANT INSERT, UPDATE, DELETE ON TABLE public."MfaRecoveryCode" TO entral_api;

GRANT INSERT ON TABLE
  public."AutonomyEnvelopeRecord",
  public."MembershipMutationReceipt",
  public."SessionMutationReceipt",
  public."PersonalSecretAccessAudit",
  public."MfaMutationReceipt",
  public."SecretAccessAudit",
  public."SecretMutationReceipt",
  public."SupportAccessAudit",
  public."TenantRateLimitReceipt"
TO entral_api;

-- Worker surface is intentionally smaller and retains the exact workloads that
-- were previously enumerated by 046 plus durable AI usage recovery.
GRANT SELECT ON TABLE
  public."Agent",
  public."AgentTask",
  public."AgentSchedule",
  public."AgentLog",
  public."AgentMessage",
  public."AutomationJob",
  public."AutomationLog",
  public."AiUsageEvent",
  public."ClientMerchStore",
  public."Policy",
  public."GrowthApprovalPacket",
  public."ShopifyConnection",
  public."ShopifyOAuthContinuation",
  public."SecretReference"
TO entral_worker;

GRANT INSERT ON TABLE
  public."AgentTask",
  public."AgentLog",
  public."AgentMessage",
  public."AutomationJob",
  public."AutomationLog",
  public."AuditLog",
  public."GrowthApprovalPacket",
  public."ShopifyOAuthContinuation",
  public."SecretAccessAudit"
TO entral_worker;

-- Release verification evidence is read-only and is never exposed to either
-- runtime role.
GRANT SELECT ON TABLE
  public."OwnershipReconciliationRun",
  public."CredentialReferenceReconciliationRun"
TO entral_verifier;
GRANT SELECT ON TABLE entral.phase202_release_blockers TO entral_verifier;

GRANT UPDATE ON TABLE
  public."Agent",
  public."AgentTask",
  public."AgentSchedule",
  public."AutomationJob",
  public."AiUsageEvent",
  public."GrowthApprovalPacket",
  public."ShopifyOAuthContinuation"
TO entral_worker;

-- Every Phase 202 function starts denied. Trigger functions and release-only
-- reconciliation helpers stay uncallable by runtime roles.
REVOKE EXECUTE ON FUNCTION
  entral.phase202_validate_canonical_business_reference(),
  entral.phase202_restrict_canonical_business_delete(),
  entral.phase202_assign_service_actors_to_tenant(),
  entral.phase202_assign_shared_ownership(),
  entral.phase202_sync_source_ownership(),
  entral.phase202_classify_audit_log(),
  entral.phase202_sync_audit_ownership(),
  entral.phase202_assign_personal_actor(),
  entral.phase202_assign_inherited_ownership(),
  entral.phase202_assign_exact_team_ownership(),
  entral.phase202_sync_exact_ownership(),
  entral.phase202_enforce_append_only_envelope(),
  entral.phase202_provision_tenant_owner(text,text,text,text,text,text,text,uuid,uuid,uuid),
  entral.phase202_register_invited_identity(text,text,text,text,text,uuid),
  entral.phase202_provision_agent_actor(),
  entral.phase202_effective_actor_id(),
  entral.phase202_current_tenant_id(),
  entral.phase202_current_actor_id(),
  entral.phase202_current_support_grant_id(),
  entral.phase202_resolve_human_actor(text),
  entral.phase202_resolve_service_actor(uuid),
  entral.phase202_resolve_tenant_assignment(uuid,uuid,uuid),
  entral.phase202_resolve_single_tenant_assignment(uuid,uuid),
  entral.phase202_resolve_support_session(uuid,uuid,uuid),
  entral.phase202_support_auth_session_access_allows(uuid,uuid,uuid,uuid),
  entral.phase202_support_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text),
  entral.phase202_member_auth_session_access_allows(uuid,uuid,uuid),
  entral.phase202_member_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,text,text,text,text),
  entral.phase202_resolve_autonomy_target(uuid,uuid,uuid),
  entral.phase202_resolve_refresh_subject(text),
  entral.phase202_resolve_refresh_context(text),
  entral.phase202_resolve_tenant_human_actor(text,uuid),
  entral.phase202_assign_support_actor(uuid,uuid,uuid),
  entral.phase202_revoke_tenant_user_sessions(text,uuid,text),
  entral.phase202_revoke_support_grant_sessions(uuid,uuid,uuid,uuid,timestamptz),
  entral.phase202_invalidate_support_grant_sessions(),
  entral.phase202_revoke_password_reset_sessions(text,text,text),
  entral.phase202_resolve_invitation_context(text,text),
  entral.phase202_invitation_acceptance_allows(uuid,uuid,uuid,text),
  entral.phase202_invitation_row_access_allows(uuid,text,uuid,uuid,text,uuid),
  entral.phase202_invitation_receipt_read_allows(uuid,uuid,uuid,text,jsonb),
  entral.phase202_accept_invitation_membership(uuid,text),
  entral.phase202_worker_access_allows(uuid,uuid,text,uuid),
  entral.phase202_worker_runtime_ready(),
  entral.phase202_human_access_allows(text,text[],text),
  entral.phase202_tenant_access_allows(uuid,uuid,text,uuid),
  entral.phase202_personal_actor_access_allows(uuid),
  entral.phase202_personal_user_mutation_allows(text),
  entral.phase202_user_read_allows(text,text),
  entral.phase202_auth_token_access_allows(text,text,text),
  entral.phase202_auth_token_active_allows(text,text,text,timestamptz,timestamptz),
  entral.phase202_resolve_membership_profile(text,uuid),
  entral.phase202_membership_target_exists(text,text),
  entral.phase202_platform_audit_read_allows(),
  entral.phase202_legacy_can_access_business(uuid,text),
  entral.phase202_canonical_business_in_session_tenant(uuid),
  entral.phase202_legacy_can_access_entity(uuid,text),
  entral.phase202_canonical_entity_in_session_tenant(uuid),
  entral.phase202_block_evidence_mutation(),
  entral.phase202_guard_legacy_credential_write(),
  entral.phase202_guard_notification_evidence_update(),
  entral.phase202_tutorial_subject_access_allows(text,text),
  entral.phase202_reconciliation_hash(text,text,integer,integer,integer,integer,integer,text,text,timestamptz),
  entral.phase202_credential_inventory_hash(),
  entral.phase202_live_credential_reference_state_hash(),
  entral.phase202_credential_reconciliation_hash(text,text,text,integer,text,integer,integer,integer,integer,integer,text,text,text,text,timestamptz),
  entral.phase202_valid_secret_envelope(text),
  entral.phase202_secret_envelope_metadata_matches(text,text,text),
  entral.phase202_valid_legacy_secure_envelope(text),
  entral.phase202_claim_notification_deliveries(text,integer,integer),
  entral.phase202_complete_notification_delivery(uuid,text,text,text),
  entral.phase202_fail_notification_delivery(uuid,text,text,integer,integer),
  entral.phase202_prepare_account_deidentification(uuid,integer,text,text),
  entral.phase202_complete_account_deidentification(uuid,integer,text,text,uuid[],uuid[],uuid[],uuid[],text[],text[],text),
  entral.phase202_live_ownership_blockers(),
  entral.phase202_live_source_inventory_hash(),
  entral.phase202_live_credential_reference_blockers()
FROM PUBLIC, entral_api, entral_worker, entral_audit_reader, entral_verifier;

GRANT EXECUTE ON FUNCTION
  entral.phase202_provision_tenant_owner(text,text,text,text,text,text,text,uuid,uuid,uuid),
  entral.phase202_register_invited_identity(text,text,text,text,text,uuid),
  entral.phase202_resolve_human_actor(text),
  entral.phase202_resolve_tenant_assignment(uuid,uuid,uuid),
  entral.phase202_resolve_single_tenant_assignment(uuid,uuid),
  entral.phase202_resolve_support_session(uuid,uuid,uuid),
  entral.phase202_support_auth_session_access_allows(uuid,uuid,uuid,uuid),
  entral.phase202_support_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text),
  entral.phase202_member_auth_session_access_allows(uuid,uuid,uuid),
  entral.phase202_member_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,text,text,text,text),
  entral.phase202_resolve_autonomy_target(uuid,uuid,uuid),
  entral.phase202_resolve_refresh_subject(text),
  entral.phase202_resolve_refresh_context(text),
  entral.phase202_resolve_tenant_human_actor(text,uuid),
  entral.phase202_assign_support_actor(uuid,uuid,uuid),
  entral.phase202_revoke_tenant_user_sessions(text,uuid,text),
  entral.phase202_revoke_support_grant_sessions(uuid,uuid,uuid,uuid,timestamptz),
  entral.phase202_revoke_password_reset_sessions(text,text,text),
  entral.phase202_resolve_invitation_context(text,text),
  entral.phase202_invitation_acceptance_allows(uuid,uuid,uuid,text),
  entral.phase202_invitation_row_access_allows(uuid,text,uuid,uuid,text,uuid),
  entral.phase202_invitation_receipt_read_allows(uuid,uuid,uuid,text,jsonb),
  entral.phase202_accept_invitation_membership(uuid,text),
  entral.phase202_current_tenant_id(),
  entral.phase202_current_actor_id(),
  entral.phase202_current_support_grant_id(),
  entral.phase202_tenant_access_allows(uuid,uuid,text,uuid),
  entral.phase202_personal_actor_access_allows(uuid),
  entral.phase202_personal_user_mutation_allows(text),
  entral.phase202_user_read_allows(text,text),
  entral.phase202_auth_token_access_allows(text,text,text),
  entral.phase202_auth_token_active_allows(text,text,text,timestamptz,timestamptz),
  entral.phase202_resolve_membership_profile(text,uuid),
  entral.phase202_membership_target_exists(text,text),
  entral.phase202_platform_audit_read_allows(),
  entral.phase202_tutorial_subject_access_allows(text,text),
  entral.phase202_prepare_account_deidentification(uuid,integer,text,text),
  entral.phase202_complete_account_deidentification(uuid,integer,text,text,uuid[],uuid[],uuid[],uuid[],text[],text[],text)
TO entral_api;

GRANT EXECUTE ON FUNCTION entral.phase202_platform_audit_read_allows()
TO entral_audit_reader, entral_verifier;

GRANT EXECUTE ON FUNCTION
  entral.phase202_live_ownership_blockers(),
  entral.phase202_live_source_inventory_hash(),
  entral.phase202_credential_inventory_hash(),
  entral.phase202_live_credential_reference_state_hash(),
  entral.phase202_live_credential_reference_blockers()
TO entral_verifier;

GRANT EXECUTE ON FUNCTION
  entral.phase202_current_tenant_id(),
  entral.phase202_current_actor_id(),
  entral.phase202_resolve_service_actor(uuid),
  entral.phase202_resolve_tenant_assignment(uuid,uuid,uuid),
  entral.phase202_tenant_access_allows(uuid,uuid,text,uuid),
  entral.phase202_personal_actor_access_allows(uuid),
  entral.phase202_support_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,uuid,text,text,text,text),
  entral.phase202_member_session_audit_insert_allows(text,uuid,uuid,uuid,uuid,uuid,text,text,text,text),
  entral.phase202_platform_audit_read_allows(),
  entral.phase202_worker_runtime_ready(),
  entral.phase202_claim_notification_deliveries(text,integer,integer),
  entral.phase202_complete_notification_delivery(uuid,text,text,text),
  entral.phase202_fail_notification_delivery(uuid,text,text,integer,integer)
TO entral_worker;

COMMIT;
