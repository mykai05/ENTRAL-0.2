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
});
