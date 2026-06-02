"use client";

import { FormEvent, useEffect, useState } from "react";
import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { resetPasswordFormSchema } from "../lib/validation";
import { Button } from "./Button";
import { TextField } from "./TextField";

type FieldErrors = Partial<Record<"token" | "password" | "confirmPassword", string>>;

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError("");
    setNotice("");

    const formData = new FormData(event.currentTarget);
    const parsed = resetPasswordFormSchema.safeParse({
      token,
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword")
    });

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as FieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch<{ message: string }>("/password-reset/confirm", {
        method: "POST",
        json: {
          password: parsed.data.password,
          token: parsed.data.token
        }
      });
      setNotice(response.message);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to reset password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="form-stack">
        <p className="form-error" role="alert">Use the reset link from your email to set a new password.</p>
        <Link className="button button-secondary" href="/forgot-password">Request reset link</Link>
      </div>
    );
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <p className="form-notice">Real password change. This resets your ENTRAL account password after token verification.</p>
      <TextField
        id="password"
        label="New password"
        name="password"
        type="password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.password}
        required
      />
      <TextField
        id="confirmPassword"
        label="Confirm password"
        name="confirmPassword"
        type="password"
        placeholder="Repeat new password"
        autoComplete="new-password"
        error={errors.confirmPassword}
        required
      />
      {errors.token ? <p className="form-error" role="alert">{errors.token}</p> : null}
      {notice ? (
        <p className="form-notice" role="status">
          {notice} <Link href="/login">Sign in</Link>.
        </p>
      ) : null}
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <Button type="submit" disabled={!isReady || isSubmitting}>
        <KeyRound aria-hidden="true" size={20} />
        {!isReady ? "Loading..." : isSubmitting ? "Resetting..." : "Reset password"}
      </Button>
    </form>
  );
}
