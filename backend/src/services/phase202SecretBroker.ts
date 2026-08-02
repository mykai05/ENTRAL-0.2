import { createHmac, randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import {
  assertSecretTransitionReceipt,
  type SecretTransitionReceipt
} from "@entral/contracts";
import { prisma, withPersonalSession, withTenantSession } from "../db.js";
import { env } from "../env.js";
import {
  parseSecretEnvelope,
  secretEnvelopeMetadata,
  stringifySecretEnvelope,
  type SecretEnvelopeContext
} from "./secureJson.js";

export type SecretDeploymentEnvironment = "DEVELOPMENT" | "STAGING" | "PRODUCTION";

export type SecretBrokerTenantPrincipal = (
  | { authSubject: string; serviceAppUserId?: never }
  | { authSubject?: never; serviceAppUserId: string }
) & {
  tenantId: string;
  requestId: string;
};

export type SecretReferenceDescriptor = {
  id: string;
  organizationId: string;
  tenantId: string;
  businessId: string | null;
  provider: string;
  purpose: string;
  environment: SecretDeploymentEnvironment;
  keyVersion: string;
  lastFour: string | null;
  version: number;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PersonalSecretReferenceDescriptor = {
  id: string;
  actorId: string;
  provider: string;
  purpose: string;
  environment: SecretDeploymentEnvironment;
  keyVersion: string;
  lastFour: string | null;
  version: number;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateSecretReferenceInput = SecretBrokerTenantPrincipal & {
  businessId?: string | null;
  provider: string;
  purpose: string;
  environment: SecretDeploymentEnvironment;
  secretValue: unknown;
  lastFour?: string | null;
  idempotencyKey: string;
};

export type ReadSecretValueInput = SecretBrokerTenantPrincipal & {
  secretReferenceId: string;
  accessPurpose: string;
  expectedProvider?: string;
  expectedPurpose?: string;
};

export type RotateSecretReferenceInput = SecretBrokerTenantPrincipal & {
  secretReferenceId: string;
  secretValue: unknown;
  rotationPurpose: string;
  lastFour?: string | null;
  idempotencyKey: string;
};

export type RevokeSecretReferenceInput = SecretBrokerTenantPrincipal & {
  secretReferenceId: string;
  revocationPurpose: string;
  idempotencyKey: string;
};

export type ListSecretReferencesInput = SecretBrokerTenantPrincipal & {
  businessId?: string | null;
  provider?: string;
  purpose?: string;
  includeRevoked?: boolean;
};

export type CreatePersonalSecretReferenceInput = {
  authSubject: string;
  requestId: string;
  provider: string;
  purpose: string;
  environment: SecretDeploymentEnvironment;
  secretValue: unknown;
  lastFour?: string | null;
};

export type ReadPersonalSecretValueInput = {
  authSubject: string;
  requestId: string;
  secretReferenceId: string;
  accessPurpose: string;
};

export type ReadPersonalSecretValueInTransactionInput = Omit<ReadPersonalSecretValueInput, "authSubject">;

export type RevokePersonalSecretReferenceInput = {
  authSubject: string;
  requestId: string;
  secretReferenceId: string;
  revocationPurpose: string;
};

export type SecretValueRead<T> = {
  descriptor: SecretReferenceDescriptor;
  value: T;
};

export type PersonalSecretValueRead<T> = {
  descriptor: PersonalSecretReferenceDescriptor;
  value: T;
};

export class Phase202SecretBrokerError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "Phase202SecretBrokerError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

type SecretReferenceRow = SecretReferenceDescriptor & {
  encryptedValue: string;
  createdByActorId: string;
};

type PersonalSecretReferenceRow = PersonalSecretReferenceDescriptor & {
  encryptedValue: string;
};

export type SecretBrokerTransaction = {
  secretReference: {
    create(args: unknown): Promise<SecretReferenceRow>;
    findFirst(args: unknown): Promise<SecretReferenceRow | null>;
    findMany(args: unknown): Promise<SecretReferenceDescriptor[]>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  secretAccessAudit: {
    create(args: unknown): Promise<unknown>;
  };
  secretMutationReceipt: {
    create(args: unknown): Promise<unknown>;
    findUnique(args: unknown): Promise<{
      actorId: string;
      idempotencyKey: string;
      requestFingerprint: string;
      resultPayload: Prisma.JsonValue;
      secretReferenceId: string;
      transition: string;
    } | null>;
  };
  identityActor: {
    findUnique(args: unknown): Promise<{
      actorType: string;
      agentId: string | null;
      humanUserId: string | null;
      id: string;
      serviceSubject: string | null;
    } | null>;
  };
  tenantBoundary: {
    findUnique(args: unknown): Promise<{
      dataResidency: string;
      environment: string;
      id: string;
      organizationId: string;
    } | null>;
  };
  personalSecretReference: {
    create(args: unknown): Promise<PersonalSecretReferenceRow>;
    findFirst(args: unknown): Promise<PersonalSecretReferenceRow | null>;
    updateMany(args: unknown): Promise<{ count: number }>;
  };
  personalSecretAccessAudit: {
    create(args: unknown): Promise<unknown>;
  };
};

export type SecretBrokerTenantIdentity = {
  actorId: string;
  appUserId?: string;
  organizationId: string;
  role?: string;
  tenantId: string;
};

export type SecretMutationResult = {
  descriptor: SecretReferenceDescriptor;
  receipt: SecretTransitionReceipt;
  replayed: boolean;
};

export type CreateSecretReferenceInTransactionInput = Omit<CreateSecretReferenceInput, "authSubject" | "serviceAppUserId" | "tenantId" | "requestId"> & {
  requestId: string;
  secretReferenceId?: string;
};

export type ReadSecretValueInTransactionInput = Omit<ReadSecretValueInput, "authSubject" | "serviceAppUserId" | "tenantId" | "requestId"> & {
  requestId: string;
};

export type RotateSecretReferenceInTransactionInput = Omit<RotateSecretReferenceInput, "authSubject" | "serviceAppUserId" | "tenantId" | "requestId"> & {
  requestId: string;
};

export type RevokeSecretReferenceInTransactionInput = Omit<RevokeSecretReferenceInput, "authSubject" | "serviceAppUserId" | "tenantId" | "requestId"> & {
  requestId: string;
};

export type PersonalSecretTransactionIdentity = { actorId: string };

export type CreatePersonalSecretReferenceInTransactionInput = Omit<CreatePersonalSecretReferenceInput, "authSubject"> & {
  secretReferenceId?: string;
};

export type RevokePersonalSecretReferenceInTransactionInput = Omit<RevokePersonalSecretReferenceInput, "authSubject">;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeNamePattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/;
const environments = new Set<SecretDeploymentEnvironment>(["DEVELOPMENT", "STAGING", "PRODUCTION"]);
const descriptorSelect = {
  id: true,
  organizationId: true,
  tenantId: true,
  businessId: true,
  provider: true,
  purpose: true,
  environment: true,
  keyVersion: true,
  lastFour: true,
  version: true,
  rotatedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true
} as const;

function invalid(message: string): never {
  throw new Phase202SecretBrokerError("SECRET_BROKER_INPUT_INVALID", message, 400);
}

function assertUuid(value: string | null | undefined, field: string, nullable = false) {
  if (nullable && (value === null || value === undefined)) return;
  if (typeof value !== "string" || !uuidPattern.test(value)) invalid(`${field} must be a UUID.`);
}

function assertBoundedText(value: string, field: string, maximum = 500) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum || /[\u0000-\u001f\u007f]/.test(value)) {
    invalid(`${field} is invalid.`);
  }
}

function assertProvider(value: string) {
  if (!safeNamePattern.test(value)) invalid("provider is invalid.");
}

function assertLastFour(value: string | null | undefined) {
  if (value === null || value === undefined) return;
  if (!/^[A-Za-z0-9._-]{4}$/.test(value)) invalid("lastFour is invalid.");
}

function assertIdempotencyKey(value: string) {
  if (typeof value !== "string" || value.length < 12 || value.length > 255 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Phase202SecretBrokerError("IDEMPOTENCY_KEY_INVALID", "A bounded idempotency key is required.", 400);
  }
}

function assertEnvironment(value: SecretDeploymentEnvironment) {
  if (!environments.has(value)) invalid("environment is invalid.");
}

function assertSecretValue(value: unknown) {
  if (value === undefined) invalid("secretValue is required.");
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(value);
  } catch {
    invalid("secretValue must be JSON serializable.");
  }
  if (typeof serialized !== "string" || serialized.length === 0 || serialized.length > 262_144) {
    invalid("secretValue exceeds the broker boundary.");
  }
}

function validatePrincipal(input: SecretBrokerTenantPrincipal) {
  assertUuid(input.tenantId, "tenantId");
  assertBoundedText(input.requestId, "requestId", 255);
  if (typeof input.authSubject === "string") {
    assertBoundedText(input.authSubject, "authSubject", 255);
    return;
  }
  if (typeof input.serviceAppUserId === "string") {
    assertUuid(input.serviceAppUserId, "serviceAppUserId");
    return;
  }
  invalid("A human or service principal is required.");
}

function tenantSessionContext(input: SecretBrokerTenantPrincipal, actionReason: string) {
  return typeof input.authSubject === "string"
    ? { authSubject: input.authSubject, tenantId: input.tenantId, requestId: input.requestId, actionReason }
    : { serviceAppUserId: input.serviceAppUserId, tenantId: input.tenantId, requestId: input.requestId, actionReason };
}

function toDescriptor(row: SecretReferenceDescriptor): SecretReferenceDescriptor {
  return {
    id: row.id,
    organizationId: row.organizationId,
    tenantId: row.tenantId,
    businessId: row.businessId,
    provider: row.provider,
    purpose: row.purpose,
    environment: row.environment,
    keyVersion: row.keyVersion,
    lastFour: row.lastFour,
    version: row.version,
    rotatedAt: row.rotatedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function contractDescriptor(row: SecretReferenceDescriptor) {
  return {
    secret_reference_id: row.id,
    tenant_id: row.tenantId,
    organization_id: row.organizationId,
    business_id: row.businessId,
    provider: row.provider,
    purpose: row.purpose,
    environment: row.environment,
    key_version: row.keyVersion,
    version: row.version,
    last_four: row.lastFour,
    rotated_at: row.rotatedAt?.toISOString() ?? null,
    revoked_at: row.revokedAt?.toISOString() ?? null,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString()
  } as const;
}

function descriptorFromContract(value: SecretTransitionReceipt["descriptor"]): SecretReferenceDescriptor {
  return {
    id: value.secret_reference_id,
    tenantId: value.tenant_id,
    organizationId: value.organization_id,
    businessId: value.business_id,
    provider: value.provider,
    purpose: value.purpose,
    environment: value.environment,
    keyVersion: value.key_version,
    version: value.version,
    lastFour: value.last_four,
    rotatedAt: value.rotated_at ? new Date(value.rotated_at) : null,
    revokedAt: value.revoked_at ? new Date(value.revoked_at) : null,
    createdAt: new Date(value.created_at),
    updatedAt: new Date(value.updated_at)
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}

function keyedMutationFingerprint(value: Record<string, unknown>, secretValue?: unknown) {
  const normalized = secretValue === undefined
    ? value
    : {
      ...value,
      secret_input_hmac: createHmac("sha256", env.JWT_SECRET)
        .update("phase202:secret-input\0")
        .update(JSON.stringify(canonicalize(secretValue)))
        .digest("hex")
    };
  return createHmac("sha256", env.JWT_SECRET)
    .update("phase202:secret-mutation\0")
    .update(JSON.stringify(canonicalize(normalized)))
    .digest("hex");
}

async function makeSecretReceipt(
  transaction: SecretBrokerTransaction,
  identity: SecretBrokerTenantIdentity,
  input: {
    descriptor: SecretReferenceDescriptor;
    id: string;
    idempotencyKey: string;
    occurredAt: Date;
    priorVersion: number;
    requestId: string;
    transition: SecretTransitionReceipt["transition"];
  }
): Promise<SecretTransitionReceipt> {
  const actor = await transaction.identityActor.findUnique({ where: { id: identity.actorId } });
  const boundary = await transaction.tenantBoundary.findUnique({
    where: { id_organizationId: { id: identity.tenantId, organizationId: identity.organizationId } }
  });
  if (!actor || actor.id !== identity.actorId || actor.actorType !== "HUMAN" || !actor.humanUserId) {
    throw fixedBrokerError("SECRET_MUTATION_HUMAN_ACTOR_REQUIRED", "Secret mutation requires an exact Human actor.", 403);
  }
  if (!boundary || boundary.id !== identity.tenantId || boundary.organizationId !== identity.organizationId) {
    throw fixedBrokerError("SECRET_BROKER_SCOPE_MISMATCH", "Secret broker tenant scope could not be verified.", 403);
  }
  const receipt: SecretTransitionReceipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: input.id,
    transition: input.transition,
    ownership: {
      scope_kind: "TENANT",
      organization_id: identity.organizationId,
      tenant_id: identity.tenantId,
      business_id: input.descriptor.businessId,
      environment: input.descriptor.environment,
      data_residency: boundary.dataResidency
    },
    actor: {
      actor_id: actor.id,
      actor_type: "HUMAN",
      human_user_id: actor.humanUserId,
      service_subject: null,
      agent_id: null
    },
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    prior_version: input.priorVersion,
    resulting_version: input.descriptor.version,
    descriptor: contractDescriptor(input.descriptor),
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: input.transition !== "REVOKE",
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: [
      `secret-reference:${input.descriptor.id}:version:${input.descriptor.version}`,
      `tenant:${identity.tenantId}`
    ],
    occurred_at: input.occurredAt.toISOString(),
    release_version: "phase-202"
  };
  assertSecretTransitionReceipt(receipt);
  return receipt;
}

function secretReceiptFromStored(
  stored: NonNullable<Awaited<ReturnType<SecretBrokerTransaction["secretMutationReceipt"]["findUnique"]>>>,
  expected: {
    actorId: string;
    fingerprint: string;
    idempotencyKey: string;
    transition: SecretTransitionReceipt["transition"];
  }
) {
  const value = stored.resultPayload;
  assertSecretTransitionReceipt(value);
  if (stored.actorId !== expected.actorId
    || stored.idempotencyKey !== expected.idempotencyKey
    || stored.requestFingerprint !== expected.fingerprint
    || stored.transition !== expected.transition
    || value.transition !== expected.transition
    || value.actor.actor_id !== expected.actorId
    || value.idempotency_key !== expected.idempotencyKey
    || value.descriptor.secret_reference_id !== stored.secretReferenceId) {
    throw new Phase202SecretBrokerError("IDEMPOTENCY_KEY_REUSED", "The idempotency key was already used for a different secret transition.", 409);
  }
  return value;
}

async function existingSecretReceipt(
  transaction: SecretBrokerTransaction,
  identity: SecretBrokerTenantIdentity,
  idempotencyKey: string,
  fingerprint: string,
  transition: SecretTransitionReceipt["transition"]
) {
  const stored = await transaction.secretMutationReceipt.findUnique({
    where: { tenantId_idempotencyKey: { tenantId: identity.tenantId, idempotencyKey } }
  });
  if (!stored) return null;
  return secretReceiptFromStored(stored, {
    actorId: identity.actorId,
    fingerprint,
    idempotencyKey,
    transition
  });
}

async function persistSecretReceipt(
  transaction: SecretBrokerTransaction,
  identity: SecretBrokerTenantIdentity,
  fingerprint: string,
  receipt: SecretTransitionReceipt
) {
  await transaction.secretMutationReceipt.create({
    data: {
      id: receipt.transition_id,
      secretReferenceId: receipt.descriptor.secret_reference_id,
      organizationId: identity.organizationId,
      tenantId: identity.tenantId,
      businessId: receipt.ownership.business_id,
      actorId: identity.actorId,
      transition: receipt.transition,
      priorVersion: receipt.prior_version,
      resultingVersion: receipt.resulting_version,
      idempotencyKey: receipt.idempotency_key,
      requestFingerprint: fingerprint,
      requestId: receipt.request_id,
      resultPayload: receipt as unknown as Prisma.InputJsonValue,
      releaseVersion: receipt.release_version,
      occurredAt: new Date(receipt.occurred_at)
    }
  });
}

function toPersonalDescriptor(row: PersonalSecretReferenceDescriptor): PersonalSecretReferenceDescriptor {
  return {
    id: row.id,
    actorId: row.actorId,
    provider: row.provider,
    purpose: row.purpose,
    environment: row.environment,
    keyVersion: row.keyVersion,
    lastFour: row.lastFour,
    version: row.version,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function envelopeContext(row: Pick<SecretReferenceRow, "id" | "organizationId" | "tenantId" | "businessId" | "createdByActorId" | "provider" | "purpose" | "environment" | "version">): SecretEnvelopeContext {
  return {
    secretReferenceId: row.id,
    organizationId: row.organizationId,
    tenantId: row.tenantId,
    businessId: row.businessId,
    actorId: row.createdByActorId,
    provider: row.provider,
    purpose: row.purpose,
    environment: row.environment,
    recordVersion: row.version
  };
}

function personalEnvelopeContext(row: Pick<PersonalSecretReferenceRow, "id" | "actorId" | "provider" | "purpose" | "environment" | "version">): SecretEnvelopeContext {
  return {
    secretReferenceId: row.id,
    organizationId: null,
    tenantId: null,
    businessId: null,
    actorId: row.actorId,
    provider: row.provider,
    purpose: row.purpose,
    environment: row.environment,
    recordVersion: row.version
  };
}

function tenantRowMatchesIdentity(
  row: Pick<SecretReferenceRow, "organizationId" | "tenantId">,
  identity: { organizationId: string; tenantId: string }
) {
  return row.organizationId === identity.organizationId && row.tenantId === identity.tenantId;
}

function fixedBrokerError(code: string, message: string, statusCode = 503) {
  return new Phase202SecretBrokerError(code, message, statusCode);
}

function sanitizeOperationError(error: unknown) {
  return error instanceof Phase202SecretBrokerError
    ? error
    : fixedBrokerError("SECRET_BROKER_UNAVAILABLE", "Secret broker operation is unavailable.");
}

async function tenantAudit(
  transaction: SecretBrokerTransaction,
  row: Pick<SecretReferenceRow, "id" | "organizationId" | "tenantId">,
  actorId: string,
  action: string,
  purpose: string,
  outcome: string,
  requestId: string
) {
  await transaction.secretAccessAudit.create({
    data: {
      secretReferenceId: row.id,
      organizationId: row.organizationId,
      tenantId: row.tenantId,
      actorId,
      action,
      purpose,
      outcome,
      requestId
    }
  });
}

async function personalAudit(
  transaction: SecretBrokerTransaction,
  row: Pick<PersonalSecretReferenceRow, "id" | "actorId">,
  action: string,
  purpose: string,
  outcome: string,
  requestId: string
) {
  await transaction.personalSecretAccessAudit.create({
    data: {
      secretReferenceId: row.id,
      actorId: row.actorId,
      action,
      purpose,
      outcome,
      requestId
    }
  });
}

export async function createSecretReferenceInTransaction(
  rawTransaction: Prisma.TransactionClient,
  identity: SecretBrokerTenantIdentity,
  input: CreateSecretReferenceInTransactionInput
): Promise<SecretMutationResult> {
  assertUuid(identity.actorId, "actorId");
  assertUuid(identity.organizationId, "organizationId");
  assertUuid(identity.tenantId, "tenantId");
  assertUuid(input.businessId, "businessId", true);
  assertBoundedText(input.requestId, "requestId", 255);
  assertIdempotencyKey(input.idempotencyKey);
  assertProvider(input.provider);
  assertBoundedText(input.purpose, "purpose");
  assertEnvironment(input.environment);
  assertSecretValue(input.secretValue);
  assertLastFour(input.lastFour);
  if (input.secretReferenceId !== undefined) assertUuid(input.secretReferenceId, "secretReferenceId");
  const transaction = rawTransaction as unknown as SecretBrokerTransaction;
  const fingerprint = keyedMutationFingerprint({
    transition: "CREATE",
    businessId: input.businessId ?? null,
    provider: input.provider,
    purpose: input.purpose,
    environment: input.environment,
    lastFour: input.lastFour ?? null
  }, input.secretValue);
  const replay = await existingSecretReceipt(transaction, identity, input.idempotencyKey, fingerprint, "CREATE");
  if (replay) return { descriptor: descriptorFromContract(replay.descriptor), receipt: replay, replayed: true };
  const id = input.secretReferenceId ?? randomUUID();
  const context: SecretEnvelopeContext = {
    secretReferenceId: id,
    organizationId: identity.organizationId,
    tenantId: identity.tenantId,
    businessId: input.businessId ?? null,
    actorId: identity.actorId,
    provider: input.provider,
    purpose: input.purpose,
    environment: input.environment,
    recordVersion: 1
  };
  let encryptedValue: string;
  try {
    encryptedValue = stringifySecretEnvelope(input.secretValue, context);
  } catch {
    throw fixedBrokerError("SECRET_BROKER_KEY_UNAVAILABLE", "Secret broker encryption is unavailable.");
  }
  const metadata = secretEnvelopeMetadata(encryptedValue);
  const row = await transaction.secretReference.create({
    data: {
      id,
      organizationId: identity.organizationId,
      tenantId: identity.tenantId,
      businessId: input.businessId ?? null,
      provider: input.provider,
      purpose: input.purpose,
      environment: metadata.environment,
      keyVersion: metadata.keyVersion,
      encryptedValue,
      lastFour: input.lastFour ?? null,
      version: 1,
      createdByActorId: identity.actorId
    }
  });
  const descriptor = toDescriptor(row);
  const occurredAt = row.createdAt;
  const receipt = await makeSecretReceipt(transaction, identity, {
    descriptor,
    id: randomUUID(),
    idempotencyKey: input.idempotencyKey,
    occurredAt,
    priorVersion: 0,
    requestId: input.requestId,
    transition: "CREATE"
  });
  await tenantAudit(transaction, row, identity.actorId, "CREATE", input.purpose, "SUCCEEDED", input.requestId);
  await persistSecretReceipt(transaction, identity, fingerprint, receipt);
  return { descriptor, receipt, replayed: false };
}

export async function createSecretReference(input: CreateSecretReferenceInput): Promise<SecretMutationResult> {
  validatePrincipal(input);
  const execute = () => withTenantSession(prisma, tenantSessionContext(input, "secret.reference.create"),
    (transaction, identity) => createSecretReferenceInTransaction(transaction, identity, input),
    { isolationLevel: "Serializable" });
  try {
    return await execute();
  } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2002") {
      try { return await execute(); } catch (replayError) { throw sanitizeOperationError(replayError); }
    }
    throw sanitizeOperationError(error);
  }
}

export async function readSecretValueInTransaction<T>(
  rawTransaction: Prisma.TransactionClient,
  identity: SecretBrokerTenantIdentity,
  input: ReadSecretValueInTransactionInput
): Promise<SecretValueRead<T>> {
  assertUuid(identity.actorId, "actorId");
  assertUuid(identity.organizationId, "organizationId");
  assertUuid(identity.tenantId, "tenantId");
  assertUuid(input.secretReferenceId, "secretReferenceId");
  assertBoundedText(input.requestId, "requestId", 255);
  assertBoundedText(input.accessPurpose, "accessPurpose");
  if (input.expectedProvider !== undefined) assertProvider(input.expectedProvider);
  if (input.expectedPurpose !== undefined) assertBoundedText(input.expectedPurpose, "expectedPurpose");
  const transaction = rawTransaction as unknown as SecretBrokerTransaction;
  const row = await transaction.secretReference.findFirst({
    where: { id: input.secretReferenceId, tenantId: identity.tenantId, organizationId: identity.organizationId }
  });
  if (!row || !tenantRowMatchesIdentity(row, identity)) {
    throw fixedBrokerError("SECRET_REFERENCE_NOT_FOUND", "Secret reference was not found.", 404);
  }
  if ((input.expectedProvider !== undefined && row.provider !== input.expectedProvider)
    || (input.expectedPurpose !== undefined && row.purpose !== input.expectedPurpose)) {
    await tenantAudit(transaction, row, identity.actorId, "READ", input.accessPurpose, "BLOCKED_METADATA_MISMATCH", input.requestId);
    throw fixedBrokerError("SECRET_REFERENCE_METADATA_MISMATCH", "Secret reference metadata does not match the required provider boundary.", 403);
  }
  if (row.revokedAt) {
    await tenantAudit(transaction, row, identity.actorId, "READ", input.accessPurpose, "BLOCKED_REVOKED", input.requestId);
    throw fixedBrokerError("SECRET_REFERENCE_REVOKED", "Secret reference is revoked.", 410);
  }
  try {
    const metadata = secretEnvelopeMetadata(row.encryptedValue);
    if (metadata.keyVersion !== row.keyVersion || metadata.environment !== row.environment) throw new Error("metadata mismatch");
    const value = parseSecretEnvelope<T>(row.encryptedValue, envelopeContext(row));
    await tenantAudit(transaction, row, identity.actorId, "READ", input.accessPurpose, "SUCCEEDED", input.requestId);
    return { descriptor: toDescriptor(row), value };
  } catch (error) {
    if (error instanceof Phase202SecretBrokerError) throw error;
    await tenantAudit(transaction, row, identity.actorId, "READ", input.accessPurpose, "BLOCKED_ENVELOPE_INVALID", input.requestId);
    throw fixedBrokerError("SECRET_ENVELOPE_INVALID", "Secret broker could not authenticate the encrypted value.");
  }
}

export async function readSecretValue<T>(input: ReadSecretValueInput): Promise<SecretValueRead<T>> {
  validatePrincipal(input);
  try {
    return await withTenantSession(prisma, tenantSessionContext(input, "secret.reference.read"),
      (transaction, identity) => readSecretValueInTransaction<T>(transaction, identity, input),
      { isolationLevel: "Serializable" });
  } catch (error) {
    throw sanitizeOperationError(error);
  }
}

export async function rotateSecretReferenceInTransaction(
  rawTransaction: Prisma.TransactionClient,
  identity: SecretBrokerTenantIdentity,
  input: RotateSecretReferenceInTransactionInput
): Promise<SecretMutationResult> {
  assertUuid(identity.actorId, "actorId");
  assertUuid(identity.organizationId, "organizationId");
  assertUuid(identity.tenantId, "tenantId");
  assertUuid(input.secretReferenceId, "secretReferenceId");
  assertBoundedText(input.requestId, "requestId", 255);
  assertIdempotencyKey(input.idempotencyKey);
  assertBoundedText(input.rotationPurpose, "rotationPurpose");
  assertSecretValue(input.secretValue);
  assertLastFour(input.lastFour);
  const transaction = rawTransaction as unknown as SecretBrokerTransaction;
  const fingerprint = keyedMutationFingerprint({
    transition: "ROTATE",
    secretReferenceId: input.secretReferenceId,
    rotationPurpose: input.rotationPurpose,
    lastFour: input.lastFour ?? null
  }, input.secretValue);
  const replay = await existingSecretReceipt(transaction, identity, input.idempotencyKey, fingerprint, "ROTATE");
  if (replay) return { descriptor: descriptorFromContract(replay.descriptor), receipt: replay, replayed: true };
  const row = await transaction.secretReference.findFirst({
    where: { id: input.secretReferenceId, tenantId: identity.tenantId, organizationId: identity.organizationId }
  });
  if (!row || !tenantRowMatchesIdentity(row, identity)) throw fixedBrokerError("SECRET_REFERENCE_NOT_FOUND", "Secret reference was not found.", 404);
  if (row.revokedAt) {
    await tenantAudit(transaction, row, identity.actorId, "ROTATE", input.rotationPurpose, "BLOCKED_REVOKED", input.requestId);
    throw fixedBrokerError("SECRET_REFERENCE_REVOKED", "Secret reference is revoked.", 410);
  }
  try {
    const oldMetadata = secretEnvelopeMetadata(row.encryptedValue);
    if (oldMetadata.keyVersion !== row.keyVersion || oldMetadata.environment !== row.environment) throw new Error("metadata mismatch");
    parseSecretEnvelope<unknown>(row.encryptedValue, envelopeContext(row));
  } catch {
    await tenantAudit(transaction, row, identity.actorId, "ROTATE", input.rotationPurpose, "BLOCKED_OLD_KEY_OR_ENVELOPE_INVALID", input.requestId);
    throw fixedBrokerError("SECRET_ROTATION_OLD_KEY_REQUIRED", "Secret rotation requires the current encrypted value and its key.");
  }
  const nextVersion = row.version + 1;
  const nextContext = { ...envelopeContext(row), recordVersion: nextVersion };
  let encryptedValue: string;
  try {
    encryptedValue = stringifySecretEnvelope(input.secretValue, nextContext);
  } catch {
    await tenantAudit(transaction, row, identity.actorId, "ROTATE", input.rotationPurpose, "BLOCKED_ACTIVE_KEY_UNAVAILABLE", input.requestId);
    throw fixedBrokerError("SECRET_BROKER_KEY_UNAVAILABLE", "Secret broker encryption is unavailable.");
  }
  const metadata = secretEnvelopeMetadata(encryptedValue);
  const rotatedAt = new Date();
  const updated = await transaction.secretReference.updateMany({
    where: { id: row.id, tenantId: row.tenantId, organizationId: row.organizationId, version: row.version, revokedAt: null },
    data: {
      encryptedValue,
      keyVersion: metadata.keyVersion,
      environment: metadata.environment,
      lastFour: input.lastFour === undefined ? row.lastFour : input.lastFour,
      version: nextVersion,
      rotatedAt
    }
  });
  if (updated.count !== 1) {
    await tenantAudit(transaction, row, identity.actorId, "ROTATE", input.rotationPurpose, "BLOCKED_CONFLICT", input.requestId);
    throw fixedBrokerError("SECRET_ROTATION_CONFLICT", "Secret reference changed during rotation.", 409);
  }
  const nextRow: SecretReferenceRow = {
    ...row,
    encryptedValue,
    keyVersion: metadata.keyVersion,
    environment: metadata.environment,
    lastFour: input.lastFour === undefined ? row.lastFour : input.lastFour,
    version: nextVersion,
    rotatedAt,
    updatedAt: rotatedAt
  };
  const descriptor = toDescriptor(nextRow);
  const receipt = await makeSecretReceipt(transaction, identity, {
    descriptor,
    id: randomUUID(),
    idempotencyKey: input.idempotencyKey,
    occurredAt: rotatedAt,
    priorVersion: row.version,
    requestId: input.requestId,
    transition: "ROTATE"
  });
  await tenantAudit(transaction, nextRow, identity.actorId, "ROTATE", input.rotationPurpose, "SUCCEEDED_OLD_KEY_VERIFIED", input.requestId);
  await persistSecretReceipt(transaction, identity, fingerprint, receipt);
  return { descriptor, receipt, replayed: false };
}

export async function rotateSecretReference(input: RotateSecretReferenceInput): Promise<SecretMutationResult> {
  validatePrincipal(input);
  const execute = () => withTenantSession(prisma, tenantSessionContext(input, "secret.reference.rotate"),
    (transaction, identity) => rotateSecretReferenceInTransaction(transaction, identity, input),
    { isolationLevel: "Serializable" });
  try { return await execute(); } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2002") {
      try { return await execute(); } catch (replayError) { throw sanitizeOperationError(replayError); }
    }
    throw sanitizeOperationError(error);
  }
}

export async function revokeSecretReferenceInTransaction(
  rawTransaction: Prisma.TransactionClient,
  identity: SecretBrokerTenantIdentity,
  input: RevokeSecretReferenceInTransactionInput
): Promise<SecretMutationResult> {
  assertUuid(identity.actorId, "actorId");
  assertUuid(identity.organizationId, "organizationId");
  assertUuid(identity.tenantId, "tenantId");
  assertUuid(input.secretReferenceId, "secretReferenceId");
  assertBoundedText(input.requestId, "requestId", 255);
  assertIdempotencyKey(input.idempotencyKey);
  assertBoundedText(input.revocationPurpose, "revocationPurpose");
  const transaction = rawTransaction as unknown as SecretBrokerTransaction;
  const fingerprint = keyedMutationFingerprint({
    transition: "REVOKE",
    secretReferenceId: input.secretReferenceId,
    revocationPurpose: input.revocationPurpose
  });
  const replay = await existingSecretReceipt(transaction, identity, input.idempotencyKey, fingerprint, "REVOKE");
  if (replay) return { descriptor: descriptorFromContract(replay.descriptor), receipt: replay, replayed: true };
  const row = await transaction.secretReference.findFirst({
    where: { id: input.secretReferenceId, tenantId: identity.tenantId, organizationId: identity.organizationId }
  });
  if (!row || !tenantRowMatchesIdentity(row, identity)) throw fixedBrokerError("SECRET_REFERENCE_NOT_FOUND", "Secret reference was not found.", 404);
  if (row.revokedAt) {
    await tenantAudit(transaction, row, identity.actorId, "REVOKE", input.revocationPurpose, "BLOCKED_ALREADY_REVOKED", input.requestId);
    throw fixedBrokerError("SECRET_REFERENCE_REVOKED", "Secret reference is revoked.", 410);
  }
  const revokedAt = new Date();
  const nextVersion = row.version + 1;
  const updated = await transaction.secretReference.updateMany({
    where: { id: row.id, tenantId: row.tenantId, organizationId: row.organizationId, version: row.version, revokedAt: null },
    data: { revokedAt, version: nextVersion }
  });
  if (updated.count !== 1) {
    await tenantAudit(transaction, row, identity.actorId, "REVOKE", input.revocationPurpose, "BLOCKED_CONFLICT", input.requestId);
    throw fixedBrokerError("SECRET_REVOCATION_CONFLICT", "Secret reference changed during revocation.", 409);
  }
  const revokedRow: SecretReferenceRow = { ...row, revokedAt, version: nextVersion, updatedAt: revokedAt };
  const descriptor = toDescriptor(revokedRow);
  const receipt = await makeSecretReceipt(transaction, identity, {
    descriptor,
    id: randomUUID(),
    idempotencyKey: input.idempotencyKey,
    occurredAt: revokedAt,
    priorVersion: row.version,
    requestId: input.requestId,
    transition: "REVOKE"
  });
  await tenantAudit(transaction, revokedRow, identity.actorId, "REVOKE", input.revocationPurpose, "SUCCEEDED", input.requestId);
  await persistSecretReceipt(transaction, identity, fingerprint, receipt);
  return { descriptor, receipt, replayed: false };
}

export async function revokeSecretReference(input: RevokeSecretReferenceInput): Promise<SecretMutationResult> {
  validatePrincipal(input);
  const execute = () => withTenantSession(prisma, tenantSessionContext(input, "secret.reference.revoke"),
    (transaction, identity) => revokeSecretReferenceInTransaction(transaction, identity, input),
    { isolationLevel: "Serializable" });
  try { return await execute(); } catch (error) {
    if ((error as { code?: string } | null)?.code === "P2002") {
      try { return await execute(); } catch (replayError) { throw sanitizeOperationError(replayError); }
    }
    throw sanitizeOperationError(error);
  }
}

export async function listSecretReferences(input: ListSecretReferencesInput): Promise<SecretReferenceDescriptor[]> {
  validatePrincipal(input);
  assertUuid(input.businessId, "businessId", true);
  if (input.provider !== undefined) assertProvider(input.provider);
  if (input.purpose !== undefined) assertBoundedText(input.purpose, "purpose");

  try {
    return await withTenantSession(prisma, tenantSessionContext(input, "secret.reference.list"), async (rawTransaction, identity) => {
      const transaction = rawTransaction as unknown as SecretBrokerTransaction;
      const rows = await transaction.secretReference.findMany({
        where: {
          tenantId: identity.tenantId,
          organizationId: identity.organizationId,
          ...(input.businessId !== undefined ? { businessId: input.businessId } : {}),
          ...(input.provider !== undefined ? { provider: input.provider } : {}),
          ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
          ...(input.includeRevoked ? {} : { revokedAt: null })
        },
        select: descriptorSelect,
        orderBy: [{ provider: "asc" }, { purpose: "asc" }, { createdAt: "asc" }]
      });
      if (rows.some((row) => !tenantRowMatchesIdentity(row as SecretReferenceRow, identity))) {
        throw fixedBrokerError("SECRET_BROKER_SCOPE_MISMATCH", "Secret broker tenant scope could not be verified.", 403);
      }
      for (const row of rows) {
        await tenantAudit(transaction, row as SecretReferenceRow, identity.actorId, "LIST", "secret.metadata.list", "SUCCEEDED", input.requestId);
      }
      return rows.map(toDescriptor);
    });
  } catch (error) {
    throw sanitizeOperationError(error);
  }
}

function validateCreatePersonalSecretReference(input: CreatePersonalSecretReferenceInTransactionInput) {
  assertBoundedText(input.requestId, "requestId", 255);
  assertProvider(input.provider);
  assertBoundedText(input.purpose, "purpose");
  assertEnvironment(input.environment);
  assertSecretValue(input.secretValue);
  assertLastFour(input.lastFour);
  if (input.secretReferenceId !== undefined) assertUuid(input.secretReferenceId, "secretReferenceId");
}

export async function createPersonalSecretReferenceInTransaction(
  rawTransaction: Prisma.TransactionClient,
  identity: PersonalSecretTransactionIdentity,
  input: CreatePersonalSecretReferenceInTransactionInput
): Promise<PersonalSecretReferenceDescriptor> {
  validateCreatePersonalSecretReference(input);
  assertUuid(identity.actorId, "actorId");
  const transaction = rawTransaction as unknown as SecretBrokerTransaction;
  const id = input.secretReferenceId ?? randomUUID();
  const context: SecretEnvelopeContext = {
    secretReferenceId: id,
    organizationId: null,
    tenantId: null,
    businessId: null,
    actorId: identity.actorId,
    provider: input.provider,
    purpose: input.purpose,
    environment: input.environment,
    recordVersion: 1
  };
  let encryptedValue: string;
  try {
    encryptedValue = stringifySecretEnvelope(input.secretValue, context);
  } catch {
    throw fixedBrokerError("SECRET_BROKER_KEY_UNAVAILABLE", "Secret broker encryption is unavailable.");
  }
  const metadata = secretEnvelopeMetadata(encryptedValue);
  const row = await transaction.personalSecretReference.create({
    data: {
      id,
      actorId: identity.actorId,
      provider: input.provider,
      purpose: input.purpose,
      environment: metadata.environment,
      keyVersion: metadata.keyVersion,
      encryptedValue,
      lastFour: input.lastFour ?? null,
      version: 1
    }
  });
  await personalAudit(transaction, row, "CREATE", input.purpose, "SUCCEEDED", input.requestId);
  return toPersonalDescriptor(row);
}

export async function createPersonalSecretReference(input: CreatePersonalSecretReferenceInput): Promise<PersonalSecretReferenceDescriptor> {
  assertBoundedText(input.authSubject, "authSubject", 255);
  validateCreatePersonalSecretReference(input);

  try {
    return await withPersonalSession(prisma, {
      authSubject: input.authSubject,
      requestId: input.requestId,
      actionReason: "personal.secret.reference.create"
    }, (rawTransaction, identity) => createPersonalSecretReferenceInTransaction(rawTransaction, identity, input), {
      isolationLevel: "Serializable"
    });
  } catch (error) {
    throw sanitizeOperationError(error);
  }
}

export async function readPersonalSecretValue<T>(input: ReadPersonalSecretValueInput): Promise<PersonalSecretValueRead<T>> {
  assertBoundedText(input.authSubject, "authSubject", 255);
  assertBoundedText(input.requestId, "requestId", 255);
  assertUuid(input.secretReferenceId, "secretReferenceId");
  assertBoundedText(input.accessPurpose, "accessPurpose");

  try {
    return await withPersonalSession(prisma, {
      authSubject: input.authSubject,
      requestId: input.requestId,
      actionReason: "personal.secret.reference.read"
    }, (rawTransaction, identity) => readPersonalSecretValueInTransaction<T>(rawTransaction, identity, input), {
      isolationLevel: "Serializable"
    });
  } catch (error) {
    throw sanitizeOperationError(error);
  }
}

export async function readPersonalSecretValueInTransaction<T>(
  rawTransaction: Prisma.TransactionClient,
  identity: PersonalSecretTransactionIdentity,
  input: ReadPersonalSecretValueInTransactionInput
): Promise<PersonalSecretValueRead<T>> {
  assertUuid(identity.actorId, "actorId");
  assertBoundedText(input.requestId, "requestId", 255);
  assertUuid(input.secretReferenceId, "secretReferenceId");
  assertBoundedText(input.accessPurpose, "accessPurpose");
  const transaction = rawTransaction as unknown as SecretBrokerTransaction;
  const row = await transaction.personalSecretReference.findFirst({
    where: { id: input.secretReferenceId, actorId: identity.actorId }
  });
  if (!row || row.actorId !== identity.actorId) {
    throw fixedBrokerError("SECRET_REFERENCE_NOT_FOUND", "Secret reference was not found.", 404);
  }
  if (row.revokedAt) {
    await personalAudit(transaction, row, "READ", input.accessPurpose, "BLOCKED_REVOKED", input.requestId);
    throw fixedBrokerError("SECRET_REFERENCE_REVOKED", "Secret reference is revoked.", 410);
  }
  try {
    const metadata = secretEnvelopeMetadata(row.encryptedValue);
    if (metadata.keyVersion !== row.keyVersion || metadata.environment !== row.environment) throw new Error("metadata mismatch");
    const value = parseSecretEnvelope<T>(row.encryptedValue, personalEnvelopeContext(row));
    await personalAudit(transaction, row, "READ", input.accessPurpose, "SUCCEEDED", input.requestId);
    return { descriptor: toPersonalDescriptor(row), value };
  } catch (error) {
    if (error instanceof Phase202SecretBrokerError) throw error;
    await personalAudit(transaction, row, "READ", input.accessPurpose, "BLOCKED_ENVELOPE_INVALID", input.requestId);
    throw fixedBrokerError("SECRET_ENVELOPE_INVALID", "Secret broker could not authenticate the encrypted value.");
  }
}

export async function revokePersonalSecretReference(input: RevokePersonalSecretReferenceInput): Promise<PersonalSecretReferenceDescriptor> {
  assertBoundedText(input.authSubject, "authSubject", 255);
  assertBoundedText(input.requestId, "requestId", 255);
  assertUuid(input.secretReferenceId, "secretReferenceId");
  assertBoundedText(input.revocationPurpose, "revocationPurpose");

  try {
    return await withPersonalSession(prisma, {
      authSubject: input.authSubject,
      requestId: input.requestId,
      actionReason: "personal.secret.reference.revoke"
    }, (rawTransaction, identity) => revokePersonalSecretReferenceInTransaction(rawTransaction, identity, input), {
      isolationLevel: "Serializable"
    });
  } catch (error) {
    throw sanitizeOperationError(error);
  }
}

export async function revokePersonalSecretReferenceInTransaction(
  rawTransaction: Prisma.TransactionClient,
  identity: PersonalSecretTransactionIdentity,
  input: RevokePersonalSecretReferenceInTransactionInput
): Promise<PersonalSecretReferenceDescriptor> {
  assertUuid(identity.actorId, "actorId");
  assertBoundedText(input.requestId, "requestId", 255);
  assertUuid(input.secretReferenceId, "secretReferenceId");
  assertBoundedText(input.revocationPurpose, "revocationPurpose");
  const transaction = rawTransaction as unknown as SecretBrokerTransaction;
  const row = await transaction.personalSecretReference.findFirst({
    where: { id: input.secretReferenceId, actorId: identity.actorId }
  });
  if (!row || row.actorId !== identity.actorId) {
    throw fixedBrokerError("SECRET_REFERENCE_NOT_FOUND", "Secret reference was not found.", 404);
  }
  if (row.revokedAt) {
    await personalAudit(transaction, row, "REVOKE", input.revocationPurpose, "ALREADY_REVOKED", input.requestId);
    return toPersonalDescriptor(row);
  }
  const revokedAt = new Date();
  const updated = await transaction.personalSecretReference.updateMany({
    where: { id: row.id, actorId: row.actorId, version: row.version, revokedAt: null },
    data: { revokedAt }
  });
  if (updated.count !== 1) {
    await personalAudit(transaction, row, "REVOKE", input.revocationPurpose, "BLOCKED_CONFLICT", input.requestId);
    throw fixedBrokerError("SECRET_REVOCATION_CONFLICT", "Secret reference changed during revocation.", 409);
  }
  const revokedRow = { ...row, revokedAt, updatedAt: revokedAt };
  await personalAudit(transaction, revokedRow, "REVOKE", input.revocationPurpose, "SUCCEEDED", input.requestId);
  return toPersonalDescriptor(revokedRow);
}
