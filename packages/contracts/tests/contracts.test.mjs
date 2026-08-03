import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parse as parseYaml } from "yaml";
import {
  ContractError,
  IdempotencyKeyRegistry,
  PHASE_195_RELEASE_MIGRATION_NAME,
  PHASE_195_RELEASE_PHASE,
  assertActionRequest,
  assertAuditEntry,
  assertCanonicalReleaseRecord,
  assertCanonicalEvent,
  assertDeploymentEvidence,
  assertEntityLifecycleActionRequest,
  assertEntityLifecycleActionResult,
  assertExecutableIntegration,
  assertIntegrationRegistryRecord,
  assertMemberCommandHierarchy,
  assertMemberOverviewResponse,
  assertMigrationFingerprint,
  assertOperationalRoute,
  assertPhaseGateRecord,
  assertPersonalityProfile,
  assertPullRequestDisposition,
  assertQueueJobEnvelope,
  assertRuntimeModeRecord,
  assertValidParentRole,
  assertExpectedVersion,
  assertGovernanceActionRequest,
  bindCanonicalGraphRuntimeState,
  buildGraphProjection,
  canonicalGraphEdgeId,
  canonicalGraphPreferenceSettings,
  parseBusinessFullRecordResponse,
  parseCanonicalEntralConversationResponse,
  parseCanonicalHierarchyResponse,
  parseCanonicalPortfolioEventsResponse,
  parseEntityFullRecordResponse,
  parseGraphProjection,
  parseGraphRendererTelemetryRequest,
  parseGraphRendererTelemetryResponse,
  parseGraphSharedViewState,
  parseGraphViewPreferencesResetRequest,
  parseGraphViewPreferencesUpdateRequest,
  parseMemberOrganizationsResponse,
  parsePhaseReleaseEvidenceReadback,
  parseWorkerReadinessEvidence,
  parsePortfolioSummaryResponse
} from "../dist/index.js";

const id = "123e4567-e89b-42d3-a456-426614174000";
const secondId = "223e4567-e89b-42d3-a456-426614174000";
const thirdId = "323e4567-e89b-42d3-a456-426614174000";

function canonicalBusinessSummary(overrides = {}) {
  return {
    active_mission_count: 1,
    active_task_count: 2,
    agent_count: 3,
    automation_count: 1,
    business_id: id,
    business_name: "Canonical Software",
    capital_available: 5000,
    commander_id: secondId,
    currency: "USD",
    general_id: thirdId,
    general_name: "Software",
    gross_revenue: 12500,
    health_drivers: [{
      code: "margin",
      direction: "POSITIVE",
      explanation: "Contribution is positive.",
      label: "Margin"
    }],
    health_score: 91,
    health_state: "HEALTHY",
    integration_count: 2,
    marshal_id: "423e4567-e89b-42d3-a456-426614174000",
    marshal_name: "Digital Businesses",
    net_contribution: 4400,
    primary_objective: "Grow verified recurring revenue.",
    revenue_period_end: "2026-07-25T00:00:00.000Z",
    revenue_period_start: "2026-07-01T00:00:00.000Z",
    source_freshness: { finance: "2026-07-25T00:00:00.000Z" },
    stable_code: "business.software.canonical",
    status: "OPERATING",
    tool_count: 4,
    top_exception: null,
    top_recommendation: "Review the next verified expansion.",
    updated_at: "2026-07-25T01:00:00.000Z",
    version: 3,
    ...overrides
  };
}

function canonicalEntitySummary(overrides = {}) {
  return {
    active_alert: null,
    active_task_count: 0,
    assigned_business_id: null,
    child_count: 0,
    compute_tier: "standard",
    current_mission: null,
    entity_id: id,
    entity_type: "ENTRAL",
    health: "HEALTHY",
    latest_material_result: null,
    model_class: "canonical",
    name: "ENTRAL",
    parent_id: null,
    stable_code: "ENTRAL.CORE",
    status: "ACTIVE",
    updated_at: "2026-07-25T01:00:00.000Z",
    version: 3,
    ...overrides
  };
}

function releaseRecordBase(recordType, overrides = {}) {
  return {
    actor: {
      actor_id: "phase195-verifier",
      actor_type: "SERVICE"
    },
    business_id: null,
    classification: "INTERNAL",
    contract_version: "1.0.0",
    created_at: "2026-07-26T01:00:00.000Z",
    deletion_behavior: "RETAIN",
    environment: "production",
    evidence_references: [{
      captured_at: "2026-07-26T01:00:00.000Z",
      content_sha256: "a".repeat(64),
      reference_id: `phase195:${recordType}`,
      reference_type: "DATABASE_READBACK"
    }],
    exportable: true,
    idempotency_key: `phase195:${recordType}:verification`,
    organization_id: null,
    phase: 195,
    record_id: randomReleaseId(recordType),
    record_type: recordType,
    retention: "RELEASE_LIFETIME",
    schema_version: 1,
    updated_at: "2026-07-26T01:01:00.000Z",
    verification_state: "VERIFIED",
    version: 1,
    ...overrides
  };
}

function randomReleaseId(recordType) {
  const prefixes = {
    CANONICAL_RELEASE: "423e4567",
    MIGRATION_FINGERPRINT: "523e4567",
    DEPLOYMENT_EVIDENCE: "623e4567",
    PULL_REQUEST_DISPOSITION: "723e4567",
    RUNTIME_MODE: "823e4567",
    PHASE_GATE: "923e4567"
  };
  return `${prefixes[recordType]}-e89b-42d3-a456-426614174000`;
}

test("Phase 195 graph projection preserves canonical identity and one truthful hierarchy", () => {
  const hierarchy = parseCanonicalHierarchyResponse({
    entities: [
      canonicalEntitySummary(),
      canonicalEntitySummary({
        entity_id: secondId,
        entity_type: "MARSHAL",
        name: "Revenue Marshal",
        parent_id: id,
        stable_code: "MARSHAL.REVENUE"
      }),
      canonicalEntitySummary({
        entity_id: thirdId,
        entity_type: "GENERAL",
        name: "Commerce General",
        parent_id: secondId,
        stable_code: "GENERAL.COMMERCE"
      })
    ],
    event_sequence: 195,
    generated_at: "2026-07-26T02:00:00.000Z",
    scope: {
      label: "Human portfolio / all canonical businesses",
      mode: "HUMAN_PORTFOLIO",
      user_id: id,
      visible_business_ids: []
    }
  });
  const projection = buildGraphProjection({
    hierarchy,
    organization_id: "team_phase195"
  });

  assert.equal(projection.root_id, id);
  assert.equal(projection.projection_version, 195);
  assert.equal(projection.entities[2].marshal_id, secondId);
  assert.deepEqual(projection.entities[2].lineage_ids, [id, secondId, thirdId]);
  assert.equal(projection.edges[1].edge_id, canonicalGraphEdgeId(secondId, thirdId));
  assert.doesNotThrow(() => parseGraphProjection(projection));
  assert.throws(() => parseGraphProjection({
    ...projection,
    edges: projection.edges.slice(0, 1)
  }), (error) => error.code === "GRAPH_EDGE_COUNT_MISMATCH");
  assert.throws(() => parseGraphProjection({
    ...projection,
    fabricated_entities: []
  }), (error) => error.code === "UNKNOWN_GRAPH_SETTING");
});

test("Phase 195 runtime-agent compatibility joins only onto authorized projection entities", () => {
  const projection = buildGraphProjection({
    hierarchy: parseCanonicalHierarchyResponse({
      entities: [
        canonicalEntitySummary(),
        canonicalEntitySummary({
          entity_id: secondId,
          entity_type: "MARSHAL",
          name: "Revenue Marshal",
          parent_id: id,
          stable_code: "MARSHAL.REVENUE"
        })
      ],
      event_sequence: 195,
      generated_at: "2026-07-26T02:00:00.000Z",
      scope: {
        label: "Human portfolio / all canonical businesses",
        mode: "HUMAN_PORTFOLIO",
        user_id: id,
        visible_business_ids: []
      }
    }),
    organization_id: "team_phase195"
  });
  const agentInstance = {
    agent_instance_id: "future-agent-instance-1",
    version: 1
  };
  const assignment = {
    assignment_id: "future-assignment-1",
    version: 1
  };
  const joined = bindCanonicalGraphRuntimeState(projection, [{
    agent_instance: agentInstance,
    assignment,
    entity_id: secondId
  }]);

  assert.equal(joined.length, projection.entities.length);
  assert.strictEqual(joined[0].graph_entity, projection.entities[0]);
  assert.strictEqual(joined[0].runtime_state, null);
  assert.strictEqual(joined[1].graph_entity, projection.entities[1]);
  assert.strictEqual(joined[1].runtime_state.agent_instance, agentInstance);
  assert.strictEqual(joined[1].runtime_state.assignment, assignment);
  assert.deepEqual(
    joined.map((entry) => entry.graph_entity.entity_id),
    projection.entities.map((entity) => entity.entity_id)
  );

  assert.throws(() => bindCanonicalGraphRuntimeState(projection, [{
    agent_instance: agentInstance,
    assignment: null,
    entity_id: "unauthorized-runtime-entity"
  }]), (error) => error.code === "GRAPH_RUNTIME_STATE_SCOPE_MISMATCH");
  assert.throws(() => bindCanonicalGraphRuntimeState(projection, [{
    agent_instance: agentInstance,
    assignment: null,
    entity_id: secondId
  }, {
    agent_instance: { ...agentInstance },
    assignment: null,
    entity_id: secondId
  }]), (error) => error.code === "DUPLICATE_GRAPH_RUNTIME_STATE");
});

test("Phase 195 shared graph state and preferences reject unknown or unsafe settings", () => {
  assert.doesNotThrow(() => parseGraphSharedViewState({
    arrangement: "SIDE_BY_SIDE",
    breadcrumb_entity_ids: [id, secondId],
    contract_version: "1.0.0",
    expanded_entity_ids: [id],
    filters: {
      authority_tiers: [0, 1],
      business_ids: [],
      domain_ids: [secondId],
      entity_types: ["ENTRAL", "MARSHAL"],
      health_states: ["HEALTHY"],
      relation_types: ["HIERARCHY"],
      statuses: ["ACTIVE"]
    },
    focused_entity_id: secondId,
    isolated_root_id: null,
    navigation_history: {
      back: [id],
      current: secondId,
      forward: []
    },
    organization_id: "team_phase195",
    schema_version: 1,
    search_query: "",
    selected_entity_id: secondId,
    synchronized_navigation: true
  }));

  const migrated = parseGraphViewPreferencesUpdateRequest({
    contract_version: "1.0.0",
    expected_version: 0,
    idempotency_key: "phase195-legacy-settings",
    schema_version: 1,
    settings: {
      advanced_2d: {},
      advanced_3d: {},
      advanced_shared: {},
      pinned_positions: [],
      simple: { arrangement: "STACK" }
    }
  });
  assert.equal(migrated.schema_version, 2);
  assert.equal(migrated.migrated_from_schema_version, 1);
  assert.equal(migrated.settings.simple.arrangement, "STACK");
  assert.equal(migrated.settings.advanced_shared.frame_rate_cap, 60);

  const invalidSettings = canonicalGraphPreferenceSettings();
  assert.throws(() => parseGraphViewPreferencesUpdateRequest({
    contract_version: "1.0.0",
    expected_version: 0,
    idempotency_key: "phase195-invalid-fps",
    schema_version: 2,
    settings: {
      ...invalidSettings,
      advanced_shared: {
        ...invalidSettings.advanced_shared,
        frame_rate_cap: 75
      }
    }
  }), (error) => error.code === "INVALID_GRAPH_ENUM");
  assert.throws(() => parseGraphViewPreferencesUpdateRequest({
    contract_version: "1.0.0",
    expected_version: 0,
    idempotency_key: "phase195-unknown-setting",
    schema_version: 2,
    settings: {
      ...invalidSettings,
      secret_override: true
    }
  }), (error) => error.code === "UNKNOWN_GRAPH_SETTING");
  assert.deepEqual(parseGraphViewPreferencesResetRequest({
    contract_version: "1.0.0",
    expected_version: 3,
    idempotency_key: "phase195-reset-view-2d",
    reset_scope: "VIEW_2D"
  }).reset_scope, "VIEW_2D");
});

test("Phase 195 renderer telemetry is bounded, renderer-specific, and payload-free", () => {
  const telemetry = {
    contract_version: "1.0.0",
    dropped_frame_rate_ratio: 0.02,
    edge_count: 131,
    error_code: "NONE",
    frame_rate_fps: 59.5,
    layout_pattern: "AUTHORITY_RADIAL",
    layout_time_ms: 16.25,
    node_count: 132,
    observed_at: "2026-07-26T02:00:00.000Z",
    projection_id: id,
    projection_version: 195,
    render_time_ms: 8.5,
    renderer: "2D",
    sample_window_ms: 5000,
    schema_version: 1,
    settings_version: 3,
    telemetry_id: secondId
  };
  assert.doesNotThrow(() => parseGraphRendererTelemetryRequest(telemetry));
  assert.throws(() => parseGraphRendererTelemetryRequest({
    ...telemetry,
    customer_payload: { search: "sensitive customer query" }
  }), (error) => error.code === "UNKNOWN_GRAPH_SETTING");
  assert.throws(() => parseGraphRendererTelemetryRequest({
    ...telemetry,
    layout_pattern: "AUTHORITY_RINGS"
  }), (error) => error.code === "INVALID_GRAPH_ENUM");
  assert.throws(() => parseGraphRendererTelemetryRequest({
    ...telemetry,
    dropped_frame_rate_ratio: 1.01
  }), (error) => error.code === "INVALID_GRAPH_RANGE");
  assert.doesNotThrow(() => parseGraphRendererTelemetryResponse({
    accepted: true,
    contract_version: "1.0.0",
    organization_id: "team_phase195",
    recorded_at: "2026-07-26T02:00:01.000Z",
    schema_version: 1,
    telemetry_id: secondId
  }));
});

test("Phase 195 release and worker evidence contracts fail closed", () => {
  assert.equal(PHASE_195_RELEASE_PHASE, 195);
  assert.equal(
    PHASE_195_RELEASE_MIGRATION_NAME,
    "20260726190000_phase_195_graph_preferences_release_evidence_and_worker_readiness"
  );
  const release = releaseRecordBase("CANONICAL_RELEASE", {
    accepted_at: "2026-07-26T01:00:30.000Z",
    git_commit_sha: "b".repeat(40),
    release_status: "DEPLOYED",
    release_tag: "phase-195",
    repository: "entral/entral",
    rollback_status: "AVAILABLE"
  });
  const migration = releaseRecordBase("MIGRATION_FINGERPRINT", {
    applied_at: "2026-07-26T01:00:10.000Z",
    checksum_sha256:
      "d2224f0648920a8be9a9d50561c4139ea3199f11ca953dba2963186c2cdaf1ad",
    migration_name: PHASE_195_RELEASE_MIGRATION_NAME,
    recovery_status: "FORWARD_RECOVERY_VERIFIED",
    release_id: release.record_id,
    verified_at: "2026-07-26T01:00:20.000Z"
  });
  const deployment = releaseRecordBase("DEPLOYMENT_EVIDENCE", {
    checked_at: "2026-07-26T01:00:40.000Z",
    deployed_at: "2026-07-26T01:00:35.000Z",
    deployed_commit_sha: release.git_commit_sha,
    deployment_role: "API",
    deployment_id: "dpl_phase195",
    deployment_status: "READY",
    provider: "RAILWAY",
    public_url: "https://api.example.test",
    release_id: release.record_id,
    service_name: "entral-api",
    source_freshness_seconds: 5
  });
  const frontendDeployment = releaseRecordBase("DEPLOYMENT_EVIDENCE", {
    checked_at: "2026-07-26T01:00:40.000Z",
    deployed_at: "2026-07-26T01:00:35.000Z",
    deployed_commit_sha: release.git_commit_sha,
    deployment_role: "FRONTEND",
    deployment_id: "dpl_phase195_frontend",
    deployment_status: "READY",
    idempotency_key: "phase195:DEPLOYMENT_EVIDENCE:frontend",
    provider: "VERCEL",
    public_url: "https://example.test",
    record_id: "633e4567-e89b-42d3-a456-426614174000",
    release_id: release.record_id,
    service_name: "entral-frontend",
    source_freshness_seconds: 5
  });
  const workerDeployment = releaseRecordBase("DEPLOYMENT_EVIDENCE", {
    checked_at: "2026-07-26T01:00:40.000Z",
    deployed_at: "2026-07-26T01:00:35.000Z",
    deployed_commit_sha: release.git_commit_sha,
    deployment_role: "WORKER",
    deployment_id: "dpl_phase195_worker",
    deployment_status: "READY",
    idempotency_key: "phase195:DEPLOYMENT_EVIDENCE:worker",
    provider: "RAILWAY",
    public_url: "https://worker.example.test/health",
    record_id: "643e4567-e89b-42d3-a456-426614174000",
    release_id: release.record_id,
    service_name: "entral-worker",
    source_freshness_seconds: 5
  });
  const disposition = releaseRecordBase("PULL_REQUEST_DISPOSITION", {
    decided_at: "2026-07-26T01:00:25.000Z",
    disposition: "MERGED",
    head_commit_sha: release.git_commit_sha,
    pull_request_number: 195,
    rationale: "Merged and verified at the canonical release commit.",
    release_id: release.record_id,
    repository: "entral/entral"
  });
  const runtime = releaseRecordBase("RUNTIME_MODE", {
    deterministic_fallback_reachable: false,
    in_memory_canonical_state_reachable: false,
    observed_at: "2026-07-26T01:00:45.000Z",
    observed_commit_sha: release.git_commit_sha,
    process_role: "API",
    release_id: release.record_id,
    runtime_mode: "PRODUCTION",
    sample_data_reachable: false,
    service_name: "entral-api"
  });
  const workerRuntime = releaseRecordBase("RUNTIME_MODE", {
    deterministic_fallback_reachable: false,
    in_memory_canonical_state_reachable: false,
    observed_at: "2026-07-26T01:00:46.000Z",
    observed_commit_sha: release.git_commit_sha,
    process_role: "WORKER",
    record_id: "a23e4567-e89b-42d3-a456-426614174000",
    release_id: release.record_id,
    runtime_mode: "PRODUCTION",
    sample_data_reachable: false,
    service_name: "entral-worker"
  });
  const gate = releaseRecordBase("PHASE_GATE", {
    authenticated_smoke_receipt_id: "smoke-phase195-production",
    authenticated_smoke_status: "PASSED",
    authenticated_smoke_target_url: "https://example.test/member/graph",
    ci_artifact_ids: ["phase195-release-evidence"],
    ci_git_commit_sha: release.git_commit_sha,
    ci_provider: "GITHUB_ACTIONS",
    ci_repository: release.repository,
    ci_result: "SUCCESS",
    ci_run_id: "195000",
    ci_run_url: "https://github.com/entral/entral/actions/runs/195000",
    ci_workflow: ".github/workflows/ci-cd.yml",
    closed_at: "2026-07-26T01:01:00.000Z",
    deployment_evidence_ids: [
      frontendDeployment.record_id,
      deployment.record_id,
      workerDeployment.record_id
    ],
    expected_release_version: release.version,
    gate_id: "phase-195-production",
    gate_status: "PASSED",
    migration_fingerprint_ids: [migration.record_id],
    pull_request_disposition_ids: [disposition.record_id],
    release_id: release.record_id,
    remaining_external_boundaries: [],
    rollback_recovery_reference: "runbook:phase195-forward-recovery",
    runtime_mode_record_ids: [runtime.record_id, workerRuntime.record_id],
    test_evidence_references: ["artifact:phase195-tests"]
  });

  assert.doesNotThrow(() => assertCanonicalReleaseRecord(release));
  assert.doesNotThrow(() => assertMigrationFingerprint(migration));
  assert.doesNotThrow(() => assertDeploymentEvidence(deployment));
  assert.doesNotThrow(() => assertDeploymentEvidence(frontendDeployment));
  assert.doesNotThrow(() => assertDeploymentEvidence(workerDeployment));
  assert.doesNotThrow(() => assertPullRequestDisposition(disposition));
  assert.doesNotThrow(() => assertRuntimeModeRecord(runtime));
  assert.doesNotThrow(() => assertRuntimeModeRecord(workerRuntime));
  assert.doesNotThrow(() => assertPhaseGateRecord(gate));
  assert.doesNotThrow(() => parsePhaseReleaseEvidenceReadback({
    blockers: [],
    canonical_release: release,
    complete: true,
    contract_version: "1.0.0",
    deployments: [frontendDeployment, deployment, workerDeployment],
    generated_at: "2026-07-26T01:02:00.000Z",
    migration_fingerprints: [migration],
    phase: 195,
    phase_gate: gate,
    pull_request_dispositions: [disposition],
    runtime_modes: [runtime, workerRuntime],
    schema_version: 1
  }));
  assert.throws(() => parsePhaseReleaseEvidenceReadback({
    blockers: [],
    canonical_release: release,
    complete: true,
    contract_version: "1.0.0",
    deployments: [frontendDeployment, deployment, workerDeployment],
    generated_at: "2026-07-26T01:02:00.000Z",
    migration_fingerprints: [],
    phase: 195,
    phase_gate: gate,
    pull_request_dispositions: [disposition],
    runtime_modes: [runtime, workerRuntime],
    schema_version: 1
  }), (error) => error.code === "FALSE_RELEASE_COMPLETION");
  assert.throws(() => parsePhaseReleaseEvidenceReadback({
    blockers: [],
    canonical_release: release,
    complete: true,
    contract_version: "1.0.0",
    deployments: [frontendDeployment, deployment, workerDeployment],
    generated_at: "2026-07-26T01:02:00.000Z",
    migration_fingerprints: [migration],
    phase: 195,
    phase_gate: gate,
    pull_request_dispositions: [disposition],
    runtime_modes: [runtime],
    schema_version: 1
  }), (error) => error.code === "RELEASE_GATE_REFERENCE_MISMATCH");
  assert.throws(() => assertPhaseGateRecord({
    ...gate,
    authenticated_smoke_receipt_id: null,
    authenticated_smoke_status: "PENDING"
  }), (error) => error.code === "UNVERIFIED_PHASE_GATE");
  assert.throws(() => assertPhaseGateRecord({
    ...gate,
    deployment_evidence_ids: [
      frontendDeployment.record_id,
      deployment.record_id,
      deployment.record_id
    ]
  }), (error) => error.code === "DUPLICATE_RELEASE_REFERENCE");
  assert.throws(() => assertPhaseGateRecord({
    ...gate,
    ci_run_url: "https://github.com/other/entral/actions/runs/195000"
  }), (error) => error.code === "INVALID_CI_URL");
  assert.throws(() => assertPhaseGateRecord({
    ...gate,
    ci_provider: "OTHER_CI"
  }), (error) => error.code === "UNVERIFIED_PHASE_GATE");
  assert.throws(() => parsePhaseReleaseEvidenceReadback({
    blockers: [],
    canonical_release: release,
    complete: true,
    contract_version: "1.0.0",
    deployments: [frontendDeployment, deployment, workerDeployment],
    generated_at: "2026-07-26T01:02:00.000Z",
    migration_fingerprints: [migration],
    phase: 195,
    phase_gate: {
      ...gate,
      ci_git_commit_sha: "a".repeat(40)
    },
    pull_request_dispositions: [disposition],
    runtime_modes: [runtime, workerRuntime],
    schema_version: 1
  }), (error) => error.code === "FALSE_RELEASE_COMPLETION");
  const extraDeployment = {
    ...deployment,
    idempotency_key: "phase195:DEPLOYMENT_EVIDENCE:extra-api",
    record_id: "653e4567-e89b-42d3-a456-426614174000",
    service_name: "entral-api-extra"
  };
  assert.throws(() => parsePhaseReleaseEvidenceReadback({
    blockers: [],
    canonical_release: release,
    complete: true,
    contract_version: "1.0.0",
    deployments: [
      frontendDeployment,
      deployment,
      workerDeployment,
      extraDeployment
    ],
    generated_at: "2026-07-26T01:02:00.000Z",
    migration_fingerprints: [migration],
    phase: 195,
    phase_gate: gate,
    pull_request_dispositions: [disposition],
    runtime_modes: [runtime, workerRuntime],
    schema_version: 1
  }), (error) => error.code === "RELEASE_GATE_REFERENCE_MISMATCH");
  assert.doesNotThrow(() => parseWorkerReadinessEvidence({
    age_seconds: null,
    components: {
      agent_orchestrator: false,
      automation_worker: false,
      autonomy_scheduler: false,
      canonical_outbox_dispatcher: false,
      membership_notification_dispatcher: false,
      process: false
    },
    contract_version: "1.0.0",
    evidence_source: "NONE",
    observed_at: null,
    queue: null,
    ready: false,
    schema_version: 1,
    status: "UNAVAILABLE"
  }));
  assert.throws(() => parseWorkerReadinessEvidence({
    age_seconds: null,
    components: {
      agent_orchestrator: false,
      automation_worker: false,
      autonomy_scheduler: false,
      canonical_outbox_dispatcher: false,
      membership_notification_dispatcher: false,
      process: false
    },
    contract_version: "1.0.0",
    evidence_source: "NONE",
    observed_at: null,
    queue: null,
    ready: true,
    schema_version: 1,
    status: "UNAVAILABLE"
  }), (error) => error.code === "WORKER_READINESS_MISMATCH");
});

test("Phase 180 hierarchy and entity full-record parsers enforce snapshot integrity", () => {
  const scope = {
    label: "Human portfolio / all canonical businesses",
    mode: "HUMAN_PORTFOLIO",
    user_id: secondId,
    visible_business_ids: []
  };
  const hierarchy = parseCanonicalHierarchyResponse({
    entities: [canonicalEntitySummary()],
    event_sequence: 19,
    generated_at: "2026-07-25T02:00:00.000Z",
    scope
  });
  assert.equal(hierarchy.entities.length, 1);
  assert.equal(hierarchy.event_sequence, 19);
  assert.throws(() => parseCanonicalHierarchyResponse({
    entities: [canonicalEntitySummary({ parent_id: thirdId })],
    event_sequence: 19,
    generated_at: "2026-07-25T02:00:00.000Z",
    scope
  }), (error) => error.code === "MISSING_HIERARCHY_PARENT");

  const full = parseEntityFullRecordResponse({
    entity: {
      aggregate_version: 3,
      audit: [],
      authority: {},
      configuration: {},
      connections: {},
      economics: {},
      evidence: {},
      loaded_at: "2026-07-25T02:00:00.000Z",
      operations: {},
      reliability: {},
      runtime: {},
      summary: canonicalEntitySummary(),
      version_history: [{
        changed_at: "2026-07-25T01:00:00.000Z",
        reason: "Canonical seed",
        version: 3
      }]
    },
    event_sequence: 19
  });
  assert.equal(full.entity.aggregate_version, 3);
  assert.equal(full.entity.summary.version, 3);
  assert.throws(() => parseEntityFullRecordResponse({
    ...full,
    entity: { ...full.entity, aggregate_version: 2 }
  }), (error) => error.code === "ENTITY_VERSION_MISMATCH");
});

test("Phase 170 portfolio parser accepts canonical summaries and resolved scope", () => {
  const parsed = parsePortfolioSummaryResponse({
    businesses: [canonicalBusinessSummary()],
    event_sequence: 12,
    generated_at: "2026-07-25T02:00:00.000Z",
    scope: {
      label: "Human portfolio / all canonical businesses",
      mode: "HUMAN_PORTFOLIO",
      user_id: secondId,
      visible_business_ids: [id]
    },
    totals: {
      active_commanders: 1,
      active_soldiers: 3,
      businesses: 1,
      financials: [{
        business_count: 1,
        businesses_with_financials: 1,
        capital_available: 5000,
        currency: "USD",
        gross_revenue: 12500,
        net_contribution: 4400
      }],
      health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 1, UNKNOWN: 0, WATCH: 0 },
      unresolved_exceptions: 0
    }
  });

  assert.equal(parsed.businesses[0].business_name, "Canonical Software");
  assert.equal(parsed.scope.mode, "HUMAN_PORTFOLIO");
  assert.equal(parsed.totals.financials[0].net_contribution, 4400);
});

test("Phase 180 business full-record parser preserves aggregate version beside the snapshot event cursor", () => {
  const payload = {
    business: {
      agents_and_tools: { agents: [] },
      aggregate_version: 3,
      decisions_and_changes: { decisions: [] },
      evidence_ids: [thirdId],
      external_activity: { sources: [] },
      financials: { snapshots: [] },
      issues_and_recommendations: { recommendations: [] },
      loaded_at: "2026-07-25T02:00:00.000Z",
      operations: { missions: [] },
      overview: { profile: null },
      performance: { metrics: [] },
      summary: canonicalBusinessSummary(),
      version_history: [{ changed_at: "2026-07-25T01:00:00.000Z", reason: "Verified update", version: 3 }]
    },
    event_sequence: 19
  };

  const parsed = parseBusinessFullRecordResponse(payload);
  assert.equal(parsed.business.aggregate_version, 3);
  assert.equal(parsed.event_sequence, 19);
  assert.equal(parsed.business.summary.version, 3);
  assert.throws(
    () => parseBusinessFullRecordResponse({
      ...payload,
      business: { ...payload.business, aggregate_version: 2 }
    }),
    (error) => {
      assert.equal(error.code, "BUSINESS_VERSION_MISMATCH");
      return true;
    }
  );
});

test("Phase 170 event parser accepts minimal invalidation metadata and rejects bad cursors", () => {
  const parsed = parseCanonicalPortfolioEventsResponse({
    events: [{
      aggregate_id: id,
      aggregate_type: "BUSINESS",
      aggregate_version: 4,
      business_id: id,
      event_id: secondId,
      event_type: "BUSINESS_UPDATED",
      occurred_at: "2026-07-25T03:00:00.000Z",
      sequence_number: 13
    }],
    next_sequence: 13
  });

  assert.equal(parsed.events[0].business_id, id);
  assert.throws(
    () => parseCanonicalPortfolioEventsResponse({ events: [], next_sequence: -1 }),
    ContractError
  );
});

test("Phase 180 ENTRAL conversation parser preserves scoped messages, event identity, and evidence", () => {
  const parsed = parseCanonicalEntralConversationResponse({
    event_sequence: 13,
    generated_at: "2026-07-25T03:00:00.000Z",
    messages: [{
      acknowledged_at: null,
      business_id: id,
      content: "The requested result is verified.",
      created_at: "2026-07-25T02:59:00.000Z",
      delivered_at: "2026-07-25T03:00:00.000Z",
      direction: "ENTRAL_TO_HUMAN",
      entral_entity_id: secondId,
      event_id: thirdId,
      event_sequence: 12,
      evidence_refs: [{ id, type: "SOURCE_RECORD" }],
      message_id: secondId,
      message_type: "RESULT",
      status: "DELIVERED"
    }]
  });

  assert.equal(parsed.messages[0].event_id, thirdId);
  assert.deepEqual(parsed.messages[0].evidence_refs[0], { id, type: "SOURCE_RECORD" });
  assert.throws(
    () => parseCanonicalEntralConversationResponse({
      ...parsed,
      messages: [{ ...parsed.messages[0], direction: "SOLDIER_TO_HUMAN" }]
    }),
    ContractError
  );
});

test("canonical parent roles pass and invalid roles fail", () => {
  assert.doesNotThrow(() => assertValidParentRole("ENTRAL", null));
  assert.doesNotThrow(() => assertValidParentRole("MARSHAL", "ENTRAL"));
  assert.doesNotThrow(() => assertValidParentRole("GENERAL", "MARSHAL"));
  assert.doesNotThrow(() => assertValidParentRole("COMMANDER", "GENERAL"));
  assert.doesNotThrow(() => assertValidParentRole("SOLDIER", "COMMANDER"));
  assert.throws(() => assertValidParentRole("COMMANDER", "MARSHAL"), (error) => {
    assert.equal(error.code, "INVALID_PARENT_ROLE");
    return true;
  });
  assert.throws(() => assertValidParentRole("EMPEROR", null), (error) => {
    assert.equal(error.code, "INVALID_ENTITY_ROLE");
    return true;
  });
});

test("skipped operational routes are rejected in both directions", () => {
  assert.throws(() => assertOperationalRoute("ENTRAL", "COMMANDER"), ContractError);
  assert.throws(() => assertOperationalRoute("SOLDIER", "GENERAL"), ContractError);
  assert.doesNotThrow(() => assertOperationalRoute("COMMANDER", "SOLDIER"));
  assert.doesNotThrow(() => assertOperationalRoute("SOLDIER", "COMMANDER"));
});

test("member hierarchy accepts the canonical chain and rejects legacy emperor", () => {
  assert.doesNotThrow(() => assertMemberCommandHierarchy({
    nodes: [
      { id: "entral", name: "ENTRAL", parentId: null, rank: "ENTRAL", status: "working" },
      { id: "marshal", name: "Marshal", parentId: "entral", rank: "MARSHAL", status: "idle" },
      { id: "general", name: "General", parentId: "marshal", rank: "GENERAL", status: "idle" },
      { id: "commander", name: "Commander", parentId: "general", rank: "COMMANDER", status: "idle" },
      { id: "soldier", name: "Soldier", parentId: "commander", rank: "SOLDIER", status: "idle" }
    ]
  }));
  assert.throws(() => assertMemberCommandHierarchy({
    nodes: [{ id: "entral", name: "ENTRAL", parentId: null, rank: "emperor", status: "idle" }]
  }), (error) => {
    assert.equal(error.code, "INVALID_ENTITY_ROLE");
    return true;
  });
});

test("member response parsing strips non-contract fields", () => {
  const parsed = parseMemberOrganizationsResponse({
    organizations: [{
      id: "organization",
      joinedAt: "2026-07-24T00:00:00Z",
      memberCount: 1,
      memberLimit: 5,
      name: "Organization",
      role: "OWNER",
      slug: "organization",
      internal: "remove"
    }],
    user: {
      email: "owner@example.com",
      id: "owner",
      name: "Owner",
      role: "ADMIN"
    },
    token: "remove"
  });
  assert.deepEqual(parsed, {
    organizations: [{
      id: "organization",
      joinedAt: "2026-07-24T00:00:00Z",
      memberCount: 1,
      memberLimit: 5,
      name: "Organization",
      role: "OWNER",
      slug: "organization"
    }],
    user: {
      email: "owner@example.com",
      id: "owner",
      name: "Owner"
    }
  });
});

test("member response preserves the existing one-to-five seat contract", () => {
  const response = {
    organizations: [{
      id: "organization",
      joinedAt: "2026-07-24T00:00:00Z",
      memberCount: 1,
      memberLimit: 6,
      name: "Organization",
      role: "OWNER",
      slug: "organization"
    }],
    user: {
      email: "owner@example.com",
      id: "owner",
      name: "Owner"
    }
  };
  assert.throws(() => parseMemberOrganizationsResponse(response), ContractError);
  assert.doesNotThrow(() => parseMemberOrganizationsResponse({
    ...response,
    organizations: [{ ...response.organizations[0], memberLimit: 5 }]
  }));
});

test("member overview rejects out-of-range published values", () => {
  assert.throws(() => assertMemberOverviewResponse({
    availability: { subscription: { available: false, reason: "Not configured" } },
    members: [],
    organization: {
      id: "organization",
      memberCount: 1,
      memberLimit: 5,
      name: "Organization",
      role: "OWNER",
      slug: "organization"
    },
    recentTasks: [],
    taskSummary: { done: 0, inProgress: 0, overdue: 0, todo: 0, total: 0 },
    workspace: {
      businessHealth: { score: 101, status: "stable", summary: "Invalid" },
      findingsAndRecommendations: [],
      monthlyOperatingSummary: null,
      objectivesAndPriorities: [],
      publishedAt: "2026-07-24T00:00:00Z",
      version: 1
    }
  }), ContractError);
});

test("action request validates versioned and idempotent input", () => {
  const request = {
    action_id: id,
    action_type: "PAUSE_ENTITY",
    actor_type: "ENTRAL",
    actor_id: secondId,
    scope: {
      scope_type: "ENTITY",
      scope_id: thirdId,
      entity_id: thirdId,
      display_label: "Target entity"
    },
    target_entity_id: thirdId,
    reason: "Verified dependency failure",
    parameters: {},
    expected_version: 3,
    idempotency_key: "pause-entity-123456",
    requested_at: "2026-07-24T00:00:00Z"
  };
  assert.doesNotThrow(() => assertActionRequest(request));
  assert.throws(() => assertActionRequest({ ...request, actor_type: "EMPEROR" }), (error) => {
    assert.equal(error.code, "INVALID_ACTOR_TYPE");
    return true;
  });
  assert.throws(() => assertActionRequest({
    ...request,
    scope: { ...request.scope, scope_type: "ORGANIZATION" }
  }), (error) => {
    assert.equal(error.code, "INVALID_SCOPE_TYPE");
    return true;
  });
});

test("stale expected version is rejected", () => {
  assert.doesNotThrow(() => assertExpectedVersion(4, 4));
  assert.throws(() => assertExpectedVersion(3, 4), (error) => {
    assert.equal(error.code, "STALE_EXPECTED_VERSION");
    return true;
  });
});

test("governance action requests enforce actor, target, scope, and policy compatibility", () => {
  const request = {
    action_id: id,
    action_type: "PAUSE",
    actor_type: "HUMAN",
    actor_id: secondId,
    scope: {
      scope_type: "ENTITY",
      scope_id: thirdId,
      entity_id: thirdId,
      display_label: "Target entity"
    },
    target_type: "ENTITY",
    target_id: thirdId,
    business_id: null,
    requested_outcome: "Pause the target without changing its hierarchy.",
    reason: "A verified dependency is unavailable.",
    authority_basis: { permission: "pause" },
    risk_class: "MEDIUM",
    confidence: 1,
    proposed_changes: { status: "PAUSED" },
    rollback_plan: { action: "RESUME" },
    verification_plan: { checks: ["read-after-write"] },
    expected_version: 3,
    idempotency_key: "pause-entity-123456",
    requested_at: "2026-07-24T00:00:00Z"
  };

  assert.doesNotThrow(() => assertGovernanceActionRequest(request));
  assert.throws(
    () => assertGovernanceActionRequest({ ...request, actor_type: "SYSTEM" }),
    (error) => error.code === "INVALID_GOVERNANCE_ACTOR"
  );
  assert.throws(
    () => assertGovernanceActionRequest({ ...request, action_type: "SCHEDULE_CHANGE" }),
    (error) => error.code === "ACTION_TARGET_MISMATCH"
  );
  assert.throws(
    () => assertGovernanceActionRequest({ ...request, action_type: "REPAIR" }),
    (error) => error.code === "INVALID_GOVERNANCE_ACTOR"
  );
});

test("entity pause and resume contracts bind status, containment, version, and verified receipts", () => {
  const request = {
    action_id: id,
    action_type: "PAUSE",
    actor_type: "HUMAN",
    actor_id: secondId,
    scope: {
      scope_type: "ENTITY",
      scope_id: thirdId,
      entity_id: thirdId,
      display_label: "Target entity"
    },
    target_type: "ENTITY",
    target_id: thirdId,
    business_id: null,
    requested_outcome: "Pause the target without changing its hierarchy.",
    reason: "A verified dependency is unavailable.",
    authority_basis: { channel: "MEMBER_INFRASTRUCTURE" },
    risk_class: "MEDIUM",
    confidence: 1,
    proposed_changes: {
      containment_policy: "FINISH_IN_FLIGHT",
      status: "PAUSED"
    },
    rollback_plan: {
      action: "RESUME",
      previous_status: "ACTIVE"
    },
    verification_plan: { checks: ["database-readback"] },
    expected_version: 3,
    idempotency_key: "pause-entity-123456",
    requested_at: "2026-07-24T00:00:00Z"
  };
  assert.doesNotThrow(() => assertEntityLifecycleActionRequest(request));
  assert.throws(
    () => assertEntityLifecycleActionRequest({
      ...request,
      proposed_changes: { ...request.proposed_changes, status: "ACTIVE" }
    }),
    (error) => error.code === "LIFECYCLE_STATUS_MISMATCH"
  );
  assert.throws(
    () => assertEntityLifecycleActionRequest({
      ...request,
      rollback_plan: { ...request.rollback_plan, action: "PAUSE" }
    }),
    (error) => error.code === "ROLLBACK_ACTION_MISMATCH"
  );

  const result = {
    action_id: id,
    action_type: "PAUSE",
    status: "SUCCEEDED",
    target: {
      business_id: null,
      entity_id: thirdId,
      entity_role: "MARSHAL",
      status: "PAUSED",
      version: 4
    },
    before: { status: "ACTIVE", version: 3 },
    after: { status: "PAUSED", version: 4 },
    containment: {
      descendants_affected: 12,
      new_work_leasing: "BLOCKED",
      policy: "FINISH_IN_FLIGHT"
    },
    verification: {
      checked_at: "2026-07-24T00:00:01Z",
      expected_status: "PAUSED",
      expected_version: 4,
      observed_status: "PAUSED",
      observed_version: 4,
      passed: true,
      verification_id: secondId
    },
    canonical_event: { aggregate_version: 4, event_id: thirdId, sequence_number: 42 },
    audit_entry_ids: [secondId],
    conversation_message_id: thirdId,
    idempotency_key: "pause-entity-123456",
    idempotent_replay: false,
    requested_at: "2026-07-24T00:00:00Z",
    completed_at: "2026-07-24T00:00:01Z",
    rollback: {
      action_type: "RESUME",
      available: true,
      expected_version: 4,
      restores_action_id: id
    },
    restoration_of_action_id: null
  };
  assert.doesNotThrow(() => assertEntityLifecycleActionResult(result));
  assert.throws(
    () => assertEntityLifecycleActionResult({
      ...result,
      verification: { ...result.verification, observed_version: 3 }
    }),
    (error) => error.code === "LIFECYCLE_READBACK_MISMATCH"
  );
  assert.throws(
    () => assertEntityLifecycleActionResult({
      ...result,
      containment: { ...result.containment, new_work_leasing: "ELIGIBLE" }
    }),
    (error) => error.code === "LIFECYCLE_CONTAINMENT_MISMATCH"
  );
  assert.throws(
    () => assertEntityLifecycleActionResult({
      ...result,
      target: { ...result.target, entity_role: "ENTRAL" }
    }),
    (error) => error.code === "INVALID_LIFECYCLE_TARGET_ROLE"
  );
  assert.throws(
    () => assertEntityLifecycleActionResult({
      ...result,
      rollback: { ...result.rollback, action_type: "PAUSE" }
    }),
    (error) => error.code === "INVALID_LIFECYCLE_ROLLBACK"
  );
  assert.throws(
    () => assertEntityLifecycleActionResult({
      ...result,
      canonical_event: { ...result.canonical_event, aggregate_version: 3 }
    }),
    (error) => error.code === "LIFECYCLE_EVENT_VERSION_MISMATCH"
  );
});

test("duplicate idempotency key is rejected", () => {
  const registry = new IdempotencyKeyRegistry();
  registry.claim("entity-edit-123456");
  assert.throws(() => registry.claim("entity-edit-123456"), (error) => {
    assert.equal(error.code, "DUPLICATE_IDEMPOTENCY_KEY");
    return true;
  });
});

test("invalid personality version is rejected", () => {
  const profile = {
    personality_id: id,
    version: "phase-130",
    display_name: "ENTRAL",
    purpose: "Evidence disciplined command support",
    traits: ["direct"],
    response_principles: ["verify"],
    prohibited_tendencies: ["invent"],
    default_detail: "BALANCED",
    warmth: 0.5,
    humor: 0.1,
    assertiveness: 0.8,
    evidence_discipline: 1
  };
  assert.throws(() => assertPersonalityProfile(profile), (error) => {
    assert.equal(error.code, "INVALID_PERSONALITY_VERSION");
    return true;
  });
  assert.doesNotThrow(() => assertPersonalityProfile({ ...profile, version: "1.0.0" }));
});

function activeIntegration(overrides = {}) {
  return {
    integration_id: id,
    provider_code: "shopify",
    provider_name: "Shopify",
    provider_api_version: "2026-04",
    capability_codes: ["COMMERCE_PLATFORM"],
    official_documentation_url: "https://shopify.dev/docs/api",
    stage: "ACTIVE",
    adapter_version: "1.0.0",
    auth_methods: ["API_KEY"],
    credential_reference_id: secondId,
    owning_business_id: thirdId,
    granted_operation_codes: ["storefront.draft.write"],
    live_tested_at: "2026-07-24T00:00:00Z",
    active_at: "2026-07-24T01:00:00Z",
    evidence_ids: [id],
    disabled_reason: null,
    ...overrides
  };
}

const requirement = {
  provider_code: "shopify",
  provider_api_version: "2026-04",
  adapter_version: "1.0.0",
  credential_reference_id: secondId,
  owning_business_id: thirdId,
  operation_code: "storefront.draft.write"
};

test("non-active provider execution is rejected", () => {
  assert.throws(() => assertExecutableIntegration(activeIntegration({
    stage: "LIVE_TESTED",
    active_at: null
  }), requirement), (error) => {
    assert.equal(error.code, "INTEGRATION_NOT_ACTIVE");
    return true;
  });
});

test("active provider must match exact owner, versions, credential, and operation", () => {
  assert.doesNotThrow(() => assertExecutableIntegration(activeIntegration(), requirement));
  for (const changed of [
    { owning_business_id: id },
    { adapter_version: "2.0.0" },
    { provider_api_version: "2025-10" },
    { credential_reference_id: id },
    { granted_operation_codes: ["orders.read"] }
  ]) {
    assert.throws(() => assertExecutableIntegration(activeIntegration(changed), requirement), ContractError);
  }
});

test("integration registry records reject malformed arrays and duplicate grants", () => {
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    auth_methods: "API_KEY"
  })), (error) => {
    assert.equal(error.code, "INVALID_AUTH_METHODS");
    return true;
  });
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    granted_operation_codes: ["storefront.draft.write", "storefront.draft.write"]
  })), (error) => {
    assert.equal(error.code, "DUPLICATE_INTEGRATION_VALUE");
    return true;
  });
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    stage: "ACTIVE",
    disabled_reason: "operator disabled"
  })), (error) => {
    assert.equal(error.code, "ACTIVE_INTEGRATION_DISABLED");
    return true;
  });
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    provider_api_version: null
  })), (error) => {
    assert.equal(error.code, "ACTIVE_INTEGRATION_INCOMPLETE");
    return true;
  });
  assert.throws(() => assertIntegrationRegistryRecord(activeIntegration({
    active_at: "2026-07-23T23:00:00Z"
  })), (error) => {
    assert.equal(error.code, "INVALID_ACTIVATION_ORDER");
    return true;
  });
});

test("queue payload requires the shared versioned envelope", () => {
  assert.doesNotThrow(() => assertQueueJobEnvelope({
    contract_version: "1.0.0",
    job_id: id,
    job_type: "agent-task",
    idempotency_key: "agent-task-123456",
    correlation_id: secondId,
    enqueued_at: "2026-07-24T00:00:00Z",
    payload: { taskId: thirdId }
  }));
  assert.throws(() => assertQueueJobEnvelope({ job_type: "agent-task", payload: {} }), ContractError);
  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => assertQueueJobEnvelope({
    contract_version: "1.0.0",
    job_id: id,
    job_type: "agent-task",
    idempotency_key: "agent-task-123456",
    correlation_id: secondId,
    enqueued_at: "2026-07-24T00:00:00Z",
    payload: cyclic
  }), (error) => {
    assert.equal(error.code, "CYCLIC_JSON_VALUE");
    return true;
  });
  assert.throws(() => assertQueueJobEnvelope({
    contract_version: "1.0.0",
    job_id: id,
    job_type: "agent-task",
    idempotency_key: "agent-task-123456",
    correlation_id: secondId,
    enqueued_at: "2026-07-24T00:00:00Z",
    payload: { invalid: Number.POSITIVE_INFINITY }
  }), (error) => {
    assert.equal(error.code, "INVALID_JSON_VALUE");
    return true;
  });
});

test("event and audit consumers reject malformed canonical records", () => {
  const scope = {
    scope_type: "ENTITY",
    scope_id: thirdId,
    entity_id: thirdId,
    display_label: "Target entity"
  };
  const event = {
    event_id: id,
    sequence_number: 1,
    event_type: "entity.paused",
    aggregate_type: "ENTITY",
    aggregate_id: thirdId,
    aggregate_version: 4,
    scope,
    actor_type: "ENTRAL",
    actor_id: secondId,
    correlation_id: id,
    causation_id: null,
    payload: {},
    occurred_at: "2026-07-24T00:00:00Z"
  };
  const audit = {
    audit_id: id,
    sequence_number: 1,
    actor_type: "ENTRAL",
    actor_id: secondId,
    action_type: "PAUSE_ENTITY",
    target_type: "ENTITY",
    target_id: thirdId,
    scope,
    reason: "Verified dependency failure",
    before_state: { status: "ACTIVE" },
    after_state: { status: "PAUSED" },
    result: "SUCCEEDED",
    evidence_ids: [id],
    rollback_action_id: null,
    correlation_id: id,
    created_at: "2026-07-24T00:00:00Z"
  };
  assert.doesNotThrow(() => assertCanonicalEvent(event));
  assert.doesNotThrow(() => assertAuditEntry(audit));
  assert.throws(() => assertCanonicalEvent({ ...event, sequence_number: 0 }), ContractError);
  assert.throws(() => assertCanonicalEvent({ ...event, actor_type: "EMPEROR" }), ContractError);
  assert.throws(() => assertAuditEntry({ ...audit, correlation_id: "not-a-uuid" }), ContractError);
  assert.throws(() => assertAuditEntry({ ...audit, result: "PENDING" }), ContractError);
});

test("OpenAPI exposes only implemented canonical, member, Capability Truth, interaction, and identity paths", async () => {
  const openapi = await readFile(new URL("../openapi.yaml", import.meta.url), "utf8");
  const document = parseYaml(openapi);
  assert.equal(document.openapi, "3.1.0");
  assert.deepEqual(Object.keys(document.paths).sort(), [
    "/api/v1/account",
    "/api/v1/account/export",
    "/api/v1/admin/product-truth",
    "/api/v1/admin/product-truth/capabilities/{capabilityId}/evidence",
    "/api/v1/admin/product-truth/capabilities/{capabilityId}/transitions",
    "/api/v1/control-plane/businesses",
    "/api/v1/control-plane/businesses/{businessId}",
    "/api/v1/control-plane/businesses/{businessId}/full",
    "/api/v1/control-plane/entities/{entityId}/actions/{operation}",
    "/api/v1/control-plane/entities/{entityId}/full",
    "/api/v1/control-plane/events",
    "/api/v1/control-plane/governance-actions",
    "/api/v1/control-plane/hierarchy",
    "/api/v1/control-plane/portfolio/summary",
    "/api/v1/control-plane/releases/phases/{phase}/evidence",
    "/api/v1/identity/memberships",
    "/api/v1/identity/memberships/invitations",
    "/api/v1/identity/memberships/invitations/accept",
    "/api/v1/identity/memberships/{subjectUserId}",
    "/api/v1/identity/mfa/factors",
    "/api/v1/identity/mfa/recovery/regenerate",
    "/api/v1/identity/mfa/step-up",
    "/api/v1/identity/mfa/totp/confirm",
    "/api/v1/identity/mfa/totp/enroll",
    "/api/v1/identity/mfa/{factorId}",
    "/api/v1/identity/sessions",
    "/api/v1/identity/sessions/{sessionId}",
    "/api/v1/identity/support-access",
    "/api/v1/identity/support-access/{grantId}",
    "/api/v1/identity/support-access/{grantId}/elevate",
    "/api/v1/identity/support-session",
    "/api/v1/identity/support-session/tasks",
    "/api/v1/identity/support-session/tasks/{taskId}",
    "/api/v1/member/organizations",
    "/api/v1/member/organizations/{organizationId}/businesses/{businessId}/full",
    "/api/v1/member/organizations/{organizationId}/entities/{entityId}/actions/{operation}",
    "/api/v1/member/organizations/{organizationId}/entities/{entityId}/full",
    "/api/v1/member/organizations/{organizationId}/entral/assistant/messages",
    "/api/v1/member/organizations/{organizationId}/entral/conversation",
    "/api/v1/member/organizations/{organizationId}/events",
    "/api/v1/member/organizations/{organizationId}/governance-actions",
    "/api/v1/member/organizations/{organizationId}/graph/preferences",
    "/api/v1/member/organizations/{organizationId}/graph/projection",
    "/api/v1/member/organizations/{organizationId}/graph/telemetry",
    "/api/v1/member/organizations/{organizationId}/hierarchy",
    "/api/v1/member/organizations/{organizationId}/interaction/analytics",
    "/api/v1/member/organizations/{organizationId}/interaction/business-health",
    "/api/v1/member/organizations/{organizationId}/interaction/tutorial-progress",
    "/api/v1/member/organizations/{organizationId}/overview",
    "/api/v1/member/organizations/{organizationId}/portfolio/summary",
    "/api/v1/member/organizations/{organizationId}/product-truth",
    "/api/v1/product-truth/claims"
  ]);
  assert.equal(document.components.schemas.PublicProductTruthProjection.additionalProperties, false);
  assert.equal(document.components.schemas.PublicProductClaim.properties.lifecycle_state.const, "SELLABLE");
  assert.equal(document.components.schemas.CapabilityTruthAdminReadback.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalEntitySummary.additionalProperties, false);
  assert.equal(document.components.schemas.Phase202AccountExport.additionalProperties, false);
  assert.equal(document.components.schemas.Phase202AccountDeidentificationRequest.additionalProperties, false);
  assert.equal(document.components.schemas.Phase202AccountDeidentificationResult.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalHierarchyResponse.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalEntityFullRecord.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalBusinessSummary.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalPortfolioSummary.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalBusinessFullRecord.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalPortfolioEvents.additionalProperties, false);
  assert.equal(document.components.schemas.CanonicalEntralConversation.additionalProperties, false);
  assert.equal(document.components.schemas.MemberEntralAssistantMessageRequest.additionalProperties, false);
  assert.equal(document.components.schemas.MemberEntralAssistantMessageResponse.additionalProperties, false);
  assert.equal(document.components.schemas.GovernanceActionRequest.additionalProperties, false);
  assert.equal(document.components.schemas.EntityLifecycleActionResult.additionalProperties, false);
  assert.equal(document.components.schemas.EntityLifecycleActionEnvelope.additionalProperties, false);
  assert.equal(document.components.schemas.MemberOverviewResponse.additionalProperties, false);
  assert.equal(document.components.schemas.MemberWorkspace.additionalProperties, false);
  assert.equal(document.components.schemas.GraphProjection.additionalProperties, false);
  assert.equal(document.components.schemas.GraphViewPreferences.additionalProperties, false);
  assert.equal(document.components.schemas.GraphViewPreferencesUpdateRequest.additionalProperties, false);
  assert.equal(document.components.schemas.GraphViewPreferencesResetRequest.additionalProperties, false);
  assert.equal(document.components.schemas.GraphViewPreferencesMutationResponse.additionalProperties, false);
  assert.equal(document.components.schemas.GraphRendererTelemetryRequest.additionalProperties, false);
  assert.equal(document.components.schemas.GraphRendererTelemetryResponse.additionalProperties, false);
  assert.equal(document.components.schemas.BusinessHealthResponse.additionalProperties, false);
  assert.equal(document.components.schemas.TutorialProgress.additionalProperties, false);
  assert.equal(document.components.schemas.TutorialProgressMutationResponse.additionalProperties, false);
  assert.equal(document.components.schemas.InteractionAnalyticsEventRequest.additionalProperties, false);
  for (const phase202Schema of [
    "DependencyUnavailableResult",
    "Phase202SessionInventory",
    "Phase202SessionTransitionReceipt",
    "Phase202SecretReferenceDescriptor",
    "Phase202SecretTransitionReceipt",
    "Phase202MfaFactorInventory",
    "Phase202TotpEnrollment",
    "Phase202MembershipInventory",
    "Phase202MembershipInvitationRequest",
    "Phase202MembershipAcceptanceRequest",
    "Phase202MembershipTransitionRequest",
    "Phase202MembershipTransitionReceipt",
    "Phase202SupportGrantRequest",
    "Phase202SupportElevationRequest",
    "Phase202SupportGrant",
    "Phase202SupportSessionReadback",
    "Phase202SupportTaskInventory",
    "Phase202SupportTaskMutationRequest",
    "Phase202SupportTaskMutationResult",
    "Phase202RateLimitReceipt"
  ]) {
    assert.equal(document.components.schemas[phase202Schema].additionalProperties, false);
  }
  const sessionSchema = document.components.schemas.Phase202Session;
  assert.deepEqual(sessionSchema.properties.session_type.enum, ["INTERNAL", "MEMBER", "SUPPORT"]);
  assert.ok(sessionSchema.required.includes("support_grant_id"));
  assert.deepEqual(sessionSchema.properties.support_grant_id.type, ["string", "null"]);
  assert.equal(sessionSchema.properties.device_label.type, "string");
  const sessionScopeTypes = Object.fromEntries(sessionSchema.allOf.map((rule) => [
    rule.if.properties.session_type.const,
    {
      organization: rule.then.properties.organization_id.type,
      supportGrant: rule.then.properties.support_grant_id.type,
      tenant: rule.then.properties.tenant_id.type
    }
  ]));
  assert.deepEqual(sessionScopeTypes, {
    INTERNAL: { organization: "null", supportGrant: "null", tenant: "null" },
    MEMBER: { organization: "string", supportGrant: "null", tenant: "string" },
    SUPPORT: { organization: "string", supportGrant: "string", tenant: "string" }
  });

  for (const sessionPath of ["/api/v1/identity/sessions", "/api/v1/identity/sessions/{sessionId}"]) {
    const operation = document.paths[sessionPath].delete;
    assert.ok(
      operation.parameters.some((parameter) => parameter.$ref === "#/components/parameters/IdempotencyKey"),
      `${sessionPath} DELETE must require Idempotency-Key`
    );
    assert.equal(
      operation.responses["200"].content["application/json"].schema.$ref,
      "#/components/schemas/Phase202SessionTransitionReceipt"
    );
  }

  const secretDescriptor = document.components.schemas.Phase202SecretReferenceDescriptor;
  for (const descriptorField of ["business_id", "revoked_at", "updated_at"]) {
    assert.ok(secretDescriptor.required.includes(descriptorField), `${descriptorField} must be part of the complete secret descriptor`);
  }
  assert.equal(secretDescriptor["x-entral-internal"], true);
  assert.equal(document.components.schemas.Phase202SecretTransitionReceipt["x-entral-internal"], true);
  assert.equal(Object.keys(document.paths).some((path) => path.includes("secret")), false, "secret broker must remain internal-only");
  assert.equal(document.components.schemas.PhaseReleaseEvidenceReadback.additionalProperties, false);
  const phaseGateSchema = document.components.schemas.PhaseGateRecord.allOf[1];
  for (const ciIdentityField of [
    "ci_repository",
    "ci_workflow",
    "ci_git_commit_sha"
  ]) {
    assert.ok(
      phaseGateSchema.required.includes(ciIdentityField),
      `${ciIdentityField} must be retained in phase-gate readback`
    );
  }
  for (const uniqueEvidenceArray of [
    "migration_fingerprint_ids",
    "deployment_evidence_ids",
    "pull_request_disposition_ids",
    "runtime_mode_record_ids",
    "test_evidence_references",
    "ci_artifact_ids",
    "remaining_external_boundaries"
  ]) {
    assert.equal(
      phaseGateSchema.properties[uniqueEvidenceArray].uniqueItems,
      true,
      `${uniqueEvidenceArray} must reject duplicate evidence identities`
    );
  }
  assert.equal(
    document.paths["/api/v1/member/organizations/{organizationId}/entral/assistant/messages"]
      .post.requestBody.content["application/json"].schema.$ref,
    "#/components/schemas/MemberEntralAssistantMessageRequest"
  );
  assert.equal(
    document.paths["/api/v1/member/organizations/{organizationId}/governance-actions"]
      .post.requestBody.content["application/json"].schema.$ref,
    "#/components/schemas/GovernanceActionRequest"
  );
  assert.equal(
    document.paths["/api/v1/member/organizations/{organizationId}/entities/{entityId}/actions/{operation}"]
      .post.responses["200"].content["application/json"].schema.$ref,
    "#/components/schemas/EntityLifecycleActionEnvelope"
  );
  assert.equal(
    document.paths["/api/v1/member/organizations/{organizationId}/graph/preferences"]
      .put.requestBody.content["application/json"].schema.$ref,
    "#/components/schemas/GraphViewPreferencesUpdateRequest"
  );
  assert.equal(
    document.paths["/api/v1/control-plane/releases/phases/{phase}/evidence"]
      .get.responses["200"].content["application/json"].schema.$ref,
    "#/components/schemas/PhaseReleaseEvidenceReadback"
  );
  assert.equal(
    document.paths["/api/v1/member/organizations/{organizationId}/graph/telemetry"]
      .post.requestBody.content["application/json"].schema.$ref,
    "#/components/schemas/GraphRendererTelemetryRequest"
  );
  for (const unimplemented of ["/portfolio", "/businesses", "/entities", "/actions", "/audit", "/events"]) {
    assert.equal(openapi.includes(`  ${unimplemented}`), false, `${unimplemented} must not be exposed`);
  }
});

test("action policy matrix parses and preserves provider execution requirements", async () => {
  const raw = await readFile(new URL("../action-policy-matrix.yaml", import.meta.url), "utf8");
  const policy = parseYaml(raw);
  assert.equal(policy.schema_version, "1.0.0");
  assert.deepEqual(Object.keys(policy.actions).sort(), [
    "BUDGET_CHANGE",
    "CREATE",
    "DUPLICATE",
    "EDIT",
    "ISOLATE",
    "MODEL_CHANGE",
    "PAUSE",
    "POLICY_CHANGE",
    "REASSIGN",
    "RECONFIGURE",
    "REPAIR",
    "RESTORE",
    "RESUME",
    "RETARGET",
    "RETIRE",
    "ROLLBACK",
    "SCHEDULE_CHANGE",
    "TOOL_GRANT_CHANGE"
  ]);
  assert.equal(policy.provider_execution.required_stage, "ACTIVE");
  assert.deepEqual(policy.provider_execution.required_exact_matches, [
    "provider_code",
    "provider_api_version",
    "adapter_version",
    "credential_reference_id",
    "owning_business_id",
    "operation_code"
  ]);
});

test("integration registry JSON schema is versioned and requires activation evidence", async () => {
  const raw = await readFile(new URL("../integration-registry-record.schema.json", import.meta.url), "utf8");
  const schema = JSON.parse(raw);
  assert.equal(schema.$id, "https://entral.dev/contracts/v1/integration-registry-record.schema.json");
  assert.ok(schema.required.includes("provider_api_version"));
  assert.ok(schema.required.includes("evidence_ids"));
  const activeConstraint = schema.allOf.find((entry) => entry.if?.properties?.stage?.const === "ACTIVE");
  assert.ok(activeConstraint);
  assert.equal(activeConstraint.then.properties.provider_api_version.type, "string");
  assert.equal(activeConstraint.then.properties.owning_business_id.type, "string");
  assert.equal(activeConstraint.then.properties.granted_operation_codes.minItems, 1);
  assert.equal(activeConstraint.then.properties.evidence_ids.minItems, 1);
});
