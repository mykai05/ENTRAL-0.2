import "@testing-library/jest-dom/vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../components/AppProviders";
import { MemberDashboardClient } from "../components/MemberDashboardClient";
import { buildMemberNeurons, MemberNeuronGraph } from "../components/MemberNeuronGraph";
import { MemberNeuronsCommandCenter } from "../components/MemberNeuronsCommandCenter";
import { buildMemberGraphModel } from "../components/member-graph-model";
import {
  buildMemberNeuronScene3D,
  memberOrbitTrackPoints,
  positionMemberNeuronScene3D
} from "../components/member-neurons-3d";
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
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  window.sessionStorage.clear();
  navigation.pathname = "/member/sign-in";
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
  it("builds the Entral neural map only from organization-scoped overview data", () => {
    const neurons = buildMemberNeurons(overview);

    expect(neurons).toHaveLength(7);
    expect(neurons[0]).toMatchObject({ id: "core", label: "ENTRAL", metric: "Central command" });
    expect(neurons.find((neuron) => neuron.id === "priorities")).toMatchObject({ metric: "1 active / 1 total" });
    expect(neurons.find((neuron) => neuron.id === "work")?.supportingItems).toContain("Map the operating workflow - in progress");
    expect(JSON.stringify(neurons)).not.toContain("token");
    expect(JSON.stringify(neurons)).not.toContain("prompt");
  });

  it("provides a keyboard-accessible organization neuron inspector", async () => {
    const user = userEvent.setup();
    render(<MemberNeuronGraph overview={overview} />);

    expect(screen.getByRole("heading", { name: "Entral command field" })).toBeInTheDocument();
    const priorities = screen.getByRole("button", { name: "Priorities: 1 active / 1 total. Status: active" });
    expect(priorities).toHaveAttribute("aria-pressed", "false");
    await user.click(priorities);
    expect(priorities).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Improve scheduling visibility - 65%")).toBeInTheDocument();
    expect(screen.getByText("Bound to Analytical Works")).toBeInTheDocument();
  });

  it("lets a member pause and resume decorative graph motion", async () => {
    const user = userEvent.setup();
    render(<MemberNeuronGraph overview={overview} />);

    const pause = screen.getByRole("button", { name: "Pause motion" });
    expect(pause).toHaveAttribute("aria-pressed", "false");
    await user.click(pause);
    const resume = screen.getByRole("button", { name: "Resume motion" });
    expect(resume).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector(".member-neural-map")).toHaveClass("motion-paused");
    await user.click(resume);
    expect(screen.getByRole("button", { name: "Pause motion" })).toHaveAttribute("aria-pressed", "false");
  });

  it("honors reduced-motion preference when the graph first renders", async () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));
    render(<MemberNeuronGraph overview={overview} />);

    expect(await screen.findByText("Reduced motion")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /motion/i })).not.toBeInTheDocument();
    expect(document.querySelector(".member-neural-map")).toHaveClass("motion-paused");
  });

  it("builds a complete deterministic organization graph from every returned member record", () => {
    const model = buildMemberGraphModel(overview);

    expect(model.nodes).toHaveLength(43);
    expect(model.edges).toHaveLength(43);
    expect(model.nodes.map((node) => node.kind)).toEqual(expect.arrayContaining([
      "health-assessment",
      "priority",
      "task",
      "task-rollup",
      "member",
      "finding",
      "recommendation",
      "summary-record",
      "accomplishment",
      "next-priority"
    ]));
    expect(model.nodes.find((node) => node.kind === "task-rollup")).toMatchObject({ metric: "3 records" });
    expect(model.edges).toContainEqual(expect.objectContaining({ kind: "assignment" }));
    expect(buildMemberGraphModel(overview)).toEqual(model);
  });

  it("renders an organization-published multi-business chain of command instead of the starter hierarchy", () => {
    const multiBusinessOverview: MemberOverviewResponse = {
      ...overview,
      workspace: {
        ...overview.workspace!,
        commandHierarchy: { nodes: [
          { id: "entral-published", name: "ENTRAL", parentId: null, rank: "emperor", status: "thinking" },
          { id: "portfolio", name: "Portfolio Marshal", parentId: "entral-published", rank: "marshal", status: "working" },
          { id: "alpha", name: "Alpha Builders General", parentId: "portfolio", rank: "general", status: "working" },
          { id: "beta", name: "Beta Services General", parentId: "portfolio", rank: "general", status: "idle" },
          { id: "alpha-ops", name: "Alpha Operations Commander", parentId: "alpha", rank: "commander", status: "working" },
          { id: "alpha-delivery", name: "Alpha Delivery Soldier", parentId: "alpha-ops", rank: "soldier", status: "idle" }
        ] }
      }
    };
    const model = buildMemberGraphModel(multiBusinessOverview);
    const scene = buildMemberNeuronScene3D(multiBusinessOverview);

    expect(model.hierarchySource).toBe("published");
    expect(model.nodes.filter((node) => node.branch === "general").map((node) => node.label)).toEqual([
      "Alpha Builders General",
      "Beta Services General"
    ]);
    expect(scene.hierarchySource).toBe("published");
    expect(scene.nodes.find((node) => node.label === "Alpha Delivery Soldier")?.parentId).toBe("command:alpha-ops");
    expect(scene.orbits.some((orbit) => orbit.parentId === "core" && orbit.branch === "marshal")).toBe(true);
    expect(scene.orbits.some((orbit) => orbit.parentId === "command:portfolio" && orbit.branch === "general")).toBe(true);
    expect(JSON.stringify(scene)).not.toContain("prompt");
    expect(JSON.stringify(scene)).not.toContain("diagnostic");
  });

  it("lays out the maximum published graph with unique bounded nodes", () => {
    const members = Array.from({ length: 5 }, (_, index) => ({
      id: `member-${index}`,
      joinedAt: `2026-07-0${index + 1}T00:00:00.000Z`,
      name: `Member ${index + 1}`,
      role: index === 0 ? "OWNER" as const : "MEMBER" as const
    }));
    const maxOverview: MemberOverviewResponse = {
      ...overview,
      members,
      recentTasks: Array.from({ length: 8 }, (_, index) => ({
        assignedTo: { id: members[index % members.length].id, name: members[index % members.length].name },
        dueDate: null,
        id: "duplicate-task-id",
        status: index % 2 ? "IN_PROGRESS" : "TODO",
        title: `Visible task ${index + 1}`,
        updatedAt: `2026-07-${String(18 - index).padStart(2, "0")}T00:00:00.000Z`
      })),
      taskSummary: { done: 0, inProgress: 4, overdue: 1, todo: 8, total: 12 },
      workspace: {
        ...overview.workspace!,
        findingsAndRecommendations: Array.from({ length: 20 }, (_, index) => ({
          detail: `Finding detail ${index + 1}`,
          id: "duplicate-finding-id",
          recommendation: `Recommendation ${index + 1}`,
          severity: index % 3 === 0 ? "risk" as const : "information" as const,
          title: `Finding ${index + 1}`
        })),
        monthlyOperatingSummary: {
          ...overview.workspace!.monthlyOperatingSummary!,
          accomplishments: Array.from({ length: 8 }, (_, index) => `Accomplishment ${index + 1}`),
          nextPriorities: Array.from({ length: 8 }, (_, index) => `Next priority ${index + 1}`)
        },
        objectivesAndPriorities: Array.from({ length: 12 }, (_, index) => ({
          id: "duplicate-priority-id",
          priority: index % 2 ? "medium" as const : "high" as const,
          progress: index * 8,
          status: index % 2 ? "active" as const : "planned" as const,
          title: `Priority ${index + 1}`
        }))
      }
    };
    const model = buildMemberGraphModel(maxOverview);

    expect(model.nodes).toHaveLength(117);
    expect(model.edges).toHaveLength(124);
    expect(new Set(model.nodes.map((node) => node.id)).size).toBe(117);
    for (const node of model.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(3);
      expect(node.x).toBeLessThanOrEqual(97);
      expect(node.y).toBeGreaterThanOrEqual(3);
      expect(node.y).toBeLessThanOrEqual(97);
    }

    const scene = buildMemberNeuronScene3D(maxOverview);
    expect(scene.nodes).toHaveLength(117);
    expect(scene.edges).toEqual(model.edges);
    expect(buildMemberNeuronScene3D(maxOverview)).toEqual(scene);
    expect(scene.nodes.find((node) => node.id === "core")).toMatchObject({ x3: 0, y3: 0, z3: 0 });
    for (const node of scene.nodes) {
      expect(Number.isFinite(node.x3)).toBe(true);
      expect(Number.isFinite(node.y3)).toBe(true);
      expect(Number.isFinite(node.z3)).toBe(true);
      expect(Math.hypot(node.x3, node.y3, node.z3)).toBeLessThan(1200);
    }
  });

  it("keeps ENTRAL fixed while every command layer orbits its direct parent", () => {
    const scene = buildMemberNeuronScene3D(overview);
    const start = positionMemberNeuronScene3D(scene.nodes, 0);
    const later = positionMemberNeuronScene3D(scene.nodes, 12);
    const core = scene.nodes.find((node) => node.id === "core")!;
    const marshal = scene.nodes.find((node) => node.branch === "marshal" && node.id === "command:portfolio-marshal")!;
    const general = scene.nodes.find((node) => node.branch === "general")!;
    const commander = scene.nodes.find((node) => node.branch === "commander")!;
    const soldier = scene.nodes.find((node) => node.branch === "soldier" && node.parentId === commander.id)!;

    expect(start.get(core.id)).toEqual({ x: 0, y: 0, z: 0 });
    expect(later.get(core.id)).toEqual({ x: 0, y: 0, z: 0 });
    for (const node of [marshal, general, commander, soldier]) {
      const parentAtStart = start.get(node.parentId!)!;
      const nodeAtStart = start.get(node.id)!;
      const parentLater = later.get(node.parentId!)!;
      const nodeLater = later.get(node.id)!;
      expect(Math.hypot(nodeAtStart.x - parentAtStart.x, nodeAtStart.y - parentAtStart.y, nodeAtStart.z - parentAtStart.z)).toBeCloseTo(node.orbitRadius, 5);
      expect(Math.hypot(nodeLater.x - parentLater.x, nodeLater.y - parentLater.y, nodeLater.z - parentLater.z)).toBeCloseTo(node.orbitRadius, 5);
      expect(nodeLater).not.toEqual(nodeAtStart);
    }

    const marshalTrack = scene.orbits.find((orbit) => orbit.parentId === "core" && orbit.branch === "marshal")!;
    const trackPoints = memberOrbitTrackPoints(marshalTrack, start.get("core")!);
    expect(trackPoints).toHaveLength(97);
    expect(trackPoints[0].x).toBeCloseTo(trackPoints.at(-1)!.x, 10);
    expect(trackPoints[0].y).toBeCloseTo(trackPoints.at(-1)!.y, 10);
    expect(trackPoints[0].z).toBeCloseTo(trackPoints.at(-1)!.z, 10);
    for (const point of trackPoints.slice(0, -1)) {
      expect(Math.hypot(point.x, point.y, point.z)).toBeCloseTo(marshalTrack.radius, 5);
    }
  });

  it("bounds a 5,000-node member hierarchy while preserving the upper command chain", () => {
    const hierarchy: NonNullable<NonNullable<MemberOverviewResponse["workspace"]>["commandHierarchy"]>["nodes"] = [
      { id: "entral-large", name: "ENTRAL", parentId: null, rank: "emperor", status: "thinking" },
      { id: "portfolio-large", name: "Portfolio Marshal", parentId: "entral-large", rank: "marshal", status: "working" }
    ];
    for (let generalIndex = 0; generalIndex < 100; generalIndex += 1) {
      const generalId = `general-${generalIndex}`;
      hierarchy.push({ id: generalId, name: `Business ${generalIndex} General`, parentId: "portfolio-large", rank: "general", status: "idle" });
      for (let commanderIndex = 0; commanderIndex < 10; commanderIndex += 1) {
        const commanderId = `${generalId}-commander-${commanderIndex}`;
        hierarchy.push({ id: commanderId, name: `Commander ${generalIndex}-${commanderIndex}`, parentId: generalId, rank: "commander", status: "idle" });
      }
    }
    let soldierIndex = 0;
    while (hierarchy.length < 5_000) {
      const commanderIndex = soldierIndex % 1_000;
      const generalIndex = Math.floor(commanderIndex / 10);
      const localCommanderIndex = commanderIndex % 10;
      hierarchy.push({
        id: `soldier-${soldierIndex}`,
        name: `Soldier ${soldierIndex}`,
        parentId: `general-${generalIndex}-commander-${localCommanderIndex}`,
        rank: "soldier",
        status: "idle"
      });
      soldierIndex += 1;
    }

    const scene = buildMemberNeuronScene3D({
      ...overview,
      workspace: { ...overview.workspace!, commandHierarchy: { nodes: hierarchy } }
    });

    expect(scene.nodes).toHaveLength(900);
    expect(scene.totalNodeCount).toBeGreaterThan(5_000);
    expect(scene.hiddenNodeCount).toBe(scene.totalNodeCount - 900);
    expect(scene.nodes.filter((node) => node.branch === "general")).toHaveLength(100);
    expect(scene.nodes.filter((node) => node.branch === "commander").length).toBeGreaterThan(0);
    expect(scene.nodes.filter((node) => node.branch === "soldier").length).toBeGreaterThan(0);
    expect(scene.nodes[0]).toMatchObject({ id: "core", label: "ENTRAL" });
  });

  it("renders the full graph with every approved record and no internal command controls", () => {
    render(<MemberNeuronGraph overview={overview} variant="full" />);

    expect(screen.getByRole("heading", { name: "Full organization graph" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Improve scheduling visibility: 65% complete. Status: active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Standardize hand-offs recommendation: Recommended action. Status: watch" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Completed the dispatch map: Accomplishment. Status: stable" })).toBeInTheDocument();
    expect(screen.queryByText("Raw prompts")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent controls")).not.toBeInTheDocument();
  });

  it("provides the full tenant-safe 3D command field and local visual controls", async () => {
    const user = userEvent.setup();
    render(<MemberNeuronsCommandCenter overview={overview} />);

    expect(await screen.findByRole("heading", { name: "ENTRAL Orbital Command" })).toBeInTheDocument();
    expect(screen.getAllByText("Business Generals").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Commanders").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Soldiers").length).toBeGreaterThan(0);
    expect(screen.getByLabelText("3D field view controls")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Command orbit speed" })).toHaveValue("0.72");
    expect(screen.getByRole("slider", { name: "Command orbit spacing" })).toHaveValue("1");
    expect(screen.getByRole("slider", { name: "Orbital camera sensitivity" })).toHaveValue("1");
    expect(screen.getByRole("slider", { name: "Orbital system brightness" })).toHaveValue("1");
    expect(screen.getByLabelText("Entral core color")).toHaveValue("#00f0ff");
    expect(screen.getByRole("button", { name: "Pause" })).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByRole("button", { name: "Resume" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("3D rendering is unavailable");
    expect(screen.getByText("Map the operating workflow")).toBeInTheDocument();
    expect(screen.getByText("Bound to Analytical Works")).toBeInTheDocument();
    expect(screen.getByText(/Visual controls change only the local view/)).toBeInTheDocument();
    expect(screen.queryByText("Raw prompts")).not.toBeInTheDocument();
    expect(screen.queryByText("Agent controls")).not.toBeInTheDocument();
  });

  it("keeps the member graph source independent from internal command and connector modules", () => {
    const source = readFileSync(resolve(process.cwd(), "components", "MemberNeuronGraph.tsx"), "utf8");
    const modelSource = readFileSync(resolve(process.cwd(), "components", "member-graph-model.ts"), "utf8");
    const commandFieldSource = readFileSync(resolve(process.cwd(), "components", "MemberNeuronsCommandCenter.tsx"), "utf8");
    const sceneSource = readFileSync(resolve(process.cwd(), "components", "member-neurons-3d.ts"), "utf8");

    for (const memberGraphSource of [source, modelSource, commandFieldSource, sceneSource]) {
      expect(memberGraphSource).not.toContain('from "./NeuronsCommandCenter"');
      expect(memberGraphSource).not.toContain('from "../components/NeuronsCommandCenter"');
      expect(memberGraphSource).not.toContain("../lib/api");
      expect(memberGraphSource).not.toContain("../lib/command");
      expect(memberGraphSource).not.toContain("ConnectionCenter");
      expect(memberGraphSource).not.toContain("MerchOperationsPanel");
    }
  });

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
    expect(screen.getByRole("heading", { name: "Entral command field" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "ENTRAL: Central command. Status: active" })).toBeInTheDocument();
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

  it("opens the complete graph as a first-class member view", async () => {
    navigation.pathname = "/member/graph";
    api.apiFetch.mockResolvedValueOnce(overview);
    render(<MemberDashboardClient initialSession={session} view="graph" />);

    expect(await screen.findByRole("heading", { name: "Full organization graph" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Full graph" })).toHaveAttribute("aria-current", "page");
    expect(await screen.findByRole("heading", { name: "ENTRAL Orbital Command" })).toBeInTheDocument();
    expect(screen.getByText("Map the operating workflow")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Command orbit speed" })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("3D rendering is unavailable");
    expect(screen.queryByRole("heading", { name: "Work overview" })).not.toBeInTheDocument();
  });

  it("returns an expired graph session to the full graph after sign in", async () => {
    navigation.pathname = "/member/graph";
    api.apiFetch.mockRejectedValueOnce(new ApiError(401, "Authentication is required.", null));
    render(<MemberDashboardClient initialSession={session} view="graph" />);

    await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith("/member/sign-in?returnTo=%2Fmember%2Fgraph"));
    expect(navigation.refresh).toHaveBeenCalled();
  });

  it("keeps sign-out failure recovery scoped to sign out", async () => {
    const user = userEvent.setup();
    navigation.pathname = "/member";
    api.apiFetch
      .mockResolvedValueOnce(overview)
      .mockRejectedValueOnce(new Error("Session service unavailable"))
      .mockRejectedValueOnce(new Error("Session service unavailable"));
    render(<MemberDashboardClient initialSession={session} />);

    await screen.findByRole("heading", { name: "Work overview" });
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign out failed");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(api.apiFetch).toHaveBeenNthCalledWith(3, "/logout", { method: "POST" }));
    expect(api.apiFetch).toHaveBeenCalledTimes(3);
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
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
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

  it("associates password mismatch feedback with the confirmation field", async () => {
    const user = userEvent.setup();
    render(<MemberRecoveryClient token="valid-reset-token" />);

    await user.type(screen.getByLabelText("New password"), "correct-horse-battery");
    await user.type(screen.getByLabelText("Confirm new password"), "different-password");
    await user.click(screen.getByRole("button", { name: "Update password" }));

    const confirmation = screen.getByLabelText("Confirm new password");
    expect(confirmation).toHaveAttribute("aria-invalid", "true");
    expect(confirmation).toHaveAccessibleDescription("Passwords must match.");
    expect(confirmation).toHaveFocus();
    expect(api.apiFetch).not.toHaveBeenCalled();
  });
});
