import type {
  BusinessHealthResponse,
  InteractionAnalyticsEventType,
  InteractionMode,
  TutorialProgress,
  TutorialProgressMutationResponse,
  TutorialProgressResetRequest,
  TutorialProgressUpdateRequest
} from "@entral/contracts";
import { apiFetch } from "./api";

export function loadBusinessHealth(
  organizationId: string,
  businessId: string | null,
  mode: InteractionMode,
  options: { readonly signal?: AbortSignal } = {}
) {
  const query = new URLSearchParams({ mode });
  if (businessId) query.set("businessId", businessId);
  return apiFetch<BusinessHealthResponse>(
    `/member/organizations/${encodeURIComponent(organizationId)}/interaction/business-health?${query.toString()}`,
    { signal: options.signal }
  );
}

export function loadTutorialProgress(
  organizationId: string,
  options: { readonly signal?: AbortSignal } = {}
) {
  return apiFetch<TutorialProgress>(
    `/member/organizations/${encodeURIComponent(organizationId)}/interaction/tutorial-progress`,
    { signal: options.signal }
  );
}

export function saveTutorialProgress(
  organizationId: string,
  update: TutorialProgressUpdateRequest
) {
  return apiFetch<TutorialProgressMutationResponse>(
    `/member/organizations/${encodeURIComponent(organizationId)}/interaction/tutorial-progress`,
    { json: update, method: "PATCH" }
  ).then((response) => response.progress);
}

export function resetTutorialProgress(
  organizationId: string,
  reset: TutorialProgressResetRequest
) {
  return apiFetch<TutorialProgressMutationResponse>(
    `/member/organizations/${encodeURIComponent(organizationId)}/interaction/tutorial-progress`,
    { json: reset, method: "DELETE" }
  ).then((response) => response.progress);
}

export function recordInteractionAnalytics(input: {
  readonly controlId?: string | null;
  readonly eventType: InteractionAnalyticsEventType;
  readonly organizationId: string;
  readonly reasonCode?: string | null;
  readonly route: string;
}) {
  if (typeof crypto === "undefined" || typeof crypto.randomUUID !== "function") {
    return Promise.reject(new Error("Secure interaction event identifiers are unavailable."));
  }
  return apiFetch<{ readonly accepted: true }>(
    `/member/organizations/${encodeURIComponent(input.organizationId)}/interaction/analytics`,
    {
      json: {
        contract_version: "1.0.0",
        control_id: input.controlId ?? null,
        event_id: crypto.randomUUID(),
        event_type: input.eventType,
        occurred_at: new Date().toISOString(),
        reason_code: input.reasonCode ?? null,
        route: input.route,
        schema_version: 1
      },
      method: "POST"
    }
  );
}
