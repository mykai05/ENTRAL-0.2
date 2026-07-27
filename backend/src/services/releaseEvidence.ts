import {
  RELEASE_EVIDENCE_CONTRACT_VERSION,
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  parsePhaseReleaseEvidenceReadback,
  type CanonicalReleaseRecord,
  type DeploymentEvidence,
  type MigrationFingerprint,
  type PhaseGateRecord,
  type PhaseReleaseEvidenceReadback,
  type PullRequestDisposition,
  type ReleaseEvidenceReference,
  type RuntimeModeRecord
} from "@entral/contracts";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  prisma,
  withCanonicalSession,
  type CanonicalSessionContext
} from "../db.js";

type CommonRow = {
  id: string;
  phase: number;
  organizationId: string | null;
  businessId: string | null;
  environment: CanonicalReleaseRecord["environment"];
  actorType: CanonicalReleaseRecord["actor"]["actor_type"];
  actorId: string;
  idempotencyKey: string;
  version: number;
  verificationState: CanonicalReleaseRecord["verification_state"];
  evidenceReferences: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type CanonicalReleaseRow = CommonRow & {
  repository: string;
  gitCommitSha: string;
  releaseTag: string;
  releaseStatus: CanonicalReleaseRecord["release_status"];
  acceptedAt: Date | null;
  rollbackStatus: CanonicalReleaseRecord["rollback_status"];
};

type MigrationRow = CommonRow & {
  releaseId: string;
  migrationName: string;
  checksumSha256: string;
  appliedAt: Date | null;
  verifiedAt: Date | null;
  recoveryStatus: MigrationFingerprint["recovery_status"];
};

type DeploymentRow = CommonRow & {
  releaseId: string;
  deploymentRole: DeploymentEvidence["deployment_role"];
  serviceName: string;
  provider: string;
  deploymentId: string;
  deployedCommitSha: string;
  publicUrl: string | null;
  deploymentStatus: DeploymentEvidence["deployment_status"];
  deployedAt: Date | null;
  checkedAt: Date;
  sourceFreshnessSeconds: string | number;
};

type PullRequestRow = CommonRow & {
  releaseId: string;
  repository: string;
  pullRequestNumber: number;
  headCommitSha: string;
  disposition: PullRequestDisposition["disposition"];
  rationale: string;
  decidedAt: Date;
};

type RuntimeModeRow = CommonRow & {
  releaseId: string;
  serviceName: string;
  processRole: RuntimeModeRecord["process_role"];
  runtimeMode: RuntimeModeRecord["runtime_mode"];
  observedCommitSha: string;
  inMemoryCanonicalStateReachable: boolean;
  deterministicFallbackReachable: boolean;
  sampleDataReachable: boolean;
  observedAt: Date;
};

type PhaseGateRow = CommonRow & {
  releaseId: string;
  gateId: string;
  gateStatus: PhaseGateRecord["gate_status"];
  expectedReleaseVersion: number;
  migrationFingerprintIds: string[];
  deploymentEvidenceIds: string[];
  pullRequestDispositionIds: string[];
  runtimeModeRecordIds: string[];
  testEvidenceReferences: string[];
  ciProvider: string | null;
  ciRepository: string | null;
  ciWorkflow: string | null;
  ciGitCommitSha: string | null;
  ciRunId: string | null;
  ciRunUrl: string | null;
  ciResult: PhaseGateRecord["ci_result"];
  ciArtifactIds: string[];
  authenticatedSmokeReceiptId: string | null;
  authenticatedSmokeTargetUrl: string | null;
  authenticatedSmokeStatus: PhaseGateRecord["authenticated_smoke_status"];
  rollbackRecoveryReference: string | null;
  remainingExternalBoundaries: string[];
  closedAt: Date | null;
};

function evidenceReferences(value: unknown): ReleaseEvidenceReference[] {
  if (!Array.isArray(value)) return [];
  return value as ReleaseEvidenceReference[];
}

function base(row: CommonRow) {
  return {
    contract_version: RELEASE_EVIDENCE_CONTRACT_VERSION,
    schema_version: RELEASE_EVIDENCE_SCHEMA_VERSION,
    record_id: row.id,
    phase: row.phase,
    organization_id: row.organizationId,
    business_id: row.businessId,
    environment: row.environment,
    actor: {
      actor_type: row.actorType,
      actor_id: row.actorId
    },
    idempotency_key: row.idempotencyKey,
    version: row.version,
    verification_state: row.verificationState,
    evidence_references: evidenceReferences(row.evidenceReferences),
    classification: "INTERNAL" as const,
    retention: "RELEASE_LIFETIME" as const,
    exportable: true as const,
    deletion_behavior: "RETAIN" as const,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString()
  };
}

function canonicalRelease(row: CanonicalReleaseRow): CanonicalReleaseRecord {
  return {
    ...base(row),
    record_type: "CANONICAL_RELEASE",
    repository: row.repository,
    git_commit_sha: row.gitCommitSha,
    release_tag: row.releaseTag,
    release_status: row.releaseStatus,
    accepted_at: row.acceptedAt?.toISOString() ?? null,
    rollback_status: row.rollbackStatus
  };
}

function migration(row: MigrationRow): MigrationFingerprint {
  return {
    ...base(row),
    record_type: "MIGRATION_FINGERPRINT",
    release_id: row.releaseId,
    migration_name: row.migrationName,
    checksum_sha256: row.checksumSha256,
    applied_at: row.appliedAt?.toISOString() ?? null,
    verified_at: row.verifiedAt?.toISOString() ?? null,
    recovery_status: row.recoveryStatus
  };
}

function deployment(row: DeploymentRow): DeploymentEvidence {
  return {
    ...base(row),
    record_type: "DEPLOYMENT_EVIDENCE",
    release_id: row.releaseId,
    deployment_role: row.deploymentRole,
    service_name: row.serviceName,
    provider: row.provider,
    deployment_id: row.deploymentId,
    deployed_commit_sha: row.deployedCommitSha,
    public_url: row.publicUrl,
    deployment_status: row.deploymentStatus,
    deployed_at: row.deployedAt?.toISOString() ?? null,
    checked_at: row.checkedAt.toISOString(),
    source_freshness_seconds: Number(row.sourceFreshnessSeconds)
  };
}

function pullRequestDisposition(row: PullRequestRow): PullRequestDisposition {
  return {
    ...base(row),
    record_type: "PULL_REQUEST_DISPOSITION",
    release_id: row.releaseId,
    repository: row.repository,
    pull_request_number: row.pullRequestNumber,
    head_commit_sha: row.headCommitSha,
    disposition: row.disposition,
    rationale: row.rationale,
    decided_at: row.decidedAt.toISOString()
  };
}

function runtimeMode(row: RuntimeModeRow): RuntimeModeRecord {
  return {
    ...base(row),
    record_type: "RUNTIME_MODE",
    release_id: row.releaseId,
    service_name: row.serviceName,
    process_role: row.processRole,
    runtime_mode: row.runtimeMode,
    observed_commit_sha: row.observedCommitSha,
    in_memory_canonical_state_reachable: row.inMemoryCanonicalStateReachable,
    deterministic_fallback_reachable: row.deterministicFallbackReachable,
    sample_data_reachable: row.sampleDataReachable,
    observed_at: row.observedAt.toISOString()
  };
}

function phaseGate(row: PhaseGateRow): PhaseGateRecord {
  return {
    ...base(row),
    record_type: "PHASE_GATE",
    release_id: row.releaseId,
    gate_id: row.gateId,
    gate_status: row.gateStatus,
    expected_release_version: row.expectedReleaseVersion,
    migration_fingerprint_ids: row.migrationFingerprintIds,
    deployment_evidence_ids: row.deploymentEvidenceIds,
    pull_request_disposition_ids: row.pullRequestDispositionIds,
    runtime_mode_record_ids: row.runtimeModeRecordIds,
    test_evidence_references: row.testEvidenceReferences,
    ci_provider: row.ciProvider,
    ci_repository: row.ciRepository,
    ci_workflow: row.ciWorkflow,
    ci_git_commit_sha: row.ciGitCommitSha,
    ci_run_id: row.ciRunId,
    ci_run_url: row.ciRunUrl,
    ci_result: row.ciResult,
    ci_artifact_ids: row.ciArtifactIds,
    authenticated_smoke_receipt_id: row.authenticatedSmokeReceiptId,
    authenticated_smoke_target_url: row.authenticatedSmokeTargetUrl,
    authenticated_smoke_status: row.authenticatedSmokeStatus,
    rollback_recovery_reference: row.rollbackRecoveryReference,
    remaining_external_boundaries: row.remainingExternalBoundaries,
    closed_at: row.closedAt?.toISOString() ?? null
  };
}

function referenceMismatch(
  expected: readonly string[],
  actual: readonly { record_id: string }[],
  label: string
) {
  const actualRecordIds = actual.map((record) => record.record_id);
  const actualIds = new Set(actual.map((record) => record.record_id));
  const expectedIds = new Set(expected);
  if (
    actualIds.size !== actualRecordIds.length
    || expected.length !== actualRecordIds.length
    || expected.some((recordId) => !actualIds.has(recordId))
    || actualRecordIds.some((recordId) => !expectedIds.has(recordId))
  ) {
    return [
      `${label} IDs must exactly match unique canonical records bound to the phase gate.`
    ];
  }
  return [];
}

function releaseBlockers(input: {
  release: CanonicalReleaseRecord | null;
  gate: PhaseGateRecord | null;
  migrations: readonly MigrationFingerprint[];
  deployments: readonly DeploymentEvidence[];
  dispositions: readonly PullRequestDisposition[];
  runtimeModes: readonly RuntimeModeRecord[];
}) {
  const blockers: string[] = [];
  const release = input.release;
  const gate = input.gate;
  if (!release) {
    blockers.push("No production canonical release record exists for this phase.");
  } else if (
    release.verification_state !== "VERIFIED"
    || !["ACCEPTED", "DEPLOYED"].includes(release.release_status)
  ) {
    blockers.push("The canonical release is not verified and accepted or deployed.");
  }
  if (!gate) {
    blockers.push("No production phase-gate record exists for this phase.");
  } else {
    if (gate.verification_state !== "VERIFIED" || gate.gate_status !== "PASSED") {
      blockers.push("The production phase gate is not verified and passed.");
    }
    if (gate.remaining_external_boundaries.length > 0) {
      blockers.push(...gate.remaining_external_boundaries.map(
        (boundary) => `External boundary remains: ${boundary}`
      ));
    }
    if (gate.test_evidence_references.length === 0) {
      blockers.push("The production phase gate has no retained test evidence.");
    }
    if (
      !gate.ci_provider
      || !gate.ci_repository
      || !gate.ci_workflow
      || !gate.ci_git_commit_sha
      || !gate.ci_run_id
      || !gate.ci_run_url
      || gate.ci_result !== "SUCCESS"
      || gate.ci_artifact_ids.length === 0
    ) {
      blockers.push("The production phase gate lacks a successful retained CI repository, workflow, commit, run, and artifact identity.");
    }
    if (
      !gate.authenticated_smoke_receipt_id
      || !gate.authenticated_smoke_target_url
      || gate.authenticated_smoke_status !== "PASSED"
    ) {
      blockers.push("The production phase gate lacks a passed authenticated smoke receipt.");
    }
    if (!gate.rollback_recovery_reference) {
      blockers.push("The production phase gate lacks a rollback or forward-recovery reference.");
    }
    for (const [recordIds, label] of [
      [gate.migration_fingerprint_ids, "migration fingerprint"],
      [gate.deployment_evidence_ids, "deployment evidence"],
      [gate.pull_request_disposition_ids, "pull-request disposition"],
      [gate.runtime_mode_record_ids, "runtime-mode evidence"]
    ] as const) {
      if (recordIds.length === 0) {
        blockers.push(`The production phase gate is not bound to any ${label} records.`);
      }
    }
    blockers.push(
      ...referenceMismatch(gate.migration_fingerprint_ids, input.migrations, "Migration fingerprint"),
      ...referenceMismatch(gate.deployment_evidence_ids, input.deployments, "Deployment evidence"),
      ...referenceMismatch(gate.pull_request_disposition_ids, input.dispositions, "Pull-request disposition"),
      ...referenceMismatch(gate.runtime_mode_record_ids, input.runtimeModes, "Runtime-mode evidence")
    );
    const gateDeploymentIds = new Set(gate.deployment_evidence_ids);
    const gateDeploymentRoles = input.deployments
      .filter((deployment) => gateDeploymentIds.has(deployment.record_id))
      .map((deployment) => deployment.deployment_role)
      .sort();
    if (
      gateDeploymentRoles.length !== 3
      || gateDeploymentRoles.join(",") !== "API,FRONTEND,WORKER"
    ) {
      blockers.push("The phase gate must bind exactly one frontend, API, and worker deployment.");
    }
    const gateRuntimeIds = new Set(gate.runtime_mode_record_ids);
    const gateRuntimeRoles = input.runtimeModes
      .filter((runtime) => gateRuntimeIds.has(runtime.record_id))
      .map((runtime) => runtime.process_role)
      .sort();
    if (
      gateRuntimeRoles.length !== 2
      || gateRuntimeRoles.join(",") !== "API,WORKER"
    ) {
      blockers.push("The phase gate must bind exactly one API and worker runtime.");
    }
  }
  if (release && gate && (
    gate.release_id !== release.record_id
    || gate.expected_release_version !== release.version
    || gate.ci_repository !== release.repository
    || gate.ci_git_commit_sha !== release.git_commit_sha
  )) {
    blockers.push("The phase gate CI identity is not bound to the current canonical release repository, commit, and version.");
  }
  if (input.deployments.length === 0) {
    blockers.push("No production deployment evidence has been recorded.");
  }
  const deploymentRoles = new Set(
    input.deployments
      .filter((deployment) => (
        deployment.verification_state === "VERIFIED"
        && deployment.deployment_status === "READY"
      ))
      .map((deployment) => deployment.deployment_role)
  );
  for (const role of ["FRONTEND", "API", "WORKER"] as const) {
    if (!deploymentRoles.has(role)) {
      blockers.push(`No verified production ${role.toLowerCase()} deployment evidence has been recorded.`);
    }
  }
  if (input.migrations.length === 0) {
    blockers.push("No verified production migration fingerprint has been recorded.");
  }
  if (input.dispositions.length === 0) {
    blockers.push("No reconciled pull-request disposition has been recorded.");
  }
  if (input.runtimeModes.length === 0) {
    blockers.push("No production runtime-mode evidence has been recorded.");
  }
  const verifiedRuntimeRoles = new Set(
    input.runtimeModes
      .filter((runtime) => runtime.verification_state === "VERIFIED")
      .map((runtime) => runtime.process_role)
  );
  if (!verifiedRuntimeRoles.has("API")) {
    blockers.push("No verified production API runtime-mode evidence has been recorded.");
  }
  if (!verifiedRuntimeRoles.has("WORKER")) {
    blockers.push("No verified production worker runtime-mode evidence has been recorded.");
  }
  if (release) {
    for (const deployment of input.deployments) {
      if (
        deployment.verification_state !== "VERIFIED"
        || deployment.deployment_status !== "READY"
        || deployment.deployed_commit_sha !== release.git_commit_sha
      ) {
        blockers.push(`Deployment ${deployment.service_name} does not verify the canonical release commit.`);
      }
    }
    for (const runtime of input.runtimeModes) {
      if (
        runtime.verification_state !== "VERIFIED"
        || runtime.runtime_mode !== "PRODUCTION"
        || runtime.process_role === "COMBINED"
        || runtime.observed_commit_sha !== release.git_commit_sha
        || runtime.in_memory_canonical_state_reachable
        || runtime.deterministic_fallback_reachable
        || runtime.sample_data_reachable
      ) {
        blockers.push(`Runtime ${runtime.service_name} does not prove a fail-closed production mode at the canonical release commit.`);
      }
    }
  }
  for (const fingerprint of input.migrations) {
    if (
      fingerprint.verification_state !== "VERIFIED"
      || fingerprint.recovery_status === "UNVERIFIED"
    ) {
      blockers.push(`Migration ${fingerprint.migration_name} lacks verified apply and recovery evidence.`);
    }
  }
  for (const disposition of input.dispositions) {
    if (
      disposition.verification_state !== "VERIFIED"
      || disposition.disposition === "OPEN_BLOCKER"
    ) {
      blockers.push(
        `Pull request ${disposition.repository}#${disposition.pull_request_number} is not verified and reconciled.`
      );
    }
  }
  return [...new Set(blockers)];
}

export async function readPhaseReleaseEvidence(
  transaction: Prisma.TransactionClient,
  phase: number
): Promise<PhaseReleaseEvidenceReadback> {
  const releaseRows = await transaction.$queryRaw<CanonicalReleaseRow[]>`
    SELECT
      id,
      phase,
      organization_id AS "organizationId",
      business_id AS "businessId",
      environment,
      actor_type AS "actorType",
      actor_id AS "actorId",
      idempotency_key AS "idempotencyKey",
      version::integer AS version,
      verification_state AS "verificationState",
      evidence_references AS "evidenceReferences",
      repository,
      git_commit_sha AS "gitCommitSha",
      release_tag AS "releaseTag",
      release_status AS "releaseStatus",
      accepted_at AS "acceptedAt",
      rollback_status AS "rollbackStatus",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM entral.canonical_releases
    WHERE phase = ${phase}
      AND environment = 'production'
    LIMIT 1
  `;
  const releaseRecord = releaseRows[0] ? canonicalRelease(releaseRows[0]) : null;
  const releaseId = releaseRecord?.record_id;
  const gateRows = await transaction.$queryRaw<PhaseGateRow[]>`
    SELECT
      id,
      release_id AS "releaseId",
      phase,
      organization_id AS "organizationId",
      business_id AS "businessId",
      environment,
      actor_type AS "actorType",
      actor_id AS "actorId",
      idempotency_key AS "idempotencyKey",
      version::integer AS version,
      verification_state AS "verificationState",
      evidence_references AS "evidenceReferences",
      gate_id AS "gateId",
      gate_status AS "gateStatus",
      expected_release_version::integer AS "expectedReleaseVersion",
      migration_fingerprint_ids AS "migrationFingerprintIds",
      deployment_evidence_ids AS "deploymentEvidenceIds",
      pull_request_disposition_ids AS "pullRequestDispositionIds",
      runtime_mode_record_ids AS "runtimeModeRecordIds",
      test_evidence_references AS "testEvidenceReferences",
      ci_provider AS "ciProvider",
      ci_repository AS "ciRepository",
      ci_workflow AS "ciWorkflow",
      ci_git_commit_sha AS "ciGitCommitSha",
      ci_run_id AS "ciRunId",
      ci_run_url AS "ciRunUrl",
      ci_result AS "ciResult",
      ci_artifact_ids AS "ciArtifactIds",
      authenticated_smoke_receipt_id AS "authenticatedSmokeReceiptId",
      authenticated_smoke_target_url AS "authenticatedSmokeTargetUrl",
      authenticated_smoke_status AS "authenticatedSmokeStatus",
      rollback_recovery_reference AS "rollbackRecoveryReference",
      remaining_external_boundaries AS "remainingExternalBoundaries",
      closed_at AS "closedAt",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM entral.phase_gate_records
    WHERE phase = ${phase}
      AND environment = 'production'
    LIMIT 1
  `;
  const gateRecord = gateRows[0] ? phaseGate(gateRows[0]) : null;
  if (!releaseId) {
    const empty = {
      contract_version: RELEASE_EVIDENCE_CONTRACT_VERSION,
      schema_version: RELEASE_EVIDENCE_SCHEMA_VERSION,
      phase,
      complete: false,
      canonical_release: null,
      phase_gate: gateRecord,
      migration_fingerprints: [],
      deployments: [],
      pull_request_dispositions: [],
      runtime_modes: [],
      blockers: releaseBlockers({
        release: null,
        gate: gateRecord,
        migrations: [],
        deployments: [],
        dispositions: [],
        runtimeModes: []
      }),
      generated_at: new Date().toISOString()
    };
    return parsePhaseReleaseEvidenceReadback(empty);
  }

  const [migrationRows, deploymentRows, pullRequestRows, runtimeRows] = await Promise.all([
    transaction.$queryRaw<MigrationRow[]>`
      SELECT
        id, release_id AS "releaseId", phase,
        organization_id AS "organizationId", business_id AS "businessId",
        environment, actor_type AS "actorType", actor_id AS "actorId",
        idempotency_key AS "idempotencyKey", version::integer AS version,
        verification_state AS "verificationState",
        evidence_references AS "evidenceReferences",
        migration_name AS "migrationName", checksum_sha256 AS "checksumSha256",
        applied_at AS "appliedAt", verified_at AS "verifiedAt",
        recovery_status AS "recoveryStatus",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM entral.migration_fingerprints
      WHERE release_id = ${releaseId}::uuid
      ORDER BY migration_name
    `,
    transaction.$queryRaw<DeploymentRow[]>`
      SELECT
        id, release_id AS "releaseId", phase,
        organization_id AS "organizationId", business_id AS "businessId",
        environment, actor_type AS "actorType", actor_id AS "actorId",
        idempotency_key AS "idempotencyKey", version::integer AS version,
        verification_state AS "verificationState",
        evidence_references AS "evidenceReferences",
        deployment_role AS "deploymentRole", service_name AS "serviceName",
        provider, deployment_id AS "deploymentId",
        deployed_commit_sha AS "deployedCommitSha", public_url AS "publicUrl",
        deployment_status AS "deploymentStatus", deployed_at AS "deployedAt",
        checked_at AS "checkedAt",
        source_freshness_seconds::text AS "sourceFreshnessSeconds",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM entral.deployment_evidence
      WHERE release_id = ${releaseId}::uuid
      ORDER BY service_name, provider
    `,
    transaction.$queryRaw<PullRequestRow[]>`
      SELECT
        id, release_id AS "releaseId", phase,
        organization_id AS "organizationId", business_id AS "businessId",
        environment, actor_type AS "actorType", actor_id AS "actorId",
        idempotency_key AS "idempotencyKey", version::integer AS version,
        verification_state AS "verificationState",
        evidence_references AS "evidenceReferences",
        repository, pull_request_number AS "pullRequestNumber",
        head_commit_sha AS "headCommitSha", disposition, rationale,
        decided_at AS "decidedAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM entral.pull_request_dispositions
      WHERE release_id = ${releaseId}::uuid
      ORDER BY repository, pull_request_number
    `,
    transaction.$queryRaw<RuntimeModeRow[]>`
      SELECT
        id, release_id AS "releaseId", phase,
        organization_id AS "organizationId", business_id AS "businessId",
        environment, actor_type AS "actorType", actor_id AS "actorId",
        idempotency_key AS "idempotencyKey", version::integer AS version,
        verification_state AS "verificationState",
        evidence_references AS "evidenceReferences",
        service_name AS "serviceName", process_role AS "processRole",
        runtime_mode AS "runtimeMode", observed_commit_sha AS "observedCommitSha",
        in_memory_canonical_state_reachable AS "inMemoryCanonicalStateReachable",
        deterministic_fallback_reachable AS "deterministicFallbackReachable",
        sample_data_reachable AS "sampleDataReachable", observed_at AS "observedAt",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM entral.runtime_mode_records
      WHERE release_id = ${releaseId}::uuid
      ORDER BY service_name, process_role
    `
  ]);
  const migrations = migrationRows.map(migration);
  const deployments = deploymentRows.map(deployment);
  const dispositions = pullRequestRows.map(pullRequestDisposition);
  const runtimeModes = runtimeRows.map(runtimeMode);
  const blockers = releaseBlockers({
    release: releaseRecord,
    gate: gateRecord,
    migrations,
    deployments,
    dispositions,
    runtimeModes
  });
  return parsePhaseReleaseEvidenceReadback({
    contract_version: RELEASE_EVIDENCE_CONTRACT_VERSION,
    schema_version: RELEASE_EVIDENCE_SCHEMA_VERSION,
    phase,
    complete: blockers.length === 0,
    canonical_release: releaseRecord,
    phase_gate: gateRecord,
    migration_fingerprints: migrations,
    deployments,
    pull_request_dispositions: dispositions,
    runtime_modes: runtimeModes,
    blockers,
    generated_at: new Date().toISOString()
  });
}

export class ReleaseEvidenceService {
  constructor(private readonly database: PrismaClient = prisma) {}

  readPhase(
    phase: number,
    databaseSession: CanonicalSessionContext
  ): Promise<PhaseReleaseEvidenceReadback> {
    return withCanonicalSession(
      this.database,
      databaseSession,
      (transaction) => readPhaseReleaseEvidence(transaction, phase)
    );
  }
}

export const releaseEvidenceService = new ReleaseEvidenceService();
