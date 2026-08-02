import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { env } from "../env.js";
import { prisma, withCanonicalSession } from "../db.js";
import {
  sendMembershipChangeEmail,
  sendMembershipInvitationEmail
} from "./authEmails.js";
import {
  parseSecretEnvelope,
  secretEnvelopeMetadata,
  type SecretEnvelopeContext
} from "./secureJson.js";

const MAX_DATABASE_RETRY_DELAY_MS = 3_600_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const membershipRoles = new Set(["MEMBER", "TENANT_ADMIN", "OWNER"] as const);
const changeActions = new Set([
  "suspended",
  "removed",
  "role changed to MEMBER",
  "role changed to TENANT_ADMIN",
  "role changed to OWNER"
]);

type MembershipRole = "MEMBER" | "TENANT_ADMIN" | "OWNER";

type MembershipInvitationEmailCommand = {
  action: null;
  kind: "INVITATION";
  organizationName: string;
  role: MembershipRole;
  schemaVersion: 1;
  to: string;
  token: string;
};

type MembershipChangeEmailCommand = {
  action: string;
  kind: "CHANGE";
  organizationName: string;
  role: null;
  schemaVersion: 1;
  to: string;
  token: null;
};

type MembershipEmailCommand = MembershipInvitationEmailCommand | MembershipChangeEmailCommand;

type ClaimedNotificationDelivery = {
  attempts: number;
  createdByActorId: string;
  deadlineAt: Date;
  deliveryId: string;
  deliveryKind: string;
  encryptedValue: string;
  environment: string;
  keyVersion: string;
  notificationEvidenceId: string;
  organizationId: string;
  provider: string;
  purpose: string;
  recordVersion: number;
  secretReferenceId: string;
  tenantId: string;
};

export type Phase202NotificationDeliveryBatchResult = {
  claimed: number;
  completed: number;
  deadLettered: number;
  failed: number;
  nonproductionRecorded: number;
  providerAccepted: number;
};

export type DispatchPhase202NotificationDeliveryBatchOptions = {
  batchSize?: number;
  database?: PrismaClient;
  lockDurationMs?: number;
  maxAttempts?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  serviceAppUserId: string;
  workerId?: string;
};

export type StartPhase202NotificationDeliveryWorkerOptions = {
  database?: PrismaClient;
  logger?: Pick<FastifyBaseLogger, "error" | "info">;
  onHealthChange?: (healthy: boolean) => void;
  workerId?: string;
};

type FailureCode =
  | "COMMAND_INVALID"
  | "DELIVERY_DEADLINE_EXPIRED"
  | "PROVIDER_DELIVERY_FAILED"
  | "PROVIDER_RESPONSE_INVALID"
  | "SECRET_ENVELOPE_INVALID";

type DeliveryCommandResult =
  | {
      errorCode: null;
      outcome: "NONPRODUCTION_RECORDED" | "PROVIDER_ACCEPTED";
      providerMessageId: string | null;
    }
  | {
      errorCode: "PROVIDER_DELIVERY_FAILED" | "PROVIDER_RESPONSE_INVALID";
    };

function requiredPositiveInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer.`);
  }
  return value;
}

function retryDelay(attempts: number, baseDelayMs: number, maxDelayMs: number) {
  const exponent = Math.min(Math.max(attempts - 1, 0), 20);
  return Math.min(
    baseDelayMs * (2 ** exponent),
    maxDelayMs,
    MAX_DATABASE_RETRY_DELAY_MS
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactCommandKeys(value: Record<string, unknown>) {
  const expected = [
    "action",
    "kind",
    "organizationName",
    "role",
    "schemaVersion",
    "to",
    "token"
  ];
  return Object.keys(value).sort().join("\0") === expected.join("\0");
}

function validRecipient(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.length >= 3
    && value.length <= 320
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value);
}

function validOrganizationName(value: unknown): value is string {
  return typeof value === "string"
    && value === value.trim()
    && value.length >= 1
    && value.length <= 200
    && !/[\r\n\0]/u.test(value);
}

function parseMembershipEmailCommand(
  value: unknown,
  deliveryKind: string
): MembershipEmailCommand | null {
  if (!isPlainRecord(value)
    || !hasExactCommandKeys(value)
    || value.schemaVersion !== 1
    || !validRecipient(value.to)
    || !validOrganizationName(value.organizationName)
    || value.kind !== deliveryKind) {
    return null;
  }

  if (value.kind === "INVITATION") {
    if (value.action !== null
      || typeof value.role !== "string"
      || !membershipRoles.has(value.role as MembershipRole)
      || typeof value.token !== "string"
      || value.token.length < 32
      || value.token.length > 512
      || !/^[A-Za-z0-9_-]+$/u.test(value.token)) {
      return null;
    }
    return value as MembershipInvitationEmailCommand;
  }

  if (value.kind === "CHANGE") {
    if (typeof value.action !== "string"
      || value.action.length < 1
      || value.action.length > 160
      || !changeActions.has(value.action)
      || value.role !== null
      || value.token !== null) {
      return null;
    }
    return value as MembershipChangeEmailCommand;
  }

  return null;
}

async function claimDeliveries(input: {
  batchSize: number;
  database: PrismaClient;
  lockDurationMs: number;
  serviceAppUserId: string;
  workerId: string;
}) {
  return withCanonicalSession(input.database, {
    actionReason: "Claim encrypted Phase 202 membership notification deliveries.",
    serviceAppUserId: input.serviceAppUserId
  }, async (transaction) => transaction.$queryRaw<ClaimedNotificationDelivery[]>(Prisma.sql`
    SELECT *
    FROM entral.phase202_claim_notification_deliveries(
      ${input.workerId},
      ${input.batchSize},
      ${input.lockDurationMs}
    )
  `));
}

async function completeDelivery(input: {
  database: PrismaClient;
  deliveryId: string;
  outcome: "NONPRODUCTION_RECORDED" | "PROVIDER_ACCEPTED";
  providerMessageId: string | null;
  serviceAppUserId: string;
  workerId: string;
}) {
  const rows = await withCanonicalSession(input.database, {
    actionReason: "Record a terminal Phase 202 membership notification receipt.",
    serviceAppUserId: input.serviceAppUserId
  }, async (transaction) => transaction.$queryRaw<Array<{ completed: boolean }>>(Prisma.sql`
    SELECT entral.phase202_complete_notification_delivery(
      ${input.deliveryId}::uuid,
      ${input.workerId},
      ${input.outcome},
      ${input.providerMessageId}
    ) AS "completed"
  `));
  if (rows.length !== 1 || rows[0]?.completed !== true) {
    throw new Error("NOTIFICATION_DELIVERY_COMPLETION_REJECTED");
  }
}

async function failDelivery(input: {
  database: PrismaClient;
  deliveryId: string;
  errorCode: FailureCode;
  maxAttempts: number;
  retryDelayMs: number;
  serviceAppUserId: string;
  workerId: string;
}) {
  const rows = await withCanonicalSession(input.database, {
    actionReason: "Record a sanitized Phase 202 membership notification failure.",
    serviceAppUserId: input.serviceAppUserId
  }, async (transaction) => transaction.$queryRaw<Array<{ status: string }>>(Prisma.sql`
    SELECT entral.phase202_fail_notification_delivery(
      ${input.deliveryId}::uuid,
      ${input.workerId},
      ${input.errorCode},
      ${input.maxAttempts},
      ${input.retryDelayMs}
    ) AS "status"
  `));
  const status = rows[0]?.status;
  if (rows.length !== 1 || (status !== "FAILED" && status !== "DEAD_LETTER")) {
    throw new Error("NOTIFICATION_DELIVERY_FAILURE_RECEIPT_REJECTED");
  }
  return status;
}

function envelopeContext(row: ClaimedNotificationDelivery): SecretEnvelopeContext | null {
  if (!(["DEVELOPMENT", "STAGING", "PRODUCTION"] as const).includes(
    row.environment as "DEVELOPMENT" | "STAGING" | "PRODUCTION"
  ) || row.provider !== "resend"
    || row.purpose !== "membership-email-delivery"
    || !Number.isSafeInteger(row.recordVersion)
    || row.recordVersion < 1) {
    return null;
  }
  return {
    actorId: row.createdByActorId,
    businessId: null,
    environment: row.environment as SecretEnvelopeContext["environment"],
    organizationId: row.organizationId,
    provider: row.provider,
    purpose: row.purpose,
    recordVersion: row.recordVersion,
    secretReferenceId: row.secretReferenceId,
    tenantId: row.tenantId
  };
}

function decryptCommand(row: ClaimedNotificationDelivery) {
  const context = envelopeContext(row);
  if (!context) return { command: null, errorCode: "SECRET_ENVELOPE_INVALID" as const };
  try {
    const metadata = secretEnvelopeMetadata(row.encryptedValue);
    if (metadata.version !== 2
      || metadata.environment !== row.environment
      || metadata.keyVersion !== row.keyVersion) {
      return { command: null, errorCode: "SECRET_ENVELOPE_INVALID" as const };
    }
    const raw = parseSecretEnvelope<unknown>(row.encryptedValue, context);
    const command = parseMembershipEmailCommand(raw, row.deliveryKind);
    return command
      ? { command, errorCode: null }
      : { command: null, errorCode: "COMMAND_INVALID" as const };
  } catch {
    return { command: null, errorCode: "SECRET_ENVELOPE_INVALID" as const };
  }
}

async function deliverCommand(
  deliveryId: string,
  command: MembershipEmailCommand
): Promise<DeliveryCommandResult> {
  try {
    const receipt = command.kind === "INVITATION"
      ? await sendMembershipInvitationEmail({
          idempotencyKey: deliveryId,
          organizationName: command.organizationName,
          role: command.role,
          to: command.to,
          token: command.token
        })
      : await sendMembershipChangeEmail({
          action: command.action,
          idempotencyKey: deliveryId,
          organizationName: command.organizationName,
          to: command.to
        });

    if (receipt.provider === "console" && receipt.queued === false) {
      return {
        errorCode: null,
        outcome: "NONPRODUCTION_RECORDED" as const,
        providerMessageId: null
      };
    }
    if (receipt.provider === "resend"
      && receipt.queued === true
      && typeof receipt.messageId === "string"
      && /^[A-Za-z0-9._:-]{1,255}$/u.test(receipt.messageId)) {
      return {
        errorCode: null,
        outcome: "PROVIDER_ACCEPTED" as const,
        providerMessageId: receipt.messageId
      };
    }
    return { errorCode: "PROVIDER_RESPONSE_INVALID" as const };
  } catch {
    return { errorCode: "PROVIDER_DELIVERY_FAILED" as const };
  }
}

export async function dispatchPhase202NotificationDeliveryBatch(
  options: DispatchPhase202NotificationDeliveryBatchOptions
): Promise<Phase202NotificationDeliveryBatchResult> {
  const database = options.database ?? prisma;
  const batchSize = requiredPositiveInteger(
    options.batchSize ?? env.CANONICAL_OUTBOX_BATCH_SIZE,
    "Notification delivery batch size"
  );
  const lockDurationMs = requiredPositiveInteger(
    options.lockDurationMs ?? env.CANONICAL_OUTBOX_LOCK_DURATION_MS,
    "Notification delivery lock duration"
  );
  const retryBaseDelayMs = requiredPositiveInteger(
    options.retryBaseDelayMs ?? env.CANONICAL_OUTBOX_RETRY_BASE_DELAY_MS,
    "Notification delivery retry base delay"
  );
  const retryMaxDelayMs = requiredPositiveInteger(
    options.retryMaxDelayMs ?? env.CANONICAL_OUTBOX_RETRY_MAX_DELAY_MS,
    "Notification delivery retry maximum delay"
  );
  const maxAttempts = requiredPositiveInteger(
    options.maxAttempts ?? env.CANONICAL_OUTBOX_MAX_ATTEMPTS,
    "Notification delivery maximum attempts"
  );
  if (batchSize > 100 || lockDurationMs < 5_000 || lockDurationMs > 900_000
    || retryBaseDelayMs < 250 || maxAttempts > 1_000) {
    throw new Error("Notification delivery configuration is outside the durable database contract.");
  }
  const workerId = options.workerId ?? `${hostname()}:${process.pid}:${randomUUID()}`;
  if (!uuidPattern.test(options.serviceAppUserId)
    || workerId.length < 1
    || workerId.length > 255) {
    throw new Error("Notification delivery requires a service identity and bounded worker identifier.");
  }

  const claimed = await claimDeliveries({
    batchSize,
    database,
    lockDurationMs,
    serviceAppUserId: options.serviceAppUserId,
    workerId
  });
  const result: Phase202NotificationDeliveryBatchResult = {
    claimed: claimed.length,
    completed: 0,
    deadLettered: 0,
    failed: 0,
    nonproductionRecorded: 0,
    providerAccepted: 0
  };

  for (const row of claimed) {
    let errorCode: FailureCode | null = null;
    let delivery: Awaited<ReturnType<typeof deliverCommand>> | null = null;
    if (!(row.deadlineAt instanceof Date) || row.deadlineAt.getTime() <= Date.now()) {
      errorCode = "DELIVERY_DEADLINE_EXPIRED";
    } else {
      const decrypted = decryptCommand(row);
      errorCode = decrypted.errorCode;
      if (decrypted.command) {
        delivery = await deliverCommand(row.deliveryId, decrypted.command);
        errorCode = delivery.errorCode;
      }
    }

    if (delivery?.errorCode === null) {
      await completeDelivery({
        database,
        deliveryId: row.deliveryId,
        outcome: delivery.outcome,
        providerMessageId: delivery.providerMessageId,
        serviceAppUserId: options.serviceAppUserId,
        workerId
      });
      result.completed += 1;
      if (delivery.outcome === "PROVIDER_ACCEPTED") result.providerAccepted += 1;
      else result.nonproductionRecorded += 1;
      continue;
    }

    const status = await failDelivery({
      database,
      deliveryId: row.deliveryId,
      errorCode: errorCode ?? "PROVIDER_RESPONSE_INVALID",
      maxAttempts,
      retryDelayMs: retryDelay(row.attempts, retryBaseDelayMs, retryMaxDelayMs),
      serviceAppUserId: options.serviceAppUserId,
      workerId
    });
    result.failed += 1;
    if (status === "DEAD_LETTER") result.deadLettered += 1;
  }

  return result;
}

export function assertPhase202NotificationDeliveryConfiguration(input: {
  dataEncryptionKey?: string;
  dataEncryptionKeyVersion?: string;
  dataEncryptionKeyringJson?: string;
  emailFrom?: string;
  emailProvider: "console" | "resend";
  enabled: boolean;
  production?: boolean;
  resendApiKey?: string;
  serviceAppUserId?: string;
}) {
  if (!input.enabled) return;
  if (!input.serviceAppUserId || !uuidPattern.test(input.serviceAppUserId)) {
    throw new Error("CANONICAL_OUTBOX_SERVICE_APP_USER_ID is required for membership notification delivery.");
  }
  let keyringHasCurrentKey = false;
  if (input.dataEncryptionKeyringJson && input.dataEncryptionKeyVersion) {
    try {
      const parsed = JSON.parse(input.dataEncryptionKeyringJson) as unknown;
      keyringHasCurrentKey = Boolean(
        parsed
        && typeof parsed === "object"
        && !Array.isArray(parsed)
        && typeof (parsed as Record<string, unknown>)[input.dataEncryptionKeyVersion] === "string"
        && ((parsed as Record<string, string>)[input.dataEncryptionKeyVersion]?.length ?? 0) >= 16
      );
    } catch {
      keyringHasCurrentKey = false;
    }
  }
  if (!input.dataEncryptionKey && !keyringHasCurrentKey) {
    throw new Error("Encrypted membership notification delivery requires secret-broker key material.");
  }
  if (input.production && input.emailProvider === "console") {
    throw new Error("Production membership notification delivery requires a real email provider.");
  }
  if (input.emailProvider === "resend" && (!input.emailFrom || !input.resendApiKey)) {
    throw new Error("Resend membership notification delivery requires its sender and API credential.");
  }
}

export async function startPhase202NotificationDeliveryWorker(
  options: StartPhase202NotificationDeliveryWorkerOptions = {}
): Promise<() => Promise<void>> {
  const reportHealth = options.onHealthChange ?? (() => undefined);
  assertPhase202NotificationDeliveryConfiguration({
    dataEncryptionKey: env.DATA_ENCRYPTION_KEY,
    dataEncryptionKeyVersion: env.DATA_ENCRYPTION_KEY_VERSION,
    dataEncryptionKeyringJson: env.DATA_ENCRYPTION_KEYRING_JSON,
    emailFrom: env.AUTH_EMAIL_FROM,
    emailProvider: env.AUTH_EMAIL_PROVIDER,
    enabled: env.CANONICAL_OUTBOX_DISPATCHER_ENABLED,
    production: env.NODE_ENV === "production",
    resendApiKey: env.RESEND_API_KEY,
    serviceAppUserId: env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID
  });
  if (!env.CANONICAL_OUTBOX_DISPATCHER_ENABLED) {
    reportHealth(false);
    return async () => undefined;
  }

  const workerId = options.workerId ?? `${hostname()}:${process.pid}:${randomUUID()}`;
  const serviceAppUserId = env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID!;
  let activeBatch: Promise<void> | undefined;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const dispatch = async () => {
    const result = await dispatchPhase202NotificationDeliveryBatch({
      database: options.database,
      serviceAppUserId,
      workerId
    });
    reportHealth(result.failed === 0);
    return result;
  };
  const schedule = (delayMs: number) => {
    if (stopped) return;
    timer = setTimeout(() => {
      activeBatch = dispatch().then((result) => {
        if (result.claimed > 0) {
          options.logger?.info({ ...result, workerId }, "Membership notification batch dispatched");
        }
        schedule(result.claimed >= env.CANONICAL_OUTBOX_BATCH_SIZE
          ? 0
          : env.CANONICAL_OUTBOX_POLL_INTERVAL_MS);
      }).catch(() => {
        reportHealth(false);
        options.logger?.error(
          { errorCode: "NOTIFICATION_DISPATCH_FAILED", workerId },
          "Membership notification dispatch failed"
        );
        schedule(env.CANONICAL_OUTBOX_POLL_INTERVAL_MS);
      }).finally(() => {
        activeBatch = undefined;
      });
    }, delayMs);
    timer.unref();
  };

  let firstResult: Phase202NotificationDeliveryBatchResult;
  try {
    firstResult = await dispatch();
    if (firstResult.failed > 0) {
      throw new Error("Membership notification startup probe could not deliver every claimed command.");
    }
  } catch {
    reportHealth(false);
    throw new Error("Membership notification dispatcher startup failed.");
  }
  schedule(firstResult.claimed >= env.CANONICAL_OUTBOX_BATCH_SIZE
    ? 0
    : env.CANONICAL_OUTBOX_POLL_INTERVAL_MS);
  options.logger?.info({ workerId }, "Membership notification dispatcher started");

  return async () => {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
    await activeBatch;
    reportHealth(false);
    options.logger?.info({ workerId }, "Membership notification dispatcher stopped");
  };
}
