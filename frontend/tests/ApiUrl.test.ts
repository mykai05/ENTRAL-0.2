import { describe, expect, it } from "vitest";
import { resolveApiBaseUrl } from "../lib/api";
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

describe("apiProxyBase", () => {
  it("defaults the local proxy to the development backend", () => {
    expect(apiProxyBase("development", undefined)).toBe("http://localhost:4000");
  });

  it("requires an explicit proxy target in production", () => {
    expect(apiProxyBase("production", undefined)).toBe("");
  });

  it("normalizes a configured proxy target", () => {
    expect(apiProxyBase("production", "https://entral-0-2-production.up.railway.app/")).toBe("https://entral-0-2-production.up.railway.app");
  });
});
