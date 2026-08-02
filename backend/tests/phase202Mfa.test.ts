import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  audit: vi.fn(),
  createSecret: vi.fn(),
  readSecret: vi.fn(),
  revokeSecret: vi.fn(),
  withPersonalSession: vi.fn()
}));

vi.mock("../src/env.js", () => ({
  env: {
    JWT_SECRET: "test-secret-that-is-long-enough-for-jwt",
    MFA_STEP_UP_TTL_SECONDS: 600,
    SECRET_BROKER_ENVIRONMENT: "DEVELOPMENT"
  }
}));

vi.mock("../src/db.js", () => ({
  prisma: {},
  withPersonalSession: harness.withPersonalSession
}));

vi.mock("../src/services/phase202SecretBroker.js", () => ({
  createPersonalSecretReferenceInTransaction: harness.createSecret,
  readPersonalSecretValueInTransaction: harness.readSecret,
  revokePersonalSecretReferenceInTransaction: harness.revokeSecret
}));

vi.mock("../src/services/audit.js", () => ({ recordAuditLog: harness.audit }));

import {
  confirmTotpEnrollment,
  beginTotpEnrollment,
  matchingTotpCounter,
  regenerateRecoveryCodes,
  removeMfaFactor,
  verifyMfaStepUp
} from "../src/services/phase202Mfa.js";

const userId = "user-ada";
const actorId = "123e4567-e89b-42d3-a456-426614174202";
const factorId = "123e4567-e89b-42d3-a456-426614174205";
const sessionId = "123e4567-e89b-42d3-a456-426614174201";
const secretReferenceId = "123e4567-e89b-42d3-a456-426614174208";
const secret = "JBSWY3DPEHPK3PXP";
const jwtSecret = "test-secret-that-is-long-enough-for-jwt";

type HarnessState = {
  factorStatus: "PENDING" | "ACTIVE" | "REVOKED";
  factorVersion: number;
  lastCounter: bigint | null;
  receipts: Map<string, Record<string, unknown>>;
  recoveryHashes: Set<string>;
  sessions: Array<{ id: string; userId: string; revokedAt: Date | null; expiresAt: Date; stepUpAt: Date | null }>;
};

let state: HarnessState;
let transactionQueue: Promise<unknown>;

function decodeBase32(value: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];
  for (const character of value) {
    accumulator = (accumulator << 5) | alphabet.indexOf(character);
    bits += 5;
    if (bits >= 8) {
      bytes.push((accumulator >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totpCode(counter: number) {
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

function recoveryHash(code: string) {
  return createHmac("sha256", jwtSecret)
    .update(`phase202:mfa-recovery\0${code.trim().toUpperCase()}`)
    .digest("hex");
}

function snapshotState(): HarnessState {
  return {
    factorStatus: state.factorStatus,
    factorVersion: state.factorVersion,
    lastCounter: state.lastCounter,
    receipts: new Map([...state.receipts].map(([key, value]) => [key, structuredClone(value)])),
    recoveryHashes: new Set(state.recoveryHashes),
    sessions: state.sessions.map((session) => ({ ...session }))
  };
}

function restoreState(snapshot: HarnessState) {
  state = snapshot;
}

function factorRow() {
  return {
    id: factorId,
    userId,
    actorId,
    factorType: "TOTP",
    secretReferenceId,
    status: state.factorStatus,
    version: state.factorVersion,
    lastAcceptedTotpCounter: state.lastCounter,
    verifiedAt: state.factorStatus === "PENDING" ? null : new Date("2026-08-02T10:00:00.000Z"),
    createdAt: new Date("2026-08-02T09:00:00.000Z"),
    updatedAt: new Date("2026-08-02T10:00:00.000Z")
  };
}

function buildTransaction() {
  return {
    mfaFactor: {
      findFirst: vi.fn(async ({ where }: { where: { id?: string; status?: string } }) => {
        if (where.id && where.id !== factorId) return null;
        if (where.status && where.status !== state.factorStatus) return null;
        return factorRow();
      }),
      updateMany: vi.fn(async ({ where, data }: {
        where: { status?: string; version?: number; OR?: unknown };
        data: { status?: string; lastAcceptedTotpCounter?: bigint; version?: { increment: number } };
      }) => {
        if (where.version !== undefined && where.version !== state.factorVersion) return { count: 0 };
        if (where.status && where.status !== state.factorStatus) return { count: 0 };
        if (data.status === "ACTIVE" && state.factorStatus === "PENDING") {
          state.factorStatus = "ACTIVE";
          state.lastCounter = data.lastAcceptedTotpCounter ?? state.lastCounter;
          state.factorVersion += data.version?.increment ?? 0;
          return { count: 1 };
        }
        if (data.status === "REVOKED" && state.factorStatus !== "REVOKED") {
          state.factorStatus = "REVOKED";
          state.factorVersion += data.version?.increment ?? 0;
          return { count: 1 };
        }
        if (data.lastAcceptedTotpCounter !== undefined) {
          if (state.factorStatus !== "ACTIVE" || (state.lastCounter !== null && state.lastCounter >= data.lastAcceptedTotpCounter)) return { count: 0 };
          state.lastCounter = data.lastAcceptedTotpCounter;
          state.factorVersion += data.version?.increment ?? 0;
          return { count: 1 };
        }
        if (data.version) {
          state.factorVersion += data.version.increment;
          return { count: 1 };
        }
        return { count: 0 };
      }),
      update: vi.fn(async ({ data }: { data: { status?: string; version?: { increment: number } } }) => {
        if (data.status === "REVOKED") state.factorStatus = "REVOKED";
        state.factorVersion += data.version?.increment ?? 0;
        return factorRow();
      }),
      create: vi.fn(async () => factorRow())
    },
    mfaRecoveryCode: {
      createMany: vi.fn(async ({ data }: { data: Array<{ codeHash: string }> }) => {
        for (const row of data) state.recoveryHashes.add(row.codeHash);
        return { count: data.length };
      }),
      deleteMany: vi.fn(async () => {
        const count = state.recoveryHashes.size;
        state.recoveryHashes.clear();
        return { count };
      }),
      updateMany: vi.fn(async ({ where }: { where: { codeHash?: string } }) => {
        if (where.codeHash && state.recoveryHashes.delete(where.codeHash)) return { count: 1 };
        if (!where.codeHash) {
          const count = state.recoveryHashes.size;
          state.recoveryHashes.clear();
          return { count };
        }
        return { count: 0 };
      })
    },
    authSession: {
      findFirst: vi.fn(async ({ where }: { where: { id: string; userId: string } }) => {
        return state.sessions.find((session) => session.id === where.id && session.userId === where.userId && session.revokedAt === null) ?? null;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id?: string; userId: string }; data: { stepUpAt: Date | null } }) => {
        if (where.id) {
          const session = state.sessions.find((candidate) => candidate.id === where.id && candidate.userId === where.userId
            && candidate.revokedAt === null && candidate.expiresAt > new Date());
          if (!session) return { count: 0 };
          session.stepUpAt = data.stepUpAt;
          return { count: 1 };
        }
        const matching = state.sessions.filter((session) => session.userId === where.userId && session.stepUpAt !== null);
        for (const session of matching) session.stepUpAt = data.stepUpAt;
        return { count: matching.length };
      })
    },
    mfaMutationReceipt: {
      findUnique: vi.fn(async ({ where }: { where: { actorId_idempotencyKey: { idempotencyKey: string } } }) => {
        const resultPayload = state.receipts.get(where.actorId_idempotencyKey.idempotencyKey);
        return resultPayload ? {
          action: resultPayload.transition,
          requestFingerprint: resultPayload.__fingerprint,
          resultPayload
        } : null;
      }),
      create: vi.fn(async ({ data }: { data: { idempotencyKey: string; requestFingerprint: string; resultPayload: Record<string, unknown> } }) => {
        state.receipts.set(data.idempotencyKey, { ...data.resultPayload, __fingerprint: data.requestFingerprint });
        return data;
      })
    }
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-02T10:00:00.000Z"));
  state = {
    factorStatus: "ACTIVE",
    factorVersion: 2,
    lastCounter: null,
    receipts: new Map(),
    recoveryHashes: new Set(),
    sessions: [{ id: sessionId, userId, revokedAt: null, expiresAt: new Date("2026-08-02T12:00:00.000Z"), stepUpAt: null }]
  };
  transactionQueue = Promise.resolve();
  harness.audit.mockReset().mockResolvedValue(undefined);
  harness.createSecret.mockReset().mockResolvedValue({ id: secretReferenceId });
  harness.readSecret.mockReset().mockResolvedValue({ value: { base32: secret } });
  harness.revokeSecret.mockReset().mockResolvedValue(undefined);
  harness.withPersonalSession.mockReset().mockImplementation((_database, _context, operation) => {
    const run = transactionQueue.then(async () => {
      const before = snapshotState();
      try {
        return await operation(buildTransaction(), { actorId, appUserId: "123e4567-e89b-42d3-a456-426614174299", authSubject: userId });
      } catch (error) {
        restoreState(before);
        throw error;
      }
    });
    transactionQueue = run.catch(() => undefined);
    return run;
  });
});

describe("Phase 202 MFA service", () => {
  it("accepts only the current TOTP window and its one-step skew", () => {
    const now = Date.now();
    const counter = Math.floor(now / 30_000);
    expect(matchingTotpCounter(secret, totpCode(counter - 1), now)).toBe(counter - 1);
    expect(matchingTotpCounter(secret, totpCode(counter), now)).toBe(counter);
    expect(matchingTotpCounter(secret, totpCode(counter + 1), now)).toBe(counter + 1);
    expect(matchingTotpCounter(secret, totpCode(counter + 2), now)).toBeNull();
    expect(matchingTotpCounter(secret, "12a456", now)).toBeNull();
    expect(() => matchingTotpCounter(secret, totpCode(0), 0)).not.toThrow();
  });

  it("confirms enrollment atomically and rolls back when the durable session is invalid", async () => {
    state.factorStatus = "PENDING";
    const counter = Math.floor(Date.now() / 30_000);
    const confirmed = await confirmTotpEnrollment({ code: totpCode(counter), factorId, idempotencyKey: "confirm-key-0001", requestId: "confirm-1", sessionId, userId });
    expect(confirmed.recovery_codes).toHaveLength(10);
    expect(confirmed.receipt).toMatchObject({ transition: "TOTP_CONFIRM", prior_version: 2, resulting_version: 3 });
    expect(state.factorStatus).toBe("ACTIVE");
    expect(state.lastCounter).toBe(BigInt(counter));
    expect(state.recoveryHashes.size).toBe(10);
    expect(state.sessions[0]?.stepUpAt?.toISOString()).toBe("2026-08-02T10:00:00.000Z");

    state.factorStatus = "PENDING";
    state.factorVersion = 2;
    state.lastCounter = null;
    state.recoveryHashes.clear();
    state.sessions[0]!.expiresAt = new Date("2026-08-02T09:59:59.000Z");
    await expect(confirmTotpEnrollment({ code: totpCode(counter), factorId, idempotencyKey: "confirm-key-0002", requestId: "confirm-2", sessionId, userId }))
      .rejects.toMatchObject({ code: "DURABLE_SESSION_REQUIRED" });
    expect(state.factorStatus).toBe("PENDING");
    expect(state.lastCounter).toBeNull();
    expect(state.recoveryHashes.size).toBe(0);
  });

  it("replays an exact TOTP confirmation but rejects a changed proof under the same idempotency key", async () => {
    state.factorStatus = "PENDING";
    const code = totpCode(Math.floor(Date.now() / 30_000));
    const input = {
      code,
      factorId,
      idempotencyKey: "confirm-proof-key-1",
      requestId: "confirm-proof-original",
      sessionId,
      userId
    };
    const initial = await confirmTotpEnrollment(input);
    const versionAfterInitial = state.factorVersion;
    const replay = await confirmTotpEnrollment({ ...input, requestId: "confirm-proof-retry" });
    expect(replay).toMatchObject({ replayed: true, enrollment: null, recovery_codes: null });
    expect(replay.receipt.transition_id).toBe(initial.receipt.transition_id);
    expect(state.factorVersion).toBe(versionAfterInitial);

    const changedCode = code === "000000" ? "000001" : "000000";
    await expect(confirmTotpEnrollment({ ...input, code: changedCode, requestId: "confirm-proof-changed" }))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("returns one-time enrollment material once and replays only the raw-free receipt", async () => {
    state.factorStatus = "PENDING";
    state.factorVersion = 1;
    const input = {
      email: "ada@example.com",
      idempotencyKey: "enroll-key-00001",
      requestId: "enroll-request-1",
      sessionId,
      userId
    };
    const initial = await beginTotpEnrollment(input);
    const versionAfterInitial = state.factorVersion;
    expect(initial.replayed).toBe(false);
    expect(initial.enrollment?.secret).toMatch(/^[A-Z2-7]+$/u);
    expect(JSON.stringify(initial.receipt)).not.toContain(initial.enrollment?.secret);

    const replay = await beginTotpEnrollment({ ...input, requestId: "enroll-request-retry" });
    expect(replay).toMatchObject({ replayed: true, enrollment: null, recovery_codes: null });
    expect(replay.receipt.transition_id).toBe(initial.receipt.transition_id);
    expect(state.factorVersion).toBe(versionAfterInitial);
    expect(JSON.stringify([...state.receipts.values()])).not.toContain(initial.enrollment?.secret);

    await expect(verifyMfaStepUp({
      code: "ABCDE-FGHIJ",
      idempotencyKey: input.idempotencyKey,
      requestId: "reuse-request",
      sessionId,
      userId
    })).rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("replays an exact step-up without consuming the proof or incrementing the factor twice", async () => {
    const code = totpCode(Math.floor(Date.now() / 30_000));
    const input = { code, idempotencyKey: "step-replay-key-1", requestId: "step-original", sessionId, userId };
    const initial = await verifyMfaStepUp(input);
    const versionAfterInitial = state.factorVersion;
    const replay = await verifyMfaStepUp({ ...input, requestId: "step-retry" });
    expect(replay).toMatchObject({ replayed: true, enrollment: null, recovery_codes: null });
    expect(replay.receipt.transition_id).toBe(initial.receipt.transition_id);
    expect(state.factorVersion).toBe(versionAfterInitial);

    const changedCode = code === "000000" ? "000001" : "000000";
    await expect(verifyMfaStepUp({ ...input, code: changedCode, requestId: "step-changed-proof" }))
      .rejects.toMatchObject({ code: "IDEMPOTENCY_KEY_REUSED" });
  });

  it("rejects immediate and concurrent reuse of one TOTP counter", async () => {
    const code = totpCode(Math.floor(Date.now() / 30_000));
    const first = await verifyMfaStepUp({ code, idempotencyKey: "step-key-000001", requestId: "step-1", sessionId, userId });
    expect(first.receipt.session_step_up_at).toBe("2026-08-02T10:00:00.000Z");
    await expect(verifyMfaStepUp({ code, idempotencyKey: "step-key-000002", requestId: "step-2", sessionId, userId }))
      .rejects.toMatchObject({ code: "MFA_CODE_REPLAYED" });

    state.lastCounter = null;
    const concurrent = await Promise.allSettled([
      verifyMfaStepUp({ code, idempotencyKey: "step-key-000003", requestId: "step-3", sessionId, userId }),
      verifyMfaStepUp({ code, idempotencyKey: "step-key-000004", requestId: "step-4", sessionId, userId })
    ]);
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("consumes a recovery code once and rolls consumption back if session validation fails", async () => {
    const recovery = "ABCDE-FGHIJ";
    state.recoveryHashes.add(recoveryHash(recovery));
    await verifyMfaStepUp({ code: recovery, idempotencyKey: "recovery-key-001", requestId: "recovery-1", sessionId, userId });
    await expect(verifyMfaStepUp({ code: recovery, idempotencyKey: "recovery-key-002", requestId: "recovery-2", sessionId, userId }))
      .rejects.toMatchObject({ code: "MFA_CODE_INVALID" });

    const rollbackCode = "KLMNP-QRSTU";
    const rollbackHash = recoveryHash(rollbackCode);
    state.recoveryHashes.add(rollbackHash);
    state.sessions[0]!.revokedAt = new Date();
    await expect(verifyMfaStepUp({ code: rollbackCode, idempotencyKey: "recovery-key-003", requestId: "recovery-3", sessionId, userId }))
      .rejects.toMatchObject({ code: "DURABLE_SESSION_REQUIRED" });
    expect(state.recoveryHashes.has(rollbackHash)).toBe(true);
    state.sessions[0]!.revokedAt = null;
    await expect(verifyMfaStepUp({ code: rollbackCode, idempotencyKey: "recovery-key-004", requestId: "recovery-4", sessionId, userId }))
      .resolves.toMatchObject({ replayed: false });
  });

  it("regenerates recovery codes only after a nonfuture recent step-up", async () => {
    const oldHash = recoveryHash("ABCDE-FGHIJ");
    state.recoveryHashes.add(oldHash);
    state.sessions[0]!.stepUpAt = new Date("2026-08-02T09:55:00.000Z");
    const regenerated = await regenerateRecoveryCodes({ idempotencyKey: "regenerate-key-001", requestId: "regen-1", sessionId, userId });
    expect(regenerated.recovery_codes).toHaveLength(10);
    expect(state.recoveryHashes.has(oldHash)).toBe(false);
    expect(state.recoveryHashes.size).toBe(10);

    state.sessions[0]!.stepUpAt = new Date("2026-08-02T09:49:59.000Z");
    await expect(regenerateRecoveryCodes({ idempotencyKey: "regenerate-key-002", requestId: "regen-2", sessionId, userId }))
      .rejects.toMatchObject({ code: "RECENT_MFA_STEP_UP_REQUIRED" });
    state.sessions[0]!.stepUpAt = new Date("2026-08-02T10:00:01.000Z");
    await expect(regenerateRecoveryCodes({ idempotencyKey: "regenerate-key-003", requestId: "regen-3", sessionId, userId }))
      .rejects.toMatchObject({ code: "RECENT_MFA_STEP_UP_REQUIRED" });
  });

  it("removal revokes the factor and secret, consumes recovery codes, and clears every step-up", async () => {
    state.recoveryHashes.add(recoveryHash("ABCDE-FGHIJ"));
    state.sessions[0]!.stepUpAt = new Date("2026-08-02T09:59:00.000Z");
    state.sessions.push({ id: "other-session", userId, revokedAt: null, expiresAt: new Date("2026-08-02T12:00:00.000Z"), stepUpAt: new Date("2026-08-02T09:58:00.000Z") });
    const removed = await removeMfaFactor({ factorId, idempotencyKey: "remove-key-00001", requestId: "remove-1", sessionId, userId });
    expect(removed.receipt).toMatchObject({ transition: "FACTOR_REVOKE", factor_status: "REVOKED" });
    expect(state.factorStatus).toBe("REVOKED");
    expect(state.recoveryHashes.size).toBe(0);
    expect(state.sessions.every((session) => session.stepUpAt === null)).toBe(true);
    expect(harness.revokeSecret).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ secretReferenceId }));
    expect(harness.audit).toHaveBeenCalledWith(expect.objectContaining({ action: "auth.mfa.factor_removed" }), expect.anything());
  });
});
