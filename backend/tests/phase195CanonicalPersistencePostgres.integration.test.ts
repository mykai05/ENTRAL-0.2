import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  PHASE_195_RELEASE_MIGRATION_NAME,
  canonicalGraphPreferenceSettings,
  type GraphPreferenceSettings
} from "@entral/contracts";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  GraphPreferencesError,
  GraphPreferencesService
} from "../src/services/graphPreferences.js";
import {
  readPhaseReleaseEvidence,
  ReleaseEvidenceService
} from "../src/services/releaseEvidence.js";
import {
  ReleaseEvidenceRecordingService
} from "../src/services/releaseEvidenceRecording.js";
import {
  readWorkerReadinessEvidence,
  startWorkerReadinessHeartbeat
} from "../src/services/workerReadiness.js";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled = Boolean(
  testDatabaseUrl
  && process.env.RUN_POSTGRES_INTEGRATION === "1"
);

function runPrisma(
  prismaCli: string,
  repositoryRoot: string,
  databaseUrl: string,
  args: string[],
  operation: string
) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: { ...process.env, DATABASE_URL: databaseUrl }
  });
  if (result.status !== 0) {
    throw new Error(`${operation} failed: ${result.stderr || result.stdout}`);
  }
}

function loginUrl(databaseUrl: URL, name: string, password: string) {
  const url = new URL(databaseUrl);
  url.username = name;
  url.password = password;
  url.searchParams.set("connection_limit", "4");
  return url.toString();
}

describe.skipIf(!integrationEnabled)("Phase 195 canonical PostgreSQL persistence gate", () => {
  it("migrates and verifies graph preferences, release evidence, worker readiness, RLS, audit, events, and outbox", async () => {
    const baseUrl = new URL(testDatabaseUrl!);
    if (!baseUrl.protocol.startsWith("postgres")) {
      throw new Error("TEST_DATABASE_URL must use PostgreSQL.");
    }

    const suffix = `${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
    const databaseName = `entral_phase195_${suffix}`;
    const apiRole = `entral_phase195_api_${suffix}`;
    const workerRole = `entral_phase195_worker_${suffix}`;
    const verifierRole = `entral_phase195_verifier_${suffix}`;
    const apiPassword = randomUUID();
    const workerPassword = randomUUID();
    const verifierPassword = randomUUID();
    const adminUrl = new URL(baseUrl);
    adminUrl.pathname = "/postgres";
    adminUrl.searchParams.delete("schema");
    const databaseUrl = new URL(baseUrl);
    databaseUrl.pathname = `/${databaseName}`;
    databaseUrl.searchParams.delete("schema");
    const admin = new PrismaClient({
      datasources: { db: { url: adminUrl.toString() } }
    });
    let owner: PrismaClient | null = null;
    let api: PrismaClient | null = null;
    let worker: PrismaClient | null = null;
    let verifier: PrismaClient | null = null;

    try {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
      const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
      const prismaCli = fileURLToPath(
        new URL("../../node_modules/prisma/build/index.js", import.meta.url)
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        ["migrate", "deploy", "--schema", "prisma/schema.prisma"],
        "Phase 195 disposable PostgreSQL migration"
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        [
          "db",
          "execute",
          "--file",
          "prisma/security/046_roles_and_grants.sql",
          "--schema",
          "prisma/schema.prisma"
        ],
        "Phase 195 base role and grant deployment"
      );
      runPrisma(
        prismaCli,
        repositoryRoot,
        databaseUrl.toString(),
        [
          "db",
          "execute",
          "--file",
          "prisma/security/047_phase_195_roles_and_grants.sql",
          "--schema",
          "prisma/schema.prisma"
        ],
        "Phase 195 least-privilege role and grant deployment"
      );

      for (const [role, password, inheritedRole] of [
        [apiRole, apiPassword, "entral_api"],
        [workerRole, workerPassword, "entral_worker"],
        [verifierRole, verifierPassword, "entral_verifier"]
      ]) {
        await admin.$executeRawUnsafe(
          `CREATE ROLE "${role}" LOGIN INHERIT NOSUPERUSER NOBYPASSRLS ` +
          `NOCREATEDB NOCREATEROLE NOREPLICATION PASSWORD '${password}'`
        );
        await admin.$executeRawUnsafe(`GRANT ${inheritedRole} TO "${role}"`);
      }

      owner = new PrismaClient({
        datasources: { db: { url: databaseUrl.toString() } }
      });
      api = new PrismaClient({
        datasources: {
          db: { url: loginUrl(databaseUrl, apiRole, apiPassword) }
        }
      });
      worker = new PrismaClient({
        datasources: {
          db: { url: loginUrl(databaseUrl, workerRole, workerPassword) }
        }
      });
      verifier = new PrismaClient({
        datasources: {
          db: { url: loginUrl(databaseUrl, verifierRole, verifierPassword) }
        }
      });

      const humanAppUserId = randomUUID();
      const workerAppUserId = randomUUID();
      const verifierAppUserId = randomUUID();
      const humanSubject = `phase195-human-${suffix}`;
      const organizationId = `phase195-team-${suffix}`;
      const humanEmail = `phase195-human-${suffix}@example.test`;
      await owner.user.create({
        data: {
          email: humanEmail,
          id: humanSubject,
          name: "Phase 195 Human",
          passwordHash: "integration-test-only",
          role: "ADMIN"
        }
      });
      await owner.team.create({
        data: {
          id: organizationId,
          memberAccessEnabled: true,
          name: "Phase 195 Organization",
          slug: `phase195-${suffix}`
        }
      });
      await owner.teamMember.create({
        data: {
          teamId: organizationId,
          userId: humanSubject
        }
      });
      await owner.$executeRaw`
        INSERT INTO entral.app_users (
          id, email, display_name, is_human_authority, is_active, auth_subject
        ) VALUES
          (
            ${humanAppUserId}::uuid,
            ${humanEmail},
            'Phase 195 Human',
            true,
            true,
            ${humanSubject}
          ),
          (
            ${workerAppUserId}::uuid,
            ${`phase195-worker-${suffix}@example.test`},
            'Phase 195 Worker',
            false,
            true,
            NULL
          ),
          (
            ${verifierAppUserId}::uuid,
            ${`phase195-verifier-${suffix}@example.test`},
            'Phase 195 Verifier',
            false,
            true,
            NULL
          )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.scope_grants (
          user_id, scope_type, scope_id, permissions
        ) VALUES
          (
            ${workerAppUserId}::uuid,
            'SYSTEM',
            NULL,
            ARRAY['publish_events']::text[]
          ),
          (
            ${verifierAppUserId}::uuid,
            'SYSTEM',
            NULL,
            ARRAY['record_verification']::text[]
          )
      `;

      const entralId = randomUUID();
      const marshalId = randomUUID();
      await owner.$executeRaw`
        INSERT INTO entral.entities (
          id, stable_code, role, name, status
        ) VALUES (
          ${entralId}::uuid,
          'ENTRAL',
          'ENTRAL',
          'ENTRAL',
          'ACTIVE'
        )
      `;
      await owner.$executeRaw`
        INSERT INTO entral.entities (
          id, stable_code, role, name, parent_id, status
        ) VALUES (
          ${marshalId}::uuid,
          'M-P195',
          'MARSHAL',
          'Phase 195 Marshal',
          ${entralId}::uuid,
          'ACTIVE'
        )
      `;

      const preferencesService = new GraphPreferencesService(api);
      const session = {
        actionReason: "Verify Phase 195 graph preference persistence.",
        authSubject: humanSubject,
        correlationId: randomUUID()
      } as const;
      const defaults = await preferencesService.get(organizationId, session);
      expect(defaults).toMatchObject({
        preference_id: null,
        source: "CANONICAL_DEFAULTS",
        version: 0
      });

      const canonicalSettings = canonicalGraphPreferenceSettings();
      const twoDPin = {
        entity_id: entralId,
        renderer: "2D",
        x: 125.5,
        y: -80,
        z: null
      } as const;
      const threeDPin = {
        entity_id: marshalId,
        renderer: "3D",
        x: -310.25,
        y: 90.5,
        z: 45.25
      } as const;
      const settings: GraphPreferenceSettings = {
        ...canonicalSettings,
        simple: {
          ...canonicalSettings.simple,
          arrangement: "SIDE_BY_SIDE",
          density: "SPACIOUS",
          three_d_layout: "SPHERICAL_SHELLS",
          two_d_layout: "HIERARCHY_TREE"
        },
        advanced_shared: {
          ...canonicalSettings.advanced_shared,
          node_scale: 1.5
        },
        advanced_2d: {
          ...canonicalSettings.advanced_2d,
          ring_spacing: 240
        },
        advanced_3d: {
          ...canonicalSettings.advanced_3d,
          ring_spacing: 330
        },
        pinned_positions: [twoDPin, threeDPin]
      };
      const updateRequest = {
        expected_version: 0,
        idempotency_key: `phase195-preference-${randomUUID()}`,
        migrated_from_schema_version: null,
        settings
      } as const;
      const updated = await preferencesService.update(
        organizationId,
        updateRequest,
        session
      );
      expect(updated.idempotent_replay).toBe(false);
      expect(updated.preferences).toMatchObject({
        source: "SAVED_OVERRIDE",
        version: 1
      });
      expect(updated.preferences.settings.pinned_positions).toEqual(
        settings.pinned_positions
      );
      expect(updated.event_ids).toHaveLength(3);
      const reloadedWithPins = await preferencesService.get(
        organizationId,
        session
      );
      expect(reloadedWithPins.settings.pinned_positions).toEqual([
        twoDPin,
        threeDPin
      ]);

      const replay = await preferencesService.update(
        organizationId,
        updateRequest,
        session
      );
      expect(replay.idempotent_replay).toBe(true);
      expect(replay.event_ids).toEqual(updated.event_ids);
      await expect(preferencesService.update(
        organizationId,
        {
          ...updateRequest,
          idempotency_key: `phase195-stale-${randomUUID()}`
        },
        session
      )).rejects.toMatchObject<Partial<GraphPreferencesError>>({
        code: "STALE_EXPECTED_VERSION",
        statusCode: 409
      });

      const sharedReset = await preferencesService.reset(
        organizationId,
        {
          expected_version: 1,
          idempotency_key: `phase195-reset-shared-${randomUUID()}`,
          reset_scope: "SHARED"
        },
        session
      );
      expect(sharedReset.preferences.version).toBe(2);
      expect(sharedReset.preferences.settings.simple).toEqual({
        ...canonicalSettings.simple,
        three_d_layout: settings.simple.three_d_layout,
        two_d_layout: settings.simple.two_d_layout
      });
      expect(sharedReset.preferences.settings.advanced_shared).toEqual(
        canonicalSettings.advanced_shared
      );
      expect(sharedReset.preferences.settings.advanced_2d).toEqual(
        settings.advanced_2d
      );
      expect(sharedReset.preferences.settings.advanced_3d).toEqual(
        settings.advanced_3d
      );
      expect(sharedReset.preferences.settings.pinned_positions).toEqual([
        twoDPin,
        threeDPin
      ]);

      const pinnedPositionsReset = await preferencesService.reset(
        organizationId,
        {
          expected_version: 2,
          idempotency_key: `phase195-reset-pins-${randomUUID()}`,
          reset_scope: "PINNED_POSITIONS"
        },
        session
      );
      expect(pinnedPositionsReset.preferences.version).toBe(3);
      expect(pinnedPositionsReset.preferences.settings).toEqual({
        ...sharedReset.preferences.settings,
        pinned_positions: []
      });

      const restoredBeforeTwoDReset = await preferencesService.update(
        organizationId,
        {
          ...updateRequest,
          expected_version: 3,
          idempotency_key: `phase195-restore-before-2d-${randomUUID()}`
        },
        session
      );
      expect(restoredBeforeTwoDReset.preferences.version).toBe(4);
      expect(restoredBeforeTwoDReset.preferences.settings.pinned_positions).toEqual([
        twoDPin,
        threeDPin
      ]);

      const twoDReset = await preferencesService.reset(
        organizationId,
        {
          expected_version: 4,
          idempotency_key: `phase195-reset-2d-${randomUUID()}`,
          reset_scope: "VIEW_2D"
        },
        session
      );
      expect(twoDReset.preferences.version).toBe(5);
      expect(twoDReset.preferences.settings.simple).toMatchObject({
        three_d_layout: settings.simple.three_d_layout,
        two_d_layout: canonicalSettings.simple.two_d_layout
      });
      expect(twoDReset.preferences.settings.advanced_shared).toEqual(
        settings.advanced_shared
      );
      expect(twoDReset.preferences.settings.advanced_2d).toEqual(
        canonicalSettings.advanced_2d
      );
      expect(twoDReset.preferences.settings.advanced_3d).toEqual(
        settings.advanced_3d
      );
      expect(twoDReset.preferences.settings.pinned_positions).toEqual([
        threeDPin
      ]);

      const restoredBeforeThreeDReset = await preferencesService.update(
        organizationId,
        {
          ...updateRequest,
          expected_version: 5,
          idempotency_key: `phase195-restore-before-3d-${randomUUID()}`
        },
        session
      );
      expect(restoredBeforeThreeDReset.preferences.version).toBe(6);
      expect(restoredBeforeThreeDReset.preferences.settings.pinned_positions).toEqual([
        twoDPin,
        threeDPin
      ]);

      const threeDReset = await preferencesService.reset(
        organizationId,
        {
          expected_version: 6,
          idempotency_key: `phase195-reset-3d-${randomUUID()}`,
          reset_scope: "VIEW_3D"
        },
        session
      );
      expect(threeDReset.preferences.version).toBe(7);
      expect(threeDReset.preferences.settings.simple).toMatchObject({
        three_d_layout: canonicalSettings.simple.three_d_layout,
        two_d_layout: settings.simple.two_d_layout
      });
      expect(threeDReset.preferences.settings.advanced_shared).toEqual(
        settings.advanced_shared
      );
      expect(threeDReset.preferences.settings.advanced_2d).toEqual(
        settings.advanced_2d
      );
      expect(threeDReset.preferences.settings.advanced_3d).toEqual(
        canonicalSettings.advanced_3d
      );
      expect(threeDReset.preferences.settings.pinned_positions).toEqual([
        twoDPin
      ]);

      const fullReset = await preferencesService.reset(
        organizationId,
        {
          expected_version: 7,
          idempotency_key: `phase195-reset-all-${randomUUID()}`,
          reset_scope: "ALL"
        },
        session
      );
      expect(fullReset.preferences).toMatchObject({
        preference_id: null,
        source: "CANONICAL_DEFAULTS",
        version: 0
      });

      const graphAuditRows = await owner.$queryRaw<{ afterState: string }[]>`
        SELECT after_state::text AS "afterState"
        FROM entral.audit_entries
        WHERE target_type = 'GRAPH_VIEW_PREFERENCE'
        ORDER BY sequence_number
      `;
      expect(graphAuditRows.length).toBeGreaterThanOrEqual(8);
      expect(graphAuditRows.map((row) => row.afterState).join(" ")).not.toContain(
        entralId
      );
      expect(graphAuditRows.map((row) => row.afterState).join(" ")).not.toContain(
        marshalId
      );
      expect(graphAuditRows.map((row) => row.afterState).join(" ")).not.toContain(
        "125.5"
      );
      const graphOutboxRows = await owner.$queryRaw<{ eventType: string }[]>`
        SELECT payload->>'event_type' AS "eventType"
        FROM entral.transactional_outbox
        WHERE payload->>'event_type' LIKE 'graph.%'
        ORDER BY created_at
      `;
      expect(graphOutboxRows.map((row) => row.eventType)).toEqual(
        expect.arrayContaining([
          "graph.preferences.updated",
          "graph.preferences.reset",
          "graph.arrangement.changed",
          "graph.pinned_positions.changed"
        ])
      );

      const stopHeartbeat = await startWorkerReadinessHeartbeat({
        components: {
          agent_orchestrator: true,
          automation_worker: true,
          autonomy_scheduler: true,
          canonical_outbox_dispatcher: true,
          process: true
        },
        database: worker,
        heartbeatIntervalMs: 60_000,
        instanceId: `phase195-worker-${suffix}`,
        production: true,
        serviceAppUserId: workerAppUserId
      });
      const readyWorker = await readWorkerReadinessEvidence(api);
      expect(readyWorker).toMatchObject({
        evidence_source: "DURABLE_HEARTBEAT",
        ready: true,
        status: "READY"
      });
      expect(readyWorker.queue?.pending).toBeGreaterThan(0);
      await stopHeartbeat();
      const stoppedWorker = await readWorkerReadinessEvidence(api);
      expect(stoppedWorker).toMatchObject({
        ready: false,
        status: "DEGRADED"
      });

      const releaseCommit = "b".repeat(40);
      const migrationName = PHASE_195_RELEASE_MIGRATION_NAME;
      const migrationRows = await owner.$queryRaw<{
        checksum: string;
        finishedAt: Date;
      }[]>`
        SELECT checksum, finished_at AS "finishedAt"
        FROM public."_prisma_migrations"
        WHERE migration_name = ${migrationName}
          AND finished_at IS NOT NULL
          AND rolled_back_at IS NULL
        ORDER BY finished_at DESC
        LIMIT 1
      `;
      expect(migrationRows).toHaveLength(1);
      const timeline = Date.now();
      const observedAt = (offsetMs: number) =>
        new Date(timeline + offsetMs).toISOString();
      const releaseManifest = {
        contract_version: "1.0.0",
        schema_version: 1,
        phase: 195,
        idempotency_key: `phase195-production-${suffix}`,
        organization_id: null,
        business_id: null,
        repository: "entral/entral",
        accepted_git_commit_sha: releaseCommit,
        release_tag: "phase-195",
        accepted_at: observedAt(-600_000),
        migration: {
          migration_name: migrationName,
          checksum_sha256: migrationRows[0]!.checksum,
          readback_content_sha256: "c".repeat(64),
          checked_at: observedAt(0)
        },
        deployments: [
          {
            deployment_role: "FRONTEND",
            service_name: "entral-frontend",
            provider: "VERCEL",
            deployment_id: "phase195-frontend",
            deployed_commit_sha: releaseCommit,
            public_url: "https://example.test",
            deployed_at: observedAt(-540_000),
            checked_at: observedAt(-480_000),
            source_freshness_seconds: 1,
            readback_content_sha256: "d".repeat(64)
          },
          {
            deployment_role: "API",
            service_name: "entral-api",
            provider: "RAILWAY",
            deployment_id: "phase195-api",
            deployed_commit_sha: releaseCommit,
            public_url: "https://api.example.test/health",
            deployed_at: observedAt(-540_000),
            checked_at: observedAt(-480_000),
            source_freshness_seconds: 1,
            readback_content_sha256: "e".repeat(64)
          },
          {
            deployment_role: "WORKER",
            service_name: "entral-worker",
            provider: "RAILWAY",
            deployment_id: "phase195-worker",
            deployed_commit_sha: releaseCommit,
            public_url: "https://worker.example.test/health",
            deployed_at: observedAt(-540_000),
            checked_at: observedAt(-480_000),
            source_freshness_seconds: 1,
            readback_content_sha256: "f".repeat(64)
          }
        ],
        ci: {
          provider: "GITHUB_ACTIONS",
          repository: "entral/entral",
          workflow: ".github/workflows/ci-cd.yml",
          git_commit_sha: releaseCommit,
          run_id: "phase195-integration",
          run_url:
            "https://github.com/entral/entral/actions/runs/phase195-integration",
          result: "SUCCESS",
          checked_at: observedAt(-420_000),
          run_content_sha256: "1".repeat(64),
          artifacts: [{
            artifact_id: "phase195-integration-results",
            content_sha256: "2".repeat(64)
          }]
        },
        authenticated_smoke: {
          receipt_id: "phase195-integration-smoke",
          target_url: "https://example.test/member/graph",
          status: "PASSED",
          checked_at: observedAt(-360_000),
          content_sha256: "3".repeat(64)
        },
        rollback: {
          status: "AVAILABLE",
          strategy: "RESTORE",
          recovery_reference: "receipt:phase195-restore-verification",
          verified_at: observedAt(-300_000),
          content_sha256: "4".repeat(64)
        },
        pull_requests: [{
          repository: "entral/entral",
          pull_request_number: 195,
          head_commit_sha: releaseCommit,
          disposition: "MERGED",
          rationale: "Merged and reconciled to the accepted release commit.",
          decided_at: observedAt(-660_000),
          receipt_content_sha256: "5".repeat(64)
        }],
        runtime_modes: [
          {
            service_name: "entral-api",
            process_role: "API",
            observed_commit_sha: releaseCommit,
            observed_at: observedAt(-240_000),
            in_memory_canonical_state_reachable: false,
            deterministic_fallback_reachable: false,
            sample_data_reachable: false,
            evidence_content_sha256: "6".repeat(64)
          },
          {
            service_name: "entral-worker",
            process_role: "WORKER",
            observed_commit_sha: releaseCommit,
            observed_at: observedAt(-240_000),
            in_memory_canonical_state_reachable: false,
            deterministic_fallback_reachable: false,
            sample_data_reachable: false,
            evidence_content_sha256: "7".repeat(64)
          }
        ],
        gate_id: "phase-195-production",
        closed_at: observedAt(0),
        remaining_external_boundaries: []
      };
      const verifierPrivileges = await verifier.$queryRaw<{
        canInsertReleaseEvidence: boolean;
      }[]>`
        SELECT has_table_privilege(
          current_user,
          'entral.canonical_releases',
          'INSERT'
        ) AS "canInsertReleaseEvidence"
      `;
      expect(verifierPrivileges[0]?.canInsertReleaseEvidence).toBe(false);
      await expect(
        new ReleaseEvidenceRecordingService(verifier).record(releaseManifest)
      ).rejects.toMatchObject({
        code: "INVALID_DATABASE_AUTHORITY"
      });
      const ownerIdentity = await owner.$queryRaw<{ roleName: string }[]>`
        SELECT current_user::text AS "roleName"
      `;
      const recorder = new ReleaseEvidenceRecordingService(owner);
      await expect(recorder.record({
        ...releaseManifest,
        migration: {
          ...releaseManifest.migration,
          checked_at: new Date(
            migrationRows[0]!.finishedAt.getTime() - 1
          ).toISOString()
        }
      })).rejects.toMatchObject({
        code: "INCOMPLETE_RELEASE_EVIDENCE"
      });
      const recorded = await recorder.record(releaseManifest);
      expect(recorded).toMatchObject({
        idempotent_replay: false,
        evidence: {
          blockers: [],
          complete: true,
          phase: 195
        }
      });
      expect(recorded.evidence.canonical_release?.actor.actor_id)
        .toBe(ownerIdentity[0]?.roleName);
      expect(recorded.evidence.migration_fingerprints[0]?.verified_at)
        .toBe(releaseManifest.migration.checked_at);
      expect(recorded.evidence.phase_gate).toMatchObject({
        ci_git_commit_sha: releaseCommit,
        ci_repository: releaseManifest.repository,
        ci_workflow: releaseManifest.ci.workflow
      });
      expect(
        recorded.evidence.migration_fingerprints[0]?.evidence_references.find(
          (reference) =>
            reference.reference_id === `migration:${migrationName}`
        )?.captured_at
      ).toBe(releaseManifest.migration.checked_at);
      await expect(owner.$executeRaw`
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
        )
        SELECT
          release_id, phase, organization_id, business_id, environment,
          actor_type, actor_id, ${`phase195-duplicate-gate-${suffix}`},
          'BLOCKED', evidence_references, ${`phase-195-duplicate-${suffix}`},
          'BLOCKED', expected_release_version, migration_fingerprint_ids,
          ARRAY[
            deployment_evidence_ids[1],
            deployment_evidence_ids[1],
            deployment_evidence_ids[3]
          ]::uuid[],
          pull_request_disposition_ids, runtime_mode_record_ids,
          test_evidence_references, ci_provider, ci_repository, ci_workflow,
          ci_git_commit_sha, ci_run_id, ci_run_url, ci_result,
          ci_artifact_ids, authenticated_smoke_receipt_id,
          authenticated_smoke_target_url, authenticated_smoke_status,
          rollback_recovery_reference, remaining_external_boundaries, closed_at
        FROM entral.phase_gate_records
        WHERE id = ${recorded.phase_gate_id}::uuid
      `).rejects.toThrow(/phase_gate_unique_deployment_ids/i);
      await expect(owner.$executeRaw`
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
        )
        SELECT
          release_id, phase, organization_id, business_id, environment,
          actor_type, actor_id, ${`phase195-ci-drift-gate-${suffix}`},
          verification_state, evidence_references,
          ${`phase-195-ci-drift-${suffix}`}, gate_status,
          expected_release_version, migration_fingerprint_ids,
          deployment_evidence_ids, pull_request_disposition_ids,
          runtime_mode_record_ids, test_evidence_references, ci_provider,
          ci_repository, ci_workflow, ${"a".repeat(40)}, ci_run_id,
          ci_run_url, ci_result, ci_artifact_ids,
          authenticated_smoke_receipt_id, authenticated_smoke_target_url,
          authenticated_smoke_status, rollback_recovery_reference,
          remaining_external_boundaries, closed_at
        FROM entral.phase_gate_records
        WHERE id = ${recorded.phase_gate_id}::uuid
      `).rejects.toThrow(
        /CI repository and commit must match the canonical release/i
      );
      await expect(owner.$executeRaw`
        INSERT INTO entral.phase_gate_records
        SELECT (
          jsonb_populate_record(
            NULL::entral.phase_gate_records,
            to_jsonb(existing_gate)
            || jsonb_build_object(
              'id',
              gen_random_uuid(),
              'idempotency_key',
              ${`phase195-null-ci-url-${suffix}`},
              'gate_id',
              ${`phase-195-null-ci-url-${suffix}`},
              'ci_run_url',
              NULL
            )
          )
        ).*
        FROM entral.phase_gate_records AS existing_gate
        WHERE existing_gate.id = ${recorded.phase_gate_id}::uuid
      `).rejects.toThrow(/phase_gate_passed_evidence_complete/i);
      await expect(owner.$executeRaw`
          INSERT INTO entral.pull_request_dispositions (
            release_id, phase, organization_id, business_id, environment,
            actor_type, actor_id, idempotency_key, verification_state,
            evidence_references, repository, pull_request_number,
            head_commit_sha, disposition, rationale, decided_at
          ) VALUES (
            ${recorded.release_id}::uuid,
            195,
            NULL,
            NULL,
            'production',
            'SERVICE',
            ${ownerIdentity[0]!.roleName},
            ${`phase195-extra-pr-${suffix}`},
            'VERIFIED',
            '[]'::jsonb,
            'entral/entral',
            194,
            ${"a".repeat(40)},
            'SUPERSEDED',
            'Transaction-local evidence drift test.',
            ${observedAt(-720_000)}::timestamptz
          )
        `).rejects.toThrow(/Release evidence is immutable after the phase gate passes/i);
      await expect(recorder.record(releaseManifest)).resolves.toMatchObject({
        idempotent_replay: true,
        release_id: recorded.release_id,
        phase_gate_id: recorded.phase_gate_id
      });
      await expect(recorder.record({
        ...releaseManifest,
        release_tag: "phase-195-conflict"
      })).rejects.toMatchObject({
        code: "IMMUTABLE_EVIDENCE_CONFLICT"
      });
      await expect(owner.$executeRaw`
        INSERT INTO entral.migration_fingerprints (
          release_id, phase, organization_id, business_id, environment,
          actor_type, actor_id, idempotency_key, verification_state,
          evidence_references, migration_name, checksum_sha256, applied_at,
          verified_at, recovery_status
        ) VALUES (
          ${recorded.release_id}::uuid,
          195,
          NULL,
          NULL,
          'production',
          'SERVICE',
          ${ownerIdentity[0]!.roleName},
          ${`phase195-wrong-migration-${suffix}`},
          'VERIFIED',
          '[]'::jsonb,
          '20260726190000_wrong_phase_195_migration',
          ${"a".repeat(64)},
          ${migrationRows[0]!.finishedAt},
          ${releaseManifest.migration.checked_at}::timestamptz,
          'FORWARD_RECOVERY_VERIFIED'
        )
      `).rejects.toThrow(/migration_fingerprints_phase_195_name_check/i);
      await expect(owner.$transaction(async (transaction) => {
        const invalidReleases = await transaction.$queryRaw<{ id: string }[]>`
          INSERT INTO entral.canonical_releases (
            phase, organization_id, business_id, environment,
            actor_type, actor_id, idempotency_key, verification_state,
            evidence_references, repository, git_commit_sha, release_tag,
            release_status, accepted_at, rollback_status
          ) VALUES (
            196,
            NULL,
            NULL,
            'production',
            'SERVICE',
            ${ownerIdentity[0]!.roleName},
            ${`phase196-invalid-timing-${suffix}`},
            'VERIFIED',
            '[]'::jsonb,
            'entral/entral',
            ${releaseCommit},
            'phase-196-invalid-timing',
            'DEPLOYED',
            ${observedAt(-600_000)}::timestamptz,
            'AVAILABLE'
          )
          RETURNING id
        `;
        await transaction.$executeRaw`
          INSERT INTO entral.migration_fingerprints (
            release_id, phase, organization_id, business_id, environment,
            actor_type, actor_id, idempotency_key, verification_state,
            evidence_references, migration_name, checksum_sha256, applied_at,
            verified_at, recovery_status
          ) VALUES (
            ${invalidReleases[0]!.id}::uuid,
            196,
            NULL,
            NULL,
            'production',
            'SERVICE',
            ${ownerIdentity[0]!.roleName},
            ${`phase196-migration-invalid-timing-${suffix}`},
            'VERIFIED',
            '[]'::jsonb,
            '20260726190000_phase_196_invalid_timing',
            ${"a".repeat(64)},
            ${observedAt(-60_000)}::timestamptz,
            ${observedAt(-120_000)}::timestamptz,
            'FORWARD_RECOVERY_VERIFIED'
          )
        `;
      })).rejects.toThrow(/migration_fingerprints_readback_timing_check/i);
      await expect(owner.$executeRaw`
        UPDATE entral.canonical_releases
        SET evidence_references = evidence_references
        WHERE id = ${recorded.release_id}::uuid
      `).rejects.toThrow(/release evidence is immutable after insertion/i);
      await expect(owner.$executeRaw`
        DELETE FROM entral.phase_gate_records
        WHERE id = ${recorded.phase_gate_id}::uuid
      `).rejects.toThrow(/release evidence is immutable after insertion/i);
      await expect(owner.$executeRaw`
        TRUNCATE entral.phase_gate_records
      `).rejects.toThrow(/release evidence is immutable after insertion/i);

      const releaseEvidence = await new ReleaseEvidenceService(api).readPhase(
        195,
        {
          actionReason: "Read Phase 195 verified release evidence.",
          authSubject: humanSubject,
          correlationId: randomUUID()
        }
      );
      expect(releaseEvidence).toMatchObject({
        blockers: [],
        complete: true,
        phase: 195
      });
      expect(releaseEvidence.runtime_modes.map((record) => record.process_role))
        .toEqual(["API", "WORKER"]);
      const releaseEventRows = await owner.$queryRaw<{ eventType: string }[]>`
        SELECT event_type AS "eventType"
        FROM entral.canonical_events
        WHERE event_type LIKE 'canonical.%'
        ORDER BY sequence_number
      `;
      expect(releaseEventRows.map((row) => row.eventType)).toEqual(
        expect.arrayContaining([
          "canonical.release.verified",
          "canonical.migration.verified",
          "canonical.deployment.verified",
          "canonical.phase_gate.closed"
        ])
      );
    } finally {
      await Promise.allSettled([
        api?.$disconnect(),
        worker?.$disconnect(),
        verifier?.$disconnect(),
        owner?.$disconnect()
      ]);
      await admin.$executeRawUnsafe(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity ` +
        `WHERE datname = '${databaseName}' AND pid <> pg_backend_pid()`
      ).catch(() => undefined);
      await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}"`)
        .catch(() => undefined);
      for (const role of [apiRole, workerRole, verifierRole]) {
        await admin.$executeRawUnsafe(`DROP ROLE IF EXISTS "${role}"`)
          .catch(() => undefined);
      }
      await admin.$disconnect();
    }
  }, 120_000);
});
