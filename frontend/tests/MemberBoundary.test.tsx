import "@testing-library/jest-dom/vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../components/AppProviders";
import { MemberDashboardClient } from "../components/MemberDashboardClient";
import { MemberRecoveryClient } from "../components/MemberRecoveryClient";
import { MemberSignInClient } from "../components/MemberSignInClient";
import { safeMemberReturnPath } from "../lib/member";
import { loadMemberSession } from "../lib/member-session.server";
import type { MemberOrganizationsResponse, MemberOverviewResponse } from "../lib/member";
import { POST as memberLoginPost } from "../app/api/member/login/route";
import { GET as apiProxyGet } from "../app/api/v1/[...path]/route";
import { withoutBearerToken } from "../lib/member-login";
import { ApiError } from "../lib/api";

const navigation = vi.hoisted(() => ({
  pathname: "/member/sign-in",
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn()
}));

const api = vi.hoisted(() => ({
  apiFetch: vi.fn()
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => navigation
}));

vi.mock("../lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/api")>()),
  apiFetch: api.apiFetch
}));

const session: MemberOrganizationsResponse = {
  organizations: [{
    id: "ck1234567890123456789012",
    joinedAt: "2026-07-01T00:00:00.000Z",
    memberCount: 2,
    memberLimit: 5,
    name: "Analytical Works",
    role: "OWNER",
    slug: "analytical-works"
  }],
  user: {
    email: "ada@example.com",
    id: "user-1",
    name: "Ada Lovelace"
  }
};

const overview: MemberOverviewResponse = {
  availability: {
    subscription: { available: false, reason: "Subscription management is not configured.", state: "not_configured" }
  },
  members: [{ id: "user-1", joinedAt: "2026-07-01T00:00:00.000Z", name: "Ada Lovelace", role: "OWNER" }],
  organization: { id: "ck1234567890123456789012", memberCount: 2, memberLimit: 5, name: "Analytical Works", role: "OWNER", slug: "analytical-works" },
  recentTasks: [{
    assignedTo: { id: "user-1", name: "Ada Lovelace" },
    dueDate: "2026-07-22T00:00:00.000Z",
    id: "task-1",
    status: "IN_PROGRESS",
    title: "Map the operating workflow",
    updatedAt: "2026-07-17T00:00:00.000Z"
  }],
  taskSummary: { done: 1, inProgress: 1, overdue: 0, todo: 2, total: 4 },
  workspace: {
    businessHealth: { score: 82, status: "stable", summary: "Delivery and capacity are steady." },
    findingsAndRecommendations: [{
      detail: "Hand-offs vary between teams.",
      id: "finding-1",
      recommendation: "Standardize the weekly hand-off review.",
      severity: "opportunity",
      title: "Standardize hand-offs"
    }],
    monthlyOperatingSummary: {
      accomplishments: ["Completed the dispatch map"],
      headline: "Operations are becoming more predictable",
      nextPriorities: ["Publish the weekly capacity view"],
      period: "2026-07",
      summary: "The organization reduced ambiguity in its core operating hand-offs."
    },
    objectivesAndPriorities: [{
      id: "objective-1",
      priority: "high",
      progress: 65,
      status: "active",
      title: "Improve scheduling visibility"
    }],
    publishedAt: "2026-07-18T00:00:00.000Z",
    version: 1
  }
};

beforeEach(() => {
  vi.clearAllMocks();
  window.sessionStorage.clear();
  navigation.pathname = "/member/sign-in";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("member redirect and browser credential boundaries", () => {
  it.each([
    [undefined, "/member"],
    ["/member?organization=one", "/member?organization=one"],
    ["/member/sign-in", "/member"],
    ["https://attacker.example/member", "/member"],
    ["//attacker.example/member", "/member"],
    ["/dashboard", "/member"]
  ])("normalizes return path %s", (input, expected) => {
    expect(safeMemberReturnPath(input)).toBe(expected);
  });

  it("uses the dedicated member login bridge and never stores a returned bearer token", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      token: "must-not-enter-browser-storage",
      user: { email: "ada@example.com", id: "user-1", name: "Ada Lovelace", role: "USER" }
    }), { headers: { "content-type": "application/json" }, status: 200 }));

    render(<MemberSignInClient returnTo="/member" />);
    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/member"));
    expect(fetchMock).toHaveBeenCalledWith("/api/member/login", expect.objectContaining({
      credentials: "include",
      method: "POST"
    }));
    expect(window.sessionStorage.length).toBe(0);
    expect(window.localStorage.getItem("entral_token")).toBeNull();
  });

  it("strips the backend token from the dedicated browser login payload", () => {
    expect(withoutBearerToken({ token: "secret", user: { id: "user-1" } })).toEqual({ user: { id: "user-1" } });
  });

  it("forwards the HttpOnly session cookie while removing the token from the browser response", async () => {
    const upstream = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      token: "backend-bearer-token",
      user: { email: "ada@example.com", id: "user-1", name: "Ada Lovelace", role: "USER" }
    }), {
      headers: {
        "content-type": "application/json",
        "set-cookie": "entral_token=cookie-session; HttpOnly; Path=/; SameSite=Lax"
      },
      status: 200
    }));
    const response = await memberLoginPost(new Request("http://localhost:3000/api/member/login", {
      body: JSON.stringify({ email: "ada@example.com", flow: "internal", password: "correct-password" }),
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      method: "POST"
    }));
    const payload = await response.json();

    expect(upstream).toHaveBeenCalledWith("http://127.0.0.1:4000/api/v1/login", expect.objectContaining({ method: "POST" }));
    const upstreamBody = upstream.mock.calls[0]?.[1]?.body;
    expect(JSON.parse(String(upstreamBody))).toEqual({
      email: "ada@example.com",
      flow: "member",
      password: "correct-password"
    });
    expect(payload).toEqual({ user: { email: "ada@example.com", id: "user-1", name: "Ada Lovelace", role: "USER" } });
    expect(response.headers.get("set-cookie")).toContain("entral_token=cookie-session");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });

  it("rejects oversized and non-JSON login requests before contacting the backend", async () => {
    const upstream = vi.spyOn(globalThis, "fetch");
    const nonJson = await memberLoginPost(new Request("http://localhost:3000/api/member/login", {
      body: "email=ada%40example.com",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      method: "POST"
    }));
    const oversized = await memberLoginPost(new Request("http://localhost:3000/api/member/login", {
      body: JSON.stringify({ email: "ada@example.com", password: "x".repeat(20_000) }),
      headers: { "content-type": "application/json" },
      method: "POST"
    }));

    expect(nonJson.status).toBe(415);
    expect(oversized.status).toBe(413);
    expect(nonJson.headers.get("cache-control")).toBe("private, no-store");
    expect(oversized.headers.get("cache-control")).toBe("private, no-store");
    expect(upstream).not.toHaveBeenCalled();
  });

  it("keeps proxy failures private and request-id traceable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("private upstream host details"));
    const response = await apiProxyGet(
      new Request("http://localhost:3000/api/v1/member/organizations", {
        headers: { "x-request-id": "member-proxy-failure" }
      }),
      { params: Promise.resolve({ path: ["member", "organizations"] }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(payload).toMatchObject({ requestId: "member-proxy-failure" });
    expect(JSON.stringify(payload)).not.toContain("private upstream host details");
    expect(payload).not.toHaveProperty("upstream");
  });
});

describe("protected member session loading", () => {
  it("rejects a missing cookie without contacting the backend", async () => {
    const fetcher = vi.fn();
    await expect(loadMemberSession("", { fetcher })).resolves.toEqual({ kind: "unauthenticated" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails closed when the backend rejects the session", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Authentication is required." }), {
      headers: { "content-type": "application/json" },
      status: 401
    }));

    await expect(loadMemberSession("entral_token=invalid", { fetcher, proxyUrl: "https://api.entral.test" })).resolves.toEqual({ kind: "unauthenticated" });
  });

  it("returns only a validated member session payload", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...session,
      internal: { commandRouting: true },
      token: "must-not-reach-client",
      user: { ...session.user, role: "ADMIN", internalDiagnostic: "hidden" }
    }), {
      headers: { "content-type": "application/json" },
      status: 200
    }));
    const result = await loadMemberSession("entral_token=valid", { fetcher, proxyUrl: "https://api.entral.test" });

    expect(result).toEqual({ kind: "authenticated", session });
    expect(JSON.stringify(result)).not.toContain("must-not-reach-client");
    expect(JSON.stringify(result)).not.toContain("internalDiagnostic");
    expect(fetcher).toHaveBeenCalledWith("https://api.entral.test/api/v1/member/organizations", expect.objectContaining({
      cache: "no-store",
      headers: expect.objectContaining({ cookie: "entral_token=valid" })
    }));
  });
});

describe("member workspace presentation", () => {
  it("shows allowlisted organization work, real published operating data, and the enforced seat allowance", async () => {
    navigation.pathname = "/member";
    api.apiFetch.mockResolvedValueOnce(overview);
    render(<MemberDashboardClient initialSession={session} />);

    expect(await screen.findByRole("heading", { name: "Work overview" })).toBeInTheDocument();
    const taskTitle = screen.getByText("Map the operating workflow");
    expect(taskTitle).toBeInTheDocument();
    expect(taskTitle.closest("li")).toHaveTextContent("Ada Lovelace ·");
    expect(taskTitle.closest("li")?.textContent).not.toContain("Â");
    expect(screen.getByText("2 of 5")).toBeInTheDocument();
    expect(screen.getByText("Delivery and capacity are steady.")).toBeInTheDocument();
    expect(screen.getByText("Improve scheduling visibility")).toBeInTheDocument();
    expect(screen.getByText("Standardize hand-offs")).toBeInTheDocument();
    expect(screen.getByText("Operations are becoming more predictable")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Improve scheduling visibility: 65% complete" })).toHaveAttribute("aria-valuenow", "65");
    expect(screen.getByRole("heading", { name: "Subscription management unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Support and consultation" })).toHaveAttribute("href", "https://spcommand.com/contact");
    expect(screen.queryByText("Agents")).not.toBeInTheDocument();
    expect(screen.queryByText("Connectors")).not.toBeInTheDocument();
    expect(screen.queryByText("Raw prompts")).not.toBeInTheDocument();
  });

  it("renders a clean operating-view empty state without dead controls", async () => {
    navigation.pathname = "/member";
    api.apiFetch.mockResolvedValueOnce({ ...overview, workspace: null });
    render(<MemberDashboardClient initialSession={session} />);

    expect(await screen.findByRole("heading", { name: "Operating view not published yet" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /publish|configure|create/i })).not.toBeInTheDocument();
  });

  it("renders clean empty sections inside a published snapshot", async () => {
    navigation.pathname = "/member";
    api.apiFetch.mockResolvedValueOnce({
      ...overview,
      workspace: {
        ...overview.workspace!,
        businessHealth: null,
        findingsAndRecommendations: [],
        monthlyOperatingSummary: null,
        objectivesAndPriorities: []
      }
    });
    render(<MemberDashboardClient initialSession={session} />);

    expect(await screen.findByText("No business-health assessment has been published.")).toBeInTheDocument();
    expect(screen.getByText("No objectives or priorities have been published.")).toBeInTheDocument();
    expect(screen.getByText("No findings or recommendations have been published.")).toBeInTheDocument();
    expect(screen.getByText("No monthly operating summary has been published.")).toBeInTheDocument();
  });

  it("explains an inactive organization without exposing data or a dead primary action", async () => {
    navigation.pathname = "/member";
    api.apiFetch.mockRejectedValueOnce(new ApiError(404, "Not found", null));
    render(<MemberDashboardClient initialSession={session} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("This organization is no longer available to your account.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("Map the operating workflow")).not.toBeInTheDocument();
  });

  it("ignores an out-of-order response after the member changes organizations", async () => {
    const user = userEvent.setup();
    const secondOrganizationId = "ck2222222222222222222222";
    let resolveFirst: (value: MemberOverviewResponse) => void = () => undefined;
    let resolveSecond: (value: MemberOverviewResponse) => void = () => undefined;
    const firstResponse = new Promise<MemberOverviewResponse>((resolve) => { resolveFirst = resolve; });
    const secondResponse = new Promise<MemberOverviewResponse>((resolve) => { resolveSecond = resolve; });
    const multiOrganizationSession: MemberOrganizationsResponse = {
      ...session,
      organizations: [
        ...session.organizations,
        {
          id: secondOrganizationId,
          joinedAt: "2026-07-02T00:00:00.000Z",
          memberCount: 1,
          memberLimit: 5,
          name: "Second Works",
          role: "MEMBER",
          slug: "second-works"
        }
      ]
    };
    api.apiFetch.mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse);
    navigation.pathname = "/member";
    render(<MemberDashboardClient initialSession={multiOrganizationSession} />);

    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledTimes(1));
    await user.selectOptions(screen.getByLabelText("Organization"), secondOrganizationId);
    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledTimes(2));
    resolveSecond({
      ...overview,
      organization: { ...overview.organization, id: secondOrganizationId, name: "Second Works", role: "MEMBER" },
      recentTasks: [{ ...overview.recentTasks[0], id: "second-task", title: "Second organization work" }]
    });
    expect(await screen.findByRole("heading", { name: "Second Works" })).toBeInTheDocument();

    resolveFirst(overview);
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Second Works" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Analytical Works" })).not.toBeInTheDocument();
      expect(screen.queryByText("Map the operating workflow")).not.toBeInTheDocument();
    });
  });

  it("rejects a response whose organization does not match the requested workspace", async () => {
    navigation.pathname = "/member";
    api.apiFetch.mockResolvedValueOnce({
      ...overview,
      organization: { ...overview.organization, id: "ck3333333333333333333333", name: "Wrong Organization" }
    });
    render(<MemberDashboardClient initialSession={session} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Entral returned data for a different organization.");
    expect(screen.queryByRole("heading", { name: "Wrong Organization" })).not.toBeInTheDocument();
    expect(screen.queryByText("Map the operating workflow")).not.toBeInTheDocument();
  });

  it("does not render internal command chrome on member routes", () => {
    navigation.pathname = "/member/sign-in";
    render(<AppProviders><main>Member only</main></AppProviders>);

    expect(screen.getByText("Member only")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open command palette" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open settings" })).not.toBeInTheDocument();
  });

  it("classifies recovery requests as member flow", async () => {
    const user = userEvent.setup();
    api.apiFetch.mockResolvedValueOnce({ message: "If this account exists, a link has been sent." });
    render(<MemberRecoveryClient />);

    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Send recovery link" }));

    await waitFor(() => expect(api.apiFetch).toHaveBeenCalledWith("/password-reset/request", {
      json: { email: "ada@example.com", flow: "member" },
      method: "POST"
    }));
  });
});
