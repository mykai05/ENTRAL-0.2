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
    expect(buildPasswordResetUrl("reset-token")).toBe("https://app.entral.test/reset-password?token=reset-token");
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
