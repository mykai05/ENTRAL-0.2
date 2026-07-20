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

  await page.goto(`${frontendUrl}/dashboard`);
  await expectUrl(page, /\/dashboard$/, "Authenticated dashboard");
  await expectVisible(page.getByLabel("ENTRAL Command Center"), "Command Center");
  return email;
}

const tests = [
  {
    name: "root URL opens the command center without an account screen",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await page.goto(frontendUrl);
        await expectUrl(page, /\/dashboard$/, "Direct command-center entry");
        await expectVisible(page.getByLabel("ENTRAL Command Center"), "Command Center");
        await expectVisible(page.getByLabel("Command center mode status"), "Command center mode status");

        if (await page.getByText(/create verified account|private beta brief/i).count()) {
          throw new Error("A retired public account or beta-brief control is still visible.");
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "legacy public account routes return to the command center",
    run: async () => {
      const { context, page } = await newPage();
      try {
        for (const pathname of ["/onboarding", "/signup", "/verify-email", "/forgot-password", "/reset-password"]) {
          await page.goto(`${frontendUrl}${pathname}`);
          await expectUrl(page, /\/dashboard$/, `${pathname} retirement redirect`);
        }

        await expectVisible(page.getByLabel("ENTRAL Command Center"), "Command Center");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "owner session opens dashboard with visible mode labels",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await enterWorkspace(page, uniqueEmail("dashboard"));
        await expectVisible(page.getByLabel("Command center mode status"), "Command center mode status");
        await expectVisible(page.getByText("Real workspace"), "Real workspace label");
        await expectVisible(page.getByText("Mock tools labeled"), "Mock tools label");
        await expectVisible(page.getByText("Read-only before trust"), "Read-only label");
        await expectVisible(page.getByLabel("3D interactive ENTRAL neuron graph"), "Command graph canvas");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "chat sends a directive and shows AI cost guardrails",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await enterWorkspace(page, uniqueEmail("chat"));
        await page.goto(`${frontendUrl}/chat`);
        await expectVisible(page.getByRole("heading", { name: /entral communications/i }), "Communications heading");
        await expectVisible(page.getByText("AI cost guardrails"), "AI usage guardrail");
        const directive = "Prepare a short readiness report for this private beta workspace.";
        await page.getByLabel("Enter command directive").fill(directive);
        await page.getByRole("button", { name: "Send directive" }).click();
        await expectVisible(page.locator(".message-user").filter({ hasText: directive }), "User directive bubble");
        await expectVisible(page.locator(".message-assistant").filter({ hasText: /AI Provider Not Connected|Situation:/ }), "Assistant response");
        await expectVisible(page.getByText(/Mock provider|Real provider|Budget cap/), "Provider mode badge");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "mobile dashboard exposes command tabs without a blank screen",
    run: async () => {
      const { context, page } = await newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        deviceScaleFactor: 2
      });
      try {
        await enterWorkspace(page, uniqueEmail("mobile"));
        await expectVisible(page.getByLabel("Mobile command tabs"), "Mobile command tabs");
        const academyClose = page.getByRole("button", { name: "Close ENTRAL Academy" });
        await academyClose.waitFor({ state: "visible", timeout: 3000 }).catch(() => undefined);
        if (await academyClose.count() && await academyClose.isVisible()) {
          await academyClose.click();
        }

        await expectVisible(page.getByRole("region", { name: "ENTRAL command console" }), "Initial mobile command console");
        const initialCommandSelected = await page.getByRole("tab", { name: "Open Command tab" }).getAttribute("aria-selected");
        if (initialCommandSelected !== "true") {
          throw new Error("The mobile command center did not open on the command tab.");
        }
        await page.getByRole("tab", { name: "View command graph" }).click();
        await expectVisible(page.getByRole("button", { name: "Open command console" }), "Mobile command open button");
        await page.getByRole("tab", { name: "Open Command tab" }).click();
        await expectVisible(page.getByRole("region", { name: "ENTRAL command console" }), "Mobile command console");
        await page.getByRole("button", { name: "Close command console and view graph" }).click();
        await expectVisible(page.getByRole("button", { name: "Open command console" }), "Mobile command reopen button");
        const graphSelected = await page.getByRole("tab", { name: "View command graph" }).getAttribute("aria-selected");
        if (graphSelected !== "true") {
          throw new Error("Closing the mobile command console did not activate the graph tab.");
        }
        await page.getByRole("tab", { name: "Open Command tab" }).click();
        await expectVisible(page.getByRole("region", { name: "ENTRAL command console" }), "Reopened mobile command console");
        const commandInput = page.getByLabel("ENTRAL command directive");
        await expectVisible(commandInput, "Mobile command directive input");
        const activeElementId = await page.evaluate(() => document.activeElement?.id ?? "");
        if (activeElementId !== "entral-command-input") {
          throw new Error(`Mobile command input was not focused after reopening. Active element: ${activeElementId || "none"}`);
        }
        const mobileDirective = "Mobile readiness report";
        await commandInput.fill(mobileDirective);
        await page.getByRole("button", { name: "Send command" }).click();
        await expectVisible(page.locator(".command-console-message.operator").filter({ hasText: mobileDirective }), "Mobile command history entry");
        const hierarchyTab = page.getByRole("tab", { name: /open hierarchy tab/i });
        await expectVisible(hierarchyTab, "Hierarchy mobile tab");
        await hierarchyTab.click();
        await expectVisible(page.getByLabel("Mobile command access"), "Mobile hierarchy panel");
        await expectVisible(page.getByRole("heading", { name: /command structure/i }), "Mobile hierarchy heading");
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
