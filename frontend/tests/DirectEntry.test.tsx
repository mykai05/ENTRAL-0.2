import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomePage from "../app/page";
import { middleware } from "../middleware";

const navigationMocks = vi.hoisted(() => ({
  redirect: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: navigationMocks.redirect
}));

describe("direct command-center entry", () => {
  beforeEach(() => {
    navigationMocks.redirect.mockReset();
  });

  it("sends the root URL directly to the dashboard", () => {
    HomePage();

    expect(navigationMocks.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it.each([
    "/forgot-password",
    "/onboarding",
    "/reset-password",
    "/signup",
    "/verify-email"
  ])("retires %s without rendering an account screen", (pathname) => {
    const response = middleware(new NextRequest(`https://entral.test${pathname}?next=/dashboard`));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://entral.test/dashboard");
  });

  it.each([
    "/",
    "/admin",
    "/agents",
    "/automations",
    "/chat",
    "/dashboard"
  ])("redirects a member session away from the internal surface %s before rendering", (pathname) => {
    const payload = Buffer.from(JSON.stringify({
      aud: "entral-member",
      exp: Math.floor(Date.now() / 1000) + 300,
      session: "member"
    })).toString("base64url");
    const response = middleware(new NextRequest(`https://entral.test${pathname}`, {
      headers: { cookie: `entral_token=header.${payload}.signature` }
    }));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://entral.test/member");
  });

  it("does not treat an expired session hint as an active member session", () => {
    const payload = Buffer.from(JSON.stringify({
      aud: "entral-member",
      exp: Math.floor(Date.now() / 1000) - 1,
      session: "member"
    })).toString("base64url");
    const response = middleware(new NextRequest("https://entral.test/dashboard", {
      headers: { cookie: `entral_token=header.${payload}.signature` }
    }));

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
});
