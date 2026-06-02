"use client";

import { FormEvent, useEffect, useState } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { signupFormSchema } from "../lib/validation";
import { Button } from "./Button";
import { TextField } from "./TextField";

type FieldErrors = Partial<Record<"name" | "email" | "password", string>>;

export function SignupForm() {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = signupFormSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      password: formData.get("password")
    });

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as FieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch("/signup", {
        method: "POST",
        json: parsed.data
      });

      router.push(`/verify-email?email=${encodeURIComponent(parsed.data.email)}`);
      router.refresh();
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to create account.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit} noValidate>
      <p className="form-notice">
        Private beta account creation. A real verification email is required before command-center access, and
        disconnected systems remain mock or read-only until explicitly configured.
      </p>
      <TextField
        id="name"
        label="Name"
        name="name"
        type="text"
        placeholder="Enter your name"
        autoComplete="name"
        error={errors.name}
        required
      />
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
        placeholder="At least 8 characters"
        autoComplete="new-password"
        error={errors.password}
        required
      />
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <Button type="submit" disabled={!isReady || isSubmitting}>
        <UserPlus aria-hidden="true" size={20} />
        {!isReady ? "Loading..." : isSubmitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
