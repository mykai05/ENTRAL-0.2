"use client";

import {
  assertSessionTransitionReceipt,
  type SessionTransitionReceipt,
  type DependencyUnavailableResult,
  type MfaTransitionReceipt,
  type SessionInventoryItem,
  type SupportAccessGrantDescriptor
} from "@entral/contracts";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  KeyRound,
  LifeBuoy,
  LogOut,
  MonitorSmartphone,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Users
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, apiFetch } from "../lib/api";
import { BrandMark } from "./BrandMark";
import { Button } from "./Button";

type MembershipInventoryItem = {
  user_id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  version: number;
  joined_at: string;
  suspended_at: string | null;
  removed_at: string | null;
};

type MfaFactorInventoryItem = {
  factor_id: string;
  factor_type: "TOTP";
  status: "PENDING" | "ACTIVE" | "REVOKED";
  verified_at: string | null;
  created_at: string;
};

type LoadState<T> =
  | { kind: "loading" }
  | { kind: "ready"; value: T }
  | { kind: "blocked"; value: DependencyUnavailableResult }
  | { kind: "error"; message: string };

type TotpEnrollment = {
  factor_id: string;
  secret: string;
};

type MfaMutationEnvelope = {
  replayed: boolean;
  receipt: MfaTransitionReceipt;
  one_time_material: Record<string, unknown> | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short"
});

const surfaceStyle: React.CSSProperties = {
  margin: "0 auto",
  maxWidth: "min(72rem, 100%)",
  width: "100%"
};

const contentStyle: React.CSSProperties = {
  display: "grid",
  gap: "1rem"
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: "0.65rem",
  listStyle: "none",
  margin: 0,
  padding: 0
};

const itemStyle: React.CSSProperties = {
  alignItems: "start",
  background: "rgba(255, 255, 240, 0.035)",
  border: "1px solid rgba(255, 255, 240, 0.1)",
  borderRadius: "8px",
  display: "grid",
  gap: "0.55rem",
  padding: "0.8rem"
};

const metadataStyle: React.CSSProperties = {
  color: "var(--muted)",
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.82rem",
  gap: "0.4rem 0.9rem"
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function blockedResult(error: unknown): DependencyUnavailableResult | null {
  if (!(error instanceof ApiError) || !isRecord(error.details)) return null;
  const details = error.details;
  if (
    details.contract_version !== "1.0.0"
    || details.schema_version !== 1
    || details.status !== "BLOCKED"
    || typeof details.dependency !== "string"
    || typeof details.reason_code !== "string"
    || typeof details.retryable !== "boolean"
    || typeof details.occurred_at !== "string"
  ) return null;
  return details as unknown as DependencyUnavailableResult;
}

function failedState<T>(error: unknown): LoadState<T> {
  const blocked = blockedResult(error);
  if (blocked) return { kind: "blocked", value: blocked };
  return {
    kind: "error",
    message: error instanceof Error ? error.message : "The security readback could not be verified."
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unverified time" : dateTimeFormatter.format(date);
}

function isSessionInventoryItem(value: unknown): value is SessionInventoryItem {
  return isRecord(value)
    && typeof value.session_id === "string"
    && typeof value.actor_id === "string"
    && (value.organization_id === null || typeof value.organization_id === "string")
    && (value.tenant_id === null || typeof value.tenant_id === "string")
    && (value.session_type === "INTERNAL" || value.session_type === "MEMBER" || value.session_type === "SUPPORT")
    && (value.support_grant_id === null || typeof value.support_grant_id === "string")
    && typeof value.device_label === "string"
    && typeof value.issued_at === "string"
    && typeof value.last_used_at === "string"
    && typeof value.expires_at === "string"
    && (value.revoked_at === null || typeof value.revoked_at === "string")
    && typeof value.current === "boolean";
}

function isMfaFactor(value: unknown): value is MfaFactorInventoryItem {
  return isRecord(value)
    && typeof value.factor_id === "string"
    && value.factor_type === "TOTP"
    && (value.status === "PENDING" || value.status === "ACTIVE" || value.status === "REVOKED")
    && (value.verified_at === null || typeof value.verified_at === "string")
    && typeof value.created_at === "string";
}

function isMembership(value: unknown): value is MembershipInventoryItem {
  return isRecord(value)
    && typeof value.user_id === "string"
    && typeof value.email === "string"
    && typeof value.name === "string"
    && typeof value.role === "string"
    && typeof value.status === "string"
    && typeof value.version === "number"
    && typeof value.joined_at === "string"
    && (value.suspended_at === null || typeof value.suspended_at === "string")
    && (value.removed_at === null || typeof value.removed_at === "string");
}

function isSupportGrant(value: unknown): value is SupportAccessGrantDescriptor {
  return isRecord(value)
    && typeof value.grant_id === "string"
    && typeof value.tenant_id === "string"
    && typeof value.organization_id === "string"
    && typeof value.support_actor_id === "string"
    && typeof value.purpose === "string"
    && Array.isArray(value.scopes)
    && value.scopes.every((scope) => typeof scope === "string")
    && (value.access_mode === "READ_ONLY" || value.access_mode === "WRITE_ELEVATED")
    && (value.write_elevation_purpose === null || typeof value.write_elevation_purpose === "string")
    && (value.write_elevation_expires_at === null || typeof value.write_elevation_expires_at === "string")
    && value.owner_visible === true
    && typeof value.approved_by_actor_id === "string"
    && typeof value.issued_at === "string"
    && typeof value.expires_at === "string"
    && (value.revoked_at === null || typeof value.revoked_at === "string");
}

function parseArrayEnvelope<T>(
  payload: unknown,
  key: string,
  predicate: (value: unknown) => value is T
): T[] {
  if (!isRecord(payload) || !Array.isArray(payload[key]) || !payload[key].every(predicate)) {
    throw new Error(`The ${key} readback did not match the Phase 202 contract.`);
  }
  return payload[key] as T[];
}

function assertMfaMutation(payload: unknown, transition: MfaTransitionReceipt["transition"]): MfaMutationEnvelope {
  if (!isRecord(payload) || typeof payload.replayed !== "boolean" || !isRecord(payload.receipt)
    || payload.receipt.transition !== transition || !(payload.one_time_material === null || isRecord(payload.one_time_material))) {
    throw new Error("The MFA transition response did not match the Phase 202 contract.");
  }
  return payload as unknown as MfaMutationEnvelope;
}

function assertTotpEnrollment(payload: MfaMutationEnvelope): TotpEnrollment | null {
  const material = payload.one_time_material;
  if (material === null && payload.replayed && payload.receipt.recovery_action === "BEGIN_NEW_ENROLLMENT") return null;
  if (!material || typeof material.factor_id !== "string" || typeof material.secret !== "string" || typeof material.otpauth_uri !== "string") {
    throw new Error("The authenticator enrollment response was incomplete.");
  }
  return {
    factor_id: material.factor_id,
    secret: material.secret
  };
}

function assertRecoveryCodes(payload: MfaMutationEnvelope): string[] | null {
  const material = payload.one_time_material;
  if (material === null && payload.replayed && payload.receipt.recovery_action === "REGENERATE_RECOVERY_CODES") return null;
  if (!material || !Array.isArray(material.recovery_codes) || material.recovery_codes.length === 0
    || !material.recovery_codes.every((code) => typeof code === "string" && code.length > 0)) {
    throw new Error("The one-time recovery code response was incomplete.");
  }
  return material.recovery_codes as string[];
}

function assertSessionMutation(payload: unknown, transition: SessionTransitionReceipt["transition"]) {
  assertSessionTransitionReceipt(payload);
  if (payload.transition !== transition) throw new Error("The session transition response did not match the requested action.");
  return payload;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function ReadbackFailure({ state, label }: { state: Extract<LoadState<unknown>, { kind: "blocked" | "error" }>; label: string }) {
  if (state.kind === "blocked") {
    return (
      <div className="member-auth-error" role="alert">
        <strong>{label} blocked.</strong>{" "}
        {state.value.dependency.replaceAll("_", " ")} reported {state.value.reason_code}.
        {state.value.retryable ? " Retry is available." : " Owner action is required."}
      </div>
    );
  }
  return <p className="member-auth-error" role="alert">{label}: {state.message}</p>;
}

function LoadingReadback({ label }: { label: string }) {
  return <p className="settings-helper" role="status"><RefreshCw aria-hidden="true" className="spin" size={16} /> Loading {label}...</p>;
}

export function AccountSecurityControls({
  onNavigate = (path: string) => window.location.assign(path)
}: {
  onNavigate?: (path: string) => void;
} = {}) {
  const [sessions, setSessions] = useState<LoadState<SessionInventoryItem[]>>({ kind: "loading" });
  const [factors, setFactors] = useState<LoadState<MfaFactorInventoryItem[]>>({ kind: "loading" });
  const [memberships, setMemberships] = useState<LoadState<MembershipInventoryItem[]>>({ kind: "loading" });
  const [supportGrants, setSupportGrants] = useState<LoadState<SupportAccessGrantDescriptor[]>>({ kind: "loading" });
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [stepUpCode, setStepUpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const actionInFlightRef = useRef(false);
  const mutationKeysRef = useRef(new Map<string, string>());

  function mutationHeaders(intent: string) {
    let key = mutationKeysRef.current.get(intent);
    if (!key) {
      key = crypto.randomUUID();
      mutationKeysRef.current.set(intent, key);
    }
    return { "idempotency-key": key };
  }

  function completeMutation(intent: string) {
    mutationKeysRef.current.delete(intent);
  }

  function reconcileMutationFailure(intent: string, error: unknown) {
    if (error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 408) {
      mutationKeysRef.current.delete(intent);
    }
  }

  const loadReadbacks = useCallback(async (signal?: AbortSignal) => {
    setSessions({ kind: "loading" });
    setFactors({ kind: "loading" });
    setMemberships({ kind: "loading" });
    setSupportGrants({ kind: "loading" });

    const requests = [
      (async () => {
        try {
          const payload = await apiFetch<unknown>("/identity/sessions", { signal });
          setSessions({ kind: "ready", value: parseArrayEnvelope(payload, "sessions", isSessionInventoryItem) });
        } catch (error) {
          if (!isAbortError(error)) setSessions(failedState(error));
        }
      })(),
      (async () => {
        try {
          const payload = await apiFetch<unknown>("/identity/mfa/factors", { signal });
          setFactors({ kind: "ready", value: parseArrayEnvelope(payload, "factors", isMfaFactor) });
        } catch (error) {
          if (!isAbortError(error)) setFactors(failedState(error));
        }
      })(),
      (async () => {
        try {
          const payload = await apiFetch<unknown>("/identity/memberships", { signal });
          setMemberships({ kind: "ready", value: parseArrayEnvelope(payload, "memberships", isMembership) });
        } catch (error) {
          if (!isAbortError(error)) setMemberships(failedState(error));
        }
      })(),
      (async () => {
        try {
          const payload = await apiFetch<unknown>("/identity/support-access", { signal });
          setSupportGrants({ kind: "ready", value: parseArrayEnvelope(payload, "grants", isSupportGrant) });
        } catch (error) {
          if (!isAbortError(error)) setSupportGrants(failedState(error));
        }
      })()
    ];
    await Promise.all(requests);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadReadbacks(controller.signal);
    return () => controller.abort();
  }, [loadReadbacks]);

  function beginAction(action: string) {
    if (actionInFlightRef.current) return false;
    actionInFlightRef.current = true;
    setActionError("");
    setNotice("");
    setBusyAction(action);
    return true;
  }

  function finishAction() {
    actionInFlightRef.current = false;
    setBusyAction("");
  }

  function reportActionFailure(error: unknown, fallback: string) {
    const blocked = blockedResult(error);
    if (blocked) {
      setActionError(`${blocked.dependency.replaceAll("_", " ")} blocked this action: ${blocked.reason_code}.`);
      return;
    }
    setActionError(error instanceof Error ? error.message : fallback);
  }

  async function refreshReadbacks() {
    if (!beginAction("readbacks:refresh")) return;
    setActionError("");
    setNotice("");
    try {
      await loadReadbacks();
    } finally {
      finishAction();
    }
  }

  async function revokeSession(sessionId: string) {
    const intent = `session:revoke:${sessionId}`;
    if (!beginAction(`session:${sessionId}`)) return;
    try {
      const revokingCurrent = sessions.kind === "ready"
        && sessions.value.some((session) => session.session_id === sessionId && session.current);
      const receipt = await apiFetch<unknown>(`/identity/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        headers: mutationHeaders(intent)
      });
      assertSessionMutation(receipt, "REVOKE_ONE");
      completeMutation(intent);
      if (revokingCurrent) {
        onNavigate("/member/sign-in");
        return;
      }
      setNotice("Session revoked and verified by a fresh inventory readback.");
      try {
        const payload = await apiFetch<unknown>("/identity/sessions");
        setSessions({ kind: "ready", value: parseArrayEnvelope(payload, "sessions", isSessionInventoryItem) });
      } catch (readbackError) {
        setSessions(failedState(readbackError));
        setActionError("The session was revoked, but its fresh inventory readback could not be verified.");
      }
    } catch (error) {
      reconcileMutationFailure(intent, error);
      reportActionFailure(error, "The session could not be revoked.");
    } finally {
      finishAction();
    }
  }

  async function revokeAllSessions() {
    const intent = "sessions:revoke-all";
    if (!beginAction("sessions:all")) return;
    try {
      const receipt = await apiFetch<unknown>("/identity/sessions", {
        method: "DELETE",
        headers: mutationHeaders(intent)
      });
      assertSessionMutation(receipt, "REVOKE_ALL");
      completeMutation(intent);
      onNavigate("/member/sign-in");
    } catch (error) {
      reconcileMutationFailure(intent, error);
      reportActionFailure(error, "The sessions could not be revoked.");
      finishAction();
    }
  }

  async function startTotpEnrollment() {
    const intent = "mfa:enroll";
    if (!beginAction("mfa:enroll")) return;
    setEnrollment(null);
    setRecoveryCodes([]);
    try {
      const payload = assertMfaMutation(await apiFetch<unknown>("/identity/mfa/totp/enroll", {
        method: "POST",
        headers: mutationHeaders(intent)
      }), "TOTP_ENROLL");
      const material = assertTotpEnrollment(payload);
      completeMutation(intent);
      setEnrollment(material);
      setNotice(material
        ? "Authenticator enrollment started. The setup key is shown once."
        : "The enrollment transition already succeeded, so its setup key was not replayed. Begin a new enrollment to receive new one-time setup material.");
    } catch (error) {
      reconcileMutationFailure(intent, error);
      reportActionFailure(error, "Authenticator enrollment could not start.");
    } finally {
      finishAction();
    }
  }

  async function copyOneTimeValue(value: string, label: string) {
    setActionError("");
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied. Clear your clipboard after use.`);
    } catch {
      setActionError(`${label} could not be copied. Select it manually.`);
    }
  }

  async function confirmTotp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    const intent = `mfa:confirm:${enrollment.factor_id}`;
    if (!beginAction("mfa:confirm")) return;
    try {
      const payload = await apiFetch<unknown>("/identity/mfa/totp/confirm", {
        method: "POST",
        headers: mutationHeaders(intent),
        json: { code: totpCode, factor_id: enrollment.factor_id }
      });
      const confirmed = assertRecoveryCodes(assertMfaMutation(payload, "TOTP_CONFIRM"));
      completeMutation(intent);
      setEnrollment(null);
      setTotpCode("");
      setRecoveryCodes(confirmed ?? []);
      setNotice(confirmed
        ? "Authenticator MFA is active. Save the recovery codes now; they will not be shown again."
        : "Authenticator MFA is active, but the one-time recovery codes were not replayed. Verify again and regenerate recovery codes with a new request.");
      try {
        const factorsPayload = await apiFetch<unknown>("/identity/mfa/factors");
        setFactors({ kind: "ready", value: parseArrayEnvelope(factorsPayload, "factors", isMfaFactor) });
      } catch (readbackError) {
        setFactors(failedState(readbackError));
        setActionError("MFA was activated, but its fresh factor readback could not be verified. Keep the one-time recovery codes.");
      }
    } catch (error) {
      reconcileMutationFailure(intent, error);
      reportActionFailure(error, "Authenticator enrollment could not be confirmed.");
    } finally {
      finishAction();
    }
  }

  async function verifyStepUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const intent = "mfa:step-up";
    if (!beginAction("mfa:step-up")) return;
    try {
      const receipt = await apiFetch<unknown>("/identity/mfa/step-up", {
        method: "POST",
        headers: mutationHeaders(intent),
        json: { code: stepUpCode }
      });
      assertMfaMutation(receipt, "STEP_UP");
      completeMutation(intent);
      setStepUpCode("");
      setNotice("Recent MFA verification recorded for restricted account actions.");
    } catch (error) {
      reconcileMutationFailure(intent, error);
      reportActionFailure(error, "MFA verification failed.");
    } finally {
      finishAction();
    }
  }

  async function regenerateRecoveryCodes() {
    const intent = "mfa:recovery:regenerate";
    if (!beginAction("mfa:recovery")) return;
    setRecoveryCodes([]);
    try {
      const payload = await apiFetch<unknown>("/identity/mfa/recovery/regenerate", {
        method: "POST",
        headers: mutationHeaders(intent)
      });
      const regenerated = assertRecoveryCodes(assertMfaMutation(payload, "RECOVERY_REGENERATE"));
      completeMutation(intent);
      setRecoveryCodes(regenerated ?? []);
      setNotice(regenerated
        ? "New recovery codes issued. All previous recovery codes are invalid."
        : "Recovery-code regeneration already succeeded, so the one-time codes were not replayed. Verify again and regenerate a fresh set.");
    } catch (error) {
      reconcileMutationFailure(intent, error);
      reportActionFailure(error, "Recovery codes could not be regenerated.");
    } finally {
      finishAction();
    }
  }

  async function removeFactor(factorId: string) {
    const intent = `mfa:remove:${factorId}`;
    if (!beginAction(`mfa:remove:${factorId}`)) return;
    try {
      const receipt = await apiFetch<unknown>(`/identity/mfa/${encodeURIComponent(factorId)}`, {
        method: "DELETE",
        headers: mutationHeaders(intent)
      });
      assertMfaMutation(receipt, "FACTOR_REVOKE");
      completeMutation(intent);
      setEnrollment((current) => current?.factor_id === factorId ? null : current);
      setRecoveryCodes([]);
      setNotice("MFA factor removed and verified by a fresh inventory readback.");
      try {
        const factorsPayload = await apiFetch<unknown>("/identity/mfa/factors");
        setFactors({ kind: "ready", value: parseArrayEnvelope(factorsPayload, "factors", isMfaFactor) });
      } catch (readbackError) {
        setFactors(failedState(readbackError));
        setActionError("The MFA factor was removed, but its fresh inventory readback could not be verified.");
      }
    } catch (error) {
      reconcileMutationFailure(intent, error);
      reportActionFailure(error, "The MFA factor could not be removed.");
    } finally {
      finishAction();
    }
  }

  return (
    <main className="member-auth-shell phase202-account-security-shell" id="main-content">
      <section className="member-auth-card phase202-account-security-card" style={surfaceStyle} aria-labelledby="account-security-heading">
        <header className="member-auth-brand">
          <BrandMark href="/member/dashboard" label="Entral member dashboard" />
          <span>Identity authority</span>
        </header>

        <div className="member-auth-heading">
          <span className="member-auth-icon"><ShieldCheck aria-hidden="true" size={24} /></span>
          <div>
            <p className="eyebrow">Phase 202 account control</p>
            <h1 id="account-security-heading">Account security</h1>
            <p>Review durable sessions, authenticator MFA, tenant membership, and owner-visible support access from authenticated authority readbacks.</p>
          </div>
        </div>

        <div className="settings-actions">
          <a className="button button-secondary" href="/member/dashboard">Return to dashboard</a>
          <Button isLoading={busyAction === "readbacks:refresh"} onClick={() => void refreshReadbacks()} variant="secondary">
            <RefreshCw aria-hidden="true" size={17} /> Refresh verified state
          </Button>
        </div>

        {notice ? <p className="member-auth-success" role="status"><CheckCircle2 aria-hidden="true" size={18} /> {notice}</p> : null}
        {actionError ? <p className="member-auth-error" role="alert"><AlertTriangle aria-hidden="true" size={18} /> {actionError}</p> : null}

        <div className="phase202-account-security-content" style={contentStyle}>
          <section className="privacy-action" aria-labelledby="active-sessions-heading">
            <div className="section-title-row">
              <MonitorSmartphone aria-hidden="true" size={20} />
              <h2 id="active-sessions-heading">Durable sessions</h2>
            </div>
            <p className="settings-helper">Session identifiers are server-generated. Revocation takes effect in the durable session store, not only in this browser.</p>
            {sessions.kind === "loading" ? <LoadingReadback label="sessions" /> : null}
            {sessions.kind === "blocked" || sessions.kind === "error" ? <ReadbackFailure label="Session inventory" state={sessions} /> : null}
            {sessions.kind === "ready" ? (
              sessions.value.length ? (
                <ul style={listStyle}>
                  {sessions.value.map((session) => (
                    <li key={session.session_id} style={itemStyle}>
                      <div className="section-title-row">
                        <strong>{session.device_label}</strong>
                        {session.current ? <span className="status-pill status-real">Current</span> : null}
                        {session.revoked_at ? <span className="status-pill status-read-only">Revoked</span> : null}
                      </div>
                      <div style={metadataStyle}>
                        <span>{session.session_type.toLowerCase()} session</span>
                        <span>Last used {formatDate(session.last_used_at)}</span>
                        <span>Expires {formatDate(session.expires_at)}</span>
                      </div>
                      {!session.revoked_at ? (
                        <div className="settings-actions">
                          <Button
                            isLoading={busyAction === `session:${session.session_id}`}
                            onClick={() => void revokeSession(session.session_id)}
                            variant="danger"
                          >
                            <LogOut aria-hidden="true" size={16} /> Revoke {session.current ? "current" : "session"}
                          </Button>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : <p className="settings-helper">No durable sessions were returned for this identity.</p>
            ) : null}
            <div className="settings-actions danger-zone">
              <Button
                disabled={sessions.kind !== "ready" || !sessions.value.some((session) => !session.revoked_at)}
                isLoading={busyAction === "sessions:all"}
                onClick={() => void revokeAllSessions()}
                variant="danger"
              >
                <LogOut aria-hidden="true" size={16} /> Sign out everywhere
              </Button>
            </div>
          </section>

          <section className="privacy-action" aria-labelledby="mfa-heading">
            <div className="section-title-row">
              <KeyRound aria-hidden="true" size={20} />
              <h2 id="mfa-heading">Authenticator MFA</h2>
            </div>
            <p className="settings-helper">Setup keys and recovery codes are one-time values. Entral does not save them in browser storage or include them in logs.</p>
            {factors.kind === "loading" ? <LoadingReadback label="MFA factors" /> : null}
            {factors.kind === "blocked" || factors.kind === "error" ? <ReadbackFailure label="MFA inventory" state={factors} /> : null}
            {factors.kind === "ready" ? (
              <ul style={listStyle} aria-label="MFA factors">
                {factors.value.length ? factors.value.map((factor) => (
                  <li key={factor.factor_id} style={itemStyle}>
                    <div className="section-title-row">
                      <strong>Authenticator app</strong>
                      <span className={`status-pill ${factor.status === "ACTIVE" ? "status-real" : "status-read-only"}`}>{factor.status.toLowerCase()}</span>
                    </div>
                    <div style={metadataStyle}>
                      <span>Added {formatDate(factor.created_at)}</span>
                      {factor.verified_at ? <span>Verified {formatDate(factor.verified_at)}</span> : null}
                    </div>
                    {factor.status !== "REVOKED" ? (
                      <div className="settings-actions">
                        <Button
                          isLoading={busyAction === `mfa:remove:${factor.factor_id}`}
                          onClick={() => void removeFactor(factor.factor_id)}
                          variant="danger"
                        >
                          <Trash2 aria-hidden="true" size={16} /> Remove factor
                        </Button>
                      </div>
                    ) : null}
                  </li>
                )) : <li className="settings-helper">No authenticator factor is active.</li>}
              </ul>
            ) : null}

            {!enrollment ? (
              <div className="settings-actions">
                <Button isLoading={busyAction === "mfa:enroll"} onClick={() => void startTotpEnrollment()} variant="secondary">
                  <KeyRound aria-hidden="true" size={16} /> Enroll authenticator
                </Button>
              </div>
            ) : (
              <form className="settings-section account-settings-form" onSubmit={confirmTotp}>
                <div>
                  <strong>One-time setup key</strong>
                  <p className="settings-helper">Enter this key in your authenticator app, then verify its current code below.</p>
                </div>
                <code style={{ overflowWrap: "anywhere", userSelect: "all" }}>{enrollment.secret}</code>
                <div className="settings-actions">
                  <Button onClick={() => void copyOneTimeValue(enrollment.secret, "Setup key")} variant="secondary">
                    <Copy aria-hidden="true" size={16} /> Copy setup key
                  </Button>
                  <Button onClick={() => {
                    setEnrollment(null);
                    setTotpCode("");
                    setNotice("Authenticator enrollment secret cleared from this view.");
                  }} variant="ghost">Cancel and clear</Button>
                </div>
                <label>
                  <span>Authenticator code</span>
                  <input
                    aria-label="Authenticator enrollment code"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    maxLength={8}
                    onChange={(event) => setTotpCode(event.target.value.replace(/\D/g, ""))}
                    pattern="[0-9]{6,8}"
                    required
                    value={totpCode}
                  />
                </label>
                <div className="settings-actions">
                  <Button disabled={totpCode.length < 6} isLoading={busyAction === "mfa:confirm"} type="submit">
                    <ShieldCheck aria-hidden="true" size={16} /> Confirm MFA
                  </Button>
                </div>
              </form>
            )}

            <form className="settings-section account-settings-form" onSubmit={verifyStepUp}>
              <div>
                <strong>Verify a restricted action</strong>
                <p className="settings-helper">Record a recent MFA check before a sensitive account or authority action.</p>
              </div>
              <label>
                <span>Current authenticator or recovery code</span>
                <input
                  aria-label="MFA step-up code"
                  autoComplete="one-time-code"
                  onChange={(event) => setStepUpCode(event.target.value.trim())}
                  required
                  value={stepUpCode}
                />
              </label>
              <div className="settings-actions">
                <Button disabled={stepUpCode.length < 6} isLoading={busyAction === "mfa:step-up"} type="submit">
                  Verify recent MFA
                </Button>
                <Button isLoading={busyAction === "mfa:recovery"} onClick={() => void regenerateRecoveryCodes()} variant="secondary">
                  Regenerate recovery codes
                </Button>
              </div>
            </form>

            {recoveryCodes.length ? (
              <div className="privacy-action" aria-label="One-time recovery codes">
                <div className="section-title-row"><AlertTriangle aria-hidden="true" size={18} /><strong>Save these recovery codes now</strong></div>
                <p className="settings-helper">Each code works once. They are held only in this component until you clear or leave the page.</p>
                <ul style={{ ...listStyle, gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}>
                  {recoveryCodes.map((code) => <li key={code}><code style={{ userSelect: "all" }}>{code}</code></li>)}
                </ul>
                <div className="settings-actions">
                  <Button onClick={() => void copyOneTimeValue(recoveryCodes.join("\n"), "Recovery codes")} variant="secondary">
                    <Copy aria-hidden="true" size={16} /> Copy recovery codes
                  </Button>
                  <Button onClick={() => {
                    setRecoveryCodes([]);
                    setNotice("One-time recovery codes cleared from this view.");
                  }} variant="ghost">I saved them; clear view</Button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="privacy-action" aria-labelledby="memberships-heading">
            <div className="section-title-row"><Users aria-hidden="true" size={20} /><h2 id="memberships-heading">Tenant membership readback</h2></div>
            <p className="settings-helper">Owner-visible membership state is sourced from the active tenant boundary. Removed members remain visible as tombstones.</p>
            {memberships.kind === "loading" ? <LoadingReadback label="memberships" /> : null}
            {memberships.kind === "blocked" || memberships.kind === "error" ? <ReadbackFailure label="Membership readback" state={memberships} /> : null}
            {memberships.kind === "ready" ? (
              memberships.value.length ? (
                <ul style={listStyle}>
                  {memberships.value.map((membership) => (
                    <li key={`${membership.user_id}:${membership.version}`} style={itemStyle}>
                      <div className="section-title-row">
                        <strong>{membership.name || membership.email}</strong>
                        <span className={`status-pill ${membership.status === "ACTIVE" ? "status-real" : "status-read-only"}`}>{membership.status.toLowerCase()}</span>
                      </div>
                      <span>{membership.email}</span>
                      <div style={metadataStyle}>
                        <span>{membership.role}</span>
                        <span>Version {membership.version}</span>
                        <span>Joined {formatDate(membership.joined_at)}</span>
                        {membership.suspended_at ? <span>Suspended {formatDate(membership.suspended_at)}</span> : null}
                        {membership.removed_at ? <span>Removed {formatDate(membership.removed_at)}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : <p className="settings-helper">No membership rows were returned for this tenant.</p>
            ) : null}
          </section>

          <section className="privacy-action" aria-labelledby="support-access-heading">
            <div className="section-title-row"><LifeBuoy aria-hidden="true" size={20} /><h2 id="support-access-heading">Owner-visible support access</h2></div>
            <p className="settings-helper">Every support grant is explicit, time-bounded, tenant-scoped, and visible here. Revoked and expired grants remain part of the readback.</p>
            {supportGrants.kind === "loading" ? <LoadingReadback label="support grants" /> : null}
            {supportGrants.kind === "blocked" || supportGrants.kind === "error" ? <ReadbackFailure label="Support access readback" state={supportGrants} /> : null}
            {supportGrants.kind === "ready" ? (
              supportGrants.value.length ? (
                <ul style={listStyle}>
                  {supportGrants.value.map((grant) => {
                    const inactive = Boolean(grant.revoked_at) || Date.parse(grant.expires_at) <= Date.now();
                    return (
                      <li key={grant.grant_id} style={itemStyle}>
                        <div className="section-title-row">
                          <strong>{grant.purpose}</strong>
                          <span className={`status-pill ${inactive ? "status-read-only" : "status-real"}`}>{inactive ? "inactive" : grant.access_mode.toLowerCase().replaceAll("_", " ")}</span>
                        </div>
                        <div style={metadataStyle}>
                          <span>Support actor {grant.support_actor_id}</span>
                          <span>Approved by {grant.approved_by_actor_id}</span>
                          <span>Issued {formatDate(grant.issued_at)}</span>
                          <span>Expires {formatDate(grant.expires_at)}</span>
                          {grant.write_elevation_expires_at ? <span>Write elevation expires {formatDate(grant.write_elevation_expires_at)}</span> : null}
                          {grant.revoked_at ? <span>Revoked {formatDate(grant.revoked_at)}</span> : null}
                        </div>
                        {grant.write_elevation_purpose ? <span className="settings-helper">Write elevation purpose: {grant.write_elevation_purpose}</span> : null}
                        <span className="settings-helper">Scopes: {grant.scopes.join(", ") || "none"}</span>
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="settings-helper">No support access grants exist for this tenant.</p>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
