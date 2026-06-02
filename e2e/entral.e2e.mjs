import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const frontendUrl = process.env.E2E_FRONTEND_URL ?? "http://localhost:3000";
const backendUrl = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:4000";
const pnpm = join(repoRoot, ".corepack/v1/pnpm/9.12.3/bin/pnpm.cjs");
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
      OPENAI_API_KEY: ""
    });
  }

  await waitForHttp(`${backendUrl}/health`, "Memory backend");

  if (!await fetchOk(frontendUrl)) {
    spawnServer("frontend", [pnpm, "--filter", "@entral/frontend", "dev"], {
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

async function login(page, email = uniqueEmail("operator")) {
  await page.goto(`${frontendUrl}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expectUrl(page, /\/dashboard$/, "Dashboard after sign-in");
  await expectVisible(page.getByLabel("ENTRAL Command Center"), "Command Center");
  return email;
}

const tests = [
  {
    name: "public landing explains the supervised command center before signup",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await page.goto(frontendUrl);
        await expectVisible(page.getByRole("heading", { exact: true, name: "Entral" }), "Landing hero");
        await expectVisible(page.getByText("An AI command center for organizing, planning, monitoring, and safely preparing business operations.").first(), "Approved positioning");
        await expectVisible(page.getByRole("heading", { name: /one command layer for supervised business preparation/i }), "Supervised preparation explainer");
        await expectVisible(page.getByText(/It does not post, buy ads, update stores, contact customers, or change external systems without scoped permission/i), "Public boundary statement");
        const nextSectionVisible = await page.evaluate(() => {
          const nextSection = document.querySelector(".public-explainer");
          if (!nextSection) return false;
          const rect = nextSection.getBoundingClientRect();
          return rect.top < window.innerHeight;
        });
        if (!nextSectionVisible) {
          throw new Error("Landing hero does not leave the next public explanation section visible in the first viewport.");
        }
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "auth redirects protected routes to the private beta brief",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await page.goto(`${frontendUrl}/dashboard`);
        await expectUrl(page, /\/onboarding\?next=%2Fdashboard$/, "Onboarding redirect");
        await expectVisible(page.getByRole("heading", { name: /know what entral is before entering/i }), "Private beta brief");
        await expectVisible(page.getByText("Real").first(), "Real mode label");
        await expectVisible(page.getByText("Mock").first(), "Mock mode label");
        await expectVisible(page.getByText("Read-only").first(), "Read-only mode label");
      } finally {
        await context.close();
      }
    }
  },
  {
    name: "auth login opens dashboard with visible mode labels",
    run: async () => {
      const { context, page } = await newPage();
      try {
        await login(page, uniqueEmail("dashboard"));
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
        await login(page, uniqueEmail("chat"));
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
        await login(page, uniqueEmail("mobile"));
        await expectVisible(page.getByRole("region", { name: "ENTRAL command console" }), "Mobile command console");
        await expectVisible(page.getByLabel("Mobile command tabs"), "Mobile command tabs");
        await page.getByRole("button", { name: "Close command console and view graph" }).click();
        await expectVisible(page.getByRole("button", { name: "Open command console" }), "Mobile command reopen button");
        const graphPressed = await page.getByRole("button", { name: "View command graph" }).getAttribute("aria-pressed");
        if (graphPressed !== "true") {
          throw new Error("Closing the mobile command console did not activate the graph tab.");
        }
        await page.getByRole("button", { name: "Open Command tab" }).click();
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
        const hierarchyTab = page.getByRole("button", { name: /open hierarchy tab/i });
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
