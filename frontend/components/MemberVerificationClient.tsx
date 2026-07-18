"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { Button } from "./Button";
import { TextField } from "./TextField";

export function MemberVerificationClient({ token }: { token?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      if (token) {
        await apiFetch("/email-verification/confirm", { json: { token }, method: "POST" });
        router.replace("/member");
        router.refresh();
        return;
      }

      const response = await apiFetch<{ message: string }>("/email-verification/request", {
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
          <p className="eyebrow">Email verification</p>
          <h1>{token ? "Verify your email" : "Send a new verification link"}</h1>
          <p>{token ? "Confirm this verification link to continue to your member workspace." : "We will send a new link if the address belongs to an unverified Entral account."}</p>
        </div>
      </div>

      {error ? <p className="member-auth-error" role="alert">{error}</p> : null}
      {message ? <p className="member-auth-success" role="status"><CheckCircle2 aria-hidden="true" size={18} />{message}</p> : null}
      {!token ? <TextField autoComplete="email" label="Email address" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /> : null}

      <Button className="member-auth-submit" isLoading={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 aria-hidden="true" className="spin" size={18} /> : null}
        {token ? "Verify and continue" : "Send verification link"}
      </Button>
      <Link className="member-auth-back" href="/member/sign-in"><ArrowLeft aria-hidden="true" size={16} />Back to sign in</Link>
    </form>
  );
}
