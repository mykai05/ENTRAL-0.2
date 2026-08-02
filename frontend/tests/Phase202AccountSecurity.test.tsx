import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { AccountSecurityControls } from "../components/AccountSecurityControls";

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn()
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, apiFetch: mocks.apiFetch };
});

const currentSession = {
  session_id: "123e4567-e89b-42d3-a456-426614174020",
  actor_id: "123e4567-e89b-42d3-a456-426614174001",
  organization_id: "123e4567-e89b-42d3-a456-426614174002",
  tenant_id: "123e4567-e89b-42d3-a456-426614174003",
  session_type: "MEMBER" as const,
  support_grant_id: null,
  device_label: "Chrome on Windows",
  issued_at: "2026-08-02T09:00:00.000Z",
  last_used_at: "2026-08-02T10:00:00.000Z",
  expires_at: "2026-09-01T09:00:00.000Z",
  revoked_at: null,
  current: true
};

const otherSession = {
  ...currentSession,
  session_id: "123e4567-e89b-42d3-a456-426614174021",
  device_label: "Safari on iPad",
  current: false
};

const activeFactor = {
  factor_id: "factor-1",
  factor_type: "TOTP" as const,
  status: "ACTIVE" as const,
  verified_at: "2026-08-02T10:05:00.000Z",
  created_at: "2026-08-02T10:00:00.000Z"
};

const ownerMembership = {
  user_id: "user-owner",
  email: "owner@example.com",
  name: "Owner Example",
  role: "OWNER",
  status: "ACTIVE",
  version: 3,
  joined_at: "2026-01-01T00:00:00.000Z",
  suspended_at: null,
  removed_at: null
};

const supportGrant = {
  grant_id: "123e4567-e89b-42d3-a456-426614174010",
  tenant_id: "123e4567-e89b-42d3-a456-426614174003",
  organization_id: "123e4567-e89b-42d3-a456-426614174002",
  support_actor_id: "123e4567-e89b-42d3-a456-426614174011",
  purpose: "Production incident readback",
  scopes: ["graph.read", "telemetry.read"],
  access_mode: "READ_ONLY" as const,
  write_elevation_purpose: null,
  write_elevation_expires_at: null,
  owner_visible: true as const,
  approved_by_actor_id: "123e4567-e89b-42d3-a456-426614174001",
  issued_at: "2026-08-02T09:00:00.000Z",
  expires_at: "2099-08-02T11:00:00.000Z",
  revoked_at: null
};

function mfaMutation(
  transition: "TOTP_ENROLL" | "TOTP_CONFIRM" | "STEP_UP" | "RECOVERY_REGENERATE" | "FACTOR_REVOKE",
  oneTimeMaterial: Record<string, unknown> | null = null,
  recoveryAction: "BEGIN_NEW_ENROLLMENT" | "REGENERATE_RECOVERY_CODES" | "NONE" = "NONE"
) {
  return {
    replayed: false,
    receipt: {
      transition,
      recovery_action: recoveryAction
    },
    one_time_material: oneTimeMaterial
  };
}

function sessionMutation(transition: "REVOKE_ONE" | "REVOKE_ALL", sessionId: string | null) {
  return {
    contract_version: "1.0.0",
    schema_version: 1,
    transition_id: "123e4567-e89b-42d3-a456-426614174099",
    transition,
    ownership: {
      scope_kind: "PERSONAL",
      organization_id: null,
      tenant_id: null,
      business_id: null,
      environment: "PRODUCTION",
      data_residency: null
    },
    actor: {
      actor_id: currentSession.actor_id,
      actor_type: "HUMAN",
      human_user_id: "user-owner",
      service_subject: null,
      agent_id: null
    },
    request_id: "request-session-revoke",
    idempotency_key: "session-revoke-0001",
    prior_version: 1,
    resulting_version: 2,
    revoked_count: transition === "REVOKE_ONE" ? 1 : 2,
    subject_session_id: sessionId,
    budget: { kind: "NO_EXTERNAL_SPEND", amount_minor_units: 0 },
    reversible: false,
    verification: "TRANSACTIONAL_READBACK",
    reconciliation: "IDEMPOTENT_RECEIPT",
    failure_behavior: "NO_PARTIAL_WRITE",
    evidence: ["session-revocation:verified"],
    occurred_at: "2026-08-02T10:10:00.000Z",
    release_version: "phase-202"
  };
}

function installReadbackFixtures({ factors = [activeFactor], sessions = [currentSession, otherSession] } = {}) {
  mocks.apiFetch.mockImplementation(async (path: string) => {
    if (path === "/identity/sessions") return { sessions };
    if (path === "/identity/mfa/factors") return { factors };
    if (path === "/identity/memberships") return { memberships: [ownerMembership] };
    if (path === "/identity/support-access") return { grants: [supportGrant] };
    throw new Error(`Unexpected request ${path}`);
  });
}

describe("Phase 202 AccountSecurityControls", () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads typed session, MFA, membership, and owner-visible support readbacks in parallel", async () => {
    installReadbackFixtures();

    render(<AccountSecurityControls />);

    expect(screen.getByText("Loading sessions...")).toBeInTheDocument();
    expect(await screen.findByText("Chrome on Windows")).toBeInTheDocument();
    expect(screen.getByText("Safari on iPad")).toBeInTheDocument();
    expect(screen.getByText("Owner Example")).toBeInTheDocument();
    expect(screen.getByText("Production incident readback")).toBeInTheDocument();
    expect(screen.getByText("Scopes: graph.read, telemetry.read")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "MFA factors" })).toHaveTextContent("Authenticator app");
    expect(screen.getByText(`Support actor ${supportGrant.support_actor_id}`)).toBeInTheDocument();
    expect(screen.getByText(`Approved by ${supportGrant.approved_by_actor_id}`)).toBeInTheDocument();

    expect(mocks.apiFetch).toHaveBeenCalledWith("/identity/sessions", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(mocks.apiFetch).toHaveBeenCalledWith("/identity/mfa/factors", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(mocks.apiFetch).toHaveBeenCalledWith("/identity/memberships", expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(mocks.apiFetch).toHaveBeenCalledWith("/identity/support-access", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it("revokes one durable session and requires a fresh server inventory readback", async () => {
    let sessionsRead = 0;
    mocks.apiFetch.mockImplementation(async (path: string, options?: { method?: string; headers?: Record<string, string> }) => {
      if (path === "/identity/sessions") {
        sessionsRead += 1;
        return { sessions: sessionsRead === 1 ? [currentSession, otherSession] : [currentSession, { ...otherSession, revoked_at: "2026-08-02T10:10:00.000Z" }] };
      }
      if (path === `/identity/sessions/${otherSession.session_id}` && options?.method === "DELETE") {
        expect(options.headers?.["idempotency-key"]).toMatch(/\S{12,}/u);
        return sessionMutation("REVOKE_ONE", otherSession.session_id);
      }
      if (path === "/identity/mfa/factors") return { factors: [activeFactor] };
      if (path === "/identity/memberships") return { memberships: [ownerMembership] };
      if (path === "/identity/support-access") return { grants: [] };
      throw new Error(`Unexpected request ${path}`);
    });

    render(<AccountSecurityControls />);
    const otherDevice = await screen.findByText("Safari on iPad");
    const sessionItem = otherDevice.closest("li");
    expect(sessionItem).not.toBeNull();

    await userEvent.click(within(sessionItem!).getByRole("button", { name: "Revoke session" }));

    await waitFor(() => {
      expect(mocks.apiFetch).toHaveBeenCalledWith(`/identity/sessions/${otherSession.session_id}`, expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({ "idempotency-key": expect.any(String) })
      }));
      expect(sessionsRead).toBe(2);
    });
    expect(within(sessionItem!).queryByRole("button", { name: "Revoke session" })).not.toBeInTheDocument();
    expect(await screen.findByText(/Session revoked and verified by a fresh inventory readback/i)).toBeInTheDocument();
  });

  it("signs out after revoking the current session instead of claiming an impossible authenticated readback", async () => {
    let sessionReads = 0;
    const navigate = vi.fn();
    mocks.apiFetch.mockImplementation(async (path: string, options?: { method?: string; headers?: Record<string, string> }) => {
      if (path === "/identity/sessions") {
        sessionReads += 1;
        return { sessions: [currentSession, otherSession] };
      }
      if (path === `/identity/sessions/${currentSession.session_id}` && options?.method === "DELETE") {
        expect(options.headers?.["idempotency-key"]).toMatch(/\S{12,}/u);
        return sessionMutation("REVOKE_ONE", currentSession.session_id);
      }
      if (path === "/identity/mfa/factors") return { factors: [activeFactor] };
      if (path === "/identity/memberships") return { memberships: [ownerMembership] };
      if (path === "/identity/support-access") return { grants: [] };
      throw new Error(`Unexpected request ${path}`);
    });

    render(<AccountSecurityControls onNavigate={navigate} />);
    const currentDevice = await screen.findByText("Chrome on Windows");
    const sessionItem = currentDevice.closest("li");
    expect(sessionItem).not.toBeNull();
    await userEvent.click(within(sessionItem!).getByRole("button", { name: "Revoke current" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/member/sign-in"));
    expect(sessionReads).toBe(1);
    expect(screen.queryByText(/verified by a fresh inventory readback/i)).not.toBeInTheDocument();
  });

  it("keeps setup secrets and recovery codes one-time, non-persistent, and clearable", async () => {
    const localStorageWrite = vi.spyOn(Storage.prototype, "setItem");
    let factorReads = 0;
    mocks.apiFetch.mockImplementation(async (path: string, options?: { method?: string; headers?: Record<string, string>; json?: unknown }) => {
      if (path === "/identity/sessions") return { sessions: [currentSession] };
      if (path === "/identity/mfa/factors") {
        factorReads += 1;
        return { factors: factorReads === 1 ? [] : [activeFactor] };
      }
      if (path === "/identity/memberships") return { memberships: [ownerMembership] };
      if (path === "/identity/support-access") return { grants: [] };
      if (path === "/identity/mfa/totp/enroll" && options?.method === "POST") {
        expect(options.headers?.["idempotency-key"]).toEqual(expect.any(String));
        return mfaMutation("TOTP_ENROLL", {
          factor_id: "factor-1",
          secret: "ONE-TIME-SETUP-KEY",
          otpauth_uri: "otpauth://totp/entral?secret=ONE-TIME-SETUP-KEY"
        }, "BEGIN_NEW_ENROLLMENT");
      }
      if (path === "/identity/mfa/totp/confirm" && options?.method === "POST") {
        expect(options.json).toEqual({ code: "123456", factor_id: "factor-1" });
        expect(options.headers?.["idempotency-key"]).toEqual(expect.any(String));
        return mfaMutation("TOTP_CONFIRM", { recovery_codes: ["RECOVERY-A", "RECOVERY-B"] }, "REGENERATE_RECOVERY_CODES");
      }
      throw new Error(`Unexpected request ${path}`);
    });

    render(<AccountSecurityControls />);
    await screen.findByText("No authenticator factor is active.");
    await userEvent.click(screen.getByRole("button", { name: "Enroll authenticator" }));

    expect(await screen.findByText("ONE-TIME-SETUP-KEY")).toBeInTheDocument();
    expect(screen.queryByText(/otpauth:\/\//i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Authenticator enrollment code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Confirm MFA" }));

    expect(await screen.findByText("RECOVERY-A")).toBeInTheDocument();
    expect(screen.getByText("RECOVERY-B")).toBeInTheDocument();
    expect(screen.queryByText("ONE-TIME-SETUP-KEY")).not.toBeInTheDocument();
    expect(localStorageWrite).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /I saved them; clear view/i }));
    expect(screen.queryByText("RECOVERY-A")).not.toBeInTheDocument();
  });

  it("supports step-up, recovery regeneration, and durable factor removal", async () => {
    let factorPresent = true;
    mocks.apiFetch.mockImplementation(async (path: string, options?: { method?: string; headers?: Record<string, string>; json?: unknown }) => {
      if (path === "/identity/sessions") return { sessions: [currentSession] };
      if (path === "/identity/mfa/factors") return { factors: factorPresent ? [activeFactor] : [] };
      if (path === "/identity/memberships") return { memberships: [ownerMembership] };
      if (path === "/identity/support-access") return { grants: [] };
      if (path === "/identity/mfa/step-up") return mfaMutation("STEP_UP");
      if (path === "/identity/mfa/recovery/regenerate") return mfaMutation(
        "RECOVERY_REGENERATE",
        { recovery_codes: ["NEW-RECOVERY"] },
        "REGENERATE_RECOVERY_CODES"
      );
      if (path === "/identity/mfa/factor-1" && options?.method === "DELETE") {
        factorPresent = false;
        return mfaMutation("FACTOR_REVOKE");
      }
      throw new Error(`Unexpected request ${path}`);
    });

    render(<AccountSecurityControls />);
    await screen.findByText("Authenticator app");

    await userEvent.type(screen.getByLabelText("MFA step-up code"), "654321");
    await userEvent.click(screen.getByRole("button", { name: "Verify recent MFA" }));
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledWith("/identity/mfa/step-up", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "idempotency-key": expect.any(String) }),
      json: { code: "654321" }
    })));

    await userEvent.click(screen.getByRole("button", { name: "Regenerate recovery codes" }));
    expect(await screen.findByText("NEW-RECOVERY")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove factor" }));
    await waitFor(() => expect(mocks.apiFetch).toHaveBeenCalledWith("/identity/mfa/factor-1", expect.objectContaining({
      method: "DELETE",
      headers: expect.objectContaining({ "idempotency-key": expect.any(String) })
    })));
    expect(screen.queryByText("Authenticator app")).not.toBeInTheDocument();
  });

  it("reuses an in-memory idempotency key after an ambiguous MFA response", async () => {
    const stepUpKeys: string[] = [];
    let stepUpAttempts = 0;
    mocks.apiFetch.mockImplementation(async (path: string, options?: { method?: string; headers?: Record<string, string> }) => {
      if (path === "/identity/sessions") return { sessions: [currentSession] };
      if (path === "/identity/mfa/factors") return { factors: [activeFactor] };
      if (path === "/identity/memberships") return { memberships: [ownerMembership] };
      if (path === "/identity/support-access") return { grants: [] };
      if (path === "/identity/mfa/step-up" && options?.method === "POST") {
        stepUpKeys.push(options.headers?.["idempotency-key"] ?? "");
        stepUpAttempts += 1;
        if (stepUpAttempts === 1) throw new ApiError(503, "The receipt readback was interrupted.", null);
        return mfaMutation("STEP_UP");
      }
      throw new Error(`Unexpected request ${path}`);
    });

    render(<AccountSecurityControls />);
    await screen.findByText("Authenticator app");
    await userEvent.type(screen.getByLabelText("MFA step-up code"), "654321");
    await userEvent.click(screen.getByRole("button", { name: "Verify recent MFA" }));
    expect(await screen.findByText(/receipt readback was interrupted/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Verify recent MFA" }));
    expect(await screen.findByText(/Recent MFA verification recorded/i)).toBeInTheDocument();
    expect(stepUpKeys).toHaveLength(2);
    expect(stepUpKeys[0]).toMatch(/\S{12,}/);
    expect(stepUpKeys[1]).toBe(stepUpKeys[0]);
  });

  it("renders fail-closed dependency and malformed-readback states", async () => {
    mocks.apiFetch.mockImplementation(async (path: string) => {
      if (path === "/identity/sessions") {
        throw new ApiError(503, "Session authority unavailable.", {
          contract_version: "1.0.0",
          schema_version: 1,
          status: "BLOCKED",
          dependency: "SESSION_STORE",
          reason_code: "SESSION_STORE_UNAVAILABLE",
          retryable: true,
          occurred_at: "2026-08-02T10:00:00.000Z"
        });
      }
      if (path === "/identity/mfa/factors") return { factors: [] };
      if (path === "/identity/memberships") return { memberships: "not-an-array" };
      if (path === "/identity/support-access") return { grants: [] };
      throw new Error(`Unexpected request ${path}`);
    });

    render(<AccountSecurityControls />);

    expect(await screen.findByText(/Session inventory blocked/i)).toBeInTheDocument();
    expect(screen.getByText(/SESSION STORE reported SESSION_STORE_UNAVAILABLE/i)).toBeInTheDocument();
    expect(await screen.findByText(/memberships readback did not match the Phase 202 contract/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out everywhere" })).toBeDisabled();
  });
});
