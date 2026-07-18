"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { FormEvent, useState } from "react";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { Button } from "./Button";
import { TextField } from "./TextField";
import { sovereignProtocolUrl } from "../lib/member";

type LoginResponse = {
  message?: string;
  user?: { email: string; id: string; name: string; role: string };
};

export function MemberSignInClient({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/member/login", {
        body: JSON.stringify({ email, password }),
        cache: "no-store",
        credentials: "include",
        headers: { "content-type": "application/json" },
        method: "POST"
      });
      const payload = await response.json().catch(() => null) as LoginResponse | null;

      if (!response.ok || !payload?.user) {
        setError(payload?.message ?? "Sign in failed. Check your details and try again.");
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("Entral could not reach the member service. Try again shortly.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="member-auth-form" onSubmit={handleSubmit}>
      <div className="member-auth-heading">
        <span className="member-auth-icon" aria-hidden="true"><LockKeyhole size={20} /></span>
        <div>
          <p className="eyebrow">Secure member access</p>
          <h1>Sign in to Entral</h1>
          <p>Open the organization workspace assigned to your verified account.</p>
        </div>
      </div>

      {error ? <p className="member-auth-error" role="alert">{error}</p> : null}

      <TextField
        autoComplete="email"
        label="Email address"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        required
        type="email"
        value={email}
      />
      <TextField
        autoComplete="current-password"
        label="Password"
        name="password"
        onChange={(event) => setPassword(event.target.value)}
        required
        type="password"
        value={password}
      />

      <Button className="member-auth-submit" isLoading={isSubmitting} type="submit">
        {isSubmitting ? <Loader2 aria-hidden="true" className="spin" size={18} /> : null}
        Sign in
        {!isSubmitting ? <ArrowRight aria-hidden="true" size={18} /> : null}
      </Button>

      <nav className="member-auth-links" aria-label="Account recovery">
        <Link href="/member/password-reset">Reset password</Link>
        <Link href="/member/verify-email">Resend verification</Link>
      </nav>

      <p className="member-access-note">
        Entral access is assigned to approved organization members. Need access or implementation help?{" "}
        <a href={`${sovereignProtocolUrl()}/contact`}>Contact Sovereign Protocol</a>.
      </p>
    </form>
  );
}
