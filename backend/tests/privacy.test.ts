import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  compare: vi.fn(),
  stringifySecretEnvelope: vi.fn(),
  withPersonalSession: vi.fn(),
  withTenantSession: vi.fn()
}));

vi.mock("bcryptjs", () => ({ default: { compare: harness.compare } }));
vi.mock("../src/env.js", () => ({
  env: {
    DATA_ENCRYPTION_KEY_VERSION: "phase202-v1",
    JWT_SECRET: "phase202-privacy-test-secret-long-enough",
    MFA_STEP_UP_TTL_SECONDS: 600
  }
}));
vi.mock("../src/db.js", () => ({
  prisma: {},
  withPersonalSession: harness.withPersonalSession,
  withTenantSession: harness.withTenantSession
}));
vi.mock("../src/services/secureJson.js", () => ({
  stringifySecretEnvelope: harness.stringifySecretEnvelope
}));

const userId = "phase202-user";
const actorId = "123e4567-e89b-42d3-a456-426614174201";
const tenantId = "123e4567-e89b-42d3-a456-426614174202";
const organizationId = "123e4567-e89b-42d3-a456-426614174203";
const sessionId = "123e4567-e89b-42d3-a456-426614174204";
const now = new Date("2026-08-02T12:00:00.000Z");

beforeEach(() => {
  harness.compare.mockReset().mockResolvedValue(true);
  harness.stringifySecretEnvelope.mockReset().mockReturnValue("v2.phase202-encrypted-command");
  harness.withPersonalSession.mockReset();
  harness.withTenantSession.mockReset();
});

describe("Phase 202 privacy boundaries", () => {
  it("exports only the authenticated tenant through explicit safe projections", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ factorReady: true, sessionReady: true }]),
      user: { findUnique: vi.fn().mockResolvedValue({ id: userId, name: "Ada", email: "ada@example.test", role: "USER", createdAt: now, updatedAt: now, emailVerifiedAt: now }) },
      team: { findUnique: vi.fn().mockResolvedValue({ id: "team-a", name: "Tenant A", slug: "tenant-a", environment: "PRODUCTION", dataResidency: "US" }) },
      teamMember: { findFirst: vi.fn().mockResolvedValue({ role: "MEMBER", status: "ACTIVE", version: 2, joinedAt: now, suspendedAt: null, removedAt: null }) },
      task: { findMany: vi.fn().mockResolvedValue([{ id: "task-a", title: "A only", description: "tenant-a-content", status: "TODO", dueDate: null, createdAt: now, updatedAt: now, createdById: userId, assignedToId: null }]) }
    };
    harness.withTenantSession.mockImplementation(async (_db, context, operation) => operation(transaction, {
      actorId,
      appUserId: "123e4567-e89b-42d3-a456-426614174205",
      authSubject: userId,
      organizationId,
      role: "MEMBER",
      tenantId
    }));

    const { buildAccountExport } = await import("../src/services/privacy.js");
    const result = await buildAccountExport({ authSubject: userId, requestId: "export-a", sessionId, sessionType: "member", tenantId });
    expect(result.scope).toMatchObject({ kind: "TENANT", organization_id: organizationId, tenant_id: tenantId, secret_material_included: false });
    expect(result.tasks).toEqual([expect.objectContaining({ id: "task-a", description: "tenant-a-content" })]);
    expect(transaction.task.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { teamId: "team-a" } }));
    expect(JSON.stringify(result)).not.toMatch(/passwordHash|tokenHash|encryptedValue|secretReference|refreshToken|tenant-b-content/u);
  });

  it("limits an internal-session export to personal identity and safe security descriptors", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ factorReady: true, sessionReady: true }]),
      user: { findUnique: vi.fn().mockResolvedValue({ id: userId, name: "Ada", email: "ada@example.test", role: "USER", createdAt: now, updatedAt: now, emailVerifiedAt: now }) },
      authSession: { findMany: vi.fn().mockResolvedValue([{ id: sessionId, sessionType: "INTERNAL", deviceLabel: "Laptop", issuedAt: now, lastUsedAt: now, expiresAt: now, revokedAt: null, revokeReason: null }]) },
      mfaFactor: { findMany: vi.fn().mockResolvedValue([{ id: "factor-a", factorType: "TOTP", status: "ACTIVE", verifiedAt: now, createdAt: now }]) }
    };
    harness.withPersonalSession.mockImplementation(async (_db, _context, operation) => operation(transaction, { actorId, appUserId: actorId, authSubject: userId }));

    const { buildAccountExport } = await import("../src/services/privacy.js");
    const result = await buildAccountExport({ authSubject: userId, requestId: "export-personal", sessionId, sessionType: "internal", tenantId: null });
    expect(result.scope).toMatchObject({ kind: "PERSONAL", tenant_id: null, secret_material_included: false });
    expect(result.summary).toMatchObject({ teams: 0, sessions: 1, mfa_factors: 1 });
    expect(JSON.stringify(result)).not.toMatch(/tokenHash|codeHash|secretReferenceId|userAgentHash|ipAddressHash/u);
  });

  it("fails a sensitive export closed when the durable MFA factor is no longer active", async () => {
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ factorReady: false, sessionReady: true }])
    };
    harness.withPersonalSession.mockImplementation(async (_db, _context, operation) => operation(transaction, { actorId, appUserId: actorId, authSubject: userId }));
    const { buildAccountExport } = await import("../src/services/privacy.js");
    await expect(buildAccountExport({
      authSubject: userId,
      requestId: "export-with-revoked-factor",
      sessionId,
      sessionType: "internal",
      tenantId: null
    })).rejects.toMatchObject({ code: "MFA_FACTOR_REQUIRED", statusCode: 403 });
  });

  it("locks password verification and atomically supplies real encrypted membership deliveries", async () => {
    const queries: string[] = [];
    const transaction = {
      $queryRaw: vi.fn(async (query: { strings: readonly string[] }) => {
        const sql = query.strings.join("?");
        queries.push(sql);
        if (sql.includes('account."passwordHash"')) return [{ deletedAt: null, passwordHash: "bcrypt-hash" }];
        if (sql.includes("phase202_prepare_account_deidentification")) return [{
          actorId,
          email: "ada@example.test",
          environment: "PRODUCTION",
          organizationId,
          priorVersion: 3,
          role: "MEMBER",
          status: "ACTIVE",
          teamId: "team-a",
          teamName: "Tenant A",
          tenantId,
          userId
        }];
        if (sql.includes("phase202_complete_account_deidentification")) return [{
          membershipReceiptIds: ["123e4567-e89b-42d3-a456-426614174210"],
          occurredAt: now,
          receiptHash: "a".repeat(64),
          receiptId: "123e4567-e89b-42d3-a456-426614174211"
        }];
        throw new Error(`Unexpected query: ${sql}`);
      })
    };
    harness.withPersonalSession.mockImplementation(async (_db, _context, operation) => operation(transaction, { actorId, appUserId: actorId, authSubject: userId }));

    const { deidentifyAccount } = await import("../src/services/privacy.js");
    const result = await deidentifyAccount({
      authSubject: userId,
      idempotencyKey: "deidentify-202",
      password: "confirmed-password",
      requestId: "request-202",
      sessionId
    });
    expect(harness.compare).toHaveBeenCalledWith("confirmed-password", "bcrypt-hash");
    expect(harness.stringifySecretEnvelope).toHaveBeenCalledWith(
      expect.objectContaining({ action: "removed", kind: "CHANGE", to: "ada@example.test", token: null }),
      expect.objectContaining({ actorId, organizationId, purpose: "membership-email-delivery", tenantId })
    );
    expect(queries).toHaveLength(3);
    expect(result).toMatchObject({ outcome: "ACCOUNT_DEIDENTIFIED", tenant_records: "RETAINED", receipt_hash: "a".repeat(64) });
    expect(JSON.stringify(result)).not.toContain("ada@example.test");
  });

  it("rejects a wrong password before ownership preparation or mutation", async () => {
    harness.compare.mockResolvedValue(false);
    const transaction = {
      $queryRaw: vi.fn().mockResolvedValue([{ deletedAt: null, passwordHash: "bcrypt-hash" }])
    };
    harness.withPersonalSession.mockImplementation(async (_db, _context, operation) => operation(transaction, { actorId, appUserId: actorId, authSubject: userId }));
    const { deidentifyAccount, Phase202PrivacyError } = await import("../src/services/privacy.js");
    await expect(deidentifyAccount({ authSubject: userId, idempotencyKey: "deidentify-202", password: "wrong", requestId: "request-202", sessionId }))
      .rejects.toEqual(expect.objectContaining({ code: "PASSWORD_CONFIRMATION_FAILED", statusCode: 401 } satisfies Partial<InstanceType<typeof Phase202PrivacyError>>));
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("maps a last-owner database rejection to a typed 409 without claiming completion", async () => {
    const transaction = {
      $queryRaw: vi.fn()
        .mockResolvedValueOnce([{ deletedAt: null, passwordHash: "bcrypt-hash" }])
        .mockRejectedValueOnce(new Error("LAST_ACTIVE_OWNER_REQUIRED"))
    };
    harness.withPersonalSession.mockImplementation(async (_db, _context, operation) => operation(transaction, { actorId, appUserId: actorId, authSubject: userId }));
    const { deidentifyAccount } = await import("../src/services/privacy.js");
    await expect(deidentifyAccount({ authSubject: userId, idempotencyKey: "deidentify-202", password: "confirmed-password", requestId: "request-202", sessionId }))
      .rejects.toMatchObject({ code: "LAST_ACTIVE_OWNER_REQUIRED", statusCode: 409 });
    expect(harness.stringifySecretEnvelope).not.toHaveBeenCalled();
  });
});
