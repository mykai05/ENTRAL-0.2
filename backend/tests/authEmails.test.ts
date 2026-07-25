import { beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
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
});
