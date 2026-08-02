import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  contexts: [] as unknown[],
  env: {
    AUTH_EMAIL_FROM: "security@example.test" as string | undefined,
    AUTH_EMAIL_PROVIDER: "resend" as "console" | "resend",
    CANONICAL_OUTBOX_BATCH_SIZE: 25,
    CANONICAL_OUTBOX_DISPATCHER_ENABLED: false,
    CANONICAL_OUTBOX_LOCK_DURATION_MS: 60_000,
    CANONICAL_OUTBOX_MAX_ATTEMPTS: 12,
    CANONICAL_OUTBOX_POLL_INTERVAL_MS: 1_000,
    CANONICAL_OUTBOX_RETRY_BASE_DELAY_MS: 1_000,
    CANONICAL_OUTBOX_RETRY_MAX_DELAY_MS: 300_000,
    CANONICAL_OUTBOX_SERVICE_APP_USER_ID: undefined as string | undefined,
    DATA_ENCRYPTION_KEY: "phase202-test-key-material" as string | undefined,
    DATA_ENCRYPTION_KEY_VERSION: "phase202-v1",
    DATA_ENCRYPTION_KEYRING_JSON: undefined as string | undefined,
    NODE_ENV: "test" as "development" | "production" | "test",
    RESEND_API_KEY: "phase202-resend-test-key" as string | undefined
  },
  parseSecretEnvelope: vi.fn(),
  queries: [] as Array<{ strings: readonly string[]; values: readonly unknown[] }>,
  queryResults: [] as unknown[],
  secretEnvelopeMetadata: vi.fn(),
  sendMembershipChangeEmail: vi.fn(),
  sendMembershipInvitationEmail: vi.fn()
}));

vi.mock("../src/env.js", () => ({ env: harness.env }));

vi.mock("../src/db.js", () => ({
  prisma: {},
  withCanonicalSession: async (
    _database: unknown,
    context: unknown,
    operation: (transaction: unknown, appUserId: string) => Promise<unknown>
  ) => {
    harness.contexts.push(context);
    const transaction = {
      $queryRaw: vi.fn(async (query: {
        strings: readonly string[];
        values: readonly unknown[];
      }) => {
        harness.queries.push(query);
        return harness.queryResults.shift();
      })
    };
    return operation(transaction, "00000000-0000-4000-8000-000000000001");
  }
}));

vi.mock("../src/services/secureJson.js", () => ({
  parseSecretEnvelope: harness.parseSecretEnvelope,
  secretEnvelopeMetadata: harness.secretEnvelopeMetadata
}));

vi.mock("../src/services/authEmails.js", () => ({
  sendMembershipChangeEmail: harness.sendMembershipChangeEmail,
  sendMembershipInvitationEmail: harness.sendMembershipInvitationEmail
}));

import {
  assertPhase202NotificationDeliveryConfiguration,
  dispatchPhase202NotificationDeliveryBatch,
  startPhase202NotificationDeliveryWorker
} from "../src/services/phase202NotificationDelivery.js";

const delivery = {
  attempts: 1,
  createdByActorId: "00000000-0000-4000-8000-000000000007",
  deadlineAt: new Date(Date.now() + 60_000),
  deliveryId: "00000000-0000-4000-8000-000000000001",
  deliveryKind: "INVITATION",
  encryptedValue: "v2-encrypted-command-without-plaintext",
  environment: "PRODUCTION",
  keyVersion: "phase202-v1",
  notificationEvidenceId: "00000000-0000-4000-8000-000000000002",
  organizationId: "00000000-0000-4000-8000-000000000003",
  provider: "resend",
  purpose: "membership-email-delivery",
  recordVersion: 1,
  secretReferenceId: "00000000-0000-4000-8000-000000000004",
  tenantId: "00000000-0000-4000-8000-000000000005"
};

const invitationCommand = {
  action: null,
  kind: "INVITATION",
  organizationName: "Acme Operations",
  role: "TENANT_ADMIN",
  schemaVersion: 1,
  to: "new.member@example.test",
  token: "phase202_invitation_token_abcdefghijklmnopqrstuvwxyz0123456789"
};

function queryText(index: number) {
  return harness.queries[index]?.strings.join("?") ?? "";
}

function queryValuesAsText() {
  return JSON.stringify(harness.queries.flatMap((query) => query.values));
}

describe("Phase 202 durable membership notification dispatcher", () => {
  beforeEach(() => {
    harness.contexts.length = 0;
    harness.env.AUTH_EMAIL_FROM = "security@example.test";
    harness.env.AUTH_EMAIL_PROVIDER = "resend";
    harness.env.CANONICAL_OUTBOX_DISPATCHER_ENABLED = false;
    harness.env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID = undefined;
    harness.env.DATA_ENCRYPTION_KEY = "phase202-test-key-material";
    harness.env.DATA_ENCRYPTION_KEYRING_JSON = undefined;
    harness.env.RESEND_API_KEY = "phase202-resend-test-key";
    harness.parseSecretEnvelope.mockReset().mockReturnValue(invitationCommand);
    harness.secretEnvelopeMetadata.mockReset().mockReturnValue({
      environment: delivery.environment,
      keyVersion: delivery.keyVersion,
      version: 2
    });
    harness.sendMembershipChangeEmail.mockReset();
    harness.sendMembershipInvitationEmail.mockReset().mockResolvedValue({
      messageId: "provider-message-202",
      provider: "resend",
      queued: true
    });
    harness.queries.length = 0;
    harness.queryResults.length = 0;
    vi.useRealTimers();
  });

  it("decrypts with exact row-bound AAD, uses a stable UUID idempotency key, and records provider acceptance", async () => {
    harness.queryResults.push([delivery], [{ completed: true }]);

    const result = await dispatchPhase202NotificationDeliveryBatch({
      database: {} as never,
      serviceAppUserId: "00000000-0000-4000-8000-000000000010",
      workerId: "notification-worker-test"
    });

    expect(result).toEqual({
      claimed: 1,
      completed: 1,
      deadLettered: 0,
      failed: 0,
      nonproductionRecorded: 0,
      providerAccepted: 1
    });
    expect(harness.parseSecretEnvelope).toHaveBeenCalledWith(
      delivery.encryptedValue,
      {
        actorId: delivery.createdByActorId,
        businessId: null,
        environment: delivery.environment,
        organizationId: delivery.organizationId,
        provider: delivery.provider,
        purpose: delivery.purpose,
        recordVersion: delivery.recordVersion,
        secretReferenceId: delivery.secretReferenceId,
        tenantId: delivery.tenantId
      }
    );
    expect(harness.sendMembershipInvitationEmail).toHaveBeenCalledWith({
      idempotencyKey: delivery.deliveryId,
      organizationName: invitationCommand.organizationName,
      role: invitationCommand.role,
      to: invitationCommand.to,
      token: invitationCommand.token
    });
    expect(queryText(0)).toContain("phase202_claim_notification_deliveries");
    expect(queryText(0).match(/\?::integer/gu)).toHaveLength(2);
    expect(queryText(1)).toContain("phase202_complete_notification_delivery");
    expect(harness.queries[1]?.values).toContain("PROVIDER_ACCEPTED");
    expect(harness.queries[1]?.values).toContain("provider-message-202");
  });

  it("maps a console receipt to nonproduction evidence without a provider message ID", async () => {
    harness.queryResults.push([
      { ...delivery, deliveryKind: "CHANGE" }
    ], [{ completed: true }]);
    harness.parseSecretEnvelope.mockReturnValue({
      action: "suspended",
      kind: "CHANGE",
      organizationName: "Acme Operations",
      role: null,
      schemaVersion: 1,
      to: "member@example.test",
      token: null
    });
    harness.sendMembershipChangeEmail.mockResolvedValue({ provider: "console", queued: false });

    const result = await dispatchPhase202NotificationDeliveryBatch({
      database: {} as never,
      serviceAppUserId: "00000000-0000-4000-8000-000000000010",
      workerId: "notification-worker-test"
    });

    expect(result.nonproductionRecorded).toBe(1);
    expect(result.providerAccepted).toBe(0);
    expect(harness.queries[1]?.values).toContain("NONPRODUCTION_RECORDED");
    expect(harness.queries[1]?.values).toContain(null);
  });

  it.each([
    [{ ...invitationCommand, action: "invited" }],
    [{ ...invitationCommand, role: null }],
    [{ ...invitationCommand, token: "short" }],
    [{ ...invitationCommand, unexpected: true }],
    [{ ...invitationCommand, organizationName: " Acme Operations" }],
    [{ ...invitationCommand, to: "not-an-email" }],
    [{ ...invitationCommand, kind: "CHANGE", action: "arbitrary", role: null, token: null }]
  ])("rejects a malformed or conditionally inconsistent command without delivery", async (command) => {
    harness.parseSecretEnvelope.mockReturnValue(command);
    harness.queryResults.push([delivery], [{ status: "FAILED" }]);

    const result = await dispatchPhase202NotificationDeliveryBatch({
      database: {} as never,
      serviceAppUserId: "00000000-0000-4000-8000-000000000010",
      workerId: "notification-worker-test"
    });

    expect(result.failed).toBe(1);
    expect(harness.sendMembershipInvitationEmail).not.toHaveBeenCalled();
    expect(harness.sendMembershipChangeEmail).not.toHaveBeenCalled();
    expect(queryText(1)).toContain("phase202_fail_notification_delivery");
    expect(queryText(1).match(/\?::integer/gu)).toHaveLength(2);
    expect(harness.queries[1]?.values).toContain("COMMAND_INVALID");
  });

  it("passes only a fixed failure code and never a token, recipient, ciphertext, or provider error body to SQL", async () => {
    const sensitiveProviderError = `provider rejected ${invitationCommand.token} for ${invitationCommand.to}`;
    harness.queryResults.push([delivery], [{ status: "FAILED" }]);
    harness.sendMembershipInvitationEmail.mockRejectedValue(new Error(sensitiveProviderError));

    const result = await dispatchPhase202NotificationDeliveryBatch({
      database: {} as never,
      serviceAppUserId: "00000000-0000-4000-8000-000000000010",
      workerId: "notification-worker-test"
    });

    expect(result.failed).toBe(1);
    expect(harness.queries[1]?.values).toContain("PROVIDER_DELIVERY_FAILED");
    expect(queryValuesAsText()).not.toContain(invitationCommand.token);
    expect(queryValuesAsText()).not.toContain(invitationCommand.to);
    expect(queryValuesAsText()).not.toContain(delivery.encryptedValue);
    expect(queryValuesAsText()).not.toContain(sensitiveProviderError);
  });

  it("uses bounded exponential retry and retains the database terminal outcome", async () => {
    harness.queryResults.push([{ ...delivery, attempts: 4 }], [{ status: "DEAD_LETTER" }]);
    harness.parseSecretEnvelope.mockImplementation(() => {
      throw new Error(`invalid envelope ${invitationCommand.token}`);
    });

    const result = await dispatchPhase202NotificationDeliveryBatch({
      database: {} as never,
      maxAttempts: 4,
      retryBaseDelayMs: 500,
      retryMaxDelayMs: 10_000,
      serviceAppUserId: "00000000-0000-4000-8000-000000000010",
      workerId: "notification-worker-test"
    });

    expect(result).toMatchObject({ deadLettered: 1, failed: 1 });
    expect(harness.queries[1]?.values).toContain("SECRET_ENVELOPE_INVALID");
    expect(harness.queries[1]?.values).toContain(4_000);
    expect(queryValuesAsText()).not.toContain(invitationCommand.token);
  });

  it("does not deliver a command whose database deadline elapsed after claim", async () => {
    harness.queryResults.push([
      { ...delivery, deadlineAt: new Date(Date.now() - 1) }
    ], [{ status: "DEAD_LETTER" }]);

    const result = await dispatchPhase202NotificationDeliveryBatch({
      database: {} as never,
      serviceAppUserId: "00000000-0000-4000-8000-000000000010",
      workerId: "notification-worker-test"
    });

    expect(result).toMatchObject({ deadLettered: 1, failed: 1 });
    expect(harness.sendMembershipInvitationEmail).not.toHaveBeenCalled();
    expect(harness.queries[1]?.values).toContain("DELIVERY_DEADLINE_EXPIRED");
  });

  it("rejects ambiguous provider responses rather than claiming acceptance", async () => {
    harness.queryResults.push([delivery], [{ status: "FAILED" }]);
    harness.sendMembershipInvitationEmail.mockResolvedValue({ provider: "resend", queued: true });

    const result = await dispatchPhase202NotificationDeliveryBatch({
      database: {} as never,
      serviceAppUserId: "00000000-0000-4000-8000-000000000010",
      workerId: "notification-worker-test"
    });

    expect(result.completed).toBe(0);
    expect(result.failed).toBe(1);
    expect(harness.queries[1]?.values).toContain("PROVIDER_RESPONSE_INVALID");
  });

  it("fails closed when an enabled worker lacks identity, encryption, or provider configuration", () => {
    const valid = {
      dataEncryptionKey: "key-material",
      emailFrom: "security@example.test",
      emailProvider: "resend" as const,
      enabled: true,
      resendApiKey: "resend-key",
      serviceAppUserId: "00000000-0000-4000-8000-000000000010"
    };
    expect(() => assertPhase202NotificationDeliveryConfiguration({
      ...valid,
      serviceAppUserId: undefined
    })).toThrow("CANONICAL_OUTBOX_SERVICE_APP_USER_ID");
    expect(() => assertPhase202NotificationDeliveryConfiguration({
      ...valid,
      dataEncryptionKey: undefined
    })).toThrow("secret-broker key material");
    expect(() => assertPhase202NotificationDeliveryConfiguration({
      ...valid,
      resendApiKey: undefined
    })).toThrow("sender and API credential");
    expect(() => assertPhase202NotificationDeliveryConfiguration({
      dataEncryptionKey: "key-material",
      emailProvider: "console",
      enabled: true,
      production: true,
      serviceAppUserId: valid.serviceAppUserId
    })).toThrow("real email provider");
    expect(() => assertPhase202NotificationDeliveryConfiguration({
      dataEncryptionKeyVersion: "phase202-v1",
      dataEncryptionKeyringJson: JSON.stringify({ "phase202-v1": "keyring-material-long-enough" }),
      emailProvider: "console",
      enabled: true,
      serviceAppUserId: valid.serviceAppUserId
    })).not.toThrow();
    expect(() => assertPhase202NotificationDeliveryConfiguration(valid)).not.toThrow();
    expect(() => assertPhase202NotificationDeliveryConfiguration({
      enabled: false,
      emailProvider: "console"
    })).not.toThrow();
  });

  it("runs a fail-closed startup probe and stops the polling loop cleanly", async () => {
    vi.useFakeTimers();
    harness.env.CANONICAL_OUTBOX_DISPATCHER_ENABLED = true;
    harness.env.CANONICAL_OUTBOX_SERVICE_APP_USER_ID =
      "00000000-0000-4000-8000-000000000010";
    harness.queryResults.push([]);
    const health = vi.fn();

    const stop = await startPhase202NotificationDeliveryWorker({
      database: {} as never,
      onHealthChange: health,
      workerId: "notification-worker-test"
    });
    await stop();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(harness.queries).toHaveLength(1);
    expect(health).toHaveBeenNthCalledWith(1, true);
    expect(health).toHaveBeenLastCalledWith(false);
  });
});
