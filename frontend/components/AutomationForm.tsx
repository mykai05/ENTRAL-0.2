"use client";

import React, { FormEvent, useState } from "react";
import { Play } from "lucide-react";
import { ApiError, apiFetch } from "../lib/api";
import { automationFormSchema } from "../lib/validation";
import { Button } from "./Button";
import { ModeBadge } from "./ModeStatus";
import { useToast } from "./ToastProvider";

type AutomationFormProps = {
  onCreated: () => Promise<void>;
};

type FieldErrors = Partial<Record<"url" | "selector" | "scheduledAt", string>>;

export function AutomationForm({ onCreated }: AutomationFormProps) {
  const { notify } = useToast();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setFormError("");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = automationFormSchema.safeParse({
      url: formData.get("url"),
      selector: formData.get("selector") || undefined,
      scheduledAt: formData.get("scheduledAt") || undefined
    });

    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0], issue.message])) as FieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      await apiFetch("/automation/jobs", {
        method: "POST",
        json: {
          type: "scrape",
          payload: {
            url: parsed.data.url,
            selector: parsed.data.selector || undefined
          },
          scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt).toISOString() : undefined
        }
      });
      form.reset();
      await onCreated();
      notify({ title: "Task queued", message: "Automation run started.", type: "success" });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Unable to create automation job.");
      notify({ title: "Task failed", message: error instanceof ApiError ? error.message : "Unable to create automation job.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="automation-form" onSubmit={handleSubmit} noValidate>
      <p className="surface-mode-note" role="note">
        <ModeBadge mode="real">Real queue</ModeBadge>
        <span>Jobs inspect public URLs, are logged, and can be canceled or retried. External writes remain approval-gated.</span>
      </p>
      <div>
        <label htmlFor="automation-url">URL</label>
        <input
          id="automation-url"
          name="url"
          type="url"
          placeholder="https://example.com"
          required
        />
        <small>Paste the public page ENTRAL should inspect.</small>
        {errors.url ? <p className="field-error">{errors.url}</p> : null}
      </div>
      <div>
        <label htmlFor="automation-selector">Selector</label>
        <input id="automation-selector" name="selector" type="text" placeholder="h1" />
        <small>Optional. Leave blank to review the page title and visible text.</small>
        {errors.selector ? <p className="field-error">{errors.selector}</p> : null}
      </div>
      <div>
        <label htmlFor="automation-scheduled-at">Schedule</label>
        <input id="automation-scheduled-at" name="scheduledAt" type="datetime-local" />
        <small>Optional. Leave blank to run immediately.</small>
        {errors.scheduledAt ? <p className="field-error">{errors.scheduledAt}</p> : null}
      </div>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <Button type="submit" disabled={isSubmitting}>
        <Play aria-hidden="true" size={20} />
        {isSubmitting ? "Queueing..." : "Run task"}
      </Button>
    </form>
  );
}
