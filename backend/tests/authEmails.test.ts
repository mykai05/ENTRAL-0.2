import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllGlobals();
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = "file:./test.db";
  process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-jwt";
  process.env.COOKIE_NAME = "entral_token";
  process.env.CORS_ORIGIN = "http://localhost:3000";
  process.env.APP_PUBLIC_URL = "https://app.entral.test";
  process.env.AUTH_EMAIL_PROVIDER = "console";
});

describe("auth email content", () => {
  it("builds verification and reset links on the public app URL", async () => {
    const { buildPasswordResetUrl, buildVerificationUrl } = await import("../src/services/authEmails.js");

    expect(buildVerificationUrl("verify-token")).toBe("https://app.entral.test/verify-email?token=verify-token");
    expect(buildVerificationUrl("verify-token", "internal", "/graph?focus=agent_123")).toBe(
      "https://app.entral.test/verify-email?token=verify-token&next=%2Fgraph%3Ffocus%3Dagent_123"
    );
    expect(buildPasswordResetUrl("reset-token")).toBe("https://app.entral.test/reset-password?token=reset-token");
  });

  it("keeps member recovery and verification links inside the member experience", async () => {
    const { buildPasswordResetUrl, buildVerificationUrl, verificationEmailContent } = await import("../src/services/authEmails.js");

    expect(buildVerificationUrl("verify-token", "member", "/member/graph?focus=agent_123")).toBe(
      "https://app.entral.test/member/verify-email?token=verify-token&next=%2Fmember%2Fgraph%3Ffocus%3Dagent_123"
    );
    expect(buildPasswordResetUrl("reset-token", "member")).toBe("https://app.entral.test/member/password-reset?token=reset-token");
    expect(verificationEmailContent({
      flow: "member",
      name: "Ada",
      to: "ada@example.com",
      token: "verify-token"
    }).text).toContain("member workspace");
  });

  it.each([
    ["internal", "https://evil.example/graph"],
    ["internal", "//evil.example/graph"],
    ["internal", "/"],
    ["internal", "/login"],
    ["internal", "/chat"],
    ["internal", "/graph#outside"],
    ["member", "/graph"],
    ["internal", "/member/graph"]
  ] as const)("omits unsafe or cross-surface verification return path %s %s", async (flow, next) => {
    const { buildVerificationUrl } = await import("../src/services/authEmails.js");
    const path = flow === "member" ? "/member/verify-email" : "/verify-email";

    expect(buildVerificationUrl("verify-token", flow, next)).toBe(
      `https://app.entral.test${path}?token=verify-token`
    );
  });

  it("keeps the safety positioning in auth emails", async () => {
    const { verificationEmailContent } = await import("../src/services/authEmails.js");
    const content = verificationEmailContent({
      name: "Ada",
      to: "ada@example.com",
      token: "verify-token"
    });

    expect(content.html).toContain("AI command center for organizing, planning, monitoring, and safely preparing business operations");
    expect(content.html).toContain("human approval gates");
  });

  it("sends through Resend only with an exact ACTIVE registry record", async () => {
    process.env.AUTH_EMAIL_PROVIDER = "resend";
    process.env.AUTH_EMAIL_FROM = "ENTRAL <noreply@entral.test>";
    process.env.RESEND_API_KEY = "re_test";
    process.env.INTEGRATION_REGISTRY_JSON = JSON.stringify([{
      integration_id: "123e4567-e89b-42d3-a456-426614174000",
      provider_code: "resend",
      provider_name: "Resend",
      provider_api_version: "v1",
      capability_codes: ["TRANSACTIONAL_EMAIL"],
      official_documentation_url: "https://resend.com/docs/api-reference/introduction",
      stage: "ACTIVE",
      adapter_version: "1.0.0",
      auth_methods: ["API_KEY"],
      credential_reference_id: "223e4567-e89b-42d3-a456-426614174000",
      owning_business_id: "323e4567-e89b-42d3-a456-426614174000",
      granted_operation_codes: ["email.send"],
      live_tested_at: "2026-07-24T00:00:00Z",
      active_at: "2026-07-24T01:00:00Z",
      evidence_ids: ["423e4567-e89b-42d3-a456-426614174000"],
      disabled_reason: null
    }]);
    const fetchSpy = vi.fn(async () => new Response(JSON.stringify({ id: "email-1" }), {
      headers: { "content-type": "application/json" },
      status: 200
    }));
    vi.stubGlobal("fetch", fetchSpy);
    const { sendVerificationEmail } = await import("../src/services/authEmails.js");

    await expect(sendVerificationEmail({
      name: "Ada",
      to: "ada@example.com",
      token: "verify-token"
    })).resolves.toMatchObject({ messageId: "email-1", provider: "resend", queued: true });
    expect(fetchSpy).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it("rejects Resend provider contact while its registry record is inactive", async () => {
    process.env.AUTH_EMAIL_PROVIDER = "resend";
    process.env.AUTH_EMAIL_FROM = "ENTRAL <noreply@entral.test>";
    process.env.RESEND_API_KEY = "re_test";
    process.env.INTEGRATION_REGISTRY_JSON = JSON.stringify([{
      integration_id: "123e4567-e89b-42d3-a456-426614174000",
      provider_code: "resend",
      provider_name: "Resend",
      provider_api_version: "v1",
      capability_codes: ["TRANSACTIONAL_EMAIL"],
      official_documentation_url: "https://resend.com/docs/api-reference/introduction",
      stage: "LIVE_TESTED",
      adapter_version: "1.0.0",
      auth_methods: ["API_KEY"],
      credential_reference_id: "223e4567-e89b-42d3-a456-426614174000",
      owning_business_id: "323e4567-e89b-42d3-a456-426614174000",
      granted_operation_codes: ["email.send"],
      live_tested_at: "2026-07-24T00:00:00Z",
      active_at: null,
      evidence_ids: ["423e4567-e89b-42d3-a456-426614174000"],
      disabled_reason: "Awaiting activation"
    }]);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { sendVerificationEmail } = await import("../src/services/authEmails.js");

    await expect(sendVerificationEmail({
      name: "Ada",
      to: "ada@example.com",
      token: "verify-token"
    })).rejects.toMatchObject({ code: "INTEGRATION_NOT_ACTIVE" });
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
