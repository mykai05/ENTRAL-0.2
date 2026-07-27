import {
  GRAPH_CONTRACT_VERSION,
  GRAPH_PREFERENCES_SCHEMA_VERSION,
  parseGraphProjection,
  parseGraphRendererTelemetryResponse,
  parseGraphViewPreferences,
  parseGraphViewPreferencesMutationResponse,
  type GraphPreferenceResetScope,
  type GraphPreferenceSettings,
  type GraphProjection,
  type GraphRendererTelemetryRequest,
  type GraphRendererTelemetryResponse,
  type GraphViewPreferences,
  type GraphViewPreferencesMutationResponse
} from "@entral/contracts";
import { apiFetch } from "./api";

function graphBasePath(organizationId: string) {
  return `/member/organizations/${encodeURIComponent(organizationId)}/graph`;
}

export async function loadCanonicalGraphProjection(
  organizationId: string,
  options: { readonly signal?: AbortSignal } = {}
): Promise<GraphProjection> {
  const payload = await apiFetch<unknown>(
    `${graphBasePath(organizationId)}/projection`,
    { signal: options.signal }
  );
  return parseGraphProjection(payload);
}

export async function loadCanonicalGraphPreferences(
  organizationId: string,
  options: { readonly signal?: AbortSignal } = {}
): Promise<GraphViewPreferences> {
  const payload = await apiFetch<unknown>(
    `${graphBasePath(organizationId)}/preferences`,
    { signal: options.signal }
  );
  return parseGraphViewPreferences(payload);
}

function idempotencyKey(prefix: string) {
  const suffix = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `phase195:${prefix}:${suffix}`;
}

export async function updateCanonicalGraphPreferences(
  organizationId: string,
  input: {
    readonly expectedVersion: number;
    readonly settings: GraphPreferenceSettings;
  }
): Promise<GraphViewPreferencesMutationResponse> {
  const payload = await apiFetch<unknown>(
    `${graphBasePath(organizationId)}/preferences`,
    {
      method: "PUT",
      json: {
        contract_version: GRAPH_CONTRACT_VERSION,
        schema_version: GRAPH_PREFERENCES_SCHEMA_VERSION,
        expected_version: input.expectedVersion,
        idempotency_key: idempotencyKey("update"),
        settings: input.settings
      }
    }
  );
  return parseGraphViewPreferencesMutationResponse(payload);
}

export async function resetCanonicalGraphPreferences(
  organizationId: string,
  input: {
    readonly expectedVersion: number;
    readonly resetScope?: GraphPreferenceResetScope;
  }
): Promise<GraphViewPreferencesMutationResponse> {
  const payload = await apiFetch<unknown>(
    `${graphBasePath(organizationId)}/preferences`,
    {
      method: "DELETE",
      json: {
        contract_version: GRAPH_CONTRACT_VERSION,
        expected_version: input.expectedVersion,
        idempotency_key: idempotencyKey("reset"),
        reset_scope: input.resetScope ?? "ALL"
      }
    }
  );
  return parseGraphViewPreferencesMutationResponse(payload);
}

export async function recordCanonicalGraphTelemetry(
  organizationId: string,
  input: GraphRendererTelemetryRequest,
  options: { readonly signal?: AbortSignal } = {}
): Promise<GraphRendererTelemetryResponse> {
  const payload = await apiFetch<unknown>(
    `${graphBasePath(organizationId)}/telemetry`,
    {
      method: "POST",
      json: input,
      keepalive: true,
      signal: options.signal,
      timeoutMs: 5_000
    }
  );
  return parseGraphRendererTelemetryResponse(payload);
}
