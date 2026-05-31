const localApiBaseUrl = "http://localhost:4000";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function currentBrowserOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function sameOrigin(first: string, second: string) {
  try {
    return new URL(first).origin === new URL(second).origin;
  } catch {
    return false;
  }
}

function isPlaceholderApiUrl(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("temporary.vercel.app") ||
    normalized.includes("your-vercel") ||
    normalized.includes("your-railway") ||
    normalized.includes("example.com") ||
    normalized === "https://" ||
    normalized === "http://"
  );
}

function isProductionLocalhost(value: string, environment: string | undefined) {
  if (environment !== "production") return false;

  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function isLocalRuntimeOrigin(value: string) {
  try {
    const hostname = new URL(value).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

export function resolveApiBaseUrl(
  runtimeOrigin = currentBrowserOrigin(),
  environment = process.env.NODE_ENV,
  publicApiUrl = process.env.NEXT_PUBLIC_API_URL
) {
  const configured = trimTrailingSlash(publicApiUrl?.trim() ?? "");

  if (runtimeOrigin && (environment === "production" || isLocalRuntimeOrigin(runtimeOrigin))) {
    return "";
  }

  if (!configured || isPlaceholderApiUrl(configured) || isProductionLocalhost(configured, environment)) {
    return environment === "production" ? "" : localApiBaseUrl;
  }

  if (runtimeOrigin && sameOrigin(configured, runtimeOrigin)) {
    return "";
  }

  return configured;
}

export const API_BASE_URL = resolveApiBaseUrl();

type ApiOptions = RequestInit & {
  json?: unknown;
  timeoutMs?: number;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(status: number, message: string, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { json, timeoutMs = 15000, ...requestOptions } = options;
  const headers = new Headers(options.headers);
  const timeoutController = options.signal ? undefined : new AbortController();
  const timeout = timeoutController ? setTimeout(() => timeoutController.abort(), timeoutMs) : undefined;

  if (json !== undefined) {
    headers.set("content-type", "application/json");
  }

  let response: Response;

  try {
    response = await fetch(`${resolveApiBaseUrl()}/api/v1${path}`, {
      ...requestOptions,
      headers,
      credentials: "include",
      body: json === undefined ? options.body : JSON.stringify(json),
      signal: options.signal ?? timeoutController?.signal
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(408, "Request timed out.", null);
    }

    throw new ApiError(503, "ENTRAL API is not reachable. Check that the backend is running and the frontend API URL or proxy is configured correctly.", {
      cause: error instanceof Error ? error.message : String(error)
    });
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, payload?.message ?? "Request failed.", payload);
  }

  return payload as T;
}
