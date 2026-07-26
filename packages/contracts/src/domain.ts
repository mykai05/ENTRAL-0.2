export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export const ENTITY_ROLES = ["ENTRAL", "MARSHAL", "GENERAL", "COMMANDER", "SOLDIER"] as const;
export type EntityRole = (typeof ENTITY_ROLES)[number];
export type EntityStatus = "BUILDING" | "ACTIVE" | "PAUSED" | "DEGRADED" | "RETIRED";
export type BusinessStatus = "BUILDING" | "OPERATING" | "PAUSED" | "DEGRADED" | "RETIRED";
export type HealthState = "HEALTHY" | "WATCH" | "DEGRADED" | "CRITICAL" | "UNKNOWN";
export type ScopeType = "SYSTEM" | "MARSHAL" | "GENERAL" | "BUSINESS" | "ENTITY" | "MISSION" | "USER";
export type RiskClass = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ActionStatus = "REQUESTED" | "VALIDATED" | "EXECUTING" | "SUCCEEDED" | "FAILED" | "ROLLED_BACK";
export type ActorType = "HUMAN" | EntityRole | "SYSTEM";

export const GOVERNANCE_ACTION_TYPES = [
  "CREATE",
  "EDIT",
  "PAUSE",
  "RESUME",
  "RECONFIGURE",
  "DUPLICATE",
  "REASSIGN",
  "RETARGET",
  "RETIRE",
  "RESTORE",
  "ROLLBACK",
  "ISOLATE",
  "REPAIR",
  "BUDGET_CHANGE",
  "MODEL_CHANGE",
  "TOOL_GRANT_CHANGE",
  "POLICY_CHANGE",
  "SCHEDULE_CHANGE"
] as const;
export type GovernanceActionType = (typeof GOVERNANCE_ACTION_TYPES)[number];

export const GOVERNANCE_TARGET_TYPES = [
  "ENTITY",
  "BUSINESS",
  "MISSION",
  "TASK",
  "TOOL_GRANT",
  "SCHEDULE",
  "POLICY",
  "GOVERNANCE_ACTION",
  "SYSTEM"
] as const;
export type GovernanceTargetType = (typeof GOVERNANCE_TARGET_TYPES)[number];

export const GOVERNANCE_ACTION_TARGETS: Readonly<Record<GovernanceActionType, readonly GovernanceTargetType[]>> = {
  CREATE: ["ENTITY", "BUSINESS", "MISSION", "TASK", "TOOL_GRANT", "SCHEDULE", "POLICY"],
  EDIT: ["ENTITY", "BUSINESS", "MISSION", "TASK", "POLICY"],
  PAUSE: ["ENTITY", "BUSINESS", "SCHEDULE"],
  RESUME: ["ENTITY", "BUSINESS", "SCHEDULE"],
  RECONFIGURE: ["ENTITY", "BUSINESS"],
  DUPLICATE: ["ENTITY", "BUSINESS"],
  REASSIGN: ["ENTITY"],
  RETARGET: ["ENTITY", "BUSINESS", "MISSION"],
  RETIRE: ["ENTITY", "BUSINESS", "SCHEDULE", "POLICY"],
  RESTORE: ["ENTITY", "BUSINESS", "SCHEDULE"],
  ROLLBACK: ["ENTITY", "BUSINESS", "GOVERNANCE_ACTION"],
  ISOLATE: ["ENTITY", "BUSINESS", "TOOL_GRANT", "SCHEDULE", "SYSTEM"],
  REPAIR: ["ENTITY", "BUSINESS", "MISSION", "TASK", "SYSTEM"],
  BUDGET_CHANGE: ["ENTITY", "BUSINESS", "MISSION"],
  MODEL_CHANGE: ["ENTITY"],
  TOOL_GRANT_CHANGE: ["ENTITY", "TOOL_GRANT"],
  POLICY_CHANGE: ["POLICY", "SYSTEM"],
  SCHEDULE_CHANGE: ["SCHEDULE"]
};

export interface ContextScope {
  readonly scope_type: ScopeType;
  readonly scope_id: string;
  readonly display_label: string;
  readonly business_id?: string;
  readonly entity_id?: string;
  readonly inherited_scope_ids?: readonly string[];
}

export interface HealthDriver {
  readonly code: string;
  readonly label: string;
  readonly direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  readonly severity: "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly value: JsonValue;
  readonly explanation: string;
  readonly evidence_ids: readonly string[];
  readonly source_freshness: string | null;
}

export interface BusinessSummary {
  readonly business_id: string;
  readonly stable_code: string;
  readonly business_name: string;
  readonly commander_id: string;
  readonly marshal_id: string;
  readonly marshal_name: string;
  readonly general_id: string;
  readonly general_name: string;
  readonly status: BusinessStatus;
  readonly health_state: HealthState;
  readonly health_score: number | null;
  readonly health_drivers: readonly HealthDriver[];
  readonly revenue_period_start: string | null;
  readonly revenue_period_end: string | null;
  readonly gross_revenue: number | null;
  readonly net_contribution: number | null;
  readonly currency: string | null;
  readonly capital_available: number | null;
  readonly agent_count: number;
  readonly tool_count: number;
  readonly automation_count: number;
  readonly integration_count: number;
  readonly active_mission_count: number;
  readonly active_task_count: number;
  readonly primary_objective: string | null;
  readonly top_exception: string | null;
  readonly top_recommendation: string | null;
  readonly updated_at: string;
  readonly source_freshness: Readonly<Record<string, string | null>>;
  readonly version: number;
}

export interface EntitySummary {
  readonly entity_id: string;
  readonly stable_code: string;
  readonly entity_type: EntityRole;
  readonly name: string;
  readonly status: EntityStatus;
  readonly health: HealthState;
  readonly parent_id: string | null;
  readonly child_count: number;
  readonly assigned_business_id: string | null;
  readonly model_class: string | null;
  readonly compute_tier: string | null;
  readonly current_mission: string | null;
  readonly active_task_count: number;
  readonly latest_material_result: JsonValue;
  readonly active_alert: string | null;
  readonly updated_at: string;
  readonly version: number;
}

export interface FullRecord<TSummary extends BusinessSummary | EntitySummary> {
  readonly summary: TSummary;
  readonly configuration: JsonValue;
  readonly runtime: JsonValue;
  readonly authority: JsonValue;
  readonly operations: JsonValue;
  readonly economics: JsonValue;
  readonly reliability: JsonValue;
  readonly connections: JsonValue;
  readonly versions: readonly {
    readonly version: number;
    readonly changed_at: string;
    readonly audit_id: string;
  }[];
  readonly evidence_ids: readonly string[];
}

export interface ActionRequest {
  readonly action_id: string;
  readonly action_type: string;
  readonly actor_type: ActorType;
  readonly actor_id: string;
  readonly scope: ContextScope;
  readonly target_entity_id?: string;
  readonly target_business_id?: string;
  readonly reason: string;
  readonly parameters: JsonValue;
  readonly expected_version: number;
  readonly idempotency_key: string;
  readonly requested_at: string;
}

export interface GovernanceActionRequest {
  readonly action_id: string;
  readonly action_type: GovernanceActionType;
  readonly actor_type: "HUMAN" | "ENTRAL";
  readonly actor_id: string;
  readonly scope: ContextScope;
  readonly target_type: GovernanceTargetType;
  readonly target_id: string | null;
  readonly business_id: string | null;
  readonly requested_outcome: string;
  readonly reason: string;
  readonly authority_basis: JsonValue;
  readonly risk_class: RiskClass;
  readonly confidence?: number;
  readonly proposed_changes: JsonValue;
  readonly rollback_plan: JsonValue;
  readonly verification_plan: JsonValue;
  readonly expected_version: number;
  readonly idempotency_key: string;
  readonly requested_at: string;
  readonly restores_action_id?: string;
}

export type EntityLifecycleActionType = "PAUSE" | "RESUME";
export type EntityLifecycleContainmentPolicy = "FINISH_IN_FLIGHT";

export interface EntityLifecycleActionRequest extends GovernanceActionRequest {
  readonly action_type: EntityLifecycleActionType;
  readonly target_type: "ENTITY";
  readonly target_id: string;
  readonly proposed_changes: {
    readonly containment_policy: EntityLifecycleContainmentPolicy;
    readonly status: "ACTIVE" | "PAUSED";
  };
  readonly rollback_plan: {
    readonly action: EntityLifecycleActionType;
    readonly previous_status: EntityStatus;
  };
}

export interface EntityLifecycleActionResult {
  readonly action_id: string;
  readonly action_type: EntityLifecycleActionType;
  readonly status: "SUCCEEDED";
  readonly target: {
    readonly business_id: string | null;
    readonly entity_id: string;
    readonly entity_role: Exclude<EntityRole, "ENTRAL">;
    readonly status: "ACTIVE" | "PAUSED";
    readonly version: number;
  };
  readonly before: {
    readonly status: EntityStatus;
    readonly version: number;
  };
  readonly after: {
    readonly status: "ACTIVE" | "PAUSED";
    readonly version: number;
  };
  readonly containment: {
    readonly descendants_affected: number;
    readonly new_work_leasing: "BLOCKED" | "ELIGIBLE";
    readonly policy: EntityLifecycleContainmentPolicy;
  };
  readonly verification: {
    readonly checked_at: string;
    readonly expected_status: "ACTIVE" | "PAUSED";
    readonly expected_version: number;
    readonly observed_status: "ACTIVE" | "PAUSED";
    readonly observed_version: number;
    readonly passed: true;
    readonly verification_id: string;
  };
  readonly canonical_event: {
    readonly aggregate_version: number;
    readonly event_id: string;
    readonly sequence_number: number;
  };
  readonly audit_entry_ids: readonly string[];
  readonly conversation_message_id: string;
  readonly idempotency_key: string;
  readonly idempotent_replay: boolean;
  readonly requested_at: string;
  readonly completed_at: string;
  readonly rollback: {
    readonly action_type: EntityLifecycleActionType;
    readonly available: true;
    readonly expected_version: number;
    readonly restores_action_id: string;
  };
  readonly restoration_of_action_id: string | null;
}

export interface VerificationResult {
  readonly verifier: "DATABASE_ASSERTION" | "API_READBACK" | "AUTOMATED_TEST" | "METRIC_OBSERVATION" | "EXTERNAL_RECEIPT";
  readonly passed: boolean;
  readonly checked_at: string;
  readonly evidence_ids: readonly string[];
  readonly details: JsonValue;
}

export interface ActionResult {
  readonly action_id: string;
  readonly status: ActionStatus;
  readonly changed_record_ids: readonly string[];
  readonly before_version: number;
  readonly after_version: number | null;
  readonly canonical_event_id: string | null;
  readonly audit_id: string;
  readonly verification: readonly VerificationResult[];
  readonly failure_code?: string;
  readonly failure_detail?: string;
  readonly completed_at: string;
}

export interface CanonicalEvent {
  readonly event_id: string;
  readonly sequence_number: number;
  readonly event_type: string;
  readonly aggregate_type: string;
  readonly aggregate_id: string;
  readonly aggregate_version: number;
  readonly scope: ContextScope;
  readonly actor_type: ActorType;
  readonly actor_id: string;
  readonly correlation_id: string;
  readonly causation_id: string | null;
  readonly payload: JsonValue;
  readonly occurred_at: string;
}

export interface AuditEntry {
  readonly audit_id: string;
  readonly sequence_number: number;
  readonly actor_type: ActorType;
  readonly actor_id: string;
  readonly action_type: string;
  readonly target_type: string;
  readonly target_id: string;
  readonly scope: ContextScope;
  readonly reason: string;
  readonly before_state: JsonValue;
  readonly after_state: JsonValue;
  readonly result: "SUCCEEDED" | "FAILED" | "ROLLED_BACK";
  readonly evidence_ids: readonly string[];
  readonly rollback_action_id: string | null;
  readonly correlation_id: string;
  readonly created_at: string;
}

export interface EvidenceReference {
  readonly evidence_id: string;
  readonly source_type: string;
  readonly source_id: string;
  readonly content_sha256: string;
  readonly captured_at: string;
  readonly scope: ContextScope;
  readonly classification: "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "SECRET_REFERENCE";
}

export interface Recommendation {
  readonly recommendation_id: string;
  readonly scope: ContextScope;
  readonly objective: string;
  readonly diagnosis: string;
  readonly evidence_ids: readonly string[];
  readonly proposed_action_types: readonly string[];
  readonly expected_value: JsonValue;
  readonly estimated_cost: JsonValue;
  readonly risk_class: RiskClass;
  readonly confidence: number;
  readonly authority_required: string;
  readonly rollback_plan: string;
  readonly verification_plan: string;
  readonly expires_at: string;
  readonly status: "OPEN" | "ACCEPTED" | "REJECTED" | "EXECUTED" | "EXPIRED";
}
