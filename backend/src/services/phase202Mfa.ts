import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  assertMfaTransitionReceipt,
  type MfaTransitionReceipt
} from "@entral/contracts";
import { env } from "../env.js";
import { prisma, withPersonalSession } from "../db.js";
import {
  createPersonalSecretReferenceInTransaction,
  readPersonalSecretValueInTransaction,
  revokePersonalSecretReferenceInTransaction
} from "./phase202SecretBroker.js";
import { recordAuditLog } from "./audit.js";

const base32Alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const recoveryAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class Phase202MfaError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "Phase202MfaError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function encodeBase32(bytes: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += base32Alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += base32Alphabet[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value: string) {
  let bits = 0;
  let accumulator = 0;
  const output: number[] = [];
  for (const character of value.toUpperCase().replace(/=+$/u, "")) {
    const index = base32Alphabet.indexOf(character);
    if (index < 0) throw new Phase202MfaError("MFA_SECRET_INVALID", "The authenticator secret is invalid.", 503);
    accumulator = (accumulator << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function totp(secret: string, counter: number) {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = ((digest[offset]! & 0x7f) << 24)
    | ((digest[offset + 1]! & 0xff) << 16)
    | ((digest[offset + 2]! & 0xff) << 8)
    | (digest[offset + 3]! & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function matchingTotpCounter(secret: string, candidate: string, now = Date.now()) {
  if (!/^\d{6}$/u.test(candidate)) return null;
  const counter = Math.floor(now / 30_000);
  for (const offset of [-1, 0, 1]) {
    if (counter + offset < 0) continue;
    const expected = Buffer.from(totp(secret, counter + offset));
    const supplied = Buffer.from(candidate);
    if (expected.length === supplied.length && timingSafeEqual(expected, supplied)) return counter + offset;
  }
  return null;
}

export function verifyTotpCode(secret: string, candidate: string, now = Date.now()) {
  return matchingTotpCounter(secret, candidate, now) !== null;
}

function recoveryCodeHash(code: string) {
  return createHmac("sha256", env.JWT_SECRET)
    .update(`phase202:mfa-recovery\0${code.trim().toUpperCase()}`)
    .digest("hex");
}

function createRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const entropy = randomBytes(10);
    const characters = Array.from(entropy, (byte) => recoveryAlphabet[byte % recoveryAlphabet.length]).join("");
    return `${characters.slice(0, 5)}-${characters.slice(5)}`;
  });
}

async function requireRecentStepUp(
  transaction: Prisma.TransactionClient,
  userId: string,
  sessionId: string
) {
  const session = await transaction.authSession.findFirst({
    where: { id: sessionId, userId, revokedAt: null },
    select: { expiresAt: true, stepUpAt: true }
  });
  const stepUpAt = session?.stepUpAt?.getTime() ?? 0;
  const now = Date.now();
  if (!session || session.expiresAt.getTime() <= now
    || stepUpAt > now
    || now - stepUpAt > env.MFA_STEP_UP_TTL_SECONDS * 1000) {
    throw new Phase202MfaError("RECENT_MFA_STEP_UP_REQUIRED", "Recent MFA step-up is required.", 403);
  }
}

export async function listMfaFactors(userId: string) {
  const rows = await withPersonalSession(prisma, {
    authSubject: userId,
    actionReason: "auth.mfa.factors.read"
  }, (transaction) => transaction.mfaFactor.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" }
  }));
  return rows.map((factor) => ({
    factor_id: factor.id,
    factor_type: "TOTP" as const,
    status: factor.status,
    verified_at: factor.verifiedAt?.toISOString() ?? null,
    created_at: factor.createdAt.toISOString()
  }));
}

type PersonalIdentity = { actorId: string; appUserId: string; authSubject: string };

export type MfaMutationResult = {
  receipt: MfaTransitionReceipt;
  replayed: boolean;
  enrollment: { factor_id: string; secret: string; otpauth_uri: string } | null;
  recovery_codes: string[] | null;
};

function assertIdempotencyKey(value: string) {
  if (typeof value !== "string" || value.length < 12 || value.length > 255 || /[\u0000-\u001f\u007f]/u.test(value)) {
    throw new Phase202MfaError("IDEMPOTENCY_KEY_INVALID", "A bounded idempotency key is required.");
  }
}

function requestFingerprint(value: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function proofBoundRequestFingerprint(value: Record<string, unknown>, proof: string) {
  return createHmac("sha256", env.JWT_SECRET)
    .update("phase202:mfa-request-fingerprint:v1\0")
    .update(JSON.stringify(value))
    .update("\0proof\0")
    .update(proof)
    .digest("hex");
}

function actorReference(identity: PersonalIdentity) {
  return {
    actor_id: identity.actorId,
    actor_type: "HUMAN" as const,
    human_user_id: identity.authSubject,
    service_subject: null,
    agent_id: null
  };
}

function makeReceipt(identity: PersonalIdentity, input: {
  authorization: MfaTransitionReceipt["authorization"];
  factorId: string;
  factorStatus: MfaTransitionReceipt["factor_status"];
  id: string;
  idempotencyKey: string;
  occurredAt: Date;
  oneTimeMaterialPolicy: MfaTransitionReceipt["one_time_material_policy"];
  priorVersion: number;
  recoveryAction: MfaTransitionReceipt["recovery_action"];
  requestId: string;
  resultingVersion: number;
  sessionId: string;
  sessionStepUpAt: Date | null;
  transition: MfaTransitionReceipt["transition"];
}): MfaTransitionReceipt {
  const receipt: MfaTransitionReceipt = {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: input.id,
    transition: input.transition,
    ownership: {
      scope_kind: "PERSONAL",
      organization_id: null,
      tenant_id: null,
      business_id: null,
      environment: env.SECRET_BROKER_ENVIRONMENT,
      data_residency: null
    },
    actor: actorReference(identity),
    session_id: input.sessionId,
    factor_id: input.factorId,
    request_id: input.requestId,
    idempotency_key: input.idempotencyKey,
    prior_version: input.priorVersion,
    resulting_version: input.resultingVersion,
    authorization: input.authorization,
    factor_status: input.factorStatus,
    session_step_up_at: input.sessionStepUpAt?.toISOString() ?? null,
    one_time_material_policy: input.oneTimeMaterialPolicy,
    recovery_action: input.recoveryAction,
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: input.transition !== "FACTOR_REVOKE" && input.transition !== "RECOVERY_REGENERATE",
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: [
      `mfa-factor:${input.factorId}:version:${input.resultingVersion}`,
      `auth-session:${input.sessionId}`
    ],
    occurred_at: input.occurredAt.toISOString(),
    release_version: "phase-202"
  };
  assertMfaTransitionReceipt(receipt);
  return receipt;
}

function receiptFromStored(value: Prisma.JsonValue) {
  assertMfaTransitionReceipt(value);
  return value;
}

async function persistReceipt(
  transaction: Prisma.TransactionClient,
  identity: PersonalIdentity,
  fingerprint: string,
  receipt: MfaTransitionReceipt
) {
  await transaction.mfaMutationReceipt.create({
    data: {
      id: receipt.transition_id,
      userId: identity.authSubject,
      actorId: identity.actorId,
      sessionId: receipt.session_id,
      factorId: receipt.factor_id,
      action: receipt.transition,
      requestId: receipt.request_id,
      idempotencyKey: receipt.idempotency_key,
      requestFingerprint: fingerprint,
      priorVersion: receipt.prior_version,
      resultingVersion: receipt.resulting_version,
      resultPayload: receipt as unknown as Prisma.InputJsonValue,
      occurredAt: new Date(receipt.occurred_at)
    }
  });
}

async function executeMfaMutation(input: {
  actionReason: string;
  fingerprint: string;
  idempotencyKey: string;
  requestId: string;
  transition: MfaTransitionReceipt["transition"];
  userId: string;
}, operation: (transaction: Prisma.TransactionClient, identity: PersonalIdentity) => Promise<MfaMutationResult>) {
  assertIdempotencyKey(input.idempotencyKey);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await withPersonalSession(prisma, {
        authSubject: input.userId,
        actionReason: input.actionReason,
        requestId: input.requestId
      }, async (transaction, identity) => {
        const stored = await transaction.mfaMutationReceipt.findUnique({
          where: { actorId_idempotencyKey: { actorId: identity.actorId, idempotencyKey: input.idempotencyKey } }
        });
        if (stored) {
          if (stored.action !== input.transition || stored.requestFingerprint !== input.fingerprint) {
            throw new Phase202MfaError("IDEMPOTENCY_KEY_REUSED", "The idempotency key was already used for a different MFA transition.", 409);
          }
          return { receipt: receiptFromStored(stored.resultPayload), replayed: true, enrollment: null, recovery_codes: null };
        }
        return operation(transaction, identity);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError
        && (error.code === "P2002" || error.code === "P2034");
      if (!retryable || attempt === 2) throw error;
    }
  }
  throw new Phase202MfaError("MFA_TRANSITION_RETRY_EXHAUSTED", "The MFA transition could not be reconciled.", 503);
}

async function requireDurableSession(
  transaction: Prisma.TransactionClient,
  identity: PersonalIdentity,
  userId: string,
  sessionId: string,
  now: Date
) {
  const session = await transaction.authSession.findFirst({
    where: { id: sessionId, userId, actorId: identity.actorId, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true }
  });
  if (!session) throw new Phase202MfaError("DURABLE_SESSION_REQUIRED", "An active durable session is required.", 401);
}

export async function beginTotpEnrollment(input: {
  email: string;
  idempotencyKey: string;
  requestId: string;
  sessionId: string;
  userId: string;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const fingerprint = requestFingerprint({ transition: "TOTP_ENROLL", userId: input.userId, sessionId: input.sessionId, email: normalizedEmail });
  const secret = encodeBase32(randomBytes(20));
  const secretReferenceId = randomUUID();
  const candidateFactorId = randomUUID();
  return executeMfaMutation({ ...input, actionReason: "auth.mfa.totp.enroll", fingerprint, transition: "TOTP_ENROLL" }, async (transaction, identity) => {
    const now = new Date();
    await requireDurableSession(transaction, identity, input.userId, input.sessionId, now);
    const active = await transaction.mfaFactor.findFirst({ where: { userId: input.userId, factorType: "TOTP", status: "ACTIVE" } });
    if (active) throw new Phase202MfaError("MFA_FACTOR_ALREADY_ACTIVE", "An authenticator factor is already active.", 409);
    const pending = await transaction.mfaFactor.findFirst({ where: { userId: input.userId, factorType: "TOTP", status: "PENDING" } });
    const reference = await createPersonalSecretReferenceInTransaction(transaction, identity, {
      secretReferenceId,
      requestId: input.requestId,
      provider: "entral-mfa",
      purpose: "totp.seed",
      environment: env.SECRET_BROKER_ENVIRONMENT,
      secretValue: { base32: secret }
    });
    const factor = pending
      ? await transaction.mfaFactor.update({
        where: { id: pending.id },
        data: { secretReferenceId: reference.id, version: { increment: 1 }, updatedAt: now }
      })
      : await transaction.mfaFactor.create({
        data: {
          id: candidateFactorId,
          userId: input.userId,
          actorId: identity.actorId,
          factorType: "TOTP",
          secretReferenceId: reference.id,
          status: "PENDING",
          version: 1
        }
      });
    if (pending) {
      await revokePersonalSecretReferenceInTransaction(transaction, identity, {
        requestId: input.requestId,
        secretReferenceId: pending.secretReferenceId,
        revocationPurpose: "superseded pending MFA enrollment"
      });
    }
    await recordAuditLog({
      action: "auth.mfa.enrollment_started",
      actorUserId: input.userId,
      metadata: { factorId: factor.id, factorType: "TOTP", version: factor.version },
      requestId: input.requestId,
      severity: "high",
      targetId: factor.id,
      targetType: "mfa_factor"
    }, transaction);
    const receipt = makeReceipt(identity, {
      authorization: "DURABLE_SESSION",
      factorId: factor.id,
      factorStatus: "PENDING",
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      occurredAt: now,
      oneTimeMaterialPolicy: "TOTP_SECRET_RETURNED_ONCE",
      priorVersion: pending?.version ?? 0,
      recoveryAction: "BEGIN_NEW_ENROLLMENT",
      requestId: input.requestId,
      resultingVersion: factor.version,
      sessionId: input.sessionId,
      sessionStepUpAt: null,
      transition: "TOTP_ENROLL"
    });
    await persistReceipt(transaction, identity, fingerprint, receipt);
    const label = encodeURIComponent(`Entral:${normalizedEmail}`);
    return {
      receipt,
      replayed: false,
      enrollment: {
        factor_id: factor.id,
        secret,
        otpauth_uri: `otpauth://totp/${label}?secret=${secret}&issuer=Entral&algorithm=SHA1&digits=6&period=30`
      },
      recovery_codes: null
    };
  });
}

export async function confirmTotpEnrollment(input: {
  code: string;
  factorId: string;
  idempotencyKey: string;
  requestId: string;
  sessionId: string;
  userId: string;
}) {
  const fingerprint = proofBoundRequestFingerprint(
    { transition: "TOTP_CONFIRM", userId: input.userId, sessionId: input.sessionId, factorId: input.factorId },
    input.code
  );
  const recoveryCodes = createRecoveryCodes();
  return executeMfaMutation({ ...input, actionReason: "auth.mfa.totp.confirm", fingerprint, transition: "TOTP_CONFIRM" }, async (transaction, identity) => {
    const now = new Date();
    const factor = await transaction.mfaFactor.findFirst({
      where: { id: input.factorId, userId: input.userId, actorId: identity.actorId, factorType: "TOTP", status: "PENDING" }
    });
    if (!factor) throw new Phase202MfaError("MFA_FACTOR_NOT_FOUND", "The pending authenticator factor was not found.", 404);
    const secret = await readPersonalSecretValueInTransaction<{ base32: string }>(transaction, identity, {
      requestId: input.requestId,
      secretReferenceId: factor.secretReferenceId,
      accessPurpose: "confirm totp enrollment"
    });
    const acceptedCounter = secret.value && typeof secret.value.base32 === "string"
      ? matchingTotpCounter(secret.value.base32, input.code, now.getTime())
      : null;
    if (acceptedCounter === null) throw new Phase202MfaError("MFA_CODE_INVALID", "The authenticator code is invalid.", 401);
    const session = await transaction.authSession.updateMany({
      where: { id: input.sessionId, userId: input.userId, actorId: identity.actorId, revokedAt: null, expiresAt: { gt: now } },
      data: { stepUpAt: now }
    });
    if (session.count !== 1) throw new Phase202MfaError("DURABLE_SESSION_REQUIRED", "An active durable session is required.", 401);
    const updated = await transaction.mfaFactor.updateMany({
      where: { id: factor.id, userId: input.userId, actorId: identity.actorId, status: "PENDING", version: factor.version },
      data: { status: "ACTIVE", verifiedAt: now, lastAcceptedTotpCounter: BigInt(acceptedCounter), version: { increment: 1 } }
    });
    if (updated.count !== 1) throw new Phase202MfaError("MFA_ENROLLMENT_CONFLICT", "The authenticator enrollment changed.", 409);
    await transaction.mfaRecoveryCode.createMany({
      data: recoveryCodes.map((code) => ({ factorId: factor.id, codeHash: recoveryCodeHash(code) }))
    });
    await recordAuditLog({
      action: "auth.mfa.enrolled",
      actorUserId: input.userId,
      metadata: { factorId: factor.id, factorType: "TOTP", version: factor.version + 1 },
      requestId: input.requestId,
      severity: "high",
      targetId: factor.id,
      targetType: "mfa_factor"
    }, transaction);
    const receipt = makeReceipt(identity, {
      authorization: "TOTP",
      factorId: factor.id,
      factorStatus: "ACTIVE",
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      occurredAt: now,
      oneTimeMaterialPolicy: "RECOVERY_CODES_RETURNED_ONCE",
      priorVersion: factor.version,
      recoveryAction: "REGENERATE_RECOVERY_CODES",
      requestId: input.requestId,
      resultingVersion: factor.version + 1,
      sessionId: input.sessionId,
      sessionStepUpAt: now,
      transition: "TOTP_CONFIRM"
    });
    await persistReceipt(transaction, identity, fingerprint, receipt);
    return { receipt, replayed: false, enrollment: null, recovery_codes: recoveryCodes };
  });
}

export async function verifyMfaStepUp(input: {
  code: string;
  idempotencyKey: string;
  requestId: string;
  sessionId: string;
  userId: string;
}) {
  const fingerprint = proofBoundRequestFingerprint(
    { transition: "STEP_UP", userId: input.userId, sessionId: input.sessionId },
    input.code
  );
  return executeMfaMutation({ ...input, actionReason: "auth.mfa.step_up", fingerprint, transition: "STEP_UP" }, async (transaction, identity) => {
    const now = new Date();
    const factor = await transaction.mfaFactor.findFirst({
      where: { userId: input.userId, actorId: identity.actorId, factorType: "TOTP", status: "ACTIVE" },
      orderBy: { verifiedAt: "desc" }
    });
    if (!factor) throw new Phase202MfaError("MFA_FACTOR_REQUIRED", "An active MFA factor is required.", 403);
    let acceptedTotpCounter: number | null = null;
    if (/^\d{6}$/u.test(input.code)) {
      const secret = await readPersonalSecretValueInTransaction<{ base32: string }>(transaction, identity, {
        requestId: input.requestId,
        secretReferenceId: factor.secretReferenceId,
        accessPurpose: "verify MFA step-up"
      });
      acceptedTotpCounter = secret.value && typeof secret.value.base32 === "string"
        ? matchingTotpCounter(secret.value.base32, input.code, now.getTime())
        : null;
      if (acceptedTotpCounter === null) throw new Phase202MfaError("MFA_CODE_INVALID", "The MFA code is invalid.", 401);
      const accepted = await transaction.mfaFactor.updateMany({
        where: {
          id: factor.id,
          userId: input.userId,
          actorId: identity.actorId,
          status: "ACTIVE",
          version: factor.version,
          OR: [
            { lastAcceptedTotpCounter: null },
            { lastAcceptedTotpCounter: { lt: BigInt(acceptedTotpCounter) } }
          ]
        },
        data: { lastAcceptedTotpCounter: BigInt(acceptedTotpCounter), version: { increment: 1 } }
      });
      if (accepted.count !== 1) throw new Phase202MfaError("MFA_CODE_REPLAYED", "The MFA code was already used.", 401);
    } else {
      const consumed = await transaction.mfaRecoveryCode.updateMany({
        where: { factorId: factor.id, codeHash: recoveryCodeHash(input.code), consumedAt: null },
        data: { consumedAt: now }
      });
      if (consumed.count !== 1) throw new Phase202MfaError("MFA_CODE_INVALID", "The MFA code is invalid.", 401);
      const versioned = await transaction.mfaFactor.updateMany({
        where: { id: factor.id, userId: input.userId, actorId: identity.actorId, status: "ACTIVE", version: factor.version },
        data: { version: { increment: 1 } }
      });
      if (versioned.count !== 1) throw new Phase202MfaError("MFA_FACTOR_CONFLICT", "The MFA factor changed.", 409);
    }
    const updatedSession = await transaction.authSession.updateMany({
      where: { id: input.sessionId, userId: input.userId, actorId: identity.actorId, revokedAt: null, expiresAt: { gt: now } },
      data: { stepUpAt: now }
    });
    if (updatedSession.count !== 1) throw new Phase202MfaError("DURABLE_SESSION_REQUIRED", "A durable session is required.", 401);
    const method = acceptedTotpCounter !== null ? "TOTP" as const : "RECOVERY_CODE" as const;
    await recordAuditLog({
      action: "auth.mfa.step_up",
      actorUserId: input.userId,
      metadata: { factorId: factor.id, method, version: factor.version + 1 },
      requestId: input.requestId,
      severity: "high",
      targetId: input.sessionId,
      targetType: "auth_session"
    }, transaction);
    const receipt = makeReceipt(identity, {
      authorization: method,
      factorId: factor.id,
      factorStatus: "ACTIVE",
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      occurredAt: now,
      oneTimeMaterialPolicy: "NONE",
      priorVersion: factor.version,
      recoveryAction: null,
      requestId: input.requestId,
      resultingVersion: factor.version + 1,
      sessionId: input.sessionId,
      sessionStepUpAt: now,
      transition: "STEP_UP"
    });
    await persistReceipt(transaction, identity, fingerprint, receipt);
    return { receipt, replayed: false, enrollment: null, recovery_codes: null };
  });
}

export async function regenerateRecoveryCodes(input: {
  idempotencyKey: string;
  requestId: string;
  sessionId: string;
  userId: string;
}) {
  const fingerprint = requestFingerprint({ transition: "RECOVERY_REGENERATE", userId: input.userId, sessionId: input.sessionId });
  const recoveryCodes = createRecoveryCodes();
  return executeMfaMutation({ ...input, actionReason: "auth.mfa.recovery.regenerate", fingerprint, transition: "RECOVERY_REGENERATE" }, async (transaction, identity) => {
    await requireRecentStepUp(transaction, input.userId, input.sessionId);
    const factor = await transaction.mfaFactor.findFirst({
      where: { userId: input.userId, actorId: identity.actorId, factorType: "TOTP", status: "ACTIVE" }
    });
    if (!factor) throw new Phase202MfaError("MFA_FACTOR_REQUIRED", "An active MFA factor is required.", 403);
    await transaction.mfaRecoveryCode.deleteMany({ where: { factorId: factor.id } });
    await transaction.mfaRecoveryCode.createMany({
      data: recoveryCodes.map((code) => ({ factorId: factor.id, codeHash: recoveryCodeHash(code) }))
    });
    const updated = await transaction.mfaFactor.updateMany({
      where: { id: factor.id, userId: input.userId, actorId: identity.actorId, status: "ACTIVE", version: factor.version },
      data: { version: { increment: 1 } }
    });
    if (updated.count !== 1) throw new Phase202MfaError("MFA_FACTOR_CONFLICT", "The MFA factor changed.", 409);
    const now = new Date();
    await recordAuditLog({
      action: "auth.mfa.recovery_codes_regenerated",
      actorUserId: input.userId,
      metadata: { factorId: factor.id, version: factor.version + 1 },
      requestId: input.requestId,
      severity: "high",
      targetId: factor.id,
      targetType: "mfa_factor"
    }, transaction);
    const session = await transaction.authSession.findFirst({
      where: { id: input.sessionId, userId: input.userId, actorId: identity.actorId },
      select: { stepUpAt: true }
    });
    const receipt = makeReceipt(identity, {
      authorization: "RECENT_MFA_STEP_UP",
      factorId: factor.id,
      factorStatus: "ACTIVE",
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      occurredAt: now,
      oneTimeMaterialPolicy: "RECOVERY_CODES_RETURNED_ONCE",
      priorVersion: factor.version,
      recoveryAction: "REGENERATE_RECOVERY_CODES",
      requestId: input.requestId,
      resultingVersion: factor.version + 1,
      sessionId: input.sessionId,
      sessionStepUpAt: session?.stepUpAt ?? null,
      transition: "RECOVERY_REGENERATE"
    });
    await persistReceipt(transaction, identity, fingerprint, receipt);
    return { receipt, replayed: false, enrollment: null, recovery_codes: recoveryCodes };
  });
}

export async function removeMfaFactor(input: {
  factorId: string;
  idempotencyKey: string;
  requestId: string;
  sessionId: string;
  userId: string;
}) {
  const fingerprint = requestFingerprint({ transition: "FACTOR_REVOKE", userId: input.userId, sessionId: input.sessionId, factorId: input.factorId });
  return executeMfaMutation({ ...input, actionReason: "auth.mfa.factor.remove", fingerprint, transition: "FACTOR_REVOKE" }, async (transaction, identity) => {
    await requireRecentStepUp(transaction, input.userId, input.sessionId);
    const factor = await transaction.mfaFactor.findFirst({
      where: { id: input.factorId, userId: input.userId, actorId: identity.actorId }
    });
    if (!factor) throw new Phase202MfaError("MFA_FACTOR_NOT_FOUND", "The MFA factor was not found.", 404);
    if (factor.status === "REVOKED") throw new Phase202MfaError("MFA_FACTOR_INACTIVE", "The MFA factor is already revoked.", 409);
    const now = new Date();
    const updated = await transaction.mfaFactor.updateMany({
      where: { id: factor.id, userId: input.userId, actorId: identity.actorId, status: factor.status, version: factor.version },
      data: { status: "REVOKED", version: { increment: 1 } }
    });
    if (updated.count !== 1) throw new Phase202MfaError("MFA_FACTOR_CONFLICT", "The MFA factor changed.", 409);
    await transaction.mfaRecoveryCode.updateMany({ where: { factorId: factor.id, consumedAt: null }, data: { consumedAt: now } });
    await transaction.authSession.updateMany({
      where: { userId: input.userId, actorId: identity.actorId, stepUpAt: { not: null } },
      data: { stepUpAt: null }
    });
    await revokePersonalSecretReferenceInTransaction(transaction, identity, {
      requestId: input.requestId,
      secretReferenceId: factor.secretReferenceId,
      revocationPurpose: "MFA factor removed"
    });
    await recordAuditLog({
      action: "auth.mfa.factor_removed",
      actorUserId: input.userId,
      metadata: { factorId: factor.id, version: factor.version + 1 },
      requestId: input.requestId,
      severity: "high",
      targetId: factor.id,
      targetType: "mfa_factor"
    }, transaction);
    const receipt = makeReceipt(identity, {
      authorization: "RECENT_MFA_STEP_UP",
      factorId: factor.id,
      factorStatus: "REVOKED",
      id: randomUUID(),
      idempotencyKey: input.idempotencyKey,
      occurredAt: now,
      oneTimeMaterialPolicy: "NONE",
      priorVersion: factor.version,
      recoveryAction: null,
      requestId: input.requestId,
      resultingVersion: factor.version + 1,
      sessionId: input.sessionId,
      sessionStepUpAt: null,
      transition: "FACTOR_REVOKE"
    });
    await persistReceipt(transaction, identity, fingerprint, receipt);
    return { receipt, replayed: false, enrollment: null, recovery_codes: null };
  });
}
