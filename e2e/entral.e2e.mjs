import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

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
    }
  };
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
        await expectVisible(page.getByText("Version 4"), "Version-consistent full record");
      } finally {
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
        const academyClose = page.getByRole("button", { name: "Close ENTRAL Academy" });
        await academyClose.waitFor({ state: "visible", timeout: 3000 }).catch(() => undefined);
        if (await academyClose.count() && await academyClose.isVisible()) {
          await academyClose.click();
        }

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

          await page.goto(`${frontendUrl}/agents`);
          const settingsTrigger = page.getByRole("button", { name: "Open settings" });
          await expectVisible(settingsTrigger, "Settings trigger");
          await settingsTrigger.focus();
          await settingsTrigger.click();
          const settingsDialog = page.getByRole("dialog", { name: "ENTRAL settings" });
          await expectVisible(settingsDialog, "Settings dialog");
          await page.keyboard.press("Escape");
          if (await settingsDialog.isVisible()) throw new Error("Escape did not close Settings.");
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

  for (const test of tests) {
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
