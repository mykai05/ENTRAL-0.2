export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? (process.env.NODE_ENV === "production" ? "" : "http://localhost:4000");

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
    response = await fetch(`${API_BASE_URL}/api/v1${path}`, {
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

    throw new ApiError(503, "ENTRAL API is not reachable. Check that the backend is running and NEXT_PUBLIC_API_URL is correct.", {
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
