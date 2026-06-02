"use client";

import { FormEvent, useEffect, useState } from "react";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Send } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { emailOnlyFormSchema } from "../lib/validation";
import { Button } from "./Button";
import { TextField } from "./TextField";

type FieldErrors = Partial<Record<"email", string>>;

export function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const initialEmail = searchParams.get("email") ?? "";
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState(initialEmail ? "Check your inbox for the verification link." : "");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(Boolean(token));
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function confirmToken() {
      setFormError("");
      setNotice("");
      setIsConfirming(true);

      try {
        const response = await apiFetch<{ message: string }>("/email-verification/confirm", {
          method: "POST",
          json: { token }
        });

        if (!isMounted) return;
        setIsVerified(true);
        setNotice(response.message);
      } catch (error) {
        if (!isMounted) return;
        setFormError(error instanceof ApiError ? error.message : "Unable to verify email.");
      } finally {
        if (isMounted) {
          setIsConfirming(false);
        }
      }
    }

    void confirmToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError("");
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const parsed = emailOnlyFormSchema.safeParse({
      email: formData.get("email")
    });

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as FieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch<{ message: string }>("/email-verification/request", {
        method: "POST",
        json: parsed.data
      });
      setNotice(response.message);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to request verification.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isConfirming) {
    return <p className="form-notice" role="status">Verifying email...</p>;
  }

  if (isVerified) {
    return (
      <div className="form-stack">
        <p className="form-notice" role="status">{notice}</p>
        <Link className="button button-primary" href="/login">
          <CheckCircle2 aria-hidden="true" size={20} />
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <p className="form-notice">Real email verification. Links are single-use, logged, and expire after 24 hours.</p>
      <TextField
        id="email"
        label="Email"
        name="email"
        type="email"
        placeholder="Enter your email"
        autoComplete="email"
        defaultValue={initialEmail}
        error={errors.email}
        required
      />
      {notice ? <p className="form-notice" role="status">{notice}</p> : null}
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <Button type="submit" disabled={!isReady || isSubmitting}>
        <Send aria-hidden="true" size={20} />
        {!isReady ? "Loading..." : isSubmitting ? "Sending..." : "Send verification link"}
      </Button>
    </form>
  );
}
