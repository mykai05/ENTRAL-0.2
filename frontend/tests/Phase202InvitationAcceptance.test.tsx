import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountInvitationAcceptance } from "../components/AccountInvitationAcceptance";
import { POST as acceptInvitationPost } from "../app/api/member/invitations/accept/route";
import { POST as signupInvitationPost } from "../app/api/member/invitations/signup/route";

const invitationToken = "phase202-invitation-token-1234567890abcdef";
const idempotencyUuid = "00000000-0000-4000-8000-000000000001";

function invitationUrl(token = invitationToken) {
  return `/member/invitations/accept?token=${encodeURIComponent(token)}`;
}

function requestHeaders(init: RequestInit | undefined) {
  return new Headers(init?.headers);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("API_PROXY_URL", "https://api.entral.test");
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => idempotencyUuid) });
  window.history.replaceState(null, "", invitationUrl());
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Phase 202 invitation acceptance surface", () => {
  it("scrubs the token from browser history without rendering or storing it", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");

    render(<AccountInvitationAcceptance />);

    expect(await screen.findByRole("heading", { name: "Accept your Entral invitation" })).toBeInTheDocument();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/member/invitations/accept");
    expect(window.location.href).not.toContain(invitationToken);
    expect(document.body).not.toHaveTextContent(invitationToken);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("fails closed when the URL has no valid single invitation token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    window.history.replaceState(null, "", "/member/invitations/accept?token=short&token=duplicate");

    render(<AccountInvitationAcceptance />);

    expect(await screen.findByRole("heading", { name: "Invitation link unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("did not receive a valid invitation token");
    expect(screen.queryByRole("button", { name: /accept/i })).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates an invited member through the dedicated no-store bridge", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      invitationAccepted: true,
      message: "Invitation accepted. Verify your email before signing in to Entral."
    }), { headers: { "content-type": "application/json" }, status: 201 }));

    render(<AccountInvitationAcceptance />);
    await screen.findByRole("heading", { name: "Accept your Entral invitation" });
    await user.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email address"), "ADA@example.com");
    await user.type(screen.getByLabelText("Create password"), "correct-horse-battery");
    await user.type(screen.getByLabelText("Confirm password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Create account and accept" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Invitation accepted");
    expect(fetchMock).toHaveBeenCalledWith("/api/member/invitations/signup", expect.objectContaining({
      cache: "no-store",
      credentials: "include",
      method: "POST",
      referrerPolicy: "no-referrer"
    }));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      email: "ADA@example.com",
      invitation_token: invitationToken,
      name: "Ada Lovelace",
      password: "correct-horse-battery"
    });
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("associates a password mismatch with confirmation and never sends it", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch");

    render(<AccountInvitationAcceptance />);
    await screen.findByRole("heading", { name: "Accept your Entral invitation" });
    await user.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(screen.getByLabelText("Create password"), "correct-horse-battery");
    await user.type(screen.getByLabelText("Confirm password"), "different-password");
    await user.click(screen.getByRole("button", { name: "Create account and accept" }));

    expect(screen.getByLabelText("Confirm password")).toHaveAccessibleDescription("Passwords must match.");
    expect(screen.getByLabelText("Confirm password")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("accepts for an existing signed-in member with a stable opaque idempotency key", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      message: "Invitation accepted. Your organization workspace is ready."
    }), { headers: { "content-type": "application/json" }, status: 200 }));

    render(<AccountInvitationAcceptance />);
    await screen.findByRole("heading", { name: "Accept your Entral invitation" });
    expect(screen.getByRole("link", { name: "Sign in in another tab" })).toHaveAttribute("href", "/member/sign-in");
    expect(screen.getByRole("link", { name: "Sign in in another tab" })).toHaveAttribute("rel", "noreferrer");
    await user.click(screen.getByRole("button", { name: "Accept with existing account" }));

    expect(await screen.findByRole("status")).toHaveTextContent("organization workspace is ready");
    expect(fetchMock).toHaveBeenCalledWith("/api/member/invitations/accept", expect.objectContaining({
      cache: "no-store",
      credentials: "include",
      method: "POST",
      referrerPolicy: "no-referrer"
    }));
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      idempotency_key: `phase202-invitation-${idempotencyUuid}`,
      token: invitationToken
    });
  });

  it("gives existing users explicit recovery guidance when no session is present", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ message: "Authentication is required." }), {
      headers: { "content-type": "application/json" },
      status: 401
    }));

    render(<AccountInvitationAcceptance />);
    await screen.findByRole("heading", { name: "Accept your Entral invitation" });
    await user.click(screen.getByRole("button", { name: "Accept with existing account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to your existing account, reopen the original invitation link");
  });
});

describe("Phase 202 invitation BFF boundaries", () => {
  it("forwards a strict invited signup without browser credentials or referrer", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      invitationAccepted: true,
      token: "must-not-reach-the-browser"
    }), { headers: { "content-type": "application/json", "x-request-id": "upstream-signup" }, status: 201 }));
    const response = await signupInvitationPost(new Request("http://localhost:3000/api/member/invitations/signup", {
      body: JSON.stringify({
        email: "ADA@example.com",
        invitation_token: invitationToken,
        name: "  Ada Lovelace  ",
        password: "correct-horse-battery"
      }),
      headers: {
        authorization: "Bearer browser-token",
        cookie: "entral_token=browser-cookie",
        "content-type": "application/json",
        referer: invitationUrl(),
        "x-request-id": "signup-request"
      },
      method: "POST"
    }));

    expect(upstream).toHaveBeenCalledWith("https://api.entral.test/api/v1/signup", expect.objectContaining({ method: "POST", redirect: "manual" }));
    const [, init] = upstream.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      email: "ada@example.com",
      invitationToken,
      name: "Ada Lovelace",
      next: "/member/dashboard",
      password: "correct-horse-battery"
    });
    expect(requestHeaders(init).get("authorization")).toBeNull();
    expect(requestHeaders(init).get("cookie")).toBeNull();
    expect(requestHeaders(init).get("referer")).toBeNull();
    expect(await response.json()).toEqual({ invitationAccepted: true });
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-request-id")).toBe("upstream-signup");
  });

  it("forwards only the HttpOnly member session for existing-account acceptance", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      action: "ACCEPT",
      resulting_version: 2
    }), { headers: { "content-type": "application/json" }, status: 200 }));
    const response = await acceptInvitationPost(new Request("http://localhost:3000/api/member/invitations/accept", {
      body: JSON.stringify({ idempotency_key: `phase202-invitation-${idempotencyUuid}`, token: invitationToken }),
      headers: {
        authorization: "Bearer browser-token",
        cookie: "entral_token=member-session",
        "content-type": "application/json",
        referer: invitationUrl(),
        "x-request-id": "accept-request"
      },
      method: "POST"
    }));

    expect(upstream).toHaveBeenCalledWith(
      "https://api.entral.test/api/v1/identity/memberships/invitations/accept",
      expect.objectContaining({ method: "POST", redirect: "manual" })
    );
    const [, init] = upstream.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toEqual({
      idempotency_key: `phase202-invitation-${idempotencyUuid}`,
      token: invitationToken
    });
    expect(requestHeaders(init).get("authorization")).toBeNull();
    expect(requestHeaders(init).get("cookie")).toBe("entral_token=member-session");
    expect(requestHeaders(init).get("referer")).toBeNull();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("rejects malformed and oversized invitation requests before the backend", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const malformed = await acceptInvitationPost(new Request("http://localhost:3000/api/member/invitations/accept", {
      body: JSON.stringify({ idempotency_key: "too-short", token: "short", unrelated: true }),
      headers: { "content-type": "application/json" },
      method: "POST"
    }));
    const oversized = await signupInvitationPost(new Request("http://localhost:3000/api/member/invitations/signup", {
      body: JSON.stringify({ invitation_token: invitationToken, padding: "x".repeat(20_000) }),
      headers: { "content-type": "application/json" },
      method: "POST"
    }));

    expect(malformed.status).toBe(400);
    expect(oversized.status).toBe(413);
    expect(malformed.headers.get("referrer-policy")).toBe("no-referrer");
    expect(oversized.headers.get("referrer-policy")).toBe("no-referrer");
    expect(upstream).not.toHaveBeenCalled();
  });
});
