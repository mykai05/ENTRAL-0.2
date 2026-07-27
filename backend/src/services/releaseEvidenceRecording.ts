import { createHash, randomUUID } from "node:crypto";
import {
  PHASE_195_RELEASE_MIGRATION_NAME,
  PHASE_195_RELEASE_CI_WORKFLOW,
  PHASE_195_RELEASE_PHASE,
  RELEASE_EVIDENCE_CONTRACT_VERSION,
  RELEASE_EVIDENCE_SCHEMA_VERSION,
  type PhaseReleaseEvidenceReadback,
  type ReleaseEvidenceReference
} from "@entral/contracts";
import { Prisma, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { readPhaseReleaseEvidence } from "./releaseEvidence.js";

const gitShaSchema = z.string().regex(/^[a-f0-9]{40}$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const timestampSchema = z.string().datetime({ offset: true });
const boundedIdentifier = z.string().trim().min(1).max(200);
const httpsUrlSchema = z.string().url().max(2_000).refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Production evidence URLs must use HTTPS");

const deploymentSchema = z.object({
  deployment_role: z.enum(["FRONTEND", "API", "WORKER"]),
  service_name: boundedIdentifier,
  provider: z.enum(["VERCEL", "RAILWAY"]),
  deployment_id: z.string().min(1).max(300),
  deployed_commit_sha: gitShaSchema,
  public_url: httpsUrlSchema,
  deployed_at: timestampSchema,
  checked_at: timestampSchema,
  source_freshness_seconds: z.number().finite().min(0).max(86_400),
  readback_content_sha256: sha256Schema
}).strict();

const pullRequestSchema = z.object({
  repository: z.string().min(1).max(300),
  pull_request_number: z.number().int().min(1),
  head_commit_sha: gitShaSchema,
  disposition: z.enum(["MERGED", "SUPERSEDED", "REJECTED"]),
  rationale: z.string().min(1).max(2_000),
  decided_at: timestampSchema,
  receipt_content_sha256: sha256Schema
}).strict();

const runtimeModeSchema = z.object({
  service_name: boundedIdentifier,
  process_role: z.enum(["API", "WORKER"]),
  observed_commit_sha: gitShaSchema,
  observed_at: timestampSchema,
  in_memory_canonical_state_reachable: z.literal(false),
  deterministic_fallback_reachable: z.literal(false),
  sample_data_reachable: z.literal(false),
  evidence_content_sha256: sha256Schema
}).strict();

export const phaseReleaseEvidenceRecordingManifestSchema = z.object({
  contract_version: z.literal(RELEASE_EVIDENCE_CONTRACT_VERSION),
  schema_version: z.literal(RELEASE_EVIDENCE_SCHEMA_VERSION),
  phase: z.number().int().min(1).max(10_000),
  idempotency_key: z.string().min(12).max(200)
    .regex(/^[A-Za-z0-9._:@/-]+$/),
  organization_id: z.string().min(1).max(200).nullable(),
  business_id: z.string().uuid().nullable(),
  repository: z.string().min(1).max(300),
  accepted_git_commit_sha: gitShaSchema,
  release_tag: boundedIdentifier,
  accepted_at: timestampSchema,
  migration: z.object({
    migration_name: z.string().min(1).max(300),
    checksum_sha256: sha256Schema,
    readback_content_sha256: sha256Schema,
    checked_at: timestampSchema
  }).strict(),
  deployments: z.array(deploymentSchema).length(3),
  ci: z.object({
    provider: z.literal("GITHUB_ACTIONS"),
    repository: z.string().min(1).max(300),
    workflow: z.string().min(1).max(300),
    git_commit_sha: gitShaSchema,
    run_id: boundedIdentifier,
    run_url: httpsUrlSchema,
    result: z.literal("SUCCESS"),
    checked_at: timestampSchema,
    run_content_sha256: sha256Schema,
    artifacts: z.array(z.object({
      artifact_id: z.string().min(1).max(1_000),
      content_sha256: sha256Schema
    }).strict()).min(1).max(100)
  }).strict(),
  authenticated_smoke: z.object({
    receipt_id: boundedIdentifier,
    target_url: httpsUrlSchema,
    status: z.literal("PASSED"),
    checked_at: timestampSchema,
    content_sha256: sha256Schema
  }).strict(),
  rollback: z.object({
    status: z.enum(["AVAILABLE", "EXECUTED"]),
    strategy: z.literal("RESTORE"),
    recovery_reference: boundedIdentifier,
    verified_at: timestampSchema,
    content_sha256: sha256Schema
  }).strict(),
  pull_requests: z.array(pullRequestSchema).min(1).max(1_000),
  runtime_modes: z.array(runtimeModeSchema).length(2),
  gate_id: boundedIdentifier,
  closed_at: timestampSchema,
  remaining_external_boundaries: z.array(z.string()).length(0)
}).strict().superRefine((manifest, context) => {
  if (
    manifest.phase === PHASE_195_RELEASE_PHASE
    && manifest.migration.migration_name !== PHASE_195_RELEASE_MIGRATION_NAME
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Phase 195 must bind its exact canonical migration",
      path: ["migration", "migration_name"]
    });
  }
  if (
    manifest.phase === PHASE_195_RELEASE_PHASE
    && manifest.ci.workflow !== PHASE_195_RELEASE_CI_WORKFLOW
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Phase 195 CI must identify its canonical workflow path",
      path: ["ci", "workflow"]
    });
  }

  if (manifest.ci.repository !== manifest.repository) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CI repository identity must match the accepted release repository",
      path: ["ci", "repository"]
    });
  }
  if (manifest.ci.git_commit_sha !== manifest.accepted_git_commit_sha) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CI must identify the exact accepted Git commit",
      path: ["ci", "git_commit_sha"]
    });
  }
  const expectedRunUrl =
    `https://github.com/${manifest.ci.repository}/actions/runs/${manifest.ci.run_id}`;
  if (manifest.ci.run_url !== expectedRunUrl) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CI run URL must exactly bind its GitHub repository and run ID",
      path: ["ci", "run_url"]
    });
  }

  const deploymentRoles = new Set(manifest.deployments.map(
    (deployment) => deployment.deployment_role
  ));
  for (const role of ["FRONTEND", "API", "WORKER"] as const) {
    if (!deploymentRoles.has(role)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Exactly one ${role} deployment is required`,
        path: ["deployments"]
      });
    }
  }
  for (const [index, deployment] of manifest.deployments.entries()) {
    const expectedProvider =
      deployment.deployment_role === "FRONTEND" ? "VERCEL" : "RAILWAY";
    if (deployment.provider !== expectedProvider) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${deployment.deployment_role} requires ${expectedProvider} evidence`,
        path: ["deployments", index, "provider"]
      });
    }
    if (deployment.deployed_commit_sha !== manifest.accepted_git_commit_sha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Every deployment must identify the accepted Git commit",
        path: ["deployments", index, "deployed_commit_sha"]
      });
    }
    if (Date.parse(deployment.deployed_at) > Date.parse(deployment.checked_at)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Deployment readback cannot precede deployment",
        path: ["deployments", index, "checked_at"]
      });
    }
  }

  const runtimeRoles = new Set(manifest.runtime_modes.map(
    (runtime) => runtime.process_role
  ));
  for (const role of ["API", "WORKER"] as const) {
    if (!runtimeRoles.has(role)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Exactly one ${role} runtime receipt is required`,
        path: ["runtime_modes"]
      });
    }
  }
  for (const [index, runtime] of manifest.runtime_modes.entries()) {
    if (runtime.observed_commit_sha !== manifest.accepted_git_commit_sha) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Every runtime must identify the accepted Git commit",
        path: ["runtime_modes", index, "observed_commit_sha"]
      });
    }
    const deployment = manifest.deployments.find(
      (candidate) => candidate.deployment_role === runtime.process_role
    );
    if (deployment && runtime.service_name !== deployment.service_name) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${runtime.process_role} runtime service must match its deployment service`,
        path: ["runtime_modes", index, "service_name"]
      });
    }
  }
  for (const [index, disposition] of manifest.pull_requests.entries()) {
    if (
      disposition.disposition !== "MERGED"
      && disposition.head_commit_sha === manifest.accepted_git_commit_sha
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Superseded and rejected pull requests cannot reuse the accepted Git commit",
        path: ["pull_requests", index, "head_commit_sha"]
      });
    }
  }
  const acceptedPullRequests = manifest.pull_requests.filter(
    (disposition) =>
      disposition.disposition === "MERGED"
      && disposition.head_commit_sha === manifest.accepted_git_commit_sha
  );
  if (acceptedPullRequests.length !== 1) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "Exactly one merged acceptance pull request must bind the accepted Git commit; superseded and rejected records retain their actual heads",
      path: ["pull_requests"]
    });
  } else if (acceptedPullRequests[0]!.repository !== manifest.repository) {
    const acceptedIndex = manifest.pull_requests.indexOf(acceptedPullRequests[0]!);
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "The merged acceptance pull request must belong to the release repository",
      path: ["pull_requests", acceptedIndex, "repository"]
    });
  }

  const frontendDeployment = manifest.deployments.find(
    (deployment) => deployment.deployment_role === "FRONTEND"
  );
  if (
    frontendDeployment
    && new URL(manifest.authenticated_smoke.target_url).origin
      !== new URL(frontendDeployment.public_url).origin
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Authenticated smoke target must use the frontend deployment origin",
      path: ["authenticated_smoke", "target_url"]
    });
  }

  const artifactIds = manifest.ci.artifacts.map((artifact) => artifact.artifact_id);
  if (new Set(artifactIds).size !== artifactIds.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "CI artifact IDs must be unique",
      path: ["ci", "artifacts"]
    });
  }
  const pullRequestKeys = manifest.pull_requests.map(
    (pullRequest) => `${pullRequest.repository}#${pullRequest.pull_request_number}`
  );
  if (new Set(pullRequestKeys).size !== pullRequestKeys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Pull-request dispositions must be unique",
      path: ["pull_requests"]
    });
  }

  const closedAt = Date.parse(manifest.closed_at);
  for (const [path, timestamp] of [
    [["accepted_at"], manifest.accepted_at],
    [["migration", "checked_at"], manifest.migration.checked_at],
    [["ci", "checked_at"], manifest.ci.checked_at],
    [["authenticated_smoke", "checked_at"], manifest.authenticated_smoke.checked_at],
    [["rollback", "verified_at"], manifest.rollback.verified_at],
    ...manifest.deployments.flatMap((deployment, index) => [
      [["deployments", index, "deployed_at"], deployment.deployed_at] as const,
      [["deployments", index, "checked_at"], deployment.checked_at] as const
    ]),
    ...manifest.pull_requests.map((pullRequest, index) =>
      [["pull_requests", index, "decided_at"], pullRequest.decided_at] as const
    ),
    ...manifest.runtime_modes.map((runtime, index) =>
      [["runtime_modes", index, "observed_at"], runtime.observed_at] as const
    )
  ] as const) {
    if (Date.parse(timestamp) > closedAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Release evidence cannot be captured after gate closure",
        path: [...path]
      });
    }
  }
});

export type PhaseReleaseEvidenceRecordingManifest = z.infer<
  typeof phaseReleaseEvidenceRecordingManifestSchema
>;

export type PhaseReleaseEvidenceRecordingResult = {
  readonly idempotent_replay: boolean;
  readonly release_id: string;
  readonly phase_gate_id: string;
  readonly evidence: PhaseReleaseEvidenceReadback;
};

export class ReleaseEvidenceRecordingError extends Error {
  constructor(
    readonly code:
      | "INVALID_DATABASE_AUTHORITY"
      | "MIGRATION_NOT_APPLIED"
      | "MIGRATION_CHECKSUM_MISMATCH"
      | "IMMUTABLE_EVIDENCE_CONFLICT"
      | "INCOMPLETE_RELEASE_EVIDENCE",
    message: string
  ) {
    super(message);
    this.name = "ReleaseEvidenceRecordingError";
  }
}

function sortBy<T>(values: readonly T[], key: (value: T) => string): T[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)));
}

export function parsePhaseReleaseEvidenceRecordingManifest(
  value: unknown
): PhaseReleaseEvidenceRecordingManifest {
  const parsed = phaseReleaseEvidenceRecordingManifestSchema.parse(value);
  return {
    ...parsed,
    deployments: sortBy(
      parsed.deployments,
      (deployment) => deployment.deployment_role
    ),
    ci: {
      ...parsed.ci,
      artifacts: sortBy(parsed.ci.artifacts, (artifact) => artifact.artifact_id)
    },
    pull_requests: sortBy(
      parsed.pull_requests,
      (pullRequest) =>
        `${pullRequest.repository}#${String(pullRequest.pull_request_number).padStart(10, "0")}`
    ),
    runtime_modes: sortBy(
      parsed.runtime_modes,
      (runtime) => `${runtime.process_role}:${runtime.service_name}`
    )
  };
}

export function releaseEvidenceChildIdempotencyKey(
  rootKey: string,
  recordScope: string
) {
  const digest = createHash("sha256")
    .update(`${rootKey}\0${recordScope}`)
    .digest("hex");
  return `phase-release:${digest.slice(0, 48)}`;
}

function evidenceReference(
  referenceId: string,
  referenceType: ReleaseEvidenceReference["reference_type"],
  contentSha256: string,
  capturedAt: string
): ReleaseEvidenceReference {
  return {
    reference_id: referenceId,
    reference_type: referenceType,
    content_sha256: contentSha256,
    captured_at: capturedAt
  };
}

function jsonInput(value: unknown) {
  return Prisma.sql`${JSON.stringify(value)}::jsonb`;
}

type IdentityRow = {
  roleName: string;
  migrationAuthority: boolean;
  restrictedRuntimeMembership: boolean;
};

type AppliedMigrationRow = {
  checksum: string;
  finishedAt: Date | null;
  rolledBackAt: Date | null;
  appliedStepsCount: number;
};

type IdVersionRow = {
  id: string;
  version: number;
};

function requireExactRow(
  rows: readonly IdVersionRow[],
  recordLabel: string
): IdVersionRow {
  const row = rows[0];
  if (!row) {
    throw new ReleaseEvidenceRecordingError(
      "IMMUTABLE_EVIDENCE_CONFLICT",
      `Existing ${recordLabel} evidence differs from the accepted manifest.`
    );
  }
  return row;
}

export class ReleaseEvidenceRecordingService {
  constructor(private readonly database: PrismaClient) {}

  async record(
    rawManifest: unknown
  ): Promise<PhaseReleaseEvidenceRecordingResult> {
    const manifest = parsePhaseReleaseEvidenceRecordingManifest(rawManifest);
    return this.database.$transaction(async (transaction) => {
      const identityRows = await transaction.$queryRaw<IdentityRow[]>`
        SELECT
          current_user::text AS "roleName",
          (
            roles.rolsuper
            OR roles.rolbypassrls
            OR pg_get_userbyid(releases.relowner) = current_user
          ) AS "migrationAuthority",
          (
            NOT roles.rolsuper
            AND (
              CASE WHEN to_regrole('entral_api') IS NULL
                THEN false
                ELSE pg_has_role(current_user, 'entral_api', 'member')
              END
              OR CASE WHEN to_regrole('entral_worker') IS NULL
                THEN false
                ELSE pg_has_role(current_user, 'entral_worker', 'member')
              END
              OR CASE WHEN to_regrole('entral_verifier') IS NULL
                THEN false
                ELSE pg_has_role(current_user, 'entral_verifier', 'member')
              END
            )
          ) AS "restrictedRuntimeMembership"
        FROM pg_roles AS roles
        JOIN pg_class AS releases
          ON releases.relname = 'canonical_releases'
        JOIN pg_namespace AS release_schema
          ON release_schema.oid = releases.relnamespace
         AND release_schema.nspname = 'entral'
        WHERE roles.rolname = current_user
        LIMIT 1
      `;
      const identity = identityRows[0];
      if (
        !identity
        || !identity.migrationAuthority
        || identity.restrictedRuntimeMembership
      ) {
        throw new ReleaseEvidenceRecordingError(
          "INVALID_DATABASE_AUTHORITY",
          "Release evidence recording requires a migration-only or database-owner identity, never an API, worker, or verifier runtime role."
        );
      }

      await transaction.$queryRaw`
        SELECT
          set_config(
            'app.action_reason',
            ${`Record immutable production release evidence for Phase ${manifest.phase}.`},
            true
          ),
          set_config('app.correlation_id', ${randomUUID()}, true)
      `;
      await transaction.$queryRaw`
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`release-evidence:production:${manifest.phase}`}, 0)
        )::text AS "lockAcquired"
      `;

      const appliedMigrations = await transaction.$queryRaw<AppliedMigrationRow[]>`
        SELECT
          checksum,
          finished_at AS "finishedAt",
          rolled_back_at AS "rolledBackAt",
          applied_steps_count::integer AS "appliedStepsCount"
        FROM public."_prisma_migrations"
        WHERE migration_name = ${manifest.migration.migration_name}
        ORDER BY finished_at DESC NULLS LAST
        LIMIT 1
      `;
      const appliedMigration = appliedMigrations[0];
      if (
        !appliedMigration
        || !appliedMigration.finishedAt
        || appliedMigration.rolledBackAt
        || appliedMigration.appliedStepsCount < 1
      ) {
        throw new ReleaseEvidenceRecordingError(
          "MIGRATION_NOT_APPLIED",
          "The accepted migration is not durably applied without rollback."
        );
      }
      if (appliedMigration.checksum !== manifest.migration.checksum_sha256) {
        throw new ReleaseEvidenceRecordingError(
          "MIGRATION_CHECKSUM_MISMATCH",
          "The production migration checksum does not match the accepted manifest."
        );
      }
      if (
        appliedMigration.finishedAt.getTime()
        > Date.parse(manifest.closed_at)
      ) {
        throw new ReleaseEvidenceRecordingError(
          "MIGRATION_NOT_APPLIED",
          "The production migration was applied after the claimed phase-gate closure."
        );
      }
      if (
        appliedMigration.finishedAt.getTime()
        > Date.parse(manifest.migration.checked_at)
      ) {
        throw new ReleaseEvidenceRecordingError(
          "INCOMPLETE_RELEASE_EVIDENCE",
          "The production migration readback cannot precede the applied migration."
        );
      }

      const ciRunReference = evidenceReference(
        `ci:${manifest.ci.provider}:${manifest.ci.run_id}`,
        "TEST_RESULT",
        manifest.ci.run_content_sha256,
        manifest.ci.checked_at
      );
      const artifactReferences = manifest.ci.artifacts.map((artifact) =>
        evidenceReference(
          `ci-artifact:${artifact.artifact_id}`,
          "ARTIFACT",
          artifact.content_sha256,
          manifest.ci.checked_at
        )
      );
      const smokeReference = evidenceReference(
        `authenticated-smoke:${manifest.authenticated_smoke.receipt_id}`,
        "EXTERNAL_RECEIPT",
        manifest.authenticated_smoke.content_sha256,
        manifest.authenticated_smoke.checked_at
      );
      const rollbackReference = evidenceReference(
        `recovery:${manifest.rollback.recovery_reference}`,
        "DATABASE_READBACK",
        manifest.rollback.content_sha256,
        manifest.rollback.verified_at
      );
      const releaseReferences = [
        ciRunReference,
        ...artifactReferences,
        smokeReference,
        rollbackReference
      ];
      let insertedCount = 0;

      const releaseInsert = await transaction.$queryRaw<IdVersionRow[]>`
        INSERT INTO entral.canonical_releases (
          phase, organization_id, business_id, environment,
          actor_type, actor_id, idempotency_key, verification_state,
          evidence_references, repository, git_commit_sha, release_tag,
          release_status, accepted_at, rollback_status
        ) VALUES (
          ${manifest.phase},
          ${manifest.organization_id},
          ${manifest.business_id}::uuid,
          'production',
          'SERVICE',
          ${identity.roleName},
          ${manifest.idempotency_key},
          'VERIFIED',
          ${jsonInput(releaseReferences)},
          ${manifest.repository},
          ${manifest.accepted_git_commit_sha},
          ${manifest.release_tag},
          'DEPLOYED',
          ${manifest.accepted_at}::timestamptz,
          ${manifest.rollback.status}
        )
        ON CONFLICT (phase, environment) DO NOTHING
        RETURNING id, version::integer AS version
      `;
      if (releaseInsert.length > 0) insertedCount += 1;
      const release = releaseInsert[0] ?? requireExactRow(
        await transaction.$queryRaw<IdVersionRow[]>`
          SELECT id, version::integer AS version
          FROM entral.canonical_releases
          WHERE phase = ${manifest.phase}
            AND environment = 'production'
            AND organization_id IS NOT DISTINCT FROM ${manifest.organization_id}
            AND business_id IS NOT DISTINCT FROM ${manifest.business_id}::uuid
            AND actor_type = 'SERVICE'
            AND actor_id = ${identity.roleName}
            AND idempotency_key = ${manifest.idempotency_key}
            AND verification_state = 'VERIFIED'
            AND evidence_references = ${jsonInput(releaseReferences)}
            AND repository = ${manifest.repository}
            AND git_commit_sha = ${manifest.accepted_git_commit_sha}
            AND release_tag = ${manifest.release_tag}
            AND release_status = 'DEPLOYED'
            AND accepted_at = ${manifest.accepted_at}::timestamptz
            AND rollback_status = ${manifest.rollback.status}
          LIMIT 1
        `,
        "canonical release"
      );

      const migrationReferences = [
        evidenceReference(
           `migration:${manifest.migration.migration_name}`,
           "DATABASE_READBACK",
           manifest.migration.readback_content_sha256,
           manifest.migration.checked_at
        ),
        rollbackReference
      ];
      const migrationIdempotencyKey = releaseEvidenceChildIdempotencyKey(
        manifest.idempotency_key,
        `migration:${manifest.migration.migration_name}`
      );
      const migrationInsert = await transaction.$queryRaw<IdVersionRow[]>`
        INSERT INTO entral.migration_fingerprints (
          release_id, phase, organization_id, business_id, environment,
          actor_type, actor_id, idempotency_key, verification_state,
          evidence_references, migration_name, checksum_sha256, applied_at,
          verified_at, recovery_status
        ) VALUES (
          ${release.id}::uuid,
          ${manifest.phase},
          ${manifest.organization_id},
          ${manifest.business_id}::uuid,
          'production',
          'SERVICE',
          ${identity.roleName},
          ${migrationIdempotencyKey},
          'VERIFIED',
          ${jsonInput(migrationReferences)},
          ${manifest.migration.migration_name},
           ${manifest.migration.checksum_sha256},
           ${appliedMigration.finishedAt},
           ${manifest.migration.checked_at}::timestamptz,
          'RESTORE_VERIFIED'
        )
        ON CONFLICT (release_id, migration_name) DO NOTHING
        RETURNING id, version::integer AS version
      `;
      if (migrationInsert.length > 0) insertedCount += 1;
      const migration = migrationInsert[0] ?? requireExactRow(
        await transaction.$queryRaw<IdVersionRow[]>`
          SELECT id, version::integer AS version
          FROM entral.migration_fingerprints
          WHERE release_id = ${release.id}::uuid
            AND migration_name = ${manifest.migration.migration_name}
            AND phase = ${manifest.phase}
            AND environment = 'production'
            AND organization_id IS NOT DISTINCT FROM ${manifest.organization_id}
            AND business_id IS NOT DISTINCT FROM ${manifest.business_id}::uuid
            AND actor_type = 'SERVICE'
            AND actor_id = ${identity.roleName}
            AND idempotency_key = ${migrationIdempotencyKey}
            AND verification_state = 'VERIFIED'
            AND evidence_references = ${jsonInput(migrationReferences)}
             AND checksum_sha256 = ${manifest.migration.checksum_sha256}
             AND applied_at = ${appliedMigration.finishedAt}
             AND verified_at = ${manifest.migration.checked_at}::timestamptz
            AND recovery_status = 'RESTORE_VERIFIED'
          LIMIT 1
        `,
        "migration fingerprint"
      );

      const deployments: IdVersionRow[] = [];
      for (const deployment of manifest.deployments) {
        const references = [
          evidenceReference(
            `deployment:${deployment.provider}:${deployment.deployment_id}`,
            "DEPLOYMENT_READBACK",
            deployment.readback_content_sha256,
            deployment.checked_at
          )
        ];
        const idempotencyKey = releaseEvidenceChildIdempotencyKey(
          manifest.idempotency_key,
          `deployment:${deployment.deployment_role}`
        );
        const inserted = await transaction.$queryRaw<IdVersionRow[]>`
          INSERT INTO entral.deployment_evidence (
            release_id, phase, organization_id, business_id, environment,
            actor_type, actor_id, idempotency_key, verification_state,
            evidence_references, deployment_role, service_name, provider,
            deployment_id, deployed_commit_sha, public_url, deployment_status,
            deployed_at, checked_at, source_freshness_seconds
          ) VALUES (
            ${release.id}::uuid,
            ${manifest.phase},
            ${manifest.organization_id},
            ${manifest.business_id}::uuid,
            'production',
            'SERVICE',
            ${identity.roleName},
            ${idempotencyKey},
            'VERIFIED',
            ${jsonInput(references)},
            ${deployment.deployment_role},
            ${deployment.service_name},
            ${deployment.provider},
            ${deployment.deployment_id},
            ${deployment.deployed_commit_sha},
            ${deployment.public_url},
            'READY',
            ${deployment.deployed_at}::timestamptz,
            ${deployment.checked_at}::timestamptz,
            ${deployment.source_freshness_seconds}
          )
          ON CONFLICT (release_id, deployment_role) DO NOTHING
          RETURNING id, version::integer AS version
        `;
        if (inserted.length > 0) insertedCount += 1;
        deployments.push(inserted[0] ?? requireExactRow(
          await transaction.$queryRaw<IdVersionRow[]>`
            SELECT id, version::integer AS version
            FROM entral.deployment_evidence
            WHERE release_id = ${release.id}::uuid
              AND deployment_role = ${deployment.deployment_role}
              AND phase = ${manifest.phase}
              AND environment = 'production'
              AND organization_id IS NOT DISTINCT FROM ${manifest.organization_id}
              AND business_id IS NOT DISTINCT FROM ${manifest.business_id}::uuid
              AND actor_type = 'SERVICE'
              AND actor_id = ${identity.roleName}
              AND idempotency_key = ${idempotencyKey}
              AND verification_state = 'VERIFIED'
              AND evidence_references = ${jsonInput(references)}
              AND service_name = ${deployment.service_name}
              AND provider = ${deployment.provider}
              AND deployment_id = ${deployment.deployment_id}
              AND deployed_commit_sha = ${deployment.deployed_commit_sha}
              AND public_url = ${deployment.public_url}
              AND deployment_status = 'READY'
              AND deployed_at = ${deployment.deployed_at}::timestamptz
              AND checked_at = ${deployment.checked_at}::timestamptz
              AND source_freshness_seconds = ${deployment.source_freshness_seconds}
            LIMIT 1
          `,
          `${deployment.deployment_role.toLowerCase()} deployment`
        ));
      }

      const dispositions: IdVersionRow[] = [];
      for (const disposition of manifest.pull_requests) {
        const references = [
          evidenceReference(
            `pull-request:${disposition.repository}#${disposition.pull_request_number}`,
            "EXTERNAL_RECEIPT",
            disposition.receipt_content_sha256,
            disposition.decided_at
          )
        ];
        const idempotencyKey = releaseEvidenceChildIdempotencyKey(
          manifest.idempotency_key,
          `pull-request:${disposition.repository}#${disposition.pull_request_number}`
        );
        const inserted = await transaction.$queryRaw<IdVersionRow[]>`
          INSERT INTO entral.pull_request_dispositions (
            release_id, phase, organization_id, business_id, environment,
            actor_type, actor_id, idempotency_key, verification_state,
            evidence_references, repository, pull_request_number,
            head_commit_sha, disposition, rationale, decided_at
          ) VALUES (
            ${release.id}::uuid,
            ${manifest.phase},
            ${manifest.organization_id},
            ${manifest.business_id}::uuid,
            'production',
            'SERVICE',
            ${identity.roleName},
            ${idempotencyKey},
            'VERIFIED',
            ${jsonInput(references)},
            ${disposition.repository},
            ${disposition.pull_request_number},
            ${disposition.head_commit_sha},
            ${disposition.disposition},
            ${disposition.rationale},
            ${disposition.decided_at}::timestamptz
          )
          ON CONFLICT (release_id, repository, pull_request_number) DO NOTHING
          RETURNING id, version::integer AS version
        `;
        if (inserted.length > 0) insertedCount += 1;
        dispositions.push(inserted[0] ?? requireExactRow(
          await transaction.$queryRaw<IdVersionRow[]>`
            SELECT id, version::integer AS version
            FROM entral.pull_request_dispositions
            WHERE release_id = ${release.id}::uuid
              AND repository = ${disposition.repository}
              AND pull_request_number = ${disposition.pull_request_number}
              AND phase = ${manifest.phase}
              AND environment = 'production'
              AND organization_id IS NOT DISTINCT FROM ${manifest.organization_id}
              AND business_id IS NOT DISTINCT FROM ${manifest.business_id}::uuid
              AND actor_type = 'SERVICE'
              AND actor_id = ${identity.roleName}
              AND idempotency_key = ${idempotencyKey}
              AND verification_state = 'VERIFIED'
              AND evidence_references = ${jsonInput(references)}
              AND head_commit_sha = ${disposition.head_commit_sha}
              AND disposition = ${disposition.disposition}
              AND rationale = ${disposition.rationale}
              AND decided_at = ${disposition.decided_at}::timestamptz
            LIMIT 1
          `,
          `pull request ${disposition.repository}#${disposition.pull_request_number}`
        ));
      }

      const runtimes: IdVersionRow[] = [];
      for (const runtime of manifest.runtime_modes) {
        const references = [
          evidenceReference(
            `runtime:${runtime.process_role}:${runtime.service_name}`,
            "DEPLOYMENT_READBACK",
            runtime.evidence_content_sha256,
            runtime.observed_at
          )
        ];
        const idempotencyKey = releaseEvidenceChildIdempotencyKey(
          manifest.idempotency_key,
          `runtime:${runtime.process_role}`
        );
        const inserted = await transaction.$queryRaw<IdVersionRow[]>`
          INSERT INTO entral.runtime_mode_records (
            release_id, phase, organization_id, business_id, environment,
            actor_type, actor_id, idempotency_key, verification_state,
            evidence_references, service_name, process_role, runtime_mode,
            observed_commit_sha, in_memory_canonical_state_reachable,
            deterministic_fallback_reachable, sample_data_reachable,
            observed_at
          ) VALUES (
            ${release.id}::uuid,
            ${manifest.phase},
            ${manifest.organization_id},
            ${manifest.business_id}::uuid,
            'production',
            'SERVICE',
            ${identity.roleName},
            ${idempotencyKey},
            'VERIFIED',
            ${jsonInput(references)},
            ${runtime.service_name},
            ${runtime.process_role},
            'PRODUCTION',
            ${runtime.observed_commit_sha},
            false,
            false,
            false,
            ${runtime.observed_at}::timestamptz
          )
          ON CONFLICT (release_id, service_name, process_role) DO NOTHING
          RETURNING id, version::integer AS version
        `;
        if (inserted.length > 0) insertedCount += 1;
        runtimes.push(inserted[0] ?? requireExactRow(
          await transaction.$queryRaw<IdVersionRow[]>`
            SELECT id, version::integer AS version
            FROM entral.runtime_mode_records
            WHERE release_id = ${release.id}::uuid
              AND service_name = ${runtime.service_name}
              AND process_role = ${runtime.process_role}
              AND phase = ${manifest.phase}
              AND environment = 'production'
              AND organization_id IS NOT DISTINCT FROM ${manifest.organization_id}
              AND business_id IS NOT DISTINCT FROM ${manifest.business_id}::uuid
              AND actor_type = 'SERVICE'
              AND actor_id = ${identity.roleName}
              AND idempotency_key = ${idempotencyKey}
              AND verification_state = 'VERIFIED'
              AND evidence_references = ${jsonInput(references)}
              AND runtime_mode = 'PRODUCTION'
              AND observed_commit_sha = ${runtime.observed_commit_sha}
              AND NOT in_memory_canonical_state_reachable
              AND NOT deterministic_fallback_reachable
              AND NOT sample_data_reachable
              AND observed_at = ${runtime.observed_at}::timestamptz
            LIMIT 1
          `,
          `${runtime.process_role.toLowerCase()} runtime`
        ));
      }

      const artifactIds = manifest.ci.artifacts.map((artifact) => artifact.artifact_id);
      const testReferences = [
        ciRunReference.reference_id,
        ...artifactReferences.map((reference) => reference.reference_id),
        smokeReference.reference_id,
        rollbackReference.reference_id
      ];
      const gateIdempotencyKey = releaseEvidenceChildIdempotencyKey(
        manifest.idempotency_key,
        "phase-gate"
      );
      const gateInsert = await transaction.$queryRaw<IdVersionRow[]>`
        INSERT INTO entral.phase_gate_records (
          release_id, phase, organization_id, business_id, environment,
          actor_type, actor_id, idempotency_key, verification_state,
          evidence_references, gate_id, gate_status, expected_release_version,
          migration_fingerprint_ids, deployment_evidence_ids,
          pull_request_disposition_ids, runtime_mode_record_ids,
          test_evidence_references, ci_provider, ci_repository, ci_workflow,
          ci_git_commit_sha, ci_run_id, ci_run_url, ci_result,
          ci_artifact_ids, authenticated_smoke_receipt_id,
          authenticated_smoke_target_url, authenticated_smoke_status,
          rollback_recovery_reference, remaining_external_boundaries, closed_at
        ) VALUES (
          ${release.id}::uuid,
          ${manifest.phase},
          ${manifest.organization_id},
          ${manifest.business_id}::uuid,
          'production',
          'SERVICE',
          ${identity.roleName},
          ${gateIdempotencyKey},
          'VERIFIED',
          ${jsonInput(releaseReferences)},
          ${manifest.gate_id},
          'PASSED',
          ${release.version},
          ${[migration.id]}::uuid[],
          ${deployments.map((row) => row.id)}::uuid[],
          ${dispositions.map((row) => row.id)}::uuid[],
          ${runtimes.map((row) => row.id)}::uuid[],
          ${testReferences}::text[],
          ${manifest.ci.provider},
          ${manifest.ci.repository},
          ${manifest.ci.workflow},
          ${manifest.ci.git_commit_sha},
          ${manifest.ci.run_id},
          ${manifest.ci.run_url},
          'SUCCESS',
          ${artifactIds}::text[],
          ${manifest.authenticated_smoke.receipt_id},
          ${manifest.authenticated_smoke.target_url},
          'PASSED',
          ${manifest.rollback.recovery_reference},
          ${manifest.remaining_external_boundaries}::text[],
          ${manifest.closed_at}::timestamptz
        )
        ON CONFLICT (phase, environment) DO NOTHING
        RETURNING id, version::integer AS version
      `;
      if (gateInsert.length > 0) insertedCount += 1;
      const gate = gateInsert[0] ?? requireExactRow(
        await transaction.$queryRaw<IdVersionRow[]>`
          SELECT id, version::integer AS version
          FROM entral.phase_gate_records
          WHERE release_id = ${release.id}::uuid
            AND phase = ${manifest.phase}
            AND environment = 'production'
            AND organization_id IS NOT DISTINCT FROM ${manifest.organization_id}
            AND business_id IS NOT DISTINCT FROM ${manifest.business_id}::uuid
            AND actor_type = 'SERVICE'
            AND actor_id = ${identity.roleName}
            AND idempotency_key = ${gateIdempotencyKey}
            AND verification_state = 'VERIFIED'
            AND evidence_references = ${jsonInput(releaseReferences)}
            AND gate_id = ${manifest.gate_id}
            AND gate_status = 'PASSED'
            AND expected_release_version = ${release.version}
            AND migration_fingerprint_ids = ${[migration.id]}::uuid[]
            AND deployment_evidence_ids = ${deployments.map((row) => row.id)}::uuid[]
            AND pull_request_disposition_ids = ${dispositions.map((row) => row.id)}::uuid[]
            AND runtime_mode_record_ids = ${runtimes.map((row) => row.id)}::uuid[]
            AND test_evidence_references = ${testReferences}::text[]
            AND ci_provider = ${manifest.ci.provider}
            AND ci_repository = ${manifest.ci.repository}
            AND ci_workflow = ${manifest.ci.workflow}
            AND ci_git_commit_sha = ${manifest.ci.git_commit_sha}
            AND ci_run_id = ${manifest.ci.run_id}
            AND ci_run_url = ${manifest.ci.run_url}
            AND ci_result = 'SUCCESS'
            AND ci_artifact_ids = ${artifactIds}::text[]
            AND authenticated_smoke_receipt_id = ${manifest.authenticated_smoke.receipt_id}
            AND authenticated_smoke_target_url = ${manifest.authenticated_smoke.target_url}
            AND authenticated_smoke_status = 'PASSED'
            AND rollback_recovery_reference = ${manifest.rollback.recovery_reference}
            AND cardinality(remaining_external_boundaries) = 0
            AND closed_at = ${manifest.closed_at}::timestamptz
          LIMIT 1
        `,
        "phase gate"
      );

      const evidence = await readPhaseReleaseEvidence(
        transaction,
        manifest.phase
      );
      if (
        !evidence.complete
        || evidence.canonical_release?.record_id !== release.id
        || evidence.canonical_release.git_commit_sha
          !== manifest.accepted_git_commit_sha
        || evidence.phase_gate?.record_id !== gate.id
      ) {
        throw new ReleaseEvidenceRecordingError(
          "INCOMPLETE_RELEASE_EVIDENCE",
          `Recorded evidence did not close the release gate: ${evidence.blockers.join(" ")}`
        );
      }
      return {
        idempotent_replay: insertedCount === 0,
        release_id: release.id,
        phase_gate_id: gate.id,
        evidence
      };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }
}
