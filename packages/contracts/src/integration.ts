import type { ContextScope, JsonValue, VerificationResult } from "./domain.js";
import {
  ContractError,
  assertIsoDate,
  assertNonEmptyString,
  assertRecord,
  assertUuid
} from "./validation.js";

export const INTEGRATION_STAGES = ["CATALOGUED", "AUTHORIZED", "BUILT", "LIVE_TESTED", "ACTIVE", "RETIRED"] as const;
export type IntegrationStage = (typeof INTEGRATION_STAGES)[number];
export type AuthMethod = "OAUTH2" | "API_KEY" | "HMAC" | "BASIC" | "JWT" | "SERVICE_ACCOUNT" | "CUSTOM";
const AUTH_METHODS: readonly AuthMethod[] = ["OAUTH2", "API_KEY", "HMAC", "BASIC", "JWT", "SERVICE_ACCOUNT", "CUSTOM"];
const PROVIDER_CODE_RE = /^[a-z0-9][a-z0-9._-]+$/;
const CAPABILITY_CODE_RE = /^[A-Z][A-Z0-9_]+$/;

export interface IntegrationRegistryRecord {
  readonly integration_id: string;
  readonly provider_code: string;
  readonly provider_name: string;
  readonly provider_api_version: string | null;
  readonly capability_codes: readonly string[];
  readonly official_documentation_url: string;
  readonly stage: IntegrationStage;
  readonly adapter_version: string | null;
  readonly auth_methods: readonly AuthMethod[];
  readonly credential_reference_id: string | null;
  readonly owning_business_id: string | null;
  readonly granted_operation_codes: readonly string[];
  readonly live_tested_at: string | null;
  readonly active_at: string | null;
  readonly evidence_ids: readonly string[];
  readonly disabled_reason: string | null;
}

export interface IntegrationExecutionRequirement {
  readonly provider_code: string;
  readonly provider_api_version: string;
  readonly adapter_version: string;
  readonly credential_reference_id: string;
  readonly owning_business_id: string;
  readonly operation_code: string;
}

export interface ToolExecutionContext {
  readonly execution_id: string;
  readonly mission_id: string;
  readonly soldier_id: string;
  readonly commander_id: string;
  readonly business_id: string;
  readonly scope: ContextScope;
  readonly idempotency_key: string;
  readonly deadline_at: string;
  readonly credential_reference_id: string;
}

export interface ToolExecutionRequest<TInput extends JsonValue = JsonValue> {
  readonly operation_code: string;
  readonly input: TInput;
  readonly context: ToolExecutionContext;
}

export interface ToolExecutionResponse<TOutput extends JsonValue = JsonValue> {
  readonly execution_id: string;
  readonly provider_request_id: string | null;
  readonly output: TOutput;
  readonly evidence_ids: readonly string[];
  readonly verification: readonly VerificationResult[];
  readonly rate_limit_state: JsonValue;
  readonly completed_at: string;
}

export interface ProductionToolAdapter {
  readonly provider_code: string;
  readonly provider_api_version: string;
  readonly adapter_version: string;
  readonly operation_codes: readonly string[];
  execute(request: ToolExecutionRequest): Promise<ToolExecutionResponse>;
  verify(operationCode: string, response: ToolExecutionResponse): Promise<readonly VerificationResult[]>;
}

function assertUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new ContractError("DUPLICATE_INTEGRATION_VALUE", `${field} must not contain duplicates`);
  }
}

export function assertIntegrationRegistryRecord(record: IntegrationRegistryRecord): void {
  assertRecord(record, "integration");
  assertUuid(record.integration_id, "integration_id");
  assertNonEmptyString(record.provider_code, "provider_code", 100);
  if (!PROVIDER_CODE_RE.test(record.provider_code)) {
    throw new ContractError("INVALID_PROVIDER_CODE", "provider_code must use canonical lowercase code syntax");
  }
  assertNonEmptyString(record.provider_name, "provider_name", 160);
  if (record.provider_name.trim().length < 2) {
    throw new ContractError("INVALID_PROVIDER_NAME", "provider_name must be at least 2 characters");
  }
  if (!(INTEGRATION_STAGES as readonly string[]).includes(record.stage)) {
    throw new ContractError("INVALID_INTEGRATION_STAGE", `${String(record.stage)} is not a canonical integration stage`);
  }
  try {
    const url = new URL(record.official_documentation_url);
    if (url.protocol !== "https:") throw new Error();
  } catch {
    throw new ContractError("INVALID_DOCUMENTATION_URL", "official_documentation_url must use HTTPS");
  }
  if (record.provider_api_version !== null) assertNonEmptyString(record.provider_api_version, "provider_api_version", 80);
  if (record.adapter_version !== null) assertNonEmptyString(record.adapter_version, "adapter_version", 80);
  if (record.credential_reference_id !== null) assertUuid(record.credential_reference_id, "credential_reference_id");
  if (record.owning_business_id !== null) assertUuid(record.owning_business_id, "owning_business_id");
  if (record.live_tested_at !== null) assertIsoDate(record.live_tested_at, "live_tested_at");
  if (record.active_at !== null) assertIsoDate(record.active_at, "active_at");
  if (!Array.isArray(record.capability_codes)) {
    throw new ContractError("INVALID_CAPABILITIES", "capability_codes must be an array");
  }
  if (record.capability_codes.length === 0) {
    throw new ContractError("INVALID_CAPABILITIES", "capability_codes must contain at least one capability");
  }
  record.capability_codes.forEach((value, index) => {
    assertNonEmptyString(value, `capability_codes[${index}]`, 120);
    if (!CAPABILITY_CODE_RE.test(value)) {
      throw new ContractError("INVALID_CAPABILITY_CODE", `capability_codes[${index}] is not canonical`);
    }
  });
  assertUnique(record.capability_codes, "capability_codes");
  if (!Array.isArray(record.auth_methods)) {
    throw new ContractError("INVALID_AUTH_METHODS", "auth_methods must be an array");
  }
  record.auth_methods.forEach((value, index) => {
    if (!AUTH_METHODS.includes(value)) {
      throw new ContractError("INVALID_AUTH_METHOD", `auth_methods[${index}] is not canonical`);
    }
  });
  assertUnique(record.auth_methods, "auth_methods");
  if (!Array.isArray(record.granted_operation_codes)) {
    throw new ContractError("INVALID_OPERATION_GRANTS", "granted_operation_codes must be an array");
  }
  record.granted_operation_codes.forEach((value, index) => {
    assertNonEmptyString(value, `granted_operation_codes[${index}]`, 160);
  });
  assertUnique(record.granted_operation_codes, "granted_operation_codes");
  if (!Array.isArray(record.evidence_ids)) {
    throw new ContractError("INVALID_ACTIVATION_EVIDENCE", "evidence_ids must be an array");
  }
  record.evidence_ids.forEach((value, index) => assertUuid(value, `evidence_ids[${index}]`));
  assertUnique(record.evidence_ids, "evidence_ids");
  if (record.disabled_reason !== null) {
    assertNonEmptyString(record.disabled_reason, "disabled_reason", 1_000);
  }
  if (record.stage === "ACTIVE" && record.disabled_reason !== null) {
    throw new ContractError("ACTIVE_INTEGRATION_DISABLED", "an ACTIVE integration cannot have disabled_reason");
  }
  if (
    record.stage === "ACTIVE" &&
    (
      record.provider_api_version === null ||
      record.adapter_version === null ||
      record.auth_methods.length === 0 ||
      record.credential_reference_id === null ||
      record.owning_business_id === null ||
      record.granted_operation_codes.length === 0 ||
      record.live_tested_at === null ||
      record.active_at === null ||
      record.evidence_ids.length === 0
    )
  ) {
    throw new ContractError(
      "ACTIVE_INTEGRATION_INCOMPLETE",
      "an ACTIVE integration requires exact versions, auth, owner, credential, grants, timestamps, and evidence"
    );
  }
  if (
    record.stage === "ACTIVE" &&
    record.live_tested_at !== null &&
    record.active_at !== null &&
    Date.parse(record.active_at) < Date.parse(record.live_tested_at)
  ) {
    throw new ContractError("INVALID_ACTIVATION_ORDER", "active_at cannot precede live_tested_at");
  }
}

export function assertExecutableIntegration(
  record: IntegrationRegistryRecord,
  requirement: IntegrationExecutionRequirement
): void {
  assertIntegrationRegistryRecord(record);
  assertRecord(requirement, "integration_requirement");
  assertNonEmptyString(requirement.provider_code, "requirement.provider_code", 100);
  assertNonEmptyString(requirement.provider_api_version, "requirement.provider_api_version", 80);
  assertNonEmptyString(requirement.adapter_version, "requirement.adapter_version", 80);
  assertUuid(requirement.credential_reference_id, "requirement.credential_reference_id");
  assertUuid(requirement.owning_business_id, "requirement.owning_business_id");
  assertNonEmptyString(requirement.operation_code, "requirement.operation_code", 160);
  if (record.stage !== "ACTIVE") {
    throw new ContractError("INTEGRATION_NOT_ACTIVE", `${record.provider_code} is not ACTIVE`);
  }
  if (record.provider_code !== requirement.provider_code) {
    throw new ContractError("PROVIDER_MISMATCH", `expected ${requirement.provider_code}, received ${record.provider_code}`);
  }
  if (record.provider_api_version !== requirement.provider_api_version) {
    throw new ContractError("PROVIDER_API_VERSION", "provider API version does not match the executable adapter");
  }
  if (record.adapter_version !== requirement.adapter_version) {
    throw new ContractError("ADAPTER_VERSION", "adapter version does not match the executable adapter");
  }
  if (record.credential_reference_id !== requirement.credential_reference_id) {
    throw new ContractError("CREDENTIAL_REFERENCE", "credential reference does not match the execution context");
  }
  if (record.owning_business_id !== requirement.owning_business_id) {
    throw new ContractError("OWNING_BUSINESS", "owning business does not match the execution context");
  }
  if (record.live_tested_at === null || record.active_at === null || record.evidence_ids.length === 0) {
    throw new ContractError("ACTIVATION_EVIDENCE", "live test, activation timestamps, and evidence are required");
  }
  if (!record.granted_operation_codes.includes(requirement.operation_code)) {
    throw new ContractError("OPERATION_NOT_GRANTED", `${requirement.operation_code} is not granted`);
  }
}
