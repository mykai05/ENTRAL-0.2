import { describe, expect, it } from "vitest";
import { ApiError, apiFetch, resolveApiBaseUrl, resolveApiPath } from "../lib/api";
import { apiProxyBase } from "../lib/server-api-proxy";

describe("resolveApiBaseUrl", () => {
  it("uses the same-origin proxy in local browser sessions so auth cookies stay on the frontend host", () => {
    expect(resolveApiBaseUrl("http://localhost:3000", "development")).toBe("");
    expect(resolveApiBaseUrl("http://127.0.0.1:3000", "development")).toBe("");
  });

  it("uses the local backend during development when called outside a browser origin", () => {
    expect(resolveApiBaseUrl("", "development")).toBe("http://localhost:4000");
  });

  it("uses the same-origin proxy in production when no public API URL is configured", () => {
    expect(resolveApiBaseUrl("https://entral-0-2-frontend.vercel.app", "production")).toBe("");
  });

  it("falls back to the same-origin proxy for placeholder Vercel URLs", () => {
    expect(resolveApiBaseUrl("https://entral-0-2-frontend.vercel.app", "production", "https://temporary.vercel.app")).toBe("");
  });

  it("falls back to the same-origin proxy if the public URL points to the frontend itself", () => {
    expect(resolveApiBaseUrl("https://entral-0-2-frontend.vercel.app", "production", "https://entral-0-2-frontend.vercel.app/")).toBe("");
  });

  it("uses the same-origin proxy in production even when a direct backend URL is configured", () => {
    expect(resolveApiBaseUrl("https://entral-0-2-frontend.vercel.app", "production", "https://entral-0-2-production.up.railway.app/")).toBe("");
  });

  it("keeps a real backend URL outside the browser when one is configured", () => {
    expect(resolveApiBaseUrl("", "production", "https://entral-0-2-production.up.railway.app/")).toBe("https://entral-0-2-production.up.railway.app");
  });
});

describe("resolveApiPath", () => {
  it("keeps authenticated member requests under the reverse-proxied member namespace", () => {
    expect(resolveApiPath("/command-os/state", "/member/graph")).toBe(
      "/member/api/v1/command-os/state"
    );
    expect(resolveApiPath("logout", "/member/dashboard")).toBe("/member/api/v1/logout");
  });

  it("keeps non-member requests on the standard API proxy", () => {
    expect(resolveApiPath("/dashboard", "/dashboard")).toBe("/api/v1/dashboard");
    expect(resolveApiPath("health", "")).toBe("/api/v1/health");
  });
});

describe("apiProxyBase", () => {
  it("defaults the local proxy to the development backend", () => {
    expect(apiProxyBase("development", undefined)).toBe("http://127.0.0.1:4000");
  });

  it("requires an explicit proxy target in production", () => {
    expect(apiProxyBase("production", undefined)).toBe("");
  });

  it("normalizes a configured proxy target", () => {
    expect(apiProxyBase("production", "https://entral-0-2-production.up.railway.app/")).toBe("https://entral-0-2-production.up.railway.app");
  });
});

describe("apiFetch cancellation and timeout", () => {
  it("preserves caller cancellation while an internal timeout is also active", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_url: string | URL | Request, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(
        Object.assign(new Error("caller aborted"), { name: "AbortError" })
      ), { once: true });
    })) as typeof fetch;
    const controller = new AbortController();
    const request = apiFetch("/health", { signal: controller.signal, timeoutMs: 1_000 });
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError", message: "caller aborted" });
    globalThis.fetch = originalFetch;
  });

  it("still enforces the internal timeout when a caller signal is supplied", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((_url: string | URL | Request, options?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      options?.signal?.addEventListener("abort", () => reject(
        Object.assign(new Error("request aborted"), { name: "AbortError" })
      ), { once: true });
    })) as typeof fetch;
    const controller = new AbortController();

    await expect(apiFetch("/health", { signal: controller.signal, timeoutMs: 1 })).rejects.toMatchObject({
      name: "ApiError",
      status: 408
    } satisfies Partial<ApiError>);
    globalThis.fetch = originalFetch;
  });
});
