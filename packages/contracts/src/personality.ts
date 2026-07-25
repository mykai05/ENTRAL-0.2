import { ContractError, assertIsoDate, assertNonEmptyString, assertRecord, assertUuid } from "./validation.js";

const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export interface PersonalityProfile {
  readonly personality_id: string;
  readonly version: string;
  readonly display_name: string;
  readonly purpose: string;
  readonly traits: readonly string[];
  readonly response_principles: readonly string[];
  readonly prohibited_tendencies: readonly string[];
  readonly default_detail: "CONCISE" | "BALANCED" | "DEEP";
  readonly warmth: number;
  readonly humor: number;
  readonly assertiveness: number;
  readonly evidence_discipline: number;
}

export interface IntelligenceVersionManifest {
  readonly run_id: string;
  readonly personality_id: string;
  readonly personality_version: string;
  readonly model_profile_id: string;
  readonly prompt_version_id: string;
  readonly doctrine_version_ids: readonly string[];
  readonly context_builder_version: string;
  readonly tool_adapter_versions: Readonly<Record<string, string>>;
  readonly policy_version_ids: readonly string[];
  readonly created_at: string;
}

function assertUnitInterval(value: unknown, field: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new ContractError("INVALID_PERSONALITY_WEIGHT", `${field} must be between 0 and 1`);
  }
}

export function assertPersonalityVersion(version: unknown, field = "version"): asserts version is string {
  if (typeof version !== "string" || !SEMVER_RE.test(version)) {
    throw new ContractError("INVALID_PERSONALITY_VERSION", `${field} must be semantic version text`);
  }
}

export function assertPersonalityProfile(profile: PersonalityProfile): void {
  assertRecord(profile, "personality");
  assertUuid(profile.personality_id, "personality_id");
  assertPersonalityVersion(profile.version);
  assertNonEmptyString(profile.display_name, "display_name", 120);
  assertNonEmptyString(profile.purpose, "purpose", 1_000);
  if (!["CONCISE", "BALANCED", "DEEP"].includes(profile.default_detail)) {
    throw new ContractError("INVALID_PERSONALITY_DETAIL", "default_detail is not canonical");
  }
  for (const [field, values] of [
    ["traits", profile.traits],
    ["response_principles", profile.response_principles],
    ["prohibited_tendencies", profile.prohibited_tendencies]
  ] as const) {
    if (!Array.isArray(values)) throw new ContractError("INVALID_PERSONALITY_LIST", `${field} must be an array`);
    values.forEach((value, index) => assertNonEmptyString(value, `${field}[${index}]`, 500));
  }
  assertUnitInterval(profile.warmth, "warmth");
  assertUnitInterval(profile.humor, "humor");
  assertUnitInterval(profile.assertiveness, "assertiveness");
  assertUnitInterval(profile.evidence_discipline, "evidence_discipline");
}

export function assertIntelligenceVersionManifest(manifest: IntelligenceVersionManifest): void {
  assertRecord(manifest, "manifest");
  assertUuid(manifest.run_id, "run_id");
  assertUuid(manifest.personality_id, "personality_id");
  assertPersonalityVersion(manifest.personality_version, "personality_version");
  assertNonEmptyString(manifest.model_profile_id, "model_profile_id", 160);
  assertNonEmptyString(manifest.prompt_version_id, "prompt_version_id", 160);
  assertNonEmptyString(manifest.context_builder_version, "context_builder_version", 80);
  if (!Array.isArray(manifest.doctrine_version_ids)) {
    throw new ContractError("INVALID_VERSION_LIST", "doctrine_version_ids must be an array");
  }
  manifest.doctrine_version_ids.forEach((value, index) => {
    assertNonEmptyString(value, `doctrine_version_ids[${index}]`, 160);
  });
  if (new Set(manifest.doctrine_version_ids).size !== manifest.doctrine_version_ids.length) {
    throw new ContractError("DUPLICATE_VERSION_ID", "doctrine_version_ids must not contain duplicates");
  }
  assertRecord(manifest.tool_adapter_versions, "tool_adapter_versions");
  for (const [adapter, version] of Object.entries(manifest.tool_adapter_versions)) {
    assertNonEmptyString(adapter, "tool_adapter_versions key", 160);
    assertPersonalityVersion(version, `tool_adapter_versions.${adapter}`);
  }
  if (!Array.isArray(manifest.policy_version_ids)) {
    throw new ContractError("INVALID_VERSION_LIST", "policy_version_ids must be an array");
  }
  manifest.policy_version_ids.forEach((value, index) => {
    assertNonEmptyString(value, `policy_version_ids[${index}]`, 160);
  });
  if (new Set(manifest.policy_version_ids).size !== manifest.policy_version_ids.length) {
    throw new ContractError("DUPLICATE_VERSION_ID", "policy_version_ids must not contain duplicates");
  }
  assertIsoDate(manifest.created_at, "created_at");
}
