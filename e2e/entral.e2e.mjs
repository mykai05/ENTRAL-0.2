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
    hasTouch: options.hasTouch ?? options.isMobile ?? false,
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
    name: "embedded Universe Graphs preserve document wheel scrolling",
    run: async () => {
      const { context, page } = await newPage({
        viewport: { width: 1440, height: 900 }
      });
      try {
        await enterWorkspace(page, uniqueEmail("phase180-wheel-scroll"));
        await page.goto(`${frontendUrl}/member/graph`);
        await closeAcademyIfOpen(page);
        const canvases = [
          page.getByLabel(/Canonical Universe Graph with 5 entities/i),
          page.getByRole("application", { name: "3D interactive ENTRAL neuron graph" })
        ];

        for (const [index, canvas] of canvases.entries()) {
          await expectVisible(canvas, `${index === 0 ? "2D" : "3D"} embedded graph canvas`, 30_000);
          await canvas.scrollIntoViewIfNeeded();
          const box = await canvas.boundingBox();
          if (!box) throw new Error(`${index === 0 ? "2D" : "3D"} graph did not expose hover geometry.`);
          await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
          const before = await page.evaluate(() => ({
            bodyOverflow: document.body.style.overflow,
            max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
            y: window.scrollY
          }));
          if (before.bodyOverflow === "hidden") {
            throw new Error(`${index === 0 ? "2D" : "3D"} graph locked document scrolling on hover.`);
          }
          const delta = before.y < before.max - 120 ? 360 : -360;
          await page.mouse.wheel(0, delta);
          await page.waitForTimeout(150);
          const after = await page.evaluate(() => window.scrollY);
          if ((delta > 0 && after <= before.y) || (delta < 0 && after >= before.y)) {
            throw new Error(
              `${index === 0 ? "2D" : "3D"} graph intercepted ordinary page scrolling: ${JSON.stringify({ after, before, delta })}`
            );
          }
        }
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
        const entralEmblem = page.getByRole("button", { name: "Open ENTRAL assistant" });
        await expectVisible(entralEmblem, "Persistent ENTRAL emblem");
        await entralEmblem.click();
        const entralAssistant = page.getByRole("region", { name: "ENTRAL assistant" });
        await expectVisible(entralAssistant, "Context-aware ENTRAL assistant");
        await expectVisible(entralAssistant.getByText("Event 9", { exact: true }), "ENTRAL canonical event version");
        await expectVisible(
          entralAssistant.getByText(/Same RLS scope, selection, and canonical event as this screen/i),
          "Truthful shared canonical context"
        );
        await expectVisible(entralAssistant.getByLabel("Message ENTRAL"), "ENTRAL assistant message input");
        await entralAssistant.getByRole("button", { name: "Close ENTRAL assistant" }).click();

        await destinationNav.getByRole("link", { name: /universe graph/i }).click();
        await expectUrl(page, /\/member\/graph$/, "Phase 180 Universe Graph");
        await expectVisible(page.getByRole("heading", { name: "2D Graph" }), "2D Graph heading");
        await expectVisible(page.getByRole("heading", { name: "3D Graph" }), "3D Graph heading");
        const canvas = page.getByLabel(/Canonical Universe Graph with 5 entities/i);
        await expectVisible(canvas, "Canonical 2D Graph canvas");
        const original3DCanvas = page.getByRole("application", { name: "3D interactive ENTRAL neuron graph" });
        await expectVisible(original3DCanvas, "Original full 3D Universe Graph canvas", 30_000);
        const touchScroll = await context.newCDPSession(page);
        try {
          for (const [label, graphCanvas] of [["2D", canvas], ["3D", original3DCanvas]]) {
            await graphCanvas.scrollIntoViewIfNeeded();
            if (await graphCanvas.getAttribute("data-touch-interaction") !== "page") {
              throw new Error(`${label} embedded graph did not default to page-touch scrolling.`);
            }
            const bounds = await graphCanvas.boundingBox();
            if (!bounds) throw new Error(`${label} graph did not expose touch-scroll geometry.`);
            const before = await page.evaluate(() => ({
              max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
              y: window.scrollY
            }));
            const scrollDown = before.y < before.max - 120;
            const centerX = bounds.x + bounds.width / 2;
            const startY = bounds.y + bounds.height / 2;
            const endY = startY + (scrollDown ? -150 : 150);
            await touchScroll.send("Input.dispatchTouchEvent", {
              type: "touchStart",
              touchPoints: [{ x: centerX, y: startY }]
            });
            for (const progress of [0.25, 0.5, 0.75, 1]) {
              await touchScroll.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: centerX, y: startY + (endY - startY) * progress }]
              });
              await page.waitForTimeout(20);
            }
            await touchScroll.send("Input.dispatchTouchEvent", {
              type: "touchEnd",
              touchPoints: []
            });
            await page.waitForTimeout(200);
            const after = await page.evaluate(() => window.scrollY);
            if ((scrollDown && after <= before.y) || (!scrollDown && after >= before.y)) {
              throw new Error(`${label} embedded graph trapped vertical page touch scrolling.`);
            }
          }
        } finally {
          await touchScroll.detach();
        }
        const twoDimensionalSnapshot = await page.locator('[data-graph-dimension="2d"]').evaluate((element) => ({
          entities: element.getAttribute("data-canonical-entity-count"),
          event: element.getAttribute("data-canonical-event-sequence")
        }));
        if (twoDimensionalSnapshot.entities !== "5" || twoDimensionalSnapshot.event !== "9") {
          throw new Error(`2D Graph did not expose the accepted canonical snapshot: ${JSON.stringify(twoDimensionalSnapshot)}`);
        }
        const graphEntralEmblem = page.getByRole("button", { name: "Open ENTRAL assistant" });
        await expectVisible(graphEntralEmblem, "Persistent ENTRAL emblem on Graph");
        await graphEntralEmblem.click();
        const graphEntralAssistant = page.getByRole("region", { name: "ENTRAL assistant" });
        await expectVisible(graphEntralAssistant, "Graph-aware ENTRAL assistant");
        await expectVisible(graphEntralAssistant.getByLabel("Message ENTRAL"), "Graph-aware ENTRAL message input");
        await graphEntralAssistant.getByRole("button", { name: "Close ENTRAL assistant" }).click();

        const graphWorkspace = page.locator(".phase180-graph-workspace");
        const enter2DFullscreen = page.getByRole("button", { name: "Enter 2D Graph full screen" });
        const enter3DFullscreen = page.getByRole("button", { name: "Enter 3D Graph full screen" });
        await expectVisible(enter2DFullscreen, "2D Graph full-screen control");
        await expectVisible(enter3DFullscreen, "3D Graph full-screen control");

        await enter2DFullscreen.click();
        await page.waitForFunction(() => (
          document.querySelector(".phase180-graph-workspace")?.getAttribute("data-fullscreen-dimension") === "2d"
        ));
        const twoDimensionalFullscreenState = await graphWorkspace.evaluate((element) => ({
          fallback: element.getAttribute("data-fullscreen-fallback") === "true",
          native: document.fullscreenElement !== null,
          otherPanelHidden: getComputedStyle(element.querySelector('[data-panel="3d"]')).display === "none"
        }));
        if (
          (!twoDimensionalFullscreenState.native && !twoDimensionalFullscreenState.fallback)
          || !twoDimensionalFullscreenState.otherPanelHidden
        ) {
          throw new Error(`2D Graph did not enter an isolated full-screen surface: ${JSON.stringify(twoDimensionalFullscreenState)}`);
        }
        await expectVisible(
          page.getByRole("button", { name: "Open ENTRAL assistant" }),
          "Persistent ENTRAL emblem in 2D full screen"
        );
        await page.getByRole("button", { name: "Open ENTRAL assistant" }).click();
        const twoDimensionalEntralAssistant = page.getByRole("region", { name: "ENTRAL assistant" });
        await expectVisible(twoDimensionalEntralAssistant, "ENTRAL assistant in 2D full screen");
        await twoDimensionalEntralAssistant.getByRole("button", { name: "Close ENTRAL assistant" }).click();
        await page.getByRole("button", { name: "Exit 2D Graph full screen" }).click();
        await page.waitForFunction(() => (
          !document.querySelector(".phase180-graph-workspace")?.getAttribute("data-fullscreen-dimension")
        ));

        await page.getByRole("button", { name: "Enter 3D Graph full screen" }).click();
        await page.waitForFunction(() => (
          document.querySelector(".phase180-graph-workspace")?.getAttribute("data-fullscreen-dimension") === "3d"
        ));
        const threeDimensionalFullscreenState = await graphWorkspace.evaluate((element) => ({
          fallback: element.getAttribute("data-fullscreen-fallback") === "true",
          native: document.fullscreenElement !== null,
          otherPanelHidden: getComputedStyle(element.querySelector('[data-panel="2d"]')).display === "none"
        }));
        if (
          (!threeDimensionalFullscreenState.native && !threeDimensionalFullscreenState.fallback)
          || !threeDimensionalFullscreenState.otherPanelHidden
        ) {
          throw new Error(`3D Graph did not enter an isolated full-screen surface: ${JSON.stringify(threeDimensionalFullscreenState)}`);
        }
        await expectVisible(
          page.getByRole("button", { name: "Open ENTRAL assistant" }),
          "Persistent ENTRAL emblem in 3D full screen"
        );
        await expectVisible(page.getByRole("button", { name: "Stop movement" }), "Full-screen 3D movement control");
        await page.getByRole("button", { name: "Exit 3D Graph full screen" }).click();
        await page.waitForFunction(() => (
          !document.querySelector(".phase180-graph-workspace")?.getAttribute("data-fullscreen-dimension")
        ));

        await canvas.focus();
        await page.keyboard.press("Enter");
        await expectVisible(page.getByRole("complementary", { name: /ENTRAL graph details/i }), "Dismissible Graph detail drawer");

        await page.setViewportSize({ width: 844, height: 390 });
        await expectVisible(page.getByRole("complementary", { name: /ENTRAL graph details/i }), "Graph selection after landscape rotation");
        await page.setViewportSize({ width: 390, height: 844 });
        await expectVisible(page.getByRole("complementary", { name: /ENTRAL graph details/i }), "Graph selection after portrait recovery");

        await page.getByRole("button", { name: "Jump to 3D" }).click();
        await expectUrl(page, /\/member\/graph\?graph=3d$/, "Original 3D Universe Graph focus");
        await expectVisible(page.getByRole("heading", { name: "2D Graph" }), "2D Graph remains mounted beside 3D");
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
        await expectVisible(page.getByRole("button", { name: "Zoom in 3D Graph" }), "3D Graph zoom-in control");
        await expectVisible(page.getByRole("button", { name: "Zoom out 3D Graph" }), "3D Graph zoom-out control");
        const toolbarGeometry = await page.getByRole("toolbar", { name: "Universe Graph toolbar" }).evaluate((toolbar) => {
          const toolbarRect = toolbar.getBoundingClientRect();
          const stageRect = toolbar.closest(".phase180-graph-3d-stage")?.getBoundingClientRect();
          const buttons = [...toolbar.querySelectorAll("button")].map((button) => button.getBoundingClientRect());
          return {
            buttonsInside: buttons.every((button) => (
              button.left >= toolbarRect.left - 1
              && button.right <= toolbarRect.right + 1
              && button.top >= toolbarRect.top - 1
              && button.bottom <= toolbarRect.bottom + 1
            )),
            insideStage: Boolean(stageRect)
              && toolbarRect.left >= stageRect.left - 1
              && toolbarRect.right <= stageRect.right + 1,
            noHorizontalOverflow: toolbar.scrollWidth <= toolbar.clientWidth + 1
          };
        });
        if (!toolbarGeometry.buttonsInside || !toolbarGeometry.insideStage || !toolbarGeometry.noHorizontalOverflow) {
          throw new Error(`3D Graph toolbar controls overflowed their embedded panel: ${JSON.stringify(toolbarGeometry)}`);
        }
        const threeDimensionalInspector = page.getByLabel("Selected graph entity");
        await expectVisible(threeDimensionalInspector, "Original 3D Graph selected-entity drawer");
        if (await threeDimensionalInspector.getAttribute("data-collapsed") !== "true") {
          throw new Error("Original 3D Graph selected-entity drawer did not default to its compact state.");
        }
        if (await threeDimensionalInspector.locator("dl").count()) {
          throw new Error("Compact 3D Graph inspector exposed expanded entity details.");
        }
        await threeDimensionalInspector.getByRole("button", { name: /Expand details for/i }).click();
        if (await threeDimensionalInspector.getAttribute("data-collapsed") !== "false") {
          throw new Error("Original 3D Graph selected-entity drawer did not expand.");
        }
        await expectVisible(threeDimensionalInspector.locator("dl"), "Expanded 3D Graph entity details");
        await threeDimensionalInspector.getByRole("button", { name: /Collapse details for/i }).click();
        if (await threeDimensionalInspector.getAttribute("data-collapsed") !== "true") {
          throw new Error("Original 3D Graph selected-entity drawer did not return to its compact state.");
        }

        const stopMovement = page.getByRole("button", { name: "Stop movement" });
        await expectVisible(stopMovement, "Visible graph-only movement control");
        await stopMovement.click();
        await expectVisible(page.getByText(/Graph movement paused\. Agent activity and live canonical updates continue\./i), "Truthful visual-pause boundary");
        const pausedWorkspaceState = await page.locator(".phase180-graph-workspace").getAttribute("data-graph-motion");
        if (pausedWorkspaceState !== "paused") {
          throw new Error(`Stop movement did not pause the graph workspace: ${pausedWorkspaceState}`);
        }
        await page.waitForTimeout(250);
        const pausedFrame = await original3DCanvas.screenshot();
        await page.waitForTimeout(250);
        const pausedFrameLater = await original3DCanvas.screenshot();
        if (!pausedFrame.equals(pausedFrameLater)) {
          throw new Error("The original 3D Graph continued visual animation after Stop movement.");
        }
        await original3DCanvas.focus();
        await page.keyboard.press("+");
        await page.waitForTimeout(250);
        const pausedCameraFrame = await original3DCanvas.screenshot();
        if (pausedFrameLater.equals(pausedCameraFrame)) {
          throw new Error("The original 3D Graph camera stopped responding while visual movement was paused.");
        }
        await page.getByRole("button", { name: "Resume movement" }).click();
        if (await page.locator(".phase180-graph-workspace").getAttribute("data-graph-motion") !== "running") {
          throw new Error("Resume movement did not restart graph animation.");
        }

        await page.getByRole("button", { name: "Jump to 2D" }).click();
        await expectUrl(page, /\/member\/graph\?graph=2d$/, "Retained 2D Graph focus");
        await expectVisible(original3DCanvas, "3D Graph remains mounted beside 2D");

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

        await page.goto(`${frontendUrl}/member/dashboard?section=entral`);
        await expectUrl(page, /\/member\/dashboard\?section=entral$/, "Member full ENTRAL room");
        await expectVisible(page.getByRole("region", { name: "Main ENTRAL chat room" }), "Member full ENTRAL room");
        if (
          await page.getByRole("button", { name: "Open ENTRAL assistant" }).count()
          || await page.getByRole("button", { name: "Close ENTRAL assistant" }).count()
        ) {
          throw new Error("The persistent ENTRAL assistant launcher was duplicated inside the main ENTRAL room.");
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
          const original3DCanvas = page.getByRole("application", { name: "3D interactive ENTRAL neuron graph" });
          await expectVisible(original3DCanvas, `${profile.name} 10,000-entity original 3D Graph`, 30_000);
          const graphReadyMs = performance.now() - graphStart;
          if (graphReadyMs > 30_000) {
            throw new Error(`${profile.name} simultaneous Graph readiness exceeded 30s: ${graphReadyMs.toFixed(1)}ms.`);
          }
          const panelGeometry = await page.locator(".phase180-graph-panels").evaluate((element) => {
            const twoDimensional = element.querySelector('[data-panel="2d"]')?.getBoundingClientRect();
            const threeDimensional = element.querySelector('[data-panel="3d"]')?.getBoundingClientRect();
            return twoDimensional && threeDimensional
              ? {
                  two: { bottom: twoDimensional.bottom, left: twoDimensional.left, top: twoDimensional.top },
                  three: { left: threeDimensional.left, top: threeDimensional.top }
                }
              : null;
          });
          if (!panelGeometry) throw new Error(`${profile.name} simultaneous Graph panels did not expose geometry.`);
          if (profile.isMobile && panelGeometry.three.top < panelGeometry.two.bottom - 2) {
            throw new Error("Phone Graph panels did not stack cleanly.");
          }
          if (!profile.isMobile && (Math.abs(panelGeometry.three.top - panelGeometry.two.top) > 2 || panelGeometry.three.left <= panelGeometry.two.left)) {
            throw new Error("Desktop Graph panels did not render side by side.");
          }
          await page.getByRole("button", { name: "Fit", exact: true }).click();
          if (profile.isMobile) {
            await page.getByRole("button", { name: "Interact with 2D Graph" }).click();
            if (await canvas.getAttribute("data-touch-interaction") !== "graph") {
              throw new Error("Phone Graph did not activate explicit touch interaction.");
            }
            await page.waitForTimeout(100);
            const touch = await context.newCDPSession(page);
            try {
              await canvas.scrollIntoViewIfNeeded();
              const fittedFrame = await canvas.screenshot();
              const bounds = await canvas.boundingBox();
              if (!bounds) throw new Error("Phone Graph canvas did not expose interaction bounds.");
              const center = {
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2
              };
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchStart",
                touchPoints: [{ x: center.x - 35, y: center.y - 20 }]
              });
              await page.waitForTimeout(30);
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: center.x, y: center.y }]
              });
              await page.waitForTimeout(30);
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchMove",
                touchPoints: [{ x: center.x + 35, y: center.y + 30 }]
              });
              await touch.send("Input.dispatchTouchEvent", {
                type: "touchEnd",
                touchPoints: []
              });
              await page.waitForTimeout(500);
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
              await page.waitForTimeout(30);
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
              await page.waitForTimeout(500);
              const pinchedFrame = await canvas.screenshot();
              if (pannedFrame.equals(pinchedFrame)) {
                throw new Error("Phone Graph two-finger pinch did not change the production canvas zoom.");
              }
            } finally {
              await touch.detach();
            }
            await page.getByRole("button", { name: "Release 2D Graph touch controls" }).click();
            if (await canvas.getAttribute("data-touch-interaction") !== "page") {
              throw new Error("Phone Graph did not restore page-touch scrolling.");
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
          await page.getByRole("button", { name: "Jump to 3D" }).click();
          const graph3DReadyMs = performance.now() - graph3DStart;
          const graph3DSnapshot = await page.locator(".phase180-graph-3d").evaluate((element) => ({
            entities: element.getAttribute("data-canonical-entity-count"),
            event: element.getAttribute("data-canonical-event-sequence")
          }));
          if (graph3DSnapshot.entities !== "10000" || graph3DSnapshot.event !== "9") {
            throw new Error(`${profile.name} 3D Graph did not retain the 10,000-entity canonical event: ${JSON.stringify(graph3DSnapshot)}`);
          }
          await page.getByRole("button", { name: "Fit view" }).click();
          await page.getByRole("button", { name: "Stop movement" }).click();
          if (await page.locator(".phase180-graph-workspace").getAttribute("data-graph-motion") !== "paused") {
            throw new Error(`${profile.name} Stop movement did not pause both Graph views.`);
          }
          await original3DCanvas.focus();
          await page.keyboard.press("+");
          await page.getByRole("button", { name: "Resume movement" }).click();
          await page.getByRole("button", { name: "Jump to 2D" }).click();
          await expectVisible(canvas, `${profile.name} 2D Graph after simultaneous 3D parity verification`, 30_000);

          const infrastructureStart = performance.now();
          const infrastructureLink = page.getByRole("link", { name: "Infrastructure" });
          if (profile.isMobile) {
            const hitTarget = await infrastructureLink.evaluate((element) => {
              const rect = element.getBoundingClientRect();
              const x = rect.left + rect.width / 2;
              const y = rect.top + rect.height / 2;
              const hit = document.elementFromPoint(x, y);
              return {
                contains_hit: hit ? element.contains(hit) : false,
                height: rect.height,
                hit_element: hit
                  ? `${hit.tagName.toLowerCase()}${hit.getAttribute("href") ? `[href="${hit.getAttribute("href")}"]` : ""}`
                  : null,
                width: rect.width,
                x,
                y
              };
            });
            if (!hitTarget.contains_hit) {
              throw new Error(`Phone Infrastructure destination is not the center hit target: ${JSON.stringify(hitTarget)}`);
            }
            await page.mouse.click(hitTarget.x, hitTarget.y);
          } else {
            await infrastructureLink.click();
          }
          await expectUrl(page, /\/member\/infrastructure$/, `${profile.name} Infrastructure navigation`);
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
