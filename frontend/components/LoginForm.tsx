"use client";

import { FormEvent, useEffect, useState } from "react";
import React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { loginFormSchema } from "../lib/validation";
import { Button } from "./Button";
import { TextField } from "./TextField";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setVerificationEmail("");
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = loginFormSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as FieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch("/login", {
        method: "POST",
        json: parsed.data
      });

      router.push(searchParams.get("next") ?? "/dashboard");
      router.refresh();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to sign in.");
      if (error instanceof ApiError && error.status === 403) {
        setVerificationEmail(parsed.data.email);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <p className="form-notice">Real account access. Email verification is required before the command center opens.</p>
      <TextField
        id="email"
        label="Email"
        name="email"
        type="email"
        placeholder="Enter your email"
        autoComplete="email"
        error={errors.email}
        required
      />
      <TextField
        id="password"
        label="Password"
        name="password"
        type="password"
        placeholder="Enter your password"
        autoComplete="current-password"
        error={errors.password}
        required
      />
      <div className="auth-form-options">
        <Link className="auth-text-button" href="/forgot-password">Forgot password?</Link>
      </div>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      {verificationEmail ? (
        <p className="form-notice">
          Need another link? <Link href={`/verify-email?email=${encodeURIComponent(verificationEmail)}`}>Request verification email</Link>.
        </p>
      ) : null}
      <Button type="submit" disabled={!isReady || isSubmitting}>
        <LogIn aria-hidden="true" size={20} />
        {!isReady ? "Loading..." : isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
