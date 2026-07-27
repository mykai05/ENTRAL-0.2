import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  parsePhaseReleaseEvidenceRecordingManifest,
  ReleaseEvidenceRecordingError,
  ReleaseEvidenceRecordingService,
  type PhaseReleaseEvidenceRecordingManifest,
  type PhaseReleaseEvidenceRecordingResult
} from "../services/releaseEvidenceRecording.js";

const MAX_MANIFEST_BYTES = 1_048_576;

export type ReleaseEvidenceRecorderMode = "VALIDATED" | "RECORDED";

export type ReleaseEvidenceRecorderSummary = {
  readonly mode: ReleaseEvidenceRecorderMode;
  readonly phase: number;
  readonly accepted_git_commit_sha: string;
  readonly migration_name: string;
  readonly deployment_roles: readonly string[];
  readonly ci_artifact_count: number;
  readonly idempotent_replay: boolean | null;
  readonly release_id: string | null;
  readonly phase_gate_id: string | null;
};

export class ReleaseEvidenceRecorderCommandError extends Error {
  constructor(
    readonly code:
      | "CLI_ARGUMENTS_FORBIDDEN"
      | "MANIFEST_PATH_REQUIRED"
      | "MANIFEST_TOO_LARGE"
      | "INVALID_MANIFEST_JSON"
      | "INVALID_MANIFEST"
      | "INVALID_WRITE_MODE"
      | "DATABASE_URL_REQUIRED",
    message: string
  ) {
    super(message);
    this.name = "ReleaseEvidenceRecorderCommandError";
  }
}

type RecorderConnection = {
  readonly record: (
    manifest: PhaseReleaseEvidenceRecordingManifest
  ) => Promise<PhaseReleaseEvidenceRecordingResult>;
  readonly disconnect: () => Promise<void>;
};

type ReleaseEvidenceRecorderCommandDependencies = {
  readonly readManifest?: (path: string) => Promise<string>;
  readonly connect?: (databaseUrl: string) => RecorderConnection;
};

function defaultConnection(databaseUrl: string): RecorderConnection {
  const database = new PrismaClient({
    datasources: {
      db: { url: databaseUrl }
    },
    log: []
  });
  const recorder = new ReleaseEvidenceRecordingService(database);
  return {
    record: (manifest) => recorder.record(manifest),
    disconnect: () => database.$disconnect()
  };
}

function parseManifestJson(raw: string): PhaseReleaseEvidenceRecordingManifest {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ReleaseEvidenceRecorderCommandError(
      "INVALID_MANIFEST_JSON",
      "The release-evidence manifest is not valid JSON."
    );
  }
  try {
    return parsePhaseReleaseEvidenceRecordingManifest(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ReleaseEvidenceRecorderCommandError(
        "INVALID_MANIFEST",
        "The release-evidence manifest failed its strict contract."
      );
    }
    throw error;
  }
}

function safeSummary(
  manifest: PhaseReleaseEvidenceRecordingManifest,
  result?: PhaseReleaseEvidenceRecordingResult
): ReleaseEvidenceRecorderSummary {
  return {
    mode: result ? "RECORDED" : "VALIDATED",
    phase: manifest.phase,
    accepted_git_commit_sha: manifest.accepted_git_commit_sha,
    migration_name: manifest.migration.migration_name,
    deployment_roles: manifest.deployments.map(
      (deployment) => deployment.deployment_role
    ),
    ci_artifact_count: manifest.ci.artifacts.length,
    idempotent_replay: result?.idempotent_replay ?? null,
    release_id: result?.release_id ?? null,
    phase_gate_id: result?.phase_gate_id ?? null
  };
}

export async function runReleaseEvidenceRecorderCommand(
  options: {
    readonly argv: readonly string[];
    readonly env: Readonly<Record<string, string | undefined>>;
  },
  dependencies: ReleaseEvidenceRecorderCommandDependencies = {}
): Promise<ReleaseEvidenceRecorderSummary> {
  if (options.argv.length > 0) {
    throw new ReleaseEvidenceRecorderCommandError(
      "CLI_ARGUMENTS_FORBIDDEN",
      "Release-evidence values and credentials are accepted only through protected files and environment variables."
    );
  }

  const manifestPath = options.env.RELEASE_EVIDENCE_MANIFEST_PATH?.trim();
  if (!manifestPath) {
    throw new ReleaseEvidenceRecorderCommandError(
      "MANIFEST_PATH_REQUIRED",
      "RELEASE_EVIDENCE_MANIFEST_PATH is required."
    );
  }
  const manifestText = await (dependencies.readManifest ?? (
    (path: string) => readFile(path, "utf8")
  ))(manifestPath);
  if (Buffer.byteLength(manifestText, "utf8") > MAX_MANIFEST_BYTES) {
    throw new ReleaseEvidenceRecorderCommandError(
      "MANIFEST_TOO_LARGE",
      "The release-evidence manifest exceeds the one-megabyte limit."
    );
  }
  const manifest = parseManifestJson(manifestText);

  const writeMode = options.env.RELEASE_EVIDENCE_WRITE?.trim();
  if (writeMode !== undefined && writeMode !== "" && writeMode !== "0" && writeMode !== "1") {
    throw new ReleaseEvidenceRecorderCommandError(
      "INVALID_WRITE_MODE",
      "RELEASE_EVIDENCE_WRITE must be 1 to record or omitted/0 to validate."
    );
  }
  if (writeMode !== "1") {
    return safeSummary(manifest);
  }

  const databaseUrl = options.env.RELEASE_EVIDENCE_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new ReleaseEvidenceRecorderCommandError(
      "DATABASE_URL_REQUIRED",
      "RELEASE_EVIDENCE_DATABASE_URL is required in write mode."
    );
  }
  const connection = (dependencies.connect ?? defaultConnection)(databaseUrl);
  try {
    return safeSummary(manifest, await connection.record(manifest));
  } finally {
    await connection.disconnect();
  }
}

export function releaseEvidenceRecorderExitCode(error: unknown): number {
  if (
    error instanceof ReleaseEvidenceRecorderCommandError
    || error instanceof ReleaseEvidenceRecordingError
  ) {
    return 2;
  }
  return 1;
}

export function releaseEvidenceRecorderErrorCode(error: unknown): string {
  if (
    error instanceof ReleaseEvidenceRecorderCommandError
    || error instanceof ReleaseEvidenceRecordingError
  ) {
    return error.code;
  }
  return "RELEASE_EVIDENCE_RECORDING_FAILED";
}
