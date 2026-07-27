import { describe, expect, it, vi } from "vitest";
import {
  ReleaseEvidenceRecorderCommandError,
  runReleaseEvidenceRecorderCommand
} from "../src/cli/releaseEvidenceRecorder.js";
import {
  parsePhaseReleaseEvidenceRecordingManifest,
  releaseEvidenceChildIdempotencyKey
} from "../src/services/releaseEvidenceRecording.js";

function validManifest() {
  const commit = "b".repeat(40);
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    phase: 195,
    idempotency_key: "phase-195-production-release",
    organization_id: null,
    business_id: null,
    repository: "entral/entral",
    accepted_git_commit_sha: commit,
    release_tag: "phase-195",
    accepted_at: "2026-07-26T01:00:00.000Z",
    migration: {
      migration_name:
        "20260726190000_phase_195_graph_preferences_release_evidence_and_worker_readiness",
      checksum_sha256:
        "d2224f0648920a8be9a9d50561c4139ea3199f11ca953dba2963186c2cdaf1ad",
      readback_content_sha256: "d".repeat(64),
      checked_at: "2026-07-26T01:02:00.000Z"
    },
    deployments: [
      {
        deployment_role: "WORKER",
        service_name: "entral-worker",
        provider: "RAILWAY",
        deployment_id: "railway-worker-phase195",
        deployed_commit_sha: commit,
        public_url: "https://worker.example.test/health",
        deployed_at: "2026-07-26T01:05:00.000Z",
        checked_at: "2026-07-26T01:06:00.000Z",
        source_freshness_seconds: 10,
        readback_content_sha256: "e".repeat(64)
      },
      {
        deployment_role: "FRONTEND",
        service_name: "entral-frontend",
        provider: "VERCEL",
        deployment_id: "vercel-phase195",
        deployed_commit_sha: commit,
        public_url: "https://example.test",
        deployed_at: "2026-07-26T01:03:00.000Z",
        checked_at: "2026-07-26T01:04:00.000Z",
        source_freshness_seconds: 10,
        readback_content_sha256: "f".repeat(64)
      },
      {
        deployment_role: "API",
        service_name: "entral-api",
        provider: "RAILWAY",
        deployment_id: "railway-api-phase195",
        deployed_commit_sha: commit,
        public_url: "https://api.example.test/health",
        deployed_at: "2026-07-26T01:03:00.000Z",
        checked_at: "2026-07-26T01:04:00.000Z",
        source_freshness_seconds: 10,
        readback_content_sha256: "1".repeat(64)
      }
    ],
    ci: {
      provider: "GITHUB_ACTIONS",
      repository: "entral/entral",
      workflow: ".github/workflows/ci-cd.yml",
      git_commit_sha: commit,
      run_id: "195000",
      run_url: "https://github.com/entral/entral/actions/runs/195000",
      result: "SUCCESS",
      checked_at: "2026-07-26T01:07:00.000Z",
      run_content_sha256: "2".repeat(64),
      artifacts: [
        {
          artifact_id: "phase195-contracts",
          content_sha256: "3".repeat(64)
        }
      ]
    },
    authenticated_smoke: {
      receipt_id: "phase195-member-smoke",
      target_url: "https://example.test/member/graph",
      status: "PASSED",
      checked_at: "2026-07-26T01:08:00.000Z",
      content_sha256: "4".repeat(64)
    },
    rollback: {
      status: "AVAILABLE",
      strategy: "RESTORE",
      recovery_reference: "receipt:phase195-restore-verification",
      verified_at: "2026-07-26T01:09:00.000Z",
      content_sha256: "5".repeat(64)
    },
    pull_requests: [
      {
        repository: "entral/entral",
        pull_request_number: 194,
        head_commit_sha: "a".repeat(40),
        disposition: "SUPERSEDED",
        rationale:
          "Superseded evidence retains its actual historical head.",
        decided_at: "2026-07-26T00:58:00.000Z",
        receipt_content_sha256: "9".repeat(64)
      },
      {
        repository: "entral/entral",
        pull_request_number: 195,
        head_commit_sha: commit,
        disposition: "MERGED",
        rationale: "Merged and reconciled to the accepted release commit.",
        decided_at: "2026-07-26T00:59:00.000Z",
        receipt_content_sha256: "6".repeat(64)
      }
    ],
    runtime_modes: [
      {
        service_name: "entral-worker",
        process_role: "WORKER",
        observed_commit_sha: commit,
        observed_at: "2026-07-26T01:10:00.000Z",
        in_memory_canonical_state_reachable: false,
        deterministic_fallback_reachable: false,
        sample_data_reachable: false,
        evidence_content_sha256: "7".repeat(64)
      },
      {
        service_name: "entral-api",
        process_role: "API",
        observed_commit_sha: commit,
        observed_at: "2026-07-26T01:10:00.000Z",
        in_memory_canonical_state_reachable: false,
        deterministic_fallback_reachable: false,
        sample_data_reachable: false,
        evidence_content_sha256: "8".repeat(64)
      }
    ],
    gate_id: "phase-195-production",
    closed_at: "2026-07-26T01:11:00.000Z",
    remaining_external_boundaries: []
  };
}

describe("Phase 195 immutable release-evidence recorder", () => {
  it("accepts, normalizes, and binds a complete production manifest", () => {
    const parsed = parsePhaseReleaseEvidenceRecordingManifest(validManifest());

    expect(parsed.deployments.map((deployment) => deployment.deployment_role))
      .toEqual(["API", "FRONTEND", "WORKER"]);
    expect(parsed.runtime_modes.map((runtime) => runtime.process_role))
      .toEqual(["API", "WORKER"]);
    expect(parsed.migration.checked_at).toBe("2026-07-26T01:02:00.000Z");
    expect(parsed.remaining_external_boundaries).toEqual([]);
  });

  it.each([
    ["wrong Phase 195 migration", (manifest: ReturnType<typeof validManifest>) => {
      manifest.migration.migration_name = "20260726190000_wrong_phase_195_migration";
    }],
    ["missing migration readback timestamp", (manifest: ReturnType<typeof validManifest>) => {
      delete (manifest.migration as { checked_at?: string }).checked_at;
    }],
    ["migration readback after gate closure", (manifest: ReturnType<typeof validManifest>) => {
      manifest.migration.checked_at = "2026-07-26T01:12:00.000Z";
    }],
    ["deployment SHA drift", (manifest: ReturnType<typeof validManifest>) => {
      manifest.deployments[0]!.deployed_commit_sha = "a".repeat(40);
    }],
    ["CI repository drift", (manifest: ReturnType<typeof validManifest>) => {
      manifest.ci.repository = "other/entral";
    }],
    ["CI accepted commit drift", (manifest: ReturnType<typeof validManifest>) => {
      manifest.ci.git_commit_sha = "a".repeat(40);
    }],
    ["wrong Phase 195 CI workflow", (manifest: ReturnType<typeof validManifest>) => {
      manifest.ci.workflow = ".github/workflows/other.yml";
    }],
    ["CI run URL repository drift", (manifest: ReturnType<typeof validManifest>) => {
      manifest.ci.run_url =
        "https://github.com/other/entral/actions/runs/195000";
    }],
    ["CI run URL run ID drift", (manifest: ReturnType<typeof validManifest>) => {
      manifest.ci.run_url =
        "https://github.com/entral/entral/actions/runs/195001";
    }],
    ["CI run URL trailing slash", (manifest: ReturnType<typeof validManifest>) => {
      manifest.ci.run_url =
        "https://github.com/entral/entral/actions/runs/195000/";
    }],
    ["missing frontend deployment", (manifest: ReturnType<typeof validManifest>) => {
      manifest.deployments[1] = { ...manifest.deployments[0]! };
    }],
    ["unsafe runtime fallback", (manifest: ReturnType<typeof validManifest>) => {
      manifest.runtime_modes[0]!.deterministic_fallback_reachable = true;
    }],
    ["non-HTTPS smoke", (manifest: ReturnType<typeof validManifest>) => {
      manifest.authenticated_smoke.target_url = "http://example.test/member/graph";
    }],
    ["smoke origin different from frontend", (manifest: ReturnType<typeof validManifest>) => {
      manifest.authenticated_smoke.target_url =
        "https://other.example.test/member/graph";
    }],
    ["remaining external boundary", (manifest: ReturnType<typeof validManifest>) => {
      manifest.remaining_external_boundaries = ["production smoke pending"];
    }],
    ["forward-only recovery without a restore receipt", (
      manifest: ReturnType<typeof validManifest>
    ) => {
      Object.assign(manifest.rollback, { strategy: "FORWARD_RECOVERY" });
    }],
    ["runtime receipt after gate closure", (manifest: ReturnType<typeof validManifest>) => {
      manifest.runtime_modes[0]!.observed_at = "2026-07-26T01:12:00.000Z";
    }],
    ["missing final acceptance pull request", (manifest: ReturnType<typeof validManifest>) => {
      manifest.pull_requests[1]!.head_commit_sha = "d".repeat(40);
    }],
    ["non-merged pull request reusing accepted SHA", (
      manifest: ReturnType<typeof validManifest>
    ) => {
      manifest.pull_requests[0]!.head_commit_sha = manifest.accepted_git_commit_sha;
    }],
    ["accepted pull request from another repository", (
      manifest: ReturnType<typeof validManifest>
    ) => {
      manifest.pull_requests[1]!.repository = "other/entral";
    }],
    ["API runtime service different from API deployment", (
      manifest: ReturnType<typeof validManifest>
    ) => {
      manifest.runtime_modes[1]!.service_name = "other-api";
    }],
    ["worker runtime service different from worker deployment", (
      manifest: ReturnType<typeof validManifest>
    ) => {
      manifest.runtime_modes[0]!.service_name = "other-worker";
    }],
    ["unknown secret-shaped field", (manifest: ReturnType<typeof validManifest>) => {
      Object.assign(manifest, { database_password: "must-not-be-accepted" });
    }]
  ])("rejects %s", (_label, mutate) => {
    const manifest = validManifest();
    mutate(manifest);
    expect(() => parsePhaseReleaseEvidenceRecordingManifest(manifest)).toThrow();
  });

  it("derives deterministic, scope-specific child idempotency keys", () => {
    const first = releaseEvidenceChildIdempotencyKey(
      "phase-195-production-release",
      "runtime:API"
    );
    expect(first).toBe(releaseEvidenceChildIdempotencyKey(
      "phase-195-production-release",
      "runtime:API"
    ));
    expect(first).not.toBe(releaseEvidenceChildIdempotencyKey(
      "phase-195-production-release",
      "runtime:WORKER"
    ));
    expect(first).toMatch(/^phase-release:[a-f0-9]{48}$/);
  });

  it("validates without opening a database connection by default", async () => {
    const connect = vi.fn();
    const summary = await runReleaseEvidenceRecorderCommand(
      {
        argv: [],
        env: { RELEASE_EVIDENCE_MANIFEST_PATH: "protected-manifest.json" }
      },
      {
        connect,
        readManifest: async () => JSON.stringify(validManifest())
      }
    );

    expect(summary).toMatchObject({
      mode: "VALIDATED",
      phase: 195,
      idempotent_replay: null
    });
    expect(connect).not.toHaveBeenCalled();
  });

  it("records through an injected connection without exposing its database URL", async () => {
    const databaseUrl = "postgresql://secret-user:secret-password@example.test/entral";
    const disconnect = vi.fn(async () => undefined);
    const record = vi.fn(async () => ({
      idempotent_replay: true,
      release_id: "423e4567-e89b-42d3-a456-426614174000",
      phase_gate_id: "923e4567-e89b-42d3-a456-426614174000",
      evidence: {} as never
    }));
    const connect = vi.fn(() => ({ disconnect, record }));
    const summary = await runReleaseEvidenceRecorderCommand(
      {
        argv: [],
        env: {
          RELEASE_EVIDENCE_MANIFEST_PATH: "protected-manifest.json",
          RELEASE_EVIDENCE_DATABASE_URL: databaseUrl,
          RELEASE_EVIDENCE_WRITE: "1"
        }
      },
      {
        connect,
        readManifest: async () => JSON.stringify(validManifest())
      }
    );

    expect(connect).toHaveBeenCalledWith(databaseUrl);
    expect(record).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(JSON.stringify(summary)).not.toContain("secret-password");
    expect(summary.mode).toBe("RECORDED");
    expect(summary.idempotent_replay).toBe(true);
  });

  it("rejects positional arguments and write mode without a dedicated database URL", async () => {
    await expect(runReleaseEvidenceRecorderCommand(
      {
        argv: ["postgresql://must-not-be-accepted"],
        env: { RELEASE_EVIDENCE_MANIFEST_PATH: "protected-manifest.json" }
      },
      { readManifest: async () => JSON.stringify(validManifest()) }
    )).rejects.toMatchObject<Partial<ReleaseEvidenceRecorderCommandError>>({
      code: "CLI_ARGUMENTS_FORBIDDEN"
    });

    await expect(runReleaseEvidenceRecorderCommand(
      {
        argv: [],
        env: {
          RELEASE_EVIDENCE_MANIFEST_PATH: "protected-manifest.json",
          RELEASE_EVIDENCE_WRITE: "1"
        }
      },
      { readManifest: async () => JSON.stringify(validManifest()) }
    )).rejects.toMatchObject<Partial<ReleaseEvidenceRecorderCommandError>>({
      code: "DATABASE_URL_REQUIRED"
    });
  });
});
