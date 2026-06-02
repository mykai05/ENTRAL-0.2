"use client";

import { FormEvent, useEffect, useState } from "react";
import React from "react";
import { Mail } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { emailOnlyFormSchema } from "../lib/validation";
import { Button } from "./Button";
import { TextField } from "./TextField";

type FieldErrors = Partial<Record<"email", string>>;

export function ForgotPasswordForm() {
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
    const parsed = emailOnlyFormSchema.safeParse({
      email: formData.get("email")
    });

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as FieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiFetch<{ message: string }>("/password-reset/request", {
        method: "POST",
        json: parsed.data
      });
      setNotice(response.message);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to request a password reset.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <p className="form-notice">Real account recovery. Reset links are single-use, logged, and expire after 1 hour.</p>
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
      {notice ? <p className="form-notice" role="status">{notice}</p> : null}
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <Button type="submit" disabled={!isReady || isSubmitting}>
        <Mail aria-hidden="true" size={20} />
        {!isReady ? "Loading..." : isSubmitting ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
