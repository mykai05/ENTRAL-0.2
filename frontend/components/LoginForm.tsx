"use client";

import { FormEvent, useEffect, useState } from "react";
import React from "react";
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
  const [isReady, setIsReady] = useState(false);
  const [resetNotice, setResetNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setResetNotice("");
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
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleForgotPassword(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const email = form ? new FormData(form).get("email")?.toString().trim() : "";

    setFormError("");
    setResetNotice(email
      ? "Password reset is not connected to email delivery yet. Contact your workspace admin to reset this account."
      : "Enter your email first, then use forgot password to request account recovery.");
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
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
        <button type="button" className="auth-text-button" onClick={handleForgotPassword}>
          Forgot password?
        </button>
      </div>
      {resetNotice ? <p className="form-notice" role="status">{resetNotice}</p> : null}
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <Button type="submit" disabled={!isReady || isSubmitting}>
        <LogIn aria-hidden="true" size={20} />
        {!isReady ? "Loading..." : isSubmitting ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
