"use client";

import Link from "next/link";
import React, { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, UserPlus } from "lucide-react";
import { Button } from "./Button";
import { TextField } from "./TextField";

type InvitationResponse = {
  invitationAccepted?: boolean;
  message?: string;
};

const invitationTokenPattern = /^\S{32,256}$/;

async function responsePayload(response: Response) {
  return response.json().catch(() => null) as Promise<InvitationResponse | null>;
}

function invitationTokenFromLocation() {
  const url = new URL(window.location.href);
  const values = url.searchParams.getAll("token");
  const value = values.length === 1 ? values[0]?.trim() ?? "" : "";

  window.history.replaceState(null, "", url.pathname);
  return invitationTokenPattern.test(value) ? value : "";
}

function invitationIdempotencyKey() {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    throw new Error("Secure browser randomness is unavailable.");
  }

  return `phase202-invitation-${globalThis.crypto.randomUUID()}`;
}

export function AccountInvitationAcceptance() {
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [successKind, setSuccessKind] = useState<"existing" | "signup" | null>(null);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isAcceptingExisting, setIsAcceptingExisting] = useState(false);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  useEffect(() => {
    try {
      setInvitationToken(invitationTokenFromLocation());
    } catch {
      setInvitationToken("");
    }
  }, []);

  async function createInvitedAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitationToken || isCreatingAccount || isAcceptingExisting) return;

    setError("");
    setSuccess("");
    setSuccessKind(null);

    if (password !== confirmation) {
      setError("Passwords must match.");
      confirmationRef.current?.focus();
      return;
    }

    setIsCreatingAccount(true);
    try {
      const response = await fetch("/api/member/invitations/signup", {
        body: JSON.stringify({
          email,
          invitation_token: invitationToken,
          name,
          password
        }),
        cache: "no-store",
        credentials: "include",
        headers: { "content-type": "application/json" },
        method: "POST",
        referrerPolicy: "no-referrer"
      });
      const payload = await responsePayload(response);

      if (!response.ok || !payload?.invitationAccepted) {
        setError(response.status === 409
          ? "An account already exists for this email. Sign in, reopen the invitation link, and accept it as an existing member."
          : payload?.message ?? "Entral could not accept this invitation. Request a new invitation and try again.");
        return;
      }

      setSuccess(payload.message ?? "Invitation accepted. Verify your email before signing in to Entral.");
      setSuccessKind("signup");
      setInvitationToken("");
      setName("");
      setEmail("");
      setPassword("");
      setConfirmation("");
    } catch {
      setError("Entral could not reach the invitation service. Try again shortly.");
    } finally {
      setIsCreatingAccount(false);
    }
  }

  async function acceptForExistingAccount() {
    if (!invitationToken || isCreatingAccount || isAcceptingExisting) return;

    setError("");
    setSuccess("");
    setSuccessKind(null);
    setIsAcceptingExisting(true);

    try {
      idempotencyKeyRef.current ??= invitationIdempotencyKey();
      const response = await fetch("/api/member/invitations/accept", {
        body: JSON.stringify({
          idempotency_key: idempotencyKeyRef.current,
          token: invitationToken
        }),
        cache: "no-store",
        credentials: "include",
        headers: { "content-type": "application/json" },
        method: "POST",
        referrerPolicy: "no-referrer"
      });
      const payload = await responsePayload(response);

      if (!response.ok) {
        setError(response.status === 401
          ? "Sign in to your existing account, reopen the original invitation link, and try again."
          : payload?.message ?? "Entral could not accept this invitation. Request a new invitation and try again.");
        return;
      }

      setSuccess(payload?.message ?? "Invitation accepted. Your organization workspace is ready.");
      setSuccessKind("existing");
      setInvitationToken("");
    } catch (requestError) {
      setError(requestError instanceof Error && requestError.message === "Secure browser randomness is unavailable."
        ? requestError.message
        : "Entral could not reach the invitation service. Try again shortly.");
    } finally {
      setIsAcceptingExisting(false);
    }
  }

  if (invitationToken === null) {
    return <p className="member-auth-success" role="status"><Loader2 aria-hidden="true" className="spin" size={18} />Checking invitation link…</p>;
  }

  if (success) {
    return (
      <div className="member-auth-form">
        <div className="member-auth-heading">
          <span className="member-auth-icon" aria-hidden="true"><CheckCircle2 size={20} /></span>
          <div>
            <p className="eyebrow">Invitation accepted</p>
            <h1>Your Entral access is ready</h1>
            <p>Continue with the account step described below.</p>
          </div>
        </div>
        <p className="member-auth-success" role="status"><CheckCircle2 aria-hidden="true" size={18} />{success}</p>
        <nav className="member-auth-links" aria-label="Invitation next steps">
          {successKind === "signup" ? <Link href="/member/verify-email">Verify email</Link> : null}
          {successKind === "existing" ? <Link href="/member/dashboard">Open member workspace</Link> : null}
          <Link href="/member/sign-in">Member sign in</Link>
        </nav>
      </div>
    );
  }

  if (!invitationToken) {
    return (
      <div className="member-auth-form">
        <div className="member-auth-heading">
          <span className="member-auth-icon" aria-hidden="true"><UserPlus size={20} /></span>
          <div>
            <p className="eyebrow">Secure organization access</p>
            <h1>Invitation link unavailable</h1>
            <p>This invitation link is missing, malformed, or expired. Ask an organization owner to send a new invitation.</p>
          </div>
        </div>
        <p className="member-auth-error" role="alert">Entral did not receive a valid invitation token.</p>
        <Link className="member-auth-back" href="/member/sign-in">Return to member sign in</Link>
      </div>
    );
  }

  return (
    <div className="member-auth-form">
      <div className="member-auth-heading">
        <span className="member-auth-icon" aria-hidden="true"><UserPlus size={20} /></span>
        <div>
          <p className="eyebrow">Secure organization access</p>
          <h1>Accept your Entral invitation</h1>
          <p>Create a member account for this invitation, or accept it with an account you already use.</p>
        </div>
      </div>

      {error && error !== "Passwords must match." ? <p className="member-auth-error" role="alert">{error}</p> : null}

      <form className="member-auth-form" onSubmit={createInvitedAccount}>
        <TextField
          autoComplete="name"
          disabled={isCreatingAccount || isAcceptingExisting}
          label="Full name"
          maxLength={80}
          minLength={2}
          name="name"
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
        <TextField
          autoComplete="email"
          disabled={isCreatingAccount || isAcceptingExisting}
          label="Email address"
          maxLength={320}
          name="email"
          onChange={(event) => setEmail(event.target.value)}
          required
          type="email"
          value={email}
        />
        <TextField
          autoComplete="new-password"
          disabled={isCreatingAccount || isAcceptingExisting}
          label="Create password"
          maxLength={128}
          minLength={8}
          name="password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
        <TextField
          autoComplete="new-password"
          disabled={isCreatingAccount || isAcceptingExisting}
          error={error === "Passwords must match." ? error : undefined}
          inputRef={confirmationRef}
          label="Confirm password"
          maxLength={128}
          minLength={8}
          name="password-confirmation"
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
        <Button className="member-auth-submit" isLoading={isCreatingAccount} type="submit">
          {isCreatingAccount ? <Loader2 aria-hidden="true" className="spin" size={18} /> : null}
          Create account and accept
          {!isCreatingAccount ? <ArrowRight aria-hidden="true" size={18} /> : null}
        </Button>
      </form>

      <div className="member-access-note">
        <p><strong>Already have an Entral account?</strong> Sign in in another tab, return here, then accept with that session.</p>
        <nav className="member-auth-links" aria-label="Existing member invitation">
          <Link href="/member/sign-in" rel="noreferrer" target="_blank">Sign in in another tab</Link>
          <Button
            disabled={isCreatingAccount}
            isLoading={isAcceptingExisting}
            onClick={acceptForExistingAccount}
            type="button"
            variant="secondary"
          >
            {isAcceptingExisting ? <Loader2 aria-hidden="true" className="spin" size={18} /> : null}
            Accept with existing account
          </Button>
        </nav>
      </div>
    </div>
  );
}
