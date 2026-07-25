import {
  ContractError,
  assertExecutableIntegration,
  assertIntegrationRegistryRecord,
  type IntegrationExecutionRequirement,
  type IntegrationRegistryRecord
} from "@entral/contracts";

export type ProviderExecutionAuthorization = {
  readonly record: IntegrationRegistryRecord;
  readonly requirement: IntegrationExecutionRequirement;
};

export function parseIntegrationRegistry(
  source: string | undefined = process.env.INTEGRATION_REGISTRY_JSON
): IntegrationRegistryRecord[] {
  if (!source) return [];

  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new ContractError("INTEGRATION_REGISTRY_JSON", "INTEGRATION_REGISTRY_JSON must contain valid JSON");
  }
  if (!Array.isArray(value)) {
    throw new ContractError("INTEGRATION_REGISTRY_JSON", "INTEGRATION_REGISTRY_JSON must contain an array");
  }

  const records = value as IntegrationRegistryRecord[];
  const ids = new Set<string>();
  for (const record of records) {
    assertIntegrationRegistryRecord(record);
    if (ids.has(record.integration_id)) {
      throw new ContractError("DUPLICATE_INTEGRATION_ID", `Duplicate integration_id ${record.integration_id}`);
    }
    ids.add(record.integration_id);
  }
  return records;
}

export function getProviderExecutionAuthorization(
  providerCode: string,
  operationCode: string,
  records = parseIntegrationRegistry()
): ProviderExecutionAuthorization {
  const matches = records.filter((record) => record.provider_code === providerCode);
  if (matches.length === 0) {
    throw new ContractError("INTEGRATION_NOT_REGISTERED", `${providerCode} has no integration registry record`);
  }
  if (matches.length > 1) {
    throw new ContractError(
      "INTEGRATION_OWNER_REQUIRED",
      `${providerCode} has multiple owner records; an exact owning business record is required`
    );
  }

  const record = matches[0]!;
  if (record.stage !== "ACTIVE") {
    throw new ContractError("INTEGRATION_NOT_ACTIVE", `${providerCode} is not ACTIVE`);
  }
  if (
    record.provider_api_version === null ||
    record.adapter_version === null ||
    record.credential_reference_id === null ||
    record.owning_business_id === null
  ) {
    throw new ContractError(
      "INTEGRATION_EXECUTION_CONTEXT",
      `${providerCode} is missing an exact API version, adapter, credential reference, or owning business`
    );
  }

  const requirement: IntegrationExecutionRequirement = {
    provider_code: providerCode,
    provider_api_version: record.provider_api_version,
    adapter_version: record.adapter_version,
    credential_reference_id: record.credential_reference_id,
    owning_business_id: record.owning_business_id,
    operation_code: operationCode
  };
  assertExecutableIntegration(record, requirement);
  return { record, requirement };
}
