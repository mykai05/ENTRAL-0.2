"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { FormEvent, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { Button } from "./Button";
import { TextField } from "./TextField";

export function MemberRecoveryClient({ token }: { token?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmationError, setConfirmationError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const confirmationRef = useRef<HTMLInputElement | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    if (token && password !== confirmation) {
      setConfirmationError("Passwords must match.");
      confirmationRef.current?.focus();
      return;
    }

    setError("");
    setConfirmationError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (token) {
        await apiFetch("/password-reset/confirm", {
          json: { password, token },
          method: "POST"
        });
        router.replace("/member");
        router.refresh();
        return;
      }

      const response = await apiFetch<{ message: string }>("/password-reset/request", {
        json: { email, flow: "member" },
        method: "POST"
      });
      setMessage(response.message);
      setEmail("");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "Entral could not complete the request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="member-auth-form" onSubmit={handleSubmit}>
      <div className="member-auth-heading">
        <div>
          <p className="eyebrow">Account recovery</p>
          <h1>{token ? "Choose a new password" : "Reset your password"}</h1>
          <p>{token ? "Enter a new password for your verified Entral account." : "We will send a recovery link if the address belongs to an Entral account."}</p>
        </div>
      </div>

      {error ? <p className="member-auth-error" role="alert">{error}</p> : null}
      {message ? <p className="member-auth-success" role="status"><CheckCircle2 aria-hidden="true" size={18} />{message}</p> : null}

      {token ? (
        <>
          <TextField autoComplete="new-password" label="New password" minLength={12} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          <TextField
            autoComplete="new-password"
            error={confirmationError}
            inputRef={confirmationRef}
            label="Confirm new password"
            minLength={12}
            onChange={(event) => {
              setConfirmation(event.target.value);
              if (confirmationError) setConfirmationError("");
            }}
            required
            type="password"
            value={confirmation}
          />
        </>
      ) : (
        <TextField autoComplete="email" label="Email address" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
      )}

      <Button className="member-auth-submit" isLoading={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 aria-hidden="true" className="spin" size={18} /> : null}
        {token ? "Update password" : "Send recovery link"}
      </Button>
      <Link className="member-auth-back" href="/member/sign-in"><ArrowLeft aria-hidden="true" size={16} />Back to sign in</Link>
    </form>
  );
}
