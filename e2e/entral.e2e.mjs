import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { generatePhase180BenchmarkFixture } from "../scripts/phase180-benchmark.mjs";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://127.0.0.1:3000";
const backendUrl = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:4000";
const frontendTarget = new URL(frontendUrl);
const backendTarget = new URL(backendUrl);
const pnpm = process.env.E2E_PNPM_PATH
  ?? process.env.npm_execpath
  ?? join(repoRoot, ".corepack/v1/pnpm/9.12.3/bin/pnpm.cjs");
const backendRequire = createRequire(new URL("../backend/package.json", import.meta.url));
const { chromium } = backendRequire("playwright-core");
const spawned = [];
const phase180ScaleMeasurements = [];
let browser;

function windowsPath(value) {
  return value ? value.replace(/^\/([A-Za-z]:\/)/, "$1") : value;
}

function browserExecutable() {
  const candidates = [
    process.env.E2E_BROWSER_EXECUTABLE,
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    `${process.env["ProgramFiles(x86)"] ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.ProgramFiles ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.ProgramFiles ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env["ProgramFiles(x86)"] ?? ""}\\Google\\Chrome\\Application\\chrome.exe`,
    `${process.env.LOCALAPPDATA ?? ""}\\Google\\Chrome\\Application\\chrome.exe`
  ].filter(Boolean);

  return candidates.find((candidate) => {
    try {
      backendRequire("node:fs").accessSync(candidate);
      return true;
    } catch {
      return false;
    }
  });
}

async function fetchOk(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHttp(url, label, timeoutMs = 120_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await fetchOk(url)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 750));
  }

  throw new Error(`${label} did not become ready at ${url}`);
}

function spawnServer(name, args, env = {}) {
  const child = spawn(process.execPath, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...env
    },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true
  });

  spawned.push(child);
  const prefix = `[e2e:${name}]`;
  child.stdout.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) process.stdout.write(`${prefix} ${line}\n`);
    }
  });
  child.stderr.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) process.stderr.write(`${prefix} ${line}\n`);
    }
  });

  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      process.stderr.write(`${prefix} exited with code ${code}${signal ? ` (${signal})` : ""}\n`);
    }
  });

  return child;
}

async function ensureServers() {
  if (!await fetchOk(`${backendUrl}/health`)) {
    spawnServer("backend", [pnpm, "--filter", "@entral/backend", "dev:memory"], {
      API_HOST: "127.0.0.1",
      API_PORT: backendTarget.port || "4000",
      DATABASE_URL: "postgresql://entral:entral@127.0.0.1:5432/entral_e2e",
      JWT_SECRET: "entral-e2e-local-only-secret-32-characters",
      OPENAI_API_KEY: ""
    });
  }

  await waitForHttp(`${backendUrl}/health`, "Memory backend");

  if (!await fetchOk(frontendUrl)) {
    spawnServer("frontend", [
      pnpm,
      "--filter",
      "@entral/frontend",
      "exec",
      "next",
      "dev",
      "-H",
      frontendTarget.hostname,
      "-p",
      frontendTarget.port || "3000"
    ], {
      API_PROXY_URL: backendUrl,
      NEXT_PUBLIC_API_URL: ""
    });
  }

  await waitForHttp(frontendUrl, "Frontend");
}

async function stopServers() {
  if (browser) {
    await browser.close().catch(() => undefined);
    browser = undefined;
  }

  for (const child of spawned.reverse()) {
    child.stdout?.destroy();
    child.stderr?.destroy();

    if (child.killed) {
      child.unref?.();
      continue;
    }

    if (process.platform === "win32" && child.pid) {
      spawnSync("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }

    child.unref?.();
  }
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@entral.local`;
}

async function expectVisible(locator, label, timeout = 20_000) {
  try {
    await locator.waitFor({ state: "visible", timeout });
  } catch (error) {
    throw new Error(`${label} was not visible. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function expectUrl(page, pattern, label) {
  try {
    await page.waitForURL(pattern, { timeout: 20_000 });
  } catch (error) {
    throw new Error(`${label} URL was not reached. Current URL: ${page.url()}. ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function newPage(options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 1366, height: 900 },
    isMobile: options.isMobile ?? false,
    deviceScaleFactor: options.deviceScaleFactor ?? 1
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  return { context, page };
}

const phase170Ids = {
  business: "423e4567-e89b-42d3-a456-426614174000",
  commander: "223e4567-e89b-42d3-a456-426614174000",
  event: "e23e4567-e89b-42d3-a456-426614174000",
  general: "523e4567-e89b-42d3-a456-426614174000",
  marshal: "323e4567-e89b-42d3-a456-426614174000",
  user: "123e4567-e89b-42d3-a456-426614174000"
};

function phase170Business(version = 3) {
  return {
    active_mission_count: 1,
    active_task_count: 2,
    agent_count: 3,
    automation_count: 1,
    business_id: phase170Ids.business,
    business_name: "Atlas Software",
    capital_available: 5000,
    commander_id: phase170Ids.commander,
    currency: "USD",
    general_id: phase170Ids.general,
    general_name: "Software",
    gross_revenue: 12500,
    health_drivers: [{
      code: "verified-margin",
      direction: "POSITIVE",
      evidence_ids: [],
      explanation: "The verified contribution snapshot is positive.",
      label: "Verified margin",
      severity: "INFO",
      source_freshness: "2026-07-25T00:00:00.000Z",
      value: 0.35
    }],
    health_score: 91,
    health_state: "HEALTHY",
    integration_count: 2,
    marshal_id: phase170Ids.marshal,
    marshal_name: "Digital Businesses",
    net_contribution: 4400,
    primary_objective: "Grow verified recurring revenue.",
    revenue_period_end: "2026-07-25T00:00:00.000Z",
    revenue_period_start: "2026-07-01T00:00:00.000Z",
    source_freshness: { finance: "2026-07-25T00:00:00.000Z" },
    stable_code: "business.software.atlas",
    status: "OPERATING",
    tool_count: 4,
    top_exception: null,
    top_recommendation: "Review the next evidence-backed expansion.",
    updated_at: version === 3 ? "2026-07-25T01:00:00.000Z" : "2026-07-25T03:00:00.000Z",
    version
  };
}

function phase170Portfolio(version = 3) {
  return {
    businesses: [phase170Business(version)],
    event_sequence: version === 3 ? 9 : 10,
    generated_at: "2026-07-25T03:00:00.000Z",
    scope: {
      label: "Human portfolio / all canonical businesses",
      mode: "HUMAN_PORTFOLIO",
      user_id: phase170Ids.user,
      visible_business_ids: [phase170Ids.business]
    },
    totals: {
      active_commanders: 1,
      active_soldiers: 2,
      businesses: 1,
      financials: [{
        business_count: 1,
        businesses_with_financials: 1,
        capital_available: 5000,
        currency: "USD",
        gross_revenue: 12500,
        net_contribution: 4400
      }],
      health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 1, UNKNOWN: 0, WATCH: 0 },
      unresolved_exceptions: 0
    }
  };
}

function phase170FullBusiness(version = 3) {
  const eventSequence = version === 3 ? 9 : 10;
  return {
    business: {
      agents_and_tools: { agents: [{ name: "Support Soldier", status: "ACTIVE" }], tool_grants: [] },
      aggregate_version: version,
      decisions_and_changes: { audit_timeline: [], decisions: [], governance_actions: [] },
      evidence_ids: [],
      external_activity: { source_records: [] },
      financials: { snapshots: [{ gross_revenue: 12500, net_contribution: 4400 }] },
      issues_and_recommendations: { recommendations: [] },
      loaded_at: "2026-07-25T03:00:00.000Z",
      operations: { missions: [{ title: "Verified delivery mission" }], schedules: [], tasks: [] },
      overview: { profile: { business_model: "Software" }, state: { status: "OPERATING" } },
      performance: { experiments: [], health_assessments: [], metrics: [], outcomes: [] },
      summary: phase170Business(version),
      version_history: [{
        changed_at: "2026-07-25T03:00:00.000Z",
        reason: "Canonical event refresh",
        version
      }]
    },
    event_sequence: eventSequence
  };
}

function phase180ScaleResponses() {
  const fixture = generatePhase180BenchmarkFixture();
  const scope = {
    label: "Isolated Phase 180 acceptance portfolio",
    mode: "HUMAN_PORTFOLIO",
    user_id: phase170Ids.user,
    visible_business_ids: fixture.businesses.map((business) => business.business_id)
  };
  return {
    hierarchy: {
      entities: fixture.entities,
      event_sequence: 9,
      generated_at: "2026-07-25T00:00:00.000Z",
      scope
    },
    portfolio: {
      businesses: fixture.businesses,
      event_sequence: 9,
      generated_at: "2026-07-25T00:00:00.000Z",
      scope,
      totals: {
        active_commanders: 500,
        active_soldiers: 9_368,
        businesses: 500,
        financials: [],
        health_distribution: { CRITICAL: 0, DEGRADED: 0, HEALTHY: 500, UNKNOWN: 0, WATCH: 0 },
        unresolved_exceptions: 0
      }
    }
  };
}

async function installPhase180ScaleRoutes(page, responses) {
  await page.route("**/member/api/v1/member/organizations/*/portfolio/summary", async (route) => {
    await route.fulfill({ contentType: "application/json", json: responses.portfolio, status: 200 });
  });
  await page.route("**/member/api/v1/member/organizations/*/hierarchy", async (route) => {
    await route.fulfill({ contentType: "application/json", json: responses.hierarchy, status: 200 });
  });
}

async function installPhase170Routes(page, { emitEvent = false } = {}) {
  let version = 3;
  let eventSent = false;
  await page.route("**/api/v1/control-plane/portfolio/summary", async (route) => {
    await route.fulfill({ contentType: "application/json", json: phase170Portfolio(version), status: 200 });
  });
  await page.route(`**/api/v1/control-plane/businesses/${phase170Ids.business}/full`, async (route) => {
    await route.fulfill({ contentType: "application/json", json: phase170FullBusiness(version), status: 200 });
  });
  await page.route("**/api/v1/control-plane/events?afterSequence=*", async (route) => {
    const afterSequence = Number(new URL(route.request().url()).searchParams.get("afterSequence") ?? "0");
    if (emitEvent && !eventSent && afterSequence === 9) {
      eventSent = true;
      version = 4;
      await route.fulfill({
        contentType: "application/json",
        json: {
          events: [{
            aggregate_id: phase170Ids.business,
            aggregate_type: "BUSINESS",
            aggregate_version: 4,
            business_id: phase170Ids.business,
            event_id: phase170Ids.event,
            event_type: "BUSINESS_UPDATED",
            occurred_at: "2026-07-25T03:00:00.000Z",
            sequence_number: 10
          }],
          next_sequence: 10
        },
        status: 200
      });
      return;
    }
    await route.fulfill({
      contentType: "application/json",
      json: { events: [], next_sequence: Math.max(afterSequence, version === 4 ? 10 : 9) },
      status: 200
    });
  });
}

async function enterWorkspace(page, email = uniqueEmail("operator")) {
  const response = await page.context().request.post(`${frontendUrl}/api/v1/signup`, {
    data: {
      email,
      name: "E2E Operator",
      password: "password123"
    }
  });

  if (!response.ok()) {
    throw new Error(`E2E owner-session setup failed with HTTP ${response.status()}.`);
  }

  const signup = await response.json();
  const verificationUrl = new URL(signup.verificationUrl, frontendUrl);
  const verificationToken = verificationUrl.searchParams.get("token");
  if (!verificationToken) {
    throw new Error("E2E owner-session setup did not return an email verification token.");
  }

  const verificationResponse = await page.context().request.post(`${frontendUrl}/api/v1/email-verification/confirm`, {
    data: { token: verificationToken }
  });
  if (!verificationResponse.ok()) {
    throw new Error(`E2E owner-session verification failed with HTTP ${verificationResponse.status()}.`);
  }

  await page.goto(`${frontendUrl}/dashboard`);
  await expectUrl(page, /\/dashboard$/, "Authenticated dashboard");
  await expectVisible(page.getByLabel("ENTRAL Command Center"), "Command Center");
  return email;
}

async function closeAcademyIfOpen(page) {
  const academyClose = page.getByRole("button", { name: "Close ENTRAL Academy" });
  await academyClose.waitFor({ state: "visible", timeout: 2500 }).catch(() => undefined);
  if (await academyClose.count() && await academyClose.isVisible()) {
    await academyClose.click();
  }
}

const tests = [
  {
    name: "root URL opens protected member sign-in",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await page.goto(frontendUrl);
        await expectUrl(page, /\/member\/sign-in(?:\?.*)?$/, "Protected member entry");
        await expectVisible(page.getByRole("heading", { name: "Sign in to Entral" }), "Member sign-in");
        await expectVisible(page.getByText("Secure member access"), "Secure member access label");

        if (await page.getByText(/create verified account|private beta brief/i).count()) {
          throw new Error("A retired public account or beta-brief control is still visible.");
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "legacy public account routes return to member sign-in",
    run: async () => {
      const { context, page } = await newPage();
      try {
        for (const pathname of ["/onboarding", "/signup", "/verify-email", "/forgot-password", "/reset-password"]) {
          await page.goto(`${frontendUrl}${pathname}`);
          await expectUrl(page, /\/member\/sign-in(?:\?.*)?$/, `${pathname} retirement redirect`);
        }

        await expectVisible(page.getByRole("heading", { name: "Sign in to Entral" }), "Member sign-in");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "owner session opens canonical Dashboard, refreshes from events, and opens business detail",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await installPhase170Routes(page, { emitEvent: true });
        await enterWorkspace(page, uniqueEmail("dashboard"));
        await expectVisible(page.getByRole("heading", { name: "E2E Operator's Dashboard" }), "Canonical Dashboard");
        await expectVisible(page.getByText("Human portfolio / all canonical businesses"), "Human portfolio scope");
        const businessCard = page.locator(".phase170-business-card").filter({ hasText: "Atlas Software" });
        await expectVisible(businessCard, "Canonical business card");
        await expectVisible(businessCard.getByText("Version 4"), "Event-refreshed business version", 15_000);
        await businessCard.getByRole("link", { name: "Open business" }).click();
        await expectUrl(page, new RegExp(`/dashboard\\?business=${phase170Ids.business}$`), "Canonical business detail");
        await expectVisible(page.getByRole("heading", { name: "Atlas Software" }), "Business detail heading");
        await expectVisible(page.getByText("Agents and tools"), "Agents and tools section");
        await expectVisible(page.getByText("External activity"), "External activity section");
        await expectVisible(page.getByText("Event 10"), "Version-consistent full record");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "member Phase 180 shell synchronizes Dashboard, Graph, Infrastructure, mobile rotation, and reconnect",
    run: async () => {
      const { context, page } = await newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        deviceScaleFactor: 2
      });
      const runtimeErrors = [];
      try {
        await enterWorkspace(page, uniqueEmail("phase180-member"));
        await page.goto(`${frontendUrl}/member/dashboard`);
        await expectUrl(page, /\/member\/dashboard$/, "Phase 180 member Dashboard");
        await closeAcademyIfOpen(page);
        page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          const text = message.text();
          const expectedOfflineFailure = /net::ERR_INTERNET_DISCONNECTED/i.test(text);
          if (message.type() === "error" && !expectedOfflineFailure) runtimeErrors.push(`console: ${text}`);
        });
        await expectVisible(page.getByRole("heading", { name: "E2E Operator's Dashboard" }), "Phase 180 canonical Dashboard");
        const destinationNav = page.getByRole("navigation", { name: "Member destinations" });
        if (await destinationNav.getByRole("link").count() !== 3) {
          throw new Error("Phase 180 member shell does not expose exactly three destinations.");
        }
        await expectVisible(page.getByLabel("Inherited canonical scope"), "Inherited canonical scope");
        const entralEmblem = page.getByRole("button", { name: "Open ENTRAL conversation" });
        await expectVisible(entralEmblem, "Persistent ENTRAL emblem");
        await entralEmblem.click();
        const entralContext = page.getByRole("region", { name: "Canonical ENTRAL context" });
        await expectVisible(entralContext, "Member-safe ENTRAL context");
        await expectVisible(entralContext.getByText("Event 9", { exact: true }), "ENTRAL canonical event version");
        await expectVisible(
          entralContext.getByText(/No versioned Human and ENTRAL conversation message is recorded/i),
          "Truthful empty canonical conversation history"
        );
        await expectVisible(entralContext.getByText(/No action-status event is present/i), "Truthful ENTRAL action status");
        await page.getByRole("button", { name: "Expand ENTRAL" }).click();
        await expectVisible(page.getByRole("button", { name: "Compact ENTRAL" }), "Expanded ENTRAL workspace");
        await page.getByRole("button", { name: "Close ENTRAL", exact: true }).click();

        await destinationNav.getByRole("link", { name: /universe graph/i }).click();
        await expectUrl(page, /\/member\/graph$/, "Phase 180 Universe Graph");
        await expectVisible(page.getByRole("heading", { name: "2D Graph" }), "2D Graph heading");
        const canvas = page.getByLabel(/Canonical Universe Graph with 5 entities/i);
        await expectVisible(canvas, "Canonical 2D Graph canvas");
        const twoDimensionalSnapshot = await page.locator('[data-graph-dimension="2d"]').evaluate((element) => ({
          entities: element.getAttribute("data-canonical-entity-count"),
          event: element.getAttribute("data-canonical-event-sequence")
        }));
        if (twoDimensionalSnapshot.entities !== "5" || twoDimensionalSnapshot.event !== "9") {
          throw new Error(`2D Graph did not expose the accepted canonical snapshot: ${JSON.stringify(twoDimensionalSnapshot)}`);
        }
        if (await page.getByRole("button", { name: "Open ENTRAL conversation" }).count()) {
          throw new Error("ENTRAL conversation was exposed over the Graph alert-only surface.");
        }
        await canvas.focus();
        await page.keyboard.press("Enter");
        await expectVisible(page.getByRole("complementary", { name: /ENTRAL graph details/i }), "Dismissible Graph detail drawer");

        await page.setViewportSize({ width: 844, height: 390 });
        await expectVisible(page.getByRole("complementary", { name: /ENTRAL graph details/i }), "Graph selection after landscape rotation");
        await page.setViewportSize({ width: 390, height: 844 });
        await expectVisible(page.getByRole("complementary", { name: /ENTRAL graph details/i }), "Graph selection after portrait recovery");

        await page.getByRole("button", { name: "3D Graph" }).click();
        await expectUrl(page, /\/member\/graph\?graph=3d$/, "Original 3D Universe Graph");
        await expectVisible(page.getByRole("heading", { name: "3D Graph" }), "3D Graph heading");
        const original3DCanvas = page.getByRole("application", { name: "3D interactive ENTRAL neuron graph" });
        await expectVisible(original3DCanvas, "Original full 3D Universe Graph canvas", 30_000);
        const threeDimensionalSnapshot = await page.locator(".phase180-graph-3d").evaluate((element) => ({
          entities: element.getAttribute("data-canonical-entity-count"),
          event: element.getAttribute("data-canonical-event-sequence")
        }));
        if (
          threeDimensionalSnapshot.entities !== twoDimensionalSnapshot.entities
          || threeDimensionalSnapshot.event !== twoDimensionalSnapshot.event
        ) {
          throw new Error(
            `2D and 3D Graphs did not share one canonical snapshot: ${JSON.stringify({ threeDimensionalSnapshot, twoDimensionalSnapshot })}`
          );
        }
        await expectVisible(page.getByRole("toolbar", { name: "Universe Graph toolbar" }), "Original 3D Graph toolbar");
        await expectVisible(page.getByLabel("Selected graph entity"), "Original 3D Graph selected-entity drawer");

        await page.getByRole("button", { name: "2D Graph" }).click();
        await expectUrl(page, /\/member\/graph\?graph=2d$/, "Retained 2D Graph");
        await expectVisible(page.getByRole("heading", { name: "2D Graph" }), "2D Graph after view switch");

        await context.setOffline(true);
        await page.waitForTimeout(5_500);
        await expectVisible(page.getByText(/Disconnected · retrying canonical events/i), "Canonical disconnect state");
        await context.setOffline(false);
        await expectVisible(page.getByText(/Connected · canonical event 9/i), "Canonical reconnect recovery", 10_000);

        await page.getByRole("button", { name: "Open full record" }).click();
        await expectUrl(page, /\/member\/infrastructure$/, "Phase 180 Infrastructure");
        await expectVisible(page.getByRole("heading", { name: "Infrastructure", exact: true }), "Infrastructure heading");
        await expectVisible(page.getByRole("heading", { name: "ENTRAL" }), "Canonical full entity record");
        await expectVisible(page.getByText("Snapshot event 9"), "Version-aligned entity snapshot");
        const recordLayout = await page.locator(".phase180-record").evaluate((element) => {
          const style = getComputedStyle(element);
          return { bottom: style.bottom, position: style.position, top: style.top };
        });
        if (recordLayout.position !== "fixed" || recordLayout.top !== "0px") {
          throw new Error(`Phone Infrastructure did not open a full-screen record: ${JSON.stringify(recordLayout)}`);
        }
        await page.getByRole("button", { name: "Back" }).click();
        await expectVisible(page.getByRole("tree", { name: "Canonical hierarchy" }), "Infrastructure hierarchy after Back");
        const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
        if (!noHorizontalOverflow) {
          throw new Error("Phase 180 mobile shell has horizontal overflow.");
        }
        if (runtimeErrors.length) {
          throw new Error(`Unexpected Phase 180 browser errors:\n${runtimeErrors.join("\n")}`);
        }
      } finally {
        await context.setOffline(false).catch(() => undefined);
        await context.close();
      }
    }
  },
  {
    name: "ENTRAL workspace shows AI cost guardrails and disables unconfigured execution",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await enterWorkspace(page, uniqueEmail("chat"));
        await page.goto(`${frontendUrl}/chat`);
        await expectUrl(page, /\/dashboard\?section=entral$/, "ENTRAL workspace");
        await expectVisible(page.getByRole("heading", { name: /entral communications/i }), "ENTRAL communications heading");
        await expectVisible(page.getByText("AI cost guardrails"), "AI usage guardrail");
        await expectVisible(page.getByText(/Read-only conversation history/i), "Read-only provider boundary");
        const directiveInput = page.getByLabel("Enter command directive");
        await expectVisible(directiveInput, "Directive input");
        if (await directiveInput.isEnabled()) {
          throw new Error("The directive input was enabled without a configured real AI provider.");
        }
        await expectVisible(page.getByText(/Mock provider|Real provider|Budget cap/), "Provider mode badge");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "mobile canonical Dashboard remains usable without horizontal overflow",
    run: async () => {
      const { context, page } = await newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        deviceScaleFactor: 2
      });
      try {
        await installPhase170Routes(page);
        await enterWorkspace(page, uniqueEmail("mobile"));
        await closeAcademyIfOpen(page);

        await expectVisible(page.getByRole("heading", { name: "E2E Operator's Dashboard" }), "Mobile canonical Dashboard");
        await expectVisible(page.locator(".phase170-business-card").filter({ hasText: "Atlas Software" }), "Mobile business card");
        await expectVisible(page.getByPlaceholder("Business, Marshal, General, objective"), "Mobile portfolio search");
        await expectVisible(page.getByRole("link", { name: "Graph" }), "Manually available Graph destination");
        await expectVisible(page.getByRole("button", { name: "Academy" }), "Manually available Academy");
        const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
        if (!noHorizontalOverflow) {
          throw new Error(`Mobile viewport has horizontal overflow: ${await page.evaluate(() => document.documentElement.scrollWidth)}px`);
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "Phase 180 production Graph and Infrastructure remain usable with 500 businesses and 10000 entities",
    run: async () => {
      const responses = phase180ScaleResponses();
      for (const profile of [
        { name: "desktop", viewport: { width: 1440, height: 900 }, isMobile: false, deviceScaleFactor: 1 },
        { name: "phone", viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 2 }
      ]) {
        const { context, page } = await newPage(profile);
        const runtimeErrors = [];
        try {
          await enterWorkspace(page, uniqueEmail(`phase180-scale-${profile.name}`));
          await closeAcademyIfOpen(page);
          await installPhase180ScaleRoutes(page, responses);
          page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
          page.on("console", (message) => {
            if (message.type() === "error") runtimeErrors.push(`console: ${message.text()}`);
          });
          const graphStart = performance.now();
          await page.goto(`${frontendUrl}/member/graph`);
          await closeAcademyIfOpen(page);
          const canvas = page.getByRole("application", { name: /Canonical Universe Graph with 10000 entities/i });
          await expectVisible(canvas, `${profile.name} 10,000-entity production Graph`, 30_000);
          const graphReadyMs = performance.now() - graphStart;
          if (graphReadyMs > 30_000) {
            throw new Error(`${profile.name} Graph readiness exceeded 30s: ${graphReadyMs.toFixed(1)}ms.`);
          }
          await page.getByRole("button", { name: "Fit" }).click();
          if (profile.isMobile) {
            await page.waitForTimeout(100);
            const bounds = await canvas.boundingBox();
            if (!bounds) throw new Error("Phone Graph canvas did not expose interaction bounds.");
            const center = {
              x: bounds.x + bounds.width / 2,
              y: bounds.y + bounds.height / 2
            };
            const touch = await context.newCDPSession(page);
            try {
              const fittedFrame = await canvas.screenshot();
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [{ x: center.x - 35, y: center.y - 20 }]
              });
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: center.x + 35, y: center.y + 30 }]
              });
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchEnd",
                touchPoints: []
              });
              await page.waitForTimeout(100);
              const pannedFrame = await canvas.screenshot();
              if (fittedFrame.equals(pannedFrame)) {
                throw new Error("Phone Graph one-finger touch pan did not change the production canvas.");
              }

              await touch.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [
                  { x: center.x - 35, y: center.y },
                  { x: center.x + 35, y: center.y }
                ]
              });
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [
                  { x: center.x - 90, y: center.y },
                  { x: center.x + 90, y: center.y }
                ]
              });
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchEnd",
                touchPoints: []
              });
              await page.waitForTimeout(100);
              const pinchedFrame = await canvas.screenshot();
              if (pannedFrame.equals(pinchedFrame)) {
                throw new Error("Phone Graph two-finger pinch did not change the production canvas zoom.");
              }
            } finally {
              await touch.detach();
            }
          }
          await canvas.focus();
          const graphInteractionStart = performance.now();
          await page.keyboard.press("ArrowRight");
          await page.keyboard.press("+");
          const graphDetails = page.getByRole("complementary", { name: /ENTRAL graph details/i });
          await expectVisible(graphDetails, `${profile.name} graph keyboard selection`);
          const graphInteractionMs = performance.now() - graphInteractionStart;
          if (graphInteractionMs > 2_000) {
            throw new Error(`${profile.name} Graph keyboard interaction exceeded 2s: ${graphInteractionMs.toFixed(1)}ms.`);
          }
          await page.keyboard.press("Escape");
          await graphDetails.waitFor({ state: "hidden", timeout: 2_000 }).catch(() => {
            throw new Error(`${profile.name} Escape did not clear the graph selection before switching views.`);
          });

          const graph3DStart = performance.now();
          const graph3DButton = page.getByRole("button", { name: "3D Graph" });
          await graph3DButton.focus();
          await page.keyboard.press("Enter");
          const original3DCanvas = page.getByRole("application", { name: "3D interactive ENTRAL neuron graph" });
          await expectVisible(original3DCanvas, `${profile.name} 10,000-entity original 3D Graph`, 30_000);
          const graph3DReadyMs = performance.now() - graph3DStart;
          const graph3DSnapshot = await page.locator(".phase180-graph-3d").evaluate((element) => ({
            entities: element.getAttribute("data-canonical-entity-count"),
            event: element.getAttribute("data-canonical-event-sequence")
          }));
          if (graph3DSnapshot.entities !== "10000" || graph3DSnapshot.event !== "9") {
            throw new Error(`${profile.name} 3D Graph did not retain the 10,000-entity canonical event: ${JSON.stringify(graph3DSnapshot)}`);
          }
          await page.getByRole("button", { name: "Fit view" }).click();
          await page.getByRole("button", { name: "2D Graph" }).click();
          await expectVisible(canvas, `${profile.name} 2D Graph after 3D parity verification`, 30_000);

          const infrastructureStart = performance.now();
          await page.getByRole("link", { name: "Infrastructure" }).click();
          await expectVisible(page.getByRole("heading", { name: "Infrastructure", exact: true }), `${profile.name} Infrastructure`);
          const tree = page.getByRole("tree", { name: "Canonical hierarchy" });
          await expectVisible(tree, `${profile.name} virtualized hierarchy`);
          const renderedRows = await tree.getByRole("treeitem").count();
          if (renderedRows < 1 || renderedRows > 100) {
            throw new Error(`${profile.name} Infrastructure rendered ${renderedRows} tree rows instead of a virtualized window.`);
          }
          const search = page.getByPlaceholder("Search records");
          await search.fill("Soldier 9368");
          await expectVisible(page.getByText("1 matching records"), `${profile.name} exact 10k hierarchy search`);
          await expectVisible(page.getByRole("treeitem", { name: /Soldier 9368/i }), `${profile.name} searched entity with lineage`);
          const infrastructureReadyMs = performance.now() - infrastructureStart;
          if (infrastructureReadyMs > 10_000) {
            throw new Error(`${profile.name} Infrastructure search exceeded 10s: ${infrastructureReadyMs.toFixed(1)}ms.`);
          }
          const firstTreeItem = tree.getByRole("treeitem").first();
          await firstTreeItem.focus();
          await page.keyboard.press("End");
          const activeTreeItem = await page.evaluate(() => document.activeElement?.getAttribute("role"));
          if (activeTreeItem !== "treeitem") {
            throw new Error(`${profile.name} virtualized hierarchy did not preserve keyboard focus.`);
          }
          const noHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2);
          if (!noHorizontalOverflow) {
            throw new Error(`${profile.name} scale surface has horizontal overflow.`);
          }
          if (runtimeErrors.length) {
            throw new Error(`Unexpected ${profile.name} scale browser errors:\n${runtimeErrors.join("\n")}`);
          }
          process.stdout.write(
            `[e2e:phase180-scale] ${profile.name} graph_ready_ms=${graphReadyMs.toFixed(1)} `
            + `graph_interaction_ms=${graphInteractionMs.toFixed(1)} graph_3d_ready_ms=${graph3DReadyMs.toFixed(1)} `
            + `infrastructure_search_ms=${infrastructureReadyMs.toFixed(1)} `
            + `rendered_tree_rows=${renderedRows}\n`
          );
          phase180ScaleMeasurements.push({
            graph_3d_ready_ms: Number(graph3DReadyMs.toFixed(1)),
            graph_interaction_ms: Number(graphInteractionMs.toFixed(1)),
            graph_ready_ms: Number(graphReadyMs.toFixed(1)),
            infrastructure_search_ms: Number(infrastructureReadyMs.toFixed(1)),
            profile: profile.name,
            rendered_tree_rows: renderedRows,
            viewport: profile.viewport
          });
        } finally {
          await context.close();
        }
      }
    }
  },
  {
    name: "secondary routes remain responsive, keyboard-usable, and console-clean",
    run: async () => {
      for (const viewport of [{ width: 768, height: 1024 }, { width: 390, height: 844 }]) {
        const { context, page } = await newPage({ viewport, isMobile: viewport.width === 390, deviceScaleFactor: viewport.width === 390 ? 2 : 1 });
        const runtimeErrors = [];
        page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          const text = message.text();
          const expectedAccessOrRouteResponse = /Failed to load resource.*status of (401|403|404)/i.test(text);
          if (message.type() === "error" && !expectedAccessOrRouteResponse) runtimeErrors.push(`console: ${text}`);
        });

        try {
          await installPhase170Routes(page);
          await enterWorkspace(page, uniqueEmail(`secondary-${viewport.width}`));
          await closeAcademyIfOpen(page);

          for (const pathname of ["/agents", "/automations", "/chat", "/admin", "/route-not-found"]) {
            await page.goto(`${frontendUrl}${pathname}`);
            await page.waitForLoadState("domcontentloaded");
            const dimensions = await page.evaluate(() => ({
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: window.innerWidth
            }));

            if (dimensions.documentWidth > dimensions.viewportWidth + 2) {
              throw new Error(`${pathname} overflows at ${viewport.width}px: ${dimensions.documentWidth}px document width.`);
            }

            const duplicateCommandCenterActions = await page.evaluate(() => Array.from(document.querySelectorAll("a, button"))
              .filter((element) => element.textContent?.trim() === "Command Center" && element.getBoundingClientRect().width > 0)
              .length);
            if (duplicateCommandCenterActions > 1) {
              throw new Error(`${pathname} exposes ${duplicateCommandCenterActions} visible Command Center actions at ${viewport.width}px.`);
            }
          }

          // Return to the canonical surface before exercising the shared account
          // control. Secondary workspaces retain their own scroll positions, which
          // must not turn a cross-route check into a click through another nav item.
          await page.goto(`${frontendUrl}/dashboard`);
          await page.waitForLoadState("domcontentloaded");
          const settingsTrigger = page.getByRole("button", { name: "Settings" });
          await expectVisible(settingsTrigger, "Settings trigger");
          await settingsTrigger.focus();
          await settingsTrigger.click();
          const settingsDialog = page.getByRole("dialog", { name: "ENTRAL settings" });
          await expectVisible(settingsDialog, "Settings dialog");
          await page.keyboard.press("Escape");
          await settingsDialog.waitFor({ state: "hidden", timeout: 2_000 }).catch(() => {
            throw new Error("Escape did not close Settings.");
          });
          const focusReturned = await settingsTrigger.evaluate((element) => document.activeElement === element);
          if (!focusReturned) throw new Error("Settings did not restore focus to its trigger.");

          if (runtimeErrors.length > 0) {
            throw new Error(`Unexpected browser errors at ${viewport.width}px:\n${runtimeErrors.join("\n")}`);
          }
        } finally {
          await context.close();
        }
      }
    }
  }
];

async function run() {
  const executablePath = browserExecutable();

  if (!executablePath) {
    throw new Error("No Chromium-compatible browser found. Set E2E_BROWSER_EXECUTABLE to Edge or Chrome.");
  }

  await ensureServers();
  browser = await chromium.launch({
    executablePath: windowsPath(executablePath),
    headless: process.env.E2E_HEADED === "true" ? false : true,
    args: ["--disable-gpu", "--no-first-run"]
  });

  const resultsDir = join(repoRoot, "test-results", "e2e");
  await mkdir(resultsDir, { recursive: true });

  const requestedFilter = process.env.E2E_TEST_FILTER?.trim().toLowerCase();
  const selectedTests = requestedFilter
    ? tests.filter((test) => test.name.toLowerCase().includes(requestedFilter))
    : tests;
  if (!selectedTests.length) {
    throw new Error(`No E2E tests matched E2E_TEST_FILTER=${process.env.E2E_TEST_FILTER}.`);
  }

  for (const test of selectedTests) {
    process.stdout.write(`\n[e2e] ${test.name}\n`);
    try {
      await test.run();
      process.stdout.write(`[e2e] PASS ${test.name}\n`);
    } catch (error) {
      const safeName = test.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      process.stderr.write(`[e2e] FAIL ${test.name}\n`);
      process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
      process.stderr.write(`[e2e] Artifacts directory: ${join(resultsDir, safeName)}\n`);
      throw error;
    }
  }

  if (phase180ScaleMeasurements.length) {
    const scaleEvidence = {
      dataset: {
        businesses: 500,
        commanders: 500,
        entities: 10_000,
        soldiers: 9_368
      },
      generated_at: new Date().toISOString(),
      measurements: phase180ScaleMeasurements,
      phase: 180,
      status: "passed"
    };
    const serializedEvidence = `${JSON.stringify(scaleEvidence, null, 2)}\n`;
    await writeFile(join(resultsDir, "phase180-scale.json"), serializedEvidence, "utf8");
    if (process.env.E2E_WRITE_PHASE180_EVIDENCE === "1") {
      const evidenceDir = join(repoRoot, "docs", "evidence");
      await mkdir(evidenceDir, { recursive: true });
      await writeFile(join(evidenceDir, "phase180-browser-scale.json"), serializedEvidence, "utf8");
    }
  }
}

process.on("SIGINT", () => {
  void stopServers().finally(() => process.exit(130));
});
process.on("SIGTERM", () => {
  void stopServers().finally(() => process.exit(143));
});

run()
  .then(async () => {
    await stopServers();
    process.exit(0);
  })
  .catch(async () => {
    await stopServers();
    process.exit(1);
  });
